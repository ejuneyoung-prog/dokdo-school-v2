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

- **Not configured, by design.** `assets/site-config.js` → `leaderboard.apiUrl = ''`. This repo
  never had a Sheet/Apps Script URL in it (confirmed by the audit tool, see FEATURE-PARITY.md),
  and one was not supplied for this task. Inventing a URL here would violate the explicit
  instruction not to guess domains/keys.
- `assets/leaderboard.js` implements `fetchWeekly` (`GET ?ts=`), `fetchLive` (`GET ?live=1&ts=`),
  and `postEvent` (`POST {t:'a',...}`, `no-cors`, response intentionally never read) matching
  `docs/02-LEGACY-API-CONTRACT.ko.md` exactly, including its documented rough edges (the
  20,000-row read window, `people_week` being a truncated count and not a real total, the
  `no-cors` opaque-response problem). None of that is exercised against a real server.
- **What was actually tested:** a client-side smoke test where `fetchWeekly` was stubbed to
  return the handoff package's synthetic fixture (`fixtures/feed.valid.json`) — confirms the
  render path doesn't crash and produces sane HTML for that shape. **This is not HALL01.** It
  proves nothing about a real server, real deduplication, real weekly rollover, or real load.
- **Operator action required, all of it, before HALL01–HALL06 / API01–API07 in
  `docs/05-ACCEPTANCE.ko.md` can even start:**
  1. Supply a real, currently-deployed Apps Script (or replacement) URL and confirm what it
     actually is today — this session cannot discover or guess it.
  2. Decide whether to reuse the legacy sheet/script as-is (inheriting its documented
     weaknesses — 20k-row window, nickname-only keys, `payload.slice(0,45000)` truncation,
     `live.html`'s `data-k` attribute-injection risk) or stand up a small versioned adapter in
     front of it. `docs/02` recommends the latter for anything new; this session did not build
     that adapter because it has no server environment to deploy it to.
  3. Once a URL exists: set `leaderboard.apiUrl` in `assets/site-config.js`, and add that
     origin to `connect-src` in the CSP `<meta>` tag in `index.html` (currently
     `connect-src 'self' https://api.open-meteo.com` — a configured-but-CSP-blocked URL is a
     realistic failure mode worth testing for, not just a checkbox).
  4. Re-run `renderHall()` against that real URL, then do the HALL01 test explicitly: one test
     account, one real answer, confirm it appears exactly once, survives reload, survives a
     week boundary.
- Broadcast pages (`hall.html`/`live.html` equivalents, OBS `bg/scale/rows/only` params) were not
  built this pass — see FEATURE-PARITY.md for that scope decision.
- The answer/lesson flow does not currently call `postEvent` at all. Wiring that in before a
  real endpoint exists would just add a silent, permanently-failing network call; left
  disconnected on purpose until a real URL is set.

## 3. Weather

- Unchanged this pass. Already Open-Meteo, gated by `nonCommercialConfirmed:false` (operator
  must confirm non-commercial terms before flipping it), already fails closed (shows connection
  status, never fabricates "clear weather").
- `docs/02-LEGACY-API-CONTRACT.ko.md` documents a *different* legacy provider (KHOA Ulleungdo
  station, `obsCode=DT_0013`, needs a `serviceKey`). Swapping to it was out of scope for this
  pass (WX01 in the acceptance doc) and would need that service key from the operator, plus a
  decision on whether to keep Open-Meteo as a secondary/fallback or replace it outright — the
  handoff doc explicitly warns against silently replacing one with the other.

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
