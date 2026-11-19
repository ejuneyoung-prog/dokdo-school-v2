'use strict';
// DOKDO TOGETHER(1차 시제품): 계산·이용자 상태·저장소·바다 상태·스쿨 연결·태극기 비율·페이지 규칙.
const test = require('node:test');
const a = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const C = require('../together/config.js');
const U = require('../together/user.js');
const R = require('../together/rules.js');
const F = require('../together/fleet.js');
const S = require('../together/store.js');
const B = require('../together/bridge.js');
const FL = require('../together/flag.js');
const Core = require('../assets/dokdo-core.js');
const H = 3600000, KST = (s) => Date.parse(s + '+09:00');

test('catch table: three common and one rare, probabilities add up to 1, only sourced species', () => {
  a.equal(C.CATCH.filter((c) => !c.rare).length, 3);
  a.equal(C.CATCH.filter((c) => c.rare).length, 1);
  a.ok(Math.abs(C.CATCH.reduce((s, c) => s + c.p, 0) - 1) < 1e-9);
  for (const c of C.CATCH) { a.ok(c.value > 0 && c.src, c.id); }
  a.deepEqual(C.CATCH.map((c) => c.name).sort(), ['가시배새우', '도화새우', '문어', '물렁가시붉은새우'].sort());
  a.ok(!C.CATCH.some((c) => /홍게|대게/.test(c.name)), 'red snow crab is not confirmed near Dokdo and stays out');
  a.equal(C.TRAP_MINUTES, 60);
});

test('ship stages: seven ranks, three built now, grade and price only go up, benefits only get better', () => {
  a.equal(C.SHIPS.length, 7);
  a.deepEqual(C.SHIPS.filter((s) => s.ready).map((s) => s.stage), [1, 2, 3]);
  for (let i = 1; i < C.SHIPS.length; i++) {
    const p = C.SHIPS[i - 1], s = C.SHIPS[i];
    a.ok(R.gradeRank(s.grade) > R.gradeRank(p.grade), s.title + ' needs a higher grade');
    a.ok(s.price > p.price && s.traps > p.traps && s.wait <= p.wait && s.ring <= p.ring, s.title + ' benefits');
  }
  a.equal(C.SHIPS[1].grade, 'M1'); a.equal(C.SHIPS[2].grade, 'U1');
});

test('the grade ladder is the school ladder (same order, aliases read the same)', () => {
  a.deepEqual(R.GRADES, Core.GRADES);
  for (const [old, now] of Object.entries({ CR1: 'DK1', PR1: 'DK6', HEAD: 'DK9' })) a.equal(B.normGrade(old), now);
  a.equal(B.gradeLabel('M1'), '중학 1학년'); a.equal(B.gradeLabel('DK3'), '독코민 Lv.3'); a.equal(B.gradeLabel('nope'), '');
});

test('nickname is the only free text: trimmed, no tags or control characters, 12 letters', () => {
  a.equal(U.cleanNick('  <b>독도\u0007 지킴이</b>  '), 'b독도 지킴이/b');
  a.equal([...U.cleanNick('가'.repeat(30))].length, 12);
  a.equal(U.cleanNick(null), '');
  a.equal(U.cleanCC('zz'), 'KR'); a.equal(U.cleanCC('US'), 'US');
});

test('stored state is cleaned: bad id rejected, stage capped to built ships, big flag needs the rank', () => {
  a.equal(U.tidy({ id: 'x' }), null);
  const st = U.tidy({ id: 's1234abcd', stage: 99, flag: 'l', traps: [1, 2, 3, 4, 'x'], bag: { octopus: 3, gold: 9, mullung: -1 }, money: -5, raised: { days: 3.7, last: 'bad' } });
  a.equal(st.stage, 3); a.equal(st.flag, 'l'); a.equal(st.traps.length, 3); a.deepEqual(st.bag, { octopus: 3 }); a.equal(st.money, 0);
  a.deepEqual(st.raised, { days: 3, last: '' });
  a.equal(U.tidy({ id: 's1234abcd', stage: 1, flag: 'l' }).flag, 'm', 'a new captain cannot keep the big flag');
  a.deepEqual(U.tidy(st).spot, U.spotOf('s1234abcd'), 'the boat comes back to the same spot');
});

