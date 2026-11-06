import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { pathBack, initialState } from '../logic.mjs';
import { World } from '../scene.js';

const grid = (width, depth, extra = () => ({})) => ({
  id: 'walk-back', width, depth, start: { x: 0, z: 0, dir: 1 }, allowed: ['forward', 'light'],
  cells: Array.from({ length: depth }, (_, z) => Array.from({ length: width }, (_, x) =>
    ({ height: 0, ...extra(x, z) })))
});

test('pathBack finds the shortest route to the start', () => {
  const l = grid(3, 1);
  const path = pathBack(l, { x: 2, z: 0, dir: 1 }, l.start);
  assert.deepEqual(path.map((p) => [p.x, p.z, p.dir]), [[1, 0, 3], [0, 0, 3]]);
});

test('pathBack is empty when already standing on the start', () => {
  const l = grid(2, 2);
  assert.deepEqual(pathBack(l, { x: 0, z: 0, dir: 2 }, l.start), []);
});

test('pathBack walks around obstacles and hops over height steps even if jump is not allowed', () => {
  const l = grid(3, 2, (x, z) => (x === 1 && z === 0 ? { tree: true } : z === 1 ? { height: 1 } : {}));
  const path = pathBack(l, { x: 2, z: 0, dir: 0 }, l.start);
  assert.equal(path.length, 4);
  assert.ok(path.every((p) => !(p.x === 1 && p.z === 0)), 'must not walk through the tree');
  assert.deepEqual([path.at(-1).x, path.at(-1).z], [0, 0]);
});

test('pathBack never pushes boxes and returns null when the start is unreachable', () => {
  const l = grid(3, 1, (x) => (x === 1 ? { height: 3 } : {}));
  assert.equal(pathBack(l, { x: 2, z: 0, dir: 3 }, l.start), null);

  const boxed = grid(3, 1, (x) => (x === 1 ? { box: true } : {}));
  const state = { ...initialState(boxed, 'dark'), x: 2, dir: 3 };
  const path = pathBack(boxed, state, boxed.start);
  assert.ok(path.every((p) => !p.pushedBox));
  assert.deepEqual(state.boxes, ['1,0']);
});

const stubWorld = () => {
  const world = Object.create(World.prototype);
  world.robot = new THREE.Group();
  world.leftLeg = new THREE.Group();
  world.rightLeg = new THREE.Group();
  world.leftArm = new THREE.Group();
  world.arm = new THREE.Group();
  world.hat = new THREE.Group();
  world.hat.position.y = .77;
  world.eyes = [new THREE.Group(), new THREE.Group()];
  world.angle = 0;
  world.speed = 1;
  world.dead = false;
  world.position = (s) => new THREE.Vector3(s.x, 0, s.z);
  return world;
};

const withFrames = async (stepMs, run, onFrame = () => {}) => {
  const previousRaf = globalThis.requestAnimationFrame;
  const previousMatchMedia = globalThis.matchMedia;
  let now = performance.now();
  globalThis.matchMedia = () => ({ matches: false });
  globalThis.requestAnimationFrame = (callback) => { onFrame(); callback(now += stepMs); };
  try {
    return await run();
  } finally {
    if (previousRaf === undefined) delete globalThis.requestAnimationFrame;
    else globalThis.requestAnimationFrame = previousRaf;
    if (previousMatchMedia === undefined) delete globalThis.matchMedia;
    else globalThis.matchMedia = previousMatchMedia;
  }
};

test('walkBack moves the character along the path and faces the last step', async () => {
  const world = stubWorld();
  const ok = await withFrames(120, () =>
    world.walkBack([{ x: 1, z: 0, dir: 3 }, { x: 0, z: 0, dir: 3 }], () => false));
  assert.equal(ok, true);
  assert.equal(world.robot.position.x, 0);
  assert.equal(Math.round(world.angle / (Math.PI / 2)), 1);
  assert.equal(world.robot.rotation.z, 0);
  assert.equal(world.eyes[0].scale.y, 1);
});

test('cry sheds tears, then cleans them up and restores the pose', async () => {
  const world = stubWorld();
  let maxTears = 0;
  const ok = await withFrames(100, () => world.cry(() => false), () => {
    maxTears = Math.max(maxTears, world.robot.children.length);
  });
  assert.equal(ok, true);
  assert.ok(maxTears > 2, 'tears must appear');
  assert.equal(world.robot.children.length, 0);
  assert.equal(world.leftArm.rotation.x, 0);
  assert.equal(world.eyes[1].scale.y, 1);
  assert.equal(world.hat.position.y, .77);
});

test('cancelled cry removes tears and resolves false', async () => {
  const world = stubWorld();
  let frames = 0;
  let cancelled = false;
  const ok = await withFrames(100, () => world.cry(() => cancelled), () => { if (++frames === 6) cancelled = true; });
  assert.equal(ok, false);
  assert.equal(world.robot.children.length, 0);
  assert.equal(world.arm.rotation.x, 0);
});

test('runner unlocks the editor for the aftermath and an edit snaps the character to the start', async () => {
  const { readFile } = await import('node:fs/promises');
  const runner = await readFile(new URL('../runner.js', import.meta.url), 'utf8');
  assert.match(runner, /if \(settling\) reset\(\);/, 'editing while settling must reset to the start');
  const incomplete = runner.slice(runner.indexOf('const incompleteMsg'));
  assert.ok(incomplete.indexOf('settle();') < incomplete.indexOf('world.walkBack'), 'editor must unlock before walking back');
  const failure = runner.slice(runner.indexOf('} catch (e) {\n          failed = true;'));
  assert.ok(failure.indexOf('settle();') < failure.indexOf('world.fall'), 'editor must unlock before the failure animation');
});
