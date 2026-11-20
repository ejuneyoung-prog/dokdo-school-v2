// 메뉴 = 내 배 판(11/20 합치기 2단계, 교수님: "누가 봐도 직관적이고 쉽게").
// '메뉴'를 열면 맨 위에 작은 '내 배' 판이 먼저 보인다. 두 칸: 왼쪽 작은 지도, 오른쪽 레벨·대황과 오늘 할 일(짧은 줄 넷).
// - 땅 모양은 3D 장면이 쓰는 지형 칸(healing.js의 block → land)을 부드럽게 다듬어 칠한다(칸을 흐리게 번진 뒤 경계를 잘라 매끈한 섬 모양). 모양을 따로 만들지 않는다.
// - 서도·동도 이름은 두 봉우리(대한봉·우산봉) 자리에 단다. 내 배는 라임 점, 선착장은 흰 네모.
//   배가 지도 밖이면 점을 지도 가장자리 안쪽에 붙이고 배 쪽을 가리키는 라임 화살표로 바꾼다(속 빈 고리 대신: 뜻을 따로 외울 필요가 없음).
// - 레벨과 다음 장소 게이지는 원래 있던 #goal 단추를 이 판 안으로 옮겨 쓴다(계산은 healing.js goalUI 그대로).
// - 소리 크기·시각과 날씨·인원·가상 체험 안내는 판 제목 줄의 '더 보기'를 눌러야 열린다(처음에는 닫힘).
// - 오늘 할 일은 저장된 실제 값만 보여 준다. 아직 없는 놀이(흔들기, 통발)는 넣지 않는다.
// 아무것도 보내지 않는다. 3D를 켜지 못한 기기(window.DokdoHeal 없음)에서는 아무것도 하지 않는다.
(function(){
'use strict';
const H=window.DokdoHeal,$=q=>document.querySelector(q);if(!H||!H.map||!$('#m-top'))return;
const mk=(t,cl,tx)=>{const e=document.createElement(t);if(cl)e.className=cl;if(tx!=null)e.textContent=tx;return e},hide=e=>{e.setAttribute('aria-hidden','true');return e};
const mTop=$('#m-top'),card=mk('section','');card.id='board';card.setAttribute('aria-label','내 배');
// 제목 줄: 내 배 · (크리에이터 표시) · 더 보기
const head=mk('div','b-head'),title=mk('h2','','내 배'),moreB=mk('button','','더 보기');moreB.id='b-more';moreB.type='button';moreB.setAttribute('aria-expanded','false');moreB.setAttribute('aria-controls','m-extra');
head.append(title);{const cm=$('#cmode');if(cm)head.append(cm)}head.append(moreB);
// 지도
const mapBox=mk('div','b-map'),cv=hide(mk('canvas')),dot=hide(mk('i','b-dot')),dock=hide(mk('i','b-dock'));
const labW=hide(mk('span','b-lab','서도')),labE=hide(mk('span','b-lab','동도')),legend=mk('p','b-key');legend.append(mk('span','k-me','내 배'),mk('span','k-dock','선착장'));
mapBox.append(cv,labW,labE,dock,dot,legend);
// 오른쪽: 레벨·대황, 오늘 할 일
const side=mk('div','b-side'),lv=mk('p','b-lv'),list=mk('ul','');list.setAttribute('aria-label','오늘 할 일');side.append(lv,list);
card.append(head,mapBox,side);
const goal=$('#goal');if(goal)card.append(goal);// 원래 게이지를 판 안으로(글자·막대·누르면 열리는 곳은 그대로)
mTop.prepend(card);
// 더 보기: 소리 크기, 시각·날씨·인원, 가상 체험 안내
const extra=mk('div','');extra.id='m-extra';extra.hidden=true;
{const row=mTop.querySelector('.mrow'),v=row&&row.querySelector('.vol');if(v&&!row.querySelector('.vlab')){const l=mk('span','vlab','소리 크기');l.setAttribute('aria-hidden','true');row.prepend(l)}
 [row,$('#sub'),mTop.querySelector('.mnote')].forEach(e=>{if(e)extra.append(e)})}
card.after(extra);
moreB.onclick=()=>{const v=extra.hidden;extra.hidden=!v;moreB.setAttribute('aria-expanded',v);moreB.textContent=v?'접기':'더 보기';resized();fade()};
// ── 지도 ──
// 북쪽이 위(3D 장면에서 북 = -z, 동 = +x). 땅 칸 전체를 감싸는 네모에 자동 항해 바퀴(해안에서 90쯤 바깥)가 들어갈 만큼 여백을 둔다.
const M=H.map(),PAD=110,KEY=20;let view=null;// 아래 KEY px는 범례 줄 자리
const BB=M.land.reduce((b,[x,z])=>[Math.min(b[0],x),Math.max(b[1],x),Math.min(b[2],z),Math.max(b[3],z)],[Infinity,-Infinity,Infinity,-Infinity]);
function frame(w,h){const hx=(BB[1]-BB[0])/2+PAD,hz=(BB[3]-BB[2])/2+PAD,k=Math.min(w/(2*hx),h/(2*hz));return{w,h,k,x0:(BB[0]+BB[1])/2,z0:(BB[2]+BB[3])/2}}
const toMap=(x,z)=>[view.w/2+(x-view.x0)*view.k,view.h/2+(z-view.z0)*view.k];
// 땅 칸을 칸 크기만큼 번지게(상자 흐림 두 번) 한 뒤 절반 높이에서 잘라 칠한다. 경계는 몇 픽셀에 걸쳐 부드럽게.
function blur(a,W,Hh,r){const t=new Float32Array(a.length);for(let y=0;y<Hh;y++){let s=0;const o=y*W;for(let x=-r;x<W+r;x++){if(x+r<W&&x+r>=0)s+=a[o+x+r];if(x-r-1>=0&&x-r-1<W)s-=a[o+x-r-1];if(x>=0&&x<W)t[o+x]=s/(2*r+1)}}
 for(let x=0;x<W;x++){let s=0;for(let y=-r;y<Hh+r;y++){if(y+r<Hh&&y+r>=0)s+=t[(y+r)*W+x];if(y-r-1>=0&&y-r-1<Hh)s-=t[(y-r-1)*W+x];if(y>=0&&y<Hh)a[y*W+x]=s/(2*r+1)}}}
function drawLand(){const r=cv.getBoundingClientRect(),w=Math.round(r.width),h=Math.round(r.height)-KEY;if(!w||h<=0)return false;const dpr=Math.min(2,window.devicePixelRatio||1),W=Math.round(w*dpr),Hh=Math.round((h+KEY)*dpr);
 cv.width=W;cv.height=Hh;view=frame(w,h);const c=cv.getContext('2d'),a=new Float32Array(W*Hh),s=Math.max(1,M.cell*view.k*dpr);
 M.land.forEach(([x,z])=>{const[p,q]=toMap(x,z),x0=Math.max(0,Math.round(p*dpr-s/2)),y0=Math.max(0,Math.round(q*dpr-s/2)),x1=Math.min(W,Math.round(p*dpr+s/2)+1),y1=Math.min(Hh,Math.round(q*dpr+s/2)+1);for(let y=y0;y<y1;y++)for(let i=x0;i<x1;i++)a[y*W+i]=1});
 const rad=Math.max(1,Math.round(s*.8));blur(a,W,Hh,rad);blur(a,W,Hh,rad);
 const img=c.createImageData(W,Hh),d=img.data;for(let i=0;i<a.length;i++){const v=a[i],t=Math.min(1,Math.max(0,(v-.32)/.22));if(t>0){const j=i*4;d[j]=167;d[j+1]=171;d[j+2]=176;d[j+3]=Math.round(t*t*(3-2*t)*255)}}c.putImageData(img,0,0);
 const at=(e,p,dx,dy)=>{const[x,y]=toMap(p[0],p[1]);e.style.left=Math.min(w-16,Math.max(16,x+(dx||0)))+'px';e.style.top=Math.min(h-8,Math.max(8,y+(dy||0)))+'px'};at(dock,M.dock);
 // 섬 이름은 봉우리에서 바깥쪽 위로 비켜 단다(점·선착장 표시를 가리지 않게).
 if(M.peaks){at(labW,M.peaks.w,-16,-18);at(labE,M.peaks.e,18,-16)}return true}
// 배 점: 지도 밖이면 가장자리 안쪽에 붙이고 배 쪽을 가리키는 화살표로.
const EDGE=7;
function place(x,z){const[p,q]=toMap(x,z),cx=Math.min(view.w-EDGE,Math.max(EDGE,p)),cy=Math.min(view.h-EDGE,Math.max(EDGE,q));return{x:cx,y:cy,far:cx!==p||cy!==q,ang:Math.atan2(q-view.h/2,p-view.w/2)}}
function drawBoat(){if(!view)return;const b=H.boat(),o=place(b.x,b.z);dot.style.left=o.x.toFixed(1)+'px';dot.style.top=o.y.toFixed(1)+'px';dot.classList.toggle('far',o.far);dot.style.setProperty('--ang',o.ang.toFixed(3)+'rad');dot.dataset.at=Math.round(b.x)+','+Math.round(b.z)}
// ── 숫자 ──
// 오늘 할 일은 짧은 줄 넷. 3단계(wave.js, DokdoWave)가 있으면 놀이·줍기를 한 줄로 묶고 태극기 흔들기를 넣는다. 제목 줄에는 지킨 날.
const BASE=[['fish',t=>t.left?'낚시 '+t.left+'번 남음':'낚시 오늘 다 함',t=>!t.left],
 ['game',t=>'놀이 경험치 '+t.xG+'/'+t.capG,t=>t.xG>=t.capG],
 ['clean',t=>'쓰레기 줍기 '+t.xC+'/'+t.capC,t=>t.xC>=t.capC],
 ['look',t=>'바라보기 대황 '+t.look+'/'+t.capL,t=>t.look>=t.capL]];
const WAVE=[BASE[0],['wave',t=>'흔들기 '+t.w.waves+'/'+t.w.cap,t=>t.w.waves>=t.w.cap],
 ['xp',t=>'놀이 '+t.xG+'/'+t.capG+'·줍기 '+t.xC+'/'+t.capC,t=>t.xG>=t.capG&&t.xC>=t.capC],BASE[3]];
let items=[],keys='',days=null;
function numbers(){const t=H.today(),L=H.level(),x='Lv '+L.L+' · 대황 '+t.coins;if(lv.dataset.t!==x){lv.dataset.t=x;lv.textContent='';lv.append(mk('b','','Lv '+L.L),' · 대황 ',mk('b','',String(t.coins)))}
 const WV=window.DokdoWave&&DokdoWave.today?DokdoWave.today():null;if(WV)t.w=WV;const R=WV?WAVE:BASE,k=R.map(r=>r[0]).join();
 if(k!==keys){keys=k;list.textContent='';items=R.map(([key])=>{const li=mk('li');li.dataset.k=key;list.append(li);return li})}
 R.forEach(([key,txt,done],i)=>{const li=items[i],s=txt(t);if(li.dataset.t!==s){li.dataset.t=s;li.textContent=s}li.classList.toggle('done',!!done(t))});
 if(WV){if(!days){days=mk('span','b-days');title.after(days)}const d='지킨 날 '+WV.kept+'일째';if(days.dataset.t!==d){days.dataset.t=d;days.textContent='';days.setAttribute('aria-label','독도를 지킨 날 '+WV.kept+'일째');days.append('지킨 날 ',mk('b','',String(WV.kept)),'일째')}}}
// 가로로 낮은 화면에서 메뉴 안이 넘치면 아래쪽을 흐리게 해 더 있다는 것을 보여 준다.
function fade(){const m=mTop,more=m.scrollHeight>m.clientHeight+2&&m.scrollTop+m.clientHeight<m.scrollHeight-2;m.classList.toggle('more-below',more)}
mTop.addEventListener('scroll',fade,{passive:true});
// 판 높이가 바뀌면 3D 화면이 아래 판 높이(--dk)를 다시 재도록 알린다.
const dockE=$('#dock');let lastH=0;const resized=()=>{const h=dockE.offsetHeight;if(h!==lastH){lastH=h;dispatchEvent(new Event('resize'))}};
// 메뉴가 열려 있는 동안만 고친다(배 점은 0.25초마다, 숫자는 0.5초마다).
let tm=0,tick=0;
function run(){if(mTop.hidden){clearInterval(tm);tm=0;return}if(!view&&!drawLand())return;drawBoat();if(tick++%2===0)numbers()}
function open(){if(mTop.hidden)return;lastH=dockE.offsetHeight;view=null;tick=0;drawLand();run();resized();fade();if(!tm)tm=setInterval(run,250)}
new MutationObserver(open).observe(mTop,{attributes:true,attributeFilter:['hidden']});
addEventListener('resize',()=>{if(mTop.hidden)return;const r=cv.getBoundingClientRect();if(!view||Math.round(r.width)!==view.w)drawLand();fade()});
numbers();// 처음부터 글자를 채워 두어 메뉴를 열 때 판 높이가 튀지 않게
window.DokdoBoard={refresh:()=>{numbers();if(!mTop.hidden){drawBoat();resized();fade()}},toMap:(x,z)=>view?toMap(x,z):null,place:(x,z)=>view?place(x,z):null};
})();
