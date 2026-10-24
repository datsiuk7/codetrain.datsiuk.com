// Section 6 "Функції" (category id: cat-mucmg9nd) — 20 levels.
import { F, L, R, J, Li, Tk, Fx, loop, wh, iff, snake, fn, call, deriveMap } from './lib6.mjs';

const base = { category: 'cat-mucmg9nd' };
const noObstacle = '!obstacleAhead';
const itemsAt = (n, lampSteps) =>
  Array.from({ length: n }, (_, i) => (lampSteps.includes(i + 1) ? 'L' : '.')).join('');
const fullChain = () => iff('lampShorts', [Fx(), Li()], { elif: [['onLamp', [Li()]]], else: [Tk()] });
const fullChainDay = () =>
  iff('lampShorts', [Fx()], { elif: [['onLamp', [iff('lampLit', [Li()])]]], else: [Tk()] });
const chainLit = () =>
  iff('lampShorts', [Fx(), Li()], { elif: [['onLamp', [iff('!lampLit', [Li()])]]] });
const chainLitDay = () =>
  iff('lampShorts', [Fx()], { elif: [['onLamp', [iff('lampLit', [Li()])]]] });
const withBody = (f, ...body) => ({ ...f, body });

const hintCall = {
  text: 'Відкрий у палітрі розділ «Функції», додай функцію, склади її з команд і викликай блоком «Функція». Тіло функції рахується в ліміт один раз, а кожен виклик — як один блок.',
  textEn: 'Open the "Functions" section of the palette, add a function, build it from commands and call it with the "Function" block. The body of a function counts towards the limit once, and each call counts as one block.',
  target: 'command:call'
};

export const levels6 = [];

function add(d) {
  levels6.push({ ...base, ...d });
}

// 01 ------------------------------------------------------------------
{
  const A = fn('Кут', F(), F(), Li(), R());
  const program = [call(A), call(A), call(A), call(A)];
  const m = deriveMap({ program, functions: [A], startDir: 0 });
  add({
    ...m, id: 'persha-funktsiya', name: 'Перша функція', nameEn: 'First Function', difficulty: 1,
    description: 'Функція — це власний блок із кількох команд, який можна викликати скільки завгодно разів. Створи функцію для одного кута й викликай її замість того, щоб повторювати команди вручну.',
    night: 'Створи функцію: два кроки вперед, запалити ліхтар, повернути праворуч. Виклич її 4 рази — і всі кути квадрата засяють.',
    day: 'Створи функцію: два кроки вперед, вимкнути ліхтар, повернути праворуч. Виклич її 4 рази — і всі кути квадрата згаснуть.',
    descriptionEn: 'A function is your own block of several commands that you can call as many times as you like. Create a function for one corner and call it instead of repeating commands by hand.',
    nightEn: 'Create a function: two steps forward, light the lamp, turn right. Call it 4 times — and all the corners of the square will shine.',
    dayEn: 'Create a function: two steps forward, turn off the lamp, turn right. Call it 4 times — and all the corners of the square will go dark.',
    allowed: ['forward', 'right', 'light', 'call'], elif: false, else: false, sensors: undefined,
    limit: 8, hints: [hintCall], solution: program, functions: [A]
  });
}

// 02 ------------------------------------------------------------------
{
  const S = fn('Сходинка', F(), R(), F(), L(), Li());
  const program = [call(S), call(S), call(S), call(S)];
  const m = deriveMap({ program, functions: [S], startDir: 0 });
  add({
    ...m, id: 'diahonalna-dorizhka', name: 'Діагональна доріжка', nameEn: 'Diagonal Path', difficulty: 1,
    description: 'Доріжка йде сходинками по діагоналі, і кожна сходинка однакова. Опиши одну сходинку функцією й викликай її по черзі.',
    night: 'Функція «Сходинка»: вперед, праворуч, вперед, ліворуч, запалити ліхтар. Виклич її 4 рази.',
    day: 'Функція «Сходинка»: вперед, праворуч, вперед, ліворуч, вимкнути ліхтар. Виклич її 4 рази.',
    descriptionEn: 'The path climbs diagonally in steps, and every step is the same. Describe one step with a function and call it in turn.',
    nightEn: 'Function "Step": forward, right, forward, left, light the lamp. Call it 4 times.',
    dayEn: 'Function "Step": forward, right, forward, left, turn off the lamp. Call it 4 times.',
    allowed: ['forward', 'left', 'right', 'light', 'call'], elif: false, else: false,
    limit: 9, hints: [hintCall], solution: program, functions: [S]
  });
}

