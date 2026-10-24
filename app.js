import {
  validateLevel,
  categories
} from './logic.mjs';
import { setupMusic, setupEffects } from './music.js';
import { renderHome, isCatUnlocked, getLevelSections, findNextLevel } from './home.js';
import { startGame } from './runner.js';
import { getLang, setLang, t, getCategoryTitle, getLevelName } from './i18n.mjs';

const app = document.querySelector('#app');
setupMusic(document.querySelector('#music'));
const effects = setupEffects(document.querySelector('#sound'));
setupFullscreen(document.querySelector('#fullscreen'));
setupSiteZoom(document.querySelector('#site-zoom-control'));

function setupFullscreen(button) {
  if (!button) return;

  function isFullscreen() {
    return Boolean(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
  }

  function update() {
    const fs = isFullscreen();
    const lang = getLang();
    button.setAttribute('aria-pressed', fs ? 'true' : 'false');
    button.textContent = fs ? t('fullscreenExit', lang) : t('fullscreenEnter', lang);
    button.title = fs ? t('fullscreenExitTitle', lang) : t('fullscreenEnterTitle', lang);
  }

  button.onclick = async () => {
    try {
      if (!isFullscreen()) {
        const root = document.documentElement || document.body;
        if (root?.requestFullscreen) await root.requestFullscreen();
        else if (root?.webkitRequestFullscreen) await root.webkitRequestFullscreen();
        else if (root?.msRequestFullscreen) await root.msRequestFullscreen();
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
        else if (document.msExitFullscreen) await document.msExitFullscreen();
      }
    } catch {}
    update();
  };

  const addDocListener = (event, fn) => {
    document.addEventListener?.(event, fn);
  };

  addDocListener('fullscreenchange', update);
  addDocListener('webkitfullscreenchange', update);
  addDocListener('mozfullscreenchange', update);
  addDocListener('MSFullscreenChange', update);

  update();
}

export function setupSiteZoom(container) {
  if (!container) return;

  const siteZoomIn = container.querySelector?.('#site-zoom-in');
  const siteZoomOut = container.querySelector?.('#site-zoom-out');
  const siteZoomReset = container.querySelector?.('#site-zoom-reset');
  const siteZoomVal = container.querySelector?.('#site-zoom-val');

  let currentSiteZoom = 1.0;
  try {
    const saved = sessionStorage.getItem('lamplighter-site-zoom');
    if (saved) currentSiteZoom = Math.max(0.6, Math.min(1.5, parseFloat(saved) || 1.0));
  } catch {}

  function applySiteZoom(val) {
    currentSiteZoom = Math.max(0.6, Math.min(1.5, Math.round(val * 10) / 10));
    const pct = Math.round(currentSiteZoom * 100);
    if (siteZoomVal) {
      siteZoomVal.textContent = `${pct}%`;
      siteZoomVal.classList?.toggle('is-custom', pct !== 100);
    }
    if (siteZoomReset) {
      siteZoomReset.style.display = pct === 100 ? 'none' : 'inline-flex';
    }

    if (typeof document !== 'undefined' && document.body?.style) {
      document.body.style.zoom = currentSiteZoom === 1.0 ? '' : String(currentSiteZoom);
    }
    if (typeof document !== 'undefined' && document.documentElement?.style) {
      document.documentElement.style.setProperty?.('--site-zoom', String(currentSiteZoom));
    }
    try {
      if (currentSiteZoom === 1.0) {
        sessionStorage.removeItem('lamplighter-site-zoom');
      } else {
        sessionStorage.setItem('lamplighter-site-zoom', String(currentSiteZoom));
      }
    } catch {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent?.(new Event('resize'));
    }
  }

  if (currentSiteZoom !== 1.0) {
    applySiteZoom(currentSiteZoom);
  }

  if (siteZoomIn) siteZoomIn.onclick = () => applySiteZoom(currentSiteZoom + 0.1);
  if (siteZoomOut) siteZoomOut.onclick = () => applySiteZoom(currentSiteZoom - 0.1);
  if (siteZoomReset) siteZoomReset.onclick = () => applySiteZoom(1.0);
  if (siteZoomVal) siteZoomVal.onclick = () => applySiteZoom(1.0);
}

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

export function isLocalHost(loc = typeof location !== 'undefined' ? location : null) {
  if (!loc) return false;
  const host = String(loc.hostname || '').toLowerCase();
  return (
    !host ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '[::1]' ||
    loc.protocol === 'file:'
  );
}

let cleanup = () => {};
let levels = [];
let currentTheme = localStorage.getItem('lamplighter-theme') || 'dark';
let currentLang = getLang();
let currentCategories = [...categories];
let isLocal = isLocalHost();

const programMemoryCache = new Map();

function getProgramStorageKey(levelId, isPreview) {
  return isPreview ? 'lamplighter-preview-program' : `lamplighter-program-${levelId}`;
}

function loadSavedProgram(levelId, isPreview) {
  const key = getProgramStorageKey(levelId, isPreview);
  if (programMemoryCache.has(key)) return structuredClone(programMemoryCache.get(key));
  try {
    const storage = isPreview ? sessionStorage : localStorage;
    const raw = storage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      programMemoryCache.set(key, structuredClone(parsed));
      return parsed;
    }
  } catch {}
  return null;
}

