"""Constants for Battery Monitor."""

from __future__ import annotations

from typing import Final

DOMAIN: Final = "battery_monitor"
VERSION: Final = "1.18.1"

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

# Replacement forecast: the drain of each level battery is measured on its recorded history over this many
# days, once a day; a rise of at least FORECAST_RESET_JUMP points is a new battery, the measure starts there.
FORECAST_DAYS: Final = 30
FORECAST_MIN_DAYS: Final = 3
FORECAST_RESET_JUMP: Final = 15
FORECAST_HOURS: Final = 24
# Below this drain (% per day) the level is taken as stable: no replacement date.
FORECAST_MIN_DRAIN: Final = 0.05

# Name of the CSV written by the export action, in the configuration folder unless a path is given.
DEFAULT_EXPORT_FILE: Final = f"{DOMAIN}.csv"

SERVICE_NOTIFY: Final = "notify"
SERVICE_EXPORT: Final = "export"
SERVICE_SET_STOCK: Final = "set_stock"
# Spare batteries needed: those already low or unavailable, and those forecast to reach the threshold within this.
STOCK_HORIZON_DAYS: Final = 30
ATTR_PATH: Final = "path"
ATTR_BATTERY_TYPE: Final = "battery_type"
ATTR_COUNT: Final = "count"
NOTIFICATION_ID: Final = f"{DOMAIN}_low"
# Bus events: a battery went below the threshold, a battery was replaced (its level rose by FORECAST_RESET_JUMP).
EVENT_LOW: Final = f"{DOMAIN}_low"
EVENT_REPLACED: Final = f"{DOMAIN}_replaced"
STORAGE_KEY: Final = f"{DOMAIN}.below_since"
STORAGE_VERSION: Final = 1

# Option limits, shared by the options flow and the sidebar panel.
MIN_THRESHOLD: Final = 1
MAX_THRESHOLD: Final = 99
MIN_DURATION: Final = 0

CARD_URL: Final = f"/{DOMAIN}/battery-monitor-card.js"
PANEL_URL: Final = f"/{DOMAIN}/battery-monitor-panel.js"
PANEL_PATH: Final = "battery-monitor"
