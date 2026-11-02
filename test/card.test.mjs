// Unit tests for the card: the card file is evaluated with stubs, no browser needed.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(
  new URL('../custom_components/battery_monitor/frontend/battery-monitor-card.js', import.meta.url),
  'utf8',
);
// A page body, keyboard listeners and history: enough for the full screen layer.
const fakeNode = () => ({
  innerHTML: '',
  style: {
    setProperty(name, value) {
      this[name] = value;
    },
  },
  children: [],
  handlers: {},
  addEventListener(type, fn) {
    this.handlers[type] = fn;
  },
  // An ha-form stand-in: what the user changes in the editor.
  dispatch(value) {
    this.handlers['value-changed']({ detail: { value } });
  },
  attachShadow() {
    this.shadowRoot = fakeRoot();
    return this.shadowRoot;
  },
});
// A shadow root whose buttons can take the focus, like the browser's: the markup is not parsed beyond its <button>
// tags; each one is found by its data-id, its data-view or its first class. Writing the markup replaces the elements,
// which loses the focus.
const buttonKey = (tag) => {
  const attr = (name) => new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1];
  if (attr('data-id')) return `[data-id="${attr('data-id')}"]`;
  if (attr('data-view')) return `[data-view="${attr('data-view')}"]`;
  return `.${attr('class').split(' ')[0]}`;
};
function fakeRoot() {
  let markup = '';
  let elements = new Map();
  const element = (key, tag) => {
    if (!elements.has(key)) {
      elements.set(key, {
        key,
        tag,
        isConnected: true,
        disabled: / disabled[ >]/.test(tag),
        dataset: { id: /data-id="([^"]*)"/.exec(tag)?.[1], view: /data-view="([^"]*)"/.exec(tag)?.[1] },
        classList: /class="([^"]*)"/.exec(tag)[1].split(' '),
        addEventListener() {},
        // The options of the last call, to tell a focus that scrolls the page from one that does not.
        focus(options) {
          root.activeElement = this;
          this.focusOptions = options;
        },
      });
    }
    return elements.get(key);
  };
  const buttons = () => [...markup.matchAll(/<button\b[^>]*>/g)].map((m) => element(buttonKey(m[0]), m[0]));
  const root = {
    activeElement: null,
    get innerHTML() {
      return markup;
    },
    set innerHTML(value) {
      for (const el of elements.values()) el.isConnected = false;
      markup = value;
      elements = new Map();
      root.activeElement = null;
    },
    addEventListener() {},
    querySelector(selector) {
      return buttons().find((b) => b.key === selector) ?? null;
    },
    querySelectorAll(selector) {
      const all = buttons();
      if (selector === 'button:not([disabled])') return all.filter((b) => !b.disabled);
      return selector === 'button' ? all : all.filter((b) => b.key === selector);
    },
  };
  return root;
}
// Timers run by hand: `timers.run()` fires the pending ones.
const timers = {
  pending: new Map(),
  next: 1,
  run() {
    const due = [...this.pending.values()];
    this.pending.clear();
    for (const fn of due) fn();
  },
};
const body = {
  ...fakeNode(),
  appendChild(el) {
    this.children.push(el);
    el.isConnected = true;
    el.remove = () => this.removeChild(el);
  },
  // Like the browser: removing a node that is not a child throws.
  removeChild(el) {
    if (!this.children.includes(el)) throw new Error('NotFoundError');
    this.children = this.children.filter((x) => x !== el);
    el.isConnected = false;
  },
};
const listeners = {};
// A history stack whose back() fires popstate, like the browser (synchronously here).
const windowListeners = {};
// Each entry keeps its URL: pushState without one stays on the current page, like the browser.
const history = {
  entries: [null],
  urls: ['http://ha.local/lovelace/0'],
  index: 0,
  get state() {
    return this.entries[this.index];
  },
  pushState(state, _title, url) {
    const href = url ? new URL(url, this.urls[this.index]).href : this.urls[this.index];
    this.entries.splice(this.index + 1);
    this.urls.splice(this.index + 1);
    this.entries.push(state);
    this.urls.push(href);
    this.index++;
  },
  replaceState(state) {
    this.entries[this.index] = state;
  },
  back() {
    if (!this.index) return;
    this.index--;
    windowListeners.popstate?.({ state: this.state });
  },
};
const context = {
  HTMLElement: class {},
  customElements: { get: () => true, define() {} },
  window: {
    history,
    location: {
      get href() {
        return history.urls[history.index];
      },
    },
    addEventListener: (type, fn) => (windowListeners[type] = fn),
    removeEventListener: (type) => delete windowListeners[type],
  },
  document: {
    body,
    createElement: () => fakeNode(),
    addEventListener: (type, fn) => (listeners[type] = fn),
    removeEventListener: (type) => delete listeners[type],
  },
  Event: class {
    constructor(type) {
      this.type = type;
    }
  },
  CustomEvent: class {
    constructor(type, init) {
      this.type = type;
      this.detail = init?.detail;
    }
  },
  console,
  Date,
  setTimeout: (fn) => {
    const id = timers.next++;
    timers.pending.set(id, fn);
    return id;
  },
  clearTimeout: (id) => timers.pending.delete(id),
};
vm.createContext(context);
vm.runInContext(
  `${source}\nthis.bm = { BatteryMonitorCard, BatteryMonitorCardEditor, BM_I18N, bmEsc, bmLang, bmParseType, bmTypeOf };`,
  context,
);
const { BatteryMonitorCard, BatteryMonitorCardEditor, BM_I18N, bmEsc, bmLang, bmParseType, bmTypeOf } = context.bm;

const SENSOR = 'sensor.battery_monitor_low_batteries';
const BUTTON = 'button.battery_monitor_notify_now';
const BATTERIES = [
  { entity_id: 'sensor.door_battery', name: 'Door', level: 12, low: true, icon: 'mdi:battery-10' },
  { entity_id: 'sensor.remote_battery', name: 'Remote', level: 8, low: true, icon: 'mdi:battery-10' },
  { entity_id: 'sensor.smoke_battery', name: 'Smoke', level: 5, low: true, due: true, icon: 'mdi:battery-10' },
  { entity_id: 'sensor.leak_battery', name: 'Leak', level: null, unavailable: true, icon: 'mdi:battery-alert' },
  { entity_id: 'sensor.lamp_battery', name: 'Lamp', level: 90, low: false, icon: 'mdi:battery' },
];
const registry = () => ({
  [SENSOR]: { platform: 'battery_monitor', device_id: 'dev1' },
  'sensor.battery_monitor_other': { platform: 'battery_monitor', device_id: 'dev1' },
  [BUTTON]: { platform: 'battery_monitor', device_id: 'dev1' },
  'sensor.door_battery': { platform: 'zha', device_id: 'dev2' },
});
const realState = { state: '3', attributes: { batteries: BATTERIES } };
const restoredState = { state: 'unavailable', attributes: { restored: true } };

