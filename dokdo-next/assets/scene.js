/* Drawing coordinates belong to approved concept ART, never GIS.
 * The factual outline comparison has separate provenance and no survey claims.
 */
(function(root,factory){
 const art=typeof module==='object'&&module.exports?require('../data/art-geometry.json'):root.DOKDO_ART_GEOMETRY;
 const api=factory(art);
 if(typeof module==='object'&&module.exports)module.exports=api;else root.DokdoVisualScene=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(ART){
'use strict';
const W=1536,H=704,PALETTE=['','#FFD674','#FFF6DC','#C4E29B','#78E5CE'];
const polygons=[ART.west,ART.east,...ART.rocks];
function inside(p,poly){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
 const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])c=!c;
}return c;}
function segmentDist(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-u*dx,p[1]-a[1]-u*dy);}
function landDistance(p){let d=Infinity;for(const poly of polygons){if(inside(p,poly))return 0;for(let i=0;i<poly.length;i++)d=Math.min(d,segmentDist(p,poly[i],poly[(i+1)%poly.length]));}return d;}
function arc(poly,f){let total=0;const l=poly.map((p,i)=>{const q=poly[(i+1)%poly.length];const d=Math.hypot(q[0]-p[0],q[1]-p[1]);total+=d;return d;});let r=((f%1)+1)%1*total;
 for(let i=0;i<l.length;i++){if(r<=l[i]){const a=poly[i],b=poly[(i+1)%l.length],u=r/l[i];return [a[0]+u*(b[0]-a[0]),a[1]+u*(b[1]-a[1])];}r-=l[i];}return poly[0];}
function vdc(n){let f=.5,r=0;while(n>0){r+=f*(n%2);n=Math.floor(n/2);f/=2;}return r;}
const centers=[[413,219],[1167,408]];
function shoreAnchor(poly,pick,island,nudge){
 let v=poly[0];for(const q of poly)if(pick(q,v))v=q;
 const c=centers[island];return [v[0]+(c[0]-v[0])*nudge,v[1]+(c[1]-v[1])*nudge];
}
// The actual lighthouse building lives in the dongdo-facilities.png overlay
// (composited onto the base art via the facilities-overlay.json affine
// transform, not drawn straight from dokdo-islands.webp) -- its lamp room
// was located in that overlay's own pixel space, then mapped through the
// same transform used to place the overlay, landing here. Only its lamp
// position matters; the tower itself is the artwork's, not ours to redraw.
const LIGHTHOUSE=[1223,478];
// The pier is where the boat docks -- it stays right on the coastline
// (nudge 0, then slightly out) so it is never drawn over by the island art.
const PIER=shoreAnchor(ART.east,(a,b)=>a[0]<b[0],1,-.04);
// These are light-placement paths on the illustration, NOT elevation contours.
const rings=[ART.west,ART.east].map((p,island)=>Array.from({length:12},(_,i)=>p.map(a=>{
 const u=.18+i*.064;return [centers[island][0]+(a[0]-centers[island][0])*u,centers[island][1]+(a[1]-centers[island][1])*u];
})));
function slot(i){
 const island=i%20<11?0:1,ring=Math.floor(i/2)%12;
 let p=arc(rings[island][ring],vdc(Math.floor(i/24)+1)+(i%24)*.021);
 // A concave illustration outline may clip a shrunk ring. Move the anchor inward if needed.
 for(let k=0;k<14&&!inside(p,[ART.west,ART.east][island]);k++)p=[(p[0]+centers[island][0])/2,(p[1]+centers[island][1])/2];
 return {x:p[0],y:p[1],island,ring};
}
const BEACON_SLOTS=[];
for(let island=0;island<2;island++)for(const ring of [3,7,10])for(let j=0;j<8;j++){
 let p=arc(rings[island][ring],(j+.3)/8);
 while(!inside(p,[ART.west,ART.east][island]))p=[(p[0]+centers[island][0])/2,(p[1]+centers[island][1])/2];
 BEACON_SLOTS.push({x:p[0],y:p[1],island,ring});
}
function level(r){return Math.min(4,Math.max(r?.lightBest||0,r?.lv||0,r?.cor>0?1:0));}
function lightPositions(s){
 return (s.scene?.order||[]).map((id,i)=>{
  const lv=level(s.m[id]),manual=s.scene?.beaconSlots?.[id],p=lv===4&&Number.isInteger(manual)?BEACON_SLOTS[manual]:slot(i);
  return lv&&p?{id,lv,slot:i,x:p.x,y:p.y,island:p.island,manual:Number.isInteger(manual)}:null;
 }).filter(Boolean);
}
function canPlace(s,id,index){
 const p=BEACON_SLOTS[index];return !!p&&level(s.m[id])===4&&lightPositions(s).every(x=>x.id===+id||x.lv!==4||Math.hypot(x.x-p.x,x.y-p.y)>=30);
}
const PATH=[[652,262],[672,240],[753,225],[797,279],[857,306],[840,337],[779,367],[764,397],
 [815,423],[837,460],[821,522],[778,531],[731,487],[703,424],[644,396],[641,330]];
