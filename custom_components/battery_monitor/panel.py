"""Sidebar panel: the batteries, the settings and the actions on one page (administrators only).

The panel (``frontend/battery-monitor-panel.js``) shows the batteries with the bundled card and a
settings form backed by the WebSocket commands below:

- ``battery_monitor/settings``: the entry (state, device), its options (defaults filled in), the option
  limits and the choices offered to the form: notify actions, battery integrations, battery entities;
- ``battery_monitor/update_settings``: changes the options, with the same limits and normalisation as
  the options flow (the update listener reloads the entry once);
- ``battery_monitor/notify``: sends the notification now, like the button;
- ``battery_monitor/export``: writes the CSV export, like the ``battery_monitor.export`` action.
"""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.components import panel_custom, websocket_api
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.loader import async_get_integrations

from .config_flow import normalize_options
from .const import (
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
    MAX_DURATION,
    MAX_THRESHOLD,
    MIN_DURATION,
    MIN_THRESHOLD,
    PANEL_PATH,
    PANEL_URL,
    VERSION,
)
from .export import async_export, loaded_entry
from .monitor import BATTERY, DOMAINS

OPTION_DEFAULTS: dict[str, Any] = {
    CONF_THRESHOLD: DEFAULT_THRESHOLD,
    CONF_DURATION: DEFAULT_DURATION,
    CONF_MORNING: DEFAULT_MORNING,
    CONF_EVENING: DEFAULT_EVENING,
    CONF_NOTIFY: [],
    CONF_IGNORED_ENTITIES: [],
    CONF_IGNORED_INTEGRATIONS: DEFAULT_IGNORED_INTEGRATIONS,
}
LIMITS = {CONF_THRESHOLD: (MIN_THRESHOLD, MAX_THRESHOLD), CONF_DURATION: (MIN_DURATION, MAX_DURATION)}

# "HH:MM" or "HH:MM:SS", as the time selector stores it
_TIME = vol.Match(r"^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$")

OPTIONS_SCHEMA = {
    vol.Optional(CONF_THRESHOLD): vol.All(vol.Coerce(int), vol.Range(MIN_THRESHOLD, MAX_THRESHOLD)),
    vol.Optional(CONF_DURATION): vol.All(vol.Coerce(int), vol.Range(MIN_DURATION, MAX_DURATION)),
    vol.Optional(CONF_MORNING): vol.All(str, _TIME),
    vol.Optional(CONF_EVENING): vol.All(str, _TIME),
    vol.Optional(CONF_NOTIFY): [str],
    vol.Optional(CONF_IGNORED_ENTITIES): [str],
    vol.Optional(CONF_IGNORED_INTEGRATIONS): [str],
}


async def async_register_panel(hass: HomeAssistant) -> None:
    """Add the Battery Monitor entry to the sidebar (administrators only) and its commands."""
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_PATH,
        webcomponent_name="battery-monitor-panel",
        sidebar_title="Battery Monitor",
        sidebar_icon="mdi:battery-heart-variant",
        module_url=f"{PANEL_URL}?v={VERSION}",
        require_admin=True,
        config={"version": VERSION},
    )
    for command in (_ws_settings, _ws_update_settings, _ws_notify, _ws_export):
        websocket_api.async_register_command(hass, command)


def _entry(hass: HomeAssistant) -> ConfigEntry | None:
    """The single entry, whatever its state."""
    return next(iter(hass.config_entries.async_entries(DOMAIN)), None)


def _options(entry: ConfigEntry) -> dict[str, Any]:
    return {key: entry.options.get(key, default) for key, default in OPTION_DEFAULTS.items()}


def _notify_options(hass: HomeAssistant, chosen: list[str]) -> list[str]:
    """The notify actions a form can pick: the ones available, plus the ones already chosen."""
    available = {f"notify.{name}" for name in hass.services.async_services_for_domain("notify")}
    return sorted(available - {"notify.send_message", "notify.persistent_notification"} | set(chosen))


def _battery_entries(hass: HomeAssistant, entities: er.EntityRegistry) -> list[tuple[Any, er.RegistryEntry | None]]:
    """Every battery entity in the states (ignored and hidden ones included), with its registry entry."""
    return [
        (state, entities.async_get(state.entity_id))
        for state in hass.states.async_all(DOMAINS)
        if state.attributes.get("device_class") == BATTERY
    ]


