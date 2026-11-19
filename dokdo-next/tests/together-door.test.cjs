'use strict';
// 스쿨 첫 화면의 DOKDO TOGETHER 문: 세 갈래 칸은 그대로 두고 아래 띠로 단다. 닉네임·나라는 어린이 보호 확인을 통과한 때만 주소로.
const test = require('node:test');
const a = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('the school home has one TOGETHER door below the three choices, and the three choices stay', () => {
  const page = read('index.html');
  a.equal((page.match(/id="together-entry"/g) || []).length, 1);
  a.match(page, /<a id="together-entry" class="v3-together" href="\.\/together\/">/);
  const grid = page.indexOf('v3-choice-grid'), camp = page.indexOf('id="camp-entry"'), door = page.indexOf('id="together-entry"'), links = page.indexOf('class="v3-entry-links"');
  a.ok(grid < camp && camp < door && door < links, 'after the camp card, before the live and language links');
  a.match(page, /<svg class="v3-together-flag" viewBox="0 0 36 24" aria-hidden="true"/);
  a.ok((page.match(/fill="#000000"/g) || []).length >= 4, 'the small flag has its four trigrams');
});

test('nickname and country go to TOGETHER only through the same child-protection gate as the camp', () => {
  const js = read('assets/school-v3.js');
  a.match(js, /const campNick=window\.DokdoPrivacy\.mayShare\(\)\?/);
  a.match(js, /const tgCC=campNick&&\/\^\[A-Z\]\{2\}\$\/\.test\(s\.flag\|\|''\)\?s\.flag:'';/);
  a.match(js, /\$\('together-entry'\)\.href='\.\/together\/'\+\(campNick\?'\?nick='\+encodeURIComponent\(campNick\)\+\(tgCC\?'&cc='\+tgCC:''\):''\)/);
  a.match(js, /label\('together-desc','독도 앞바다에 내 배 띄우기','Float your boat by Dokdo'\)/);
});
