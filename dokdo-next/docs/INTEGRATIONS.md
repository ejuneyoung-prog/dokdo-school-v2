# Integrations status

`configured` (a value/URL is present) and `connected` (a real request to it has actually
succeeded) are reported separately below. Nothing here is marked connected without a live
request that this session actually made and observed.

## 1. Share image (OG/Twitter)

- **Configured & locally verified.** `index.html` now has a full `og:*`/`twitter:*` set,
  `rel=canonical`, pointing at `https://dokdo-school-v2.vercel.app/dokdo-next/` and
  `.../assets/share/dokdo-main-96151b75db9b.jpg`.
- That domain is not a guess: it's the "Domains" value shown on this session's own Vercel
  project dashboard earlier in this conversation, for the project this repo's `main` branch
  deploys to. It was not invented.
- `tools/check_share.py --site-root dokdo-next --public-url https://dokdo-school-v2.vercel.app/dokdo-next/ --entry index.html=ko`
  → **PASS** locally (correct field count, image hash matches the handoff manifest).
- **NOT_RUN: the `--online` crawl check** (`check_share.py ... --online`) and an actual KakaoTalk
  link-paste test. Both require the change to actually be live on that URL first. This session
  edited working-tree files and ran a local static server; it did not push or deploy anything.
- **Operator action after deploy:** open `https://dokdo-school-v2.vercel.app/dokdo-next/` and
  view-source to confirm the tags survive the Vercel static build untouched, then paste the link
  in an actual KakaoTalk chat (SHARE04) and run the online `check_share.py` pass.
