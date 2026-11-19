// 처음 온 사람을 위한 사용 설명서(11/20 교수님: "누가 봐도 직관적이고 쉽게", 11/10: "자유도가 높아 어렵다").
// 말풍선 하나와 라임 고리로 누를 곳을 한 단계씩 짚는다. 실제로 해 보면 다음 단계로 넘어간다.
// 다 보거나 '건너뛰기'를 누르면 dokdo-heal 기록에 gd=1이 남아 다시 나오지 않는다(저장은 healing.js의 keep()이 한다).
// 3D를 켜지 못한 기기(window.DokdoHeal 없음)에서는 아무것도 하지 않는다.
(function(){
'use strict';
const H=window.DokdoHeal,$=q=>document.querySelector(q);if(!H||H.guided())return;
const body=document.body,mk=(t,id)=>{const e=document.createElement(t);e.id=id;return e};
const box=mk('div','guide'),num=mk('p','g-num'),say=mk('p','g-say'),skip=mk('button','g-skip'),ring=mk('div','g-ring');
say.setAttribute('role','status');skip.type='button';skip.textContent='건너뛰기';ring.setAttribute('aria-hidden','true');
box.hidden=ring.hidden=true;box.append(num,say,skip);body.append(box,ring);
let i=0,tapped=false,cruise=0,timer=0;
addEventListener('dokdo-heal-tap',()=>{tapped=true});
// 단계: 누를 곳(at)과 끝나는 조건(done). 바다에서 바로 시작하면 1단계는 이미 끝난 것으로 본다.
const STEPS=[
 {say:'배에 올라 바다로 나가요',at:()=>$('#act'),done:()=>!H.seated()},
 {say:'배가 저절로 독도를 돌아요. 가고 싶은 곳을 누르면 그쪽으로 가요',at:()=>H.spot(),high:true,done:()=>tapped||cruise>=10000},
 {say:"아래 '낚시하기'를 눌러 낚시를 해 보세요",at:()=>$('#act'),done:()=>H.fishing()}];
function finish(msg){clearInterval(timer);box.remove();ring.remove();body.classList.remove('guiding');H.guided(true);if(msg)H.toast(msg)}
skip.onclick=()=>finish('');
function show(k){i=k;num.textContent=(i+1)+' / '+STEPS.length;say.textContent=STEPS[i].say;if(i===1){tapped=false;cruise=0}}
// 메뉴·대황 판을 열었거나 풍경만 보기·쉬기·2D 그림 중이면 잠시 숨겨 둔다(가리지 않도록).
const paused=()=>!$('#enter').hidden||!$('#menu').hidden||!$('#deck').hidden||/\b(scenery|resting|v2d)\b/.test(body.className)||(i>0&&H.seated());
function place(){const s=STEPS[i],t=s.at(),W=innerWidth,w=Math.min(300,W-32);box.style.width=w+'px';
 let r=null;if(t&&t.getBoundingClientRect){const b=t.getBoundingClientRect();if(b.width)r={l:b.left-6,t:b.top-6,w:b.width+12,h:b.height+12,round:false}}else if(t)r={l:t.x-32,t:t.y-32,w:64,h:64,round:true};
 ring.hidden=!r;if(r){Object.assign(ring.style,{left:r.l+'px',top:r.t+'px',width:r.w+'px',height:r.h+'px'});ring.classList.toggle('dot',r.round)}
 const top=$('#top').getBoundingClientRect().bottom+12;let y=s.high||!r?top+52:r.t-8-box.offsetHeight;if(y<top)y=top;// 위쪽 52px은 휴대폰 알림 자리
 const cx=r&&!s.high?r.l+r.w/2:W/2;box.style.left=Math.round(Math.min(W-16-w,Math.max(16,cx-w/2)))+'px';box.style.top=Math.round(y)+'px'}
function step(){
 if(!$('#enter').hidden)return;// 입구에서 장소를 고른 뒤부터 센다
 while(i<STEPS.length&&STEPS[i].done())i++;
 if(i>=STEPS.length){finish('언제든 메뉴 › 쉼터에서 선착장으로 돌아올 수 있어요');return}
 if(STEPS[i].say!==say.textContent)show(i);
 const hold=paused();box.hidden=ring.hidden=hold;body.classList.toggle('guiding',!hold);if(hold)return;
 if(i===1)cruise+=250;place()}
timer=setInterval(step,250);
})();
