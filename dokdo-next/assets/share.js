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
async function copyLink(){
 const m=shareMeta();const text=m.title+'\n'+m.url;
 try{
  if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(text);
  else{
   const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';
   document.body.append(ta);ta.focus();ta.select();document.execCommand('copy');ta.remove();
  }
  return{state:'copied'};
 }catch(e){return{state:'error',error:String(e&&e.message||e)};}
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
  const m=shareMeta();
  window.Kakao.Share.sendDefault({
   objectType:'feed',
   content:{title:m.title,description:m.description,imageUrl:m.image,link:{webUrl:m.url,mobileWebUrl:m.url}},
   buttons:[{title:'독도 코리아 스쿨 열기',link:{webUrl:m.url,mobileWebUrl:m.url}}]
  });
  return{state:'opened'};
 }catch(e){return{state:'error',error:String(e&&e.message||e)};}
}
return{copyLink,kakaoShare,isKakaoConfigured:()=>!!kakaoKey()};
})();
