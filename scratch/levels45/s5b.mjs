// Section 5 (continued) — levels 11..20.
import { F, L, R, J, Li, Tk, Fx, loop, wh, iff, snake } from './lib.mjs';

const fixOrLightLit = () =>
  iff('lampShorts', [Fx(), Li()], { elif: [['onLamp', [iff('!lampLit', [Li()])]]] });
const fixOrLightLitDay = () =>
  iff('lampShorts', [Fx()], { elif: [['onLamp', [iff('lampLit', [Li()])]]] });
const fixOrLight = () => iff('lampShorts', [Fx(), Li()], { elif: [['onLamp', [Li()]]] });
const fixOrLightDay = () => iff('lampShorts', [Fx()], { elif: [['onLamp', [Li()]]] });
const fullChain = () =>
  iff('lampShorts', [Fx(), Li()], { elif: [['onLamp', [Li()]]], else: [Tk()] });
const fullChainDay = () =>
  iff('lampShorts', [Fx()], { elif: [['onLamp', [iff('lampLit', [Li()])]]], else: [Tk()] });

const base = { category: 'lists' };
const noObstacle = '!obstacleAhead';
const itemsAt = (n, lampSteps) =>
  Array.from({ length: n }, (_, i) => (lampSteps.includes(i + 1) ? 'L' : '.')).join('');

export const levels5b = [];

// 11 ------------------------------------------------------------------
{
  const s = snake({ w: 3, d: 8, start: [1, 7, 0], segs: [[null, 7]], items: 'KKKKS..' });
  levels5b.push({
    ...base, ...s,
    id: 'remkomplekt-po-dorozi',
    name: 'Ремкомплект по дорозі',
    nameEn: 'Repair Kit on the Way',
    difficulty: 3,
    description: 'Дорогою до іскристого ліхтаря на землі лежать ремкомплекти. Скільки їх і де ліхтар — не рахуй, нехай цикл збирає, доки не дійде.',
    night: 'Іди вперед, поки не дійдеш до ліхтаря, і підбирай ремкомплекти на плитках без ліхтаря. Тоді полагодь ліхтар і запали його.',
    day: 'Іди вперед, поки не дійдеш до ліхтаря, і підбирай ремкомплекти на плитках без ліхтаря. Тоді полагодь ліхтар.',
    descriptionEn: 'On the way to a sparking lamp repair kits lie on the ground. Do not count them or the distance — let a loop collect them until you arrive.',
    nightEn: 'Move forward until you reach the lamp, picking up repair kits on tiles without a lamp. Then repair the lamp and light it.',
    dayEn: 'Move forward until you reach the lamp, picking up repair kits on tiles without a lamp. Then repair the lamp.',
    allowed: ['forward', 'light', 'take', 'fix', 'if', 'while'],
    elif: false, else: false,
    sensors: ['onLamp'],
    limit: 6, kits: 0,
    hints: [{
      text: 'Усередині циклу після кроку перевір «НЕ Тут є ліхтар» і лише тоді бери. На самому ліхтарі брати вже нічого.',
      textEn: 'Inside the loop after a step check "NOT There is a lamp here" and only then take. There is nothing to take on the lamp itself.',
      target: 'command:take'
    }],
    solution: [wh('!onLamp', F(), iff('!onLamp', [Tk()])), Fx(), Li()],
    daySolution: [wh('!onLamp', F(), iff('!onLamp', [Tk()])), Fx()]
  });
}

