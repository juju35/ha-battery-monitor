"""Constants for Battery Monitor."""

from __future__ import annotations

from typing import Final

DOMAIN: Final = "battery_monitor"
VERSION: Final = "1.9.3"

CONF_THRESHOLD: Final = "threshold"
CONF_DURATION: Final = "duration"
CONF_MORNING: Final = "morning_time"
CONF_EVENING: Final = "evening_time"
CONF_NOTIFY: Final = "notify_services"
CONF_IGNORED_ENTITIES: Final = "ignored_entities"
CONF_IGNORED_INTEGRATIONS: Final = "ignored_integrations"

# A battery is low below this level (%).
DEFAULT_THRESHOLD: Final = 20
# Hours a battery must have stayed low before it is notified (0: right away).
DEFAULT_DURATION: Final = 24
MAX_DURATION: Final = 720
# The two daily notifications.
DEFAULT_MORNING: Final = "09:00:00"
DEFAULT_EVENING: Final = "19:00:00"
# Phone and tablet batteries come and go all day: left out unless the user removes them.
DEFAULT_IGNORED_INTEGRATIONS: Final = ["mobile_app"]

# Refresh of the list (levels, durations) between two state changes, in minutes.
REFRESH_MINUTES: Final = 10

SERVICE_NOTIFY: Final = "notify"
NOTIFICATION_ID: Final = f"{DOMAIN}_low"
STORAGE_KEY: Final = f"{DOMAIN}.below_since"
STORAGE_VERSION: Final = 1

CARD_URL: Final = f"/{DOMAIN}/battery-monitor-card.js"
