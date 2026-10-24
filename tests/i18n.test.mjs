import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  getLang,
  setLang,
  t,
  getCategoryTitle,
  getLevelName,
  getHintText
} from '../i18n.mjs';
import {
  getCommandInfo,
  getSensors,
  getLevelDescription,
  renderDifficultyStars,
  validateLevel
} from '../logic.mjs';
import { validateHints } from '../hint-data.mjs';
import { setupGameHints } from '../game-hints.js';
import { renderHintEditor } from '../admin/hint-editor.js';
import { createFreshLevel } from '../admin/level-state.js';

test('i18n getLang and setLang switch between uk and en and translate UI strings', () => {
  const prev = getLang();
  try {
    setLang('en');
    assert.equal(getLang(), 'en');
    assert.equal(t('brandName'), 'lamplighter');
    assert.equal(t('runBtn'), 'Run');
    assert.equal(getCategoryTitle({ id: 'conditions', title: '3. Умови' }), '3. Conditions');
    assert.equal(getLevelName({ name: 'Перше «якщо»', nameEn: 'First "If"' }), 'First "If"');
    assert.equal(getLevelName({ name: 'Без перекладу', nameEn: '' }), 'Без перекладу');
    assert.equal(getHintText({ text: 'Укр підказка', textEn: 'English hint' }), 'English hint');

    setLang('uk');
    assert.equal(getLang(), 'uk');
    assert.equal(t('brandName'), 'ліхтарник');
    assert.equal(t('runBtn'), 'Запустити');
    assert.equal(getCategoryTitle({ id: 'conditions', title: '3. Умови' }), '3. Умови');
    assert.equal(getLevelName({ name: 'Перше «якщо»', nameEn: 'First "If"' }), 'Перше «якщо»');
    assert.equal(getHintText({ text: 'Укр підказка', textEn: 'English hint' }), 'Укр підказка');
  } finally {
    setLang(prev);
  }
});

test('logic helpers return localized command names, sensors, descriptions and difficulty stars for en', () => {
  assert.deepEqual(getCommandInfo('forward', 'dark', 'en'), ['↑', 'Forward']);
  assert.deepEqual(getCommandInfo('light', 'dark', 'en'), ['✦', 'Light lantern']);
  assert.deepEqual(getCommandInfo('light', 'light', 'en'), ['💡', 'Turn off light']);
  assert.equal(getSensors('en').obstacleAhead, 'Obstacle ahead');
  assert.equal(getSensors('uk').obstacleAhead, 'Попереду перешкода');

  const level = {
    descriptionNight: 'Запали ліхтарі',
    descriptionNightEn: 'Light the streetlamps',
    descriptionDay: 'Вимкни ліхтарі',
    descriptionDayEn: 'Turn off the streetlamps'
  };
  assert.equal(getLevelDescription(level, 'dark', 'en'), 'Light the streetlamps');
  assert.equal(getLevelDescription(level, 'light', 'en'), 'Turn off the streetlamps');
  assert.equal(getLevelDescription(level, 'dark', 'uk'), 'Запали ліхтарі');

  const starsEn = renderDifficultyStars(3, 'en');
  assert.match(starsEn, /Difficulty: Medium \(3\/5\)/);
  const starsUk = renderDifficultyStars(3, 'uk');
  assert.match(starsUk, /Складність: Середня \(3\/5\)/);
});

test('validateLevel and validateHints accept English level and hint fields', () => {
  const level = createFreshLevel();
  level.id = 'test-level';
  level.category = 'basics';
  level.name = 'Тест';
  level.nameEn = 'Test';
  level.descriptionNight = 'Ніч';
  level.descriptionNightEn = 'Night';
  level.descriptionDay = 'День';
  level.descriptionDayEn = 'Day';
  level.cells[0][0].lamp = true;
  level.hints = [{ text: 'Крок 1', textEn: 'Step 1', target: 'palette' }];

  assert.deepEqual(validateLevel(level), []);
  assert.equal(validateHints(level.hints, level.allowed), null);
});

