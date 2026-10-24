// Section 5 "Цикл поки" (category id: lists) — levels 1..10.
import { F, L, R, J, Li, Tk, Fx, loop, wh, iff, snake } from './lib.mjs';

const fixOrLight = () => iff('lampShorts', [Fx(), Li()], { elif: [['onLamp', [Li()]]] });
const fixOrLightDay = () => iff('lampShorts', [Fx()], { elif: [['onLamp', [Li()]]] });

const base = { category: 'lists' };
const noObstacle = '!obstacleAhead';

export const levels5a = [];

// 01 ------------------------------------------------------------------
{
  const s = snake({ w: 3, d: 8, start: [1, 7, 0], segs: [[null, 7]], items: '......L' });
  levels5a.push({
    ...base, ...s,
    id: 'do-samoyi-stinky',
    name: 'До самої стіни',
    nameEn: 'All the Way to the Wall',
    difficulty: 1,
    description: 'Скільки кроків до кінця алеї — рахувати не треба. Блок «Поки» сам повторює дію, доки шлях вільний.',
    night: 'Іди вперед, поки перед тобою немає перешкоди, а тоді запали ліхтар.',
    day: 'Іди вперед, поки перед тобою немає перешкоди, а тоді вимкни ліхтар.',
    descriptionEn: 'There is no need to count the steps to the end of the alley. The "While" block repeats an action on its own as long as the way is free.',
    nightEn: 'Move forward while there is no obstacle ahead, then light the lamp.',
    dayEn: 'Move forward while there is no obstacle ahead, then turn off the lamp.',
    allowed: ['forward', 'light', 'while'],
    elif: false, else: false,
    sensors: ['obstacleAhead'],
    limit: 3,
    hints: [{
      text: 'Постав «Поки НЕ Попереду перешкода», а всередину — «Вперед». Після циклу залишилось лише запалити ліхтар.',
      textEn: 'Place "While NOT Obstacle ahead" and put "Forward" inside. After the loop all that is left is to light the lamp.',
      target: 'command:while'
    }],
    solution: [wh(noObstacle, F()), Li()]
  });
}

// 02 ------------------------------------------------------------------
{
  const s = snake({ w: 3, d: 8, start: [1, 7, 0], segs: [[null, 7]], items: '....L..' });
  levels5a.push({
    ...base, ...s,
    id: 'idu-do-likhtarya',
    name: 'Іду до ліхтаря',
    nameEn: 'Heading to the Lamp',
    difficulty: 1,
    description: 'Ліхтар стоїть десь посеред алеї, а алея йде далі. Умова для «Поки» може бути не лише про перешкоди.',
    night: 'Іди вперед, поки не опинишся біля ліхтаря, і запали його.',
    day: 'Іди вперед, поки не опинишся біля ліхтаря, і вимкни його.',
    descriptionEn: 'The lamp stands somewhere in the middle of the alley, and the alley goes on. The condition for "While" can be about more than obstacles.',
    nightEn: 'Move forward until you reach the lamp, then light it.',
    dayEn: 'Move forward until you reach the lamp, then turn it off.',
    allowed: ['forward', 'light', 'while'],
    elif: false, else: false,
    sensors: ['onLamp'],
    limit: 3,
    hints: [{
      text: 'Цикл крокує, доки умова «НЕ Тут є ліхтар чи будинок» істинна, і зупиняється просто на ліхтарі.',
      textEn: 'The loop steps while the condition "NOT There is a lamp or house here" is true and stops right on the lamp.',
      target: 'command:while'
    }],
    solution: [wh('!onLamp', F()), Li()]
  });
}

