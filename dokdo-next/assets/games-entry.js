/* Separate island preview and explicit lesson reward bridge; school records stay in the school model. */
(function(){
'use strict';const G=window.DokdoGames,A=window.DokdoGameArt,c=document.getElementById('play-entry-island');if(!G||!A||!c)return;
const live=document.querySelector('meta[name="dokdo-mode"]')?.content==='live';
function paint(){let s=G.fresh();try{const raw=live?localStorage.getItem(G.KEY):null;if(raw)s=G.validate(JSON.parse(raw));}catch(e){document.getElementById('play-entry-level').textContent='기록 확인 필요';A.island(c,s);return;}A.island(c,s);document.getElementById('play-entry-level').textContent='Lv. '+G.level(s.xp);}
let queue=Promise.resolve();
window.DokdoPlayBridge={rewardLearning(family){if(!live)return Promise.resolve(false);const run=()=>{const raw=localStorage.getItem(G.KEY),s=raw?G.validate(JSON.parse(raw)):G.fresh();const earned=G.rewardLearning(s,family);if(earned)localStorage.setItem(G.KEY,JSON.stringify(s));paint();return earned;};const job=queue.then(()=>navigator.locks?.request?navigator.locks.request(G.KEY,run):run());queue=job.catch(()=>{});return job;}};
paint();window.addEventListener('pageshow',paint);window.addEventListener('storage',e=>{if(e.key===G.KEY)paint();});
})();