// 12 ------------------------------------------------------------------
{
  const map = [
    'TLB',
    'B.R',
    '..T',
    'T..',
    '.X.',
    'R@B'
  ];
  const heights = ['020', '000', '000', '000', '000', '000'];
  levels5b.push({
    ...base, map, heights, start: [1, 5, 0],
    id: 'yashchyk-skhodynka',
    name: 'Ящик-сходинка',
    nameEn: 'Box Step',
    difficulty: 3,
    description: 'Ліхтар стоїть на уступі заввишки 2 — стрибком не дістатися. Штовхай ящик, поки він не впреться в уступ, і використай його як сходинку.',
    night: 'Штовхай ящик уперед, поки він рухається. Потім стрибни на ящик, з нього — на уступ і запали ліхтар.',
    day: 'Штовхай ящик уперед, поки він рухається. Потім стрибни на ящик, з нього — на уступ і вимкни ліхтар.',
    descriptionEn: 'The lamp stands on a ledge 2 high — a jump alone cannot reach it. Push the box until it hits the ledge and use it as a step.',
    nightEn: 'Push the box forward while it moves. Then jump onto the box, from it onto the ledge, and light the lamp.',
    dayEn: 'Push the box forward while it moves. Then jump onto the box, from it onto the ledge, and turn off the lamp.',
    allowed: ['forward', 'jump', 'light', 'while'],
    elif: false, else: false,
    sensors: ['obstacleAhead'],
    limit: 5,
    hints: [{
      text: 'Поки ящик можна штовхати, перешкоди попереду немає. Коли він упреться в уступ — датчик скаже «перешкода», і цикл зупиниться.',
      textEn: 'While the box can be pushed there is no obstacle ahead. When it hits the ledge the sensor says "obstacle" and the loop stops.',
      target: 'scene'
    }],
    solution: [wh(noObstacle, F()), J(), J(), Li()]
  });
}

// 13 ------------------------------------------------------------------
{
  const s = snake({ w: 3, d: 10, start: [1, 9, 0], segs: [[null, 9]], items: 'LS.LS.L.L' });
  levels5b.push({
    ...base, ...s,
    id: 'dovha-vulytsya-z-iskramy',
    name: 'Довга вулиця з іскрами',
    nameEn: 'Long Street with Sparks',
    difficulty: 3,
    description: 'Довга вулиця, на якій ліхтарі то справні, то коротять. Цикл «Поки» веде вулицею, а ланцюжок умов вирішує, що робити на кожній плитці.',
    night: 'Іди до кінця вулиці. Якщо ліхтар коротить — полагодь і запали; інакше якщо тут ліхтар — запали.',
    day: 'Іди до кінця вулиці. Якщо ліхтар коротить — лише полагодь; інакше якщо тут ліхтар — вимкни.',
    descriptionEn: 'A long street where the lamps are sometimes fine and sometimes sparking. A "While" loop leads along the street, and a chain of conditions decides what to do on each tile.',
    nightEn: 'Walk to the end of the street. If the lamp is sparking — repair and light it; else if there is a lamp here — light it.',
    dayEn: 'Walk to the end of the street. If the lamp is sparking — just repair it; else if there is a lamp here — turn it off.',
    allowed: ['forward', 'light', 'fix', 'if', 'while'],
    elif: true, else: false,
    sensors: ['obstacleAhead', 'lampShorts', 'onLamp'],
    limit: 6, kits: 2,
    hints: [{
      text: 'Тіло циклу таке: «Вперед», а далі «Якщо коротить → Полагодити, Запалити» і «інакше якщо є ліхтар → Запалити».',
      textEn: 'The loop body is: "Forward", then "If sparking → Repair, Light" and "else if there is a lamp → Light".',
      target: 'command:if'
    }],
    solution: [wh(noObstacle, F(), fixOrLight())],
    daySolution: [wh(noObstacle, F(), fixOrLightDay())]
  });
}