test('raising the flag counts once a Korean day, and a missed day never resets the count', () => {
  const st = U.create('선장', 'KR', KST('2026-11-20T08:00'), () => .1);
  a.equal(R.phase(st, KST('2026-11-20T08:00')), 'raise');
  a.ok(R.raise(st, KST('2026-11-20T08:00'))); a.ok(!R.raise(st, KST('2026-11-20T23:59')), 'same day');
  a.ok(R.raise(st, KST('2026-11-21T00:00')), 'new day at midnight in Korea');
  a.ok(R.raise(st, KST('2026-11-25T07:00')), 'after missing days');
  a.equal(st.raised.days, 3);
});

test('waving counts up to the daily cap, then stops counting until tomorrow', () => {
  const st = U.create('선장', 'KR', 0, () => .2), t = KST('2026-11-20T10:00');
  let n = 0; for (let i = 0; i < 50; i++) n += R.wave(st, t);
  a.equal(n, C.WAVE_PER_DAY); a.equal(st.waves.total, C.WAVE_PER_DAY);
  a.equal(R.wave(st, KST('2026-11-21T00:01')), 1);
});

test('trap loop: raise, throw, wait, haul, throw again right away; rank shortens the wait', () => {
  const st = U.create('선장', 'KR', 0, () => .3), t = KST('2026-11-20T09:00');
  a.equal(R.throwTraps(st, t), 0, 'no trap before the flag');
  R.raise(st, t); a.equal(R.phase(st, t), 'throw'); a.equal(R.throwTraps(st, t), 1); a.equal(R.phase(st, t), 'wait');
  a.equal(R.phase(st, t + 59 * 60000), 'wait'); a.equal(R.haul(st, t + 59 * 60000).length, 0);
  a.equal(R.phase(st, t + H), 'haul');
  const got = R.haul(st, t + H, () => .95); a.equal(got.length, 1); a.equal(got[0].id, 'dohwa');
  a.equal(R.phase(st, t + H), 'throw'); a.equal(R.throwTraps(st, t + H), 1);
  st.stage = 3; a.equal(R.slots(st), 3); a.equal(R.WAIT(st), 45 * 60000);
});

test('rolling follows the table boundaries', () => {
  a.equal(R.roll(0).id, 'mullung'); a.equal(R.roll(.319).id, 'mullung'); a.equal(R.roll(.33).id, 'gasibae');
  a.equal(R.roll(.61).id, 'octopus'); a.equal(R.roll(.93).id, 'dohwa'); a.equal(R.roll(1.5).id, 'dohwa'); a.equal(R.roll(NaN).id, 'mullung');
});

test('selling and building: study opens the rank, money builds it', () => {
  const st = U.create('선장', 'KR', 0, () => .4);
  st.bag = { octopus: 2, dohwa: 1 }; a.equal(R.sellAll(st), 80); a.equal(st.money, 80); a.deepEqual(st.bag, {});
  a.deepEqual(R.nextStage(st, 'K').need, ['grade', 'money']);
  st.money = 150; a.deepEqual(R.nextStage(st, 'E6').need, ['grade']);
  a.ok(!R.build(st, 'E6')); a.ok(R.build(st, 'M1')); a.equal(st.stage, 2); a.equal(st.money, 0);
  st.money = 9999; a.ok(!R.build(st, 'H3')); a.ok(R.build(st, 'U1')); a.equal(st.stage, 3);
  a.deepEqual(R.nextStage(st, 'DK12').need, ['later'], 'stage 4 waits for the second round');
});

test('decorating: three flag sizes and three sails, the big flag only from the second rank', () => {
  const st = U.create('선장', 'KR', 0, () => .5);
  a.ok(!R.decorate(st, 'flag', 'l')); a.ok(R.decorate(st, 'flag', 's')); a.ok(R.decorate(st, 'sail', 'wave')); a.ok(!R.decorate(st, 'sail', 'gold'));
  st.stage = 2; a.ok(R.decorate(st, 'flag', 'l'));
  a.equal(R.rank(st, false).title, '독도 선장'); a.equal(R.rank(st, true).title, '명예 선장'); a.equal(R.rank(st, true).ring, 0);
});

