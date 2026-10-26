/**
 * battery-monitor-card — the batteries watched by the Battery Monitor integration:
 * icon, name, room and level, the lowest first; full screen, grouped by room or by battery type.
 * Served and added to the dashboard resources by the integration.
 * https://github.com/juju35/ha-battery-monitor
 */
var BATTERY_MONITOR_CARD_VERSION = '1.6.1';

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
    ed_language: 'Language',
    ed_language_helper: 'Leave empty to follow Home Assistant',
    ed_popup: 'Full screen button',
    ed_popup_helper: 'Opens every battery over the whole screen, by room or by battery type',
    ed_battery_models: 'Battery types by model',
    ed_battery_models_helper:
      'One type for every device of a model whose type is not detected (Battery Notes): pick it or type it, e.g. CR2450, 2× AA',
    ed_battery_types: 'Battery types by battery',
    ed_battery_types_helper: 'For a battery without a model, or one that differs from its model',
    devices_n: '{n} devices',
    devices_one: '1 device',
    popup_open: 'Full screen',
    popup_close: 'Close',
    by_room: 'By room',
    by_type: 'By battery type',
    no_area: 'No room',
    unknown_type: 'Unknown type',
    unknown_type_hint: 'Set the type in the card editor',
    rechargeable: 'Built-in rechargeable',
    count: '{n} batteries',
    count_one: '1 battery',
    cells: '{n} batteries',
    cells_one: '1 battery',
    to_check: '{n} to check',
    to_replace: 'To replace',
    nothing_to_replace: 'Nothing to replace',
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
    ed_language: 'Langue',
    ed_language_helper: 'Laisser vide pour suivre Home Assistant',
    ed_popup: 'Bouton plein écran',
    ed_popup_helper: 'Affiche toutes les batteries sur tout l’écran, par pièce ou par type de pile',
    ed_battery_models: 'Types de pile par modèle',
    ed_battery_models_helper:
      'Un type pour tous les appareils d’un modèle dont le type n’est pas détecté (Battery Notes) : le choisir ou le saisir, ex. CR2450, 2× AA',
    ed_battery_types: 'Types de pile par batterie',
    ed_battery_types_helper: 'Pour une batterie sans modèle, ou qui diffère de son modèle',
    devices_n: '{n} appareils',
    devices_one: '1 appareil',
    popup_open: 'Plein écran',
    popup_close: 'Fermer',
    by_room: 'Par pièce',
    by_type: 'Par type de pile',
    no_area: 'Sans pièce',
    unknown_type: 'Type inconnu',
    unknown_type_hint: 'Définir le type dans l’éditeur de la carte',
    rechargeable: 'Batterie rechargeable intégrée',
    count: '{n} batteries',
    count_one: '1 batterie',
    cells: '{n} piles',
    cells_one: '1 pile',
    to_check: '{n} à vérifier',
    to_replace: 'À remplacer',
    nothing_to_replace: 'Rien à remplacer',
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

const BM_DEFAULTS = { columns: 1, only_low: false, hide_when_ok: false, notify_button: true, popup: true };

// ── Battery types ────────────────────────────────────────────────────────────
// The type comes from the card's `battery_types` (set in the editor), else from Battery Notes: the `battery_type` /
// `battery_quantity` attributes of the battery entity, or its "Battery type" sensor on the same device.
// "2× AA", "2x AA" or "AA x2" read as 2 AA batteries.
const BM_TYPES = ['CR2032', 'CR2450', 'CR2477', 'CR2016', 'CR2025', 'CR1632', 'CR123A', 'CR2', 'AA', 'AAA', '2× AA',
  '2× AAA', '3× AA', '3× AAA', '4× AA', 'LR44', '9V', '18650', 'ER14505', 'rechargeable'];

function bmParseType(value, quantity) {
  const s = String(value ?? '').trim();
  if (!s || s === 'unknown' || s === 'unavailable') return null;
  const m = /^(\d+)\s*[x×]\s*(.+)$/i.exec(s) || /^(.+?)\s*[x×]\s*(\d+)$/i.exec(s);
  if (m) {
    const [n, type] = /^\d+$/.test(m[1]) ? [m[1], m[2]] : [m[2], m[1]];
    return { type: type.trim(), quantity: Number(n) };
  }
  const q = Number(quantity);
  return { type: s, quantity: Number.isFinite(q) && q > 0 ? q : 1 };
}

