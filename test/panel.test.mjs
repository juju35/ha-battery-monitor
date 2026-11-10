// Unit tests for the sidebar panel: the panel file is evaluated with stubs, no browser needed.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(
  new URL('../custom_components/battery_monitor/frontend/battery-monitor-panel.js', import.meta.url),
  'utf8',
);
// attachShadow returns a root without elements: rendering is skipped (see _renderSettings)
const shadow = { getElementById: () => null, querySelector: () => null };
const context = {
  HTMLElement: class {
    attachShadow() {
      this.shadowRoot = shadow;
      return shadow;
    }
  },
  customElements: { get: () => true, define() {} },
  CSS: { escape: (s) => String(s) },
  console: { ...console, error() {} },
  // Timers recorded, not run: the retry test calls them itself
  setTimeout: (fn, ms) => timers.push({ fn, ms }),
  clearTimeout() {},
};
const timers = [];
vm.createContext(context);
vm.runInContext(
  `${source}\nthis.panel = { BatteryMonitorPanel, BatteryMonitorPanelI18n, BM_PANEL_LIMITS, BM_PANEL_TABS, bmPanelT, bmPanelEsc, bmPanelTone, bmPanelClock, bmPanelSameList };`,
  context,
);
const { BatteryMonitorPanel, BatteryMonitorPanelI18n, BM_PANEL_LIMITS, BM_PANEL_TABS, bmPanelT, bmPanelEsc, bmPanelTone, bmPanelClock, bmPanelSameList } =
  context.panel;

const LANGUAGES = [
  'bg', 'cs', 'da', 'de', 'el', 'en', 'es', 'fr', 'hu', 'it', 'lv', 'nl', 'pl', 'pt', 'ro', 'ru', 'sk', 'sl', 'sr', 'sr-Latn', 'sv', 'uk',
];
// Objects made inside the vm realm have another Object prototype: compare them as plain data
const plain = (x) => JSON.parse(JSON.stringify(x));
const placeholders = (s) => [...String(s).matchAll(/\{\w+\}/g)].map((m) => m[0]).sort();

test('panel i18n parity: every language has exactly the English keys and placeholders, and no empty text', () => {
  const en = BatteryMonitorPanelI18n.en;
  assert.deepEqual(Object.keys(BatteryMonitorPanelI18n).sort(), LANGUAGES);
  for (const lang of LANGUAGES) {
    const strings = BatteryMonitorPanelI18n[lang];
    assert.deepEqual(Object.keys(strings).sort(), Object.keys(en).sort(), `keys of ${lang}`);
    for (const key of Object.keys(en)) {
      assert.ok(strings[key], `${lang}.${key} is empty`);
      assert.deepEqual(placeholders(strings[key]), placeholders(en[key]), `placeholders of ${lang}.${key}`);
    }
  }
});

test('bmPanelT fills placeholders and falls back to English', () => {
  assert.equal(bmPanelT('fr', 'f_threshold_hint', { min: 1, max: 99 }), 'Une batterie est faible sous ce niveau, 1–99 %');
  assert.equal(bmPanelT('ja', 'save'), 'Save');
  assert.equal(bmPanelT('en', 'nope'), 'nope');
});

test('panel i18n Serbian: the Latin table is the Cyrillic one letter for letter, each in its own script', () => {
  const cyr = 'абвгдђежзијклљмнњопрстћуфхцчџш';
  const lat = ['a', 'b', 'v', 'g', 'd', 'đ', 'e', 'ž', 'z', 'i', 'j', 'k', 'l', 'lj', 'm', 'n', 'nj', 'o', 'p', 'r', 's', 't', 'ć', 'u', 'f', 'h', 'c', 'č', 'dž', 'š'];
  const map = new Map();
  [...cyr].forEach((c, i) => {
    map.set(c, lat[i]);
    map.set(c.toUpperCase(), lat[i][0].toUpperCase() + lat[i].slice(1));
  });
  for (const [key, text] of Object.entries(BatteryMonitorPanelI18n.sr)) {
    assert.equal([...text].map((c) => map.get(c) ?? c).join(''), BatteryMonitorPanelI18n['sr-Latn'][key], key);
    assert.ok(!/[a-zA-Z]/.test(text.replace(/Battery Monitor|Home Assistant|CSV|battery_monitor|\.csv|\{\w+\}/g, '')), `${key} in Cyrillic`);
  }
});

