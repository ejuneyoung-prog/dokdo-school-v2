/* Account presence only: authenticated SDK sessions, never learner/game state. Preview stays offline. */
(function(root){
 'use strict';const d=root.document;if(!d)return;
 const mode=d.querySelector('meta[name="dokdo-mode"]')?.content,isolated=!!mode&&mode!=='live';
 const config=root.DOKDO_AUTH_CONFIG;let controller=null,starting=false,identity=null,state=null,menu=null,activeLink=null,epoch=0;
 const secure=!!(config?.profileEnabled||config?.kakaoEnabled||config?.privateRecordsEnabled),sessionKey=secure?'dokdo-account-session-v2':'dokdo-account-session-v1';
 const en=()=>d.documentElement.lang==='en',tr=(ko,us)=>en()?us:ko;
 function accountUrl(next='./',edit=false){return(isolated?'https://dokdo-school-v2.vercel.app/dokdo-next/account.html':'./account.html')+'?next='+encodeURIComponent(next)+(edit?'&profile=1':'');}
 function potential(){if(isolated||config?.enabled!==true)return false;try{return !!root.localStorage.getItem(sessionKey);}catch(e){return false;}}
 function closeMenu(focus=false){if(menu)menu.hidden=true;if(activeLink){activeLink.setAttribute('aria-expanded','false');if(focus)activeLink.focus();}activeLink=null;}
 function menuFor(link,next){
  if(!menu){menu=d.createElement('div');menu.className='account-entry-menu';menu.id='account-entry-menu';menu.hidden=true;menu.setAttribute('aria-label',tr('내 계정 메뉴','My account menu'));
   for(const[id,label,us]of[['account-menu-records','내 기록','My records'],['account-menu-profile','프로필 설정','Profile settings']]){const a=d.createElement('a');a.id=id;a.textContent=tr(label,us);menu.append(a);}
   const out=d.createElement('button');out.id='account-menu-signout';out.type='button';out.onclick=async()=>{const ok=await controller?.signOut();if(ok)closeMenu();else{const note=d.getElementById('account-menu-status');note.textContent=tr('로그아웃하지 못했어요. 다시 눌러 주세요.','Could not sign out. Please try again.');}};menu.append(out);const note=d.createElement('p');note.id='account-menu-status';note.setAttribute('role','status');menu.append(note);link.parentElement.append(menu);
  }
  d.getElementById('account-menu-records').href=accountUrl(next);d.getElementById('account-menu-profile').href=accountUrl(next,true);
  menu.hidden=!menu.hidden;const box=link.getBoundingClientRect();menu.style.left=Math.max(14,Math.min(box.right-230,root.innerWidth-244))+'px';menu.style.top=(box.bottom+8)+'px';activeLink=link;link.setAttribute('aria-expanded',String(!menu.hidden));
 }
 function paint(){
  const signed=!!identity&&identity.id===state?.user?.id;
  for(const id of['account-link','game-account-link']){const link=d.getElementById(id);if(!link)continue;const next=id==='game-account-link'?'games.html':'./';link.href=accountUrl(next);
   if(isolated){link.target='_blank';link.rel='noopener noreferrer';}
   link.setAttribute('data-no-translate','');link.textContent=signed?(identity.nickname?identity.nickname+tr(' · 내 기록',' · My records'):tr('닉네임 설정','Choose a nickname')):state?.busy||starting?tr('계정 확인 중…','Checking account…'):tr('로그인','Sign in');
   link.setAttribute('aria-label',signed?link.textContent:tr('로그인 · 내 계정','Sign in · my account'));
   link.onclick=signed?event=>{event.preventDefault();menuFor(link,next);}:null;
   if(signed){link.setAttribute('aria-haspopup','true');link.setAttribute('aria-controls','account-entry-menu');link.setAttribute('aria-expanded',String(activeLink===link&&!menu?.hidden));}else{link.removeAttribute?.('aria-haspopup');link.removeAttribute?.('aria-controls');link.removeAttribute?.('aria-expanded');}
  }
  if(menu){menu.setAttribute('aria-label',tr('내 계정 메뉴','My account menu'));d.getElementById('account-menu-records').textContent=tr('내 기록','My records');d.getElementById('account-menu-profile').textContent=tr('프로필 설정','Profile settings');const out=d.getElementById('account-menu-signout');out.textContent=tr('로그아웃','Sign out');out.disabled=!!state?.busy;}
  if(!signed)closeMenu();
 }
 async function start(){
  if(controller){controller.refresh();return;}if(starting||!potential())return;const started=epoch;starting=true;paint();
  try{await new Promise((resolve,reject)=>{if(root.supabase?.createClient)return resolve();const script=d.createElement('script');script.src='./assets/vendor/supabase-2.118.0.js';script.integrity='sha384-TcHRA3zBbn+Lexh5n+Oil4guNPOS3rjNDpGRAN46u/s/mB2IZ50ceC6TYDU2yvgK';script.crossOrigin='anonymous';script.onload=resolve;script.onerror=reject;d.head.append(script);});
   if(started!==epoch)return;if(!root.DokdoAccount)throw Error('Account unavailable');const entry=new URL('account.html',root.location.href);entry.search='';entry.hash='';const cleanup=root.DokdoAccount.sessionCleanup(root.localStorage,root.navigator.locks);
   const created=root.DokdoAccount.createController({config,sdk:root.supabase,currentUrl:entry.href,cleanup,onChange:s=>{if(started!==epoch)return;state=s;paint();},onAccount:(user,client,verifiedUser)=>{if(started!==epoch)return;identity=null;if(user){const p=verifiedUser?.user_metadata?.dokdo_school_profile_v1,n=typeof p?.nickname==='string'?p.nickname.trim().normalize('NFC'):'';identity={id:user.id,nickname:p?.version===1&&n.length<=40&&!/[\u0000-\u001f\u007f]/.test(n)?n:''};}paint();}});controller=created;await created.init();if(started!==epoch)created.dispose();
  }catch(e){if(started===epoch){identity=null;state=null;}}finally{if(started===epoch){starting=false;paint();}}
 }
 d.addEventListener('dokdo:language',paint);d.addEventListener('dokdo:present',paint);d.addEventListener('dokdo:view',paint);
 d.addEventListener('click',event=>{if(menu&&!menu.hidden&&!menu.contains(event.target)&&event.target!==activeLink)closeMenu();});d.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu(true);});
 root.addEventListener?.('storage',event=>{if(event.key===sessionKey)start();});d.addEventListener('visibilitychange',()=>{if(!d.hidden)start();});root.addEventListener?.('pagehide',()=>{epoch++;controller?.dispose();controller=null;identity=null;state=null;starting=false;});root.addEventListener?.('pageshow',event=>{if(event.persisted){epoch++;controller=null;identity=null;state=null;starting=false;closeMenu();paint();start();}});
 root.DokdoAccountEntry={openProfile(next='./'){if(!potential())return false;root.location.assign(accountUrl(next==='games.html'?'games.html':'./',true));return true;}};
 paint();start();
})(typeof globalThis!=='undefined'?globalThis:this);
