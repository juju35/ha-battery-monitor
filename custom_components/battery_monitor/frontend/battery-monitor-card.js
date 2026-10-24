/**
 * battery-monitor-card — the batteries watched by the Battery Monitor integration:
 * icon, name, room and level, the lowest first.
 * Served and added to the dashboard resources by the integration.
 * https://github.com/juju35/ha-battery-monitor
 */
var BATTERY_MONITOR_CARD_VERSION = '1.2.0';

const BM_I18N = {
  en: {
    title: 'Batteries',
    all_ok: 'All good',
    low_one: '{n} low',
    low_many: '{n} low',
    unavailable_one: '{n} unavailable',
    unavailable_many: '{n} unavailable',
    no_batteries: 'No battery found',
    not_loaded: 'Battery Monitor is not set up',
    low: 'Low',
    unavailable: 'Unavailable',
    notify_now: 'Notify now',
    since: 'low for {d}',
    since_unavailable: 'unavailable for {d}',
    hours: '{n} h',
    days: '{n} d',
    ed_entity: 'Battery Monitor sensor',
    ed_entity_helper: 'Leave empty to find it automatically',
    ed_title: 'Title',
    ed_title_helper: 'Leave empty for “Batteries”',
    ed_columns: 'Columns',
    ed_only_low: 'Hide the batteries that are fine',
    ed_only_low_helper: 'Only the batteries below the threshold or unavailable stay visible',
    ed_hide_when_ok: 'Hide the card when every battery is fine',
    ed_hide_when_ok_helper: 'The card only appears when a battery is below the threshold or unavailable',
    ed_notify_button: '“Notify now” button',
    ed_notify_button_helper: 'Sends the low-battery notification from the header',
  },
  fr: {
    title: 'Batteries',
    all_ok: 'Tout est bon',
    low_one: '{n} faible',
    low_many: '{n} faibles',
    unavailable_one: '{n} indisponible',
    unavailable_many: '{n} indisponibles',
    no_batteries: 'Aucune batterie trouvée',
    not_loaded: 'Battery Monitor n’est pas configuré',
    low: 'Faible',
    unavailable: 'Indisponible',
    notify_now: 'Notifier maintenant',
    since: 'faible depuis {d}',
    since_unavailable: 'indisponible depuis {d}',
    hours: '{n} h',
    days: '{n} j',
    ed_entity: 'Capteur Battery Monitor',
    ed_entity_helper: 'Laisser vide pour le trouver automatiquement',
    ed_title: 'Titre',
    ed_title_helper: 'Laisser vide pour « Batteries »',
    ed_columns: 'Colonnes',
    ed_only_low: 'Masquer les batteries en bon état',
    ed_only_low_helper: 'Seules les batteries sous le seuil ou indisponibles restent affichées',
    ed_hide_when_ok: 'Masquer la carte si toutes les batteries vont bien',
    ed_hide_when_ok_helper: 'La carte n’apparaît que si une batterie est sous le seuil ou indisponible',
    ed_notify_button: 'Bouton « Notifier maintenant »',
    ed_notify_button_helper: 'Envoie la notification des batteries faibles depuis l’en-tête',
  },
};

const bmLang = (hass, config) => {
  const l = (config?.language || hass?.locale?.language || hass?.language || 'en').slice(0, 2);
  return BM_I18N[l] ? l : 'en';
};

