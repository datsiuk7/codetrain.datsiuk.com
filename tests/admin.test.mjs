import test from 'node:test';
import assert from 'node:assert/strict';
import { LevelHistory, createFreshLevel, matchHistoryShortcut, handleHistoryKeyboard, isEditableTarget } from '../admin/level-state.js';
import { resizeLevel, setupSizeMatrix } from '../admin/map-resize.js';
import { applyDimensions } from '../admin/map-editor.js';
import { validateLevel } from '../logic.mjs';
import { paintCell, formatCellInfo } from '../admin/map-paint.js';
import { enableLevelTreeDnd, isLevelTreeDragging } from '../admin/level-tree-dnd.js';
import { reorderLevelsOnServer } from '../admin/level-storage.js';

test('LevelHistory provides true Undo and Redo with checkpoints', () => {
  const history = new LevelHistory(10);
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, false);

  const state1 = { name: 'Initial', width: 4, depth: 4, cells: [] };
  const state2 = { name: 'Edited 1', width: 4, depth: 4, cells: [] };
  const state3 = { name: 'Edited 2', width: 4, depth: 4, cells: [] };

  history.checkpoint(state1);
  assert.equal(history.canUndo, true);
  assert.equal(history.canRedo, false);

  history.checkpoint(state2);
  assert.equal(history.canUndo, true);
  assert.equal(history.canRedo, false);

  // Undo from state3 to state2
  const undoneTo2 = history.undo(state3);
  assert.deepEqual(undoneTo2, state2);
  assert.equal(history.canUndo, true);
  assert.equal(history.canRedo, true);

  // Undo from state2 to state1
  const undoneTo1 = history.undo(undoneTo2);
  assert.deepEqual(undoneTo1, state1);
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, true);

  // Redo from state1 back to state2
  const redoneTo2 = history.redo(undoneTo1);
  assert.deepEqual(redoneTo2, state2);
  assert.equal(history.canUndo, true);
  assert.equal(history.canRedo, true);

  // Redo from state2 back to state3
  const redoneTo3 = history.redo(redoneTo2);
  assert.deepEqual(redoneTo3, state3);
  assert.equal(history.canUndo, true);
  assert.equal(history.canRedo, false);

  // Checkpoint clears future (redo stack)
  history.undo(state3);
  assert.equal(history.canRedo, true);
  history.checkpoint({ name: 'Branched' });
  assert.equal(history.canRedo, false);
});

test('resizeLevel expands, shrinks, and relocates start safely', () => {
  const level = createFreshLevel();
  let statusMsg = '';
  const onStatus = (msg) => { statusMsg = msg; };

  // Expand to 6x6
  const resExpand = resizeLevel(level, 6, 6, onStatus);
  assert.equal(resExpand.success, true);
  assert.equal(resExpand.changed, true);
  assert.equal(level.width, 6);
  assert.equal(level.depth, 6);
  assert.equal(level.cells.length, 6);
  assert.equal(level.cells[0].length, 6);

  // Place a lamp at (5, 5)
  level.cells[5][5].lamp = true;
  // Shrinking to 4x4 when object is at (5,5) should fail or shift
  // In our smart resize, object bounding box is (5,5), span is 1x1, which fits 4x4, so it shifts by 2!
  const resShrink = resizeLevel(level, 4, 4, onStatus);
  assert.equal(resShrink.success, true);
  assert.equal(resShrink.changed, true);
  assert.equal(level.width, 4);
  assert.equal(level.depth, 4);
  assert.equal(level.cells[3][3].lamp, true); // shifted from (5,5) to (3,3)
});

test('applyDimensions and resizeLevel recognize bush, rock, box, bulb, kit on height 0 and prevent cropping', () => {
  let statusMsg = '';
  const onStatus = (msg) => { statusMsg = msg; };

  for (const prop of ['bush', 'rock', 'box', 'bulb', 'kit']) {
    const level = createFreshLevel();
    resizeLevel(level, 6, 6, onStatus);

    // Place object at (0, 0) and at (5, 5) with height 0
    level.cells[0][0][prop] = true;
    level.cells[5][5][prop] = true;

    // Shrinking to 4x4 would span 6x6 -> must be rejected by applyDimensions!
    const canResize = applyDimensions(level, 4, 4, onStatus);
    assert.equal(canResize, false, `applyDimensions should reject 4x4 when ${prop} objects span 6x6`);
    assert.match(statusMsg, /Розміщені об’єкти займають 6×6/);

    // If only at (5, 5), span is 1x1, so shrinking to 4x4 should shift the object to (3, 3)
    level.cells[0][0][prop] = false;
    const res = resizeLevel(level, 4, 4, onStatus);
    assert.equal(res.success, true);
    assert.equal(level.cells[3][3][prop], true, `${prop} shifted safely to (3, 3) without being cut off`);
  }
});

