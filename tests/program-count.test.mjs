import test from 'node:test';
import assert from 'node:assert/strict';
import { ProgramEditor } from '../program.js';

const origDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
const origOption = Object.getOwnPropertyDescriptor(globalThis, 'Option');

function restoreGlobals() {
  if (origDocument) Object.defineProperty(globalThis, 'document', origDocument);
  else delete globalThis.document;
  if (origOption) Object.defineProperty(globalThis, 'Option', origOption);
  else delete globalThis.Option;
}

test('block count format displays Залишилося X/Y for levels with limit, and Блоків: X without limit', () => {
  const mkEl = () => {
    const el = {
      dataset: {},
      append: () => {},
      after: () => {},
      replaceChildren: () => {},
      setAttribute: () => {},
      addEventListener: () => {},
      querySelectorAll: () => [],
      querySelector: () => null,
      classList: { toggle: () => {}, add: () => {}, remove: () => {} },
      parentElement: null
    };
    el.parentElement = {
      classList: { toggle: () => {} },
      querySelectorAll: () => []
    };
    return el;
  };

  const host = mkEl();
  const palette = mkEl();
  const count = mkEl();
  const trash = mkEl();

  globalThis.document = { createElement: mkEl };
  try {
    const levelWithLimit = { limit: 4, allowed: ['forward'] };
    const editor = new ProgramEditor(palette, host, count, levelWithLimit, trash);
    assert.equal(count.textContent, 'Залишилося 4/4');

    editor.insert('forward');
    assert.equal(count.textContent, 'Залишилося 3/4');

    editor.insert('forward');
    editor.insert('forward');
    editor.insert('forward');
    assert.equal(count.textContent, 'Залишилося 0/4');

    const levelNoLimit = { limit: 0, allowed: ['forward'] };
    const editor2 = new ProgramEditor(palette, host, count, levelNoLimit, trash);
    assert.equal(count.textContent, 'Блоків: 0');

    editor2.insert('forward');
    assert.equal(count.textContent, 'Блоків: 1');
  } finally {
    restoreGlobals();
  }
});
test('if block header contains condition editor and icon without text label', () => {
  globalThis.Option = class Option {
    constructor(text, value) {
      this.text = text;
      this.value = value;
    }
  };

  const elements = [];
  const mkEl = () => {
    const children = [];
    const el = {
      children,
      dataset: {},
      append: (...items) => children.push(...items),
      add: (item) => children.push(item),
      after: () => {},
      replaceChildren: () => { children.length = 0; },
      setAttribute: () => {},
      addEventListener: () => {},
      querySelectorAll: () => [],
      querySelector: () => null,
      classList: { toggle: () => {}, add: () => {}, remove: () => {} },
      parentElement: null
    };
    el.parentElement = {
      classList: { toggle: () => {} },
      querySelectorAll: () => []
    };
    elements.push(el);
    return el;
  };

  globalThis.document = { createElement: mkEl, createTextNode: (t) => t };
  try {
    const host = mkEl();
    const palette = mkEl();
    const count = mkEl();
    const trash = mkEl();

    const level = { limit: 0, allowed: ['if'], allowedSensors: ['lampLit'] };
    const editor = new ProgramEditor(palette, host, count, level, trash);
    editor.insert('if');

    const labelFound = elements.some((e) => e.className === 'command-label' && e.textContent?.includes('Якщо'));
    assert.equal(labelFound, false, 'No command-label for if block');

    const condEditor = elements.some((e) => e.className === 'condition-editor');
    assert.equal(condEditor, true, 'Condition editor is created');
  } finally {
    restoreGlobals();
  }
});

