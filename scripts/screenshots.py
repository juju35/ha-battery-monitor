"""Render the Battery Monitor card and sidebar panel with mock batteries and save the README screenshots.

Usage: python scripts/screenshots.py  (needs `pip install playwright` and `playwright install chromium`)
CHROMIUM_PATH=/path/to/chrome to use another browser. The clock is frozen so the "low for" durations stay the same.
Every capture keeps a 16 px frame of the theme background around the card or the full screen view.
A file is only rewritten when its decoded pixels differ from the one already there (PNG or every GIF frame, compared
through ffmpeg): a re-encode that looks the same leaves the repository untouched.
"""

import json
import os
import shutil
import subprocess
import tempfile
from datetime import date, timedelta
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
CARD_JS = (ROOT / "custom_components/battery_monitor/frontend/battery-monitor-card.js").read_text()
PANEL_JS = (ROOT / "custom_components/battery_monitor/frontend/battery-monitor-panel.js").read_text()
NOW = "2026-10-24T09:00:00+02:00"
WIDTH = 460
PANEL_WIDTH = 1100

THEMES = {
    "light": {
        "--primary-background-color": "#e8eaed",
        "--secondary-background-color": "#ececec",
        "--card-background-color": "#ffffff",
        "--primary-text-color": "#212121",
        "--secondary-text-color": "#727272",
        "--divider-color": "rgba(0,0,0,.12)",
    },
    "dark": {
        "--primary-background-color": "#111111",
        "--secondary-background-color": "#282828",
        "--card-background-color": "#1c1c1c",
        "--primary-text-color": "#e1e1e1",
        "--secondary-text-color": "#9b9b9b",
        "--divider-color": "rgba(225,225,225,.12)",
    },
}
COMMON = {
    "--primary-color": "#03a9f4",
    "--success-color": "#43a047",
    "--warning-color": "#ffa600",
    "--error-color": "#db4437",
    "--text-primary-color": "#ffffff",
}

