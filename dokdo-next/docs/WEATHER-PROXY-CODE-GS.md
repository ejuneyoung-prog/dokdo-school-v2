# KHOA weather relay — Code.gs snippet (operator to paste and configure)

This is a proposed addition to the **existing** Apps Script already deployed for the hall of
fame. It adds one new branch to `doGet(e)` so `GET <SHEET_API>?weather=1` returns a small,
cached, KHOA-sourced Ulleungdo temperature reading — the service key never leaves the script.

**Do not paste a real key into this file, into chat, or into any client-side JS.** Set it in
Apps Script's own **Project Settings → Script Properties** as `KHOA_SERVICE_KEY`, and this code
reads it from there via `PropertiesService`. The operator said they will enter the key directly
and has asked not to be prompted for it — this session has not requested it and has not put any
key value anywhere in this repo.

The current key is treated as already exposed (per the operator's own earlier note and the V1
handoff's own security section) — **re-issue it before wiring this up**, otherwise the proxy
adds no protection.

## What to add to `doGet(e)`

Add this as an early branch, before whatever your existing `doGet` does for its other query
params (`?ts=`, `?live=1`, `?load=`), so those are untouched:

```javascript
function doGet(e) {
  if (e.parameter.weather === '1') {
    return handleWeatherRequest_();
  }
  // ... existing doGet body for ?ts= / ?live=1 / ?load= continues unchanged below ...
}

function handleWeatherRequest_() {
  var CACHE_KEY = 'khoa_weather_v1';
  var CACHE_SECONDS = 1800; // 30 minutes — matches the sheet backend's own cache pattern.
                            // Ulleungdo air temperature does not change faster than this,
                            // and every visitor sharing one cached value keeps data.go.kr
                            // call volume flat regardless of how many users the app has.
  var cache = CacheService.getScriptCache();
  var cached = cache.get(CACHE_KEY);
  if (cached) {
    return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
  }

  var key = PropertiesService.getScriptProperties().getProperty('KHOA_SERVICE_KEY');
  if (!key) {
    // Never echo the missing-key state as fabricated weather; say so plainly instead.
    return ContentService.createTextOutput(JSON.stringify({ error: 'not_configured' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var url = 'https://apis.data.go.kr/1192136/surveyAirTemp/GetSurveyAirTempApiService'
    + '?serviceKey=' + key + '&type=json&obsCode=DT_0013&numOfRows=1&pageNo=1';

  var payload;
  try {
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) throw new Error('upstream_http_' + res.getResponseCode());
    var body = JSON.parse(res.getContentText());
    var item = body && body.response && body.response.header
      && body.response.header.resultCode === '00'
      && body.response.body && body.response.body.items
      && body.response.body.items.item && body.response.body.items.item[0];
    if (!item) throw new Error('unexpected_upstream_shape');
    payload = JSON.stringify({
      provider: 'KHOA',
      station: '울릉도',
      temperature: Number(item.artmp),
      observedAt: item.obsrvnDt,
      fetchedAt: new Date().toISOString()
    });
  } catch (err) {
    // Mask the real error (which could include the upstream URL) from the public response
    // and from logs that might be visible to others with editor access. Log only a short tag.
    Logger.log('khoa_weather_fetch_failed'); // deliberately no err.message / no URL here
    return ContentService.createTextOutput(JSON.stringify({ error: 'upstream_unavailable' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  cache.put(CACHE_KEY, payload, CACHE_SECONDS);
  return ContentService.createTextOutput(payload).setMimeType(ContentService.MimeType.JSON);
}
```

## Client contract this snippet produces

```json
{"provider":"KHOA","station":"울릉도","temperature":18.7,"observedAt":"2026-09-12 14:00","fetchedAt":"2026-09-12T05:00:00.000Z"}
```

`assets/leaderboard.js`'s `fetchKhoaWeather()` (already added this session) expects exactly
`station` (string) and `temperature` (number); anything else is treated as an error, never
displayed as fabricated weather.

## After pasting this in

1. Re-issue the KHOA service key at data.go.kr (the old one is treated as already public).
2. Project Settings → Script Properties → add `KHOA_SERVICE_KEY` = the new key.
3. Deploy → Manage deployments → pick the existing deployment → New version → Deploy. **The
   `/exec` URL stays the same** — only "새 배포" (a brand-new deployment) would change it, which
   would also require updating `assets/site-config.js`'s `leaderboard.apiUrl` again.
4. In this repo, flip `weather.khoaViaAppsScript` to `true` in `assets/site-config.js`.
5. Confirm in a real browser: the "울릉도 실측 기온 · _°C (참고값)" line appears under the
   existing weather status, and reloading within 30 minutes doesn't re-hit data.go.kr (check
   Apps Script's execution log, or just trust the `CacheService` behavior).

## Scaling note (operator's own suggestion, not yet built)

If usage grows enough that Apps Script's own execution quotas
(https://developers.google.com/apps-script/guides/services/quotas) become a concern, a GitHub
Action running every 30 minutes that fetches KHOA once and commits/publishes a static JSON file
(with the key in **Actions Secrets**, never in the workflow file) is a safer, higher-ceiling
alternative to relying on Apps Script under load. Not built this pass — the Apps Script relay
above is the smaller change and reuses infrastructure that already exists; moving to Actions
later is a drop-in replacement for what the client calls, not a rewrite of the client.
