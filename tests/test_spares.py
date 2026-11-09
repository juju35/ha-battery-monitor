"""Spare batteries: the stock per type, taken down on each replacement, and what is missing."""

from __future__ import annotations

from homeassistant.core import HomeAssistant

from custom_components.battery_monitor.const import DOMAIN
from custom_components.battery_monitor.monitor import split_type

from .conftest import add_battery
from .test_init import BUTTON, _notification, _settle, _setup

SPARES = "sensor.battery_monitor_spare_batteries"


def _typed(hass: HomeAssistant, entity_id: str, level: str, kind: str, quantity: int = 1) -> None:
    attrs = {"device_class": "battery", "unit_of_measurement": "%", "battery_type": kind, "battery_quantity": quantity}
    hass.states.async_set(entity_id, level, attrs)


def test_split_type() -> None:
    assert split_type("2× AA") == (2, "AA")
    assert split_type("3x AAA") == (3, "AAA")
    assert split_type("AA x2") == (2, "AA")
    assert split_type("CR2032") == (1, "CR2032")
    assert split_type("") is None
    assert split_type(None) is None


async def test_stock_needed_and_missing(hass: HomeAssistant) -> None:
    door = add_battery(hass, "Door", "12")
    _typed(hass, door, "12", "AA", 2)
    remote = add_battery(hass, "Remote", "80")
    _typed(hass, remote, "80", "CR2032")
    await _setup(hass)

    # Nothing counted yet.
    assert hass.states.get(SPARES).state == "0"
    assert hass.states.get(SPARES).attributes["stock"] == {}

    await hass.services.async_call(DOMAIN, "set_stock", {"battery_type": "AA", "count": 1}, blocking=True)
    await hass.services.async_call(DOMAIN, "set_stock", {"battery_type": "CR2032", "count": 3}, blocking=True)
    await _settle(hass)
    state = hass.states.get(SPARES)
    # The door is low: 2 AA needed, 1 in stock. The remote is fine: no CR2032 needed.
    assert state.state == "1"
    assert state.attributes["stock"] == {"AA": 1, "CR2032": 3}
    assert state.attributes["needed"] == {"AA": 2, "CR2032": 0}
    assert state.attributes["short"] == {"AA": 1}

    # The notification says what to buy.
    await hass.services.async_call("button", "press", {"entity_id": BUTTON}, blocking=True)
    await hass.async_block_till_done()
    assert "Spare batteries to buy: 1 AA" in _notification(hass)["message"]

    # The door's batteries are replaced: its two AA come out of the stock (never below 0), nothing is missing.
    _typed(hass, door, "unavailable", "AA", 2)
    await _settle(hass)
    _typed(hass, door, "100", "AA", 2)
    await _settle(hass)
    state = hass.states.get(SPARES)
    assert state.attributes["stock"] == {"AA": 0, "CR2032": 3}
    assert state.state == "0"

    # No count: stop counting the type.
    await hass.services.async_call(DOMAIN, "set_stock", {"battery_type": "CR2032"}, blocking=True)
    await _settle(hass)
    assert hass.states.get(SPARES).attributes["stock"] == {"AA": 0}


async def test_stock_kept_across_a_reload(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    await hass.services.async_call(DOMAIN, "set_stock", {"battery_type": "AAA", "count": 4}, blocking=True)
    await entry.runtime_data.async_save()
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert hass.states.get(SPARES).attributes["stock"] == {"AAA": 4}
