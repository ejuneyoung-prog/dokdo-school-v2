/* 공유 이미지: 내 배와 태극기, 수호 일수가 담긴 세로 9:16(1080×1920) 한 장.
 * 장면(sea.snapshot)을 배경으로 꽉 채우고, 위에 태극기를 규격대로 크게 그린다.
 * 저장: 휴대폰은 공유 시트(navigator.share 파일), 안 되면 내려받기, 인스타그램 앱 안처럼 둘 다 막히면 그림을 띄워 길게 눌러 저장하게 한다.
 * 이미지는 이 기기에서만 만들어진다. 어디에도 올리지 않는다. */
(function(root){
'use strict';
const W=1080,H=1920;
function cover(x,src){const s=Math.max(W/src.width,H/src.height),w=src.width*s,h=src.height*s;x.drawImage(src,(W-w)/2,(H-h)/2,w,h)}
function text(x,t,px,y,o){x.font=((o&&o.w)===500?'500 '+px+'px ':'700 '+px+'px GmarketSans,')+'"Apple SD Gothic Neo","Malgun Gothic",sans-serif';x.textAlign='center';x.textBaseline='middle';
 if(o&&o.stroke){x.lineWidth=px*.16;x.strokeStyle='rgba(8,20,32,.55)';x.strokeText(t,W/2,y)}x.fillStyle=o&&o.color||'#fff';x.fillText(t,W/2,y)}
// info: {nick, title, days, grade, url, hall}
async function make(scene,info,doc){const d=doc||root.document;try{if(d.fonts&&d.fonts.load)await Promise.race([d.fonts.load('700 40px GmarketSans'),new Promise(r=>setTimeout(r,1500))])}catch(e){}
 const c=d.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
 x.fillStyle='#0d3a5a';x.fillRect(0,0,W,H);if(scene&&scene.width)cover(x,scene);
 let g=x.createLinearGradient(0,0,0,640);g.addColorStop(0,'rgba(6,18,30,.72)');g.addColorStop(1,'rgba(6,18,30,0)');x.fillStyle=g;x.fillRect(0,0,W,640);
 g=x.createLinearGradient(0,H-760,0,H);g.addColorStop(0,'rgba(6,18,30,0)');g.addColorStop(.45,'rgba(6,18,30,.7)');g.addColorStop(1,'rgba(6,18,30,.92)');x.fillStyle=g;x.fillRect(0,H-760,W,760);
 text(x,'DOKDO TOGETHER',44,120,{w:700,color:'#B6D80C'});
 text(x,'독도는 한국 땅',96,230,{stroke:true});
 // 태극기(규격): 세로 300 → 가로 450
 const fh=300,fw=fh*1.5,fx=(W-fw)/2,fy=330;x.save();x.shadowColor='rgba(0,0,0,.35)';x.shadowBlur=30;x.shadowOffsetY=10;x.fillStyle='#fff';x.fillRect(fx,fy,fw,fh);x.restore();
 root.DokdoTaegeukgi.draw(x,fx,fy,fh);
 const by=H-520;
 text(x,(info.hall?'★ ':'')+(info.title||''),44,by,{w:500,color:info.hall?'#f3d27a':'#d8eef8'});
 text(x,info.nick||'선장',84,by+90,{stroke:true});
 text(x,'독도를 지킨 날 '+(info.days|0)+'일째',64,by+200,{color:'#B6D80C',stroke:true});
 if(info.grade)text(x,'독도 코리아 스쿨 · '+info.grade,38,by+290,{w:500,color:'#d8eef8'});
 text(x,info.url||'',30,H-80,{w:500,color:'rgba(255,255,255,.75)'});
 return c}
const toBlob=c=>new Promise(r=>{try{c.toBlob(b=>r(b),'image/png')}catch(e){r(null)}});
// 저장하기: 'shared' · 'downloaded' · 'shown'(길게 눌러 저장) · 'cancelled'
async function save(c,name,show){const blob=await toBlob(c),nav=root.navigator||{};
 if(blob&&nav.canShare&&root.File){try{const f=new File([blob],name,{type:'image/png'});if(nav.canShare({files:[f]})){await nav.share({files:[f],title:'DOKDO TOGETHER'});return'shared'}}catch(e){if(e&&e.name==='AbortError')return'cancelled'}}
 const inApp=/Instagram|FBAN|FBAV|KAKAOTALK|Line\//i.test(nav.userAgent||'');
 if(blob&&!inApp&&root.URL&&root.URL.createObjectURL){const a=root.document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;root.document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);if(show)show(c,false);return'downloaded'}
 if(show)show(c,true);return'shown'}
root.DokdoTogetherShare={W,H,make,save};
})(typeof globalThis!=='undefined'?globalThis:this);
