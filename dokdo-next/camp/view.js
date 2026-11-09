// 2D 독멍(11/10 교수님: "힐링을 시작하면 2D 그림을 보면서 힐링을 하면 되는 거 아냐, 3D로 관광을 하는 거고").
// 힐링존에 들어오면 이 그림이 먼저 보인다. three.js 없이 돌아서, 3D를 못 켜는 기기에서도 바라보기는 된다.
// 그림은 한국 시각에 따라 새벽·한낮·노을·밤으로 바뀐다(?scene=dawn|day|dusk|night 로 골라 볼 수 있음).
// 1분마다 'dokdo-view-minute'를 알리면 healing.js가 대황을 준다(3분 쉬기와 같은 하루 10개 한도).
(function(){
'use strict';
const $=q=>document.querySelector(q),V=$('#view');if(!V)return;
const NAME={dawn:'새벽의 독도',day:'한낮의 독도',dusk:'노을 지는 독도',night:'밤의 독도'};
const hour=()=>{try{return +new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',hourCycle:'h23'}).format(new Date())%24}catch(e){return new Date().getHours()}};
const sceneOf=h=>h>=5&&h<7?'dawn':h>=7&&h<16?'day':h>=16&&h<19?'dusk':'night';
let pick='';try{pick=new URLSearchParams(location.search).get('scene')||''}catch(e){}
const sc=NAME[pick]?pick:sceneOf(hour());V.dataset.scene=sc;$('#v-time').textContent=NAME[sc];
document.body.classList.add('v2d');
// 세로 화면에서는 두 섬이 화면 폭에 맞게 들어오고 수평선이 가운데 오도록 그림 틀을 바꾼다.
const art=$('#v-art');function frame(){const W=innerWidth,H=innerHeight;if(W/H<1.1){const w=1000,h=w*H/W;art.setAttribute('viewBox','305 '+Math.round(600-.5*h)+' '+w+' '+Math.round(h))}else art.setAttribute('viewBox','0 0 1600 900')}
frame();addEventListener('resize',frame);
let au=null,timer=0,t0=0,mins=0,on=true;
const breath=$('#v-breath'),left=$('#v-min'),snd=$('#v-snd');
function play(){try{if(!au){au=new Audio('./waves.mp3');au.loop=true;au.volume=.7;au.setAttribute('playsinline','')}au.play().catch(()=>{})}catch(e){}}
function beat(){const e=(Date.now()-t0)/1000,w=e%10<4?'들이쉬고':'내쉬고';if(breath.textContent!==w)breath.textContent=w;const m=Math.floor(e/60);if(m>mins){mins=m;left.textContent=m+'분째 바라보는 중';dispatchEvent(new CustomEvent('dokdo-view-minute'))}}
function start(){V.classList.add('watching');t0=Date.now();mins=0;left.textContent='바라보는 중';breath.hidden=left.hidden=false;if(on)play();clearInterval(timer);timer=setInterval(beat,250);beat();$('#v-stop').focus()}
function stop(){clearInterval(timer);timer=0;V.classList.remove('watching');breath.hidden=left.hidden=true;if(au)au.pause()}
function to3d(){stop();V.hidden=true;document.body.classList.remove('v2d');dispatchEvent(new CustomEvent('dokdo-view-3d'));const b=$('#start')||$('#err a');if(b)b.focus()}
$('#v-go').onclick=start;
$('#v-stop').onclick=()=>{stop();$('#v-go').focus()};
snd.onclick=()=>{on=!on;snd.textContent=on?'소리 끄기':'소리 켜기';if(on)play();else if(au)au.pause()};
$('#v-3d').onclick=to3d;$('#v-3d2').onclick=to3d;
addEventListener('keydown',e=>{if(e.key==='Escape'&&V.classList.contains('watching')){stop();$('#v-go').focus()}});
})();
