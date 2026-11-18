// apps-script/Code.gs against a small in-memory spreadsheet (the real one runs only inside Google).
// Run: node --test tests/apps-script.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

function fakeSpreadsheet() {
  const sheets = new Map();
  const shiftKeys = (obj, fn) => Object.fromEntries(Object.entries(obj)
    .map(([key, value]) => { const [r, c] = key.split(',').map(Number); const next = fn(r, c); return next ? [`${next[0]},${next[1]}`, value] : null; })
    .filter(Boolean));

  const makeSheet = (name) => {
    const cells = []; // cells[row][col], 1-based
    const meta = { maxCols: 26, maxRows: 1000, backgrounds: {}, checkboxes: {}, notes: {}, table: false };
    const get = (r, c) => cells[r]?.[c] ?? '';
    const set = (r, c, v) => { (cells[r] ||= [])[c] = v; };
    const filled = (v) => v !== '' && v != null;
    const lastRow = () => cells.reduce((n, row, r) => (row && row.some(filled) ? r : n), 0);
    const lastCol = () => cells.reduce((n, row) => Math.max(n, row ? row.reduce((m, v, c) => (filled(v) ? c : m), 0) : 0), 0);
    const display = (v) => (v instanceof Date ? v.toISOString() : v === true ? 'TRUE' : v === false ? 'FALSE' : String(v));
    let sheet;
    const range = (r, c, nr = 1, nc = 1) => {
      // A sheet converted into a Google Sheets table refuses to read several columns at once.
      const tableCheck = () => { if (meta.table && nc > 1) throw new Error('Щоб виконувати дії в межах одного стовпця, виберіть елемент у ньому.'); };
      const each = (fn) => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => fn(r + i, c + j)));
      const self = {
        getSheet: () => sheet,
        getRow: () => r, getColumn: () => c, getNumRows: () => nr, getNumColumns: () => nc,
        getValue: () => get(r, c),
        getValues: () => { tableCheck(); return each(get); },
        getDisplayValue: () => display(get(r, c)),
        getDisplayValues: () => { tableCheck(); return each((a, b) => display(get(a, b))); },
        setValue: (v) => { each((a, b) => set(a, b, v)); return self; },
        setValues: (vals) => { vals.forEach((row, i) => row.forEach((v, j) => set(r + i, c + j, v))); return self; },
        clearContent: () => { each((a, b) => set(a, b, '')); return self; },
        clearNote: () => { each((a, b) => { delete meta.notes[`${a},${b}`]; }); return self; },
        clearFormat: () => { each((a, b) => { delete meta.backgrounds[`${a},${b}`]; }); return self; },
        clearDataValidations: () => { each((a, b) => { delete meta.checkboxes[`${a},${b}`]; }); return self; },
        getNotes: () => each((a, b) => meta.notes[`${a},${b}`] || ''),
        setNotes: (vals) => { vals.forEach((row, i) => row.forEach((v, j) => { if (v) meta.notes[`${r + i},${c + j}`] = v; else delete meta.notes[`${r + i},${c + j}`]; })); return self; },
        setWrapStrategy: () => self,
        insertCheckboxes: () => { each((a, b) => { meta.checkboxes[`${a},${b}`] = true; set(a, b, false); }); return self; },
        isChecked: () => (meta.checkboxes[`${r},${c}`] ? get(r, c) === true : null),
        setBackground: (b) => { meta.backgrounds[`${r},${c}`] = b; return self; },
        setNumberFormat: () => self, setFontWeight: () => self, setWrap: () => self,
        setVerticalAlignment: () => self, setHorizontalAlignment: () => self
      };
      return self;
    };
    sheet = {
      cells, meta,
      getName: () => name,
      getRange: (r, c, nr, nc) => (typeof r === 'string' ? range(1, 2, 1, 1) : range(r, c, nr, nc)),
      // Like the tutor's sheet: Google reported 0 rows for it, so runs were written over the header.
      getLastRow: () => (meta.table ? 0 : lastRow()),
      getMaxRows: () => meta.maxRows,
      insertRowsAfter: (_, n) => { meta.maxRows += n; },
      insertRowBefore: (row) => {
        cells.splice(row, 0, []);
        for (const key of ['backgrounds', 'checkboxes', 'notes']) meta[key] = shiftKeys(meta[key], (r, c) => [r >= row ? r + 1 : r, c]);
        meta.maxRows++;
      },
      setRowHeightsForced() {}, hideColumns(col) { meta.hidden = col; },
      getLastColumn: lastCol,
      getMaxColumns: () => meta.maxCols,
      insertColumnsAfter: (_, n) => { meta.maxCols += n; },
      insertColumnBefore: (col) => {
        cells.forEach((row) => row && row.splice(col, 0, ''));
        meta.backgrounds = shiftKeys(meta.backgrounds, (r, c) => [r, c >= col ? c + 1 : c]);
        meta.checkboxes = shiftKeys(meta.checkboxes, (r, c) => [r, c >= col ? c + 1 : c]);
        // Like Google: the new column takes the look of its neighbour on the right.
        for (const [key, value] of Object.entries(meta.backgrounds)) {
          const [r, c] = key.split(',').map(Number);
          if (c === col + 1) meta.backgrounds[`${r},${col}`] = value;
        }
        meta.maxCols++;
      },
      deleteRow: (row) => {
        cells.splice(row, 1);
        meta.backgrounds = shiftKeys(meta.backgrounds, (r, c) => (r === row ? null : [r > row ? r - 1 : r, c]));
        meta.checkboxes = shiftKeys(meta.checkboxes, (r, c) => (r === row ? null : [r > row ? r - 1 : r, c]));
        meta.notes = shiftKeys(meta.notes, (r, c) => (r === row ? null : [r > row ? r - 1 : r, c]));
      },
      setFrozenRows() {}, setFrozenColumns() {}, setColumnWidth() {}
    };
    return sheet;
  };
  const ss = {
    getSheetByName: (n) => sheets.get(n) || null,
    insertSheet: (n) => { sheets.set(n, makeSheet(n)); return sheets.get(n); },
    getSpreadsheetTimeZone: () => 'UTC'
  };
  return { ss, sheets };
}