function pointAt(u){const n=PATH.length,t=((u%1)+1)%1*n,i=Math.floor(t),v=t-i,a=PATH[(i+n-1)%n],b=PATH[i],c=PATH[(i+1)%n],d=PATH[(i+2)%n];
 return [0,1].map(k=>.5*(2*b[k]+(-a[k]+c[k])*v+(2*a[k]-5*b[k]+4*c[k]-d[k])*v*v+(-a[k]+3*b[k]-3*c[k]+d[k])*v*v*v));}
function safeWater(p){
 let q=[...p];
 // Continuous projection away from the nearest shoreline avoids visible teleporting.
 for(let pass=0;pass<5;pass++){
  let nearest=null,min=Infinity,inland=false;
  for(const poly of polygons){
   if(inside(q,poly))inland=true;
   for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length],dx=b[0]-a[0],dy=b[1]-a[1];
    const u=Math.max(0,Math.min(1,((q[0]-a[0])*dx+(q[1]-a[1])*dy)/(dx*dx+dy*dy||1)));
    const hit=[a[0]+dx*u,a[1]+dy*u],d=Math.hypot(q[0]-hit[0],q[1]-hit[1]);
    if(d<min){min=d;nearest={hit,dx,dy};}
   }
  }
  if(min>=29.5&&!inland)return q;
  const {hit,dx,dy}=nearest;
  let nx=q[0]-hit[0],ny=q[1]-hit[1],len=Math.hypot(nx,ny);
  if(len<.00001){nx=-dy;ny=dx;len=Math.hypot(nx,ny)||1;}
  if(inland){nx=-nx;ny=-ny;}
  q=[hit[0]+nx/len*29.6,hit[1]+ny/len*29.6];
 }
 return q;
}
function gangchiPositions(s,t){
 const arr=(s.gangchiVisits||[]).map(v=>{
  const u=t/145+v.seat/10,pt=safeWater(pointAt(u)),next=safeWater(pointAt(u+.0003));
  return {id:v.id,seat:v.seat,x:pt[0],y:pt[1],angle:Math.atan2(next[1]-pt[1],next[0]-pt[0]),stroke:t*3+v.seat,remainingMs:v.remainingMs};
 });
 for(let z=0;z<3;z++)for(let i=0;i<arr.length;i++)for(let j=i+1;j<arr.length;j++){
  const a=arr[i],b=arr[j],dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy);
  if(dist<42&&dist>.01){const push=(42-dist)*.5;let pa=safeWater([a.x-dx/dist*push,a.y-dy/dist*push]),pb=safeWater([b.x+dx/dist*push,b.y+dy/dist*push]);[a.x,a.y]=pa;[b.x,b.y]=pb;}
 }
 return arr;
}
function fishPosition(i,t){
 const g=Math.floor(i/8),m=i%8,phase=t*(.017+(g%5)*.003)+g*1.68-m*.035;
 let cx,cy,rx,ry;
 if(g%4===0){cx=725;cy=210+(g%3)*125;rx=70;ry=50;}
 else if(g%4===1){cx=160+(g%6)*235;cy=610;rx=100;ry=37;}
 else if(g%4===2){cx=820+(g%3)*220;cy=90;rx=120;ry=26;}
 else{cx=g%2?1415:60;cy=150+(g%6)*70;rx=47;ry=80;}
 return {x:cx+rx*Math.cos(phase)+(m-4)*5,y:cy+ry*Math.sin(phase)+Math.sin(i*2.3)*11,
 angle:Math.atan2(ry*Math.cos(phase),-rx*Math.sin(phase)),size:1.2+(i%3)*.35};
}
function fish(x,f,t){x.save();x.translate(f.x,f.y);x.rotate(f.angle);x.scale(f.size,f.size);
 x.fillStyle='rgba(95,180,192,.47)';x.beginPath();x.ellipse(0,0,4,1.4,0,0,Math.PI*2);x.fill();
 x.beginPath();x.moveTo(-3,0);x.lineTo(-6,-2+Math.sin(t*4)*.4);x.lineTo(-6,2);x.closePath();x.fill();x.restore();}