const bmT = (lang, key, vars = {}) =>
  (BM_I18N[lang]?.[key] ?? BM_I18N.en[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

const bmEsc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const BM_DEFAULTS = { columns: 1, only_low: false, hide_when_ok: false, notify_button: true };

// The integration's "Low batteries" sensor: the one carrying the battery list.
const bmFindEntity = (hass) =>
  Object.keys(hass?.states || {}).find(
    (id) =>
      id.startsWith('sensor.') &&
      hass.entities?.[id]?.platform === 'battery_monitor' &&
      Array.isArray(hass.states[id].attributes.batteries),
  );

class BatteryMonitorCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement('battery-monitor-card-editor');
  }

  static getStubConfig() {
    return {};
  }

  setConfig(config) {
    this._config = { ...BM_DEFAULTS, ...config };
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this._sig = null;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 1 + Math.ceil((this._shown || 1) / (this._config?.columns || 1));
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6, rows: 'auto' };
  }

  _t(key, vars) {
    return bmT(bmLang(this._hass, this._config), key, vars);
  }

  _since(iso, key) {
    const h = Math.max(0, (Date.now() - new Date(iso).getTime()) / 3600000);
    return this._t(key, { d: h < 48 ? this._t('hours', { n: Math.floor(h) }) : this._t('days', { n: Math.floor(h / 24) }) });
  }

  _render() {
    if (!this._config || !this._hass || !this.shadowRoot) return;
    const c = this._config;
    const entity = c.entity || bmFindEntity(this._hass);
    const st = entity && this._hass.states[entity];
    const all = st?.attributes.batteries || [];
    const low = all.filter((b) => b.low);
    const unavailable = all.filter((b) => b.unavailable);
    const attention = low.length + unavailable.length;
    const due = all.filter((b) => b.due);
    const shown = c.only_low ? all.filter((b) => b.low || b.unavailable) : all;
    this._shown = shown.length;
    // The button of the same device, to notify now.
    const device = entity && this._hass.entities?.[entity]?.device_id;
    const button = Object.keys(this._hass.states).find(
      (id) => id.startsWith('button.') && device && this._hass.entities?.[id]?.device_id === device,
    );

    // The current hour too: "low for X h" is computed from the clock, while below_since doesn't change.
    const sig = JSON.stringify([c, bmLang(this._hass, c), entity, st?.state, all, button, Math.floor(Date.now() / 3600000)]);
    if (sig === this._sig) return;
    this._sig = sig;

    const hidden = c.hide_when_ok && st && !attention;
    this.style.display = hidden ? 'none' : '';
    if (hidden) return;

    const level = due.length ? 'alert' : attention ? 'warn' : 'ok';
    const counts = [
      low.length ? this._t(low.length > 1 ? 'low_many' : 'low_one', { n: low.length }) : '',
      unavailable.length
        ? this._t(unavailable.length > 1 ? 'unavailable_many' : 'unavailable_one', { n: unavailable.length })
        : '',
    ].filter(Boolean);
    const status = !st
      ? this._t('not_loaded')
      : counts.length
        ? counts.join(' · ')
        : this._t(all.length ? 'all_ok' : 'no_batteries');
    const cols = Math.min(3, Math.max(1, Number(c.columns) || 1));

    const rows = shown
      .map((b) => {
        // An unavailable battery is an alert too (often a dead one), shown with its own icon.
        const kind = `${b.low || b.unavailable ? (b.due ? 'alert' : 'warn') : 'ok'}${b.unavailable ? ' na' : ''}`;
        const value = b.unavailable ? this._t('unavailable') : b.level == null ? this._t('low') : `${b.level} %`;
        const since = b.below_since ? this._since(b.below_since, b.unavailable ? 'since_unavailable' : 'since') : null;
        const sub = [b.area, since].filter(Boolean).join(' · ');
        const bar = b.level == null ? '' : `<span class="bar" style="width:${Math.max(2, Math.min(100, b.level))}%"></span>`;
        return `
          <button class="row ${kind}" data-id="${bmEsc(b.entity_id)}" title="${bmEsc(b.name)} — ${bmEsc(value)}">
            <span class="ic"><ha-icon icon="${bmEsc(b.icon)}"></ha-icon></span>
            <span class="txt">
              <span class="name">${bmEsc(b.name)}</span>
              ${sub ? `<span class="sub">${bmEsc(sub)}</span>` : ''}
            </span>
            <span class="lvl">${bmEsc(value)}${bar ? `<span class="track">${bar}</span>` : ''}</span>
          </button>`;
      })
      .join('');

    this.shadowRoot.innerHTML = `
      <style>${BatteryMonitorCard.styles}</style>
      <ha-card class="lvl-${level}">
        <div class="head">
          <div class="badge"><ha-icon icon="${level === 'ok' ? 'mdi:battery-check-outline' : 'mdi:battery-alert-variant-outline'}"></ha-icon></div>
          <div class="title">${bmEsc(c.title || this._t('title'))}</div>
          ${
            c.notify_button && button
              ? `<button class="notify" title="${bmEsc(this._t('notify_now'))}" aria-label="${bmEsc(this._t('notify_now'))}"><ha-icon icon="mdi:bell-ring-outline"></ha-icon></button>`
              : ''
          }
          <div class="pill">${bmEsc(status)}</div>
        </div>
        ${rows ? `<div class="list" style="--cols:${cols}">${rows}</div>` : ''}
      </ha-card>`;

    this.shadowRoot.querySelector('.notify')?.addEventListener('click', () => {
      this._hass.callService('button', 'press', { entity_id: button });
    });
    for (const el of this.shadowRoot.querySelectorAll('.row')) {
      el.addEventListener('click', () => {
        const ev = new Event('hass-more-info', { bubbles: true, composed: true });
        ev.detail = { entityId: el.dataset.id };
        this.dispatchEvent(ev);
      });
    }
  }

  static get styles() {
    return `
      :host {
        --bm-ok: var(--success-color, #43a047);
        --bm-warn: var(--warning-color, #ffa600);
        --bm-alert: var(--error-color, #db4437);
        --bm-na: var(--disabled-color, #9e9e9e);
      }
      ha-card { padding: 12px; overflow: hidden; }
      ha-card.lvl-ok    { --c: var(--bm-ok); }
      ha-card.lvl-warn  { --c: var(--bm-warn); }
      ha-card.lvl-alert { --c: var(--bm-alert); }

      .head { display: flex; align-items: center; gap: 10px; }
      .badge { flex: none; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center;
               background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--c); }
      .badge ha-icon { --mdc-icon-size: 20px; }
      .title { flex: 1; min-width: 0; font-size: 16px; font-weight: 500; color: var(--primary-text-color);
               white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .pill { flex: none; font-size: 11px; font-weight: 500; padding: 1px 8px; border-radius: 999px;
              color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); }
      .notify { all: unset; cursor: pointer; flex: none; width: 26px; height: 26px; border-radius: 50%;
                display: grid; place-items: center; color: var(--secondary-text-color); }
      .notify:hover { background: color-mix(in srgb, var(--secondary-text-color) 14%, transparent); }
      .notify:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
      .notify ha-icon { --mdc-icon-size: 16px; }

      .list { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); gap: 6px; margin-top: 10px; }
      .row { --t: var(--bm-ok); all: unset; box-sizing: border-box; cursor: pointer; min-width: 0;
             display: flex; align-items: center; gap: 8px; padding: 5px 10px 5px 5px; border-radius: 10px;
             background: var(--secondary-background-color, transparent); border: 1px solid transparent; }
      .row.warn  { --t: var(--bm-warn); }
      .row.alert { --t: var(--bm-alert); }
      .row.na .lvl { font-weight: 400; }
      .row.warn, .row.alert {
        background: color-mix(in srgb, var(--t) 8%, var(--secondary-background-color, transparent));
        border-color: color-mix(in srgb, var(--t) 22%, transparent); }
      .row:hover { background: color-mix(in srgb, var(--t) 13%, var(--secondary-background-color, transparent)); }
      .row:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
      .ic { flex: none; width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center;
            color: var(--t); background: color-mix(in srgb, var(--t) 18%, transparent); }
      .ic ha-icon { --mdc-icon-size: 16px; }
      .row.alert .ic { animation: bm-blink 1.5s ease-in-out infinite; }
      .txt { flex: 1; display: flex; flex-direction: column; min-width: 0; }
      .name { font-size: 13px; font-weight: 500; line-height: 1.2; color: var(--primary-text-color);
              white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .sub { font-size: 11px; line-height: 1.2; color: var(--secondary-text-color);
             white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .row.warn .sub, .row.alert .sub { color: var(--t); }
      .lvl { flex: none; display: flex; flex-direction: column; align-items: flex-end; gap: 3px;
             font-size: 12px; font-weight: 500; color: var(--primary-text-color); font-variant-numeric: tabular-nums; }
      .row:not(.ok) .lvl { color: var(--t); }
      .track { width: 44px; height: 4px; border-radius: 2px; overflow: hidden;
               background: color-mix(in srgb, var(--secondary-text-color) 22%, transparent); }
      .bar { display: block; height: 100%; border-radius: 2px; background: var(--t); }

      @keyframes bm-blink { 0%, 100% { opacity: 1 } 50% { opacity: .35 } }
      @media (prefers-reduced-motion: reduce) { .row.alert .ic { animation: none; } }
    `;
  }
}

