'use strict';
const { createHash } = require('node:crypto');
const owner = 'c8c8d1e75d436426fe5468dc3e202997eb5b8195f22274f377c4ddf9428d9a92';
// 운영자 메일(인증을 마친 계정만)의 SHA-256. 서버 코드에는 해시만 둡니다.
const ownerEmail = '08ff9596a2e73887cacb0733e4ddc36aff1976fd458bbec91216ffea857e0de1';
const sha = (v) => createHash('sha256').update(v).digest('hex');
// Supabase가 확인해 준 사용자 정보로만 판단합니다. 메일 인증을 마쳐야 하고, 계정 번호나 메일 해시가 정확히 맞아야 합니다.
function allowed(user, keys = { owner, ownerEmail }) {
  if (!user || typeof user !== 'object' || !user.email_confirmed_at || typeof user.id !== 'string') return false;
  const email = typeof user.email === 'string' ? user.email.trim().toLowerCase() : '';
  return sha(user.id) === keys.owner || (email !== '' && sha(email) === keys.ownerEmail);
}
const handler = async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET') return res.status(405).end();
  const token = req.headers.authorization;
  if (!/^Bearer [A-Za-z0-9._-]+$/.test(token || '')) return res.status(401).end();
  try {
    const response = await fetch('https://cqlvhrodebmhxbrhlmzu.supabase.co/auth/v1/user', {
      headers: { Authorization: token, apikey: 'sb_publishable_ZdI6xlAx-wflWEebVpp2tw_-bpfxz_m' },
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) return res.status(401).end();
    const user = await response.json();
    return allowed(user) ? res.json({creator:true}) : res.status(403).end();
  } catch { return res.status(503).end(); }
};
handler.allowed = allowed;
module.exports = handler;
