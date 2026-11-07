"""Diagnostics: the options and the battery list, the notify actions redacted."""

from __future__ import annotations

from homeassistant.core import HomeAssistant

from custom_components.battery_monitor.const import CONF_NOTIFY
from custom_components.battery_monitor.diagnostics import async_get_config_entry_diagnostics

from .conftest import add_battery
from .test_init import _setup


async def test_diagnostics_redacted(hass: HomeAssistant) -> None:
    add_battery(hass, "Door", "12", area="Kitchen")
    add_battery(hass, "Lock", "80")
    entry = await _setup(hass, **{CONF_NOTIFY: ["notify.mobile_app_julien_phone"]})

    diag = await async_get_config_entry_diagnostics(hass, entry)
    assert diag["entry"]["options"][CONF_NOTIFY] == "**REDACTED**"
    assert diag["entry"]["options"]["threshold"] == 20
    assert "julien" not in str(diag)
    monitor = diag["monitor"]
    assert monitor["threshold"] == 20
    assert monitor["duration_hours"] == 24
    assert monitor["notify_services"] == 1
    assert [(b["name"], b["level"], b["area"]) for b in monitor["batteries"]] == [
        ("Door", 12, "Kitchen"),
        ("Lock", 80, None),
    ]
