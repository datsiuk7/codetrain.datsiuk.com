// Run: node --test tests/cloud.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createCloud, isCloudUrl, visitSource, countryFromTimeZone } from '../cloud.mjs';

const URL_OK = 'https://script.google.com/macros/s/abc/exec';

function memoryStorage() {
  const map = new Map();
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k)
  };
}

// A fake Apps Script endpoint: answers with whatever the test sets and records every request.
function fakeServer() {
  const server = { requests: [], reply: { ok: true }, fail: false };
  server.fetch = async (url, init) => {
    server.requests.push({ url, init, body: JSON.parse(init.body) });
    if (server.fail) throw new Error('offline');
    const reply = typeof server.reply === 'function' ? server.reply(JSON.parse(init.body)) : server.reply;
    if (typeof reply === 'string') return { ok: true, status: 200, text: async () => reply };
    return { ok: true, status: 200, text: async () => JSON.stringify(reply) };
  };
  return server;
}

const tick = () => new Promise((resolve) => setImmediate(resolve));

test('only Apps Script web app URLs switch the sheet on', () => {
  assert.equal(isCloudUrl(URL_OK), true);
  assert.equal(isCloudUrl(''), false);
  assert.equal(isCloudUrl('http://script.google.com/macros/s/abc/exec'), false);
  assert.equal(isCloudUrl('https://evil.example/script.google.com'), false);
  assert.equal(createCloud({ url: '', storage: memoryStorage() }).status().enabled, false);
});

test('runs are recorded only for a signed-in student and sent as text/plain', async () => {
  const storage = memoryStorage();
  const server = fakeServer();
  const cloud = createCloud({ url: URL_OK, storage, fetchFn: server.fetch, now: () => new Date('2026-11-17T10:00:00Z') });

  assert.equal(cloud.record({ levelId: 'a', level: '1.1', result: 'win' }), false, 'nobody signed in');
  assert.equal(server.requests.length, 0);

  server.reply = { ok: true, name: 'Марко', completed: ['a', 'b'] };
  const login = await cloud.login('  марко ', '0123');
  assert.deepEqual(login, { ok: true, name: 'Марко', completed: ['a', 'b'] });
  assert.equal(server.requests[0].init.headers['Content-Type'], 'text/plain;charset=utf-8');
  assert.deepEqual(server.requests[0].body, { action: 'login', name: 'марко', pin: '0123', done: [] });
  assert.deepEqual(cloud.status().student, { name: 'Марко', pin: '0123' });

  server.reply = { ok: true };
  assert.equal(cloud.record({ levelId: 'c', level: '1.3', result: 'fell', note: 'Попереду немає плитки.' }), true);
  await tick();
  const sent = server.requests.at(-1).body;
  assert.equal(sent.action, 'log');
  assert.equal(sent.name, 'Марко');
  assert.equal(sent.pin, '0123');
  assert.equal(sent.events.length, 1);
  assert.equal(sent.events[0].level, '1.3');
  assert.equal(sent.events[0].at, '2026-11-17T10:00:00.000Z');
  assert.ok(sent.events[0].id);
  assert.equal(cloud.status().pending, 0);
  assert.equal(cloud.status().state, 'ok');
});

test('a lost connection keeps the runs queued and retries later in order', async () => {
  const storage = memoryStorage();
  const server = fakeServer();
  const timers = [];
  const cloud = createCloud({
    url: URL_OK, storage, fetchFn: server.fetch,
    setTimer: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    clearTimer: () => {}
  });
  server.reply = { ok: true, name: 'Софія', completed: [] };
  await cloud.login('Софія', '1907');

  server.fail = true;
  cloud.record({ levelId: 'a', level: '1.1', result: 'incomplete' });
  await tick();
  assert.equal(cloud.status().state, 'offline');
  assert.equal(cloud.status().pending, 1);
  assert.equal(timers.at(-1).ms, 5000);

  // A run made while offline joins the queue behind the first one.
  cloud.record({ levelId: 'a', level: '1.1', result: 'win' });
  await tick();
  assert.equal(cloud.status().pending, 2);

  server.fail = false;
  server.reply = { ok: true };
  timers.at(-1).fn();
  await tick();
  const sent = server.requests.at(-1).body.events.map((e) => e.result);
  assert.deepEqual(sent, ['incomplete', 'win']);
  assert.equal(cloud.status().pending, 0);
  assert.equal(cloud.status().state, 'ok');

  // The queue lives in storage: a reload with no connection still has it.
  assert.equal(JSON.parse(storage.getItem('lamplighter-cloud-queue')).length, 0);
});

