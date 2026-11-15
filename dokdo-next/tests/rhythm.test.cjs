'use strict';
// 독도 리듬 놀이(시제품): 판정·점수 규칙, 노트 파일, 화면이 아무것도 보내지 않는지.
const test = require('node:test');
const a = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const R = require('../assets/rhythm.js');
const CHARTS = require('../assets/rhythm-charts.js');

test('timing windows: perfect 45ms, great 90ms, good 135ms, otherwise no hit', () => {
  a.equal(R.judge(0), 'perfect'); a.equal(R.judge(-45), 'perfect'); a.equal(R.judge(46), 'great');
  a.equal(R.judge(-90), 'great'); a.equal(R.judge(120), 'good'); a.equal(R.judge(136), null); a.equal(R.judge(-500), null);
});

test('score is out of 1,000,000 and a hold counts head and tail', () => {
  const notes = [[1000, 0, 0], [2000, 1, 800]];
  a.equal(R.totalOf(notes), 3);
  a.equal(R.scoreOf({ perfect: 3, great: 0, good: 0, miss: 0 }, 3), 1000000);
  a.equal(R.scoreOf({ perfect: 0, great: 0, good: 0, miss: 3 }, 3), 0);
  a.equal(R.accuracy({ perfect: 1, great: 1, good: 1, miss: 1 }, 4), 50);
  a.equal(R.gradeOf(100, { perfect: 3, great: 0, good: 0, miss: 0 }), 'S+');
  a.equal(R.gradeOf(96, { perfect: 2, great: 1, good: 0, miss: 0 }), 'S');
  a.equal(R.gradeOf(69, null), 'D');
});

test('a run judges presses by lane, misses late notes, and checks hold release', () => {
  const run = R.createRun([[1000, 0, 0], [1500, 1, 0], [2000, 2, 1000], [3500, 3, 600]]);
  a.equal(run.press(0, 1010), 'perfect');
  a.equal(run.press(0, 1020), null, 'same note is not hit twice');
  a.equal(run.press(3, 1500), null, 'wrong lane does nothing');
  run.tick(1700); a.equal(run.counts.miss, 1, 'lane 1 passed the line');
  a.equal(run.press(2, 2060), 'great');
  run.release(2, 2500); a.equal(run.counts.miss, 2, 'hold let go too early');
  a.equal(run.press(3, 3500), 'perfect'); run.tick(4100); a.equal(run.counts.perfect, 3, 'hold kept to the end');
  a.equal(run.maxCombo, 2);
  a.ok(!run.done(4100)); a.ok(run.done(4500));
});

test('every chart is sorted, in four lanes, inside the song and playable', () => {
  a.equal(CHARTS.length, 3);
  const songs = read('assets/site-config.js');
  for (const s of CHARTS) {
    a.match(s.id, /^[a-z]{2,20}$/);
    a.ok(fs.existsSync(path.join(ROOT, s.file)), s.file);
    a.ok(songs.includes("f:'" + s.file + "',t:'" + s.title.replace(/'/g, "\\'") + "'") || songs.includes('f:\'' + s.file + '\',t:"' + s.title + '"'), s.title + ' keeps the app title of the same file');
    for (const lv of ['easy', 'normal']) {
      const n = s[lv];
      a.ok(R.validChart(n, s.duration), s.id + ' ' + lv);
      const perSec = n.length / (s.duration / 1000);
      a.ok(perSec > 0.4 && perSec < 3, s.id + ' ' + lv + ' density ' + perSec.toFixed(2));
      for (let i = 1; i < n.length; i++) {
        if (n[i][1] !== n[i - 1][1]) continue;
        a.ok(n[i][0] >= n[i - 1][0] + n[i - 1][2] + 100, s.id + ' ' + lv + ' notes in one lane do not overlap at ' + n[i][0]);
      }
      a.ok(n[0][0] >= 1000, 'first note leaves time to get ready');
    }
    a.ok(s.easy.length < s.normal.length, 'easy has fewer notes');
    for (const lv of ['easy', 'normal']) {
      const n = s[lv], per = [0, 1, 2, 3].map((l) => n.filter((x) => x[1] === l).length / n.length);
      a.ok(per.every((p) => p >= 0.15), s.id + ' ' + lv + ' uses all four lanes ' + per.map((p) => p.toFixed(2)));
    }
    a.ok(s.easy.filter((x) => x[2] > 0).length / s.easy.length <= 0.2, s.id + ' easy keeps long notes rare');
  }
});

test('charts are generated, not hand edited', () => {
  const src = read('assets/rhythm-charts.js');
  a.match(src, /tools\/rhythm\/make_chart\.py 가 만든 생성물/);
  a.ok(fs.existsSync(path.join(ROOT, 'tools/rhythm/make_chart.py')));
});

test('rhythm page sends nothing: no analytics, no outside hosts, records only on this device', () => {
  const page = read('rhythm.html'), js = read('assets/rhythm.js');
  a.doesNotMatch(page, /analytics|googletagmanager|google-analytics|kakao/i);
  a.match(page, /connect-src 'self';/);
  a.match(page, /script-src 'self';/);
  a.match(page, /href="\.\/privacy\.html"/);
  a.ok(page.includes('src="./assets/ui-language.js"') && page.includes('data-language-toggle'));
  a.doesNotMatch(js, /https?:\/\//);
  a.doesNotMatch(js, /DokdoAnalytics|sendBeacon|XMLHttpRequest/);
  a.match(js, /dk-rhythm-best-v1/);
  a.doesNotMatch(js, /dokdo-korea-school-cinematic-v1/, 'does not touch the school record');
});

test('stored records and settings are cleaned before use', () => {
  a.deepEqual(R.cleanPrefs({ level: 'hard', speed: 'warp', offset: 999, song: 7 }), { level: 'easy', speed: 'mid', offset: 200, song: '' });
  a.deepEqual(R.cleanBest({ letsmove: { easy: { score: 5, acc: 50, grade: 'D', combo: 3 }, normal: { score: -1, acc: 1 } }, '<x>': {} }), { letsmove: { easy: { score: 5, acc: 50, grade: 'D', combo: 3 } } });
  const mem = {}, st = R.createStore({ getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } });
  st.set('k', { a: 1 }); a.deepEqual(st.get('k', null), { a: 1 });
  const broken = R.createStore({ getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } });
  a.equal(broken.get('k', 'd'), 'd'); a.equal(broken.set('k', 1), false);
});

test('playground lists the rhythm game as a plain link', () => {
  const games = read('assets/games.js');
  a.match(games, /<a class="quick q-rhythm" href="\.\/rhythm\.html">/);
  a.match(games, /href="\.\/rhythm\.html" id="rhythm-card-link"/);
  const lang = read('assets/ui-language.js');
  for (const k of ['독도 리듬 놀이', '리듬 놀이 시작', '자유 놀이 · 시제품']) a.ok(lang.includes('"' + k + '"'), k);
});

test('during play the rest of the page is inert, pausing lets go of held lanes, Space cannot restart', () => {
  const js = read('assets/rhythm.js'), page = read('rhythm.html');
  a.match(page, /<canvas id="board" tabindex="-1"/);
  a.match(js, /function setInert\(on\)/);
  a.match(js, /function pause\(\)\{if\(!playing\|\|paused\)return;releaseAll\(\);/);
  a.match(js, /if\(loading\|\|playing\)return;/);
  a.match(page, /data-en="With Bluetooth earphones, if the lights reach the line before the sound, press \+/);
});