test('editor triggers onChange on DnD reorder, DnD trash, condition edit, clear and function changes', () => {
  const elements = [];
  const mkEl = () => {
    const children = [];
    const el = {
      children,
      dataset: {},
      append: (...items) => children.push(...items),
      add: (item) => children.push(item),
      after: () => {},
      replaceChildren: () => { children.length = 0; },
      setAttribute: () => {},
      getAttribute: () => null,
      removeAttribute: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      querySelectorAll: () => [],
      querySelector: () => null,
      remove: () => {},
      classList: { toggle: () => {}, add: () => {}, remove: () => {} },
      parentElement: null
    };
    el.parentElement = {
      classList: { toggle: () => {} },
      querySelectorAll: () => []
    };
    elements.push(el);
    return el;
  };

  globalThis.document = { createElement: mkEl, createTextNode: (t) => t };
  globalThis.Option = class Option {
    constructor(text, value) {
      this.text = text;
      this.value = value;
    }
  };

  try {
    const host = mkEl();
    const palette = mkEl();
    const count = mkEl();
    const trash = mkEl();

    const level = { limit: 0, allowed: ['forward', 'jump', 'if', 'while', 'call'], allowedSensors: ['lampLit', 'obstacleAhead'] };
    const editor = new ProgramEditor(palette, host, count, level, trash);

    let changeCount = 0;
    let lastProgram = null;
    editor.onChange = (prog) => {
      changeCount++;
      lastProgram = prog;
    };

    // 1. Insert two blocks
    editor.insert('forward');
    editor.insert('jump');
    assert.equal(changeCount, 2);
    assert.equal(lastProgram.blocks.length, 2);

    // 2. DnD reorder existing block
    const block0Id = editor.blocks[0].id;
    editor.dnd.drag = { id: block0Id };
    editor.dnd.drop(editor.blocks, 2);
    assert.equal(changeCount, 3, 'DnD drop must trigger onChange');
    assert.equal(lastProgram.blocks[1].id, block0Id);

    // 3. DnD remove block to trash
    const blockToRemoveId = editor.blocks[0].id;
    editor.dnd.drag = { id: blockToRemoveId };
    editor.dnd.removeDragged();
    assert.equal(changeCount, 4, 'DnD removeDragged must trigger onChange');
    assert.equal(lastProgram.blocks.length, 1);

    // 4. Clear editor
    editor.clear();
    assert.equal(changeCount, 5, 'clear() must trigger onChange');
    assert.equal(lastProgram.blocks.length, 0);

    // 5. Condition change in if block
    editor.insert('if');
    const countBeforeCond = changeCount;
    // Trigger condition editor
    const cond = editor.blocks[0].condition || editor.blocks[0].branches?.[0]?.condition;
    assert.ok(cond);
    const condEl = editor.conditionEditor(cond);
    const notBtn = condEl.children.find((c) => c.className?.includes('not-btn'));
    assert.ok(notBtn && typeof notBtn.onclick === 'function');
    notBtn.onclick();
    assert.ok(changeCount > countBeforeCond, 'Toggling NOT button must trigger onChange');

    // 6. Function creation and renaming
    const countBeforeFn = changeCount;
    editor.addFunction();
    assert.ok(changeCount > countBeforeFn, 'addFunction must trigger onChange');
  } finally {
    restoreGlobals();
  }
});

