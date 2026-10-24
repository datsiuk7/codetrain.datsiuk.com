// Helpers for generating and verifying levels of sections 4 and 5.
import { validateLevel, validateProgram, initialState, step, won, executeProgram, conditionValue } from '../../logic.mjs';

let uid = 0;
const blk = (type, extra = {}) => ({ id: `b${++uid}`, type, ...extra });

export const F = () => blk('forward');
export const L = () => blk('left');
export const R = () => blk('right');
export const J = () => blk('jump');
export const Li = () => blk('light');
export const Tk = () => blk('take');
export const Fx = () => blk('fix');

export const cond = (s) => {
  const not = s.startsWith('!');
  return { kind: 'sensor', sensor: not ? s.slice(1) : s, not };
};
export const loop = (n, ...body) => blk('loop', { times: n, body });
export const wh = (c, ...body) => blk('while', { condition: cond(c), body });
// iff('cond', [then...], { elif: [['cond', [body...]]], else: [body...] })
export const iff = (c, then, { elif = [], else: e } = {}) =>
  blk('if', {
    branches: [{ condition: cond(c), body: then }, ...elif.map(([c2, b]) => ({ condition: cond(c2), body: b }))],
    ...(e ? { elseBody: e } : {})
  });

/**
 * Map legend (one char = one tile):
 *  .  floor        @  start (floor)   _  hole
 *  T  tree   B  bush   R  rock   X  box
 *  L  lamp   l  lamp already lit   S  sparking lamp   O  lamp without bulb
 *  K  repair kit   U  spare bulb
 *  ^ > v <  house whose door faces N / E / S / W
 * Optional `heights` rows: digits 0..5 (default 0).
 */
export function buildCells(map, heights) {
  return map.map((row, z) =>
    [...row].map((ch, x) => {
      if (ch === '_') return null;
      const c = {
        height: heights ? Number(heights[z][x]) : 0,
        tree: ch === 'T',
        lamp: 'LlSO'.includes(ch),
        house: '^>v<'.includes(ch),
        bulb: ch === 'U',
        kit: ch === 'K',
        spark: ch === 'S',
        lit: ch === 'l',
        needsBulb: ch === 'O',
        bush: ch === 'B',
        rock: ch === 'R',
        box: ch === 'X'
      };
      if (c.house) c.dir = { '^': 0, '>': 1, v: 2, '<': 3 }[ch];
      return c;
    })
  );
}

export function buildLevel(d) {
  const width = d.map[0].length;
  const depth = d.map.length;
  for (const row of d.map) if (row.length !== width) throw new Error(`${d.id}: rows have different lengths`);
  if (d.heights) {
    if (d.heights.length !== depth) throw new Error(`${d.id}: heights depth mismatch`);
    for (const row of d.heights) if (row.length !== width) throw new Error(`${d.id}: heights width mismatch`);
  }
  const [sx, sz, sdir] = d.start;
  const level = {
    id: d.id,
    name: d.name,
    description: d.description,
    descriptionNight: d.night,
    descriptionDay: d.day,
    category: d.category,
    difficulty: d.difficulty,
    width,
    depth,
    start: { x: sx, z: sz, dir: sdir },
    allowed: d.allowed,
    allowElif: d.elif ?? false,
    allowElse: d.else ?? false,
    allowedSensors: d.sensors,
    hints: d.hints,
    limit: d.limit,
    repairKits: d.kits ?? 0,
    cells: buildCells(d.map, d.heights),
    nameEn: d.nameEn,
    descriptionNightEn: d.nightEn,
    descriptionEn: d.descriptionEn,
    descriptionDayEn: d.dayEn
  };
  return level;
}

