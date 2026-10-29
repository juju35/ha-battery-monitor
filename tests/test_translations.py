"""Every translation file has exactly the keys and placeholders of the English one."""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

TRANSLATIONS = Path(__file__).parent.parent / "custom_components" / "battery_monitor" / "translations"
PLACEHOLDER = re.compile(r"\{(\w+)\}")


def _flatten(data: dict, prefix: str = "") -> dict[str, str]:
    out: dict[str, str] = {}
    for key, value in data.items():
        path = f"{prefix}{key}"
        if isinstance(value, dict):
            out.update(_flatten(value, f"{path}."))
        else:
            out[path] = value
    return out


def _load(lang: str) -> dict[str, str]:
    return _flatten(json.loads((TRANSLATIONS / f"{lang}.json").read_text(encoding="utf-8")))


def test_languages() -> None:
    """English, French, German and Spanish are shipped."""
    assert {p.stem for p in TRANSLATIONS.glob("*.json")} >= {"en", "fr", "de", "es"}


@pytest.mark.parametrize("lang", sorted(p.stem for p in TRANSLATIONS.glob("*.json") if p.stem != "en"))
def test_parity(lang: str) -> None:
    """Same keys as English, same placeholders in every string."""
    en, other = _load("en"), _load(lang)
    assert sorted(other) == sorted(en)
    for key, text in en.items():
        assert sorted(PLACEHOLDER.findall(other[key])) == sorted(PLACEHOLDER.findall(text)), f"{lang}: {key}"


# Serbian Cyrillic letter by letter, then its Latin spelling (љ, њ and џ take two letters).
_SERBIAN = "аaбbвvгgдdђđеeжžзzиiјjкkлlљljмmнnњnjоoпpрrсsтtћćуuфfхhцcчčџdžшš"
_TO_LATIN = dict(re.findall(r"([а-џ])([^а-џ]+)", _SERBIAN))
_TO_LATIN |= {c.upper(): lat.capitalize() for c, lat in _TO_LATIN.items()}


def test_serbian_scripts_match() -> None:
    """The Cyrillic and Latin Serbian files say the same thing, letter for letter."""
    cyrillic, latin = _load("sr"), _load("sr-Latn")
    for key, text in cyrillic.items():
        assert "".join(_TO_LATIN.get(ch, ch) for ch in text) == latin[key], key


@pytest.mark.parametrize("lang", ["sr", "sr-Latn"])
@pytest.mark.parametrize("key", ["exceptions.title_many.message", "exceptions.check_many.message"])
def test_serbian_counts_agree_with_any_number(lang: str, key: str) -> None:
    """Serbian nouns change form after 2–4 and after 5+: the count goes after a colon, not before the noun."""
    text = _load(lang)[key]
    assert not text.startswith("{count}"), text
    assert text.endswith(": {count}"), text