// Battery Notes' "Battery type" sensors, by device, built once per entity registry object.
const bmTypeSensors = new WeakMap();
function bmTypeSensorOf(registry, deviceId) {
  if (!registry || !deviceId) return undefined;
  let index = bmTypeSensors.get(registry);
  if (!index) {
    index = new Map();
    for (const [id, e] of Object.entries(registry)) {
      if (e?.device_id && id.startsWith('sensor.') && (e.translation_key === 'battery_type' || /_battery_type$/.test(id))) {
        index.set(e.device_id, id);
      }
    }
    bmTypeSensors.set(registry, index);
  }
  return index.get(deviceId);
}

// The detected type of a battery (without the card's own setting), or null.
function bmDetectedType(hass, b) {
  const a = hass?.states?.[b.entity_id]?.attributes || {};
  if (a.battery_type) return bmParseType(a.battery_type, a.battery_quantity);
  const sensor = hass?.states?.[bmTypeSensorOf(hass?.entities, b.device_id)];
  return sensor ? bmParseType(sensor.state, sensor.attributes?.battery_quantity) : null;
}

// The icon of a room, from the area registry (the battery list names its area): the area's own icon, else a door,
// and a house for the batteries without a room.
function bmAreaIcon(hass, name) {
  if (!name) return 'mdi:home-outline';
  const area = Object.values(hass?.areas || {}).find((a) => a?.name === name);
  return area?.icon || 'mdi:door-open';
}

// The model of a battery's device ("Hue dimmer switch", "MYGGBETT door/window sensor"), from the device registry.
const bmModelOf = (hass, b) => String(hass?.devices?.[b.device_id]?.model || '').trim();

// The type of a battery: set for this battery in the card, else set for its model, else detected.
const bmTypeOf = (hass, config, b) => {
  const set = config?.battery_types?.[b.entity_id] || config?.battery_models?.[bmModelOf(hass, b)];
  return set ? bmParseType(set) : bmDetectedType(hass, b);
};

// The integration's sensors, from the entity registry.
const bmCandidates = (registry) =>
  Object.keys(registry || {}).filter((id) => id.startsWith('sensor.') && registry[id]?.platform === 'battery_monitor');

// The integration's "Low batteries" sensor: the candidate whose state carries the battery list right now.
const bmPick = (hass, candidates) => candidates.find((id) => Array.isArray(hass?.states?.[id]?.attributes?.batteries));

