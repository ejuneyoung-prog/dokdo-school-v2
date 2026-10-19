/* Public browser settings. SMTP and secret/service_role keys never belong here. */
window.DOKDO_AUTH_CONFIG=Object.freeze({
 enabled:true, // Operator verified actual email confirmation and password sign-in on 2026-10-19.
 privateRecordsEnabled:false, // Activate only after private SQL/RLS and owner tests.
 kakaoEnabled:false, // Activate after provider setup and the operator's live sign-in test.
 supabaseUrl:'https://cqlvhrodebmhxbrhlmzu.supabase.co',
 publishableKey:'sb_publishable_ZdI6xlAx-wflWEebVpp2tw_-bpfxz_m',
 redirectUrl:'https://dokdo-school-v2.vercel.app/dokdo-next/account.html'
});
