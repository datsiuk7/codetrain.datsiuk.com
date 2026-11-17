/**
 * «Ліхтарник» → Google Таблиця репетитора.
 *
 * «Учні» — твої учні: Учень | PIN | Мій ☑ | 14.11.2026 | 17.11.2026 | …
 *   У клітинці дня кожен рівень, який учень запускав того дня, окремим рядком:
 *   «1.4 — 3 спроби ✓» або «1.5 — 5 спроб ✗ впав».
 * «Журнал» — один рядок на кожне натискання «Запустити» твоїх учнів (з кодом програми).
 * «Інші учні» та «Інші — журнал» — те саме для всіх, хто зареєструвався сам.
 *
 * Хто реєструється в грі, потрапляє в «Інші учні». Постав галочку «Мій» — учень разом
 * з усією історією переїде в «Учні». Зняв галочку в «Учні» — переїде назад в «Інші учні».
 * Забув учень PIN — подивись або зміни його прямо в таблиці.
 * Клітинки днів розійшлися з журналом — запусти функцію rebuildDays, вона збудує їх заново.
 *
 * Встановлення:
 *  1. Створи Google Таблицю → Розширення → Apps Script, встав цей файл замість вмісту Код.gs.
 *  2. Вибери функцію setup і натисни «Запустити» (Google попросить дозвіл на доступ до таблиці).
 *  3. Ввести в дію → Нове введення в дію → тип «Веб-додаток»:
 *     «Виконувати як» — Я, «Хто має доступ» — Усі. Скопіюй URL, що закінчується на /exec.
 *  4. Встав цей URL в адмінці гри: Налаштування → «Google Таблиця для учнів».
 *
 * Після зміни цього коду: збережи, ще раз запусти setup, потім
 * Ввести в дію → Керувати введеннями в дію → ✏️ → Версія: «Нова версія» → Ввести в дію.
 * Тоді URL лишається тим самим.
 */

const MINE = 'Учні';
const MINE_LOG = 'Журнал';
const OTHERS = 'Інші учні';
const OTHERS_LOG = 'Інші — журнал';
const LOG_OF = {};
LOG_OF[MINE] = MINE_LOG;
LOG_OF[OTHERS] = OTHERS_LOG;

const CHECK_COL = 3;     // «Мій» ☑
const FIRST_DAY_COL = 4; // перша дата
const LOG_HEADERS = ['Час', 'Учень', 'Рівень', 'ID рівня', 'Результат', 'Повідомлення', 'Команд', 'Програма', 'ID запуску'];
const WIN = '✓';
const RESULTS = {
  win: WIN,
  fell: 'впав',
  shock: 'струм',
  error: 'помилка',
  incomplete: 'не до кінця',
  invalid: 'не запустилась',
  stopped: 'зупинив'
};
const DAY = 'dd.MM.yyyy';

function setup() {
  const ss = SpreadsheetApp.getActive();
  setupStudents(ss, MINE, 0, true);
  setupStudents(ss, OTHERS, 1, false);
  setupLog(ss, MINE_LOG);
  setupLog(ss, OTHERS_LOG);
}

function setupStudents(ss, name, index, mine) {
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name, index);
  if (!sheet.getRange(1, 1).getValue()) sheet.getRange(1, 1, 1, 2).setValues([['Учень', 'PIN']]);
  // Таблиця з попередньої версії: стовпця «Мій» ще немає — вставляємо його перед датами.
  if (sheet.getRange(1, CHECK_COL).getDisplayValue() !== 'Мій') {
    if (sheet.getLastColumn() >= CHECK_COL) sheet.insertColumnBefore(CHECK_COL);
    sheet.getRange(1, CHECK_COL).setValue('Мій');
    const rows = lastRow(sheet) - 1;
    if (rows > 0) sheet.getRange(2, CHECK_COL, rows, 1).insertCheckboxes().setValue(mine);
  }
  sheet.getRange(1, 1, 1, CHECK_COL).setFontWeight('bold');
  sheet.getRange('B:B').setNumberFormat('@'); // PIN як текст: нулі на початку не зникають
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(CHECK_COL);
  sheet.setColumnWidth(1, 160);
  sheet.setColumnWidth(2, 70);
  sheet.setColumnWidth(CHECK_COL, 50);
}

