const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { setImmediate: nextTurn } = require('node:timers/promises');
const hap = require('@homebridge/hap-nodejs');
const { PlatformAccessory } = require('../node_modules/homebridge/dist/platformAccessory');
const { MastPlatform } = require('../dist/platform');
const { MastFlagAccessory } = require('../dist/mastAccessory');
const { MastClient } = require('../dist/mastClient');

function setup(t, config = {}) {
  const api = Object.assign(new EventEmitter(), {
    hap, platformAccessory: PlatformAccessory,
    registered: [], removed: [], updated: [],
    registerPlatformAccessories(p, n, a) { this.registered.push(...a); },
    unregisterPlatformAccessories(p, n, a) { this.removed.push(...a); },
    updatePlatformAccessories(a) { this.updated.push(...a); },
  });
  t.after(() => api.emit('shutdown'));
  const log = { info() {}, warn() {}, error() {}, debug() {} };
  const platform = new MastPlatform(log, { platform: 'Mast', stateCode: 'AZ', ...config }, api);
  return { api, platform };
}
function accessory(t, config) {
  const result = setup(t, config);
  const acc = new PlatformAccessory('Mast', hap.uuid.generate('test'));
  acc.context.deviceId = 'test';
  const impl = new MastFlagAccessory(result.platform, acc);
  return { ...result, acc, impl };
}
function switchFor(acc, mode) {
  return acc.getServiceById(hap.Service.Switch, mode).getCharacteristic(hap.Characteristic.On);
}

test('active mode stays selected after HomeKit writes false', async t => {
  const { acc } = accessory(t);
  for (const mode of ['on', 'off', 'auto']) {
    await switchFor(acc, mode).handleSetRequest(true);
    await switchFor(acc, mode).handleSetRequest(false);
    await nextTurn();
    assert.equal(acc.context.overrideMode, mode);
    for (const candidate of ['on', 'off', 'auto']) {
      assert.equal(switchFor(acc, candidate).value, candidate === mode);
    }
  }
});

test('override selection persists context and updates contact state', async t => {
  const { acc, api } = accessory(t);
  await switchFor(acc, 'on').handleSetRequest(true);
  assert.equal(api.updated.at(-1), acc);
  assert.equal(acc.getService(hap.Service.ContactSensor).getCharacteristic(hap.Characteristic.ContactSensorState).value,
    hap.Characteristic.ContactSensorState.CONTACT_DETECTED);
});

test('location change removes cached old accessory and registers replacement', t => {
  const { api, platform } = setup(t, { stateCode: 'TX' });
  const old = new PlatformAccessory('Arizona', hap.uuid.generate('mast-flag-status-US-AZ'));
  platform.configureAccessory(old);
  api.emit('didFinishLaunching');
  assert.deepEqual(api.removed, [old]);
  assert.equal(api.registered.length, 1);
  assert.equal(api.registered[0].UUID, hap.uuid.generate('mast-flag-status-US-TX'));
  assert.deepEqual(platform.accessories, api.registered);
});

test('unchanged location reuses the cached accessory', t => {
  const { api, platform } = setup(t);
  const cached = new PlatformAccessory('Arizona', hap.uuid.generate('mast-flag-status-US-AZ'));
  cached.context.overrideMode = 'on';
  platform.configureAccessory(cached);
  api.emit('didFinishLaunching');
  assert.equal(api.registered.length, 0);
  assert.equal(api.removed.length, 0);
  assert.equal(cached.context.overrideMode, 'on');
});

test('polling and Auto share a request and Auto responds without awaiting network', async t => {
  const { acc, impl } = accessory(t);
  await nextTurn();
  let calls = 0, resolve;
  impl.client = { getStatus() { calls++; return new Promise(r => { resolve = r; }); } };
  const poll = impl.refreshFromApi();
  const second = impl.refreshFromApi();
  await switchFor(acc, 'auto').handleSetRequest(true);
  assert.equal(calls, 1);
  assert.equal(poll, second);
  resolve({ isHalfMast: true });
  await poll;
  assert.equal(impl.apiStatus.isHalfMast, true);
  impl.client = { getStatus: async () => ({ isHalfMast: false }) };
  await impl.refreshFromApi();
  assert.equal(impl.apiStatus.isHalfMast, false);
});

