/* Deployment settings. No secrets belong in this public file.
 * Open-Meteo's free endpoint permits non-commercial use only.
 * The operator must confirm this before setting nonCommercialConfirmed to true.
 * Commercial service: use a licensed server-side adapter instead.
 */
window.DOKDO_SITE_CONFIG=Object.freeze({
 version:'1.3.0',
 weather:Object.freeze({provider:'open-meteo',nonCommercialConfirmed:false,refreshMinutes:30}),
 /* Weekly hall of fame backend: the operator's deployed Apps Script web
  * app. This URL is meant to be called directly from the browser (same
  * exposure model as the legacy client) and is not a secret by itself —
  * write access is governed by the script's own deployment permissions,
  * not by hiding this URL. connect-src in index.html's CSP already
  * allows script.google.com / googleusercontent.com for this. */
 leaderboard:Object.freeze({apiUrl:'https://script.google.com/macros/s/AKfycbxhkR93f7__AekcpkHyd-pzfNHcPeQQK8HhHrtcRW6sLanzJGhPI3B2LRksxqrs1Uzelw/exec'})
});
