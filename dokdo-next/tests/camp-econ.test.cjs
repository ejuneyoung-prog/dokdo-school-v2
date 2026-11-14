'use strict';
// 힐링 2·3단계 계산: 레벨 곡선, 하루 상한, 장소 열림, 환영 선물, 낚시·교환·요리.
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../camp/heal-econ.js');
const F = require('../assets/fishing.js');

const fresh = () => E.tidy({ c: 0, t: 0, own: 0, on: 0, pass: 0, seen: [] });
const D = '2026-11-08';

test('level curve is 60×(L-1)² as approved', () => {
  assert.deepEqual([2, 5, 10, 20, 50].map(E.xpFor), [60, 960, 4860, 21660, 144060]);
  assert.equal(E.levelOf(0), 1);
  assert.equal(E.levelOf(59), 1);
  assert.equal(E.levelOf(60), 2);
  for (let L = 1; L <= 120; L++) { assert.equal(E.levelOf(E.xpFor(L)), L); assert.equal(E.levelOf(E.xpFor(L) - 1), Math.max(1, L - 1)); }
});

test('past school XP counts toward the level and is only read', () => {
  const school = { xp: 970, m: {} }, raw = JSON.stringify(school);
  assert.equal(E.schoolXp(raw), 970);
  assert.equal(E.schoolXp(school), 970);
  assert.equal(raw, JSON.stringify(school), 'school record untouched');
  for (const bad of [null, '', '{', '{"xp":-5}', '{"xp":"9"}', { xp: NaN }]) assert.equal(E.schoolXp(bad), 0);
  const st = fresh();
  assert.equal(E.level(st, 970).L, 5);
});

test('daily caps: games 100, cleanup 50, reset on the next Korean day', () => {
  const st = fresh();
  let g = 0; for (let i = 0; i < 50; i++) g += E.earn(st, 'game', 7, D);
  assert.equal(g, 100);
  let c = 0; for (let i = 0; i < 30; i++) c += E.pickup(st, D);
  assert.equal(c, 50);
  assert.equal(st.hx, 150);
  assert.equal(E.earn(st, 'game', 10, '2026-11-09'), 10);
  assert.equal(E.pickup(st, '2026-11-09'), 5);
  assert.equal(E.kstDay(Date.parse('2026-11-08T15:30:00Z')), '2026-11-09', 'Korean midnight');
});

test('places open by level, and places already bought stay open', () => {
  assert.deepEqual(E.PLACES.map((p) => [p[0], p[1]]), [['sea', 1], ['dock', 5], ['stay', 10], ['camp', 20]]);
  assert.ok(E.open('sea', 1, 0));
  assert.ok(!E.open('dock', 4, 0));
  assert.ok(E.open('dock', 5, 0));
  assert.ok(!E.open('stay', 9, 0));
  assert.ok(E.open('stay', 1, 2), 'bought 서도 before stays open');
  assert.ok(E.open('camp', 1, 1), 'bought 동도 정상 before stays open');
  assert.ok(E.open('dock', 1, 2) && E.open('dock', 1, 1), 'anyone who bought a place in phase 1 also has the lower 선착장');
  assert.equal(E.nextPlace(1, 0)[0], 'dock');
  assert.equal(E.nextPlace(5, 0)[0], 'stay');
  assert.equal(E.nextPlace(5, 2)[0], 'camp');
  assert.equal(E.nextPlace(1, 2)[0], 'camp');
  assert.equal(E.nextPlace(20, 0), null);
});

test('welcome gift is 100 대황 once, and 대황 is separate from the level', () => {
  const st = fresh();
  assert.equal(E.welcome(st), 100);
  assert.equal(E.welcome(st), 0);
  assert.equal(st.c, 100);
  assert.equal(st.hx, 0, '대황 does not raise the level');
});

test('old phase-1 saves load without losing anything', () => {
  const old = { c: 37, t: 52, own: 3, on: 1, pass: 2, seen: ['선착장'], qD: '2026-11-07', qN: 2, rD: '', rN: 0 };
  const st = E.tidy({ ...old });
  for (const k of Object.keys(old)) assert.deepEqual(st[k], old[k], k);
  assert.deepEqual(st.fish, {});
  const bad = E.tidy({ fish: { jari: 2, '<img>': 3, sora: -1, malj: 1.5 }, hx: -9 });
  assert.deepEqual(bad.fish, { jari: 2 });
  assert.equal(bad.hx, 0);
});

test('fishing pool uses the checked fishing data: fish, shellfish and 대황·감태; no juveniles, deep shrimp, protected coral or unsourced 미역', () => {
  const list = E.pool(F.SP, F.starsOf);
  assert.equal(list.length, E.FISH_IDS.length);
  for (const f of list) {
    const s = F.SP.find((x) => x.id === f.id);
    assert.equal(f.name, s.name);
    assert.ok(['A', 'B', 'C'].includes(s.zone), f.id);
    assert.ok(!/어린/.test(s.name), f.id);
    assert.ok(['fish', 'shell', 'conch', 'weed'].includes(s.kind), f.id);
    assert.ok(s.src && s.src.length, f.id + ' has a source');
    assert.ok(f.star >= 1 && f.star <= 5);
  }
  assert.ok(list.some((f) => f.id === 'daehwang') && list.some((f) => f.id === 'gamtae') && list.some((f) => f.id === 'jeonbok'));
  assert.ok(!list.some((f) => /미역/.test(f.name)));
  // 드문 것일수록 덜 나온다
  const n = {}; for (let i = 0; i < 10000; i++) { const f = E.pick(list, i / 10000); n[f.star] = (n[f.star] || 0) + 1; }
  const stars = Object.keys(n).map(Number).sort();
  assert.ok(n[stars[0]] > n[stars[stars.length - 1]]);
});