// 03 ------------------------------------------------------------------
{
  const A = fn('Два вперед', F(), F(), Li());
  const B = fn('Убік', R(), F(), F(), L());
  const program = [call(A), call(B), call(A), call(B), call(A), call(B)];
  const m = deriveMap({ program, functions: [A, B], startDir: 0 });
  add({
    ...m, id: 'skhody-z-lamp', name: 'Сходи з ламп', nameEn: 'Staircase of Lamps', difficulty: 2,
    description: 'Ліхтарі стоять сходами: два кроки вперед, два вбік і знову. Дві прості функції, що чергуються, зроблять програму короткою.',
    night: 'Зроби дві функції: «Два вперед» (два кроки й ліхтар) та «Убік» (праворуч, два кроки, ліворуч). Чергуй їх тричі.',
    day: 'Зроби дві функції: «Два вперед» (два кроки й вимкнути ліхтар) та «Убік» (праворуч, два кроки, ліворуч). Чергуй їх тричі.',
    descriptionEn: 'The lamps stand like stairs: two steps forward, two aside, and again. Two simple alternating functions make the program short.',
    nightEn: 'Make two functions: "Two forward" (two steps and a lamp) and "Aside" (right, two steps, left). Alternate them three times.',
    dayEn: 'Make two functions: "Two forward" (two steps and turn off the lamp) and "Aside" (right, two steps, left). Alternate them three times.',
    allowed: ['forward', 'left', 'right', 'light', 'call'], elif: false, else: false,
    limit: 13, hints: [hintCall], solution: program, functions: [A, B]
  });
}

// 04 ------------------------------------------------------------------
{
  const Hop = fn('Два стрибки', J(), J(), Li());
  const program = [call(Hop), call(Hop), R(), call(Hop), call(Hop)];
  const m = deriveMap({ program, functions: [Hop], jumps: [1, 1, 1, 1, -1, -1, -1, -1] });
  add({
    ...m, id: 'skhody-vhoru-i-vnyz', name: 'Сходи вгору й униз', nameEn: 'Stairs Up and Down', difficulty: 2,
    description: 'Стрибок долає сходинку і вгору, і вниз, тож одна функція підійде для підйому та спуску.',
    night: 'Функція «Два стрибки» — два стрибки й ліхтар. Виклич її двічі на підйомі, поверни праворуч і ще двічі — на спуску.',
    day: 'Функція «Два стрибки» — два стрибки й вимкнути ліхтар. Виклич її двічі на підйомі, поверни праворуч і ще двічі — на спуску.',
    descriptionEn: 'A jump overcomes a step both up and down, so one function suits both the climb and the descent.',
    nightEn: 'Function "Two jumps" — two jumps and a lamp. Call it twice on the way up, turn right and twice more on the way down.',
    dayEn: 'Function "Two jumps" — two jumps and turn off the lamp. Call it twice on the way up, turn right and twice more on the way down.',
    allowed: ['jump', 'right', 'light', 'call'], elif: false, else: false,
    limit: 8, hints: [hintCall], solution: program, functions: [Hop]
  });
}

// 05 ------------------------------------------------------------------
{
  const A = fn('Ряд', F(), F(), Li());
  const T = fn('Розворот праворуч', R(), F(), R());
  const V = fn('Розворот ліворуч', L(), F(), L());
  const program = [call(A), call(T), call(A), call(V), call(A), call(T), call(A)];
  const m = deriveMap({ program, functions: [A, T, V], startDir: 0 });
  add({
    ...m, id: 'hazon-zmiyka', name: 'Газон-змійка', nameEn: 'Snake Lawn', difficulty: 2,
    description: 'Газон косять змійкою: ряд, розворот, ряд. Ряд і обидва розвороти — окремі функції, яких вистачить на весь газон.',
    night: 'Функції: «Ряд» (два кроки й ліхтар), «Розворот праворуч» і «Розворот ліворуч» (поворот, крок, поворот). Пройди чотири ряди.',
    day: 'Функції: «Ряд» (два кроки й вимкнути ліхтар), «Розворот праворуч» і «Розворот ліворуч» (поворот, крок, поворот). Пройди чотири ряди.',
    descriptionEn: 'The lawn is mowed in a snake pattern: a row, a turn, a row. The row and both turns are separate functions that are enough for the whole lawn.',
    nightEn: 'Functions: "Row" (two steps and a lamp), "Turn right" and "Turn left" (turn, step, turn). Walk four rows.',
    dayEn: 'Functions: "Row" (two steps and turn off the lamp), "Turn right" and "Turn left" (turn, step, turn). Walk four rows.',
    allowed: ['forward', 'left', 'right', 'light', 'call'], elif: false, else: false,
    limit: 16, hints: [hintCall], solution: program, functions: [A, T, V]
  });
}

