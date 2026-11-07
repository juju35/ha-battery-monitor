"""Bus events: battery_monitor_low and battery_monitor_replaced, on transitions only."""

from __future__ import annotations

from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import async_capture_events

from custom_components.battery_monitor.const import EVENT_LOW, EVENT_REPLACED

from .conftest import add_battery
from .test_init import _settle, _setup

LEVEL = {"device_class": "battery", "unit_of_measurement": "%"}


async def test_low_fires_on_crossing_only(hass: HomeAssistant) -> None:
    low = async_capture_events(hass, EVENT_LOW)
    door = add_battery(hass, "Door", "50")
    # Already low when first seen (set-up, restart): no event.
    add_battery(hass, "Lock", "5")
    smoke = add_battery(hass, "Smoke", "off", domain="binary_sensor")
    entry = await _setup(hass)
    assert low == []

    hass.states.async_set(door, "19", LEVEL)
    await _settle(hass)
    assert [e.data for e in low] == [
        {
            "entry_id": entry.entry_id,
            "entity_id": door,
            "device_id": _batteries_by_entity(hass)[door]["device_id"],
            "name": "Door",
            "level": 19,
            "threshold": 20,
        }
    ]
    # Still low, lower: no new event.
    hass.states.async_set(door, "12", LEVEL)
    await _settle(hass)
    assert len(low) == 1

    # A low binary sensor: no level.
    hass.states.async_set(smoke, "on", {"device_class": "battery"})
    await _settle(hass)
    assert len(low) == 2
    assert low[1].data["entity_id"] == smoke and low[1].data["level"] is None

    # Unavailable then back low: still the same low battery, no event.
    hass.states.async_set(door, "unavailable", LEVEL)
    await _settle(hass)
    hass.states.async_set(door, "11", LEVEL)
    await _settle(hass)
    assert len(low) == 2

    # A reload starts afresh: the batteries already low fire nothing.
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert len(low) == 2


async def test_replaced_fires_on_level_jump(hass: HomeAssistant) -> None:
    replaced = async_capture_events(hass, EVENT_REPLACED)
    low = async_capture_events(hass, EVENT_LOW)
    door = add_battery(hass, "Door", "10")
    entry = await _setup(hass)

    # A small rise (temperature, a recalibration) is not a replacement.
    hass.states.async_set(door, "20", LEVEL)
    await _settle(hass)
    assert replaced == []

    # Taken out (unavailable), then the new battery: from the last level read.
    hass.states.async_set(door, "unavailable", LEVEL)
    await _settle(hass)
    hass.states.async_set(door, "100", LEVEL)
    await _settle(hass)
    assert [e.data for e in replaced] == [
        {
            "entry_id": entry.entry_id,
            "entity_id": door,
            "device_id": _batteries_by_entity(hass)[door]["device_id"],
            "name": "Door",
            "level": 100,
            "previous_level": 20,
        }
    ]
    assert low == []
    # And the next drop below the threshold is a low event again.
    hass.states.async_set(door, "15", LEVEL)
    await _settle(hass)
    assert len(low) == 1 and len(replaced) == 1


def _batteries_by_entity(hass: HomeAssistant) -> dict[str, dict]:
    state = hass.states.get("sensor.battery_monitor_low_batteries")
    return {b["entity_id"]: b for b in state.attributes["batteries"]}
