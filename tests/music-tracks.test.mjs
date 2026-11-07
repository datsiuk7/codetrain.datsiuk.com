import test from 'node:test';
import assert from 'node:assert/strict';
import { setupMusic, MUSIC_TRACKS } from '../music.js';

// Plays `bars` bars of a track into a recorder instead of Web Audio.
const record = (song, bars = 16) => {
  const notes = [];
  const pads = [];
  const lengths = [];
  const play = {
    note: (midi, at, dur, vol, opts = {}) => notes.push({ midi, at, dur, vol, ...opts }),
    pad: (midis, at, dur, vol) => pads.push({ midis, at, dur, vol })
  };
  let t = 0;
  for (let n = 0; n < bars; n++) {
    const length = song.bar(play, t, n);
    lengths.push(length);
    t += length;
  }
  return { notes, pads, lengths };
};

test('there are three calm tracks with valid, quiet notes', () => {
  assert.equal(MUSIC_TRACKS.length, 3);
  for (const song of MUSIC_TRACKS) {
    const { notes, pads, lengths } = record(song);
    assert.ok(lengths.every((l) => l >= 1.5), `${song.name}: bars are unhurried`);
    assert.ok(notes.length > 0, `${song.name}: plays notes`);
    for (const n of [...notes, ...pads.flatMap((p) => p.midis.map((midi) => ({ midi, vol: p.vol })))]) {
      assert.ok(Number.isInteger(n.midi) && n.midi >= 28 && n.midi <= 96, `${song.name}: note ${n.midi} in range`);
      assert.ok(n.vol > 0 && n.vol <= .12, `${song.name}: stays quiet`);
    }
  }
});

test('the three tracks really sound different: flowing 4/4, a 3/4 waltz and slow ambient pads', () => {
  const [nocturne, waltz, stars] = MUSIC_TRACKS.map((song) => record(song));
  const barLengths = [nocturne, waltz, stars].map((r) => r.lengths[0]);
  assert.equal(new Set(barLengths).size, 3, 'each track has its own tempo/meter');
  assert.ok(nocturne.notes.every((n) => !n.bell) && nocturne.pads.length === 0, 'nocturne: plain sine voices');
  assert.ok(waltz.notes.some((n) => n.bell && n.echo) && waltz.notes.some((n) => n.wave === 'triangle'), 'waltz: plucked chords and echoing bells');
  assert.ok(stars.pads.length > 0 && stars.lengths[0] >= 5, 'stars: long sustained pads');
});

// A fake browser with just enough Web Audio to schedule notes.
function withFakeBrowser(storage, run) {
  const gains = [];
  const oscillators = [];
  const listeners = new Map();
  class FakeAudioContext {
    constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
    createOscillator() {
      const osc = { frequency: {}, detune: {}, connect() {}, disconnect() {}, start() {}, stop() {} };
      oscillators.push(osc);
      return osc;
    }
    createBiquadFilter() { return { frequency: {}, connect() {}, disconnect() {} }; }
    createDelay() { return { delayTime: {}, connect() {}, disconnect() { this.disconnected = true; } }; }
    createGain() {
      const ramp = () => {};
      const gain = {
        gain: { value: 1, setValueAtTime: ramp, linearRampToValueAtTime: ramp, exponentialRampToValueAtTime: ramp },
        connect() {}, disconnect() { this.disconnected = true; }
      };
      gains.push(gain);
      return gain;
    }
    async resume() { this.state = 'running'; }
    async suspend() { this.state = 'suspended'; }
  }
  const globals = {
    window: { AudioContext: FakeAudioContext },
    localStorage: { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)) },
    document: { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener() {}, hidden: false }
  };
  const originals = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  const button = { dataset: {}, textContent: '', attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, contains: () => false };
  return Promise.resolve(run({ button, gains, oscillators, listeners })).finally(() => {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
}

test('each time music is switched on, the next track plays, round and round', async () => {
  const storage = new Map([['lamplighter-lang', 'uk'], ['lamplighter-music', 'false']]);
  await withFakeBrowser(storage, async ({ button, gains, oscillators }) => {
    setupMusic(button);
    assert.equal(button.textContent, '♫ Музика: вимк.');

    const labels = [];
    for (let i = 0; i < 4; i++) {
      await button.onclick();
      labels.push(button.textContent);
      assert.equal(button.attrs['aria-pressed'], 'true');
      await button.onclick();
      assert.equal(button.textContent, '♫ Музика: вимк.');
    }
    assert.deepEqual(labels, ['♫ Музика 1: увімк.', '♫ Музика 2: увімк.', '♫ Музика 3: увімк.', '♫ Музика 1: увімк.']);
    assert.ok(oscillators.length > 0, 'notes were scheduled');
    assert.ok(gains.filter((g) => g.gain.value === .5).every((g) => g.disconnected), 'stopping cuts off the old track');
    assert.equal(storage.get('lamplighter-music-track'), '0');
  });
});

test('after a reload the music resumes the same track instead of skipping ahead', async () => {
  const storage = new Map([['lamplighter-lang', 'uk'], ['lamplighter-music', 'true'], ['lamplighter-music-track', '1']]);
  await withFakeBrowser(storage, async ({ button, listeners }) => {
    setupMusic(button);
    assert.equal(button.textContent, '♫ Музика 2: увімк.');
    assert.equal(button.dataset.track, '2');
    await listeners.get('pointerdown')({ target: {} });
    assert.equal(button.textContent, '♫ Музика 2: увімк.');
    await button.onclick();
    await button.onclick();
    assert.equal(button.textContent, '♫ Музика 3: увімк.');
    await button.onclick();
  });
});
