/* 배(집) 모양 모듈. 단계마다 모양 함수 하나. 면을 단순하게 깎아(flatShading, 적은 면) 휴대폰에서 가볍게 돈다.
 * 배 이름·모양을 바꾸거나 4~7단계를 더할 때는 BUILDERS에 함수만 더한다(config.js SHIPS와 짝).
 * 집짓기 = 배 위 선실: 1단계 돛과 태극기 → 2단계 선실 한 칸 → 3단계 2층 선실·창 불빛·굴뚝. 섬 위에는 아무것도 짓지 않는다. */
(function(root){
'use strict';
function make(T,tex){
 const M={wood:new T.MeshStandardMaterial({color:0x8a5a36,flatShading:true}),plank:new T.MeshStandardMaterial({color:0xc69a6b,flatShading:true}),
  wall:new T.MeshStandardMaterial({color:0xf1e6d2,flatShading:true}),roof:new T.MeshStandardMaterial({color:0x3f6f8f,flatShading:true}),
  win:new T.MeshStandardMaterial({color:0x6d8aa0,emissive:0xffd77a,emissiveIntensity:0,flatShading:true}),
  dark:new T.MeshStandardMaterial({color:0x40362f,flatShading:true}),gold:new T.MeshStandardMaterial({color:0xd8b04a,metalness:.4,roughness:.45,flatShading:true}),
  buoy:new T.MeshStandardMaterial({color:0xff7a2e,flatShading:true})};
 const sails={};for(const k of Object.keys(tex.sails))sails[k]=new T.MeshStandardMaterial({map:tex.sails[k],side:T.DoubleSide,flatShading:true});
 const flagM=new T.MeshBasicMaterial({map:tex.flag,side:T.DoubleSide});
 function hull(L,W){const sh=new T.Shape();sh.moveTo(-W,-L*.4);sh.lineTo(W,-L*.4);sh.quadraticCurveTo(W*1.1,L*.1,0,L*.5);sh.quadraticCurveTo(-W*1.1,L*.1,-W,-L*.4);
  const g=new T.Group(),h=new T.Mesh(new T.ExtrudeGeometry(sh,{depth:2.6,bevelEnabled:false,curveSegments:5}),M.wood);h.rotation.x=-Math.PI/2;h.position.y=.2;g.add(h);
  const dk=new T.Mesh(new T.ShapeGeometry(sh,5),M.plank);dk.rotation.x=-Math.PI/2;dk.scale.set(.86,.86,1);dk.position.y=2.85;g.add(dk);return g}
 // 태극기: 3:2 판을 잘게 나눠 흔든다. 깃대 쪽(왼쪽 끝)은 묶여 있다.
 function flag(scale){const w=6*scale,h=4*scale,g=new T.PlaneGeometry(w,h,10,6);g.translate(w/2,0,0);const m=new T.Mesh(g,flagM);m.userData={w,base:Float32Array.from(g.attributes.position.array)};return m}
 function mast(group,height,opt){const pole=new T.Mesh(new T.CylinderGeometry(.22,.3,height,6),opt.hall?M.gold:M.wood);pole.position.set(0,2.85+height/2,-1);group.add(pole);
  const fs=flag(opt.flagScale||1);const top=2.85+height-.3-fs.userData.w/3;fs.position.set(.25,top,-1);group.add(fs);
  // 깃봉: 국기 작도법의 무궁화 봉오리 모양을 단순화한 금빛 공
  const knob=new T.Mesh(new T.IcosahedronGeometry(.55,0),M.gold);knob.position.set(0,2.85+height+.3,-1);group.add(knob);
  group.userData.flag=fs;group.userData.flagTop=top;group.userData.flagLow=4.2;return pole}
 function sail(group,height,id,x=0){const g=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute([0,height,0,0,3.4,0,height*.42,3.9,0],3)).setAttribute('uv',new T.Float32BufferAttribute([0,1,0,0,1,0],2));g.computeVertexNormals();
  const s=new T.Mesh(g,sails[id]||sails.plain);s.position.set(x,0,-.6);group.add(s);return s}
 function cabin(w,h,d,y,z){const g=new T.Group(),box=new T.Mesh(new T.BoxGeometry(w,h,d),M.wall);box.position.y=h/2;g.add(box);
  const roof=new T.Mesh(new T.ConeGeometry(Math.hypot(w,d)/2*1.08,h*.7,4),M.roof);roof.rotation.y=Math.PI/4;roof.position.y=h+h*.35;g.add(roof);
  [-1,1].forEach(s=>{const wn=new T.Mesh(new T.BoxGeometry(.12,h*.35,d*.32),M.win);wn.position.set(s*(w/2+.02),h*.55,0);g.add(wn)});
  g.position.set(0,y,z);return g}
 const BUILDERS={
  1(opt){const g=new T.Group();g.add(hull(18,3.4));mast(g,15,opt);sail(g,15,opt.sail);return g},
  2(opt){const g=new T.Group();const h=hull(24,4.4);g.add(h);mast(g,18,opt);sail(g,18,opt.sail);g.add(cabin(6,4.2,6,2.85,3.6));return g},
  3(opt){const g=new T.Group();g.add(hull(31,5.6));mast(g,22,opt);sail(g,22,opt.sail);
   const c1=cabin(8,4.4,9,2.85,4.5);c1.children[1].visible=false;g.add(c1);const c2=cabin(6,3.8,6.4,7.25,4.5);g.add(c2);
   const chim=new T.Mesh(new T.CylinderGeometry(.55,.65,3.2,6),M.dark);chim.position.set(2.1,12.6,6.2);g.add(chim);
   for(let i=-1;i<=1;i+=2){const rail=new T.Mesh(new T.BoxGeometry(.18,1,22),M.wood);rail.position.set(i*4.6,3.6,-1.2);g.add(rail)}return g}};
 // 통발 부표(바다에 던져 둔 표시)
 function buoy(){const g=new T.Group(),b=new T.Mesh(new T.IcosahedronGeometry(1.3,0),M.buoy);g.add(b);const p=new T.Mesh(new T.CylinderGeometry(.12,.12,3,5),M.dark);p.position.y=1.6;g.add(p);return g}
 function build(opt){const st=Math.max(1,Math.min(3,opt.stage|0||1));const g=BUILDERS[st](opt);g.userData.stage=st;g.userData.hall=!!opt.hall;
  if(opt.hall){const ring=new T.Mesh(new T.TorusGeometry(1.4,.25,5,10),M.gold);ring.rotation.x=Math.PI/2;ring.position.set(0,g.userData.flagTop+3.2,-1);g.add(ring)}
  return g}
 // 흔들기: t(초), 세기 k(0~1). 깃대에서 멀수록 크게 흔들린다.
 function wave(f,t,k){const p=f.geometry.attributes.position,b=f.userData.base,w=f.userData.w;for(let i=0;i<p.count;i++){const x=b[i*3],y=b[i*3+1],u=x/w;p.setZ(i,Math.sin(x*.9-t*5.2+y*.25)*.55*u*k);p.setY(i,y-u*u*.25*(1-k))}p.needsUpdate=true}
 return{build,buoy,wave,M}}
root.DokdoTogetherShip={make};
})(typeof globalThis!=='undefined'?globalThis:this);