function saveProgram(levelId, isPreview, programData) {
  const key = getProgramStorageKey(levelId, isPreview);
  if (programData && (programData.blocks?.length || programData.functions?.length || programData.lists?.length)) {
    const clone = structuredClone(programData);
    programMemoryCache.set(key, clone);
    try {
      const storage = isPreview ? sessionStorage : localStorage;
      storage.setItem(key, JSON.stringify(clone));
    } catch {}
  } else {
    programMemoryCache.delete(key);
    try {
      const storage = isPreview ? sessionStorage : localStorage;
      storage.removeItem(key);
    } catch {}
  }
}

let gameSettings = {
  footerDayText: 'Місто чекає на твою програму.',
  footerNightText: 'Ніч чекає на твою програму.',
  developerText: ''
};

function updateFooter(th = currentTheme) {
  const footer = document.querySelector('footer');
  if (!footer) return;
  let quote;
  if (currentLang === 'en') {
    quote = th === 'light' ? t('footerDefaultDay', 'en') : t('footerDefaultNight', 'en');
  } else {
    quote =
      th === 'light'
        ? gameSettings.footerDayText || t('footerDefaultDay', 'uk')
        : gameSettings.footerNightText || t('footerDefaultNight', 'uk');
  }
  const dev = gameSettings.developerText
    ? `<div class="footer-developer">${esc(gameSettings.developerText)}</div>`
    : '';
  footer.innerHTML = `<div class="footer-quote">${esc(quote)}</div>${dev}`;
}

const themeBtn = document.querySelector('#theme');
const langSwitcher = document.querySelector('#lang-switcher');

function updateHeaderTexts() {
  if (typeof document === 'undefined') return;
  document.documentElement?.setAttribute?.('lang', currentLang);
  if ('title' in document) document.title = t('pageTitle', currentLang);

  const brand = document.querySelector('header .brand');
  if (brand) {
    brand.innerHTML = `<span class="brand-icon">✧</span> ${esc(t('brandName', currentLang))}`;
  }
  const headerNote = document.querySelector('header .header-note');
  if (headerNote) {
    headerNote.textContent = t('headerNote', currentLang);
  }
  const resetBtn = document.querySelector('#reset-progress');
  if (resetBtn) {
    resetBtn.textContent = t('resetProgress', currentLang);
    resetBtn.title = t('resetProgressTitle', currentLang);
  }
  if (themeBtn) {
    themeBtn.textContent = currentTheme === 'light' ? t('themeDay', currentLang) : t('themeNight', currentLang);
    themeBtn.setAttribute?.('aria-label', t('themeLabel', currentLang));
  }
  const soundBtn = document.querySelector('#sound');
  if (soundBtn && soundBtn.getAttribute) {
    const isOn = soundBtn.getAttribute('aria-pressed') !== 'false';
    soundBtn.textContent = isOn ? t('soundOn', currentLang) : t('soundOff', currentLang);
  }
  const musicBtn = document.querySelector('#music');
  if (musicBtn && musicBtn.getAttribute) {
    const isOn = musicBtn.getAttribute('aria-pressed') === 'true';
    musicBtn.textContent = isOn ? t('musicOn', currentLang) : t('musicOff', currentLang);
  }
  const fsBtn = document.querySelector('#fullscreen');
  if (fsBtn && fsBtn.getAttribute) {
    const isFs = fsBtn.getAttribute('aria-pressed') === 'true';
    fsBtn.textContent = isFs ? t('fullscreenExit', currentLang) : t('fullscreenEnter', currentLang);
    fsBtn.title = isFs ? t('fullscreenExitTitle', currentLang) : t('fullscreenEnterTitle', currentLang);
  }
  if (langSwitcher) {
    langSwitcher.querySelectorAll?.('.lang-btn').forEach((btn) => {
      const btnLang = btn.getAttribute?.('data-lang') || btn.dataset?.lang;
      const active = btnLang === currentLang;
      btn.classList?.toggle?.('active', active);
      btn.setAttribute?.('aria-pressed', active ? 'true' : 'false');
    });
  }
  updateFooter(currentTheme);
}