async function loadScript(prepare = () => {}) {
  const { ss, sheets } = fakeSpreadsheet();
  prepare(ss);
  const pad = (n) => String(n).padStart(2, '0');
  const context = {
    SpreadsheetApp: { getActive: () => ss, WrapStrategy: { CLIP: 'CLIP' } },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (text) => ({ setMimeType: () => JSON.parse(text) })
    },
    Utilities: {
      formatDate: (d) => `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`
    },
    Date, JSON, String, Number, Math, Object, Array, isNaN,
    console: { error() {} }
  };
  vm.createContext(context);
  vm.runInContext(await readFile(new URL('../apps-script/Code.gs', import.meta.url), 'utf8'), context);
  context.setup();
  const post = (body) => context.doPost({ postData: { contents: JSON.stringify(body) } });
  const tick = (sheetName, row, value) => {
    const range = sheets.get(sheetName).getRange(row, 3);
    range.setValue(value);
    context.onEdit({ range, source: ss });
  };
  return { context, sheets, post, tick, mine: sheets.get('Учні'), others: sheets.get('Інші учні') };
}

const ev = (id, at, level, result) => ({ id, at, level, levelId: `id-${level}`, result, note: '', cmds: 3, code: 'forward()' });
const DAY1 = '2026-11-14T15:00:00Z';
const DAY2 = '2026-11-17T15:00:00Z';
const names = (sheet) => sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 1).getDisplayValues().map((r) => r[0]).filter(Boolean);

test('anyone can register: new students land in «Інші учні» with an empty «Мій» box', async () => {
  const { post, others, mine } = await loadScript();
  assert.deepEqual(post({ action: 'register', name: '  Софія   К. ', pin: '1907' }), { ok: true, name: 'Софія К.', completed: [] });
  assert.deepEqual(others.getRange(2, 1, 1, 3).getValues()[0], ['Софія К.', '1907', false]);
  assert.equal(others.getRange(2, 3).isChecked(), false);
  assert.deepEqual(names(mine), []);

  assert.equal(post({ action: 'register', name: 'софія к.', pin: '1111' }).error, 'taken', 'names are unique, any case');
  assert.equal(post({ action: 'register', name: 'Іра', pin: '12' }).error, 'pin');
  assert.equal(post({ action: 'register', name: '', pin: '1234' }).error, 'name');
  assert.equal(post({ action: 'login', name: 'Софія К.', pin: '1907' }).ok, true);
});

