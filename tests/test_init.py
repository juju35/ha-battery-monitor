"""Tests for Battery Monitor."""

from __future__ import annotations

from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
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
from custom_components.battery_monitor.monitor import REFRESH_COOLDOWN

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


async def _settle(hass: HomeAssistant) -> None:
    """Let the coalesced refresh of the battery changes run (past the debouncer cooldown)."""
    await hass.async_block_till_done()
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=REFRESH_COOLDOWN + 1))
    await hass.async_block_till_done()


def _resources(hass: HomeAssistant):
    """The Lovelace resources collection: hass.data["lovelace"] is a dict before 2025.2, a dataclass after."""
    lovelace = hass.data["lovelace"]
    return lovelace["resources"] if isinstance(lovelace, dict) else lovelace.resources


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


async def test_same_morning_and_evening_notify_once(hass: HomeAssistant, freezer: FrozenDateTimeFactory) -> None:
    """The same morning and evening time schedules one notification, not two at the same second."""
    calls = async_mock_service(hass, "notify", "mobile_app_phone")
    freezer.move_to(
        dt_util.as_utc(dt_util.parse_datetime("2026-10-24 08:00:00").replace(tzinfo=dt_util.get_default_time_zone()))
    )
    add_battery(hass, "Door", "12")
    await _setup(
        hass, **{CONF_DURATION: 0, CONF_NOTIFY: ["notify.mobile_app_phone"], CONF_EVENING: OPTIONS[CONF_MORNING]}
    )

    freezer.move_to(
        dt_util.as_utc(dt_util.parse_datetime("2026-10-24 09:00:00").replace(tzinfo=dt_util.get_default_time_zone()))
    )
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert len(calls) == 1


async def test_storage_written_only_when_times_change(hass: HomeAssistant) -> None:
    """A plain level change schedules no .storage write: only a time below the threshold does."""
    from homeassistant.helpers.storage import Store

    door = add_battery(hass, "Door", "80")
    await _setup(hass)
    attributes = hass.states.get(door).attributes

    with patch.object(Store, "async_delay_save") as save:
        hass.states.async_set(door, "79", attributes)
        await hass.async_block_till_done()
        save.assert_not_called()

        hass.states.async_set(door, "10", attributes)
        await _settle(hass)
        save.assert_called()


async def test_battery_changes_coalesced(hass: HomeAssistant) -> None:
    """A burst of battery changes refreshes the list once right away and once after the cooldown, not per change."""
    door = add_battery(hass, "Door", "80")
    entry = await _setup(hass)
    monitor = entry.runtime_data
    attributes = hass.states.get(door).attributes

    with patch.object(monitor, "_notify_listeners", wraps=monitor._notify_listeners) as refreshed:
        for level in range(79, 59, -1):
            hass.states.async_set(door, str(level), attributes)
        await hass.async_block_till_done()
        assert refreshed.call_count == 1
        await _settle(hass)
        assert refreshed.call_count == 2
    assert _batteries(hass)[0]["level"] == 60


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


async def test_stored_low_since_kept_while_starting(hass: HomeAssistant, hass_storage: dict) -> None:
    """Stored times of batteries whose integration has not loaded yet survive the startup.

    The entry is often set up before ZHA/Z-Wave… have created their entities: the stored times must
    not be pruned before Home Assistant is running, or every low battery would restart its count.
    """
    from homeassistant.core import CoreState

    from custom_components.battery_monitor.const import STORAGE_KEY, STORAGE_VERSION

    stored = dt_util.utcnow() - timedelta(days=2)
    hass_storage[STORAGE_KEY] = {
        "version": STORAGE_VERSION,
        "data": {"sensor.door_battery": stored.isoformat(), "sensor.gone_battery": stored.isoformat()},
    }
    hass.set_state(CoreState.starting)
    await _setup(hass)
    assert _batteries(hass) == []

    # The battery's integration finishes loading after this entry: its stored time still counts
    door = add_battery(hass, "Door", "12")
    await hass.async_block_till_done()
    [battery] = _batteries(hass)
    assert battery["below_since"] == stored.isoformat() and battery["due"]

    # Once running, the entries of the batteries that are gone for good are pruned
    hass.set_state(CoreState.running)
    hass.states.async_set(door, "11", {"device_class": "battery", "unit_of_measurement": "%"})
    await _settle(hass)
    monitor = hass.config_entries.async_entries(DOMAIN)[0].runtime_data
    assert set(monitor._below_since) == {door}
    assert _batteries(hass)[0]["below_since"] == stored.isoformat()


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
    await _settle(hass)
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
    # 2026.10+ refuses an area of its own to an entity without a name of its own.
    entities.async_update_entity(door, area_id=area.id, name="Door battery")
    await hass.async_block_till_done()
    assert _batteries(hass)[0]["area"] == "Hall"