function seal(x,g,t){
 x.save();x.translate(g.x,g.y);x.rotate(g.angle);x.scale(.47,.47);const beat=Math.sin(g.stroke);
 // A thin rim on the body alone was too subtle to notice against the water,
 // so gangchi now carry a soft gold halo (matching the light path's gold)
 // behind the whole silhouette instead. A radial gradient (not a flat
 // fill) keeps this a soft glow rather than a visible hard-edged oval,
 // capped at 50% opacity at its brightest point.
 x.save();
 const glow=x.createRadialGradient(0,2,2,0,2,42);
 glow.addColorStop(0,'rgba(244,200,95,.5)');glow.addColorStop(.6,'rgba(244,200,95,.22)');glow.addColorStop(1,'rgba(244,200,95,0)');
 x.fillStyle=glow;x.beginPath();x.ellipse(0,2,42,42,0,0,Math.PI*2);x.fill();
 x.restore();
 x.strokeStyle='rgba(182,215,221,.36)';x.lineWidth=1.5;
 for(let i=0;i<2;i++){x.beginPath();x.ellipse(-35-i*14,0,15+i*2,6+i*2,0,-1.1,1.1);x.stroke();}
 const grad=x.createLinearGradient(0,-13,0,13);grad.addColorStop(0,'#B2A88C');grad.addColorStop(.6,'#766F5F');grad.addColorStop(1,'#454F51');
 x.fillStyle='#59605C';x.beginPath();x.moveTo(3,1);x.quadraticCurveTo(-10-beat*6,22,7-beat*5,18);x.lineTo(14,2);x.fill();
 x.fillStyle=grad;x.beginPath();x.moveTo(-31,0);x.bezierCurveTo(-14,-12,12,-11,23,-7);x.quadraticCurveTo(35,-13,40,-4);x.lineTo(46,-1);x.quadraticCurveTo(44,4,29,4);x.bezierCurveTo(10,14,-16,12,-31,0);x.fill();
 x.beginPath();x.moveTo(-26,0);x.quadraticCurveTo(-45,-5-beat*4,-48,-9);x.lineTo(-38,1);x.lineTo(-45,8+beat*4);x.quadraticCurveTo(-28,11,-26,0);x.fill();
 x.fillStyle='#8D8975';x.beginPath();x.moveTo(11,4);x.quadraticCurveTo(15+beat*5,23,23+beat*3,17);x.lineTo(20,3);x.fill();
 x.fillStyle='#202E32';x.beginPath();x.arc(36,-4,1.3,0,Math.PI*2);x.fill();x.restore();
}
function bird(x,p,t){
 x.save();x.translate(p.x,p.y);x.rotate(p.angle);x.scale(p.scale,p.scale);
 const wing=Math.sin(t*4+p.phase)*4;
 x.fillStyle='#E6EBDD';x.beginPath();x.ellipse(0,0,10,3.6,0,0,Math.PI*2);x.fill();
 x.fillStyle='#BDC8C8';x.beginPath();x.moveTo(-3,-2);x.quadraticCurveTo(-2,-15-wing,8,-23-wing);x.lineTo(2,-10);x.lineTo(6,-1);x.fill();
 x.beginPath();x.moveTo(-4,1);x.quadraticCurveTo(-2,15+wing,8,23+wing);x.lineTo(1,9);x.lineTo(7,1);x.fill();
 x.fillStyle='#FAF9EF';x.beginPath();x.ellipse(9,-1,4.2,3,0,0,Math.PI*2);x.fill();
 x.fillStyle='#EFC570';x.beginPath();x.moveTo(12,-1);x.lineTo(17,.1);x.lineTo(12,1.8);x.fill();
 x.fillStyle='#2B4652';x.beginPath();x.moveTo(-9,0);x.lineTo(-16,-3);x.lineTo(-14,3);x.fill();x.restore();
}
function lighthouse(x,px,py,darkness,t){
 // The lighthouse tower itself is already part of the real island photo
 // (dokdo-islands.webp) -- drawing another one on top duplicated it in the
 // wrong place (a summit, not the real lamp position). Only the light it
 // casts at night is ours to add, anchored on the real lamp, and it should
 // read as an actual lighthouse beam, not a candle: strong bloom, long reach.
 if(darkness<=.1)return;
 x.save();x.translate(px,py);
 const pulse=.6+.4*Math.sin(t*2.2),glow=darkness*pulse;
 // Two circles only -- a bright core and one soft halo. A fanned-out
 // beam read as unrealistic (reported as not convincing) and is gone.
 // The halo used to reach 150px and washed out the whole island, so it's
 // kept small here and the core itself doubled to stay the visible source.
 x.globalAlpha=.18*glow;x.fillStyle='#ffe9ab';
 x.beginPath();x.arc(0,0,70,0,Math.PI*2);x.fill();
 x.globalAlpha=1;
 x.fillStyle='#fff8e0';x.shadowColor='#ffe9ab';x.shadowBlur=90*glow;
 x.beginPath();x.arc(0,0,8+6*pulse,0,Math.PI*2);x.fill();
 x.shadowBlur=55*glow;x.beginPath();x.arc(0,0,8+6*pulse,0,Math.PI*2);x.fill();
 x.shadowBlur=0;
 x.restore();
}
function boat(x,px,py,angle,alpha){
 // A flat, hard-edged silhouette read as a foreign object pasted onto the
 // photoreal island art (reported as looking like ice stuck to the rock).
 // An actual blur filter on the fill -- not just a shadow behind it --
 // softens the silhouette's own edge into a gradient instead of a cutout.
 x.save();x.translate(px,py);x.rotate(angle);x.globalAlpha=alpha;
 x.filter='blur(2.2px)';
 x.fillStyle='rgba(11,16,23,.4)';
 x.beginPath();x.moveTo(-15,4);x.quadraticCurveTo(-17,9,-9,9);x.lineTo(9,9);x.quadraticCurveTo(16,9,14,3);x.closePath();x.fill();
 x.fillRect(-4,-6,9,7);
 x.filter='none';
 x.restore();
}
// A single ferry-style silhouette makes one slow round trip to the pier per
// cycle: eases in, holds at the dock, then eases back out to open water.
function pierBoat(x,t,reduced){
 if(reduced)return;
 const cycle=t%170;if(cycle>=70)return;
 const start=[PIER[0]-235,PIER[1]+55];
 let u;
 if(cycle<28)u=cycle/28;else if(cycle<42)u=1;else u=1-(cycle-42)/28;
 const inbound=cycle<42;
 const bx=start[0]+u*(PIER[0]-start[0]),by=start[1]+u*(PIER[1]-start[1]);
 const angle=Math.atan2(PIER[1]-start[1],PIER[0]-start[0])+(inbound?0:Math.PI);
 const fade=Math.min(1,cycle/5,(70-cycle)/5);
 boat(x,bx,by,angle,fade);
}
function birdPositions(s,t,stationary=false){
 if(!s.visual?.birdsEnabled||!s.visual.birdVisit)return [];
 // The visit runs for a minute so the celebration is actually noticed, but
 // the flock keeps its old 24-second orbit instead of drifting in slow motion.
 const BIRD_SEC=60;
 const elapsed=stationary?12:BIRD_SEC-s.visual.birdVisit.remainingMs/1000,u=Math.max(0,Math.min(1,elapsed/BIRD_SEC)),fade=Math.min(1,u*(BIRD_SEC/4),(1-u)*(BIRD_SEC/4));
 // 새 떼도 레벨만큼 늘어납니다. 처음 오는 사람에게도 최소 세 마리는 보이고,
 // 화면이 새로 덮이지 않게 위로는 열두 마리에서 멈춥니다.
 const flock=Math.max(3,Math.min(12,(s.visual.birdFlock|0)||5));
 return Array.from({length:flock},(_,i)=>{
  const a=(elapsed/24)*Math.PI*2-.8+i*.18;
  return {x:760+490*Math.cos(a)+(i-2)*20,y:215+150*Math.sin(a)+(i%2)*18,
    angle:Math.atan2(150*Math.cos(a),-490*Math.sin(a)),phase:i*1.7,scale:.65+(i%3)*.14,fade};
 });
}
function drawLights(x,s){
 const lights=lightPositions(s),size=lights.length>700?1.15:lights.length>180?1.6:3.3;
 for(const p of lights){
  if(p.lv!==4)continue; // prior earned beacons remain visible above the new path
  const r=p.lv===4?4.5:size;
  x.fillStyle=PALETTE[p.lv];x.shadowColor=PALETTE[p.lv];x.shadowBlur=p.lv===4?19:Math.max(2,14-lights.length/100);
  x.beginPath();x.arc(p.x,p.y,r,0,Math.PI*2);x.fill();
  if(p.lv===4){x.shadowBlur=0;x.strokeStyle='rgba(124,232,213,.48)';x.lineWidth=1.4;x.beginPath();x.arc(p.x,p.y,12,0,Math.PI*2);x.stroke();
   // A glow alone reads poorly in daylight -- plant one small flag per earned
   // beacon, exactly one-to-one, so the achievement stays visible day or night.
   taegeukgi(x,p.x,p.y-4,.34);
  }
 }
 x.shadowBlur=0;
}
// Durable progress is separate from the decorative route coordinates.
const Journey=typeof module==='object'&&module.exports?require('./journey.js'):globalThis.DokdoJourney;
const Solar=typeof module==='object'&&module.exports?require('./solar.js'):globalThis.DokdoSolar;
// Every ring is ART.east/ART.west uniformly scaled toward its own center, so
// an arc-length fraction on the base outline lands on the same vertex at any
// ring radius. Dongdo's light path should start at its summit (the topmost
// outline vertex) rather than wherever the old fixed .06 offset happened to
// land, so the very first credit lights up there.
function arcFractionOfVertex(poly,idx){let total=0,upto=0;
 for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],d=Math.hypot(b[0]-a[0],b[1]-a[1]);if(i<idx)upto+=d;total+=d;}
 return upto/total;
}
function topmostIndex(poly){let idx=0;for(let i=1;i<poly.length;i++)if(poly[i][1]<poly[idx][1])idx=i;return idx;}
const ROUTE_START=[.06,arcFractionOfVertex(ART.east,topmostIndex(ART.east))];
const ROUTES=[0,1].map(island=>Array.from({length:500},(_,i)=>{
 let p=arc(rings[island][10-2*Math.floor(i/100)],(i%100)/100+ROUTE_START[island]);
 for(let k=0;k<20&&!inside(p,[ART.west,ART.east][island]);k++)p=[(p[0]+centers[island][0])/2,(p[1]+centers[island][1])/2];
 return p;
}));
function routeGlobal(island,i){return Math.floor(i/10)*20+(island===1?0:10)+i%10;}
function taegeukgi(x,px,py,size){
 x.save();x.translate(px,py);x.scale(size,size);
 x.strokeStyle='#142b3a';x.lineWidth=2;x.beginPath();x.moveTo(0,0);x.lineTo(0,-26);x.stroke();
 x.strokeStyle='#c9d6d7';x.lineWidth=1;x.beginPath();x.moveTo(0,0);x.lineTo(0,-26);x.stroke();
 x.fillStyle='#fffdf4';x.strokeStyle='#253b46';x.lineWidth=.6;x.fillRect(0,-25,27,18);x.strokeRect(0,-25,27,18);
 x.save();x.translate(13.5,-16);x.rotate(.56);x.fillStyle='#cd2e3a';x.beginPath();x.arc(0,0,4.5,0,Math.PI*2);x.fill();
 x.fillStyle='#0047a0';x.beginPath();x.arc(0,0,4.5,0,Math.PI);x.fill();
 x.fillStyle='#cd2e3a';x.beginPath();x.arc(-2.25,0,2.25,0,Math.PI*2);x.fill();
 x.fillStyle='#0047a0';x.beginPath();x.arc(2.25,0,2.25,0,Math.PI*2);x.fill();x.restore();
 // 건곤감리는 네 귀퉁이에서 중심을 향해 놓입니다. 괘의 세 막대가 쌓이는 방향이
 // 중심을 잇는 대각선과 같아야 합니다. ±0.55는 그 대각선(35.5°)보다 23° 얕아
 // 국기와 달라 보였습니다. 0.951 = 90° - 35.5°.
 const TRI=.951;
 const corners=[[-7,-5,-TRI,[1,1,1]],[7,5,-TRI,[0,0,0]],[7,-5,TRI,[0,1,0]],[-7,5,TRI,[1,0,1]]];
 for(const [a,b,r,bars] of corners){x.save();x.translate(13.5+a,-16+b);x.rotate(r);x.fillStyle='#15232a';bars.forEach((solid,i)=>{if(solid)x.fillRect(-2.3,-1.5+i*1.3,4.6,.8);else{x.fillRect(-2.3,-1.5+i*1.3,1.85,.8);x.fillRect(.45,-1.5+i*1.3,1.85,.8);}});x.restore();}x.restore();
}
function drawJourneyRaw(x,s,{darkness=0,width=W}={}){
 const p=Journey.progress(s),completed=p.shownLap>1,ink=p.color;
 const ui=Math.min(1.9,Math.max(1,W/Math.max(320,width)*.6));
 // The path's glow used to fade to nothing in daytime (darkness=0), so the
 // light path itself became invisible. A floor keeps a soft glow visible
 // day and night; night still burns brighter on top of it.
 const glowD=Math.max(darkness,.35);
 for(let island=0;island<2;island++){
  const path=ROUTES[island];
  for(let i=0;i<500;i++){
   const g=routeGlobal(island,i),lit=g<p.filled;
   const color=lit?ink:completed?p.previousColor:'rgba(160,194,194,.16)';
   const a=path[i],b=path[Math.min(i+1,499)];
   if(i%100===99)continue;
   x.globalAlpha=(lit||completed)?(.30+.70*glowD):1;
   x.strokeStyle=color;x.lineCap='round';x.lineWidth=(lit||completed?2.5:1)*ui;
   x.shadowColor=color;x.shadowBlur=lit||completed?glowD*15:0;
   x.beginPath();x.moveTo(...a);x.lineTo(...b);x.stroke();
  }
  x.shadowBlur=0;x.globalAlpha=1;
  // One flag per 5 correct answers (a filled line-segment is 10), so flags
  // are the marker that stays legible even when the glow above is subtle.
  // 좁은 화면에서 국기를 크게 그리면 서로 겹쳐 한쪽에 뭉쳐 보입니다. 선 굵기는
 // 그대로 두고 국기만 작게 그려, 넓은 화면처럼 섬을 빙 둘러싸게 합니다.
 const flagUi=Math.min(1.2,Math.max(.85,W/Math.max(320,width)*.45));
 const flags=completed?100:Math.floor((island===1?p.east:p.west)/5),stride=width<520?2:1;
  for(let k=0;k<flags;k++)if(k%stride===0||k===flags-1){const a=path[Math.min(k*5+4,499)];taegeukgi(x,a[0],a[1],.66*flagUi);}
 }
 x.shadowBlur=0;
 for(let i=0;i<25;i++){
  const rock=ART.rocks[i%ART.rocks.length],sum=rock.reduce((a,b)=>[a[0]+b[0],a[1]+b[1]],[0,0]),a=[sum[0]/rock.length,sum[1]/rock.length];
  const off=Math.floor(i/ART.rocks.length);a[0]+=(off-1)*5;a[1]+=off*3;
  const on=p.filled>1000+i,color=on?ink:completed?p.previousColor:'rgba(149,190,195,.25)';
  x.fillStyle=color;x.shadowColor=color;x.shadowBlur=(on||completed)?12*glowD:0;x.beginPath();x.arc(...a,(on||completed?2.9:1.4)*ui,0,Math.PI*2);x.fill();
 }
 x.shadowBlur=0;
}
let routeCache=null,routeCacheKey='';
function drawJourney(x,s,options={}){const p=Journey.progress(s),k=p.total+':'+Math.round((options.darkness||0)*50)+':'+Math.round((options.width||W)/16);
 if(typeof document==='undefined'){drawJourneyRaw(x,s,options);return;}
 if(k!==routeCacheKey||!routeCache){routeCache=document.createElement('canvas');routeCache.width=W;routeCache.height=H;drawJourneyRaw(routeCache.getContext('2d'),s,options);routeCacheKey=k;}
 x.drawImage(routeCache,0,0);
}
function weatherOverlay(x,weather,t,reduced){
 if(!weather)return;
 if(weather.cloud>40){x.fillStyle='rgba(85,109,129,'+(weather.cloud/100*.14)+')';x.fillRect(0,0,W,H);}
 if(weather.kind==='fog'){x.fillStyle='rgba(177,199,207,.11)';x.fillRect(0,0,W,H);}
 if(!['rain','snow'].includes(weather.kind))return;
 const n=weather.kind==='snow'?65:90,clock=reduced?0:t;
 x.save();x.strokeStyle='rgba(192,219,231,.26)';x.fillStyle='rgba(237,247,251,.5)';x.lineWidth=1.2;
 for(let i=0;i<n;i++){const px=(i*177.79+clock*(weather.kind==='rain'?24:5))%W,py=(i*91.13+clock*(weather.kind==='rain'?155:17))%H;
  if(weather.kind==='snow'){x.beginPath();x.arc(px,py,1.5+i%2,0,Math.PI*2);x.fill();}else{x.beginPath();x.moveTo(px,py);x.lineTo(px-4,py+13);x.stroke();}}
 x.restore();
}

