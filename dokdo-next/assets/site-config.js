/* Deployment settings. No secrets belong in this public file.
 * Open-Meteo's free endpoint permits non-commercial use only.
 * The operator must confirm this before setting nonCommercialConfirmed to true.
 * Commercial service: use a licensed server-side adapter instead.
 */
window.DOKDO_SITE_CONFIG=Object.freeze({
 version:'1.3.0',
 /* khoaViaAppsScript stays false until the operator has (a) re-issued the
  * KHOA service key, (b) added the weather=1 branch to their Apps Script
  * (see docs/WEATHER-PROXY-CODE-GS.md for the exact snippet), and (c)
  * flipped this to true. Until then this is inert — Open-Meteo (below)
  * keeps driving the visual sky/weather effect either way; KHOA only adds
  * a supplementary "observed temperature" line, since a single
  * temperature reading can't drive cloud/rain visuals on its own. */
 weather:Object.freeze({provider:'open-meteo',nonCommercialConfirmed:false,refreshMinutes:30,khoaViaAppsScript:false}),
 /* Weekly hall of fame backend: the operator's deployed Apps Script web
  * app. This URL is meant to be called directly from the browser (same
  * exposure model as the legacy client) and is not a secret by itself —
  * write access is governed by the script's own deployment permissions,
  * not by hiding this URL. connect-src in index.html's CSP already
  * allows script.google.com / googleusercontent.com for this. */
 leaderboard:Object.freeze({apiUrl:'https://script.google.com/macros/s/AKfycbxhkR93f7__AekcpkHyd-pzfNHcPeQQK8HhHrtcRW6sLanzJGhPI3B2LRksxqrs1Uzelw/exec'}),
 /* GA4. No name/nickname/school/flag/nationality is ever attached to any
  * event — only question id, correctness, question type, mode and the
  * legacy grade code. See assets/analytics.js. */
 analytics:Object.freeze({gaId:'G-WJM7KL33ST'}),
 /* Kakao JS key is a public browser identifier, not a secret — protected by
  * domain registration in the Kakao developer console (must include this
  * site's real deployed domain), not by hiding the key. */
 kakao:Object.freeze({jsKey:'97c52922c96accf37b16aa4753b7d054'}),
 youtube:Object.freeze({
  channelUrl:'https://www.youtube.com/@독도코리아',
  liveUrl:'https://www.youtube.com/@독도코리아/live',
  videoIds:Object.freeze(['Yt59g3GKH58','qIPzX4Pv_pw','M7FvE6fxUVw','FopCZvMGvRQ','rots70BT7S4','4z2lzU7ZYGk','GKNV0UX3dIU','xBd6QDlTLpE','7QRtHpzAgeA','qHACSY2wNn4','AheUe-8-sDY','sgzS66CXiew','ogh--u-5xQg'])
 })
});
