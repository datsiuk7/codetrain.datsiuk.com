// Run: node --experimental-test-module-mocks --test --test-isolation=none tests/theme-transition.test.mjs
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('style.css defines 2s shimmering background animation and makes blocks transparent during transition', async () => {
  const css = await readFile(new URL('../style.css', import.meta.url), 'utf8');

  // Verify body background transition of 2s
  assert.ok(
    css.includes('transition: background-color 2s') || css.includes('transition:background-color 2s'),
    'body must have a 2-second background-color transition'
  );

  // Verify transparent blocks during theme-shimmer
  assert.ok(
    css.includes('body.theme-shimmer .level-card') &&
    css.includes('body.theme-shimmer .hero') &&
    css.includes('body.theme-shimmer .world') &&
    css.includes('body.theme-shimmer .program-panel'),
    'Must target white and dark blocks during theme-shimmer'
  );
  assert.ok(
    css.includes('background-color: transparent !important'),
    'Blocks must become transparent during theme transition'
  );

  // Verify simplified shimmer animation and directional keyframes (sunrise bottom-to-top, nightfall top-to-bottom)
  assert.ok(css.includes('body.theme-shimmer::before'), 'Must define body.theme-shimmer::before for background shimmer');
  assert.ok(
    (css.includes('themeSunriseRise 2s') || css.includes('themeShimmerBottomToTop 2s')) &&
    (css.includes('themeNightfallDescend 2s') || css.includes('themeShimmerTopToBottom 2s')),
    'Directional shimmer animations must be 2s duration'
  );
  assert.ok(css.includes('@keyframes themeSunriseRise'), 'Must define @keyframes themeSunriseRise');
  assert.ok(css.includes('@keyframes themeNightfallDescend'), 'Must define @keyframes themeNightfallDescend');

  // Verify accessibility / reduced motion
  assert.ok(css.includes('prefers-reduced-motion: reduce'), 'Must respect prefers-reduced-motion');
});

test('app.js triggers theme-shimmer on body and documentElement for 2 seconds on theme toggle', async () => {
  const nodes = new Map();
  const node = (selector) => {
    if (!nodes.has(selector)) {
      const classSet = new Set();
      nodes.set(selector, {
        style: { setProperty() {} },
        classList: {
          add: (...cls) => cls.forEach((c) => classSet.add(c)),
          remove: (...cls) => cls.forEach((c) => classSet.delete(c)),
          contains: (c) => classSet.has(c)
        },
        setAttribute() {},
        append() {},
        remove() {},
        scrollIntoView() {},
        querySelector: node,
        querySelectorAll: () => [],
        innerHTML: '',
        disabled: false
      });
    }
    return nodes.get(selector);
  };

  const storage = new Map();
  const listeners = new Map();

  mock.module('../music.js', {
    exports: {
      setupMusic() {},
      setupEffects: () => ({ win() {}, click() {}, step() {} })
    }
  });

  const globals = {
    document: {
      querySelector: node,
      querySelectorAll: () => [],
      body: node('body'),
      documentElement: node('html'),
      createElement: () => node('confetti'),
      addEventListener: (name, fn) => listeners.set(name, fn)
    },
    localStorage: {
      getItem: (k) => storage.get(k) ?? null,
      setItem: (k, v) => storage.set(k, v)
    },
    location: { hash: '' },
    window: { addEventListener: (name, fn) => listeners.set(name, fn) },
    fetch: async () => ({
      ok: true,
      json: async () => []
    })
  };

  const originals = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }

  try {
    // Clear cache if previously imported
    await import(`../app.js?test=${Date.now()}`);

    const themeBtn = node('#theme');
    const body = node('body');
    const html = node('html');

    assert.ok(typeof themeBtn.onclick === 'function', 'Theme button must have an onclick handler');

    // Click theme button to switch from dark to light
    themeBtn.onclick();

    // Verify theme-shimmer and theme-shimmer-to-light are added
    assert.equal(body.classList.contains('theme-shimmer'), true, 'body must receive theme-shimmer class');
    assert.equal(html.classList.contains('theme-shimmer'), true, 'html must receive theme-shimmer class');
    assert.equal(body.classList.contains('theme-shimmer-to-light'), true, 'body must receive theme-shimmer-to-light class');
    assert.equal(html.classList.contains('theme-shimmer-to-light'), true, 'html must receive theme-shimmer-to-light class');

    // Fast-forward 2 seconds
    await new Promise((resolve) => setTimeout(resolve, 2050));

    // Verify theme-shimmer is removed after 2s
    assert.equal(body.classList.contains('theme-shimmer'), false, 'body must have theme-shimmer removed after 2 seconds');
    assert.equal(html.classList.contains('theme-shimmer'), false, 'html must have theme-shimmer removed after 2 seconds');
    assert.equal(body.classList.contains('theme-shimmer-to-light'), false, 'body must have theme-shimmer-to-light removed after 2 seconds');

    // Click theme button to switch from light to dark
    themeBtn.onclick();

    // Verify theme-shimmer and theme-shimmer-to-dark are added
    assert.equal(body.classList.contains('theme-shimmer'), true, 'body must receive theme-shimmer class');
    assert.equal(html.classList.contains('theme-shimmer'), true, 'html must receive theme-shimmer class');
    assert.equal(body.classList.contains('theme-shimmer-to-dark'), true, 'body must receive theme-shimmer-to-dark class');
    assert.equal(html.classList.contains('theme-shimmer-to-dark'), true, 'html must receive theme-shimmer-to-dark class');

    // Fast-forward 2 seconds
    await new Promise((resolve) => setTimeout(resolve, 2050));

    // Verify theme-shimmer is removed after 2s
    assert.equal(body.classList.contains('theme-shimmer'), false, 'body must have theme-shimmer removed after 2 seconds');
    assert.equal(html.classList.contains('theme-shimmer'), false, 'html must have theme-shimmer removed after 2 seconds');
    assert.equal(body.classList.contains('theme-shimmer-to-dark'), false, 'body must have theme-shimmer-to-dark removed after 2 seconds');
  } finally {
    for (const [key, descriptor] of originals) {
      if (descriptor) {
        Object.defineProperty(globalThis, key, descriptor);
      } else {
        delete globalThis[key];
      }
    }
  }
});