test('the panel keeps a full code that has a table (sr-Latn), else its base, else English', () => {
  const panel = Object.create(BatteryMonitorPanel.prototype);
  const lang = (language) => {
    panel._hass = { language };
    return panel._lang();
  };
  assert.equal(lang('fr-FR'), 'fr');
  assert.equal(lang('sr-Latn'), 'sr-Latn');
  assert.equal(lang('sr'), 'sr');
  assert.equal(panel._t('save'), 'Сачувај');
  lang('sr-Latn');
  assert.equal(panel._t('save'), 'Sačuvaj');
  assert.equal(lang('pt-BR'), 'pt');
  lang('ja');
  assert.equal(panel._t('save'), 'Save');
});

test('bmPanelEsc escapes HTML, bmPanelTone colours the entry state, bmPanelClock keeps HH:MM', () => {
  assert.equal(bmPanelEsc(`<a href="x">it's & co</a>`), '&#60;a href=&#34;x&#34;&#62;it&#39;s &#38; co&#60;/a&#62;');
  assert.equal(bmPanelEsc(null), '');
  assert.equal(bmPanelTone('loaded'), 'good');
  assert.equal(bmPanelTone('setup_retry'), 'warn');
  assert.equal(bmPanelTone('not_loaded'), 'warn');
  assert.equal(bmPanelTone('setup_error'), 'bad');
  assert.equal(bmPanelClock('09:00:00'), '09:00');
  assert.equal(bmPanelClock('08:30'), '08:30');
  assert.equal(bmPanelClock(undefined), '');
  assert.ok(bmPanelSameList(['b', 'a'], ['a', 'b']));
  assert.ok(!bmPanelSameList(['a'], ['a', 'b']));
  assert.ok(bmPanelSameList(undefined, []));
});

const options = {
  threshold: 20,
  duration: 24,
  morning_time: '09:00:00',
  evening_time: '19:00:00',
  notify_services: ['notify.phone'],
  ignored_entities: [],
  ignored_integrations: ['mobile_app'],
};

function panelWith(settings) {
  const panel = new BatteryMonitorPanel();
  panel._hass = { language: 'en' };
  panel._settings = settings;
  return panel;
}

test('the form shows the stored values, the typed ones over them; Save only once something valid changed', () => {
  const panel = panelWith({ entry: { state: 'loaded' }, options });
  assert.deepEqual(plain(panel._draft()), options);
  assert.ok(!panel._changed());
  assert.ok(panel._valid());
  // The same time in HH:MM is not a change
  panel._edit('morning_time', '09:00');
  assert.ok(!panel._changed());
  panel._edit('threshold', '20');
  assert.ok(!panel._changed());
  // Lists compare as sets
  panel._edit('notify_services', ['notify.phone']);
  assert.ok(!panel._changed());
  panel._edit('threshold', '15');
  assert.ok(panel._changed());
  assert.ok(panel._valid());
  // Out of range, blank or fractional: not valid, so no Save
  for (const bad of ['0', '100', '', '12.5']) {
    panel._edit('threshold', bad);
    assert.ok(!panel._valid(), `threshold ${JSON.stringify(bad)}`);
  }
  panel._edit('threshold', '15');
  panel._edit('duration', '721');
  assert.ok(!panel._valid());
  panel._edit('duration', '0');
  assert.ok(panel._valid());
  // A stored value changed elsewhere shows through for the fields not edited
  panel._settings.options = { ...options, evening_time: '20:00:00' };
  assert.equal(panel._draft().evening_time, '20:00:00');
  assert.equal(panel._draft().threshold, '15');
});