function background(x,texture,t=0){
 // A deeper, richer gradient plus a slow sparkle band reads as real water at
 // a glance without a photographic texture, which would fight the dynamic
 // overlays (fish, flags, gangchi, weather) drawn on top every frame.
 const g=x.createLinearGradient(0,0,W,H);
 g.addColorStop(0,'#0b2e46');g.addColorStop(.42,'#0a4060');g.addColorStop(.75,'#083550');g.addColorStop(1,'#051f30');
 x.fillStyle=g;x.fillRect(0,0,W,H);
 if(texture&&texture.complete&&texture.naturalWidth){x.save();x.globalAlpha=.22;x.fillStyle=x.createPattern(texture,'repeat');x.fillRect(0,0,W,H);x.restore();}
 x.save();
 const sway=Math.sin(t*.08)*40;
 const sparkle=x.createLinearGradient(0,H*.28+sway,W,H*.52+sway);
 sparkle.addColorStop(0,'rgba(255,255,255,0)');
 sparkle.addColorStop(.5,'rgba(214,238,247,.06)');
 sparkle.addColorStop(1,'rgba(255,255,255,0)');
 x.fillStyle=sparkle;x.fillRect(0,0,W,H);
 x.restore();
}
function render(ctx,s,t,options={}){
 const {islands,texture,reduced=false,labels=false,lightLayer=null}=options;
 const phase=options.phase||Solar.phase(options.now||Date.now());
 const clock=reduced?0:t;
 ctx.save();ctx.clearRect(0,0,W,H);background(ctx,texture,clock);
 ctx.strokeStyle='rgba(67,150,165,.08)';ctx.lineWidth=1.4;
 for(let j=0;j<17;j++){ctx.beginPath();for(let i=0;i<=32;i++){const xx=i*48,yy=30+j*43+Math.sin(i*.38+j*.7+clock*.12)*6;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.stroke();}
 const density={calm:144,rich:288,full:384}[s.seaDensity]||288;
 for(let i=0;i<density;i++)fish(ctx,fishPosition(i,clock),clock);
 // A mother whale with her calf alongside, and a pod of dolphins that comes
 // round far more often and moves faster. The pod grows with the learner's
 // level, so a longer record has more to watch.
 function cetacean(x,y,size,alpha){
  ctx.save();ctx.translate(x,y);ctx.globalAlpha=alpha;ctx.fillStyle='#99C1CB';
  ctx.beginPath();ctx.ellipse(0,0,76*size,15*size,-.02,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.moveTo(-66*size,0);ctx.lineTo(-110*size,-20*size);ctx.lineTo(-97*size,0);ctx.lineTo(-110*size,18*size);ctx.closePath();ctx.fill();
  ctx.restore();
 }
 const cycle=clock%190;
 if(!reduced&&cycle>45&&cycle<105){
  const xx=(cycle-45)/60*(W+240)-120,yy=648+Math.sin(cycle/20)*8;
  cetacean(xx,yy,1,.19);
  cetacean(xx-95,yy+26,.42,.15);   // 아기 고래가 어미 뒤를 따라갑니다
 }
 // 한 덩어리로 움직이는 떼입니다. 예전에는 세 줄로 흩어진 채 0.55초씩
 // 벌어져 최대 8초 길이로 늘어졌고, 화면을 17초에 가로질러 너무 빨랐습니다.
 // 이제 30초에 걸쳐 건너가므로 고래(60초)보다는 두 배 빠르되 눈으로 따라갈
 // 수 있고, 섬을 가로지르지 않도록 앞쪽 열린 바다로만 지나갑니다.
 const pod=Math.max(3,Math.min(14,options.pod|0||3));
 const CROSS=30,dcycle=clock%64;   // 고래(190)보다 훨씬 자주 옵니다
 if(!reduced&&dcycle<CROSS){
  const head=dcycle/CROSS*(W+420)-210;
  for(let i=0;i<pod;i++){
   const col=Math.floor(i/3),row=i%3;
   const xx=head-col*44-(row&1)*17,yy=608+row*18+Math.sin(clock*1.5+i)*5;
   if(xx<-60||xx>W+60)continue;
   // 물고기 떼와 섞여 보이지 않는다는 지적을 받아, 등지느러미를 세우고
   // 더 밝고 진하게 그립니다. 크기는 요청대로 예전의 1.5분의 1입니다.
   ctx.save();ctx.translate(xx,yy);ctx.globalAlpha=.62;ctx.fillStyle='#EAF7F9';
   ctx.beginPath();ctx.ellipse(0,0,15,3.8,-.12,0,Math.PI*2);ctx.fill();
   ctx.beginPath();ctx.moveTo(2,-2);ctx.lineTo(-4,-11);ctx.lineTo(-7,-1);ctx.closePath();ctx.fill();
   ctx.beginPath();ctx.moveTo(-13,0);ctx.lineTo(-23,-5);ctx.lineTo(-19,0);ctx.lineTo(-23,5);ctx.closePath();ctx.fill();
   ctx.restore();
  }
 }
 for(const g of gangchiPositions(s,clock))seal(ctx,g,clock);
 pierBoat(ctx,clock,reduced);
 if(islands?.complete&&islands.naturalWidth)ctx.drawImage(islands,0,0,W,H);
 else{ctx.fillStyle='#466569';for(const p of [ART.west,ART.east]){ctx.beginPath();p.forEach((v,i)=>i?ctx.lineTo(...v):ctx.moveTo(...v));ctx.closePath();ctx.fill();}}
 // Subtle twilight glaze on the original approved illustration.
 ctx.fillStyle='rgba(2,10,25,'+(.06+phase.darkness*.68)+')';ctx.fillRect(0,0,W,H);
 if(phase.darkness>.12&&phase.darkness<.85){const glaze=ctx.createLinearGradient(0,0,W,H);glaze.addColorStop(0,'rgba(236,145,83,.13)');glaze.addColorStop(1,'rgba(85,76,136,.10)');ctx.fillStyle=glaze;ctx.fillRect(0,0,W,H);}
 weatherOverlay(ctx,options.weather,clock,reduced);
 drawJourney(ctx,s,{darkness:phase.darkness,width:options.width||W});
 if(lightLayer)ctx.drawImage(lightLayer,0,0);else drawLights(ctx,s);
 for(const b of birdPositions(s,clock,reduced)){ctx.save();ctx.globalAlpha=b.fade;bird(ctx,b,clock);ctx.restore();}
 lighthouse(ctx,LIGHTHOUSE[0],LIGHTHOUSE[1],phase.darkness,clock);
 if(labels){
  // The 1536px plate is drawn onto a ~450px phone, so everything here reads
  // at about a third of its size. The island names are set large enough to
  // survive that. 서도 sits clear of the 빛의 길 panel, which is pinned to the
  // bottom-left corner and was covering it.
  ctx.textAlign='center';ctx.shadowColor='#001322';
  ctx.font='700 54px GmarketSans, sans-serif';ctx.fillStyle='#F5F4E9';ctx.shadowBlur=14;
  ctx.fillText('서도 · Seodo',612,505);ctx.fillText('동도 · Dongdo',1210,648);
  // The coordinates are a caption, not a third island name: half the size of
  // the names and in the monospaced face, which reads as map data and cannot
  // be mistaken for one of the two labels it used to run into.
  ctx.font='600 28px "IBM Plex Mono", monospace';ctx.fillStyle='rgba(230,240,242,.8)';ctx.shadowBlur=10;
  ctx.fillText('37°14′N 131°52′E',W/2,H-22);ctx.textAlign='left';ctx.shadowBlur=0;
 }
 ctx.restore();
}
return {W,H,ART,inside,landDistance,slot,BEACON_SLOTS,lightPositions,canPlace,gangchiPositions,fishPosition,birdPositions,drawLights,drawJourney,routeGlobal,ROUTES,render};
});