async def test_remove_drops_stored_low_since(hass: HomeAssistant, hass_storage: dict) -> None:
    """Removing the entry deletes the stored times: a reinstall starts every count afresh."""
    from custom_components.battery_monitor.const import STORAGE_KEY

    add_battery(hass, "Door", "10")
    entry = await _setup(hass)
    assert await hass.config_entries.async_remove(entry.entry_id)
    await hass.async_block_till_done()
    assert STORAGE_KEY not in hass_storage


async def test_action_when_not_loaded(hass: HomeAssistant) -> None:
    """The notify action raises a translated error when the entry is not loaded."""
    from homeassistant.exceptions import ServiceValidationError

    entry = await _setup(hass)
    assert await hass.config_entries.async_unload(entry.entry_id)
    with pytest.raises(ServiceValidationError) as err:
        await hass.services.async_call(DOMAIN, "notify", {}, blocking=True)
    assert err.value.translation_domain == DOMAIN and err.value.translation_key == "not_loaded"


async def test_card_resource_back_after_remove_and_add(hass: HomeAssistant) -> None:
    """Removing the entry drops the card resource; adding it again without a restart brings it back."""
    assert await async_setup_component(hass, "lovelace", {})
    resources = _resources(hass)
    entry = await _setup(hass)

    def card_urls() -> list[str]:
        return [i["url"] for i in resources.async_items() if i["url"].split("?")[0] == CARD_URL]

    assert len(card_urls()) == 1

    assert await hass.config_entries.async_remove(entry.entry_id)
    await hass.async_block_till_done()
    assert card_urls() == []

    await _setup(hass)
    assert len(card_urls()) == 1


@pytest.mark.parametrize(
    ("key", "container"),
    [("mode", dict), ("resource_mode", dict), ("mode", SimpleNamespace), ("resource_mode", SimpleNamespace)],
)
async def test_card_resource_with_lovelace_data_variants(hass: HomeAssistant, key: str, container: type) -> None:
    """hass.data["lovelace"]: a dict before 2025.2, then a dataclass with `mode`, renamed `resource_mode` in 2026.2."""
    assert await async_setup_component(hass, "lovelace", {})
    resources = _resources(hass)
    hass.data["lovelace"] = container(**{key: "storage", "resources": resources, "dashboards": {}})
    entry = await _setup(hass)

    def card_urls() -> list[str]:
        return [i["url"] for i in resources.async_items() if i["url"].split("?")[0] == CARD_URL]

    assert len(card_urls()) == 1
    assert await hass.config_entries.async_remove(entry.entry_id)
    await hass.async_block_till_done()
    assert card_urls() == []


async def test_card_resource_yaml_mode_untouched(hass: HomeAssistant) -> None:
    """Resources in YAML mode are not edited (the card is loaded on every page instead)."""
    from homeassistant.components.lovelace.resources import ResourceYAMLCollection

    assert await async_setup_component(hass, "lovelace", {})
    hass.data["lovelace"] = {"mode": "yaml", "resources": ResourceYAMLCollection([]), "dashboards": {}}
    with patch("custom_components.battery_monitor.add_extra_js_url") as add_js:
        await _setup(hass)
        await hass.async_block_till_done()
    add_js.assert_called_once()