function setupLog(ss, name) {
  const log = ss.getSheetByName(name) || ss.insertSheet(name);
  // Заголовок могли перезаписати запуски (стара версія писала з першого рядка): повертаємо його над даними.
  const first = log.getRange(1, 1).getDisplayValue();
  if (first && first !== LOG_HEADERS[0]) log.insertRowBefore(1);
  log.getRange(1, 1, 1, LOG_HEADERS.length).setValues([LOG_HEADERS]).setFontWeight('bold');
  log.setFrozenRows(1);
  compactLog(log);
}

// Журнал в один рядок на запуск: довгий текст обрізається, код програми — у примітці (видно при наведенні).
function compactLog(log) {
  const rows = log.getMaxRows();
  log.getRange(1, 1, rows, LOG_HEADERS.length)
    .setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP)
    .setVerticalAlignment('middle');
  log.setRowHeightsForced(1, rows, 21);
  [150, 120, 55, 110, 95, 260, 60, 260].forEach(function (width, i) { log.setColumnWidth(i + 1, width); });
  log.hideColumns(9); // ID запуску потрібен лише скрипту

  // Код у старих рядках: багаторядковий текст → один рядок + примітка з повним кодом.
  const last = lastRow(log);
  if (last < 2) return;
  const codeRange = log.getRange(2, 8, last - 1, 1);
  const codes = codeRange.getValues();
  const notes = codeRange.getNotes();
  let changed = false;
  codes.forEach(function (r, i) {
    const code = String(r[0]);
    if (code.indexOf('\n') < 0) return;
    if (!notes[i][0]) notes[i][0] = code;
    r[0] = oneLine(code);
    changed = true;
  });
  if (changed) {
    codeRange.setValues(codes);
    codeRange.setNotes(notes);
  }
}

function oneLine(code) {
  return String(code).split('\n').map(function (s) { return s.trim(); }).filter(Boolean).join(' · ');
}

// Останній заповнений рядок за стовпцем A (час запуску або ім'я учня). getLastRow() на деяких аркушах
// повертає 0, і тоді нові запуски записувались поверх перших рядків.
function lastRow(sheet) {
  const values = sheet.getRange(1, 1, sheet.getMaxRows(), 1).getValues();
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i][0] !== '' && values[i][0] !== null) return i + 1;
  }
  return 0;
}

function doGet() {
  return out({ ok: true, app: 'lamplighter' });
}

function doPost(e) {
  try {
    return handle(e);
  } catch (err) {
    // Помилка в скрипті повертається грі текстом, а не сторінкою Google: учень побачить її у вікні входу.
    console.error(err && err.stack || err);
    return out({ ok: false, error: 'server', message: String(err && err.stack || err).slice(0, 500) });
  }
}

function handle(e) {
  let req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return out({ ok: false, error: 'bad-request' });
  }
  const ss = SpreadsheetApp.getActive();
  if (req.action === 'register') return out(withLock(function () { return register(ss, req.name, req.pin); }));

  const student = findStudent(ss, req.name, req.pin);
  if (!student) return out({ ok: false, error: 'auth' });

  if (req.action === 'login') {
    return out({ ok: true, name: student.name, completed: completedLevels(ss, student) });
  }
  if (req.action === 'log') {
    return out(withLock(function () {
      // Галочку могли переставити, поки чекали черги: учень міг переїхати.
      const current = findStudent(ss, req.name, req.pin);
      if (!current) return { ok: false, error: 'auth' };
      const result = saveEvents(ss, current, Array.isArray(req.events) ? req.events : []);
      const answer = { ok: true, saved: result.saved };
      if (result.warnings.length) answer.warning = result.warnings.join('\n');
      return answer;
    }));
  }
  return out({ ok: false, error: 'bad-request' });
}

// Два учні можуть надіслати дані одночасно: записуємо по черзі.
function withLock(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) return { ok: false, error: 'busy' };
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

// Аркуш, перетворений на таблицю Google («Перетворити на таблицю»), не дає читати кілька стовпців
// разом («виберіть елемент в одному стовпці»). Тоді читаємо стовпці по одному і складаємо рядки.
function read(range, display) {
  try {
    return display ? range.getDisplayValues() : range.getValues();
  } catch (err) {
    const sheet = range.getSheet();
    const row = range.getRow(), col = range.getColumn(), rows = range.getNumRows(), cols = range.getNumColumns();
    const columns = [];
    for (let j = 0; j < cols; j++) {
      const part = sheet.getRange(row, col + j, rows, 1);
      columns.push(display ? part.getDisplayValues() : part.getValues());
    }
    const result = [];
    for (let i = 0; i < rows; i++) result.push(columns.map(function (c) { return c[i][0]; }));
    return result;
  }
}

