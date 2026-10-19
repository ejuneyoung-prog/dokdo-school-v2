/* A private local garden summary and user-initiated PNG export. No uploads. */
(function(){
'use strict';
const G=window.DokdoGames,P=window.DokdoGarden,A=window.DokdoGameArt;if(!G||!P||!A)return;
const en=()=>document.documentElement.lang==='en',say=(ko,english)=>en()?english:ko;
function record(){try{const preview=window.DokdoApp?.mode==='preview',raw=preview?null:localStorage.getItem(G.KEY);const s=raw?G.validate(JSON.parse(raw)):G.fresh();G.adoptLearning(s,P.learning());return s;}catch(e){return null;}}
let current=null,summary=null,count=null,note=null,save=null;
const nextKo={meadow:'해국 100송이와 잔디 100곳을 함께 채워 보세요.',tree:'다음은 사철나무 숲이에요.',shrimp:'다음은 바다의 새우 친구들이에요.',gull:'다음은 하늘의 괭이갈매기예요.',seal:'이제 어려운 10단계부터 강치를 한 마리씩 모아요.',challenge:'20단계를 완성하면 마지막 별이 빛나요.',star:'나만의 알록달록 독도 완성! 기록 도전은 계속돼요.'};
const nextEn={meadow:'Grow 100 flowers and 100 grass patches together.',tree:'Grow an evergreen grove next.',shrimp:'Meet more shrimp friends next.',gull:'Welcome black-tailed gulls next.',seal:'Collect Gangchi one by one through the harder stage-10 challenges.',challenge:'Complete stage 20 to light the final star.',star:'Your colorful Dokdo is complete. Keep improving your records!'};
function refresh(){
 current=record();if(!current)return;
 const target=document.querySelector('.island-card .scene-note')||document.querySelector('#v3-snapshot-note');if(!target)return;
 if(!summary){summary=document.createElement('div');summary.className='garden-summary';count=document.createElement('p');note=document.createElement('p');save=document.createElement('button');save.type='button';save.className='text-button';save.onclick=exportPicture;summary.append(count,note,save);target.after(summary);}
 const p=P.view(current);count.textContent=say('해국 '+p.flowers+'/100송이 · 잔디 '+p.grass+'/100곳','Flowers '+p.flowers+'/100 · Grass '+p.grass+'/100');
 note.textContent=say(nextKo[p.next],nextEn[p.next]);save.textContent=say('내 독도 자랑하기 · 사진 저장 ↓','Show my Dokdo · Save picture ↓');save.disabled=false;
}
function exportPicture(){
 const s=record();if(!s)return;save.disabled=true;
 try{const scene=document.createElement('canvas');scene.width=1120;scene.height=430;A.island(scene,s,0);
 const picture=document.createElement('canvas');picture.width=1120;picture.height=580;const c=picture.getContext('2d');c.fillStyle='#f3f7ef';c.fillRect(0,0,1120,580);c.fillStyle='#234f38';c.font='700 36px Gmarket, GmarketSans, sans-serif';c.fillText(say('내가 가꾼, 나의 독도','My own colorful Dokdo'),42,59);const p=P.view(s);c.font='500 20px Gmarket, GmarketSans, sans-serif';c.fillText(say('해국 '+p.flowers+'송이 · 잔디 '+p.grass+'곳 · 독도 코리아 스쿨','Flowers '+p.flowers+' · Grass '+p.grass+' · Dokdo Korea School'),42,101);c.drawImage(scene,0,130);
 picture.toBlob(blob=>{try{if(!blob)throw Error('image');const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='my-dokdo.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);note.textContent=say('사진을 저장했어요. 원하는 곳에 직접 공유해 보세요.','Picture saved. Share it wherever you like.');}catch(e){note.textContent=say('사진을 저장하지 못했어요. 다시 눌러 주세요.','Could not save the picture. Please try again.');}finally{save.disabled=false;}},'image/png');
 }catch(e){save.disabled=false;note.textContent=say('사진을 저장하지 못했어요. 다시 눌러 주세요.','Could not save the picture. Please try again.');}
}
document.addEventListener('dokdo:garden',refresh);document.addEventListener('dokdo:present',refresh);document.addEventListener('dokdo:language',refresh);window.addEventListener('storage',refresh);refresh();
})();
