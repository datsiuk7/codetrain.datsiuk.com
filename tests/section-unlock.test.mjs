import test from 'node:test';
import assert from 'node:assert/strict';
import { isCatUnlocked, isOptionalLevel, findNewlyUnlockedSection, findNextLevel } from '../home.js';

const sections = [
  { id: 'a', levels: [{ id: 'a1', difficulty: 1 }, { id: 'a2', difficulty: 3 }, { id: 'a3', difficulty: 4 }, { id: 'a4', difficulty: 5 }] },
  { id: 'b', levels: [{ id: 'b1', difficulty: 2 }, { id: 'b2' }] },
  { id: 'c', levels: [{ id: 'c1', difficulty: 5 }] },
  { id: 'd', levels: [{ id: 'd1', difficulty: 1 }] }
];

test('4–5 star levels are optional, missing difficulty counts as 1 star', () => {
  assert.deepEqual(sections[0].levels.map(isOptionalLevel), [false, false, true, true]);
  assert.equal(isOptionalLevel({ id: 'x' }), false);
});

test('a section unlocks once every 1–3 star level before it is done', () => {
  assert.equal(isCatUnlocked(1, sections, ['a1']), false);
  assert.equal(isCatUnlocked(1, sections, ['a1', 'a2']), true);
  assert.equal(isCatUnlocked(2, sections, ['a1', 'a2', 'b1']), false);
  assert.equal(isCatUnlocked(2, sections, ['a1', 'a2', 'b1', 'b2']), true);
});

test('a section of only bonus levels does not block the next one', () => {
  assert.equal(isCatUnlocked(3, sections, ['a1', 'a2', 'b1', 'b2']), true);
});

test('findNewlyUnlockedSection reports the section the last win opened', () => {
  assert.equal(findNewlyUnlockedSection(sections, ['a1'], ['a1', 'a2'])?.id, 'b');
  assert.equal(findNewlyUnlockedSection(sections, ['a1', 'a2'], ['a1', 'a2', 'a3']), null);
  assert.equal(findNewlyUnlockedSection(sections, ['a1'], ['a1', 'a3']), null);
  assert.equal(findNewlyUnlockedSection(sections, ['a1', 'a2', 'b1'], ['a1', 'a2', 'b1', 'b2'])?.id, 'c');
});

test('the next level after a section crosses over even with bonus levels left', () => {
  const levels = sections.flatMap((s) => s.levels.map((l) => ({ ...l, category: s.id })));
  const categories = sections.map(({ id }) => ({ id }));
  assert.equal(findNextLevel(levels, categories, ['a1', 'a2'], 'a4')?.id, 'b1');
  assert.equal(findNextLevel(levels, categories, ['a1'], 'a4'), null);
});
