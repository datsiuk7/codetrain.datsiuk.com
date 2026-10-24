import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { findNextLevel, getLevelSections, isLocalHost, renderHome } from '../home.js';

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));

test('renderHome displays minimalist section header for unlocked categories', async () => {
  const [ids, categories] = await Promise.all([
    readJson('../levels/index.json'), readJson('../levels/categories.json')
  ]);
  const levels = await Promise.all(ids.map((id) => readJson(`../levels/${id}.json`)));
  const container = { innerHTML: '' };

  renderHome(container, { levels, categories, done: [], currentTheme: 'dark' });
  assert.ok(container.innerHTML.includes('class="category-header"'));
  assert.ok(container.innerHTML.includes('<h2 class="category-title">1. Основи руху</h2>'));

  // Section 2 is initially locked
  assert.ok(!container.innerHTML.includes('<h2 class="category-title">2. Цикли</h2>'));
  assert.ok(container.innerHTML.includes('Розділ під замком'));
  assert.ok(container.innerHTML.includes('Щоб розблокувати, пройдіть всі попередні рівні'));

  // When Section 1 is finished, Section 2 displays its minimalist header
  const sections = getLevelSections(levels, categories);
  const doneSection1 = sections[0].levels.map((l) => l.id);
  renderHome(container, { levels, categories, done: doneSection1, currentTheme: 'dark' });
  assert.ok(container.innerHTML.includes('<h2 class="category-title">2. Цикли</h2>'));
});

test('next level follows the order shown on the home page and respects locks', async () => {
  const [ids, categories] = await Promise.all([
    readJson('../levels/index.json'), readJson('../levels/categories.json')
  ]);
  const levels = await Promise.all(ids.map((id) => readJson(`../levels/${id}.json`)));
  const sections = getLevelSections(levels, categories);
  const shown = sections.flatMap((section) => section.levels);
  const done = shown.map((level) => level.id);

  const lastInFirst = sections[0].levels.at(-1).id;
  assert.equal(findNextLevel(levels, categories, [], lastInFirst), null);
  assert.equal(findNextLevel(levels, categories, done, lastInFirst)?.id, sections[1]?.levels[0]?.id);

  for (let i = 0; i < shown.length; i++) {
    assert.equal(findNextLevel(levels, categories, done, shown[i].id)?.id, shown[i + 1]?.id);
  }

  const hidden = levels.find((level) => level.id === 'vpered-i-vpered');
  hidden.hidden = true;
  assert.equal(findNextLevel(levels, categories, done, 'poyikhaly')?.id, 'kutyk');
});

test('isLocalHost detects local environments and rejects remote hosts', () => {
  assert.equal(isLocalHost({ hostname: 'localhost', protocol: 'http:' }), true);
  assert.equal(isLocalHost({ hostname: '127.0.0.1', protocol: 'http:' }), true);
  assert.equal(isLocalHost({ hostname: '::1', protocol: 'http:' }), true);
  assert.equal(isLocalHost({ hostname: '[::1]', protocol: 'http:' }), true);
  assert.equal(isLocalHost({ hostname: '', protocol: 'file:' }), true);
  assert.equal(isLocalHost({ hostname: 'codetrain.datsiuk.com', protocol: 'https:' }), false);
  assert.equal(isLocalHost(null), false);
});