function makeCard(config = {}) {
  const card = new BatteryMonitorCard();
  card.style = {};
  card.dispatchEvent = () => {};
  card.attachShadow = () => {
    card.shadowRoot = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
    return card.shadowRoot;
  };
  card.setConfig(config);
  return card;
}
const hassWith = (entities, states) => ({ entities, states, language: 'en', locale: { language: 'en' } });
const html = (card) => card.shadowRoot.innerHTML;
const notSetUp = BM_I18N.en.not_loaded;

test('bmEsc escapes HTML', () => {
  assert.equal(bmEsc('<b a="1">\'&'), '&lt;b a=&quot;1&quot;&gt;&#39;&amp;');
  assert.equal(bmEsc(undefined), '');
});

test('bmLang: card option, then Home Assistant, then English', () => {
  assert.equal(bmLang({ locale: { language: 'fr-FR' } }, {}), 'fr');
  assert.equal(bmLang({ locale: { language: 'fr' } }, { language: 'en' }), 'en');
  assert.equal(bmLang({ language: 'de' }, {}), 'de');
  assert.equal(bmLang({ locale: { language: 'es-ES' } }, {}), 'es');
  assert.equal(bmLang({ language: 'ja' }, {}), 'en');
  // Serbian: Cyrillic by default, Latin script when Home Assistant (or the card) asks for sr-Latn.
  assert.equal(bmLang({ language: 'sr' }, {}), 'sr');
  assert.equal(bmLang({ locale: { language: 'sr-Latn' } }, {}), 'sr-Latn');
  assert.equal(bmLang({ language: 'en' }, { language: 'sr-Latn' }), 'sr-Latn');
  assert.equal(bmLang({ language: 'sr-Cyrl' }, {}), 'sr');
});

test('bmLang: Italian, Dutch, Portuguese and Polish, by full code then base language', () => {
  assert.equal(bmLang({ locale: { language: 'it-IT' } }, {}), 'it');
  assert.equal(bmLang({ locale: { language: 'nl-BE' } }, {}), 'nl');
  assert.equal(bmLang({ language: 'pt' }, {}), 'pt');
  // Brazilian Portuguese falls back to the European Portuguese texts.
  assert.equal(bmLang({ locale: { language: 'pt-BR' } }, {}), 'pt');
  assert.equal(bmLang({ language: 'pl-PL' }, {}), 'pl');
  assert.equal(bmLang({ language: 'en' }, { language: 'pl' }), 'pl');
  assert.equal(bmLang({ locale: { language: 'sr-Latn' } }, {}), 'sr-Latn');
  assert.equal(bmLang({ language: 'ja' }, {}), 'en');
});

test('I18N Polish: counts above one go after a colon, so the noun reads right for 2–4 and 5+', () => {
  for (const key of ['low_many', 'unavailable_many', 'count', 'cells', 'devices_n', 'to_check']) {
    assert.match(BM_I18N.pl[key], /: \{n\}$/, key);
  }
});

test('I18N Serbian: the Cyrillic and Latin cards say the same thing, letter for letter', () => {
  const cyr = 'абвгдђежзијклљмнњопрстћуфхцчџш';
  const lat = ['a', 'b', 'v', 'g', 'd', 'đ', 'e', 'ž', 'z', 'i', 'j', 'k', 'l', 'lj', 'm', 'n', 'nj', 'o', 'p', 'r', 's', 't', 'ć', 'u', 'f', 'h', 'c', 'č', 'dž', 'š'];
  const map = new Map();
  [...cyr].forEach((c, i) => {
    map.set(c, lat[i]);
    map.set(c.toUpperCase(), lat[i][0].toUpperCase() + lat[i].slice(1));
  });
  for (const [key, text] of Object.entries(BM_I18N.sr)) {
    assert.equal([...text].map((c) => map.get(c) ?? c).join(''), BM_I18N['sr-Latn'][key], key);
  }
});

test('I18N Serbian: a battery is feminine, and a count reads right for any number', () => {
  // "батерија" is feminine: one unavailable battery is "недоступна", like "слаба".
  assert.equal(BM_I18N.sr.unavailable_one, '{n} недоступна');
  assert.equal(BM_I18N['sr-Latn'].unavailable_one, '{n} nedostupna');
  // The noun changes form after 2–4 and after 5+: the count goes after a colon, not before it.
  assert.equal(BM_I18N.sr.count, 'Батерија: {n}');
  assert.equal(BM_I18N['sr-Latn'].count, 'Baterija: {n}');
});

const LANGUAGES = ['de', 'en', 'es', 'fr', 'it', 'nl', 'pl', 'pt', 'sr', 'sr-Latn'];

test('I18N parity: every language has exactly the English keys and placeholders, and no empty text', () => {
  const en = BM_I18N.en;
  const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  assert.deepEqual(Object.keys(BM_I18N).sort(), LANGUAGES);
  for (const [lang, strings] of Object.entries(BM_I18N)) {
    assert.deepEqual(Object.keys(strings).sort(), Object.keys(en).sort(), `${lang}: keys`);
    for (const key of Object.keys(en)) {
      assert.equal(typeof strings[key], 'string', `${lang}.${key}: type`);
      assert.ok(strings[key].trim(), `${lang}.${key}: empty`);
      assert.deepEqual(placeholders(strings[key]), placeholders(en[key]), `${lang}.${key}: placeholders`);
    }
  }
});

test('editor: the language list offers every translation, once', () => {
  const editor = new BatteryMonitorCardEditor();
  editor.appendChild = () => {};
  editor.setConfig({});
  editor.hass = typedHass('en');
  const options = editor._form.schema.find((s) => s.name === 'language').selector.select.options;
  assert.deepEqual(Array.from(options, (o) => o.value).sort(), LANGUAGES);
  assert.deepEqual(
    Object.fromEntries(options.filter((o) => ['it', 'nl', 'pt', 'pl'].includes(o.value)).map((o) => [o.value, o.label])),
    { it: 'Italiano', nl: 'Nederlands', pt: 'Português (Portugal)', pl: 'Polski' },
  );
});

test('the sensor restored without its battery list at the first render is found once its state arrives', () => {
  const card = makeCard();
  const entities = registry();
  card.hass = hassWith(entities, { [SENSOR]: restoredState });
  assert.ok(html(card).includes(notSetUp));
  // Same entity registry object, real state now.
  card.hass = hassWith(entities, { [SENSOR]: realState });
  assert.ok(!html(card).includes(notSetUp), 'still "not set up" after the state arrived');
  assert.ok(html(card).includes('class="notify"'), 'the Notify button is missing');
  assert.ok(html(card).includes('3 low'));
});

