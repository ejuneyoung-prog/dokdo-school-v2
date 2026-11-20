// 태극기 게양·지킨 날·흔들기·외침판 계산(camp/shout-core.js) 시험.
const test = require('node:test');
const a = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../camp/shout-core.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('KST day turns over at 15:00 UTC (midnight in Korea)', () => {
  a.equal(C.kstDay(Date.UTC(2026, 10, 20, 14, 59, 59)), '2026-11-20');
  a.equal(C.kstDay(Date.UTC(2026, 10, 20, 15, 0, 0)), '2026-11-21');
  a.equal(C.kstDay(Date.UTC(2026, 11, 31, 15, 0, 0)), '2027-01-01');
});

test('old saves get zero and empty days; good values are never lowered', () => {
  const st = C.tidy({ c: 5 });
  a.deepEqual([st.kN, st.wN, st.kD, st.wD], [0, 0, '', '']);
  a.deepEqual(C.tidy({ kN: 7, wN: 3, kD: '2026-11-20', wD: '2026-11-20' }), { kN: 7, wN: 3, kD: '2026-11-20', wD: '2026-11-20' });
  const bad = C.tidy({ kN: -1, wN: 'x', kD: 5, wD: 'yesterday' });
  a.deepEqual([bad.kN, bad.wN, bad.kD, bad.wD], [0, 0, '', '']);
  a.equal(C.tidy({ kN: 4.7 }).kN, 4);
});

test('the flag rises once per KST day; kept days only grow, missing days never reset', () => {
  const st = {};
  a.deepEqual(C.raise(st, '2026-11-20'), { raised: true, n: 1 });
  a.deepEqual(C.raise(st, '2026-11-20'), { raised: false, n: 1 });
  a.ok(C.raisedOn(st, '2026-11-20'));
  a.deepEqual(C.raise(st, '2026-11-21'), { raised: true, n: 2 });
  a.deepEqual(C.raise(st, '2026-11-30'), { raised: true, n: 3 }, 'eight days away: count goes on');
  a.deepEqual(C.raise(st, '2026-11-25'), { raised: false, n: 3 }, 'a clock turned back does not count again');
  a.equal(st.kN, 3);
});

test('waves count up to 20 a day, then still wave without counting; next day starts over', () => {
  const st = {};
  for (let i = 1; i <= 20; i++) a.deepEqual(C.wave(st, '2026-11-20'), { counted: true, n: i });
  a.deepEqual(C.wave(st, '2026-11-20'), { counted: false, n: 20 });
  a.equal(C.wavesOn(st, '2026-11-20'), 20);
  a.equal(C.wavesOn(st, '2026-11-21'), 0);
  a.deepEqual(C.wave(st, '2026-11-21'), { counted: true, n: 1 });
});

test('voice picker is random but never repeats the one just played', () => {
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const next = C.picker(4, rnd), seen = new Set();
  let last = -1;
  for (let i = 0; i < 2000; i++) { const k = next(); a.ok(k >= 0 && k < 4); a.notEqual(k, last); seen.add(k); last = k; }
  a.equal(seen.size, 4, 'all four voices are used');
  // 극단값(0과 1에 가까운 난수)도 범위 안, 연속 없음
  const edge = C.picker(4, (() => { let t = 0; return () => (t++ % 2 ? 0.9999999 : 0); })());
  let prev = -1;
  for (let i = 0; i < 50; i++) { const k = edge(); a.ok(k >= 0 && k < 4); a.notEqual(k, prev); prev = k; }
});

test('shout board name: nickname only when mayShare() is true, otherwise 독도 친구 (fail closed)', () => {
  a.equal(C.speaker({ mayShare: () => true }, '독코'), '독코');
  a.equal(C.speaker({ mayShare: () => false }, '독코'), '독도 친구');
  a.equal(C.speaker(undefined, '독코'), '독도 친구');
  a.equal(C.speaker({ mayShare: () => { throw Error('x'); } }, '독코'), '독도 친구');
  a.equal(C.speaker({ mayShare: () => 'yes' }, '독코'), '독도 친구');
  a.equal(C.speaker({ mayShare: () => true }, '  '), '독도 친구');
});

test('shout board keeps at most 30 lines in memory', () => {
  const list = [];
  for (let i = 0; i < 45; i++) C.push(list, { t: String(i) });
  a.equal(list.length, 30);
  a.equal(list[0].t, '15');
  a.equal(list[29].t, '44');
});

test('camp flag.js is the national-rule geometry copied from together/flag.js, and camp does not load together/', () => {
  const camp = read('camp/flag.js'), page = read('camp/index.html');
  const body = s => s.slice(s.indexOf('(function(root){'));
  a.equal(body(camp), body(read('together/flag.js')), 'same drawing code');
  a.match(camp, /together\/flag\.js/, 'says where it came from');
  a.doesNotMatch(page, /together\//);
  const F = require('../camp/flag.js'), g = F.geom(200);
  a.equal(g.w / g.h, 1.5); a.equal(g.d, 100); a.equal(g.small * 2, 50);
  a.deepEqual(F.COLOR, { red: '#CD2E3A', blue: '#0047A0', black: '#000000', white: '#FFFFFF' });
});

test('voice files: four, ascii names, played only on press (no preload in the page)', () => {
  for (const f of ['shout-f1.mp3', 'shout-f2.mp3', 'shout-m1.mp3', 'shout-m2.mp3']) {
    const b = fs.readFileSync(path.join(__dirname, '..', 'camp/voice', f));
    a.ok(b.length > 10000 && (b.slice(0, 3).toString() === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)), f);
  }
  a.doesNotMatch(read('camp/index.html'), /shout-[fm]\d\.mp3|<audio/);
  const w = read('camp/wave.js');
  a.equal((w.match(/fetch\(/g) || []).length, 1, 'one fetch, inside load()');
  a.match(w, /function load\(A\)\{if\(asked\)return;asked=true;VOICE\.forEach\(v=>\{buf\[v\]=fetch\(/);
  a.equal((w.match(/\bload\(S\.AC\)/g) || []).length, 1, 'load() only from speak()');
  a.equal((w.match(/\bspeak\(\)/g) || []).length, 2, 'speak() defined once and called once');
  a.match(w, /btn\.onclick=\(\)=>\{[^]*?if\(r\.counted\)speak\(\)/, 'called from the wave button press, only when counted');
  a.doesNotMatch(w, /new Audio\(|preload/);
});
