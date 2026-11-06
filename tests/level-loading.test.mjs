// Run: node --experimental-test-module-mocks --test --test-isolation=none tests/level-loading.test.mjs
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

const makeLevel = (id) => ({
  id, name: id, description: '', category: 'basics', width: 2, depth: 2,
  start: { x: 0, z: 0, dir: 0 }, allowed: ['light'], limit: 0,
  cells: Array.from({ length: 2 }, (_, z) => Array.from({ length: 2 }, (_, x) =>
    ({ height: 0, tree: false, lamp: x === 0 && z === 0 })))
});

// Boots app.js against a fake browser and returns what it fetched and reported to the loading screen.
async function bootApp({ hostname, files }) {
  const nodes = new Map();
  const node = (selector) => {
    if (!nodes.has(selector)) nodes.set(selector, {
      style: { setProperty() {} },
      classList: { add() {}, remove() {}, contains: () => false },
      setAttribute() {}, append() {}, remove() {}, scrollIntoView() {},
      querySelector: node, querySelectorAll: () => [], innerHTML: '', disabled: false
    });
    return nodes.get(selector);
  };
  const storage = new Map();
  const requested = [];
  const boot = { expected: [], done: 0 };
  mock.module('../music.js', { exports: { setupMusic() {}, setupEffects: () => ({}) } });
  // Only the home page renders here; keeping the real runner (and scene) out of the module cache
  // lets later tests mock them.
  mock.module('../runner.js', { exports: { startGame: () => () => {} } });
  const globals = {
    document: {
      querySelector: node, querySelectorAll: () => [], body: node('body'), documentElement: node('html'),
      createElement: () => node('el'), addEventListener() {}
    },
    localStorage: { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) },
    location: { hash: '', hostname, protocol: 'https:' },
    window: {
      addEventListener() {},
      lamplighterBoot: { expect: (n) => boot.expected.push(n), done: () => { boot.done++; } }
    },
    fetch: async (url) => {
      requested.push(url);
      const name = url.split('/').pop();
      return name in files
        ? { ok: true, json: async () => files[name] }
        : { ok: false, json: async () => { throw new Error('404'); } };
    }
  };
  const originals = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  try {
    await import(`../app.js?loading=${hostname}-${Date.now()}`);
    for (let i = 0; i < 5; i++) await new Promise((resolve) => setImmediate(resolve));
    return { requested, boot, html: node('#app').innerHTML };
  } finally {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
    mock.restoreAll();
  }
}

test('the published site loads every level from the single all.json bundle', async () => {
  const { requested, boot, html } = await bootApp({
    hostname: 'codetrain.datsiuk.com',
    files: { 'settings.json': {}, 'categories.json': [{ id: 'basics' }], 'all.json': [makeLevel('first'), makeLevel('second')] }
  });
  assert.ok(requested.includes('./levels/all.json'));
  assert.ok(!requested.some((url) => url.endsWith('index.json') || url.endsWith('first.json')), 'no per-level requests');
  assert.match(html, /href="#level=first"/);
  assert.match(html, /href="#level=second"/);
  assert.equal(boot.done, 1, 'the loading screen is told the game is ready');
});

test('locally the game skips the bundle and loads levels one by one, reporting them to the loading screen', async () => {
  const { requested, boot, html } = await bootApp({
    hostname: 'localhost',
    files: { 'settings.json': {}, 'categories.json': [{ id: 'basics' }], 'index.json': ['first'], 'first.json': makeLevel('first') }
  });
  assert.ok(!requested.includes('./levels/all.json'));
  assert.ok(requested.includes('./levels/first.json'));
  assert.deepEqual(boot.expected, [1]);
  assert.match(html, /href="#level=first"/);
  assert.equal(boot.done, 1);
});

test('a broken level list still hides the loading screen and shows the error', async () => {
  const { boot, html } = await bootApp({ hostname: 'localhost', files: {} });
  assert.equal(boot.done, 1);
  assert.match(html, /Не вдалося завантажити рівні/);
});