// 03 ------------------------------------------------------------------
{
  const map = [
    'B.T.B',
    '.T@T.',
    '.....',
    '.B.T.',
    'R.L..'
  ];
  levels5a.push({
    ...base, map, heights: null, start: [2, 1, 0],
    id: 'znaydy-vilnyy-shlyakh',
    name: 'Знайди вільний шлях',
    nameEn: 'Find a Free Way',
    difficulty: 2,
    description: 'Робот стоїть у затишку між деревами й дивиться в стіну. Скільки разів повернутися, невідомо — нехай цикл крутить його, поки шлях не відкриється.',
    night: 'Повертай праворуч, поки попереду є перешкода. Потім іди вперед до краю поля й запали ліхтар.',
    day: 'Повертай праворуч, поки попереду є перешкода. Потім іди вперед до краю поля й вимкни ліхтар.',
    descriptionEn: 'The robot stands in a nook between trees, facing a wall. How many times to turn is unknown — let a loop spin it until the way opens.',
    nightEn: 'Turn right while there is an obstacle ahead. Then walk forward to the edge of the field and light the lamp.',
    dayEn: 'Turn right while there is an obstacle ahead. Then walk forward to the edge of the field and turn off the lamp.',
    allowed: ['forward', 'right', 'light', 'while'],
    elif: false, else: false,
    sensors: ['obstacleAhead'],
    limit: 5,
    hints: [{
      text: 'Тепер умова без «НЕ»: «Поки Попереду перешкода» → «Вправо». Другий цикл — вже знайомий «Поки НЕ перешкода → Вперед».',
      textEn: 'Now a condition without "NOT": "While Obstacle ahead" → "Right". The second loop is the familiar "While NOT obstacle → Forward".',
      target: 'command:while'
    }],
    solution: [wh('obstacleAhead', R()), wh(noObstacle, F()), Li()]
  });
}

// 04 ------------------------------------------------------------------
{
  const s = snake({
    w: 6, d: 6, start: [0, 5, 0], segs: [[null, 4], ['R', 4]], items: '.......L', endBlock: true
  });
  levels5a.push({
    ...base, ...s,
    id: 'likhtar-za-povorotom',
    name: 'Ліхтар за поворотом',
    nameEn: 'Lamp around the Corner',
    difficulty: 2,
    description: 'Стежка має один поворот. Кожну пряму ділянку можна пройти одним циклом «Поки».',
    night: 'Дійди до дерева, поверни праворуч, дійди до наступного дерева й запали ліхтар.',
    day: 'Дійди до дерева, поверни праворуч, дійди до наступного дерева й вимкни ліхтар.',
    descriptionEn: 'The path has one bend. Each straight section can be walked with a single "While" loop.',
    nightEn: 'Walk to the tree, turn right, walk to the next tree and light the lamp.',
    dayEn: 'Walk to the tree, turn right, walk to the next tree and turn off the lamp.',
    allowed: ['forward', 'right', 'light', 'while'],
    elif: false, else: false,
    sensors: ['obstacleAhead'],
    limit: 6,
    hints: [{
      text: 'Програма складається з двох однакових циклів «Поки», між якими — поворот «Вправо».',
      textEn: 'The program consists of two identical "While" loops with a "Right" turn between them.',
      target: 'program'
    }],
    solution: [wh(noObstacle, F()), R(), wh(noObstacle, F()), Li()]
  });
}

// 05 ------------------------------------------------------------------
{
  const s = snake({ w: 3, d: 10, start: [1, 9, 0], segs: [[null, 9]], items: 'L.LL.L.LL' });
  levels5a.push({
    ...base, ...s,
    id: 'aleya-likhtariv',
    name: 'Алея ліхтарів',
    nameEn: 'Alley of Lamps',
    difficulty: 2,
    description: 'Ліхтарі стоять вздовж усієї алеї нерівномірно. Цикл «Поки» веде до кінця, а умова всередині вирішує, де світити.',
    night: 'Іди до кінця алеї. На кожному кроці, якщо тут ліхтар, запалюй його.',
    day: 'Іди до кінця алеї. На кожному кроці, якщо тут ліхтар, вимикай його.',
    descriptionEn: 'Lamps stand unevenly along the whole alley. A "While" loop takes you to the end, and a condition inside decides where to shine.',
    nightEn: 'Walk to the end of the alley. At every step, if there is a lamp here, light it.',
    dayEn: 'Walk to the end of the alley. At every step, if there is a lamp here, turn it off.',
    allowed: ['forward', 'light', 'if', 'while'],
    elif: false, else: false,
    sensors: ['obstacleAhead', 'onLamp'],
    limit: 4,
    hints: [{
      text: 'Усередині «Поки» поклади «Вперед» і «Якщо Тут є ліхтар чи будинок → Запалити».',
      textEn: 'Inside "While" put "Forward" and "If There is a lamp or house here → Light".',
      target: 'command:if'
    }],
    solution: [wh(noObstacle, F(), iff('onLamp', [Li()]))]
  });
}

