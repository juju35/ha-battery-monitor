"""The GIF recording pauses every animation, those in shadow roots too, so that two recordings are identical."""

from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest

sync_api = pytest.importorskip("playwright.sync_api")
_spec = importlib.util.spec_from_file_location("screenshots", Path(__file__).parents[1] / "screenshots.py")
screenshots = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(screenshots)

PAGE = """<div id="host"></div><script>
  const root = document.getElementById('host').attachShadow({ mode: 'open' });
  root.innerHTML = '<style>@keyframes b { to { opacity: 0 } } i { display: block; animation: b 1s infinite }</style><i></i>';
</script>"""


def test_animations_in_shadow_roots_are_paused():
    try:
        with sync_api.sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            page.set_content(PAGE)
            # document.getAnimations() alone does not see the shadow root's animation: it would keep running.
            assert page.evaluate("document.getAnimations().length") == 0
            assert page.evaluate(screenshots.SEEK_ANIMATIONS, 250) == 1
            state = "(() => { const a = document.getElementById('host').shadowRoot.getAnimations()[0];"
            assert page.evaluate(state + " return [a.playState, a.currentTime]; })()") == ["paused", 250]
            browser.close()
    except sync_api.Error as err:
        pytest.skip(f"no browser: {err}")