test('when the sheet script breaks, the student sees its message instead of a bare "no connection"', async () => {
  const server = fakeServer();
  const cloud = createCloud({ url: URL_OK, storage: memoryStorage(), fetchFn: server.fetch, setTimer: () => 0, clearTimer: () => {} });
  server.reply = { ok: true, name: 'Богдан', completed: [] };
  await cloud.login('Богдан', '1234');

  // Google's error page for an exception in the script.
  server.reply = '<!DOCTYPE html><html><head><style>body{}</style></head><body><div>TypeError: Cannot read properties of null (reading &#39;getRange&#39;) (рядок 120, файл &quot;Код&quot;)</div></body></html>';
  cloud.record({ levelId: 'a', level: '1.1', result: 'win' });
  await tick();
  assert.equal(cloud.status().state, 'offline');
  assert.equal(cloud.status().error, 'HTTP 200: TypeError: Cannot read properties of null (reading \'getRange\') (рядок 120, файл "Код")');

  // The new script answers errors as JSON.
  server.reply = { ok: false, error: 'server', message: 'Exception: Range not found' };
  await cloud.flush();
  assert.equal(cloud.status().error, 'server: Exception: Range not found');

  server.reply = { ok: true, saved: 1 };
  await cloud.flush();
  assert.equal(cloud.status().state, 'ok');
  assert.equal(cloud.status().error, '');
});

test('levels passed in this browser, even before signing in, go to the sheet on sign-in and on each visit', async () => {
  const server = fakeServer();
  let local = [{ id: 'a', level: '1.1' }];
  const cloud = createCloud({ url: URL_OK, storage: memoryStorage(), fetchFn: server.fetch, getDone: () => local });
  assert.equal(await cloud.sync(), null, 'nobody signed in: nothing to sync');
  assert.equal(server.requests.length, 0);

  server.reply = { ok: true, name: 'Іра', completed: ['a', 'z'] };
  assert.deepEqual((await cloud.register('Іра', '4444')).completed, ['a', 'z']);
  assert.deepEqual(server.requests.at(-1).body.done, [{ id: 'a', level: '1.1' }]);

  // Next visit: whatever was passed meanwhile is sent, and progress from other computers comes back.
  local = [{ id: 'a', level: '1.1' }, { id: 'b', level: '1.2' }];
  server.reply = { ok: true, name: 'Іра', completed: ['a', 'b', 'z'] };
  assert.deepEqual(await cloud.sync(), ['a', 'b', 'z']);
  assert.deepEqual(server.requests.at(-1).body, { action: 'login', name: 'Іра', pin: '4444', done: local });

  server.fail = true;
  assert.equal(await cloud.sync(), null, 'offline: the game just carries on');
  server.fail = false;
  server.reply = { ok: false, error: 'auth' };
  assert.equal(await cloud.sync(), null);
  assert.equal(cloud.status().state, 'auth', 'a PIN changed in the sheet shows up right away');
});

test('a name or PIN changed in the sheet stops sending until the next sign-in', async () => {
  const server = fakeServer();
  const cloud = createCloud({ url: URL_OK, storage: memoryStorage(), fetchFn: server.fetch, setTimer: () => 0, clearTimer: () => {} });
  server.reply = { ok: true, name: 'Марко', completed: [] };
  await cloud.login('Марко', '1');
  server.reply = { ok: false, error: 'auth' };
  cloud.record({ levelId: 'a', level: '1.1', result: 'win' });
  await tick();
  assert.equal(cloud.status().state, 'auth');
  const count = server.requests.length;
  await cloud.flush();
  assert.equal(server.requests.length, count, 'no retries while the PIN is wrong');

  assert.deepEqual(await cloud.login('Марко', '2'), { ok: false, error: 'auth' });
  assert.equal((await cloud.login('', '')).error, 'empty');

  // Registration: a short PIN is refused before asking the sheet; a taken name comes back from it.
  const before = server.requests.length;
  assert.equal((await cloud.register('Новий', '12')).error, 'pin');
  assert.equal(server.requests.length, before);
  server.reply = { ok: false, error: 'taken' };
  assert.deepEqual(await cloud.register('Марко', '5555'), { ok: false, error: 'taken' });
  assert.equal(server.requests.at(-1).body.action, 'register');
  server.reply = { ok: true, name: 'Новий', completed: [] };
  assert.deepEqual(await cloud.register(' Новий ', '5555'), { ok: true, name: 'Новий', completed: [] });
  assert.deepEqual(cloud.status().student, { name: 'Новий', pin: '5555' });
  assert.equal(cloud.status().state, 'ok', 'a new sign-in clears the old PIN error');
  assert.equal(cloud.status().pending, 0, 'Марко\'s queued run is not sent as Новий');
  assert.equal(server.requests.at(-1).body.action, 'register');
  cloud.logout();
  assert.equal(cloud.status().student, null);
  assert.equal(cloud.status().pending, 0);
});