test('each sheet has one column per day and one short line per level in each cell', async () => {
  const { post, mine, sheets } = await loadScript();
  // The tutor adds a student by hand and ticks «Мій».
  mine.getRange(2, 1, 1, 2).setValues([['Марко', '0123']]);
  mine.getRange(2, 3).insertCheckboxes().setValue(true);

  assert.deepEqual(post({ action: 'log', name: 'Марко', pin: '9999', events: [] }), { ok: false, error: 'auth' });
  assert.deepEqual(post({ action: 'log', name: ' марко ', pin: '0123', events: [
    ev('e1', DAY2, '1.4', 'fell'),
    ev('e2', DAY2, '1.4', 'incomplete'),
    ev('e3', DAY2, '1.4', 'win'),
    ev('e4', DAY2, '1.5', 'error'),
    ev('e5', DAY2, '1.5', 'fell')
  ] }), { ok: true, saved: 5 });
  // The same runs again (a retry after a lost answer) are not counted twice.
  assert.deepEqual(post({ action: 'log', name: 'Марко', pin: '0123', events: [ev('e5', DAY2, '1.5', 'fell')] }), { ok: true, saved: 0 });
  // An older day sent late (the student was offline) still lands left of the newer one.
  post({ action: 'log', name: 'Марко', pin: '0123', events: [ev('e6', DAY1, '1.1', 'win')] });

  assert.deepEqual(mine.getRange(1, 1, 1, 7).getDisplayValues()[0], ['Учень', 'PIN', 'Мій', 'Пройдено', 'ID пройдених', '14.11.2026', '17.11.2026']);
  assert.equal(mine.meta.hidden, 5, 'level IDs are for the game only');
  assert.equal(mine.getRange(2, 6).getValue(), '1.1 — 1 спроба ✓');
  assert.equal(mine.getRange(2, 7).getValue(), '1.4 — 3 спроби ✓\n1.5 — 2 спроби ✗ впав');
  assert.equal(mine.meta.backgrounds['2,7'], '#d9ead3');
  assert.deepEqual(mine.getRange(2, 4, 1, 2).getValues()[0], ['1.1, 1.4', 'id-1.4, id-1.1']);
  assert.equal(sheets.get('Журнал').getLastRow(), 7);
  assert.equal(sheets.get('Інші — журнал').getLastRow(), 1, 'other students\' log stays empty');

  const login = post({ action: 'login', name: 'МАРКО', pin: '0123' });
  assert.equal(login.name, 'Марко');
  assert.deepEqual([...login.completed].sort(), ['id-1.1', 'id-1.4']);
});