// 06 ------------------------------------------------------------------
{
  const s = snake({
    w: 3, d: 8, start: [1, 7, 0], segs: [[null, 7]], items: '......L', heights: [1, 1, 2, 3, 3, 4, 5], block: 'h'
  });
  levels5a.push({
    ...base, ...s,
    id: 'pidyom-na-pahorb',
    name: 'Підйом на пагорб',
    nameEn: 'Climbing the Hill',
    difficulty: 2,
    description: 'Пагорб складається зі сходинок різної довжини. Стрибай, поки є куди стрибати.',
    night: 'Стрибай уперед, поки можна стрибнути, а на вершині запали ліхтар.',
    day: 'Стрибай уперед, поки можна стрибнути, а на вершині вимкни ліхтар.',
    descriptionEn: 'The hill is made of steps of different lengths. Keep jumping as long as there is somewhere to jump.',
    nightEn: 'Jump forward while you can jump, and light the lamp at the top.',
    dayEn: 'Jump forward while you can jump, and turn off the lamp at the top.',
    allowed: ['jump', 'light', 'while'],
    elif: false, else: false,
    sensors: ['canJump'],
    limit: 3,
    hints: [{
      text: '«Поки Можна стрибнути» → «Стрибок». На вершині далі вже нічого немає, тому цикл завершиться сам.',
      textEn: '"While Can jump" → "Jump". There is nothing further at the summit, so the loop ends by itself.',
      target: 'command:while'
    }],
    solution: [wh('canJump', J()), Li()]
  });
}

// 07 ------------------------------------------------------------------
{
  const map = [
    'B.T',
    '..B',
    'T..',
    '.L.',
    'Bl.',
    '.lT',
    'Rl.',
    '.lB'
  ];
  levels5a.push({
    ...base, map, heights: null, start: [1, 7, 0],
    id: 'diydy-do-zghasloho',
    name: 'Дійди до згаслого',
    nameEn: 'Reach the Dark One',
    difficulty: 2,
    description: 'Робот стоїть на ряду ліхтарів, що вже світяться. Десь попереду — один згаслий. Ідучи по світлих, знайди його.',
    night: 'Іди вперед, поки світло тут світить, а коли знайдеш згаслий ліхтар — запали його.',
    day: 'Уночі ці ліхтарі вже згасли, а один досі світить. Іди вперед, поки світло тут не світить, і вимкни той, що горить.',
    descriptionEn: 'The robot stands on a row of lamps that are already shining. Somewhere ahead there is one dark lamp. Walking along the bright ones, find it.',
    nightEn: 'Move forward while the light here is on, and when you find a dark lamp — light it.',
    dayEn: 'These lamps are already off, and a single one is still shining. Move forward while the light here is off, and turn off the one that burns.',
    allowed: ['forward', 'light', 'while'],
    elif: false, else: false,
    sensors: ['lampLit'],
    limit: 3,
    hints: [{
      text: 'Умова «Світло тут світить» теж підходить для «Поки». Увімкнути світло треба на першому ліхтарі, що не світить.',
      textEn: 'The condition "Light is on here" also works for "While". The light must be switched on at the first lamp that is not shining.',
      target: 'command:while'
    }],
    solution: [wh('lampLit', F()), Li()],
    daySolution: [wh('!lampLit', F()), Li()]
  });
}

// 08 ------------------------------------------------------------------
{
  const s = snake({ w: 3, d: 8, start: [1, 7, 0], segs: [[null, 7]], items: '.L.LL.H' });
  levels5a.push({
    ...base, ...s,
    id: 'budynok-naprykintsi',
    name: 'Будиночок наприкінці',
    nameEn: 'Cottage at the End',
    difficulty: 2,
    description: 'Алея закінчується будиночком. Двері дивляться на алею, тому всередину можна зайти просто кроком уперед.',
    night: 'Йди вперед, поки шлях вільний. Де є ліхтар чи будиночок — вмикай світло. Завершити треба світлом у будиночку.',
    day: 'Йди вперед, поки шлях вільний. Де є ліхтар чи будиночок — вимикай світло. Завершити треба вимкненим світлом у будиночку.',
    descriptionEn: 'The alley ends with a cottage. Its door faces the alley, so you can enter just by stepping forward.',
    nightEn: 'Move forward while the way is free. Wherever there is a lamp or a cottage, switch the light on. Finish with the light on in the cottage.',
    dayEn: 'Move forward while the way is free. Wherever there is a lamp or a cottage, switch the light off. Finish with the light off in the cottage.',
    allowed: ['forward', 'light', 'if', 'while'],
    elif: false, else: false,
    sensors: ['obstacleAhead', 'onLamp'],
    limit: 4,
    hints: [{
      text: 'Будиночок для датчика — теж ліхтар. Заходячи в нього, ти опиняєшся там, де «Тут є ліхтар чи будинок».',
      textEn: 'For the sensor a cottage is also a lamp. Stepping into it puts you where "There is a lamp or house here".',
      target: 'scene'
    }],
    solution: [wh(noObstacle, F(), iff('onLamp', [Li()]))]
  });
}