test('failed refresh preserves last status and allows recovery', async t => {
  const { impl } = accessory(t);
  await nextTurn();
  impl.apiStatus = { isHalfMast: true };
  impl.client = { getStatus: async () => { throw Error('offline'); } };
  await impl.refreshFromApi();
  assert.equal(impl.apiStatus.isHalfMast, true);
  assert.equal(impl.apiFault, true);
  impl.client = { getStatus: async () => ({ isHalfMast: false }) };
  await impl.refreshFromApi();
  assert.equal(impl.apiFault, false);
  assert.equal(impl.apiStatus.isHalfMast, false);
});

test('client sends location and license header and validates response', async t => {
  t.mock.method(global, 'fetch', async (url, options) => {
    assert.equal(url.searchParams.get('countryCode'), 'US');
    assert.equal(url.searchParams.get('stateCode'), 'AZ');
    assert.equal(options.headers['x-mast-license-key'], 'test-key');
    assert.ok(options.signal instanceof AbortSignal);
    return { ok: true, json: async () => ({ ok: true, status: { isHalfMast: true } }) };
  });
  const client = new MastClient('https://example.com', 'test-key', 'US', 'AZ');
  assert.equal((await client.getStatus()).isHalfMast, true);
  global.fetch.mock.mockImplementation(async () => ({ ok: true, json: async () => ({ ok: true, status: {} }) }));
  await assert.rejects(client.getStatus(), /status.isHalfMast/);
});

test('client aborts a stalled request', async t => {
  const keepAlive = setTimeout(() => {}, 1000);
  t.after(() => clearTimeout(keepAlive));
  t.mock.method(global, 'fetch', (url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  }));
  await assert.rejects(new MastClient('https://example.com', 'test', 'US', undefined, 10).getStatus(),
    { name: 'TimeoutError' });
});

test('shutdown clears the polling timer', t => {
  const { api, impl } = accessory(t);
  api.emit('shutdown');
  assert.equal(impl.pollTimer._destroyed, true);
});

test('new services expose meaningful configured names', t => {
  const { acc } = accessory(t);
  const entries = [[acc.getService(hap.Service.ContactSensor), 'Flag Half Staff'],
    ...Object.entries({ auto: 'Automatic', on: 'Force Half Staff', off: 'Force Full Staff' })
      .map(([mode, name]) => [acc.getServiceById(hap.Service.Switch, mode), name])];
  for (const [service, name] of entries) {
    assert.equal(service.getCharacteristic(hap.Characteristic.Name).value, name);
    assert.equal(service.getCharacteristic(hap.Characteristic.ConfiguredName).value, name);
  }
});

test('cached services gain configured names without replacing identities or custom names', t => {
  const { platform } = setup(t);
  const acc = new PlatformAccessory('Mast', hap.uuid.generate('cached-names'));
  acc.context.deviceId = 'cached';
  const contact = acc.addService(hap.Service.ContactSensor, 'Mast');
  const auto = acc.addService(hap.Service.Switch, 'Mast Override Auto', 'auto');
  const on = acc.addService(hap.Service.Switch, 'Mast Override On', 'on');
  const off = acc.addService(hap.Service.Switch, 'Mast Override Off', 'off');
  on.addCharacteristic(hap.Characteristic.ConfiguredName).updateValue('My Flag Override');
  new MastFlagAccessory(platform, acc);
  assert.equal(acc.getService(hap.Service.ContactSensor), contact);
  assert.equal(acc.getServiceById(hap.Service.Switch, 'auto'), auto);
  assert.equal(acc.getServiceById(hap.Service.Switch, 'on'), on);
  assert.equal(acc.getServiceById(hap.Service.Switch, 'off'), off);
  assert.equal(auto.getCharacteristic(hap.Characteristic.ConfiguredName).value, 'Automatic');
  assert.equal(contact.getCharacteristic(hap.Characteristic.ConfiguredName).value, 'Flag Half Staff');
  assert.equal(on.getCharacteristic(hap.Characteristic.ConfiguredName).value, 'My Flag Override');
});