function out(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function norm(s) {
  return String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, ' ');
}

function studentRows(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  const last = sheet ? lastRow(sheet) : 0;
  return last > 1 ? read(sheet.getRange(2, 1, last - 1, 2), true) : [];
}

// Учень шукається в обох аркушах; повертає, де він зараз.
function findStudent(ss, name, pin) {
  if (!norm(name)) return null;
  const sheets = [MINE, OTHERS];
  for (let s = 0; s < sheets.length; s++) {
    const rows = studentRows(ss, sheets[s]);
    for (let i = 0; i < rows.length; i++) {
      if (norm(rows[i][0]) === norm(name) && String(rows[i][1]).trim() === String(pin == null ? '' : pin).trim()) {
        return { name: String(rows[i][0]).trim(), row: i + 2, sheet: sheets[s] };
      }
    }
  }
  return null;
}

// Будь-хто може зареєструватися: новий учень потрапляє в «Інші учні».
function register(ss, name, pin) {
  const cleanName = String(name == null ? '' : name).trim().replace(/\s+/g, ' ');
  const cleanPin = String(pin == null ? '' : pin).trim();
  if (!cleanName || cleanName.length > 60) return { ok: false, error: 'name' };
  if (cleanPin.length < 4 || cleanPin.length > 12) return { ok: false, error: 'pin' };
  const taken = [MINE, OTHERS].some(function (sheetName) {
    return studentRows(ss, sheetName).some(function (r) { return norm(r[0]) === norm(cleanName); });
  });
  if (taken) return { ok: false, error: 'taken' };

  const sheet = ss.getSheetByName(OTHERS);
  const row = lastRow(sheet) + 1;
  if (row > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 50);
  sheet.getRange(row, 1, 1, 2).setNumberFormat('@').setValues([[cleanName, cleanPin]]);
  sheet.getRange(row, CHECK_COL).insertCheckboxes().setValue(false);
  return { ok: true, name: cleanName, completed: [] };
}

function logRows(ss, logName) {
  const log = ss.getSheetByName(logName);
  const last = lastRow(log);
  return last > 1 ? read(log.getRange(2, 1, last - 1, LOG_HEADERS.length), false) : [];
}

function completedLevels(ss, student) {
  const ids = {};
  logRows(ss, LOG_OF[student.sheet]).forEach(function (r) {
    if (norm(r[1]) === norm(student.name) && r[4] === WIN && r[3]) ids[r[3]] = true;
  });
  return Object.keys(ids);
}

function saveEvents(ss, student, events) {
  const log = ss.getSheetByName(LOG_OF[student.sheet]);
  const tz = ss.getSpreadsheetTimeZone();
  const last = Math.max(lastRow(log), 1); // рядок 1 — заголовок
  // Гра повторює відправку, якщо не дочекалась відповіді: такі запуски вже можуть бути записані.
  const recent = Math.min(2000, last - 1);
  const known = {};
  if (recent > 0) {
    log.getRange(last - recent + 1, 9, recent, 1).getValues().forEach(function (r) { known[r[0]] = true; });
  }

  const rows = [];
  const days = {};
  events.forEach(function (ev) {
    if (!ev || !ev.id || known[ev.id]) return;
    known[ev.id] = true;
    let at = new Date(ev.at);
    if (isNaN(at.getTime())) at = new Date();
    rows.push([
      at,
      student.name,
      String(ev.level || ev.levelId || ''),
      String(ev.levelId || ''),
      RESULTS[ev.result] || String(ev.result || ''),
      String(ev.note || '').slice(0, 300),
      Number(ev.cmds) || 0,
      String(ev.code || '').slice(0, 5000),
      String(ev.id)
    ]);
    days[Utilities.formatDate(at, tz, DAY)] = true;
  });

  if (rows.length) appendLog(log, last, rows);
  // Запуски вже в журналі. Якщо клітинку дня оновити не вдалося, гра не повторюватиме відправку,
  // а текст помилки повернеться в «warning», щоб було видно причину.
  const warnings = [];
  Object.keys(days).forEach(function (day) {
    try {
      updateDayCell(ss, student, day, tz);
    } catch (err) {
      console.error(err && err.stack || err);
      warnings.push(day + ': ' + String(err && err.stack || err).slice(0, 400));
    }
  });
  return { saved: rows.length, warnings: warnings };
}

