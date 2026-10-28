"""Render the Battery Monitor card with mock batteries and save the README screenshots.

Usage: python scripts/screenshots.py  (needs `pip install playwright` and `playwright install chromium`)
CHROMIUM_PATH=/path/to/chrome to use another browser. The clock is frozen so the "low for" durations stay the same.
Every capture keeps a 16 px frame of the theme background around the card or the full screen view.
"""

import json
import os
import subprocess
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
CARD_JS = (ROOT / "custom_components/battery_monitor/frontend/battery-monitor-card.js").read_text()
NOW = "2026-10-24T09:00:00+02:00"
WIDTH = 460

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
    "close": "M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z",
    "door-open": "M12,3C10.89,3 10,3.89 10,5H3V19H2V21H22V19H21V5C21,3.89 20.11,3 19,3H12M12,5H19V19H12V5M5,11H7V13H5V11Z",
    "cart-outline": "M17,18A2,2 0 0,1 19,20A2,2 0 0,1 17,22C15.89,22 15,21.1 15,20C15,18.89 15.89,18 17,18M1,2H4.27L5.21,4H20A1,1 0 0,1 21,5C21,5.17 20.95,5.34 20.88,5.5L17.3,11.97C16.96,12.58 16.3,13 15.55,13H8.1L7.2,14.63L7.17,14.75A0.25,0.25 0 0,0 7.42,15H19V17H7C5.89,17 5,16.1 5,15C5,14.65 5.09,14.32 5.24,14.04L6.6,11.59L3,4H1V2M7,18A2,2 0 0,1 9,20A2,2 0 0,1 7,22C5.89,22 5,21.1 5,20C5,18.89 5.89,18 7,18M16,11L18.78,6H6.14L8.5,11H16Z",
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
      "border:1px solid var(--divider-color);color:var(--primary-text-color);overflow:hidden}</style><slot></slot>";
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
]

# The full screen view: on a desktop by room and by type, on a phone by room and by type. The viewport is the size of
# the view; the page adds the 16 px frame around it.
POPUP_SHOTS = [
    {"file": "popup", "theme": "light", "view": "room", "viewport": (1600, 1000)},
    {"file": "popup-dark", "theme": "dark", "view": "type", "viewport": (1600, 1000)},
    {"file": "popup-phone", "theme": "light", "view": "room", "viewport": (390, 844)},
    {"file": "popup-phone-type", "theme": "light", "view": "type", "viewport": (390, 844)},
]


def page_html(theme):
    variables = "".join(f"{k}:{v};" for k, v in {**THEMES[theme], **COMMON}.items())
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
:root {{ {variables} }}
body {{ margin: 0; padding: 16px; background: var(--primary-background-color);
       font-family: Roboto, "Segoe UI", Helvetica, Arial, sans-serif; width: {WIDTH}px; }}
</style></head><body><div id="root"></div></body></html>"""


# Mounts the card on a new page (the card's top-level declarations would clash in a reused page); `view` opens its
# full screen view, by room or by type.
MOUNT = """([hass, config, view]) => {
    const el = document.createElement("battery-monitor-card");
    el.setConfig({ type: "custom:battery-monitor-card", ...config });
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
    page.evaluate(MOUNT, [mock_hass(), config, view])
    if view:
        page.evaluate(FRAME_POPUP)
    page.wait_for_timeout(500 if view else 300)
    return page, ROOT / "screenshots" / f"{shot['file']}.png"


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
            page.evaluate(
                "(t) => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = t; } }",
                (i * 1000) / fps,
            )
            page.screenshot(path=f"{frame_dir}/f{i:03d}.png", clip=clip)
        page.close()
        out = str(ROOT / "screenshots" / f"{shot['file']}.gif")
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
    print(f"screenshots/{shot['file']}.gif")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH") or None)
        for shot in SHOTS:
            page, path = open_card(browser, shot, shot["config"], (1000, 1600))
            # The card with the 16 px page padding around it, on the theme background.
            box = page.locator("#root").bounding_box()
            clip = {"x": 0, "y": 0, "width": WIDTH + 32, "height": int(box["height"] + 0.999) + 32}
            page.screenshot(path=str(path), clip=clip, animations="disabled")
            print(path.relative_to(ROOT))
            page.close()
        for shot in POPUP_SHOTS:
            width, height = shot["viewport"]
            page, path = open_card(browser, shot, CARD_CONFIG, (width + 32, height + 32), shot["view"])
            page.screenshot(path=str(path), animations="disabled")
            print(path.relative_to(ROOT))
            page.close()
        animate(browser, {"file": "due", "theme": "light"}, {}, (1000, 1600))
        browser.close()


if __name__ == "__main__":
    main()
