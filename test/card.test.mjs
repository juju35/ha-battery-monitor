// Unit tests for the card: the card file is evaluated with stubs, no browser needed.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(
  new URL('../custom_components/battery_monitor/frontend/battery-monitor-card.js', import.meta.url),
  'utf8',
);
const context = {
  HTMLElement: class {},
  customElements: { get: () => true, define() {} },
  window: {},
  document: {},
  console,
  Date,
};
vm.createContext(context);
vm.runInContext(`${source}\nthis.bm = { BatteryMonitorCard, BM_I18N, bmEsc, bmLang };`, context);
const { BatteryMonitorCard, BM_I18N, bmEsc, bmLang } = context.bm;

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
  assert.equal(bmLang({ language: 'de' }, {}), 'en');
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