test('the sensor absent from the states at the first render is found when it appears', () => {
  const card = makeCard();
  const entities = registry();
  card.hass = hassWith(entities, {});
  assert.ok(html(card).includes(notSetUp));
  card.hass = hassWith(entities, { [SENSOR]: realState });
  assert.ok(html(card).includes('3 low'));
  assert.ok(html(card).includes('class="notify"'));
});

test('an empty entity registry at the first render is not kept', () => {
  const card = makeCard();
  const entities = {};
  card.hass = hassWith(entities, { [SENSOR]: realState });
  assert.ok(html(card).includes(notSetUp));
  // Registry loaded: a new object, as Home Assistant sends.
  card.hass = hassWith(registry(), { [SENSOR]: realState });
  assert.ok(html(card).includes('3 low'));
});

test('the sensor losing its list goes back to "not set up", then comes back', () => {
  const card = makeCard();
  const entities = registry();
  card.hass = hassWith(entities, { [SENSOR]: realState });
  assert.ok(html(card).includes('3 low'));
  card.hass = hassWith(entities, { [SENSOR]: restoredState });
  assert.ok(html(card).includes(notSetUp));
  card.hass = hassWith(entities, { [SENSOR]: realState });
  assert.ok(html(card).includes('3 low'));
});

test('the registry is scanned only when hass.entities changes', () => {
  const card = makeCard();
  let scans = 0;
  const entities = new Proxy(registry(), {
    ownKeys(target) {
      scans++;
      return Reflect.ownKeys(target);
    },
  });
  card.hass = hassWith(entities, { [SENSOR]: realState });
  const after = scans;
  for (let i = 0; i < 5; i++) card.hass = hassWith(entities, { [SENSOR]: { ...realState, state: String(i) } });
  assert.equal(scans, after);
});

test('an update that changes nothing the card reads does not re-render', () => {
  const card = makeCard();
  const entities = registry();
  const states = { [SENSOR]: realState };
  card.hass = hassWith(entities, states);
  let renders = 0;
  const render = card._render.bind(card);
  card._render = () => {
    renders++;
    render();
  };
  // Same state object, registry and language: short-circuited before the signature is built.
  card.hass = hassWith(entities, states);
  assert.equal(renders, 0);
  // A new state object for the sensor renders again.
  card.hass = hassWith(entities, { [SENSOR]: { ...realState } });
  assert.equal(renders, 1);
});

test('a configured entity is used as is, with its device button', () => {
  const card = makeCard({ entity: SENSOR });
  card.hass = hassWith(registry(), { [SENSOR]: realState });
  assert.ok(html(card).includes('class="notify"'));
  const noButton = makeCard({ entity: SENSOR, notify_button: false });
  noButton.hass = hassWith(registry(), { [SENSOR]: realState });
  assert.ok(!html(noButton).includes('class="notify"'));
});

test('the button is found once the registry knows the configured sensor', () => {
  const card = makeCard({ entity: SENSOR });
  card.hass = hassWith({}, { [SENSOR]: realState });
  assert.ok(!html(card).includes('class="notify"'));
  card.hass = hassWith(registry(), { [SENSOR]: realState });
  assert.ok(html(card).includes('class="notify"'));
});

test('only_low hides the batteries in good shape', () => {
  const card = makeCard({ only_low: true });
  card.hass = hassWith(registry(), { [SENSOR]: realState });
  assert.ok(!html(card).includes('Lamp'));
  assert.ok(html(card).includes('Leak'));
});

// ── Full screen, battery types ───────────────────────────────────────────────
const ROOMS = [
  { entity_id: 'sensor.door_battery', device_id: 'dev_door', name: 'Door', area: 'Entrance', level: 12, low: true, icon: 'mdi:battery-10' },
  { entity_id: 'sensor.lock_battery', device_id: 'dev_lock', name: 'Lock', area: 'Entrance', level: 80, low: false, icon: 'mdi:battery-80' },
  { entity_id: 'sensor.remote_battery', device_id: 'dev_remote', name: 'Remote', area: 'Living room', level: 9, low: true, icon: 'mdi:battery-10' },
  { entity_id: 'sensor.leak_battery', device_id: 'dev_leak', name: 'Leak', area: null, level: null, unavailable: true, icon: 'mdi:battery-unknown' },
];
const typedHass = (lang = 'en') => ({
  entities: {
    ...registry(),
    'sensor.lock_battery_type': { platform: 'battery_notes', device_id: 'dev_lock', translation_key: 'battery_type' },
  },
  states: {
    [SENSOR]: { state: '2', attributes: { batteries: ROOMS } },
    [BUTTON]: { state: 'unknown', attributes: {} },
    // Battery Notes: the attributes on the battery entity, or a "Battery type" sensor on its device.
    'sensor.door_battery': { state: '12', attributes: { battery_type: 'CR2032', battery_quantity: 1 } },
    'sensor.lock_battery_type': { state: 'AA', attributes: { battery_quantity: 4 } },
  },
  areas: {
    entrance: { area_id: 'entrance', name: 'Entrance', icon: 'mdi:door' },
    living_room: { area_id: 'living_room', name: 'Living room', icon: null },
  },
  devices: {
    dev_door: { model: 'Door sensor', manufacturer: 'Acme' },
    dev_remote: { model: 'Remote control', manufacturer: 'Acme' },
    dev_leak: { model: 'Leak sensor', manufacturer: 'Acme' },
  },
  language: lang,
  locale: { language: lang },
  callService() {},
});

test('bmParseType reads a quantity before or after the type', () => {
  assert.deepEqual({ ...bmParseType('2× AA') }, { type: 'AA', quantity: 2 });
  assert.deepEqual({ ...bmParseType('3x AAA') }, { type: 'AAA', quantity: 3 });
  assert.deepEqual({ ...bmParseType('CR2032 x2') }, { type: 'CR2032', quantity: 2 });
  assert.deepEqual({ ...bmParseType('CR2450') }, { type: 'CR2450', quantity: 1 });
  assert.deepEqual({ ...bmParseType('AA', 4) }, { type: 'AA', quantity: 4 });
  assert.equal(bmParseType(''), null);
  assert.equal(bmParseType('unknown'), null);
});

