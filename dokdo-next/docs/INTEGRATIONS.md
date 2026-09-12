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

## 2c. YouTube (operator items 7 & 9) — resolved, see section 7

- Originally blocked: the operator's `dokdo-korea-school-final-v1.zip` turned out to be an
  older dokdo-next snapshot (package.json 1.1.0, predating weather/solar/journey/hall-of-fame)
  with no YouTube code in it at all — the wrong reference file, not a partial spec.
- Resolved once the operator's proper V1 handoff document supplied the real channel handle,
  live URL, and video ids directly. **See section 7 below for what was actually built.**

## 3. Weather

- Code unchanged this pass. Still Open-Meteo, gated by `nonCommercialConfirmed:false`, still
  fails closed (shows connection status, never fabricates "clear weather").
- **Resolved which service (2026-09-12):** the operator's own V1 handoff document (section 9)
  confirms the real provider is KHOA (국립해양조사원), the same one `docs/02-LEGACY-API-CONTRACT.ko.md`
  already documented — `apis.data.go.kr/1192136/surveyAirTemp/GetSurveyAirTempApiService`,
  `obsCode=DT_0013` (Ulleungdo), not a separate KMA(기상청) service. The "기상청" mention was
  evidently a loose/colloquial label for the same data.go.kr-hosted service.
