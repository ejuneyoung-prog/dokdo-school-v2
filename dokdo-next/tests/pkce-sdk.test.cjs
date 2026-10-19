/* Offline verification of the actual vendored SDK, not a fake SDK.
 * Every fetch is replaced by fixture-only responses; no external I/O is made.
 * Run: node --test dokdo-next/tests/pkce-sdk.test.cjs
 * Optional: DOKDO_VENDOR_PATH=/absolute/path/to/supabase-2.118.0.js
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const vendor = process.env.DOKDO_VENDOR_PATH || require('node:path').join(__dirname, '../assets/vendor/supabase-2.118.0.js');

test('SDK 2.118.0 recovery PKCE emits PASSWORD_RECOVERY, consumes verifier, and rejects replay', async () => {
  const values = new Map(), calls = [];
  const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', email: 'fixture@example.invalid' };
  const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  // Deliberately fictional JWT, supplied only by the in-memory HTTP stub.
  const token = b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, aud: 'authenticated' }) + '.RklYVFVSRQ';
  const fakeFetch = async (input, options) => {
    const url = new URL(input), body = JSON.parse(options.body);
    assert.equal(url.origin, 'https://fixture.example');
    calls.push({ path: url.pathname, body });
    if (url.pathname === '/auth/v1/recover') {
      assert.equal(url.searchParams.get('redirect_to'), 'https://school.example/account.html?flow=recovery');
      assert.equal(body.email, user.email);
      assert.equal(body.code_challenge_method, 's256');
      assert.match(body.code_challenge, /^[A-Za-z0-9_-]{43}$/);
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'pkce') {
      assert.equal(body.auth_code, 'FICTIONAL_RECOVERY_CODE');
      assert.ok(body.code_verifier);
      assert.doesNotMatch(body.code_verifier, /\/recovery$/);
      return new Response(JSON.stringify({ access_token: token, refresh_token: 'FICTIONAL_REFRESH_ONLY', expires_in: 3600, token_type: 'bearer', user }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    throw Error('Unexpected fixture request; external network is never called');
  };
  const sandbox = { URL, URLSearchParams, Headers, Request, Response, TextEncoder, TextDecoder, setTimeout, clearTimeout, setInterval, clearInterval, console, crypto: webcrypto, atob, btoa, fetch: fakeFetch };
  vm.runInNewContext(fs.readFileSync(vendor, 'utf8'), sandbox, { filename: 'vendored-supabase-2.118.0.js' });
  const events = [], storage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const client = new sandbox.supabase.AuthClient({ url: 'https://fixture.example/auth/v1', storageKey: 'fixture-session-v2', storage, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false, flowType: 'pkce', fetch: fakeFetch });
  try {
    await client.initialize();
    const watcher = client.onAuthStateChange(event => events.push(event));
    const reset = await client.resetPasswordForEmail(user.email, { redirectTo: 'https://school.example/account.html?flow=recovery' });
    assert.equal(reset.error, null);
    assert.match(JSON.parse(values.get('fixture-session-v2-code-verifier')), /\/recovery$/);
    const exchanged = await client.exchangeCodeForSession('FICTIONAL_RECOVERY_CODE');
    assert.equal(exchanged.error, null);
    assert.equal(exchanged.data.redirectType, 'recovery');
    assert.equal(exchanged.data.user.id, user.id);
    assert.ok(events.includes('PASSWORD_RECOVERY'));
    assert.equal(events.includes('SIGNED_IN'), false);
    assert.equal(values.has('fixture-session-v2-code-verifier'), false);
    const replay = await client.exchangeCodeForSession('FICTIONAL_RECOVERY_CODE');
    assert.ok(replay.error);
    assert.equal(replay.error.name, 'AuthPKCECodeVerifierMissingError');
    assert.equal(calls.filter(call => call.path === '/auth/v1/token').length, 1);
    assert.equal(calls.length, 2);
    watcher.data.subscription.unsubscribe();
  } finally {
    await client.stopAutoRefresh();
  }
});
