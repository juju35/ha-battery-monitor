"""Tests for the sidebar panel and its WebSocket commands."""

from __future__ import annotations

from unittest.mock import patch

import pytest
from homeassistant.components.frontend import DATA_PANELS
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry, async_mock_service

from custom_components.battery_monitor.const import (
    CONF_IGNORED_ENTITIES,
    CONF_NOTIFY,
    CONF_THRESHOLD,
    DOMAIN,
    PANEL_PATH,
    PANEL_URL,
    VERSION,
)

from .conftest import add_battery
from .test_init import LOW, OPTIONS, _setup


async def _ws(hass, hass_ws_client, payload, token=None):
    client = await hass_ws_client(hass, token) if token else await hass_ws_client(hass)
    await client.send_json_auto_id(payload)
    return await client.receive_json()


async def test_panel_registered_for_admins(hass: HomeAssistant) -> None:
    await _setup(hass)
    panel = hass.data[DATA_PANELS][PANEL_PATH]
    assert panel.require_admin
    assert panel.sidebar_title == "Battery Monitor"
    assert panel.config["_panel_custom"]["module_url"] == f"{PANEL_URL}?v={VERSION}"


async def test_panel_served(hass: HomeAssistant, hass_client) -> None:
    await _setup(hass)
    resp = await (await hass_client()).get(PANEL_URL)
    assert resp.status == 200
    text = await resp.text()
    assert f"BATTERY_MONITOR_PANEL_VERSION = '{VERSION}'" in text
    assert "customElements.define('battery-monitor-panel'" in text


async def test_settings(hass: HomeAssistant, hass_ws_client) -> None:
    async_mock_service(hass, "notify", "mobile_app_phone")
    async_mock_service(hass, "notify", "persistent_notification")
    door = add_battery(hass, "Door", "15", area="Kitchen")
    add_battery(hass, "Phone", "50", platform="mobile_app")
    entry = await _setup(hass, **{CONF_NOTIFY: ["notify.gone"]})
    msg = await _ws(hass, hass_ws_client, {"type": "battery_monitor/settings"})
    assert msg["success"]
    result = msg["result"]
    assert result["entry"]["entry_id"] == entry.entry_id
    assert result["entry"]["state"] == "loaded"
    # The service device: the one of the integration's own sensor
    assert result["entry"]["device_id"] == er.async_get(hass).async_get(LOW).device_id
    assert result["entry"]["last_notification"] is None
    assert result["options"] == {**OPTIONS, CONF_NOTIFY: ["notify.gone"]}
    assert result["limits"] == {"threshold": [1, 99], "duration": [0, 720]}
    # The notify actions available plus the one chosen; send_message and persistent_notification left out
    assert result["notify_options"] == ["notify.gone", "notify.mobile_app_phone"]
    # The integrations with a battery (ignored ones included), by name
    assert [o["value"] for o in result["integration_options"]] == ["mobile_app", "zha"]
    # Every battery entity, the ignored phone included, with its room and integration
    entities = {o["value"]: o for o in result["entity_options"]}
    assert entities[door] == {"value": door, "label": "Door", "area": "Kitchen", "integration": "zha"}
    assert entities["sensor.phone_battery"]["integration"] == "mobile_app"


async def test_settings_without_entry(hass: HomeAssistant, hass_ws_client) -> None:
    from homeassistant.setup import async_setup_component

    assert await async_setup_component(hass, DOMAIN, {})
    await hass.async_block_till_done()
    msg = await _ws(hass, hass_ws_client, {"type": "battery_monitor/settings"})
    assert msg["success"]
    assert msg["result"]["entry"] is None
    assert msg["result"]["options"] == OPTIONS


async def test_update_settings_reloads_once(hass: HomeAssistant, hass_ws_client) -> None:
    add_battery(hass, "Door", "15")
    entry = await _setup(hass)
    assert hass.states.get(LOW).state == "1"
    with patch.object(hass.config_entries, "async_reload", wraps=hass.config_entries.async_reload) as reload:
        msg = await _ws(
            hass,
            hass_ws_client,
            {
                "type": "battery_monitor/update_settings",
                CONF_THRESHOLD: 10,
                "morning_time": "08:30",
                "notify_services": ["mobile_app_phone", "notify.mobile_app_phone", " "],
            },
        )
        await hass.async_block_till_done()
    assert msg["result"]["ok"]
    assert reload.call_count == 1
    # Normalised like the options flow: HH:MM:SS, notify. prefix, no duplicates; the other options kept
    assert entry.options == {
        **OPTIONS,
        CONF_THRESHOLD: 10,
        "morning_time": "08:30:00",
        CONF_NOTIFY: ["notify.mobile_app_phone"],
    }
    assert msg["result"]["options"] == entry.options
    assert hass.states.get(LOW).state == "0"


async def test_update_settings_unchanged_does_not_reload(hass: HomeAssistant, hass_ws_client) -> None:
    entry = await _setup(hass)
    with patch.object(hass.config_entries, "async_reload") as reload:
        msg = await _ws(
            hass,
            hass_ws_client,
            {"type": "battery_monitor/update_settings", CONF_THRESHOLD: 20, "evening_time": "19:00"},
        )
        await hass.async_block_till_done()
    assert msg["result"]["ok"]
    reload.assert_not_called()
    assert entry.options == OPTIONS


