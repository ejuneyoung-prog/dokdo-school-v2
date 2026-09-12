/* Deployment settings. No secrets belong in this public file.
 * Open-Meteo's free endpoint permits non-commercial use only.
 * The operator must confirm this before setting nonCommercialConfirmed to true.
 * Commercial service: use a licensed server-side adapter instead.
 */
window.DOKDO_SITE_CONFIG=Object.freeze({
 version:'1.3.0',
 weather:Object.freeze({provider:'open-meteo',nonCommercialConfirmed:false,refreshMinutes:30}),
 /* Weekly hall of fame backend. Left empty on purpose: no production
  * Apps Script / Sheet URL was supplied to this build. Setting apiUrl
  * also requires adding its https origin to connect-src in the
  * Content-Security-Policy meta tag in index.html, or the browser will
  * block the request even once this value is filled in. */
 leaderboard:Object.freeze({apiUrl:''})
});
