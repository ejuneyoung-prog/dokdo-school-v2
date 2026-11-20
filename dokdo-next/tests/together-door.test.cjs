'use strict';
// 스쿨 첫 화면의 DOKDO TOGETHER 문: 11/20 교수님 지시로 첫 화면 띠는 뺐다(./together/ 페이지는 그대로). 주소를 건네는 코드는 문이 다시 생겨도 같은 원칙을 지키도록 남긴다.
const test = require('node:test');
const a = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('the school home no longer shows the TOGETHER door, and the healing card leads the three choices (11/20)', () => {
  const page = read('index.html');
  a.equal((page.match(/id="together-entry"/g) || []).length, 0, 'the band below the choices was removed');
  const grid = page.indexOf('v3-choice-grid'), camp = page.indexOf('id="camp-entry"'), learn = page.indexOf('id="v3-enter-learn"'), play = page.indexOf('id="v3-enter-play"');
  a.ok(grid < camp && camp < learn && learn < play, 'healing first, then learning and playground');
  a.match(page, /<span aria-hidden="true" class="v3-choice-art camp-art"><img src="\.\/assets\/heal-scene\.jpg" alt=""/);
  a.ok(fs.existsSync(path.join(__dirname, '..', 'assets', 'heal-scene.jpg')), 'the scene picture ships with the page');
});

test('nickname and country go to TOGETHER only through the same child-protection gate as the camp', () => {
  const js = read('assets/school-v3.js');
  a.match(js, /const campNick=window\.DokdoPrivacy\.mayShare\(\)\?/);
  a.match(js, /const tgCC=campNick&&\/\^\[A-Z\]\{2\}\$\/\.test\(s\.flag\|\|''\)\?s\.flag:'';/);
  a.match(js, /\$\('together-entry'\)\.href='\.\/together\/'\+\(campNick\?'#nick='\+encodeURIComponent\(campNick\)\+\(tgCC\?'&cc='\+tgCC:''\):''\)/, 'in the hash, which never reaches the server logs');
  a.match(js, /label\('together-desc','독도 앞바다에 내 배 띄우기','Your own boat by Dokdo \(in Korean\)'\)/, 'the page is Korean only, so the English door says so');
});
