# Changelog

## 1.18.0 - 2026-11-09

### Features
- **Spare batteries**: `battery_monitor.set_stock` counts the spares you keep by type (`AA`, `CR2032`…); each replacement detected for a battery of that type takes its quantity out (a `2× AA` device, 2). The new **Spare batteries** sensor gives the stock, the batteries needed (low, unavailable or forecast to reach the threshold within 30 days) and those missing per type, and the notification ends with *Spare batteries to buy: …* when some are. Kept across restarts.

## 1.17.0 - 2026-11-09

### Performance
- **Translations load on demand**: in the release zip, the frontend files keep English only (`battery-monitor-card.js` 130 KB → 72 KB, `battery-monitor-panel.js` 82 KB → 38 KB) and each other language is its own `<file>.i18n.<lang>.js` file next to them, fetched the first time a card or the panel needs it. Home Assistant loads the card on every dashboard, so each page used to download and parse all 22 languages to use one. The cards and panel are defined once the page's language has arrived (a few milliseconds), so they render translated from the start.

### Maintenance
- The Marketplace now installs the release zip (`zip_release`), like the other ha-* integrations: the split files are only in it.
- The repository keeps every language in the sources: the release runs `scripts/split-frontend.mjs` before building the zip, and the Validate workflow checks the split on a copy (every table is rebuilt from the split files and compared).

## 1.16.0 - 2026-11-08

### What's new
- **Sidebar panel in tabs**: **Batteries**, **Actions** and **Settings** under the toolbar, instead of two columns, laid out like Smart Comfort's; each tab has its own address (`/battery-monitor/settings`…), so a reload or a link comes back to it, and the arrow keys move between tabs.
- The **Batteries** tab shows everything the full screen view offers — by room, by battery type, by replacement date, what to replace, the next replacement, the notify button — without the CSV export, which has its own place in **Actions**.
- Card option `expanded` (default `false`): the full screen view laid out in the card itself, the way the panel shows it; `csv_button` (default `true`) hides the **Export CSV** button of the full screen view and of the expanded card.

## 1.15.0 - 2026-11-08

### What's new
- **Sidebar panel** `Battery Monitor` (administrators only, `/battery-monitor`): the batteries with the bundled card, a settings form (threshold, duration, notification times, notify actions, ignored integrations and ignored batteries, each picked from a list) with **Save**, and the actions **Notify now** and **Export CSV** (optional file name), with the integration state, its last notification and a link to its device. Translated in every language of the card.
- New admin-only WebSocket commands `battery_monitor/settings`, `battery_monitor/update_settings`, `battery_monitor/notify` and `battery_monitor/export` behind the panel; `update_settings` applies the same limits and normalisation as the options flow and reloads the integration once, only when something changed.

### Fixes
- The option limits are shared constants used by both the options flow and the panel; the CSV export is shared by the `battery_monitor.export` action and the panel (`export.py`); the Release workflow also checks the panel version.

## 1.14.0 - 2026-11-08

### What's new
- The battery type from Battery Notes (`2× AA`, `CR2032`) ends each line of the notifications, and is in the CSV export and the `batteries` attribute (`battery_type`).
- The replacement forecast is kept across restarts: Home Assistant no longer reads 30 days of battery history at each start, only once the last measure is a day old.

### Upgrade notes
- The stored data (`.storage/battery_monitor.below_since`) has a new layout that 1.13.x cannot read: downgrading is not supported unless that file is deleted first (the low-battery times then restart from the history).

## 1.13.1 - 2026-11-07

### Fixes
- The first replacement forecast now waits for Home Assistant to be started: at a restart, the batteries of integrations that load later (ZHA, Z-Wave…) were left out of the forecast for a whole day.
- The card keeps the keyboard focus on the same battery or button when a battery changes, instead of losing it each time the card is redrawn.

## 1.13.0 - 2026-11-07

### What's new
- Events `battery_monitor_low` (a battery goes below the threshold) and `battery_monitor_replaced` (its level rises by 15 points or more, a new battery), fired on a change only, for automations.
- Diagnostics: the options and every monitored battery can be downloaded from the integration page, with the notify actions redacted.
- New **Battery Monitor Mini Card** (`custom:battery-monitor-mini-card`): the status and only the batteries needing attention, with a detail button that shows the full card.

## 1.12.1 - 2026-11-07

### Security
- `battery_monitor.export` is now for administrators only, and only writes a `.csv` file outside hidden folders such as `.storage`: before, any user could overwrite any file of the configuration folder (`configuration.yaml`, `.storage/core.config_entries`…) with CSV.

## 1.12.0 - 2026-11-07

### What's new
- Full screen: a **By replacement date** tab sorts the batteries into *To replace now*, *Within 30 days*, *Within 3 months*, *Later* and *No forecast yet*, each with its days left, date and drain per day. **Next replacement** next to *To replace* names the first battery the drain takes to the threshold, with the date (a click opens it). **Export CSV** downloads every battery to the browser.