# Material Design Icons paths used by the card (from @mdi/js).
ICONS = {
    "battery": "M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.67C6,21.4 6.6,22 7.33,22H16.67A1.33,1.33 0 0,0 18,20.67V5.33C18,4.6 17.4,4 16.67,4Z",
    "battery-10": "M16,18H8V6H16M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.67C6,21.4 6.6,22 7.33,22H16.67A1.33,1.33 0 0,0 18,20.67V5.33C18,4.6 17.4,4 16.67,4Z",
    "battery-20": "M16,17H8V6H16M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.67C6,21.4 6.6,22 7.33,22H16.67A1.33,1.33 0 0,0 18,20.67V5.33C18,4.6 17.4,4 16.67,4Z",
    "battery-30": "M16,15H8V6H16M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.67C6,21.4 6.6,22 7.33,22H16.67A1.33,1.33 0 0,0 18,20.67V5.33C18,4.6 17.4,4 16.67,4Z",
    "battery-40": "M16,14H8V6H16M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.67C6,21.4 6.6,22 7.33,22H16.67A1.33,1.33 0 0,0 18,20.67V5.33C18,4.6 17.4,4 16.67,4Z",
    "battery-50": "M16,13H8V6H16M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.67C6,21.4 6.6,22 7.33,22H16.67A1.33,1.33 0 0,0 18,20.67V5.33C18,4.6 17.4,4 16.67,4Z",
    "battery-60": "M16,12H8V6H16M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.67C6,21.4 6.6,22 7.33,22H16.67A1.33,1.33 0 0,0 18,20.67V5.33C18,4.6 17.4,4 16.67,4Z",
    "battery-70": "M16,10H8V6H16M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.67C6,21.4 6.6,22 7.33,22H16.67A1.33,1.33 0 0,0 18,20.67V5.33C18,4.6 17.4,4 16.67,4Z",
    "battery-80": "M16,9H8V6H16M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.67C6,21.4 6.6,22 7.33,22H16.67A1.33,1.33 0 0,0 18,20.67V5.33C18,4.6 17.4,4 16.67,4Z",
    "battery-90": "M16,8H8V6H16M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.67C6,21.4 6.6,22 7.33,22H16.67A1.33,1.33 0 0,0 18,20.67V5.33C18,4.6 17.4,4 16.67,4Z",
    "battery-outline": "M16,20H8V6H16M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.67C6,21.4 6.6,22 7.33,22H16.67A1.33,1.33 0 0,0 18,20.67V5.33C18,4.6 17.4,4 16.67,4Z",
    "battery-alert-variant-outline": "M14 20H6V6H14M14.67 4H13V2H7V4H5.33C4.6 4 4 4.6 4 5.33V20.67C4 21.4 4.6 22 5.33 22H14.67C15.4 22 16 21.4 16 20.67V5.33C16 4.6 15.4 4 14.67 4M21 7H19V13H21V8M21 15H19V17H21V15Z",
    "battery-unknown": "M15.07,12.25L14.17,13.17C13.63,13.71 13.25,14.18 13.09,15H11.05C11.16,14.1 11.56,13.28 12.17,12.67L13.41,11.41C13.78,11.05 14,10.55 14,10C14,8.89 13.1,8 12,8A2,2 0 0,0 10,10H8A4,4 0 0,1 12,6A4,4 0 0,1 16,10C16,10.88 15.64,11.68 15.07,12.25M13,19H11V17H13M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.66C6,21.4 6.6,22 7.33,22H16.67C17.4,22 18,21.4 18,20.66V5.33C18,4.59 17.4,4 16.67,4Z",
    "battery-check-outline": "M16.75 21.16L14 18.16L15.16 17L16.75 18.59L20.34 15L21.5 16.41L16.75 21.16M12.35 20H8V6H16V12.35C16.63 12.13 17.3 12 18 12V5.33C18 4.6 17.4 4 16.67 4H15V2H9V4H7.33C6.6 4 6 4.6 6 5.33V20.67C6 21.4 6.6 22 7.33 22H13.54C13 21.42 12.61 20.75 12.35 20Z",
    "fullscreen": "M5,5H10V7H7V10H5V5M14,5H19V10H17V7H14V5M17,14H19V19H14V17H17V14M10,17V19H5V14H7V17H10Z",
    "arrow-expand": "M10,21V19H6.41L10.91,14.5L9.5,13.09L5,17.59V14H3V21H10M14.5,10.91L19,6.41V10H21V3H14V5H17.59L13.09,9.5L14.5,10.91Z",
    "arrow-collapse": "M19.5,3.09L15,7.59V4H13V11H20V9H16.41L20.91,4.5L19.5,3.09M4,13V15H7.59L3.09,19.5L4.5,20.91L9,16.41V20H11V13H4Z",
    "close": "M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z",
    "door-open": "M12,3C10.89,3 10,3.89 10,5H3V19H2V21H22V19H21V5C21,3.89 20.11,3 19,3H12M12,5H19V19H12V5M5,11H7V13H5V11Z",
    "calendar-alert": "M6,1V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3H18V1H16V3H8V1H6M5,8H19V19H5V8M11,9V14H13V9H11M11,16V18H13V16H11Z",
    "calendar-clock": "M15,13H16.5V15.82L18.94,17.23L18.19,18.53L15,16.69V13M19,8H5V19H9.67C9.24,18.09 9,17.07 9,16A7,7 0 0,1 16,9C17.07,9 18.09,9.24 19,9.67V8M5,21C3.89,21 3,20.1 3,19V5C3,3.89 3.89,3 5,3H6V1H8V3H16V1H18V3H19A2,2 0 0,1 21,5V11.1C22.24,12.36 23,14.09 23,16A7,7 0 0,1 16,23C14.09,23 12.36,22.24 11.1,21H5M16,11.15A4.85,4.85 0 0,0 11.15,16C11.15,18.68 13.32,20.85 16,20.85A4.85,4.85 0 0,0 20.85,16C20.85,13.32 18.68,11.15 16,11.15Z",
    "calendar-check": "M19,19H5V8H19M19,3H18V1H16V3H8V1H6V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M16.53,11.06L15.47,10L10.59,14.88L8.47,12.76L7.41,13.82L10.59,17L16.53,11.06Z",
    "help-circle-outline": "M11,18H13V16H11V18M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,6A4,4 0 0,0 8,10H10A2,2 0 0,1 12,8A2,2 0 0,1 14,10C14,12 11,11.75 11,15H13C13,12.75 16,12.5 16,10A4,4 0 0,0 12,6Z",
    "file-delimited-outline": "M14,2H6C4.89,2 4,2.89 4,4V20C4,21.11 4.89,22 6,22H18C19.11,22 20,21.11 20,20V8L14,2M18,20H6V4H13V9H18V20M10,19L12,15H9V10H15V15L13,19H10Z",
    "cart-outline": "M17,18A2,2 0 0,1 19,20A2,2 0 0,1 17,22C15.89,22 15,21.1 15,20C15,18.89 15.89,18 17,18M1,2H4.27L5.21,4H20A1,1 0 0,1 21,5C21,5.17 20.95,5.34 20.88,5.5L17.3,11.97C16.96,12.58 16.3,13 15.55,13H8.1L7.2,14.63L7.17,14.75A0.25,0.25 0 0,0 7.42,15H19V17H7C5.89,17 5,16.1 5,15C5,14.65 5.09,14.32 5.24,14.04L6.6,11.59L3,4H1V2M7,18A2,2 0 0,1 9,20A2,2 0 0,1 7,22C5.89,22 5,21.1 5,20C5,18.89 5.89,18 7,18M16,11L18.78,6H6.14L8.5,11H16Z",
    "bell-ring-outline": "M10,21H14A2,2 0 0,1 12,23A2,2 0 0,1 10,21M21,19V20H3V19L5,17V11C5,7.9 7.03,5.17 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V17L21,19M17,11A5,5 0 0,0 12,6A5,5 0 0,0 7,11V18H17V11M19.75,3.19L18.33,4.61C20.04,6.3 21,8.6 21,11H23C23,8.07 21.84,5.25 19.75,3.19M1,11H3C3,8.6 3.96,6.3 5.67,4.61L4.25,3.19C2.16,5.25 1,8.07 1,11Z",
    "menu": "M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z",
    "clock-outline": "M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z",
    "cog": "M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z",
    "content-save": "M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z",
    "devices": "M3,6H21V4H3C1.9,4 1,4.9 1,6V18C1,19.1 1.9,20 3,20H7V18H3V6M13,12H9V13.78C8.39,14.33 8,15.11 8,16C8,16.89 8.39,17.67 9,18.22V20H13V18.22C13.61,17.67 14,16.88 14,16C14,15.12 13.61,14.33 13,13.78V12M11,17.5C10.17,17.5 9.5,16.83 9.5,16C9.5,15.17 10.17,14.5 11,14.5C11.83,14.5 12.5,15.17 12.5,16C12.5,16.83 11.83,17.5 11,17.5M22,8H16C15.5,8 15,8.5 15,9V19C15,19.5 15.5,20 16,20H22C22.5,20 23,19.5 23,19V9C23,8.5 22.5,8 22,8M21,18H17V10H21V18Z",
    "battery-heart-variant": "M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.67C6,21.4 6.6,22 7.33,22H16.67A1.33,1.33 0 0,0 18,20.67V5.33C18,4.6 17.4,4 16.67,4M12,18.5L11.3,17.86C8.73,15.54 7,13.96 7,12.05C7,10.5 8.22,9.3 9.77,9.3C10.65,9.3 11.5,9.71 12,10.36C12.5,9.71 13.35,9.3 14.23,9.3C15.78,9.3 17,10.5 17,12.05C17,13.96 15.27,15.54 12.7,17.86L12,18.5Z",
}

