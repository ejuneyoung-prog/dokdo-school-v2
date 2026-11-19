/* 공유 이미지(브랜드 규정 V2: 차콜 바탕·흰 글자·라임 강조, 영문은 발로 컨덴스드): 내 배와 태극기, 수호 일수가 담긴 세로 9:16(1080×1920) 한 장.
 * 장면(sea.snapshot)을 배경으로 꽉 채우고, 위에 태극기를 규격대로 크게 그린다.
 * 저장: 먼저 사진을 만들어 띄운다. 그 아래 \"공유하기\"(공유 시트가 되는 기기), \"내려받기\"(앱 안 브라우저가 아닐 때), 늘 \"길게 눌러 저장\" 안내.
 * 어린이 보호 확인을 통과하지 않은 기기는 닉네임·학년을 넣지 않는다(app.js가 info에서 뺀다).
 * 이미지는 이 기기에서만 만들어진다. 어디에도 올리지 않는다. */
(function(root){
'use strict';
const W=1080,H=1920;
function cover(x,src){const s=Math.max(W/src.width,H/src.height),w=src.width*s,h=src.height*s;x.drawImage(src,(W-w)/2,(H-h)/2,w,h)}
function text(x,t,px,y,o){const fam=o&&o.en?'"Barlow Condensed",GmarketSans,':'GmarketSans,';x.font=((o&&o.w)||700)+' '+px+'px '+fam+'"Apple SD Gothic Neo","Malgun Gothic",sans-serif';x.textAlign='center';x.textBaseline='middle';
 if(o&&o.stroke){x.lineWidth=px*.16;x.strokeStyle='rgba(35,37,40,.6)';x.strokeText(t,W/2,y)}x.fillStyle=o&&o.color||'#fff';x.fillText(t,W/2,y)}
// info: {nick, title, days, grade, url, hall}
async function make(scene,info,doc){const d=doc||root.document;try{if(d.fonts&&d.fonts.load)await Promise.race([Promise.all([d.fonts.load('700 40px GmarketSans'),d.fonts.load('500 40px GmarketSans'),d.fonts.load('700 40px "Barlow Condensed"')]),new Promise(r=>setTimeout(r,1500))])}catch(e){}
 const c=d.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
 x.fillStyle='#232528';x.fillRect(0,0,W,H);if(scene&&scene.width)cover(x,scene);
 let g=x.createLinearGradient(0,0,0,640);g.addColorStop(0,'rgba(35,37,40,.78)');g.addColorStop(1,'rgba(35,37,40,0)');x.fillStyle=g;x.fillRect(0,0,W,640);
 g=x.createLinearGradient(0,H-760,0,H);g.addColorStop(0,'rgba(35,37,40,0)');g.addColorStop(.45,'rgba(35,37,40,.75)');g.addColorStop(1,'rgba(35,37,40,.95)');x.fillStyle=g;x.fillRect(0,H-760,W,760);
 text(x,'DOKDO TOGETHER',64,120,{w:700,en:true,color:'#B6D80C'});
 text(x,'독도는 한국 땅',96,230,{stroke:true});
 // 태극기(규격): 세로 300 → 가로 450
 const fh=300,fw=fh*1.5,fx=(W-fw)/2,fy=330;x.save();x.shadowColor='rgba(0,0,0,.35)';x.shadowBlur=30;x.shadowOffsetY=10;x.fillStyle='#fff';x.fillRect(fx,fy,fw,fh);x.restore();
 root.DokdoTaegeukgi.draw(x,fx,fy,fh);
 const by=H-520;
 text(x,(info.hall?'★ ':'')+(info.title||''),44,by,{w:700,color:'#FFFFFF'});
 text(x,info.nick||'독도 코리아 스쿨 선장',84,by+90,{stroke:true});
 text(x,'독도를 지킨 날 '+(info.days|0)+'일째',64,by+200,{color:'#B6D80C',stroke:true});
 if(info.grade)text(x,'독도 코리아 스쿨 · '+info.grade,42,by+290,{w:500,color:'#A7ABB0'});
 text(x,info.url||'',40,H-80,{w:500,color:'#A7ABB0'});
 return c}
const toBlob=c=>new Promise(r=>{try{c.toBlob(b=>r(b),'image/png')}catch(e){r(null)}});
// 앱 안 브라우저(인스타그램·페이스북·카카오톡·라인·틱톡·네이버)는 내려받기가 막히는 일이 많아 길게 눌러 저장하게 한다.
const inApp=ua=>/Instagram|FBAN|FBAV|KAKAOTALK|Line\/|BytedanceWebview|musical_ly|TikTok|NAVER\(inapp/i.test(ua||(root.navigator&&root.navigator.userAgent)||'');
function fileOf(blob,name){try{return new root.File([blob],name,{type:'image/png'})}catch(e){return null}}
// 공유 시트를 쓸 수 있는가(파일 공유). 공유는 사람이 "공유하기"를 누른 그 순간에 부른다(사파리는 누른 직후가 아니면 막는다).
function canShare(blob,name){const nav=root.navigator||{},f=blob&&fileOf(blob,name);try{return!!(f&&nav.canShare&&nav.share&&nav.canShare({files:[f]}))}catch(e){return false}}
// 'shared' · 'cancelled' · 'failed'
async function share(blob,name){try{await root.navigator.share({files:[fileOf(blob,name)],title:'DOKDO TOGETHER'});return'shared'}catch(e){return e&&e.name==='AbortError'?'cancelled':'failed'}}
// 내려받기를 시도한다. 실제로 저장됐는지는 브라우저가 알려 주지 않으므로 '시도함'만 돌려준다.
function download(blob,name){if(!blob||!root.URL||!root.URL.createObjectURL)return false;const a=root.document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;root.document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);return true}
root.DokdoTogetherShare={W,H,make,toBlob,inApp,canShare,share,download};
})(typeof globalThis!=='undefined'?globalThis:this);
