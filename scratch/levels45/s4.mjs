// Section 4 "Складні умови" (category id: functions) — 20 levels.
import { F, L, R, J, Li, Tk, Fx, loop, iff, snake } from './lib.mjs';

const turn = () => iff('obstacleAhead', [R(), iff('obstacleAhead', [L(), L()])]);
const turnJ = () => iff('!canJump', [R(), iff('!canJump', [L(), L()])]);
// "what is under my feet" chains
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

export const levels4 = [];

// 01 ------------------------------------------------------------------
{
  const s = snake({ w: 3, d: 8, start: [1, 7, 0], segs: [[null, 7]], items: 'L.SL.SL' });
  levels4.push({
    ...base, ...s,
    id: 'try-vydy-plytok',
    name: 'Три види плиток',
    nameEn: 'Three Kinds of Tiles',
    difficulty: 1,
    description: 'Вздовж вулиці стоять і справні, й іскристі ліхтарі. Обирай дію залежно від того, що знаходиться під ногами.',
    night: 'Пройди 7 кроків уперед. Якщо ліхтар коротить — полагодь його й запали, інакше якщо тут ліхтар — просто запали.',
    day: 'Пройди 7 кроків уперед. Іскристі ліхтарі лише полагодь, а справні — вимкни.',
    descriptionEn: 'Both working and sparking lamps line the street. Pick an action depending on what is under your feet.',
    nightEn: 'Walk 7 steps forward. If the lamp is sparking — repair it and light it, otherwise if there is a lamp here — just light it.',
    dayEn: 'Walk 7 steps forward. Only repair the sparking lamps and turn off the working ones.',
    allowed: ['forward', 'light', 'fix', 'loop', 'if'],
    elif: true, else: false,
    sensors: ['lampShorts', 'onLamp'],
    limit: 6, kits: 2,
    hints: [{
      text: 'Склади ланцюжок із двох умов: «Якщо Ліхтар коротить» і «інакше якщо Тут є ліхтар чи будинок». Умови перевіряються по черзі, зверху вниз.',
      textEn: 'Build a chain of two conditions: "If Lamp is sparking" and "else if There is a lamp or house here". Conditions are checked in order, top to bottom.',
      target: 'command:if'
    }],
    solution: [loop(7, F(), fixOrLight())],
    daySolution: [loop(7, F(), fixOrLightDay())]
  });
}

// 02 ------------------------------------------------------------------
{
  const s = snake({
    w: 5, d: 5, start: [0, 4, 0], segs: [[null, 2], ['R', 2], ['L', 2]], items: '.....L'
  });
  levels4.push({
    ...base, ...s,
    id: 'kuda-povernuty',
    name: 'Куди повернути?',
    nameEn: 'Which Way to Turn?',
    difficulty: 2,
    description: 'Стежка двічі впирається в дерево: спершу вона повертає праворуч, а потім — ліворуч. Датчик не каже, куди саме, тож спробуй і перевір.',
    night: 'Йди стежкою 6 кроків. Біля дерева повернися праворуч; якщо попереду знову перешкода — розвернися в протилежний бік. Наприкінці запали ліхтар.',
    day: 'Йди стежкою 6 кроків. Біля дерева повернися праворуч; якщо попереду знову перешкода — розвернися в протилежний бік. Наприкінці вимкни ліхтар.',
    descriptionEn: 'The path hits a tree twice: first it bends right, then left. The sensor does not tell you which way, so try a turn and check.',
    nightEn: 'Follow the path for 6 steps. At a tree turn right; if there is an obstacle ahead again — turn around the other way. Light the lamp at the end.',
    dayEn: 'Follow the path for 6 steps. At a tree turn right; if there is an obstacle ahead again — turn around the other way. Turn off the lamp at the end.',
    allowed: ['forward', 'left', 'right', 'light', 'loop', 'if'],
    elif: false, else: false,
    sensors: ['obstacleAhead'],
    limit: 8,
    hints: [{
      text: 'Вклади умову в умову: після повороту праворуч знову перевір «Попереду перешкода». Якщо вона є — двічі поверни ліворуч, і ти дивитимешся в потрібний бік.',
      textEn: 'Nest one condition inside another: after turning right check "Obstacle ahead" again. If it is there, turn left twice and you will face the right way.',
      target: 'command:if'
    }],
    solution: [loop(6, turn(), F()), Li()]
  });
}

