"""Battery Monitor: find the batteries, track how long each one has been low, notify twice a day.

A battery is a `sensor` with the `battery` device class (level in %) or a `binary_sensor` with the
`battery` device class (`on` = low). A device with several of them is listed once, with its level sensor.
A battery needs attention when it is *low* (below the threshold) or *unavailable* (`unavailable` /
`unknown`, often a dead battery), and becomes *due* once it has needed attention for the configured
duration: the due batteries are the ones notified.
"""

from __future__ import annotations

import logging
import re
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from datetime import datetime, timedelta
from functools import partial
from itertools import pairwise
from typing import Any

from homeassistant.components import persistent_notification
from homeassistant.const import ATTR_DEVICE_CLASS, EVENT_STATE_CHANGED, STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import CALLBACK_TYPE, CoreState, Event, EventStateChangedData, HomeAssistant, State, callback
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.debounce import Debouncer
from homeassistant.helpers.storage import Store
from homeassistant.helpers.translation import async_get_translations
from homeassistant.util import dt as dt_util

from .const import (
    DOMAIN,
    EVENT_LOW,
    EVENT_REPLACED,
    FORECAST_DAYS,
    FORECAST_HOURS,
    FORECAST_MIN_DAYS,
    FORECAST_MIN_DRAIN,
    FORECAST_RESET_JUMP,
    MAX_DURATION,
    NOTIFICATION_ID,
    STOCK_HORIZON_DAYS,
    STORAGE_KEY,
    STORAGE_VERSION,
)

_LOGGER = logging.getLogger(__name__)

BATTERY = "battery"
DOMAINS = ("sensor", "binary_sensor")
# Battery changes are coalesced: a burst of them (start-up, a Zigbee mesh reporting) refreshes the list once a second.
REFRESH_COOLDOWN = 1.0


@dataclass(slots=True)
class Battery:
    """One monitored device (or entity without a device)."""

    entity_id: str
    device_id: str | None
    name: str
    area: str | None
    level: int | None  # None for a binary sensor or an unavailable battery
    low: bool
    unavailable: bool
    below_since: datetime | None  # since it needs attention (low or unavailable)
    due: bool
    # Forecast (level batteries with enough history): drain in % per day, days before the threshold, that date.
    drain_per_day: float | None = None
    days_left: int | None = None
    replace_by: datetime | None = None
    # Battery Notes' type ("CR2032", "2× AA"), None when it is not installed or doesn't know the device.
    battery_type: str | None = None

    @property
    def alert(self) -> bool:
        """Needs attention: low, or unavailable."""
        return self.low or self.unavailable

    @property
    def icon(self) -> str:
        if self.unavailable:
            return "mdi:battery-unknown"
        if self.level is None:
            return "mdi:battery-alert-variant-outline" if self.low else "mdi:battery"
        if self.level >= 95:
            return "mdi:battery"
        if self.level < 5:
            return "mdi:battery-outline"
        return f"mdi:battery-{max(10, round(self.level / 10) * 10)}"

    def as_dict(self) -> dict[str, Any]:
        return {
            "entity_id": self.entity_id,
            "device_id": self.device_id,
            "name": self.name,
            "area": self.area,
            "level": self.level,
            "icon": self.icon,
            "low": self.low,
            "alert": self.alert,
            "due": self.due,
            "unavailable": self.unavailable,
            "below_since": self.below_since.isoformat() if self.below_since else None,
            "drain_per_day": self.drain_per_day,
            "days_left": self.days_left,
            "replace_by": self.replace_by.isoformat() if self.replace_by else None,
            "battery_type": self.battery_type,
        }

    def as_row(self) -> dict[str, Any]:
        """Flat values for the CSV export."""
        return {
            "entity_id": self.entity_id,
            "name": self.name,
            "area": self.area or "",
            "level": "" if self.level is None else self.level,
            "low": int(self.low),
            "unavailable": int(self.unavailable),
            "due": int(self.due),
            "below_since": self.below_since.isoformat() if self.below_since else "",
            "drain_per_day": "" if self.drain_per_day is None else self.drain_per_day,
            "days_left": "" if self.days_left is None else self.days_left,
            "replace_by": self.replace_by.date().isoformat() if self.replace_by else "",
            "battery_type": self.battery_type or "",
        }