@pytest.mark.parametrize(
    ("language", "title_many", "check_many", "title_one"),
    [
        ("sr", "Слабе батерије: 3", "Батерије за проверу: 3", "1 слаба батерија"),
        ("sr-Latn", "Slabe baterije: 3", "Baterije za proveru: 3", "1 slaba baterija"),
        ("pl", "Słabe baterie: 3", "Baterie do sprawdzenia: 3", "1 słaba bateria"),
        ("it", "3 batterie scariche", "3 batterie da controllare", "1 batteria scarica"),
        ("nl", "3 bijna lege batterijen", "3 batterijen te controleren", "1 bijna lege batterij"),
        ("pt", "3 baterias fracas", "3 baterias a verificar", "1 bateria fraca"),
        ("ro", "Baterii scăzute: 3", "Baterii de verificat: 3", "1 baterie scăzută"),
        ("da", "3 lave batterier", "3 batterier skal tjekkes", "1 lavt batteri"),
        ("sv", "3 låga batterier", "3 batterier att kontrollera", "1 lågt batteri"),
        ("bg", "3 изтощени батерии", "3 батерии за проверка", "1 изтощена батерия"),
        ("ru", "Разряженные батареи: 3", "Батареи для проверки: 3", "1 разряженная батарея"),
        ("uk", "Розряджені батареї: 3", "Батареї для перевірки: 3", "1 розряджена батарея"),
        ("hu", "3 gyenge elem", "3 ellenőrizendő elem", "1 gyenge elem"),
        ("sk", "Slabé batérie: 3", "Batérie na kontrolu: 3", "1 slabá batéria"),
        ("cs", "Slabé baterie: 3", "Baterie ke kontrole: 3", "1 slabá baterie"),
        ("sl", "Šibke baterije: 3", "Baterije za preverjanje: 3", "1 šibka baterija"),
        ("lv", "Izlādētas baterijas: 3", "Pārbaudāmas baterijas: 3", "1 izlādēta baterija"),
        ("el", "3 χαμηλές μπαταρίες", "3 μπαταρίες για έλεγχο", "1 χαμηλή μπαταρία"),
    ],
)
async def test_notification_titles(
    hass: HomeAssistant, language: str, title_many: str, check_many: str, title_one: str
) -> None:
    """Notification titles in each language; where the noun changes with the number, the count goes after a colon."""
    hass.config.language = language
    calls = async_mock_service(hass, "notify", "mobile_app_phone")
    add_battery(hass, "Door", "12")
    add_battery(hass, "Lock", "15")
    motion = add_battery(hass, "Motion", "18")
    await _setup(hass, **{CONF_NOTIFY: ["notify.mobile_app_phone"]})

    await hass.services.async_call(DOMAIN, "notify", {}, blocking=True)
    assert calls[-1].data["title"] == title_many

    hass.states.async_set(motion, "unavailable", {"device_class": "battery", "unit_of_measurement": "%"})
    await hass.async_block_till_done()
    await hass.services.async_call(DOMAIN, "notify", {}, blocking=True)
    assert calls[-1].data["title"] == check_many

    for entity_id in (e for e in hass.states.async_entity_ids() if e.endswith("_battery") and e != motion):
        hass.states.async_set(entity_id, "100", hass.states.get(entity_id).attributes)
    hass.states.async_set(motion, "18", {"device_class": "battery", "unit_of_measurement": "%"})
    await hass.async_block_till_done()
    await hass.services.async_call(DOMAIN, "notify", {}, blocking=True)
    assert calls[-1].data["title"] == title_one


def test_drain_per_day() -> None:
    from custom_components.battery_monitor.monitor import drain_per_day

    now = dt_util.utcnow()
    day = timedelta(days=1)
    # 1 % a day over ten days.
    assert drain_per_day([(now - day * (10 - i), 100 - i) for i in range(10)]) == 1.0
    # Stable level: no drain, a stable battery has no replacement date.
    assert drain_per_day([(now - day * 10, 80), (now - day * 5, 80), (now, 80)]) == 0.0
    # Too short, or too few points: unknown.
    assert drain_per_day([(now - day * 2, 90), (now - day, 89), (now, 88)]) is None
    assert drain_per_day([(now - day * 10, 90), (now, 80)]) is None
    # A jump up is a new battery: only the points from there count (two points, so unknown yet).
    assert drain_per_day([(now - day * 20, 40), (now - day * 10, 30), (now - day * 2, 100), (now, 99)]) is None
    # A small rise (reading noise) does not reset the measure.
    assert drain_per_day([(now - day * 10, 50), (now - day * 6, 47), (now - day * 5, 48), (now, 40)]) == 1.0