// 06 ------------------------------------------------------------------
{
  const P = fn('Дві плитки', F(), F(), Li());
  const Q = fn('Крок праворуч', R(), F(), L());
  const W = fn('Крок ліворуч', L(), F(), R());
  const program = [call(P), call(Q), call(P), call(Q), call(P), call(W), call(P)];
  const m = deriveMap({ program, functions: [P, Q, W], startDir: 0 });
  add({
    ...m, id: 'pletinnya', name: 'Плетіння', nameEn: 'Weaving', difficulty: 3,
    description: 'Маршрут плететься хвилею: вперед, крок убік, знову вперед. Функції можна комбінувати в будь-якому порядку.',
    night: 'Функції: «Дві плитки» (два кроки й ліхтар), «Крок праворуч» і «Крок ліворуч» (поворот, крок, повернення). Двічі зсунься праворуч, а тоді один раз ліворуч.',
    day: 'Функції: «Дві плитки» (два кроки й вимкнути ліхтар), «Крок праворуч» і «Крок ліворуч». Двічі зсунься праворуч, а тоді один раз ліворуч.',
    descriptionEn: 'The route weaves like a wave: forward, a step aside, forward again. Functions can be combined in any order.',
    nightEn: 'Functions: "Two tiles" (two steps and a lamp), "Step right" and "Step left" (turn, step, turn back). Shift right twice, then left once.',
    dayEn: 'Functions: "Two tiles" (two steps and turn off the lamp), "Step right" and "Step left". Shift right twice, then left once.',
    allowed: ['forward', 'left', 'right', 'light', 'call'], elif: false, else: false,
    limit: 16, hints: [hintCall], solution: program, functions: [P, Q, W]
  });
}

// 07 ------------------------------------------------------------------
{
  const Row = fn('Ряд ламп', loop(3, F(), Li()));
  const T = fn('Розворот праворуч', R(), F(), R());
  const V = fn('Розворот ліворуч', L(), F(), L());
  const program = [call(Row), call(T), call(Row), call(V), call(Row), call(T), call(Row)];
  const m = deriveMap({ program, functions: [Row, T, V], startDir: 0 });
  add({
    ...m, id: 'riad-lamp-u-tsykli', name: 'Ряд ламп у циклі', nameEn: 'A Row of Lamps in a Loop', difficulty: 3,
    description: 'Функція може містити цикл. Опиши одним блоком цілий ряд ламп, а розвороти зроби окремими функціями.',
    night: 'Функція «Ряд ламп»: цикл із трьох повторень «вперед, запалити». Додай два розвороти й пройди чотири ряди.',
    day: 'Функція «Ряд ламп»: цикл із трьох повторень «вперед, вимкнути». Додай два розвороти й пройди чотири ряди.',
    descriptionEn: 'A function may contain a loop. Describe a whole row of lamps with one block and make the turns separate functions.',
    nightEn: 'Function "Row of lamps": a loop of three repetitions of "forward, light". Add two turns and walk four rows.',
    dayEn: 'Function "Row of lamps": a loop of three repetitions of "forward, turn off". Add two turns and walk four rows.',
    allowed: ['forward', 'left', 'right', 'light', 'loop', 'call'], elif: false, else: false,
    limit: 16, hints: [hintCall], solution: program, functions: [Row, T, V]
  });
}

// 08 ------------------------------------------------------------------
{
  const Ring = fn('Квартал', loop(4, F(), F(), Li(), R()));
  const Shift = fn('До наступного', R(), loop(3, F()), L());
  const program = [call(Ring), call(Shift), call(Ring), call(Shift), call(Ring)];
  const m = deriveMap({ program, functions: [Ring, Shift], startDir: 0, margin: 1 });
  add({
    ...m, id: 'try-kvartaly', name: 'Три квартали', nameEn: 'Three Blocks', difficulty: 3,
    description: 'Три однакові квартали стоять поруч. Обхід кварталу — одна функція, перехід до наступного — друга.',
    night: 'Функція «Квартал» — цикл із чотирьох сторін («два кроки, запалити, праворуч»). Функція «До наступного» — праворуч, три кроки, ліворуч. Обійди всі три квартали.',
    day: 'Функція «Квартал» — цикл із чотирьох сторін («два кроки, вимкнути, праворуч»). Функція «До наступного» — праворуч, три кроки, ліворуч. Обійди всі три квартали.',
    descriptionEn: 'Three identical blocks stand side by side. Walking around a block is one function, moving to the next is another.',
    nightEn: 'Function "Block" is a loop of four sides ("two steps, light, right"). Function "To the next" is right, three steps, left. Walk around all three blocks.',
    dayEn: 'Function "Block" is a loop of four sides ("two steps, turn off, right"). Function "To the next" is right, three steps, left. Walk around all three blocks.',
    allowed: ['forward', 'left', 'right', 'light', 'loop', 'call'], elif: false, else: false,
    limit: 14, hints: [hintCall], solution: program, functions: [Ring, Shift]
  });
}