test('ticking «Мій» moves a student with all their history; unticking moves them back', async () => {
  const { post, tick, mine, others, sheets } = await loadScript();
  post({ action: 'register', name: 'Іра', pin: '4444' });
  post({ action: 'register', name: 'Софія', pin: '1907' });
  post({ action: 'log', name: 'Іра', pin: '4444', events: [ev('i1', DAY2, '1.1', 'stopped')] });
  post({ action: 'log', name: 'Софія', pin: '1907', events: [ev('s1', DAY1, '1.1', 'win'), ev('s2', DAY2, '1.2', 'fell'), ev('s3', DAY2, '1.2', 'fell')] });
  assert.equal(others.getRange(3, 7).getValue(), '1.2 — 2 спроби ✗ впав');
  assert.equal(others.meta.backgrounds['3,7'], '#fff2cc');

  tick('Інші учні', 3, true); // Софія is the tutor's student

  assert.deepEqual(names(others), ['Іра']);
  assert.deepEqual(names(mine), ['Софія']);
  assert.equal(mine.getRange(2, 3).isChecked(), true);
  assert.equal(mine.getRange(2, 2).getValue(), '1907');
  assert.deepEqual(mine.getRange(1, 6, 1, 2).getDisplayValues()[0], ['14.11.2026', '17.11.2026']);
  assert.equal(mine.getRange(2, 4).getValue(), '1.1', 'passed levels move with her');
  assert.equal(mine.getRange(2, 6).getValue(), '1.1 — 1 спроба ✓');
  assert.equal(mine.getRange(2, 7).getValue(), '1.2 — 2 спроби ✗ впав');
  const mineLog = sheets.get('Журнал');
  const othersLog = sheets.get('Інші — журнал');
  assert.deepEqual(mineLog.getRange(2, 2, 3, 1).getValues().map((r) => r[0]), ['Софія', 'Софія', 'Софія']);
  assert.deepEqual(othersLog.getRange(2, 2, othersLog.getLastRow() - 1, 1).getValues().map((r) => r[0]), ['Іра']);
  assert.equal(others.getRange(2, 7).getValue(), '1.1 — 1 спроба ✗ зупинив', 'Іра keeps her row and day');

  // She keeps playing: the new runs go to the tutor's log and sheet.
  post({ action: 'log', name: 'Софія', pin: '1907', events: [ev('s4', DAY2, '1.2', 'win')] });
  assert.equal(mine.getRange(2, 7).getValue(), '1.2 — 3 спроби ✓');
  assert.equal(mine.getRange(2, 4).getValue(), '1.1, 1.2');
  assert.deepEqual(post({ action: 'login', name: 'Софія', pin: '1907' }).completed.sort(), ['id-1.1', 'id-1.2']);

  tick('Учні', 2, false); // a mistake: back to the others
  assert.deepEqual(names(mine), []);
  assert.deepEqual(names(others), ['Іра', 'Софія']);
  assert.equal(others.getRange(3, 3).isChecked(), false);
  assert.equal(others.getRange(3, 7).getValue(), '1.2 — 3 спроби ✓');
  assert.deepEqual(post({ action: 'login', name: 'Софія', pin: '1907' }).completed.sort(), ['id-1.1', 'id-1.2']);
  assert.equal(mineLog.getLastRow(), 1);

  // Editing the header row is not a move.
  tick('Інші учні', 1, true);
  assert.deepEqual(names(others), ['Іра', 'Софія']);
  assert.deepEqual(names(mine), []);
});

test('setup upgrades the first version of the sheet: «Мій» and «Пройдено» go in before the dates', async () => {
  const { mine } = await loadScript((ss) => {
    const old = ss.insertSheet('Учні');
    old.getRange(1, 1, 1, 3).setValues([['Учень', 'PIN', '14.11.2026']]);
    old.getRange(2, 1, 1, 3).setValues([['Марко', '0123', '1.1 — 1 спроба ✓']]);
  });
  assert.deepEqual(mine.getRange(1, 1, 1, 6).getDisplayValues()[0], ['Учень', 'PIN', 'Мій', 'Пройдено', 'ID пройдених', '14.11.2026']);
  assert.equal(mine.getRange(2, 3).isChecked(), true, 'students added by hand are the tutor\'s');
  assert.equal(mine.getRange(2, 6).getValue(), '1.1 — 1 спроба ✓');
});

test('«Пройдено» is filled once from the log, then sign-in reads only that cell', async () => {
  const { post, mine, sheets } = await loadScript((ss) => {
    // The previous version: «Мій» already there, days from column 4, wins only in the log.
    const old = ss.insertSheet('Учні');
    old.getRange(1, 1, 1, 4).setValues([['Учень', 'PIN', 'Мій', '17.11.2026']]);
    old.getRange(2, 1, 1, 4).setValues([['Марко', '0123', true, '1.10 — 1 спроба ✓']]);
    old.getRange(2, 4).setBackground('#d9ead3');
    const log = ss.insertSheet('Журнал');
    log.getRange(1, 1, 4, 9).setValues([
      ['Час', 'Учень', 'Рівень', 'ID рівня', 'Результат', 'Повідомлення', 'Команд', 'Програма', 'ID запуску'],
      [new Date(DAY2), 'Марко', '1.10', 'id-1.10', '✓', '', 3, 'forward()', 'm1'],
      [new Date(DAY2), 'Марко', '1.2', 'id-1.2', 'впав', '', 3, 'forward()', 'm2'],
      [new Date(DAY2), 'Марко', '1.2', 'id-1.2', '✓', '', 3, 'forward()', 'm3']
    ]);
  });
  assert.deepEqual(mine.getRange(1, 4, 1, 3).getDisplayValues()[0], ['Пройдено', 'ID пройдених', '17.11.2026']);
  assert.equal(mine.getRange(2, 4).getValue(), '1.2, 1.10', 'in level order');
  assert.equal(mine.getRange(2, 6).getValue(), '1.10 — 1 спроба ✓');
  assert.equal(mine.meta.backgrounds['2,6'], '#d9ead3', 'the day keeps its colour');
  assert.equal(mine.meta.backgrounds['2,4'], undefined, 'the new column does not copy it');

  // Deleting runs from the log no longer takes passed levels away.
  sheets.get('Журнал').getRange(2, 1, 3, 9).clearContent();
  assert.deepEqual(post({ action: 'login', name: 'Марко', pin: '0123' }).completed.sort(), ['id-1.10', 'id-1.2']);

  // A level passed again is not listed twice.
  post({ action: 'log', name: 'Марко', pin: '0123', events: [ev('m4', DAY2, '1.2', 'win'), ev('m5', DAY2, '1.3', 'win')] });
  assert.equal(mine.getRange(2, 4).getValue(), '1.2, 1.3, 1.10');
});