async def _integration_options(hass: HomeAssistant, domains: set[str]) -> list[dict[str, str]]:
    integrations = await async_get_integrations(hass, domains)
    options = [{"value": d, "label": getattr(integrations.get(d), "name", d)} for d in domains]
    return sorted(options, key=lambda o: o["label"].casefold())


def _entity_options(hass: HomeAssistant, entities: er.EntityRegistry, batteries: list) -> list[dict[str, Any]]:
    """The battery entities a form can leave out: name, room and integration of each."""
    devices = dr.async_get(hass)
    areas = ar.async_get(hass)
    options = []
    for state, entry in batteries:
        device = devices.async_get(entry.device_id) if entry and entry.device_id else None
        area_id = (entry.area_id if entry else None) or (device.area_id if device else None)
        area = areas.async_get_area(area_id) if area_id else None
        name = ((device.name_by_user or device.name) if device else None) or state.name
        options.append(
            {
                "value": state.entity_id,
                "label": name,
                "area": area.name if area else None,
                "integration": entry.platform if entry else None,
            }
        )
    # The same integration's entities stay out of the list once that integration is ignored: the form filters by it
    return sorted(options, key=lambda o: (o["label"].casefold(), o["value"]))


async def _settings(hass: HomeAssistant, entry: ConfigEntry | None) -> dict[str, Any]:
    options = _options(entry) if entry else dict(OPTION_DEFAULTS)
    entities = er.async_get(hass)
    batteries = _battery_entries(hass, entities)
    domains = {entry.platform for _, entry in batteries if entry} | set(options[CONF_IGNORED_INTEGRATIONS])
    device = dr.async_get(hass).async_get_device(identifiers={(DOMAIN, entry.entry_id)}) if entry else None
    monitor = entry.runtime_data if entry and loaded_entry(hass) is entry else None
    last = monitor.last_notification if monitor else None
    return {
        "entry": {
            "entry_id": entry.entry_id,
            "state": entry.state.value,
            "device_id": device.id if device else None,
            "last_notification": last.isoformat() if last else None,
            "last_notified": monitor.last_notified if monitor else None,
        }
        if entry
        else None,
        "options": options,
        "limits": {key: list(value) for key, value in LIMITS.items()},
        "notify_options": _notify_options(hass, options[CONF_NOTIFY]),
        "integration_options": await _integration_options(hass, domains),
        "entity_options": _entity_options(hass, entities, batteries),
    }


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/settings"})
@websocket_api.require_admin
@websocket_api.async_response
async def _ws_settings(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    connection.send_result(msg["id"], await _settings(hass, _entry(hass)))


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/update_settings", **OPTIONS_SCHEMA})
@websocket_api.require_admin
@websocket_api.async_response
async def _ws_update_settings(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    if (entry := _entry(hass)) is None:
        connection.send_result(msg["id"], {"ok": False, "error": "not_found"})
        return
    current = _options(entry)
    options = normalize_options({**current, **{key: msg[key] for key in OPTION_DEFAULTS if key in msg}})
    if options != normalize_options(current):
        # The update listener reloads the entry once
        hass.config_entries.async_update_entry(entry, options=options)
    connection.send_result(msg["id"], {"ok": True, "options": _options(entry)})


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/notify"})
@websocket_api.require_admin
@websocket_api.async_response
async def _ws_notify(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (entry := loaded_entry(hass)) is None:
        connection.send_result(msg["id"], {"ok": False, "error": "not_loaded"})
        return
    monitor = entry.runtime_data
    await monitor.async_notify(manual=True)
    connection.send_result(msg["id"], {"ok": True, "notified": monitor.last_notified})


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/export", vol.Optional("path"): str})
@websocket_api.require_admin
@websocket_api.async_response
async def _ws_export(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    try:
        result = await async_export(hass, msg.get("path"))
    except HomeAssistantError as err:
        # ServiceValidationError carries the translation key (not_loaded, path_*); any other error its message
        key = getattr(err, "translation_key", None)
        connection.send_result(msg["id"], {"ok": False, "error": key or "write_failed", "message": str(err)})
        return
    connection.send_result(msg["id"], {"ok": True, **result})