// rows[i][7] — повний код програми; notes (необов'язково) — уже готові примітки, коли рядки переїжджають.
function appendLog(log, last, rows, notes) {
  const need = last + rows.length - log.getMaxRows();
  if (need > 0) log.insertRowsAfter(log.getMaxRows(), need + 100);
  const codeNotes = notes || rows.map(function (r) { return [String(r[7]).indexOf('\n') >= 0 ? String(r[7]) : '']; });
  const values = rows.map(function (r) {
    const copy = r.slice();
    copy[7] = oneLine(copy[7]);
    return copy;
  });
  const range = log.getRange(last + 1, 1, rows.length, LOG_HEADERS.length);
  // Текстовий формат, інакше «1.10» стане числом 1.1, а код, що починається з «=», — формулою.
  log.getRange(last + 1, 2, rows.length, 6).setNumberFormat('@');
  log.getRange(last + 1, 8, rows.length, 2).setNumberFormat('@');
  log.getRange(last + 1, 1, rows.length, 1).setNumberFormat('dd.MM.yyyy HH:mm:ss');
  range.setValues(values).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP).setVerticalAlignment('middle');
  log.getRange(last + 1, 8, rows.length, 1).setNotes(codeNotes);
}

function attempts(n) {
  const d = n % 10, h = n % 100;
  if (d === 1 && h !== 11) return 'спроба';
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return 'спроби';
  return 'спроб';
}

function updateDayCell(ss, student, day, tz) {
  const order = [];
  const byLevel = {};
  logRows(ss, LOG_OF[student.sheet]).forEach(function (r) {
    if (!(r[0] instanceof Date) || norm(r[1]) !== norm(student.name)) return;
    if (Utilities.formatDate(r[0], tz, DAY) !== day) return;
    const level = String(r[2]);
    if (!byLevel[level]) {
      byLevel[level] = { tries: 0, won: false, last: '' };
      order.push(level);
    }
    const s = byLevel[level];
    s.tries++;
    if (r[4] === WIN) s.won = true;
    else s.last = r[4];
  });

  const lines = order.map(function (level) {
    const s = byLevel[level];
    return level + ' — ' + s.tries + ' ' + attempts(s.tries) + ' ' + (s.won ? WIN : '✗ ' + s.last);
  });
  const anyWon = order.some(function (level) { return byLevel[level].won; });

  const sheet = ss.getSheetByName(student.sheet);
  const cell = sheet.getRange(student.row, dayColumn(sheet, day));
  cell.setNumberFormat('@')
    .setValue(lines.join('\n'))
    .setWrap(true)
    .setVerticalAlignment('top')
    .setBackground(lines.length ? (anyWon ? '#d9ead3' : '#fff2cc') : null);
}

// Стовпець дня; новий день вставляється так, щоб дати йшли зліва направо по порядку.
function dayColumn(sheet, day) {
  const lastCol = Math.max(sheet.getLastColumn(), CHECK_COL);
  const headers = read(sheet.getRange(1, 1, 1, lastCol), true)[0];
  const found = headers.indexOf(day);
  if (found >= FIRST_DAY_COL - 1) return found + 1;

  const sortKey = function (d) { return d.split('.').reverse().join(''); };
  let col = lastCol + 1;
  for (let c = FIRST_DAY_COL; c <= lastCol; c++) {
    if (/^\d\d\.\d\d\.\d{4}$/.test(headers[c - 1]) && sortKey(headers[c - 1]) > sortKey(day)) {
      col = c;
      break;
    }
  }
  if (col <= lastCol) sheet.insertColumnBefore(col);
  else if (col > sheet.getMaxColumns()) sheet.insertColumnsAfter(sheet.getMaxColumns(), 10);
  sheet.getRange(1, col).setNumberFormat('@').setValue(day).setFontWeight('bold').setHorizontalAlignment('center');
  sheet.setColumnWidth(col, 200);
  return col;
}

