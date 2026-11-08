"""Config flow for Battery Monitor: a single entry, everything in the options."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.selector import (
    EntityFilterSelectorConfig,
    EntitySelector,
    EntitySelectorConfig,
    NumberSelector,
    NumberSelectorConfig,
    NumberSelectorMode,
    SelectOptionDict,
    SelectSelector,
    SelectSelectorConfig,
    SelectSelectorMode,
    TimeSelector,
)
from homeassistant.loader import async_get_integrations

from .const import (
    CONF_DURATION,
    CONF_EVENING,
    CONF_IGNORED_ENTITIES,
    CONF_IGNORED_INTEGRATIONS,
    CONF_MORNING,
    CONF_NOTIFY,
    CONF_THRESHOLD,
    DEFAULT_DURATION,
    DEFAULT_EVENING,
    DEFAULT_IGNORED_INTEGRATIONS,
    DEFAULT_MORNING,
    DEFAULT_THRESHOLD,
    DOMAIN,
    MAX_DURATION,
    MAX_THRESHOLD,
    MIN_DURATION,
    MIN_THRESHOLD,
)


def _multi(options: list[Any]) -> SelectSelector:
    return SelectSelector(
        SelectSelectorConfig(options=options, multiple=True, custom_value=True, mode=SelectSelectorMode.DROPDOWN)
    )


async def _schema(hass: HomeAssistant, current: dict[str, Any]) -> vol.Schema:
    """Threshold, duration, notification times and actions, entities and integrations left out."""
    notify: list[str] = list(current.get(CONF_NOTIFY, []))
    notify_options = sorted(
        {f"notify.{name}" for name in hass.services.async_services_for_domain("notify")}
        - {"notify.send_message", "notify.persistent_notification"}
        | set(notify)
    )
    # The integrations that provide a battery, plus the ones already left out.
    ignored: list[str] = list(current.get(CONF_IGNORED_INTEGRATIONS, DEFAULT_IGNORED_INTEGRATIONS))
    registry = er.async_get(hass)
    domains = {
        entry.platform
        for state in hass.states.async_all(("sensor", "binary_sensor"))
        if state.attributes.get("device_class") == "battery" and (entry := registry.async_get(state.entity_id))
    } | set(ignored)
    integrations = await async_get_integrations(hass, domains)
    integration_options = sorted(
        (SelectOptionDict(value=d, label=f"{getattr(integrations.get(d), 'name', d)} ({d})") for d in domains),
        key=lambda o: o["label"].casefold(),
    )
    return vol.Schema(
        {
            vol.Required(CONF_THRESHOLD, default=current.get(CONF_THRESHOLD, DEFAULT_THRESHOLD)): NumberSelector(
                NumberSelectorConfig(
                    min=MIN_THRESHOLD,
                    max=MAX_THRESHOLD,
                    step=1,
                    mode=NumberSelectorMode.SLIDER,
                    unit_of_measurement="%",
                )
            ),
            vol.Required(CONF_DURATION, default=current.get(CONF_DURATION, DEFAULT_DURATION)): NumberSelector(
                NumberSelectorConfig(
                    min=MIN_DURATION, max=MAX_DURATION, step=1, mode=NumberSelectorMode.BOX, unit_of_measurement="h"
                )
            ),
            vol.Required(CONF_MORNING, default=current.get(CONF_MORNING, DEFAULT_MORNING)): TimeSelector(),
            vol.Required(CONF_EVENING, default=current.get(CONF_EVENING, DEFAULT_EVENING)): TimeSelector(),
            vol.Optional(CONF_NOTIFY, default=notify): _multi(notify_options),
            vol.Optional(CONF_IGNORED_ENTITIES, default=list(current.get(CONF_IGNORED_ENTITIES, []))): EntitySelector(
                EntitySelectorConfig(
                    multiple=True,
                    filter=[
                        EntityFilterSelectorConfig(domain="sensor", device_class="battery"),
                        EntityFilterSelectorConfig(domain="binary_sensor", device_class="battery"),
                    ],
                )
            ),
            vol.Optional(CONF_IGNORED_INTEGRATIONS, default=ignored): _multi(integration_options),
        }
    )


def _time(value: Any) -> str:
    """`HH:MM:SS`, as the time selector stores it (the panel sends `HH:MM`)."""
    text = str(value)
    return f"{text}:00" if len(text) == 5 else text


def normalize_options(user_input: dict[str, Any]) -> dict[str, Any]:
    """The stored options: numbers as integers, times as `HH:MM:SS`, lists sorted and without duplicates."""
    return {
        CONF_THRESHOLD: int(user_input[CONF_THRESHOLD]),
        CONF_DURATION: int(user_input[CONF_DURATION]),
        CONF_MORNING: _time(user_input[CONF_MORNING]),
        CONF_EVENING: _time(user_input[CONF_EVENING]),
        CONF_NOTIFY: sorted(
            {f"notify.{n.strip().removeprefix('notify.')}" for n in user_input.get(CONF_NOTIFY, []) if n.strip()}
        ),
        CONF_IGNORED_ENTITIES: sorted(set(user_input.get(CONF_IGNORED_ENTITIES, []))),
        CONF_IGNORED_INTEGRATIONS: sorted(
            {d.strip() for d in user_input.get(CONF_IGNORED_INTEGRATIONS, []) if d.strip()}
        ),
    }


class BatteryMonitorConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle the config flow."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()
        if user_input is not None:
            return self.async_create_entry(title="Battery Monitor", data={}, options=normalize_options(user_input))
        return self.async_show_form(step_id="user", data_schema=await _schema(self.hass, {}))

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return BatteryMonitorOptionsFlow()


class BatteryMonitorOptionsFlow(OptionsFlow):
    """Change the threshold, the duration, the times and the notify actions."""

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(data=normalize_options(user_input))
        return self.async_show_form(
            step_id="init", data_schema=await _schema(self.hass, dict(self.config_entry.options))
        )