test('blocks are added into loop when the last block is a loop (loop, while, nested)', () => {
  const elements = [];
  const mkEl = () => {
    const children = [];
    const el = {
      children,
      dataset: {},
      append: (...items) => children.push(...items),
      add: (item) => children.push(item),
      after: () => {},
      replaceChildren: () => { children.length = 0; },
      setAttribute: () => {},
      getAttribute: () => null,
      removeAttribute: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      querySelectorAll: () => [],
      querySelector: () => null,
      remove: () => {},
      classList: { toggle: () => {}, add: () => {}, remove: () => {} },
      parentElement: null
    };
    el.parentElement = {
      classList: { toggle: () => {} },
      querySelectorAll: () => []
    };
    elements.push(el);
    return el;
  };

  globalThis.document = { createElement: mkEl, createTextNode: (t) => t };
  globalThis.Option = class Option {
    constructor(text, value) {
      this.text = text;
      this.value = value;
    }
  };

  try {
    const host = mkEl();
    const palette = mkEl();
    const count = mkEl();
    const trash = mkEl();
    const level = { limit: 0, allowed: ['forward', 'left', 'right', 'jump', 'light', 'loop', 'while'] };
    const editor = new ProgramEditor(palette, host, count, level, trash);

    // 1. Initially empty: insert forward goes to root
    editor.insert('forward');
    assert.equal(editor.blocks.length, 1);
    assert.equal(editor.blocks[0].type, 'forward');

    // 2. Insert loop: now the last block in root is a loop
    editor.insert('loop');
    assert.equal(editor.blocks.length, 2);
    assert.equal(editor.blocks[1].type, 'loop');
    assert.equal(editor.blocks[1].body.length, 0);

    // 3. Insert forward: since last block is loop, goes into loop.body
    editor.insert('forward');
    assert.equal(editor.blocks.length, 2, 'Should not add new block to root');
    assert.equal(editor.blocks[1].body.length, 1);
    assert.equal(editor.blocks[1].body[0].type, 'forward');

    // 4. Insert light: still goes into loop.body
    editor.insert('light');
    assert.equal(editor.blocks.length, 2);
    assert.equal(editor.blocks[1].body.length, 2);
    assert.equal(editor.blocks[1].body[1].type, 'light');

    // 5. Insert nested loop: goes into loop.body
    editor.insert('loop');
    assert.equal(editor.blocks[1].body.length, 3);
    const innerLoop = editor.blocks[1].body[2];
    assert.equal(innerLoop.type, 'loop');
    assert.equal(innerLoop.body.length, 0);

    // 6. Insert jump: goes into innerLoop.body
    editor.insert('jump');
    assert.equal(innerLoop.body.length, 1);
    assert.equal(innerLoop.body[0].type, 'jump');

    // 7. Clicking host sets selected to 'root' and subsequent insert goes to root
    host.onclick({ target: host });
    editor.insert('left');
    assert.equal(editor.blocks.length, 3);
    assert.equal(editor.blocks[2].type, 'left');

    // 8. Now last block is 'left' (not loop): next insert goes to root
    editor.insert('right');
    assert.equal(editor.blocks.length, 4);
    assert.equal(editor.blocks[3].type, 'right');

    // 9. While loop support
    editor.clear();
    editor.insert('while');
    assert.equal(editor.blocks.length, 1);
    assert.equal(editor.blocks[0].type, 'while');
    editor.insert('jump');
    assert.equal(editor.blocks.length, 1);
    assert.equal(editor.blocks[0].body.length, 1);
    assert.equal(editor.blocks[0].body[0].type, 'jump');

    // 10. Palette button click integration
    editor.renderPalette();
    const forwardBtn = palette.children.find((b) => b.className?.includes('command-forward'));
    assert.ok(forwardBtn && typeof forwardBtn.onclick === 'function');
    forwardBtn.onclick();
    assert.equal(editor.blocks[0].body.length, 2);
    assert.equal(editor.blocks[0].body[1].type, 'forward');
  } finally {
    restoreGlobals();
  }
});