test('without signing in, only the first win on each level is sent, with the number of tries', async () => {
  const storage = memoryStorage();
  const server = fakeServer();
  const cloud = createCloud({
    url: URL_OK, storage, fetchFn: server.fetch,
    now: () => new Date('2026-11-19T10:00:00Z'),
    random: () => 0.5,
    getContext: () => ({ from: 'Telegram', country: 'Україна' })
  });

  assert.equal(cloud.attempt({ levelId: 'a', level: '1.1', result: 'fell', mode: 'blocks' }), false);
  assert.equal(cloud.attempt({ levelId: 'a', level: '1.1', result: 'incomplete', mode: 'blocks' }), false);
  assert.equal(server.requests.length, 0, 'failed runs of anonymous players stay in the browser');
  assert.equal(cloud.attempt({ levelId: 'a', level: '1.1', result: 'win', mode: 'python' }), true);
  await tick();
  const sent = server.requests.at(-1).body;
  assert.equal(sent.action, 'anon');
  assert.equal(sent.visitor, '88888888');
  assert.equal(sent.name, undefined, 'no name, no PIN');
  assert.deepEqual(
    { ...sent.events[0], id: undefined },
    { id: undefined, at: '2026-11-19T10:00:00.000Z', level: '1.1', levelId: 'a', tries: 3, mode: 'python', from: 'Telegram', country: 'Україна' }
  );
  assert.equal(JSON.parse(storage.getItem('lamplighter-anon-queue')).length, 0);

  // Passing the same level again is not sent twice.
  cloud.attempt({ levelId: 'a', level: '1.1', result: 'win', mode: 'blocks' });
  await tick();
  assert.equal(server.requests.length, 1);

  // Offline: the win waits in the browser and goes with the next visit.
  server.fail = true;
  cloud.attempt({ levelId: 'b', level: '1.2', result: 'win', mode: 'blocks' });
  await tick();
  assert.equal(JSON.parse(storage.getItem('lamplighter-anon-queue')).length, 1);
  server.fail = false;
  server.reply = { ok: true };
  assert.equal(await cloud.visit(), true);
  await tick();
  assert.deepEqual(server.requests.map((r) => r.body.action), ['anon', 'anon', 'visit', 'anon']);
  assert.equal(JSON.parse(storage.getItem('lamplighter-anon-queue')).length, 0);

  // One visit a day from a browser.
  assert.equal(await cloud.visit(), false);
  assert.equal(server.requests.filter((r) => r.body.action === 'visit').length, 1);

  // A signed-in student's runs go to their journal instead.
  server.reply = { ok: true, name: 'Іра', completed: [] };
  await cloud.login('Іра', '4444');
  server.reply = { ok: true };
  cloud.attempt({ levelId: 'c', level: '1.3', result: 'win', mode: 'blocks' });
  await tick();
  assert.equal(server.requests.at(-1).body.action, 'log');
});

test('where visitors come from and roughly which country, without IP', () => {
  const origin = 'https://codetrain.datsiuk.com';
  assert.equal(visitSource('', origin), 'напряму');
  assert.equal(visitSource(`${origin}/#level=x`, origin), 'напряму');
  assert.equal(visitSource('https://www.google.com.ua/', origin), 'Google');
  assert.equal(visitSource('https://t.me/', origin), 'Telegram');
  assert.equal(visitSource('https://l.facebook.com/l.php', origin), 'Facebook');
  assert.equal(visitSource('https://school.example.org/lesson', origin), 'school.example.org');
  assert.equal(visitSource('https://t.me/', origin, '?utm_source=viber-group'), 'viber-group');

  assert.equal(countryFromTimeZone('Europe/Kyiv', 'en-US'), 'Україна');
  assert.equal(countryFromTimeZone('Europe/Warsaw', 'uk'), 'Польща');
  assert.equal(countryFromTimeZone('Asia/Tokyo', 'ja-JP'), 'Asia/Tokyo', 'unknown zones are shown as they are');
  assert.equal(countryFromTimeZone('', 'uk-UA'), 'Україна');
});

