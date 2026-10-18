/* Account entry only: no SDK, auth request or student storage access on the main/game page. */
(function(){
 'use strict';
 function refresh(){
  const en=document.documentElement.lang==='en';
  const mode=document.querySelector('meta[name="dokdo-mode"]')?.content,isolated=!!mode&&mode!=='live';
  for(const id of ['account-link','game-account-link']){
   const link=document.getElementById(id);if(!link)continue;
   link.href=(isolated?'https://dokdo-school-v2.vercel.app/dokdo-next/account.html':'./account.html')+'?next='+encodeURIComponent(id==='game-account-link'?'games.html':'./');
   if(isolated){link.target='_blank';link.rel='noopener noreferrer';}
   link.textContent=en?'My account':'내 계정';
   link.setAttribute('aria-label',en?'My account · sign in or sign out':'내 계정 · 로그인과 로그아웃');
  }
 }
 document.addEventListener('dokdo:language',refresh);document.addEventListener('dokdo:present',refresh);document.addEventListener('dokdo:view',refresh);refresh();
})();