test('battery type: the card setting first, then Battery Notes attributes, then its sensor on the device', () => {
  const hass = typedHass();
  assert.equal(bmTypeOf(hass, {}, ROOMS[0]).type, 'CR2032');
  assert.deepEqual({ ...bmTypeOf(hass, {}, ROOMS[1]) }, { type: 'AA', quantity: 4 });
  assert.equal(bmTypeOf(hass, {}, ROOMS[2]), null);
  assert.equal(bmTypeOf(hass, { battery_types: { 'sensor.remote_battery': '2× AAA' } }, ROOMS[2]).quantity, 2);
  assert.equal(bmTypeOf(hass, { battery_types: { 'sensor.door_battery': 'CR2450' } }, ROOMS[0]).type, 'CR2450');
});

test('full screen: by room and by type, what to replace; reopens after closing', () => {
  const card = makeCard({ battery_types: { 'sensor.remote_battery': '2× AAA' } });
  card.hass = typedHass();
  assert.ok(html(card).includes('class="full"'), 'the full screen button is missing');
  for (let i = 0; i < 2; i++) {
    card._openPopup();
    assert.equal(body.children.length, 1, `open #${i + 1}`);
    assert.equal(body.style.overflow, 'hidden');
    const pop = body.children[0].shadowRoot.innerHTML;
    // By room: the rooms by name, the room-less last; the type under each name.
    assert.ok(pop.indexOf('>Entrance<') < pop.indexOf('>Living room<'));
    assert.ok(pop.indexOf('>Living room<') < pop.indexOf('>No room<'));
    assert.match(pop, /class="name">Lock<\/span>\s*<span class="sub">4× AA<\/span>/);
    // What to buy for the 3 batteries needing attention.
    assert.match(pop, /<b>2×<\/b> AAA<\/span><span class="buy"><b>1×<\/b> CR2032<\/span><span class="buy unknown"><b>1×<\/b> Unknown type/);
    if (i) listeners.keydown({ key: 'Escape' });
    else card._onPopupClick({ composedPath: () => [{ classList: { contains: (c) => c === 'close' }, dataset: {} }] });
    assert.equal(body.children.length, 0, `closed #${i + 1}`);
    assert.equal(body.style.overflow, '');
  }
  card._openPopup();
  card._onPopupClick({ composedPath: () => [{ classList: { contains: () => false }, dataset: { view: 'type' } }] });
  const pop = body.children[0].shadowRoot.innerHTML;
  // By type: the most used types first, the unknown last with its hint; the room under each name.
  assert.match(pop, /class="tab on" data-view="type"/);
  assert.ok(pop.indexOf('>AAA<') < pop.indexOf('>Unknown type<'));
  assert.match(pop, /Set the type in the card editor/);
  // By type, the group counts the batteries of that type: the lock's 4 AA.
  assert.match(pop, /class="gname">AA<\/span>\s*<span class="gcount">4 batteries<\/span>/);
  assert.match(pop, /class="name">Remote<\/span>\s*<span class="sub">Living room · 2 batteries<\/span>/);
  card._closePopup();
});

test('the full screen button can be turned off', () => {
  const card = makeCard({ popup: false });
  card.hass = typedHass();
  assert.ok(!html(card).includes('class="full"'));
});

test('editor: a type field for each battery whose type is not detected, labelled with its name and room', () => {
  const editor = new BatteryMonitorCardEditor();
  editor.appendChild = () => {};
  editor.setConfig({ battery_types: { 'sensor.door_battery': 'CR2450' } });
  editor.hass = typedHass('fr');
  const group = editor._form.schema.find((s) => s.name === 'battery_types');
  assert.equal(group.type, 'expandable');
  assert.equal(group.title, 'Types de pile par batterie');
  // The door is set in the card, the lock detected (left out), the remote and the leak sensor to set.
  assert.deepEqual(
    group.schema.map((s) => s.name),
    ['sensor.door_battery', 'sensor.remote_battery', 'sensor.leak_battery'],
  );
  assert.equal(group.schema[0].selector.select.custom_value, true);
  assert.equal(editor._form.computeLabel({ name: 'sensor.remote_battery' }), 'Remote · Living room');
  assert.equal(editor._form.data.battery_types['sensor.door_battery'], 'CR2450');
});

test('editor: empty battery types are not written to the YAML', () => {
  const editor = new BatteryMonitorCardEditor();
  editor.appendChild = () => {};
  let config;
  editor.dispatchEvent = (ev) => (config = ev.detail.config);
  editor.setConfig({});
  editor.hass = typedHass();
  editor._form.dispatch({ battery_types: { 'sensor.remote_battery': '2× AAA', 'sensor.leak_battery': '' }, popup: true });
  assert.deepEqual(JSON.parse(JSON.stringify(config)), { battery_types: { 'sensor.remote_battery': '2× AAA' } });
});

test('the list shows each battery type next to its room', () => {
  const card = makeCard({ battery_types: { 'sensor.remote_battery': '2× AAA' } });
  card.hass = typedHass();
  const out = html(card);
  assert.match(out, /class="name">Door<\/span>\s*<span class="sub">Entrance · 1× CR2032<\/span>/);
  assert.match(out, /class="name">Lock<\/span>\s*<span class="sub">Entrance · 4× AA<\/span>/);
  assert.match(out, /class="name">Remote<\/span>\s*<span class="sub">Living room · 2× AAA<\/span>/);
  // No room and no type: nothing under the name.
  assert.match(out, /class="name">Leak<\/span>\s*<\/span>/);
});

test('battery types by model: every device of the model, a battery setting still wins', () => {
  const hass = typedHass();
  const config = { battery_models: { 'Remote control': '2× AAA', 'Leak sensor': 'CR2032', 'Door sensor': 'CR2450' } };
  assert.equal(bmTypeOf(hass, config, ROOMS[2]).type, 'AAA');
  assert.equal(bmTypeOf(hass, config, ROOMS[2]).quantity, 2);
  assert.equal(bmTypeOf(hass, config, ROOMS[3]).type, 'CR2032');
  // The model wins over Battery Notes (the door's CR2032), the battery setting over the model.
  assert.equal(bmTypeOf(hass, config, ROOMS[0]).type, 'CR2450');
  assert.equal(bmTypeOf(hass, { ...config, battery_types: { 'sensor.remote_battery': 'AA' } }, ROOMS[2]).type, 'AA');
  // The lock has no model: Battery Notes' type stays.
  assert.equal(bmTypeOf(hass, config, ROOMS[1]).type, 'AA');
});