export function run(level, program, theme) {
  let state = initialState(level, theme);
  const readState = () => state;
  try {
    validateProgram(level, program, []);
    for (const b of executeProgram(level, program, [], readState)) {
      if (b.control) continue;
      state = step(level, state, b.type);
      if (won(level, state)) return { ok: true };
    }
    return { ok: false, error: 'Програма завершилась без перемоги' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export function verify(d) {
  const level = buildLevel(d);
  const problems = validateLevel(level);
  const night = run(level, d.solution, 'dark');
  if (!night.ok) problems.push(`night solution failed: ${night.error}`);
  const dayProgram = d.daySolution || d.solution;
  const day = run(level, dayProgram, 'light');
  if (!day.ok) problems.push(`day solution failed: ${day.error}`);
  return { level, problems };
}

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

/**
 * Builds a snake-like route and returns { map, heights, start }.
 *  w, d       - field size
 *  start      - [x, z, dir] (dir: 0 N, 1 E, 2 S, 3 W)
 *  segs       - [[null, len], ['R', len], ['L', len], ...] (turn is applied before the segment)
 *  items      - one char per step of the route (see legend in buildCells); 'H' = house with door facing the route
 *  block      - what stops the route at a segment end: 'T' | 'B' | 'R' | '_' (hole) | 'h' (tile 2 levels higher/lower)
 *  endBlock   - also block the cell after the last segment
 *  fill       - what to put on remaining tiles: 'decor' | '.' | '_'
 *  heights    - optional array of heights, one per step (start height in `startHeight`)
 *  decor      - extra [x, z, ch] to force
 */
export function snake({ w, d, start, segs, items, block = 'T', endBlock = false, fill = 'decor', heights = null, startHeight = 0, decor = [] }) {
  const [sx, sz, sdir] = start;
  const grid = Array.from({ length: d }, () => Array(w).fill(null)); // null = untouched
  const hgrid = Array.from({ length: d }, () => Array(w).fill(0));
  const inside = (x, z) => x >= 0 && x < w && z >= 0 && z < d;
  const path = [];
  let [x, z, dir] = [sx, sz, sdir];
  grid[z][x] = '@';
  hgrid[z][x] = startHeight;
  const blockers = [];
  const place = (bx, bz, ch, h) => {
    if (!inside(bx, bz)) return;
    if (grid[bz][bx] !== null && grid[bz][bx] !== ch) throw new Error(`snake: conflict at ${bx},${bz}`);
    if (grid[bz][bx] === null) blockers.push([bx, bz, ch, h]);
    grid[bz][bx] = ch;
  };
  const blockerFor = (curH) => (block === 'h' ? (curH + 2 <= 5 ? curH + 2 : curH - 2) : null);
  let step = 0;
  segs.forEach(([turn, len], si) => {
    if (turn === 'R') dir = (dir + 1) % 4;
    if (turn === 'L') dir = (dir + 3) % 4;
    for (let i = 0; i < len; i++) {
      x += DIRS[dir][0];
      z += DIRS[dir][1];
      if (!inside(x, z)) throw new Error(`snake: path leaves field at step ${step}`);
      if (grid[z][x] !== null) throw new Error(`snake: path crosses itself at ${x},${z}`);
      let ch = items[step] ?? '.';
      if (ch === 'H') ch = '^>v<'[(dir + 2) % 4];
      grid[z][x] = ch;
      hgrid[z][x] = heights ? heights[step] : 0;
      path.push([x, z, ch, hgrid[z][x]]);
      step++;
    }
    const last = si === segs.length - 1;
    const curH = hgrid[z][x];
    const next = segs[si + 1];
    if (!last || endBlock) {
      const bx = x + DIRS[dir][0];
      const bz = z + DIRS[dir][1];
      const bh = blockerFor(curH);
      if (block === 'h') {
        if (inside(bx, bz)) { place(bx, bz, '.', bh); hgrid[bz][bx] = bh; }
      } else {
        place(bx, bz, block === '_' ? '_' : block, 0);
      }
      if (next && next[0] === 'L') {
        const rx = x + DIRS[(dir + 1) % 4][0];
        const rz = z + DIRS[(dir + 1) % 4][1];
        if (block === 'h') {
          if (inside(rx, rz)) { place(rx, rz, '.', bh); hgrid[rz][rx] = bh; }
        } else {
          place(rx, rz, block === '_' ? '_' : block, 0);
        }
      }
    }
  });
  for (const [dx, dz, ch] of decor) {
    if (grid[dz][dx] !== null) throw new Error(`snake: decor conflict at ${dx},${dz}`);
    grid[dz][dx] = ch;
  }
  // deterministic filler
  let seed = (w * 31 + d * 17 + path.length * 7) >>> 0;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) >>> 8) / 16777216;
  const map = grid.map((row, gz) =>
    row.map((c, gx) => {
      if (c !== null) return c;
      if (fill === '_') return '_';
      if (fill === '.') return '.';
      const r = rnd();
      return r < 0.12 ? 'T' : r < 0.2 ? 'B' : r < 0.26 ? 'R' : '.';
    }).join('')
  );
  const hasHeights = hgrid.some((row) => row.some((v) => v !== 0));
  return {
    map,
    heights: hasHeights ? hgrid.map((row) => row.join('')) : null,
    start: [sx, sz, sdir],
    pathLength: path.length
  };
}


/** Flat list of executed commands of a (winning) program. */
export function trace(level, program, theme) {
  let state = initialState(level, theme);
  const out = [];
  for (const b of executeProgram(level, program, [], () => state)) {
    if (b.control) continue;
    state = step(level, state, b.type);
    out.push(b.type);
    if (won(level, state)) break;
  }
  return out;
}

/** Fewest blocks needed to express `seq` with plain commands and (nested) loops, no conditions. */
export function minUnconditionalBlocks(seq, allowLoops = true) {
  const n = seq.length;
  const memo = new Map();
  const best = (i, j) => {
    if (i >= j) return 0;
    const k = i * 1000 + j;
    if (memo.has(k)) return memo.get(k);
    let res = j - i;
    for (let m = i + 1; m < j; m++) res = Math.min(res, best(i, m) + best(m, j));
    const len = j - i;
    for (let p = 1; allowLoops && p * 2 <= len; p++) {
      if (len % p || len / p > 10) continue;
      let ok = true;
      for (let t = p; t < len && ok; t++) ok = seq[i + t] === seq[i + t - p];
      if (ok) res = Math.min(res, 1 + best(i, i + p));
    }
    memo.set(k, res);
    return res;
  };
  return best(0, n);
}

