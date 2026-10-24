"""Battery Monitor: low batteries notified twice a day, and the bundled Lovelace card."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from homeassistant.components import persistent_notification
from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry, ConfigEntryState
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED, Platform
from homeassistant.core import CoreState, Event, HomeAssistant, ServiceCall, callback
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.event import async_track_time_change, async_track_time_interval
from homeassistant.helpers.typing import ConfigType
from homeassistant.util import dt as dt_util

from .const import (
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
    REFRESH_MINUTES,
    SERVICE_NOTIFY,
    VERSION,
)
from .monitor import BatteryMonitor

_LOGGER = logging.getLogger(__name__)

PLATFORMS = [Platform.BUTTON, Platform.SENSOR]
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

type BatteryMonitorConfigEntry = ConfigEntry[BatteryMonitor]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Serve the card, load it on every dashboard and register the notify action."""
    await hass.http.async_register_static_paths(
        [StaticPathConfig(CARD_URL, str(Path(__file__).parent / "frontend" / "battery-monitor-card.js"), True)]
    )

    async def _register(_: Event | None = None) -> None:
        if not await _async_register_resource(hass):
            # Dashboard resources in YAML mode: load the card on every page instead
            add_extra_js_url(hass, f"{CARD_URL}?v={VERSION}")

    if hass.state is CoreState.running:
        await _register()
    else:
        hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, _register)

    async def notify(_call: ServiceCall) -> None:
        entries = [e for e in hass.config_entries.async_entries(DOMAIN) if e.state is ConfigEntryState.LOADED]
        if not entries:
            raise ServiceValidationError("Battery Monitor is not loaded")
        await entries[0].runtime_data.async_notify(manual=True)

    hass.services.async_register(DOMAIN, SERVICE_NOTIFY, notify)
    return True


def _storage_resources(hass: HomeAssistant) -> Any | None:
    """Return the dashboard resources collection when it is editable from the UI."""
    lovelace = hass.data.get("lovelace")
    if getattr(lovelace, "resource_mode", None) != "storage":
        return None
    return getattr(lovelace, "resources", None)


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
    options = entry.options
    monitor = BatteryMonitor(
        hass,
        int(options.get(CONF_THRESHOLD, DEFAULT_THRESHOLD)),
        timedelta(hours=float(options.get(CONF_DURATION, DEFAULT_DURATION))),
        options.get(CONF_NOTIFY, []),
        options.get(CONF_IGNORED_ENTITIES, []),
        options.get(CONF_IGNORED_INTEGRATIONS, DEFAULT_IGNORED_INTEGRATIONS),
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
    def refresh(_now: datetime) -> None:
        monitor.async_refresh()

    entry.async_on_unload(async_track_time_interval(hass, refresh, timedelta(minutes=REFRESH_MINUTES)))

    async def scheduled(_now: datetime) -> None:
        await monitor.async_notify()

    for key, default in ((CONF_MORNING, DEFAULT_MORNING), (CONF_EVENING, DEFAULT_EVENING)):
        at = dt_util.parse_time(str(options.get(key, default))) or dt_util.parse_time(default)
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
    """Drop the notification and the card resource."""
    persistent_notification.async_dismiss(hass, NOTIFICATION_ID)
    if (resources := _storage_resources(hass)) is None:
        return
    for item in list(resources.async_items()):
        if item.get("url", "").split("?")[0] == CARD_URL:
            await resources.async_delete_item(item["id"])


async def _async_reload(hass: HomeAssistant, entry: BatteryMonitorConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)
