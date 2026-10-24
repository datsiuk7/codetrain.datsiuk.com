import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { World } from '../scene.js';

for (const kind of ['bulbs', 'kits']) {
  test(`pickup effect carries ${kind} toward the character and cleans up`, () => {
    const scene = new THREE.Scene();
    const robot = new THREE.Group();
    robot.position.set(1, 0, 1);
    scene.add(robot);
    const item = new THREE.Group();
    item.position.set(1, .2, 1);
    scene.add(item);
    const world = {
      scene,
      robot,
      bulbs: new Map(),
      kits: new Map()
    };
    world[kind].set('1,1', item);
    const original = item.position.clone();
    const effect = World.prototype.createPickupEffect.call(world, {
      x: 1, z: 1, bulbs: [], kits: []
    });

    assert.ok(effect);
    effect.frame(.65);
    assert.ok(item.position.y > original.y);
    assert.equal(item.userData.pickingUp, true);
    effect.cleanup();
    assert.ok(item.position.equals(original));
    assert.equal(item.userData.pickingUp, undefined);
    assert.equal(scene.children.length, 2);
  });
}

test('the character crouches to collect an item without tilting its body', async () => {
  const previousRaf = globalThis.requestAnimationFrame;
  const previousMatchMedia = globalThis.matchMedia;
  const world = Object.create(World.prototype);
  world.scene = new THREE.Scene();
  world.robot = new THREE.Group();
  world.scene.add(world.robot);
  world.leftLeg = new THREE.Group();
  world.rightLeg = new THREE.Group();
  world.leftArm = new THREE.Group();
  world.arm = new THREE.Group();
  world.hat = new THREE.Group();
  world.hat.position.y = .77;
  world.bulbs = new Map();
  world.kits = new Map();
  world.angle = 0;
  world.speed = 1;
  world.dead = false;
  world.position = () => new THREE.Vector3();
  world.lights = () => {};
  const item = new THREE.Group();
  world.scene.add(item);
  world.bulbs.set('0,0', item);
  let frame = 0;
  const poses = [];
  globalThis.matchMedia = () => ({ matches: false });
  globalThis.requestAnimationFrame = (callback) => {
    poses.push({ tilt: world.robot.rotation.x, height: world.robot.position.y });
    callback(performance.now() + ++frame * 300);
  };
  try {
    assert.equal(await world.animate({ x: 0, z: 0, bulbs: [], kits: [] }, 'take', () => false), true);
    assert.ok(poses.some((pose) => pose.height < 0));
    assert.ok(poses.every((pose) => pose.tilt === 0));
    assert.equal(world.robot.position.y, 0);
    assert.equal(world.leftLeg.rotation.z, 0);
    assert.equal(world.rightLeg.rotation.z, 0);
  } finally {
    if (previousRaf === undefined) delete globalThis.requestAnimationFrame;
    else globalThis.requestAnimationFrame = previousRaf;
    if (previousMatchMedia === undefined) delete globalThis.matchMedia;
    else globalThis.matchMedia = previousMatchMedia;
  }
});

test('fall animation interrupted by cancellation resets robot scale to 1', async () => {
  const previousRaf = globalThis.requestAnimationFrame;
  const world = Object.create(World.prototype);
  world.robot = new THREE.Group();
  world.leftArm = new THREE.Group();
  world.arm = new THREE.Group();
  world.leftLeg = new THREE.Group();
  world.rightLeg = new THREE.Group();
  world.angle = 0;
  world.speed = 1;
  world.dead = false;

  let frame = 0;
  let cancelled = false;
  globalThis.requestAnimationFrame = (callback) => {
    frame++;
    // Advance time past stepDuration (320ms) into the fall phase (where shrink happens)
    const simulatedNow = performance.now() + 600;
    if (frame === 2) {
      cancelled = true;
    }
    callback(simulatedNow);
  };

  try {
    const res = await world.fall({ dir: 0 }, () => cancelled, () => {});
    assert.equal(res, false, 'Interrupted fall must resolve to false');
    assert.equal(world.robot.scale.x, 1, 'Robot scale.x must be restored to 1');
    assert.equal(world.robot.scale.y, 1, 'Robot scale.y must be restored to 1');
    assert.equal(world.robot.scale.z, 1, 'Robot scale.z must be restored to 1');
  } finally {
    if (previousRaf === undefined) delete globalThis.requestAnimationFrame;
    else globalThis.requestAnimationFrame = previousRaf;
  }
});

test('setState resets robot scale to 1 even after partial scale change', () => {
  const world = Object.create(World.prototype);
  world.robot = new THREE.Group();
  world.leftArm = new THREE.Group();
  world.arm = new THREE.Group();
  world.leftLeg = new THREE.Group();
  world.rightLeg = new THREE.Group();
  world.position = () => new THREE.Vector3(0, 0, 0);
  world.lights = () => {};
  world.level = { width: 3, depth: 3, cells: [] };

  // Simulate reduced scale during fall
  world.robot.scale.set(0.2, 0.2, 0.2);
  assert.equal(world.robot.scale.x, 0.2);

  // Calling setState (e.g. on Reset) must restore scale to 1
  world.setState({ x: 0, z: 0, dir: 0 });
  assert.equal(world.robot.scale.x, 1);
  assert.equal(world.robot.scale.y, 1);
  assert.equal(world.robot.scale.z, 1);
});

