import {
  initialState,
  lampCount,
  won,
  step,
  validateProgram,
  createMemory,
  executeProgram,
  getCommandInfo,
  getLevelDescription,
  ElectricShockError,
  renderDifficultyStars
} from './logic.mjs';
import { World } from './scene.js';
import { ProgramEditor } from './program.js';
import { setupGameHints } from './game-hints.js';
import { getLang, t, getLevelName } from './i18n.mjs';

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function spawnConfetti(container) {
  const colors = ['#edc17c', '#73c6bb', '#91b9ef', '#e69a9a', '#c5a2e8', '#f1e7b0'];
  for (let i = 0; i < 90; i++) {
    const ribbon = document.createElement('i');
    ribbon.className = 'confetti-ribbon';
    ribbon.style.setProperty('--x', `${Math.random() * 100}%`);
    ribbon.style.setProperty('--delay', `${Math.random() * 0.9}s`);
    ribbon.style.setProperty('--duration', `${1.9 + Math.random() * 1.1}s`);
    ribbon.style.setProperty('--sway', `${-90 + Math.random() * 180}px`);
    ribbon.style.setProperty('--spin', `${Math.random() < 0.5 ? '-' : ''}${360 + Math.random() * 720}deg`);
    ribbon.style.setProperty('--flip', `${Math.random() * 540}deg`);
    ribbon.style.setProperty('--width', `${4 + Math.random() * 5}px`);
    ribbon.style.setProperty('--height', `${16 + Math.random() * 20}px`);
    ribbon.style.background = colors[Math.floor(Math.random() * colors.length)];
    container.append(ribbon);
    setTimeout(() => ribbon.remove(), 4300);
  }
}

