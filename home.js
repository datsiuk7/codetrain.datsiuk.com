import { getCategory, getLevelDescription, renderDifficultyStars } from './logic.mjs';
import { getLang, t, getCategoryTitle, getLevelName } from './i18n.mjs';

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
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '[::1]' ||
    loc.protocol === 'file:'
  );
}

export function isCatUnlocked(catIdx, catsWithLevels, done) {
  if (catIdx <= 0) return true;
  for (let i = 0; i < catIdx; i++) {
    const prevCat = catsWithLevels[i];
    const prevLevels = prevCat.levels.filter((l) => !l.hidden);
    const prevDone = prevLevels.filter((l) => done.includes(l.id)).length;
    if (prevLevels.length > 0 && prevDone < prevLevels.length) return false;
  }
  return true;
}

export function getLevelSections(levels, categories) {
  const visibleLevels = levels.filter((l) => !l.hidden);
  const catsWithLevels = categories
    .map((cat) => ({
      ...cat,
      levels: visibleLevels.filter((lvl) => (lvl.category || getCategory(lvl)) === cat.id)
    }))
    .filter((cat) => cat.levels.length > 0);

  const otherLevels = visibleLevels.filter(
    (l) => !categories.some((c) => c.id === (l.category || getCategory(l)))
  );
  if (otherLevels.length) {
    catsWithLevels.push({
      id: 'other',
      title: 'Інші вулиці',
      badge: 'Додатково',
      icon: '✦',
      description: 'Рівні поза основними темами.',
      levels: otherLevels
    });
  }

  return catsWithLevels;
}

export function findNextLevel(levels, categories, done, currentId) {
  const sections = getLevelSections(levels, categories);
  const currentSection = sections.findIndex((section) =>
    section.levels.some((level) => level.id === currentId)
  );
  if (currentSection < 0) return null;

  const currentLevels = sections[currentSection].levels;
  const currentIndex = currentLevels.findIndex((level) => level.id === currentId);
  if (currentIndex + 1 < currentLevels.length) return currentLevels[currentIndex + 1];

  const nextSection = currentSection + 1;
  if (nextSection >= sections.length || !isCatUnlocked(nextSection, sections, done)) return null;
  return sections[nextSection].levels[0];
}

