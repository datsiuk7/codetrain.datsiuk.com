import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../vendor/three.module.js';
import {validateLevel,initialState,step,won,compile,blockCount} from '../logic.mjs';
import {World} from '../scene.js';
const load=async id=>JSON.parse(await readFile(new URL(`./fixtures/${id}.json`,import.meta.url),'utf8'));
 const solutions={
  'first-light':['forward','forward','light'],
  'garden-turn':['light'],
  'small-stairs':['jump','jump','jump','light'],
  'zigzag-street':['forward','right','jump','left','forward','right','forward','left','jump','right','forward','light'],
  'twin-lights':['jump','forward','light','right','right','forward','jump','left','forward','forward','left','jump','forward','light'],
  'lantern-street':[{type:'loop',times:3,body:[{type:'forward'},{type:'light'}]}],
  'high-watch':[{type:'loop',times:5,body:[{type:'jump'}]},'light']
 };
for(const [id,solution] of Object.entries(solutions))test(`${id}: valid and solvable with allowed commands`,async()=>{const l=await load(id);assert.deepEqual(validateLevel(l),[]);const p=solution.map((s,i)=>typeof s==='string'?{type:s,id:String(i)}:s);let state=initialState(l);for(const b of compile(l,p))state=step(l,state,b.type);assert.ok(won(l,state))});
test('height, tree, missing tile and light rules',async()=>{const l=await load('small-stairs');let s=initialState(l);assert.throws(()=>step(l,s,'forward'),/висота/);s=step(l,s,'jump');assert.equal(s.z,2);l.cells[1][1].height=5;assert.throws(()=>step(l,s,'jump'),/перепад/);l.cells[1][1].height=2;l.cells[1][1].tree=true;assert.throws(()=>step(l,s,'jump'),/Дерево/);l.cells[1][1]=null;assert.throws(()=>step(l,s,'jump'),/плитки/);assert.throws(()=>step(l,s,'light'),/немає ліхтаря/)});
test('downhill requires jump; lighting toggles state',async()=>{const l=await load('small-stairs');const s={x:1,z:0,dir:2,lit:[]};assert.throws(()=>step(l,s,'forward'),/висота/);assert.equal(step(l,s,'jump').z,1);const lit=step(l,s,'light');assert.ok(lit.lit.includes('1,0'));assert.equal(step(l,lit,'light').lit.includes('1,0'),false)});
test('validation rejects conflicts and out-of-range heights',async()=>{const l=await load('first-light');const lamp=l.cells.flat().find(c=>c?.lamp);lamp.tree=true;assert.ok(validateLevel(l).length);lamp.tree=false;lamp.height=6;assert.ok(validateLevel(l).length);l.id='../bad';assert.ok(validateLevel(l).some(s=>s.startsWith('ID:')))});
test('loop limits, empty and nested loops',async()=>{const l=await load('lantern-street');assert.throws(()=>compile(l,[{type:'loop',times:2,body:[]}]),/Цикл/);assert.throws(()=>compile(l,[{type:'loop',times:2,body:[{type:'loop',times:2,body:[]}]}]),/Вкладені/);assert.equal(blockCount([{type:'loop',body:[{type:'forward'},{type:'light'}]}]),3);assert.throws(()=>compile(l,[{type:'left'}]),/недоступна/)});

const withMockFrames = async (stepMs, run, onFrame = () => {}) => {
  const prevRaf = globalThis.requestAnimationFrame;
  let now = null;
  globalThis.requestAnimationFrame = (cb) => {
    now = (now ?? performance.now()) + stepMs;
    onFrame(now);
    cb(now);
  };
  try {
    return await run();
  } finally {
    if (prevRaf === undefined) delete globalThis.requestAnimationFrame;
    else globalThis.requestAnimationFrame = prevRaf;
  }
};

const createWorldStub = (theme = 'dark') => {
  const world = Object.create(World.prototype);
  world.dead = false;
  world.theme = theme;
  world.robot = new THREE.Group();
  world.robot.position.y = 0.03;
  world.leftLeg = new THREE.Group();
  world.rightLeg = new THREE.Group();
  world.leftArm = new THREE.Group();
  world.arm = new THREE.Group();
  world.hat = new THREE.Group();
  world.hat.position.set(0, 0.77, 0);
  world.eyes = [new THREE.Group(), new THREE.Group()];
  world.alertSign = new THREE.Sprite(new THREE.SpriteMaterial());
  world.alertSign.visible = false;
  world.alertSign.scale.set(0, 0, 1);
  world.tileHighlightToken = 0;
  world.tileMap = new Map();
  for (const [k, tileColor, tileTopColor] of [
    ['0,0', '#384d5b', '#536977'],
    ['1,0', '#405361', '#536977'],
    ['2,0', '#52605a', '#777051']
  ]) {
    const tile = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: tileColor }));
    const top = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: tileTopColor }));
    world.tileMap.set(k, { tile, top, tileColor, tileTopColor });
  }
  return world;
};

