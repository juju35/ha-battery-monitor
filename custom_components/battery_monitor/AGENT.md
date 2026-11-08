# Battery Monitor — Agent Context

## Purpose
Home Assistant custom integration that finds every battery, tracks how long each one has been below a threshold, and notifies twice a day the ones that have stayed low for a configurable duration. It bundles a Lovelace card listing the batteries (icon, name, room, level).

## Architecture

```
custom_components/battery_monitor/
├── __init__.py      # Static path + dashboard resource for the card, actions notify and export (CSV), entry setup: state listener, 10-min refresh (+ daily forecast), two time triggers
├── monitor.py       # BatteryMonitor: discovery, low / due tracking (persisted in .storage), notifications, replacement forecast (drain_per_day)
├── config_flow.py   # Single entry; options: threshold (%), duration (h), morning_time, evening_time, notify_services, ignored_entities, ignored_integrations
├── sensor.py        # low_batteries (count + batteries list for the card), last_notification (timestamp + notified), next_replacement (timestamp)
├── button.py        # notify_now
├── entity.py        # Shared service device, listener on BatteryMonitor
├── diagnostics.py   # Entry options (notify_services redacted) + monitor state and battery list
├── frontend/battery-monitor-card.js   # custom:battery-monitor-card (+ custom:battery-monitor-mini-card), reads sensor.*_low_batteries attributes
├── const.py / icons.json / services.yaml / translations/{en,fr,de,es,it,nl,pt,pt-BR,pl,ro,da,sv,bg,ru,uk,hu,sk,cs,sl,lv,el,sr,sr-Latn}.json / brand/
```

