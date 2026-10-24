"""Render the Battery Monitor card with mock batteries and save the README screenshots.

Usage: python scripts/screenshots.py  (needs `pip install playwright` and `playwright install chromium`)
The clock is frozen so the "low for" durations stay the same. Light screenshots are in English, dark ones in French.
"""

import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
CARD_JS = (ROOT / "custom_components/battery_monitor/frontend/battery-monitor-card.js").read_text()
NOW = "2026-10-24T09:00:00+02:00"
WIDTH = 388

THEMES = {
    "light": {
        "--primary-background-color": "#f4f4f4",
        "--secondary-background-color": "#efefef",
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
    "bell-ring-outline": "M10,21H14A2,2 0 0,1 12,23A2,2 0 0,1 10,21M21,19V20H3V19L5,17V11C5,7.9 7.03,5.17 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V17L21,19M17,11A5,5 0 0,0 12,6A5,5 0 0,0 7,11V18H17V11M19.75,3.19L18.33,4.61C20.04,6.3 21,8.6 21,11H23C23,8.07 21.84,5.25 19.75,3.19M1,11H3C3,8.6 3.96,6.3 5.67,4.61L4.25,3.19C2.16,5.25 1,8.07 1,11Z",
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
      "box-shadow:0 1px 4px rgba(0,0,0,.08);color:var(--primary-text-color);overflow:hidden}</style><slot></slot>";
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
# (name en, name fr, area en, area fr, level, icon, low, due, unavailable, below_since)
BATTERIES = [
    (
        "Front door",
        "Porte d'entrée",
        "Entrance",
        "Entrée",
        8,
        "battery-10",
        True,
        True,
        False,
        "2026-10-21T07:00:00+02:00",
    ),
    (
        "Kitchen leak sensor",
        "Détecteur de fuite",
        "Kitchen",
        "Cuisine",
        17,
        "battery-20",
        True,
        False,
        False,
        "2026-10-24T01:00:00+02:00",
    ),
    (
        "Smoke detector",
        "Détecteur de fumée",
        "Hallway",
        "Couloir",
        None,
        "battery-alert-variant-outline",
        True,
        True,
        False,
        "2026-10-22T18:00:00+02:00",
    ),
    (
        "Motion sensor",
        "Détecteur de mouvement",
        "Garage",
        "Garage",
        None,
        "battery-unknown",
        False,
        True,
        True,
        "2026-10-22T21:00:00+02:00",
    ),
    ("Remote", "Télécommande", "Living room", "Séjour", 34, "battery-30", False, False, False, None),
    ("Smart lock", "Serrure", "Entrance", "Entrée", 64, "battery-60", False, False, False, None),
    ("Thermostat", "Thermostat", "Bedroom", "Chambre", 92, "battery-90", False, False, False, None),
]


def mock_hass(lang):
    fr = lang == "fr"
    batteries = [
        {
            "entity_id": f"sensor.battery_{i}",
            "device_id": f"device_{i}",
            "name": name_fr if fr else name_en,
            "area": area_fr if fr else area_en,
            "level": level,
            "icon": f"mdi:{icon}",
            "low": low,
            "alert": low or unavailable,
            "due": due,
            "unavailable": unavailable,
            "below_since": since,
        }
        for i, (name_en, name_fr, area_en, area_fr, level, icon, low, due, unavailable, since) in enumerate(BATTERIES)
    ]
    sensor = "sensor.battery_monitor_low_batteries"
    button = "button.battery_monitor_notify_now"
    return {
        "states": {
            sensor: {
                "entity_id": sensor,
                "state": "3",
                "attributes": {"threshold": 20, "unavailable": 1, "due": 3, "batteries": batteries},
            },
            button: {"entity_id": button, "state": "unknown", "attributes": {}},
        },
        "entities": {
            sensor: {"entity_id": sensor, "platform": "battery_monitor", "device_id": "battery_monitor"},
            button: {"entity_id": button, "platform": "battery_monitor", "device_id": "battery_monitor"},
        },
        "devices": {},
        "areas": {},
        "language": lang,
        "locale": {"language": lang},
    }


SHOTS = [
    {"file": "card", "theme": "light", "config": {}},
    {"file": "card-dark", "theme": "dark", "config": {}},
    {"file": "card-low", "theme": "light", "config": {"only_low": True}},
    {"file": "card-low-dark", "theme": "dark", "config": {"only_low": True}},
]


def page_html(theme):
    variables = "".join(f"{k}:{v};" for k, v in {**THEMES[theme], **COMMON}.items())
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
:root {{ {variables} }}
body {{ margin: 0; padding: 16px; background: var(--primary-background-color);
       font-family: Roboto, "Segoe UI", Helvetica, Arial, sans-serif; width: {WIDTH}px; }}
</style></head><body><div id="root"></div></body></html>"""


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH") or None)
        for shot in SHOTS:
            # A new page per capture: the card's top-level declarations would clash in a reused page.
            page = browser.new_page(device_scale_factor=2, viewport={"width": 1000, "height": 1600})
            page.on("pageerror", lambda err: print(f"page error: {err}"))
            page.clock.set_fixed_time(NOW)
            lang = "fr" if shot["theme"] == "dark" else "en"
            page.set_content(page_html(shot["theme"]))
            page.add_script_tag(content=HA_ELEMENTS)
            page.add_script_tag(content=CARD_JS)
            page.evaluate(
                """([hass, config]) => {
                    const el = document.createElement("battery-monitor-card");
                    el.setConfig({ type: "custom:battery-monitor-card", ...config });
                    el.hass = { ...hass, callService: async () => {} };
                    document.getElementById("root").appendChild(el);
                }""",
                [mock_hass(lang), shot["config"]],
            )
            page.wait_for_timeout(300)
            path = ROOT / "screenshots" / f"{shot['file']}.png"
            page.locator("battery-monitor-card").screenshot(path=str(path), animations="disabled")
            print(path.relative_to(ROOT))
            page.close()
        browser.close()


if __name__ == "__main__":
    main()
