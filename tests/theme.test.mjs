import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState, step, won, conditionValue, lampCount, getCommandInfo} from '../logic.mjs';

const testLevel = {
  id: 'test-lamp',
  name: 'Тест ліхтаря',
  width: 3,
  depth: 3,
  start: { x: 0, z: 1, dir: 1 },
  allowed: ['forward', 'light'],
  limit: 0,
  cells: [
    [{ height: 0, tree: false, lamp: false }, { height: 0, tree: false, lamp: false }, { height: 0, tree: false, lamp: false }],
    [{ height: 0, tree: false, lamp: false }, { height: 0, tree: false, lamp: true }, { height: 0, tree: false, lamp: false }],
    [{ height: 0, tree: false, lamp: false }, { height: 0, tree: false, lamp: false }, { height: 0, tree: false, lamp: false }]
  ]
};

test('light theme initializes all lamps as lit and unscrewed as empty', () => {
  const l = testLevel;
  const s = initialState(l, 'light');
  assert.equal(s.theme, 'light');
  assert.equal(s.lit.length, lampCount(l));
  assert.equal(s.unscrewed.length, 0);
  assert.equal(won(l, s), false);
});

test('light theme step toggles lamp off and on', () => {
  const l = testLevel;
  let s = initialState(l, 'light');
  s = step(l, s, 'forward'); // on lamp (1, 1)

  // 1st light: turns OFF
  s = step(l, s, 'light');
  assert.equal(s.unscrewed.length, 1);
  assert.equal(s.lit.length, 0);
  assert.ok(won(l, s));

  // 2nd light: toggles back ON
  s = step(l, s, 'light');
  assert.equal(s.lit.length, 1);
  assert.equal(s.unscrewed.length, 0);
  assert.equal(won(l, s), false);

  // 3rd light: toggles back OFF
  s = step(l, s, 'light');
  assert.equal(s.lit.length, 0);
  assert.equal(s.unscrewed.length, 1);
  assert.ok(won(l, s));
});

test('dark vs light command labels and sensors', () => {
  assert.deepEqual(getCommandInfo('light', 'dark'), ['✦', 'Запалити ліхтар']);
  assert.deepEqual(getCommandInfo('light', 'light'), ['💡', 'Вимкнути світло']);

  const l = testLevel;
  let s = initialState(l, 'light');
  s = step(l, s, 'forward'); // on lamp tile (1, 1)
  // Sensor lampLit: true because lamp is still burning
  assert.equal(conditionValue({kind: 'sensor', sensor: 'lampLit', not: false}, l, s, {}), true);
  s = step(l, s, 'light'); // unscrewed/extinguished
  assert.equal(conditionValue({kind: 'sensor', sensor: 'lampLit', not: false}, l, s, {}), false);
  assert.equal(conditionValue({kind: 'sensor', sensor: 'onLamp', not: false}, l, s, {}), true);
});

test('daylight mode styling and 3D scene elements adapt properly in light theme', async () => {
  const { readFile } = await import('node:fs/promises');
  const gameCss = await readFile(new URL('../game.css', import.meta.url), 'utf8');
  const blocksCss = await readFile(new URL('../blocks.css', import.meta.url), 'utf8');
  const styleCss = await readFile(new URL('../style.css', import.meta.url), 'utf8');
  const sceneJs = await readFile(new URL('../scene.js', import.meta.url), 'utf8');

  // 1. Advanced blocks, condition editor, else branch in light theme
  assert.ok(gameCss.includes('[data-theme="light"] .program-panel .advanced-block'));
  assert.ok(blocksCss.includes('[data-theme="light"] .program-panel .advanced-block'));
  assert.ok(gameCss.includes('[data-theme="light"] .program-panel .command-if>.block-head .condition-editor select'));
  assert.ok(gameCss.includes('[data-theme="light"] .else-section'));
  assert.ok(gameCss.includes('[data-theme="light"] .add-else-btn'));
  assert.ok(gameCss.includes('[data-theme="light"] .remove-else-btn'));

  // 2. Loop times contrast in light theme
  assert.ok(gameCss.includes('#5b21b6') && gameCss.includes('[data-theme="light"] .program-panel .loop-times>span'));
  assert.ok(blocksCss.includes('#5b21b6') && blocksCss.includes('[data-theme="light"] .program-panel .loop-times>span'));

  // 3. Drag & drop receiving and floating in style.css, compact blocks
  assert.ok(styleCss.includes('[data-theme="light"] .program.receiving'));
  assert.ok(styleCss.includes('[data-theme="light"] .drag-floating'));
  assert.ok(gameCss.includes('[data-theme="light"] .program-panel.compact-blocks .block'));
  assert.ok(gameCss.includes('[data-theme="light"] .program-panel .program:not(:empty)::after'));

  // 4. Speed button and function cards
  assert.ok(gameCss.includes('[data-theme="light"] .speed-btn'));
  assert.ok(gameCss.includes('[data-theme="light"] .function-card'));
  assert.ok(styleCss.includes('[data-theme="light"] .function-card'));

  // 5. Command pastel accents in palette
  assert.ok(gameCss.includes('color-mix(in srgb, var(--command-color, #73c6bb) 14%, #ffffff)'));

  // 6. 3D Scene daylight tiles, trees, and chimney smoke
  assert.ok(sceneJs.includes('tileColor=isLight'));
  assert.ok(sceneJs.includes('tileTopColor=isLight'));
  assert.ok(sceneJs.includes("isLight?'#7a5f4a':'#685549'"));
  assert.ok(sceneJs.includes("isLight?'#94a3b8':'#eef2f5'"));

  // 7. 3D Scene shadow frustum projection update, contact shadow, and above-ground camera tilt clamp
  assert.ok(sceneJs.includes('mainLight.shadow.camera.updateProjectionMatrix()'));
  assert.ok(sceneJs.includes('mainLight.shadow.bias'));
  assert.ok(sceneJs.includes('this.contactShadow'));
  assert.ok(sceneJs.includes('Math.max(0.22,Math.min(1.42,this.tilt'));

  // 8. Non-conflicting sunrise/nightfall shimmer selectors
  assert.ok(styleCss.includes('body.theme-shimmer:not(.theme-shimmer-to-dark)::before'));
  assert.ok(styleCss.includes('body.theme-shimmer:not(.theme-shimmer-to-light)::before'));
});


