const STORAGE_KEY = 'lamplighter-lang';

let currentLang = 'uk';

try {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'uk') currentLang = saved;
  }
} catch {}

export function getLang() {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'uk') {
        currentLang = saved;
        return saved;
      }
    }
  } catch {}
  return currentLang;
}

export function setLang(lang) {
  const normalized = lang === 'en' ? 'en' : 'uk';
  currentLang = normalized;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, normalized);
    }
  } catch {}
  return normalized;
}

export const commandsEn = {
  forward: ['↑', 'Forward'],
  left: ['↶', 'Turn left'],
  right: ['↷', 'Turn right'],
  jump: ['↟', 'Jump'],
  light: ['✦', 'Light lantern'],
  take: ['📥', 'Take'],
  fix: ['🔧', 'Repair'],
  loop: ['⟳', 'Loop'],
  if: ['?', 'If · if'],
  while: ['↻', 'While · while'],
  call: ['ƒ', 'Function']
};

export const sensorsEn = {
  lampShorts: 'Lantern sparks',
  onLamp: 'At lantern or house',
  obstacleAhead: 'Obstacle ahead',
  lampLit: 'Light is on here',
  canJump: 'Can jump'
};

export const difficultyLabelsEn = {
  1: 'Very Easy',
  2: 'Easy',
  3: 'Medium',
  4: 'Hard',
  5: 'Very Hard'
};

export const categoryTitlesEn = {
  basics: '1. Movement Basics',
  loops: '2. Loops',
  conditions: '3. Conditions',
  functions: '4. Advanced Conditions',
  lists: '5. While Loop',
  'cat-mucmg9nd': '6. Functions',
  other: 'Other Streets'
};

const categoryTitleByUk = {
  '1. Основи руху': '1. Movement Basics',
  '2. Цикли': '2. Loops',
  '3. Умови': '3. Conditions',
  '4. Складні умови': '4. Advanced Conditions',
  '4. Функції': '4. Functions',
  '5. Цикл поки': '5. While Loop',
  '6. Функції': '6. Functions',
  'Інші вулиці': 'Other Streets',
  'Розділ': 'Section'
};