// 09 ------------------------------------------------------------------
{
  const s = snake({
    w: 5, d: 5, start: [0, 4, 0], segs: [[null, 4], ['R', 4], ['R', 4], ['R', 3]], items: '.L.L.L.L.L.L.L.'
  });
  levels5a.push({
    ...base, ...s,
    id: 'kvadratnyy-obkhid',
    name: 'Квадратний обхід',
    nameEn: 'Square Round',
    difficulty: 3,
    description: 'Ліхтарі стоять по краю скверу. Одна сторона — один цикл «Поки», а весь квадрат — цикл із чотирьох повторень.',
    night: 'Обійди сквер по краю: на кожній стороні йди до краю поля, запалюючи ліхтарі, а в кутку повертай праворуч.',
    day: 'Обійди сквер по краю: на кожній стороні йди до краю поля, вимикаючи ліхтарі, а в кутку повертай праворуч.',
    descriptionEn: 'The lamps stand along the edge of the square. One side is one "While" loop, and the whole square is a loop of four repetitions.',
    nightEn: 'Go around the square along its edge: on each side walk to the edge of the field lighting the lamps, and turn right at the corner.',
    dayEn: 'Go around the square along its edge: on each side walk to the edge of the field turning off the lamps, and turn right at the corner.',
    allowed: ['forward', 'right', 'light', 'loop', 'if', 'while'],
    elif: false, else: false,
    sensors: ['obstacleAhead', 'onLamp'],
    limit: 6,
    hints: [{
      text: 'Цикл «Поки» вкладається в звичайний цикл: «4 рази: {Поки НЕ перешкода: крок і лампа}, Вправо».',
      textEn: 'A "While" loop nests inside a regular loop: "4 times: {While NOT obstacle: step and lamp}, Right".',
      target: 'command:loop'
    }],
    solution: [loop(4, wh(noObstacle, F(), iff('onLamp', [Li()])), R())]
  });
}

// 10 ------------------------------------------------------------------
{
  const s = snake({
    w: 3, d: 10, start: [1, 9, 0], segs: [[null, 9]], items: '.L..L.L.L',
    heights: [1, 2, 1, 2, 3, 2, 3, 4, 3], block: 'h'
  });
  levels5a.push({
    ...base, ...s,
    id: 'pahorby-do-krayu',
    name: 'Пагорби до краю',
    nameEn: 'Hills to the Edge',
    difficulty: 3,
    description: 'Дорога біжить то вгору, то вниз. Стрибок долає кожен перепад, а ліхтарі стоять на деяких пагорбах.',
    night: 'Стрибай уперед, поки можна. Якщо ти на ліхтарі — запали його.',
    day: 'Стрибай уперед, поки можна. Якщо ти на ліхтарі — вимкни його.',
    descriptionEn: 'The road runs up and down. A jump overcomes every height change, and lamps stand on some of the hills.',
    nightEn: 'Jump forward while you can. If you are on a lamp — light it.',
    dayEn: 'Jump forward while you can. If you are on a lamp — turn it off.',
    allowed: ['jump', 'light', 'if', 'while'],
    elif: false, else: false,
    sensors: ['canJump', 'onLamp'],
    limit: 4,
    hints: [{
      text: 'Стрибок працює і вгору, і вниз, тому «Вперед» тут не підійде. Усередині циклу — «Стрибок» і умова про ліхтар.',
      textEn: 'A jump works both up and down, so "Forward" will not do here. Inside the loop — "Jump" and a condition about a lamp.',
      target: 'command:jump'
    }],
    solution: [wh('canJump', J(), iff('onLamp', [Li()]))]
  });
}

export { fixOrLight, fixOrLightDay };