test('setupGameHints displays English hint text and button labels when lang is en', () => {
  const prevLang = getLang();
  const previousStorage = globalThis.sessionStorage;
  const values = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  const nodes = new Map();
  const node = (selector) => {
    if (!nodes.has(selector)) {
      const classes = new Set();
      nodes.set(selector, {
        hidden: true,
        classList: {
          add: (name) => classes.add(name),
          remove: (name) => classes.delete(name),
          contains: (name) => classes.has(name)
        },
        scrollIntoView() {}
      });
    }
    return nodes.get(selector);
  };
  const container = { querySelector: node };
  const level = {
    id: 'en-hint-test',
    allowed: ['forward'],
    hints: [{ text: 'Крок уперед', textEn: 'Step forward', target: 'command:forward' }]
  };

  try {
    setLang('en');
    const help = setupGameHints(container, level);
    assert.equal(node('#help-text').textContent, 'Step forward');
    assert.equal(node('#help-next').textContent, 'Done');
    assert.match(node('#help-count').textContent, /1\s*\/\s*1/);
    help.close();
  } finally {
    setLang(prevLang);
    if (previousStorage === undefined) delete globalThis.sessionStorage;
    else globalThis.sessionStorage = previousStorage;
  }
});

test('renderHintEditor supports editing English hint translation textEn', () => {
  const previousDocument = globalThis.document;
  const previousOption = globalThis.Option;
  const element = () => ({
    children: [],
    append(...children) { this.children.push(...children); },
    replaceChildren() { this.children = []; },
    add(option) { this.children.push(option); }
  });
  globalThis.document = { createElement: element };
  globalThis.Option = function Option(name, value) { return { name, value }; };
  try {
    const host = element();
    let saved = null;
    renderHintEditor(host, [{ text: 'Укр', textEn: 'Init EN', target: 'palette' }], {
      onChange: (next) => { saved = next; }
    });
    const textEn = host.children[0].children[2];
    assert.equal(textEn.value, 'Init EN');
    textEn.value = 'Updated EN';
    textEn.onchange();
    assert.equal(saved[0].textEn, 'Updated EN');
    assert.equal(saved[0].text, 'Укр');
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousOption === undefined) delete globalThis.Option;
    else globalThis.Option = previousOption;
  }
});

test('index.html has UA/EN language switcher and admin/index.html has English level fields while staying in Ukrainian', () => {
  const indexHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(indexHtml, /id="lang-switcher"/);
  assert.match(indexHtml, /id="lang-uk"/);
  assert.match(indexHtml, /id="lang-en"/);

  const adminHtml = fs.readFileSync(new URL('../admin/index.html', import.meta.url), 'utf8');
  assert.match(adminHtml, /<html lang="uk">/);
  assert.match(adminHtml, /id="nameEn"/);
  assert.match(adminHtml, /id="descriptionNightEn"/);
  assert.match(adminHtml, /id="descriptionDayEn"/);
});

test('section 3 jump levels cannot be cheated by spamming jump without conditions', async () => {
  const { initialState, step } = await import('../logic.mjs');
  const jumpLevels = [
    'kamyani-skhodynky',
    'cherez-pahorby',
    'korobky-na-mostu',
    'skhody-do-mayaka',
    'ostrivtsi-v-tumani'
  ];

  for (const id of jumpLevels) {
    const lvl = JSON.parse(fs.readFileSync(new URL(`../levels/${id}.json`, import.meta.url), 'utf8'));
    let s = initialState(lvl, 'dark');
    let crashed = false;
    try {
      for (let i = 0; i < 8; i++) {
        s = step(lvl, s, 'jump');
      }
    } catch {
      crashed = true;
    }
    assert.equal(crashed, true, `Level ${id} should reject blind jump spamming without conditions`);
  }
});

