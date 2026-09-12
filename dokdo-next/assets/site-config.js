/* Deployment settings. No secrets belong in this public file.
 * Open-Meteo's free endpoint permits non-commercial use only.
 * The operator must confirm this before setting nonCommercialConfirmed to true.
 * Commercial service: use a licensed server-side adapter instead.
 */
window.DOKDO_SITE_CONFIG=Object.freeze({
 version:'1.3.0',
 weather:Object.freeze({provider:'open-meteo',nonCommercialConfirmed:false,refreshMinutes:30})
});
