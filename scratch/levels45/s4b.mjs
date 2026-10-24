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
const fullChainDay = () =>
  iff('lampShorts', [Fx()], { elif: [['onLamp', [iff('lampLit', [Li()])]]], else: [Tk()] });

const base = { category: 'functions' };

export const levels4b = [];

// 07 ------------------------------------------------------------------
{
  const s = snake({
    w: 6, d: 6, start: [0, 5, 0], segs: [[null, 3], ['R', 2], ['L', 2]],
    items: '.L..L.L', block: 'h', heights: [1, 2, 2, 3, 3, 4, 5]
  });
  levels4b.push({
    ...base, ...s,
    id: 'shody-zmiykoyu',
    name: 'Сходи змійкою',
    nameEn: 'Winding Stairs',
    difficulty: 3,
    description: 'Кам’яні сходи піднімаються вгору й змійкою повертають то праворуч, то ліворуч. Стрибок долає сходинку, а датчик підкаже, коли далі шляху немає.',
    night: 'Піднімися 7 кроків стрибками. Коли стрибнути не можна — спробуй повернути праворуч, а якщо й там не можна — розверни робота ліворуч. Запали ліхтарі.',
    day: 'Піднімися 7 кроків стрибками. Коли стрибнути не можна — спробуй повернути праворуч, а якщо й там не можна — розверни робота ліворуч. Вимкни ліхтарі.',
    descriptionEn: 'Stone stairs climb up and wind right and left. A jump overcomes a step, and the sensor tells you when there is no way ahead.',
    nightEn: 'Climb 7 steps by jumping. When you cannot jump — try turning right, and if you cannot jump there either — turn the robot left. Light the lamps.',
    dayEn: 'Climb 7 steps by jumping. When you cannot jump — try turning right, and if you cannot jump there either — turn the robot left. Turn off the lamps.',
    allowed: ['jump', 'left', 'right', 'light', 'loop', 'if'],
    elif: false, else: false,
    sensors: ['canJump', 'onLamp'],
    limit: 9,
    hints: [{
      text: 'Умова «НЕ Можна стрибнути» означає, що попереду стіна або обрив. Тоді спробуй праворуч і перевір її ще раз.',
      textEn: 'The condition "NOT Can jump" means there is a wall or a drop ahead. Then try right and check it once more.',
      target: 'command:if'
    }],
    solution: [loop(7, turnJ(), J(), iff('onLamp', [Li()]))]
  });
}

// 08 ------------------------------------------------------------------
{
  const s = snake({
    w: 6, d: 6, start: [0, 5, 0], segs: [[null, 2], ['R', 2], ['L', 2], ['R', 2]],
    items: '.L.L.L.L', block: '_', fill: '_', decor: [[4, 4, 'T'], [5, 3, 'B'], [1, 0, 'R']]
  });
  levels4b.push({
    ...base, ...s,
    id: 'mist-nad-bezodneyu',
    name: 'Міст над безоднею',
    nameEn: 'Bridge over the Abyss',
    difficulty: 3,
    description: 'Вузький місток звивається над прірвою. Перед обривом треба вчасно змінити напрямок — праворуч чи ліворуч.',
    night: 'Пройди місток за 8 стрибків. Якщо далі обрив — спробуй праворуч, а якщо й там обрив — розверни робота ліворуч. Запали всі ліхтарі.',
    day: 'Пройди місток за 8 стрибків. Якщо далі обрив — спробуй праворуч, а якщо й там обрив — розверни робота ліворуч. Вимкни всі ліхтарі.',
    descriptionEn: 'A narrow bridge winds over the abyss. Before a drop you must turn in time — right or left.',
    nightEn: 'Cross the bridge in 8 jumps. If there is a drop ahead — try right, and if there is a drop there too — turn the robot left. Light all the lamps.',
    dayEn: 'Cross the bridge in 8 jumps. If there is a drop ahead — try right, and if there is a drop there too — turn the robot left. Turn off all the lamps.',
    allowed: ['jump', 'left', 'right', 'light', 'loop', 'if'],
    elif: false, else: false,
    sensors: ['canJump', 'onLamp'],
    limit: 9,
    hints: [{
      text: 'Прірва — це не плитка, тому датчик «Можна стрибнути» там каже «ні». Крок: спробуй повернути, перевір, стрибни.',
      textEn: 'A chasm is not a tile, so the "Can jump" sensor says "no" there. Step: try turning, check, jump.',
      target: 'scene'
    }],
    solution: [loop(8, turnJ(), J(), iff('onLamp', [Li()]))]
  });
}

