/* 머리줄 계정 단추. SDK나 서버 호출 없이 이 브라우저의 로그인 표시와 닉네임만 읽습니다. */
(function(){
 'use strict';
 function keys(){
  const config=globalThis.DOKDO_AUTH_CONFIG;if(!config)return ['dokdo-account-session-v2','dokdo-account-session-v1'];
  return [config.googleEnabled===true||config.kakaoEnabled===true||config.privateRecordsEnabled===true?'dokdo-account-session-v2':'dokdo-account-session-v1'];
 }
 function signedIn(){
  for(const key of keys()){try{const value=JSON.parse(localStorage.getItem(key)||'null');if(value&&value.user&&value.user.id)return true;}catch(e){}}
  return false;
 }
 function nickname(){
  try{const live=window.DokdoApp&&window.DokdoApp.state&&window.DokdoApp.state.name;if(live)return String(live).trim();const saved=JSON.parse(localStorage.getItem('dokdo-korea-school-cinematic-v1')||'null');return String((saved&&saved.name)||'').trim();}catch(e){return '';}
 }
 function refresh(){
  const en=document.documentElement.lang==='en';
  const mode=document.querySelector('meta[name="dokdo-mode"]')?.content,isolated=!!mode&&mode!=='live';
  for(const id of ['account-link','game-account-link']){
   const link=document.getElementById(id);if(!link)continue;
   link.href=(isolated?'https://dokdo-school-v2.vercel.app/dokdo-next/account.html':'./account.html')+'?next='+encodeURIComponent(id==='game-account-link'?'games.html':'./');
   if(isolated){link.target='_blank';link.rel='noopener noreferrer';}
   const member=!isolated&&signedIn(),name=member?nickname():'',label=member?(name||(en?'My records':'내 기록')):(en?'Sign in':'로그인');
   link.textContent=label;link.classList?.toggle('signed-in',member);
   link.setAttribute('aria-label',member?(en?`${label} · my account and records`:`${label} · 내 계정과 기록`):(en?'Sign in · my account':'로그인 · 내 계정'));
  }
 }
 document.addEventListener('dokdo:language',refresh);document.addEventListener('dokdo:present',refresh);document.addEventListener('dokdo:view',refresh);refresh();
})();
