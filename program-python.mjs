// Two-way bridge between the block program and a small subset of Python.
// Blocks → Python is always possible; Python → blocks accepts exactly what the blocks can express
// and explains everything else in plain words, with a line number.

export const PY_COMMANDS = {
  forward: 'forward',
  left: 'turn_left',
  right: 'turn_right',
  jump: 'jump',
  light: 'light',
  take: 'take',
  fix: 'fix'
};
// By day the same "light" block switches lamps off.
const DAY_LIGHT = 'switch_off';

export const PY_SENSORS = {
  obstacleAhead: 'obstacle_ahead',
  canJump: 'can_jump',
  onLamp: 'on_lamp',
  lampLit: 'lamp_lit',
  lampShorts: 'lamp_shorts'
};

const PY_VALUES = {
  height: 'height()',
  lit: 'lit_count()',
  remaining: 'remaining()',
  repairKits: 'repair_kits()',
  bulbs: 'bulbs()'
};

const KEYWORDS = new Set([
  'def', 'for', 'in', 'range', 'while', 'if', 'elif', 'else', 'not', 'and', 'or', 'pass',
  'True', 'False', 'None', 'return', 'break', 'continue', 'import', 'from', 'class', 'lambda', 'print'
]);
const RESERVED = new Set([...KEYWORDS, ...Object.values(PY_COMMANDS), DAY_LIGHT, ...Object.values(PY_SENSORS)]);
const LOOP_VARS = ['i', 'j', 'k'];

const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i',
  й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh',
  ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia', ы: 'y', э: 'e', ё: 'io', ъ: ''
};