test('editor: a type field for each model, the batteries left without a type below', () => {
  const editor = new BatteryMonitorCardEditor();
  editor.appendChild = () => {};
  let config;
  editor.dispatchEvent = (ev) => (config = ev.detail.config);
  editor.setConfig({ battery_models: { 'Remote control': '2× AAA' } });
  editor.hass = typedHass('fr');
  const byModel = editor._form.schema.find((s) => s.name === 'battery_models');
  const byBattery = editor._form.schema.find((s) => s.name === 'battery_types');
  assert.equal(byModel.title, 'Types de pile par modèle');
  // The door is detected (Battery Notes): its model is left out; the remote's model is set, the leak's to set.
  assert.deepEqual(
    [...byModel.schema.map((s) => s.name)],
    ['Leak sensor', 'Remote control'],
  );
  assert.equal(editor._form.computeLabel({ name: 'Remote control' }), 'Remote control · Acme · 1 appareil');
  // By battery: only the leak sensor, whose model has no type yet.
  assert.deepEqual(
    [...byBattery.schema.map((s) => s.name)],
    ['sensor.leak_battery'],
  );
  editor._form.dispatch({ battery_models: { 'Remote control': '2× AAA', 'Leak sensor': 'CR2032' }, battery_types: {} });
  assert.deepEqual(JSON.parse(JSON.stringify(config)), { battery_models: { 'Remote control': '2× AAA', 'Leak sensor': 'CR2032' } });
});

test('full screen by room: each room with its own icon', () => {
  const card = makeCard();
  card.hass = typedHass();
  card._openPopup();
  const pop = body.children[0].shadowRoot.innerHTML;
  card._closePopup();
  assert.match(pop, /<ha-icon icon="mdi:door"><\/ha-icon><span class="gname">Entrance</);
  // A room without an icon: a door; the batteries without a room: a house.
  assert.match(pop, /<ha-icon icon="mdi:door-open"><\/ha-icon><span class="gname">Living room</);
  assert.match(pop, /<ha-icon icon="mdi:home-outline"><\/ha-icon><span class="gname">No room</);
});

// Home Assistant's dialog manager: the more-info adds a history entry and goes back to close.
const rowClick = (card, id) => card._onPopupClick({ composedPath: () => [{ classList: { contains: () => false }, dataset: { id } }] });
const layer = () => body.children[0].style['--bm-layer'];

test('full screen: a more-info opened from a row closes alone, then the popup closes cleanly', () => {
  for (const legacy of [false, true]) {
    const card = makeCard();
    card.hass = typedHass();
    const start = history.index;
    card._openPopup();
    rowClick(card, 'sensor.door_battery');
    assert.equal(layer(), '5', 'the layer must drop below the more-info');
    // Current versions keep our state and push { dialog }; older ones replace it with a dialog state.
    if (legacy) {
      history.replaceState({ dialog: 'ha-more-info-dialog', open: false, oldState: history.state });
      history.pushState({ dialog: 'ha-more-info-dialog', open: true });
    } else {
      history.replaceState({ ...history.state, opensDialog: true });
      history.pushState({ dialog: 'ha-more-info-dialog' });
    }
    listeners.keydown({ key: 'Escape' });
    assert.equal(body.children.length, 1, `${legacy}: Escape over the more-info closed the full screen`);
    history.back(); // the more-info closes
    assert.equal(body.children.length, 1, `${legacy}: closing the more-info closed the full screen`);
    assert.equal(layer(), '9999');
    card._closePopup();
    assert.equal(body.children.length, 0);
    assert.equal(history.index, start, `${legacy}: the popup's history entry was left behind`);
  }
});

test('full screen: the back button closes it without going back twice', () => {
  const card = makeCard();
  card.hass = typedHass();
  const start = history.index;
  card._openPopup();
  history.back();
  assert.equal(body.children.length, 0);
  assert.equal(history.index, start);
});

// Older dialog managers leave the dashboard's entry in a closed-dialog state after any more-info opened from it.
const legacyDashboard = () => history.replaceState({ dialog: 'ha-more-info-dialog', open: false, oldState: null });

test('full screen: the back button closes it after a more-info was opened from the dashboard (older Home Assistant)', () => {
  const saved = history.state;
  legacyDashboard();
  const card = makeCard();
  card.hass = typedHass();
  const start = history.index;
  card._openPopup();
  history.back();
  assert.equal(body.children.length, 0, 'the back button left the full screen open');
  assert.equal(history.index, start);
  history.replaceState(saved);
});

test('full screen (older Home Assistant): a more-info from a row closes alone, then back closes the popup', () => {
  const saved = history.state;
  legacyDashboard();
  const card = makeCard();
  card.hass = typedHass();
  const start = history.index;
  card._openPopup();
  rowClick(card, 'sensor.door_battery');
  history.replaceState({ dialog: 'ha-more-info-dialog', open: false, oldState: null });
  history.pushState({ dialog: 'ha-more-info-dialog', open: true });
  history.back(); // the more-info closes
  assert.equal(body.children.length, 1, 'closing the more-info closed the full screen');
  assert.equal(layer(), '9999');
  history.back(); // then the back button closes the full screen
  assert.equal(body.children.length, 0, 'the back button left the full screen open');
  assert.equal(history.index, start);
  history.replaceState(saved);
});

test('full screen: a row whose more-info never opened does not swallow the back button', () => {
  const card = makeCard();
  card.hass = typedHass();
  const start = history.index;
  card._openPopup();
  rowClick(card, 'sensor.door_battery'); // no dialog manager answers: no history entry is added
  history.back();
  assert.equal(body.children.length, 0, 'the back button left the full screen open');
  assert.equal(history.index, start);
});

test('room icons follow an area edit with no other change', () => {
  const card = makeCard();
  const hass = typedHass();
  card.hass = hass;
  card._openPopup();
  card.hass = { ...hass, areas: { ...hass.areas, entrance: { ...hass.areas.entrance, icon: 'mdi:key' } } };
  assert.match(body.children[0].shadowRoot.innerHTML, /<ha-icon icon="mdi:key"><\/ha-icon><span class="gname">Entrance</);
  card._closePopup();
});

// What Home Assistant's navigate() does from a more-info (device link, "Related" tab): it closes the dialogs
// (back), then pushes the new page, and the panel resolver removes the dashboard, so the card is disconnected.
test('full screen: a navigation from a more-info opened in it is not undone when the card goes away', async () => {
  const card = makeCard();
  card.hass = typedHass();
  card._openPopup();
  rowClick(card, 'sensor.door_battery');
  history.replaceState({ ...history.state, opensDialog: true });
  history.pushState({ dialog: 'ha-more-info-dialog' });
  history.back(); // navigate() closes the more-info first
  assert.equal(body.children.length, 1);
  history.pushState(null, '', '/config/devices/device/dev2');
  const page = history.index;
  card.disconnectedCallback();
  await Promise.resolve();
  assert.equal(body.children.length, 0, 'the full screen stayed open on the new page');
  assert.equal(history.index, page, 'the card went back from the page the user navigated to');
  assert.equal(history.urls[history.index], 'http://ha.local/config/devices/device/dev2');
  assert.equal(windowListeners.popstate, undefined, 'the back listener was left behind');
  history.back();
  history.back();
});

