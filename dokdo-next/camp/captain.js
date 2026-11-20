// 선장 모습: 얼굴(눈·코·입), 팔과 손, 짧은 다리(11/20 교수님: "얼굴 랜덤하게 눈코입 있지? 팔다리도 있어야 한다").
// healing.js의 boat()가 만든 선장(몸통·머리·머리카락)에 덧붙인다. 그 파일에는 부르는 줄 하나만 있다(#49 상점 작업과 겹치지 않게).
// - 무작위지만 사람마다 늘 같다: 배 색(hue, 이 브라우저에 저장된 값, 다른 배는 그 사람의 값)을 씨앗으로 고른다. 들어올 때마다 바뀌지 않는다.
// - 얼굴은 카메라 쪽(배 뒤쪽, +z)을 본다. 배를 뒤에서 따라가는 화면에서도 얼굴이 보이도록.
// - 가볍게: 모양(geometry)과 재질(material)은 모든 선장이 함께 쓴다. 그래서 배를 지울 때 따로 버릴 것이 없다(함께 쓰는 것을 버리면 남의 선장이 깨짐).
// - 글자는 얼굴에 넣지 않는다. 피부·머리 색은 자연스러운 몇 가지에서 고른다.
(function(root){
'use strict';
// 씨앗 하나로 0~1 수를 차례로 낸다(mulberry32). 같은 씨앗이면 늘 같은 얼굴.
function rng(seed){let a=Math.floor((Number(seed)||0)*4294967296)>>>0;return()=>{a=a+0x6D2B79F5>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
const EYES=['dot','smile','oval'],NOSE=['dot','tri','none'],MOUTH=['smile','open','line'];
const SKIN=[0xf2cfa8,0xe8b98f,0xd9a07a,0xb57e58,0xf6dcc4],HAIR=[0x3a2a22,0x2b2420,0x5a3a26,0x7a5532,0x4a3a30];
// 얼굴 고르기(순수 함수, 노드 시험).
function face(seed){const r=rng(seed),p=a=>a[Math.floor(r()*a.length)%a.length];return{eyes:p(EYES),nose:p(NOSE),mouth:p(MOUTH),cheeks:r()<.5,skin:p(SKIN),hair:p(HAIR)}}
const LIFT=.9;// 다리 자리만큼 몸을 올린다
let G=null;// 함께 쓰는 모양·재질(처음 부를 때 만든다)
function shared(T){if(G)return G;const ink=new T.MeshBasicMaterial({color:0x232528}),cheek=new T.MeshBasicMaterial({color:0xe9a2a0,transparent:true,opacity:.75});
 const arc=(r,a0)=>{const g=new T.TorusGeometry(r,.06,4,10,Math.PI);g.rotateZ(a0);return g};
 G={T,ink,cheek,skin:{},cloth:{},
  dot:new T.SphereGeometry(.17,8,6),oval:(()=>{const g=new T.SphereGeometry(.15,8,6);g.scale(1,1.6,.7);return g})(),
  eyeArc:arc(.2,0),// ∩ 웃는 눈
  noseDot:new T.SphereGeometry(.13,6,5),noseTri:(()=>{const g=new T.ConeGeometry(.15,.32,3);g.rotateX(Math.PI/2);return g})(),
  smile:arc(.38,Math.PI),// ∪
  open:(()=>{const g=new T.CircleGeometry(.36,10,Math.PI,Math.PI);return g})(),
  line:new T.BoxGeometry(.46,.08,.05),
  cheekG:new T.CircleGeometry(.24,10),
  arm:(()=>{const g=new T.CylinderGeometry(.32,.3,2.1,7);g.translate(0,-1.05,0);return g})(),
  hand:new T.SphereGeometry(.42,8,6),
  leg:(()=>{const g=new T.CylinderGeometry(.36,.34,1.1,7);g.translate(0,.55,0);return g})(),
  foot:(()=>{const g=new T.SphereGeometry(.42,8,6);g.scale(1,.55,1.4);return g})()};return G}
const mat=(T,box,c)=>box[c]||(box[c]=new T.MeshStandardMaterial({color:c,flatShading:true}));
// 머리 겉면 위 점(머리 가운데 기준 x,y)에 붙인다. 얼굴은 +z 쪽.
function onHead(m,R,cy,x,y,lift){const z=Math.sqrt(Math.max(0,R*R-x*x-y*y))+(lift||.02);m.position.set(x,cy+y,z);m.lookAt(x*2,cy+y*2,z+5);return m}
// who: 선장 무리(Group). 몸통=0, 머리=1, 머리카락=2(healing.js boat 순서). seed: 배 색 hue.
function dress(who,seed,T){T=T||root.THREE;if(!who||!T||who.userData.dressed)return null;const g=shared(T),f=face(seed),[body,head,hair]=who.children;
 who.userData.dressed=true;who.userData.face=f;
 // 다리 자리만큼 위로. 나중에 붙는 것(꾸미기의 밀짚모자 등)도 같은 만큼 올라가게 add를 감싼다.
 [body,head,hair].forEach(o=>{if(o)o.position.y+=LIFT});const add=who.add.bind(who);who.add=(...os)=>{os.forEach(o=>{if(o&&!o.userData.lifted){o.position.y+=LIFT;o.userData.lifted=true}});return add(...os)};
 if(hair)hair.rotation.x=-Math.abs(hair.rotation.x||.18);// 머리카락은 뒤로(얼굴이 +z)
 if(head&&head.material)head.material.color.setHex(f.skin);if(hair&&hair.material)hair.material.color.setHex(f.hair);
 const skin=mat(T,g.skin,f.skin),cloth=body&&body.material?body.material:mat(T,g.cloth,0x888888);
 const R=1.75,cy=4.6+LIFT,parts=new T.Group();parts.userData.lifted=true;add(parts);
 const m=(geo,mt)=>new T.Mesh(geo,mt);
 [-.55,.55].forEach(x=>{const e=m(f.eyes==='smile'?g.eyeArc:f.eyes==='oval'?g.oval:g.dot,g.ink);onHead(e,R,cy,x,.15,f.eyes==='smile'?.02:.06);if(f.eyes==='smile')e.rotation.z=0;parts.add(e)});
 if(f.nose!=='none')parts.add(onHead(m(f.nose==='tri'?g.noseTri:g.noseDot,mat(T,g.skin,f.skin===SKIN[3]?0x9a6a48:0xd9a07a)),R,cy,0,-.25,.08));
 const mo=onHead(m(f.mouth==='open'?g.open:f.mouth==='line'?g.line:g.smile,g.ink),R,cy,0,-.75,.04);parts.add(mo);
 if(f.cheeks)[-.95,.95].forEach(x=>parts.add(onHead(m(g.cheekG,g.cheek),R,cy,x,-.42,.03)));
 // 팔: 어깨에서 내려온다. 오른팔(선장 기준, 얼굴이 +z이므로 -x 쪽)이 손깃발을 든다.
 const arm=(x)=>{const p=new T.Group();p.position.set(x,3.3+LIFT,0);p.rotation.z=x<0?-.35:.35;p.userData.lifted=true;const a=m(g.arm,cloth),h=m(g.hand,skin);h.position.y=-2.25;p.add(a,h);add(p);return p};
 const armR=arm(-1.45),armL=arm(1.45);
 // 다리: 몸 아래 짧게(선착장에서 보이고, 배 안에서는 조금 가려짐)
 [-.6,.6].forEach(x=>{const l=m(g.leg,cloth);l.position.set(x,0,0);const ft=m(g.foot,mat(T,g.cloth,0x4a4e53));ft.position.set(x,.1,.25);l.userData.lifted=ft.userData.lifted=true;add(l);add(ft)});
 who.userData.armR=armR;who.userData.armL=armL;return f}
// 흔들기 자세: k=0 내림, 1 다 올림. t(ms)로 살짝 흔든다. calm이면 흔들지 않고 올리기만.
function pose(who,k,t,calm){const a=who&&who.userData.armR;if(!a)return;const up=-.35+(-2.55+.35)*k;a.rotation.z=up+(calm?0:Math.sin(t*.013)*.22*k)}
const api={rng,face,dress,pose,EYES,NOSE,MOUTH,SKIN,HAIR,LIFT};
if(typeof module==='object'&&module.exports)module.exports=api;else root.DokdoCaptain=api;
})(typeof window!=='undefined'?window:globalThis);