test('levels passed in the browser before signing in are added to «Пройдено»', async () => {
  const { post, others } = await loadScript();
  const answer = post({ action: 'register', name: 'Іра', pin: '4444', done: [
    { id: 'id-1.2', level: '1.2' }, { id: 'id-1.1', level: '1.1' }, { id: 'id-1.1', level: '1.1' }, { id: '' }, 'junk'
  ] });
  assert.deepEqual(answer, { ok: true, name: 'Іра', completed: ['id-1.2', 'id-1.1'] });
  assert.deepEqual(others.getRange(2, 4, 1, 2).getValues()[0], ['1.1, 1.2', 'id-1.2, id-1.1']);

  // Later, on another computer where she also played without signing in.
  const login = post({ action: 'login', name: 'Іра', pin: '4444', done: [{ id: 'id-2.1', level: '2.1' }, { id: 'id-1.1', level: '1.1' }] });
  assert.deepEqual(login.completed, ['id-1.2', 'id-1.1', 'id-2.1']);
  assert.equal(others.getRange(2, 4).getValue(), '1.1, 1.2, 2.1');

  // A wrong PIN adds nothing.
  assert.deepEqual(post({ action: 'login', name: 'Іра', pin: '0000', done: [{ id: 'x', level: '9.9' }] }), { ok: false, error: 'auth' });
  assert.equal(others.getRange(2, 4).getValue(), '1.1, 1.2, 2.1');
});

test('code updated without running setup: the first request upgrades the sheet itself', async () => {
  const { post, others } = await loadScript();
  post({ action: 'register', name: 'Богдан', pin: '1234' });
  // Roll the sheet back to the previous layout (no «Пройдено» columns).
  others.cells.forEach((row) => row && row.splice(4, 2));
  assert.equal(others.getRange(1, 4).getValue(), '');
  const answer = post({ action: 'log', name: 'Богдан', pin: '1234', events: [ev('b1', DAY2, '1.4', 'win')] });
  assert.deepEqual(answer, { ok: true, saved: 1 });
  assert.deepEqual(others.getRange(1, 4, 1, 3).getDisplayValues()[0], ['Пройдено', 'ID пройдених', '17.11.2026']);
  assert.equal(others.getRange(2, 4).getValue(), '1.4');
});

test('if a day cell cannot be updated, the runs still land in the log and the error comes back', async () => {
  const { post, others, sheets } = await loadScript();
  post({ action: 'register', name: 'Богдан', pin: '1234' });
  others.setColumnWidth = () => { throw new Error('Щоб виконувати дії в межах одного стовпця, виберіть елемент у ньому.'); };
  const answer = post({ action: 'log', name: 'Богдан', pin: '1234', events: [ev('b1', DAY2, '1.4', 'incomplete')] });
  assert.equal(answer.ok, true);
  assert.equal(answer.saved, 1);
  assert.match(answer.warning, /^17\.11\.2026: .*одного стовпця/);
  assert.equal(sheets.get('Інші — журнал').getLastRow(), 2);

  // Any other failure answers as JSON (browsers block Google's error page as "Failed to fetch").
  assert.deepEqual(Object.keys(post(null)), ['ok', 'error', 'message']);
});

