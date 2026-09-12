# Feature parity — dokdo-next vs. legacy Apps Script site

Baseline for "legacy": `dokdo-claude-handoff/docs/02-LEGACY-API-CONTRACT.ko.md`, itself built
from `dokdo-school-main.zip` / `dokdo-korea-school-v1.3-upload.zip` snapshots, not from a live
audit of whatever is currently deployed at the operator's original `dokdo-school` repository.

**Repository fact, confirmed by `tools/audit_integrations.py --repo dokdo-next` before any
change in this pass:** the `dokdo-next` app in this repo (`dokdo-school-v2`) had zero hits for
`hall`, `live`, `school`, `feed`, `logging`, `cloud_progress`, `sharing`, `reports`. It is a
100% local, single-browser, no-backend app (only outbound call: Open-Meteo weather). There was
nothing here to "preserve" — hall of fame, rankings, broadcast screens and the Apps Script API
exist only in the legacy snapshot, not in this codebase. Everything in the "수정 후" column
below is new construction against the legacy *contract*, not a restoration of working code.

| Feature | Legacy snapshot | dokdo-next before this pass | After this pass | Verified how | Status |
|---|---|---|---|---|---|
| 공유 대표 이미지 (OG/Twitter) | n/a (new requirement) | none | `index.html` head carries full OG+Twitter set + canonical, image at `assets/share/dokdo-main-96151b75db9b.jpg` (hash-verified against handoff manifest) | `check_share.py --site-root dokdo-next` → PASS (local-html, local-image). Online crawl check NOT_RUN (see INTEGRATIONS.md, `PUBLIC_URL_REQUIRED` resolved to `dokdo-school-v2.vercel.app` but not yet re-checked after deploy) | DONE, partially verified |
| 명예의 전당 (개인 주간) | `index.html` `loadFeed/renderHall` | absent | New `#view-hall` + `assets/leaderboard.js` implementing the documented GET contract (`?ts=`) and rendering `week`/`schools`/`recent`. Inert until `leaderboard.apiUrl` is set — shows an explicit "not connected" state, never a fake empty board | Client-side smoke test with the handoff's synthetic `fixtures/feed.valid.json` → renders correctly, 0 console errors. **This is a MOCK render test, not a server round-trip.** No real weekly personal ranking exists yet | SCAFFOLDED, NOT CONNECTED |
| 학교 부문 순위 | `index.html` schools E/M/H/W | absent | Same view, school-tab UI wired to the same contract (`schools.E/M/H/W`) | Same mock smoke test only | SCAFFOLDED, NOT CONNECTED |
| 방송 화면 hall.html / live.html | standalone pages, OBS params (`bg/scale/rows/only/title`) | absent | Not built this pass — building a broadcast page with no live data source behind it was judged lower value than getting the in-app view and contract right first | none | NOT_RUN (scope decision, see below) |
| 정답 이벤트 · 서버 집계 | `sendLog`, POST `{t:'a',...}` | absent (no server calls of any kind on answer) | `DokdoLeaderboard.postEvent()` implements the POST shape but is not called from the lesson/answer flow yet, and is `no-cors` (response unreadable) exactly like the legacy client — explicitly documented as "sent, unconfirmed", never treated as "saved" | Not exercised (would need a real endpoint) | SCAFFOLDED, NOT WIRED INTO LESSON FLOW |
| 진도 백업/복원 (서버) | Apps Script `save`/`load` | Local-only: file export/import (`export-records`/`import-file`) already works and is unaffected | unchanged | `npm test` 156/156 pass (unaffected suites) | UNCHANGED (local backup only; no cloud backup exists in either old or new code path examined) |
| 기상 관측 | KHOA 울릉도 관측 (`obsCode=DT_0013`) | Open-Meteo forecast, gated by `nonCommercialConfirmed` | unchanged this pass | n/a | UNCHANGED — see INTEGRATIONS.md for why KHOA was not swapped in |
| 카카오 공유 (SDK 버튼) | `shareKakaoTalk` | absent | absent — only the OG/Twitter "paste a link" path was built. No Kakao JS key exists in this repo, and the CSP's `script-src 'self'` would block the Kakao CDN even if one were added | none | NOT DONE (needs operator's Kakao JS key) |
| 문항 제보 | `REPORT_TO` mailto | absent | absent | none | NOT DONE (no report contact configured anywhere in this repo) |
| 한영 교육과정 | 1,513 legacy bank | 240 questions, `AUTHOR_REVIEWED_NOT_INDEPENDENTLY_APPROVED` | unchanged — out of this pass's scope per instructions | `npm test` course/model suites pass | UNCHANGED |
| 홈 디자인·서체 | approved illustration | split "scene + fixed 296px lesson column" layout (`references/deployed-layout-not-approved.png` matches this exactly) | Full-width sea scene; today-card/map-card/weather/time and the progress-path card became small floating corner cards instead of a fixed side column | Real Chromium screenshots at 1440×900 and 390×844, before/after, plus an interactive click-test of the map toggle | DONE (see below for what was *not* attempted) |
| 시간·1,025경로·생물 | n/a | already implemented per spec (1,025 = 500+500+25, KST clock, solar calc) | unchanged | `npm test` (route-anchor test, weather tests) pass | UNCHANGED, already conformant |

## Home layout — what changed and what didn't

- Fixed: the dominant complaint in `references/deployed-layout-not-approved.png` (a full-height
  296–345px right column permanently splitting the sea view) is gone. The scene panel is now
  100% width; at the `main` max-width (1530px) the canvas alone renders ~700px tall, close to
  the aspect ratio of the approved image.
- Added as floating corner cards over the scene (`position:absolute` inside `.stage-grid`,
  falling back to normal stacked blocks under 860px width): time/weather/BGM-adjacent controls
  (top-left), the day's-lesson card and the map detail panel (top-right, mutually exclusive —
  this reuses the *existing* toggle state machine unchanged), and the growth-path progress bar
  (bottom-left).
- Not attempted: a persistent, always-visible small "지도 살펴보기" teaser sitting next to
  (rather than swapped with) the lesson card, the decorative compass/quote text, and moving the
  three stat cards / journey / life cards onto the picture itself. These stayed as normal
  full-width blocks below the scene, which is a lighter-touch reading of "하단" than literally
  overlaying them on the artwork — flagged here rather than silently decided.
- `deployed-layout-not-approved.png` was confirmed to be the actual pre-change render, not just
  a mockup: a fresh screenshot of the untouched code (`before-desktop.png`, this session's
  scratch output) matches it.

## What "verified" means here

Every check above ran against a local `python3 -m http.server` copy of `dokdo-next`, in
Chromium via Playwright, in this sandboxed session. Nothing was run against the real deployed
Vercel URL or a real phone. That gap is intentional — see `INTEGRATIONS.md` for exactly what
still needs the operator's own environment.
