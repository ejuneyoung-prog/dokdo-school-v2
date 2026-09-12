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

## 10. The 1,513/4,539 screenshot — code-path audit, not a number-matching guess

The operator correctly pushed back on treating this as settled just because the numbers matched
a seed. Here is the actual code audit, not a restated guess:

1. **Entry files and their mode flag.** `index.html` carries `<meta name="dokdo-mode" content="live">`;
   `demo.html` carries `content="demo"`. `app.js` reads this once: `const isolated=mode!=='live'`.
   This is a static, load-time property of which HTML file was opened — nothing at runtime
   changes it, and nothing in `index.html`'s own code path can set `isolated=true` for itself.
2. **Storage backend is chosen from that same flag, before anything else runs:**
   `storage=isolated?new M.MemoryStorage():window.localStorage`. `MemoryStorage` (`app-model.js`)
   is a plain `Map` — `getItem`/`setItem`/`removeItem` never touch `window.localStorage` at all.
   So `demo.html` is not merely "supposed to" avoid the real save key
   (`dokdo-korea-school-cinematic-v1`); it has no code path capable of reaching it. Nothing
   demo.html does can write into, or read from, a real visitor's actual save slot, and nothing
   index.html does can read demo.html's in-memory state (it's discarded on navigation/reload).
3. **The seed itself only runs behind the same flag:** `if(isolated)initializeDemo();` at the
   bottom of `app.js`, and `initializeDemo()` is the only caller of `seedDemo()`. `seedDemo()`
   hardcodes `xp:18750, grade:'PHD2', gcHit:50, streak:7, passed:['M3']` — literal constants, not
   derived from anything — so every single demo.html load reproduces the exact same numbers, not
   "probably similar" ones. `index.html` never calls `seedDemo` or `initializeDemo` under any
   input; there is no conditional path in `choose()`, `mutate()`, `finish()`, or anywhere else in
   `app.js`/`app-model.js` that reaches those functions from live mode.
4. **No routing/caching could blur the two.** There is no `vercel.json` anywhere in this repo (so
   no rewrites/redirects between `/dokdo-next/` and `/dokdo-next/demo.html`), and no service
   worker (`sw.js` doesn't exist; `tools/check_site.py` has its own standing check for this,
   `'No service worker with unknown stale caches'`, currently passing). A browser cache could
   only ever serve stale copies of the *same* file it was requested for, not swap one entry file's
   response for the other's.
5. **What this session could not do:** open the operator's actual browser and read the address
   bar in that screenshot. Steps 1–4 are a full static proof that the seed is architecturally
   confined to `demo.html` and cannot leak into a real `index.html` session — not an inference
   from the numbers matching. Given that, the numbers matching *exactly* (not approximately) is
   the expected signature of "this was demo.html," not independent corroboration of a bug.
   **Still worth the operator's own confirmation of the address bar in that screenshot**, since
   this session cannot see it directly — but the code gives no path by which it could be
   anything else.

## 11. Video: click-to-play inline embed (superseding the earlier link-out choice)

Per the operator's explicit instruction (overriding both this session's original "link-out"
choice and the attached "이전 클로드" doc's autoplay-on-open recommendation): tap-to-play inside
the page, never automatic, "Open on YouTube" link kept alongside.

- Both the home card and the intro dialog now show a thumbnail with a play button
  (`resetYoutubePlayer`); tapping it replaces the thumbnail with a `youtube-nocookie.com` iframe
  (`playYoutubeEmbed`), `autoplay=1` only on that iframe — i.e. autoplay fires strictly as the
  direct result of the tap, never on page/dialog load. This matches "사용자가 누르면 화면 안에서
  재생, 자동재생은 하지 말고" precisely: the *page* never autoplays; the *video the user just
  tapped* does, which is what "누르면 재생" requires.