// 09 ------------------------------------------------------------------
{
  const s = snake({
    w: 6, d: 6, start: [5, 5, 3], segs: [[null, 3], ['R', 3], ['L', 2]], items: 'L...L..H'
  });
  levels4b.push({
    ...base, ...s,
    id: 'budynok-za-povorotom',
    name: 'Будиночок за поворотом',
    nameEn: 'Cottage Around the Bend',
    difficulty: 3,
    description: 'Стежка веде до будиночка, двері якого дивляться на стежку. Дійди до нього та ввімкни світло всередині.',
    night: 'Пройди 8 кроків: на поворотах пробуй спершу праворуч, потім ліворуч. Запали ліхтарі дорогою та світло в будиночку.',
    day: 'Пройди 8 кроків: на поворотах пробуй спершу праворуч, потім ліворуч. Вимкни ліхтарі дорогою та світло в будиночку.',
    descriptionEn: 'The path leads to a cottage whose door faces the path. Reach it and switch the light on inside.',
    nightEn: 'Walk 8 steps: at bends try right first, then left. Light the lamps on the way and the light in the cottage.',
    dayEn: 'Walk 8 steps: at bends try right first, then left. Turn off the lamps on the way and the light in the cottage.',
    allowed: ['forward', 'left', 'right', 'light', 'loop', 'if'],
    elif: false, else: false,
    sensors: ['obstacleAhead', 'onLamp'],
    limit: 9,
    hints: [{
      text: 'Будиночок теж «ліхтар» для датчика «Тут є ліхтар чи будинок». Двері дивляться на стежку, тож перешкоди перед ним немає.',
      textEn: 'A cottage also counts as a lamp for the "There is a lamp or house here" sensor. Its door faces the path, so there is no obstacle in front of it.',
      target: 'scene'
    }],
    solution: [loop(8, turn(), F(), iff('onLamp', [Li()]))]
  });
}

// 10 ------------------------------------------------------------------
{
  const s = snake({ w: 3, d: 10, start: [1, 9, 0], segs: [[null, 9]], items: 'UOKSUKOSL' });
  levels4b.push({
    ...base, ...s,
    id: 'lampochky-i-remkomplekty',
    name: 'Лампочки та ремкомплекти',
    nameEn: 'Bulbs and Repair Kits',
    difficulty: 3,
    description: 'На довгій алеї є ліхтарі без лампочок, іскристі ліхтарі та речі на землі. Збирай усе потрібне по дорозі й одразу використовуй.',
    night: 'Пройди 9 кроків. Іскристий ліхтар — полагодь і запали; будь-який інший ліхтар — запали; на плитках без ліхтаря візьми те, що лежить.',
    day: 'Пройди 9 кроків. Іскристий ліхтар лише полагодь; світний ліхтар вимкни; ліхтарі без лампочок не чіпай; на плитках без ліхтаря візьми те, що лежить.',
    descriptionEn: 'The long alley has lamps without bulbs, sparking lamps and items on the ground. Collect what you need on the way and use it right away.',
    nightEn: 'Walk 9 steps. A sparking lamp — repair and light it; any other lamp — light it; on tiles without a lamp pick up whatever lies there.',
    dayEn: 'Walk 9 steps. A sparking lamp — just repair it; a shining lamp — turn it off; leave lamps without bulbs alone; on tiles without a lamp pick up whatever lies there.',
    allowed: ['forward', 'light', 'take', 'fix', 'loop', 'if'],
    elif: true, else: true,
    sensors: ['lampShorts', 'onLamp', 'lampLit'],
    limit: 7, kits: 0,
    hints: [{
      text: 'Команда «Взяти» підбирає і лампочку, і ремкомплект. Ліхтар без лампочки запалиться, якщо ти вже несеш лампочку.',
      textEn: 'The "Take" command picks up both a bulb and a repair kit. A lamp without a bulb lights up if you are already carrying a bulb.',
      target: 'command:take'
    }],
    solution: [loop(9, F(), fullChain())],
    daySolution: [loop(9, F(), fullChainDay())]
  });
}

// 11 ------------------------------------------------------------------
{
  const s = snake({
    w: 6, d: 6, start: [0, 4, 0], segs: [[null, 3], ['R', 3], ['R', 3]], items: 'lS.LlSL.H'
  });
  levels4b.push({
    ...base, ...s,
    id: 'pidkova',
    name: 'Підкова',
    nameEn: 'Horseshoe',
    difficulty: 3,
    description: 'Стежка-підкова двічі повертає праворуч і закінчується біля будиночка. Деякі ліхтарі вже світяться, а деякі коротять.',
    night: 'Пройди 9 кроків: повертай праворуч перед деревами. Іскристі ліхтарі полагодь і запали, згаслі — запали, а ті, що вже світяться, не чіпай.',
    day: 'Пройди 9 кроків: повертай праворуч перед деревами. Іскристі ліхтарі лише полагодь, а ті, що світяться, вимкни.',
    descriptionEn: 'The horseshoe path turns right twice and ends at a cottage. Some lamps are already on, and some are sparking.',
    nightEn: 'Walk 9 steps: turn right before trees. Repair sparking lamps and light them, light the dark ones, and leave the ones that already shine.',
    dayEn: 'Walk 9 steps: turn right before trees. Only repair sparking lamps and turn off the ones that shine.',
    allowed: ['forward', 'right', 'light', 'fix', 'loop', 'if'],
    elif: true, else: false,
    sensors: ['obstacleAhead', 'lampShorts', 'onLamp', 'lampLit'],
    limit: 9, kits: 2,
    hints: [{
      text: 'Поворот і дії з ліхтарем — окремі умови в одному циклі. Не забудь, що будиночок наприкінці теж треба запалити.',
      textEn: 'The turn and the lamp actions are separate conditions inside one loop. Do not forget the cottage at the end must be lit too.',
      target: 'scene'
    }],
    solution: [loop(9, iff('obstacleAhead', [R()]), F(), fixOrLightLit())],
    daySolution: [loop(9, iff('obstacleAhead', [R()]), F(), fixOrLightLitDay())]
  });
}

