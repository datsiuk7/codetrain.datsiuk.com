// Helpers for section 6 "Функції": programs with user functions.
import {
  validateLevel, validateProgram, initialState, step, won, executeProgram, blockCount
} from '../../logic.mjs';
import { blk, buildLevel, minUnconditionalBlocks } from './lib.mjs';

export { F, L, R, J, Li, Tk, Fx, loop, wh, iff, snake } from './lib.mjs';

let fid = 0;
/** fn('Назва', ...body) -> function object */
export const fn = (name, ...body) => ({ id: `f${++fid}`, name, body });
export const call = (f) => blk('call', { functionId: f.id });

const clone = (x) => JSON.parse(JSON.stringify(x));

export function flatTrace(program, functions, level = null, theme = 'dark') {
  const out = [];
  if (!level) {
    for (const b of executeProgram(null, program, functions, () => null)) {
      if (!b.control) out.push(b.type);
    }
    return out;
  }
  let state = initialState(level, theme);
  for (const b of executeProgram(level, program, functions, () => state)) {
    if (b.control) continue;
    state = step(level, state, b.type);
    out.push(b.type);
    if (won(level, state)) break;
  }
  return out;
}

/**
 * Builds the map from the commands a (condition-free) program actually executes.
 * jumps: height delta for each `jump` in execution order (+1 up, -1 down, 0 level).
 */
export function deriveMap({ program, functions, startDir = 0, jumps = [], margin = 1, density = 0.28 }) {
  const cmds = flatTrace(program, functions);
  const D = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const cells = new Map();
  const k = (x, z) => `${x},${z}`;
  let [x, z, dir, h, ji] = [0, 0, startDir, 0, 0];
  cells.set(k(0, 0), { x, z, h: 0 });
  const startKey = k(0, 0);
  for (const c of cmds) {
    if (c === 'right') dir = (dir + 1) % 4;
    else if (c === 'left') dir = (dir + 3) % 4;
    else if (c === 'forward' || c === 'jump') {
      const delta = c === 'jump' ? (jumps[ji++] ?? 0) : 0;
      x += D[dir][0];
      z += D[dir][1];
      const nh = h + delta;
      const ex = cells.get(k(x, z));
      if (ex && ex.h !== nh) throw new Error(`height mismatch at ${x},${z}`);
      if (!ex) cells.set(k(x, z), { x, z, h: nh });
      h = nh;
    } else {
      const cell = cells.get(k(x, z));
      if (c === 'light') {
        if (cell.lamp && !cell.spark) throw new Error(`lamp lit twice at ${x},${z}`);
        cell.lamp = true;
      } else if (c === 'take') {
        if (cell.kit) throw new Error(`two kits at ${x},${z}`);
        cell.kit = true;
      } else if (c === 'fix') {
        cell.lamp = true;
        cell.spark = true;
      }
    }
  }
  if (ji !== jumps.length) throw new Error(`unused jumps: used ${ji} of ${jumps.length}`);
  const xs = [...cells.values()].map((c) => c.x);
  const zs = [...cells.values()].map((c) => c.z);
  const hs = [...cells.values()].map((c) => c.h);
  const minH = Math.min(...hs);
  let m = margin;
  const size = (m) => [Math.max(...xs) - Math.min(...xs) + 1 + 2 * m, Math.max(...zs) - Math.min(...zs) + 1 + 2 * m];
  while (m > 0 && size(m).some((s) => s > 10)) m--;
  const [w, d] = size(m);
  if (w > 10 || d > 10) throw new Error(`field too large: ${w}x${d}`);
  const ox = Math.min(...xs) - m;
  const oz = Math.min(...zs) - m;
  let seed = (w * 131 + d * 71 + cmds.length * 13) >>> 0;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) >>> 8) / 16777216;
  const map = [];
  const heights = [];
  for (let gz = 0; gz < d; gz++) {
    let row = '';
    let hrow = '';
    for (let gx = 0; gx < w; gx++) {
      const c = cells.get(k(gx + ox, gz + oz));
      if (c) {
        row += c.lamp ? (c.spark ? 'S' : 'L') : c.kit ? 'K' : '.';
        hrow += String(c.h - minH);
      } else {
        const r = rnd();
        row += r < density * 0.5 ? 'T' : r < density * 0.8 ? 'B' : r < density ? 'R' : '.';
        hrow += '0';
      }
    }
    map.push(row);
    heights.push(hrow);
  }
  if (Math.max(...hs) - minH > 5) throw new Error('height range too large');
  const hasH = heights.some((r) => /[1-9]/.test(r));
  return { map, heights: hasH ? heights : null, start: [-ox, -oz, startDir], steps: cmds.length, startKey };
}

export function run6(level, program, functions, theme) {
  let state = initialState(level, theme);
  try {
    validateProgram(level, program, functions);
    for (const b of executeProgram(level, program, functions, () => state)) {
      if (b.control) continue;
      state = step(level, state, b.type);
      if (won(level, state)) return { ok: true };
    }
    return { ok: false, error: 'Програма завершилась без перемоги' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/** Replace every call by the body of the called function (to measure what functions save). */
export function inline(program, functions) {
  const map = new Map(functions.map((f) => [f.id, f]));
  const go = (list) =>
    list.flatMap((b) => {
      if (b.type === 'call') return go(clone(map.get(b.functionId).body));
      const c = { ...b };
      if (Array.isArray(c.body)) c.body = go(c.body);
      if (Array.isArray(c.elseBody)) c.elseBody = go(c.elseBody);
      if (c.branches) c.branches = c.branches.map((br) => ({ ...br, body: go(br.body) }));
      return [c];
    });
  return go(program);
}

export function verify6(d) {
  const level = buildLevel(d);
  const problems = validateLevel(level);
  const night = d.solution;
  const day = d.daySolution || d.solution;
  const nf = d.functions;
  const df = d.dayFunctions || d.functions;
  const rn = run6(level, night, nf, 'dark');
  if (!rn.ok) problems.push(`night failed: ${rn.error}`);
  const rd = run6(level, day, df, 'light');
  if (!rd.ok) problems.push(`day failed: ${rd.error}`);
  if (!nf.length || !JSON.stringify(night).includes('"call"')) problems.push('solution does not use functions');
  const total = blockCount(night) + nf.reduce((n, f) => n + blockCount(f.body), 0);
  const inlined = blockCount(inline(night, nf));
  if (inlined <= d.limit) problems.push(`inline version fits the limit (${inlined} <= ${d.limit})`);
  let plain = null;
  if (d.allowed.includes('loop') && !/"(if|while)"/.test(JSON.stringify(night))) {
    plain = minUnconditionalBlocks(flatTrace(night, nf), true);
    if (plain <= d.limit) problems.push(`loops alone fit the limit (${plain} <= ${d.limit})`);
  }
  if (total > d.limit) problems.push(`solution uses ${total} > limit ${d.limit}`);
  return { level, problems, total, inlined, plain };
}
