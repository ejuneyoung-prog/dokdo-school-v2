'use strict';
// 길잡이 줄: 어느 화면에서든 크고 같은 모양의 '홈' 단추가 있고, 놀이터 아래 화면에는 '← 놀이터'가 함께 있다.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const css = read('assets/wayfinder.css');

test('wayfinder strip is sticky, dark and its buttons are large enough to tap', () => {
  assert.match(css, /\.way\{position:sticky;top:0/);
  assert.match(css, /min-height:46px/);
  assert.match(css, /font:700 17px/);
});

test('every page outside the first screen loads the strip with a home button', () => {
  const pages = { 'games.html': './', 'fishing.html': './', 'typing.html': './', 'privacy.html': './', 'account.html': 'https://dokdo-school-v2.vercel.app/dokdo-next/' };
  for (const [page, home] of Object.entries(pages)) {
    const html = read(page);
    assert.match(html, /<link rel="stylesheet" href="\.\/assets\/wayfinder\.css">/, page + ' loads wayfinder.css');
    assert.ok(html.includes('<nav class="way"'), page + ' has the strip');
    assert.ok(html.includes('<a class="way-home" href="' + home + '"'), page + ' home goes to the first screen');
    assert.ok(html.indexOf('<nav class="way"') < html.indexOf('<main'), page + ' strip comes before the content');
  }
});

test('games below the playground also go one step up to the playground', () => {
  for (const [page, id] of [['fishing.html', 'fish-back-playground'], ['typing.html', 'type-back-playground']]) {
    const html = read(page);
    assert.ok(html.includes('<a class="way-up" href="./games.html" id="' + id + '"'), page);
    assert.equal(html.split('id="' + id + '"').length, 2, page + ' has one way back, not two');
  }
});

test('school app shows the strip away from the first screen and hides it on the first screen and during a lesson', () => {
  const html = read('index.html'), v3 = read('assets/school-v3.js'), v3css = read('assets/school-v3.css');
  assert.match(html, /<nav class="way" id="v3-way" aria-label="길잡이" hidden><button type="button" id="v3-main-home" class="way-home v3-main-home">/);
  assert.match(v3, /\$\('v3-way'\)\.hidden=atGate;/);
  assert.match(v3, /\$\('v3-main-home'\)\.onclick=enterMain/);
  assert.match(v3css, /\.v3-in-lesson #v3-way\{display:none\}/);
  // 채널 화면의 옛 글자 단추는 길잡이 줄과 겹치므로 숨긴다(스크립트가 묶여 있어 지우지는 않음).
  assert.match(html, /id="v3-channel-home" class="text-button v3-main-home" hidden>/);
  assert.doesNotMatch(html.replace(/<button type="button" id="v3-channel-home"[^>]*hidden>[^<]*<\/button>/, ''), /← 메인으로 돌아가기/);
});

test('playground shortcuts list all four games, not only the two older ones', () => {
  const games = read('assets/games.js');
  const quick = games.match(/<nav class="quick-play" aria-label="게임 바로가기">(.*?)<\/nav>/)[1];
  assert.match(quick, /data-launch="blocks"/);
  assert.match(quick, /data-launch="runner"/);
  assert.match(quick, /href="\.\/fishing\.html"/);
  assert.match(quick, /href="\.\/typing\.html"/);
  // 이어 하기 문구가 바로가기 이름을 지우지 않는다.
  assert.match(games, /if\(b\.classList\.contains\('quick'\)\)\{const sub=b\.querySelector\('small'\)/);
});

test('healing space home button goes to the first screen', () => {
  const page = read('camp/index.html'), js = read('camp/healing.js');
  assert.ok(page.includes('<a class="back" href="../" aria-label="홈 · 처음 화면으로">⌂ 홈</a>'));
  assert.doesNotMatch(page + js, /\.\.\/\?area=learn/);
});