- No Kakao **SDK** share button exists in this repo (no JS key configured anywhere, and
  `script-src 'self'` in the CSP would block Kakao's CDN as-is). Link-paste sharing (which is
  what OG tags serve) does not need the SDK; a native "카카오톡 공유하기" button does, and would
  need: a Kakao Developers JS key from the operator, a CSP `script-src` addition for
  `t1.kakaocdn.net` (or wherever Kakao's current SDK host is), and a share button wired to
  `Kakao.Share.sendDefault`. Not built this pass — flagged, not silently skipped.

## 2. Hall of fame / weekly leaderboard / school rankings

- **Configured with a real, operator-supplied URL** (2026-09-12): `assets/site-config.js` →
  `leaderboard.apiUrl` is now the operator's actual deployed Apps Script web app
  (`.../macros/s/AKfycbxh.../exec`, not the private script-editor URL first shared — that
  distinction was clarified with the operator before this was wired in). `connect-src` in the
  CSP now includes `https://script.google.com`, `https://script.googleusercontent.com` and
  `https://*.googleusercontent.com` (the last two because Apps Script's `ContentService`
  redirects responses to a one-time googleusercontent.com URL — `docs/SOURCES.md` S4).
- `assets/leaderboard.js` implements `fetchWeekly` (`GET ?ts=`), `fetchLive` (`GET ?live=1&ts=`),
  `postEvent` (`POST {t:'a',...}`, `no-cors`), and now also `loadProgress`/`saveProgress`
  (`GET ?load=<key>` / `POST {t:'save',key,nick,grade,payload}`), all matching
  `docs/02-LEGACY-API-CONTRACT.ko.md` exactly, including its documented rough edges (the
  20,000-row read window, `people_week` being a truncated count, the `no-cors` opaque-response
  problem — UI text explicitly says "sent" never "saved").
- **`postEvent` is now actually called** from the answer flow (`choose()` in `app.js`), sending
  `{nick,flag,grade,qid,ok,run,best,mode,school,schoolCode,schoolCat}` on every answered
  question, fire-and-forget (never blocks the lesson UI, never marked as confirmed-saved).
- **Still NOT_RUN in this session, and can't be:** an actual round-trip against that URL. This
  sandbox's network egress policy blocks `script.google.com` outright (`curl` → `403 CONNECT
  tunnel failed`, confirmed directly, independent of the app). **This is a constraint of this
  coding session only** — a real visitor's own browser, hitting the deployed Vercel site, is not
  behind this proxy and should reach the URL normally. What this session verified instead:
  1. The client fails **gracefully** when the network is unreachable: manually exercising
     `renderHall()` in this sandbox against the real URL produced the intended `hall-error`
     state with a readable message, not a crash or fake empty board (screenshot:
     `hall-real-attempt.png`).
  2. A render-path smoke test against the handoff's synthetic `fixtures/feed.valid.json` (stubbing
     `fetchWeekly`) still renders correctly end to end.
  3. `npm test` (156/156) and `tools/check_site.py` (80/80, both updated for this integration —
     see below) still pass.
  None of that is HALL01. **The operator (or anyone on a normal network) still needs to open the
  deployed site and confirm real data actually appears and updates**, ideally right after
  deploying this branch.
- `tools/check_site.py` had two static guards that predate this feature and would now always
  fail it by design (`allows only fixed weather endpoint`, `no hardcoded legacy Apps Script
  endpoints`). Both were rewritten rather than deleted or ignored: the CSP check now verifies
  every `connect-src` token is on an explicit allowlist (still fails on anything unexpected, e.g.
  a wildcard `*` or a new random domain), and the endpoint check now verifies the Apps Script
  URL pattern appears **only** in `assets/site-config.js` (the designated config file) and
  nowhere else in the JS bundle — same guarantee (no accidental hardcoding elsewhere), updated
  scope.
- Broadcast pages (`hall.html`/`live.html` equivalents, OBS `bg/scale/rows/only` params) were not
  built this pass — see FEATURE-PARITY.md for that scope decision.
- **Security note passed on to the operator, not resolved by this session:** this Apps Script
  URL, once public, can be called by anyone who has it (including your own crawlable JS bundle).
  Whether it can be abused (spamming `t:'a'` events, or the `load`/`save` endpoints) is fully
  governed by whatever validation exists in `Code.gs` on your side, which this session has not
  seen the current source of and cannot audit. `docs/02` section 4 lists the specific risks
  (unbounded event volume, `payload.slice(0,45000)` truncation, nickname-only ownership) worth
  checking in your own script before wide release.

## 2b. Country flag, school affiliation, nickname+code recovery (approved by operator 2026-09-12)

- Added to the age/profile dialog: a country select (with a manual ISO-2 code fallback for
  "기타"), a school-category select (E/M/H/W matching the legacy hall-of-fame sections), and a
  free-text school/organisation name field. These map onto `flag`/`school`/`schoolCat` fields
  that already existed as dead, unused defaults in `app-model.js`'s state shape (`flag:'KR'`,
  `school:''`) — this reused rather than reinvented that part of the schema. `schoolCat` and a
  new `recoveryCode` field were added to the validated state shape in `dokdo-core.js` and to
  `fresh()`/`ensure()` in `app-model.js`, with a backfill path for existing saved states that
  predate these fields.
- **Recovery code:** a random 4-digit code is generated once, the first time a profile is saved,
  and never regenerated after that. The records screen shows it as `별명#코드` and a "서버로 백업
  전송" button sends the current backup text to `saveProgress(key, ...)` where `key =
  nickname#code`; a matching "다른 기기 기록 불러오기" form calls `loadProgress(key)` and — on a
  hit — routes the result through the **existing** file-import preview/confirm flow
  (`M.parseImport` + `showImport()`), so a server-sourced record is previewed and requires
  explicit confirmation before it can overwrite anything on this device, exactly like a JSON
  file import already did. Nothing auto-overwrites.
- This is intentionally the *loose* version of "same nickname pulls in your record" the operator
  originally asked for (item 3 in their list): a nickname alone is not the key, the 4-digit code
  is required too, matching the legacy "별명#4자리" pattern the operator explicitly approved.
  It is still not a real authentication system — doc02's warning stands: this only stops casual
  collisions, not a determined person guessing a 4-digit code for a known nickname.
- Not tested against the real server for the same sandbox-network reason as section 2. Locally
  verified: profile save round-trips flag/school/schoolCat/recoveryCode through `localStorage`
  correctly (screenshot: `age-dialog-filled.png`, `records-cloud.png`), and `npm test` still
  passes (state-shape validation exercised indirectly by the full suite).

## 2c. YouTube (operator items 7 & 9) — blocked, needs a different source

- Not built. The operator's `dokdo-korea-school-final-v1.zip` (sent as the reference for this)
  turned out to be an **older dokdo-next snapshot (package.json version 1.1.0)** that predates
  weather/solar/journey/site-config/hall-of-fame — it contains no `youtube`/`유튜브`/livestream
  reference anywhere (checked by grep across the whole archive). It looks like the wrong file
  for this purpose, not a partial spec.
- This feature was never in `dokdo-claude-handoff`'s docs either, so it was correctly out of
  scope for the original task, not an oversight.
- **Needed from the operator to proceed:** either (a) the actual source of the live
  `dokdo-school.vercel.app` root site (outside this repo's scope) where this feature currently
  lives, or (b) simpler — just the "독도코리아" channel handle/ID and, for the "random video"
  behaviour, either permission to call the YouTube Data API (needs a Google Cloud API key with
  its own quota/exposure considerations) or a hand-picked list of video IDs to randomize
  client-side with no key at all (cheaper, recommended). For "실시간 보러가기", a single link
  (channel's live tab, or a specific stream URL) is enough.

## 3. Weather

- Code unchanged this pass. Still Open-Meteo, gated by `nonCommercialConfirmed:false`, still
  fails closed (shows connection status, never fabricates "clear weather").
- **Operator clarification (2026-09-12):** they obtained a real 기상청 (KMA) service key, but a
  previous developer could not get it integrated and fell back to Open-Meteo instead — which is
  the Open-Meteo code currently in this repo. Two things need the operator's input before this
  can move:
  1. **Which exact 기상청 service?** KMA publishes many different data.go.kr endpoints (short-
     term forecast, ultra-short-term nowcast, weather warnings, etc.) — this is also a different
     agency from the KHOA (국립해양조사원) Ulleungdo observation endpoint that
     `docs/02-LEGACY-API-CONTRACT.ko.md` documents as the *original* legacy provider. These are
     three different things (KMA / KHOA / Open-Meteo) and this session should not guess which
     one the operator means.
  2. **Where the key can safely live.** data.go.kr-style service keys are generally meant to be
     called server-side; putting one directly into this repo's public client-side JS would
     expose it to anyone viewing the page source (and to quota theft / abuse), the same class of
     problem `docs/05-ACCEPTANCE.ko.md` (API06) flags for secrets in a JS bundle. This static
     site has no server component today. Options, once the operator confirms which service:
     a small Vercel serverless function (or the existing Apps Script) proxying the call so the
     key never reaches the browser, or accepting the exposure if the operator's KMA service
     permits public client-side keys (worth confirming with data.go.kr's own terms, not assumed
     here).
  Waiting on the operator's answer to both before writing any weather integration code, rather
  than guessing an endpoint or pasting a key into a public file.

## 4. Fonts (VIS02)

- **Configuration verified, live load NOT verified in this session.** `app.css` already declares
  GmarketSans/SCoreDream via `@font-face` from `cdn.jsdelivr.net`, `font-display:swap`, with the
  correct system-font fallback chain, and the CSP already allows `font-src ... cdn.jsdelivr.net`.
  Nothing needed to change here — this was already correct.
- Actually loading them in this sandboxed session failed: `document.fonts` reported `status:
  "error"` for all four faces, and a direct `curl` to `cdn.jsdelivr.net` through this session's
  network proxy returned `403 (organization policy)`. **This is this sandbox's own egress
  policy, confirmed independently of the app** — not evidence of a real bug. A real browser on a
  normal network (or the Vercel-deployed site) was not tested here.
- **Operator action:** open the deployed site in an actual browser and confirm
  `document.fonts` shows `loaded` for GmarketSans/SCoreDream, per VIS02. If jsDelivr access is
  ever unreliable for real users too, self-hosting the two woff files under `assets/` would
  remove the external dependency entirely — a possible future improvement, not done here.

## 5. Everything else in `docs/05-ACCEPTANCE.ko.md`

API02–API07 (CORS/idempotency/auth/input-safety/secrets/backup-integrity), HALL04–HALL06
(scale, failure states, live-feed correctness), WX02, VIS03/05/06, EDU01–03, OPS01/02: **NOT_RUN**.
Nearly all of them require either a real backend connection or a real device/browser this
session does not have. None are claimed as passed.