function applyLang(lang) {
  currentLang = setLang(lang);
  updateHeaderTexts();
}

let themeShimmerTimer = null;
let themeMidpointTimer = null;
let pendingTheme = null;

function triggerThemeShimmer(targetTheme, onMidpoint) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;
  if (!body) return;

  const current = (root && typeof root.getAttribute === 'function' ? root.getAttribute('data-theme') : null) || pendingTheme || currentTheme || 'dark';
  const nextTheme = targetTheme || (current === 'light' ? 'dark' : 'light');
  pendingTheme = nextTheme;

  const lightClass = 'theme-shimmer-to-light';
  const darkClass = 'theme-shimmer-to-dark';
  const fadeOutClass = 'theme-fade-out';
  const fadeInClass = 'theme-fade-in';

  body.classList.remove('theme-shimmer', lightClass, darkClass, fadeOutClass, fadeInClass);
  root?.classList?.remove?.('theme-shimmer', lightClass, darkClass, fadeOutClass, fadeInClass);
  if (body.offsetWidth !== undefined) void body.offsetWidth;

  body.classList.add('theme-shimmer', fadeOutClass);
  root?.classList?.add?.('theme-shimmer', fadeOutClass);

  if (nextTheme === 'light') {
    body.classList.add(lightClass);
    root?.classList?.add?.(lightClass);
  } else {
    body.classList.add(darkClass);
    root?.classList?.add?.(darkClass);
  }

  if (themeMidpointTimer) {
    clearTimeout(themeMidpointTimer);
    themeMidpointTimer = null;
  }
  if (onMidpoint) {
    themeMidpointTimer = setTimeout(() => {
      if (typeof document !== 'undefined') {
        body.classList.remove(fadeOutClass);
        root?.classList?.remove?.(fadeOutClass);
        body.classList.add(fadeInClass);
        root?.classList?.add?.(fadeInClass);
        onMidpoint();
      }
      themeMidpointTimer = null;
    }, 950);
  }

  if (themeShimmerTimer) {
    clearTimeout(themeShimmerTimer);
    themeShimmerTimer = null;
  }
  themeShimmerTimer = setTimeout(() => {
    pendingTheme = null;
    if (typeof document !== 'undefined') {
      document.body?.classList?.remove?.('theme-shimmer', lightClass, darkClass, fadeOutClass, fadeInClass);
      document.documentElement?.classList?.remove?.('theme-shimmer', lightClass, darkClass, fadeOutClass, fadeInClass);
    }
    themeShimmerTimer = null;
  }, 2000);
}

function applyTheme(th, animate = false) {
  if (animate && th !== currentTheme) {
    triggerThemeShimmer(th, () => {
      applyTheme(th, false);
      route();
    });
    return;
  }
  currentTheme = th;
  document.documentElement.setAttribute('data-theme', th);
  try {
    localStorage.setItem('lamplighter-theme', th);
  } catch {}
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute('content', th === 'light' ? '#f8f9fa' : '#101820');
  updateFooter(th);
  if (themeBtn) {
    themeBtn.textContent = th === 'light' ? t('themeDay', currentLang) : t('themeNight', currentLang);
    themeBtn.setAttribute('aria-pressed', String(th === 'light'));
  }
}
applyTheme(currentTheme);
applyLang(currentLang);

if (langSwitcher) {
  langSwitcher.querySelectorAll?.('.lang-btn').forEach((btn) => {
    btn.onclick = () => {
      const nextLang = btn.getAttribute?.('data-lang') || btn.dataset?.lang;
      if (nextLang && nextLang !== currentLang) {
        applyLang(nextLang);
        route();
      }
    };
  });
}

