// Usage: node scratch/levels45/build.mjs [--write]
// Verifies every reference solution (night and day) and optionally writes levels/*.json,
// levels/index.json and tests/fixtures/level-solutions-4-5.json.
import fs from 'node:fs';
import { verify, trace, minUnconditionalBlocks } from './lib.mjs';
import { levels4 as a4 } from './s4.mjs';
import { levels4b } from './s4b.mjs';
import { levels4c } from './s4c.mjs';

// Display order inside section 4 (easy -> hard).
const ORDER4 = [
  'try-vydy-plytok', 'kuda-povernuty', 'kutova-vulytsya-z-iskramy', 'zbyrach-remkomplektiv',
  'reviziya-z-iskramy', 'rozvylka-v-lisi', 'budynok-za-povorotom', 'mist-nad-bezodneyu',
  'shody-zmiykoyu', 'pidkova', 'lampochky-i-remkomplekty', 'kiltsevyy-mistok',
  'zyh-zah-cherez-skver', 'rozvylka-z-ohnyamy', 'pidyom-nad-bezodneyu', 'nichna-zmina',
  'mayak-na-vershyni', 'lisova-stezhka', 'vechirniy-obkhid', 'ispyt-likhtarnyka'
];
const pool4 = [...a4, ...levels4b, ...levels4c];
const levels4 = ORDER4.map((id) => pool4.find((d) => d.id === id) || (() => { throw new Error('missing ' + id); })());
if (pool4.length !== ORDER4.length) throw new Error('section 4 count mismatch: ' + pool4.length);

let levels5 = [];
try {
  ({ levels5 } = await import('./s5.mjs'));
} catch (e) {
  if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
}

const write = process.argv.includes('--write');
const root = new URL('../../', import.meta.url);
const all = [...levels4, ...levels5];
let bad = 0;
const fixtures = {};
const ids = new Set();

for (const d of all) {
  if (ids.has(d.id)) throw new Error(`duplicate id ${d.id}`);
  ids.add(d.id);
  const { level, problems } = verify(d);
  if (problems.length) {
    bad++;
    console.log(`✗ ${d.id}: ${problems.join(' | ')}`);
  } else {
    const nightMin = minUnconditionalBlocks(trace(level, d.solution, 'dark'), d.allowed.includes('loop'));
    const dayMin = minUnconditionalBlocks(trace(level, d.daySolution || d.solution, 'light'), d.allowed.includes('loop'));
    const cheat = nightMin <= d.limit || dayMin <= d.limit;
    if (cheat) bad++;
    console.log(`${cheat ? '✗ CHEAT' : '✓'} ${d.id} (d${d.difficulty}, ${level.width}x${level.depth}, limit ${d.limit}, plain-blocks night ${nightMin} / day ${dayMin})`);
  }
  fixtures[d.id] = { night: d.solution, day: d.daySolution || d.solution };
  d.__level = level;
}

console.log(`\n${all.length - bad}/${all.length} ok`);
if (bad) process.exit(1);

if (write) {
  const idx = JSON.parse(fs.readFileSync(new URL('levels/index.json', root), 'utf8'));
  for (const d of all) {
    fs.writeFileSync(new URL(`levels/${d.id}.json`, root), JSON.stringify(d.__level, null, 2) + '\n');
    if (!idx.includes(d.id)) idx.push(d.id);
  }
  fs.writeFileSync(new URL('levels/index.json', root), JSON.stringify(idx, null, 2) + '\n');
  fs.writeFileSync(
    new URL('tests/fixtures/level-solutions-4-5.json', root),
    JSON.stringify({ section4: levels4.map((d) => d.id), section5: levels5.map((d) => d.id), solutions: fixtures }, null, 1) + '\n'
  );
  console.log('written');
}