test('canvas and blocks smooth puzzle card UX: while inlined header, pop-in, loop pill and highlight', async () => {
  const elements = [];
  const mkEl = () => {
    const children = [];
    const classListSet = new Set();
    let _className = '';
    const el = {
      children,
      dataset: {},
      append: (...items) => children.push(...items),
      add: (item) => children.push(item),
      after: () => {},
      replaceChildren: () => { children.length = 0; },
      setAttribute: (k, v) => { el[k] = v; },
      getAttribute: (k) => el[k] || null,
      removeAttribute: (k) => { delete el[k]; },
      addEventListener: () => {},
      removeEventListener: () => {},
      querySelectorAll: (sel) => elements.filter((e) => (sel === '.block' ? (e.className && e.className.includes('block')) : false)),
      querySelector: () => null,
      remove: () => {},
      classList: {
        toggle: (c, val) => {
          if (val === undefined) val = !classListSet.has(c);
          if (val) classListSet.add(c);
          else classListSet.delete(c);
          _className = Array.from(classListSet).join(' ');
          return val;
        },
        add: (c) => { classListSet.add(c); _className = Array.from(classListSet).join(' '); },
        remove: (c) => { classListSet.delete(c); _className = Array.from(classListSet).join(' '); },
        contains: (c) => classListSet.has(c)
      },
      parentElement: null,
      scrollIntoView: null
    };
    Object.defineProperty(el, 'className', {
      get() { return _className; },
      set(v) {
        _className = v;
        classListSet.clear();
        (v || '').split(/\s+/).filter(Boolean).forEach((c) => classListSet.add(c));
      }
    });
    el.parentElement = {
      classList: { toggle: () => {} },
      querySelectorAll: (sel) => elements.filter((e) => (sel === '.block' ? (e.className && e.className.includes('block')) : false))
    };
    elements.push(el);
    return el;
  };

  const oldDoc = globalThis.document;
  const oldOption = globalThis.Option;
  globalThis.document = { createElement: mkEl, createTextNode: (t) => t };
  globalThis.Option = class Option {
    constructor(text, value) {
      this.text = text;
      this.value = value;
    }
  };
  try {
    const host = mkEl();
    const palette = mkEl();
    const count = mkEl();
    const trash = mkEl();

    let changes = 0;
    const level = { limit: 0, allowed: ['forward', 'loop', 'while', 'if'], allowedSensors: ['lampLit'], allowElif: true, allowElse: true };
    const editor = new ProgramEditor(palette, host, count, level, trash);
    editor.onChange = () => { changes++; };

    // 1. Insert forward: has command-label in block-head and block-pop-in
    editor.insert('forward');
    const fBlock = host.children[0];
    assert.ok(fBlock.className.includes('block-pop-in'), 'New block has block-pop-in class');
    const fHead = fBlock.children.find((c) => c.className === 'block-head');
    assert.ok(fHead, 'Block has block-head');
    const fLabel = fHead.children.find((c) => c.className === 'command-label');
    assert.ok(fLabel && fLabel.textContent?.length > 0, 'Simple block contains command-label in head');

    // 2. Insert loop: has loop-times pill with +/- buttons
    editor.insert('loop');
    const loopBlock = host.children[1];
    const loopHead = loopBlock.children.find((c) => c.className === 'block-head');
    const loopTimes = loopHead.children.find((c) => c.className === 'loop-times');
    assert.ok(loopTimes, 'Loop has loop-times in block-head');
    const minusBtn = loopTimes.children[0];
    const timesValue = loopTimes.children[1];
    const plusBtn = loopTimes.children[2];
    assert.equal(timesValue.textContent, '2×');
    
    // Test in-place update of loop counter without re-drawing host
    const initialHostChildren = [...host.children];
    plusBtn.onclick({ stopPropagation: () => {} });
    assert.equal(editor.blocks[1].times, 3);
    assert.equal(timesValue.textContent, '3×');
    assert.equal(host.children.length, initialHostChildren.length, 'Host was not re-created');
    minusBtn.onclick({ stopPropagation: () => {} });
    assert.equal(editor.blocks[1].times, 2);
    assert.equal(timesValue.textContent, '2×');
    minusBtn.onclick({ stopPropagation: () => {} });
    assert.equal(editor.blocks[1].times, 1);
    assert.equal(timesValue.textContent, '1×');
    minusBtn.onclick({ stopPropagation: () => {} });
    assert.equal(editor.blocks[1].times, 1, 'Loop cannot go below 1x');
    assert.equal(timesValue.textContent, '1×');
    assert.ok(changes > 0, 'onChange fired on loop counter update');

    // 3. Insert while: condition editor is in block-head, not in row body
    editor.clear();
    editor.insert('while');
    const whileBlock = host.children[0];
    const whileHead = whileBlock.children.find((c) => c.className === 'block-head');
    const condInHead = whileHead.children.find((c) => c.className === 'condition-editor');
    assert.ok(condInHead, 'While has condition-editor inside block-head');
    const condInRow = whileBlock.children.filter((c) => c.className === 'condition-editor');
    assert.equal(condInRow.length, 0, 'No extra condition-editor on second floor of while row');

    // 4. Highlight smooth scrollIntoView
    let scrollCalledWith = null;
    whileBlock.scrollIntoView = (opts) => { scrollCalledWith = opts; };
    editor.highlight(editor.blocks[0].id);
    assert.ok(whileBlock.className.includes('active'), 'Active class added to highlighted block');
    assert.deepEqual(scrollCalledWith, { behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  } finally {
    globalThis.document = oldDoc;
    if (oldOption === undefined) delete globalThis.Option;
    else globalThis.Option = oldOption;
  }
});

test('program list scrolls internally with pinned controls, preserves scrollTop on draw, and auto-scrolls on insert', async () => {
  const { readFile } = await import('node:fs/promises');
  const gameCss = await readFile(new URL('../game.css', import.meta.url), 'utf8');
  const blocksCss = await readFile(new URL('../blocks.css', import.meta.url), 'utf8');

  assert.match(gameCss, /\.program-panel\s*\{[^}]*position:\s*sticky/);
  assert.match(gameCss, /\.program-panel\s+\.program\s*\{[^}]*overflow-y:\s*auto/);
  assert.match(blocksCss, /\.program-panel\s+\.program\s*\{[^}]*overflow-y:\s*auto/);

  const elements = [];
  let lastInsertedScrollOpts = null;
  const mkEl = () => {
    const children = [];
    const el = {
      children,
      dataset: {},
      style: {},
      scrollTop: 0,
      scrollHeight: 500,
      append: (...items) => children.push(...items),
      add: (item) => children.push(item),
      after: () => {},
      replaceChildren: () => {
        children.length = 0;
        el.scrollTop = 0; // Simulate browser resetting scrollTop when children are cleared
      },
      setAttribute: () => {},
      getAttribute: () => null,
      removeAttribute: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      querySelectorAll: (sel) =>
        elements.filter((e) => (sel === '.block' ? e.className?.includes('block') : false)),
      querySelector: () => null,
      remove: () => {},
      scrollIntoView: (opts) => {
        lastInsertedScrollOpts = opts;
      },
      classList: { toggle: () => {}, add: () => {}, remove: () => {} },
      parentElement: null
    };
    el.parentElement = {
      classList: { toggle: () => {} },
      querySelectorAll: (sel) =>
        elements.filter((e) => (sel === '.block' ? e.className?.includes('block') : false))
    };
    elements.push(el);
    return el;
  };

  globalThis.document = { createElement: mkEl, createTextNode: (t) => t };
  try {
    const host = mkEl();
    const palette = mkEl();
    const count = mkEl();
    const trash = mkEl();

    const level = { limit: 0, allowed: ['forward', 'left', 'right'] };
    const editor = new ProgramEditor(palette, host, count, level, trash);

    lastInsertedScrollOpts = null;
    editor.insert('forward');
    assert.deepEqual(
      lastInsertedScrollOpts,
      { behavior: 'smooth', block: 'nearest', inline: 'nearest' },
      'Newly inserted block should smoothly scroll into view'
    );

    // Simulate user scrolling #program down to 180px and triggering a redraw
    host.scrollTop = 180;
    editor.draw();
    assert.equal(host.scrollTop, 180, 'draw() must preserve host.scrollTop across replaceChildren()');
  } finally {
    restoreGlobals();
  }
});

test('trash button is placed next to drop slot (Поклади) in .program-drop-row and if/elif/else branches support convenient click insertion', async () => {
  const { readFile } = await import('node:fs/promises');
  const runnerJs = await readFile(new URL('../runner.js', import.meta.url), 'utf8');

  const runBarMatch = runnerJs.match(/<div class="program-run-bar">[\s\S]*?<\/div>/);
  assert.ok(runBarMatch && !runBarMatch[0].includes('id="trash"'), 'Trash button must be moved out of .program-run-bar');

  const elements = [];
  const mkEl = () => {
    const children = [];
    const el = {
      children,
      dataset: {},
      style: {},
      append: (...items) => children.push(...items),
      add: (item) => children.push(item),
      after: () => {},
      replaceChildren: () => { children.length = 0; },
      setAttribute: () => {},
      getAttribute: () => null,
      removeAttribute: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      querySelectorAll: () => [],
      querySelector: () => null,
      remove: () => {},
      classList: { toggle: () => {}, add: () => {}, remove: () => {} },
      parentElement: null
    };
    el.parentElement = {
      classList: { toggle: () => {} },
      querySelectorAll: () => []
    };
    elements.push(el);
    return el;
  };

  globalThis.document = { createElement: mkEl, createTextNode: (t) => t };
  globalThis.Option = class Option {
    constructor(text, value) {
      this.text = text;
      this.value = value;
    }
  };

  try {
    const host = mkEl();
    const palette = mkEl();
    const count = mkEl();
    const trash = mkEl();

    const level = {
      limit: 0,
      allowed: ['forward', 'left', 'right', 'light', 'if'],
      allowedSensors: ['lampLit', 'obstacleAhead'],
      allowElif: true,
      allowElse: true
    };
    const editor = new ProgramEditor(palette, host, count, level, trash);

    // 1. Verify .program-drop-row at end of host containing .program-drop-slot and trash
    const dropRow = host.children[host.children.length - 1];
    assert.equal(dropRow.className, 'program-drop-row');
    assert.ok(dropRow.children[0].className.includes('program-drop-slot'));
    assert.ok(dropRow.children[0].textContent.includes('Поклади'));
    assert.equal(dropRow.children[1], trash, 'Trash button sits right next to Поклади slot');

    // 2. Insert if -> subsequent insert goes into if branch 0 body
    editor.insert('if');
    editor.insert('light');
    assert.equal(editor.blocks.length, 1);
    assert.equal(editor.blocks[0].branches[0].body.length, 1);
    assert.equal(editor.blocks[0].branches[0].body[0].type, 'light');

    // 3. Click + else -> subsequent insert goes into elseBody, and .branch-actions is at the bottom of the if block
    const ifRow = host.children[0];
    const actionsRow = ifRow.children.find((c) => c.className === 'branch-actions');
    const addElseBtn = actionsRow.children.find((c) => c.className === 'add-else-btn');
    addElseBtn.onclick();
    editor.insert('forward');
    assert.equal(editor.blocks[0].elseBody.length, 1);
    assert.equal(editor.blocks[0].elseBody[0].type, 'forward');

    const updatedIfRow = host.children[0];
    assert.equal(
      updatedIfRow.children[updatedIfRow.children.length - 1].className,
      'branch-actions',
      'branch-actions (+ інакше якщо) stays cleanly at the bottom of the if block after else-section'
    );

    // 4. Click .program-drop-slot ("＋ Поклади") -> selects root so next command is added after the if block
    const latestDropRow = host.children[host.children.length - 1];
    latestDropRow.children[0].onclick({ stopPropagation: () => {} });
    editor.insert('right');
    assert.equal(editor.blocks.length, 2);
    assert.equal(editor.blocks[1].type, 'right');
  } finally {
    restoreGlobals();
  }
});


