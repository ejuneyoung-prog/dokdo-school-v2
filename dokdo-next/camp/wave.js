// 태극기 게양 · 독도를 지킨 날 · 태극기 흔들기 · 외침판(11/20 합치기 3단계). 서버 없이 이 브라우저에서만 돈다. 아무것도 보내지 않는다.
// - 게양: 한국 날짜로 그날 처음 들어오면(입구에서 장소를 고른 뒤) 태극기가 올라가고 '독도를 지킨 날'이 하루 는다.
//   선착장에 있으면 선착장 깃대에, 바다에 있으면 내 배 돛대 위 깃대에 올라간다. 빠진 날이 있어도 줄지 않는다.
// - 흔들기: 라임 단추 옆 작은 태극기 단추. 선장이 손깃발을 흔들고 '독도는 한국 땅!' 말풍선, 안드로이드는 짧은 진동, 목소리 하나.
//   하루 20번까지 센다. 20번이 넘으면 흔들기와 말풍선은 되지만 세지 않고 목소리도 내지 않는다.
// - 목소리: camp/voice/의 넷 가운데 하나를 무작위로, 바로 앞과 같은 것은 빼고(교수님 결정). 처음 누를 때 받아 온다(페이지를 열 때 받지 않음).
//   소리 켜고 끄기·소리 크기를 따른다(3D 소리 줄기 mix로 낸다).
// - 외침판: 오른쪽 가장자리의 좁은 판. 새 줄이 오면 올라오고 몇 초 뒤 작은 탭으로 접힌다. 지금은 내 줄과 안내 줄만, 메모리에 30줄까지.
//   이름은 어린이 보호 확인(DokdoPrivacy.mayShare)이 참일 때만 닉네임, 아니면 '독도 친구'.
// 계산은 shout-core.js, 태극기 모양은 flag.js(국기 작도법).
(function(){
'use strict';
const H=window.DokdoHeal,C=window.DokdoShout,F=window.DokdoTaegeukgi,$=q=>document.querySelector(q);
if(!H||!H.three||!C||!F)return;
const T=H.three().T,calm=matchMedia('(prefers-reduced-motion: reduce)').matches;
const day=()=>C.kstDay(Date.now()),st=()=>C.tidy(H.state());
const mk=(t,cl,tx)=>{const e=document.createElement(t);if(cl)e.className=cl;if(tx!=null)e.textContent=tx;return e};
const SAY='독도는 한국 땅!';
// ── 태극기 그림(텍스처) ──
const tex=(()=>{const t=new T.CanvasTexture(F.canvas(128));if(T.SRGBColorSpace)t.colorSpace=T.SRGBColorSpace;return t})();
const flagMesh=(w)=>{const g=new T.PlaneGeometry(w,w/1.5);g.translate(w/2,0,0);// 왼쪽 끝(깃대 쪽)이 원점
 return new T.Mesh(g,new T.MeshStandardMaterial({map:tex,side:T.DoubleSide,roughness:.9}))};
const white=new T.MeshStandardMaterial({color:0xf2f2f0,roughness:.6});
// ── 내 배 돛대 위 깃대 ──
const X=H.three(),mast=X.boat.userData.mast;
const staff=new T.Mesh(new T.CylinderGeometry(.12,.14,4.2,6),white);staff.position.y=9.5;mast.add(staff);// 돛대(높이 15) 꼭대기 위로
const mastFlag=flagMesh(3.9);mast.add(mastFlag);const MAST={lo:8.1,hi:10.2};mastFlag.position.set(.1,MAST.hi,0);
// ── 선착장 깃대: 선장 옆, 선착장 화면 쪽을 보게 ──
const Q=X.quay,qdx=Q.lx-Q.x,qdz=Q.lz-Q.z,ql=Math.hypot(qdx,qdz)||1;
const pole=new T.Group();pole.position.set(Q.x-qdz/ql*7.5,Q.y,Q.z+qdx/ql*7.5);pole.rotation.y=Math.atan2(Q.x-Q.lx,Q.z-Q.lz)-.78;X.scene.add(pole);
{const p=new T.Mesh(new T.CylinderGeometry(.22,.3,14,8),white);p.position.y=7;pole.add(p);const k=new T.Mesh(new T.SphereGeometry(.42,8,6),white);k.position.y=14.2;pole.add(k)}
const poleFlag=flagMesh(4.5);pole.add(poleFlag);const POLE={lo:2.4,hi:12.4};poleFlag.position.set(.25,POLE.hi,0);
// ── 선장의 손깃발 ──
const who=X.boat.userData.who,hand=new T.Group();hand.position.set(1.9,2.4,.4);hand.visible=false;who.add(hand);
{const stick=new T.Mesh(new T.CylinderGeometry(.07,.07,3.2,5),new T.MeshStandardMaterial({color:0x8a5a36}));stick.position.y=1.6;hand.add(stick);const f=flagMesh(1.9);f.position.set(.05,2.75,0);hand.add(f)}
// ── 움직임: 올리기(1.8초)와 흔들기(2초)가 있을 때만 돈다 ──
let raiseAt=0,raiseOn=null,waveAt=0,raf=0;
function show(){const up=C.raisedOn(st(),day());mastFlag.visible=poleFlag.visible=up||!!raiseOn}
function frame(n){raf=0;let more=false;
 if(raiseOn){const k=Math.min(1,(n-raiseAt)/(calm?1:1800)),e=k*k*(3-2*k),R=raiseOn===poleFlag?POLE:MAST;raiseOn.position.y=R.lo+(R.hi-R.lo)*e;if(k<1)more=true;else raiseOn=null}
 if(waveAt){const t=n-waveAt;if(t<2000){hand.visible=true;hand.rotation.z=calm?-.25:-.25+Math.sin(t*.013)*.55;more=true}else{waveAt=0;hand.visible=false}}
 if(more)raf=requestAnimationFrame(frame)}
const kick=()=>{if(!raf)raf=requestAnimationFrame(frame)};
// ── 게양: 입구에서 장소를 고른 뒤, 그날 처음이면 ──
let entered=false;
function tryRaise(){if(!entered||document.body.classList.contains('v2d'))return;const s=st(),r=C.raise(s,day());if(!r.raised){show();return}H.keep();
 raiseOn=H.mode()==='dock'?poleFlag:mastFlag;raiseOn.position.y=(raiseOn===poleFlag?POLE:MAST).lo;raiseAt=performance.now();show();kick();
 line('','오늘 태극기를 올렸어요 · 지킨 날 '+r.n+'일째');later('태극기를 올렸어요 · 독도를 지킨 날 '+r.n+'일째');refresh()}
// 알림은 깃발이 다 올라간 뒤에, 다른 알림(환영 인사 등)이 떠 있으면 사라진 다음에 띄운다(가로채지 않음).
function later(x){let k=0;setTimeout(function w(){if($('#toast').hidden||++k>40){H.toast(x);return}setTimeout(w,250)},2000)}
function onEnter(){if(entered||!$('#enter').hidden)return;entered=true;setTimeout(tryRaise,1200)}
new MutationObserver(onEnter).observe($('#enter'),{attributes:true,attributeFilter:['hidden']});onEnter();
setInterval(tryRaise,30000);// 열어 둔 채 자정을 넘기면 다음 날 태극기를 올린다
show();
// ── 흔들기 단추: 라임 단추 바로 옆 ──
const act=$('#act'),btn=mk('button');btn.id='flagwave';btn.type='button';btn.setAttribute('aria-label','태극기 흔들기');btn.title='태극기 흔들기';
{const c=F.canvas(40);c.className='fw-flag';c.setAttribute('aria-hidden','true');btn.append(c)}
if(act)act.after(btn);
// 목소리: 처음 누를 때 넷을 받아 풀어 둔다.
const VOICE=['shout-f1','shout-f2','shout-m1','shout-m2'],next=C.picker(VOICE.length),buf={};let asked=false;
function load(A){if(asked)return;asked=true;VOICE.forEach(v=>{buf[v]=fetch('./voice/'+v+'.mp3').then(r=>{if(!r.ok)throw 0;return r.arrayBuffer()}).then(b=>new Promise((y,x)=>A.decodeAudioData(b,y,x))).catch(()=>null)})}
function speak(){const S=H.sound();if(!S||!S.on||!S.AC||!S.mix)return;load(S.AC);const v=VOICE[next()],t0=Date.now();
 buf[v].then(b=>{if(!b||Date.now()-t0>2500)return;const so=S.AC.createBufferSource(),g=S.AC.createGain();so.buffer=b;g.gain.value=1;so.connect(g);g.connect(S.mix);so.start();dispatchEvent(new CustomEvent('dokdo-shout-voice',{detail:{file:v+'.mp3'}}))})}
btn.onclick=()=>{const s=st(),r=C.wave(s,day());if(r.counted)H.keep();
 H.cheer(SAY);waveAt=performance.now();kick();
 try{if(window.DokdoHaptic)DokdoHaptic.buzz('tap')}catch(e){}
 if(r.counted)speak();line(who_(),SAY);refresh()};
// ── 외침판 ──
const box=mk('aside');box.id='shout';box.setAttribute('aria-label','외침판');box.hidden=true;
const list=mk('ol');list.id='sh-list';list.setAttribute('aria-live','polite');const pane=mk('div');pane.id='sh-pane';pane.hidden=true;pane.append(list);
const tab=mk('button');tab.id='sh-tab';tab.type='button';tab.setAttribute('aria-expanded','false');tab.setAttribute('aria-controls','sh-pane');
box.append(pane,tab);document.body.append(box);
const lines=[],clockF=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
let pinned=false,shut=0;
const who_=()=>C.speaker(window.DokdoPrivacy,H.nick());
function paint(){list.textContent='';lines.forEach(l=>{const li=mk('li',l.who?'':'sys');li.append(mk('time','',l.at),' ');if(l.who){li.append(mk('b','',l.who+':'),' '+l.text)}else li.append(l.text);list.append(li)});
 tab.textContent='';tab.append('외침판 ',mk('b','',String(lines.length)));pane.scrollTop=pane.scrollHeight}
function open(v){pane.hidden=!v;tab.setAttribute('aria-expanded',v);box.classList.toggle('open',v);if(v)pane.scrollTop=pane.scrollHeight}
function line(who,text){C.push(lines,{who,text,at:clockF.format(new Date())});box.hidden=false;paint();open(true);box.classList.remove('rise');void box.offsetWidth;box.classList.add('rise');
 clearTimeout(shut);if(!pinned)shut=setTimeout(()=>{if(!pinned)open(false)},4500)}
tab.onclick=()=>{clearTimeout(shut);pinned=pane.hidden;open(pinned)};
// 인사 줄의 정해진 말(안녕하세요·풍경이 참 좋아요·같이 쉬어요·또 만나요·독도는 한국 땅!)도 말풍선과 함께 외침판에 남긴다.
// 11/20 교수님 결정: 인사는 문장 골라 보내기만. 자유 입력 칸은 index.html에서 뺐다(이름 칸은 그대로).
const w=$('#wave');if(w)w.addEventListener('click',()=>line(who_(),'안녕하세요!'));
document.querySelectorAll('#p-talk .q').forEach(b=>b.addEventListener('click',()=>line(who_(),b.textContent)));
// ── 내 배 판: 지킨 날과 흔들기 n/20 ──
function refresh(){if(window.DokdoBoard)DokdoBoard.refresh()}
(window.DokdoBoardMore=window.DokdoBoardMore||[]).push((card,ul)=>{const s=st(),d=day();
 let days=card.querySelector('.b-days');if(!days){days=mk('span','b-days');card.querySelector('.b-head h2').after(days)}// 제목 줄에 붙여 판 높이를 늘리지 않는다
 const dt='지킨 날 '+s.kN+'일째';if(days.dataset.t!==dt){days.dataset.t=dt;days.textContent='';days.setAttribute('aria-label','독도를 지킨 날 '+s.kN+'일째');days.append('지킨 날 ',mk('b','',String(s.kN)),'일째')}
 let li=ul.querySelector('[data-k=wave]');if(!li){li=mk('li');li.dataset.k='wave';ul.append(li)}
 const n=C.wavesOn(s,d),x='태극기 흔들기 '+n+'/'+C.WAVE_DAY;if(li.textContent!==x)li.textContent=x;li.classList.toggle('done',n>=C.WAVE_DAY)});
// 시험·점검용으로 지금 상태만 읽어 볼 수 있게 둔다(쓰기 없음).
window.DokdoWave={flags:()=>({mast:mastFlag.visible?+mastFlag.position.y.toFixed(2):null,pole:poleFlag.visible?+poleFlag.position.y.toFixed(2):null,top:{mast:MAST.hi,pole:POLE.hi}}),lines:()=>lines.map(l=>({...l})),waving:()=>hand.visible};
})();
