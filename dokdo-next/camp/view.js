// 2D 독멍(11/10 교수님: "힐링을 시작하면 2D 그림을 보면서 힐링을 하면 되는 거 아냐, 3D로 관광을 하는 거고").
// 힐링존에 들어오면 이 그림이 먼저 보인다. three.js 없이 돌아서, 3D를 못 켜는 기기에서도 바라보기는 된다.
// 그림은 독도 위치의 해 높이로 새벽·한낮·노을·밤을 고른다(?scene=dawn|day|dusk|night 로 골라 볼 수 있음).
// 1분마다 'dokdo-view-minute'를 알리면 healing.js가 대황을 준다(3분 쉬기와 같은 하루 10개 한도).
(function(){
'use strict';
const $=q=>document.querySelector(q),V=$('#view');if(!V)return;
const NAME={dawn:'새벽의 독도',day:'한낮의 독도',dusk:'노을 지는 독도',night:'밤의 독도'};
// 해 높이(도)와 오전·오후. 천문 근사식이라 몇 분 정도 어긋날 수 있다.
function sun(now){const r=Math.PI/180,d=now/864e5-10957.5,g=(357.529+.98560028*d)*r,q=280.459+.98564736*d,L=(q+1.915*Math.sin(g)+.02*Math.sin(2*g))*r,e=(23.439-3.6e-7*d)*r;
 const ra=Math.atan2(Math.cos(e)*Math.sin(L),Math.cos(L))/r,dec=Math.asin(Math.sin(e)*Math.sin(L)),lat=37.24*r,lst=(280.46061837+360.98564736629*d+131.87)%360;
 let ha=((lst-ra)%360+540)%360-180;const alt=Math.asin(Math.sin(lat)*Math.sin(dec)+Math.cos(lat)*Math.cos(dec)*Math.cos(ha*r))/r;return{alt,am:ha<0}}
function sceneOf(now){const s=sun(now);return s.alt< -5?'night':s.alt>10?'day':s.am?'dawn':'dusk'}
let pick='';try{pick=new URLSearchParams(location.search).get('scene')||''}catch(e){}
const sc=NAME[pick]?pick:sceneOf(Date.now());V.dataset.scene=sc;$('#v-time').textContent=NAME[sc];
document.body.classList.add('v2d');
// 그림이 떠 있는 동안 뒤의 3D 화면은 누르거나 Tab으로 갈 수 없게 둔다(inert).
function lock(on){[...document.body.children].forEach(e=>{if(e!==V&&e.id!=='toast'&&e.tagName!=='SCRIPT')e.inert=on})}
lock(true);
// 그림 틀: 두 섬(가로 305~1305)이 카드에 가리지 않는 자리에 오도록 viewBox를 고른다.
const art=$('#v-art'),card=$('#v-card');
function frame(){const W=innerWidth,H=innerHeight,cv=!V.classList.contains('watching')&&card.offsetParent?card.getBoundingClientRect():null;let x,y,w,h;
 if(W/H<1.1){w=1000;h=w*H/W;const free=cv?cv.top:H*.8,hz=Math.min(H*.5,free*.72);x=305;y=600-hz*h/W*W/H}
 else{const R=cv?cv.right+12:0,room=W-R;w=Math.max(1600,1000*W/Math.max(room,1)*1.1);h=w*H/W;x=805-(R+room/2)*w/W;y=600-.62*h}
 art.setAttribute('viewBox',[x,y,w,h].map(Math.round).join(' '))}
frame();addEventListener('resize',frame);
let au=null,timer=0,t0=0,mins=0,on=true,paid=false;
const breath=$('#v-breath'),left=$('#v-min'),snd=$('#v-snd');
// 소리 크기는 3D 화면에서 맞춘 값(vol, 0~100, 기본 45)을 따른다.
function vol(){let v=45;try{const x=parseFloat(localStorage.getItem('vol'));if(x>=0&&x<=100)v=x}catch(e){}return Math.min(1,.8*Math.pow(v/45,1.6))}
function play(){try{if(!au){au=new Audio('./waves.mp3');au.loop=true;au.setAttribute('playsinline','')}au.volume=vol();if(au.volume>0)au.play().catch(()=>{})}catch(e){}}
function beat(){const e=(Date.now()-t0)/1000,w=e%10<4?'들이쉬고':'내쉬고';if(breath.textContent!==w)breath.textContent=w;const m=Math.floor(e/60);if(m>mins){mins=m;left.textContent=m+'분째 바라보는 중';dispatchEvent(new CustomEvent('dokdo-view-minute'))}}
function start(){V.classList.add('watching');frame();t0=Date.now();mins=0;left.textContent='바라보는 중';breath.hidden=left.hidden=false;if(on)play();clearInterval(timer);timer=setInterval(beat,250);beat();$('#v-stop').focus()}
function stop(){clearInterval(timer);timer=0;V.classList.remove('watching');breath.hidden=left.hidden=true;if(au)au.pause();frame()}
function to3d(){stop();V.hidden=true;lock(false);document.body.classList.remove('v2d');dispatchEvent(new CustomEvent('dokdo-view-3d'));const b=$('#err a')||$('#start');if(b)b.focus()}
// healing.js가 준비되지 못하면(3D를 못 켜는 기기) 대황 약속 문구를 숨긴다.
function reward(){$('#v-reward').hidden=!window.DokdoHealReady}
addEventListener('load',()=>{reward();if(!V.hidden)lock(true)});// 늦게 생긴 #err까지 막는다
$('#v-go').onclick=()=>{reward();start()};
$('#v-stop').onclick=()=>{stop();$('#v-go').focus()};
snd.onclick=()=>{on=!on;snd.textContent=on?'소리 끄기':'소리 켜기';if(on)play();else if(au)au.pause()};
$('#v-3d').onclick=to3d;$('#v-3d2').onclick=to3d;
addEventListener('keydown',e=>{if(e.key==='Escape'&&V.classList.contains('watching')){stop();$('#v-go').focus()}});
try{$('#v-go').focus({preventScroll:true})}catch(e){}
})();
