// Background sync with the tutor's Google Sheet (an Apps Script web app, see apps-script/Code.gs).
// Every press of «Запустити» becomes an event in a queue kept in localStorage; the queue is sent
// in the background and survives reloads and lost connections, so the game never waits for it.

// Without signing in, only passed levels are sent (to «Анонімні»), once per level, plus one
// «I'm here» a day for the «Відвідування» count. A visitor is a random browser number, never a name or IP.

const STUDENT_KEY = 'lamplighter-student';
const QUEUE_KEY = 'lamplighter-cloud-queue';
const VISITOR_KEY = 'lamplighter-visitor';
const ANON_QUEUE_KEY = 'lamplighter-anon-queue';
const ANON_TRIES_KEY = 'lamplighter-anon-tries';
const ANON_SENT_KEY = 'lamplighter-anon-sent';
const VISIT_DAY_KEY = 'lamplighter-visit-day';
const BATCH = 40;
const ANON_BATCH = 20;
const MAX_QUEUE = 1000;
const RETRY_SECONDS = [5, 15, 30, 60, 120, 300];

export function isCloudUrl(url) {
  return typeof url === 'string' && /^https:\/\/script\.google(usercontent)?\.com\/\S+$/.test(url.trim());
}

const SOURCES = [
  [/(^|\.)google\.[a-z.]+$/, 'Google'],
  [/(^|\.)(t\.me|telegram\.org|telegram\.me)$/, 'Telegram'],
  [/(^|\.)(facebook\.com|fb\.com)$/, 'Facebook'],
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'YouTube'],
  [/(^|\.)tiktok\.com$/, 'TikTok'],
  [/(^|\.)viber\.com$/, 'Viber'],
  [/(^|\.)bing\.com$/, 'Bing'],
  [/(^|\.)duckduckgo\.com$/, 'DuckDuckGo'],
  [/(^|\.)github\.com$/, 'GitHub']
];

// Where the visitor came from: ?utm_source=…, else the site of the link they followed.
export function visitSource(referrer, origin = '', search = '') {
  try {
    const tag = new URLSearchParams(search || '').get('utm_source');
    if (tag && tag.trim()) return tag.trim().slice(0, 40);
  } catch {}
  if (!referrer) return 'напряму';
  let host;
  try {
    const link = new URL(referrer);
    if (link.origin === origin) return 'напряму';
    host = link.hostname.toLowerCase().replace(/^(www|m|l|lm)\./, '');
  } catch {
    return 'напряму';
  }
  const known = SOURCES.find(([re]) => re.test(host));
  return known ? known[1] : host;
}

// Time zone → country (ISO code). Approximate on purpose: no IP and no geolocation.
const TZ_COUNTRY = Object.fromEntries((
  'Europe/Kyiv:UA Europe/Kiev:UA Europe/Uzhgorod:UA Europe/Zaporozhye:UA Europe/Simferopol:UA ' +
  'Europe/Warsaw:PL Europe/Berlin:DE Europe/Prague:CZ Europe/Bratislava:SK Europe/Budapest:HU ' +
  'Europe/Bucharest:RO Europe/Chisinau:MD Europe/Vilnius:LT Europe/Riga:LV Europe/Tallinn:EE ' +
  'Europe/Helsinki:FI Europe/Stockholm:SE Europe/Oslo:NO Europe/Copenhagen:DK Europe/London:GB ' +
  'Europe/Dublin:IE Europe/Paris:FR Europe/Brussels:BE Europe/Amsterdam:NL Europe/Luxembourg:LU ' +
  'Europe/Zurich:CH Europe/Vienna:AT Europe/Rome:IT Europe/Madrid:ES Europe/Lisbon:PT ' +
  'Europe/Athens:GR Europe/Sofia:BG Europe/Belgrade:RS Europe/Zagreb:HR Europe/Ljubljana:SI ' +
  'Europe/Istanbul:TR Europe/Minsk:BY Europe/Moscow:RU Asia/Tbilisi:GE Asia/Jerusalem:IL ' +
  'Asia/Dubai:AE America/New_York:US America/Chicago:US America/Denver:US America/Los_Angeles:US ' +
  'America/Toronto:CA America/Vancouver:CA'
).split(' ').map((pair) => pair.split(':')));

export function countryFromTimeZone(timeZone, language = '', displayLang = 'uk') {
  const code = TZ_COUNTRY[timeZone] || (!timeZone && /-([a-z]{2})$/i.exec(String(language))?.[1].toUpperCase()) || '';
  if (!code) return timeZone || '';
  try {
    return new Intl.DisplayNames([displayLang], { type: 'region' }).of(code) || code;
  } catch {
    return code;
  }
}