// "Обхід дерева" → "obkhid_dereva": a valid Python name that never clashes with game commands.
function toIdentifier(name) {
  let id = [...String(name || '').toLowerCase()].map((ch) => TRANSLIT[ch] ?? ch).join('');
  id = id.replace(/[^a-z0-9_]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  if (!id) id = 'function';
  if (/^\d/.test(id)) id = `f_${id}`;
  if (RESERVED.has(id)) id = `${id}_fn`;
  return id;
}

// Unique Python names for the functions, in their order.
export function functionNames(functions = []) {
  const used = new Set();
  return functions.map((f) => {
    const base = toIdentifier(f.name);
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}_${n}`;
    used.add(id);
    return id;
  });
}

function valueToPython(expr) {
  if (expr?.kind === 'number') return String(expr.value);
  return PY_VALUES[expr?.kind] || '0';
}

function termToPython(term) {
  if (term?.kind === 'compare') {
    const text = `${valueToPython(term.left)} ${term.op} ${valueToPython(term.right)}`;
    return term.not ? `not (${text})` : text;
  }
  const sensor = `${PY_SENSORS[term?.sensor] || 'obstacle_ahead'}()`;
  return term?.not ? `not ${sensor}` : sensor;
}

export function conditionToPython(condition) {
  if (condition?.terms && condition.mode) {
    return condition.terms.map(termToPython).join(condition.mode === 'and' ? ' and ' : ' or ');
  }
  return termToPython(condition);
}

// Returns the code and, for every line, the id of the block it came from (for highlighting during a run).
export function blocksToPython(program = {}, { theme = 'dark' } = {}) {
  const blocks = program.blocks || [];
  const functions = program.functions || [];
  const names = functionNames(functions);
  const nameById = new Map(functions.map((f, i) => [f.id, names[i]]));
  const lines = [];
  const emit = (depth, text, blockId = null) => lines.push({ text: '    '.repeat(depth) + text, blockId });

  function body(list, depth, loopDepth) {
    if (!list?.length) {
      emit(depth, 'pass');
      return;
    }
    for (const b of list) block(b, depth, loopDepth);
  }

  function block(b, depth, loopDepth) {
    if (b.type === 'loop') {
      const v = LOOP_VARS[loopDepth] || `i${loopDepth + 1}`;
      emit(depth, `for ${v} in range(${b.times}):`, b.id);
      body(b.body, depth + 1, loopDepth + 1);
    } else if (b.type === 'while') {
      emit(depth, `while ${conditionToPython(b.condition)}:`, b.id);
      body(b.body, depth + 1, loopDepth);
    } else if (b.type === 'if') {
      const branches = b.branches || [{ condition: b.condition, body: b.body }];
      branches.forEach((branch, i) => {
        emit(depth, `${i ? 'elif' : 'if'} ${conditionToPython(branch.condition)}:`, b.id);
        body(branch.body, depth + 1, loopDepth);
      });
      if (b.elseBody) {
        emit(depth, 'else:', b.id);
        body(b.elseBody, depth + 1, loopDepth);
      }
    } else if (b.type === 'call') {
      emit(depth, `${nameById.get(b.functionId) || 'function'}()`, b.id);
    } else if (b.type === 'light' && theme === 'light') {
      emit(depth, `${DAY_LIGHT}()`, b.id);
    } else {
      emit(depth, `${PY_COMMANDS[b.type] || b.type}()`, b.id);
    }
  }

  functions.forEach((f, i) => {
    emit(0, `def ${names[i]}():`, f.id);
    body(f.body, 1, 0);
    lines.push({ text: '', blockId: null });
  });
  blocks.forEach((b) => block(b, 0, 0));

  return { code: lines.map((l) => l.text).join('\n'), lines };
}

const MESSAGES = {
  uk: {
    line: 'Рядок {line}: {text}',
    tab: 'використовуй пробіли для відступу, а не Tab',
    unexpectedIndent: 'зайвий відступ — цей рядок ні до чого не належить',
    badIndent: 'відступ не збігається з рядками вище',
    needBody: 'після «{head}» потрібні команди з відступом у 4 пробіли',
    needColon: 'наприкінці «{head}» потрібна двокрапка «:»',
    bodySameLine: 'після «{head}:» команди пиши з нового рядка з відступом у 4 пробіли',
    needParens: 'додай дужки: {name}()',
    unknown: 'не знаю команди «{name}». Можна: {list}',
    notAllowed: 'команда {name}() на цьому рівні недоступна',
    loopNotAllowed: 'цикл for на цьому рівні недоступний',
    whileNotAllowed: 'цикл while на цьому рівні недоступний',
    ifNotAllowed: 'умова if на цьому рівні недоступна',
    elifNotAllowed: 'elif на цьому рівні недоступний',
    elseNotAllowed: 'else на цьому рівні недоступний',
    defNotAllowed: 'функції (def) на цьому рівні недоступні',
    range: 'цикл: напиши for i in range(N):, де N від 1 до 10',
    rangeCount: 'кількість повторень має бути від 1 до 10',
    condition: 'умова — це один датчик з дужками, наприклад {example}, можна з not',
    andOr: 'поки що умова — це один датчик, and та or не підтримуються',
    unknownSensor: 'не знаю датчика «{name}». Можна: {list}',
    sensorNotAllowed: 'датчик {name}() на цьому рівні недоступний',
    orphanElse: '«{head}» має йти одразу після if (з тим самим відступом)',
    defNested: 'функцію (def) пиши на початку рядка, без відступу',
    defName: 'назва функції — латинські літери, цифри та _, наприклад def obkhid():',
    defParams: 'у грі функції без параметрів — пиши def {name}():',
    defDuplicate: 'функція {name} вже є',
    defReserved: '{name} — це команда гри, обери іншу назву функції',
    noFunction: 'функцію {name}() не знайдено — опиши її вище через def {name}():',
    unsupported: 'такого в грі немає. Можна: команди, for, while, if/elif/else, def і pass',
    empty: 'напиши хоча б одну команду'
  },
  en: {
    line: 'Line {line}: {text}',
    tab: 'use spaces for indentation, not Tab',
    unexpectedIndent: 'unexpected indent — this line does not belong to anything',
    badIndent: 'the indent does not match the lines above',
    needBody: 'after "{head}" add commands indented by 4 spaces',
    needColon: '"{head}" must end with a colon ":"',
    bodySameLine: 'after "{head}:" put the commands on the next line, indented by 4 spaces',
    needParens: 'add parentheses: {name}()',
    unknown: 'unknown command "{name}". You can use: {list}',
    notAllowed: '{name}() is not available on this level',
    loopNotAllowed: 'for loops are not available on this level',
    whileNotAllowed: 'while loops are not available on this level',
    ifNotAllowed: 'if is not available on this level',
    elifNotAllowed: 'elif is not available on this level',
    elseNotAllowed: 'else is not available on this level',
    defNotAllowed: 'functions (def) are not available on this level',
    range: 'loop: write for i in range(N):, with N from 1 to 10',
    rangeCount: 'repeat count must be from 1 to 10',
    condition: 'a condition is one sensor with parentheses, e.g. {example}, optionally with not',
    andOr: 'for now a condition is a single sensor; and/or are not supported',
    unknownSensor: 'unknown sensor "{name}". You can use: {list}',
    sensorNotAllowed: 'sensor {name}() is not available on this level',
    orphanElse: '"{head}" must come right after an if (with the same indent)',
    defNested: 'write functions (def) at the start of a line, without indent',
    defName: 'a function name uses Latin letters, digits and _, e.g. def detour():',
    defParams: 'functions here take no parameters — write def {name}():',
    defDuplicate: 'function {name} already exists',
    defReserved: '{name} is a game command, pick another function name',
    noFunction: 'function {name}() not found — define it above with def {name}():',
    unsupported: 'that is not part of the game. You can use: commands, for, while, if/elif/else, def and pass',
    empty: 'write at least one command'
  }
};

const fill = (text, params = {}) => text.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? '');

class CodeError extends Error {
  constructor(line, key, params) {
    super(key);
    Object.assign(this, { line, key, params });
  }
}

// Parses the code into { blocks, functions }.
// Returns { ok: true, program, lineOf } or { ok: false, line, message }.
export function pythonToBlocks(code, level, { lang = 'uk', theme = 'dark', existingFunctions = [] } = {}) {
  const msg = MESSAGES[lang] || MESSAGES.uk;
  const allowed = new Set(level?.allowed || []);
  const sensorsAllowed = Array.isArray(level?.allowedSensors) && level.allowedSensors.length
    ? level.allowedSensors
    : Object.keys(PY_SENSORS);
  let serial = 0;
  const nextId = (prefix) => `${prefix}${++serial}`;
  // Source line of every block, so a run can highlight the line being executed.
  const lineOf = {};
  const at = (row, block) => { lineOf[block.id] = row.line; return block; };

  try {
    // 1. Meaningful lines with their indent; comments and blank lines are skipped.
    const rows = [];
    String(code).split(/\r?\n/).forEach((raw, i) => {
      const line = i + 1;
      const withoutComment = raw.replace(/#.*$/, '');
      if (!withoutComment.trim()) return;
      const lead = withoutComment.match(/^[ \t]*/)[0];
      if (lead.includes('\t')) throw new CodeError(line, 'tab');
      rows.push({ line, indent: lead.length, text: withoutComment.trim() });
    });
    if (!rows.length) throw new CodeError(1, 'empty');

    // 2. Function names first, so calls may appear before or after their def.
    const defNames = new Map();
    const oldNames = functionNames(existingFunctions);
    for (const row of rows) {
      const m = row.text.match(/^def\s+([^\s(:]+)\s*\(\s*\)\s*:?$/);
      if (!m) continue;
      const name = m[1];
      if (row.indent) throw new CodeError(row.line, 'defNested');
      if (!allowed.has('call')) throw new CodeError(row.line, 'defNotAllowed');
      if (!/^[A-Za-z_]\w*$/.test(name)) throw new CodeError(row.line, 'defName');
      if (RESERVED.has(name)) throw new CodeError(row.line, 'defReserved', { name });
      if (defNames.has(name)) throw new CodeError(row.line, 'defDuplicate', { name });
      const old = existingFunctions[oldNames.indexOf(name)];
      defNames.set(name, { id: nextId('f'), name: old?.name || name, body: [] });
    }

    const commandList = () => [...allowed]
      .filter((type) => PY_COMMANDS[type])
      .map((type) => `${type === 'light' && theme === 'light' ? DAY_LIGHT : PY_COMMANDS[type]}()`)
      .join(', ');
    const sensorList = () => sensorsAllowed.map((s) => `${PY_SENSORS[s]}()`).join(', ');

    function parseCondition(text, row) {
      if (/\b(and|or)\b/.test(text)) throw new CodeError(row.line, 'andOr');
      const m = text.match(/^(not\s+)?([A-Za-z_]\w*)\s*(\(\s*\))?$/);
      const example = `${PY_SENSORS[sensorsAllowed[0]]}()`;
      if (!m) throw new CodeError(row.line, 'condition', { example });
      const sensor = Object.keys(PY_SENSORS).find((k) => PY_SENSORS[k] === m[2]);
      if (!sensor) throw new CodeError(row.line, 'unknownSensor', { name: m[2], list: sensorList() });
      if (!m[3]) throw new CodeError(row.line, 'needParens', { name: m[2] });
      if (!sensorsAllowed.includes(sensor)) throw new CodeError(row.line, 'sensorNotAllowed', { name: m[2] });
      return { kind: 'sensor', sensor, not: Boolean(m[1]) };
    }

    // Header lines (for/while/if/elif/else/def) must end with ":".
    function requireColon(row, head) {
      if (!row.text.endsWith(':')) throw new CodeError(row.line, 'needColon', { head });
    }

    // 3. Indentation-based recursive descent: a block is the run of rows with exactly its indent.
    let pos = 0;
    function parseBlock(indent) {
      const list = [];
      while (pos < rows.length) {
        const row = rows[pos];
        if (row.indent < indent) break;
        if (row.indent > indent) {
          // Deeper than this block right after a nested block closed: the dedent missed every level.
          const cameBack = pos > 0 && rows[pos - 1].indent > row.indent;
          throw new CodeError(row.line, cameBack ? 'badIndent' : 'unexpectedIndent');
        }
        const stmt = parseStatement(row, indent);
        if (stmt) list.push(stmt);
      }
      return list;
    }

    // The body of a header line: the following rows indented deeper than the header.
    function parseNested(header, indent) {
      const first = rows[pos];
      if (!first || first.indent <= indent) {
        throw new CodeError(header.line, 'needBody', { head: header.text.replace(/:$/, '') });
      }
      return parseBlock(first.indent);
    }

    // Python allows `for ...: forward()` on one line; the game wants the body on its own lines.
    function checkHeader(row) {
      const m = row.text.match(/^((?:def|for|while|if|elif|else)\b[^:]*):\s*\S/);
      if (m) throw new CodeError(row.line, 'bodySameLine', { head: m[1].trim() });
    }

    function parseStatement(row, indent) {
      const text = row.text;
      pos++;
      checkHeader(row);

      let m;
      if (/^def\b/.test(text)) {
        const name = text.match(/^def\s+(.+?)\s*\(/)?.[1];
        if (!/\(\s*\)/.test(text)) {
          if (name && /^[A-Za-z_]\w*$/.test(name) && /\(\s*[^)\s]/.test(text)) throw new CodeError(row.line, 'defParams', { name });
          throw new CodeError(row.line, 'defName');
        }
        requireColon(row, text.replace(/:$/, ''));
        const fn = defNames.get(name);
        // The name scan above only accepts a clean `def name():` line; anything else is a naming mistake.
        if (!fn) throw new CodeError(row.line, 'defName');
        lineOf[fn.id] = row.line;
        fn.body = parseNested(row, indent);
        return null;
      }
      if (/^for\b/.test(text)) {
        m = text.match(/^for\s+[A-Za-z_]\w*\s+in\s+range\s*\(\s*(-?\d+)\s*\)\s*:?$/);
        if (!m) throw new CodeError(row.line, 'range');
        requireColon(row, text.replace(/:$/, ''));
        if (!allowed.has('loop')) throw new CodeError(row.line, 'loopNotAllowed');
        const times = Number(m[1]);
        if (times < 1 || times > 10) throw new CodeError(row.line, 'rangeCount');
        return at(row, { id: nextId('b'), type: 'loop', times, body: parseNested(row, indent) });
      }
      if (/^while\b/.test(text)) {
        requireColon(row, text.replace(/:$/, ''));
        if (!allowed.has('while')) throw new CodeError(row.line, 'whileNotAllowed');
        const condition = parseCondition(text.replace(/^while\s*/, '').replace(/:$/, '').trim(), row);
        return at(row, { id: nextId('b'), type: 'while', condition, body: parseNested(row, indent) });
      }
      if (/^if\b/.test(text)) {
        requireColon(row, text.replace(/:$/, ''));
        if (!allowed.has('if')) throw new CodeError(row.line, 'ifNotAllowed');
        const condition = parseCondition(text.replace(/^if\s*/, '').replace(/:$/, '').trim(), row);
        const b = at(row, { id: nextId('b'), type: 'if', branches: [{ condition, body: parseNested(row, indent) }] });
        // elif / else continue the same if while they sit on the same indent.
        while (rows[pos] && rows[pos].indent === indent && /^(elif|else)\b/.test(rows[pos].text)) {
          const next = rows[pos];
          pos++;
          if (b.elseBody) throw new CodeError(next.line, 'orphanElse', { head: next.text.replace(/:$/, '') });
          checkHeader(next);
          requireColon(next, next.text.replace(/:$/, ''));
          if (next.text.startsWith('elif')) {
            if (level?.allowElif === false) throw new CodeError(next.line, 'elifNotAllowed');
            const cond = parseCondition(next.text.replace(/^elif\s*/, '').replace(/:$/, '').trim(), next);
            b.branches.push({ condition: cond, body: parseNested(next, indent) });
          } else {
            if (!/^else\s*:$/.test(next.text)) throw new CodeError(next.line, 'needColon', { head: 'else' });
            if (level?.allowElse === false) throw new CodeError(next.line, 'elseNotAllowed');
            b.elseBody = parseNested(next, indent);
          }
        }
        return b;
      }
      if (/^(elif|else)\b/.test(text)) {
        throw new CodeError(row.line, 'orphanElse', { head: text.replace(/:$/, '').split(/\s/)[0] });
      }
      if (text === 'pass') return null;

      m = text.match(/^([A-Za-z_]\w*)\s*(\(\s*\))?$/);
      if (!m) throw new CodeError(row.line, 'unsupported');
      const name = m[1];
      const type = Object.keys(PY_COMMANDS).find((k) => PY_COMMANDS[k] === name) || (name === DAY_LIGHT ? 'light' : null);
      if (type) {
        if (!allowed.has(type)) throw new CodeError(row.line, 'notAllowed', { name });
        if (!m[2]) throw new CodeError(row.line, 'needParens', { name });
        return at(row, { id: nextId('b'), type });
      }
      if (defNames.has(name)) {
        if (!m[2]) throw new CodeError(row.line, 'needParens', { name });
        return at(row, { id: nextId('b'), type: 'call', functionId: defNames.get(name).id });
      }
      if (KEYWORDS.has(name)) throw new CodeError(row.line, 'unsupported');
      if (m[2] && allowed.has('call')) throw new CodeError(row.line, 'noFunction', { name });
      throw new CodeError(row.line, 'unknown', { name, list: commandList() });
    }

    const blocks = parseBlock(0);
    if (pos < rows.length) throw new CodeError(rows[pos].line, 'badIndent');
    return { ok: true, program: { blocks, functions: [...defNames.values()] }, lineOf };
  } catch (e) {
    if (!(e instanceof CodeError)) throw e;
    return {
      ok: false,
      line: e.line,
      message: fill(msg.line, { line: e.line, text: fill(msg[e.key], e.params) })
    };
  }
}

const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const TOKEN = /(#.*$)|("[^"]*"|'[^']*')|\b(\d+)\b|\b([A-Za-z_]\w*)\b(?=(\s*\()?)/g;

function highlightLine(text) {
  let html = '';
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    html += escapeHtml(text.slice(last, m.index));
    const [all, comment, str, num, word, call] = m;
    if (comment) html += `<span class="py-comment">${escapeHtml(comment)}</span>`;
    else if (str) html += `<span class="py-string">${escapeHtml(str)}</span>`;
    else if (num) html += `<span class="py-number">${num}</span>`;
    else if (KEYWORDS.has(word) && word !== 'print') html += `<span class="py-keyword">${word}</span>`;
    else if (call) html += `<span class="py-call">${word}</span>`;
    else html += escapeHtml(all);
    last = m.index + all.length;
  }
  return html + escapeHtml(text.slice(last));
}

// Syntax-highlighted HTML, one <span class="code-line"> per line with its number.
export function highlightPython(code, { activeLines = [], errorLine = null } = {}) {
  const active = new Set(activeLines);
  return String(code).split('\n').map((text, i) => {
    const html = highlightLine(text);
    const cls = ['code-line', active.has(i) && 'active', errorLine === i + 1 && 'error'].filter(Boolean).join(' ');
    return `<span class="${cls}"><span class="code-ln">${i + 1}</span>${html || ' '}</span>`;
  }).join('');
}