# Minimal stand-ins for Home Assistant's <ha-card> and <ha-icon>.
HA_ELEMENTS = (
    "const ICONS = "
    + json.dumps(ICONS)
    + ";"
    + """
customElements.define("ha-card", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" }).innerHTML =
      "<style>:host{display:block;background:var(--card-background-color);border-radius:12px;" +
      "border:1px solid var(--divider-color);color:var(--primary-text-color);overflow:hidden}</style><slot></slot>";
  }
});
customElements.define("ha-menu-button", class extends HTMLElement {
  connectedCallback() {
    this.style.cssText = "display:flex;padding:8px;--mdc-icon-size:24px";
    this.innerHTML = '<ha-icon icon="mdi:menu"></ha-icon>';
  }
});
customElements.define("ha-icon", class extends HTMLElement {
  static get observedAttributes() { return ["icon"]; }
  connectedCallback() { this._draw(); }
  attributeChangedCallback() { this._draw(); }
  _draw() {
    const path = ICONS[(this.getAttribute("icon") || "").replace("mdi:", "")] || "";
    this.style.display = "inline-flex";
    this.innerHTML = '<svg viewBox="0 0 24 24" style="width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px);fill:currentColor"><path d="' + path + '"/></svg>';
  }
});"""
)

# Mock batteries, already sorted the way the integration sends them (low first, lowest first, then unavailable).
# (name, area, level, icon, low, due, unavailable, below_since)
BATTERIES = [
    ("Front door", "Entrance", 8, "battery-10", True, True, False, "2026-10-21T07:00:00+02:00"),
    ("Kitchen leak sensor", "Kitchen", 17, "battery-20", True, False, False, "2026-10-24T01:00:00+02:00"),
    (
        "Smoke detector",
        "Hallway",
        None,
        "battery-alert-variant-outline",
        True,
        True,
        False,
        "2026-10-22T18:00:00+02:00",
    ),
    ("Motion sensor", "Garage", None, "battery-unknown", False, True, True, "2026-10-22T21:00:00+02:00"),
    ("Remote", "Living room", 34, "battery-30", False, False, False, None),
    ("Garage door", "Garage", 48, "battery-50", False, False, False, None),
    ("Bathroom leak sensor", "Bathroom", 55, "battery-60", False, False, False, None),
    ("Smart lock", "Entrance", 64, "battery-60", False, False, False, None),
    ("Window sensor", "Bedroom", 71, "battery-70", False, False, False, None),
    ("Thermostat", "Bedroom", 92, "battery-90", False, False, False, None),
]

