// 태극기 게양 · 독도를 지킨 날 · 태극기 흔들기 · 외침판(11/20 합치기 3단계). 서버 없이 이 브라우저에서만 돈다. 아무것도 보내지 않는다.
// - 게양: 한국 날짜로 그날 처음 들어오면(입구에서 장소를 고른 뒤) 태극기가 올라가고 '독도를 지킨 날'이 하루 는다. 알림 한 번으로만 알린다.
//   바다에 있으면 내 배 돛대 위 깃대, 어느 쉼터(선착장·서도 숙소·동도 정상)에 앉아 있으면 선착장 깃대에 올라간다. 빠진 날이 있어도 줄지 않는다.
//   3D를 못 켜는 기기(2D 그림만)에서도 그날 처음 열면 지킨 날을 하루 센다.
// - 흔들기: 라임 단추 옆 '흔들기' 단추. 선장이 오른팔을 머리 위로 들어 손깃발을 흔들고, 말풍선(국기·닉네임 / 독도는 한국 땅!), 진동, 목소리.
//   하루 20번까지 센다(20번째에 알림 한 번). 그 뒤에도 흔들기·말풍선·목소리는 그대로, 세기만 멈춘다. 뱃머리 시점에서는 화면 아래에 깃발이 잠깐 흔들린다.
// - 목소리: camp/voice/의 넷 가운데 하나를 무작위로, 바로 앞과 같은 것은 빼고(교수님 결정). 처음 누를 때 받아 온다. 소리 켜고 끄기·크기를 따른다.
// - 외침판: 오른쪽 위(소리 단추 아래)의 작은 탭. 내가 눌러도 저절로 열리지 않고, 탭을 눌러야 열린다. 줄 모양 'HH:MM [국기] 닉네임: 말', 같은 말이 이어지면 ×n.
//   내 화면의 내 줄에는 내 닉네임(3D 이름표와 같은 값)과 스쿨 기록의 나라 국기를 쓴다. 국기가 없으면 나라를 짐작하지 않고 작은 태극기 그림을 쓴다.
//   다른 사람에게 보일 이름은 보내는 순간 DokdoPrivacy.mayShare()로 거른다(shout-core speaker, 실시간 PR에서).
// 계산은 shout-core.js, 태극기 모양은 flag.js(국기 작도법), 선장 팔은 captain.js.
(function(){
'use strict';
const H=window.DokdoHeal,C=window.DokdoShout,F=window.DokdoTaegeukgi,$=q=>document.querySelector(q);
// 3D를 못 켜는 기기: 그날 처음 열면 지킨 날만 센다(다른 기록 칸은 그대로 두고 새 칸만 고침).
if(!H||!H.three){if(C){try{const raw=localStorage.getItem('dokdo-heal');let st=raw?JSON.parse(raw):{};if(!st||typeof st!=='object'||Array.isArray(st))st=null;if(st&&C.raise(st,C.kstDay(Date.now())).raised)localStorage.setItem('dokdo-heal',JSON.stringify(st))}catch(e){}}return}
if(!C||!F)return;
const X=H.three(),T=X.T,calm=H.calm?H.calm():matchMedia('(prefers-reduced-motion: reduce)').matches;
const day=()=>C.kstDay(Date.now()),st=()=>C.tidy(H.state());
const mk=(t,cl,tx)=>{const e=document.createElement(t);if(cl)e.className=cl;if(tx!=null)e.textContent=tx;return e};
const SAY='독도는 한국 땅!';
const tgURL=(()=>{try{return F.canvas(40).toDataURL()}catch(e){return''}})();// 작은 태극기 그림(국기가 없을 때·단추)
// ── 태극기 그림(텍스처) ──
const tex=(()=>{const t=new T.CanvasTexture(F.canvas(128));if(T.SRGBColorSpace)t.colorSpace=T.SRGBColorSpace;return t})();
const flagMesh=(w)=>{const g=new T.PlaneGeometry(w,w/1.5);g.translate(w/2,0,0);// 왼쪽 끝(깃대 쪽)이 원점
 return new T.Mesh(g,new T.MeshStandardMaterial({map:tex,side:T.DoubleSide,roughness:.9}))};
const white=new T.MeshStandardMaterial({color:0xf2f2f0,roughness:.6});
// ── 내 배 돛대 위 깃대 ──
const mast=X.boat.userData.mast;
const staff=new T.Mesh(new T.CylinderGeometry(.12,.14,4.2,6),white);staff.position.y=9.5;mast.add(staff);// 돛대(높이 15) 꼭대기 위로
const mastFlag=flagMesh(3.9);mast.add(mastFlag);const MAST={lo:8.1,hi:10.2};mastFlag.position.set(.1,MAST.hi,0);
// ── 선착장 깃대: 선착장 화면에서 선장의 오른쪽 가까이 조금 뒤. 말풍선과 겹치지 않게 낮게, 화면 밖으로 잘리지 않게 가까이 ──
// 선착장 카메라 방향은 healing.js heal('dock')와 같은 값(서도를 보는 방향 - 0.78). 선장 자리는 seatOf('dock',1)와 같은 값.
const Q=X.quay,qdx=Q.lx-Q.x,qdz=Q.lz-Q.z,ql=Math.hypot(qdx,qdz)||1,yawD=Math.atan2(Q.x-Q.lx,Q.z-Q.lz)-.78;
const seatX=Q.x+qdz/ql*3.9,seatZ=Q.z-qdx/ql*3.9,leftX=-Math.cos(yawD),leftZ=Math.sin(yawD),fwdX=-Math.sin(yawD),fwdZ=-Math.cos(yawD);
const pole=new T.Group();pole.position.set(seatX-leftX*4.5+fwdX*3,Q.y,seatZ-leftZ*4.5+fwdZ*3);pole.rotation.y=yawD;X.scene.add(pole);
{const p=new T.Mesh(new T.CylinderGeometry(.22,.3,12.4,8),white);p.position.y=6.2;pole.add(p);const k=new T.Mesh(new T.SphereGeometry(.42,8,6),white);k.position.y=12.6;pole.add(k)}
const poleFlag=flagMesh(4.5);pole.add(poleFlag);const POLE={lo:2.4,hi:10.9};poleFlag.position.set(.25,POLE.hi,0);
// ── 선장의 손깃발: 오른팔(captain.js)이 쥔다. 팔을 들면 머리 위로 올라간다 ──
const who=X.boat.userData.who,armR=who.userData.armR,hand=new T.Group();hand.visible=false;
{const stick=new T.Mesh(new T.CylinderGeometry(.09,.09,3.6,5),new T.MeshStandardMaterial({color:0x8a5a36}));stick.position.y=-1.8;hand.add(stick);
 const f=flagMesh(3.3);f.position.set(0,-3.2,0);f.rotation.z=Math.PI;// 팔을 들면 깃대 끝에서 바깥쪽으로 펼쳐진다
 hand.add(f);hand.userData.flag=f}
if(armR){hand.position.set(0,-2.25,0);armR.add(hand)}else{hand.position.set(-2.2,5,.4);hand.rotation.z=Math.PI;who.add(hand)}
// ── 움직임: 올리기(1.8초)와 흔들기(2초)가 있을 때만 돈다 ──
let raiseAt=0,raiseOn=null,waveAt=0,raf=0;
function show(){const up=C.raisedOn(st(),day());mastFlag.visible=poleFlag.visible=up||!!raiseOn}
function frame(n){raf=0;let more=false;
 if(raiseOn){const k=Math.min(1,(n-raiseAt)/(calm?1:1800)),e=k*k*(3-2*k),R=raiseOn===poleFlag?POLE:MAST;raiseOn.position.y=R.lo+(R.hi-R.lo)*e;if(k<1)more=true;else raiseOn=null}
 if(waveAt){const t=n-waveAt;if(t<2000){const k=calm?1:Math.min(1,t/250,(2000-t)/250);hand.visible=true;if(window.DokdoCaptain&&armR)DokdoCaptain.pose(who,k,t,calm);
   mastFlag.rotation.y=calm?0:Math.sin(t*.03)*.7;more=true}else{waveAt=0;hand.visible=false;mastFlag.rotation.y=0;if(window.DokdoCaptain)DokdoCaptain.pose(who,0,0,true)}}
 if(more)raf=requestAnimationFrame(frame)}
const kick=()=>{if(!raf)raf=requestAnimationFrame(frame)};
// ── 게양: 입구에서 장소를 고른 뒤, 그날 처음이면 ──
let entered=false;
function tryRaise(){if(!entered||document.body.classList.contains('v2d'))return;const s=st(),r=C.raise(s,day());if(!r.raised){show();return}H.keep();
 raiseOn=H.seated()?poleFlag:mastFlag;// 쉼터(선착장·서도 숙소·동도 정상)에 앉아 있으면(돛대가 안 보임) 선착장 깃대
 raiseOn.position.y=(raiseOn===poleFlag?POLE:MAST).lo;raiseAt=performance.now();show();kick();
 later('태극기를 올렸어요 · 독도를 지킨 날 '+r.n+'일째');refresh()}
// 알림은 깃발이 다 올라간 뒤에, 다른 알림(환영 인사 등)이 떠 있으면 사라진 다음에 띄운다(가로채지 않음).
function later(x){let k=0;setTimeout(function w(){if($('#toast').hidden||++k>40){H.toast(x);return}setTimeout(w,250)},2000)}
function onEnter(){if(entered||!$('#enter').hidden)return;entered=true;setTimeout(tryRaise,1200)}
new MutationObserver(onEnter).observe($('#enter'),{attributes:true,attributeFilter:['hidden']});onEnter();
setInterval(tryRaise,30000);// 열어 둔 채 자정을 넘기면 다음 날 태극기를 올린다
show();
// ── 나: 3D 이름표와 같은 닉네임 + 스쿨 기록의 나라 국기 ──
function me(){let raw=null;try{raw=localStorage.getItem('dokdo-korea-school-cinematic-v1')}catch(e){}return{name:H.nick(),flag:C.schoolFlag(raw)}}
// 말풍선 첫 줄(작게): [국기] 닉네임. 3D 이름표의 말풍선 칸에 data-who로 붙인다(내 말풍선은 늘 나).
function tagMe(){const b=$('#tags .tag.me .bubble');if(!b)return;const m=me();b.dataset.who=(m.flag?m.flag+' ':'')+m.name;b.classList.toggle('tg',!m.flag);if(tgURL)b.style.setProperty('--tg','url('+tgURL+')')}
tagMe();{const n=$('#nick');if(n)n.addEventListener('input',tagMe)}
// ── 흔들기 단추: 라임 단추 바로 옆, 그림과 글자 ──
const act=$('#act'),btn=mk('button');btn.id='flagwave';btn.type='button';btn.title='태극기 흔들기';btn.setAttribute('aria-label','태극기 흔들기');
{const c=F.canvas(40);c.className='fw-flag';c.setAttribute('aria-hidden','true');btn.append(c,mk('span','fw-txt','흔들기'))}
if(act)act.after(btn);
// 뱃머리 시점: 선장이 화면에 없으므로 화면 아래 가운데에 깃발을 잠깐(1.8초) 흔든다.
const bowFx=mk('div');bowFx.id='fw-bow';bowFx.hidden=true;bowFx.setAttribute('aria-hidden','true');{const c=F.canvas(60);bowFx.append(c)}document.body.append(bowFx);let bowT=0;
function bowWave(){if(!H.bow||!H.bow())return;bowFx.hidden=false;bowFx.classList.remove('go');void bowFx.offsetWidth;bowFx.classList.add('go');clearTimeout(bowT);bowT=setTimeout(()=>{bowFx.hidden=true},1800)}
// 목소리: 처음 누를 때 넷을 받아 풀어 둔다.
const VOICE=['shout-f1','shout-f2','shout-m1','shout-m2'],next=C.picker(VOICE.length),buf={};let asked=false;
function load(A){if(asked)return;asked=true;VOICE.forEach(v=>{buf[v]=fetch('./voice/'+v+'.mp3').then(r=>{if(!r.ok)throw 0;return r.arrayBuffer()}).then(b=>new Promise((y,x)=>A.decodeAudioData(b,y,x))).catch(()=>null)})}
function speak(){const S=H.sound();if(!S||!S.on||!S.AC||!S.mix)return;load(S.AC);const v=VOICE[next()],t0=Date.now();
 buf[v].then(b=>{if(!b||Date.now()-t0>2500)return;const so=S.AC.createBufferSource(),g=S.AC.createGain();so.buffer=b;g.gain.value=1;so.connect(g);g.connect(S.mix);so.start();dispatchEvent(new CustomEvent('dokdo-shout-voice',{detail:{file:v+'.mp3'}}))})}
btn.onclick=()=>{const s=st(),r=C.wave(s,day());if(r.counted)H.keep();
 tagMe();H.cheer(SAY);waveAt=performance.now();kick();bowWave();
 try{if(window.DokdoHaptic)DokdoHaptic.buzz('cue')}catch(e){}// 누름(tap)보다 조금 긴 진동
 speak();line(SAY);refresh();
 if(r.counted&&r.n===C.WAVE_DAY)setTimeout(()=>H.toast('오늘 흔들기 20번 모두 셌어요 · 내일 또 세요'),400)};
// ── 외침판 ──
const box=mk('aside');box.id='shout';box.setAttribute('aria-label','외침판');box.hidden=true;
const list=mk('ol');list.id='sh-list';list.setAttribute('aria-live','polite');list.setAttribute('aria-relevant','additions');
const pane=mk('div');pane.id='sh-pane';pane.hidden=true;pane.append(list);
const tab=mk('button');tab.id='sh-tab';tab.type='button';tab.setAttribute('aria-expanded','false');tab.setAttribute('aria-controls','sh-pane');const tabN=mk('b','','0');tab.append('외침판 ',tabN);
box.append(tab,pane);document.body.append(box);
const lines=[],clockF=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
// 한 줄 그리기: HH:MM [국기] 닉네임: 말 ×n
function row(l){const li=mk('li');li.append(mk('time','',l.at),' ');if(l.flag)li.append(mk('span','fl',l.flag),' ');else if(tgURL){const im=mk('img','fl');im.src=tgURL;im.alt='';li.append(im,' ')}
 li.append(mk('b','',l.who+':'),' '+l.text);const n=mk('span','n',l.n>1?'×'+l.n:'');li.append(n);l.li=li;return li}
// 새 줄만 덧붙인다(읽어 주기 기능이 목록 전체를 다시 읽지 않게). 같은 말이 이어지면 앞 줄의 시각과 ×n만 고친다.
function line(text){const m=me(),l={who:m.name,flag:m.flag,text,at:clockF.format(new Date())},how=C.push(lines,l);
 if(how==='merge'){const last=lines[lines.length-1];if(last.li){last.li.querySelector('time').textContent=last.at;last.li.querySelector('.n').textContent='×'+last.n}}
 else{list.append(row(l));while(list.children.length>lines.length)list.firstElementChild.remove()}
 tabN.textContent=String(lines.length);box.hidden=false;if(!pane.hidden)pane.scrollTop=pane.scrollHeight}
function open(v){pane.hidden=!v;tab.setAttribute('aria-expanded',v);box.classList.toggle('open',v);if(v)pane.scrollTop=pane.scrollHeight}
tab.onclick=()=>open(pane.hidden);
// 인사 줄의 정해진 말(안녕하세요·풍경이 참 좋아요·같이 쉬어요·또 만나요)도 말풍선(국기·닉네임 줄 포함)과 함께 외침판에 남긴다.
// 11/20 교수님 결정: 인사는 문장 골라 보내기만(자유 입력 칸은 index.html에서 뺌, 이름 칸은 그대로). '독도는 한국 땅!'은 흔들기 단추가 맡는다.
const w=$('#wave');if(w)w.addEventListener('click',()=>{tagMe();line('안녕하세요!')});
document.querySelectorAll('#p-talk .q').forEach(b=>b.addEventListener('click',()=>{tagMe();line(b.textContent)}));
// ── 내 배 판이 읽는 값: 지킨 날, 오늘 흔들기 ──
function refresh(){if(window.DokdoBoard)DokdoBoard.refresh()}
// 시험·점검용으로 지금 상태만 읽어 볼 수 있게 둔다(쓰기 없음).
window.DokdoWave={today:()=>{const s=st();return{kept:s.kN,waves:C.wavesOn(s,day()),cap:C.WAVE_DAY}},
 flags:()=>({mast:mastFlag.visible?+mastFlag.position.y.toFixed(2):null,pole:poleFlag.visible?+poleFlag.position.y.toFixed(2):null,top:{mast:MAST.hi,pole:POLE.hi}}),
 lines:()=>lines.map(({li,...l})=>({...l})),waving:()=>hand.visible,arm:()=>armR?+armR.rotation.z.toFixed(2):null,hop:()=>+who.position.y.toFixed(2),mastSwing:()=>+mastFlag.rotation.y.toFixed(2),
 handTop:()=>{const v=new T.Vector3();hand.userData.flag.getWorldPosition(v);const h=new T.Vector3();who.children[1].getWorldPosition(h);return{flag:+v.y.toFixed(2),head:+h.y.toFixed(2)}}};
refresh();
})();
