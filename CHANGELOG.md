# Changelog

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