# Battery types: from Battery Notes (attributes on the battery entity, or its "Battery type" sensor), or set in the
# card (CARD_TYPES); the motion sensor's is unknown.
NOTES_TYPES = {0: ("CR2032", 1), 1: ("CR2450", 1), 5: ("CR2032", 1), 6: ("CR2450", 1), 8: ("CR2032", 1), 9: ("AA", 2)}
TYPE_SENSORS = {7: ("AA", 4)}
CARD_TYPES = {2: "9V", 4: "2× AAA"}
# Measured drain in % a day (replacement forecast), by battery; the thermostat has no forecast yet.
DRAIN = {4: 0.6, 5: 0.45, 6: 0.3, 7: 0.5, 8: 0.12}
TODAY = date(2026, 11, 7)


def mock_hass():
    batteries = [
        {
            "entity_id": f"sensor.battery_{i}",
            "device_id": f"device_{i}",
            "name": name,
            "area": area,
            "level": level,
            "icon": f"mdi:{icon}",
            "low": low,
            "alert": low or unavailable,
            "due": due,
            "unavailable": unavailable,
            "below_since": since,
        }
        for i, (name, area, level, icon, low, due, unavailable, since) in enumerate(BATTERIES)
    ]
    for i, drain in DRAIN.items():
        days = int((batteries[i]["level"] - 20) / drain)
        batteries[i].update(
            drain_per_day=drain,
            days_left=days,
            replace_by=f"{(TODAY + timedelta(days=days)).isoformat()}T00:00:00+01:00",
        )
    sensor = "sensor.battery_monitor_low_batteries"
    button = "button.battery_monitor_notify_now"
    states = {
        sensor: {
            "entity_id": sensor,
            "state": "3",
            "attributes": {"threshold": 20, "unavailable": 1, "due": 3, "batteries": batteries},
        },
        button: {"entity_id": button, "state": "unknown", "attributes": {}},
    }
    entities = {
        sensor: {"entity_id": sensor, "platform": "battery_monitor", "device_id": "battery_monitor"},
        button: {"entity_id": button, "platform": "battery_monitor", "device_id": "battery_monitor"},
    }
    for i, (kind, quantity) in NOTES_TYPES.items():
        states[f"sensor.battery_{i}"] = {
            "entity_id": f"sensor.battery_{i}",
            "state": str(batteries[i]["level"]),
            "attributes": {"device_class": "battery", "battery_type": kind, "battery_quantity": quantity},
        }
    for i, (kind, quantity) in TYPE_SENSORS.items():
        type_sensor = f"sensor.device_{i}_battery_type"
        states[type_sensor] = {"entity_id": type_sensor, "state": kind, "attributes": {"battery_quantity": quantity}}
        entities[type_sensor] = {"entity_id": type_sensor, "platform": "battery_notes", "device_id": f"device_{i}"}
    return {
        "states": states,
        "entities": entities,
        "devices": {},
        "areas": {},
        "language": "en",
        "locale": {"language": "en"},
    }