test('renderHome renders local completion controls only when isLocal is true', async () => {
  const [ids, categories] = await Promise.all([
    readJson('../levels/index.json'), readJson('../levels/categories.json')
  ]);
  const levels = await Promise.all(ids.map((id) => readJson(`../levels/${id}.json`)));

  const nonLocalContainer = { innerHTML: '' };
  renderHome(nonLocalContainer, { levels, categories, done: [], currentTheme: 'dark', isLocal: false });
  assert.ok(!nonLocalContainer.innerHTML.includes('data-toggle-level='));
  assert.ok(!nonLocalContainer.innerHTML.includes('data-toggle-cat='));
  assert.ok(!nonLocalContainer.innerHTML.includes('data-unlock-cat='));

  const toggledSingle = [];
  const toggledBatch = [];
  const levelBtn = {
    dataset: { toggleLevel: 'poyikhaly' },
    onclick: null
  };
  const catBtn = {
    dataset: { toggleCat: 'basics' },
    onclick: null
  };
  const unlockBtn = {
    dataset: { unlockCat: '1' },
    onclick: null
  };

  const localContainer = {
    innerHTML: '',
    querySelectorAll(sel) {
      if (sel === '[data-toggle-level]') return [levelBtn];
      if (sel === '[data-toggle-cat]') return [catBtn];
      if (sel === '[data-unlock-cat]') return [unlockBtn];
      return [];
    }
  };

  renderHome(localContainer, {
    levels,
    categories,
    done: ['poyikhaly'],
    currentTheme: 'dark',
    isLocal: true,
    onToggleLevel: (id) => toggledSingle.push(id),
    onToggleLevels: (ids, shouldBeDone) => toggledBatch.push({ ids, shouldBeDone })
  });

  assert.ok(localContainer.innerHTML.includes('data-toggle-level="poyikhaly"'));
  assert.ok(localContainer.innerHTML.includes('data-toggle-cat="basics"'));
  assert.ok(localContainer.innerHTML.includes('data-unlock-cat="1"'));

  let defaultPrevented = false;
  let propagationStopped = false;
  levelBtn.onclick({
    preventDefault() { defaultPrevented = true; },
    stopPropagation() { propagationStopped = true; }
  });
  assert.equal(defaultPrevented, true);
  assert.equal(propagationStopped, true);
  assert.deepEqual(toggledSingle, ['poyikhaly']);

  catBtn.onclick({ preventDefault() {} });
  assert.equal(toggledBatch.length, 1);
  assert.equal(toggledBatch[0].shouldBeDone, true);
  assert.ok(toggledBatch[0].ids.includes('poyikhaly'));

  unlockBtn.onclick({ preventDefault() {} });
  assert.equal(toggledBatch.length, 2);
  assert.equal(toggledBatch[1].shouldBeDone, true);
});

test('renderHome automatically collapses category and displays Розділ пройдено when all levels are completed', async () => {
  const [ids, categories] = await Promise.all([
    readJson('../levels/index.json'), readJson('../levels/categories.json')
  ]);
  const levels = await Promise.all(ids.map((id) => readJson(`../levels/${id}.json`)));
  const sections = getLevelSections(levels, categories);
  const container = { innerHTML: '' };

  // 1. None completed: section 1 is open, no completed badge
  renderHome(container, { levels, categories, done: [], currentTheme: 'dark' });
  assert.ok(container.innerHTML.includes('<details class="category-details" open>'));
  assert.ok(!container.innerHTML.includes('category-completed-badge'));
  assert.ok(!container.innerHTML.includes('Розділ пройдено'));

  // 2. All section 1 levels completed: section 1 collapses (no open) and has Розділ пройдено badge
  const doneSection1 = sections[0].levels.map((l) => l.id);
  renderHome(container, { levels, categories, done: doneSection1, currentTheme: 'dark' });
  assert.ok(container.innerHTML.includes('class="category-section is-completed" data-cat="basics"'));
  assert.ok(container.innerHTML.includes('<details class="category-details" >') || container.innerHTML.includes('<details class="category-details"'));
  assert.ok(container.innerHTML.includes('class="category-completed-badge"'));
  assert.ok(container.innerHTML.includes('Розділ пройдено'));

  // 3. Section 2 is now unlocked and open by default
  assert.ok(container.innerHTML.includes('data-cat="loops"'));
  assert.ok(container.innerHTML.includes('<details class="category-details" open>'));

  // 4. English translation: 'Section completed'
  renderHome(container, { levels, categories, done: doneSection1, currentTheme: 'dark', lang: 'en' });
  assert.ok(container.innerHTML.includes('Section completed'));
});

