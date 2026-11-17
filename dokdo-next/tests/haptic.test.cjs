'use strict';
// 놀이 진동: 진동이 되는 휴대폰에서만 떨고, 켬/끔은 이 기기에만 남고, 아무것도 보내지 않는지.
const test = require('node:test');
const a = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SRC = path.join(ROOT, 'assets/haptic.js');

function load({ vibrate, coarse, stored }) {
  const calls = [], mem = stored === undefined ? {} : { 'dk-haptic-v1': stored };
  const root = {
    navigator: vibrate ? { vibrate: (ms) => { calls.push(ms); return true; } } : {},
    matchMedia: () => ({ matches: !!coarse }),
    localStorage: { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } },
  };
  const fn = new Function('window', 'module', fs.readFileSync(SRC, 'utf8'));
  fn(root, undefined);
  return { api: root.DokdoHaptic, calls, mem };
}

test('a touch phone with vibrate buzzes briefly, and off is remembered on this device', () => {
  const { api, calls, mem } = load({ vibrate: true, coarse: true });
  a.equal(api.available, true);
  a.equal(api.buzz('tap'), true); a.equal(api.buzz('big'), true);
  a.deepEqual(calls, [10, 40]);
  api.set(false); a.equal(mem['dk-haptic-v1'], 'off');
  a.equal(api.buzz('tap'), false); a.equal(calls.length, 2);
  a.equal(load({ vibrate: true, coarse: true, stored: 'off' }).api.on, false);
});

test('iPhone Safari (no vibrate) and computers (no touch) do nothing and hide the switch', () => {
  for (const env of [{ vibrate: false, coarse: true }, { vibrate: true, coarse: false }]) {
    const { api, calls } = load(env);
    a.equal(api.available, false); a.equal(api.buzz('tap'), false); a.equal(calls.length, 0);
    const btn = { hidden: false, setAttribute() {}, addEventListener() { throw Error('should not bind'); } };
    api.bindToggle(btn, () => ''); a.equal(btn.hidden, true);
  }
});

test('every buzz is short and nothing is sent anywhere', () => {
  const src = read('assets/haptic.js');
  a.doesNotMatch(src, /fetch|sendBeacon|XMLHttpRequest|https?:\/\//);
  const { api } = load({ vibrate: true, coarse: true });
  for (const ms of Object.values(api.MS)) a.ok(ms > 0 && ms <= 40);
});

test('fishing, runner and block puzzle call the shared vibration and load it first', () => {
  const games = read('assets/games.js'), fishing = read('assets/fishing.js');
  for (const k of ["buzz('tap')", "buzz('cue')", "buzz('big')"]) { a.ok(games.includes(k), 'games ' + k); a.ok(fishing.includes(k), 'fishing ' + k); }
  a.match(games, /id="game-haptic"[^>]*hidden/);
  a.match(read('fishing.html'), /id="f-haptic"[^>]*hidden/);
  for (const [page, main] of [['games.html', 'games.js'], ['fishing.html', 'fishing.js']]) {
    const html = read(page);
    a.ok(html.indexOf('./assets/haptic.js') > 0 && html.indexOf('./assets/haptic.js') < html.indexOf('./assets/' + main), page);
  }
});
