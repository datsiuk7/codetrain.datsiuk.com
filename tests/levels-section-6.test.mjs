import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  validateLevel,
  validateProgram,
  initialState,
  step,
  won,
  executeProgram,
  blockCount
} from '../logic.mjs';

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const fixture = await readJson('./fixtures/level-solutions-6.json');
const index = await readJson('../levels/index.json');
const categories = await readJson('../levels/categories.json');

function play(level, { program, functions }, theme) {
  validateProgram(level, program, functions);
  let state = initialState(level, theme);
  for (const block of executeProgram(level, program, functions, () => state)) {
    if (block.control) continue;
    state = step(level, state, block.type);
    if (won(level, state)) return true;
  }
  return false;
}

function inlineCount(program, functions) {
  const byId = new Map(functions.map((f) => [f.id, f]));
  const size = (list) =>
    list.reduce((n, b) => {
      if (b.type === 'call') return n + size(byId.get(b.functionId).body);
      let own = 1;
      for (const child of [b.body, b.elseBody, ...(b.branches || []).map((br) => br.body)]) {
        if (Array.isArray(child)) own += size(child);
      }
      return n + own;
    }, 0);
  return size(program);
}

test('section 6 has 20 unique levels registered in index.json', () => {
  assert.equal(fixture.section6.length, 20);
  assert.equal(new Set(fixture.section6).size, 20);
  for (const id of fixture.section6) assert.ok(index.includes(id), `${id} missing from index.json`);
});

for (const id of fixture.section6) {
  test(`section 6: level ${id} is valid, needs functions and is solvable at night and by day`, async () => {
    const level = await readJson(`../levels/${id}.json`);
    assert.equal(level.id, id);
    assert.ok(categories.some((c) => c.id === level.category && c.title.startsWith('6.')));
    assert.ok(level.allowed.includes('call'));
    assert.deepEqual(validateLevel(level), []);
    assert.ok(level.nameEn && level.descriptionEn, 'English texts are required');

    const { night, day } = fixture.solutions[id];
    assert.equal(play(level, night, 'dark'), true, 'night solution must win');
    assert.equal(play(level, day, 'light'), true, 'day solution must win');

    // The same program without functions (every call expanded) must not fit the block limit.
    assert.ok(inlineCount(night.program, night.functions) > level.limit, 'functions must be needed');
    assert.ok(blockCount(night.program) + night.functions.reduce((n, f) => n + blockCount(f.body), 0) <= level.limit);
  });
}