test('ten catches a day, exchange and cooking', () => {
  const st = fresh(), list = E.pool(F.SP, F.starsOf), jari = list.find((f) => f.id === 'jari');
  let got = 0; for (let i = 0; i < 15; i++) if (E.land(st, jari, D)) got++;
  assert.equal(got, E.CATCH_DAY);
  assert.equal(E.catchesLeft(st, D), 0);
  assert.equal(E.catchesLeft(st, '2026-11-09'), E.CATCH_DAY);
  assert.equal(st.fish.jari, 10);
  assert.equal(E.sell(st, jari), E.SELL[jari.star]);
  assert.equal(st.fish.jari, 9);
  // 모닥불 없이는 구이만, 모닥불이 있으면 매운탕까지
  // 요리 자리: 동도 선착장과 동도 정상 캠핑(11/08 교수님 승인)
  assert.deepEqual(E.COOK_AT, ['dock', 'camp']);
  assert.deepEqual(E.menu(0).map((m) => m.id), ['grill']);
  assert.deepEqual(E.menu(1).map((m) => m.id), ['grill', 'stew']);
  const grill = E.MENU[0], stew = E.MENU[1];
  assert.equal(E.cook(st, jari, stew, 0, '2026-11-09'), null, 'no stew without the fire');
  const r = E.cook(st, jari, grill, 0, '2026-11-09');
  assert.equal(r.name, '자리돔 구이');
  assert.equal(st.fish.jari, 8);
  assert.equal(E.cook(st, jari, stew, 1, '2026-11-09').name, '자리돔 매운탕');
  assert.equal(st.fish.jari, 6);
  const empty = fresh();
  assert.equal(E.sell(empty, jari), 0);
  assert.equal(E.cook(empty, jari, grill, 0, D), null);
});

test('healing page loads the fishing data and the calculator before healing.js and uses them', () => {
  const fs = require('node:fs'), path = require('node:path');
  const page = fs.readFileSync(path.join(__dirname, '..', 'camp', 'index.html'), 'utf8');
  const js = fs.readFileSync(path.join(__dirname, '..', 'camp', 'healing.js'), 'utf8');
  const at = (f) => page.indexOf(f);
  assert.ok(at('../assets/fishing.js') > 0 && at('../assets/fishing.js') < at('./healing.js'));
  assert.ok(at('./heal-econ.js') > 0 && at('./heal-econ.js') < at('./healing.js'));
  assert.match(js, /const EC=window\.DokdoHealEcon,FD=window\.DokdoFishing;EC\.tidy\(st\)/);
  assert.match(js, /const opened=m=>creator\|\|!PASS\[m\]\|\|EC\.open\(m,LV\(\)\.L,st\.pass\)/);
  // 배움터 기록은 읽기만 한다
  assert.doesNotMatch(js, /save\('dokdo-korea-school-cinematic-v1'/);
  assert.doesNotMatch(js, /localStorage\.setItem\('dokdo-korea-school-cinematic-v1'/);
  // 동도 선착장 자리와 메뉴
  for (const id of ['e-dock', 'v-dock']) assert.ok(page.includes('id="' + id + '"'), id);
  assert.ok(page.includes('<button data-d="f" aria-selected="false">낚시·교환소</button>'));
});

test('lesson result offers one line to go to Dokdo, separate from the playground action', () => {
  const fs = require('node:fs'), path = require('node:path');
  const v3 = fs.readFileSync(path.join(__dirname, '..', 'assets', 'school-v3.js'), 'utf8');
  assert.match(v3, /sea\.className='v3-result-sea'/);
  assert.match(v3, /sea\.href=live\?'\.\/camp\/':'https:\/\/dokdo-school-v2\.vercel\.app\/dokdo-next\/camp\/'/);
});

test('대황 becomes currency right away; 감태 goes to the exchange; seaweed is not cooked', () => {
  const st = fresh(), list = E.pool(F.SP, F.starsOf), dh = list.find((f) => f.id === 'daehwang'), gt = list.find((f) => f.id === 'gamtae');
  const r = E.land(st, dh, D);
  assert.equal(r.coin, 1);
  assert.equal(st.fish.daehwang, undefined, 'not stored');
  assert.equal(E.land(st, gt, D).coin, 0);
  assert.equal(st.fish.gamtae, 1);
  assert.equal(E.unit(gt), '묶음');
  assert.equal(E.cook(st, gt, E.MENU[0], 1, D), null);
  assert.equal(E.sell(st, gt), E.SELL[gt.star]);
});