test('Taegeukgi proportions follow the National Archives drawing rule', () => {
  const g = FL.geom(200);
  a.equal(g.w / g.h, 1.5); a.equal(g.d, g.h / 2); a.equal(g.small * 2, g.h / 4, 'small semicircles: diameter a quarter of the height');
  a.ok(Math.abs(g.len - g.d / 2) < 1e-9 && Math.abs(g.th - g.d / 3) < 1e-9);
  a.ok(Math.abs(g.bar - g.th / 4) < 1e-9 && Math.abs(g.gap - g.th / 8) < 1e-9);
  a.ok(Math.abs(3 * g.bar + 2 * g.gap - g.th) < 1e-9, 'three bars and two gaps fill the trigram');
  a.ok(Math.abs(g.dist - (g.d / 2 + g.d / 4 + g.th / 2)) < 1e-9, 'a quarter diameter between taegeuk and trigram');
  a.deepEqual(FL.TRIGRAMS, { geon: [1, 1, 1], gon: [0, 0, 0], gam: [0, 1, 0], ri: [1, 0, 1] });
  // 건은 왼쪽 위, 곤은 오른쪽 아래, 감은 오른쪽 위, 이는 왼쪽 아래(캔버스는 y가 아래로)
  const at = (k) => [Math.sign(Math.round(Math.cos(g.dirs[k]) * 1e6)), Math.sign(Math.round(Math.sin(g.dirs[k]) * 1e6))];
  a.deepEqual(at('geon'), [-1, -1]); a.deepEqual(at('gon'), [1, 1]); a.deepEqual(at('gam'), [1, -1]); a.deepEqual(at('ri'), [-1, 1]);
  a.match(read('together/flag.js'), /윗부분 빨강, 아랫부분 파랑/);
});

test('sea layout: higher ranks anchor closer to Dokdo, boats keep apart and stay off the land', () => {
  const list = [{ id: 'me', me: true, stage: 1, spot: { a: 0 } }, { id: 'h', hall: true, stage: 3, spot: { a: 1 } }, { id: 'b', stage: 3, spot: { a: 2 } }, ...S.sampleFleet(40)];
  const blocked = (x, z) => Math.hypot(x, z) < 650 && x > 0 && z > 0;
  const placed = F.layout(list, { cx: 0, cz: 0, base: 600, step: 110, gapMin: 34, blocked });
  const r = (id) => { const p = placed.find((q) => q.id === id); return Math.hypot(p.x, p.z); };
  a.ok(r('h') < r('b') && r('b') < r('me'));
  for (let i = 0; i < placed.length; i++) { a.ok(!blocked(placed[i].x, placed[i].z)); for (let j = 0; j < i; j++) a.ok(Math.hypot(placed[i].x - placed[j].x, placed[i].z - placed[j].z) >= 34 - 1e-6); }
  const { near, far } = F.near(placed, 5000, 5000, 12);
  a.equal(near.length, 12); a.ok(near.some((p) => p.me), 'my boat is always drawn in 3D'); a.equal(far.length, placed.length - 12);
});

test('sample boats are clearly samples and look plausible', () => {
  const f = S.sampleFleet();
  a.equal(f.length, C.SAMPLE_SHIPS); a.deepEqual(S.sampleFleet(), f, 'same every time');
  for (const s of f) { a.ok(s.sample); a.match(s.nick, /^견본 선장 \d+$/); a.ok(s.waves <= s.days * C.WAVE_PER_DAY); a.ok(s.stage >= 1 && s.stage <= 3); }
});

test('local store saves and reads back a cleaned state, and survives a blocked storage', () => {
  const mem = {}, ls = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } };
  const store = S.LocalStore(ls), st = U.create('선장', 'KR', 0, () => .6);
  a.ok(store.save(st)); a.deepEqual(store.load(), st); a.equal(store.kind, 'local');
  mem[C.STORE_KEY] = '{broken'; a.equal(store.load(), null);
  const blocked = S.LocalStore({ getItem() { throw Error('x'); }, setItem() { throw Error('x'); } });
  a.equal(blocked.load(), null); a.equal(blocked.save(st), false);
});

test('school bridge: hall of fame is read-only, cleaned, and a copied nickname alone is not enough', async () => {
  const tops = B.parseTops({ tops: [{ nick: ' 별빛 ', level: 'DK2' }, { nick: '별빛', level: 'DK2' }, { nick: '<img>', level: 'X' }, { nick: '', level: 'K' }, null] });
  a.deepEqual(tops, [{ nick: '별빛', level: 'DK2' }, { nick: 'img', level: '' }]);
  a.deepEqual(B.parseTops({}), []);
  a.ok(B.inHall(tops, '별빛', 'DK5')); a.ok(!B.inHall(tops, '별빛', 'U1'), 'same nickname, lower grade'); a.ok(!B.inHall(tops, 'img', 'DK12'), 'rows without a grade never match');
  // 주소 확인: 운영 Apps Script 주소 모양만 받는다
  globalThis.DOKDO_SITE_CONFIG = { leaderboard: { apiUrl: 'https://evil.example/exec' } }; a.equal(B.apiUrl(), '');
  a.deepEqual(await B.hallOfFame(async () => { throw Error('should not call'); }), { state: 'off', tops: [] });
  globalThis.DOKDO_SITE_CONFIG = { leaderboard: { apiUrl: 'https://script.google.com/macros/s/AKfy_abc-1/exec' } };
  let seen = null; const r = await B.hallOfFame(async (u, o) => { seen = { u, o }; return { ok: true, json: async () => ({ tops: [{ nick: '바다', level: 'PHD2' }] }) }; });
  a.equal(r.state, 'ok'); a.deepEqual(r.tops, [{ nick: '바다', level: 'PHD2' }]);
  a.match(seen.u, /\?tops=1&ts=\d+$/); a.equal(seen.o.method, 'GET'); a.equal(seen.o.credentials, 'omit');
  a.equal((await B.hallOfFame(async () => ({ ok: false }))).state, 'error');
  delete globalThis.DOKDO_SITE_CONFIG;
});