test('createRepairEffect creates wrench, sparks, flash light and ring on lantern cell, animates frames, and cleans up cleanly', () => {
  const scene = new THREE.Scene();
  const robot = new THREE.Group();
  robot.position.set(1, 0, 1);
  scene.add(robot);

  const arm = new THREE.Group();
  robot.add(arm);

  const bulb = new THREE.Mesh(new THREE.BoxGeometry(.16, .23, .16), new THREE.MeshBasicMaterial({ color: 0x738481 }));
  const glow = new THREE.PointLight(0xffc46c, 1, 2.6, 1.6);
  glow.position.set(1.3, 1.14, 0.71);
  scene.add(bulb, glow);

  const world = {
    scene,
    robot,
    arm,
    lamps: new Map([
      ['1,1', { bulb, glow, needsBulb: false }]
    ]),
    position: () => new THREE.Vector3(1, 0, 1)
  };

  const initialSceneCount = scene.children.length;
  const initialArmCount = arm.children.length;

  const effect = World.prototype.createRepairEffect.call(world, { x: 1, z: 1 });
  assert.ok(effect, 'Repair effect should be created');
  assert.equal(arm.children.length, initialArmCount + 1, 'Wrench should be attached to robot arm');
  assert.equal(scene.children.length, initialSceneCount + 3, 'Sparks, flash light and ring added to scene');

  // Frame at active repair phase (t = 0.5)
  effect.frame(0.5);
  assert.ok(effect.flashLight.intensity > 0, 'Flash light should be flickering');
  assert.ok(effect.sparkGroup.children.some((p) => p.visible), 'Sparks should be visible during repair');

  // Frame at energy wave / completion phase (t = 0.85)
  effect.frame(0.85);
  assert.equal(effect.ringMesh.visible, true, 'Energy ring should be visible on completion');
  assert.ok(effect.ringMesh.scale.x > 1, 'Ring should expand outwards');

  // Cleanup
  effect.cleanup();
  assert.equal(arm.children.length, initialArmCount, 'Wrench removed from arm');
  assert.equal(scene.children.length, initialSceneCount, 'All effect objects removed from scene');
});

test('animate with fix command executes full repair kinematics and resets posture cleanly', async () => {
  const previousRaf = globalThis.requestAnimationFrame;
  const previousMatchMedia = globalThis.matchMedia;
  const world = Object.create(World.prototype);
  world.scene = new THREE.Scene();
  world.robot = new THREE.Group();
  world.scene.add(world.robot);
  world.leftLeg = new THREE.Group();
  world.rightLeg = new THREE.Group();
  world.leftArm = new THREE.Group();
  world.arm = new THREE.Group();
  world.hat = new THREE.Group();
  world.hat.position.y = .77;
  world.bulbs = new Map();
  world.kits = new Map();
  world.lamps = new Map();
  world.boxes = new Map();
  world.angle = 0;
  world.speed = 1;
  world.dead = false;
  world.position = () => new THREE.Vector3(0, 0, 0);
  world.lights = () => {};
  world.level = { width: 3, depth: 3, cells: [] };

  const poses = [];
  let frame = 0;
  globalThis.matchMedia = () => ({ matches: false });
  globalThis.requestAnimationFrame = (callback) => {
    poses.push({
      armX: world.arm.rotation.x,
      lean: world.robot.rotation.x,
      hatY: world.hat.position.y
    });
    callback(performance.now() + ++frame * 300);
  };

  try {
    const success = await world.animate({ x: 0, z: 0 }, 'fix', () => false);
    assert.equal(success, true);
    // Kinematic checks: arm reaches forward and rotates
    assert.ok(poses.some((p) => p.armX > 0.5), 'Arm should extend forward to fix lantern');
    assert.ok(poses.some((p) => p.lean < 0), 'Robot should lean toward lantern during repair');
    // Posture restored after completion
    assert.equal(world.robot.rotation.x, 0);
    assert.equal(world.robot.rotation.z, 0);
    assert.equal(world.arm.rotation.x, 0);
    assert.equal(world.arm.rotation.y, 0);
    assert.equal(world.arm.rotation.z, 0);
    assert.equal(world.leftArm.rotation.x, 0);
    assert.equal(world.hat.position.y, 0.77);
  } finally {
    if (previousRaf === undefined) delete globalThis.requestAnimationFrame;
    else globalThis.requestAnimationFrame = previousRaf;
    if (previousMatchMedia === undefined) delete globalThis.matchMedia;
    else globalThis.matchMedia = previousMatchMedia;
  }
});

