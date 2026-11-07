'use strict';
// 힐링 공간 크리에이터 모드: 서버가 운영자 계정만 허락하는지, 화면이 기록을 섞지 않는지 본다.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const api = require('../../api/camp-creator.js');
const camp = path.join(__dirname, '..', 'camp');
const healing = fs.readFileSync(path.join(camp, 'healing.js'), 'utf8');
const page = fs.readFileSync(path.join(camp, 'index.html'), 'utf8');
const OWNER_MAIL_HASH = '08ff9596a2e73887cacb0733e4ddc36aff1976fd458bbec91216ffea857e0de1';

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
  return Promise.resolve(api({ method: 'GET', headers }, res)).then(() => { global.fetch = original; return res; });
}
const bearer = { authorization: 'Bearer abc.def-ghi_1' };

test('운영자 메일 해시는 메일 원문 없이 코드에 들어 있다', () => {
  const src = fs.readFileSync(require.resolve('../../api/camp-creator.js'), 'utf8');
  assert.ok(src.includes(OWNER_MAIL_HASH));
  assert.ok(!/@gmail\.com/i.test(src));
});

test('인증을 마친 운영자 메일 계정은 크리에이터', async () => {
  const email = ['ejuneyoung', 'gmail.com'].join('@');
  assert.equal(createHash('sha256').update(email).digest('hex'), OWNER_MAIL_HASH);
  const res = await call(bearer, { id: 'u-1', email: ' EJUNEYOUNG@Gmail.com ', email_confirmed_at: '2026-11-07T00:00:00Z' });
  assert.equal(res.code, 200);
  assert.deepEqual(res.body, { creator: true });
  assert.equal(res.headers['Cache-Control'], 'private, no-store');
});

test('메일 인증 전이거나 다른 메일이면 거절', async () => {
  const email = ['ejuneyoung', 'gmail.com'].join('@');
  assert.equal((await call(bearer, { id: 'u-1', email, email_confirmed_at: null })).code, 403);
  assert.equal((await call(bearer, { id: 'u-2', email: 'someone@example.com', email_confirmed_at: '2026-11-07' })).code, 403);
  assert.equal((await call(bearer, { id: 'u-3', email_confirmed_at: '2026-11-07' })).code, 403);
});

test('토큰이 없거나 서버가 세션을 거절하면 401, 다른 방식은 405', async () => {
  assert.equal((await call({}, {})).code, 401);
  assert.equal((await call({ authorization: 'Bearer <x>' }, {})).code, 401);
  assert.equal((await call(bearer, {}, 401)).code, 401);
  const res = { code: 0, setHeader() {}, status(c) { this.code = c; return this; }, end() { return this; } };
  await api({ method: 'POST', headers: bearer }, res);
  assert.equal(res.code, 405);
});

test('크리에이터 버튼은 처음에 숨겨져 있고 서버 확인 뒤에만 보인다', () => {
  assert.match(page, /<button id="creator" hidden aria-pressed="false">/);
  assert.match(page, /<div id="cmode" hidden>/);
  assert.match(healing, /fetch\('\/api\/camp-creator',\{headers:\{Authorization:'Bearer '\+tk\},cache:'no-store'\}\)/);
  assert.match(healing, /\(await r\.json\(\)\)\.creator===true/);
  assert.match(healing, /ownerOK=true;cBtn\.hidden=false/);
  assert.ok(!/creator=true/.test(healing.replace("if(!ownerOK)return;stBack=JSON.stringify(st);creator=true;", '')),
    'creator는 ownerOK 확인 뒤 한 곳에서만 켜진다');
  assert.ok(!/[?&]creator=|searchParams\.get\('creator'\)/.test(healing), '주소로 켜는 길이 없다');
});

test('크리에이터 모드 동안은 저장하지 않고, 끄면 원래 기록으로 돌아간다', () => {
  assert.match(healing, /function keep\(\)\{if\(creator\)\{ui\(\);return\}save\(WK/);
  assert.match(healing, /stBack=JSON\.stringify\(st\)/);
  assert.match(healing, /creator=false;try\{st=JSON\.parse\(stBack\)\}/);
  // 저장 키에 쓰는 곳은 keep()과 동기화 하나뿐이고, 동기화도 크리에이터 모드에서는 원래 기록 쪽으로만 합친다.
  assert.equal((healing.match(/save\(WK,/g) || []).length, 2);
  assert.match(healing, /\{if\(creator\)\{try\{const b=JSON\.parse\(stBack\);Object\.assign\(b,v\);stBack=JSON\.stringify\(b\)\}catch\(e\)\{\}return\}Object\.assign\(st,v\);/);
});
