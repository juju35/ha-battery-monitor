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
    this.shadowRoot = { innerHTML: '', addEventListener() {}, querySelector: () => null };
    return this.shadowRoot;
  },
});
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
const history = {
  entries: [null],
  index: 0,
  get state() {
    return this.entries[this.index];
  },
  pushState(state) {
    this.entries.splice(this.index + 1);
    this.entries.push(state);
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
});

test('I18N parity: every language has exactly the English keys and placeholders', () => {
  const en = BM_I18N.en;
  const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  assert.deepEqual(Object.keys(BM_I18N).sort(), ['de', 'en', 'es', 'fr']);
  for (const [lang, strings] of Object.entries(BM_I18N)) {
    assert.deepEqual(Object.keys(strings).sort(), Object.keys(en).sort(), `${lang}: keys`);
    for (const key of Object.keys(en)) {
      assert.deepEqual(placeholders(strings[key]), placeholders(en[key]), `${lang}.${key}: placeholders`);
    }
  }
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
