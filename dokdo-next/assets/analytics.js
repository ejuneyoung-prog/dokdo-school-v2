/* GA4: production only, fixed events and restricted parameters. No account data. */
window.DokdoAnalytics=(function(){
'use strict';
const cfg=()=>(window.DOKDO_SITE_CONFIG&&window.DOKDO_SITE_CONFIG.analytics)||{};
const liveMode=()=>typeof document!=='undefined'&&typeof document.querySelector==='function'&&document.querySelector('meta[name="dokdo-mode"]')?.content==='live';
function gaId(){
 if(!liveMode())return '';
 if(typeof location!=='undefined'&&(location.hostname!=='dokdo-school-v2.vercel.app'||!['/dokdo-next/','/dokdo-next/index.html','/dokdo-next/games.html'].includes(location.pathname)))return '';
 const id=cfg().gaId;return typeof id==='string'&&/^G-[A-Z0-9]+$/.test(id)?id:'';
}
const fields={question_answered:['qid','correct','qtype','grade','retry'],placement_done:['correct','grade'],lesson_complete:['mode','correct','total','percent','grade'],grade_up:['grade','by'],share_click:['channel'],navigation_click:['destination','placement'],game_start:['game'],game_resume:['game'],game_complete:['game','score','round','lines','reason'],round_complete:['game','round','score'],dispute_open:['qid'],dispute_sent:['qid'],dispute_failed:['qid']};
const enums={qtype:['mc','ox','order','match','pick','multi','tf','daily','review','placement','choice','single'],mode:['daily','review','placement'],by:['lesson'],channel:['link','card','kakaotalk','device','instagram','live','grade_badge'],destination:['learn','play','info','channel','live','video','account','weather'],placement:['main','nav','menu','learning','info','channel','playground','result'],game:['blocks','runner'],reason:['time','no-space','collision','manual']};
function clean(name,params){
 const out={};for(const key of fields[name]||[]){const value=params?.[key];
  if(enums[key]){if(enums[key].includes(value))out[key]=value;}
  else if(key==='grade'){if(typeof value==='string'&&/^(K|E[1-6]|M[1-3]|H[1-3]|U[1-4]|MA[12]|PHD[12]|DK(?:[1-9]|1[0-2]))$/.test(value))out[key]=value;}
  else if(Number.isSafeInteger(value)&&value>=0&&value<=100000000)out[key]=value;
 }return out;
}
let started=false;
function start(){
 if(started)return;const id=gaId();if(!id)return;started=true;
 window.dataLayer=window.dataLayer||[];
 window.gtag=function(){window.dataLayer.push(arguments);};
 window.gtag('js',new Date());
 // Remove all incoming query/hash data, including auth, nickname or email parameters.
 const page=typeof location==='undefined'?'https://dokdo-school-v2.vercel.app/dokdo-next/':location.origin+location.pathname;
 let referrer='';try{const u=new URL(document.referrer);if(['http:','https:'].includes(u.protocol))referrer=u.origin;}catch(e){}
 const campaign={};try{const q=new URLSearchParams(location.search),source=q.get('utm_source');if(['link','yt_live','os_share','kakao'].includes(source)&&q.get('utm_medium')==='share'){campaign.campaign_source=source;campaign.campaign_medium='share';}}catch(e){}
 window.gtag('config',id,{...campaign,allow_google_signals:false,allow_ad_personalization_signals:false,anonymize_ip:true,send_page_view:true,page_location:page,page_referrer:referrer,page_title:page.endsWith('games.html')?'Dokdo Playground':'Dokdo Korea School'});
 const s=document.createElement('script');s.async=true;
 s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(id);
 document.head.appendChild(s);
}
function track(name,params){
 if(!Object.prototype.hasOwnProperty.call(fields,name)||!gaId())return;
 start();try{window.gtag('event',name,clean(name,params));}catch(e){}
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener?.('DOMContentLoaded',start,{once:true});
 else if(document.readyState)start();
}
return{track};
})();
