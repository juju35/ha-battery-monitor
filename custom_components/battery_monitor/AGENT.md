# Battery Monitor — Agent Context

## Purpose
Home Assistant custom integration that finds every battery, tracks how long each one has been below a threshold, and notifies twice a day the ones that have stayed low for a configurable duration. It bundles a Lovelace card listing the batteries (icon, name, room, level).

## Architecture

```
custom_components/battery_monitor/
├── __init__.py      # Static path + dashboard resource for the card, action notify, entry setup: state listener, 10-min refresh, two time triggers
├── monitor.py       # BatteryMonitor: discovery, low / due tracking (persisted in .storage), notifications
├── config_flow.py   # Single entry; options: threshold (%), duration (h), morning_time, evening_time, notify_services, ignored_entities, ignored_integrations
├── sensor.py        # low_batteries (count + batteries list for the card), last_notification (timestamp + notified)
├── button.py        # notify_now
├── entity.py        # Shared service device, listener on BatteryMonitor
├── frontend/battery-monitor-card.js   # custom:battery-monitor-card, reads sensor.*_low_batteries attributes
├── const.py / icons.json / services.yaml / translations/{en,fr}.json / brand/
```

## Rules
- A battery is a `sensor` (level %) or `binary_sensor` (`on` = low) with device class `battery`. One per device: the level sensor wins over the binary sensor. Hidden entities, `ignored_entities` and entities of `ignored_integrations` (default `mobile_app`) are left out.
- *Low*: level < threshold, or binary `on`. *Alert* = low or unavailable (`unavailable` / `unknown`, often a dead battery). `below_since` is set when a battery becomes an alert (low then unavailable keeps the low time), cleared when it is available and above the threshold. Persisted in `.storage/battery_monitor.below_since` (delayed save, immediate save on unload so a reload never resets it).
- A battery already low when first seen (not in the store): `below_since` is read from the recorder history (up to `MAX_DURATION` h): right after its last state above the threshold, or its first recorded state when low all along. Recorded states are `LazyState` (no `.domain`): read the domain from the entity ID.
- *Due*: alert for at least `duration` hours. Only due batteries are notified on schedule; the button and the action (`manual=True`) send every alert, or a *none* message. Title *low batteries*, or *batteries to check* when one is unavailable.
- Notifications at `morning_time` and `evening_time` (local time), from the button and from the `battery_monitor.notify` action: persistent notification id `battery_monitor_low` (replaced; dismissed when nothing is due) + each `notify.*` action. Texts in translations `exceptions.*` (rendered with `str.format`). A failing notifier is logged and doesn't stop the others.
- The list is rebuilt on every battery state change and every 10 minutes (durations move on without state changes). Sorted alerts first: lowest level, low binary sensors, then unavailable.
- The card is served at `/battery_monitor/battery-monitor-card.js` and added to the dashboard resources (storage mode) or loaded with `add_extra_js_url` (YAML mode); removed with the entry. `_storage_resources()` reads `hass.data["lovelace"]` as a dict (before 2025.2) or a dataclass (`mode`, then `resource_mode` from 2026.2).
- Card lookup (`_lookup`): the registry part (integration sensors, the device's button) is cached per `hass.entities` object, never when empty; the sensor is picked from the states at each render (the one with a `batteries` list), so a sensor restored or missing at the first render is found when its state arrives.
- Minimum Home Assistant 2024.12.0 (`OptionsFlow.config_entry`); CI also runs the tests on it (`pytest-min-ha`).

## Release
Bump the version in `manifest.json`, `const.py` (`VERSION`) and the card (`BATTERY_MONITOR_CARD_VERSION`), add its CHANGELOG.md section; pushing to main publishes `vX.Y.Z` with `battery_monitor.zip` when that tag doesn't exist yet. Rerun notes with the "Update release notes" workflow (input `tag`).

## Tests
`pip install -r requirements_test.txt && pytest` — batteries are registry entities on mock devices (`tests/conftest.py`), notify actions are mocked, time is moved with `freezer`. Card: `node --test test/*.test.mjs` (the card file is evaluated in a `vm` context with stubs). Job `tests` runs on Python 3.14, i.e. the latest Home Assistant (2026.3+ needs Python 3.14; 3.13 would silently resolve to 2026.2) and prints its version as an annotation; job `pytest-min-ha` runs the suite on HA 2024.12.0. An autouse fixture (`tests/conftest.py`, `no_deprecated_calls`) fails any test during which Home Assistant reports a deprecated call naming `battery_monitor`, and CI turns those reports into annotations. `add_battery` reuses one mock config entry per platform (since 2026.8 a device belongs to a single config entry), and an entity given an area of its own also needs a name of its own (enforced since 2026.10).
Screenshots: `python scripts/screenshots.py` (Playwright, mock batteries, light EN / dark FR).