// 03 ------------------------------------------------------------------
{
  const s = snake({ w: 3, d: 8, start: [1, 7, 0], segs: [[null, 7]], items: 'KLSKSLL' });
  levels4.push({
    ...base, ...s,
    id: 'zbyrach-remkomplektiv',
    name: 'Збирач ремкомплектів',
    nameEn: 'Repair Kit Collector',
    difficulty: 2,
    description: 'На кожній плитці вулиці або стоїть ліхтар, або лежить ремкомплект. Збирай комплекти, щоб мати чим лагодити іскристі ліхтарі.',
    night: 'Пройди 7 кроків. Якщо ліхтар коротить — полагодь і запали; якщо ліхтар справний — запали; на решті плиток візьми ремкомплект.',
    day: 'Пройди 7 кроків. Іскристі ліхтарі полагодь, справні вимкни, а на решті плиток візьми ремкомплект.',
    descriptionEn: 'Every tile of the street holds either a lamp or a repair kit. Collect kits so you have something to fix sparking lamps with.',
    nightEn: 'Walk 7 steps. If the lamp is sparking — repair and light it; if the lamp is fine — light it; on the other tiles pick up a repair kit.',
    dayEn: 'Walk 7 steps. Repair sparking lamps, turn off the working ones, and pick up a repair kit on the other tiles.',
    allowed: ['forward', 'light', 'take', 'fix', 'loop', 'if'],
    elif: true, else: true,
    sensors: ['lampShorts', 'onLamp'],
    limit: 7, kits: 0,
    hints: [{
      text: 'Блок «інакше» спрацьовує, коли жодна з умов вище не підійшла — саме там плитка з ремкомплектом.',
      textEn: 'The "else" block runs when none of the conditions above matched — that is exactly the tile with a repair kit.',
      target: 'command:if'
    }],
    solution: [loop(7, F(), fullChain())],
    daySolution: [loop(7, F(), iff('lampShorts', [Fx()], { elif: [['onLamp', [Li()]]], else: [Tk()] }))]
  });
}

// 04 ------------------------------------------------------------------
{
  const s = snake({ w: 6, d: 6, start: [0, 5, 0], segs: [[null, 4], ['R', 4]], items: 'LS..LS.L' });
  levels4.push({
    ...base, ...s,
    id: 'kutova-vulytsya-z-iskramy',
    name: 'Кутова вулиця з іскрами',
    nameEn: 'Corner Street with Sparks',
    difficulty: 2,
    description: 'Вулиця робить поворот, а ліхтарі на ній то справні, то іскристі. Поєднай поворот і вибір дії в одному циклі.',
    night: 'Пройди 8 кроків: повертай праворуч перед деревом, ремонтуй ліхтарі, що коротять, і запалюй усі інші.',
    day: 'Пройди 8 кроків: повертай праворуч перед деревом, ремонтуй ліхтарі, що коротять, і вимикай справні.',
    descriptionEn: 'The street bends, and its lamps are sometimes fine and sometimes sparking. Combine the turn and the choice of action in a single loop.',
    nightEn: 'Walk 8 steps: turn right before a tree, repair lamps that spark and light all the others.',
    dayEn: 'Walk 8 steps: turn right before a tree, repair lamps that spark and turn off the working ones.',
    allowed: ['forward', 'right', 'light', 'fix', 'loop', 'if'],
    elif: true, else: false,
    sensors: ['obstacleAhead', 'lampShorts', 'onLamp'],
    limit: 8, kits: 2,
    hints: [{
      text: 'У кожному повторенні спершу перевір «Попереду перешкода» (поворот), потім крок уперед, а далі — ланцюжок «Якщо коротить / інакше якщо є ліхтар».',
      textEn: 'In every repetition first check "Obstacle ahead" (turn), then step forward, then use the chain "If sparking / else if there is a lamp".',
      target: 'scene'
    }],
    solution: [loop(8, iff('obstacleAhead', [R()]), F(), fixOrLight())],
    daySolution: [loop(8, iff('obstacleAhead', [R()]), F(), fixOrLightDay())]
  });
}

