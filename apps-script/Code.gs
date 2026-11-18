/**
 * «Ліхтарник» → Google Таблиця репетитора.
 *
 * «Учні» — твої учні: Учень | PIN | Мій ☑ | Пройдено | 14.11.2026 | 17.11.2026 | …
 *   «Пройдено» — усі рівні, які учень колись пройшов («1.1, 1.2, 1.4»). Звідси гра бере прогрес,
 *   коли учень входить з іншого комп'ютера. Поруч прихований стовпець «ID пройдених» — те саме для гри.
 *   У клітинці дня кожен рівень, який учень запускав того дня, окремим рядком:
 *   «1.4 — 3 спроби ✓» або «1.5 — 5 спроб ✗ впав».
 * «Журнал» — один рядок на кожне натискання «Запустити» твоїх учнів (з кодом програми).
 * «Інші учні» та «Інші — журнал» — те саме для всіх, хто зареєструвався сам.
 * «Анонімні» — кожен рівень, пройдений без входу: Час | Відвідувач | Рівень | Спроб | Режим |
 *   Звідки прийшов | Країна. Відвідувач — випадковий номер браузера (#a3f9c2), не ім'я і не IP.
 * «Відвідування» — скільки різних відвідувачів (учнів і анонімів) відкривали гру кожного дня;
 *   поруч із датою — час, коли прийшов останній з них.
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
const DONE_COL = 4;      // «Пройдено»: номери рівнів для тебе
const IDS_COL = 5;       // «ID пройдених» (прихований): ті самі рівні для гри
const FIRST_DAY_COL = 6; // перша дата
const DONE_HEADERS = ['Пройдено', 'ID пройдених'];
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
const RECENT_RUNS = 3000; // скільки останніх рядків журналу перечитувати для клітинки дня

const ANON = 'Анонімні';
const ANON_HEADERS = ['Час', 'Відвідувач', 'Рівень', 'Спроб', 'Режим', 'Звідки прийшов', 'Країна', 'ID запуску'];
const VISITS = 'Відвідування';
const VISIT_HEADERS = ['Дата і час', 'Унікальних відвідувачів'];
const MODES = { blocks: 'блоки', python: 'Python' };
// Адреса скрипту відкрита: один браузер не може записати більше стількох перемог за 6 годин.
const ANON_LIMIT = 200;

function setup() {
  const ss = SpreadsheetApp.getActive();
  setupStudents(ss, MINE, 0, true);
  setupStudents(ss, OTHERS, 1, false);
  setupLog(ss, MINE_LOG);
  setupLog(ss, OTHERS_LOG);
  setupAnon(ss);
  setupVisits(ss);
}

function setupAnon(ss) {
  const sheet = ss.getSheetByName(ANON) || ss.insertSheet(ANON);
  sheet.getRange(1, 1, 1, ANON_HEADERS.length).setValues([ANON_HEADERS]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  [140, 90, 55, 55, 70, 140, 110].forEach(function (width, i) { sheet.setColumnWidth(i + 1, width); });
  sheet.hideColumns(ANON_HEADERS.length); // ID запуску потрібен лише скрипту
  return sheet;
}

function setupVisits(ss) {
  const sheet = ss.getSheetByName(VISITS) || ss.insertSheet(VISITS);
  sheet.getRange(1, 1, 1, VISIT_HEADERS.length).setValues([VISIT_HEADERS]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 140);
  sheet.setColumnWidth(2, 170);
  return sheet;
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
  ensureDoneColumns(ss, sheet);
  sheet.getRange(1, 1, 1, DONE_COL).setFontWeight('bold');
  sheet.getRange('B:B').setNumberFormat('@'); // PIN як текст: нулі на початку не зникають
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(DONE_COL);
  sheet.setColumnWidth(1, 160);
  sheet.setColumnWidth(2, 70);
  sheet.setColumnWidth(CHECK_COL, 50);
  sheet.setColumnWidth(DONE_COL, 160);
  sheet.hideColumns(IDS_COL);
}

// Таблиця з попередньої версії: «Пройдено» ще немає — вставляємо перед датами і заповнюємо з журналу
// (один раз; далі стовпець оновлюється з кожною перемогою, і журнал для цього більше не читається).
function ensureDoneColumns(ss, sheet) {
  if (sheet.getRange(1, DONE_COL).getDisplayValue() === DONE_HEADERS[0]) return;
  if (sheet.getLastColumn() >= DONE_COL) {
    sheet.insertColumnBefore(DONE_COL);
    sheet.insertColumnBefore(DONE_COL);
    // Нові стовпці беруть оформлення сусіднього стовпця дня (заливку, перенесення) — прибираємо.
    sheet.getRange(1, DONE_COL, sheet.getMaxRows(), 2).clearFormat().clearDataValidations();
  }
  sheet.getRange(1, DONE_COL, 1, 2).setValues([DONE_HEADERS]).setFontWeight('bold');
  sheet.hideColumns(IDS_COL);
  const logName = LOG_OF[sheet.getName()];
  const runs = ss.getSheetByName(logName) ? logRows(ss, logName, 5) : [];
  studentRows(ss, sheet.getName()).forEach(function (r, i) {
    const name = norm(r[0]);
    if (!name) return;
    const wins = runs.filter(function (run) { return norm(run[1]) === name && run[4] === WIN && run[3]; })
      .map(function (run) { return { id: String(run[3]), level: String(run[2]) }; });
    markCompleted(sheet, i + 2, wins);
  });
}

// Код оновили, а setup ще не запускали: переробляємо таблицю тут, перш ніж щось читати чи писати.
function ensureLayout(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (sheet.getRange(1, DONE_COL).getDisplayValue() === DONE_HEADERS[0]) return;
  withLock(function () { ensureDoneColumns(ss, sheet); });
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
  if (req && req.action === 'visit') return out(withLock(function () { return countVisit(ss, req.visitor); }));
  if (req && req.action === 'anon') {
    return out(withLock(function () { return saveAnon(ss, req.visitor, Array.isArray(req.events) ? req.events : []); }));
  }
  if (req.action === 'register') {
    return out(withLock(function () { return register(ss, req.name, req.pin, cleanDone(req.done)); }));
  }

  const student = findStudent(ss, req.name, req.pin);
  if (!student) return out({ ok: false, error: 'auth' });

  ensureLayout(ss, student.sheet);
  if (req.action === 'login') {
    // Гра надсилає рівні, пройдені в цьому браузері (зокрема ще до реєстрації): додаємо до «Пройдено».
    const done = cleanDone(req.done);
    if (done.length) {
      const saved = withLock(function () {
        const current = findStudent(ss, req.name, req.pin);
        if (!current) return { ok: false, error: 'auth' };
        markCompleted(ss.getSheetByName(current.sheet), current.row, done);
        return { ok: true, student: current };
      });
      if (!saved.ok) return out(saved);
      return out({ ok: true, name: saved.student.name, completed: completedLevels(ss, saved.student) });
    }
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
function register(ss, name, pin, done) {
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
  ensureDoneColumns(ss, sheet);
  markCompleted(sheet, row, done || []);
  return { ok: true, name: cleanName, completed: (done || []).map(function (d) { return d.id; }) };
}

// [{id, level}] з гри: лише рядки розумної довжини, без повторів.
function cleanDone(list) {
  if (!Array.isArray(list)) return [];
  const seen = {};
  const result = [];
  list.slice(0, 1000).forEach(function (d) {
    const id = String(d && d.id || '').trim().slice(0, 100);
    if (!id || id.indexOf(',') >= 0 || seen[id]) return;
    seen[id] = true;
    result.push({ id: id, level: String(d.level || '').trim().replace(/,/g, '').slice(0, 20) });
  });
  return result;
}

// Рядки журналу без заголовка. cols — скільки стовпців читати (5 = до «Результат», без коду);
// tail — лише стільки останніх рядків.
function logRows(ss, logName, cols, tail) {
  const log = ss.getSheetByName(logName);
  const last = lastRow(log);
  if (last < 2) return [];
  const count = tail ? Math.min(tail, last - 1) : last - 1;
  return read(log.getRange(last - count + 1, 1, count, cols || LOG_HEADERS.length), false);
}

function splitList(s) {
  return String(s == null ? '' : s).split(',').map(function (x) { return x.trim(); }).filter(Boolean);
}

// Прогрес для гри — одна клітинка учня; журнал не читається.
function completedLevels(ss, student) {
  return splitList(ss.getSheetByName(student.sheet).getRange(student.row, IDS_COL).getDisplayValue());
}

// Додає учневі пройдені рівні: номери в «Пройдено» (по порядку), ID — у прихований стовпець.
function markCompleted(sheet, row, wins) {
  if (!wins.length) return;
  const cells = read(sheet.getRange(row, DONE_COL, 1, 2), true)[0];
  const levels = splitList(cells[0]);
  const ids = splitList(cells[1]);
  let changed = false;
  wins.forEach(function (w) {
    if (w.id && ids.indexOf(w.id) < 0) { ids.push(w.id); changed = true; }
    if (w.level && levels.indexOf(w.level) < 0) { levels.push(w.level); changed = true; }
  });
  if (!changed) return;
  levels.sort(byLevelNumber);
  sheet.getRange(row, DONE_COL, 1, 2).setNumberFormat('@').setValues([[levels.join(', '), ids.join(', ')]])
    .setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
}

// «1.2» перед «1.10».
function byLevelNumber(a, b) {
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] || 0) - (y[i] || 0);
    if (isNaN(d)) return a < b ? -1 : 1;
    if (d) return d;
  }
  return 0;
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
  const wins = [];
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
    if (ev.result === 'win') wins.push({ id: String(ev.levelId || ''), level: String(ev.level || '') });
  });

  if (rows.length) appendLog(log, last, rows);
  // Запуски вже в журналі. Якщо «Пройдено» чи клітинку дня оновити не вдалося, гра не повторюватиме
  // відправку, а текст помилки повернеться в «warning», щоб було видно причину.
  const warnings = [];
  try {
    markCompleted(ss.getSheetByName(student.sheet), student.row, wins);
  } catch (err) {
    console.error(err && err.stack || err);
    warnings.push('Пройдено: ' + String(err && err.stack || err).slice(0, 400));
  }
  // Для клітинки дня досить кінця журналу: запуски дописуються в кінець.
  const recentRuns = rows.length ? logRows(ss, LOG_OF[student.sheet], 5, RECENT_RUNS) : [];
  Object.keys(days).forEach(function (day) {
    try {
      updateDayCell(ss, student, day, tz, recentRuns);
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

// runs — рядки журналу (принаймні 5 стовпців); без них читається весь журнал.
function updateDayCell(ss, student, day, tz, runs) {
  const order = [];
  const byLevel = {};
  (runs || logRows(ss, LOG_OF[student.sheet], 5)).forEach(function (r) {
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
  ensureDoneColumns(ss, source);
  ensureDoneColumns(ss, target);
  const values = read(source.getRange(row, 1, 1, IDS_COL), true)[0];
  const name = String(values[0]).trim();
  if (!name) return;

  // Рядок учня в новому аркуші — разом із пройденими рівнями.
  const newRow = lastRow(target) + 1;
  if (newRow > target.getMaxRows()) target.insertRowsAfter(target.getMaxRows(), 50);
  target.getRange(newRow, 1, 1, 2).setNumberFormat('@').setValues([[name, values[1]]]);
  target.getRange(newRow, CHECK_COL).insertCheckboxes().setValue(to === MINE);
  target.getRange(newRow, DONE_COL, 1, 2).setNumberFormat('@').setValues([[values[DONE_COL - 1], values[IDS_COL - 1]]]);
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
  }).forEach(function (day) { updateDayCell(ss, student, day, tz, moving); });
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
      const log = logRows(ss, LOG_OF[sheetName], 5);
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

// Номер браузера з гри: лише латинські літери й цифри.
function cleanVisitor(v) {
  const s = String(v == null ? '' : v).trim().toLowerCase();
  return /^[a-z0-9]{4,16}$/.test(s) ? s : '';
}

// Гра надсилає «я тут» раз на день з кожного браузера; тут лічильник дня збільшується на 1.
function countVisit(ss, visitor) {
  const id = cleanVisitor(visitor);
  if (!id) return { ok: false, error: 'bad-request' };
  const tz = ss.getSpreadsheetTimeZone();
  const when = new Date();
  const day = Utilities.formatDate(when, tz, DAY);
  // У першому стовпці — дата і час, коли лічильник дня збільшився востаннє.
  const stamp = Utilities.formatDate(when, tz, DAY + ' HH:mm');
  // Той самий браузер того самого дня вдруге не рахується (гра і так не надсилає двічі).
  const cache = CacheService.getScriptCache();
  const key = 'v' + day + id;
  if (cache.get(key)) return { ok: true, counted: false };
  cache.put(key, '1', 21600);

  const sheet = ss.getSheetByName(VISITS) || setupVisits(ss);
  const last = Math.max(lastRow(sheet), 1);
  // Сьогоднішній день — зазвичай останній рядок, тож решту аркуша не читаємо.
  if (last > 1 && sheet.getRange(last, 1).getDisplayValue().slice(0, day.length) === day) {
    const count = Number(sheet.getRange(last, 2).getValue()) || 0;
    sheet.getRange(last, 1).setNumberFormat('@').setValue(stamp);
    sheet.getRange(last, 2).setValue(count + 1);
  } else {
    if (last + 1 > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 100);
    sheet.getRange(last + 1, 1).setNumberFormat('@');
    sheet.getRange(last + 1, 1, 1, 2).setValues([[stamp, 1]]);
  }
  return { ok: true, counted: true };
}

// Перемоги без входу: один рядок на кожен рівень, пройдений у цьому браузері вперше.
function saveAnon(ss, visitor, events) {
  const id = cleanVisitor(visitor);
  if (!id) return { ok: false, error: 'bad-request' };
  const cache = CacheService.getScriptCache();
  const used = Number(cache.get('a' + id)) || 0;
  const list = events.slice(0, 20);
  // Забагато з одного браузера — не записуємо, але й не просимо гру повторювати.
  if (used + list.length > ANON_LIMIT) return { ok: true, saved: 0, limited: true };

  const sheet = ss.getSheetByName(ANON) || setupAnon(ss);
  const idCol = ANON_HEADERS.length;
  const last = Math.max(lastRow(sheet), 1);
  // Гра повторює відправку, якщо не дочекалась відповіді: такі перемоги вже можуть бути записані.
  const recent = Math.min(2000, last - 1);
  const known = {};
  if (recent > 0) sheet.getRange(last - recent + 1, idCol, recent, 1).getValues().forEach(function (r) { known[r[0]] = true; });

  const rows = [];
  list.forEach(function (ev) {
    if (!ev || !ev.id || known[ev.id]) return;
    known[ev.id] = true;
    let at = new Date(ev.at);
    if (isNaN(at.getTime())) at = new Date();
    rows.push([
      at,
      '#' + id,
      String(ev.level || ev.levelId || '').slice(0, 20),
      Math.max(1, Math.min(9999, Math.round(Number(ev.tries) || 1))),
      MODES[ev.mode] || '',
      String(ev.from || '').slice(0, 60),
      String(ev.country || '').slice(0, 60),
      String(ev.id).slice(0, 40)
    ]);
  });
  if (rows.length) {
    const need = last + rows.length - sheet.getMaxRows();
    if (need > 0) sheet.insertRowsAfter(sheet.getMaxRows(), need + 100);
    // Текстовий формат, інакше «1.10» стане числом 1.1, а «=…» — формулою.
    sheet.getRange(last + 1, 2, rows.length, idCol - 1).setNumberFormat('@');
    sheet.getRange(last + 1, 4, rows.length, 1).setNumberFormat('0');
    sheet.getRange(last + 1, 1, rows.length, 1).setNumberFormat('dd.MM.yyyy HH:mm:ss');
    sheet.getRange(last + 1, 1, rows.length, idCol).setValues(rows);
    cache.put('a' + id, String(used + rows.length), 21600);
  }
  return { ok: true, saved: rows.length };
}
