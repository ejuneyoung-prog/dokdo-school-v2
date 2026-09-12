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
// Approximate, illustration-only anchors derived from the existing outline data
// (no separate lighthouse/pier coordinates were ever supplied): the topmost
// point of Dongdo for the lighthouse, nudged inland so the tower sits on solid
// ground; the westmost (strait-facing) point of Dongdo for the pier, since
// that is the shore facing the open water gangchi/boats travel through.
function shoreAnchor(poly,pick,island,nudge){
 let v=poly[0];for(const q of poly)if(pick(q,v))v=q;
 const c=centers[island];return [v[0]+(c[0]-v[0])*nudge,v[1]+(c[1]-v[1])*nudge];
}
// The lighthouse tower needs solid ground under it, so it is nudged inland
// from the outline. The pier is where the boat docks -- it stays right on
// the coastline (nudge 0) so it is never drawn over by the island art.
const LIGHTHOUSE=shoreAnchor(ART.east,(a,b)=>a[1]<b[1],1,.2);
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
 x.save();x.translate(px,py);
 x.fillStyle='#e7e3d3';x.strokeStyle='#3a3a34';x.lineWidth=.6;
 x.beginPath();x.moveTo(-3,0);x.lineTo(-1.6,-17);x.lineTo(1.6,-17);x.lineTo(3,0);x.closePath();x.fill();x.stroke();
 x.fillStyle='#c0392b';x.fillRect(-2.6,-9,5.2,2.4);
 x.fillStyle='#2c2c28';x.fillRect(-2.2,-21,4.4,4);
 if(darkness>.12){
  const pulse=.55+.45*Math.sin(t*2.6);
  x.fillStyle='#fff3c4';x.shadowColor='#ffe28a';x.shadowBlur=(10+14*pulse)*darkness;
  x.beginPath();x.arc(0,-19,1.6+pulse*.6,0,Math.PI*2);x.fill();x.shadowBlur=0;
  x.globalAlpha=.15*darkness*pulse;x.fillStyle='#ffe9ab';
  x.beginPath();x.moveTo(0,-19);x.lineTo(-72,-58);x.lineTo(-72,-4);x.closePath();x.fill();
  x.beginPath();x.moveTo(0,-19);x.lineTo(72,-58);x.lineTo(72,-4);x.closePath();x.fill();
  x.globalAlpha=1;
 }
 x.restore();
}
function boat(x,px,py,angle,alpha){
 x.save();x.translate(px,py);x.rotate(angle);x.globalAlpha=alpha;x.fillStyle='rgba(9,13,19,.55)';
 x.beginPath();x.moveTo(-15,4);x.quadraticCurveTo(-17,9,-9,9);x.lineTo(9,9);x.quadraticCurveTo(16,9,14,3);x.closePath();x.fill();
 x.fillRect(-4,-6,9,7);
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
 const elapsed=stationary?12:24-s.visual.birdVisit.remainingMs/1000,u=elapsed/24,fade=Math.min(1,u*6,(1-u)*6);
 return Array.from({length:5},(_,i)=>{
  const a=u*Math.PI*2-.8+i*.18;
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
const ROUTES=[0,1].map(island=>Array.from({length:500},(_,i)=>{
 let p=arc(rings[island][10-2*Math.floor(i/100)],(i%100)/100+.06);
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
 const corners=[[-7,-5,-.55,[1,1,1]],[7,5,-.55,[0,0,0]],[7,-5,.55,[0,1,0]],[-7,5,.55,[1,0,1]]];
 for(const [a,b,r,bars] of corners){x.save();x.translate(13.5+a,-16+b);x.rotate(r);x.fillStyle='#15232a';bars.forEach((solid,i)=>{if(solid)x.fillRect(-2.3,-1.5+i*1.3,4.6,.8);else{x.fillRect(-2.3,-1.5+i*1.3,1.85,.8);x.fillRect(.45,-1.5+i*1.3,1.85,.8);}});x.restore();}x.restore();
}
function drawJourneyRaw(x,s,{darkness=0,width=W}={}){
 const p=Journey.progress(s),completed=p.shownLap>1,ink=p.color;
 const ui=Math.min(1.9,Math.max(1,W/Math.max(320,width)*.6));
 for(let island=0;island<2;island++){
  const path=ROUTES[island];
  for(let i=0;i<500;i++){
   const g=routeGlobal(island,i),lit=g<p.filled;
   const color=lit?ink:completed?p.previousColor:'rgba(160,194,194,.16)';
   const a=path[i],b=path[Math.min(i+1,499)];
   if(i%100===99)continue;
   x.globalAlpha=(lit||completed)?(.30+.70*darkness):1;
   x.strokeStyle=color;x.lineCap='round';x.lineWidth=(lit||completed?2.5:1)*ui;
   x.shadowColor=color;x.shadowBlur=lit||completed?darkness*15:0;
   x.beginPath();x.moveTo(...a);x.lineTo(...b);x.stroke();
  }
  x.shadowBlur=0;x.globalAlpha=1;
  const flags=completed?50:Math.floor((island===1?p.east:p.west)/10),stride=width<520?5:width<900?2:1;
  for(let k=0;k<flags;k++)if(k%stride===0||k===flags-1){const a=path[k*10+9];taegeukgi(x,a[0],a[1],.66*ui);}
 }
 x.shadowBlur=0;
 for(let i=0;i<25;i++){
  const rock=ART.rocks[i%ART.rocks.length],sum=rock.reduce((a,b)=>[a[0]+b[0],a[1]+b[1]],[0,0]),a=[sum[0]/rock.length,sum[1]/rock.length];
  const off=Math.floor(i/ART.rocks.length);a[0]+=(off-1)*5;a[1]+=off*3;
  const on=p.filled>1000+i,color=on?ink:completed?p.previousColor:'rgba(149,190,195,.25)';
  x.fillStyle=color;x.shadowColor=color;x.shadowBlur=(on||completed)?12*darkness:0;x.beginPath();x.arc(...a,(on||completed?2.9:1.4)*ui,0,Math.PI*2);x.fill();
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

function background(x,texture){
 const g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,'#07243B');g.addColorStop(.48,'#073951');g.addColorStop(1,'#041B2D');x.fillStyle=g;x.fillRect(0,0,W,H);
 if(texture&&texture.complete&&texture.naturalWidth){x.save();x.globalAlpha=.11;x.fillStyle=x.createPattern(texture,'repeat');x.fillRect(0,0,W,H);x.restore();}
}
function render(ctx,s,t,options={}){
 const {islands,texture,reduced=false,labels=false,lightLayer=null}=options;
 const phase=options.phase||Solar.phase(options.now||Date.now());
 ctx.save();ctx.clearRect(0,0,W,H);background(ctx,texture);
 const clock=reduced?0:t;
 ctx.strokeStyle='rgba(67,150,165,.08)';ctx.lineWidth=1.4;
 for(let j=0;j<17;j++){ctx.beginPath();for(let i=0;i<=32;i++){const xx=i*48,yy=30+j*43+Math.sin(i*.38+j*.7+clock*.12)*6;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.stroke();}
 const density={calm:144,rich:288,full:384}[s.seaDensity]||288;
 for(let i=0;i<density;i++)fish(ctx,fishPosition(i,clock),clock);
 // A distant, infrequent whale is clearly larger than the small gangchi.
 const cycle=clock%190;
 if(!reduced&&cycle>45&&cycle<105){
  const xx=(cycle-45)/60*(W+240)-120,yy=648+Math.sin(cycle/20)*8;
  ctx.save();ctx.translate(xx,yy);ctx.globalAlpha=.19;ctx.fillStyle='#99C1CB';
  ctx.beginPath();ctx.ellipse(0,0,76,15,-.02,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.moveTo(-66,0);ctx.lineTo(-110,-20);ctx.lineTo(-97,0);ctx.lineTo(-110,18);ctx.closePath();ctx.fill();ctx.restore();
 }
 for(const g of gangchiPositions(s,clock))seal(ctx,g,clock);
 pierBoat(ctx,clock,reduced);
 if(islands?.complete&&islands.naturalWidth)ctx.drawImage(islands,0,0,W,H);
 else{ctx.fillStyle='#466569';for(const p of [ART.west,ART.east]){ctx.beginPath();p.forEach((v,i)=>i?ctx.lineTo(...v):ctx.moveTo(...v));ctx.closePath();ctx.fill();}}
 // Subtle twilight glaze on the original approved illustration.
 ctx.fillStyle='rgba(2,10,25,'+(.06+phase.darkness*.55)+')';ctx.fillRect(0,0,W,H);
 if(phase.darkness>.12&&phase.darkness<.85){const glaze=ctx.createLinearGradient(0,0,W,H);glaze.addColorStop(0,'rgba(236,145,83,.13)');glaze.addColorStop(1,'rgba(85,76,136,.10)');ctx.fillStyle=glaze;ctx.fillRect(0,0,W,H);}
 weatherOverlay(ctx,options.weather,clock,reduced);
 drawJourney(ctx,s,{darkness:phase.darkness,width:options.width||W});
 if(lightLayer)ctx.drawImage(lightLayer,0,0);else drawLights(ctx,s);
 for(const b of birdPositions(s,clock,reduced)){ctx.save();ctx.globalAlpha=b.fade;bird(ctx,b,clock);ctx.restore();}
 lighthouse(ctx,LIGHTHOUSE[0],LIGHTHOUSE[1],phase.darkness,clock);
 if(labels){
  ctx.font='500 27px GmarketSans, sans-serif';ctx.fillStyle='#F5F4E9';ctx.shadowColor='#001322';ctx.shadowBlur=10;
  ctx.fillText('서도 · Seodo',300,535);ctx.fillText('동도 · Dongdo',1160,674);ctx.shadowBlur=0;
 }
 ctx.restore();
}
return {W,H,ART,inside,landDistance,slot,BEACON_SLOTS,lightPositions,canPlace,gangchiPositions,fishPosition,birdPositions,drawLights,drawJourney,routeGlobal,ROUTES,render};
});