test('resizeLevel start relocation never places robot on bush, rock, box, or house and satisfies validateLevel', () => {
  let statusMsg = '';
  const onStatus = (msg) => { statusMsg = msg; };

  // Level 5x5 with start at (4, 4)
  const level = createFreshLevel();
  level.id = 'relocate-test';
  level.name = 'Relocate Test';
  level.category = 'basics';
  resizeLevel(level, 5, 5, onStatus);
  level.start = { x: 4, z: 4, dir: 0 };

  // When shrinking to 3x3, clamped start is (2, 2).
  // Fill (2, 2) with a rock, (2, 1) with a bush, (1, 2) with a box, (2, 0) with a house
  level.cells[2][2].rock = true;
  level.cells[1][2].bush = true;
  level.cells[2][1].box = true;
  level.cells[0][2].house = true;

  const res = resizeLevel(level, 3, 3, onStatus);
  assert.equal(res.success, true);
  assert.equal(res.startRelocated, true);

  const startCell = level.cells[level.start.z][level.start.x];
  assert.equal(Boolean(startCell.tree), false, 'Start cannot be on a tree');
  assert.equal(Boolean(startCell.bush), false, 'Start cannot be on a bush');
  assert.equal(Boolean(startCell.rock), false, 'Start cannot be on a rock');
  assert.equal(Boolean(startCell.box), false, 'Start cannot be on a box');
  assert.equal(Boolean(startCell.house), false, 'Start cannot be on a house');

  const errors = validateLevel(level);
  assert.equal(errors.length, 0, `Level must remain valid after start relocation: ${errors.join(', ')}`);
});

