"""Tests for Battery Monitor."""

from __future__ import annotations

from datetime import timedelta
from unittest.mock import AsyncMock, patch

from freezegun.api import FrozenDateTimeFactory
from homeassistant.components import persistent_notification
from homeassistant.core import HomeAssistant, State
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.setup import async_setup_component
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
    async_mock_service,
)

from custom_components.battery_monitor.const import (
    CARD_URL,
    CONF_DURATION,
    CONF_EVENING,
    CONF_IGNORED_ENTITIES,
    CONF_IGNORED_INTEGRATIONS,
    CONF_MORNING,
    CONF_NOTIFY,
    CONF_THRESHOLD,
    DOMAIN,
    NOTIFICATION_ID,
)

from .conftest import add_battery

LOW = "sensor.battery_monitor_low_batteries"
LAST = "sensor.battery_monitor_last_notification"
BUTTON = "button.battery_monitor_notify_now"
OPTIONS = {
    CONF_THRESHOLD: 20,
    CONF_DURATION: 24,
    CONF_MORNING: "09:00:00",
    CONF_EVENING: "19:00:00",
    CONF_NOTIFY: [],
    CONF_IGNORED_ENTITIES: [],
    CONF_IGNORED_INTEGRATIONS: ["mobile_app"],
}


async def _setup(hass: HomeAssistant, **options) -> MockConfigEntry:
    entry = MockConfigEntry(domain=DOMAIN, unique_id=DOMAIN, options={**OPTIONS, **options})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


def _batteries(hass: HomeAssistant) -> list[dict]:
    return hass.states.get(LOW).attributes["batteries"]


def _notification(hass: HomeAssistant) -> dict | None:
    return persistent_notification._async_get_or_create_notifications(hass).get(NOTIFICATION_ID)


async def test_config_flow_single_entry(hass: HomeAssistant) -> None:
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": "user"})
    assert result["type"] is FlowResultType.FORM
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {**OPTIONS, CONF_NOTIFY: ["mobile_app_phone"]}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["options"][CONF_NOTIFY] == ["notify.mobile_app_phone"]
    await hass.async_block_till_done()

    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": "user"})
    assert result["type"] is FlowResultType.ABORT


async def test_options_reload(hass: HomeAssistant) -> None:
    add_battery(hass, "Door", "15")
    entry = await _setup(hass)
    assert hass.states.get(LOW).state == "1"

    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(result["flow_id"], {**OPTIONS, CONF_THRESHOLD: 10})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    assert hass.states.get(LOW).state == "0"
    assert hass.states.get(LOW).attributes["threshold"] == 10


async def test_discovery(hass: HomeAssistant) -> None:
    add_battery(hass, "Door", "15", area="Kitchen")
    add_battery(hass, "Lock", "64")
    # Same device: the level sensor wins over the low-battery binary sensor
    add_battery(hass, "Remote", "8")
    add_battery(hass, "Remote", "on", domain="binary_sensor")
    # Binary sensor alone
    add_battery(hass, "Smoke", "on", domain="binary_sensor")
    # Left out: phone (mobile_app), an ignored entity, a hidden one
    add_battery(hass, "Phone", "5", platform="mobile_app")
    ignored = add_battery(hass, "Thermostat", "3")
    hidden = add_battery(hass, "Hidden", "2")
    er.async_get(hass).async_update_entity(hidden, hidden_by=er.RegistryEntryHider.USER)
    # Not a battery
    hass.states.async_set("sensor.temperature", "21", {"device_class": "temperature"})

    await _setup(hass, **{CONF_IGNORED_ENTITIES: [ignored]})
    batteries = _batteries(hass)
    assert [(b["name"], b["level"], b["low"]) for b in batteries] == [
        ("Remote", 8, True),
        ("Door", 15, True),
        ("Smoke", None, True),
        ("Lock", 64, False),
    ]
    assert batteries[1]["area"] == "Kitchen"
    assert batteries[0]["entity_id"].startswith("sensor.")
    assert batteries[0]["icon"] == "mdi:battery-10"
    assert batteries[2]["icon"] == "mdi:battery-alert-variant-outline"
    assert hass.states.get(LOW).state == "3"