## Rules
- A battery is a `sensor` (level %) or `binary_sensor` (`on` = low) with device class `battery`. One per device: the level sensor wins over the binary sensor. Hidden entities, `ignored_entities` and entities of `ignored_integrations` (default `mobile_app`) are left out.
- *Low*: level < threshold, or binary `on`. *Alert* = low or unavailable (`unavailable` / `unknown`, often a dead battery). `below_since` is set when a battery becomes an alert (low then unavailable keeps the low time), cleared when it is available and above the threshold. Persisted in `.storage/battery_monitor.below_since` (delayed save, immediate save on unload so a reload never resets it).
- A battery already low when first seen (not in the store): `below_since` is read from the recorder history (up to `MAX_DURATION` h): right after its last state above the threshold, or its first recorded state when low all along. Recorded states are `LazyState` (no `.domain`): read the domain from the entity ID.
- *Due*: alert for at least `duration` hours. Only due batteries are notified on schedule; the button and the action (`manual=True`) send every alert, or a *none* message. Title *low batteries*, or *batteries to check* when one is unavailable.
- Notifications at `morning_time` and `evening_time` (local time), from the button and from the `battery_monitor.notify` action: persistent notification id `battery_monitor_low` (replaced; dismissed when nothing is due) + each `notify.*` action. Texts in translations `exceptions.*` (rendered with `str.format`). A failing notifier is logged and doesn't stop the others.
- The list is rebuilt on every battery state change and every 10 minutes (durations move on without state changes).
- *Events* (`_fire_events`, from `async_refresh`): `battery_monitor_low` when an available battery turns low, `battery_monitor_replaced` when its level rises by `FORECAST_RESET_JUMP` or more; compared with `_last`, the last *available* reading per entity (an unavailable gap keeps it). A battery without a previous reading (start-up, reload, newly found) only sets it, and nothing fires before Home Assistant is running.
- *Forecast*: `async_forecast` (a background task once Home Assistant is started — `async_at_started`, so the batteries of integrations loading later such as ZHA / Z-Wave are measured — then from the 10-min refresh, only while running, once `FORECAST_HOURS` passed) reads the history of the level sensors over `FORECAST_DAYS` and keeps `drain_per_day(points)` per entity (least-squares slope since the last rise ≥ `FORECAST_RESET_JUMP`, None under `FORECAST_MIN_DAYS` / 3 points, 0.0 under `FORECAST_MIN_DRAIN`). `async_refresh` derives `days_left` / `replace_by` (start of local day) for the batteries not in alert. `next_replacement`: first alert battery (its `below_since`), else the earliest `replace_by`.
- `export` action (admin only: checked in the handler, `async_register_admin_service` has no `supports_response` in 2024.12): `Battery.as_row()` → CSV in the executor; `_refused` (blocking, run in the executor, symlinks resolved) returns the translation key of the refusal: outside the configuration folder and `allowlist_external_dirs` (`path_not_allowed`), in a hidden folder such as `.storage` (`path_hidden`), not a `.csv` name or an existing non-file (`path_not_csv`). Sorted alerts first: lowest level, low binary sensors, then unavailable.
- The card is served at `/battery_monitor/battery-monitor-card.js` and added to the dashboard resources (storage mode) or loaded with `add_extra_js_url` (YAML mode); removed with the entry. `_storage_resources()` reads `hass.data["lovelace"]` as a dict (before 2025.2) or a dataclass (`mode`, then `resource_mode` from 2026.2).
- Card lookup (`_lookup`): the registry part (integration sensors, the device's button) is cached per `hass.entities` object, never when empty; the sensor is picked from the states at each render (the one with a `batteries` list), so a sensor restored or missing at the first render is found when its state arrives.
- Card full screen (`popup`): a host `div` appended to `document.body` with its own shadow root (no dashboard container clips it), events delegated on that root; closing removes the host once (a second `removeChild` throws and would leave the popup marked open). Grouped by room (`area`) or by battery type; *To replace* sums the types of the batteries low or unavailable.
- Mini card (`BatteryMonitorMiniCard extends BatteryMonitorCard`): `_compact()` lists only the alert batteries and hides the full screen button; the `.zoom` button (top right) toggles the full card; a capture-phase document click outside the card (and outside its full screen, not in a dialog) folds it back; `mini` host attribute set in `setConfig`; shares the main editor.
- Battery type (card only): `battery_types[entity_id]` from the card config, else `battery_models[model]` (the device's `model` in `hass.devices`), else Battery Notes — the battery state's `battery_type` / `battery_quantity` attributes, or a sensor of the same device with translation key `battery_type` (or an entity ID ending in `_battery_type`). `bmParseType` reads `2× AA`, `2x AA`, `AA x2`. The editor lists the models of the batteries without a detected type, then the batteries still without a type (plus the ones already set).
- Minimum Home Assistant 2024.12.0 (`OptionsFlow.config_entry`); CI also runs the tests on it (`pytest-min-ha`).

## Release
Bump the version in `manifest.json`, `const.py` (`VERSION`) and the card (`BATTERY_MONITOR_CARD_VERSION`), add its CHANGELOG.md section; pushing to main publishes `vX.Y.Z` with `battery_monitor.zip` when that tag doesn't exist yet. Rerun notes with the "Update release notes" workflow (input `tag`).

## Tests
`pip install -r requirements_test.txt && pytest` — batteries are registry entities on mock devices (`tests/conftest.py`), notify actions are mocked, time is moved with `freezer`. Card: `node --test test/*.test.mjs` (the card file is evaluated in a `vm` context with stubs). Job `tests` runs on Python 3.14, i.e. the latest Home Assistant (2026.3+ needs Python 3.14; 3.13 would silently resolve to 2026.2) and prints its version as an annotation; job `pytest-min-ha` runs the suite on HA 2024.12.0. An autouse fixture (`tests/conftest.py`, `no_deprecated_calls`) fails any test during which Home Assistant reports a deprecated call naming `battery_monitor`, and CI turns those reports into annotations. `add_battery` reuses one mock config entry per platform (since 2026.8 a device belongs to a single config entry), and an entity given an area of its own also needs a name of its own (enforced since 2026.10).
Screenshots: `python scripts/screenshots.py` (Playwright, mock batteries, English, 16 px frame on the theme background).