// 12 ------------------------------------------------------------------
{
  const s = snake({
    w: 6, d: 6, start: [0, 5, 1],
    segs: [[null, 1], ['L', 1], ['R', 1], ['L', 1], ['R', 1], ['L', 1], ['R', 1], ['L', 1]],
    items: '.LSLSL.L'
  });
  levels4b.push({
    ...base, ...s,
    id: 'zyh-zah-cherez-skver',
    name: 'Зиг-заг через сквер',
    nameEn: 'Zigzag across the Square',
    difficulty: 4,
    description: 'Доріжка скверу йде сходинками: крок убік — крок угору. Повороти чергуються, а іскристі ліхтарі вимагають ремонту.',
    night: 'Пройди 8 кроків доріжкою. Перед деревом спробуй праворуч, інакше розверни робота ліворуч. Лагодь іскристі ліхтарі та запалюй усі.',
    day: 'Пройди 8 кроків доріжкою. Перед деревом спробуй праворуч, інакше розверни робота ліворуч. Іскристі ліхтарі лише лагодь, справні — вимикай.',
    descriptionEn: 'The square path goes in steps: one step sideways — one step up. The turns alternate, and the sparking lamps need repairing.',
    nightEn: 'Walk the path for 8 steps. Before a tree try right, otherwise turn the robot left. Repair sparking lamps and light them all.',
    dayEn: 'Walk the path for 8 steps. Before a tree try right, otherwise turn the robot left. Only repair sparking lamps and turn off the working ones.',
    allowed: ['forward', 'left', 'right', 'light', 'fix', 'loop', 'if'],
    elif: true, else: false,
    sensors: ['obstacleAhead', 'lampShorts', 'onLamp'],
    limit: 11, kits: 2,
    hints: [{
      text: 'Той самий вкладений поворот працює і на зиг-загу: після «Вправо» праворуч то вільно, то дерево — умова сама вирішить.',
      textEn: 'The same nested turn works on a zigzag: after "Right" the way is sometimes free and sometimes a tree — the condition decides for itself.',
      target: 'command:if'
    }],
    solution: [loop(8, turn(), F(), fixOrLight())],
    daySolution: [loop(8, turn(), F(), fixOrLightDay())]
  });
}

// 13 ------------------------------------------------------------------
{
  const s = snake({
    w: 7, d: 6, start: [1, 5, 1], segs: [[null, 3], ['L', 2], ['R', 2], ['L', 1]], items: 'LS.l.SLL'
  });
  levels4b.push({
    ...base, ...s,
    id: 'rozvylka-z-ohnyamy',
    name: 'Розвилка з вогнями',
    nameEn: 'Fork with Lights',
    difficulty: 4,
    description: 'Стежка петляє між деревами та краєм поля, а на ній стоять ліхтарі в різному стані: згаслі, іскристі й ті, що вже світяться.',
    night: 'Пройди 8 кроків стежкою. На поворотах пробуй спершу праворуч, потім ліворуч. Іскристі ліхтарі полагодь і запали, згаслі запали, а світні не чіпай.',
    day: 'Пройди 8 кроків стежкою. На поворотах пробуй спершу праворуч, потім ліворуч. Іскристі ліхтарі лише полагодь, а ті, що світяться, вимкни.',
    descriptionEn: 'The path winds between trees and the edge of the field, with lamps in different states: dark, sparking and already shining.',
    nightEn: 'Walk the path for 8 steps. At bends try right first, then left. Repair sparking lamps and light them, light the dark ones and leave the shining ones.',
    dayEn: 'Walk the path for 8 steps. At bends try right first, then left. Only repair sparking lamps and turn off the shining ones.',
    allowed: ['forward', 'left', 'right', 'light', 'fix', 'loop', 'if'],
    elif: true, else: false,
    sensors: ['obstacleAhead', 'lampShorts', 'onLamp', 'lampLit'],
    limit: 12, kits: 2,
    hints: [{
      text: 'Край поля теж вважається перешкодою. Розбий крок на дві частини: повороти, а потім дії з ліхтарем.',
      textEn: 'The edge of the field also counts as an obstacle. Split a step into two parts: the turns, and then the lamp actions.',
      target: 'scene'
    }],
    solution: [loop(8, turn(), F(), fixOrLightLit())],
    daySolution: [loop(8, turn(), F(), fixOrLightLitDay())]
  });
}