export function renderHome(
  container,
  {
    levels,
    categories,
    done,
    currentTheme,
    lang = getLang(),
    isLocal = false,
    onToggleLevel = null,
    onToggleLevels = null
  }
) {
  const catsWithLevels = getLevelSections(levels, categories);

  const sectionsHtml = catsWithLevels
    .map((cat, catIdx) => {
      const isUnlocked = isCatUnlocked(catIdx, catsWithLevels, done);
      if (!isUnlocked) {
        return `<section class="category-section locked" data-cat="${esc(cat.id)}">
        <div class="category-locked-simple">
          <span class="locked-icon" aria-hidden="true">🔒</span>
          <span class="locked-text">${esc(t('sectionLocked', lang))}</span>
          <span class="locked-divider" aria-hidden="true">·</span>
          <span class="locked-hint">${esc(t('sectionLockedHint', lang))}</span>
          ${isLocal ? `<button type="button" class="btn-local-unlock-cat" data-unlock-cat="${catIdx}" title="${esc(t('unlockSectionLocalTitle', lang))}">${esc(t('unlockSectionLocal', lang))}</button>` : ''}
        </div>
      </section>`;
      }

      const cardsHtml = cat.levels
        .map((l, lvlIdx) => {
          const isDone = done.includes(l.id);
          const lvlNum = `${catIdx + 1}.${lvlIdx + 1}`;
          const displayName = getLevelName(l, lang);
          const badgeHtml = isLocal
            ? `<button type="button" class="completed-badge local-complete-toggle ${isDone ? 'is-done' : 'is-undone'}" data-toggle-level="${esc(l.id)}" title="${esc(isDone ? t('unmarkLevelTitle', lang) : t('markLevelTitle', lang))}" aria-label="${esc(displayName)}" aria-pressed="${isDone ? 'true' : 'false'}"><span class="badge-icon">${isDone ? '✓' : '○'}</span> ${esc(isDone ? t('completedBadge', lang) : t('markBadge', lang))}</button>`
            : isDone
            ? `<span class="completed-badge"><span class="badge-icon">✓</span> ${esc(t('completedBadge', lang))}</span>`
            : '';

          return `<a href="#level=${esc(l.id)}" class="level-card ${isDone ? 'completed-card' : ''}">
        <div class="card-art" style="flex-direction:column;gap:8px">
          <span class="level-number">${lvlNum}</span>
          <span class="level-name">${esc(displayName)}</span>
          ${badgeHtml}
        </div>
        <div class="card-body">
          <p>${esc(getLevelDescription(l, currentTheme, lang))}</p>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;gap:6px">
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:11px;color:#8da4b3">${l.allowed.length} ${esc(t('cmdShort', lang))}</span>
              ${l.limit ? `<span class="card-limit" style="margin-top:0">${esc(t('limitLabel', lang))}: ${l.limit}</span>` : ''}
            </div>
            ${renderDifficultyStars(l.difficulty, lang)}
          </div>
        </div>
      </a>`;
        })
        .join('');

      const allCatDone = cat.levels.length > 0 && cat.levels.every((l) => done.includes(l.id));
      const completedBadgeHtml = allCatDone
        ? `<span class="category-completed-badge"><span class="badge-icon">✓</span> ${esc(t('sectionCompleted', lang))}</span>`
        : '';
      const catToggleBtn = isLocal
        ? `<button type="button" class="btn-local-cat-toggle ${allCatDone ? 'is-all-done' : ''}" data-toggle-cat="${esc(cat.id)}" title="${esc(allCatDone ? t('unmarkAllSectionTitle', lang) : t('markAllSectionTitle', lang))}">${esc(allCatDone ? t('unmarkAllSection', lang) : t('markAllSection', lang))}</button>`
        : '';

      return `<section class="category-section ${allCatDone ? 'is-completed' : ''}" data-cat="${esc(cat.id)}">
      <details class="category-details" ${allCatDone ? '' : 'open'}>
        <summary class="category-header">
          <div class="category-header-main">
            <span class="category-caret" aria-hidden="true">▾</span>
            <h2 class="category-title">${esc(getCategoryTitle(cat, lang))}</h2>
            ${completedBadgeHtml}
          </div>
          ${catToggleBtn}
        </summary>
        <div class="level-grid home-level-grid">${cardsHtml}</div>
      </details>
    </section>`;
    })
    .join('');

  const heroEyebrow =
    currentTheme === 'light'
      ? t('heroEyebrowDay', lang)
      : t('heroEyebrowNight', lang);
  const heroH1 =
    currentTheme === 'light'
      ? t('heroH1Day', lang)
      : t('heroH1Night', lang);
  const heroDesc =
    currentTheme === 'light'
      ? t('heroDescDay', lang)
      : t('heroDescNight', lang);

  container.innerHTML = `<section class="hero"><div class="hero-copy"><span class="eyebrow">${heroEyebrow}</span><h1>${heroH1}</h1><p>${heroDesc}</p></div></section><div class="categories-container">${sectionsHtml}</div>`;

  if (isLocal) {
    container.querySelectorAll?.('[data-toggle-level]').forEach((btn) => {
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const levelId = btn.getAttribute?.('data-toggle-level') || btn.dataset?.toggleLevel;
        if (levelId && onToggleLevel) onToggleLevel(levelId);
      };
    });

    container.querySelectorAll?.('[data-toggle-cat]').forEach((btn) => {
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation?.();
        const catId = btn.getAttribute?.('data-toggle-cat') || btn.dataset?.toggleCat;
        const cat = catsWithLevels.find((c) => c.id === catId);
        if (cat && onToggleLevels) {
          const ids = cat.levels.map((l) => l.id);
          const allDone = ids.every((id) => done.includes(id));
          onToggleLevels(ids, !allDone);
        }
      };
    });

    container.querySelectorAll?.('[data-unlock-cat]').forEach((btn) => {
      btn.onclick = (e) => {
        e.preventDefault();
        const targetIdx = parseInt(
          btn.getAttribute?.('data-unlock-cat') || btn.dataset?.unlockCat,
          10
        );
        if (!Number.isNaN(targetIdx) && onToggleLevels) {
          const prereqIds = catsWithLevels
            .slice(0, targetIdx)
            .flatMap((c) => c.levels.map((l) => l.id));
          onToggleLevels(prereqIds, true);
        }
      };
    });
  }
}