def drain_per_day(points: list[tuple[datetime, int]]) -> float | None:
    """Drain of a battery in % per day, from (time, level) points: least-squares slope since the last replacement.

    A rise of FORECAST_RESET_JUMP points or more is a new battery: only the points from there count. None without
    FORECAST_MIN_DAYS days of history since then, or fewer than three points; 0.0 when the level is stable.
    """
    start = 0
    for i in range(1, len(points)):
        if points[i][1] - points[i - 1][1] >= FORECAST_RESET_JUMP:
            start = i
    points = points[start:]
    if len(points) < 3:
        return None
    days = [(t - points[0][0]).total_seconds() / 86400 for t, _ in points]
    if days[-1] < FORECAST_MIN_DAYS:
        return None
    levels = [float(level) for _, level in points]
    mean_x = sum(days) / len(days)
    mean_y = sum(levels) / len(levels)
    var = sum((x - mean_x) ** 2 for x in days)
    if var == 0:
        return None
    slope = sum((x - mean_x) * (y - mean_y) for x, y in zip(days, levels, strict=True)) / var
    drain = -slope
    return round(drain, 3) if drain >= FORECAST_MIN_DRAIN else 0.0


def _level(state: State) -> int | None:
    try:
        return round(float(state.state))
    except (TypeError, ValueError):
        return None


# "2× AA", "2x AA", "AA x2": the quantity is already in the type.
_HAS_QUANTITY = re.compile(r"^\d+\s*[x×]|[x×]\s*\d+$", re.IGNORECASE)


def battery_type(value: Any, quantity: Any = None) -> str | None:
    """A Battery Notes type ("CR2032", "AA" with a quantity of 2 → "2× AA"), None when there is none."""
    text = str(value or "").strip()
    if not text or text in (STATE_UNAVAILABLE, STATE_UNKNOWN):
        return None
    try:
        count = int(float(quantity))
    except (TypeError, ValueError):
        count = 1
    return f"{count}× {text}" if count > 1 and not _HAS_QUANTITY.search(text) else text


# "2× AA", "2x AA", "AA x2", "AA": the quantity and the type.
_QUANTITY_FIRST = re.compile(r"^(\d+)\s*[x×]\s*(.+)$", re.IGNORECASE)
_QUANTITY_LAST = re.compile(r"^(.+?)\s*[x×]\s*(\d+)$", re.IGNORECASE)


def split_type(kind: str | None) -> tuple[int, str] | None:
    """(quantity, type) of a battery type ("2× AA" → (2, "AA")), None without one."""
    text = str(kind or "").strip()
    if not text:
        return None
    if m := _QUANTITY_FIRST.match(text):
        return int(m.group(1)), m.group(2).strip()
    if m := _QUANTITY_LAST.match(text):
        return int(m.group(2)), m.group(1).strip()
    return 1, text


def _type_sensor(hass: HomeAssistant, entities: er.EntityRegistry, device_id: str | None) -> State | None:
    """Battery Notes' *Battery type* sensor of a device (translation key, else an entity ID ending in _battery_type)."""
    if not device_id:
        return None
    for entry in er.async_entries_for_device(entities, device_id):
        if entry.domain == "sensor" and (
            entry.translation_key == "battery_type" or entry.entity_id.endswith("_battery_type")
        ):
            return hass.states.get(entry.entity_id)
    return None


