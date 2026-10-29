# Changelog

## 1.9.2

### Fixes
- Card full screen view: the back button closes it again on older Home Assistant versions after a more-info dialog had been opened and closed from the dashboard; before, the full screen view stayed open and could be left behind on another view.

## 1.9.1

### Fixes
- Card full screen view: closing a battery's more-info dialog no longer closes the full screen view too, and the back button no longer needs an extra press afterwards; Escape over the more-info closes only the dialog.
- Card full screen view: the more-info dialog opened from a battery is shown above the full screen view instead of behind it.
- Card full screen view: a room icon changed in the area settings shows up right away.
- Removing the integration also deletes its stored "low since" times, so a reinstall starts every count afresh.
- German: the notify action description is a correct sentence again. Spanish: the duration option reads "Baja durante al menos".
- The "not loaded" error of the notify action is translated.

### Changes
- Less work when many batteries report at once: state changes are merged into at most one list refresh per second.
- Card full screen view: the selected tab uses the accent colour, like the other ha-* cards.

### Maintenance
- Screenshots workflow: fork-safe checkout, pinned Playwright, time-boxed and retried browser install, upload-artifact v7; after committing refreshed screenshots it re-runs the lint, validate and HACS checks on that commit.

## 1.9.0

### What's new
- German and Spanish translations: the integration (setup, options, entities, action, notifications) and the card (with its editor) now speak English, French, German and Spanish; the card's `language` option accepts `de` and `es`.

## 1.8.1

### Fixes
- A battery that was already low before a Home Assistant restart keeps its "low since" time even when its entity shows up late (ZHA, Z-Wave…): the notification is no longer delayed by the full duration again.
- The same morning and evening notification time now sends one notification instead of two.
- Card: a battery low for less than an hour reads "< 1 h" instead of "0 h".
- Card full screen view: a refresh keeps the scroll position, and moving the card while editing the dashboard no longer closes it.

### Changes
- Less work and fewer disk writes: non-battery state changes are ignored right away, and the stored "low since" times are only written when they change.
- Card and editor: no rebuild when nothing they show has changed.

### Maintenance
- README: due-battery animation; CI and lint fixes.

## 1.8.0

### Fixes
- Card full screen view: the group icon is now HTML-escaped like every other dynamic value. In the by-room view the icon comes from the Home Assistant area settings, so this closes a potential attribute injection (defence in depth).

## 1.7.0
### Changes
- Card header: the status badge is 40 px with a 24 px icon (was 36 px / 20 px), like the other ha-* cards; same in the full screen view.
- Card: only the batteries needing attention are tinted (12 % of the warning colour when low, of the error colour when unavailable or notified, without border); the batteries that are fine use the neutral tile, keeping their green on the icon and the level bar. An unavailable battery is shown in the error colour right away (it was orange until notified); only notified batteries blink. Same in the full screen view.
- Card header: 8 px between the header and the list (was 10 px).
- Full screen view: the "To replace" label uses the section title style of the other ha-* cards (12 px, cart icon).

## 1.6.1

### Fixes
- Card full screen, by room: each room shows its own icon from the area settings (a door when it has none, a house for the batteries without a room).

## 1.6.0

### Changes
- Card: battery types **by device model** (`battery_models`): one type for every device of a model, e.g. `Hue dimmer switch: CR2450`. The editor's new **Battery types by model** section lists the models whose type is not detected, with their manufacturer and how many devices; **Battery types by battery** (`battery_types`) now only lists the batteries left without a type, and a battery's own type still wins over its model's.

## 1.5.2

### Changes
- Card: how many batteries each device takes, before its type: *1× CR2032*, *4× AA*, in the list and in the full screen view by room; by type, each battery tells its room and its count (*2 piles*), and each type how many batteries it takes in all.

## 1.5.1

### Changes
- Card: the battery type (CR2032, AAA ×2…) is shown under each battery's name, next to its room, in the card's list too.

## 1.5.0