// 09 ------------------------------------------------------------------
{
  const Corner = fn('Кут', F(), F(), Li(), R());
  const Square = fn('Квадрат', call(Corner), call(Corner), call(Corner), call(Corner));
  const Shift = fn('Перейти', R(), F(), F(), F(), L());
  const program = [call(Square), call(Shift), call(Square), call(Shift), call(Square)];
  const m = deriveMap({ program, functions: [Corner, Square, Shift], startDir: 0 });
  add({
    ...m, id: 'funktsiya-u-funktsiyi', name: 'Функція у функції', nameEn: 'A Function inside a Function', difficulty: 3,
    description: 'Функція може викликати іншу функцію. Збери «Квадрат» із чотирьох викликів «Кута», а потім використай його тричі.',
    night: 'Функція «Кут»: два кроки, запалити, праворуч. Функція «Квадрат» викликає «Кут» 4 рази. «Перейти» — праворуч, три кроки, ліворуч. Обійди три квадрати.',
    day: 'Функція «Кут»: два кроки, вимкнути, праворуч. Функція «Квадрат» викликає «Кут» 4 рази. «Перейти» — праворуч, три кроки, ліворуч. Обійди три квадрати.',
    descriptionEn: 'A function can call another function. Build a "Square" from four calls of "Corner" and then use it three times.',
    nightEn: 'Function "Corner": two steps, light, right. Function "Square" calls "Corner" 4 times. "Move on" is right, three steps, left. Walk around three squares.',
    dayEn: 'Function "Corner": two steps, turn off, right. Function "Square" calls "Corner" 4 times. "Move on" is right, three steps, left. Walk around three squares.',
    allowed: ['forward', 'left', 'right', 'light', 'call'], elif: false, else: false,
    limit: 18, hints: [{
      text: 'Функція не може викликати саму себе, але може викликати іншу функцію. Спершу зроби «Кут», потім «Квадрат».',
      textEn: 'A function cannot call itself, but it can call another function. First make "Corner", then "Square".',
      target: 'command:call'
    }], solution: program, functions: [Corner, Square, Shift]
  });
}

// 10 ------------------------------------------------------------------
{
  const Hop2 = fn('Два стрибки', J(), J());
  const Peak = fn('Вершина', call(Hop2), Li(), call(Hop2), Li());
  const program = [call(Peak), R(), call(Peak), R(), call(Peak)];
  const jumps = [1, 1, -1, -1, 1, 1, -1, -1, 1, 1, -1, -1];
  const m = deriveMap({ program, functions: [Hop2, Peak], jumps });
  add({
    ...m, id: 'try-vershyny', name: 'Три вершини', nameEn: 'Three Peaks', difficulty: 3,
    description: 'Кожна вершина — підйом на два рівні й спуск на два. Підйом і спуск — це одні й ті самі два стрибки.',
    night: 'Функція «Два стрибки»: стрибок, стрибок. Функція «Вершина»: два стрибки, ліхтар, два стрибки, ліхтар. Здолай три вершини, повертаючи праворуч між ними.',
    day: 'Функція «Два стрибки»: стрибок, стрибок. Функція «Вершина»: два стрибки, вимкнути, два стрибки, вимкнути. Здолай три вершини, повертаючи праворуч між ними.',
    descriptionEn: 'Each peak is a climb of two levels and a descent of two. The climb and the descent are the very same two jumps.',
    nightEn: 'Function "Two jumps": jump, jump. Function "Peak": two jumps, lamp, two jumps, lamp. Conquer three peaks, turning right between them.',
    dayEn: 'Function "Two jumps": jump, jump. Function "Peak": two jumps, turn off, two jumps, turn off. Conquer three peaks, turning right between them.',
    allowed: ['jump', 'right', 'light', 'call'], elif: false, else: false,
    limit: 11, hints: [hintCall], solution: program, functions: [Hop2, Peak]
  });
}

// 11 ------------------------------------------------------------------
{
  const Climb = fn('Три сходинки', loop(3, J(), Li()));
  const program = [call(Climb), R(), call(Climb), L(), call(Climb), R(), call(Climb)];
  const jumps = [1, 1, 1, -1, -1, -1, 1, 1, 1, -1, -1, -1];
  const m = deriveMap({ program, functions: [Climb], jumps });
  add({
    ...m, id: 'girskyy-khrebet', name: 'Гірський хребет', nameEn: 'Mountain Ridge', difficulty: 3,
    description: 'Хребет складається з однакових прольотів: то вгору, то вниз. Проліт — це цикл усередині функції.',
    night: 'Функція «Три сходинки»: цикл із трьох повторень «стрибок, запалити». Виклич її чотири рази, між викликами повертаючи праворуч, ліворуч і знову праворуч.',
    day: 'Функція «Три сходинки»: цикл із трьох повторень «стрибок, вимкнути». Виклич її чотири рази, між викликами повертаючи праворуч, ліворуч і знову праворуч.',
    descriptionEn: 'The ridge consists of identical flights: now up, now down. A flight is a loop inside a function.',
    nightEn: 'Function "Three steps": a loop of three repetitions of "jump, light". Call it four times, turning right, left and right again between the calls.',
    dayEn: 'Function "Three steps": a loop of three repetitions of "jump, turn off". Call it four times, turning right, left and right again between the calls.',
    allowed: ['jump', 'left', 'right', 'light', 'loop', 'call'], elif: false, else: false,
    limit: 10, hints: [hintCall], solution: program, functions: [Climb]
  });
}

