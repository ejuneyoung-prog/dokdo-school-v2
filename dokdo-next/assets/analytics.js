/* GA4 event forwarding. Loads gtag.js only if analytics.gaId is configured.
 * Never attaches name/nickname/school/flag/nationality to any event — only
 * question id, correctness, question type, mode, and the legacy grade code,
 * matching the scope documented in the V1 handoff (section 2). */
window.DokdoAnalytics=(function(){
'use strict';
const cfg=()=>(window.DOKDO_SITE_CONFIG&&window.DOKDO_SITE_CONFIG.analytics)||{};
const gaId=()=>{const id=cfg().gaId;return typeof id==='string'&&/^G-[A-Z0-9]+$/.test(id)?id:'';};
let started=false;
function start(){
 if(started)return;const id=gaId();if(!id)return;started=true;
 window.dataLayer=window.dataLayer||[];
 window.gtag=function(){window.dataLayer.push(arguments);};
 window.gtag('js',new Date());
 window.gtag('config',id,{allow_google_signals:false,allow_ad_personalization_signals:false,anonymize_ip:true});
 const s=document.createElement('script');s.async=true;
 s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(id);
 document.head.appendChild(s);
}
function track(name,params){
 if(!gaId())return;
 start();
 try{window.gtag('event',name,params||{});}catch(e){}
}
return{track};
})();