test('sheets turned into Google tables are read column by column, and rebuildDays restores day cells', async () => {
  const { post, context, others, sheets } = await loadScript();
  post({ action: 'register', name: 'Богдан', pin: '1234' });
  for (const sheet of sheets.values()) sheet.meta.table = true;

  const answer = post({ action: 'log', name: 'Богдан', pin: '1234', events: [ev('b1', DAY2, '1.4', 'incomplete'), ev('b2', DAY2, '1.4', 'win')] });
  assert.deepEqual(answer, { ok: true, saved: 2 });
  assert.equal(others.getRange(2, 6).getValue(), '1.4 — 2 спроби ✓');
  assert.deepEqual(post({ action: 'login', name: 'Богдан', pin: '1234' }).completed, ['id-1.4']);

  // Runs that reached the log while the day cell failed: rebuildDays fills the cell from the log.
  others.getRange(2, 6).setValue('');
  context.rebuildDays();
  assert.equal(others.getRange(2, 6).getValue(), '1.4 — 2 спроби ✓');
});

test('runs are appended after the last one even when Google reports an empty sheet', async () => {
  const { post, sheets } = await loadScript();
  post({ action: 'register', name: 'Богдан', pin: '1234' });
  const log = sheets.get('Інші — журнал');
  log.meta.table = true; // getLastRow() → 0, multi-column reads refused

  for (let i = 1; i <= 3; i++) post({ action: 'log', name: 'Богдан', pin: '1234', events: [ev(`b${i}`, DAY2, '1.4', 'fell')] });
  assert.equal(log.getRange(1, 1).getValue(), 'Час', 'the header stays');
  assert.deepEqual([2, 3, 4].map((r) => log.getRange(r, 9).getValue()), ['b1', 'b2', 'b3']);
  // A retry of an already saved run is still recognised.
  assert.equal(post({ action: 'log', name: 'Богдан', pin: '1234', events: [ev('b2', DAY2, '1.4', 'fell')] }).saved, 0);
});

test('the log is one line per run: code on one line, the full program in a note', async () => {
  const { post, sheets } = await loadScript();
  post({ action: 'register', name: 'Богдан', pin: '1234' });
  const program = 'for i in range(2):\n    forward()\nlight()';
  post({ action: 'log', name: 'Богдан', pin: '1234', events: [{ ...ev('b1', DAY2, '1.4', 'win'), code: program }] });
  const log = sheets.get('Інші — журнал');
  assert.equal(log.getRange(2, 8).getValue(), 'for i in range(2): · forward() · light()');
  assert.deepEqual(log.getRange(2, 8, 1, 1).getNotes(), [[program]]);
  assert.equal(log.meta.hidden, 9, 'the run ID column is hidden');
});

test('setup puts the header back above runs written over it and compacts old multi-line code', async () => {
  const { context, sheets } = await loadScript();
  const log = sheets.get('Журнал');
  // The tutor's sheet: runs in rows 1–2, no header.
  log.getRange(1, 1, 2, 9).setValues([
    [new Date(DAY2), 'Богдан', '1.4', 'vlivo-vpravo', 'не до кінця', '…', 8, 'forward()\nforward()\nturn_right()', 'x1'],
    [new Date(DAY2), 'Богдан', '1.4', 'vlivo-vpravo', 'не до кінця', '…', 8, 'forward()', 'x2']
  ]);
  context.setup();
  assert.equal(log.getRange(1, 1).getValue(), 'Час');
  assert.deepEqual([log.getRange(2, 9).getValue(), log.getRange(3, 9).getValue()], ['x1', 'x2']);
  assert.equal(log.getRange(2, 8).getValue(), 'forward() · forward() · turn_right()');
  assert.deepEqual(log.getRange(2, 8, 2, 1).getNotes(), [['forward()\nforward()\nturn_right()'], ['']]);
});

test('attempt counts read naturally in Ukrainian', async () => {
  const { context } = await loadScript();
  const words = [1, 2, 4, 5, 11, 12, 21, 22, 25].map((n) => `${n} ${context.attempts(n)}`);
  assert.deepEqual(words, ['1 спроба', '2 спроби', '4 спроби', '5 спроб', '11 спроб', '12 спроб', '21 спроба', '22 спроби', '25 спроб']);
});