export const strings = {
  uk: {
    pageTitle: 'Ліхтарник — запали ніч',
    brandName: 'ліхтарник',
    headerNote: 'МАЛЕНЬКІ КРОКИ. ТЕПЛЕ СВІТЛО.',
    resetProgress: '↺ Скинути прогрес',
    resetProgressTitle: 'Скинути весь прогрес проходження гри',
    resetProgressConfirm: 'Скинути весь прогрес проходження гри та збережені програми?',
    themeDay: '☀️ Тема: День',
    themeNight: '🌙 Тема: Ніч',
    themeLabel: 'Тема оформлення',
    zoomGroupLabel: 'Масштаб усього сайту',
    zoomOutTitle: 'Зменшити масштаб сайту (−10%)',
    zoomInTitle: 'Збільшити масштаб сайту (+10%)',
    zoomValTitle: 'Клікніть, щоб скинути до 100%',
    zoomResetTitle: 'Скинути масштаб до 100%',
    soundOn: '🔊 Звуки: увімк.',
    soundOff: '🔊 Звуки: вимк.',
    musicOn: '♫ Музика: увімк.',
    musicOff: '♫ Музика: вимк.',
    musicUnavailable: 'Музика недоступна',
    fullscreenEnter: '⛶ Повний екран',
    fullscreenExit: '🗗 Згорнути',
    fullscreenEnterTitle: 'Увімкнути повний екран',
    fullscreenExitTitle: 'Вийти з повного екрана',
    footerDefaultNight: 'Ніч чекає на твою програму.',
    footerDefaultDay: 'Місто чекає на твою програму.',
    heroEyebrowNight: 'АЛГОРИТМИ ПІСЛЯ ЗАХОДУ СОНЦЯ',
    heroEyebrowDay: 'ЕНЕРГООЩАДНІ АЛГОРИТМИ ДНЯ',
    heroH1Night: 'Місто заснуло.<br>Твій хід — світити.',
    heroH1Day: 'Ясний день над містом.<br>Твій хід — вимкни зайве.',
    heroDescNight: 'Складай команди, долай сходинки й запалюй ліхтарі. Проходь навчальні теми від базового руху до циклів і розгалужень.',
    heroDescDay: 'Складай команди, знаходь непотрібні ліхтарі, що палають удень, та викручуй їх для збереження енергії.',
    sectionLocked: 'Розділ під замком',
    sectionLockedHint: 'Щоб розблокувати, пройдіть всі попередні рівні',
    unlockSectionLocal: '🔓 Відкрити розділ',
    unlockSectionLocalTitle: 'Позначити попередні рівні як пройдені та відкрити цей розділ',
    markAllSection: '✓ Позначити весь розділ',
    unmarkAllSection: '↺ Зняти позначки розділу',
    markAllSectionTitle: 'Позначити всі рівні цього розділу як пройдені',
    unmarkAllSectionTitle: 'Зняти позначки проходження з усіх рівнів цього розділу',
    completedBadge: 'Пройдено',
    sectionCompleted: 'Розділ пройдено',
    markBadge: 'Позначити',
    markLevelTitle: 'Позначити рівень як пройдений (локальний режим)',
    unmarkLevelTitle: 'Зняти позначку проходження (локальний режим)',
    cmdShort: 'ком.',
    limitLabel: 'Ліміт',
    difficultyPrefix: 'Складність',
    backToEditor: 'До редактора',
    allTopics: 'Всі теми',
    hintBtn: '? Підказка',
    hintBtnAria: 'Відкрити підказки',
    hintHeading: 'Підказка',
    hintClose: 'Закрити',
    hintNext: 'Далі',
    hintDone: 'Готово',
    worldEyebrowNight: 'ЗАПАЛИ КОЖЕН ЛІХТАР',
    worldEyebrowDay: 'ВИКРУТИ КОЖЕН ЛІХТАР',
    sceneAria: '3D-поле з ліхтарником, деревами та ліхтарями',
    resetViewTitle: 'Початкове положення',
    zoomOutScene: 'Зменшити масштаб',
    zoomInScene: 'Збільшити масштаб',
    speedTitle: 'Швидкість анімації',
    facingNote: 'Погляд персонажа = напрямок руху',
    runBtn: 'Запустити',
    runBtnAria: 'Запустити програму',
    resetProgramTitle: 'Скинути програму',
    compactBlocksTitle: 'Стиснути блоки (компактний режим)',
    normalBlocksTitle: 'Звичайний вигляд блоків',
    programAria: 'Програма',
    trashTitle: 'Очистити всі команди або перетягніть сюди блок',
    trashConfirmText: 'Очистити всі команди?',
    trashConfirmYes: 'Так, очистити',
    trashConfirmNo: 'Скасувати',
    availableCommands: 'Доступні команди',
    localMarkInGame: '○ Зарахувати рівень',
    localDoneInGame: '✓ Пройдено',
    localMarkInGameTitle: 'Позначити рівень як пройдений без проходження (локальний режим)',
    localDoneInGameTitle: 'Натисни, щоб зняти позначку проходження (локальний режим)',
    localMarkedStatus: 'Рівень позначено як пройдений (локальний режим).',
    localUnmarkedStatus: 'Позначку проходження знято.',
    nextStreet: 'Наступна вулиця →',
    toAllTopics: 'До всіх тем →',
    backToEditorArrow: '← Повернутися до редактора',
    returnHome: 'Повернутися на головну ↗',
    levelHiddenTitle: 'Цей рівень приховано',
    levelLockedTitle: 'Цей рівень під замком',
    unlockLocalLevelBtn: '🔓 Відкрити розділ (локально)',
    noWebGL: 'Для 3D потрібен WebGL. Увімкни апаратне прискорення браузера.',
    statusReset: 'На старті. Програму збережено — спробуй ще.',
    statusWonNight: 'Усі ліхтарі світяться. Гарна робота!',
    statusWonDay: 'Усі лампочки викручено! Місто зберегло енергію.',
    statusFell: 'Персонаж вийшов за межі та впав.',
    statusRetry: 'На старті. Спробуй ще раз.',
    statusShockReset: 'Персонаж повернувся на старт. Спершу полагодь іскристий ліхтар.',
    statusBackAtStart: 'Персонаж повернувся на старт.',
    statusIncompleteNight: 'Програма завершилася, але ще не всі ліхтарі світяться. Доповни її.',
    statusIncompleteDay: 'Програма завершилася, але ще не всі лампочки викручено. Доповни її.',
    statusTryAnother: 'На старті. Спробуй іншу програму.',
    blocksRemaining: 'Залишилося',
    blocksCount: 'Блоків',
    dropHere: 'Поклади',
    notBtn: 'НЕ',
    elifLabel: 'Інакше якщо',
    elseLabel: 'Інакше',
    removeBranch: 'Видалити',
    removeElse: 'Видалити else',
    chooseFunction: 'Обери функцію',
    callFunctionLabel: 'Виклик функції',
    functionsHeading: 'Функції',
    createBtn: '＋ Створити',
    functionDefaultName: 'Назва функції '
  },
  en: {
    pageTitle: 'Lamplighter — Light Up the Night',
    brandName: 'lamplighter',
    headerNote: 'SMALL STEPS. WARM LIGHT.',
    resetProgress: '↺ Reset Progress',
    resetProgressTitle: 'Reset all game progress',
    resetProgressConfirm: 'Reset all completed levels and saved programs?',
    themeDay: '☀️ Theme: Day',
    themeNight: '🌙 Theme: Night',
    themeLabel: 'Color theme',
    zoomGroupLabel: 'Site zoom',
    zoomOutTitle: 'Zoom out (−10%)',
    zoomInTitle: 'Zoom in (+10%)',
    zoomValTitle: 'Click to reset to 100%',
    zoomResetTitle: 'Reset zoom to 100%',
    soundOn: '🔊 Sound: on',
    soundOff: '🔊 Sound: off',
    musicOn: '♫ Music: on',
    musicOff: '♫ Music: off',
    musicUnavailable: 'Music unavailable',
    fullscreenEnter: '⛶ Fullscreen',
    fullscreenExit: '🗗 Exit Fullscreen',
    fullscreenEnterTitle: 'Enter fullscreen',
    fullscreenExitTitle: 'Exit fullscreen',
    footerDefaultNight: 'The night awaits your program.',
    footerDefaultDay: 'The city awaits your program.',
    heroEyebrowNight: 'ALGORITHMS AFTER SUNSET',
    heroEyebrowDay: 'DAYTIME ENERGY-SAVING ALGORITHMS',
    heroH1Night: 'The city is asleep.<br>Your move — bring the light.',
    heroH1Day: 'Bright day over the city.<br>Your move — turn off the extra lights.',
    heroDescNight: 'Build command sequences, climb steps, and light up the lanterns. Progress from basic movement to loops and conditions.',
    heroDescDay: 'Build command sequences, find lanterns left burning during the day, and turn them off to save energy.',
    sectionLocked: 'Section Locked',
    sectionLockedHint: 'Complete all previous levels to unlock',
    unlockSectionLocal: '🔓 Unlock Section',
    unlockSectionLocalTitle: 'Mark previous levels as completed and unlock this section',
    markAllSection: '✓ Mark Entire Section',
    unmarkAllSection: '↺ Unmark Section',
    markAllSectionTitle: 'Mark all levels in this section as completed',
    unmarkAllSectionTitle: 'Unmark all levels in this section',
    completedBadge: 'Completed',
    sectionCompleted: 'Section completed',
    markBadge: 'Mark',
    markLevelTitle: 'Mark level as completed (local mode)',
    unmarkLevelTitle: 'Unmark level completion (local mode)',
    cmdShort: 'cmd.',
    limitLabel: 'Limit',
    difficultyPrefix: 'Difficulty',
    backToEditor: 'To Editor',
    allTopics: 'All Topics',
    hintBtn: '? Hint',
    hintBtnAria: 'Open hints',
    hintHeading: 'Hint',
    hintClose: 'Close',
    hintNext: 'Next',
    hintDone: 'Done',
    worldEyebrowNight: 'LIGHT EVERY LANTERN',
    worldEyebrowDay: 'TURN OFF EVERY LANTERN',
    sceneAria: '3D board with the lamplighter, trees, and lanterns',
    resetViewTitle: 'Reset camera view',
    zoomOutScene: 'Zoom out',
    zoomInScene: 'Zoom in',
    speedTitle: 'Animation speed',
    facingNote: 'Character faces movement direction',
    runBtn: 'Run',
    runBtnAria: 'Run program',
    resetProgramTitle: 'Reset program',
    compactBlocksTitle: 'Compact blocks mode',
    normalBlocksTitle: 'Normal blocks view',
    programAria: 'Program',
    trashTitle: 'Clear all commands or drag a block here',
    trashConfirmText: 'Clear all commands?',
    trashConfirmYes: 'Yes, clear',
    trashConfirmNo: 'Cancel',
    availableCommands: 'Available commands',
    localMarkInGame: '○ Complete Level',
    localDoneInGame: '✓ Completed',
    localMarkInGameTitle: 'Mark level as completed without playing (local mode)',
    localDoneInGameTitle: 'Click to unmark completion (local mode)',
    localMarkedStatus: 'Level marked as completed (local mode).',
    localUnmarkedStatus: 'Completion mark removed.',
    nextStreet: 'Next street →',
    toAllTopics: 'All topics →',
    backToEditorArrow: '← Back to editor',
    returnHome: 'Back to Home ↗',
    levelHiddenTitle: 'This level is hidden',
    levelLockedTitle: 'This level is locked',
    unlockLocalLevelBtn: '🔓 Unlock Section (local)',
    noWebGL: 'WebGL is required for 3D. Please enable hardware acceleration in your browser.',
    statusReset: 'Back at start. Program saved — try again.',
    statusWonNight: 'All lanterns are shining. Great job!',
    statusWonDay: 'All bulbs unscrewed! The city saved energy.',
    statusFell: 'The character stepped off the edge and fell.',
    statusRetry: 'Back at start. Try again.',
    statusShockReset: 'Returned to start. Repair the sparking lantern first.',
    statusBackAtStart: 'Returned to start.',
    statusIncompleteNight: 'Program finished, but not all lanterns are lit yet. Add more commands.',
    statusIncompleteDay: 'Program finished, but not all bulbs are unscrewed yet. Add more commands.',
    statusTryAnother: 'Back at start. Try another program.',
    blocksRemaining: 'Remaining',
    blocksCount: 'Blocks',
    dropHere: 'Drop here',
    notBtn: 'NOT',
    elifLabel: 'Else if',
    elseLabel: 'Else',
    removeBranch: 'Remove',
    removeElse: 'Remove else',
    chooseFunction: 'Choose function',
    callFunctionLabel: 'Call function',
    functionsHeading: 'Functions',
    createBtn: '＋ Create',
    functionDefaultName: 'Function '
  }
};

export function t(key, lang = getLang()) {
  const dict = strings[lang] || strings.uk;
  return dict[key] ?? strings.uk[key] ?? key;
}

export function getCategoryTitle(cat, lang = getLang()) {
  if (!cat) return '';
  if (lang === 'en') {
    if (cat.titleEn && cat.titleEn.trim()) return cat.titleEn;
    if (cat.id && categoryTitlesEn[cat.id]) return categoryTitlesEn[cat.id];
    if (cat.title && categoryTitleByUk[cat.title]) return categoryTitleByUk[cat.title];
  }
  return cat.title || 'Розділ';
}

export function getLevelName(l, lang = getLang()) {
  if (!l) return '';
  if (lang === 'en' && typeof l.nameEn === 'string' && l.nameEn.trim()) {
    return l.nameEn.trim();
  }
  return l.name || '';
}

export function getHintText(hint, lang = getLang()) {
  if (!hint) return '';
  if (lang === 'en' && typeof hint.textEn === 'string' && hint.textEn.trim()) {
    return hint.textEn.trim();
  }
  return hint.text || '';
}
