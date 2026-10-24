import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderLevelRow, setLevelsData, setSearchQuery, renderTree } from '../admin/levels.js';

test('admin/levels.html includes search input for filtering levels', () => {
  const htmlPath = resolve('admin/levels.html');
  const html = readFileSync(htmlPath, 'utf8');

  assert.match(html, /<input[^>]+type=["']search["']/i, 'Search input should be present');
  assert.match(html, /id=["']levels-search["']/i, 'Search input must have id="levels-search"');
  assert.match(html, /placeholder=["'][^"']*Пошук/i, 'Search input should have placeholder in Ukrainian');
});

test('renderLevelRow uses width×depth and allowed commands', () => {
  const lvlWithMetadata = {
    id: 'test-street',
    name: 'Тестова вулиця',
    category: 'basics',
    width: 5,
    depth: 3,
    allowed: ['forward', 'left', 'right', 'light'],
    difficulty: 2
  };

  const rowHtml = renderLevelRow(lvlWithMetadata, { id: 'basics', title: 'Основи' }, [lvlWithMetadata], 0, 0);

  assert.match(rowHtml, /Розмір:\s*5×3/, 'Row should display width×depth formatted as 5×3');
  assert.match(rowHtml, /Команди:\s*forward,\s*left,\s*right,\s*light/, 'Row should display comma-separated allowed commands');
  assert.doesNotMatch(rowHtml, /Розмір:\s*\?/, 'Should not display placeholder ? when width and depth are present');
  assert.doesNotMatch(rowHtml, /Команди:\s*за замовчуванням/, 'Should not fall back to default when allowed is specified');
});

test('renderLevelRow falls back safely when width/depth or allowed are omitted', () => {
  const minimalLvl = {
    id: 'minimal-lvl',
    name: 'Мінімальний рівень'
  };

  const rowHtml = renderLevelRow(minimalLvl, null, [minimalLvl], 0, -1);

  assert.match(rowHtml, /Розмір:\s*\?/, 'Row should fall back to ? when width/depth are missing');
  assert.match(rowHtml, /Команди:\s*за замовчуванням/, 'Row should fall back to default when allowed commands are missing');
});

test('renderTree filters levels by searchQuery in category and orphan groups', () => {
  const origDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');

  const elements = new Map();
  const getEl = (sel) => {
    if (!elements.has(sel)) {
      elements.set(sel, {
        innerHTML: '',
        textContent: '',
        value: '',
        querySelectorAll: () => [],
        querySelector: (s) => getEl(s)
      });
    }
    return elements.get(sel);
  };

  const mockDoc = {
    querySelector: (sel) => getEl(sel),
    querySelectorAll: () => []
  };

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    writable: true,
    value: mockDoc
  });

  try {
    const cats = [{ id: 'basics', title: 'Основи', icon: '✦' }];
    const lvls = [
      { id: 'first-step', name: 'Перший крок', category: 'basics', width: 3, depth: 3, allowed: ['forward'] },
      { id: 'second-turn', name: 'Другий поворот', category: 'basics', width: 4, depth: 4, allowed: ['left'] },
      { id: 'secret-level', name: 'Таємний рівень', category: 'unknown', width: 2, depth: 2, allowed: ['jump'] }
    ];

    setLevelsData(cats, lvls);

    // Filter by name
    setSearchQuery('перший');
    renderTree();
    let treeHtml = getEl('#levels-tree').innerHTML;
    assert.match(treeHtml, /first-step/);
    assert.doesNotMatch(treeHtml, /second-turn/);

    // Filter by id
    setSearchQuery('second-turn');
    renderTree();
    treeHtml = getEl('#levels-tree').innerHTML;
    assert.doesNotMatch(treeHtml, /first-step/);
    assert.match(treeHtml, /second-turn/);

    // Filter matching orphan level
    setSearchQuery('таємний');
    renderTree();
    treeHtml = getEl('#levels-tree').innerHTML;
    assert.match(treeHtml, /secret-level/);
    assert.doesNotMatch(treeHtml, /first-step/);

    // Clear search
    setSearchQuery('');
    renderTree();
    treeHtml = getEl('#levels-tree').innerHTML;
    assert.match(treeHtml, /first-step/);
    assert.match(treeHtml, /second-turn/);
    assert.match(treeHtml, /secret-level/);
  } finally {
    if (origDocument) Object.defineProperty(globalThis, 'document', origDocument);
    else delete globalThis.document;
  }
});
