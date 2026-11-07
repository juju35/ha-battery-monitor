"""Diagnostics for Battery Monitor: the options and what the monitor holds, personal names redacted."""

from __future__ import annotations

from typing import Any

from homeassistant.components.diagnostics import async_redact_data
from homeassistant.core import HomeAssistant

from . import BatteryMonitorConfigEntry
from .const import CONF_NOTIFY

# The notify actions name their phones ("notify.mobile_app_julien_s_phone"). The battery names, rooms and levels
# are what a diagnosis needs, and hold nothing secret.
TO_REDACT = {CONF_NOTIFY}


async def async_get_config_entry_diagnostics(hass: HomeAssistant, entry: BatteryMonitorConfigEntry) -> dict[str, Any]:
    monitor = entry.runtime_data
    return {
        "entry": async_redact_data({"data": dict(entry.data), "options": dict(entry.options)}, TO_REDACT),
        "monitor": {
            "threshold": monitor.threshold,
            "duration_hours": monitor.duration.total_seconds() / 3600,
            "ignored_entities": sorted(monitor.ignored_entities),
            "ignored_integrations": sorted(monitor.ignored_integrations),
            "notify_services": len(monitor.notify_services),
            "last_notification": monitor.last_notification.isoformat() if monitor.last_notification else None,
            "last_notified": monitor.last_notified,
            "forecast_at": monitor.forecast_at.isoformat() if monitor.forecast_at else None,
            "batteries": [b.as_dict() for b in monitor.batteries],
        },
    }