// The "Notify now" button of the sensor's device.
const bmFindButton = (registry, entity) => {
  const device = entity && registry?.[entity]?.device_id;
  return device
    ? Object.keys(registry).find((id) => id.startsWith('button.') && registry[id].device_id === device)
    : undefined;
};

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

  disconnectedCallback() {
    this._closePopup();
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

  // The sensor and the "Notify now" button of its device. What comes from the entity registry (the integration's
  // sensors, each sensor's button) is kept until hass.entities changes; the states are read again at each call, so a
  // sensor missing, restored or without its battery list at the first render is found as soon as its state is there.
  // An empty registry result is never kept.
  _lookup() {
    const registry = this._hass.entities;
    if (!this._reg || this._reg.registry !== registry) this._reg = { registry, candidates: null, buttons: {} };
    const reg = this._reg;
    let entity = this._config.entity;
    if (!entity) {
      const candidates = reg.candidates || bmCandidates(registry);
      if (candidates.length) reg.candidates = candidates;
      entity = bmPick(this._hass, candidates);
    }
    if (!entity) return {};
    if (!(entity in reg.buttons)) {
      const button = bmFindButton(registry, entity);
      // No button is kept only once the registry knows the sensor (otherwise it may just not be loaded yet).
      if (!button && !registry?.[entity]) return { entity };
      reg.buttons[entity] = button;
    }
    return { entity, button: reg.buttons[entity] };
  }

  _render() {
    if (!this._config || !this._hass || !this.shadowRoot) return;
    const c = this._config;
    const { entity, button } = this._lookup();
    const st = entity && this._hass.states[entity];
    const all = st?.attributes.batteries || [];
    const low = all.filter((b) => b.low);
    const unavailable = all.filter((b) => b.unavailable);
    const attention = low.length + unavailable.length;
    const due = all.filter((b) => b.due);
    const shown = c.only_low ? all.filter((b) => b.low || b.unavailable) : all;
    this._shown = shown.length;

    // The current hour too: "low for X h" is computed from the clock, while below_since doesn't change.
    // The battery types read from Battery Notes, which may change without the battery list changing.
    const types = all.map((b) => bmTypeOf(this._hass, c, b));
    const sig = JSON.stringify([c, bmLang(this._hass, c), entity, st?.state, all, types, button, Math.floor(Date.now() / 3600000)]);
    if (sig === this._sig) return;
    this._sig = sig;
    this._state = { entity, button, all, low, unavailable, due, attention };
    if (this._popup) this._renderPopup();

    const hidden = c.hide_when_ok && st && !attention;
    this.style.display = hidden ? 'none' : '';
    if (hidden) return;

    const level = this._level();
    const counts = [
      low.length ? this._t(low.length > 1 ? 'low_many' : 'low_one', { n: low.length }) : '',
      unavailable.length
        ? this._t(unavailable.length > 1 ? 'unavailable_many' : 'unavailable_one', { n: unavailable.length })
        : '',
    ].filter(Boolean);
    const status = this._status(st, counts, all);
    const cols = Math.min(3, Math.max(1, Number(c.columns) || 1));

    // The room and the battery type (CR2032, 2× AA…) under each name, when known.
    const rows = shown
      .map((b) => this._row(b, [b.area, this._typeLabel(bmTypeOf(this._hass, c, b))].filter(Boolean).join(' · ')))
      .join('');

    this.shadowRoot.innerHTML = `
      <style>${BatteryMonitorCard.styles}</style>
      <ha-card class="lvl-${level}">
        <div class="head">
          <div class="badge"><ha-icon icon="${level === 'ok' ? 'mdi:battery-check-outline' : 'mdi:battery-alert-variant-outline'}"></ha-icon></div>
          <div class="title">${bmEsc(c.title || this._t('title'))}</div>
          ${this._notifyButton()}
          <div class="pill">${bmEsc(status)}</div>
          ${
            c.popup !== false && st
              ? `<button class="full" title="${bmEsc(this._t('popup_open'))}" aria-label="${bmEsc(this._t('popup_open'))}"><ha-icon icon="mdi:fullscreen"></ha-icon></button>`
              : ''
          }
        </div>
        ${rows ? `<div class="list" style="--cols:${cols}">${rows}</div>` : ''}
      </ha-card>`;

    this.shadowRoot.querySelector('.notify')?.addEventListener('click', () => this._notify());
    this.shadowRoot.querySelector('.full')?.addEventListener('click', () => this._openPopup());
    for (const el of this.shadowRoot.querySelectorAll('.row')) el.addEventListener('click', () => this._moreInfo(el.dataset.id));
  }

  // 'alert' when a battery is due, 'warn' when one needs attention, else 'ok'.
  _level() {
    const s = this._state;
    return s.due.length ? 'alert' : s.attention ? 'warn' : 'ok';
  }

  _status(st, counts, all) {
    if (!st) return this._t('not_loaded');
    return counts.length ? counts.join(' · ') : this._t(all.length ? 'all_ok' : 'no_batteries');
  }

  _notifyButton() {
    const { button } = this._state;
    if (!this._config.notify_button || !button) return '';
    const label = bmEsc(this._t('notify_now'));
    return `<button class="notify" title="${label}" aria-label="${label}"><ha-icon icon="mdi:bell-ring-outline"></ha-icon></button>`;
  }

  _notify() {
    this._hass.callService('button', 'press', { entity_id: this._state.button });
  }

  _moreInfo(entityId) {
    const ev = new Event('hass-more-info', { bubbles: true, composed: true });
    ev.detail = { entityId };
    this.dispatchEvent(ev);
  }

  // The battery type with how many it takes: "1× CR2032", "4× AA"; a built-in rechargeable battery has no count.
  _typeLabel(t, withCount = true) {
    if (!t) return '';
    if (t.type === 'rechargeable') return this._t('rechargeable');
    return withCount ? `${t.quantity || 1}× ${t.type}` : t.type;
  }

  // One battery: `context` (its room, or its type) then how long it has needed attention, under its name.
  _row(b, context) {
    // A low battery is a warning; an unavailable one (often a dead one, shown with its own icon) or one due for
    // replacement is an alert.
    const kind = `${b.unavailable || b.due ? 'alert' : b.low ? 'warn' : 'ok'}${b.unavailable ? ' na' : ''}${b.due ? ' due' : ''}`;
    const value = b.unavailable ? this._t('unavailable') : b.level == null ? this._t('low') : `${b.level} %`;
    const since = b.below_since ? this._since(b.below_since, b.unavailable ? 'since_unavailable' : 'since') : null;
    const sub = [context, since].filter(Boolean).join(' · ');
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
  }

  // ── Full screen ──
  // Every battery over the whole screen, grouped by room or by battery type, with what to buy for the ones to
  // replace. Appended to the page's body so that no dashboard container clips it; closes with its button, Escape,
  // a click outside or the back button.
  _openPopup() {
    if (this._popup?.isConnected) return;
    if (this._popup) this._closePopup(true);
    const host = document.createElement('div');
    host.className = 'battery-monitor-popup';
    const root = host.attachShadow({ mode: 'open' });
    root.addEventListener('click', (ev) => this._onPopupClick(ev));
    this._onPopupKey = (ev) => {
      if (ev.key === 'Escape') this._closePopup();
    };
    this._onPopupBack = () => this._closePopup(true);
    document.addEventListener('keydown', this._onPopupKey);
    window.addEventListener?.('popstate', this._onPopupBack);
    window.history?.pushState?.({ batteryMonitorPopup: true }, '');
    this._bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.appendChild(host);
    this._popup = host;
    this._view ||= 'room';
    this._renderPopup();
  }

  // `fromBack`: the back button already left the history entry the popup added.
  _closePopup(fromBack = false) {
    if (!this._popup) return;
    const host = this._popup;
    this._popup = null;
    host.remove();
    document.removeEventListener('keydown', this._onPopupKey);
    window.removeEventListener?.('popstate', this._onPopupBack);
    document.body.style.overflow = this._bodyOverflow || '';
    if (!fromBack && window.history?.state?.batteryMonitorPopup) window.history.back();
  }

  _onPopupClick(ev) {
    const path = ev.composedPath();
    const el = path.find((n) => n.classList && (n.dataset?.id || n.dataset?.view || n.classList.contains('close') || n.classList.contains('notify')));
    if (!el) {
      if (!path.some((n) => n.classList?.contains?.('sheet'))) this._closePopup();
      return;
    }
    if (el.classList.contains('close')) this._closePopup();
    else if (el.classList.contains('notify')) this._notify();
    else if (el.dataset.view) {
      this._view = el.dataset.view;
      this._renderPopup();
    } else if (el.dataset.id) this._moreInfo(el.dataset.id);
  }

  // The batteries in groups: [{ key, name, icon, hint, items: [{ b, context }] }], by room or by type.
  _groups(view) {
    const map = new Map();
    for (const b of this._state.all) {
      const t = bmTypeOf(this._hass, this._config, b);
      const key = view === 'room' ? b.area || '' : t?.type || '';
      if (!map.has(key)) map.set(key, []);
      // By type, the group names the type: each battery tells its room and how many it takes.
      const count = t && t.type !== 'rechargeable' ? this._t(t.quantity > 1 ? 'cells' : 'cells_one', { n: t.quantity }) : '';
      map.get(key).push({ b, cells: t?.quantity || 1, context: view === 'room' ? this._typeLabel(t) : [b.area, count].filter(Boolean).join(' · ') });
    }
    const groups = [...map.entries()].map(([key, items]) => ({
      key,
      items,
      name: key
        ? view === 'type' && key === 'rechargeable'
          ? this._t('rechargeable')
          : key
        : this._t(view === 'room' ? 'no_area' : 'unknown_type'),
      icon: view === 'room' ? bmAreaIcon(this._hass, key) : key ? 'mdi:battery-outline' : 'mdi:battery-unknown',
      hint: view === 'type' && !key ? this._t('unknown_type_hint') : '',
      // By type, the batteries of that type in all (a remote with 2 AAA counts 2); by room, the devices.
      cells: view === 'type' && key && key !== 'rechargeable' ? items.reduce((n, x) => n + x.cells, 0) : null,
    }));
    // Rooms by name, types by how many batteries use them; the room-less and the unknown last.
    return groups.sort((a, b) => !a.key - !b.key || (view === 'type' ? b.items.length - a.items.length : 0) || a.name.localeCompare(b.name));
  }

  _groupCount(g) {
    if (g.cells != null) return this._t(g.cells > 1 ? 'cells' : 'cells_one', { n: g.cells });
    return g.items.length > 1 ? this._t('count', { n: g.items.length }) : this._t('count_one');
  }

  // What to buy: the types of the batteries needing attention, with how many of each.
  _toReplace() {
    const need = new Map();
    for (const b of this._state.all.filter((x) => x.low || x.unavailable)) {
      const t = bmTypeOf(this._hass, this._config, b);
      const key = t?.type || '';
      need.set(key, (need.get(key) || 0) + (t?.quantity || 1));
    }
    return [...need.entries()]
      .sort((a, b) => !a[0] - !b[0] || b[1] - a[1])
      .map(([type, n]) => `<span class="buy${type ? '' : ' unknown'}"><b>${n}×</b> ${bmEsc(type ? this._typeLabel({ type }, false) : this._t('unknown_type'))}</span>`)
      .join('');
  }

  _renderPopup() {
    const host = this._popup;
    if (!host || !this._state) return;
    const c = this._config;
    const s = this._state;
    const level = this._level();
    const counts = [
      s.low.length ? this._t(s.low.length > 1 ? 'low_many' : 'low_one', { n: s.low.length }) : '',
      s.unavailable.length ? this._t(s.unavailable.length > 1 ? 'unavailable_many' : 'unavailable_one', { n: s.unavailable.length }) : '',
    ].filter(Boolean);
    const status = this._status(true, counts, s.all);
    const view = this._view;
    const groups = this._groups(view)
      .map((g) => {
        const alerts = g.items.filter(({ b }) => b.low || b.unavailable).length;
        return `
        <section class="group${alerts ? ' attention' : ''}">
          <div class="ghead"><ha-icon icon="${g.icon}"></ha-icon><span class="gname">${bmEsc(g.name)}</span>
            ${alerts ? `<span class="gchip">${bmEsc(this._t('to_check', { n: alerts }))}</span>` : ''}
            <span class="gcount">${bmEsc(this._groupCount(g))}</span></div>
          ${g.hint ? `<div class="ghint">${bmEsc(g.hint)}</div>` : ''}
          <div class="glist">${g.items.map(({ b, context }) => this._row(b, context)).join('')}</div>
        </section>`;
      })
      .join('');
    const buy = this._toReplace();
    const tab = (v) =>
      `<button class="tab${view === v ? ' on' : ''}" data-view="${v}" aria-pressed="${view === v}">${bmEsc(this._t(v === 'room' ? 'by_room' : 'by_type'))}</button>`;
    const title = bmEsc(c.title || this._t('title'));
    host.shadowRoot.innerHTML = `
      <style>${BatteryMonitorCard.styles}${BatteryMonitorCard.popupStyles}</style>
      <div class="backdrop"><div class="sheet" role="dialog" aria-modal="true" aria-label="${title}">
        <ha-card class="popup lvl-${level}">
          <div class="head">
            <div class="badge"><ha-icon icon="${level === 'ok' ? 'mdi:battery-check-outline' : 'mdi:battery-alert-variant-outline'}"></ha-icon></div>
            <div class="title">${title}</div>
            ${this._notifyButton()}
            <div class="pill">${bmEsc(status)}</div>
            <button class="close" title="${bmEsc(this._t('popup_close'))}" aria-label="${bmEsc(this._t('popup_close'))}"><ha-icon icon="mdi:close"></ha-icon></button>
          </div>
          <div class="bar-top">
            <div class="tabs" role="group">${tab('room')}${tab('type')}</div>
            <div class="replace"><span class="rlabel"><ha-icon icon="mdi:cart-outline"></ha-icon>${bmEsc(this._t('to_replace'))}</span>${buy || `<span class="none">${bmEsc(this._t('nothing_to_replace'))}</span>`}</div>
          </div>
          <div class="groups">${groups}</div>
        </ha-card>
      </div></div>`;
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
      .badge { flex: none; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center;
               background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--c); }
      .badge ha-icon { --mdc-icon-size: 24px; }
      .title { flex: 1; min-width: 0; font-size: 16px; font-weight: 500; color: var(--primary-text-color);
               white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .pill { flex: none; font-size: 11px; font-weight: 500; padding: 1px 8px; border-radius: 999px;
              color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); }
      .notify { all: unset; cursor: pointer; flex: none; width: 26px; height: 26px; border-radius: 50%;
                display: grid; place-items: center; color: var(--secondary-text-color); }
      .notify:hover { background: color-mix(in srgb, var(--secondary-text-color) 14%, transparent); }
      .notify:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
      .notify ha-icon { --mdc-icon-size: 16px; }
      .full { all: unset; cursor: pointer; flex: none; width: 24px; height: 24px; margin: -4px -4px -4px 0; border-radius: 50%;
              display: grid; place-items: center; color: var(--secondary-text-color); }
      .full:hover { background: color-mix(in srgb, var(--secondary-text-color) 14%, transparent); color: var(--primary-text-color); }
      .full:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
      .full ha-icon { --mdc-icon-size: 16px; }

      .list { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); gap: 6px; margin-top: 8px; }
      .row { --t: var(--bm-ok); all: unset; box-sizing: border-box; cursor: pointer; min-width: 0;
             display: flex; align-items: center; gap: 8px; padding: 5px 10px 5px 5px; border-radius: 10px;
             background: var(--secondary-background-color, rgba(127,127,127,.08)); }
      .row.warn  { --t: var(--bm-warn); }
      .row.alert { --t: var(--bm-alert); }
      .row.na .lvl { font-weight: 400; }
      /* Only the rows needing attention are tinted; an OK row keeps the neutral tile, its colour on the icon and the bar */
      .row.warn, .row.alert { background: color-mix(in srgb, var(--t) 12%, var(--secondary-background-color, transparent)); }
      .row.ok:hover { background: color-mix(in srgb, var(--secondary-text-color) 10%, var(--secondary-background-color, transparent)); }
      .row.warn:hover, .row.alert:hover { background: color-mix(in srgb, var(--t) 18%, var(--secondary-background-color, transparent)); }
      .row:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
      .ic { flex: none; width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center;
            color: var(--t); background: color-mix(in srgb, var(--t) 18%, transparent); }
      .ic ha-icon { --mdc-icon-size: 16px; }
      .row.due .ic { animation: bm-blink 1.5s ease-in-out infinite; }
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
      @media (prefers-reduced-motion: reduce) { .row.due .ic { animation: none; } }
    `;
  }

  // The full screen layer: opaque over translucent themes, one column on a phone, groups in balanced columns wider.
  static get popupStyles() {
    return `
      :host { all: initial; display: block; font-family: var(--paper-font-body1_-_font-family, var(--ha-font-family-body, Roboto, sans-serif));
              color: var(--primary-text-color); -webkit-font-smoothing: antialiased; }
      .backdrop { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,.6);
                  -webkit-backdrop-filter: blur(24px); backdrop-filter: blur(24px); animation: bm-fade .2s ease-out both; }
      .sheet { position: absolute; inset: 0; overflow-y: auto; overscroll-behavior: contain; animation: bm-sheet .28s cubic-bezier(.2,.8,.2,1) both;
               background: linear-gradient(var(--card-background-color, #fff), var(--card-background-color, #fff)), var(--primary-background-color, #fafafa); }
      ha-card.popup { --ha-card-border-radius: 0; --ha-card-box-shadow: none; border-radius: 0; box-shadow: none; background: transparent; border: none;
                      min-height: 100%; box-sizing: border-box; max-width: 1800px; margin: 0 auto; overflow: visible;
                      padding: 0 max(16px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left)); }
      .popup .head { position: sticky; top: 0; z-index: 2; padding: max(10px, env(safe-area-inset-top)) 0 10px;
                     background: linear-gradient(var(--card-background-color, #fff), var(--card-background-color, #fff)), var(--primary-background-color, #fafafa); }
      .popup .title { font-size: 18px; }
      .close { all: unset; cursor: pointer; flex: none; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center;
               background: var(--secondary-background-color, rgba(128,128,128,.12)); color: var(--primary-text-color); }
      .close:hover { background: color-mix(in srgb, var(--primary-text-color) 14%, transparent); }
      .close:focus-visible, .tab:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }

      .bar-top { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 20px; margin: 6px 0 16px; }
      .tabs { display: inline-flex; gap: 4px; padding: 3px; border-radius: 12px; background: var(--secondary-background-color, rgba(128,128,128,.1)); }
      .tab { all: unset; cursor: pointer; padding: 6px 14px; border-radius: 9px; font-size: 13px; font-weight: 500; color: var(--secondary-text-color); }
      .tab.on { background: var(--card-background-color, #fff); color: var(--primary-text-color); box-shadow: 0 1px 3px rgba(0,0,0,.15); }
      .replace { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 12px; color: var(--secondary-text-color); }
      .rlabel { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; text-transform: uppercase;
                letter-spacing: .04em; color: var(--secondary-text-color); }
      .rlabel ha-icon { --mdc-icon-size: 16px; }
      .buy { padding: 2px 9px; border-radius: 999px; color: var(--primary-text-color);
             background: color-mix(in srgb, var(--bm-warn) 16%, transparent); }
      .buy b { color: var(--bm-warn); }
      .buy.unknown { background: color-mix(in srgb, var(--bm-na) 18%, transparent); }
      .buy.unknown b { color: var(--secondary-text-color); }
      .none { color: var(--bm-ok); font-weight: 500; }

      .groups { display: flex; flex-direction: column; gap: 18px; }
      .group { display: flex; flex-direction: column; gap: 6px; }
      .ghead { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; color: var(--primary-text-color); }
      .ghead ha-icon { --mdc-icon-size: 18px; color: var(--secondary-text-color); }
      .gname { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .gchip { font-size: 11px; padding: 1px 8px; border-radius: 999px; color: var(--bm-warn);
               background: color-mix(in srgb, var(--bm-warn) 14%, transparent); }
      .gcount { font-size: 11px; font-weight: 400; color: var(--secondary-text-color); }
      .ghint { font-size: 11px; color: var(--secondary-text-color); margin-top: -2px; }
      .glist { display: grid; gap: 6px; }
      @media (min-width: 760px) {
        ha-card.popup { padding-left: max(24px, env(safe-area-inset-left)); padding-right: max(24px, env(safe-area-inset-right)); }
        .groups { display: block; columns: 2 320px; column-gap: 28px; }
        .group { break-inside: avoid; margin-bottom: 20px; }
      }
      @media (min-width: 1200px) { .groups { columns: 3 320px; } }
      @media (min-width: 1600px) { .groups { columns: 4 320px; } }
      @keyframes bm-fade { from { opacity: 0 } to { opacity: 1 } }
      @keyframes bm-sheet { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: none } }
      @media (prefers-reduced-motion: reduce) { .backdrop, .sheet { animation: none !important; } }
    `;
  }
}

// ── Editor ───────────────────────────────────────────────────────────────────
const BM_HELPERS = ['entity', 'title', 'only_low', 'hide_when_ok', 'notify_button', 'popup', 'language', 'battery_models', 'battery_types'];

// A map of the editor (battery types by battery or by model) without its empty entries, or undefined when empty.
const bmCleanMap = (map) => {
  const out = Object.fromEntries(Object.entries(map || {}).filter(([, v]) => v && String(v).trim()));
  return Object.keys(out).length ? out : undefined;
};

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
    if (!this._form) {
      this._form = document.createElement('ha-form');
      // The language is read at each call: changing the language option translates the labels at once.
      const t = (key) => bmT(bmLang(this._hass, this._config), key);
      // Inside "Battery types", each field is a battery: labelled with its name and room.
      this._form.computeLabel = (s) => this._labels?.[s.name] ?? t(`ed_${s.name}`);
      this._form.computeHelper = (s) => (BM_HELPERS.includes(s.name) ? t(`ed_${s.name}_helper`) : undefined);
      this._form.addEventListener('value-changed', (ev) => {
        const config = { ...ev.detail.value };
        // Options left at their default are not written to the YAML.
        for (const k of Object.keys(config)) {
          if (config[k] === '' || config[k] == null || BM_DEFAULTS[k] === config[k]) delete config[k];
        }
        for (const key of ['battery_models', 'battery_types']) {
          const map = bmCleanMap(config[key]);
          if (map) config[key] = map;
          else delete config[key];
        }
        this.dispatchEvent(new CustomEvent('config-changed', { detail: { config }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    const c = this._config;
    this._form.data = {
      ...BM_DEFAULTS,
      ...c,
      battery_models: { ...(c.battery_models || {}) },
      battery_types: { ...(c.battery_types || {}) },
    };
    const lang = bmLang(this._hass, c);
    const entity = c.entity || bmPick(this._hass, bmCandidates(this._hass.entities));
    const all = this._hass.states?.[entity]?.attributes.batteries || [];
    // By model: the models of the batteries whose type is not detected (and the ones already set), with their
    // manufacturer and how many devices; by battery: the ones left without a type, and the ones already set.
    const undetected = all.filter((b) => !bmDetectedType(this._hass, b));
    const models = new Map();
    for (const b of all) {
      const model = bmModelOf(this._hass, b);
      if (!model || (!c.battery_models?.[model] && !undetected.includes(b))) continue;
      const m = models.get(model) || { n: 0, maker: this._hass.devices?.[b.device_id]?.manufacturer || '' };
      m.n += 1;
      models.set(model, m);
    }
    const batteries = all.filter(
      (b) => c.battery_types?.[b.entity_id] || (undetected.includes(b) && !c.battery_models?.[bmModelOf(this._hass, b)]),
    );
    this._labels = {
      ...Object.fromEntries(
        [...models].map(([model, m]) => [
          model,
          [model, m.maker, bmT(lang, m.n > 1 ? 'devices_n' : 'devices_one', { n: m.n })].filter(Boolean).join(' · '),
        ]),
      ),
      ...Object.fromEntries(batteries.map((b) => [b.entity_id, b.area ? `${b.name} · ${b.area}` : b.name])),
    };
    const typeOptions = BM_TYPES.map((v) => ({ value: v, label: v === 'rechargeable' ? bmT(lang, 'rechargeable') : v }));
    this._form.schema = [
      { name: 'entity', selector: { entity: { filter: { integration: 'battery_monitor', domain: 'sensor' } } } },
      { name: 'title', selector: { text: {} } },
      { name: 'columns', selector: { number: { min: 1, max: 3, mode: 'box' } } },
      { name: 'only_low', selector: { boolean: {} } },
      { name: 'hide_when_ok', selector: { boolean: {} } },
      { name: 'notify_button', selector: { boolean: {} } },
      { name: 'popup', selector: { boolean: {} } },
      {
        name: 'language',
        selector: {
          select: {
            mode: 'dropdown',
            options: [
              { value: 'en', label: 'English' },
              { value: 'fr', label: 'Français' },
            ],
          },
        },
      },
      ...bmTypeSection('battery_models', 'mdi:devices', [...models.keys()].sort(), typeOptions, lang),
      ...bmTypeSection('battery_types', 'mdi:battery-outline', batteries.map((b) => b.entity_id), typeOptions, lang),
    ];
  }
}

// A folded editor section with a type field for each of `names` (models or battery entities), none when empty.
function bmTypeSection(name, icon, names, options, lang) {
  if (!names.length) return [];
  const selector = { select: { mode: 'dropdown', custom_value: true, options } };
  return [{ name, type: 'expandable', title: bmT(lang, `ed_${name}`), icon, schema: names.map((n) => ({ name: n, selector })) }];
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
