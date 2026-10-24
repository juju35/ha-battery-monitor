"""Fixtures for Battery Monitor tests."""

from __future__ import annotations

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(request: pytest.FixtureRequest):
    """Load custom_components/ in every test (after the recorder, for the tests that use it)."""
    if "recorder_mock" in request.fixturenames:
        request.getfixturevalue("recorder_mock")
    request.getfixturevalue("enable_custom_integrations")
    yield


def add_battery(
    hass: HomeAssistant,
    name: str,
    state: str,
    *,
    domain: str = "sensor",
    platform: str = "zha",
    device: str | None = None,
    area: str | None = None,
) -> str:
    """A battery entity of `platform`, on a device named `device` (or `name`), placed in `area`."""
    # One config entry per platform: since 2026.8 a device belongs to a single config entry, so the
    # same identifiers under another entry would make another device.
    entry = next(iter(hass.config_entries.async_entries(platform)), None)
    if entry is None:
        entry = MockConfigEntry(domain=platform)
        entry.add_to_hass(hass)
    devices = dr.async_get(hass)
    dev = devices.async_get_or_create(
        config_entry_id=entry.entry_id,
        identifiers={(platform, device or name)},
        name=device or name,
    )
    if area:
        from homeassistant.helpers import area_registry as ar

        area_id = ar.async_get(hass).async_get_or_create(area).id
        devices.async_update_device(dev.id, area_id=area_id)
    entity = er.async_get(hass).async_get_or_create(
        domain,
        platform,
        f"{name}_{domain}",
        config_entry=entry,
        device_id=dev.id,
        suggested_object_id=f"{name.lower().replace(' ', '_')}_battery",
    )
    attributes = {"device_class": "battery"}
    if domain == "sensor":
        attributes["unit_of_measurement"] = "%"
    hass.states.async_set(entity.entity_id, state, attributes)
    return entity.entity_id
