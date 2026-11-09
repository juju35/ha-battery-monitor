"""The translation files the release splits out of the frontend are served next to the card."""

from pathlib import Path

from custom_components.battery_monitor import _language_files


def test_language_files_are_the_split_ones(tmp_path: Path) -> None:
    for name in ("card.js", "card.i18n.fr.js", "card.i18n.sr-Latn.js", "panel.i18n.de.js", "notes.txt"):
        (tmp_path / name).write_text("", encoding="utf-8")
    assert _language_files(tmp_path) == ["card.i18n.fr.js", "card.i18n.sr-Latn.js", "panel.i18n.de.js"]


def test_a_git_checkout_has_none() -> None:
    frontend = Path(__file__).parents[1] / "custom_components" / "battery_monitor" / "frontend"
    assert _language_files(frontend) == []
