import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  validateLevel,
  validateProgram,
  initialState,
  step,
  won,
  executeProgram
} from '../logic.mjs';

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const fixture = await readJson('./fixtures/level-solutions-4-5.json');
const index = await readJson('../levels/index.json');

function play(level, program, theme) {
  validateProgram(level, program, []);
  let state = initialState(level, theme);
  for (const block of executeProgram(level, program, [], () => state)) {
    if (block.control) continue;
    state = step(level, state, block.type);
    if (won(level, state)) return true;
  }
  return false;
}

const sections = [
  { name: 'section 4', category: 'functions', ids: fixture.section4 },
  { name: 'section 5', category: 'lists', ids: fixture.section5 }
];

for (const { name, category, ids } of sections) {
  test(`${name} has 20 unique levels registered in index.json`, () => {
    assert.equal(ids.length, 20);
    assert.equal(new Set(ids).size, 20);
    for (const id of ids) assert.ok(index.includes(id), `${id} missing from index.json`);
  });

  for (const id of ids) {
    test(`${name}: level ${id} is valid and solvable at night and by day`, async () => {
      const level = await readJson(`../levels/${id}.json`);
      assert.equal(level.id, id);
      assert.equal(level.category, category);
      assert.deepEqual(validateLevel(level), []);
      assert.ok(level.nameEn && level.descriptionEn, 'English texts are required');
      const { night, day } = fixture.solutions[id];
      assert.equal(play(level, night, 'dark'), true, 'night solution must win');
      assert.equal(play(level, day, 'light'), true, 'day solution must win');
    });
  }
}

test('sections 4 and 5 levels require conditions or while loops (no trivial flat solution)', async () => {
  for (const id of fixture.section5) {
    const level = await readJson(`../levels/${id}.json`);
    assert.ok(level.allowed.includes('while'), `${id} must allow while`);
  }
  for (const id of fixture.section4) {
    const level = await readJson(`../levels/${id}.json`);
    assert.ok(level.allowed.includes('if'), `${id} must allow if`);
  }
});