@pytest.mark.parametrize(
    "option",
    [{"threshold": 0}, {"threshold": 100}, {"duration": -1}, {"duration": 721}, {"morning_time": "25:00"}],
)
async def test_update_settings_rejects_out_of_range(hass: HomeAssistant, hass_ws_client, option) -> None:
    entry = await _setup(hass)
    msg = await _ws(hass, hass_ws_client, {"type": "battery_monitor/update_settings", **option})
    assert not msg["success"]
    assert msg["error"]["code"] == "invalid_format"
    assert entry.options == OPTIONS


async def test_update_settings_without_entry(hass: HomeAssistant, hass_ws_client) -> None:
    from homeassistant.setup import async_setup_component

    assert await async_setup_component(hass, DOMAIN, {})
    msg = await _ws(hass, hass_ws_client, {"type": "battery_monitor/update_settings", CONF_THRESHOLD: 10})
    assert msg["result"] == {"ok": False, "error": "not_found"}


async def test_notify(hass: HomeAssistant, hass_ws_client) -> None:
    calls = async_mock_service(hass, "notify", "mobile_app_phone")
    add_battery(hass, "Door", "15")
    await _setup(hass, **{CONF_NOTIFY: ["notify.mobile_app_phone"]})
    msg = await _ws(hass, hass_ws_client, {"type": "battery_monitor/notify"})
    assert msg["result"] == {"ok": True, "notified": 1}
    assert len(calls) == 1
    assert "Door" in calls[0].data["message"]
    settings = await _ws(hass, hass_ws_client, {"type": "battery_monitor/settings"})
    assert settings["result"]["entry"]["last_notified"] == 1
    assert settings["result"]["entry"]["last_notification"] is not None


async def test_notify_not_loaded(hass: HomeAssistant, hass_ws_client) -> None:
    entry = await _setup(hass)
    await hass.config_entries.async_unload(entry.entry_id)
    msg = await _ws(hass, hass_ws_client, {"type": "battery_monitor/notify"})
    assert msg["result"] == {"ok": False, "error": "not_loaded"}


async def test_export(hass: HomeAssistant, hass_ws_client) -> None:
    add_battery(hass, "Door", "15")
    add_battery(hass, "Lock", "64")
    await _setup(hass)
    msg = await _ws(hass, hass_ws_client, {"type": "battery_monitor/export"})
    assert msg["result"] == {"ok": True, "path": hass.config.path("battery_monitor.csv"), "batteries": 2}
    msg = await _ws(hass, hass_ws_client, {"type": "battery_monitor/export", "path": "exports/batteries.csv"})
    assert msg["result"]["path"] == hass.config.path("exports/batteries.csv")
    with open(msg["result"]["path"], encoding="utf-8") as file:
        assert file.readline().startswith("entity_id,name,")


async def test_export_refused(hass: HomeAssistant, hass_ws_client, tmp_path) -> None:
    await _setup(hass)
    msg = await _ws(hass, hass_ws_client, {"type": "battery_monitor/export", "path": str(tmp_path / "out.csv")})
    assert msg["result"]["ok"] is False
    assert msg["result"]["error"] == "path_not_allowed"
    msg = await _ws(hass, hass_ws_client, {"type": "battery_monitor/export", "path": "batteries.txt"})
    assert msg["result"]["error"] == "path_not_csv"


async def test_export_not_loaded(hass: HomeAssistant, hass_ws_client) -> None:
    entry = await _setup(hass)
    await hass.config_entries.async_unload(entry.entry_id)
    msg = await _ws(hass, hass_ws_client, {"type": "battery_monitor/export"})
    assert msg["result"]["error"] == "not_loaded"


@pytest.mark.parametrize(
    "command",
    ["battery_monitor/settings", "battery_monitor/update_settings", "battery_monitor/notify", "battery_monitor/export"],
)
async def test_panel_commands_refused_to_non_admin(
    hass: HomeAssistant, hass_ws_client, hass_read_only_access_token, command
) -> None:
    await _setup(hass)
    msg = await _ws(hass, hass_ws_client, {"type": command}, hass_read_only_access_token)
    assert not msg["success"]
    assert msg["error"]["code"] == "unauthorized"


async def test_ignored_entity_options_keep_the_ignored_battery(hass: HomeAssistant, hass_ws_client) -> None:
    """A battery left out stays in the choices, so it can be put back."""
    ignored = add_battery(hass, "Thermostat", "3")
    await _setup(hass, **{CONF_IGNORED_ENTITIES: [ignored]})
    assert hass.states.get(LOW).state == "0"
    msg = await _ws(hass, hass_ws_client, {"type": "battery_monitor/settings"})
    assert ignored in [o["value"] for o in msg["result"]["entity_options"]]
    entry: MockConfigEntry = hass.config_entries.async_entries(DOMAIN)[0]
    msg = await _ws(hass, hass_ws_client, {"type": "battery_monitor/update_settings", CONF_IGNORED_ENTITIES: []})
    await hass.async_block_till_done()
    assert msg["result"]["ok"]
    assert entry.options[CONF_IGNORED_ENTITIES] == []
    assert hass.states.get(LOW).state == "1"