export function startGame(container, l, preview, options) {
  const {
    currentTheme,
    gameSettings,
    getNextLevel,
    loadSavedProgram,
    saveProgram,
    complete,
    lang = getLang(),
    isLocal = false,
    isCompleted = null,
    toggleComplete = null,
    effects
  } = options;

  document.body.classList.add('in-game');

  const headingEyebrow =
    currentTheme === 'light' ? t('worldEyebrowDay', lang) : t('worldEyebrowNight', lang);
  const headingDesc = esc(getLevelDescription(l, currentTheme, lang));
  const isAdvanced = l.allowed.some((c) =>
    ['if', 'while', 'call'].includes(c)
  );
  const displayName = getLevelName(l, lang);

  container.innerHTML = `
    <div class="game-top-bar">
      <a class="game-back-btn" href="${preview ? './admin/' : '#'}">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        <span>${esc(preview ? t('backToEditor', lang) : t('allTopics', lang))}</span>
      </a>
      <div class="game-level-name">
        <span class="level-title-text">${esc(displayName)}</span>
        ${renderDifficultyStars(l.difficulty, lang)}
      </div>
      <div class="game-top-actions">
        ${isLocal && !preview ? `<button id="local-complete" class="game-local-complete" type="button" aria-pressed="false"></button>` : ''}
        <button id="help-open" class="game-help-open" type="button" aria-label="${esc(t('hintBtnAria', lang))}">${esc(t('hintBtn', lang))}</button>
      </div>
    </div>
    <div id="help-card" class="game-help-card" hidden>
      <div class="game-help-heading"><strong>${esc(t('hintHeading', lang))}</strong><span id="help-count"></span></div>
      <p id="help-text" aria-live="polite"></p>
      <div class="game-help-actions">
        <button id="help-close" type="button">${esc(t('hintClose', lang))}</button>
        <button id="help-next" type="button" class="primary">${esc(t('hintNext', lang))}</button>
      </div>
    </div>
    <div class="game-layout ${isAdvanced ? 'advanced-level' : ''}">
      <section class="world">
        <div id="scene" class="scene" role="img" aria-label="${esc(t('sceneAria', lang))}">
          <div class="world-heading">
            <span class="eyebrow">${headingEyebrow}</span>
            <p>${headingDesc}</p>
          </div>
          <div class="scene-tools">
            <button id="reset-view" aria-label="${esc(t('resetViewTitle', lang))}" title="${esc(t('resetViewTitle', lang))}">⌂</button>
            <button id="zoom-out" aria-label="${esc(t('zoomOutScene', lang))}">−</button>
            <span id="zoom-value">100%</span>
            <button id="zoom-in" aria-label="${esc(t('zoomInScene', lang))}">+</button>
            <button id="speed-btn" class="speed-btn" title="${esc(t('speedTitle', lang))}">1×</button>
          </div>
          <div class="world-bottom">
            <span id="lamps" class="lamp-count"></span>
            <span>${esc(t('facingNote', lang))}</span>
          </div>
        </div>
      </section>
      <aside class="program-panel">
        <div id="win" class="win" hidden></div>
        <div class="program-run-bar">
          <button id="run" class="primary" aria-label="${esc(t('runBtnAria', lang))}">
            <span class="run-icon">▶</span> <span>${esc(t('runBtn', lang))}</span>
          </button>
          <button id="reset" aria-label="${esc(t('resetProgramTitle', lang))}" title="${esc(t('resetProgramTitle', lang))}">↺</button>
          <button id="compact-btn" class="compact-btn" type="button" aria-label="${esc(t('compactBlocksTitle', lang))}" title="${esc(t('compactBlocksTitle', lang))}">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 4h16M4 20h16M12 8v3m0 0-2-2m2 2 2-2M12 16v-3m0 0-2 2m2-2 2 2"/>
            </svg>
          </button>
        </div>
        <div class="section-label program-label"><span id="count" class="count"></span></div>
        <div id="program" class="program" aria-label="${esc(t('programAria', lang))}">
          <button id="trash" class="trash-zone" type="button" aria-label="${esc(t('trashTitle', lang))}" title="${esc(t('trashTitle', lang))}">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14ZM10 11v6M14 11v6"/>
            </svg>
          </button>
        </div>
        <div id="trash-confirm" class="trash-confirm" hidden>
          <span class="trash-confirm-text">${esc(t('trashConfirmText', lang))}</span>
          <div class="trash-confirm-btns">
            <button type="button" id="trash-confirm-yes" class="btn-trash-yes">${esc(t('trashConfirmYes', lang))}</button>
            <button type="button" id="trash-confirm-no" class="btn-trash-no">${esc(t('trashConfirmNo', lang))}</button>
          </div>
        </div>
        <div class="section-label available-commands">${esc(t('availableCommands', lang))} <span class="count">${l.allowed.length}</span></div>
        <div id="palette" class="palette"></div>
        <p id="status" class="status" role="status" aria-live="polite"></p>
      </aside>
    </div>
  `;

  const $ = (s) => container.querySelector(s);
  let state = initialState(l, currentTheme);
  let token = 0;
  let running = false;
  let world;

  try {
    world = new World($('#scene'), l, state, currentTheme);
  } catch {
    $('#scene').textContent = t('noWebGL', lang);
    $('#run').disabled = true;
    return () => { document.body.classList.remove('in-game'); };
  }

  const savedProgram = loadSavedProgram(l.id, preview);
  const editor = new ProgramEditor(
    $('#palette'),
    $('#program'),
    $('#count'),
    l,
    $('#trash'),
    currentTheme,
    savedProgram
  );

  const help = setupGameHints(container, l, preview);
  editor.onChange = (data) => {
    saveProgram(l.id, preview, data);
    help.refresh();
    if (!editor.blocks.length) {
      hideTrashConfirm();
    }
  };

  const compactBtn = $('#compact-btn');
  const programPanel = container.querySelector('.program-panel');
  let isCompact = false;
  try { isCompact = localStorage.getItem('lamplighter-compact-blocks') === '1'; } catch {}

  function setCompact(compact) {
    isCompact = compact;
    programPanel?.classList.toggle('compact-blocks', isCompact);
    compactBtn?.classList.toggle('active', isCompact);
    compactBtn?.setAttribute('title', isCompact ? t('normalBlocksTitle', lang) : t('compactBlocksTitle', lang));
    compactBtn?.setAttribute('aria-pressed', isCompact ? 'true' : 'false');
    try { localStorage.setItem('lamplighter-compact-blocks', isCompact ? '1' : '0'); } catch {}
  }

  if (isCompact) setCompact(true);
  if (compactBtn) {
    compactBtn.onclick = () => setCompact(!isCompact);
  }

  const localCompleteBtn = isLocal && !preview ? $('#local-complete') : null;
  function updateLocalCompleteBtn() {
    if (!localCompleteBtn) return;
    const done = Boolean(isCompleted?.(l.id));
    if (done) localCompleteBtn.classList?.add?.('is-done');
    else localCompleteBtn.classList?.remove?.('is-done');
    localCompleteBtn.setAttribute?.('aria-pressed', done ? 'true' : 'false');
    localCompleteBtn.setAttribute?.(
      'title',
      done
        ? t('localDoneInGameTitle', lang)
        : t('localMarkInGameTitle', lang)
    );
    localCompleteBtn.textContent = done ? t('localDoneInGame', lang) : t('localMarkInGame', lang);
  }
  updateLocalCompleteBtn();

  if (localCompleteBtn && toggleComplete) {
    localCompleteBtn.onclick = () => {
      const nowDone = toggleComplete(l.id);
      updateLocalCompleteBtn();
      if (nowDone) {
        const nextLevel = getNextLevel?.(l.id);
        const winLink = nextLevel
          ? `<a class="next-street" href="#level=${nextLevel.id}">${esc(t('nextStreet', lang))}</a>`
          : `<a class="next-street" href="#">${esc(t('toAllTopics', lang))}</a>`;
        $('#win').innerHTML = winLink;
        $('#win').hidden = false;
        status(t('localMarkedStatus', lang), 'success');
      } else {
        $('#win').hidden = true;
        status(t('localUnmarkedStatus', lang));
      }
    };
  }

  const trashBtn = $('#trash');
  const trashConfirm = $('#trash-confirm');
  const trashConfirmYes = $('#trash-confirm-yes');
  const trashConfirmNo = $('#trash-confirm-no');

  function isTrashConfirmOpen() {
    if (!trashConfirm) return false;
    return !trashConfirm.hidden && !trashConfirm.hasAttribute?.('hidden');
  }

  function showTrashConfirm() {
    if (!editor.blocks.length) return;
    if (trashConfirm) {
      trashConfirm.hidden = false;
      trashConfirm.removeAttribute?.('hidden');
      trashBtn?.classList?.add('confirm-active');
      trashConfirmNo?.focus?.();
    }
  }

  function hideTrashConfirm() {
    if (trashConfirm) {
      trashConfirm.hidden = true;
      trashConfirm.setAttribute?.('hidden', '');
      trashBtn?.classList?.remove('confirm-active');
    }
  }

  if (trashBtn) {
    trashBtn.onclick = () => {
      if (!editor.blocks.length) return;
      if (isTrashConfirmOpen()) {
        hideTrashConfirm();
      } else {
        showTrashConfirm();
      }
    };
  }

  if (trashConfirmYes) {
    trashConfirmYes.onclick = () => {
      editor.clear();
      saveProgram(l.id, preview, null);
      help.refresh?.();
      hideTrashConfirm();
    };
  }

  if (trashConfirmNo) {
    trashConfirmNo.onclick = () => {
      hideTrashConfirm();
    };
  }

  const handleGlobalClick = (e) => {
    if (isTrashConfirmOpen() && e?.target) {
      if (!trashConfirm?.contains?.(e.target) && !trashBtn?.contains?.(e.target)) {
        hideTrashConfirm();
      }
    }
  };

  const handleGlobalKeydown = (e) => {
    if (e?.key === 'Escape' && isTrashConfirmOpen()) {
      hideTrashConfirm();
    }
  };

  if (typeof document !== 'undefined') {
    document.addEventListener?.('click', handleGlobalClick);
    document.addEventListener?.('keydown', handleGlobalKeydown);
  }

  const status = (text, kind = '') => {
    $('#status').textContent = text;
    $('#status').className = 'status ' + kind;
  };

  const meter = () => {
    let text = '';
    if (currentTheme === 'light') {
      text = `💡 ${lampCount(l) - state.lit.length} / ${lampCount(l)} ${lang === 'en' ? 'off' : 'вимкнено'}`;
    } else {
      text = `☀ ${state.lit.length} / ${lampCount(l)} ${lang === 'en' ? 'lit' : 'увімкнено'}`;
    }
    if ((state.repairKits || 0) > 0 || (l.repairKits || 0) > 0 || (state.kits && state.kits.length > 0)) {
      text += ` · 🔧 ${state.repairKits || 0} ${lang === 'en' ? 'repair kits' : 'ремкомплектів'}`;
    }
    if ((state.carriedBulbs || 0) > 0 || (state.bulbs && state.bulbs.length > 0)) {
      text += ` · 💡 ${state.carriedBulbs || 0} ${lang === 'en' ? 'bulbs' : 'лампочок'}`;
    }
    $('#lamps').textContent = text;
  };
  meter();

  const updateZoom = () => {
    $('#zoom-value').textContent = `${Math.round(world.zoom * 100)}%`;
  };
  $('#reset-view').onclick = () => world.resetView();
  $('#zoom-out').onclick = () => {
    world.setZoom(world.zoom - 0.1);
    updateZoom();
  };
  $('#zoom-in').onclick = () => {
    world.setZoom(world.zoom + 0.1);
    updateZoom();
  };
  world.onZoom = updateZoom;


  const speedSteps = [0.5, 1, 2, 3];
  const speedLabels = ['0.5×', '1×', '2×', '3×'];
  const savedSpeed = Number(localStorage.getItem('lamplighter-speed'));
  let speedIdx = speedSteps.indexOf(savedSpeed);
  if (speedIdx < 0) speedIdx = 1;
  const speedBtn = $('#speed-btn');

  function applySpeed() {
    world.speed = speedSteps[speedIdx];
    speedBtn.textContent = speedLabels[speedIdx];
    try {
      localStorage.setItem('lamplighter-speed', speedSteps[speedIdx]);
    } catch {}
  }
  applySpeed();
  speedBtn.onclick = () => {
    speedIdx = (speedIdx + 1) % speedSteps.length;
    applySpeed();
  };

  function reset() {
    hideTrashConfirm();
    token++;
    running = false;
    state = initialState(l, currentTheme);
    world.setState(state);
    editor.active = null;
    editor.lock(false);
    $('#run').disabled = false;
    $('#win').hidden = true;
    meter();
    status(t('statusReset', lang));
  }
  $('#reset').onclick = reset;

  $('#run').onclick = async () => {
    hideTrashConfirm();
    help.close();
    if (running) return;
    let memory;

    try {
      validateProgram(l, editor.blocks, editor.functions);
      memory = createMemory();
    } catch (e) {
      status(e.message, 'error');
      if (!editor.blocks.length) {
        effects.angry?.();
        const runToken = ++token;
        $('#run').disabled = true;
        try {
          await world.frustrated(() => token !== runToken);
        } finally {
          if (token === runToken) $('#run').disabled = false;
        }
      }
      return;
    }

    reset();
    const runToken = token;
    let failed = false;
    let solved = false;
    running = true;
    editor.lock(true);
    $('#run').disabled = true;

    const execution = executeProgram(l, editor.blocks, editor.functions, () => state, memory);

    try {
      for (const block of execution) {
        if (token !== runToken) return;
        editor.highlight(block.id);
        status(getCommandInfo(block.type, currentTheme)[1]);

        if (block.control) {
          await wait(30);
          continue;
        }

        try {
          const next = step(l, state, block.type);
          if (block.type === 'forward') {
            effects.step?.();
          } else if (block.type === 'left' || block.type === 'right') {
            effects.turn?.();
          } else if (block.type === 'jump') {
            effects.jump?.();
          } else if (block.type === 'take') {
            effects.pickup?.();
          } else if (block.type === 'fix') {
            effects.repair?.();
          } else if (block.type === 'call') {
            effects.call?.();
          } else if (block.type === 'light') {
            const turnedOn = next.lit.includes(`${state.x},${state.z}`);
            if (turnedOn) effects.light?.();
            else effects.unscrew?.();
          }

          if (!(await world.animate(next, block.type, () => token !== runToken))) return;
          state = next;
          meter();

          if (won(l, state)) {
            solved = true;
            if (!preview) {
              complete(l.id);
              updateLocalCompleteBtn();
            }
            effects.win();
            if (!(await world.celebrate(() => token !== runToken))) return;
            spawnConfetti($('#scene'));

            const successMsg =
              currentTheme === 'light'
                ? t('statusWonDay', lang)
                : t('statusWonNight', lang);
            status(successMsg, 'success');

            const nextLevel = getNextLevel(l.id);
            const winLink = preview
              ? `<a class="next-street" href="./admin/">${esc(t('backToEditorArrow', lang))}</a>`
              : nextLevel
              ? `<a class="next-street" href="#level=${nextLevel.id}">${esc(t('nextStreet', lang))}</a>`
              : `<a class="next-street" href="#">${esc(t('toAllTopics', lang))}</a>`;
            $('#win').innerHTML = winLink;
            $('#win').hidden = false;
            $('#win').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            break;
          }
        } catch (e) {
          failed = true;
          if (e.message.startsWith('Попереду немає плитки.')) {
            effects.fall?.();
            await world.fall(state, () => token !== runToken);
            if (token !== runToken) return;
            world.robot.visible = false;
            state = initialState(l, currentTheme);
            world.setState(state);
            meter();
            editor.highlight(null);
            await wait(80);
            world.robot.visible = true;
            status(t('statusFell', lang), 'error');
            await wait(1800);
            if (token === runToken) status(t('statusRetry', lang), 'error');
          } else if (e instanceof ElectricShockError) {
            effects.shock?.();
            status(e.message, 'error');
            if (!(await world.shocked(() => token !== runToken))) return;
            await wait(900);
            if (token === runToken) {
              state = initialState(l, currentTheme);
              world.setState(state);
              meter();
              editor.highlight(null);
              status(t('statusShockReset', lang), 'error');
            }
          } else {
            effects.angry?.();
            status(e.message, 'error');
            if (!(await world.frustrated(() => token !== runToken))) return;
            await wait(2000);
            if (token === runToken) {
              state = initialState(l, currentTheme);
              world.setState(state);
              meter();
              editor.highlight(null);
              status(t('statusBackAtStart', lang), 'error');
            }
          }
          break;
        }
      }
    } catch (e) {
      failed = true;
      status(e.message, 'error');
    }

    if (token === runToken && !failed && !solved) {
      const incompleteMsg =
        currentTheme === 'light'
          ? t('statusIncompleteDay', lang)
          : t('statusIncompleteNight', lang);
      status(incompleteMsg);
      await wait(2000);
      if (token === runToken) {
        state = initialState(l, currentTheme);
        world.setState(state);
        meter();
        status(t('statusTryAnother', lang));
      }
    }

    if (token === runToken) {
      running = false;
      editor.lock(false);
      $('#run').disabled = false;
    }
  };

  return () => {
    if (typeof document !== 'undefined') {
      document.removeEventListener?.('click', handleGlobalClick);
      document.removeEventListener?.('keydown', handleGlobalKeydown);
    }
    help.close();
    document.body.classList.remove('in-game');
    token++;
    editor.dnd.endDrag();
    saveProgram(l.id, preview, editor.getProgram());
    world.dispose();
  };
}
