"""System Hub replaces this integration: a repair while both are set up.

System Hub (https://github.com/juju35/ha-system-hub) runs the same thing as one of its modules. Set up next to it,
this integration would run twice and register its cards twice: a repair says so, from the setup of an entry or as
soon as a System Hub entry is added, and goes away once System Hub is removed or this integration unloaded.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Final

from homeassistant.config_entries import (
    SIGNAL_CONFIG_ENTRY_CHANGED,
    ConfigEntry,
    ConfigEntryChange,
    ConfigEntryState,
)
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import issue_registry as ir
from homeassistant.helpers.dispatcher import async_dispatcher_connect

SYSTEM_HUB: Final = "system_hub"
ISSUE_ID: Final = "system_hub_installed"
MIGRATING_URL: Final = "https://github.com/juju35/ha-system-hub#migrating"


@callback
def _update(hass: HomeAssistant, domain: str, name: str) -> None:
    """The repair when a System Hub entry exists, else none."""
    if hass.config_entries.async_entries(SYSTEM_HUB):
        ir.async_create_issue(
            hass,
            domain,
            ISSUE_ID,
            is_fixable=False,
            is_persistent=False,
            learn_more_url=MIGRATING_URL,
            severity=ir.IssueSeverity.WARNING,
            translation_key=ISSUE_ID,
            translation_placeholders={"name": name, "url": MIGRATING_URL},
        )
    else:
        ir.async_delete_issue(hass, domain, ISSUE_ID)


@callback
def async_watch(hass: HomeAssistant, entry: ConfigEntry, name: str) -> Callable[[], None]:
    """Raise the repair while System Hub is set up; the callback returned stops watching (for async_on_unload)."""
    domain = entry.domain
    _update(hass, domain, name)

    @callback
    def _changed(change: ConfigEntryChange, changed: ConfigEntry) -> None:
        if changed.domain == SYSTEM_HUB and change in (ConfigEntryChange.ADDED, ConfigEntryChange.REMOVED):
            _update(hass, domain, name)

    unsubscribe = async_dispatcher_connect(hass, SIGNAL_CONFIG_ENTRY_CHANGED, _changed)

    @callback
    def _stop() -> None:
        unsubscribe()
        others = [
            e
            for e in hass.config_entries.async_entries(domain)
            if e.entry_id != entry.entry_id and e.state is ConfigEntryState.LOADED
        ]
        if not others:
            ir.async_delete_issue(hass, domain, ISSUE_ID)

    return _stop
