'use strict';
// 힐링 공간 크리에이터 모드: 서버가 운영자 계정만 허락하는지, 화면이 기록을 섞지 않는지 본다.
// 운영자 메일 원문은 이 파일에도 두지 않는다. 판정 함수에 시험용 해시를 넣어 시험한다.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const api = require('../../api/camp-creator.js');
const camp = path.join(__dirname, '..', 'camp');
const healing = fs.readFileSync(path.join(camp, 'healing.js'), 'utf8');
const page = fs.readFileSync(path.join(camp, 'index.html'), 'utf8');
const sha = (v) => createHash('sha256').update(v).digest('hex');
const KEYS = { owner: sha('owner-id-1'), ownerEmail: sha('owner@example.test') };
const OK_AT = '2026-11-07T00:00:00Z';

function call(headers, user, status = 200) {
  const original = global.fetch;
  global.fetch = async () => ({ ok: status === 200, json: async () => user });
  const res = {
    code: 200, body: null, headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.code = c; return this; },
    json(b) { this.body = b; return this; },
    end() { return this; }
  };
  return Promise.resolve(api({ method: 'GET', headers }, res)).finally(() => { global.fetch = original; }).then(() => res);
}
const bearer = { authorization: 'Bearer abc.def-ghi_1' };

test('서버 코드에는 운영자 해시 둘만 있고 메일 원문은 없다', () => {
  const src = fs.readFileSync(require.resolve('../../api/camp-creator.js'), 'utf8');
  assert.match(src, /const owner = '[0-9a-f]{64}'/);
  assert.match(src, /const ownerEmail = '[0-9a-f]{64}'/);
  assert.ok(!/[\w.+-]+@[\w-]+\.[\w.]+/.test(src), '메일 주소 형태의 글이 없다');
});

test('판정: 메일 인증을 마친 운영자 계정 번호나 메일만 허락', () => {
  const ok = (u) => api.allowed(u, KEYS);
  assert.equal(ok({ id: 'owner-id-1', email_confirmed_at: OK_AT }), true, '기존 계정 번호 경로');
  assert.equal(ok({ id: 'u-2', email: ' Owner@Example.TEST ', email_confirmed_at: OK_AT }), true, '메일은 대소문자·공백 무시');
  assert.equal(ok({ id: 'owner-id-1', email_confirmed_at: null }), false, '메일 인증 전');
  assert.equal(ok({ id: 'u-2', email: 'owner@example.test' }), false, '인증 시각 없음');
  assert.equal(ok({ id: 'u-3', email: 'o.wner@example.test', email_confirmed_at: OK_AT }), false, '철자가 다른 메일');
  assert.equal(ok({ id: 'u-4', email_confirmed_at: OK_AT }), false, '메일 없음');
  assert.equal(ok({ email: 'owner@example.test', email_confirmed_at: OK_AT }), false, '계정 번호 없음');
  assert.equal(ok(null), false);
});

test('운영 판정값으로는 낯선 계정을 거절', async () => {
  const res = await call(bearer, { id: 'u-9', email: 'someone@example.com', email_confirmed_at: OK_AT });
  assert.equal(res.code, 403);
  assert.equal(res.headers['Cache-Control'], 'private, no-store');
});

test('토큰이 없거나 서버가 세션을 거절하면 401, 응답이 이상하면 503, 다른 방식은 405', async () => {
  assert.equal((await call({}, {})).code, 401);
  assert.equal((await call({ authorization: 'Bearer <x>' }, {})).code, 401);
  assert.equal((await call(bearer, {}, 401)).code, 401);
  assert.equal((await call(bearer, null)).code, 403);
  const res = { code: 0, setHeader() {}, status(c) { this.code = c; return this; }, end() { return this; } };
  await api({ method: 'POST', headers: bearer }, res);
  assert.equal(res.code, 405);
});

test('크리에이터 버튼은 처음에 숨겨져 있고 서버 확인 뒤에만 보인다', () => {
  assert.match(page, /<button id="creator" hidden aria-pressed="false">/);
  assert.match(page, /<div id="cmode" hidden>/);
  assert.match(healing, /fetch\('\/api\/camp-creator',\{headers:\{Authorization:'Bearer '\+tk\},cache:'no-store'\}\)/);
  assert.match(healing, /\.creator===true/);
  assert.ok(!/[?&]creator=|searchParams\.get\('creator'\)/.test(healing), '주소로 켜는 길이 없다');
  assert.equal((healing.match(/creator=true/g) || []).length, 1, '켜는 곳은 한 곳뿐');
  assert.match(healing, /if\(!ownerOK\)return;stBack=JSON\.stringify\(st\);creator=true;/);
});

test('크리에이터 모드 동안은 저장하지 않고, 끄면 원래 기록으로 돌아간다', () => {
  assert.match(healing, /function keep\(\)\{if\(creator\)\{ui\(\);return\}save\(WK/);
  // 저장 키에 쓰는 곳은 keep()과 동기화 하나뿐이고, 동기화도 크리에이터 모드에서는 원래 기록 쪽으로만 합친다.
  assert.equal((healing.match(/save\(WK,/g) || []).length, 2);
  assert.ok(!/localStorage\.setItem\(\s*(WK|'dokdo-heal')/.test(healing));
  assert.match(healing, /if\(creator\)\{try\{const b=JSON\.parse\(stBack\);Object\.assign\(b,v\);stBack=JSON\.stringify\(b\)\}catch\(e\)\{\}return\}/);
  // 되돌리기에 실패하면 크리에이터 값을 실제 기록으로 쓰지 않도록 모드를 끄지 않는다.
  assert.match(healing, /if\(!back\|\|typeof back!=='object'\)\{toast\([^)]*\);return\}creator=false;st=back;/);
});
