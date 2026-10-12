/* Link/Kakao sharing. The default share content is the same fixed
 * OG title/description/image the page itself declares in <head> — no
 * per-user score, nickname, school or nationality is ever put into a
 * shared link or Kakao card. A personalized result image is a separate,
 * already-existing, explicitly-triggered local download (the "save image"
 * button), never auto-shared.
 */
window.DokdoShare=(function(){
'use strict';
const cfg=()=>(window.DOKDO_SITE_CONFIG&&window.DOKDO_SITE_CONFIG.kakao)||{};
const kakaoKey=()=>{const k=cfg().jsKey;return typeof k==='string'&&/^[0-9a-f]{32}$/i.test(k)?k:'';};
function shareMeta(){
 const get=(sel,attr)=>{const el=document.querySelector(sel);return el?el.getAttribute(attr):'';};
 return{
  title:get('meta[property="og:title"]','content')||document.title,
  description:get('meta[property="og:description"]','content')||'',
  image:get('meta[property="og:image"]','content')||'',
  url:get('link[rel="canonical"]','content')||get('link[rel="canonical"]','href')||location.href
 };
}
/* 유입 측정용 utm. 어느 공유 단추로 들어왔는지만 붙입니다. 값은 아래 네 개로
 * 고정이고, 별명·학교·점수 같은 사용자 값은 절대 넣지 않습니다. canonical과
 * OG 태그는 그대로 둡니다. */
const UTM_SOURCES=['link','yt_live','os_share','kakao'];
function withUtm(url,source){
 if(!UTM_SOURCES.includes(source))return url;
 try{const u=new URL(url);u.searchParams.set('utm_source',source);u.searchParams.set('utm_medium','share');return u.toString();}
 catch(e){return url;}
}
async function copyText(text){
 try{
  if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(text);
  else{
   const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';
   document.body.append(ta);ta.focus();ta.select();const done=document.execCommand('copy');ta.remove();if(!done)throw Error('execCommand_failed');
  }
  return{state:'copied',text};
 }catch(e){return{state:'error',text,error:String(e&&e.message||e)};}
}
async function copyLink(){const m=shareMeta();return copyText(m.title+'\n'+withUtm(m.url,'link'));}
/* Live chat text must stay on one line -- YouTube Live chat strips
 * newlines and runs words together otherwise (per the operator's own
 * V1 notes). */
async function copyForChat(brag){const m=shareMeta();const prefix=brag?brag+' · ':'';return copyText(prefix+m.title+' · '+withUtm(m.url,'yt_live'));}
function nativeShareSupported(){return typeof navigator.share==='function';}
async function nativeShare(){
 if(!nativeShareSupported())return{state:'not_supported'};
 const m=shareMeta();
 try{await navigator.share({title:m.title,text:m.title,url:withUtm(m.url,'os_share')});return{state:'shared'};}
 catch(e){if(e&&e.name==='AbortError')return{state:'cancelled'};return{state:'error',error:String(e&&e.message||e)};}
}
let kakaoLoading=null;
function loadKakaoSdk(){
 if(window.Kakao&&window.Kakao.isInitialized())return Promise.resolve();
 if(kakaoLoading)return kakaoLoading;
 kakaoLoading=new Promise((resolve,reject)=>{
  const key=kakaoKey();if(!key){reject(new Error('kakao_not_configured'));return;}
  if(window.Kakao){if(!window.Kakao.isInitialized())window.Kakao.init(key);resolve();return;}
  const s=document.createElement('script');
  s.src='https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';
  s.crossOrigin='anonymous';
  s.onload=()=>{try{window.Kakao.init(key);resolve();}catch(e){reject(e);}};
  s.onerror=()=>reject(new Error('kakao_sdk_load_failed'));
  document.head.appendChild(s);
 });
 return kakaoLoading;
}
async function kakaoShare(){
 if(!kakaoKey())return{state:'not_configured'};
 try{
  await loadKakaoSdk();
  const m=shareMeta(),url=withUtm(m.url,'kakao');
  window.Kakao.Share.sendDefault({
   objectType:'feed',
   content:{title:m.title,description:m.description,imageUrl:m.image,link:{webUrl:url,mobileWebUrl:url}},
   buttons:[{title:'독도 코리아 스쿨 열기',link:{webUrl:url,mobileWebUrl:url}}]
  });
  return{state:'opened'};
 }catch(e){return{state:'error',error:String(e&&e.message||e)};}
}
return{withUtm,copyLink,copyForChat,nativeShare,nativeShareSupported,kakaoShare,isKakaoConfigured:()=>!!kakaoKey()};
})();
