"""Battery Monitor: low batteries notified twice a day, the bundled Lovelace card and the sidebar panel."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import voluptuous as vol
from homeassistant.components import persistent_notification
from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED, Platform
from homeassistant.core import CoreState, Event, HomeAssistant, ServiceCall, ServiceResponse, SupportsResponse, callback
from homeassistant.exceptions import ServiceValidationError, Unauthorized, UnknownUser
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.event import async_track_time_change, async_track_time_interval
from homeassistant.helpers.start import async_at_started
from homeassistant.helpers.storage import Store
from homeassistant.helpers.typing import ConfigType
from homeassistant.util import dt as dt_util

from . import system_hub_notice
from .const import (
    ATTR_BATTERY_TYPE,
    ATTR_COUNT,
    ATTR_PATH,
    CARD_URL,
    CONF_DURATION,
    CONF_EVENING,
    CONF_IGNORED_ENTITIES,
    CONF_IGNORED_INTEGRATIONS,
    CONF_MORNING,
    CONF_NOTIFY,
    CONF_THRESHOLD,
    DEFAULT_DURATION,
    DEFAULT_EVENING,
    DEFAULT_IGNORED_INTEGRATIONS,
    DEFAULT_MORNING,
    DEFAULT_THRESHOLD,
    DOMAIN,
    NOTIFICATION_ID,
    PANEL_URL,
    REFRESH_MINUTES,
    SERVICE_EXPORT,
    SERVICE_NOTIFY,
    SERVICE_SET_STOCK,
    STORAGE_KEY,
    STORAGE_VERSION,
    VERSION,
)
from .export import async_export, loaded_entry
from .monitor import BatteryMonitor
from .panel import async_register_panel

_LOGGER = logging.getLogger(__name__)

PLATFORMS = [Platform.BUTTON, Platform.SENSOR]
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

type BatteryMonitorConfigEntry = ConfigEntry[BatteryMonitor]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Serve the card and the sidebar panel, load the card on every dashboard and register the actions."""
    base = Path(__file__).parent / "frontend"
    # The release splits the card translations into <file>.i18n.<lang>.js files (scripts/split-frontend.mjs):
    # served next to the card, which fetches the one it needs. A git checkout has none.
    languages = await hass.async_add_executor_job(_language_files, base)
    await hass.http.async_register_static_paths(
        [
            StaticPathConfig(CARD_URL, str(base / "battery-monitor-card.js"), True),
            StaticPathConfig(PANEL_URL, str(base / "battery-monitor-panel.js"), True),
            *(StaticPathConfig(f"{CARD_URL.rsplit('/', 1)[0]}/{name}", str(base / name), True) for name in languages),
        ]
    )
    await async_register_panel(hass)

    async def _register(_: Event | None = None) -> None:
        if not await _async_register_resource(hass):
            # Dashboard resources in YAML mode: load the card on every page instead
            add_extra_js_url(hass, f"{CARD_URL}?v={VERSION}")

    if hass.state is CoreState.running:
        await _register()
    else:
        hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, _register)

    async def notify(_call: ServiceCall) -> None:
        if (entry := loaded_entry(hass)) is None:
            raise ServiceValidationError(translation_domain=DOMAIN, translation_key="not_loaded")
        await entry.runtime_data.async_notify(manual=True)

    hass.services.async_register(DOMAIN, SERVICE_NOTIFY, notify)

    async def export(call: ServiceCall) -> ServiceResponse:
        # Admin only, as async_register_admin_service does (it takes no supports_response in 2024.12, the minimum).
        if call.context.user_id:
            user = await hass.auth.async_get_user(call.context.user_id)
            if user is None:
                raise UnknownUser(context=call.context)
            if not user.is_admin:
                raise Unauthorized(context=call.context)
        return await async_export(hass, call.data.get(ATTR_PATH))

    async def set_stock(call: ServiceCall) -> None:
        if (entry := loaded_entry(hass)) is None:
            raise ServiceValidationError(translation_domain=DOMAIN, translation_key="not_loaded")
        entry.runtime_data.async_set_stock(call.data[ATTR_BATTERY_TYPE], call.data.get(ATTR_COUNT))

    # Counting the spare batteries is household bookkeeping, not configuration: open to every user, like notify.
    hass.services.async_register(
        DOMAIN,
        SERVICE_SET_STOCK,
        set_stock,
        schema=vol.Schema(
            {
                vol.Required(ATTR_BATTERY_TYPE): vol.All(cv.string, vol.Length(min=1, max=40)),
                vol.Optional(ATTR_COUNT): vol.Any(None, vol.All(vol.Coerce(int), vol.Range(min=0, max=999))),
            }
        ),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_EXPORT,
        export,
        schema=vol.Schema({vol.Optional(ATTR_PATH): cv.string}),
        supports_response=SupportsResponse.OPTIONAL,
    )
    return True