test('the limits of the settings command replace the built-in ones', () => {
  const panel = panelWith({ entry: null, options });
  panel._hass.callWS = async () => ({ entry: null, options, limits: { threshold: [5, 95], duration: [0, 100] } });
  return panel._load().then(() => {
    assert.deepEqual(plain(BM_PANEL_LIMITS), { threshold: [5, 95], duration: [0, 100] });
    panel._edit('threshold', '3');
    assert.ok(!panel._valid());
    BM_PANEL_LIMITS.threshold = [1, 99];
    BM_PANEL_LIMITS.duration = [0, 720];
  });
});

test('list choices: notify actions without their prefix, integrations by name, batteries of ignored integrations left out', () => {
  const panel = panelWith({
    entry: { state: 'loaded' },
    options,
    notify_options: ['notify.phone', 'notify.tv'],
    integration_options: [{ value: 'zha', label: 'Zigbee Home Automation' }, { value: 'mobile_app', label: 'Mobile App' }],
    entity_options: [
      { value: 'sensor.door_battery', label: 'Door', area: 'Kitchen', integration: 'zha' },
      { value: 'sensor.phone_battery', label: 'Phone', area: null, integration: 'mobile_app' },
    ],
  });
  assert.deepEqual(plain(panel._choices('notify_services')), [
    { value: 'notify.phone', label: 'phone' },
    { value: 'notify.tv', label: 'tv' },
  ]);
  assert.deepEqual(plain(panel._choices('ignored_integrations')[0]), { value: 'zha', label: 'Zigbee Home Automation', detail: 'zha' });
  // The phone's integration is ignored: the phone is not offered one by one
  assert.deepEqual(plain(panel._choices('ignored_entities')), [
    { value: 'sensor.door_battery', label: 'Door', detail: 'Kitchen · zha' },
  ]);
  panel._edit('ignored_integrations', []);
  assert.equal(panel._choices('ignored_entities').length, 2);
  // A chosen value no longer offered keeps its name in the chips, and the select offers the rest
  panel._edit('notify_services', ['notify.gone', 'notify.phone']);
  const html = panel._chips('notify_services', 'f_notify', 'f_notify_hint');
  assert.match(html, /data-remove="notify.gone"/);
  assert.match(html, /<option value="notify.tv">tv<\/option>/);
  assert.doesNotMatch(html, /<option value="notify.phone">/);
});

test('the Batteries tab mounts the card expanded, without its CSV export', () => {
  const panel = new BatteryMonitorPanel();
  panel._hass = { language: 'en' };
  let config;
  const created = { setConfig: (c) => (config = c), set hass(_h) {} };
  context.document = { createElement: () => created };
  panel._mountCard();
  context.document = undefined;
  assert.deepEqual(plain(config), { expanded: true, csv_button: false });
  assert.equal(panel._card, created);
});

test('tabs: the address picks the tab, a selection updates the address and hides the other panels', () => {
  const panels = Object.fromEntries(BM_PANEL_TABS.map((t) => [`tab-${t}`, { hidden: false }]));
  const buttons = BM_PANEL_TABS.map((t) => ({
    dataset: { tab: t },
    attrs: {},
    classes: new Set(),
    classList: { toggle(c, on) { on ? this.add(c) : this.delete(c); }, add(c) { buttons.find((b) => b.classList === this).classes.add(c); }, delete(c) { buttons.find((b) => b.classList === this).classes.delete(c); } },
    setAttribute(k, v) { this.attrs[k] = v; },
    focus() { this.focused = true; },
  }));
  const root = { getElementById: (id) => panels[id] || null, querySelector: () => null, querySelectorAll: (sel) => (sel === '.tab' ? buttons : []) };
  const urls = [];
  context.history = { state: null, replaceState: (_s, _t, url) => urls.push(url) };
  const panel = Object.create(BatteryMonitorPanel.prototype);
  panel.shadowRoot = root;
  panel._tab = 'batteries';
  panel._panel = { url_path: 'battery-monitor' };
  // The route from Home Assistant: /battery-monitor/actions
  panel.route = { path: '/actions' };
  assert.equal(panel._tab, 'actions');
  // Batteries, Actions, Settings: Settings last
  assert.deepEqual(plain(BM_PANEL_TABS), ['batteries', 'actions', 'settings']);
  assert.deepEqual(plain(BM_PANEL_TABS.map((t) => panels[`tab-${t}`].hidden)), [true, false, true]);
  // An unknown path: Batteries
  panel.route = { path: '/nope' };
  assert.equal(panel._tab, 'batteries');
  // A click: the address follows, Batteries is the base address
  panel._goTab('settings', true);
  assert.equal(panel._tab, 'settings');
  assert.deepEqual(plain(urls), ['/battery-monitor/settings']);
  assert.deepEqual(plain(buttons.map((b) => b.attrs['aria-selected'])), ['false', 'false', 'true']);
  assert.deepEqual(plain(buttons.map((b) => b.classes.has('active'))), [false, false, true]);
  assert.deepEqual(plain(buttons.map((b) => b.tabIndex)), [-1, -1, 0]);
  assert.ok(buttons[2].focused);
  panel._goTab('batteries');
  assert.equal(urls.at(-1), '/battery-monitor');
  // An unknown tab is ignored
  panel._goTab('nope');
  assert.equal(panel._tab, 'batteries');
  delete context.history;
});

