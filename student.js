// «👤 Учень» in the header: sign in or register by name and PIN in the tutor's sheet, and the sync state.
// When nobody is signed in, the dialog opens by itself on page load; «Грати без входу» hides it for this tab.
import { t, setIconLabel } from './i18n.mjs';

const LATER_KEY = 'lamplighter-student-later';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const ERRORS = {
  auth: 'studentErrAuth',
  empty: 'studentErrEmpty',
  taken: 'studentErrTaken',
  pin: 'studentErrPin',
  name: 'studentErrName',
  mismatch: 'studentErrMismatch'
};

export function setupStudent({ cloud, getLang, onLogin = () => {} }) {
  const button = typeof document !== 'undefined' ? document.querySelector('#student') : null;
  let overlay = null;
  let busy = false;
  let error = '';
  let mode = 'login'; // 'login' | 'register'

  function syncText(s, lang) {
    if (s.state === 'auth') return t('studentSyncAuth', lang);
    if (s.state === 'offline') return t('studentSyncOffline', lang).replace('{n}', s.pending);
    if (s.state === 'sending' || s.pending) return t('studentSyncSending', lang).replace('{n}', s.pending);
    return t('studentSynced', lang);
  }

  function renderButton() {
    if (!button) return;
    const s = cloud.status();
    const lang = getLang();
    button.hidden = !s.enabled;
    if (!s.enabled) return;
    setIconLabel(button, `👤 ${s.student ? s.student.name : t('studentLogin', lang)}`);
    button.title = s.student ? syncText(s, lang) : t('studentLoginTitle', lang);
    button.dataset.sync = !s.student ? 'none' : s.state === 'ok' && !s.pending ? 'ok' : s.state === 'sending' ? 'sending' : 'warn';
  }

  function renderSignedIn(card, s, lang) {
    card.innerHTML = `
      <h2 id="student-title">👤 ${esc(s.student.name)}</h2>
      <p class="student-sync" data-sync="${s.state === 'ok' && !s.pending ? 'ok' : 'warn'}">${esc(syncText(s, lang))}</p>
      ${s.error ? `<p class="student-hint student-detail">${esc(s.error)}</p>` : ''}
      <div class="student-actions">
        <button type="button" class="quiet student-logout">${esc(t('studentLogout', lang))}</button>
        ${s.pending && s.state !== 'auth' ? `<button type="button" class="student-send">${esc(t('studentSendNow', lang))}</button>` : ''}
        <button type="button" class="primary student-close">${esc(t('studentClose', lang))}</button>
      </div>`;
    card.querySelector('.student-logout').onclick = () => {
      const pending = cloud.status().pending;
      if (pending && !confirm(t('studentLogoutPending', lang).replace('{n}', pending))) return;
      cloud.logout();
      error = '';
      mode = 'login';
      renderAll();
    };
    const send = card.querySelector('.student-send');
    if (send) send.onclick = () => cloud.flush();
    card.querySelector('.student-close').onclick = close;
    card.querySelector('.student-close').focus();
  }

  function renderForm(card, lang) {
    const register = mode === 'register';
    const submitText = busy ? t('studentChecking', lang) : t(register ? 'studentRegisterSubmit' : 'studentSubmit', lang);
    card.innerHTML = `
      <h2 id="student-title">${esc(t('studentLoginHeading', lang))}</h2>
      <div class="student-tabs" role="tablist">
        <button type="button" role="tab" class="student-tab" data-mode="login" aria-selected="${!register}">${esc(t('studentLoginTab', lang))}</button>
        <button type="button" role="tab" class="student-tab" data-mode="register" aria-selected="${register}">${esc(t('studentRegisterTab', lang))}</button>
      </div>
      <p>${esc(t(register ? 'studentRegisterIntro' : 'studentIntro', lang))}</p>
      <label class="student-field">${esc(t('studentName', lang))}
        <input name="name" autocomplete="off" maxlength="60" required>
      </label>
      <label class="student-field">${esc(t(register ? 'studentPinNew' : 'studentPin', lang))}
        <input name="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="12" required>
      </label>
      ${register ? `<label class="student-field">${esc(t('studentPinRepeat', lang))}
        <input name="pin2" type="password" inputmode="numeric" autocomplete="off" maxlength="12" required>
      </label>` : `<p class="student-hint">${esc(t('studentForgot', lang))}</p>`}
      <p class="student-error" role="alert">${esc(error)}</p>
      <div class="student-actions">
        <button type="button" class="quiet student-close">${esc(t('studentLater', lang))}</button>
        <button type="submit" class="primary" ${busy ? 'disabled' : ''}>${esc(submitText)}</button>
      </div>`;
    card.querySelectorAll('.student-tab').forEach((tab) => {
      tab.onclick = () => {
        if (busy || tab.dataset.mode === mode) return;
        const name = card.querySelector('input[name="name"]').value;
        mode = tab.dataset.mode;
        error = '';
        renderDialog();
        overlay.querySelector('input[name="name"]').value = name;
      };
    });
    card.querySelector('.student-close').onclick = later;
    card.querySelector('input[name="name"]').focus();
  }

  function renderDialog() {
    if (!overlay) return;
    const s = cloud.status();
    const card = overlay.querySelector('.student-card');
    if (s.student) renderSignedIn(card, s, getLang());
    else renderForm(card, getLang());
  }

  function renderAll() {
    renderButton();
    renderDialog();
  }

  async function submit(e) {
    e.preventDefault();
    if (busy || cloud.status().student) return;
    const form = overlay.querySelector('.student-card');
    const name = form.querySelector('input[name="name"]').value;
    const pin = form.querySelector('input[name="pin"]').value;
    const pin2 = form.querySelector('input[name="pin2"]')?.value;
    const lang = getLang();
    const showError = (code) => {
      error = t(ERRORS[code] || 'studentErrOffline', lang);
      renderDialog();
      const nameInput = overlay?.querySelector('input[name="name"]');
      if (nameInput) nameInput.value = name;
    };
    if (mode === 'register' && pin.trim() !== String(pin2 || '').trim()) {
      showError('mismatch');
      return;
    }
    busy = true;
    error = '';
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = t('studentChecking', lang);
    const result = mode === 'register' ? await cloud.register(name, pin) : await cloud.login(name, pin);
    busy = false;
    if (!overlay) return;
    if (result.ok) {
      error = '';
      onLogin(result.completed);
      renderButton();
      close();
      return;
    }
    showError(result.error);
  }

  function onKey(e) {
    if (e.key === 'Escape') later();
  }

  function open() {
    if (overlay || typeof document === 'undefined') return;
    overlay = document.createElement('div');
    overlay.className = 'student-overlay';
    // The dialog role sits on the backdrop: a <form> may not take role="dialog".
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'student-title');
    overlay.innerHTML = '<form class="student-card"></form>';
    overlay.onclick = (e) => { if (e.target === overlay) later(); };
    overlay.querySelector('.student-card').onsubmit = submit;
    document.body.append(overlay);
    document.addEventListener('keydown', onKey);
    renderDialog();
  }

  function close() {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    error = '';
    document.removeEventListener('keydown', onKey);
    button?.focus?.();
  }

  // Closing without signing in: don't ask again until the next visit.
  function later() {
    if (!cloud.status().student) {
      try { sessionStorage.setItem(LATER_KEY, '1'); } catch {}
    }
    close();
  }

  // Called once the game has loaded: nobody signed in → ask to sign in or register.
  function prompt() {
    const s = cloud.status();
    if (!s.enabled || s.student) return;
    try { if (sessionStorage.getItem(LATER_KEY) === '1') return; } catch {}
    open();
  }

  if (button) button.onclick = open;
  renderButton();

  return { render: renderAll, prompt };
}