def _storage_resources(hass: HomeAssistant) -> Any | None:
    """Return the dashboard resources collection when it is editable from the UI.

    hass.data["lovelace"] is a dict before 2025.2, then a dataclass whose `mode` field became `resource_mode` in 2026.2.
    """
    lovelace = hass.data.get("lovelace")
    if isinstance(lovelace, dict):
        mode, resources = lovelace.get("resource_mode", lovelace.get("mode")), lovelace.get("resources")
    else:
        mode = getattr(lovelace, "resource_mode", getattr(lovelace, "mode", None))
        resources = getattr(lovelace, "resources", None)
    return resources if mode == "storage" else None


async def _async_register_resource(hass: HomeAssistant) -> bool:
    """Add or update the card in Settings → Dashboards → Resources."""
    resources = _storage_resources(hass)
    if resources is None:
        return False
    url = f"{CARD_URL}?v={VERSION}"
    try:
        await resources.async_get_info()  # loads the collection from storage
        existing = [item for item in resources.async_items() if item.get("url", "").split("?")[0] == CARD_URL]
        if not existing:
            await resources.async_create_item({"res_type": "module", "url": url})
            return True
        if existing[0]["url"] != url:
            await resources.async_update_item(existing[0]["id"], {"res_type": "module", "url": url})
        for duplicate in existing[1:]:
            await resources.async_delete_item(duplicate["id"])
    except Exception:  # noqa: BLE001 - never block the integration on the card
        _LOGGER.exception("Could not register the Battery Monitor card as a dashboard resource")
        return False
    return True


async def async_setup_entry(hass: HomeAssistant, entry: BatteryMonitorConfigEntry) -> bool:
    # Replaced by a System Hub module: a repair while System Hub is set up too.
    entry.async_on_unload(system_hub_notice.async_watch(hass, entry, "Battery Monitor"))
    options = entry.options
    monitor = BatteryMonitor(
        hass,
        int(options.get(CONF_THRESHOLD, DEFAULT_THRESHOLD)),
        timedelta(hours=float(options.get(CONF_DURATION, DEFAULT_DURATION))),
        options.get(CONF_NOTIFY, []),
        options.get(CONF_IGNORED_ENTITIES, []),
        options.get(CONF_IGNORED_INTEGRATIONS, DEFAULT_IGNORED_INTEGRATIONS),
        entry.entry_id,
    )
    if hass.state is CoreState.running:
        # async_setup runs once per start: after the entry was removed (which drops the card resource) and
        # added again, the resource has to come back without a restart.
        await _async_register_resource(hass)
    await monitor.async_load()
    entry.runtime_data = monitor
    entry.async_on_unload(monitor.async_listen())

    # Levels and durations move on even when no battery changes.
    @callback
    def refresh(now: datetime) -> None:
        monitor.async_refresh()
        # The drains are measured on the history once a day: a forecast of the replacement dates.
        if hass.state is CoreState.running and monitor.forecast_due(now):
            entry.async_create_background_task(hass, monitor.async_forecast(), f"{DOMAIN}_forecast")

    @callback
    def first_forecast(_hass: HomeAssistant) -> None:
        # Drains measured less than a day ago (kept in .storage) are reused: no 30-day history query at each restart.
        if not monitor.forecast_due():
            return
        entry.async_create_background_task(hass, monitor.async_forecast(), f"{DOMAIN}_forecast")

    entry.async_on_unload(async_track_time_interval(hass, refresh, timedelta(minutes=REFRESH_MINUTES)))
    # At start-up, the batteries of integrations loading after this one (ZHA, Z-Wave…) are not there yet:
    # the first forecast waits for Home Assistant to be started, rather than skipping them for a day.
    entry.async_on_unload(async_at_started(hass, first_forecast))

    async def scheduled(_now: datetime) -> None:
        await monitor.async_notify()

    times = set()
    for key, default in ((CONF_MORNING, DEFAULT_MORNING), (CONF_EVENING, DEFAULT_EVENING)):
        at = dt_util.parse_time(str(options.get(key, default))) or dt_util.parse_time(default)
        # The same morning and evening time schedules one notification, not two at the same second.
        if at in times:
            continue
        times.add(at)
        entry.async_on_unload(
            async_track_time_change(hass, scheduled, hour=at.hour, minute=at.minute, second=at.second)
        )

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_async_reload))
    return True


async def async_unload_entry(hass: HomeAssistant, entry: BatteryMonitorConfigEntry) -> bool:
    await entry.runtime_data.async_save()
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)


async def async_remove_entry(hass: HomeAssistant, entry: BatteryMonitorConfigEntry) -> None:
    """Drop the notification, the stored low-battery times and the card resource."""
    persistent_notification.async_dismiss(hass, NOTIFICATION_ID)
    # A reinstall must start every count afresh, not resume times from the removed entry.
    await Store(hass, STORAGE_VERSION, STORAGE_KEY).async_remove()
    if (resources := _storage_resources(hass)) is None:
        return
    for item in list(resources.async_items()):
        if item.get("url", "").split("?")[0] == CARD_URL:
            await resources.async_delete_item(item["id"])


async def _async_reload(hass: HomeAssistant, entry: BatteryMonitorConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


def _language_files(frontend: Path) -> list[str]:
    """The translation files the release split out of the frontend files, if any."""
    return sorted(p.name for p in frontend.glob("*.i18n.*.js"))