test('school bridge: grade is read from the school record only, nickname only arrives by address and is removed from it', () => {
  const ls = (v) => ({ getItem: (k) => (k === B.SCHOOL_KEY ? v : null) });
  a.equal(B.schoolGrade(ls(JSON.stringify({ grade: 'U2', name: '실명' }))), 'U2');
  a.equal(B.schoolGrade(ls(JSON.stringify({ grade: 'HEAD' }))), 'DK9');
  a.equal(B.schoolGrade(ls('{bad')), 'K'); a.equal(B.schoolGrade(ls(null)), 'K');
  let replaced = '';
  const got = B.incoming({ href: 'https://x.test/dokdo-next/together/?nick=%EB%B0%94%EB%8B%A4&cc=us&k=1#a' }, { replaceState: (_, __, u) => { replaced = u; } });
  a.deepEqual(got, { nick: '바다', cc: 'US' }); a.equal(replaced, '/dokdo-next/together/?k=1#a');
  const src = read('together/bridge.js');
  a.doesNotMatch(src, /setItem|removeItem/, 'never writes the school record');
  a.doesNotMatch(src, /v\.name|v\.nick|v\.flag/, 'reads only the grade from the school record');
});

test('page rules: one CDN (same three.js and hash as the camp), only the hall-of-fame read goes out, nothing posts, no analytics', () => {
  const page = read('together/index.html'), camp = read('camp/index.html');
  const three = /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.160\.0\/build\/three\.min\.js" integrity="([^"]+)"/;
  a.equal(page.match(three)[1], camp.match(three)[1]);
  a.match(page, /connect-src 'self' https:\/\/script\.google\.com https:\/\/script\.googleusercontent\.com https:\/\/\*\.googleusercontent\.com;/);
  a.match(page, /form-action 'none'/); a.match(page, /href="\.\.\/privacy\.html"/); a.match(page, /href="\.\.\/"/);
  a.doesNotMatch(page, /analytics|googletagmanager|gtag|kakao/i);
  const order = ['config.js', 'user.js', 'rules.js', 'fleet.js', 'store.js', 'net.js', 'bridge.js', 'flag.js', 'terrain.js', 'ship.js', 'sea.js', 'share.js', 'app.js'].map((f) => page.indexOf('src="./' + f + '"'));
  a.ok(order.every((v, i) => v > 0 && (i === 0 || v > order[i - 1])), 'scripts load in dependency order');
  for (const f of ['app.js', 'sea.js', 'share.js', 'store.js', 'user.js', 'rules.js', 'fleet.js', 'net.js', 'ship.js', 'flag.js']) {
    const s = read('together/' + f);
    a.doesNotMatch(s, /fetch\(|XMLHttpRequest|sendBeacon|WebSocket|method:'POST'/, f + ' sends nothing');
  }
  a.equal((read('together/bridge.js').match(/fetch/g) || []).length > 0, true);
  a.doesNotMatch(read('together/bridge.js'), /POST|sendBeacon/);
  a.match(read('together/store.js'), /sample:true/);
  a.match(page, /시제품 · 다른 배는 <span id="sample-n">0<\/span>척이 견본입니다/, 'the sample boats are labeled on screen');
});

test('terrain is generated from the camp file, and the camp is not touched by this feature', () => {
  const t = read('together/terrain.js');
  a.match(t, /extract_terrain\.py 가 camp\/healing\.js 에서 그대로 뽑은 생성물/);
  const hb = /const HB=atob\("([A-Za-z0-9+/=]+)"\)/.exec(read('camp/healing.js'))[1];
  a.ok(t.includes('HB:"' + hb + '"'), 'same height data as the camp');
  a.doesNotMatch(read('camp/healing.js'), /together/i);
});
