// Section 4 (continued).
import { F, L, R, J, Li, Tk, Fx, loop, iff, snake } from './lib.mjs';

const turn = () => iff('obstacleAhead', [R(), iff('obstacleAhead', [L(), L()])]);
const turnJ = () => iff('!canJump', [R(), iff('!canJump', [L(), L()])]);
const fixOrLight = () => iff('lampShorts', [Fx(), Li()], { elif: [['onLamp', [Li()]]] });
const fixOrLightDay = () => iff('lampShorts', [Fx()], { elif: [['onLamp', [Li()]]] });
const fixOrLightLit = () =>
  iff('lampShorts', [Fx(), Li()], { elif: [['onLamp', [iff('!lampLit', [Li()])]]] });
const fixOrLightLitDay = () =>
  iff('lampShorts', [Fx()], { elif: [['onLamp', [iff('lampLit', [Li()])]]] });
const fullChain = () =>
  iff('lampShorts', [Fx(), Li()], { elif: [['onLamp', [Li()]]], else: [Tk()] });
const fullChainLit = () =>
  iff('lampShorts', [Fx(), Li()], { elif: [['onLamp', [iff('!lampLit', [Li()])]]], else: [Tk()] });
const fullChainDay = () =>
  iff('lampShorts', [Fx()], { elif: [['onLamp', [iff('lampLit', [Li()])]]], else: [Tk()] });

const base = { category: 'functions' };

export const levels4c = [];

// 14 ------------------------------------------------------------------
{
  const s = snake({
    w: 6, d: 6, start: [0, 5, 0], segs: [[null, 3], ['R', 2], ['L', 2], ['R', 2]],
    items: '.SL.SL.LL', block: '_', fill: '_', heights: [1, 1, 2, 2, 3, 3, 4, 4, 5],
    decor: [[5, 4, 'T'], [4, 3, 'B']]
  });
  levels4c.push({
    ...base, ...s,
    id: 'pidyom-nad-bezodneyu',
    name: 'Підйом над безоднею',
    nameEn: 'Ascent over the Abyss',
    difficulty: 4,
    description: 'Місток над прірвою ще й піднімається сходинками вгору. Стрибай, повертай перед обривом і лагодь іскристі ліхтарі.',
    night: 'Пройди 9 стрибків. Перед обривом пробуй праворуч, інакше розверни робота ліворуч. Іскристі ліхтарі полагодь і запали, решту — запали.',
    day: 'Пройди 9 стрибків. Перед обривом пробуй праворуч, інакше розверни робота ліворуч. Іскристі ліхтарі лише полагодь, справні — вимкни.',
    descriptionEn: 'The bridge over the chasm also climbs up in steps. Jump, turn before a drop and repair the sparking lamps.',
    nightEn: 'Make 9 jumps. Before a drop try right, otherwise turn the robot left. Repair sparking lamps and light them, light the rest.',
    dayEn: 'Make 9 jumps. Before a drop try right, otherwise turn the robot left. Only repair sparking lamps and turn off the working ones.',
    allowed: ['jump', 'left', 'right', 'light', 'fix', 'loop', 'if'],
    elif: true, else: false,
    sensors: ['canJump', 'lampShorts', 'onLamp'],
    limit: 11, kits: 2,
    hints: [{
      text: 'Стрибок долає і сходинку, і рівну плитку. Датчик «Можна стрибнути» сповіщає лише про прірву або занадто високу стіну.',
      textEn: 'A jump overcomes both a step and a flat tile. The "Can jump" sensor only warns about a chasm or a wall that is too high.',
      target: 'command:jump'
    }],
    solution: [loop(9, turnJ(), J(), fixOrLight())],
    daySolution: [loop(9, turnJ(), J(), fixOrLightDay())]
  });
}