test('full screen: the card removed while it is open (same page) still leaves its history entry', async () => {
  const card = makeCard();
  card.hass = typedHass();
  const start = history.index;
  card._openPopup();
  card.disconnectedCallback();
  await Promise.resolve();
  assert.equal(body.children.length, 0);
  assert.equal(history.index, start, "the popup's history entry was left behind");
});

test('full screen: closed after a hash change on the same dashboard, it does not go back', () => {
  const card = makeCard();
  card.hass = typedHass();
  card._openPopup();
  history.pushState(null, '', '#other');
  const page = history.index;
  card._closePopup();
  assert.equal(history.index, page);
  history.back();
  history.back();
});

// ── Contrast ──
// WCAG relative luminance and contrast ratio, and CSS color-mix(in srgb, a p%, b).
const hex = (x) => [0, 2, 4].map((i) => Number.parseInt(x.slice(1 + i, 3 + i), 16));
const mixRgb = (a, b, p) => a.map((v, i) => v * p + b[i] * (1 - p));
const luminance = (c) => {
  const [r, g, b] = c.map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
// Home Assistant's default light and dark themes (the darkest secondary background in light, as the screenshots).
const THEMES = {
  light: { card: '#ffffff', secondary: '#e5e5e5', text: '#212121' },
  dark: { card: '#1c1c1c', secondary: '#282828', text: '#e1e1e1' },
};
const STATUS = { ok: '#43a047', warn: '#ffa600', alert: '#db4437', primary: '#03a9f4' };
const allStyles = () => BatteryMonitorCard.styles + BatteryMonitorCard.popupStyles;
// The declarations of a rule, by its exact selector.
const rule = (selector) => {
  const css = allStyles();
  const at = css.indexOf(`${selector} {`);
  assert.ok(at >= 0, `no rule ${selector}`);
  return css.slice(css.indexOf('{', at) + 1, css.indexOf('}', at));
};
const textColor = (selector) => /(?:^|[;\s])color:\s*([^;]+);/.exec(rule(selector))?.[1].trim();
// The share of the status colour mixed into the text of a token such as --bm-warn-text.
const share = (token) => {
  const m = new RegExp(`${token}:\\s*color-mix\\(in srgb, var\\(--[\\w-]+(?:, #[0-9a-f]+)?\\) (\\d+)%, var\\(--primary-text-color`).exec(
    allStyles(),
  );
  assert.ok(m, `${token} is not a mix of its status colour with the text colour`);
  return Number(m[1]) / 100;
};

test('status texts use their readable token, not the raw status colour', () => {
  const expected = {
    '.pill': 'var(--ct)',
    '.row.warn .sub, .row.alert .sub': 'var(--tt)',
    '.row:not(.ok) .lvl': 'var(--tt)',
    '.buy b': 'var(--bm-warn-text)',
    '.gchip': 'var(--bm-warn-text)',
    '.none': 'var(--bm-ok-text)',
    '.tab.on': 'var(--bm-primary-text)',
  };
  for (const [selector, color] of Object.entries(expected)) assert.equal(textColor(selector), color, selector);
  // The tokens follow the level: the card's pill and each row.
  assert.match(rule('ha-card.lvl-warn '), /--ct: var\(--bm-warn-text\)/);
  assert.match(rule('.row.alert '), /--tt: var\(--bm-alert-text\)/);
  // The colour stays on what is not text: the badge, the icons, the bar.
  assert.match(rule('.bar'), /background: var\(--t\)/);
  assert.match(rule('.ic'), /color: var\(--t\)/);
});

test('status texts reach 4.5:1 on their tinted background, light and dark', () => {
  for (const [name, t] of Object.entries(THEMES)) {
    const [card, secondary, text] = [hex(t.card), hex(t.secondary), hex(t.text)];
    const fg = (status, token) => mixRgb(hex(STATUS[status]), text, share(token));
    const cases = [
      ...['ok', 'warn', 'alert'].map((s) => [`pill ${s}`, fg(s, `--bm-${s}-text`), mixRgb(hex(STATUS[s]), card, 0.14)]),
      // A warn or alert row, at rest and hovered.
      ...['warn', 'alert'].flatMap((s) => [
        [`row ${s}`, fg(s, `--bm-${s}-text`), mixRgb(hex(STATUS[s]), secondary, 0.12)],
        [`row ${s} hover`, fg(s, `--bm-${s}-text`), mixRgb(hex(STATUS[s]), secondary, 0.18)],
      ]),
      ['buy quantity', fg('warn', '--bm-warn-text'), mixRgb(hex(STATUS.warn), card, 0.16)],
      ['group chip', fg('warn', '--bm-warn-text'), mixRgb(hex(STATUS.warn), card, 0.14)],
      ['nothing to replace', fg('ok', '--bm-ok-text'), card],
      ['selected tab', fg('primary', '--bm-primary-text'), mixRgb(hex(STATUS.primary), secondary, 0.15)],
    ];
    for (const [what, f, b] of cases) {
      const ratio = contrast(f, b);
      assert.ok(ratio >= 4.5, `${name} theme, ${what}: ${ratio.toFixed(2)}:1`);
    }
  }
});

test('every level the card renders, sensor missing included, gives its pill a text colour', () => {
  const levels = new Set();
  const missing = makeCard();
  missing.hass = hassWith({}, {});
  const low = makeCard();
  low.hass = hassWith(registry(), { [SENSOR]: realState });
  const ok = makeCard();
  ok.hass = hassWith(registry(), { [SENSOR]: { state: '0', attributes: { batteries: [BATTERIES[4]] } } });
  for (const card of [missing, low, ok]) for (const [, l] of html(card).matchAll(/lvl-(\w+)/g)) levels.add(l);
  assert.ok(levels.size >= 2, [...levels].join());
  for (const l of levels) assert.match(rule(`ha-card.lvl-${l}`.padEnd(17)), /--ct: var\(--bm-\w+-text\)/, l);
  // An unavailable battery is an alert row: its level text gets the alert text colour.
  assert.match(html(low), /class="row alert na"/);
});

// ── Review pass 9 ──
// A card whose own shadow root has focusable buttons (the full screen and notify buttons).
function focusableCard(config = {}) {
  const card = makeCard(config);
  card.shadowRoot = fakeRoot();
  return card;
}
const popupRoot = () => body.children[0].shadowRoot;
const keydown = (key, shiftKey = false) => {
  const ev = { key, shiftKey, prevented: false, preventDefault() {
    this.prevented = true;
  } };
  listeners.keydown(ev);
  return ev;
};

test('header: short of room, the pill goes whole under the title instead of being cut', () => {
  // The title, the notify button and the pill share a wrapping block: the title takes what is left on the line (it
  // does not claim its whole text first), keeping a few letters; the pill keeps its whole text and goes to the next
  // line when it does not fit beside them.
  const main = rule('.main');
  for (const decl of ['flex: 1 1 0', 'min-width: 0', 'display: flex', 'flex-wrap: wrap']) assert.ok(main.includes(decl), `.main: ${decl}`);
  const title = rule('.title');
  assert.match(title, /flex: 1 1 0;/);
  assert.match(title, /min-width: min\(100%, [4-9](\.\d+)?ch\)/);
  assert.match(title, /text-overflow: ellipsis/);
  const pill = rule('.pill');
  for (const decl of ['flex: 0 1 auto', 'min-width: 0', 'max-width: 100%']) assert.ok(pill.includes(decl), `.pill: ${decl}`);
  // Never cut: no ellipsis, no single line forced, no half-width cap, no dot-only mode.
  assert.doesNotMatch(pill, /white-space: nowrap|max-width: 50%/);
  assert.doesNotMatch(rule('.pt'), /text-overflow|clip/);
  assert.doesNotMatch(allStyles(), /\.pill::before|\.pt \{[^}]*position: absolute/);
  // The icon buttons never shrink.
  for (const button of ['.notify', '.full', '.close']) assert.match(rule(button), /flex: none/, button);
  // The card and the full screen use the same block, the pill after the title.
  const card = makeCard({ notify_button: true });
  card.hass = hassWith(registry(), { [SENSOR]: realState });
  assert.match(html(card), /<div class="main"><div class="title">[^<]+<\/div>(<button class="notify"[^>]*><ha-icon[^>]*><\/ha-icon><\/button>)?<div class="pill"/);
  card._openPopup();
  assert.match(popupRoot().innerHTML, /<div class="main"><div class="title">[^<]+<\/div>(<button class="notify"[^>]*><ha-icon[^>]*><\/ha-icon><\/button>)?<div class="pill"/);
  card._closePopup();
});

test('size container: the card keeps a width in a parent sized by its content, and still shrinks in a grid', () => {
  // A size container takes no width from its content: inline-block or an `auto` grid column would shrink it to its
  // padding (24px) without a width of its own...
  assert.match(rule('ha-card'), /container-type: inline-size/);
  // ...which must not become a minimum. contain-intrinsic-inline-size (or a min-width in px) is one: in a `1fr 1fr`
  // grid or a `flex: 1` row, a wrapper <div> around the card keeps min-width: auto, takes the card's 240px as its
  // min-content width and overflows by 36 to 216px (Chromium, 320 to 500px wide).
  assert.doesNotMatch(allStyles(), /contain-intrinsic/);
  assert.doesNotMatch(BatteryMonitorCard.styles, /:host \{[^}]*min-width: [1-9]\d*px/);
  const host = rule(':host');
  assert.match(host, /display: block;/);
  assert.match(host, /min-width: 0;/);
  // The width comes from an empty, zero-height grid before the card: up to 240px when the parent is sized by its
  // content, and nothing as a minimum (minmax(0, ...)), so the card and any wrapper still shrink to their track.
  const before = rule(':host::before');
  assert.match(before, /content: "";/);
  assert.match(before, /display: grid;/);
  assert.match(before, /grid-template-columns: minmax\(0, \d+px\);/);
  assert.match(before, /height: 0;/);
  // The full screen view (same styles, a fixed layer) does not need it.
  assert.match(BatteryMonitorCard.popupStyles, /:host::before \{ content: none; \}/);
});

test('narrow card (half of a phone section): the badge goes and each level goes under its name', () => {
  const narrow = [...allStyles().matchAll(/@container \(max-width: (\d+)px\) \{([^@]*)\}\s*\n/g)];
  const phone = narrow.find(([, width]) => Number(width) >= 156 && Number(width) <= 200);
  assert.ok(phone, 'no container query for half a phone section');
  assert.match(phone[2], /\.badge \{ display: none; \}/);
  assert.match(phone[2], /\.row \{ display: grid; grid-template-columns: auto minmax\(0, 1fr\)/);
  assert.match(phone[2], /\.lvl \{[^}]*max-width: none; min-width: 0;/);
});

test('full screen: giving the focus to its close button does not scroll the page', () => {
  const card = focusableCard();
  card.hass = typedHass();
  card._openPopup();
  try {
    assert.equal(popupRoot().activeElement?.key, '.close');
    assert.equal(popupRoot().activeElement.focusOptions?.preventScroll, true);
  } finally {
    card._closePopup();
  }
  assert.equal(card.shadowRoot.activeElement?.key, '.full');
  assert.equal(card.shadowRoot.activeElement.focusOptions?.preventScroll, true);
});

test('header: the pill carries its whole text in its tooltip, in its own span', () => {
  const card = makeCard({ language: 'pl' });
  card.hass = hassWith(registry(), { [SENSOR]: realState });
  assert.match(html(card), /<div class="pill" title="Słabe: 3 · 1 niedostępna"><span class="pt">Słabe: 3 · 1 niedostępna<\/span><\/div>/);
  // Not set up: the same pill.
  const missing = makeCard();
  missing.hass = hassWith({}, {});
  assert.match(html(missing), new RegExp(`<div class="pill" title="${notSetUp}"><span class="pt">${notSetUp}</span></div>`));
});

test('list: the columns option never squeezes a battery below a readable width', () => {
  const columns = /grid-template-columns: ([^;]+);/.exec(rule('.list'))[1];
  // As many columns as asked at most, each at least 160px (or the whole card, if narrower), fewer when it does not fit.
  assert.match(columns, /^repeat\(auto-fill, minmax\(min\(100%, max\(160px, /);
  assert.match(columns, /var\(--cols\)/);
});

test('full screen: the focus goes to its close button, comes back to the card button when it closes', () => {
  const card = focusableCard();
  card.hass = typedHass();
  card.shadowRoot.querySelector('.full').focus();
  card._openPopup();
  assert.equal(popupRoot().activeElement?.key, '.close', 'the focus stayed under the layer');
  listeners.keydown({ key: 'Escape' });
  assert.equal(body.children.length, 0);
  assert.equal(card.shadowRoot.activeElement?.key, '.full', 'the focus was not given back');
});

test('full screen: a refresh keeps the focus on the same tab or battery', () => {
  const card = focusableCard();
  const hass = typedHass();
  card.hass = hass;
  card._openPopup();
  popupRoot().querySelector('[data-view="type"]').focus();
  card._onPopupClick({ composedPath: () => [{ classList: { contains: () => false }, dataset: { view: 'type' } }] });
  assert.equal(popupRoot().activeElement?.key, '[data-view="type"]', 'switching tabs lost the focus');
  popupRoot().querySelector('[data-id="sensor.remote_battery"]').focus();
  // A battery changes: the whole popup is written again.
  const batteries = hass.states[SENSOR].attributes.batteries.map((b) => (b.entity_id === 'sensor.door_battery' ? { ...b, level: 3 } : b));
  card.hass = { ...hass, states: { ...hass.states, [SENSOR]: { state: '3', attributes: { batteries } } } };
  assert.match(popupRoot().innerHTML, /Door — 3 %/);
  assert.equal(popupRoot().activeElement?.key, '[data-id="sensor.remote_battery"]', 'a refresh lost the focus');
  // The focused battery goes away: nothing to focus, no error.
  card.hass = { ...hass, states: { ...hass.states, [SENSOR]: { state: '3', attributes: { batteries: batteries.slice(0, 1) } } } };
  assert.equal(popupRoot().activeElement, null);
  card._closePopup();
});

test('full screen: Tab and Shift+Tab stay inside it, not over the dashboard behind', () => {
  const card = focusableCard();
  card.hass = typedHass();
  card._openPopup();
  const items = popupRoot().querySelectorAll('button:not([disabled])');
  const [first, last] = [items[0], items.at(-1)];
  last.focus();
  assert.ok(keydown('Tab').prevented);
  assert.equal(popupRoot().activeElement, first);
  assert.ok(keydown('Tab', true).prevented);
  assert.equal(popupRoot().activeElement, last);
  // In the middle, the browser moves the focus itself.
  items[1].focus();
  assert.ok(!keydown('Tab').prevented);
  // A more-info opened over it: its own focus, not ours.
  last.focus();
  history.pushState({ dialog: 'ha-more-info-dialog' });
  assert.ok(!keydown('Tab').prevented);
  history.back();
  card._closePopup();
});

// A Home Assistant whose button press resolves or rejects when the test says so.
function pressHass(states = {}) {
  const calls = [];
  const hass = { ...hassWith(registry(), { [SENSOR]: realState, ...states }) };
  hass.callService = (...args) =>
    new Promise((resolve, reject) => {
      calls.push({ args, resolve, reject });
    });
  return { hass, calls };
}
const flush = () => new Promise((r) => setImmediate(r));

test('notify now: busy while the press runs, then sent; a second press meanwhile is ignored', async () => {
  const card = makeCard();
  const { hass, calls } = pressHass();
  card.hass = hass;
  card._notify();
  card._notify();
  assert.equal(calls.length, 1, 'pressed twice');
  assert.equal(JSON.stringify(calls[0].args), JSON.stringify(['button', 'press', { entity_id: BUTTON }]));
  assert.match(card._notifyButton(), /data-state="busy"[^>]*aria-busy="true"[^>]*>\s*<ha-icon icon="mdi:loading">/);
  calls[0].resolve();
  await flush();
  assert.match(card._notifyButton(), /data-state="done" title="Notification sent"/);
  assert.match(card._notifyButton(), /icon="mdi:check"/);
  timers.run();
  assert.match(card._notifyButton(), /data-state="" title="Notify now"/);
  card._notify();
  assert.equal(calls.length, 2);
  calls[1].resolve();
  await flush();
  timers.run();
});

test('notify now: a failed press says why, in the button tooltip, without an unhandled rejection', async () => {
  const card = makeCard({ language: 'fr' });
  const { hass, calls } = pressHass();
  card.hass = hass;
  card._notify();
  calls[0].reject({ code: 'home_assistant_error', message: 'Connection lost' });
  await flush();
  assert.match(card._notifyButton(), /data-state="error" title="[^"]*Connection lost"/);
  assert.match(card._notifyButton(), /icon="mdi:alert-circle-outline"/);
  // A connection gone throws at once.
  const sync = makeCard();
  sync.hass = { ...hass, callService: () => {
    throw new Error('Socket closed');
  } };
  await sync._notify();
  assert.match(sync._notifyButton(), /data-state="error" title="[^"]*Socket closed"/);
  timers.run();
  assert.match(card._notifyButton(), /data-state=""/);
});

test('notify now: an unavailable button is shown disabled, says so, and is not pressed', () => {
  const card = makeCard();
  const { hass, calls } = pressHass({ [BUTTON]: { state: 'unavailable', attributes: {} } });
  card.hass = hass;
  assert.match(html(card), /<button class="notify"[^>]*title="The “Notify now” button is unavailable"[^>]* disabled/);
  card._notify();
  assert.equal(calls.length, 0);
  // Back available (a never pressed button is "unknown"): enabled again.
  card.hass = { ...hass, states: { ...hass.states, [BUTTON]: { state: 'unknown', attributes: {} } } };
  assert.doesNotMatch(html(card), /<button class="notify"[^>]* disabled/);
});

test('I18N Serbian: the pill counts read right for 1, 2, 5, 21 and 22 batteries', () => {
  const pill = (lang, nLow, nNa) => {
    const batteries = [
      ...Array.from({ length: nLow }, (_, i) => ({ entity_id: `sensor.l${i}`, name: `L${i}`, level: 5, low: true })),
      ...Array.from({ length: nNa }, (_, i) => ({ entity_id: `sensor.u${i}`, name: `U${i}`, level: null, unavailable: true })),
    ];
    const card = makeCard({ language: lang });
    card.hass = hassWith(registry(), { [SENSOR]: { state: String(nLow), attributes: { batteries } } });
    return /<span class="pt">([^<]*)</.exec(html(card))[1];
  };
  assert.equal(pill('sr-Latn', 1, 1), '1 slaba · 1 nedostupna');
  for (const n of [2, 5, 21, 22]) {
    assert.equal(pill('sr-Latn', n, n), `Slabe: ${n} · Nedostupne: ${n}`);
    assert.equal(pill('sr', n, n), `Слабе: ${n} · Недоступне: ${n}`);
  }
  assert.equal(pill('sr', 1, 1), '1 слаба · 1 недоступна');
  // A battery is feminine, like "Slaba": one unavailable battery is "Nedostupna".
  assert.equal(BM_I18N['sr-Latn'].unavailable, 'Nedostupna');
  assert.equal(BM_I18N.sr.since_unavailable, 'недоступна већ {d}');
  for (const lang of LANGUAGES) assert.doesNotMatch(Object.values(BM_I18N[lang]).join('\n'), /\/(ih|их)\b/, lang);
});