// 05 ------------------------------------------------------------------
{
  const s = snake({ w: 3, d: 8, start: [1, 7, 0], segs: [[null, 7]], items: 'LlS.lSL' });
  levels4.push({
    ...base, ...s,
    id: 'reviziya-z-iskramy',
    name: 'Ревізія з іскрами',
    nameEn: 'Inspection with Sparks',
    difficulty: 3,
    description: 'Частина ліхтарів уже горить, частина коротить, а частина просто вимкнена. Вкладена умова допоможе не чіпати зайвого.',
    night: 'Пройди 7 кроків. Іскристий ліхтар полагодь і запали. Інакше, якщо тут ліхтар, — запали його лише тоді, коли він ще не світить.',
    day: 'Пройди 7 кроків. Іскристий ліхтар лише полагодь. Інакше, якщо тут ліхтар, — вимкни його лише тоді, коли він світить.',
    descriptionEn: 'Some lamps are already on, some are sparking, and some are simply off. A nested condition helps you avoid touching what you should not.',
    nightEn: 'Walk 7 steps. Repair a sparking lamp and light it. Otherwise, if there is a lamp here — light it only when it is not shining yet.',
    dayEn: 'Walk 7 steps. Only repair a sparking lamp. Otherwise, if there is a lamp here — turn it off only when it is shining.',
    allowed: ['forward', 'light', 'fix', 'loop', 'if'],
    elif: true, else: false,
    sensors: ['lampShorts', 'onLamp', 'lampLit'],
    limit: 7, kits: 2,
    hints: [{
      text: 'Всередину гілки «інакше якщо Тут є ліхтар» вклади ще одну умову: «НЕ Світло тут світить» → «Запалити ліхтар».',
      textEn: 'Inside the "else if There is a lamp" branch put one more condition: "NOT Light is on here" → "Light the lamp".',
      target: 'command:if'
    }],
    solution: [loop(7, F(), fixOrLightLit())],
    daySolution: [loop(7, F(), fixOrLightLitDay())]
  });
}

// 06 ------------------------------------------------------------------
{
  const s = snake({
    w: 6, d: 6, start: [0, 5, 0], segs: [[null, 3], ['R', 3], ['L', 2]], items: '.L..L..L'
  });
  levels4.push({
    ...base, ...s,
    id: 'rozvylka-v-lisi',
    name: 'Розвилка в лісі',
    nameEn: 'Fork in the Forest',
    difficulty: 3,
    description: 'Лісова стежка то повертає праворуч, то ліворуч, а вздовж неї стоять ліхтарі. Обери правильний поворот і не забудь про світло.',
    night: 'Пройди 8 кроків стежкою. Перед деревом спробуй повернути праворуч, а якщо там теж перешкода — розверни робота ліворуч. Запали всі ліхтарі.',
    day: 'Пройди 8 кроків стежкою. Перед деревом спробуй повернути праворуч, а якщо там теж перешкода — розверни робота ліворуч. Вимкни всі ліхтарі.',
    descriptionEn: 'The forest path bends right and then left, and lamps stand along it. Choose the right turn and do not forget the light.',
    nightEn: 'Walk the path for 8 steps. Before a tree try turning right, and if there is an obstacle there too — turn the robot left. Light all the lamps.',
    dayEn: 'Walk the path for 8 steps. Before a tree try turning right, and if there is an obstacle there too — turn the robot left. Turn off all the lamps.',
    allowed: ['forward', 'left', 'right', 'light', 'loop', 'if'],
    elif: false, else: false,
    sensors: ['obstacleAhead', 'onLamp'],
    limit: 9,
    hints: [{
      text: 'Схема кроку: «Якщо перешкода → Вправо, а якщо знову перешкода → Вліво, Вліво», потім «Вперед» і «Якщо є ліхтар → Запалити».',
      textEn: 'Step scheme: "If obstacle → Right, and if obstacle again → Left, Left", then "Forward" and "If there is a lamp → Light".',
      target: 'program'
    }],
    solution: [loop(8, turn(), F(), iff('onLamp', [Li()]))]
  });
}
