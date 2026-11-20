// 메뉴 = 내 배 판(11/20 합치기 2단계, 교수님: "누가 봐도 직관적이고 쉽게").
// '메뉴'를 열면 맨 위에 '내 배' 판이 먼저 보인다: 작은 지도(동도·서도 땅 모양, 내 배 위치, 선착장), 레벨·대황, 오늘 할 일.
// - 땅 모양은 3D 장면이 쓰는 지형 칸(healing.js의 block → land)을 그대로 그린다. 모양을 따로 만들지 않는다.
// - 레벨과 다음 장소 게이지는 원래 있던 #goal 단추를 이 판 안으로 옮겨 쓴다(계산은 healing.js goalUI 그대로).
// - 오늘 할 일은 저장된 실제 값만 보여 준다: 낚시 남은 횟수, 놀이 경험치, 바다 쓰레기 줍기 경험치, 바라보기·쉬기 대황.
//   아직 없는 놀이(흔들기, 통발)는 넣지 않는다.
// 아무것도 보내지 않는다. 3D를 켜지 못한 기기(window.DokdoHeal 없음)에서는 아무것도 하지 않는다.
(function(){
'use strict';
const H=window.DokdoHeal,$=q=>document.querySelector(q);if(!H||!H.map||!$('#m-top'))return;
const mk=(t,cl,tx)=>{const e=document.createElement(t);if(cl)e.className=cl;if(tx!=null)e.textContent=tx;return e};
const mTop=$('#m-top'),card=mk('section','');card.id='board';card.setAttribute('aria-label','내 배');
const head=mk('div','b-head'),title=mk('h2','','내 배'),lv=mk('p','b-lv');head.append(title,lv);
const mapBox=mk('div','b-map'),cv=mk('canvas'),dot=mk('i','b-dot'),dock=mk('i','b-dock');cv.setAttribute('aria-hidden','true');dot.setAttribute('aria-hidden','true');dock.setAttribute('aria-hidden','true');
const legend=mk('p','b-key');legend.append(mk('span','k-me','내 배'),mk('span','k-dock','선착장'));
mapBox.append(cv,dock,dot);const mapCol=mk('div','b-mapcol');mapCol.append(mapBox,legend);
const todo=mk('div','b-todo'),list=mk('ul','');todo.append(mk('p','b-sub','오늘 할 일'),list);
const grid=mk('div','b-grid');grid.append(mapCol,todo);card.append(head,grid);
const goal=$('#goal');if(goal)card.append(goal);// 원래 게이지를 판 안으로(글자·막대·누르면 열리는 곳은 그대로)
mTop.prepend(card);
// 혼자 남은 소리 크기 막대에 이름을 붙인다.
{const row=mTop.querySelector('.mrow'),v=row&&row.querySelector('.vol');if(v&&!row.querySelector('.vlab')){const l=mk('span','vlab','소리 크기');l.setAttribute('aria-hidden','true');row.prepend(l)}}
// ── 지도 ──
// 북쪽이 위(3D 장면에서 북 = -z, 동 = +x). 땅 칸 전체를 감싸는 네모에 자동 항해 바퀴(해안에서 90쯤 바깥)가 들어갈 만큼 여백을 둔다.
const M=H.map(),PAD=150;let view=null;
const BB=M.land.reduce((b,[x,z])=>[Math.min(b[0],x),Math.max(b[1],x),Math.min(b[2],z),Math.max(b[3],z)],[Infinity,-Infinity,Infinity,-Infinity]);
function frame(w,h){const hx=(BB[1]-BB[0])/2+PAD,hz=(BB[3]-BB[2])/2+PAD,k=Math.min(w/(2*hx),h/(2*hz));return{w,h,k,x0:(BB[0]+BB[1])/2,z0:(BB[2]+BB[3])/2}}
const toMap=(x,z)=>[view.w/2+(x-view.x0)*view.k,view.h/2+(z-view.z0)*view.k];
function drawLand(){const r=cv.getBoundingClientRect(),w=Math.round(r.width),h=Math.round(r.height);if(!w||!h)return false;const dpr=Math.min(2,window.devicePixelRatio||1);
 cv.width=w*dpr;cv.height=h*dpr;view=frame(w,h);const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
 // 땅 칸 하나 = 지형 칸(CELL) 크기의 네모. 이웃끼리 붙어 섬 모양이 된다. 조금 크게 그려 칸 사이 틈을 없앤다.
 const s=Math.max(1,M.cell*view.k)+.6;c.fillStyle='#A7ABB0';M.land.forEach(([x,z])=>{const[a,b]=toMap(x,z);c.fillRect(a-s/2,b-s/2,s,s)});
 const[dx,dz]=toMap(M.dock[0],M.dock[1]);dock.style.left=dx+'px';dock.style.top=dz+'px';return true}
// 배 점: 지도 밖이면 가장자리에 붙이고 속을 비운다(멀리 나간 배).
function drawBoat(){if(!view)return;const b=H.boat();let[x,y]=toMap(b.x,b.z);const m=6,out=x<m||y<m||x>view.w-m||y>view.h-m;x=Math.min(view.w-m,Math.max(m,x));y=Math.min(view.h-m,Math.max(m,y));
 dot.style.left=x.toFixed(1)+'px';dot.style.top=y.toFixed(1)+'px';dot.classList.toggle('far',out);dot.dataset.at=Math.round(b.x)+','+Math.round(b.z)}
// ── 숫자 ──
const ROWS=[['fish',t=>t.left?'낚시 '+t.left+'번 남음':'낚시 오늘 다 함',t=>!t.left],
 ['game',t=>'놀이 경험치 '+t.xG+'/'+t.capG,t=>t.xG>=t.capG],
 ['clean',t=>'바다 쓰레기 줍기 '+t.xC+'/'+t.capC,t=>t.xC>=t.capC],
 ['look',t=>'바라보기·쉬기 대황 '+t.look+'/'+t.capL,t=>t.look>=t.capL]];
const items=ROWS.map(([k])=>{const li=mk('li');li.dataset.k=k;list.append(li);return li});
function numbers(){const t=H.today(),L=H.level();lv.textContent='';const a=mk('b','','Lv '+L.L),c=mk('span','',' · 대황 '),n=mk('b','',String(t.coins));lv.append(a,c,n);
 ROWS.forEach(([k,txt,done],i)=>{const li=items[i],x=txt(t),d=!!done(t);if(li.dataset.t!==x){li.dataset.t=x;li.textContent=x}li.classList.toggle('done',d)});
 if(window.DokdoBoardMore)window.DokdoBoardMore.forEach(f=>{try{f(card,list,t)}catch(e){}})}
// 메뉴가 열려 있는 동안만 고친다(배 점은 0.25초마다, 숫자는 1초마다).
let tm=0,tick=0;
function run(){if(mTop.hidden){clearInterval(tm);tm=0;return}if(!view&&!drawLand())return;drawBoat();if(tick++%4===0)numbers()}
// 판 높이가 바뀌면(글자가 처음 채워질 때 등) 3D 화면이 아래 판 높이(--dk)를 다시 재도록 알린다.
const dockE=$('#dock');
function open(){if(mTop.hidden)return;const h0=dockE.offsetHeight;view=null;tick=0;drawLand();run();if(dockE.offsetHeight!==h0)dispatchEvent(new Event('resize'));if(!tm)tm=setInterval(run,250)}
new MutationObserver(open).observe(mTop,{attributes:true,attributeFilter:['hidden']});
addEventListener('resize',()=>{view=null;if(!mTop.hidden)drawLand()});
numbers();// 처음부터 글자를 채워 두어 메뉴를 열 때 판 높이가 튀지 않게
window.DokdoBoard={refresh:()=>{if(!mTop.hidden){numbers();drawBoat()}},toMap:(x,z)=>view?toMap(x,z):null};
})();