test('stopAlert displays exclamation marks for 1s and resets robot pose on finish or cancel', async () => {
  const world = createWorldStub();
  let maxAlertScale = 0;
  let sawVisible = false;
  let frames = 0;
  const ok = await withMockFrames(100, () => world.stopAlert(() => false, 1000), () => {
    frames++;
    if (world.alertSign.visible) sawVisible = true;
    maxAlertScale = Math.max(maxAlertScale, world.alertSign.scale.x);
  });
  assert.equal(ok, true);
  assert.equal(frames, 10);
  assert.equal(sawVisible, true);
  assert.ok(maxAlertScale > 0.7);
  assert.equal(world.alertSign.visible, false);
  assert.equal(world.alertSign.scale.x, 0);
  assert.equal(world.leftArm.rotation.x, 0);
  assert.equal(world.arm.rotation.x, 0);
  assert.equal(world.robot.position.y, 0.03);

  let cancelled = false;
  let cancelFrames = 0;
  const stopped = await withMockFrames(100, () => world.stopAlert(() => cancelled, 1000), () => {
    if (++cancelFrames === 3) cancelled = true;
  });
  assert.equal(stopped, false);
  assert.equal(world.alertSign.visible, false);
  assert.equal(world.leftArm.rotation.x, 0);
});

test('highlightVisitedTiles glows only walked tiles for 3s and clearTileHighlight restores them', async () => {
  for (const theme of ['dark', 'light']) {
    const world = createWorldStub(theme);
    let maxVisitedGlow = 0;
    let maxUnvisitedGlow = 0;
    let frames = 0;
    const ok = await withMockFrames(200, () => world.highlightVisitedTiles(['0,0', '1,0', '0,0'], 3000), () => {
      frames++;
      maxVisitedGlow = Math.max(maxVisitedGlow, world.tileMap.get('0,0').top.material.emissiveIntensity);
      maxUnvisitedGlow = Math.max(maxUnvisitedGlow, world.tileMap.get('2,0').top.material.emissiveIntensity);
    });
    assert.equal(ok, true);
    assert.equal(frames, 15);
    assert.ok(maxVisitedGlow > 0.4, `visited tile must glow in ${theme} theme`);
    assert.equal(maxUnvisitedGlow, 0, `unvisited tile must stay unlit in ${theme} theme`);
    assert.equal(world.tileMap.get('0,0').top.material.emissiveIntensity, 0);
    assert.equal(
      world.tileMap.get('0,0').top.material.color.getHexString(),
      new THREE.Color('#536977').getHexString()
    );
  }

  const world = createWorldStub('dark');
  let clearedDuringRun = false;
  let count = 0;
  const interrupted = await withMockFrames(200, () => world.highlightVisitedTiles(['1,0'], 3000), () => {
    if (++count === 3) {
      world.clearTileHighlight();
      clearedDuringRun = true;
    }
  });
  assert.equal(clearedDuringRun, true);
  assert.equal(interrupted, false);
  assert.equal(world.tileMap.get('1,0').top.material.emissiveIntensity, 0);
  assert.equal(world.tileMap.get('1,0').tile.material.emissiveIntensity, 0);
});

test('runner tracks walked tiles, clears highlight on reset, and triggers 1s stopAlert + 3s tile highlight when incomplete', async () => {
  const runner = await readFile(new URL('../runner.js', import.meta.url), 'utf8');
  assert.match(runner, /world\.clearTileHighlight\?\.\(\)/);
  assert.match(runner, /const visitedTiles = \[`\$\{state\.x\},\$\{state\.z\}`\]/);
  const incomplete = runner.slice(runner.indexOf('const incompleteMsg'));
  assert.match(incomplete, /world\.highlightVisitedTiles\?\.\(visitedTiles, 3000\)/);
  assert.match(incomplete, /await world\.stopAlert\(\(\) => token !== runToken, 1000\)/);
  assert.ok(
    incomplete.indexOf('world.stopAlert(') < incomplete.indexOf('backToStartAndCry('),
    '1s stopAlert must run before walking back to start'
  );
});

