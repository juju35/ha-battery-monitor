"""The repair raised while System Hub, which replaces this integration, is set up too."""

from __future__ import annotations

from homeassistant.config_entries import SIGNAL_CONFIG_ENTRY_CHANGED, ConfigEntryChange
from homeassistant.core import HomeAssistant
from homeassistant.helpers import issue_registry as ir
from homeassistant.helpers.dispatcher import async_dispatcher_send
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.battery_monitor import system_hub_notice
from custom_components.battery_monitor.const import DOMAIN


def _add_hub(hass: HomeAssistant) -> MockConfigEntry:
    """A System Hub entry added, as Home Assistant signals it (add_to_hass alone does not)."""
    hub = MockConfigEntry(domain=system_hub_notice.SYSTEM_HUB)
    hub.add_to_hass(hass)
    async_dispatcher_send(hass, SIGNAL_CONFIG_ENTRY_CHANGED, ConfigEntryChange.ADDED, hub)
    return hub


def _issue(hass: HomeAssistant) -> ir.IssueEntry | None:
    return ir.async_get(hass).async_get_issue(DOMAIN, system_hub_notice.ISSUE_ID)


async def test_repair_while_system_hub_is_set_up(hass: HomeAssistant) -> None:
    entry = MockConfigEntry(domain=DOMAIN)
    entry.add_to_hass(hass)
    stop = system_hub_notice.async_watch(hass, entry, "Battery Monitor")
    assert _issue(hass) is None

    hub = _add_hub(hass)
    await hass.async_block_till_done()
    issue = _issue(hass)
    assert issue is not None
    assert issue.translation_key == system_hub_notice.ISSUE_ID
    assert issue.translation_placeholders == {"name": "Battery Monitor", "url": system_hub_notice.MIGRATING_URL}
    assert issue.severity is ir.IssueSeverity.WARNING

    await hass.config_entries.async_remove(hub.entry_id)
    await hass.async_block_till_done()
    assert _issue(hass) is None

    _add_hub(hass)
    await hass.async_block_till_done()
    assert _issue(hass) is not None
    stop()
    assert _issue(hass) is None


async def test_repair_at_setup_when_system_hub_exists(hass: HomeAssistant) -> None:
    MockConfigEntry(domain=system_hub_notice.SYSTEM_HUB).add_to_hass(hass)
    entry = MockConfigEntry(domain=DOMAIN)
    entry.add_to_hass(hass)
    system_hub_notice.async_watch(hass, entry, "Battery Monitor")
    assert _issue(hass) is not None
