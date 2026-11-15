/* 독도 리듬 놀이(시제품): 독도코리아 노래에 맞춰 내려오는 불빛을 D·F·J·K(휴대폰은 네 칸)로 친다.
 * 노트는 assets/rhythm-charts.js(tools/rhythm/make_chart.py 생성물), 음원은 앱 배경음악과 같은 파일이다.
 * 기록은 이 기기의 dk-rhythm-* 키에만 저장한다. 서버·통계로 보내는 것은 없다. 놀이터 도전권·섬 경험치와 연결하지 않는다.
 * 시간은 AudioContext 시계로 잰다. 멈춤은 그 시계를 멈추는 것이라 소리와 노트가 어긋나지 않는다. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else{root.DokdoRhythm=api;const d=root.document;if(d&&d.getElementById('board')){const go=()=>{api.game=api.boot(d);};d.readyState==='loading'?d.addEventListener('DOMContentLoaded',go):go();}}})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
// ── 규칙 (화면 없이 시험할 수 있는 부분) ──
const WIN={perfect:45,great:90,good:135};
const WEIGHT={perfect:1,great:0.7,good:0.3,miss:0};
const KEYS=['KeyD','KeyF','KeyJ','KeyK'];
const LABELS=['D','F','J','K'];
const SPEED={slow:2000,mid:1500,fast:1100};
const STORE={best:'dk-rhythm-best-v1',prefs:'dk-rhythm-prefs-v1'};
const HOLD_GRACE=120;// 꼬리 끝 이만큼 앞에서 떼도 성공으로 친다(ms)

function judge(delta){const a=Math.abs(delta);if(a<=WIN.perfect)return 'perfect';if(a<=WIN.great)return 'great';if(a<=WIN.good)return 'good';return null;}
function totalOf(notes){return notes.reduce((n,x)=>n+(x[2]>0?2:1),0);}// 긴 노트는 머리와 꼬리를 따로 센다
function accuracy(c,total){if(!total)return 0;const s=c.perfect*WEIGHT.perfect+c.great*WEIGHT.great+c.good*WEIGHT.good;return Math.round(s/total*1000)/10;}
function scoreOf(c,total){if(!total)return 0;const s=c.perfect*WEIGHT.perfect+c.great*WEIGHT.great+c.good*WEIGHT.good;return Math.round(s/total*1000000);}
function gradeOf(acc,c){if(c&&c.miss===0&&c.good===0&&c.great===0&&c.perfect>0)return 'S+';if(acc>=95)return 'S';if(acc>=90)return 'A';if(acc>=80)return 'B';if(acc>=70)return 'C';return 'D';}
function validChart(notes,duration){if(!Array.isArray(notes)||!notes.length)return false;let last=-1;for(const n of notes){if(!Array.isArray(n)||n.length!==3)return false;const[t,l,len]=n;if(!Number.isInteger(t)||!Number.isInteger(l)||!Number.isInteger(len))return false;if(t<last||t<0||t+len>duration||l<0||l>3||len<0)return false;last=t;}return true;}
function cleanPrefs(p){p=p&&typeof p==='object'?p:{};return{level:p.level==='normal'?'normal':'easy',speed:Object.hasOwn(SPEED,p.speed)?p.speed:'mid',offset:Number.isInteger(p.offset)?Math.max(-200,Math.min(200,p.offset)):0,song:typeof p.song==='string'?p.song:''};}
function cleanBest(b){const out={};if(!b||typeof b!=='object')return out;for(const[id,v]of Object.entries(b)){if(!/^[a-z]{2,20}$/.test(id)||!v||typeof v!=='object')continue;for(const lv of['easy','normal']){const r=v[lv];if(r&&Number.isInteger(r.score)&&r.score>=0&&r.score<=1000000&&typeof r.acc==='number'&&r.acc>=0&&r.acc<=100){out[id]=out[id]||{};out[id][lv]={score:r.score,acc:r.acc,grade:typeof r.grade==='string'?r.grade.slice(0,2):gradeOf(r.acc),combo:Number.isInteger(r.combo)?r.combo:0};}}}return out;}
function createStore(ls){return{get(k,d){try{const v=ls&&ls.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}},set(k,v){try{ls&&ls.setItem(k,JSON.stringify(v));return true;}catch(e){return false;}}};}

// 한 판의 상태. 화면 없이도 돌아가게 시각(ms)만 받는다.
function createRun(notes){
 const state=notes.map(n=>({t:n[0],lane:n[1],len:n[2],head:null,tail:null,holding:false}));
 const c={perfect:0,great:0,good:0,miss:0};let combo=0,maxCombo=0;const events=[];
 function add(kind,lane){c[kind]++;if(kind==='miss')combo=0;else{combo++;if(combo>maxCombo)maxCombo=combo;}events.push({kind,lane});}
 return{
  notes:state,counts:c,get combo(){return combo;},get maxCombo(){return maxCombo;},events,
  press(lane,now){// 가장 이른, 아직 안 친 같은 줄 노트
   let best=null;for(const n of state){if(n.lane!==lane||n.head)continue;if(n.t-now>WIN.good)break;if(now-n.t>WIN.good)continue;best=n;break;}
   if(!best)return null;const k=judge(now-best.t);best.head=k;add(k,lane);if(best.len>0)best.holding=true;return k;},
  release(lane,now){for(const n of state){if(n.lane===lane&&n.holding){n.holding=false;if(now>=n.t+n.len-HOLD_GRACE){n.tail='perfect';add('perfect',lane);}else{n.tail='miss';add('miss',lane);}}}},
  tick(now){for(const n of state){if(n.t-now>WIN.good)break;
    if(!n.head&&now-n.t>WIN.good){n.head='miss';add('miss',n.lane);if(n.len>0){n.tail='miss';add('miss',n.lane);}}
    if(n.holding&&now>=n.t+n.len){n.holding=false;n.tail='perfect';add('perfect',n.lane);}}},
  done(now){const last=state[state.length-1];return !!last&&now>last.t+last.len+WIN.good+200;}
 };}

// ── 화면 ──
function boot(doc){
const $=id=>doc.getElementById(id);
const CH=(root.DokdoRhythmCharts||[]).filter(s=>validChart(s.easy,s.duration)&&validChart(s.normal,s.duration));
let ls=null;try{ls=root.localStorage;}catch(e){}
const store=createStore(ls);
let prefs=cleanPrefs(store.get(STORE.prefs,{}));
if(!CH.some(s=>s.id===prefs.song))prefs.song=CH[0]?CH[0].id:'';
const en=()=>root.DokdoLanguage?.lang==='en';
const tr=(k,e)=>en()?e:k;
const reduce=root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)').matches;
const savePrefs=()=>store.set(STORE.prefs,prefs);
const best=()=>cleanBest(store.get(STORE.best,{}));
const mmss=ms=>{const s=Math.round(ms/1000);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};

function renderSongs(){const box=$('songs');box.replaceChildren();const B=best();
 for(const s of CH){const b=doc.createElement('button');b.type='button';b.className='r-song';b.setAttribute('aria-pressed',String(s.id===prefs.song));
  const t=doc.createElement('b');t.textContent=en()?s.titleEn:s.title;
  const m=doc.createElement('span');m.className='sub';m.textContent=mmss(s.duration)+' · '+Math.round(s.bpm)+' BPM · '+tr('노트 ','notes ')+s[prefs.level].length;
  const r=doc.createElement('span');r.className='rec';const rec=B[s.id]&&B[s.id][prefs.level];r.textContent=rec?tr('최고 ','Best ')+rec.score.toLocaleString()+' · '+rec.grade:tr('아직 기록 없음','No record yet');
  b.append(t,m,r);b.onclick=()=>{prefs.song=s.id;savePrefs();renderSongs();};box.append(b);}
 if(!CH.length){const p=doc.createElement('p');p.className='r-note';p.textContent=tr('노트 파일을 불러오지 못했습니다.','Could not load the note charts.');box.append(p);$('start').disabled=true;}}
function renderOptions(){doc.querySelectorAll('[data-level]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.level===prefs.level)));doc.querySelectorAll('[data-speed]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.speed===prefs.speed)));$('offset').textContent=(prefs.offset>0?'+':'')+prefs.offset+'ms';}
doc.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>{prefs.level=b.dataset.level;savePrefs();renderOptions();renderSongs();});
doc.querySelectorAll('[data-speed]').forEach(b=>b.onclick=()=>{prefs.speed=b.dataset.speed;savePrefs();renderOptions();});
$('offset-down').onclick=()=>{prefs.offset=Math.max(-200,prefs.offset-10);savePrefs();renderOptions();};
$('offset-up').onclick=()=>{prefs.offset=Math.min(200,prefs.offset+10);savePrefs();renderOptions();};

// 소리
let ac=null;const buffers={};
function ctx(){if(!ac){const A=root.AudioContext||root.webkitAudioContext;if(!A)return null;ac=new A();}return ac;}
function decode(a,buf){return new Promise((ok,no)=>{const p=a.decodeAudioData(buf,ok,no);if(p&&p.then)p.then(ok,no);});}
async function load(song){if(buffers[song.id])return buffers[song.id];const r=await root.fetch(song.file);if(!r.ok)throw Error('HTTP '+r.status);const b=await decode(ctx(),await r.arrayBuffer());buffers[song.id]=b;return b;}
function blip(kind){if(!ac||kind==='miss')return;const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime;o.type='sine';o.frequency.value=kind==='perfect'?1320:kind==='great'?990:660;g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.05,t+0.005);g.gain.exponentialRampToValueAtTime(0.0001,t+0.08);o.connect(g).connect(ac.destination);o.start(t);o.stop(t+0.1);}

// 한 판
let song=null,run=null,src=null,startAt=0,playing=false,paused=false,raf=0,lastSr=0,flash=[0,0,0,0],pops=[],glow=0;
const held=new Set(),pointers=new Map();
const fall=()=>SPEED[prefs.speed];
function songNow(){if(!ac)return 0;const lat=(ac.outputLatency||ac.baseLatency||0)*1000;return (ac.currentTime-startAt)*1000-lat-prefs.offset;}

async function start(){
 song=CH.find(s=>s.id===prefs.song)||CH[0];if(!song)return;
 const a=ctx();if(!a){$('status').textContent=tr('이 브라우저는 소리 재생을 지원하지 않습니다.','This browser cannot play audio here.');return;}
 if(a.state==='suspended')await a.resume();
 $('start').disabled=true;$('status').textContent=tr('곡을 불러오는 중… (3~5MB)','Loading the song… (3–5 MB)');
 let buf;try{buf=await load(song);}catch(e){$('status').textContent=tr('곡을 불러오지 못했습니다. 인터넷 연결을 확인하고 다시 눌러 주세요.','Could not load the song. Check the connection and try again.');$('start').disabled=false;return;}
 $('status').textContent='';$('start').disabled=false;
 begin(buf);}
function begin(buf){
 stopAudio();run=createRun(song[prefs.level]);held.clear();pointers.clear();pops=[];glow=0;flash=[0,0,0,0];
 $('stage').hidden=false;$('menu').hidden=true;$('result').hidden=true;doc.body.classList.add('r-playing');
 $('hud-song').textContent=(en()?song.titleEn:song.title)+' · '+(prefs.level==='easy'?tr('쉬움','Easy'):tr('보통','Normal'));
 resize();
 src=ac.createBufferSource();src.buffer=buf;const g=ac.createGain();g.gain.value=0.9;src.connect(g).connect(ac.destination);
 startAt=ac.currentTime+2.0;src.start(startAt);// 2초 뒤 시작: 첫 노트가 내려올 시간
 playing=true;paused=false;cancelAnimationFrame(raf);raf=root.requestAnimationFrame(frame);
 $('board').focus?.();}
function stopAudio(){if(src){try{src.stop();}catch(e){}src.disconnect();src=null;}}
function pause(){if(!playing||paused)return;paused=true;ac.suspend();$('menu').hidden=false;$('resume').focus();}
function resume(){if(!paused)return;paused=false;$('menu').hidden=true;ac.resume();raf=root.requestAnimationFrame(frame);}
function leave(){playing=false;paused=false;stopAudio();if(ac&&ac.state==='suspended')ac.resume();cancelAnimationFrame(raf);$('stage').hidden=true;doc.body.classList.remove('r-playing');renderSongs();$('start').focus();}
function finish(){playing=false;cancelAnimationFrame(raf);stopAudio();
 const total=totalOf(song[prefs.level]),c=run.counts,acc=accuracy(c,total),score=scoreOf(c,total),grade=gradeOf(acc,c);
 $('r-grade').textContent=grade;$('r-score').textContent=score.toLocaleString();
 $('r-detail').textContent=tr('정확도 '+acc+'% · 최대 콤보 '+run.maxCombo+' · 퍼펙트 '+c.perfect+' · 그레이트 '+c.great+' · 굿 '+c.good+' · 놓침 '+c.miss,'Accuracy '+acc+'% · Max combo '+run.maxCombo+' · Perfect '+c.perfect+' · Great '+c.great+' · Good '+c.good+' · Miss '+c.miss);
 const B=best(),old=B[song.id]&&B[song.id][prefs.level];
 if(!old||score>old.score){B[song.id]=B[song.id]||{};B[song.id][prefs.level]={score,acc,grade,combo:run.maxCombo};store.set(STORE.best,B);$('r-best').textContent=old?tr('새 최고 기록입니다!','New best!'):tr('첫 기록을 남겼습니다.','First record saved.');}
 else $('r-best').textContent=tr('최고 기록 ','Best ')+old.score.toLocaleString();
 $('result').hidden=false;$('again').focus();}

// 입력
function hit(lane){if(!playing||paused)return;const k=run.press(lane,songNow());flash[lane]=1;if(k){blip(k);pop(k,lane);}}
function lift(lane){if(!playing||paused)return;run.release(lane,songNow());}
function pop(kind,lane){pops.push({kind,lane,t:root.performance.now()});if(pops.length>12)pops.shift();}
doc.addEventListener('keydown',e=>{if(!playing)return;if(e.code==='Escape'||e.code==='KeyP'){e.preventDefault();paused?resume():pause();return;}const lane=KEYS.indexOf(e.code);if(lane<0||e.repeat||e.metaKey||e.ctrlKey||e.altKey)return;e.preventDefault();if(held.has(lane))return;held.add(lane);hit(lane);});
doc.addEventListener('keyup',e=>{const lane=KEYS.indexOf(e.code);if(lane<0)return;held.delete(lane);lift(lane);});
const board=$('board');
function laneAt(x){const r=board.getBoundingClientRect(),L=layout(r.width,r.height),i=Math.floor((x-r.left-L.left)/L.lane);return i>=0&&i<4?i:-1;}
board.addEventListener('pointerdown',e=>{if(!playing)return;e.preventDefault();const lane=laneAt(e.clientX);if(lane<0)return;try{board.setPointerCapture(e.pointerId);}catch(err){}pointers.set(e.pointerId,lane);hit(lane);});
const up=e=>{const lane=pointers.get(e.pointerId);if(lane===undefined)return;pointers.delete(e.pointerId);if(![...pointers.values()].includes(lane))lift(lane);};
board.addEventListener('pointerup',up);board.addEventListener('pointercancel',up);
board.addEventListener('contextmenu',e=>e.preventDefault());
doc.addEventListener('visibilitychange',()=>{if(doc.hidden)pause();});
$('start').onclick=start;$('pause').onclick=()=>paused?resume():pause();$('resume').onclick=resume;
$('retry').onclick=()=>{if(ac&&ac.state==='suspended')ac.resume();begin(buffers[song.id]);};
$('again').onclick=()=>begin(buffers[song.id]);$('quit').onclick=leave;$('back').onclick=leave;

// 그리기
let W=0,H=0,dpr=1;const g2=board.getContext('2d');
function resize(){const r=board.getBoundingClientRect();dpr=Math.min(root.devicePixelRatio||1,2);W=Math.max(1,Math.round(r.width));H=Math.max(1,Math.round(r.height));board.width=W*dpr;board.height=H*dpr;}
root.addEventListener('resize',()=>{if(playing)resize();});
function layout(w,h){const lane=Math.min(110,Math.max(64,(w-32)/4)),width=lane*4,left=(w-width)/2,hitY=h-Math.max(84,h*0.16),horizon=h*0.2;return{lane,width,left,hitY,horizon};}
function sky(L){const g=g2.createLinearGradient(0,0,0,H);g.addColorStop(0,'#081521');g.addColorStop(0.55,'#0f2c3a');g.addColorStop(1,'#123d45');g2.fillStyle=g;g2.fillRect(0,0,W,H);
 // 수평선과 두 섬(서도는 높고 뾰족, 동도는 낮고 넓게) + 동도 등대
 const y=L.horizon,cx=W/2,s=Math.min(W,700)/700;
 g2.fillStyle='#0b2230';g2.fillRect(0,y,W,H-y);
 g2.fillStyle='#1f4450';g2.beginPath();g2.moveTo(cx-210*s,y);g2.quadraticCurveTo(cx-150*s,y-70*s,cx-110*s,y-78*s);g2.quadraticCurveTo(cx-70*s,y-40*s,cx-30*s,y);g2.closePath();g2.fill();
 g2.beginPath();g2.moveTo(cx+20*s,y);g2.quadraticCurveTo(cx+80*s,y-46*s,cx+140*s,y-44*s);g2.quadraticCurveTo(cx+190*s,y-20*s,cx+230*s,y);g2.closePath();g2.fill();
 const lx=cx+132*s,ly=y-44*s;g2.fillStyle='#e9efe6';g2.fillRect(lx-3*s,ly-16*s,6*s,16*s);
 const beam=0.25+glow*0.75;
 if(!reduce){const a=(root.performance.now()/1600)%(Math.PI*2),len=Math.max(W,700);g2.save();g2.globalCompositeOperation='lighter';const grd=g2.createRadialGradient(lx,ly-16*s,0,lx,ly-16*s,len*0.6);grd.addColorStop(0,'rgba(232,255,160,'+(0.35*beam)+')');grd.addColorStop(1,'rgba(232,255,160,0)');g2.fillStyle=grd;g2.beginPath();g2.moveTo(lx,ly-16*s);g2.arc(lx,ly-16*s,len*0.6,a-0.12,a+0.12);g2.closePath();g2.fill();g2.restore();}
 g2.fillStyle='rgba(232,255,160,'+(0.5+beam*0.5)+')';g2.beginPath();g2.arc(lx,ly-17*s,3.2*s+beam*2,0,Math.PI*2);g2.fill();}
function frame(){if(!playing||paused)return;const now=songNow();run.tick(now);
 const L=layout(W,H);g2.setTransform(dpr,0,0,dpr,0,0);sky(L);
 // 줄
 for(let i=0;i<4;i++){const x=L.left+i*L.lane;g2.fillStyle=i%2?'rgba(255,255,255,0.035)':'rgba(255,255,255,0.06)';g2.fillRect(x,L.horizon,L.lane,H-L.horizon);
  if(flash[i]>0){g2.fillStyle='rgba(182,216,12,'+(0.22*flash[i])+')';g2.fillRect(x,L.horizon,L.lane,L.hitY-L.horizon);flash[i]=Math.max(0,flash[i]-0.08);}
  if(held.has(i)||[...pointers.values()].includes(i))flash[i]=Math.max(flash[i],0.6);}
 // 판정선과 글자
 g2.fillStyle='#b6d80c';g2.fillRect(L.left,L.hitY-2,L.width,4);
 g2.font='700 16px Gmarket,"Apple SD Gothic Neo",sans-serif';g2.textAlign='center';g2.textBaseline='middle';
 for(let i=0;i<4;i++){g2.fillStyle='rgba(255,255,255,0.55)';g2.fillText(LABELS[i],L.left+(i+0.5)*L.lane,L.hitY+28);}
 // 노트
 const F=fall(),span=L.hitY-L.horizon,yOf=t=>L.hitY-(t-now)/F*span;
 for(const n of run.notes){if(n.t-now>F)break;const x=L.left+n.lane*L.lane+6,w=L.lane-12;
  if(n.len>0&&n.tail==null){const y1=Math.min(L.hitY,yOf(n.t)),y2=Math.max(L.horizon,yOf(n.t+n.len));if(y1>y2){g2.fillStyle=n.head==='miss'?'rgba(150,160,170,0.35)':n.holding?'rgba(182,216,12,0.55)':'rgba(130,200,220,0.45)';g2.fillRect(x+w*0.3,y2,w*0.4,y1-y2);}}
  if(n.head)continue;const y=yOf(n.t);if(y<L.horizon-10||y>H+20)continue;
  const k=Math.max(0.55,(y-L.horizon)/span);g2.save();g2.shadowColor='#e8ffa0';g2.shadowBlur=reduce?0:14*k;g2.fillStyle=n.len>0?'#8fe3ff':'#f4ffd0';const h=12*k+4;g2.beginPath();if(g2.roundRect)g2.roundRect(x,y-h/2,w,h,h/2);else g2.rect(x,y-h/2,w,h);g2.fill();g2.restore();}
 // 판정 글자·콤보
 const pn=root.performance.now(),NAME={perfect:'PERFECT',great:'GREAT',good:'GOOD',miss:'MISS'},COL={perfect:'#e8ffa0',great:'#9ee6ff',good:'#ffd79a',miss:'#ff9a9a'};
 while(run.events.length){const e=run.events.shift();if(e.kind==='miss')pop('miss',e.lane);}
 pops=pops.filter(p=>pn-p.t<450);for(const p of pops){const a=1-(pn-p.t)/450;g2.globalAlpha=a;g2.fillStyle=COL[p.kind];g2.font='700 15px Gmarket,"Apple SD Gothic Neo",sans-serif';g2.fillText(NAME[p.kind],L.left+(p.lane+0.5)*L.lane,L.hitY-34-(1-a)*14);g2.globalAlpha=1;}
 if(run.combo>=5){g2.fillStyle='rgba(255,255,255,0.85)';g2.font='700 34px Gmarket,"Apple SD Gothic Neo",sans-serif';g2.fillText(String(run.combo),W/2,L.horizon+(L.hitY-L.horizon)*0.38);g2.font='700 13px Gmarket,"Apple SD Gothic Neo",sans-serif';g2.fillText('COMBO',W/2,L.horizon+(L.hitY-L.horizon)*0.38+26);}
 const total=totalOf(song[prefs.level]),c=run.counts,judged=c.perfect+c.great+c.good+c.miss;
 glow+=((judged?accuracy(c,judged)/100:0.3)*Math.min(1,run.combo/30+0.4)-glow)*0.05;
 $('hud-score').textContent=scoreOf(c,total).toLocaleString();
 if(pn-lastSr>4000){lastSr=pn;$('sr').textContent=tr('콤보 ','Combo ')+run.combo;}
 if(run.done(now)||(now>song.duration+500)){finish();return;}
 raf=root.requestAnimationFrame(frame);}

// ── 고정 문구 (한국어/영어) ──
function applyStatic(){const E=en();for(const n of doc.querySelectorAll('[data-en]')){if(!n.dataset.ko)n.dataset.ko=n.textContent;n.textContent=E?n.dataset.en:n.dataset.ko;}
 for(const n of doc.querySelectorAll('[data-en-label]')){if(!n.dataset.koLabel)n.dataset.koLabel=n.getAttribute('aria-label');n.setAttribute('aria-label',E?n.dataset.enLabel:n.dataset.koLabel);}
 for(const b of doc.querySelectorAll('[data-language-toggle]')){b.textContent=E?'한국어':'English';b.setAttribute('aria-label',E?'한국어로 바꾸기':'Switch to English');}
 doc.title=E?'Dokdo Rhythm · Dokdo Korea School':'독도 리듬 놀이 · 독도 코리아 스쿨';}
function relabel(){applyStatic();renderSongs();renderOptions();}
for(const b of doc.querySelectorAll('[data-language-toggle]')){if(!root.DokdoLanguage){b.hidden=true;continue;}b.addEventListener('click',()=>root.DokdoLanguage.set(en()?'ko':'en'));}
doc.addEventListener('dokdo:language',relabel);
relabel();
return{get run(){return run;},songNow,start,pause,resume};
}
return{WIN,WEIGHT,KEYS,SPEED,STORE,judge,totalOf,accuracy,scoreOf,gradeOf,validChart,cleanPrefs,cleanBest,createStore,createRun,boot};
});