CARD_CONFIG = {"battery_types": {f"sensor.battery_{i}": kind for i, kind in CARD_TYPES.items()}}

SHOTS = [
    {"file": "card", "theme": "light", "config": {}},
    {"file": "card-dark", "theme": "dark", "config": {}},
    {"file": "card-low", "theme": "light", "config": {"only_low": True}},
    {"file": "card-low-dark", "theme": "dark", "config": {"only_low": True}},
    # The mini card, compact: the status and the batteries needing attention.
    {"file": "mini", "theme": "light", "config": {}, "tag": "battery-monitor-mini-card"},
    {"file": "mini-dark", "theme": "dark", "config": {}, "tag": "battery-monitor-mini-card"},
]

# The full screen view: on a desktop by room and by type, on a phone by room and by type (light and dark). The viewport is the size of
# the view; the page adds the 16 px frame around it.
POPUP_SHOTS = [
    {"file": "popup", "theme": "light", "view": "room", "viewport": (1600, 1000)},
    {"file": "popup-dark", "theme": "dark", "view": "room", "viewport": (1600, 1000)},
    {"file": "popup-type", "theme": "light", "view": "type", "viewport": (1600, 1000)},
    {"file": "popup-type-dark", "theme": "dark", "view": "type", "viewport": (1600, 1000)},
    {"file": "popup-forecast", "theme": "light", "view": "forecast", "viewport": (1600, 1000)},
    {"file": "popup-forecast-dark", "theme": "dark", "view": "forecast", "viewport": (1600, 1000)},
    {"file": "popup-phone", "theme": "light", "view": "room", "viewport": (390, 844)},
    {"file": "popup-phone-type", "theme": "light", "view": "type", "viewport": (390, 844)},
    {"file": "popup-phone-dark", "theme": "dark", "view": "room", "viewport": (390, 844)},
    {"file": "popup-phone-type-dark", "theme": "dark", "view": "type", "viewport": (390, 844)},
]


def page_html(theme, width=WIDTH, padding=16):
    variables = "".join(f"{k}:{v};" for k, v in {**THEMES[theme], **COMMON}.items())
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
:root {{ {variables} }}
body {{ margin: 0; padding: {padding}px; background: var(--primary-background-color);
       font-family: Roboto, "Segoe UI", Helvetica, Arial, sans-serif; width: {width}px; }}