// Галочка «Мій»: постав в «Інші учні» — учень переїде в «Учні»; зніми в «Учні» — переїде назад.
function onEdit(e) {
  const range = e && e.range;
  if (!range || range.getNumRows() !== 1 || range.getNumColumns() !== 1) return;
  if (range.getColumn() !== CHECK_COL || range.getRow() < 2) return;
  const from = range.getSheet().getName();
  if (from !== MINE && from !== OTHERS) return;
  const checked = range.isChecked();
  if (checked === null) return; // не галочка
  if ((from === OTHERS && checked) || (from === MINE && !checked)) {
    const ss = e.source || SpreadsheetApp.getActive();
    withLock(function () { moveStudent(ss, from, range.getRow(), from === OTHERS ? MINE : OTHERS); });
  }
}

function moveStudent(ss, from, row, to) {
  const source = ss.getSheetByName(from);
  const target = ss.getSheetByName(to);
  const values = read(source.getRange(row, 1, 1, 2), true)[0];
  const name = String(values[0]).trim();
  if (!name) return;

  // Рядок учня в новому аркуші.
  const newRow = lastRow(target) + 1;
  if (newRow > target.getMaxRows()) target.insertRowsAfter(target.getMaxRows(), 50);
  target.getRange(newRow, 1, 1, 2).setNumberFormat('@').setValues([[name, values[1]]]);
  target.getRange(newRow, CHECK_COL).insertCheckboxes().setValue(to === MINE);
  source.deleteRow(row);

  // Історія запусків переїжджає з ним.
  const fromLog = ss.getSheetByName(LOG_OF[from]);
  const toLog = ss.getSheetByName(LOG_OF[to]);
  const rows = logRows(ss, LOG_OF[from]);
  const notes = rows.length ? fromLog.getRange(2, 8, rows.length, 1).getNotes() : [];
  const isTheirs = function (r) { return norm(r[1]) === norm(name); };
  const moving = rows.filter(isTheirs);
  if (moving.length) {
    const staying = rows.filter(function (r) { return !isTheirs(r); });
    const stayingNotes = notes.filter(function (n, i) { return !isTheirs(rows[i]); });
    const movingNotes = notes.filter(function (n, i) { return isTheirs(rows[i]); });
    fromLog.getRange(2, 1, rows.length, LOG_HEADERS.length).clearContent().clearNote();
    if (staying.length) {
      fromLog.getRange(2, 1, staying.length, LOG_HEADERS.length).setValues(staying);
      fromLog.getRange(2, 8, staying.length, 1).setNotes(stayingNotes);
    }
    appendLog(toLog, Math.max(lastRow(toLog), 1), moving, movingNotes);
  }

  // Клітинки днів будуються заново в новому аркуші.
  const tz = ss.getSpreadsheetTimeZone();
  const student = { name: name, row: newRow, sheet: to };
  const days = {};
  moving.forEach(function (r) {
    if (r[0] instanceof Date) days[Utilities.formatDate(r[0], tz, DAY)] = true;
  });
  Object.keys(days).sort(function (a, b) {
    return a.split('.').reverse().join('') < b.split('.').reverse().join('') ? -1 : 1;
  }).forEach(function (day) { updateDayCell(ss, student, day, tz); });
}

// Перебудувати всі клітинки днів з журналів. Запусти вручну (вибери rebuildDays → «Запустити»),
// якщо клітинки розійшлися з журналом — наприклад, після помилки, коли запуски вже були в журналі.
function rebuildDays() {
  const ss = SpreadsheetApp.getActive();
  const tz = ss.getSpreadsheetTimeZone();
  const byDate = function (a, b) {
    return a.split('.').reverse().join('') < b.split('.').reverse().join('') ? -1 : 1;
  };
  withLock(function () {
    [MINE, OTHERS].forEach(function (sheetName) {
      const log = logRows(ss, LOG_OF[sheetName]);
      studentRows(ss, sheetName).forEach(function (r, i) {
        const name = String(r[0]).trim();
        if (!name) return;
        const days = {};
        log.forEach(function (row) {
          if (row[0] instanceof Date && norm(row[1]) === norm(name)) days[Utilities.formatDate(row[0], tz, DAY)] = true;
        });
        const student = { name: name, row: i + 2, sheet: sheetName };
        Object.keys(days).sort(byDate).forEach(function (day) { updateDayCell(ss, student, day, tz); });
      });
    });
  });
}