// 15 ------------------------------------------------------------------
{
  const s = snake({
    w: 3, d: 4, start: [0, 3, 0], segs: [[null, 3], ['R', 2], ['R', 3], ['R', 1]],
    items: 'KSLUOKSLL', decor: [[1, 1, 'T'], [1, 2, 'B']]
  });
  levels4c.push({
    ...base, ...s,
    id: 'nichna-zmina',
    name: 'Нічна зміна',
    nameEn: 'Night Shift',
    difficulty: 4,
    description: 'Кільцева доріжка навколо клумби. Тут і іскристі ліхтарі, і ліхтарі без лампочок, і речі на землі. Один цикл — одна повна зміна.',
    night: 'Обійди доріжку за 9 кроків: повертай праворуч біля краю поля. Іскристий ліхтар полагодь і запали, інший ліхтар запали, а на плитках без ліхтаря візьми те, що лежить.',
    day: 'Обійди доріжку за 9 кроків: повертай праворуч біля краю поля. Іскристий ліхтар лише полагодь, світний вимкни, ліхтарі без лампочок не чіпай, а на вільних плитках візьми те, що лежить.',
    descriptionEn: 'A ring path around a flowerbed. It has sparking lamps, lamps without bulbs and items on the ground. One loop is one full shift.',
    nightEn: 'Walk around the path in 9 steps: turn right at the edge of the field. Repair a sparking lamp and light it, light any other lamp, and on tiles without a lamp pick up whatever lies there.',
    dayEn: 'Walk around the path in 9 steps: turn right at the edge of the field. Only repair a sparking lamp, turn off a shining one, leave lamps without bulbs alone, and on free tiles pick up whatever lies there.',
    allowed: ['forward', 'right', 'light', 'take', 'fix', 'loop', 'if'],
    elif: true, else: true,
    sensors: ['obstacleAhead', 'lampShorts', 'onLamp', 'lampLit'],
    limit: 9, kits: 0,
    hints: [{
      text: 'Збирай ремкомплекти та лампочки до того, як вони знадобляться: порядок плиток уже підібрано правильно.',
      textEn: 'Collect repair kits and bulbs before you need them: the order of the tiles has been arranged correctly.',
      target: 'scene'
    }],
    solution: [loop(9, iff('obstacleAhead', [R()]), F(), fullChain())],
    daySolution: [loop(9, iff('obstacleAhead', [R()]), F(), fullChainDay())]
  });
}

// 16 ------------------------------------------------------------------
{
  const s = snake({
    w: 5, d: 7, start: [0, 6, 0], segs: [[null, 3], ['R', 3], ['L', 3]],
    items: '.Sl.SL.lH', block: 'h', heights: [1, 1, 2, 2, 3, 3, 4, 4, 5]
  });
  levels4c.push({
    ...base, ...s,
    id: 'mayak-na-vershyni',
    name: 'Маяк на вершині',
    nameEn: 'Lighthouse on the Summit',
    difficulty: 5,
    description: 'Крута стежка зі сходинками веде до будиночка-маяка на вершині. По дорозі — іскристі ліхтарі та ліхтарі, що вже світяться.',
    night: 'Здійнись на вершину за 9 стрибків. Перед стіною пробуй праворуч, інакше розверни робота ліворуч. Іскристі ліхтарі полагодь і запали, згаслі запали, світні не чіпай, а наприкінці запали маяк.',
    day: 'Здійнись на вершину за 9 стрибків. Перед стіною пробуй праворуч, інакше розверни робота ліворуч. Іскристі ліхтарі лише полагодь, а ті, що світяться, і маяк — вимкни.',
    descriptionEn: 'A steep stepped path leads to a lighthouse cottage on the summit. On the way — sparking lamps and lamps that already shine.',
    nightEn: 'Reach the summit in 9 jumps. Before a wall try right, otherwise turn the robot left. Repair sparking lamps and light them, light the dark ones, leave the shining ones, and light the lighthouse at the end.',
    dayEn: 'Reach the summit in 9 jumps. Before a wall try right, otherwise turn the robot left. Only repair sparking lamps, and turn off the ones that shine and the lighthouse.',
    allowed: ['jump', 'left', 'right', 'light', 'fix', 'loop', 'if'],
    elif: true, else: false,
    sensors: ['canJump', 'lampShorts', 'onLamp', 'lampLit'],
    limit: 12, kits: 2,
    hints: [{
      text: 'Це підсумок теми: повороти з перевіркою, ремонт і вкладена умова «НЕ Світло тут світить» — усе в одному циклі.',
      textEn: 'This sums up the topic: turns with a check, repairs and the nested condition "NOT Light is on here" — all in one loop.',
      target: 'scene'
    }],
    solution: [loop(9, turnJ(), J(), fixOrLightLit())],
    daySolution: [loop(9, turnJ(), J(), fixOrLightLitDay())]
  });
}

