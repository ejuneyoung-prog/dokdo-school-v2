/* 독도 앞바다 3D 장면. 힐링캠프(camp/healing.js)와 같은 three.js 0.160, 같은 하늘·바다 셰이더, 같은 지형 높이 자료를 쓴다(그 파일은 고치지 않음).
 * 배는 자리에 남아 있다(몰지 않는다). 끌어서 둘러보고, 두 손가락이나 휠로 가까이·멀리 본다.
 * 성능: 가까운 배 NEAR_SHIPS척만 입체로 그리고, 나머지는 태극기 점(Points 한 번)으로 그린다. 그림 배율은 1.75배까지.
 * 2D 화면만으로도 놀 수 있게, 3D를 켤 수 없으면 create()가 null을 돌려준다(app.js가 안내). */
(function(root){
'use strict';
const SKY_V='varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const SKY_F='uniform float d;uniform float n;uniform float g;varying vec3 p;void main(){float h=clamp(normalize(p).y,0.,1.);vec3 c=mix(vec3(.914,.875,.84),vec3(.60,.78,.93),smoothstep(0.,.16,h));c=mix(c,vec3(.33,.58,.86),smoothstep(.12,.7,h));vec3 e=mix(vec3(.99,.72,.56),vec3(.80,.55,.72),smoothstep(0.,.2,h));e=mix(e,vec3(.32,.33,.62),smoothstep(.15,.7,h));vec3 k=mix(c,e,d);k=mix(k,mix(vec3(.05,.08,.18),vec3(.015,.025,.08),smoothstep(0.,.5,h)),n);k=mix(k,mix(vec3(.74,.77,.8),vec3(.56,.6,.66),h)*(1.-.78*n),g*.85);gl_FragColor=vec4(k,1.);}';
const SEA_V='varying vec3 w;void main(){vec4 a=modelMatrix*vec4(position,1.);w=a.xyz;gl_Position=projectionMatrix*viewMatrix*a;}';
const SEA_F='uniform float t;uniform float d;uniform float n;uniform float g;uniform sampler2D f;varying vec3 w;void main(){vec2 uv=w.xz/2400.+.5;float s=(uv.x>0.&&uv.x<1.&&uv.y>0.&&uv.y<1.)?texture2D(f,uv).r:0.;float a=(1.+g*.6)*sin(w.x*.031+t*.8)*sin(w.z*.023-t*.6)+.5*sin((w.x+w.z)*.071+t*1.3)+.3*sin((w.x-w.z*1.4)*.17-t*1.9);vec3 c=mix(vec3(.05,.27,.47),vec3(.11,.45,.66),.5+.28*a);c+=vec3(.5,.55,.5)*smoothstep(1.05,1.5,a)*.32;c=mix(c,vec3(.13,.55,.62),smoothstep(.02,.3,s)*.55);c=mix(c,vec3(.95,.97,.97),smoothstep(.46,.62,s+.09*sin(t*1.4+w.x*.09+w.z*.07)));float q=length(w-cameraPosition);c=mix(c,c*vec3(.72,.62,.82)+vec3(.13,.06,.08),d);c=mix(c,c*.2+vec3(.0,.012,.035),n);c=mix(c,vec3(dot(c,vec3(.33)))*vec3(.86,.96,1.04),g*.6);vec3 hz=mix(mix(vec3(.914,.875,.84),vec3(.99,.72,.56),d),vec3(.05,.08,.18),n);hz=mix(hz,vec3(.74,.77,.8)*(1.-.78*n),g*.85);c=mix(c,hz,smoothstep(1400.-g*800.,9000.-g*4000.,q));gl_FragColor=vec4(c,1.);}';
// 독도 위치의 해 높이(도). view.js와 같은 천문 근사식(몇 분 어긋날 수 있음).
function sunAlt(now){const r=Math.PI/180,d=now/864e5-10957.5,g=(357.529+.98560028*d)*r,q=280.459+.98564736*d,L=(q+1.915*Math.sin(g)+.02*Math.sin(2*g))*r,e=(23.439-3.6e-7*d)*r;
 const ra=Math.atan2(Math.cos(e)*Math.sin(L),Math.cos(L))/r,dec=Math.asin(Math.sin(e)*Math.sin(L)),lat=37.24*r,lst=(280.46061837+360.98564736629*d+131.87)%360;
 const ha=((lst-ra)%360+540)%360-180;return{alt:Math.asin(Math.sin(lat)*Math.sin(dec)+Math.cos(lat)*Math.cos(dec)*Math.cos(ha*r))/r,az:ha*r}}
const ss=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
function create(cv,opt){const T=root.THREE,TR=root.DokdoTogetherTerrain,FL=root.DokdoTaegeukgi,SH=root.DokdoTogetherShip,FLEET=root.DokdoTogetherFleet,C=root.DokdoTogetherConfig;
 if(!T||!TR||!FL||!SH)return null;
 const calm=root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)').matches;
 let r;try{r=new T.WebGLRenderer({canvas:cv,antialias:(root.devicePixelRatio||1)<2,preserveDrawingBuffer:false})}catch(e){return null}
 r.setPixelRatio(Math.min(root.devicePixelRatio||1,1.75));r.outputColorSpace=T.SRGBColorSpace;
 const s=new T.Scene(),cam=new T.PerspectiveCamera(46,1,1,20000),hor=new T.Color('#e9dfd6');s.fog=new T.Fog(hor,1800,9000);
 const hemi=new T.HemisphereLight(0xdfeeff,0x8a7a6a,1.5);s.add(hemi);const sun=new T.DirectionalLight(0xfff0dc,2.3);s.add(sun);
 const skyU={d:{value:0},n:{value:0},g:{value:0}};
 s.add(new T.Mesh(new T.SphereGeometry(15000,24,14),new T.ShaderMaterial({uniforms:skyU,side:T.BackSide,depthWrite:false,fog:false,vertexShader:SKY_V,fragmentShader:SKY_F})));
 const cm=new T.MeshStandardMaterial({color:0xffffff,roughness:1,flatShading:true});
 [[-2600,620,-5200],[1900,760,-6000],[4200,560,-3200],[-5200,700,-1200],[900,900,4800]].forEach(([x,y,z])=>{const g=new T.Group();for(let k=0;k<5;k++){const m=new T.Mesh(new T.IcosahedronGeometry(170+k*38,1),cm);m.position.set((k-2)*230,(k%2)*50,(k%3)*70);m.scale.y=.42;g.add(m)}g.position.set(x,y,z);s.add(g)});
 const seaU={t:{value:0},f:{value:null},d:skyU.d,n:skyU.n,g:skyU.g};
 const sea=new T.Mesh(new T.PlaneGeometry(30000,30000),new T.ShaderMaterial({uniforms:seaU,vertexShader:SEA_V,fragmentShader:SEA_F}));sea.rotation.x=-Math.PI/2;s.add(sea);
 // 독도 지형(힐링캠프와 같은 계산)
 const M=TR.M,HB=atob(TR.HB),g=new T.PlaneGeometry(1,1,M.w-1,M.h-1),P=g.attributes.position,c=Math.cos(M.th),n=Math.sin(M.th),raw=k=>HB.charCodeAt(k)/255*176-4;let ax=0,an=0;const xs=[];
 for(let j=0;j<M.h;j++)for(let i=0;i<M.w;i++){const k=j*M.w+i,px=i*M.step-M.cx,py=j*M.step-M.cy,x=(c*px-n*py)*M.s,z=(n*px+c*py)*M.s;P.setXYZ(k,x,raw(k),z);if(raw(k)>30&&x>0){ax+=x;xs.push(z);an++}}
 const dx=ax/an,dz=xs.reduce((a,b)=>a+b,0)/an;for(let k=0;k<P.count;k++){const x=P.getX(k),z=P.getZ(k);if(x>30){P.setX(k,dx+(x-dx)*1.25);P.setZ(k,dz+(z-dz)*1.25)}}
 g.computeVertexNormals();
 const N=g.attributes.normal,col=new Float32Array(P.count*3),A=new T.Color('#5e5147'),B=new T.Color('#8e7a66'),G=new T.Color('#6d8f4b'),tc=new T.Color(),CELL=12,block=new Map();
 for(let k=0;k<P.count;k++){const y=P.getY(k),x=P.getX(k),z=P.getZ(k),up=N.getY(k);tc.copy(A).lerp(B,.5+.5*Math.sin(y*.55+x*.02));if(up>.66&&y>16)tc.lerp(G,Math.min(1,(up-.66)*5));if(y<3)tc.set('#3f3833');col.set([tc.r,tc.g,tc.b],k*3);if(y>.5)block.set(Math.round(x/CELL)+','+Math.round(z/CELL),1)}
 g.setAttribute('color',new T.BufferAttribute(col,3));s.add(new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true})));
 {const mk=()=>{const q=document.createElement('canvas');q.width=q.height=800;return q},m0=mk(),fc=mk(),y=m0.getContext('2d'),x=fc.getContext('2d');y.fillStyle='#000';y.fillRect(0,0,800,800);y.fillStyle='#fff';block.forEach((_,k)=>{const[a,b]=k.split(',').map(Number);y.fillRect((a*CELL/2400+.5)*800-3,(b*CELL/2400+.5)*800-3,6,6)});x.filter='blur(5px)';x.drawImage(m0,0,0);const ft=new T.CanvasTexture(fc);ft.flipY=false;seaU.f.value=ft}
 const hit=(x,z,pad=3)=>{const a=Math.round(x/CELL),b=Math.round(z/CELL);for(let i=-pad;i<=pad;i++)for(let j=-pad;j<=pad;j++)if(block.has((a+i)+','+(b+j)))return true;return false};
 // 섬 가운데와 크기(배 고리의 기준)
 let lx=0,lz=0,ln=0;block.forEach((_,k)=>{const[a,b]=k.split(',').map(Number);lx+=a*CELL;lz+=b*CELL;ln++});const ISLE={x:lx/ln,z:lz/ln,ext:0};block.forEach((_,k)=>{const[a,b]=k.split(',').map(Number);ISLE.ext=Math.max(ISLE.ext,Math.hypot(a*CELL-ISLE.x,b*CELL-ISLE.z))});
 // 텍스처: 태극기와 돛 문양
 const flagTex=new T.CanvasTexture(FL.canvas(160));flagTex.colorSpace=T.SRGBColorSpace;
 const sailTex=k=>{const q=document.createElement('canvas');q.width=q.height=128;const x=q.getContext('2d');x.fillStyle='#fbf8f1';x.fillRect(0,0,128,128);
  if(k==='stripe'){x.fillStyle='#2E3135';for(let i=0;i<4;i++)x.fillRect(0,18+i*28,128,10)}if(k==='wave'){x.strokeStyle='#2E3135';x.lineWidth=7;for(let j=0;j<3;j++){x.beginPath();for(let i=0;i<=128;i+=4)x.lineTo(i,40+j*30+Math.sin(i/12)*7);x.stroke()}}
  const t=new T.CanvasTexture(q);t.colorSpace=T.SRGBColorSpace;return t};
 const SHIP=SH.make(T,{flag:flagTex,sails:{plain:sailTex('plain'),stripe:sailTex('stripe'),wave:sailTex('wave')}});
 // 먼 배: 작은 태극기 점
 const dotC=document.createElement('canvas');dotC.width=dotC.height=64;{const x=dotC.getContext('2d');x.fillStyle='#232528';x.fillRect(2,13,60,42);FL.draw(x,5,16,36)}
 const dotTex=new T.CanvasTexture(dotC);dotTex.colorSpace=T.SRGBColorSpace;
 const dots=new T.Points(new T.BufferGeometry(),new T.PointsMaterial({map:dotTex,size:46,sizeAttenuation:true,transparent:true,alphaTest:.3,depthWrite:false}));s.add(dots);
 const tags=opt&&opt.tags,tagEls=new Map();
 // 밤에 내 배를 비추는 등불(밤일수록 밝다)
 const lamp=new T.PointLight(0xffd59a,0,220,1.2);
 const st={mode:'me',yaw:.6,pitch:.16,dist:120,target:new T.Vector3(),want:new T.Vector3(),wantDist:120,me:null,meBoat:null,placed:[],nearMap:new Map(),buoys:[],raise:null,waveUntil:0,flagUp:1,dirty:true,stage:0,key:''};
 // 배를 바다에서 뺄 때 그 배만의 모양(geometry)을 풀어 준다. 재질·텍스처는 모든 배가 함께 쓰므로 두고 간다.
 const drop=o=>{s.remove(o);o.traverse(m=>{if(m.geometry)m.geometry.dispose()})};
 function ship3(p){const b=SHIP.build({stage:p.stage,sail:p.sail,flagScale:(C.FLAG_SIZES.find(f=>f.id===p.flag)||{scale:1}).scale,hall:p.hall});b.position.set(p.x,0,p.z);b.rotation.y=Math.atan2(ISLE.x-p.x,ISLE.z-p.z)+Math.PI;/* 뱃머리(-z)가 독도를 본다. 바깥에서 보면 고물과 태극기 앞면이 보인다. */b.userData.p=p;return b}
 function tagFor(p){if(!tags)return null;let e=tagEls.get(p.id);if(!e){e=document.createElement('div');e.className='tag'+(p.me?' me':'')+(p.hall?' hall':'')+(p.sample?' sample':'');tags.append(e);tagEls.set(p.id,e)}
  const t=(p.hall?'★ ':'')+(p.nick||'');if(e.dataset.t!==t+(p.title||'')){e.dataset.t=t+(p.title||'');e.textContent='';const b=document.createElement('b');b.textContent=t;e.append(b);if(p.title){const sp=document.createElement('span');sp.textContent=p.title;e.append(sp)}}return e}
 // 배 목록 바꾸기(내 배 포함). 같은 목록이면 다시 만들지 않는다.
 function setFleet(list){const placed=FLEET.layout(list,{cx:ISLE.x,cz:ISLE.z,base:ISLE.ext+150,step:120,gapMin:40,blocked:(x,z)=>hit(x,z,4)});st.placed=placed;
  const me=placed.find(p=>p.me);const first=!st.me;st.me=me;if(me&&st.mode==='me'){st.want.set(me.x,8,me.z);if(first)st.yaw=Math.atan2(me.x-ISLE.x,me.z-ISLE.z)+.62}
  lodAt=null;relod(true)}
 // 가까운 배만 입체로(카메라 기준). 바뀐 것만 만든다.
 function relod(force){const pos=cam.position,{near,far}=FLEET.near(st.placed,pos.x,pos.z);const keep=new Set();
  for(const p of near){const key=[p.id,p.stage,p.sail,p.flag,p.hall?1:0].join('|');keep.add(p.id);let o=st.nearMap.get(p.id);if(!o||o.key!==key){if(o){if(o.b===st.meBoat&&lamp.parent)o.b.remove(lamp);drop(o.b)}o={b:ship3(p),key};s.add(o.b);st.nearMap.set(p.id,o);if(p.me){st.meBoat=o.b;o.b.userData.flag.position.y=st.flagUp?o.b.userData.flagTop:o.b.userData.flagLow;o.b.add(lamp);lamp.position.set(6,16,10)}}else{o.b.userData.p=p}}
  st.nearMap.forEach((o,id)=>{if(!keep.has(id)){drop(o.b);st.nearMap.delete(id);const e=tagEls.get(id);if(e){e.remove();tagEls.delete(id)}}});
  /* 먼 배 점: 개수와 자리가 같으면 그대로 둔다 */const arr=new Float32Array(far.length*3);far.forEach((p,i)=>arr.set([p.x,9,p.z],i*3));const old=dots.geometry.getAttribute('position');if(!old||old.array.length!==arr.length||old.array.some((v,i)=>v!==arr[i])){dots.geometry.dispose();dots.geometry=new T.BufferGeometry();dots.geometry.setAttribute('position',new T.BufferAttribute(arr,3));dots.geometry.computeBoundingSphere()}
  tagEls.forEach((e,id)=>{if(!st.nearMap.has(id)){e.remove();tagEls.delete(id)}})}
 // 통발 부표: 내 배 둘레에 던진 수만큼. ready면 깜빡인다.
 function setTraps(list){st.buoys.forEach(b=>drop(b.g));st.buoys=[];if(!st.me)return;list.forEach((t,i)=>{const g=SHIP.buoy(),a=Math.atan2(st.me.z-ISLE.z,st.me.x-ISLE.x)+(i-1)*.18,R=Math.hypot(st.me.x-ISLE.x,st.me.z-ISLE.z)+26;g.position.set(ISLE.x+Math.cos(a)*R,0,ISLE.z+Math.sin(a)*R);s.add(g);st.buoys.push({g,ready:!!t.ready,i})})}
 function raiseFlag(up,animate){st.flagUp=up?1:0;const b=st.meBoat;if(!b)return;const f=b.userData.flag;if(!animate||calm){f.position.y=up?b.userData.flagTop:b.userData.flagLow;return}st.raise={from:f.position.y,to:up?b.userData.flagTop:b.userData.flagLow,t0:performance.now()}}
 function waveFlag(){st.waveUntil=performance.now()+1600}
 function focusMe(){if(!st.me)return;st.mode='me';st.want.set(st.me.x,8,st.me.z);st.wantDist=120;st.pitch=.16;st.yaw=Math.atan2(st.me.x-ISLE.x,st.me.z-ISLE.z)+.62}
 function viewIsland(){st.mode='isle';st.want.set(ISLE.x,40,ISLE.z);st.wantDist=ISLE.ext*3.2+700;st.pitch=.55}
 // 입력: 끌기(둘러보기)·두 손가락/휠(거리)
 const pts=new Map();let pinch=0;
 cv.addEventListener('pointerdown',e=>{cv.setPointerCapture&&cv.setPointerCapture(e.pointerId);pts.set(e.pointerId,e)});
 cv.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;const o=pts.get(e.pointerId);pts.set(e.pointerId,e);
  if(pts.size===2){const[a,b]=[...pts.values()],d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);if(pinch)st.wantDist=Math.min(4000,Math.max(36,st.wantDist*pinch/d));pinch=d;return}
  st.yaw-=(e.clientX-o.clientX)*.008;st.pitch=Math.min(1.25,Math.max(.06,st.pitch+(e.clientY-o.clientY)*.004))});
 const up=e=>{pts.delete(e.pointerId);if(pts.size<2)pinch=0};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
 cv.addEventListener('wheel',e=>{e.preventDefault();st.wantDist=Math.min(4000,Math.max(36,st.wantDist*(1+e.deltaY*.001)))},{passive:false});
 // 세로 화면에서는 아래쪽에 목표 판과 단추가 있으므로, 화면 중심을 조금 아래로 옮겨(뷰 오프셋) 내 배가 화면 위쪽 가운데에 오게 한다.
 function fit(){const w=cv.clientWidth||root.innerWidth,h=cv.clientHeight||root.innerHeight;r.setSize(w,h,false);cam.aspect=w/h;if(h>w)cam.setViewOffset(w,h,0,h*.14,w,h);else cam.clearViewOffset();cam.updateProjectionMatrix()}
 root.addEventListener('resize',fit);fit();
 // 하늘: 독도의 실제 해 높이
 function skyNow(){const so=sunAlt(Date.now()),e=so.alt;skyU.d.value=ss(-4,1,e)*(1-ss(6,16,e));skyU.n.value=1-ss(-9,-1,e);const el=Math.max(.09,e*Math.PI/180);sun.position.set(Math.sin(so.az)*Math.cos(el)*900,Math.sin(el)*900,-Math.cos(so.az)*Math.cos(el)*900);sun.intensity=(2.3-skyU.d.value*.9)*(1-.92*skyU.n.value);hemi.intensity=1.5*(1-.82*skyU.n.value);
  s.fog.color.copy(hor).lerp(new T.Color('#fdb78f'),skyU.d.value).lerp(new T.Color('#0d1430'),skyU.n.value);const cl=1-.72*skyU.n.value;cm.color.setRGB(cl,cl,cl);SHIP.M.win.emissiveIntensity=skyU.n.value*1.6;lamp.intensity=90*Math.max(skyU.n.value,skyU.d.value*.4)}
 skyNow();setInterval(skyNow,60000);
 const v=new T.Vector3(),aim=new T.Vector3();let lodAt=null,last=performance.now(),lodT=0,paused=false,raf=0;
 function put(e,x,y,z){v.set(x,y,z).project(cam);const vis=v.z<1&&v.x>-1.1&&v.x<1.1&&v.y>-1.1&&v.y<1.1;if(!vis){e.style.visibility='hidden';return null}const px=(v.x+1)/2*cv.clientWidth,py=(1-v.y)/2*cv.clientHeight;e.style.transform='translate('+px.toFixed(1)+'px,'+py.toFixed(1)+'px) translate(-50%,-100%)';return{e,px,py,w:e.offsetWidth||90,h:e.offsetHeight||40,d:v.z}}
 // 이름표가 겹치면 덜 중요한 쪽을 숨긴다(내 배 > 명예의 전당 > 가까운 배 순).
 function declutter(list){const top=opt&&opt.top?opt.top():0;list.sort((a,b)=>b.pri-a.pri||a.d-b.d);const kept=[];for(const q of list){/* 위쪽 판 밑으로 들어가는 이름표: 내 것은 판 아래로 내려 붙이고, 나머지는 숨긴다 */if(q.py-q.h<top){if(q.pri<3){q.e.style.visibility='hidden';continue}q.py=top+q.h;q.e.style.transform='translate('+q.px.toFixed(1)+'px,'+q.py.toFixed(1)+'px) translate(-50%,-100%)'}const hit=kept.some(k=>Math.abs(k.px-q.px)<(k.w+q.w)/2+4&&Math.abs(k.py-q.py)<(k.h+q.h)/2+2);q.e.style.visibility=hit?'hidden':'visible';if(!hit)kept.push(q)}}
 function tick(nw){if(paused)return;const dt=Math.min(.05,(nw-last)/1000);last=nw;const t=nw/1000;seaU.t.value=t;
  st.target.lerp(st.want,Math.min(1,dt*2.4));st.dist+=(st.wantDist-st.dist)*Math.min(1,dt*2.4);
  if(!calm&&!pts.size&&st.mode==='isle')st.yaw+=dt*.02;
  const rd=Math.cos(st.pitch)*st.dist;cam.position.set(st.target.x+Math.sin(st.yaw)*rd,Math.sin(st.pitch)*st.dist+6,st.target.z+Math.cos(st.yaw)*rd);
  // 내 배를 볼 때는 섬 반대편 비스듬한 자리(+0.62rad)에서 배를 보아, 배 너머로 독도가 함께 보인다.
  aim.set(st.target.x,st.target.y+(st.mode==='me'?5:4),st.target.z);
  cam.lookAt(aim);
  if(nw-lodT>600){lodT=nw;/* 카메라가 충분히 움직였을 때만 가까운 배를 다시 고른다(배를 자주 만들었다 지우지 않게) */if(!lodAt||Math.hypot(cam.position.x-lodAt.x,cam.position.z-lodAt.z)>60){lodAt={x:cam.position.x,z:cam.position.z};relod()}}
  const wv=nw<st.waveUntil,tagQ=[];
  st.nearMap.forEach(o=>{const b=o.b,p=b.userData.p,a=calm?0:1;b.position.y=a*Math.sin(t*1.3+p.x*.01)*.5;b.rotation.x=a*Math.sin(t*1.1+p.z*.01)*.035;b.rotation.z=a*Math.sin(t*.9+p.x*.02)*.045;
   const f=b.userData.flag;SHIP.wave(f,t,calm?0:(p.me&&wv?1:.55));
   const e=tagFor(p);if(e){const q=put(e,p.x,b.userData.flagTop+(p.stage>2?16:12),p.z);if(q){q.pri=p.me?3:p.hall?2:1;tagQ.push(q)}}});declutter(tagQ);
  if(st.raise&&st.meBoat){const q=Math.min(1,(nw-st.raise.t0)/1600),k=q*q*(3-2*q),f=st.meBoat.userData.flag;f.position.y=st.raise.from+(st.raise.to-st.raise.from)*k;if(q>=1)st.raise=null}
  st.buoys.forEach(b=>{b.g.position.y=(calm?0:Math.sin(t*2+b.i)*.4)+(b.ready?.6+.4*Math.sin(t*6):0);b.g.rotation.y=t*.4});
  r.render(s,cam);raf=requestAnimationFrame(tick)}
 raf=requestAnimationFrame(tick);
 // 휴대폰이 그래픽 메모리를 거두어 가면(앱 전환 등) 멈추고, 돌려주면 페이지를 다시 연다(기록은 이 기기에 저장돼 있다).
 cv.addEventListener('webglcontextlost',e=>{e.preventDefault();paused=true;cancelAnimationFrame(raf);opt&&opt.onLost&&opt.onLost()});
 cv.addEventListener('webglcontextrestored',()=>{root.location.reload()});
 // 배터리: 화면이 숨으면 멈춘다.
 document.addEventListener('visibilitychange',()=>{if(document.hidden){paused=true;cancelAnimationFrame(raf)}else if(paused){paused=false;last=performance.now();raf=requestAnimationFrame(tick)}});
 // 공유 이미지용: 지금 장면을 내 배 시점으로 한 번 그려 캔버스를 돌려준다.
 // 공유 사진용 장면: 1080×1920으로 따로 한 번 그린다(화면 크기로 찍어 늘리면 흐리다). 끝나면 화면 크기로 되돌린다.
 function snapshot(){const keep={yaw:st.yaw,pitch:st.pitch,dist:st.dist,tx:st.target.clone()},pr=r.getPixelRatio();r.setPixelRatio(1);r.setSize(1080,1920,false);cam.aspect=1080/1920;cam.clearViewOffset();cam.updateProjectionMatrix();if(st.me){/* 늘 같은 구도: 섬 반대편 비스듬한 자리에서 내 배와 독도를 함께 */const yw=Math.atan2(st.me.x-ISLE.x,st.me.z-ISLE.z)+.5,D=st.me.stage>2?150:st.me.stage>1?125:105,rd=Math.cos(.14)*D;st.target.set(st.me.x,8,st.me.z);cam.position.set(st.me.x+Math.sin(yw)*rd,Math.sin(.14)*D+6,st.me.z+Math.cos(yw)*rd);cam.lookAt(st.me.x,12,st.me.z)}
  r.render(s,cam);const out=document.createElement('canvas');out.width=cv.width;out.height=cv.height;out.getContext('2d').drawImage(cv,0,0);st.yaw=keep.yaw;st.pitch=keep.pitch;st.dist=keep.dist;st.target.copy(keep.tx);r.setPixelRatio(pr);fit();return out}
 return{setFleet,setTraps,raiseFlag,waveFlag,focusMe,viewIsland,snapshot,ISLE,hit,get count(){return st.placed.length}};
}
root.DokdoTogetherSea={create,sunAlt};
})(typeof globalThis!=='undefined'?globalThis:this);