// 12 ------------------------------------------------------------------
{
  const Step = fn('Крок із лампою', J(), Li());
  const Flight = fn('Проліт', call(Step), call(Step), call(Step));
  const program = [call(Flight), R(), call(Flight), R(), call(Flight)];
  const jumps = [1, 1, 1, 1, 1, -1, -1, -1, -1];
  const m = deriveMap({ program, functions: [Step, Flight], jumps });
  add({
    ...m, id: 'try-prolity', name: 'Три прольоти', nameEn: 'Three Flights', difficulty: 4,
    description: 'Три прольоти сходів: перший піднімається, другий ще вище, а третій спускається. Крок із лампою — найменша цеглинка, з неї складається проліт.',
    night: 'Функція «Крок із лампою»: стрибок і ліхтар. Функція «Проліт» викликає її тричі. Виклич «Проліт» тричі, повертаючи праворуч між ними.',
    day: 'Функція «Крок із лампою»: стрибок і вимкнути. Функція «Проліт» викликає її тричі. Виклич «Проліт» тричі, повертаючи праворуч між ними.',
    descriptionEn: 'Three flights of stairs: the first goes up, the second higher still, and the third goes down. A step with a lamp is the smallest brick a flight is built from.',
    nightEn: 'Function "Step with a lamp": a jump and a lamp. Function "Flight" calls it three times. Call "Flight" three times, turning right between them.',
    dayEn: 'Function "Step with a lamp": a jump and turn off. Function "Flight" calls it three times. Call "Flight" three times, turning right between them.',
    allowed: ['jump', 'right', 'light', 'call'], elif: false, else: false,
    limit: 10, hints: [hintCall], solution: program, functions: [Step, Flight]
  });
}

// 13 ------------------------------------------------------------------
{
  const Seg = fn('Взяти й полагодити', F(), Tk(), F(), Fx(), Li());
  const Block = fn('Сторона', call(Seg), R());
  const program = [call(Block), call(Block), call(Block), call(Block)];
  const m = deriveMap({ program, functions: [Seg, Block], startDir: 0 });
  const SegDay = withBody(Seg, F(), Tk(), F(), Fx());
  add({
    ...m, id: 'remontnyy-kvartal', name: 'Ремонтний квартал', nameEn: 'Repair Block', difficulty: 4,
    description: 'На кожній стороні кварталу лежить ремкомплект, а за ним коротить ліхтар. Одна сторона — функція, яка викликає іншу функцію.',
    night: 'Функція «Взяти й полагодити»: вперед, взяти, вперед, полагодити, запалити. Функція «Сторона» викликає її й повертає праворуч. Виклич «Сторону» 4 рази.',
    day: 'Функція «Взяти й полагодити»: вперед, взяти, вперед, полагодити. Функція «Сторона» викликає її й повертає праворуч. Виклич «Сторону» 4 рази.',
    descriptionEn: 'On every side of the block there is a repair kit and behind it a sparking lamp. One side is a function that calls another function.',
    nightEn: 'Function "Take and repair": forward, take, forward, repair, light. Function "Side" calls it and turns right. Call "Side" 4 times.',
    dayEn: 'Function "Take and repair": forward, take, forward, repair. Function "Side" calls it and turns right. Call "Side" 4 times.',
    allowed: ['forward', 'right', 'light', 'take', 'fix', 'call'], elif: false, else: false,
    limit: 11, kits: 0, hints: [hintCall], solution: program, functions: [Seg, Block],
    dayFunctions: [SegDay, Block]
  });
}