// 17 ------------------------------------------------------------------
{
  const s = snake({
    w: 8, d: 8, start: [0, 7, 0], segs: [[null, 4], ['R', 3], ['L', 3], ['R', 2]], items: 'KLSKUOLSKLLL'
  });
  levels4c.push({
    ...base, ...s,
    id: 'lisova-stezhka',
    name: 'Лісова стежка',
    nameEn: 'Forest Trail',
    difficulty: 5,
    description: 'Довга стежка має 12 кроків, а цикл дозволяє не більше 10 повторень. Помісти один цикл в інший і зроби одну велику перевірку на кожному кроці.',
    night: 'Пройди стежку з 12 кроків (наприклад, 2 × 6). На поворотах пробуй праворуч, потім ліворуч. Іскристий ліхтар — полагодь і запали, інший ліхтар — запали, а на вільних плитках візьми те, що лежить.',
    day: 'Пройди стежку з 12 кроків (наприклад, 2 × 6). На поворотах пробуй праворуч, потім ліворуч. Іскристий ліхтар лише полагодь, світний вимкни, ліхтарі без лампочок не чіпай, а на вільних плитках візьми те, що лежить.',
    descriptionEn: 'The long trail has 12 steps, while one loop allows at most 10 repetitions. Put one loop inside another and do one big check on every step.',
    nightEn: 'Walk the 12-step trail (for example, 2 × 6). At bends try right, then left. A sparking lamp — repair and light it, any other lamp — light it, and on free tiles pick up whatever lies there.',
    dayEn: 'Walk the 12-step trail (for example, 2 × 6). At bends try right, then left. Only repair a sparking lamp, turn off a shining one, leave lamps without bulbs alone, and on free tiles pick up whatever lies there.',
    allowed: ['forward', 'left', 'right', 'light', 'take', 'fix', 'loop', 'if'],
    elif: true, else: true,
    sensors: ['obstacleAhead', 'lampShorts', 'onLamp', 'lampLit'],
    limit: 13, kits: 0,
    hints: [{
      text: 'Цикл «2 повтори» із циклом «6 повтори» всередині виконає тіло 12 разів.',
      textEn: 'A "repeat 2" loop with a "repeat 6" loop inside it runs the body 12 times.',
      target: 'command:loop'
    }],
    solution: [loop(2, loop(6, turn(), F(), fullChain()))],
    daySolution: [loop(2, loop(6, turn(), F(), fullChainDay()))]
  });
}

// 18 ------------------------------------------------------------------
{
  const s = snake({
    w: 5, d: 5, start: [1, 3, 0], segs: [[null, 2], ['R', 2], ['R', 2], ['R', 1]],
    items: 'LSlLSlL', block: '_', fill: '_', decor: [[0, 0, 'T'], [4, 4, 'B']]
  });
  levels4c.push({
    ...base, ...s,
    id: 'kiltsevyy-mistok',
    name: 'Кільцевий місток',
    nameEn: 'Ring Bridge',
    difficulty: 4,
    description: 'Місток утворює кільце навколо озера. Праворуч — завжди тільки вода, тож повертай, щойно попереду закінчується міст.',
    night: 'Обійди кільце за 7 стрибків. Коли далі обрив — поверни праворуч. Іскристі ліхтарі полагодь і запали, згаслі запали, а ті, що вже світяться, не чіпай.',
    day: 'Обійди кільце за 7 стрибків. Коли далі обрив — поверни праворуч. Іскристі ліхтарі лише полагодь, а ті, що світяться, вимкни.',
    descriptionEn: 'The bridge forms a ring around a lake. To the right there is always only water, so turn as soon as the bridge ends ahead.',
    nightEn: 'Go around the ring in 7 jumps. When there is a drop ahead — turn right. Repair sparking lamps and light them, light the dark ones, and leave the ones that already shine.',
    dayEn: 'Go around the ring in 7 jumps. When there is a drop ahead — turn right. Only repair sparking lamps and turn off the ones that shine.',
    allowed: ['jump', 'right', 'light', 'fix', 'loop', 'if'],
    elif: true, else: false,
    sensors: ['canJump', 'lampShorts', 'onLamp', 'lampLit'],
    limit: 9, kits: 2,
    hints: [{
      text: 'На кільці вистачає одного повороту — праворуч. Вкладена умова потрібна лише для ліхтарів, що вже світяться.',
      textEn: 'On a ring a single turn — right — is enough. The nested condition is only needed for lamps that already shine.',
      target: 'command:if'
    }],
    solution: [loop(7, iff('!canJump', [R()]), J(), fixOrLightLit())],
    daySolution: [loop(7, iff('!canJump', [R()]), J(), fixOrLightLitDay())]
  });
}