async def test_duration_and_recovery(hass: HomeAssistant, freezer: FrozenDateTimeFactory) -> None:
    door = add_battery(hass, "Door", "50")
    await _setup(hass)
    assert hass.states.get(LOW).attributes["due"] == 0

    hass.states.async_set(door, "12", {"device_class": "battery", "unit_of_measurement": "%"})
    await hass.async_block_till_done()
    [battery] = _batteries(hass)
    assert battery["low"] and not battery["due"]

    freezer.tick(timedelta(hours=23))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert not _batteries(hass)[0]["due"]

    freezer.tick(timedelta(hours=1, minutes=10))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert _batteries(hass)[0]["due"]
    assert hass.states.get(LOW).attributes["due"] == 1

    # Replaced: no longer low, its time below the threshold is forgotten
    hass.states.async_set(door, "100", {"device_class": "battery", "unit_of_measurement": "%"})
    await hass.async_block_till_done()
    assert _batteries(hass)[0]["below_since"] is None
    hass.states.async_set(door, "10", {"device_class": "battery", "unit_of_measurement": "%"})
    await hass.async_block_till_done()
    assert not _batteries(hass)[0]["due"]


async def test_scheduled_notifications(hass: HomeAssistant, freezer: FrozenDateTimeFactory) -> None:
    calls = async_mock_service(hass, "notify", "mobile_app_phone")
    freezer.move_to(
        dt_util.as_utc(dt_util.parse_datetime("2026-10-24 08:00:00").replace(tzinfo=dt_util.get_default_time_zone()))
    )
    add_battery(hass, "Door", "12", area="Kitchen")
    add_battery(hass, "Smoke", "on", domain="binary_sensor")
    add_battery(hass, "Lock", "18")
    await _setup(hass, **{CONF_DURATION: 0, CONF_NOTIFY: ["notify.mobile_app_phone"]})

    freezer.move_to(
        dt_util.as_utc(dt_util.parse_datetime("2026-10-24 09:00:00").replace(tzinfo=dt_util.get_default_time_zone()))
    )
    async_fire_time_changed(hass)
    await hass.async_block_till_done()

    assert len(calls) == 1
    assert calls[0].data["title"] == "3 low batteries"
    assert calls[0].data["message"] == "• Door (Kitchen): 12 %\n• Lock: 18 %\n• Smoke: low"
    assert _notification(hass)["title"] == "3 low batteries"
    assert hass.states.get(LAST).attributes["notified"] == 3

    # All replaced before the evening: no message, the notification is cleared
    for entity_id in (e for e in hass.states.async_entity_ids() if e.endswith("_battery")):
        state = hass.states.get(entity_id)
        hass.states.async_set(entity_id, "off" if state.domain == "binary_sensor" else "100", state.attributes)
    freezer.move_to(
        dt_util.as_utc(dt_util.parse_datetime("2026-10-24 19:00:00").replace(tzinfo=dt_util.get_default_time_zone()))
    )
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert len(calls) == 1
    assert _notification(hass) is None
    assert hass.states.get(LAST).attributes["notified"] == 0


async def test_button_and_action(hass: HomeAssistant) -> None:
    calls = async_mock_service(hass, "notify", "mobile_app_phone")
    add_battery(hass, "Door", "5")
    await _setup(hass, **{CONF_DURATION: 0, CONF_NOTIFY: ["notify.mobile_app_phone", "notify.missing"]})

    await hass.services.async_call("button", "press", {"entity_id": BUTTON}, blocking=True)
    assert len(calls) == 1
    await hass.services.async_call(DOMAIN, "notify", {}, blocking=True)
    assert len(calls) == 2
    assert calls[1].data["title"] == "1 low battery"


async def test_low_since_survives_reload(hass: HomeAssistant, freezer: FrozenDateTimeFactory) -> None:
    add_battery(hass, "Door", "10")
    entry = await _setup(hass)
    since = _batteries(hass)[0]["below_since"]
    assert since is not None

    freezer.tick(timedelta(hours=2))
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert _batteries(hass)[0]["below_since"] == since


