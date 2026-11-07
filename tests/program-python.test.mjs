import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { blocksToPython, pythonToBlocks, highlightPython, functionNames } from '../program-python.mjs';
import { validateProgram } from '../logic.mjs';

const ALL = ['forward', 'left', 'right', 'jump', 'light', 'take', 'fix', 'loop', 'if', 'while', 'call'];
const level = (extra = {}) => ({ allowed: ALL, allowedSensors: ['obstacleAhead', 'canJump', 'onLamp', 'lampLit', 'lampShorts'], ...extra });
const sensor = (name, not = false) => ({ kind: 'sensor', sensor: name, not });
const parse = (code, l = level(), opts) => pythonToBlocks(code, l, opts);
const code = (blocks, functions = [], opts) => blocksToPython({ blocks, functions }, opts).code;

test('commands become Python calls; by day the light block switches lamps off', () => {
  const blocks = ['forward', 'left', 'right', 'jump', 'light', 'take', 'fix'].map((type, i) => ({ id: `b${i}`, type }));
  assert.equal(code(blocks), 'forward()\nturn_left()\nturn_right()\njump()\nlight()\ntake()\nfix()');
  assert.equal(code([{ id: 'b1', type: 'light' }], [], { theme: 'light' }), 'switch_off()');
});

test('loops, nested loops, while, if/elif/else and empty bodies', () => {
  const blocks = [
    { id: 'b1', type: 'loop', times: 3, body: [{ id: 'b2', type: 'loop', times: 2, body: [{ id: 'b3', type: 'forward' }] }] },
    { id: 'b4', type: 'while', condition: sensor('obstacleAhead', true), body: [{ id: 'b5', type: 'forward' }] },
    {
      id: 'b6', type: 'if',
      branches: [{ condition: sensor('canJump'), body: [{ id: 'b7', type: 'jump' }] }, { condition: sensor('onLamp'), body: [] }],
      elseBody: [{ id: 'b8', type: 'light' }]
    }
  ];
  assert.equal(code(blocks), [
    'for i in range(3):',
    '    for j in range(2):',
    '        forward()',
    'while not obstacle_ahead():',
    '    forward()',
    'if can_jump():',
    '    jump()',
    'elif on_lamp():',
    '    pass',
    'else:',
    '    light()'
  ].join('\n'));
});

test('older if blocks without branches and combined conditions still print', () => {
  const blocks = [
    { id: 'b1', type: 'if', condition: sensor('lampLit'), body: [{ id: 'b2', type: 'forward' }] },
    { id: 'b3', type: 'while', condition: { mode: 'and', terms: [sensor('canJump'), { kind: 'compare', left: { kind: 'bulbs' }, op: '>', right: { kind: 'number', value: 0 } }] }, body: [{ id: 'b4', type: 'jump' }] }
  ];
  assert.equal(code(blocks), 'if lamp_lit():\n    forward()\nwhile can_jump() and bulbs() > 0:\n    jump()');
});

test('functions get readable Latin names that never clash', () => {
  assert.deepEqual(functionNames([{ name: 'Обхід дерева' }, { name: 'Обхід дерева' }, { name: 'forward' }, { name: '1 крок' }, { name: '' }]),
    ['obkhid_dereva', 'obkhid_dereva_2', 'forward_fn', 'f_1_krok', 'function']);
  const functions = [{ id: 'f1', name: 'Обхід', body: [{ id: 'b1', type: 'right' }] }, { id: 'f2', name: 'Порожня', body: [] }];
  assert.equal(code([{ id: 'b2', type: 'call', functionId: 'f1' }], functions),
    'def obkhid():\n    turn_right()\n\ndef porozhnia():\n    pass\n\nobkhid()');
});