// 14 ------------------------------------------------------------------
{
  const s = snake({
    w: 5, d: 5, start: [0, 4, 0],
    segs: [[null, 4], ['R', 4], ['R', 4], ['R', 2], ['R', 2], ['R', 1]],
    items: itemsAt(17, [3, 6, 9, 12, 15, 17])
  });
  levels5b.push({
    ...base, ...s,
    id: 'ravlyk',
    name: 'Равлик',
    nameEn: 'Snail',
    difficulty: 4,
    description: 'Доріжка закручується спіраллю до центру: щоразу прямі ділянки коротшають. Одна сторона спіралі — один цикл «Поки», а повороти повторює зовнішній цикл.',
    night: 'Йди спіраллю до центру: на кожній стороні рухайся до перешкоди, запалюючи ліхтарі, і повертай праворуч.',
    day: 'Йди спіраллю до центру: на кожній стороні рухайся до перешкоди, вимикаючи ліхтарі, і повертай праворуч.',
    descriptionEn: 'The path curls in a spiral towards the centre: every time the straight sections get shorter. One side of the spiral is one "While" loop, and an outer loop repeats the turns.',
    nightEn: 'Follow the spiral to the centre: on each side move to an obstacle lighting the lamps, and turn right.',
    dayEn: 'Follow the spiral to the centre: on each side move to an obstacle turning off the lamps, and turn right.',
    allowed: ['forward', 'right', 'light', 'loop', 'if', 'while'],
    elif: false, else: false,
    sensors: ['obstacleAhead', 'onLamp'],
    limit: 6,
    hints: [{
      text: 'Сторін у спіралі шість. Програма та сама, що й для квадрата, — міняється лише кількість повторень зовнішнього циклу.',
      textEn: 'The spiral has six sides. The program is the same as for the square — only the number of repetitions of the outer loop changes.',
      target: 'command:loop'
    }],
    solution: [loop(6, wh(noObstacle, F(), iff('onLamp', [Li()])), R())]
  });
}

// 15 ------------------------------------------------------------------
{
  const s = snake({
    w: 7, d: 7, start: [0, 6, 1],
    segs: [[null, 5], ['L', 2], ['L', 4], ['R', 2], ['R', 4], ['L', 2]],
    items: '.L..L.L..L..L..L..L'
  });
  levels5b.push({
    ...base, ...s,
    id: 'zmiyka-bez-kintsya',
    name: 'Змійка без кінця',
    nameEn: 'Endless Snake',
    difficulty: 4,
    description: 'Змійка то повертає праворуч, то ліворуч, а довжина прямих ділянок різна. Цикл «Поки» проходить пряму, а після неї треба обрати правильний поворот.',
    night: 'Йди прямою до перешкоди, запалюючи ліхтарі. Тоді поверни праворуч, а якщо там теж перешкода — розверни робота ліворуч. Повтори для всіх 6 ділянок.',
    day: 'Йди прямою до перешкоди, вимикаючи ліхтарі. Тоді поверни праворуч, а якщо там теж перешкода — розверни робота ліворуч. Повтори для всіх 6 ділянок.',
    descriptionEn: 'The snake bends right and left, and its straight sections have different lengths. A "While" loop walks a straight section, and after it you must pick the right turn.',
    nightEn: 'Walk the straight section to an obstacle, lighting lamps. Then turn right, and if there is an obstacle there too — turn the robot left. Repeat for all 6 sections.',
    dayEn: 'Walk the straight section to an obstacle, turning off lamps. Then turn right, and if there is an obstacle there too — turn the robot left. Repeat for all 6 sections.',
    allowed: ['forward', 'left', 'right', 'light', 'loop', 'if', 'while'],
    elif: false, else: false,
    sensors: ['obstacleAhead', 'onLamp'],
    limit: 9,
    hints: [{
      text: 'У зовнішньому циклі на 6 повторень: «Поки НЕ перешкода → крок і лампа», потім «Вправо» і «Якщо перешкода → Вліво, Вліво».',
      textEn: 'In an outer loop of 6 repetitions: "While NOT obstacle → step and lamp", then "Right" and "If obstacle → Left, Left".',
      target: 'program'
    }],
    solution: [loop(6, wh(noObstacle, F(), iff('onLamp', [Li()])), R(), iff('obstacleAhead', [L(), L()]))]
  });
}