## 1.11.1 - 2026-11-07

### Fixes
- `hide_when_ok`: a hidden card shows again while the dashboard is edited and in the card editor's preview, so that it can still be edited (before, it vanished from the editor as soon as nothing was wrong). A hidden card now also tells Lovelace (`card-visibility-changed`), so a sections view drops its slot instead of leaving a gap.

## 1.11.0 - 2026-11-07

### What's new
- **Replacement forecast**: once a day, the drain of each level battery is measured on its recorded history (last 30 days, since the last replacement). Each battery of the list carries `drain_per_day`, `days_left` and `replace_by`; the card shows *≈ 12 d left* under a battery's name when the threshold is less than two months away (while it is not low). New **Next replacement** sensor (timestamp): the date the first battery reaches the threshold, a battery already low or unavailable first, with `entity_id`, `name`, `level`, `days_left` and `forecast_at` attributes.
- New action `battery_monitor.export`: every monitored battery written to a CSV file (`battery_monitor.csv` in the configuration folder, or the `path` given, inside the configuration folder or `allowlist_external_dirs`); returns the path and the number of batteries.

## 1.10.6 - 2026-11-04

### Documentation
- README: images and links use absolute URLs, so the screenshots, icons, badges and links display in HACS (relative paths broke there).
- README: screenshots get a display size, so cards no longer show oversized in HACS and on GitHub.

## 1.10.5 - 2026-11-04

### What's new
- Added Romanian, Danish, Swedish, Bulgarian, Russian, Ukrainian, Hungarian, Slovak, Czech, Slovenian, Latvian and Greek translations: the setup and options, the entities, the notifications and the card with its visual editor (Română, Dansk, Svenska, Български, Русский, Українська, Magyar, Slovenčina, Čeština, Slovenščina, Latviešu and Ελληνικά in the `language` option).

## 1.10.4 - 2026-11-01

### Fixes
- Card header on a narrow card (6 columns of the Sections view, half a section on a phone): the title no longer disappears and the full screen button no longer falls outside the card. When the status pill does not fit beside the title, it goes under it, with its whole text (never cut); on half of a phone's section the badge makes room for it.
- Half of a phone's section: each battery's level ("Unavailable", "8 %") goes under its name, which no longer shrinks to a couple of letters.
- In a container sized by its content (an `auto` column of layout-card, an inline block), the card keeps a width (up to 240 px) instead of shrinking to its padding; in a two-column grid or a horizontal stack it still shrinks to its column, even inside a wrapper, instead of overflowing.
- `columns: 2` or `3` no longer squeezes the battery names to a few letters: each column stays at least 160 px wide, and a card too narrow for the columns asked shows fewer.
- Full screen view from the keyboard: the focus moves to its close button when it opens, Tab and Shift+Tab stay inside it, a refresh keeps the focus on the same tab or battery, and closing it gives the focus back to the full screen button.
- "Notify now" button: it now shows that it is sending (turning icon), then a check mark once sent, or the reason in its tooltip when sending fails, and ignores a second press meanwhile. It is disabled, and says so, while the button entity is unavailable.
- Serbian (Cyrillic and Latin): the status pill reads "Slabe: 3 · Nedostupne: 2" instead of "3 slabe/ih · 2 nedostupno/ih", and an unavailable battery reads "Nedostupna", like "Slaba".

## 1.10.3 - 2026-11-01

### What's new
- Added Italian, Dutch, European Portuguese and Polish translations: the setup and options, the entities, the notifications and the card with its visual editor (Italiano, Nederlands, Português and Polski in the `language` option). pt-BR uses the European Portuguese texts, in the card and in the integration (its own `pt-BR` translation file).

## 1.10.2

### Fixes
- Card: the texts shown in a status colour are readable again in light themes: the level and details of a low battery, the status pill, the "to check" count of a group, the quantities to buy and the selected tab of the full screen view. They now mix the status colour with the theme's text colour (darker in light themes, lighter in dark ones) and reach a contrast of at least 4.5:1; badges, icons and bars keep the plain colour.

## 1.10.1

### Fixes
- Serbian (Cyrillic and Latin): notification titles and the card's group counts now read correctly for 2 to 4 batteries ("Слабе батерије: 3" / "Slabe baterije: 3"); one unavailable battery on the card reads "недоступна" / "nedostupna"; a typo in the options ("мобилне апликације") is fixed.

## 1.10.0

### What's new
- Serbian translations, in Cyrillic (`sr`) and Latin script (`sr-Latn`): the setup and options, the entities, the notifications and the card with its visual editor. The card follows Home Assistant's language (Serbian Latin when Home Assistant is set to `sr-Latn`) or the `language` option. Thanks to @cpmarexel2f for the translations.

## 1.9.3

### Fixes
- Card full screen view: following a link from a battery's more-info dialog opened in the full screen view (its device, or the "Related" tab) now stays on that page; before, the card sent you straight back to the dashboard.

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