test('code turns into blocks the game can run, and back into the same code', () => {
  const source = [
    'def obkhid():',
    '    turn_right()',
    '    forward()',
    '',
    'for i in range(3):',
    '    if obstacle_ahead():',
    '        obkhid()',
    '    elif not can_jump():',
    '        forward()',
    '    else:',
    '        jump()',
    '    light()'
  ].join('\n');
  const l = level();
  const result = parse(source, l, { existingFunctions: [{ id: 'old', name: 'Обхід', body: [] }] });
  assert.equal(result.ok, true, result.message);
  assert.equal(result.program.functions[0].name, 'Обхід', 'an existing function keeps its Ukrainian name');
  assert.doesNotThrow(() => validateProgram(l, result.program.blocks, result.program.functions));
  assert.equal(blocksToPython(result.program).code, source);
});

test('comments, blank lines, 2-space indents and day commands are accepted; lines are tracked', () => {
  const result = parse('# мій план\nfor i in range(2):  # двічі\n  forward()\n\n  switch_off()\n');
  assert.equal(result.ok, true, result.message);
  const [loop] = result.program.blocks;
  assert.deepEqual(loop.body.map((b) => b.type), ['forward', 'light']);
  assert.equal(result.lineOf[loop.id], 2);
  assert.equal(result.lineOf[loop.body[1].id], 5);
});

test('mistakes are explained in plain words with the line number', () => {
  const cases = [
    ['forward', 'Рядок 1: додай дужки: forward()'],
    ['for i in range(3)\n    forward()', 'Рядок 1: наприкінці «for i in range(3)» потрібна двокрапка «:»'],
    ['for i in range(11):\n    forward()', 'Рядок 1: кількість повторень має бути від 1 до 10'],
    ['for i in range(1, 3):\n    forward()', 'Рядок 1: цикл: напиши for i in range(N):, де N від 1 до 10'],
    ['for i in range(2):\nforward()', 'Рядок 1: після «for i in range(2)» потрібні команди з відступом у 4 пробіли'],
    ['forward()\n    jump()', 'Рядок 2: зайвий відступ — цей рядок ні до чого не належить'],
    ['for i in range(2):\n        forward()\n    jump()', 'Рядок 3: відступ не збігається з рядками вище'],
    ['for i in range(2):\n\tforward()', 'Рядок 2: використовуй пробіли для відступу, а не Tab'],
    ['if bananas():\n    jump()', 'Рядок 1: не знаю датчика «bananas». Можна: obstacle_ahead(), can_jump(), on_lamp(), lamp_lit(), lamp_shorts()'],
    ['if can_jump:\n    jump()', 'Рядок 1: додай дужки: can_jump()'],
    ['if can_jump() and on_lamp():\n    jump()', 'Рядок 1: поки що умова — це один датчик, and та or не підтримуються'],
    ['else:\n    jump()', 'Рядок 1: «else» має йти одразу після if (з тим самим відступом)'],
    ['print("hi")', 'Рядок 1: такого в грі немає. Можна: команди, for, while, if/elif/else, def і pass'],
    ['steps = 3', 'Рядок 1: такого в грі немає. Можна: команди, for, while, if/elif/else, def і pass'],
    ['go()', 'Рядок 1: функцію go() не знайдено — опиши її вище через def go():'],
    ['for i in range(2):\n    def inner():\n        jump()', 'Рядок 2: функцію (def) пиши на початку рядка, без відступу'],
    ['def jump():\n    forward()', 'Рядок 1: jump — це команда гри, обери іншу назву функції'],
    ['# тільки коментар', 'Рядок 1: напиши хоча б одну команду'],
    ['for i in range(2): forward()', 'Рядок 1: після «for i in range(2):» команди пиши з нового рядка з відступом у 4 пробіли'],
    ['def go(): forward()', 'Рядок 1: після «def go():» команди пиши з нового рядка з відступом у 4 пробіли'],
    ['if can_jump():\n    jump()\nelse: forward()', 'Рядок 3: після «else:» команди пиши з нового рядка з відступом у 4 пробіли'],
    ['def go(steps):\n    forward()', 'Рядок 1: у грі функції без параметрів — пиши def go():'],
    ['def go()x:\n    forward()', 'Рядок 1: назва функції — латинські літери, цифри та _, наприклад def obkhid():']
  ];
  for (const [source, message] of cases) {
    const result = parse(source);
    assert.equal(result.ok, false, source);
    assert.equal(result.message, message, source);
  }
  assert.equal(parse('forward()\n    jump()').line, 2);
  assert.equal(parse('forward', level(), { lang: 'en' }).message, 'Line 1: add parentheses: forward()');
});