export function createCloud({
  url,
  storage = globalThis.localStorage,
  fetchFn = (...args) => globalThis.fetch(...args),
  now = () => new Date(),
  setTimer = (fn, ms) => setTimeout(fn, ms),
  clearTimer = (id) => clearTimeout(id),
  onChange = () => {},
  // Levels passed in this browser, [{ id, level }]: sent on sign-in so progress made before it is kept.
  getDone = () => [],
  // { from, country } for anonymous wins.
  getContext = () => ({}),
  random = () => Math.random()
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
    flushAnon();
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
      data = await post({ action, name: cleanName, pin: cleanPin, done: done() });
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

  // A random number for this browser, made on the first visit.
  function visitorId() {
    const saved = read(VISITOR_KEY, '');
    if (typeof saved === 'string' && /^[a-z0-9]{4,16}$/.test(saved)) return saved;
    const id = Array.from({ length: 8 }, () => Math.floor(random() * 16).toString(16)).join('');
    write(VISITOR_KEY, id);
    return id;
  }

  const localDay = () => {
    const d = now();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Every press of «Запустити»: a signed-in student's run goes to their journal; without signing in
  // runs are only counted, and the first win on each level goes to «Анонімні» with that count.
  function attempt(a) {
    if (!endpoint || !a?.levelId) return false;
    if (getStudent()) return record(a);
    const tries = read(ANON_TRIES_KEY, {});
    const count = (Number(tries[a.levelId]) || 0) + 1;
    if (a.result !== 'win') {
      write(ANON_TRIES_KEY, { ...tries, [a.levelId]: count });
      return false;
    }
    delete tries[a.levelId];
    write(ANON_TRIES_KEY, tries);
    const sent = read(ANON_SENT_KEY, []);
    if (!Array.isArray(sent) || sent.includes(a.levelId)) return false;
    write(ANON_SENT_KEY, [...sent, a.levelId]);
    let context = {};
    try { context = getContext() || {}; } catch {}
    const at = now();
    const entry = {
      id: `${at.getTime().toString(36)}-${Math.floor(random() * 1e8).toString(36)}`,
      at: at.toISOString(),
      level: a.level,
      levelId: a.levelId,
      tries: count,
      mode: a.mode,
      from: context.from || '',
      country: context.country || ''
    };
    write(ANON_QUEUE_KEY, [...read(ANON_QUEUE_KEY, []), entry].slice(-200));
    flushAnon();
    return true;
  }

  let anonSending = false;
  async function flushAnon() {
    const queue = read(ANON_QUEUE_KEY, []);
    if (!endpoint || anonSending || !Array.isArray(queue) || !queue.length) return;
    anonSending = true;
    let sent = false;
    try {
      const batch = queue.slice(0, ANON_BATCH);
      const data = await post({ action: 'anon', visitor: visitorId(), events: batch });
      if (data?.ok) {
        const ids = new Set(batch.map((e) => e.id));
        write(ANON_QUEUE_KEY, read(ANON_QUEUE_KEY, []).filter((e) => !ids.has(e.id)));
        sent = true;
      }
    } catch {
      // No connection: the queue waits for the next win, visit or «online».
    } finally {
      anonSending = false;
    }
    if (sent && read(ANON_QUEUE_KEY, []).length) flushAnon();
  }

  // Once a day from each browser, students and anonymous visitors alike: the «Відвідування» count.
  async function visit() {
    if (!endpoint) return false;
    const day = localDay();
    let counted = false;
    if (read(VISIT_DAY_KEY, '') !== day) {
      try {
        const data = await post({ action: 'visit', visitor: visitorId() });
        if (data?.ok) {
          write(VISIT_DAY_KEY, day);
          counted = true;
        }
      } catch {}
    }
    flushAnon();
    return counted;
  }

  function done() {
    try {
      const list = getDone();
      return Array.isArray(list) ? list.filter((d) => d && d.id) : [];
    } catch {
      return [];
    }
  }

  // On page load for a student already signed in: send what was passed here, get back everything
  // passed on any computer. Resolves to the level IDs, or null when the sheet can't be reached.
  async function sync() {
    const student = getStudent();
    if (!endpoint || !student) return null;
    let data;
    try {
      data = await post({ action: 'login', name: student.name, pin: student.pin, done: done() });
    } catch {
      return null;
    }
    if (data?.ok) return Array.isArray(data.completed) ? data.completed : [];
    if (data?.error === 'auth') setState('auth');
    return null;
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
    sync,
    attempt,
    visit,
    login: (name, pin) => signIn('login', name, pin),
    register: (name, pin) => signIn('register', name, pin),
    logout
  };
}
