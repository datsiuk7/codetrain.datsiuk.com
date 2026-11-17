// Background sync with the tutor's Google Sheet (an Apps Script web app, see apps-script/Code.gs).
// Every press of «Запустити» becomes an event in a queue kept in localStorage; the queue is sent
// in the background and survives reloads and lost connections, so the game never waits for it.

const STUDENT_KEY = 'lamplighter-student';
const QUEUE_KEY = 'lamplighter-cloud-queue';
const BATCH = 40;
const MAX_QUEUE = 1000;
const RETRY_SECONDS = [5, 15, 30, 60, 120, 300];

export function isCloudUrl(url) {
  return typeof url === 'string' && /^https:\/\/script\.google(usercontent)?\.com\/\S+$/.test(url.trim());
}

export function createCloud({
  url,
  storage = globalThis.localStorage,
  fetchFn = (...args) => globalThis.fetch(...args),
  now = () => new Date(),
  setTimer = (fn, ms) => setTimeout(fn, ms),
  clearTimer = (id) => clearTimeout(id),
  onChange = () => {}
} = {}) {
  const endpoint = isCloudUrl(url) ? url.trim() : '';
  let sending = false;
  let failures = 0;
  let retryTimer = null;
  // 'ok' | 'sending' | 'offline' | 'auth'
  let state = 'ok';
  // What went wrong last time, shown to the student so the tutor can see the real cause.
  let lastError = '';

  const read = (key, fallback) => {
    try {
      const raw = storage?.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };
  const write = (key, value) => {
    try {
      if (value === null) storage?.removeItem?.(key);
      else storage?.setItem(key, JSON.stringify(value));
    } catch {}
  };

  const getStudent = () => {
    const s = read(STUDENT_KEY, null);
    return s && typeof s.name === 'string' && s.name ? s : null;
  };
  const getQueue = () => {
    const q = read(QUEUE_KEY, []);
    return Array.isArray(q) ? q : [];
  };
  const setState = (next) => {
    state = next;
    onChange(status());
  };
  const status = () => ({
    enabled: Boolean(endpoint),
    student: getStudent(),
    pending: getQueue().length,
    state,
    error: state === 'offline' ? lastError : ''
  });

  async function post(payload) {
    // text/plain keeps this a "simple" request: Apps Script cannot answer a CORS preflight.
    const res = await fetchFn(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      // A script error comes back as an HTML page: keep its message, not the markup.
      const message = text
        .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
      throw new Error(`HTTP ${res.status}: ${message.slice(0, 240) || 'порожня відповідь'}`);
    }
  }

  function scheduleRetry() {
    clearTimer(retryTimer);
    const seconds = RETRY_SECONDS[Math.min(failures, RETRY_SECONDS.length - 1)];
    failures++;
    retryTimer = setTimer(() => {
      retryTimer = null;
      flush();
    }, seconds * 1000);
  }

  async function flush() {
    const student = getStudent();
    if (!endpoint || !student || sending || state === 'auth') return;
    const batch = getQueue().slice(0, BATCH);
    if (!batch.length) {
      if (state !== 'ok') setState('ok');
      return;
    }
    sending = true;
    setState('sending');
    let next = 'ok';
    try {
      const data = await post({ action: 'log', name: student.name, pin: student.pin, events: batch });
      if (data?.ok) {
        const sent = new Set(batch.map((e) => e.id));
        write(QUEUE_KEY, getQueue().filter((e) => !sent.has(e.id)));
        failures = 0;
        lastError = '';
      } else if (data?.error === 'auth') {
        // The tutor changed the name or PIN in the sheet: wait for a new login instead of retrying.
        next = 'auth';
      } else {
        throw new Error(data?.message ? `${data.error}: ${data.message}` : data?.error || 'bad response');
      }
    } catch (e) {
      next = 'offline';
      lastError = String(e?.message || e);
    } finally {
      sending = false;
    }
    setState(next);
    if (next === 'offline') scheduleRetry();
    else if (next === 'ok' && getQueue().length) flush();
  }

  function record(event) {
    if (!endpoint || !getStudent()) return false;
    const at = now();
    const entry = {
      id: `${at.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      at: at.toISOString(),
      ...event
    };
    write(QUEUE_KEY, [...getQueue(), entry].slice(-MAX_QUEUE));
    onChange(status());
    flush();
    return true;
  }

  // action: 'login' for a student already in the sheet, 'register' adds a new one.
  async function signIn(action, name, pin) {
    const cleanName = String(name || '').trim().replace(/\s+/g, ' ');
    const cleanPin = String(pin || '').trim();
    if (!endpoint) return { ok: false, error: 'disabled' };
    if (!cleanName || !cleanPin) return { ok: false, error: 'empty' };
    if (action === 'register' && (cleanPin.length < 4 || cleanPin.length > 12)) return { ok: false, error: 'pin' };
    let data;
    try {
      data = await post({ action, name: cleanName, pin: cleanPin });
    } catch {
      return { ok: false, error: 'offline' };
    }
    if (!data?.ok) {
      const known = ['auth', 'taken', 'pin', 'name'];
      return { ok: false, error: known.includes(data?.error) ? data.error : 'offline' };
    }
    // Runs still queued for someone else must never be sent under the new name.
    const previous = getStudent();
    if (previous && previous.name.toLowerCase() !== String(data.name || cleanName).toLowerCase()) write(QUEUE_KEY, null);
    write(STUDENT_KEY, { name: data.name || cleanName, pin: cleanPin });
    failures = 0;
    setState('ok');
    flush();
    return { ok: true, name: data.name || cleanName, completed: Array.isArray(data.completed) ? data.completed : [] };
  }

  function logout() {
    clearTimer(retryTimer);
    retryTimer = null;
    write(STUDENT_KEY, null);
    write(QUEUE_KEY, null);
    failures = 0;
    setState('ok');
  }

  return {
    status,
    record,
    flush,
    login: (name, pin) => signIn('login', name, pin),
    register: (name, pin) => signIn('register', name, pin),
    logout
  };
}