async def test_unavailable_keeps_low_since(hass: HomeAssistant, freezer: FrozenDateTimeFactory) -> None:
    door = add_battery(hass, "Door", "10")
    await _setup(hass, **{CONF_DURATION: 1})
    since = _batteries(hass)[0]["below_since"]

    hass.states.async_set(door, "unavailable", {"device_class": "battery", "unit_of_measurement": "%"})
    await hass.async_block_till_done()
    battery = _batteries(hass)[0]
    assert battery["unavailable"] and battery["icon"] == "mdi:battery-unknown" and not battery["due"]

    freezer.tick(timedelta(hours=2))
    hass.states.async_set(door, "9", {"device_class": "battery", "unit_of_measurement": "%"})
    await hass.async_block_till_done()
    battery = _batteries(hass)[0]
    assert battery["below_since"] == since and battery["due"]


async def test_manual_notify_ignores_duration(hass: HomeAssistant) -> None:
    calls = async_mock_service(hass, "notify", "mobile_app_phone")
    add_battery(hass, "Door", "12")
    add_battery(hass, "Lock", "80")
    await _setup(hass, **{CONF_NOTIFY: ["notify.mobile_app_phone"]})
    assert hass.states.get(LOW).attributes["due"] == 0

    await hass.services.async_call("button", "press", {"entity_id": BUTTON}, blocking=True)
    assert len(calls) == 1
    assert calls[0].data == {"title": "1 low battery", "message": "• Door: 12 %"}
    assert _notification(hass)["title"] == "1 low battery"


async def test_manual_notify_none_low(hass: HomeAssistant) -> None:
    calls = async_mock_service(hass, "notify", "mobile_app_phone")
    add_battery(hass, "Lock", "80")
    await _setup(hass, **{CONF_NOTIFY: ["notify.mobile_app_phone"]})

    await hass.services.async_call(DOMAIN, "notify", {}, blocking=True)
    assert calls[0].data == {"title": "No battery to check", "message": "Every battery is above 20 % and available."}
    assert _notification(hass) is None


async def test_low_since_from_history(hass: HomeAssistant, freezer: FrozenDateTimeFactory) -> None:
    now = dt_util.utcnow()
    door = add_battery(hass, "Door", "12")
    smoke = add_battery(hass, "Smoke", "on", domain="binary_sensor")
    went_low = now - timedelta(days=3)
    history = {
        door: [
            State(door, "40", last_changed=now - timedelta(days=5)),
            State(door, "unavailable", last_changed=now - timedelta(days=4)),
            State(door, "35", last_changed=now - timedelta(days=4, hours=-1)),
            State(door, "18", last_changed=went_low),
            State(door, "12", last_changed=now - timedelta(days=1)),
        ],
        # Low for the whole recorded period
        smoke: [State(smoke, "on", last_changed=now - timedelta(days=10))],
    }
    with patch("custom_components.battery_monitor.monitor._async_history", AsyncMock(return_value=history)):
        await _setup(hass)

    batteries = {b["name"]: b for b in _batteries(hass)}
    assert batteries["Door"]["below_since"] == went_low.isoformat()
    assert batteries["Door"]["due"]
    assert batteries["Smoke"]["below_since"] == (now - timedelta(days=10)).isoformat()


async def test_low_since_from_real_recorder(recorder_mock, hass: HomeAssistant, freezer: FrozenDateTimeFactory) -> None:
    from pytest_homeassistant_custom_component.components.recorder.common import async_wait_recording_done

    start = dt_util.utcnow()
    door = add_battery(hass, "Door", "45")
    await async_wait_recording_done(hass)
    freezer.tick(timedelta(hours=10))
    attrs = {"device_class": "battery", "unit_of_measurement": "%"}
    hass.states.async_set(door, "19", attrs)
    await async_wait_recording_done(hass)
    went_low = start + timedelta(hours=10)
    freezer.tick(timedelta(hours=30))
    hass.states.async_set(door, "15", attrs)
    await async_wait_recording_done(hass)

    await _setup(hass)
    battery = _batteries(hass)[0]
    assert dt_util.parse_datetime(battery["below_since"]) == went_low
    assert battery["due"]