// 16 ------------------------------------------------------------------
{
  const s = snake({
    w: 7, d: 7, start: [1, 5, 0], segs: [[null, 4], ['R', 4], ['R', 4], ['R', 3]],
    items: 'LS.lL.SlL.lL.LL', block: '_', fill: '_', decor: [[0, 0, 'T'], [6, 6, 'B'], [3, 3, 'R']]
  });
  levels5b.push({
    ...base, ...s,
    id: 'obkhid-ozera',
    name: 'Обхід озера',
    nameEn: 'Around the Lake',
    difficulty: 4,
    description: 'Місток обходить озеро по периметру. Ліхтарі на ньому різні: одні вже світяться, інші згаслі чи іскристі.',
    night: 'Обійди озеро: на кожній стороні стрибай, поки можна. Іскристі ліхтарі полагодь і запали, згаслі запали, ті, що світяться, не чіпай. У кутку повертай праворуч.',
    day: 'Обійди озеро: на кожній стороні стрибай, поки можна. Іскристі ліхтарі лише полагодь, а ті, що світяться, вимкни. У кутку повертай праворуч.',
    descriptionEn: 'The bridge goes around the lake along its perimeter. The lamps on it vary: some already shine, others are dark or sparking.',
    nightEn: 'Go around the lake: on each side jump while you can. Repair sparking lamps and light them, light the dark ones, leave the shining ones. Turn right at a corner.',
    dayEn: 'Go around the lake: on each side jump while you can. Only repair sparking lamps and turn off the ones that shine. Turn right at a corner.',
    allowed: ['jump', 'right', 'light', 'fix', 'loop', 'if', 'while'],
    elif: true, else: false,
    sensors: ['canJump', 'lampShorts', 'onLamp', 'lampLit'],
    limit: 9, kits: 2,
    hints: [{
      text: 'Тіло внутрішнього циклу — «Стрибок» і ланцюжок умов для ліхтаря, а в кутку, коли стрибнути не можна, — «Вправо».',
      textEn: 'The inner loop body is "Jump" and a chain of conditions for the lamp, and at a corner, when you cannot jump, comes "Right".',
      target: 'command:while'
    }],
    solution: [loop(4, wh('canJump', J(), fixOrLightLit()), R())],
    daySolution: [loop(4, wh('canJump', J(), fixOrLightLitDay()), R())]
  });
}

// 17 ------------------------------------------------------------------
{
  const map = [
    'TLB',
    'B.T',
    'T.B',
    'BXT',
    'T.B',
    'B.T',
    'T.B',
    'B.T',
    'TXB',
    'R@T'
  ];
  const heights = ['040', '020', '020', '020', '020', '000', '000', '000', '000', '000'];
  levels5b.push({
    ...base, map, heights, start: [1, 9, 0],
    id: 'dva-yashchyky-skhody',
    name: 'Два ящики-сходинки',
    nameEn: 'Two Box Steps',
    difficulty: 4,
    description: 'Ліхтар на самому верху: спершу уступ заввишки 2, а за ним ще один. Кожен уступ має свій ящик — підштовхни, піднімися, і так двічі.',
    night: 'Штовхай перший ящик, поки він рухається, стрибни на нього й на уступ. Те саме зроби з другим ящиком і запали ліхтар нагорі.',
    day: 'Штовхай перший ящик, поки він рухається, стрибни на нього й на уступ. Те саме зроби з другим ящиком і вимкни ліхтар нагорі.',
    descriptionEn: 'The lamp is at the very top: first a ledge 2 high, and behind it another. Each ledge has its own box — push, climb, and do it twice.',
    nightEn: 'Push the first box while it moves, jump onto it and onto the ledge. Do the same with the second box and light the lamp at the top.',
    dayEn: 'Push the first box while it moves, jump onto it and onto the ledge. Do the same with the second box and turn off the lamp at the top.',
    allowed: ['forward', 'jump', 'light', 'while'],
    elif: false, else: false,
    sensors: ['obstacleAhead'],
    limit: 9,
    hints: [{
      text: 'Другий ящик стоїть уже на уступі. Збери програму з двох однакових блоків «Поки НЕ перешкода → Вперед», «Стрибок», «Стрибок».',
      textEn: 'The second box already stands on the ledge. Build the program from two identical blocks "While NOT obstacle → Forward", "Jump", "Jump".',
      target: 'program'
    }],
    solution: [wh(noObstacle, F()), J(), J(), wh(noObstacle, F()), J(), J(), Li()]
  });
}

