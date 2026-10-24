// Usage: node scratch/levels45/build6.mjs [--write]
import fs from 'node:fs';
import { verify6 } from './lib6.mjs';
import { levels6 } from './s6.mjs';

const write = process.argv.includes('--write');
const root = new URL('../../', import.meta.url);
let bad = 0;
const ids = new Set();
const fixtures = {};
for (const d of levels6) {
  if (ids.has(d.id)) throw new Error(`duplicate id ${d.id}`);
  ids.add(d.id);
  let r;
  try {
    r = verify6(d);
  } catch (e) {
    bad++;
    console.log(`✗ ${d.id}: ${e.message}`);
    continue;
  }
  if (r.problems.length) {
    bad++;
    console.log(`✗ ${d.id}: ${r.problems.join(' | ')}`);
  } else {
    console.log(`✓ ${d.id} (d${d.difficulty}, ${r.level.width}x${r.level.depth}, limit ${d.limit}, used ${r.total}, inline ${r.inlined}${r.plain ? ', loops-only ' + r.plain : ''})`);
  }
  d.__level = r.level;
  fixtures[d.id] = {
    night: { program: d.solution, functions: d.functions },
    day: { program: d.daySolution || d.solution, functions: d.dayFunctions || d.functions }
  };
}
console.log(`\n${levels6.length - bad}/${levels6.length} ok`);
if (bad) process.exit(1);

if (write) {
  const idx = JSON.parse(fs.readFileSync(new URL('levels/index.json', root), 'utf8'));
  for (const d of levels6) {
    fs.writeFileSync(new URL(`levels/${d.id}.json`, root), JSON.stringify(d.__level, null, 2) + '\n');
    if (!idx.includes(d.id)) idx.push(d.id);
  }
  fs.writeFileSync(new URL('levels/index.json', root), JSON.stringify(idx, null, 2) + '\n');
  fs.writeFileSync(
    new URL('tests/fixtures/level-solutions-6.json', root),
    JSON.stringify({ section6: levels6.map((d) => d.id), solutions: fixtures }, null, 1) + '\n'
  );
  console.log('written');
}