async def test_forecast_days_left_and_next_replacement(hass: HomeAssistant, freezer: FrozenDateTimeFactory) -> None:
    now = dt_util.utcnow()
    day = timedelta(days=1)
    door = add_battery(hass, "Door", "60")
    lamp = add_battery(hass, "Lamp", "90")
    add_battery(hass, "Smoke", "off", domain="binary_sensor")
    history = {
        # 2 % a day: 60 % is 20 days from the 20 % threshold.
        door: [State(door, str(100 - 2 * i), last_changed=now - day * (20 - i)) for i in range(21)],
        # Stable.
        lamp: [State(lamp, "90", last_changed=now - day * (10 - 3 * i)) for i in range(3)],
    }
    with patch("custom_components.battery_monitor.monitor._async_history", AsyncMock(return_value=history)) as mock:
        entry = await _setup(hass)
        await hass.async_block_till_done()
        # Only the level sensors are read, once at setup.
        assert mock.call_count == 1
        assert sorted(mock.call_args.args[1]) == sorted([door, lamp])

    batteries = {b["name"]: b for b in _batteries(hass)}
    assert batteries["Door"]["drain_per_day"] == 2.0
    assert batteries["Door"]["days_left"] == 20
    replace_by = dt_util.start_of_local_day(now + day * 20)
    assert batteries["Door"]["replace_by"] == replace_by.isoformat()
    assert batteries["Lamp"]["drain_per_day"] == 0.0
    assert batteries["Lamp"]["days_left"] is None
    assert batteries["Smoke"]["drain_per_day"] is None
    sensor = next(s for s in hass.states.async_all("sensor") if s.entity_id.endswith("_next_replacement"))
    assert dt_util.parse_datetime(sensor.state) == replace_by
    assert sensor.attributes["name"] == "Door"
    assert sensor.attributes["days_left"] == 20

    # The level moved on: the days left follow without reading the history again, which is reread once a day.
    hass.states.async_set(door, "40", {"device_class": "battery"})
    await hass.async_block_till_done()
    assert {b["name"]: b["days_left"] for b in _batteries(hass)}["Door"] == 10
    with patch("custom_components.battery_monitor.monitor._async_history", AsyncMock(return_value=history)) as mock:
        freezer.tick(timedelta(hours=23))
        async_fire_time_changed(hass)
        await hass.async_block_till_done()
        assert mock.call_count == 0
        freezer.tick(timedelta(hours=1, minutes=10))
        async_fire_time_changed(hass)
        await hass.async_block_till_done()
        assert mock.call_count == 1

    # A battery already low comes first in the next replacement, since when it went low.
    hass.states.async_set(door, "10", {"device_class": "battery"})
    await hass.async_block_till_done()
    sensor = next(s for s in hass.states.async_all("sensor") if s.entity_id.endswith("_next_replacement"))
    assert sensor.attributes["name"] == "Door"
    assert sensor.attributes["days_left"] == 0
    assert dt_util.parse_datetime(sensor.state) == dt_util.utcnow().replace(microsecond=0)
    assert entry.state.name == "LOADED"


async def test_export_csv(hass: HomeAssistant, tmp_path) -> None:
    import csv

    from homeassistant.exceptions import ServiceValidationError

    add_battery(hass, "Door", "12", area="Entrance")
    add_battery(hass, "Lamp", "90")
    await _setup(hass)
    await hass.async_block_till_done()

    # Default: battery_monitor.csv in the configuration folder.
    response = await hass.services.async_call(DOMAIN, "export", {}, blocking=True, return_response=True)
    path = hass.config.path("battery_monitor.csv")
    assert response == {"path": path, "batteries": 2}
    with open(path, encoding="utf-8", newline="") as file:
        rows = list(csv.DictReader(file))
    assert [r["name"] for r in rows] == ["Door", "Lamp"]
    assert rows[0]["area"] == "Entrance"
    assert rows[0]["level"] == "12"
    assert rows[0]["low"] == "1"
    assert rows[1]["low"] == "0"
    assert "days_left" in rows[0]

    # A relative path is inside the configuration folder; a path outside the allowed folders is refused.
    response = await hass.services.async_call(
        DOMAIN, "export", {"path": "exports/batteries.csv"}, blocking=True, return_response=True
    )
    assert response["path"] == hass.config.path("exports/batteries.csv")
    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(DOMAIN, "export", {"path": str(tmp_path / "out.csv")}, blocking=True)