if (themeBtn) {
  themeBtn.onclick = () => {
    const next = (pendingTheme || currentTheme) === 'light' ? 'dark' : 'light';
    triggerThemeShimmer(next, () => {
      applyTheme(next);
      route();
    });
  };
}

function completed() {
  try {
    return JSON.parse(localStorage.getItem('lamplighter-completed') || '[]');
  } catch {
    return [];
  }
}

function setCompleted(ids) {
  try {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length) {
      localStorage.setItem('lamplighter-completed', JSON.stringify(unique));
    } else {
      localStorage.removeItem?.('lamplighter-completed') ??
        localStorage.setItem('lamplighter-completed', '[]');
    }
  } catch {}
}

function complete(id) {
  setCompleted([...completed(), id]);
}

function toggleComplete(id) {
  const current = completed();
  if (current.includes(id)) {
    setCompleted(current.filter((item) => item !== id));
    return false;
  }
  setCompleted([...current, id]);
  return true;
}

function setLevelsCompleted(levelIds, shouldBeDone) {
  const current = new Set(completed());
  for (const id of levelIds) {
    if (shouldBeDone) current.add(id);
    else current.delete(id);
  }
  setCompleted([...current]);
}

const resetProgressBtn = document.querySelector('#reset-progress');
if (resetProgressBtn) {
  resetProgressBtn.onclick = () => {
    const done = completed();
    const countInfo = done.length
      ? ` (пройдено ${done.length} ${done.length === 1 ? 'рівень' : 'рівнів'})`
      : '';
    const msg = `Ви впевнені, що хочете повністю скинути весь прогрес гри${countInfo}?\n\nВсі відмітки пройдених вулиць буде видалено, а наступні розділи знову повернуться під замок.`;

    if (confirm(msg)) {
      try {
        localStorage.removeItem('lamplighter-completed');
        programMemoryCache.clear();
        const toRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('lamplighter-program-')) toRemove.push(k);
        }
        toRemove.forEach((k) => localStorage.removeItem(k));
      } catch {}
      route();
    }
  };
}

async function load() {
  try {
    isLocal = isLocalHost();

    try {
      const setRes = await fetch('./levels/settings.json', { cache: 'no-store' });
      if (setRes.ok) {
        const s = await setRes.json();
        if (s) gameSettings = { ...gameSettings, ...s };
        updateFooter(currentTheme);
      }
    } catch {}

    try {
      const catRes = await fetch('./levels/categories.json', { cache: 'no-store' });
      if (catRes.ok) currentCategories = await catRes.json();
    } catch {}

    const response = await fetch('./levels/index.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Не вдалося відкрити список рівнів.');
    const ids = await response.json();

    levels = await Promise.all(
      ids.map(async (id) => {
        if (!/^[a-z0-9-]+$/.test(id)) throw new Error('Некоректний ID рівня');
        const r = await fetch(`./levels/${id}.json`, { cache: 'no-store' });
        if (!r.ok) throw new Error(`Не знайдено рівень ${id}`);
        const l = await r.json();
        const errors = validateLevel(l);
        if (errors.length) throw new Error(`${id}: ${errors.join(' ')}`);
        return l;
      })
    );
    route();
  } catch (e) {
    app.innerHTML = `<div class="panel"><h2>Не вдалося завантажити рівні</h2><p>${esc(e.message)}</p><p>Локально запусти <code>node server.cjs</code> та відкрий localhost:5173.</p></div>`;
  }
}