test('size matrix highlights the same number of tiles as the level dimensions', () => {
  const previousDocument = globalThis.document;
  const level = { width: 4, depth: 4 };
  const cells = [];
  const handlers = {};
  let hit = null;
  const matrix = {
    replaceChildren() { cells.length = 0; },
    append(cell) { cells.push(cell); },
    querySelectorAll() { return cells; },
    addEventListener(name, handler) { handlers[name] = handler; },
    contains(cell) { return cells.includes(cell); }
  };
  globalThis.document = {
    createElement() {
      const classes = new Set();
      return {
        dataset: {},
        classList: {
          add: (name) => classes.add(name),
          toggle: (name, active) => active ? classes.add(name) : classes.delete(name),
          contains: (name) => classes.has(name)
        },
        setAttribute() {},
        closest() { return this; }
      };
    },
    elementFromPoint() { return hit; }
  };

  try {
    const badge = { textContent: '' };
    let selected = null;
    setupSizeMatrix({
      matrixEl: matrix,
      previewBadgeEl: badge,
      getLevel: () => level,
      onResize: (w, d) => { selected = [w, d]; }
    }).render();
    assert.equal(cells.length, 100);
    assert.equal(badge.textContent, '4 × 4');
    assert.equal(cells.filter((cell) => cell.classList.contains('selected')).length, 16);

    hit = cells.find((cell) => cell.dataset.w === 5 && cell.dataset.d === 5);
    handlers.click({ clientX: 0, clientY: 0 });
    assert.deepEqual(selected, [5, 5]);

    selected = null;
    hit = cells.find((cell) => cell.dataset.w === 1 && cell.dataset.d === 1);
    handlers.click({ clientX: 0, clientY: 0 });
    assert.equal(selected, null);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test('paintCell handles terrain, lamp, house, and start placement', () => {
  const level = createFreshLevel();
  let checkpoints = 0;
  let dirties = 0;
  let strokeActive = false;

  const ctx = {
    level,
    tool: 'terrain',
    height: 2,
    lampLitState: false,
    houseDir: 2,
    onStatus: () => {},
    onCheckpoint: () => { checkpoints++; },
    onDirty: () => { dirties++; },
    onRefreshCell: () => {},
    isStrokeActive: () => strokeActive,
    markStrokeActive: () => { strokeActive = true; }
  };

  // 1. Paint terrain height 2 at (1, 1)
  paintCell({ ...ctx, x: 1, z: 1 });
  assert.equal(level.cells[1][1].height, 2);
  assert.equal(checkpoints, 1);
  assert.equal(dirties, 1);

  // 2. Place lamp (lampLitState = false)
  paintCell({
    ...ctx,
    x: 1,
    z: 1,
    tool: 'lamp',
    isStrokeActive: () => false,
    markStrokeActive: () => {}
  });
  assert.equal(level.cells[1][1].lamp, true);
  assert.equal(level.cells[1][1].lit, false);

  // 3. Toggle lamp by painting over existing lamp
  let toggledLampLit = null;
  paintCell({
    ...ctx,
    x: 1,
    z: 1,
    tool: 'lamp',
    setLampLitState: (v) => { toggledLampLit = v; },
    isStrokeActive: () => false,
    markStrokeActive: () => {}
  });
  assert.equal(toggledLampLit, true);
  assert.equal(level.cells[1][1].lit, true);

  // 4. Place house with direction
  paintCell({
    ...ctx,
    x: 2,
    z: 2,
    tool: 'house',
    houseDir: 1,
    isStrokeActive: () => false,
    markStrokeActive: () => {}
  });
  assert.equal(level.cells[2][2].house, true);
  assert.equal(level.cells[2][2].dir, 1);

  // 5. Test formatCellInfo
  const infoLamp = formatCellInfo(level, 1, 1);
  assert.match(infoLamp, /ліхтар/);
  const infoHouse = formatCellInfo(level, 2, 2);
  assert.match(infoHouse, /будиночок/);
});

test('paintCell supports placing lantern without bulb (no-bulb state) and cycling states', () => {
  const level = createFreshLevel();
  let currentState = 'no-bulb';

  const ctx = {
    level,
    tool: 'lamp',
    height: 0,
    lampState: 'no-bulb',
    setLampState: (v) => { currentState = v; },
    onStatus: () => {},
    onCheckpoint: () => {},
    onDirty: () => {},
    onRefreshCell: () => {},
    isStrokeActive: () => false,
    markStrokeActive: () => {}
  };

  // 1. Paint lamp with lampState: 'no-bulb' at (1, 1)
  paintCell({ ...ctx, x: 1, z: 1 });
  assert.equal(level.cells[1][1].lamp, true);
  assert.equal(level.cells[1][1].needsBulb, true);
  assert.equal(level.cells[1][1].lit, false);
  assert.equal(level.cells[1][1].spark, false);

  // 2. formatCellInfo indicates lantern is missing a bulb
  const info = formatCellInfo(level, 1, 1);
  assert.match(info, /без лампочки/);

  // 3. Cycling state on existing lamp: current is 'no-bulb', target is 'no-bulb' -> next in order is 'off'
  paintCell({ ...ctx, x: 1, z: 1, lampState: 'no-bulb' });
  assert.equal(currentState, 'off');
  assert.equal(level.cells[1][1].needsBulb, false);
  assert.equal(level.cells[1][1].lit, false);
  assert.equal(level.cells[1][1].spark, false);

  // 4. Click again -> next in order is 'on'
  paintCell({ ...ctx, x: 1, z: 1, lampState: 'off' });
  assert.equal(currentState, 'on');
  assert.equal(level.cells[1][1].lit, true);

  // 5. Click again -> next in order is 'spark'
  paintCell({ ...ctx, x: 1, z: 1, lampState: 'on' });
  assert.equal(currentState, 'spark');
  assert.equal(level.cells[1][1].spark, true);

  // 6. Click again -> next in order is 'no-bulb'
  paintCell({ ...ctx, x: 1, z: 1, lampState: 'spark' });
  assert.equal(currentState, 'no-bulb');
  assert.equal(level.cells[1][1].needsBulb, true);
});

test('enableLevelTreeDnd enables dragging and handles reordering DOM nodes', async () => {
  const makeItem = (id) => {
    const classes = new Set(['cat-level-item']);
    const attrs = {};
    const item = {
      dataset: { id },
      classList: {
        add: (c) => classes.add(c),
        remove: (c) => classes.delete(c),
        contains: (c) => classes.has(c),
        toggle: (c, val) => (val ? classes.add(c) : classes.delete(c))
      },
      setAttribute: (k, v) => { attrs[k] = v; },
      getAttribute: (k) => attrs[k],
      getBoundingClientRect: () => ({ top: 100, height: 40 }),
      contains: () => false,
      nextSibling: null
    };
    return item;
  };

  const item1 = makeItem('level-1');
  const item2 = makeItem('level-2');
  const item3 = makeItem('level-3');
  const children = [item1, item2, item3];
  item1.nextSibling = item2;
  item2.nextSibling = item3;
  item3.nextSibling = null;

  const ul = {
    querySelectorAll: (sel) => {
      if (sel === '.cat-level-item') return [...children];
      return [];
    },
    querySelector: (sel) => {
      const match = sel.match(/data-id="([^"]+)"/);
      if (match) return children.find((c) => c.dataset.id === match[1]);
      return null;
    },
    insertBefore: (node, refNode) => {
      const curIdx = children.indexOf(node);
      if (curIdx !== -1) children.splice(curIdx, 1);
      if (!refNode) {
        children.push(node);
      } else {
        const refIdx = children.indexOf(refNode);
        children.splice(refIdx, 0, node);
      }
      for (let i = 0; i < children.length; i++) {
        children[i].nextSibling = children[i + 1] || null;
      }
    }
  };

  let reorderedCat = null;
  let reorderedIds = null;
  enableLevelTreeDnd({
    ul,
    categoryId: 'cat_move',
    onReorder: async (catId, newIds) => {
      reorderedCat = catId;
      reorderedIds = newIds;
    }
  });

  assert.equal(item1.getAttribute('draggable'), 'true');
  assert.equal(item2.getAttribute('draggable'), 'true');
  assert.equal(item3.getAttribute('draggable'), 'true');

  // Start dragging item1
  item1.ondragstart({ dataTransfer: { effectAllowed: '', setData() {} } });
  assert.equal(isLevelTreeDragging(), true);
  assert.equal(item1.classList.contains('is-dragging'), true);

  // Drag over item3 bottom half (clientY = 130 > top 100 + height 40/2 = 120)
  item3.ondragover({ clientY: 130, preventDefault() {}, dataTransfer: {} });
  assert.equal(item3.classList.contains('drag-over-bottom'), true);

  // Drop on item3
  await item3.ondrop({ preventDefault() {} });
  assert.equal(reorderedCat, 'cat_move');
  assert.deepEqual(reorderedIds, ['level-2', 'level-3', 'level-1']);

  // End drag
  item1.ondragend();
  assert.equal(item1.classList.contains('is-dragging'), false);
});

test('reorderLevelsOnServer sends reordered ids payload with X-Local-Editor header', async () => {
  const origFetch = globalThis.fetch;
  let fetchUrl = null;
  let fetchOptions = null;
  globalThis.fetch = async (url, opts) => {
    fetchUrl = url;
    fetchOptions = opts;
    return {
      ok: true,
      json: async () => ({ success: true })
    };
  };

  try {
    const res = await reorderLevelsOnServer(['lvl-a', 'lvl-b']);
    assert.deepEqual(res, { success: true });
    assert.equal(fetchUrl, '../api/levels/reorder');
    assert.equal(fetchOptions.method, 'POST');
    assert.equal(fetchOptions.headers['X-Local-Editor'], '1');
    assert.deepEqual(JSON.parse(fetchOptions.body), { ids: ['lvl-a', 'lvl-b'] });
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('paintCell handles bush, rock, box placement and erase tool', () => {
  const level = createFreshLevel();
  let checkpoints = 0;
  let dirties = 0;

  const ctx = {
    level,
    height: 1,
    lampLitState: false,
    houseDir: 2,
    onStatus: () => {},
    onCheckpoint: () => { checkpoints++; },
    onDirty: () => { dirties++; },
    onRefreshCell: () => {},
    isStrokeActive: () => false,
    markStrokeActive: () => {}
  };

  // 1. Paint bush at (1, 1)
  paintCell({ ...ctx, x: 1, z: 1, tool: 'bush' });
  assert.equal(level.cells[1][1].bush, true);
  assert.equal(level.cells[1][1].tree, false);
  assert.match(formatCellInfo(level, 1, 1), /кущ/);

  // 2. Paint rock at (1, 1) (replaces bush)
  paintCell({ ...ctx, x: 1, z: 1, tool: 'rock' });
  assert.equal(level.cells[1][1].rock, true);
  assert.equal(level.cells[1][1].bush, false);
  assert.match(formatCellInfo(level, 1, 1), /камінь/);

  // 3. Paint box at (1, 1) (replaces rock)
  paintCell({ ...ctx, x: 1, z: 1, tool: 'box' });
  assert.equal(level.cells[1][1].box, true);
  assert.equal(level.cells[1][1].rock, false);
  assert.match(formatCellInfo(level, 1, 1), /коробка/);

  // 4. Erase at (1, 1) clears box
  paintCell({ ...ctx, x: 1, z: 1, tool: 'erase' });
  assert.equal(level.cells[1][1].box, false);
  assert.equal(level.cells[1][1].bush, false);
  assert.equal(level.cells[1][1].rock, false);
});

test('admin editor index.html and level-state support IF settings (elif, else, allowedSensors)', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const html = fs.readFileSync(path.resolve('admin/index.html'), 'utf8');

  assert.ok(html.includes('id="field-if-settings"'), 'Field for IF settings must exist');
  assert.ok(html.includes('id="if-allow-elif"'), 'Checkbox for elif must exist');
  assert.ok(html.includes('id="if-allow-else"'), 'Checkbox for else must exist');
  assert.ok(html.includes('id="allowed-sensors"'), 'Container for sensors must exist');
  assert.ok(html.includes('id="btn-all-sensors"'), 'Button all sensors must exist');
  assert.ok(html.includes('id="btn-clear-sensors"'), 'Button clear sensors must exist');

  const fresh = createFreshLevel();
  assert.equal(fresh.allowElif, true);
  assert.equal(fresh.allowElse, true);
  assert.ok(Array.isArray(fresh.allowedSensors));
  assert.ok(fresh.allowedSensors.includes('lampLit'));
  assert.ok(fresh.allowedSensors.includes('obstacleAhead'));
});

test('admin editor index.html has level-enabled checkbox and admin.js/state manages level visibility', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const html = fs.readFileSync(path.resolve('admin/index.html'), 'utf8');
  const adminCode = fs.readFileSync(path.resolve('admin/admin.js'), 'utf8');

  // 1. Checkbox exists next to name field
  assert.ok(html.includes('id="level-enabled"'), 'Checkbox id="level-enabled" must exist in admin/index.html');
  assert.ok(html.includes('id="level-enabled-label"'), 'Status label for level-enabled must exist');
  assert.ok(html.includes('class="level-enabled-toggle'), 'level-enabled toggle wrapper must exist');

  const nameIdx = html.indexOf('id="name"');
  const enabledIdx = html.indexOf('id="level-enabled"');
  assert.ok(nameIdx > 0 && enabledIdx > 0);
  assert.ok(Math.abs(nameIdx - enabledIdx) < 400, 'level-enabled checkbox must be positioned near the name input');

  // 2. Default fresh level is enabled (hidden is falsy)
  const fresh = createFreshLevel();
  assert.equal(Boolean(fresh.hidden), false, 'Fresh level must be enabled by default');

  // 3. Admin.js contains logic to bind level-enabled and handle candidate.hidden
  assert.match(adminCode, /#level-enabled/);
  assert.match(adminCode, /updateLevelEnabledUi/);
  assert.match(adminCode, /updateTreeItemVisibility/);
  assert.match(adminCode, /candidate\.hidden\s*=\s*true/);
  assert.match(adminCode, /delete\s+candidate\.hidden/);
});

test('admin.js defines esc helper to safely render categorized and uncategorized levels', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const adminCode = fs.readFileSync(path.resolve('admin/admin.js'), 'utf8');

  assert.match(adminCode, /const\s+esc\s*=\s*/, 'esc function must be defined in admin.js');
  assert.match(adminCode, /esc\(l\.name\s*\|\|\s*l\.id\)/, 'esc must be used when rendering level names');
});

test('matchHistoryShortcut recognizes Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z, Cmd variants, and Ukrainian layouts', () => {
  // Ctrl+Z / Cmd+Z -> undo
  assert.equal(matchHistoryShortcut({ ctrlKey: true, key: 'z' }), 'undo');
  assert.equal(matchHistoryShortcut({ ctrlKey: true, code: 'KeyZ' }), 'undo');
  assert.equal(matchHistoryShortcut({ metaKey: true, key: 'z' }), 'undo');
  // Ukrainian keyboard layout: 'я' / 'Я'
  assert.equal(matchHistoryShortcut({ ctrlKey: true, key: 'я' }), 'undo');
  assert.equal(matchHistoryShortcut({ metaKey: true, key: 'Я' }), 'undo');

  // Ctrl+Y / Cmd+Y -> redo
  assert.equal(matchHistoryShortcut({ ctrlKey: true, key: 'y' }), 'redo');
  assert.equal(matchHistoryShortcut({ ctrlKey: true, code: 'KeyY' }), 'redo');
  assert.equal(matchHistoryShortcut({ metaKey: true, key: 'y' }), 'redo');
  // Ukrainian keyboard layout: 'н' / 'Н'
  assert.equal(matchHistoryShortcut({ ctrlKey: true, key: 'н' }), 'redo');
  assert.equal(matchHistoryShortcut({ metaKey: true, key: 'Н' }), 'redo');

  // Ctrl+Shift+Z / Cmd+Shift+Z -> redo
  assert.equal(matchHistoryShortcut({ ctrlKey: true, shiftKey: true, key: 'Z' }), 'redo');
  assert.equal(matchHistoryShortcut({ metaKey: true, shiftKey: true, code: 'KeyZ' }), 'redo');
  assert.equal(matchHistoryShortcut({ ctrlKey: true, shiftKey: true, key: 'Я' }), 'redo');

  // Non-history shortcuts should return null
  assert.equal(matchHistoryShortcut({ ctrlKey: true, key: 's' }), null);
  assert.equal(matchHistoryShortcut({ ctrlKey: true, key: 'a' }), null);
  assert.equal(matchHistoryShortcut({ key: 'z' }), null); // no modifier
  assert.equal(matchHistoryShortcut({ ctrlKey: true, altKey: true, key: 'z' }), null); // AltGr / Alt combo
});

test('matchHistoryShortcut ignores events originating in editable inputs and textareas', () => {
  assert.equal(isEditableTarget({ tagName: 'INPUT' }), true);
  assert.equal(isEditableTarget({ tagName: 'TEXTAREA' }), true);
  assert.equal(isEditableTarget({ tagName: 'SELECT' }), true);
  assert.equal(isEditableTarget({ isContentEditable: true }), true);
  assert.equal(isEditableTarget({ tagName: 'DIV' }), false);
  assert.equal(isEditableTarget(null), false);

  const inputEvent = {
    ctrlKey: true,
    key: 'z',
    target: { tagName: 'INPUT' },
    defaultPrevented: false
  };
  assert.equal(matchHistoryShortcut(inputEvent), null);
  assert.equal(handleHistoryKeyboard(inputEvent), false);
  assert.equal(inputEvent.defaultPrevented, false);
});

test('handleHistoryKeyboard triggers onUndo/onRedo callbacks and prevents default', () => {
  let undoCalled = 0;
  let redoCalled = 0;
  const callbacks = {
    onUndo: () => { undoCalled++; return true; },
    onRedo: () => { redoCalled++; return true; }
  };

  let preventedZ = false;
  const eventZ = {
    ctrlKey: true,
    key: 'z',
    preventDefault: () => { preventedZ = true; }
  };
  const resZ = handleHistoryKeyboard(eventZ, callbacks);
  assert.equal(resZ, true);
  assert.equal(undoCalled, 1);
  assert.equal(preventedZ, true);

  let preventedY = false;
  const eventY = {
    ctrlKey: true,
    key: 'y',
    preventDefault: () => { preventedY = true; }
  };
  const resY = handleHistoryKeyboard(eventY, callbacks);
  assert.equal(resY, true);
  assert.equal(redoCalled, 1);
  assert.equal(preventedY, true);
});

test('admin.js and admin/index.html have undo/redo keyboard listener, perform functions, and button tooltips', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const adminCode = fs.readFileSync(path.resolve('admin/admin.js'), 'utf8');
  const indexHtml = fs.readFileSync(path.resolve('admin/index.html'), 'utf8');

  // admin.js binds document keydown and dispatches to undo/redo
  assert.match(adminCode, /document\.addEventListener\(['"]keydown['"],\s*handleHistoryKeydown\)/);
  assert.match(adminCode, /function\s+performUndo\b/);
  assert.match(adminCode, /function\s+performRedo\b/);
  assert.match(adminCode, /export\s*\{\s*performUndo,\s*performRedo,\s*handleHistoryKeydown\s*\}/);

  // admin/index.html has shortcut hints in titles
  assert.match(indexHtml, /id="undo"[^>]*title="[^"]*Ctrl\+Z/i);
  assert.match(indexHtml, /id="redo"[^>]*title="[^"]*Ctrl\+Y/i);
});


