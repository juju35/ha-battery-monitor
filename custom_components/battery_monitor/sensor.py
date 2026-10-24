"""Sensors: low batteries (with every monitored battery for the card) and last notification."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity, SensorStateClass
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import BatteryMonitorConfigEntry
from .entity import BatteryMonitorEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: BatteryMonitorConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    m = entry.runtime_data
    async_add_entities(
        [
            LowBatteriesSensor(m, entry.entry_id, "low_batteries"),
            LastNotificationSensor(m, entry.entry_id, "last_notification"),
        ]
    )


class LowBatteriesSensor(BatteryMonitorEntity, SensorEntity):
    """Number of batteries below the threshold; every monitored battery in the attributes."""

    _attr_state_class = SensorStateClass.MEASUREMENT
    # The list holds every battery and changes with any of them: keep it out of the recorder.
    _unrecorded_attributes = frozenset({"batteries"})

    @property
    def native_value(self) -> int:
        return len(self.monitor.low)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {
            "unavailable": len(self.monitor.unavailable),
            "due": len(self.monitor.due),
            "threshold": self.monitor.threshold,
            "duration": self.monitor.duration.total_seconds() / 3600,
            "batteries": [b.as_dict() for b in self.monitor.batteries],
        }


class LastNotificationSensor(BatteryMonitorEntity, SensorEntity):
    """Time of the last scheduled or requested notification, with the number of batteries notified."""

    _attr_device_class = SensorDeviceClass.TIMESTAMP
    _attr_entity_category = EntityCategory.DIAGNOSTIC

    @property
    def native_value(self) -> datetime | None:
        return self.monitor.last_notification

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {"notified": self.monitor.last_notified}