- **Teardown, not CSS-hide:** closing the intro dialog (`close` event on the `<dialog>`, which
  fires for the close button, the ✕, and Esc alike) and navigating away from the home view both
  call `stopAllYoutubeEmbeds()`, which replaces the iframe's container's `innerHTML` — the
  `<iframe>` element is actually removed, not hidden. Verified in this session: after opening the
  intro video then closing the dialog, `document.querySelector('#intro-player iframe')` is `null`;
  after opening the home card's video then navigating to another nav tab,
  `document.querySelector('#youtube-card-player iframe')` is likewise `null`.
- **BGM interaction:** starting a video calls `stopSound()` if it was playing, recording
  `wasPlaying`. On teardown, sound resumes only if it had actually been playing (`wasPlaying`) —
  if the user had it off already, or muted it during the video some other way, it stays off. Not
  tested with real audio in this sandbox (headless Chromium audio is unreliable to verify), but
  the logic doesn't depend on audio actually producing sound to behave correctly.
- **`no-referrer` → `strict-origin-when-cross-origin`, and the Referer/error-153 point:** the
  operator's flagged risk was correct and live — `index.html` did still have
  `<meta name="referrer" content="no-referrer">`. Changed to `strict-origin-when-cross-origin`
  (sends the origin only, cross-origin — enough for YouTube's embed check, without leaking the
  full page path). CSP `frame-src` now allows `https://www.youtube-nocookie.com`, and the iframe
  itself carries `referrerpolicy="strict-origin-when-cross-origin"` explicitly (belt-and-braces
  regardless of what any page-level meta says). **Not verified against a real YouTube embed**:
  `youtube-nocookie.com` is blocked by this sandbox's egress, so whether this actually clears
  error 153 can only be confirmed on the real deployed site.
- Verified this session (Chromium, local static server): tapping either player produces the
  correct `https://www.youtube-nocookie.com/embed/<id>?autoplay=1&rel=0&modestbranding=1&playsinline=1`
  src for a random id drawn from the configured list; zero CSP-violation console messages
  throughout a full run (video play, full lesson flow, share); zero other console/page errors.

## 12. Share button (no longer deferred)

- Added `assets/share.js` + a share row on the lesson-result screen: "링크 복사" (always) and
  "카카오톡 공유" (only rendered if `kakao.jsKey` is configured — it is, with the operator's real
  key). Both fire `share_click` with `channel:'link'|'kakaotalk'` — the click itself, never
  claimed as delivery to a recipient.
- **Default share content is exactly the page's own OG tags** (title/description/image/canonical
  URL), read from the DOM at share time, not reconstructed — so it's guaranteed to match whatever
  SHARE01 already established. No score, nickname, school or flag is read into it. The existing
  "이미지 저장" button (personalized result card) remains separate and local-only, per SHARE05/
  the operator's "카드" vs default-link distinction.