test('level rules apply to code too', () => {
  const basic = { allowed: ['forward', 'light'] };
  assert.equal(parse('jump()', basic).message, 'Рядок 1: команда jump() на цьому рівні недоступна');
  assert.equal(parse('jump', basic).message, 'Рядок 1: команда jump() на цьому рівні недоступна', 'availability before parentheses');
  assert.equal(parse('for i in range(2):\n    forward()', basic).message, 'Рядок 1: цикл for на цьому рівні недоступний');
  assert.equal(parse('def a():\n    forward()', basic).message, 'Рядок 1: функції (def) на цьому рівні недоступні');
  assert.match(parse('hop()', basic).message, /Можна: forward\(\), light\(\)/);
  const sensors = level({ allowedSensors: ['canJump'] });
  assert.equal(parse('if on_lamp():\n    light()', sensors).message, 'Рядок 1: датчик on_lamp() на цьому рівні недоступний');
  assert.equal(parse('if can_jump():\n    jump()\nelse:\n    forward()', level({ allowElse: false })).message, 'Рядок 3: else на цьому рівні недоступний');
});

test('every real level: a program from its own commands survives blocks → Python → blocks', async () => {
  const ids = JSON.parse(await readFile(new URL('../levels/index.json', import.meta.url), 'utf8'));
  for (const id of ids) {
    const l = JSON.parse(await readFile(new URL(`../levels/${id}.json`, import.meta.url), 'utf8'));
    const commands = l.allowed.filter((type) => !['loop', 'if', 'while', 'call'].includes(type));
    let n = 0;
    const cmd = (i) => ({ id: `b${++n}`, type: commands[i % commands.length] });
    const firstSensor = sensor((l.allowedSensors && l.allowedSensors[0]) || 'obstacleAhead');
    const blocks = [cmd(0)];
    const functions = [];
    if (l.allowed.includes('loop')) blocks.push({ id: `b${++n}`, type: 'loop', times: 3, body: [cmd(1), cmd(2)] });
    if (l.allowed.includes('while')) blocks.push({ id: `b${++n}`, type: 'while', condition: { ...firstSensor, not: true }, body: [cmd(3)] });
    if (l.allowed.includes('if')) {
      blocks.push({
        id: `b${++n}`, type: 'if', branches: [{ condition: firstSensor, body: [cmd(4)] }],
        ...(l.allowElse === false ? {} : { elseBody: [cmd(5)] })
      });
    }
    if (l.allowed.includes('call')) {
      functions.push({ id: 'f1', name: 'Мій крок', body: [cmd(6)] });
      blocks.push({ id: `b${++n}`, type: 'call', functionId: 'f1' });
    }
    for (const theme of ['dark', 'light']) {
      const text = blocksToPython({ blocks, functions }, { theme }).code;
      const result = pythonToBlocks(text, l, { theme, existingFunctions: functions });
      assert.equal(result.ok, true, `${id} (${theme}): ${result.message}\n${text}`);
      assert.equal(blocksToPython(result.program, { theme }).code, text, `${id} (${theme})`);
      assert.equal(result.program.functions[0]?.name, functions[0]?.name, `${id}: function name kept`);
    }
  }
});

test('highlighting escapes HTML and marks the active and error lines', () => {
  const html = highlightPython('if a < b:  # <x>\n    forward()', { activeLines: [1], errorLine: 1 });
  assert.match(html, /<span class="code-line error"><span class="code-ln">1<\/span><span class="py-keyword">if<\/span> a &lt; b:  <span class="py-comment"># &lt;x&gt;<\/span><\/span>/);
  assert.match(html, /<span class="code-line active"><span class="code-ln">2<\/span>    <span class="py-call">forward<\/span>\(\)<\/span>/);
  assert.ok(!/<x>/.test(html));
});