// 18 ------------------------------------------------------------------
{
  const map = [
    'BLTBRTB',
    'T.BTRLT',
    'R.TLB.R',
    'B.R.T.B',
    '@......'
  ];
  levels5b.push({
    ...base, map, heights: null, start: [0, 4, 1],
    id: 'hrebinka',
    name: 'Гребінка',
    nameEn: 'Comb',
    difficulty: 4,
    description: 'Вздовж доріжки відходять три зубці різної довжини, і на кожному кінці — ліхтар. Довжини не однакові, тож лічильник тут не допоможе.',
    night: 'Для кожного з трьох зубців: підійди до нього, поверни ліворуч і дійди до краю зубця, запали ліхтар, розверни робота, повернись на доріжку й іди далі.',
    day: 'Для кожного з трьох зубців: підійди до нього, поверни ліворуч і дійди до краю зубця, вимкни ліхтар, розверни робота, повернись на доріжку й іди далі.',
    descriptionEn: 'Three teeth of different lengths branch off the path, with a lamp at the end of each. The lengths differ, so a counter will not help here.',
    nightEn: 'For each of the three teeth: walk up to it, turn left and walk to the end of the tooth, light the lamp, turn the robot around, return to the path and carry on.',
    dayEn: 'For each of the three teeth: walk up to it, turn left and walk to the end of the tooth, turn off the lamp, turn the robot around, return to the path and carry on.',
    allowed: ['forward', 'left', 'light', 'loop', 'while'],
    elif: false, else: false,
    sensors: ['obstacleAhead'],
    limit: 12,
    hints: [{
      text: 'Один зубець: «Вперед, Вліво, Поки НЕ перешкода → Вперед, Запалити, Вліво, Вліво, Поки НЕ перешкода → Вперед, Вліво, Вперед». Повтори це 3 рази.',
      textEn: 'One tooth: "Forward, Left, While NOT obstacle → Forward, Light, Left, Left, While NOT obstacle → Forward, Left, Forward". Repeat it 3 times.',
      target: 'program'
    }],
    solution: [loop(3, F(), L(), wh(noObstacle, F()), Li(), L(), L(), wh(noObstacle, F()), L(), F())]
  });
}