- **Key handling — operator delegated this decision ("나머진 알아서 해줘"):** proposed approach
  is to add a `weather=1` action to the **existing** Apps Script backend already connected for
  the hall of fame (section 2) — it already runs server-side with `UrlFetchApp`, so the KHOA
  service key would live only in `Code.gs`, never in this repo's public JS, and no new
  infrastructure (e.g. a Vercel serverless function) is needed. The client would call
  `<SHEET_API>?weather=1` the same way it already calls `?ts=` / `?live=1`. This is a proposal,
  not yet implemented — it needs a `Code.gs` snippet added on the operator's side (this session
  has no access to edit that script) and the **re-issued** key (the operator is holding it for
  now — the current one is treated as already-exposed, matching their own V1 doc's warning).
  Once both exist, the client-side call is a small, low-risk addition to `assets/weather.js`.

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

## 6. GA4 (operator item 7, 2026-09-12)

- Configured: `analytics.gaId = 'G-WJM7KL33ST'` in `assets/site-config.js`. New `assets/analytics.js`
  loads `gtag.js` lazily (only if a `gaId` is set) with `allow_google_signals:false`,
  `allow_ad_personalization_signals:false`, `anonymize_ip:true`, matching the V1 handoff's config.
  CSP `script-src` now also allows `https://www.googletagmanager.com` and `connect-src` allows
  `https://www.google-analytics.com` / `https://www.googletagmanager.com`.
- Wired so far: `question_answered` (every answer, in `choose()`), `lesson_complete` and
  `grade_up` (at lesson finish, `grade_up` only when `M.finish()` reports `advanced:true`),
  `placement_done` (placement mode finish). **`share_click` is not wired** — no share button
  exists in this app yet (see section 1), so there is no call site for it.
- **No name/nickname/school/flag/nationality is attached to any event** — only `qid`, `correct`,
  `qtype`/`mode`, and the legacy `grade` string, per the operator's V1 handoff document.
- `grade_up`'s `by` field is `'lesson'`, not V1's `'exam'|'career'` — dokdo-next's progression
  model (continuous unit/stage completion) doesn't map onto V1's discrete exam/career promotion
  concept, so this is a deliberate approximation, not a like-for-like port. Worth knowing before
  comparing GA4 numbers across the two apps.
- **Not done, and outside what code can do:** the GA4 admin-console steps from the operator's
  handoff (marking these as Key events, registering `qid`/`correct`/`grade`/`qtype`/`mode` as
  custom dimensions) — those are clicks in the GA4 UI, not something this session can perform.
- Not verified end-to-end here: `www.googletagmanager.com` is also blocked by this sandbox's
  network egress (consistent with every other external host tested this session). Code loads
  without throwing when the domain is unreachable (`gtag.js`'s own script tag just fails to
  load; the `dataLayer.push` calls queue harmlessly). Real delivery needs checking in GA4's
  Realtime report after deploy.

## 7. YouTube (operator items 2 & 9, 2026-09-12)

- Added: `youtube.channelUrl`, `youtube.liveUrl`, `youtube.videoIds` (13 unique ids — the
  operator's 12 new links plus the one pre-existing id that overlapped) in `site-config.js`.
- **Daily intro dialog:** on load, if `state.introDay` isn't today's `Core.dayKey()`, shows one
  random video as a thumbnail + link in a new `<dialog>` (existing dialog pattern, reused
  as-is), then records today's date so it won't reappear until tomorrow. Verified: shows on
  first load, does not reappear on reload the same day (screenshots `intro-dialog.png`).
- **Home page card:** a new "독도코리아 영상" section below the existing cards shows one random
  video thumbnail (stable for the session, doesn't reshuffle on every re-render) plus a
  "실시간 라이브 보러가기" link to the channel's `/live` URL. Both open YouTube in a new tab —
  this session chose a plain link-out over an embedded player, to avoid CSP `frame-src` changes
  and autoplay/consent complexity, and to stay consistent with the app's existing "nothing plays
  without an explicit click" pattern. **If an actual embedded/inline player is wanted instead,
  that's a different, larger change (iframe + CSP `frame-src` for `www.youtube-nocookie.com` or
  similar) — flagging the choice rather than assuming it.**
- Thumbnails load from `https://i.ytimg.com/vi/<id>/hqdefault.jpg` (CSP `img-src` extended for
  this host). Not verified visually in this session — `i.ytimg.com` is also blocked by this
  sandbox's egress policy; the `<img>` element and its `alt` text render correctly, the image
  itself just can't load here. Should display normally on a real network.
- Channel footer links (YouTube/label/Spotify/YT Music/Melon/Genie/FLO/Apple Music/
  Instagram/TikTok/open-chat/Linktree) from the operator's doc section 4-3 were **not** added —
  wasn't explicitly asked for again this round; can add if wanted.
- The V1 handoff also mentions a separate "one more song from this channel" **audio** widget at
  the bottom of the home page (distinct from BGM and from this video card) — not built, would
  need clarification on which track(s) and whether it's audio or video.

## 8. BGM (operator item 3, in progress)

- One file was sent (`...Vol.7...Master.wav`): 48kHz/16-bit stereo, ~2:17, **26 MB**. The V1
  handoff describes three ~3 MB `bgm{1,2,3}.mp3` files (compressed, `preload="none"`, played only
  after the user clicks the speaker). This WAV is a mastering-stage file, not a web-ready asset —
  at 26 MB it would make the "click to play" experience slow and bloat the repository. This
  session has no audio encoder available (no `ffmpeg`/`lame` in this sandbox) to convert it.
  **Needs from the operator:** an MP3 export (128–192 kbps is plenty for background music) for
  each of the three tracks, plus each track's display title (the filename's Korean title was
  lost to upload sanitization — only "Vol.7" and "Master" survived). Not integrated yet.

## 9. Schools dataset (operator item 8, in progress)

- The operator provided a self-contained Apps Script (`fetchSchools`) that pages through NEIS's
  `open.neis.go.kr/hub/schoolInfo` and saves the full list to their own Google Drive as
  `schools_raw.json` — never touching this repo or any client code. This is exactly right:
  the NEIS key stays in a script only the operator runs, never in a public bundle. Nothing to
  do here until `schools_raw.json` is shared; the free-text school field added this session
  (section 2b of this doc) stays as the fallback until then.

## 10. Something worth flagging back: the screenshot with 1,513 lights / 4,539 lifetime-correct

- The operator sent a screenshot showing far more progress than expected ("내가 이렇게 많이
  맞추진 않았네"). Those exact numbers (`xp:18750`, `grade:'PHD2'`, `streak:7`) match this
  codebase's own hardcoded **demo seed** almost exactly (`assets/app.js`, the `startDemo`-style
  function that seeds `demo.html`'s "가상 탐험가" heavy-user preview). The strong suspicion is
  the screenshot was taken on `/dokdo-next/demo.html` rather than `/dokdo-next/`, not a real bug
  in the real account — `demo.html` is explicitly a separate, intentionally-seeded preview that
  resets on reload and is isolated from real records. **Worth the operator double-checking the
  exact URL in that screenshot's address bar before this is treated as a data bug.**

## 11. Everything else in `docs/05-ACCEPTANCE.ko.md`

API02–API07 (CORS/idempotency/auth/input-safety/secrets/backup-integrity), HALL04–HALL06
(scale, failure states, live-feed correctness), WX02, VIS03/05/06, EDU01–03, OPS01/02: **NOT_RUN**.
Nearly all of them require either a real backend connection or a real device/browser this
session does not have. None are claimed as passed.