</style></head><body><div id="root"></div></body></html>"""


# What the panel's battery_monitor/settings command answers: the stored options and the choices of the form.
PANEL_SETTINGS = {
    "entry": {
        "entry_id": "battery_monitor",
        "state": "loaded",
        "device_id": "battery_monitor",
        "last_notification": "2026-10-23T19:00:00+02:00",
        "last_notified": 3,
    },
    "options": {
        "threshold": 20,
        "duration": 24,
        "morning_time": "09:00:00",
        "evening_time": "19:00:00",
        "notify_services": ["notify.mobile_app_phone"],
        "ignored_entities": ["sensor.battery_9"],
        "ignored_integrations": ["mobile_app"],
    },
    "limits": {"threshold": [1, 99], "duration": [0, 720]},
    "notify_options": ["notify.mobile_app_phone", "notify.mobile_app_tablet", "notify.telegram"],
    "integration_options": [
        {"value": "mobile_app", "label": "Mobile App"},
        {"value": "zha", "label": "Zigbee Home Automation"},
        {"value": "zwave_js", "label": "Z-Wave"},
    ],
    "entity_options": [
        {"value": f"sensor.battery_{i}", "label": name, "area": area, "integration": "zha" if i % 2 else "zwave_js"}
        for i, (name, area, *_rest) in enumerate(BATTERIES)
    ],
}
PANEL_SHOTS = [{"file": "panel", "theme": "light"}, {"file": "panel-dark", "theme": "dark"}]

# Mounts the sidebar panel: the card inside it reads the mock states, the form the mock settings.
MOUNT_PANEL = """([hass, settings]) => {
    const el = document.createElement("battery-monitor-panel");
    el.panel = { config: {} };
    el.narrow = false;
    el.hass = {
        ...hass,
        user: { is_admin: true },
        callService: async () => {},
        callWS: async (msg) => (msg.type === "battery_monitor/settings" ? settings : { ok: true }),
        connection: { subscribeMessage: async () => () => {} },
    };
    document.getElementById("root").appendChild(el);
}"""


def open_panel(browser, shot):
    """The sidebar panel, full width, on a new page."""
    page = browser.new_page(device_scale_factor=2, viewport={"width": PANEL_WIDTH, "height": 1400})
    page.on("pageerror", lambda err, name=shot["file"]: print(f"{name}: page error: {err}"))
    page.clock.set_fixed_time(NOW)
    page.set_content(page_html(shot["theme"], PANEL_WIDTH, 0))
    page.add_script_tag(content=HA_ELEMENTS)
    page.add_script_tag(content=CARD_JS)
    page.add_script_tag(content=PANEL_JS)
    page.evaluate(MOUNT_PANEL, [mock_hass(), PANEL_SETTINGS])
    page.wait_for_timeout(500)
    return page, ROOT / "screenshots" / f"{shot['file']}.png"


# Mounts the card on a new page (the card's top-level declarations would clash in a reused page); `view` opens its
# full screen view, by room or by type.
MOUNT = """([hass, config, view, tag]) => {
    const el = document.createElement(tag);
    el.setConfig({ type: `custom:${tag}`, ...config });
    el.hass = { ...hass, callService: async () => {} };
    document.getElementById("root").appendChild(el);
    if (view) {
        el._view = view;
        el.shadowRoot.querySelector(".full").click();
    }
}"""


# The full screen layer is fixed to the window: inset by 16 px, it gets the same frame as the card.
FRAME_POPUP = """() => {
    const host = document.body.lastElementChild;
    const style = document.createElement("style");
    style.textContent = ".backdrop { inset: 16px; border-radius: 12px; overflow: hidden; box-shadow: 0 0 0 1px var(--divider-color); }";
    host.shadowRoot.appendChild(style);
    document.getElementById("root").style.visibility = "hidden";
}"""


def open_card(browser, shot, config, viewport, view=None):
    page = browser.new_page(device_scale_factor=2, viewport={"width": viewport[0], "height": viewport[1]})
    page.on("pageerror", lambda err, name=shot["file"]: print(f"{name}: page error: {err}"))
    page.clock.set_fixed_time(NOW)
    page.set_content(page_html(shot["theme"]))
    page.add_script_tag(content=HA_ELEMENTS)
    page.add_script_tag(content=CARD_JS)
    page.evaluate(MOUNT, [mock_hass(), config, view, shot.get("tag", "battery-monitor-card")])
    if view:
        page.evaluate(FRAME_POPUP)
    page.wait_for_timeout(500 if view else 300)
    return page, ROOT / "screenshots" / f"{shot['file']}.png"


def pixels(path):
    """The decoded RGBA pixels of an image (every frame of a GIF), with its size, or None when unreadable."""
    try:
        size = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-select_streams",
                "v:0",
                "-show_entries",
                "stream=width,height",
                "-of",
                "csv=p=0",
                str(path),
            ],
            check=True,
            capture_output=True,
            text=True,
        ).stdout.strip()
        raw = subprocess.run(
            ["ffmpeg", "-v", "error", "-i", str(path), "-f", "rawvideo", "-pix_fmt", "rgba", "-"],
            check=True,
            capture_output=True,
        ).stdout
    except (OSError, subprocess.CalledProcessError):
        return None
    return size, raw


def keep_if_same(new, dest):
    """Move the fresh capture `new` onto `dest`, unless `dest` already holds the same pixels."""
    dest = Path(dest)
    if dest.exists():
        old = pixels(dest)
        if old is not None and old == pixels(new):
            Path(new).unlink()
            return False
    shutil.move(str(new), dest)
    return True


def capture(page, path, **kwargs):
    """Screenshot to a temporary file next to `path`, kept only if it differs from the file already there."""
    tmp = path.with_name(f".new-{path.name}")
    page.screenshot(path=str(tmp), **kwargs)
    changed = keep_if_same(tmp, path)
    print(path.relative_to(ROOT), "" if changed else "(unchanged)")


# Pause every animation at `t` ms and return how many: document.getAnimations() leaves out those in shadow roots
# (the card's blink), so each shadow root is asked as well.
SEEK_ANIMATIONS = """(t) => {
  const roots = [document];
  for (let i = 0; i < roots.length; i++)
    for (const el of roots[i].querySelectorAll('*')) if (el.shadowRoot) roots.push(el.shadowRoot);
  const animations = new Set(roots.flatMap((root) => root.getAnimations()));
  for (const a of animations) { a.pause(); a.currentTime = t; }
  return animations.size;
}"""


def animate(browser, shot, config, viewport, *, fps=20, seconds=3):
    """Record the due-battery blink as a looping screenshots/<file>.gif (needs ffmpeg). Every animation is paused and
    stepped frame by frame, so the GIF is identical whatever the machine's speed."""
    page, _ = open_card(browser, shot, config, viewport)
    page.wait_for_timeout(300)
    box = page.locator("#root").bounding_box()
    clip = {"x": 0, "y": 0, "width": WIDTH + 32, "height": int(box["height"] + 0.999) + 32}
    frames = round(fps * seconds)
    with tempfile.TemporaryDirectory() as frame_dir:
        for i in range(frames):
            stepped = page.evaluate(SEEK_ANIMATIONS, (i * 1000) / fps)
            if not stepped:
                # Running animations would make every recording differ (and every GIF rewritten for nothing).
                raise RuntimeError(f"{shot['file']}.gif: no animation to step in the card")
            page.screenshot(path=f"{frame_dir}/f{i:03d}.png", clip=clip)
        page.close()
        dest = ROOT / "screenshots" / f"{shot['file']}.gif"
        out = str(dest.with_name(f".new-{dest.name}"))
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-loglevel",
                "error",
                "-framerate",
                str(fps),
                "-i",
                f"{frame_dir}/f%03d.png",
                "-vf",
                f"scale={clip['width']}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4",
                "-loop",
                "0",
                out,
            ],
            check=True,
        )
        changed = keep_if_same(out, dest)
    print(f"screenshots/{shot['file']}.gif", "" if changed else "(unchanged)")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH") or None)
        for shot in SHOTS:
            page, path = open_card(browser, shot, shot["config"], (1000, 1600))
            # The card with the 16 px page padding around it, on the theme background.
            box = page.locator("#root").bounding_box()
            clip = {"x": 0, "y": 0, "width": WIDTH + 32, "height": int(box["height"] + 0.999) + 32}
            capture(page, path, clip=clip, animations="disabled")
            page.close()
        for shot in POPUP_SHOTS:
            width, height = shot["viewport"]
            page, path = open_card(browser, shot, CARD_CONFIG, (width + 32, height + 32), shot["view"])
            capture(page, path, animations="disabled")
            page.close()
        for shot in PANEL_SHOTS:
            page, path = open_panel(browser, shot)
            box = page.locator("#root").bounding_box()
            clip = {"x": 0, "y": 0, "width": PANEL_WIDTH, "height": int(box["height"] + 0.999)}
            capture(page, path, clip=clip, animations="disabled")
            page.close()
        animate(browser, {"file": "due", "theme": "light"}, {}, (1000, 1600))
        animate(browser, {"file": "due-dark", "theme": "dark"}, {}, (1000, 1600))
        browser.close()


if __name__ == "__main__":
    main()