// 19 ------------------------------------------------------------------
{
  const s = snake({
    w: 5, d: 4, start: [0, 3, 0], segs: [[null, 3], ['R', 4], ['R', 3], ['R', 3]],
    items: 'KSLUOKSLUKOSL',
    decor: [[1, 1, 'T'], [2, 1, 'B'], [3, 1, 'T'], [1, 2, 'B'], [2, 2, 'T'], [3, 2, 'B']]
  });
  levels5b.push({
    ...base, ...s,
    id: 'nichnyy-obkhid-kvartalu',
    name: 'Нічний обхід кварталу',
    nameEn: 'Night Round of the Block',
    difficulty: 5,
    description: 'Обхід кварталу по периметру: іскристі ліхтарі, ліхтарі без лампочок і речі на землі. Одна сторона — один цикл «Поки».',
    night: 'Обійди квартал: на кожній стороні йди до перешкоди. Іскристий ліхтар полагодь і запали, будь-який інший ліхтар запали, а на вільних плитках візьми те, що лежить. У кутку повертай праворуч.',
    day: 'Обійди квартал: на кожній стороні йди до перешкоди. Іскристий ліхтар лише полагодь, світний вимкни, ліхтарі без лампочок не чіпай, а на вільних плитках візьми те, що лежить. У кутку повертай праворуч.',
    descriptionEn: 'A round of the block along its perimeter: sparking lamps, lamps without bulbs and items on the ground. One side is one "While" loop.',
    nightEn: 'Go around the block: on each side walk to an obstacle. Repair a sparking lamp and light it, light any other lamp, and on free tiles pick up whatever lies there. Turn right at a corner.',
    dayEn: 'Go around the block: on each side walk to an obstacle. Only repair a sparking lamp, turn off a shining one, leave lamps without bulbs alone, and on free tiles pick up whatever lies there. Turn right at a corner.',
    allowed: ['forward', 'right', 'light', 'take', 'fix', 'loop', 'if', 'while'],
    elif: true, else: true,
    sensors: ['obstacleAhead', 'lampShorts', 'onLamp', 'lampLit'],
    limit: 9, kits: 0,
    hints: [{
      text: 'Вся «розумна» частина вміщується в один блок «Якщо / інакше якщо / інакше» всередині циклу «Поки».',
      textEn: 'The whole "smart" part fits in a single "If / else if / else" block inside the "While" loop.',
      target: 'command:if'
    }],
    solution: [loop(4, wh(noObstacle, F(), fullChain()), R())],
    daySolution: [loop(4, wh(noObstacle, F(), fullChainDay()), R())]
  });
}

// 20 ------------------------------------------------------------------
{
  const s = snake({
    w: 7, d: 7, start: [0, 6, 0],
    segs: [[null, 6], ['R', 6], ['R', 6], ['R', 4], ['R', 4], ['R', 2], ['R', 2], ['R', 1]],
    items: 'KLSUOL'.repeat(5) + 'L'
  });
  levels5b.push({
    ...base, ...s,
    id: 'velykyy-marshrut',
    name: 'Великий маршрут',
    nameEn: 'The Grand Route',
    difficulty: 5,
    description: 'Підсумок розділу: велика спіраль на 31 крок. Усе, що ти вмієш, — «Поки», цикл, ланцюжок умов і збір речей — працює в одній короткій програмі.',
    night: 'Пройди спіраль до центру: на кожній стороні рухайся до перешкоди й повертай праворуч. Іскристий ліхтар полагодь і запали, інший ліхтар запали, а на вільних плитках візьми те, що лежить.',
    day: 'Пройди спіраль до центру: на кожній стороні рухайся до перешкоди й повертай праворуч. Іскристий ліхтар лише полагодь, світний вимкни, ліхтарі без лампочок не чіпай, а на вільних плитках візьми те, що лежить.',
    descriptionEn: 'The summary of the section: a big spiral of 31 steps. Everything you can do — "While", a loop, a chain of conditions and collecting items — works in one short program.',
    nightEn: 'Walk the spiral to the centre: on each side move to an obstacle and turn right. Repair a sparking lamp and light it, light any other lamp, and on free tiles pick up whatever lies there.',
    dayEn: 'Walk the spiral to the centre: on each side move to an obstacle and turn right. Only repair a sparking lamp, turn off a shining one, leave lamps without bulbs alone, and on free tiles pick up whatever lies there.',
    allowed: ['forward', 'right', 'light', 'take', 'fix', 'loop', 'if', 'while'],
    elif: true, else: true,
    sensors: ['obstacleAhead', 'lampShorts', 'onLamp', 'lampLit'],
    limit: 9, kits: 0,
    hints: [{
      text: 'У спіралі вісім сторін, тож зовнішній цикл повторюється 8 разів. Решта — як у нічному обході кварталу.',
      textEn: 'The spiral has eight sides, so the outer loop repeats 8 times. The rest is like the night round of the block.',
      target: 'command:loop'
    }],
    solution: [loop(8, wh(noObstacle, F(), fullChain()), R())],
    daySolution: [loop(8, wh(noObstacle, F(), fullChainDay()), R())]
  });
}

export { fixOrLight, fixOrLightDay };
