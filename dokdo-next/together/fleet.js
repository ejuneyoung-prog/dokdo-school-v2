/* 바다 상태: 독도 앞바다에 떠 있는 배들의 목록과 자리. 그리기(sea.js)와 떼어 노드로 시험한다.
 * 자리는 독도 둘레의 고리(ring)다. ring 0 = 명예의 전당 첫째 줄, 1 = 큰선장, 2 = 선장, 3 = 새내기. 계급이 높을수록 섬에 가깝다.
 * 같은 고리 안에서는 각 배의 각도(spot.a)로 흩어지고, 겹치면 조금씩 바깥으로 민다. */
(function(root,factory){const isNode=typeof module==='object'&&module.exports;const C=isNode?require('./config.js'):root.DokdoTogetherConfig;const api=factory(C);if(isNode)module.exports=api;else root.DokdoTogetherFleet=api;})(typeof globalThis!=='undefined'?globalThis:this,function(C){
'use strict';
const ringOf=s=>s.hall?C.HALL.ring:(C.SHIPS[Math.max(0,Math.min(C.SHIPS.length-1,(s.stage|0)-1))].ring);
// center: 섬 가운데, base: 첫째 줄 반지름, step: 고리 사이 간격, gapMin: 배 사이 최소 거리
function layout(list,o){const cx=o.cx||0,cz=o.cz||0,base=o.base||600,step=o.step||110,gapMin=o.gapMin||34,out=[];
 const sorted=[...list].sort((a,b)=>ringOf(a)-ringOf(b)||(b.me?1:0)-(a.me?1:0));
 for(const s of sorted){let r=base+ringOf(s)*step,a=(s.spot&&Number.isFinite(s.spot.a))?s.spot.a:0,x,z,tries=0;
  do{x=cx+Math.cos(a)*r;z=cz+Math.sin(a)*r;if(!out.some(p=>Math.hypot(p.x-x,p.z-z)<gapMin)&&!(o.blocked&&o.blocked(x,z)))break;a+=gapMin/r;if(++tries%Math.ceil(Math.PI*2*r/gapMin)===0)r+=step/2}while(tries<4000);
  out.push({...s,x,z,ring:ringOf(s)})}
 return out}
// 카메라에서 가까운 n척만 입체로. 내 배는 늘 입체.
function near(placed,camX,camZ,n=C.NEAR_SHIPS){const d=placed.map(p=>({p,d:p.me?-1:Math.hypot(p.x-camX,p.z-camZ)})).sort((a,b)=>a.d-b.d);const set=new Set(d.slice(0,n).map(q=>q.p.id));return{near:placed.filter(p=>set.has(p.id)),far:placed.filter(p=>!set.has(p.id))}}
// 태극기 순위(흔든 횟수). 견본이 섞여 있으면 sample:true가 그대로 따라간다. 1차는 이 기기에서만 보여 준다.
const order=list=>[...list].sort((a,b)=>(b.waves|0)-(a.waves|0)||(b.days|0)-(a.days|0)||(a.me?-1:b.me?1:0));
const ranking=(list,n=10)=>order(list).slice(0,n);
// 내 자리와 바로 앞 선장까지 남은 횟수(몰입: 다음 목표가 늘 보이게)
function myPlace(list){const o=order(list),i=o.findIndex(s=>s.me);if(i<0)return null;return{rank:i+1,of:o.length,ahead:i>0?Math.max(1,(o[i-1].waves|0)-(o[i].waves|0)+1):0}}
return{ringOf,layout,near,ranking,myPlace};
});