### Changes
- Card: **full screen** button (`popup: false` removes it). Every battery over the whole screen, grouped **by room** or **by battery type**, with **To replace**: how many batteries of each type to buy for the ones low or unavailable. One column on a phone, balanced columns wider; closes with its button, Escape, a click outside or the back button.
- Card: battery types from Battery Notes (the battery's `battery_type` / `battery_quantity`, or its device's *Battery type* sensor), or set in the card editor's new **Battery types** section for the batteries whose type is not detected (`battery_types` in YAML). `2× AA` counts two batteries.

## 1.4.0

### Changes
- Requires Home Assistant 2024.12 or later (was 2024.11): on 2024.11, **Configure** failed with an error.

### Fixes
- Card: no longer stuck on "Battery Monitor is not set up" when the sensor was not ready yet at the first render (for example right after a Home Assistant restart); the **Notify now** button shows up too.
- On Home Assistant 2024.12 to 2025.3, the card is added to the dashboard resources again.

### Maintenance
- Card tests (`node --test`), and tests on Home Assistant 2026.10 and on the minimum version (2024.12), failing on any deprecated call.

## 1.3.0

### Changes
- The `batteries` attribute of the **Low batteries** sensor is no longer written to the database: beyond about 60 batteries it went over the recorder's 16 KiB limit. The card still reads it live.
- A battery hidden, unhidden, renamed or moved to another area, or whose device is renamed or moved, is updated right away instead of within 10 minutes.
- Card editor: `language` option (English / Français), and the labels switch language at once.

### Fixes
- Card: "low for X h" moves on every hour instead of staying frozen.
- The card is back in the dashboard resources after removing and adding the integration again without a restart.
- Card: the sensor and the **Notify now** button are looked up only when the entity registry changes, not on every state update.

### Maintenance
- New pytest tests for the fixes.
- CI hardening: actions pinned by commit SHA, read-only token, Dependabot for actions, duplication check with PR annotations.

## 1.2.0

### Changes
- Card: same compact header as the other ha-* cards (36 px icon, 16 px title, 12 px card padding); medium weight for the title, pill and levels.

## 1.1.0

### What's new
- Unavailable batteries are reported too: a battery whose state is `unavailable` or `unknown` (often a dead battery) needs attention like a low one. It is notified once it has been unavailable for the duration (*Motion sensor (Garage): unavailable*), and right away with **Notify now**; the title becomes *N batteries to check* as soon as one is unavailable.
- A battery that goes low then unavailable keeps counting from when it went low.
- The card shows unavailable batteries as alerts (orange, then red and blinking once notified) with how long they have been unavailable, right after the low ones; the pill counts both (*3 low · 1 unavailable*). *Hide the batteries that are fine* and *Hide the card when every battery is fine* take them into account.
- `unavailable` attribute (count) on the **Low batteries** sensor, `alert` on each battery.

## 1.0.1

### Fixes
- Batteries already low when Battery Monitor is installed (or found later) are no longer counted as low "since now": the time they went below the threshold is read from the history (up to 30 days), so they are notified at the next notification time when they have been low long enough, instead of after a full duration.
- **Notify now** and the `battery_monitor.notify` action send every low battery right away, whatever the duration, and a "No low battery" message when none is low: before, they sent nothing until a battery had been low for the whole duration, which looked broken. The scheduled notifications are unchanged.

## 1.0.0

First public release.

### What's new
- Battery Monitor integration: finds every battery (`sensor` and `binary_sensor` with the `battery` device class), one per device, and tracks how long each one has been below the threshold, across restarts.
- Notifications twice a day (09:00 and 19:00 by default) of the batteries that have stayed below the threshold (20 % by default) for the configured duration (24 h by default): a persistent notification, replaced each time and cleared when no battery is low any more, and the notify actions of your choice (mobile app…).
- Options: threshold, duration, the two notification times, notify actions, batteries and integrations to leave out (phones and tablets of the mobile app by default).
- **Low batteries** sensor with every monitored battery in its attributes, **Last notification** sensor, **Notify now** button and `battery_monitor.notify` action.
- Battery Monitor card, bundled with the integration and added to the dashboard resources automatically: every battery with its icon, name, room and level, the lowest first; red and blinking once notified, orange while low, how long it has been low; "Notify now" button; visual editor, English and French.