// 14 ------------------------------------------------------------------
{
  const T = fn('Збір', F(), Tk());
  const X = fn('Ремонт', F(), Fx(), Li());
  const program = [call(T), call(T), call(X), call(X), R(), call(T), call(X)];
  const m = deriveMap({ program, functions: [T, X], startDir: 0 });
  const XDay = withBody(X, F(), Fx());
  add({
    ...m, id: 'remontna-brygada-funktsiy', name: 'Ремонтна бригада функцій', nameEn: 'Repair Crew of Functions', difficulty: 4,
    description: 'Спершу треба назбирати ремкомплектів, а потім полагодити стільки ж ліхтарів. Збір і ремонт — дві окремі функції.',
    night: 'Функція «Збір»: крок і взяти. Функція «Ремонт»: крок, полагодити, запалити. Збери два комплекти, полагодь два ліхтарі, поверни праворуч, збери ще один і полагодь ще один.',
    day: 'Функція «Збір»: крок і взяти. Функція «Ремонт»: крок і полагодити. Збери два комплекти, полагодь два ліхтарі, поверни праворуч, збери ще один і полагодь ще один.',
    descriptionEn: 'First you must gather repair kits, and then repair the same number of lamps. Gathering and repairing are two separate functions.',
    nightEn: 'Function "Gather": a step and take. Function "Repair": a step, repair, light. Gather two kits, repair two lamps, turn right, gather one more and repair one more.',
    dayEn: 'Function "Gather": a step and take. Function "Repair": a step and repair. Gather two kits, repair two lamps, turn right, gather one more and repair one more.',
    allowed: ['forward', 'right', 'light', 'take', 'fix', 'call'], elif: false, else: false,
    limit: 12, kits: 0, hints: [hintCall], solution: program, functions: [T, X],
    dayFunctions: [T, XDay]
  });
}

// 15 ------------------------------------------------------------------
{
  const s = snake({
    w: 5, d: 5, start: [0, 4, 0], segs: [[null, 4], ['R', 4], ['R', 4], ['R', 3]], items: '.L.L.L.L.L.L.L.'
  });
  const Walk = fn('До кінця', wh(noObstacle, F(), iff('onLamp', [Li()])));
  const program = [call(Walk), R(), call(Walk), R(), call(Walk), R(), call(Walk)];
  add({
    ...s, id: 'kvadrat-bez-tsyklu', name: 'Квадрат без циклу', nameEn: 'Square without a Loop', difficulty: 4,
    description: 'Функція може містити цикл «Поки» з умовою. Опиши в ній проходження однієї сторони скверу й викликай на кожній стороні.',
    night: 'Функція «До кінця»: поки попереду немає перешкоди — крок вперед, а якщо тут ліхтар — запалити. Виклич її на кожній стороні скверу, повертаючи праворуч між викликами.',
    day: 'Функція «До кінця»: поки попереду немає перешкоди — крок вперед, а якщо тут ліхтар — вимкнути. Виклич її на кожній стороні скверу, повертаючи праворуч між викликами.',
    descriptionEn: 'A function may contain a "While" loop with a condition. Describe in it how to walk one side of the square and call it on every side.',
    nightEn: 'Function "To the end": while there is no obstacle ahead — step forward, and if there is a lamp here — light it. Call it on every side of the square, turning right between the calls.',
    dayEn: 'Function "To the end": while there is no obstacle ahead — step forward, and if there is a lamp here — turn it off. Call it on every side of the square, turning right between the calls.',
    allowed: ['forward', 'right', 'light', 'if', 'while', 'call'], elif: false, else: false,
    sensors: ['obstacleAhead', 'onLamp'],
    limit: 11, hints: [hintCall], solution: program, functions: [Walk]
  });
}

// 16 ------------------------------------------------------------------
{
  const s = snake({
    w: 8, d: 6, start: [0, 5, 1],
    segs: [[null, 6], ['L', 2], ['L', 5], ['R', 2], ['R', 5]],
    items: itemsAt(20, [3, 6, 8, 11, 14, 17, 20])
  });
  const Seg = fn('Пряма ділянка', wh(noObstacle, F(), iff('onLamp', [Li()])));
  const Turn = fn('Поворот', R(), iff('obstacleAhead', [L(), L()]));
  const program = [call(Seg), call(Turn), call(Seg), call(Turn), call(Seg), call(Turn), call(Seg), call(Turn), call(Seg)];
  add({
    ...s, id: 'zmiyka-z-funktsiy', name: 'Змійка з функцій', nameEn: 'Snake Made of Functions', difficulty: 4,
    description: 'Змійка повертає то праворуч, то ліворуч, а прямі ділянки різної довжини. Пряма ділянка та поворот з перевіркою — дві функції.',
    night: 'Функція «Пряма ділянка» веде до перешкоди й запалює ліхтарі. Функція «Поворот»: праворуч, а якщо попереду перешкода — розверни робота ліворуч. Пройди 5 ділянок.',
    day: 'Функція «Пряма ділянка» веде до перешкоди й вимикає ліхтарі. Функція «Поворот»: праворуч, а якщо попереду перешкода — розверни робота ліворуч. Пройди 5 ділянок.',
    descriptionEn: 'The snake bends right and left, and its straight sections have different lengths. A straight section and a turn with a check are two functions.',
    nightEn: 'Function "Straight section" leads to an obstacle and lights the lamps. Function "Turn": right, and if there is an obstacle ahead — turn the robot left. Walk 5 sections.',
    dayEn: 'Function "Straight section" leads to an obstacle and turns off the lamps. Function "Turn": right, and if there is an obstacle ahead — turn the robot left. Walk 5 sections.',
    allowed: ['forward', 'left', 'right', 'light', 'if', 'while', 'call'], elif: false, else: false,
    sensors: ['obstacleAhead', 'onLamp'],
    limit: 17, hints: [hintCall], solution: program, functions: [Seg, Turn]
  });
}