// ── Editor ───────────────────────────────────────────────────────────────────
const BM_HELPERS = ['entity', 'title', 'only_low', 'hide_when_ok', 'notify_button'];

class BatteryMonitorCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._update();
  }

  set hass(hass) {
    this._hass = hass;
    this._update();
  }

  _update() {
    if (!this._hass || !this._config) return;
    const lang = bmLang(this._hass, this._config);
    if (!this._form) {
      this._form = document.createElement('ha-form');
      this._form.computeLabel = (s) => bmT(lang, `ed_${s.name}`);
      this._form.computeHelper = (s) => (BM_HELPERS.includes(s.name) ? bmT(lang, `ed_${s.name}_helper`) : undefined);
      this._form.addEventListener('value-changed', (ev) => {
        const config = { ...ev.detail.value };
        // Options left at their default are not written to the YAML.
        for (const k of Object.keys(config)) {
          if (config[k] === '' || config[k] == null || BM_DEFAULTS[k] === config[k]) delete config[k];
        }
        this.dispatchEvent(new CustomEvent('config-changed', { detail: { config }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.data = { ...BM_DEFAULTS, ...this._config };
    this._form.schema = [
      { name: 'entity', selector: { entity: { filter: { integration: 'battery_monitor', domain: 'sensor' } } } },
      { name: 'title', selector: { text: {} } },
      { name: 'columns', selector: { number: { min: 1, max: 3, mode: 'box' } } },
      { name: 'only_low', selector: { boolean: {} } },
      { name: 'hide_when_ok', selector: { boolean: {} } },
      { name: 'notify_button', selector: { boolean: {} } },
    ];
  }
}

if (!customElements.get('battery-monitor-card')) {
  customElements.define('battery-monitor-card', BatteryMonitorCard);
  customElements.define('battery-monitor-card-editor', BatteryMonitorCardEditor);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: 'battery-monitor-card',
    name: 'Battery Monitor Card',
    description: 'The batteries watched by Battery Monitor: icon, name and level, the lowest first',
    preview: true,
    documentationURL: 'https://github.com/juju35/ha-battery-monitor',
  });
  console.info(
    `%c BATTERY-MONITOR-CARD %c v${BATTERY_MONITOR_CARD_VERSION} `,
    'background:#14b8a6;color:#fff;font-weight:700',
    '',
  );
}