test('section 2 new 3-star loop levels are registered, valid and require loops', async () => {
  const index = JSON.parse(await readFile(new URL('../levels/index.json', import.meta.url), 'utf8'));
  const loopSolutions = {
    'terasy-zamku': [
      {
        type: 'loop',
        times: 3,
        body: [
          { type: 'jump' },
          { type: 'light' },
          { type: 'right' },
          { type: 'forward' },
          { type: 'light' },
          { type: 'left' }
        ]
      },
      { type: 'jump' },
      { type: 'light' }
    ],
    'mist-iz-yashchykiv': [
      {
        type: 'loop',
        times: 4,
        body: [
          { type: 'jump' },
          { type: 'forward' },
          { type: 'jump' },
          { type: 'jump' },
          { type: 'light' },
          { type: 'jump' },
          { type: 'right' }
        ]
      }
    ],
    'bulvar-iz-dvoramy': [
      {
        type: 'loop',
        times: 4,
        body: [
          { type: 'forward' },
          { type: 'forward' },
          { type: 'left' },
          { type: 'forward' },
          { type: 'light' },
          { type: 'forward' },
          { type: 'light' },
          { type: 'right' },
          { type: 'right' },
          { type: 'forward' },
          { type: 'forward' },
          { type: 'left' }
        ]
      }
    ]
  };

  for (const [id, program] of Object.entries(loopSolutions)) {
    assert.ok(index.includes(id), `${id} must be registered in levels/index.json`);
    const level = JSON.parse(await readFile(new URL(`../levels/${id}.json`, import.meta.url), 'utf8'));
    assert.equal(level.category, 'loops', `${id} must be in section 2 (loops)`);
    assert.equal(level.difficulty, 3, `${id} must have difficulty 3`);
    assert.deepEqual(validateLevel(level), [], `${id} must pass validateLevel`);
    assert.ok(blockCount(program) <= level.limit, `${id} loop solution must fit limit`);

    const unrolled = program.flatMap((b) =>
      b.type === 'loop' ? Array.from({ length: b.times }, () => b.body).flat() : [b]
    );
    assert.ok(blockCount(unrolled) > level.limit, `${id} unrolled solution must exceed limit`);

    for (const theme of ['dark', 'light']) {
      let state = initialState(level, theme);
      for (const b of compile(level, program)) {
        state = step(level, state, b.type);
      }
      assert.equal(won(level, state), true, `${id} must be won in ${theme} theme`);
    }
  }
});

test('footer linkifyText converts domains and URLs to clickable links and escapes HTML', async () => {
  const appSrc = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const settingsSrc = await readFile(new URL('../admin/settings.js', import.meta.url), 'utf8');

  assert.match(appSrc, /export function linkifyText\(str\)/);
  assert.match(appSrc, /\$\{linkifyText\(gameSettings\.developerText\)\}/);
  assert.match(settingsSrc, /devEl\.innerHTML = linkifyText\(devVal\)/);

  const escMatch = appSrc.match(/const esc = \(s\) =>[\s\S]*?\}\[c\]\)\);/);
  const fnMatch = appSrc.match(/export (function linkifyText\(str\) \{[\s\S]*?\r?\n\})/);
  assert.ok(escMatch && fnMatch, 'esc and linkifyText must be present in app.js');

  const linkifyText = new Function(`${escMatch[0]}\nreturn ${fnMatch[1]}`)();

  assert.equal(
    linkifyText('Автор: datsiuk.com'),
    'Автор: <a class="footer-link" href="https://datsiuk.com" target="_blank" rel="noopener noreferrer">datsiuk.com</a>'
  );
  assert.equal(
    linkifyText('Сайт: https://codetrain.datsiuk.com/path.'),
    'Сайт: <a class="footer-link" href="https://codetrain.datsiuk.com/path" target="_blank" rel="noopener noreferrer">https://codetrain.datsiuk.com/path</a>.'
  );
  assert.equal(
    linkifyText('<script>alert(1)</script> datsiuk.com'),
    '&lt;script&gt;alert(1)&lt;/script&gt; <a class="footer-link" href="https://datsiuk.com" target="_blank" rel="noopener noreferrer">datsiuk.com</a>'
  );
});