// 17 ------------------------------------------------------------------
{
  const s = snake({ w: 3, d: 10, start: [1, 9, 0], segs: [[null, 9]], items: 'KKSKKKSKS' });
  const Service = fn('Обслуговування', wh('!onLamp', F(), iff('!onLamp', [Tk()])), Fx(), Li(), F());
  const ServiceDay = withBody(Service, wh('!onLamp', F(), iff('!onLamp', [Tk()])), Fx(), F());
  const program = [call(Service), call(Service), call(Service)];
  add({
    ...s, id: 'remontni-posylky', name: 'Ремонтні посилки', nameEn: 'Repair Parcels', difficulty: 5,
    description: 'Перед кожним іскристим ліхтарем лежить різна кількість ремкомплектів. Скільки саме — невідомо, тож функція має збирати їх, доки не дійде до ліхтаря.',
    night: 'Функція «Обслуговування»: поки не дійшов до ліхтаря — іди вперед і бери ремкомплекти, потім полагодь, запали й зроби крок уперед. Виклич її для кожного з трьох ліхтарів.',
    day: 'Функція «Обслуговування»: поки не дійшов до ліхтаря — іди вперед і бери ремкомплекти, потім полагодь і зроби крок уперед. Виклич її для кожного з трьох ліхтарів.',
    descriptionEn: 'Before every sparking lamp lies a different number of repair kits. How many exactly is unknown, so the function must collect them until it reaches the lamp.',
    nightEn: 'Function "Service": while you have not reached a lamp — walk forward and take repair kits, then repair, light and step forward. Call it for each of the three lamps.',
    dayEn: 'Function "Service": while you have not reached a lamp — walk forward and take repair kits, then repair and step forward. Call it for each of the three lamps.',
    allowed: ['forward', 'light', 'take', 'fix', 'if', 'while', 'call'], elif: false, else: false,
    sensors: ['onLamp'],
    limit: 10, kits: 0, hints: [hintCall], solution: program, functions: [Service],
    dayFunctions: [ServiceDay]
  });
}

// 18 ------------------------------------------------------------------
{
  const s = snake({
    w: 8, d: 6, start: [1, 4, 0], segs: [[null, 3], ['R', 5], ['R', 3], ['R', 4]],
    items: 'LS.lL.SlL.lLL.L', block: '_', fill: '_', decor: [[0, 0, 'T'], [7, 5, 'B'], [4, 2, 'R']]
  });
  const Side = fn('Сторона мосту', wh('canJump', J(), chainLit()));
  const SideDay = withBody(Side, wh('canJump', J(), chainLitDay()));
  const program = [call(Side), R(), call(Side), R(), call(Side), R(), call(Side)];
  add({
    ...s, id: 'ozero-z-funktsiyamy', name: 'Озеро з функціями', nameEn: 'Lake with Functions', difficulty: 5,
    description: 'Місток обходить озеро. Ліхтарі на ньому різні: світні, згаслі та іскристі. Вся робота на одній стороні вміщується у функцію.',
    night: 'Функція «Сторона мосту»: поки можна стрибнути — стрибай, лагодь іскристі ліхтарі й запалюй згаслі, а ті, що світяться, не чіпай. Виклич її на кожній стороні, повертаючи праворуч.',
    day: 'Функція «Сторона мосту»: поки можна стрибнути — стрибай, іскристі ліхтарі лише лагодь, а ті, що світяться, вимикай. Виклич її на кожній стороні, повертаючи праворуч.',
    descriptionEn: 'The bridge goes around the lake. Its lamps vary: shining, dark and sparking. All the work on one side fits in a function.',
    nightEn: 'Function "Bridge side": while you can jump — jump, repair sparking lamps and light dark ones, leave the shining ones. Call it on every side, turning right.',
    dayEn: 'Function "Bridge side": while you can jump — jump, only repair sparking lamps and turn off the shining ones. Call it on every side, turning right.',
    allowed: ['jump', 'right', 'light', 'fix', 'if', 'while', 'call'], elif: true, else: false,
    sensors: ['canJump', 'lampShorts', 'onLamp', 'lampLit'],
    limit: 14, kits: 2, hints: [hintCall], solution: program, functions: [Side],
    dayFunctions: [SideDay]
  });
}