async def test_unavailable_batteries_notified(hass: HomeAssistant, freezer: FrozenDateTimeFactory) -> None:
    calls = async_mock_service(hass, "notify", "mobile_app_phone")
    add_battery(hass, "Door", "12", area="Kitchen")
    motion = add_battery(hass, "Motion", "unavailable", area="Garage")
    add_battery(hass, "Smoke", "unknown", domain="binary_sensor")
    add_battery(hass, "Lock", "80")
    await _setup(hass, **{CONF_DURATION: 6, CONF_NOTIFY: ["notify.mobile_app_phone"]})

    state = hass.states.get(LOW)
    assert state.state == "1"
    assert state.attributes["unavailable"] == 2
    batteries = {b["name"]: b for b in _batteries(hass)}
    assert [b["name"] for b in _batteries(hass)] == ["Door", "Motion", "Smoke", "Lock"]
    assert batteries["Motion"]["alert"] and not batteries["Motion"]["low"] and batteries["Motion"]["below_since"]
    assert not batteries["Lock"]["alert"]

    # Asked for: right away, whatever the duration
    await hass.services.async_call("button", "press", {"entity_id": BUTTON}, blocking=True)
    assert calls[-1].data == {
        "title": "3 batteries to check",
        "message": "• Door (Kitchen): 12 %\n• Motion (Garage): unavailable\n• Smoke: unavailable",
    }

    # Back before the duration: no longer counted
    hass.states.async_set(motion, "64", {"device_class": "battery", "unit_of_measurement": "%"})
    await hass.async_block_till_done()
    assert hass.states.get(LOW).attributes["unavailable"] == 1
    assert {b["name"]: b for b in _batteries(hass)}["Motion"]["below_since"] is None

    # Still unavailable after the duration: due, and in the scheduled notification
    freezer.tick(timedelta(hours=6, minutes=10))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    batteries = {b["name"]: b for b in _batteries(hass)}
    assert batteries["Smoke"]["due"] and batteries["Door"]["due"] and not batteries["Motion"]["alert"]


async def test_batteries_not_recorded(recorder_mock, hass: HomeAssistant) -> None:
    """The batteries list can exceed the recorder's attribute limit: it stays out of the database."""
    from homeassistant.components.recorder.history import get_significant_states
    from pytest_homeassistant_custom_component.components.recorder.common import async_wait_recording_done

    start = dt_util.utcnow()
    add_battery(hass, "Door", "15")
    await _setup(hass)
    assert _batteries(hass)
    await async_wait_recording_done(hass)

    states = await recorder_mock.async_add_executor_job(get_significant_states, hass, start, None, [LOW])
    recorded = states[LOW][-1]
    assert "batteries" not in recorded.attributes
    assert recorded.attributes["threshold"] == 20


async def test_registry_changes_refresh_the_list(hass: HomeAssistant) -> None:
    """Hiding a battery, renaming its device or moving it to a room shows at once, not at the next tick."""
    door = add_battery(hass, "Door", "15")
    lock = add_battery(hass, "Lock", "64")
    await _setup(hass)
    assert [b["name"] for b in _batteries(hass)] == ["Door", "Lock"]

    entities = er.async_get(hass)
    entities.async_update_entity(lock, hidden_by=er.RegistryEntryHider.USER)
    await hass.async_block_till_done()
    assert [b["name"] for b in _batteries(hass)] == ["Door"]

    entities.async_update_entity(lock, hidden_by=None)
    await hass.async_block_till_done()
    assert [b["name"] for b in _batteries(hass)] == ["Door", "Lock"]

    devices = dr.async_get(hass)
    device_id = entities.async_get(door).device_id
    devices.async_update_device(device_id, name_by_user="Front door")
    await hass.async_block_till_done()
    assert _batteries(hass)[0]["name"] == "Front door"

    from homeassistant.helpers import area_registry as ar

    area = ar.async_get(hass).async_get_or_create("Hall")
    entities.async_update_entity(door, area_id=area.id)
    await hass.async_block_till_done()
    assert _batteries(hass)[0]["area"] == "Hall"


async def test_card_resource_back_after_remove_and_add(hass: HomeAssistant) -> None:
    """Removing the entry drops the card resource; adding it again without a restart brings it back."""
    assert await async_setup_component(hass, "lovelace", {})
    resources = hass.data["lovelace"].resources
    entry = await _setup(hass)

    def card_urls() -> list[str]:
        return [i["url"] for i in resources.async_items() if i["url"].split("?")[0] == CARD_URL]

    assert len(card_urls()) == 1

    assert await hass.config_entries.async_remove(entry.entry_id)
    await hass.async_block_till_done()
    assert card_urls() == []

    await _setup(hass)
    assert len(card_urls()) == 1
