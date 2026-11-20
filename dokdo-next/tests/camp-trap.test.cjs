'use strict';
// 힐링존 통발: 값은 together/config.js 와 같고(옮겨 적음), 힐링존은 together/ 를 불러오지 않는다.
const test = require('node:test');
const a = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('camp trap values match the TOGETHER config (wait times, catch names and odds)', () => {
  const T = require('../camp/trap.js'), C = require('../together/config.js');
  a.equal(T.TRAP_MINUTES, C.TRAP_MINUTES);
  a.equal(T.FIRST_TRAP_MINUTES, C.FIRST_TRAP_MINUTES);
  a.deepEqual(T.CATCH.map(c => [c.id, c.name, c.rare, c.p]), C.CATCH.map(c => [c.id, c.name, c.rare, c.p]));
  a.ok(Math.abs(T.CATCH.reduce((s, c) => s + c.p, 0) - 1) < 1e-9, 'odds add up to 1');
  for (const c of T.CATCH) a.ok(T.COIN[c.id] > 0, c.id + ' has a coin value');
});

test('the camp page loads its own trap.js before healing.js, never together/', () => {
  const page = read('camp/index.html');
  a.doesNotMatch(page, /together\//);
  a.ok(page.indexOf('src="./trap.js"') > 0 && page.indexOf('src="./trap.js"') < page.indexOf('src="./healing.js"'));
  const js = read('camp/healing.js');
  a.match(js, /window\.DokdoHealTrap/);
  a.match(js, /id='trap-btn'|tb\.id='trap-btn'/);
});

test('camp view controls: +/- distance, sky look, and walking faces forward', () => {
  const page = read('camp/index.html'), js = read('camp/healing.js');
  for (const id of ['z-in', 'z-out', 'z-sky']) a.match(page, new RegExp('id="' + id + '"'));
  a.match(js, /walk\.r=Math\.atan2\(fx,fz\)/, 'the captain faces where they walk');
  a.match(js, /dist=Math\.min\(900,/, 'zoom out far enough for a bird view');
});