test('the settings form and the actions escape what they show and reflect the entry state', () => {
  const panel = panelWith({
    entry: { state: 'setup_retry', device_id: 'dev"1', last_notification: null, last_notified: null },
    options: { ...options, notify_services: ['notify.<b>'] },
    notify_options: [],
    integration_options: [],
    entity_options: [],
  });
  const form = panel._settingsHtml();
  assert.match(form, /notify\.&#60;b&#62;/);
  assert.doesNotMatch(form, /<b>/);
  assert.match(form, /data-do="save" disabled/);
  const actions = panel._actionsHtml();
  assert.match(actions, /class="pill warn">Retrying</);
  assert.match(actions, /Never yet/);
  // Not running: Notify now and Export are disabled, the device link is escaped
  assert.match(actions, /data-do="notify" disabled/);
  assert.match(actions, /data-do="export" disabled/);
  assert.match(actions, /\/config\/devices\/device\/dev&#34;1/);
  panel._settings.entry = { state: 'loaded', device_id: 'dev1', last_notification: '2026-11-08T08:00:00+00:00', last_notified: 2 };
  const running = panel._actionsHtml();
  assert.match(running, /class="pill good">Running</);
  assert.match(running, /to check: 2/);
  assert.doesNotMatch(running, /data-do="notify" disabled/);
});

test('an unknown error key shows the message sent by the server, a known one its translation', () => {
  const panel = panelWith({ entry: { state: 'loaded' }, options });
  assert.deepEqual(plain(panel._error({ error: 'path_hidden' })), { tone: 'bad', text: 'Path in a hidden folder' });
  assert.deepEqual(plain(panel._error({ error: 'weird', message: 'disk full' })), { tone: 'bad', text: 'disk full' });
  assert.deepEqual(plain(panel._error(undefined)), { tone: 'bad', text: 'Something went wrong' });
});

test('Save sends every option normalised, then drops the drafts; the server options take over', async () => {
  const panel = panelWith({ entry: { state: 'loaded' }, options, notify_options: [], integration_options: [], entity_options: [] });
  let sent;
  panel._hass.callWS = async (msg) => {
    sent = msg;
    return { ok: true, options: { ...options, threshold: 15, morning_time: '08:30:00' } };
  };
  panel._edit('threshold', '15');
  panel._edit('morning_time', '08:30');
  await panel._save();
  assert.deepEqual(plain(sent), {
    type: 'battery_monitor/update_settings',
    threshold: 15,
    duration: 24,
    morning_time: '08:30',
    evening_time: '19:00',
    notify_services: ['notify.phone'],
    ignored_integrations: ['mobile_app'],
    ignored_entities: [],
  });
  assert.deepEqual(plain(panel._drafts), {});
  assert.equal(panel._settings.options.threshold, 15);
  assert.deepEqual(plain(panel._status.save), { tone: 'good', text: 'Saved' });
  assert.equal(panel._busy, null);
});

test('Notify now and Export report their outcome, an error as such', async () => {
  const panel = panelWith({ entry: { state: 'loaded' }, options, notify_options: [], integration_options: [], entity_options: [] });
  const answers = [{ ok: true, notified: 0 }, { entry: { state: 'loaded' }, options }, { ok: true, path: '/config/a.csv', batteries: 3 }, { ok: false, error: 'path_not_csv' }];
  const sent = [];
  panel._hass.callWS = async (msg) => {
    sent.push(msg);
    return answers.shift();
  };
  await panel._notify();
  assert.deepEqual(plain(panel._status.action), { tone: 'good', text: 'Notification sent: no battery to check' });
  assert.equal(sent[1].type, 'battery_monitor/settings');
  panel._exportPath = ' exports/a.csv ';
  await panel._export();
  assert.deepEqual(plain(sent[2]), { type: 'battery_monitor/export', path: 'exports/a.csv' });
  assert.deepEqual(plain(panel._status.action), { tone: 'good', text: 'CSV written to /config/a.csv · batteries: 3' });
  panel._exportPath = '';
  await panel._export();
  assert.deepEqual(plain(sent[3]), { type: 'battery_monitor/export' });
  assert.deepEqual(plain(panel._status.action), { tone: 'bad', text: 'Not a .csv file' });
});

test('a settings command that fails keeps the page usable', async () => {
  const panel = panelWith(null);
  const errors = [];
  context.console = { error: (...args) => errors.push(args) };
  panel._hass.callWS = async () => {
    throw new Error('offline');
  };
  await panel._load();
  // No stand-in settings (they read as "Battery Monitor isn't set up"): the error, shown with a Retry button.
  assert.equal(panel._settings, null);
  assert.equal(panel._loadError, 'offline');
  assert.equal(errors.length, 1);
  context.console = console;
});

test('a failed load is tried again after 2 s, 5 s, 15 s then every 30 s, and when the connection is back', async () => {
  timers.length = 0;
  const panel = Object.create(BatteryMonitorPanel.prototype);
  panel._renderSettings = () => {};
  let fail = true;
  panel._hass = { callWS: async () => { if (fail) throw new Error('unknown_command'); return { options: {}, limits: {} }; } };
  panel._settings = null;
  for (let i = 0; i < 5; i++) await panel._load();
  assert.deepEqual(timers.map((t) => t.ms), [2000, 5000, 15000, 30000, 30000]);
  assert.equal(panel._failed, true);
  // Never loaded: no stand-in "not set up" settings, the error for the Retry note.
  assert.equal(panel._settings, null);
  assert.equal(panel._loadError, 'unknown_command');
  // A retry while the panel is gone does nothing; back on it, connectedCallback loads again
  let loads = 0;
  panel._load = async () => { loads++; };
  panel.isConnected = false;
  timers[0].fn();
  assert.equal(loads, 0);
  panel.isConnected = true;
  timers[0].fn();
  assert.equal(loads, 1);
  delete panel._load;
  fail = false;
  await panel._load();
  assert.equal(panel._failed, false);
  assert.equal(panel._retries, 0);
  assert.equal(panel._loadError, null);
  // Loaded once, a later failure keeps what was shown.
  fail = true;
  await panel._load();
  assert.deepEqual(plain(panel._settings), { options: {}, limits: {} });
  assert.equal(panel._loadError, null);
  fail = false;
  await panel._load();
  // The connection back: one listener, removed when the panel goes
  const listeners = new Map();
  panel._hass.connection = { addEventListener: (t, f) => listeners.set(t, f), removeEventListener: (t, f) => listeners.get(t) === f && listeners.delete(t) };
  panel._watchConnection(true);
  panel._load = async () => { loads++; };
  listeners.get('ready')();
  assert.equal(loads, 2);
  panel._watchConnection(false);
  assert.equal(listeners.size, 0);
});