async def _async_history(hass: HomeAssistant, entity_ids: list[str], start: datetime) -> dict[str, list[State]]:
    """Recorded states of `entity_ids` since `start`, oldest first ({} without the recorder)."""
    if "recorder" not in hass.config.components:
        return {}
    from homeassistant.components.recorder import get_instance, history  # noqa: PLC0415 - optional dependency

    return await get_instance(hass).async_add_executor_job(
        partial(
            history.get_significant_states,
            hass,
            start,
            entity_ids=entity_ids,
            significant_changes_only=False,
            no_attributes=True,
        )
    )


class BatteryMonitor:
    """Battery list, low-battery tracking and notifications."""

    def __init__(
        self,
        hass: HomeAssistant,
        threshold: int,
        duration: timedelta,
        notify_services: Iterable[str] = (),
        ignored_entities: Iterable[str] = (),
        ignored_integrations: Iterable[str] = (),
        entry_id: str | None = None,
    ) -> None:
        self.hass = hass
        self.entry_id = entry_id
        self.threshold = threshold
        self.duration = duration
        self.notify_services = list(notify_services)
        self.ignored_entities = set(ignored_entities)
        self.ignored_integrations = set(ignored_integrations)
        self.batteries: list[Battery] = []
        self.last_notification: datetime | None = None
        self.last_notified: int | None = None
        self._below_since: dict[str, datetime] = {}
        # Measured drain (% per day) per level battery, and when it was last measured.
        self._drain: dict[str, float] = {}
        self.forecast_at: datetime | None = None
        self._store: Store[dict[str, Any]] = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        # Last available reading of each battery (level, low): the events fire on a change from it.
        self._last: dict[str, tuple[int | None, bool]] = {}
        self._listeners: list[CALLBACK_TYPE] = []
        # Spare batteries in the drawer, by type ("AA": 4): only the types set with battery_monitor.set_stock.
        self.stock: dict[str, int] = {}

    # ── Listeners ───────────────────────────────────────────────────────────

    def async_add_listener(self, update_callback: CALLBACK_TYPE) -> Callable[[], None]:
        self._listeners.append(update_callback)
        return lambda: self._listeners.remove(update_callback)

    def _notify_listeners(self) -> None:
        for update_callback in list(self._listeners):
            update_callback()

    # ── Batteries ───────────────────────────────────────────────────────────

    @property
    def low(self) -> list[Battery]:
        return [b for b in self.batteries if b.low]

    @property
    def unavailable(self) -> list[Battery]:
        return [b for b in self.batteries if b.unavailable]

    @property
    def alerts(self) -> list[Battery]:
        return [b for b in self.batteries if b.alert]

    @property
    def due(self) -> list[Battery]:
        return [b for b in self.batteries if b.due]

    @property
    def next_replacement(self) -> Battery | None:
        """The battery forecast to reach the threshold first (a battery already low or unavailable comes first)."""
        alerts = [b for b in self.batteries if b.alert]
        if alerts:
            return alerts[0]
        forecast = [b for b in self.batteries if b.replace_by is not None]
        return min(forecast, key=lambda b: b.replace_by) if forecast else None

    def forecast_due(self, now: datetime | None = None) -> bool:
        """True when the drains were never measured, or more than FORECAST_HOURS ago."""
        now = now or dt_util.utcnow()
        return self.forecast_at is None or now - self.forecast_at >= timedelta(hours=FORECAST_HOURS)

    async def async_forecast(self) -> None:
        """Measure the drain of every level battery on its recorded history, and refresh the forecasts."""
        now = dt_util.utcnow()
        self.forecast_at = now
        entity_ids = [b.entity_id for b in self.batteries if b.entity_id.startswith("sensor.")]
        if not entity_ids:
            self._drain = {}
            return
        try:
            states = await _async_history(self.hass, entity_ids, now - timedelta(days=FORECAST_DAYS))
        except Exception:  # noqa: BLE001 - a forecast is a nicety, never an error
            _LOGGER.exception("Could not read the history of the batteries")
            return
        drains: dict[str, float] = {}
        for entity_id in entity_ids:
            points = [(s.last_changed, level) for s in states.get(entity_id, []) if (level := _level(s)) is not None]
            if (drain := drain_per_day(points)) is not None:
                drains[entity_id] = drain
        self._drain = drains
        # Kept in .storage: a restart within the day reuses the drains instead of reading 30 days of history again.
        self._store.async_delay_save(self._data, 5)
        self.async_refresh()

    async def async_load(self) -> None:
        stored = await self._store.async_load() or {}
        # Before 1.14 the store held only the times below the threshold, by entity ID (entity IDs have a dot,
        # the keys of the current layout don't).
        below = stored.get("below_since") if isinstance(stored.get("below_since"), dict) else stored
        for entity_id, value in below.items():
            if isinstance(value, str) and (since := dt_util.parse_datetime(value)) is not None:
                self._below_since[entity_id] = since
        forecast_at = stored.get("forecast_at")
        if isinstance(forecast_at, str) and (at := dt_util.parse_datetime(forecast_at)) is not None:
            self.forecast_at = at
            drains = stored.get("drains")
            self._drain = {k: float(v) for k, v in drains.items()} if isinstance(drains, dict) else {}
        stock = stored.get("stock")
        if isinstance(stock, dict):
            self.stock = {str(k): int(v) for k, v in stock.items() if isinstance(v, int) and v >= 0}
        known = set(self._below_since)
        self.async_refresh()
        # Batteries already low or unavailable when first seen (just installed, or newly found): look
        # up in the history since when, rather than starting the count now.
        new = [b.entity_id for b in self.alerts if b.entity_id not in known]
        if new:
            try:
                await self._async_backfill(new)
            except Exception:  # noqa: BLE001 - the history only makes the start time more accurate
                _LOGGER.exception("Could not read the history of the low batteries")

    def _needs_attention(self, state: State) -> bool | None:
        """Low or unavailable: True; fine: False; a level that can't be read: None."""
        if state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
            return True
        # Recorded states (LazyState) have no `domain`: read it from the entity ID.
        if state.entity_id.startswith("binary_sensor."):
            return state.state == "on"
        level = _level(state)
        return None if level is None else level < self.threshold

    async def _async_backfill(self, entity_ids: list[str]) -> None:
        """Set since when each battery needs attention: right after its last fine state."""
        now = dt_util.utcnow()
        states = await _async_history(self.hass, entity_ids, now - timedelta(hours=MAX_DURATION))
        for entity_id in entity_ids:
            recorded = [s for s in states.get(entity_id, []) if self._needs_attention(s) is not None]
            if not recorded:
                continue
            # Needing attention for the whole recorded period, or since the last time it was fine.
            since = recorded[0].last_changed if self._needs_attention(recorded[0]) else None
            for previous, state in pairwise(recorded):
                if not self._needs_attention(previous) and self._needs_attention(state):
                    since = state.last_changed
            if since is not None and since < self._below_since.get(entity_id, now):
                self._below_since[entity_id] = since
        self.async_refresh()

    def _is_battery(self, entity_id: str | None) -> bool:
        """A battery in the list, or a battery entity (one that was hidden or ignored until now)."""
        if not entity_id:
            return False
        if any(b.entity_id == entity_id for b in self.batteries):
            return True
        state = self.hass.states.get(entity_id)
        return state is not None and state.domain in DOMAINS and state.attributes.get(ATTR_DEVICE_CLASS) == BATTERY

    @callback
    def async_listen(self) -> CALLBACK_TYPE:
        """Refresh when a battery changes, and when its entity or device is edited (hidden, moved, renamed)."""
        # The first change refreshes right away; the next ones within the cooldown are merged into one refresh.
        debouncer = Debouncer(
            self.hass, _LOGGER, cooldown=REFRESH_COOLDOWN, immediate=True, function=self.async_refresh
        )

        @callback
        def battery_changed(data: EventStateChangedData) -> bool:
            """Filters the state changes before a job is even created: only batteries refresh the list."""
            state = data["new_state"] or data["old_state"]
            return state is not None and state.domain in DOMAINS and state.attributes.get(ATTR_DEVICE_CLASS) == BATTERY

        @callback
        def changed(event: Event[EventStateChangedData]) -> None:
            debouncer.async_schedule_call()

        @callback
        def entity_changed(event: Event[er.EventEntityRegistryUpdatedData]) -> None:
            data = event.data
            if self._is_battery(data["entity_id"]) or self._is_battery(data.get("old_entity_id")):
                self.async_refresh()

        @callback
        def device_changed(event: Event[dr.EventDeviceRegistryUpdatedData]) -> None:
            if any(b.device_id == event.data["device_id"] for b in self.batteries):
                self.async_refresh()

        unsubs = [
            self.hass.bus.async_listen(EVENT_STATE_CHANGED, changed, event_filter=battery_changed),
            self.hass.bus.async_listen(er.EVENT_ENTITY_REGISTRY_UPDATED, entity_changed),
            self.hass.bus.async_listen(dr.EVENT_DEVICE_REGISTRY_UPDATED, device_changed),
        ]

        @callback
        def unsubscribe() -> None:
            for unsub in unsubs:
                unsub()
            debouncer.async_shutdown()

        return unsubscribe

    def _ignored(self, entity_id: str, entry: er.RegistryEntry | None) -> bool:
        if entity_id in self.ignored_entities:
            return True
        if entry is None:
            return False
        return entry.hidden or entry.platform in self.ignored_integrations

    @callback
    def async_refresh(self) -> None:
        """Rebuild the list from the current states, and update how long each battery has been low."""
        now = dt_util.utcnow()
        below_before = dict(self._below_since)
        entities = er.async_get(self.hass)
        devices = dr.async_get(self.hass)
        areas = ar.async_get(self.hass)

        # One battery per device: its level sensor wins over a low-battery binary sensor.
        chosen: dict[str, tuple[State, er.RegistryEntry | None]] = {}
        for state in self.hass.states.async_all(DOMAINS):
            if state.attributes.get(ATTR_DEVICE_CLASS) != BATTERY:
                continue
            entry = entities.async_get(state.entity_id)
            if self._ignored(state.entity_id, entry):
                continue
            key = (entry.device_id if entry and entry.device_id else None) or state.entity_id
            current = chosen.get(key)
            if current is None or (current[0].domain == "binary_sensor" and state.domain == "sensor"):
                chosen[key] = (state, entry)

        batteries: list[Battery] = []
        for state, entry in chosen.values():
            battery_device_id = entry.device_id if entry else None
            device = devices.async_get(battery_device_id) if battery_device_id else None
            unavailable = state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN)
            level = None if state.domain == "binary_sensor" or unavailable else _level(state)
            if state.domain == "binary_sensor":
                low = state.state == "on"
            else:
                low = level is not None and level < self.threshold
            # Low and unavailable share the same time: a battery that goes low then unavailable is
            # most likely dead, and keeps counting from when it went low.
            if low or unavailable:
                self._below_since.setdefault(state.entity_id, now)
            else:
                self._below_since.pop(state.entity_id, None)
            since = self._below_since.get(state.entity_id)
            # Battery Notes: the battery's own type attributes, else its device's *Battery type* sensor.
            kind = battery_type(state.attributes.get("battery_type"), state.attributes.get("battery_quantity"))
            if kind is None and (type_state := _type_sensor(self.hass, entities, battery_device_id)) is not None:
                kind = battery_type(type_state.state, type_state.attributes.get("battery_quantity"))
            area_id = (entry.area_id if entry else None) or (device.area_id if device else None)
            area = areas.async_get_area(area_id) if area_id else None
            name = (device.name_by_user or device.name) if device else None
            battery = Battery(
                entity_id=state.entity_id,
                device_id=device.id if device else None,
                name=name or state.name,
                area=area.name if area else None,
                level=level,
                low=low,
                unavailable=unavailable,
                below_since=since,
                due=since is not None and now - since >= self.duration,
                drain_per_day=self._drain.get(state.entity_id),
                battery_type=kind,
            )
            # Days before the level reaches the threshold at the measured drain (a stable level has no date).
            if battery.drain_per_day and level is not None and not battery.alert:
                battery.days_left = max(0, int((level - self.threshold) / battery.drain_per_day))
                # A date (the start of that day): the sensor must not move with every refresh.
                battery.replace_by = dt_util.start_of_local_day(now + timedelta(days=battery.days_left))
            batteries.append(battery)

        # Needing attention first: lowest levels, then low binary sensors, then unavailable batteries.
        batteries.sort(key=lambda b: (not b.alert, b.unavailable, b.level is None, b.level or 0, b.name.casefold()))
        # Entities still loading (ZHA, Z-Wave…) are not in the states yet: pruning the stored times
        # before Home Assistant is running would forget them. Fine batteries are popped above anyway.
        if self.hass.state is CoreState.running:
            tracked = {b.entity_id for b in batteries}
            self._below_since = {k: v for k, v in self._below_since.items() if k in tracked}
        self.batteries = batteries
        self._fire_events(batteries)
        # Only write .storage when a time actually changed: a plain level change rewrites nothing.
        if self._below_since != below_before:
            self._store.async_delay_save(self._data, 5)
        self._notify_listeners()

    def _fire_events(self, batteries: list[Battery]) -> None:
        """Fire `battery_monitor_low` and `battery_monitor_replaced` on a change from the last available reading.

        Only transitions seen while Home Assistant runs: a battery seen for the first time (start-up, a reload, a new
        device) only sets its reading, and an unavailable one keeps its last reading (a battery taken out reads
        unavailable, then the new one's level).
        """
        running = self.hass.state is CoreState.running
        if running:
            tracked = {b.entity_id for b in batteries}
            self._last = {k: v for k, v in self._last.items() if k in tracked}
        for b in batteries:
            if b.unavailable:
                continue
            previous = self._last.get(b.entity_id)
            self._last[b.entity_id] = (b.level, b.low)
            if previous is None or not running:
                continue
            level, low = previous
            data = {"entry_id": self.entry_id, "entity_id": b.entity_id, "device_id": b.device_id, "name": b.name}
            # A rise of FORECAST_RESET_JUMP points or more is a new battery, as for the forecast.
            if level is not None and b.level is not None and b.level - level >= FORECAST_RESET_JUMP:
                self.hass.bus.async_fire(EVENT_REPLACED, {**data, "level": b.level, "previous_level": level})
                self._use_spares(b)
            elif b.low and not low:
                self.hass.bus.async_fire(EVENT_LOW, {**data, "level": b.level, "threshold": self.threshold})

    def _data(self) -> dict[str, Any]:
        return {
            "below_since": {k: v.isoformat() for k, v in self._below_since.items()},
            "forecast_at": self.forecast_at.isoformat() if self.forecast_at else None,
            "drains": dict(self._drain),
            "stock": dict(self.stock),
        }

    # ── Spare batteries ─────────────────────────────────────────────────────

    def _use_spares(self, battery: Battery) -> None:
        """A battery was replaced: take its batteries out of the stock of its type, if that type is counted."""
        parsed = split_type(battery.battery_type)
        if parsed is None or parsed[1] not in self.stock:
            return
        count, kind = parsed
        self.stock[kind] = max(0, self.stock[kind] - count)
        self._store.async_delay_save(self._data, 5)

    @callback
    def async_set_stock(self, kind: str, count: int | None) -> None:
        """Set the spare batteries of a type; None stops counting it."""
        kind = kind.strip()
        if count is None:
            self.stock.pop(kind, None)
        else:
            self.stock[kind] = count
        self._store.async_delay_save(self._data, 5)
        self._notify_listeners()

    def spares(self) -> dict[str, dict[str, int]]:
        """Per counted type: in stock, needed (low, unavailable or due within STOCK_HORIZON_DAYS) and short."""
        horizon = STOCK_HORIZON_DAYS
        needed = dict.fromkeys(self.stock, 0)
        for b in self.batteries:
            parsed = split_type(b.battery_type)
            if parsed is None or parsed[1] not in needed:
                continue
            if b.alert or (b.days_left is not None and b.days_left <= horizon):
                needed[parsed[1]] += parsed[0]
        return {
            kind: {"stock": stock, "needed": needed[kind], "short": max(0, needed[kind] - stock)}
            for kind, stock in sorted(self.stock.items())
        }

    async def async_save(self) -> None:
        """Write the times below the threshold now (on unload: a reload must not reset them)."""
        await self._store.async_save(self._data())

    # ── Notifications ───────────────────────────────────────────────────────

    async def async_notify(self, manual: bool = False) -> None:
        """Notify the batteries that have been low for the duration; clear the notification when none is.

        Asked for (button, action): every battery that needs attention, whatever the duration, and a
        message even when none does, so the person who asked gets an answer.
        """
        self.async_refresh()
        due = self.alerts if manual else self.due
        self.last_notification = dt_util.utcnow()
        self.last_notified = len(due)
        if not due:
            persistent_notification.async_dismiss(self.hass, NOTIFICATION_ID)
            if manual:
                text = await self._texts()
                await self._async_send(text("none_title"), text("none", threshold=self.threshold), persistent=False)
            self._notify_listeners()
            return

        text = await self._texts()

        def key(b: Battery) -> str:
            if b.unavailable:
                return "line_unavailable"
            return "line" if b.level is not None else "line_no_level"

        lines = [
            text(
                key(b),
                name=b.name,
                level=b.level,
                area=f" ({b.area})" if b.area else "",
                type=f" · {b.battery_type}" if b.battery_type else "",
            )
            for b in due
        ]
        # "low batteries" when all are low, "batteries to check" as soon as one is unavailable
        kind = "check" if any(b.unavailable for b in due) else "title"
        title = text(f"{kind}_one" if len(due) == 1 else f"{kind}_many", count=len(due))
        if short := [f"{v['short']} {kind}" for kind, v in self.spares().items() if v["short"]]:
            lines += ["", text("spares_short", spares=", ".join(short))]
        await self._async_send(title, "\n".join(lines))
        self._notify_listeners()

    async def _texts(self) -> Callable[..., str]:
        """Notification texts in the language of Home Assistant.

        They live under `exceptions` in the translation files: hassfest has no category for notification texts,
        and `exceptions` is the one whose `{placeholders}` Home Assistant loads as plain messages.
        """
        strings = await async_get_translations(self.hass, self.hass.config.language, "exceptions", [DOMAIN])

        def text(key: str, **values: Any) -> str:
            return strings.get(f"component.{DOMAIN}.exceptions.{key}.message", key).format(**values)

        return text

    async def _async_send(self, title: str, message: str, *, persistent: bool = True) -> None:
        """Persistent notification (replaced each time), and the notify actions chosen."""
        if persistent:
            persistent_notification.async_create(self.hass, message, title=title, notification_id=NOTIFICATION_ID)
        for service in self.notify_services:
            name = service.removeprefix("notify.")
            if not self.hass.services.has_service("notify", name):
                _LOGGER.warning("Notify action notify.%s not found", name)
                continue
            try:
                await self.hass.services.async_call("notify", name, {"title": title, "message": message}, blocking=True)
            except Exception:  # noqa: BLE001 - a broken notifier must not stop the others
                _LOGGER.exception("Sending the notification with notify.%s failed", name)