// 19 ------------------------------------------------------------------
{
  const s = snake({
    w: 7, d: 7, start: [0, 6, 0], segs: [[null, 3], ['R', 3], ['R', 2], ['L', 2]], items: 'KLSKUOLSLH'
  });
  levels4c.push({
    ...base, ...s,
    id: 'vechirniy-obkhid',
    name: 'Вечірній обхід',
    nameEn: 'Evening Round',
    difficulty: 5,
    description: 'Останній обхід перед сном: збери речі, полагодь, що коротить, дай лампочки порожнім ліхтарям і заверши обхід у будиночку.',
    night: 'Пройди 10 кроків: на поворотах пробуй праворуч, потім ліворуч. Іскристий ліхтар полагодь і запали, інший ліхтар запали, а на вільних плитках візьми те, що лежить. Завершити треба світлом у будиночку.',
    day: 'Пройди 10 кроків: на поворотах пробуй праворуч, потім ліворуч. Іскристий ліхтар лише полагодь, світний вимкни, ліхтарі без лампочок не чіпай, на вільних плитках візьми те, що лежить. Завершити треба вимкненим світлом у будиночку.',
    descriptionEn: 'The last round before bed: collect items, repair what sparks, give bulbs to empty lamps and finish the round in the cottage.',
    nightEn: 'Walk 10 steps: at bends try right, then left. Repair a sparking lamp and light it, light any other lamp, and on free tiles pick up whatever lies there. Finish with the light in the cottage.',
    dayEn: 'Walk 10 steps: at bends try right, then left. Only repair a sparking lamp, turn off a shining one, leave lamps without bulbs alone, and on free tiles pick up whatever lies there. Finish with the light turned off in the cottage.',
    allowed: ['forward', 'left', 'right', 'light', 'take', 'fix', 'loop', 'if'],
    elif: true, else: true,
    sensors: ['obstacleAhead', 'lampShorts', 'onLamp', 'lampLit'],
    limit: 12, kits: 0,
    hints: [{
      text: 'Двері будиночка дивляться на стежку, тому останній крок вперед заведе тебе всередину.',
      textEn: 'The cottage door faces the path, so the last step forward takes you inside.',
      target: 'scene'
    }],
    solution: [loop(10, turn(), F(), fullChain())],
    daySolution: [loop(10, turn(), F(), fullChainDay())]
  });
}

// 20 ------------------------------------------------------------------
{
  const s = snake({
    w: 6, d: 8, start: [0, 7, 0], segs: [[null, 4], ['R', 3], ['L', 3], ['R', 2]],
    items: 'KLUOSKlSUOKL', block: 'h', heights: [1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5]
  });
  levels4c.push({
    ...base, ...s,
    id: 'ispyt-likhtarnyka',
    name: 'Іспит ліхтарника',
    nameEn: 'Lamplighter Exam',
    difficulty: 5,
    description: 'Підсумкове випробування теми: сходи змійкою, вкладені цикли, ремонт, лампочки, ремкомплекти та ліхтарі, що вже світяться.',
    night: 'Пройди 12 кроків стрибками (2 × 6). Перед стіною пробуй праворуч, інакше розверни робота ліворуч. Іскристий ліхтар полагодь і запали, згаслий запали, світний не чіпай, а на вільних плитках візьми те, що лежить.',
    day: 'Пройди 12 кроків стрибками (2 × 6). Перед стіною пробуй праворуч, інакше розверни робота ліворуч. Іскристий ліхтар лише полагодь, світний вимкни, ліхтарі без лампочок і ті, що вже вимкнені, не чіпай, а на вільних плитках візьми те, що лежить.',
    descriptionEn: 'The final test of the topic: winding stairs, nested loops, repairs, bulbs, repair kits and lamps that already shine.',
    nightEn: 'Make 12 jumps (2 × 6). Before a wall try right, otherwise turn the robot left. Repair a sparking lamp and light it, light a dark one, leave a shining one, and on free tiles pick up whatever lies there.',
    dayEn: 'Make 12 jumps (2 × 6). Before a wall try right, otherwise turn the robot left. Only repair a sparking lamp, turn off a shining one, leave lamps without bulbs and those already off alone, and on free tiles pick up whatever lies there.',
    allowed: ['jump', 'left', 'right', 'light', 'take', 'fix', 'loop', 'if'],
    elif: true, else: true,
    sensors: ['canJump', 'lampShorts', 'onLamp', 'lampLit'],
    limit: 14, kits: 0,
    hints: [{
      text: 'Зовнішній цикл «2» і внутрішній «6» дають 12 повторень. Усередині: поворот із перевіркою, стрибок і ланцюжок «Якщо / інакше якщо / інакше».',
      textEn: 'An outer loop of 2 and an inner loop of 6 give 12 repetitions. Inside: a turn with a check, a jump and the "If / else if / else" chain.',
      target: 'program'
    }],
    solution: [loop(2, loop(6, turnJ(), J(), fullChainLit()))],
    daySolution: [loop(2, loop(6, turnJ(), J(), fullChainDay()))]
  });
}