- Kakao SDK (`https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js`, matching the version the
  operator's V1 doc names) loads lazily on first Kakao-share click, `Kakao.init()` guarded by
  `Kakao.isInitialized()` so it's never called twice. **No `integrity` hash was added** — this
  session has no live access to confirm the current official hash from Kakao's docs, and a wrong
  one would silently block the script per the operator's own warning; safer to ship without one
  and have the operator add it once verified, than guess.
- Verified this session: completing a lesson renders both buttons; clicking "링크 복사" actually
  writes the correct title+URL to the clipboard (checked via `navigator.clipboard.readText()`);
  clicking "카카오톡 공유" fails gracefully with a toast (`kakao_sdk_load_failed`, because
  `t1.kakaocdn.net` is blocked in this sandbox) rather than throwing — expected to succeed for
  real once run somewhere that can reach Kakao's CDN. **Real Kakao card rendering is unverified**
  and needs the operator's own device test, same as SHARE04 already required.
- Channel-domain registration in the Kakao developer console (must include the real deployed
  domain) is an operator console action, not something this session can do or verify.

## 13. Fonts — IBM Plex Mono for numerals (correction accepted)

- The operator is right and this session's earlier "already correct, no IBM" note was wrong:
  V1 genuinely uses a third, numerals-only font. Added `.mono{font-family:"IBM Plex Mono",...
  !important;font-variant-numeric:tabular-nums}` and applied it to XP, the three home stat
  counts, the growth-path count, and the lesson-result score — the "주요 수치" surfaces named.
  Gmarket Sans (headings/menu/buttons) and S-Core Dream (questions/body) are unchanged.
- **Not independently verified live**: the `@font-face` src
  (`cdn.jsdelivr.net/npm/@fontsource/ibm-plex-mono@latest/files/...woff2`) could not be checked
  from this sandbox (jsdelivr's own package-metadata API is also blocked here). Used the
  unpinned `@latest` tag rather than guessing a specific version number that might not exist —
  unlike the existing Gmarket/S-Core declarations, which pin exact versions. **Ask:** once
  deployed, confirm in a real browser that `document.fonts` actually reports this family as
  `loaded`, and pin an exact version if you want the same reproducibility the other two fonts
  have. If the URL is ever wrong, the fallback chain (`var(--heading)`, then generic
  `monospace`) means digits still render — just not in IBM Plex Mono — never a broken layout.
- Numbers embedded inside a longer localized string (e.g. `"18,750 XP"`) get `.mono` applied to
  the whole string rather than just the digits — a scope simplification for this pass. The `XP`
  suffix rendering in IBM Plex Mono instead of Gmarket Sans is the one visible compromise; the
  actual goal (stable digit width so XP ticking up doesn't jitter) is unaffected either way.

## 14. Weather: KHOA-via-Apps-Script — code ready, inert until the operator's own steps

- Per the operator's explicit instruction, **no key was requested or handled** anywhere in this
  session, in code, or in chat.
- `docs/WEATHER-PROXY-CODE-GS.md` (new) contains the exact `Code.gs` branch to paste: reads
  `KHOA_SERVICE_KEY` from `PropertiesService` (never hardcoded), caches the KHOA response for
  1800s via `CacheService` (the operator's own addendum — same pattern the sheet backend already
  uses), masks upstream error detail from logs/responses, and returns a small fixed shape
  (`provider`, `station`, `temperature`, `observedAt`, `fetchedAt`). Also notes the operator's
  GitHub-Actions-static-JSON alternative for when Apps Script's own execution quotas become the
  binding constraint, as a documented option rather than something built now.
- Client side (`assets/leaderboard.js`'s `fetchKhoaWeather()`, wired into a new
  `updateKhoaObservation()` in `app.js`) is written and gated behind a new, currently-`false`
  config flag `weather.khoaViaAppsScript` — completely inert (the element it would populate,
  `#khoa-observation`, stays `hidden`) until the operator flips it after completing their side.
- **Design decision made under "나머진 알아서 해줘", flagged rather than silently assumed:** KHOA
  only adds a supplementary "울릉도 실측 기온 · _°C (참고값)" line. Open-Meteo keeps driving the
  actual day/sunset/night visual effect, because KHOA's endpoint returns temperature only — no
  cloud/rain/wind — and fabricating those from a single number is exactly what
  `docs/02-LEGACY-API-CONTRACT.ko.md` and the operator's own V1 doc both warn against. If a full
  KHOA-driven visual replacement was actually wanted instead of an additive reading, say so.

## 15. GA4 — event install, real receipt, duplicate prevention (separated as asked)

- **Event install (verified this session, locally):** ran a full lesson end-to-end in this
  session's Chromium and read `window.dataLayer` directly afterward. Confirmed, in order: one
  `question_answered` per confirmed answer (5 first attempts + however many corrections that run
  happened to need, each with a `retry:0|1` flag — added this round per the operator's explicit
  "재풀이와 첫 시도 분리" requirement, which the previous pass had missed), then **exactly one**
  `lesson_complete` at the very end (not one per question, not one per render) with the correct
  `correct`/`total`/`percent`. No `grade_up` fired on that particular run because
  `outcome.advanced` was false for it — confirmed the field is read correctly, not confirmed
  `grade_up` firing itself in this run (would need a run that actually completes a unit).
- **What "verified" does *not* mean here:** `gtag.js` itself never loaded — `googletagmanager.com`
  is blocked by this sandbox's egress (confirmed independently: it's on the same blocked list as
  every other external host tested this session). So this confirms the *app* calls `gtag(...)`
  with correct, deduplicated arguments; it does **not** confirm Google actually received
  anything. Per the operator's own taxonomy: this is `REQUEST_OBSERVED`, not
  `GA4_RECEIPT_NOT_VERIFIED`-resolved — actual receipt needs the operator's own GA4 Realtime/
  DebugView check on the real deployed site, which this session has no access to.
- **Duplicate-firing risk, checked architecturally, not just asserted:** `lesson_complete`/
  `grade_up`/`placement_done` all fire from one synchronous block that runs exactly once per
  `mutate(...)` resolution inside the lesson "next"/finish action, itself guarded by the existing
  `busy` flag (blocks re-entry from a double click) and by `lesson=null` immediately after (so
  the same finish can't fire twice even if some other code path called the render function
  again). A page reload loses the in-memory `lesson` object entirely (never persisted), so a
  reload cannot replay a just-finished lesson's events either. This is static-analysis
  confidence, not a captured-duplicate-and-confirmed-it-didn't-refire test — this session has no
  way to force a genuine race (e.g. two tabs finishing the same lesson state) to test empirically.
- **Consent / privacy config:** unchanged from the previous pass —
  `allow_google_signals:false`, `allow_ad_personalization_signals:false`, `anonymize_ip:true`.
  **Not done, and flagged rather than silently assumed away:** this session did **not** add a
  consent-gate (Google Consent Mode or otherwise) before the tag fires — GA4 currently loads
  and fires on every real visit once deployed, gated only by "does `gaId` exist," not by any
  user consent action. The operator's attached doc explicitly asks for a conservative default
  (no tag before consent) for a service children use. Implementing real consent-mode wiring is a
  decision with legal/product weight this session did not make unilaterally — flagging it as
  the single most important open item in this section, not quietly deferring it.
- **CSP, checked per the operator's three named surfaces, not just script-src:** `script-src`
  allows `googletagmanager.com`; `connect-src` allows `google-analytics.com`,
  `*.google-analytics.com`, `googletagmanager.com`, and `*.analytics.google.com` (regional
  collection endpoints); `img-src` was **not** touched for GA4 specifically — gtag.js's own
  network calls go through `fetch`/`sendBeacon` (covered by `connect-src`), not `<img>` pixels,
  in this integration path. Both the CSP `<meta>` here and `tools/check_site.py`'s allowlist
  check were updated together so neither drifts from the other; there is no separate
  server/Vercel-header CSP in this static-site setup to reconcile against.
- Custom-dimension/Key-event registration in the GA4 admin console remains something only the
  property owner can do — not attempted, not claimable as done by this session.
- **Not verified:** whether `G-WJM7KL33ST` is actually the operator's own property (this session
  has no GA4 access to check), enhanced-measurement/auto-collected fields (`page_location` etc.)
  leaking anything beyond what's already public in the URL, or demo.html's exclusion from real
  GA4 traffic (demo.html doesn't load `analytics.js` — check: it does **not** appear in
  `demo.html`'s script list, so demo sessions send no GA4 events at all, which is stronger than
  "excluded," though also means no demo-only test property distinction was set up either).

## 16. Status summary (operator's taxonomy)

| Item | Status | Evidence / what's missing |
|---|---|---|
| Share OG image + canonical | TESTED_MOCK (local) | `check_share.py` local PASS; online crawl still NOT_RUN — needs a deploy first |
| Kakao paste-link preview | BLOCKED_OWNER_ACTION | needs a real KakaoTalk test on the deployed URL |
| Share button (link/Kakao) | TESTED_MOCK (local) | clipboard copy verified in-browser; Kakao SDK verified to fail *gracefully* only (network blocked here) |
| Hall of fame real GET/POST | IMPLEMENTED_LOCAL | real URL wired, CSP open; `script.google.com` blocked in this sandbox so no real round-trip observed here |
| HALL01 (1 answer → +1, survives reload) | BLOCKED_OWNER_ACTION | needs the operator's own browser test against the live URL |
| Flag/school/recovery-code UI | TESTED_MOCK (local) | full profile-save round-trip verified via localStorage inspection |
| GA4 event install + dedup | TESTED_MOCK (local) | `dataLayer` contents verified directly; real receipt is `REQUEST_OBSERVED` only |
| GA4 consent gating | NOT IMPLEMENTED | flagged in section 15 as a decision this session didn't make unilaterally |
| YouTube click-to-play + teardown | TESTED_MOCK (local) | iframe creation/removal verified in-browser; real playback/error-153 clearance needs the live site |
| Demo-seed code-path audit | VERIFIED (static analysis) | see section 10 — architectural proof, not a live-browser observation |
| Weather (KHOA proxy) | IMPLEMENTED_LOCAL, inert | `Code.gs` snippet handed off; client wired behind a flag; nothing live until the operator's own steps |
| Fonts (3-font system incl. IBM Plex Mono) | IMPLEMENTED_LOCAL | applied to the named numeric surfaces; live font-load check still BLOCKED (sandbox network) |
| Schools dataset | BLOCKED_OWNER_ACTION | waiting on `schools_raw.json` |
| BGM | BLOCKED_OWNER_ACTION | waiting on MP3 exports + titles |

## 17. Everything else in `docs/05-ACCEPTANCE.ko.md`

API02–API07 (CORS/idempotency/auth/input-safety/secrets/backup-integrity), HALL04–HALL06
(scale, failure states, live-feed correctness), WX02, VIS03/05/06, EDU01–03, OPS01/02: **NOT_RUN**.
Nearly all of them require either a real backend connection or a real device/browser this
session does not have. None are claimed as passed.

## 18. Phase 5 — BGM, top nav, reset, share expansion, motivation banner, scene rendering

Everything the operator asked for after reviewing the 1,513/4,539 screenshot and the old
reference material, in one batch (their own "이전 수정 내용까지 다 포함해서 고고").

- **BGM, 7 tracks (TESTED_MOCK, local):** `assets/music/bgm1.mp3`–`bgm7.mp3`, titles taken
  verbatim from each file's own ID3 tag where one exists (`bgm1`/`bgm2` and the three newest
  gayageum tracks `bgm5`–`bgm7` all carry a real `title`/`artist` tag, read with `mutagen`, not
  guessed). `bgm3` (판소리) and `bgm4` (Let's Move) ship with no ID3 tag at all — their titles
  come directly from the operator's own chat text and original filename, not an assumption.
  Playback stays `preload='none'` per `<audio>` element and starts **only** from the existing
  sound-button click handler (`toggleSound` → `ensureAudio`/`playCurrentTrack`); the only other
  caller of `playCurrentTrack` is the track's own `ended` listener advancing to the next track,
  which is a continuation of playback the user already started, not a fresh autoplay. No
  `autoplay` attribute anywhere, verified by reading `assets/app.js` end to end. Real playback
  through actual speakers was not something this sandbox could confirm (no audio output here);
  file integrity (readable duration/bitrate via `mutagen`) and the click-to-play code path were
  both checked directly.
- **Top nav: 4 buttons + live link (TESTED_MOCK, local):** 후원하기 (given `youtube.membershipUrl`),
  My YouTube channel link, live-link now pointed at the operator's explicit
  `watch?v=wytHepZ1fcs` URL (not `/live`, per their instruction that this one stays live for a
  month-plus and they'll resend if it changes), 문의(협업) in the footer next to a new
  "울릉도·독도 관광 안내" dialog (placeholder content — no real tourism copy/link was supplied,
  flagged rather than invented). **Open item, not silently assumed:** 문의(협업) reuses the
  existing `mailto:ejuneyoung2@gmail.com` from the answer-dispute contact — never separately
  confirmed with the operator that the same address should receive business/collaboration
  inquiries specifically.
- **Reset-record button (TESTED_MOCK, local):** goes through `store.importState(M.fresh())`
  under the same `busy`/`scheduleWrite()` guard as every other state mutation, so it can't race
  a save-in-flight; the existing before-import snapshot means a reset is recoverable the same
  way an import is, which is what "복원 가능" required.
- **Share menu expansion + map save (TESTED_MOCK, local):** `renderShareRow()` now offers
  link copy, chat-safe copy (single line — YouTube Live chat strips newlines per the operator's
  own note), native share sheet where supported, and Kakao share gated on the JS key being
  configured; "지도 저장" reuses the existing save-image path with its label switched contextually.
- **Motivation banner (name + flag + a level-matched question, IMPLEMENTED_LOCAL):** shows the
  learner's own flag/name next to a question sized for their current grade on the home screen,
  hidden entirely until a name exists so it never shows placeholder data.
- **Scene rendering — night lighthouse, day-visible flags, fish density, pier boat
  (TESTED_MOCK, local, screenshots below):**
  - *Lighthouse:* no prior lighthouse render target existed anywhere in the codebase (checked
    via `grep` across `assets/*.js` and `data/*.json`before writing anything). Its position is
    computed, not hand-picked, from the same outline data every other coordinate in this file
    already uses: the topmost vertex of Dongdo's polygon, nudged 20% toward the island's center
    so the tower sits on solid ground rather than exactly on the coastline. It renders every
    frame; only its glow/beam is gated on `phase.darkness > .12`, pulsing rather than static.
  - *Flags = lights, exactly 1:1:* every level-4 ("beacon") position `drawLights()` already
    drew as a glow dot now also gets a small Taegukgi planted on it, via the same `taegeukgi()`
    function the journey-path decoration already used — same filtered list (`lv===4`) the app's
    own `a.lights` counter is built from (`assets/app.js:724`), so the flag count cannot drift
    from the light count; there is no separate cap or stride like the journey-path flags have.
    This is deliberately unconditional (day and night both), since the ask was specifically that
    earned lights stay visible in daylight, when the glow alone reads poorly.
  - *Fish density doubled:* `{calm:72,rich:144,full:192}` → `{calm:144,rich:288,full:384}`.
  - *Pier boat:* a small non-photorealistic silhouette (hull + cabin block, no rigging/detail)
    makes one slow round trip every 170s of scene time — eases in from open water, holds at the
    dock, eases back out — anchored at Dongdo's westmost (strait-facing) polygon vertex, nudged
    slightly *outward* into the water (not inland, unlike the lighthouse) specifically so it
    never renders underneath the island artwork at the moment it's docked. This was caught and
    fixed during this session's own verification, not assumed correct on the first try.
  - Verified by calling `DokdoVisualScene.render()` directly at chosen scene-time values (10s /
    35s / 100s) against a demo-seeded 1,513-record state, in both `day` and `night` preview
    modes (`assets/solar.js`'s existing `time-mode` override), and inspecting the resulting
    canvas pixels — not by eyeballing the live animation loop and hoping the timing lined up.
  - **Not verified:** how this looks against the *real* island raster illustration (this
    session's checks used the flat fallback fill, since the real artwork file's exact
    transparency/coastline shape wasn't inspected pixel-by-pixel) — worth one visual pass on the
    deployed preview; and whether ~384 fish at `full` density costs enough frame time to matter
    on a low-end phone, which this sandbox cannot benchmark.
- `npm test` (156/156) and `python3 tools/check_site.py` (86/86) both pass after every change in
  this section — no check was loosened to make that true; no new external host was touched, so
  no CSP change was needed for this batch.