// 19 ------------------------------------------------------------------
{
  const s = snake({
    w: 6, d: 4, start: [0, 3, 0], segs: [[null, 3], ['R', 5], ['R', 3], ['R', 4]],
    items: 'KSLUOKSLUKOSLLL',
    decor: [[1, 1, 'T'], [2, 1, 'B'], [3, 1, 'T'], [4, 1, 'B'], [1, 2, 'B'], [2, 2, 'T'], [3, 2, 'B'], [4, 2, 'T']]
  });
  const Side = fn('Сторона кварталу', wh(noObstacle, F(), fullChain()));
  const SideDay = withBody(Side, wh(noObstacle, F(), fullChainDay()));
  const program = [call(Side), R(), call(Side), R(), call(Side), R(), call(Side)];
  add({
    ...s, id: 'nichnyy-obkhid-funktsii', name: 'Нічний обхід за функціями', nameEn: 'Night Round with Functions', difficulty: 5,
    description: 'Квартал по периметру: іскристі ліхтарі, ліхтарі без лампочок і речі на землі. Одна сторона — одна функція, а весь квартал — чотири її виклики.',
    night: 'Функція «Сторона кварталу»: поки немає перешкоди — крок і ланцюжок «якщо коротить — полагодь і запали; інакше якщо ліхтар — запали; інакше — взяти». Виклич її на кожній стороні.',
    day: 'Функція «Сторона кварталу»: поки немає перешкоди — крок і ланцюжок «якщо коротить — полагодь; інакше якщо ліхтар світить — вимкни; інакше — взяти». Виклич її на кожній стороні.',
    descriptionEn: 'A block along its perimeter: sparking lamps, lamps without bulbs and items on the ground. One side is one function, and the whole block is four calls of it.',
    nightEn: 'Function "Block side": while there is no obstacle — a step and the chain "if sparking — repair and light; else if lamp — light; else — take". Call it on every side.',
    dayEn: 'Function "Block side": while there is no obstacle — a step and the chain "if sparking — repair; else if lamp is shining — turn off; else — take". Call it on every side.',
    allowed: ['forward', 'right', 'light', 'take', 'fix', 'if', 'while', 'call'], elif: true, else: true,
    sensors: ['obstacleAhead', 'lampShorts', 'onLamp', 'lampLit'],
    limit: 14, kits: 0, hints: [hintCall], solution: program, functions: [Side],
    dayFunctions: [SideDay]
  });
}

// 20 ------------------------------------------------------------------
{
  const s = snake({
    w: 7, d: 7, start: [0, 6, 0],
    segs: [[null, 6], ['R', 6], ['R', 6], ['R', 4], ['R', 4], ['R', 2], ['R', 2], ['R', 1]],
    items: 'KLSUOL'.repeat(5) + 'L'
  });
  const Side = fn('Сторона спіралі', wh(noObstacle, F(), fullChain()));
  const SideDay = withBody(Side, wh(noObstacle, F(), fullChainDay()));
  const Lap = fn('Виток', call(Side), R(), call(Side), R());
  const program = [call(Lap), call(Lap), call(Lap), call(Lap)];
  add({
    ...s, id: 'spirala-z-funktsiy', name: 'Спіраль із функцій', nameEn: 'Spiral of Functions', difficulty: 5,
    description: 'Підсумок усієї теми: велика спіраль із 31 кроку. Сторона — функція, виток із двох сторін — функція, що викликає функцію, а вся спіраль — чотири витки.',
    night: 'Функція «Сторона спіралі» веде до перешкоди та працює з ліхтарями й речами. Функція «Виток» викликає її двічі, повертаючи праворуч після кожної сторони. Виклич «Виток» 4 рази.',
    day: 'Функція «Сторона спіралі» веде до перешкоди та працює з ліхтарями й речами (світні вимикай, іскристі лише лагодь). Функція «Виток» викликає її двічі, повертаючи праворуч після кожної сторони. Виклич «Виток» 4 рази.',
    descriptionEn: 'The summary of the whole topic: a big spiral of 31 steps. A side is a function, a turn of two sides is a function that calls a function, and the whole spiral is four turns.',
    nightEn: 'Function "Spiral side" walks to an obstacle and deals with lamps and items. Function "Turn" calls it twice, turning right after each side. Call "Turn" 4 times.',
    dayEn: 'Function "Spiral side" walks to an obstacle and deals with lamps and items (turn off shining ones, only repair sparking ones). Function "Turn" calls it twice, turning right after each side. Call "Turn" 4 times.',
    allowed: ['forward', 'right', 'light', 'take', 'fix', 'if', 'while', 'call'], elif: true, else: true,
    sensors: ['obstacleAhead', 'lampShorts', 'onLamp', 'lampLit'],
    limit: 15, kits: 0, hints: [hintCall], solution: program, functions: [Side, Lap],
    dayFunctions: [SideDay, Lap]
  });
}

