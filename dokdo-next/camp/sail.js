// 자동 항해 길잡이. 화면(three.js)과 떼어 두어 노드 시험으로 길이 막히지 않는지 확인한다.
// hit(x,z)는 그 자리가 섬이나 바위면 true. 중심(cx,cz)은 섬 땅의 무게중심이다.
(function(root){
'use strict';
const TAU=Math.PI*2,SPEED=42;
const wrap=a=>((a+Math.PI)%TAU+TAU)%TAU-Math.PI;
// 선분 위를 촘촘히 살펴 섬에 닿는지 본다.
function clear(hit,ax,az,bx,bz){const L=Math.hypot(bx-ax,bz-az),n=Math.max(2,Math.ceil(L/6));for(let i=0;i<=n;i++){const u=i/n;if(hit(ax+(bx-ax)*u,az+(bz-az)*u))return false}return true}
// 섬 바깥을 한 바퀴 도는 점 60개. 2도마다 가장 바깥 해안을 찾고(작은 바위도 놓치지 않도록), 이웃 점과 잇는 선이 섬에 닿으면 그만큼 바깥으로 민다.
const CACHE=new WeakMap();
function orbit(hit,cx,cz,fx,fz,pad){pad=pad||90;const ring=ringOf(hit,cx,cz,pad),st=Math.round(((Math.atan2(fx-cx,fz-cz)*180/Math.PI+360)%360)/6),out=[];for(let i=1;i<=60;i++)out.push(ring[(st+i)%60]);return out}
function ringOf(hit,cx,cz,pad){let m=CACHE.get(hit);if(!m){m=new Map();CACHE.set(hit,m)}const key=cx.toFixed(1)+','+cz.toFixed(1)+','+pad;if(m.has(key))return m.get(key);const R=[];for(let d=0;d<360;d+=2){const a=d*Math.PI/180;let r=1800;while(r>40&&!hit(cx+Math.sin(a)*r,cz+Math.cos(a)*r))r-=8;R.push(r)}
 const n=R.length,rad=[];for(let k=0;k<60;k++){let m=0;for(let j=-4;j<=4;j++)m=Math.max(m,R[(k*3+j+n)%n]);rad.push(m+pad)}
 const pt=k=>{const a=k*6*Math.PI/180;return[cx+Math.sin(a)*rad[k],cz+Math.cos(a)*rad[k]]};
 for(let pass=0;pass<30;pass++){let bad=false;for(let k=0;k<60;k++){const a=pt(k),b=pt((k+1)%60);if(!clear(hit,a[0],a[1],b[0],b[1])){rad[k]+=20;rad[(k+1)%60]+=20;bad=true}}if(!bad)break}
 const ring=[];for(let k=0;k<60;k++)ring.push(pt(k));m.set(key,ring);return ring}
// 꺾인 만처럼 바깥으로 밀어도 못 나오는 곳: 바다 칸을 넓이 우선으로 훑어 가장 가까운 바퀴 점까지 가는 물길을 찾는다.
function escape(hit,cx,cz,fx,fz,pad,lim){const ring=ringOf(hit,cx,cz,pad),C=12,N=Math.ceil(1400/C),W=N*2+1,ix=Math.round(fx/C),iz=Math.round(fz/C),seen=new Int32Array(W*W).fill(-1),q=[],idx=(a,b)=>(a-ix+N)*W+(b-iz+N);
 const near=(x,z)=>{for(let k=0;k<60;k++)if(Math.hypot(ring[k][0]-x,ring[k][1]-z)<40)return k;return -1};
 seen[idx(ix,iz)]=idx(ix,iz);q.push([ix,iz]);for(let h=0;h<q.length;h++){const[a,b]=q[h],k=near(a*C,b*C);if(k>=0){const path=[];let i=idx(a,b);for(;;){const x=Math.floor(i/W)-N+ix,z=i%W-N+iz;path.unshift([x*C,z*C]);if(seen[i]===i)break;i=seen[i]}
   const way=[];let from=[fx,fz];for(let j=1;j<path.length;j++)if(j===path.length-1||!clear(hit,from[0],from[1],path[j+1][0],path[j+1][1])){way.push(path[j]);from=path[j]}
   for(let i2=1;i2<=60;i2++)way.push(ring[(k+i2)%60]);return way}
  for(const[da,db]of[[1,0],[-1,0],[0,1],[0,-1]]){const na=a+da,nb=b+db;if(Math.abs(na-ix)>N||Math.abs(nb-iz)>N)continue;const j=idx(na,nb);if(seen[j]>=0)continue;const x=na*C,z=nb*C;if(hit(x,z)||Math.hypot(x,z)>=lim){seen[j]=-2;continue}seen[j]=idx(a,b);q.push([na,nb])}}
 return null}
// 다음 목표로 넘어간다. 자동 항해 중에 길이 비면 지금 자리에서 새 바퀴를 짠다.
function next(me,plan,hit,ctr){plan.best=Infinity;plan.idle=0;if(plan.auto&&!plan.route.length)plan.route=orbit(hit,ctr[0],ctr[1],me.x,me.z,90+(plan.wide||0));if(plan.route.length){const p=plan.route.shift();me.tx=p[0];me.tz=p[1];return true}me.tx=null;return false}
// 목표 쪽으로 뱃머리를 돌리고 낼 속도(0~1)를 돌려준다. 4초 동안 목표에 가까워지지 못하면(섬 뒤에 걸린 목표) 지금 자리에서 길을 다시 짠다.
function steer(me,plan,dt,hit,ctr){plan.clock=(plan.clock||0)+dt;if(me.tx==null)return 0;const dx=me.tx-me.x,dz=me.tz-me.z,d=Math.hypot(dx,dz);if(d<(plan.auto||plan.route.length?34:6)){next(me,plan,hit,ctr);return me.tx==null?0:.6}
 if(!(d<plan.best-1)){plan.idle=(plan.idle||0)+dt;if(plan.idle>4){if(plan.auto)regen(me,plan,hit,ctr);else me.tx=null;return 0}}else{plan.best=d;plan.idle=0}me.r+=wrap(Math.atan2(dx,dz)+Math.PI-me.r)*Math.min(1,dt*2.4);return Math.min(1,d/50)}
// 한 걸음 움직인다. 자동 항해 중 막히면 해안을 따라 비껴가고, 그래도 못 가면 더 넓은 바퀴로 다시 짠다. 자동 항해는 스스로 꺼지지 않는다.
function move(me,plan,mv,dt,hit,ctr,lim){if(!mv)return false;const sp=mv*SPEED*dt,ok=(x,z)=>!hit(x,z)&&Math.hypot(x,z)<lim,at=a=>[me.x-Math.sin(a)*sp,me.z-Math.cos(a)*sp];
 let p=at(me.r);if(ok(p[0],p[1])){me.x=p[0];me.z=p[1];plan.stuck=0;return true}
 if(!plan.auto){me.tx=null;plan.route=[];return false}
 for(let k=1;k<=9;k++)for(const s of [1,-1]){const a=me.r+s*k*.32,q=at(a),f=[me.x-Math.sin(a)*sp*4,me.z-Math.cos(a)*sp*4];if(ok(q[0],q[1])&&ok(f[0],f[1])){me.x=q[0];me.z=q[1];me.r+=wrap(a-me.r)*.5;plan.stuck=(plan.stuck||0)+.2;if(plan.stuck>12)regen(me,plan,hit,ctr);return true}}
 const ox=me.x-ctr[0],oz=me.z-ctr[1],ol=Math.hypot(ox,oz)||1;for(const s of [4,10,20]){const x=me.x+ox/ol*s,z=me.z+oz/ol*s;if(ok(x,z)){me.x=x;me.z=z;break}}
 plan.stuck=(plan.stuck||0)+1;if(plan.stuck>3)regen(me,plan,hit,ctr);else next(me,plan,hit,ctr);return false}
function regen(me,plan,hit,ctr){plan.stuck=0;const t=plan.clock||0,way=t-(plan.escAt==null?-99:plan.escAt)>15?escape(hit,ctr[0],ctr[1],me.x,me.z,90+(plan.wide||0),2600):null;if(way){plan.escAt=t;plan.route=way;next(me,plan,hit,ctr);return}plan.wide=Math.min(300,(plan.wide||0)+50);plan.route=[];next(me,plan,hit,ctr)}
// 섬 땅 칸 목록으로 무게중심과 가장 먼 땅까지의 거리를 구한다(360도 둘러보기 중심).
function center(cells){let x=0,z=0,n=0;cells.forEach(([a,b])=>{x+=a;z+=b;n++});if(!n)return{x:0,z:0,ext:400};x/=n;z/=n;let e=0;cells.forEach(([a,b])=>{e=Math.max(e,Math.hypot(a-x,b-z))});return{x,z,ext:e}}
const api={orbit,escape,next,steer,move,center,clear,wrap,SPEED};
if(typeof module==='object'&&module.exports)module.exports=api;else root.DokdoSail=api;
})(typeof window!=='undefined'?window:globalThis);