function route() {
  cleanup();
  cleanup = () => {};

  const resetBtn = document.querySelector('#reset-progress');
  const id = new URLSearchParams(location.hash.slice(1)).get('level');

  if (id === 'preview') {
    if (resetBtn) resetBtn.style.display = 'none';
    try {
      const level = JSON.parse(sessionStorage.getItem('lamplighter-preview'));
      const errors = validateLevel(level);
      if (errors.length) throw new Error(errors.join(' '));
      cleanup = startGame(app, level, true, {
        currentTheme,
        lang: currentLang,
        gameSettings,
        loadSavedProgram,
        saveProgram,
        complete,
        isLocal,
        isCompleted: (levelId) => completed().includes(levelId),
        toggleComplete,
        getNextLevel: (levelId) => findNextLevel(levels, currentCategories, completed(), levelId),
        effects
      });
    } catch (e) {
      app.innerHTML = `<div class="panel"><h2>Немає рівня для тестування</h2><p>${esc(e.message)}</p><a href="./admin/">Повернутися в редактор</a></div>`;
    }
    return;
  }

  const l = levels.find((item) => item.id === id);
  if (l) {
    if (resetBtn) resetBtn.style.display = 'none';
    if (l.hidden) {
      const displayName = getLevelName(l, currentLang);
      app.innerHTML = `
        <div class="panel" style="max-width:540px;margin:50px auto;text-align:center;padding:36px 28px">
          <div style="font-size:44px;margin-bottom:12px">👁</div>
          <h2>${esc(t('levelHiddenTitle', currentLang))}</h2>
          <p>${currentLang === 'en' ? `Street "${esc(displayName)}" is currently hidden or being updated.` : `Вулиця «${esc(displayName)}» наразі прихована в редакторі або знаходиться на оновленні.`}</p>
          <div style="margin-top:24px"><a href="#" class="primary" style="display:inline-block;padding:11px 24px;border-radius:9px">${esc(t('returnHome', currentLang))}</a></div>
        </div>`;
      return;
    }

    const done = completed();
    const catsWithLevels = getLevelSections(levels, currentCategories);

    const catIdx = catsWithLevels.findIndex((c) => c.levels.some((lvl) => lvl.id === l.id));
    if (catIdx > 0 && !isCatUnlocked(catIdx, catsWithLevels, done)) {
      const prevCat = catsWithLevels[catIdx - 1];
      const displayName = getLevelName(l, currentLang);
      const prevCatTitle = getCategoryTitle(prevCat, currentLang);
      app.innerHTML = `
        <div class="panel" style="max-width:540px;margin:50px auto;text-align:center;padding:36px 28px">
          <div style="font-size:44px;margin-bottom:12px">🔒</div>
          <h2>${esc(t('levelLockedTitle', currentLang))}</h2>
          <p>${currentLang === 'en' ? `To unlock "${esc(displayName)}", first complete all levels in <strong>"${esc(prevCatTitle)}"</strong>.` : `Щоб відкрити вулицю «${esc(displayName)}», спочатку пройди всі завдання теми <strong>«${esc(prevCatTitle)}»</strong>.`}</p>
          <div style="margin-top:24px;display:flex;justify-content:center;gap:10px;flex-wrap:wrap">
            ${isLocal ? `<button type="button" id="unlock-local-level" class="btn-local-unlock-cat" style="padding:11px 20px;border-radius:9px">${esc(t('unlockLocalLevelBtn', currentLang))}</button>` : ''}
            <a href="#" class="primary" style="display:inline-block;padding:11px 24px;border-radius:9px">${esc(t('returnHome', currentLang))}</a>
          </div>
        </div>`;
      if (isLocal) {
        const unlockBtn = app.querySelector?.('#unlock-local-level');
        if (unlockBtn) {
          unlockBtn.onclick = () => {
            const prereqIds = catsWithLevels
              .slice(0, catIdx)
              .flatMap((c) => c.levels.map((lvl) => lvl.id));
            setLevelsCompleted(prereqIds, true);
            route();
          };
        }
      }
      return;
    }

    cleanup = startGame(app, l, false, {
      currentTheme,
      lang: currentLang,
      gameSettings,
      loadSavedProgram,
      saveProgram,
      complete,
      isLocal,
      isCompleted: (levelId) => completed().includes(levelId),
      toggleComplete,
      getNextLevel: (levelId) => findNextLevel(levels, currentCategories, completed(), levelId),
      effects
    });
  } else {
    if (resetBtn) resetBtn.style.display = '';
    renderHome(app, {
      levels,
      categories: currentCategories,
      done: completed(),
      currentTheme,
      lang: currentLang,
      isLocal,
      onToggleLevel: (levelId) => {
        toggleComplete(levelId);
        route();
      },
      onToggleLevels: (levelIds, shouldBeDone) => {
        setLevelsCompleted(levelIds, shouldBeDone);
        route();
      }
    });
  }
}

window.addEventListener('hashchange', route);
load();
