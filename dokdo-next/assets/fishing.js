/* 독도 바다 낚시: 수심을 골라 낚싯줄을 내리는 2D 낚시 놀이.
 * 기록은 이 기기의 dk-fish-* 키에만 저장한다. 놀이터의 도전권·섬 경험치·저장(G.KEY)과 연결하지 않는다.
 * 생물·수심·출처 문구는 사실 확인을 마친 원본 그대로다. 고칠 때는 SRC 출처와 대조한다.
 * 영어 화면: 생물 설명과 '사는 곳'은 출처 문구 그대로 한국어로 두고, 영어 이름은 널리 확실한 것만 붙인다.
 * GA에는 고정된 사건 이름과 생물 id·바다 구역·점수만 보낸다(assets/analytics.js 허용 목록). */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else{root.DokdoFishing=api;const d=root.document;if(d&&d.getElementById('sea'))api.boot(d);}})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
// ── 자료 출처 ──
const SRC=[
 ['독도연구소 「어류」(혹돔·도화볼락·연어병치·가지초)','https://www.dokdo.re.kr/home/cms/cmsCont.do?cntnts_sn=89'],
 ['독도연구소 「해양생태계」(유착나무돌산호 25m·암반 어류·얕은 조숲의 어린 물고기)','https://www.dokdo.re.kr/home/cms/cmsCont.do?cntnts_sn=134'],
 ['해양수산부 「독도주변 해양생태조사 결과」 2014(우점종 변화, 50~80m 냉수대)','https://www.korea.kr/briefing/policyBriefingView.do?newsId=148782503'],
 ['명정구 외 「독도의 하계 조하대 해조상과 수중경관」 2017(대황 10m 전후, 감태 10~20m, 참담치 5~10m)','https://sciwatch.kiost.ac.kr/handle/2020.kiost/1314'],
 ['경북일보 「해조류의 대왕 울릉도·독도 대황」 2013(대황 군락과 전복·소라)','https://www.kyongbuk.co.kr/news/articleView.html?idxno=622134'],
 ['경북매일 2018(독도새우 3종, 수심 150~300m)','https://kbmaeil.com/article/201805040221061'],
 ['서울신문 2019(도화새우 150~300m, 최대 25cm)','https://m.go.seoul.co.kr/news/2019/05/29/20190529500039'],
 ['한국환경생태학회 2011(독도 주변 2,000m 심해, 급경사 해저)','https://koreascience.kr/article/CFKO201123552842182.pdf']
];
// ── 수심대 ──
const ZONES=[
 {id:'A',name:'얕은 바다',en:'Shallow sea',range:'0~10m',top:0,bot:10},
 {id:'B',name:'대황·감태 숲',en:'Kelp forest',range:'10~20m',top:10,bot:20},
 {id:'C',name:'암반과 가지초',en:'Rocks & Gajicho reef',range:'20~40m',top:20,bot:40},
 {id:'D',name:'독도새우 바다',en:'Dokdo shrimp sea',range:'150~300m',top:150,bot:300}
];
// ── 생물 ── kind: fish / shrimp / shell / weed / mussel. en: 널리 확실한 영어 이름이 있을 때만.
const SP=[
 {id:'jari',name:'자리돔',zone:'A',d:[2,10],where:'암반 지역',pts:10,kind:'fish',len:34,c:'#7d8f8c',c2:'#b9c6c2',spd:1.1,fight:.8,src:[3],note:'2006년 뒤 독도 바다의 우점종이 된 물고기입니다.'},
 {id:'yongchi',name:'용치놀래기',zone:'A',d:[3,10],where:'독도 연안',pts:10,kind:'fish',len:40,c:'#c98a5a',c2:'#e7c49a',spd:1.2,fight:.9,stripe:true,src:[3],note:'자리돔·망상어와 함께 늘어난 우점종입니다.'},
 {id:'malj',name:'말쥐치',zone:'A',d:[4,10],where:'암반 지역',pts:20,kind:'fish',len:42,c:'#8d9a6a',c2:'#c9d1a4',spd:.9,fight:1,tall:true,src:[2,3],note:'수온이 오르며 늘어난 어종으로 암반 지역에 삽니다.'},
 {id:'damchi',name:'참담치',zone:'A',d:[6,10],where:'수심 5~10m 바위',pts:10,kind:'mussel',len:26,c:'#3b3f45',c2:'#6d7480',spd:0,fight:.5,src:[4],note:'수심 5~10m 바위에서 모자반·산호말과 함께 붙어 삽니다.'},
 {id:'doldom',name:'돌돔 어린 물고기',en:'Juvenile barred knifejaw',zone:'A',d:[4,9],where:'동도와 서도 사이 얕은 조숲',pts:40,kind:'fish',len:36,c:'#d8d2b8',c2:'#3d4248',spd:1.3,fight:1.3,bands:true,src:[1,2],note:'동도와 서도 사이 얕은 조숲에 어린 돌돔이 삽니다.'},
 {id:'bengae',name:'벵에돔 어린 물고기',en:'Juvenile largescale blackfish',zone:'A',d:[4,9],where:'동도와 서도 사이 얕은 조숲',pts:40,kind:'fish',len:36,c:'#4a5a5c',c2:'#7f9396',spd:1.3,fight:1.3,src:[1,2],note:'얕은 조숲에서 자라는 어린 벵에돔입니다.'},
 {id:'daehwang',name:'대황',zone:'B',d:[10,12],where:'수심 10m 전후',pts:30,kind:'weed',len:70,c:'#5a4a2a',c2:'#8a7340',spd:0,fight:.6,src:[4,5],note:'수심 10m 전후에 큰 숲을 이룹니다. 큰 것은 1.5m 이상 자라고, 울릉도·독도가 원산지라고 합니다.'},
 {id:'gamtae',name:'감태',zone:'B',d:[12,20],where:'수심 10~20m',pts:20,kind:'weed',len:60,c:'#6b5a2c',c2:'#a08a48',spd:0,fight:.6,src:[4],note:'대황보다 조금 깊은 10~20m에 자랍니다.'},
 {id:'jeonbok',name:'전복',en:'Abalone',zone:'B',d:[10,12],where:'대황 군락',pts:50,kind:'shell',len:30,c:'#7a6a5a',c2:'#b7c9c4',spd:0,fight:.9,src:[5],note:'대황 군락은 전복·소라의 먹이가 됩니다.'},
 {id:'sora',name:'소라',en:'Turban shell',zone:'B',d:[10,12],where:'대황 군락',pts:40,kind:'conch',len:28,c:'#8a6f55',c2:'#d0b28c',spd:0,fight:.8,src:[5],note:'대황 군락은 소라의 먹이가 됩니다.'},
 {id:'bangeo',name:'방어',en:'Japanese amberjack',zone:'C',d:[20,34],where:'암반 지역',pts:50,kind:'fish',len:64,c:'#6d8696',c2:'#d9d29a',spd:1.8,fight:1.6,line:true,src:[2],note:'독도 암반 지역에서 볼 수 있는 물고기입니다.'},
 {id:'yeoneo',name:'연어병치',zone:'C',d:[26,38],where:'가지초 중층',pts:60,kind:'fish',len:56,c:'#55626a',c2:'#a3b0b6',spd:1.4,fight:1.5,school:true,src:[1],note:'가지초에서 중층을 떼 지어 헤엄칩니다. 50cm 급도 있습니다.'},
 {id:'dohwa_b',name:'도화볼락',zone:'C',d:[34,40],where:'가지초 해송 주변',pts:70,kind:'fish',len:44,c:'#c46a5a',c2:'#efb59f',spd:.9,fight:1.6,spots:true,src:[1],note:'수심 40m 가지초 해송 주변에 무리 지어 삽니다.'},
 {id:'hokdom',name:'혹돔',en:'Asian sheepshead wrasse',zone:'C',d:[22,40],where:'암반 지대',pts:120,kind:'fish',len:86,c:'#9a4f45',c2:'#d39a85',spd:.8,fight:2.2,hump:true,src:[1],note:'독도 연안에서 가장 큰 물고기로 알려져 있고, 80cm가 넘는 개체도 있습니다. 밤에는 바위틈이나 굴속에서 잡니다.'},
 {id:'mullung',name:'물렁가시붉은새우',zone:'D',d:[150,260],where:'수심 150~300m (독도새우 세 종 합쳐)',pts:150,kind:'shrimp',len:40,c:'#d86a5a',c2:'#f2b39e',spd:.7,fight:1.7,src:[6,7],note:'독도새우 세 종 가운데 하나로 꽃새우라고도 부릅니다.'},
 {id:'gasibae',name:'가시배새우',zone:'D',d:[170,280],where:'수심 150~300m (독도새우 세 종 합쳐)',pts:200,kind:'shrimp',len:40,c:'#c9853a',c2:'#efd08e',spd:.7,fight:1.9,spiny:true,src:[6,7],note:'독도새우 세 종 가운데 하나로 닭새우라고도 부릅니다.'},
 {id:'dohwa_s',name:'도화새우',zone:'D',d:[190,300],where:'수심 150~300m',pts:300,kind:'shrimp',len:56,c:'#e08f86',c2:'#fbd3c6',spd:.6,fight:2.4,big:true,src:[6,7],note:'독도새우 가운데 가장 크고(최대 25cm) 귀합니다. 수심 150~300m에 삽니다.'}
];
const PROTECT={name:'유착나무돌산호',depth:25,note:'서도 서쪽 수심 약 25m에 국내 최대 군집이 있는 해양보호생물입니다. 건드리지 않고 지나가요.',src:[2]};
// 이 놀이의 저장 키는 이 넷뿐이다. 놀이터(games-core.js)의 키를 읽거나 쓰지 않는다.
const KEYS=Object.freeze({dex:'dk-fish-dex',hall:'dk-fish-hall',prog:'dk-fish-prog',nick:'dk-fish-nick'});
// ── 성장 장치 ──
const LEVELS=[[0,'견습 어부','Apprentice angler'],[300,'독도 어부','Dokdo angler'],[1000,'대황 숲 어부','Kelp forest angler'],[2500,'가지초 베테랑','Gajicho reef veteran'],[5000,'독도새우 명인','Dokdo shrimp master'],[10000,'독도 바다지기','Dokdo sea guardian']];
const UNLOCK_NEED={B:['얕은 바다 생물 3종','3 shallow-sea species'],C:['대황·감태 숲 생물 3종','3 kelp-forest species'],D:['혹돔 또는 도감 10종','the Asian sheepshead wrasse or 10 guide entries']};
const BADGES=[['first','첫 손맛','First bite'],['daehwang','대황 숲 지기','Kelp forest keeper'],['hokdom','혹돔과의 대결','Wrasse showdown'],['shrimp1','첫 독도새우','First Dokdo shrimp'],['shrimp3','독도새우 3종','All 3 Dokdo shrimp'],['combo5','5연속 낚시','5 in a row'],['perfect','완벽한 손맛','Perfect touch'],['coral','보호생물을 지켰어요','Protected the coral'],['score1000','한 판 1,000점','1,000 points in a round'],['zoneA','얕은 바다 도감 완성','Shallow sea guide complete'],['zoneB','대황 숲 도감 완성','Kelp forest guide complete'],['zoneC','가지초 도감 완성','Gajicho guide complete'],['zoneD','독도새우 도감 완성','Dokdo shrimp guide complete'],['dexAll','독도 바다 박사','Dokdo sea expert'],['mission','오늘의 임무 완수',"Today's mission done"]];
const MISSIONS=[
 {t:'자리돔 3마리 낚기',k:'sp',id:'jari',n:3},{t:'참담치 2개 낚기',k:'sp',id:'damchi',n:2},{t:'대황 2개 거두기',k:'sp',id:'daehwang',n:2},
 {t:'감태 2개 거두기',k:'sp',id:'gamtae',n:2},{t:'전복 1개 낚기',k:'sp',id:'jeonbok',n:1},{t:'한 판에 500점',k:'score',n:500},
 {t:'5연속으로 낚기',k:'combo',n:5},{t:'한 판에 5종 낚기',k:'kinds',n:5},{t:'연어병치 2마리 낚기',k:'sp',id:'yeoneo',n:2},{t:'독도새우 1마리 낚기',k:'shrimp',n:1}];

// ── 순수 규칙 (화면 없이 시험할 수 있음) ──
function createStore(storage){return{get(k,d){try{const v=storage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}},set(k,v){try{storage.setItem(k,JSON.stringify(v));return true;}catch(e){return false;}}};}
function loadSaved(store){return{dex:store.get(KEYS.dex,{}),hall:store.get(KEYS.hall,[]),prog:Object.assign({xp:0,unlocked:['A'],badges:{},mission:{}},store.get(KEYS.prog,{}))};}
function unlockReady(z,dex){if(z==='B')return SP.filter(s=>s.zone==='A'&&dex[s.id]).length>=3;if(z==='C')return SP.filter(s=>s.zone==='B'&&dex[s.id]).length>=3;if(z==='D')return !!dex.hokdom||SP.filter(s=>dex[s.id]).length>=10;return false;}
function newlyUnlocked(unlocked,dex){const out=[];for(const z of ['B','C','D'])if(!unlocked.includes(z)&&unlockReady(z,dex))out.push(z);return out;}
function maxDepthFor(isOpen){return isOpen('D')?300:isOpen('C')?40:isOpen('B')?20:10;}
function dayKey(d){return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}
function todayMission(d){const k=dayKey(d||new Date());let h=0;for(const ch of k)h=(h*31+ch.charCodeAt(0))>>>0;return MISSIONS[h%MISSIONS.length];}
function levelOf(xp){let i=0;for(let k=0;k<LEVELS.length;k++)if(xp>=LEVELS[k][0])i=k;return i;}
// 세계 좌표: 수면 y=0. 깊이(m)를 세계 y로 바꿈 (중간 구간은 줄여 그림)
function yOf(m){if(m<=40)return m*24;if(m<=150)return 960+(m-40)*1.6;if(m<=300)return 1136+(m-150)*3.2;return 1616+(m-300)*.15;}
function mOf(y){if(y<=960)return y/24;if(y<=1136)return 40+(y-960)/1.6;if(y<=1616)return 150+(y-1136)/3.2;return 300+(y-1616)/.15;}
function mult(combo){return 1+.1*Math.min(10,Math.max(0,combo-1));}
function sizeFor(r){return r<.15?{key:'big',mult:1.5}:r<.45?{key:'small',mult:.8}:{key:'normal',mult:1};}
function isGolden(golden,timeLeft){return !!(golden&&timeLeft<=golden.from&&timeLeft>golden.to);}
function isPerfect(f){return f.total>0&&f.onT/f.total>=.85;}
function scoreCatch({pts,size,first,perfect,combo,gold}){
 let p=pts*size.mult;const lines=[{id:'base',pts,size:size.key,v:Math.round(p)}];
 if(first){lines.push({id:'first',v:Math.round(pts*.5)});p+=pts*.5;}
 if(perfect){lines.push({id:'perfect',v:Math.round(pts*.3)});p+=pts*.3;}
 if(combo>1){const m=mult(combo);lines.push({id:'combo',combo,m,v:Math.round(p*(m-1))});p*=m;}
 if(gold){lines.push({id:'gold',v:Math.round(p)});p*=2;}
 return{total:Math.round(p),lines};
}
function startFight(s,hookY){return{fish:.5,target:.5,tw:.6,zone:.38,zw:Math.max(.16,.3-s.fight*.05),v:0,ten:.7,startY:hookY,on:false,onT:0,total:0};}
// 힘겨루기 한 걸음. 수면(hookY≤2)까지 끌어올려야만 'landed'다.
function fightStep(f,s,hookY,holdMain,dt,rnd=Math.random){
 f.tw-=dt;if(f.tw<=0){f.target=rnd();f.tw=.5+rnd()*1.2/s.fight;}f.fish+=(f.target-f.fish)*dt*1.2*s.fight;f.fish=Math.max(.02,Math.min(.98,f.fish));
 f.v+=(holdMain?2.6:-2.2)*dt;f.v*=.92;f.zone+=f.v*dt;if(f.zone<0){f.zone=0;f.v=0;}if(f.zone>1-f.zw){f.zone=1-f.zw;f.v=0;}
 const on=f.fish>=f.zone&&f.fish<=f.zone+f.zw;f.on=on;f.total+=dt;if(on)f.onT+=dt;
 f.ten+=(on?.14:-.24/Math.sqrt(s.fight))*dt;f.ten=Math.min(1,f.ten);const reel=on&&rnd()<dt*6;
 if(on)hookY=Math.max(0,hookY-(hookY>yOf(40)?560:260)*dt);else hookY=Math.min(f.startY,hookY+18*s.fight*dt);
 if(hookY<=2)return{hookY:0,reel,outcome:'landed'};
 if(f.ten<=0)return{hookY,reel,outcome:'snapped'};
 return{hookY,reel,outcome:null};
}
// 키 입력 판정. 잡은 카드가 떠 있을 때 누르고 있는 스페이스(자동 반복)는 무시한다.
function keyAction(st,key,repeat,inInput){
 if(inInput)return{prevent:false,act:null};
 if(st==='catch'&&(key===' '||key==='Enter'))return{prevent:true,act:repeat?null:'close'};
 if(!['play','bite','fight'].includes(st))return{prevent:false,act:null};
 if(key===' '||key==='ArrowDown')return{prevent:true,act:repeat?null:'press'};
 if(key==='ArrowUp')return{prevent:true,act:'up'};
 return{prevent:false,act:null};
}
function shrimpCount(runCount){return SP.filter(q=>q.kind==='shrimp').reduce((a,q)=>a+(runCount[q.id]||0),0);}
function missionDone(m,run){if(m.k==='sp')return (run.runCount[m.id]||0)>=m.n;if(m.k==='score')return run.score>=m.n;if(m.k==='combo')return run.bestCombo>=m.n;if(m.k==='kinds')return new Set(run.caughtRun).size>=m.n;if(m.k==='shrimp')return shrimpCount(run.runCount)>=m.n;return false;}
function missionProgress(m,run){if(m.k==='sp')return Math.min(m.n,run.runCount[m.id]||0);if(m.k==='score')return Math.min(m.n,run.score);if(m.k==='combo')return Math.min(m.n,run.bestCombo);if(m.k==='kinds')return Math.min(m.n,new Set(run.caughtRun).size);if(m.k==='shrimp')return Math.min(m.n,shrimpCount(run.runCount));return 0;}

// ── 화면 ──
function boot(doc){
const $=id=>doc.getElementById(id);
let ls=null;try{ls=root.localStorage;}catch(e){}
const store=createStore(ls);
let {dex,hall,prog}=loadSaved(store);
const en=()=>root.DokdoLanguage?.lang==='en';
const tr=(ko,e)=>en()?e:ko;
const nm=s=>en()&&s.en?s.en:s.name;
const zn=z=>en()&&z.en?z.en:z.name;
const zr=z=>en()&&z.rangeEn?z.rangeEn:z.range;
const need=z=>UNLOCK_NEED[z][en()?1:0];
const FONT='Gmarket,"Apple SD Gothic Neo","Malgun Gothic",sans-serif';
const calm=!!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const track=(n,p)=>{try{root.DokdoAnalytics?.track(n,p);}catch(e){}};
let testMode=false;
const today=()=>dayKey(new Date());
function saveProg(){store.set(KEYS.prog,prog);}
function isOpen(z){return testMode||prog.unlocked.includes(z);}
function maxDepth(){return maxDepthFor(isOpen);}
function nextNeed(){for(const z of ['B','C','D'])if(!isOpen(z))return {zone:ZONES.find(q=>q.id===z),need:need(z)};return null;}
function ig(n){const c=n.charCodeAt(n.length-1);return c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28?n+'이':n+'가';}
function badge(id){if(prog.badges[id])return false;prog.badges[id]=today();saveProg();return true;}
const badgeName=id=>{const b=BADGES.find(q=>q[0]===id);return en()?b[2]:b[1];};
function missionText(m){if(!en())return m.t;if(m.k==='sp'){const s=SP.find(q=>q.id===m.id);return (s.kind==='weed'?'Gather ':'Catch ')+m.n+' × '+nm(s);}if(m.k==='score')return 'Score '+m.n+' in one round';if(m.k==='combo')return 'Catch '+m.n+' in a row';if(m.k==='kinds')return 'Catch '+m.n+' species in one round';if(m.k==='shrimp')return 'Catch '+m.n+' Dokdo shrimp';return m.t;}

const cv=$('sea');let cx=cv.getContext('2d');
function cxSwap(ctx,fn){const keep=cx;cx=ctx;try{fn();}finally{cx=keep;}}
let W=900,H=560;
function fit(){const box=$('box').clientWidth||900;W=900;H=box<560?Math.round(900*1.25):560;if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H;}}
const SKY=150;
const WORLD_BOTTOM=yOf(300)+220,BOAT_X=.34;

// ── 소리 ──
let ac=null;function actx(){if(!ac){try{ac=new (root.AudioContext||root.webkitAudioContext)();}catch(e){}}if(ac&&ac.state==='suspended')ac.resume();return ac;}
function tone(f1,f2,dur,g,type,delay=0){const a=actx();if(!a)return;const o=a.createOscillator(),v=a.createGain(),t=a.currentTime+delay;o.type=type||'sine';o.frequency.setValueAtTime(f1,t);o.frequency.exponentialRampToValueAtTime(Math.max(30,f2),t+dur);v.gain.setValueAtTime(g,t);v.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(v).connect(a.destination);o.start(t);o.stop(t+dur+.05);}
const sfx={bite(){tone(880,660,.12,.2,'square');tone(880,660,.12,.2,'square',.16);},reel(){tone(320+Math.random()*60,300,.04,.05,'triangle');},
 fanfare(rare){[523,659,784,1047].forEach((f,i)=>tone(f,f,.22,.18,'triangle',i*.09));if(rare)[1319,1568].forEach((f,i)=>tone(f,f,.35,.12,'sine',.4+i*.12));},
 miss(){tone(400,160,.35,.18,'sawtooth');},splash(){tone(200,80,.25,.15,'triangle');},no(){tone(300,300,.15,.12,'square');}};

// ── 상태 ──
let st='idle',score=0,timeLeft=180,hookY=0,camY=0,holdMain=false,holdUp=false,caughtRun=[],bite=null,fight=null,last=0,t=0,flash=null,bubbles=[],combo=0,bestCombo=0,golden=null,splash=[],limitWarned=false,runCount={};
let crit=[];
const run=()=>({runCount,score,bestCombo,caughtRun});
function spawn(){crit=[];for(const s of SP){const n=s.kind==='fish'?(s.school?4:s.id==='hokdom'?1:2):s.kind==='shrimp'?2:3;for(let i=0;i<n;i++){const m=s.d[0]+Math.random()*(s.d[1]-s.d[0]);crit.push({s,x:s.spd?Math.random()*W:W*BOAT_X+40+(Math.random()-.5)*180,y:yOf(m),dir:Math.random()<.5?-1:1,ph:Math.random()*6.28,cool:0});}}}
function zoneAt(m){if(m<=0.3)return null;if(m<10)return ZONES[0];if(m<20)return ZONES[1];if(m<=40)return ZONES[2];if(m<150)return {name:'찬물이 깔린 깊은 바다',en:'Deep sea over a cold-water layer',range:'40~150m'};if(m<=300)return ZONES[3];return {name:'해산 아래 심해',en:'Deep sea below the seamount',range:'300m 아래',rangeEn:'below 300m'};}

// ── 그리기 ──
function lerp(a,b,k){return a+(b-a)*k;}
function seaColor(y){const m=mOf(y);const k=Math.min(1,m/300);const r=Math.round(lerp(78,14,k)),g=Math.round(lerp(158,40,k)),b=Math.round(lerp(150,44,k));return `rgb(${r},${g},${b})`;}
function drawBackground(){
 const skyTop=-SKY-camY;cx.fillStyle='#dfe9e4';cx.fillRect(0,skyTop,W,SKY);
 const top=Math.max(0,-camY),g=cx.createLinearGradient(0,top,0,H);g.addColorStop(0,seaColor(Math.max(0,camY+top)));g.addColorStop(1,seaColor(camY+H));cx.fillStyle=g;cx.fillRect(0,top,W,H-top);
 // 해산 실루엣 (뒤 배경): 수면 위로 동도·서도, 아래로 넓어지는 화산체
 cx.save();cx.translate(0,-camY);
 const cxm=W*.68;
 cx.fillStyle='rgba(20,48,50,.55)';cx.beginPath();cx.moveTo(cxm-110,0);
 cx.bezierCurveTo(cxm-160,240,cxm-260,700,cxm-330,1100);cx.bezierCurveTo(cxm-420,1500,cxm-560,1800,cxm-700,WORLD_BOTTOM);
 cx.lineTo(cxm+700,WORLD_BOTTOM);cx.bezierCurveTo(cxm+560,1800,cxm+420,1500,cxm+330,1100);cx.bezierCurveTo(cxm+260,700,cxm+160,240,cxm+110,0);cx.closePath();cx.fill();
 // 수면 위 두 섬 (서도 왼쪽 높고 뾰족, 동도 오른쪽 낮고 평평)
 cx.fillStyle='#4f5b4e';cx.beginPath();cx.moveTo(cxm-105,0);cx.lineTo(cxm-92,-58);cx.lineTo(cxm-70,-96);cx.lineTo(cxm-52,-70);cx.lineTo(cxm-30,-40);cx.lineTo(cxm-18,0);cx.fill();
 cx.fillStyle='#5d6a5a';cx.beginPath();cx.moveTo(cxm+6,0);cx.lineTo(cxm+18,-44);cx.lineTo(cxm+44,-60);cx.lineTo(cxm+78,-58);cx.lineTo(cxm+96,-30);cx.lineTo(cxm+108,0);cx.fill();
 cx.fillStyle='#232528';cx.font='500 14px '+FONT;cx.textAlign='center';cx.fillText(tr('서도','Seodo'),cxm-62,-104);cx.fillText(tr('동도','Dongdo'),cxm+58,-68);
 for(let i=0;i<14;i++){const x=(i*71+30)%W,base=yOf(13+(i%3)),h=110+(i%4)*14;weed(x,base,h,'#4c3f22','#7b6533',t*1.2+i);}
 for(let i=0;i<3;i++){const x=W*.18+i*W*.3,base=yOf(40);seaFan(x,base);}
 coral(W*.47,yOf(PROTECT.depth));
 cx.textAlign='left';cx.font='500 14px '+FONT;
 for(const z of ZONES){const y=yOf(z.top);cx.fillStyle='rgba(255,255,255,.18)';cx.fillRect(0,y,W,1);cx.fillStyle='rgba(255,255,255,.85)';cx.fillText(zn(z)+' · '+z.range,12,y+20);}
 const gapY=yOf(40),gapH=yOf(150)-gapY;cx.fillStyle='rgba(255,255,255,.06)';cx.fillRect(0,gapY+2,W,gapH-4);cx.fillStyle='rgba(255,255,255,.75)';cx.fillText(tr('40~150m · 수심 50~80m 아래로 찬물이 깔립니다 (줄여 그림)','40~150m · Cold water lies below 50~80m (drawn compressed)'),12,gapY+gapH/2+5);
 const by=yOf(300);cx.fillStyle='rgba(255,255,255,.75)';cx.fillText(tr('해산은 약 2,000m 심해저까지 이어집니다','The seamount continues to the deep seafloor at about 2,000m'),12,by+40);
 // 낚싯줄 한계
 if(maxDepth()<300){const ly=yOf(maxDepth());cx.strokeStyle='#FFD23F';cx.setLineDash([10,8]);cx.lineWidth=2;cx.beginPath();cx.moveTo(0,ly);cx.lineTo(W,ly);cx.stroke();cx.setLineDash([]);const nn=nextNeed();const label=tr('낚싯줄 끝 · '+(nn?nn.need+' 모으면 더 깊이':''),'Line limit'+(nn?' · Collect '+nn.need+' to go deeper':''));const bw=Math.min(W-24,Math.max(360,cx.measureText(label).width+28));cx.fillStyle='rgba(35,37,40,.85)';cx.fillRect(W-12-bw,ly+6,bw,28);cx.fillStyle='#FFD23F';cx.textAlign='right';cx.fillText(label,W-20,ly+25);cx.textAlign='left';}
 cx.restore();
}
function weed(x,base,h,c1,c2,ph){const sy=base-camY;if(sy<-h-20||sy-h>H+20)return;cx.save();cx.translate(x,base);cx.strokeStyle=c1;cx.lineWidth=5;cx.beginPath();cx.moveTo(0,0);cx.quadraticCurveTo(Math.sin(ph)*6,-h*.5,Math.sin(ph)*10,-h*.62);cx.stroke();
 cx.fillStyle=c2;for(let k=0;k<5;k++){const a=-1.2+k*.6+Math.sin(ph+k)*.12;cx.save();cx.translate(Math.sin(ph)*10,-h*.62);cx.rotate(a);cx.beginPath();cx.ellipse(0,-h*.22,6,h*.24,0,0,6.283);cx.fill();cx.restore();}cx.restore();}
function seaFan(x,base){cx.save();cx.translate(x,base);cx.strokeStyle='#2c2f2a';cx.lineWidth=3;const br=(len,a,d)=>{if(d>4)return;cx.save();cx.rotate(a);cx.beginPath();cx.moveTo(0,0);cx.lineTo(0,-len);cx.stroke();cx.translate(0,-len);br(len*.72,-.45,d+1);br(len*.72,.4,d+1);cx.restore();};br(40,0,0);cx.restore();}
function coral(x,base){cx.save();cx.translate(x,base);cx.fillStyle='#e6b36a';const blob=(bx,by,r)=>{cx.beginPath();cx.arc(bx,by,r,0,6.283);cx.fill();};for(let i=0;i<9;i++)blob(-40+i*10,-6-Math.abs(4-i)*5,9);cx.fillStyle='#232528';cx.fillRect(-60,10,120,22);cx.fillStyle='#FFD23F';cx.font='500 14px '+FONT;cx.textAlign='center';cx.fillText(tr('보호생물','Protected'),0,26);cx.restore();}

function drawCreature(c,x,y,scale,dir,ph){const s=c.kind?c:c.s;const L=s.len*scale;cx.save();cx.translate(x,y);cx.scale(dir,1);
 if(s.kind==='fish'){const h=L*(s.tall?.6:s.hump?.48:.38);cx.fillStyle=s.c;cx.beginPath();cx.ellipse(0,0,L/2,h/2,0,0,6.283);cx.fill();
  if(s.hump){cx.beginPath();cx.ellipse(L*.3,-h*.32,L*.13,h*.22,0,0,6.283);cx.fill();}
  cx.beginPath();cx.moveTo(-L*.45,0);cx.lineTo(-L*.7,-h*.42+Math.sin(ph)*3);cx.lineTo(-L*.7,h*.42+Math.sin(ph)*3);cx.closePath();cx.fill();
  cx.fillStyle=s.c2;cx.beginPath();cx.ellipse(L*.02,h*.14,L*.36,h*.2,0,0,6.283);cx.fill();
  if(s.stripe){cx.fillStyle='rgba(60,90,140,.55)';cx.fillRect(-L*.35,-h*.08,L*.7,h*.12);}
  if(s.bands){cx.fillStyle=s.c2;for(let k=-2;k<=2;k++)cx.fillRect(k*L*.14-L*.03,-h*.45,L*.07,h*.9);}
  if(s.line){cx.fillStyle=s.c2;cx.fillRect(-L*.45,-h*.05,L*.85,h*.1);}
  if(s.spots){cx.fillStyle='rgba(255,255,255,.55)';for(let k=0;k<4;k++){cx.beginPath();cx.arc(-L*.2+k*L*.12,-h*.12,L*.03,0,6.283);cx.fill();}}
  cx.fillStyle='#fff';cx.beginPath();cx.arc(L*.33,-h*.08,Math.max(2,L*.05),0,6.283);cx.fill();cx.fillStyle='#232528';cx.beginPath();cx.arc(L*.34,-h*.08,Math.max(1.2,L*.025),0,6.283);cx.fill();}
 else if(s.kind==='shrimp'){cx.strokeStyle=s.c;cx.fillStyle=s.c;cx.lineWidth=Math.max(2,L*.05);for(let k=0;k<6;k++){cx.beginPath();cx.ellipse(-L*.3+k*L*.12,Math.sin(k*.6)*L*.04,L*.09,L*.12-k*L*.008,0,0,6.283);cx.fill();}
  cx.fillStyle=s.c2;for(let k=0;k<5;k++){cx.beginPath();cx.ellipse(-L*.28+k*L*.12,-L*.03,L*.05,L*.05,0,0,6.283);cx.fill();}
  cx.beginPath();cx.moveTo(L*.36,-L*.04);cx.quadraticCurveTo(L*.8,-L*.3+Math.sin(ph)*4,L*1.05,-L*.12);cx.moveTo(L*.36,0);cx.quadraticCurveTo(L*.8,-L*.12,L*1.0,L*.06+Math.sin(ph)*4);cx.stroke();
  if(s.spiny){cx.strokeStyle=s.c2;for(let k=0;k<5;k++){cx.beginPath();cx.moveTo(-L*.3+k*L*.12,-L*.1);cx.lineTo(-L*.32+k*L*.12,-L*.2);cx.stroke();}}
  cx.fillStyle='#232528';cx.beginPath();cx.arc(L*.34,-L*.08,Math.max(1.5,L*.03),0,6.283);cx.fill();}
 else if(s.kind==='shell'){cx.fillStyle=s.c;cx.beginPath();cx.ellipse(0,0,L*.5,L*.34,0,0,6.283);cx.fill();cx.strokeStyle=s.c2;cx.lineWidth=2;for(let k=1;k<4;k++){cx.beginPath();cx.ellipse(-L*.1,0,L*.12*k,L*.08*k,0,0,6.283);cx.stroke();}}
 else if(s.kind==='conch'){cx.fillStyle=s.c;cx.beginPath();cx.moveTo(-L*.5,L*.25);cx.lineTo(L*.4,L*.25);cx.lineTo(L*.1,-L*.45);cx.closePath();cx.fill();cx.fillStyle=s.c2;for(let k=0;k<4;k++)cx.fillRect(-L*.3+k*L*.18,L*.02-k*L*.1,L*.12,L*.06);}
 else if(s.kind==='mussel'){cx.fillStyle=s.c;cx.beginPath();cx.ellipse(0,0,L*.5,L*.22,-.3,0,6.283);cx.fill();cx.strokeStyle=s.c2;cx.lineWidth=2;cx.beginPath();cx.moveTo(-L*.45,L*.1);cx.lineTo(L*.45,-L*.1);cx.stroke();}
 else if(s.kind==='weed'){cx.strokeStyle=s.c;cx.lineWidth=Math.max(2,L*.06);cx.beginPath();cx.moveTo(0,L*.45);cx.lineTo(0,-L*.05);cx.stroke();cx.fillStyle=s.c2;for(let k=0;k<4;k++){cx.save();cx.translate(0,-L*.05);cx.rotate(-1+k*.66+Math.sin(ph+k)*.1);cx.beginPath();cx.ellipse(0,-L*.2,L*.06,L*.22,0,0,6.283);cx.fill();cx.restore();}}
 cx.restore();}

function drawWorld(){
 cx.save();cx.translate(0,-camY);
 for(const c of crit){if(c.y<camY-60||c.y>camY+H+60)continue;if(c===bite?.c&&st==='fight')continue;drawCreature(c,c.x,c.y+Math.sin(c.ph)*3,1,c.dir,c.ph);}
 const bx=W*BOAT_X;cx.fillStyle='#e9e2cf';cx.beginPath();cx.moveTo(bx-46,-6);cx.lineTo(bx+46,-6);cx.lineTo(bx+32,12);cx.lineTo(bx-32,12);cx.closePath();cx.fill();
 cx.fillStyle='#232528';cx.fillRect(bx-10,-34,6,28);cx.fillStyle='#B6D80C';cx.beginPath();cx.moveTo(bx-4,-34);cx.lineTo(bx+20,-28);cx.lineTo(bx-4,-22);cx.fill();
 cx.strokeStyle='rgba(255,255,255,.9)';cx.lineWidth=1.5;cx.beginPath();cx.moveTo(bx+40,-20);cx.lineTo(bx+40,hookY);cx.stroke();
 cx.strokeStyle='#e8e8e8';cx.lineWidth=3;cx.beginPath();cx.arc(bx+40,hookY+6,6,0,Math.PI);cx.stroke();
 if(st==='bite'||st==='fight'){const c=bite.c;drawCreature(c,bx+40,hookY+20,1,c.dir,t*8);}
 if(st==='bite'){cx.fillStyle='#FFD23F';cx.font='700 34px '+FONT;cx.textAlign='center';cx.fillText('!',bx+40,hookY-14+Math.sin(t*20)*3);}
 for(const p of splash){cx.fillStyle='rgba(255,255,255,'+p.a+')';cx.beginPath();cx.arc(p.x,p.y,p.r,0,6.283);cx.fill();}
 for(const b of bubbles){cx.strokeStyle='rgba(255,255,255,'+b.a+')';cx.lineWidth=1.5;cx.beginPath();cx.arc(b.x,b.y,b.r,0,6.283);cx.stroke();}
 cx.strokeStyle='rgba(255,255,255,.7)';cx.lineWidth=2;cx.beginPath();for(let x=0;x<=W;x+=20)cx.lineTo(x,Math.sin(x*.03+t*2)*2);cx.stroke();
 cx.restore();
 if(combo>1){cx.fillStyle='rgba(35,37,40,.8)';cx.fillRect(12,12,170,40);cx.fillStyle='#B6D80C';cx.font='700 22px '+FONT;cx.textAlign='left';cx.fillText(combo+' COMBO  x'+mult(combo).toFixed(1),22,40);}
 if(isGolden(golden,timeLeft)){cx.fillStyle='rgba(255,210,63,.92)';cx.fillRect(W-252,12,240,40);cx.fillStyle='#232528';cx.font='500 16px '+FONT;cx.textAlign='center';cx.fillText(tr('황금 시간 · 점수 2배 '+Math.ceil(timeLeft-golden.to)+'초','Golden time · 2x points '+Math.ceil(timeLeft-golden.to)+'s'),W-132,38);}
 if(st==='fight')drawFight();
 if(flash){cx.font='500 16px '+FONT;const w=Math.min(W-40,Math.max(520,cx.measureText(flash.text).width+32));cx.fillStyle='rgba(35,37,40,.82)';cx.fillRect((W-w)/2,18,w,44);cx.fillStyle='#fff';cx.textAlign='center';cx.fillText(flash.text,W/2,46,W-56);}
}
function drawFight(){const f=fight,bw=W-80,bx=40,by=H-86;cx.fillStyle='rgba(35,37,40,.9)';cx.fillRect(bx-12,by-34,bw+24,112);
 cx.fillStyle='#fff';cx.font='500 15px '+FONT;cx.textAlign='left';cx.fillText(nm(bite.c.s)+tr(' · 초록 칸을 맞추면 줄이 감겨요',' · Keep the green bar on it to reel in'),bx,by-12,bw-170);
 cx.textAlign='right';cx.fillStyle='#B6D80C';cx.fillText(tr('수면까지 '+Math.max(0,Math.round(mOf(hookY)))+'m',Math.max(0,Math.round(mOf(hookY)))+'m to surface'),bx+bw,by-12);
 cx.fillStyle='#383C41';cx.fillRect(bx,by,bw,22);cx.fillStyle=f.on?'rgba(182,216,12,.95)':'rgba(182,216,12,.55)';cx.fillRect(bx+f.zone*bw,by,f.zw*bw,22);
 cx.fillStyle='#FFD23F';cx.beginPath();cx.arc(bx+f.fish*bw,by+11,9,0,6.283);cx.fill();
 cx.textAlign='left';cx.fillStyle='#A7ABB0';cx.font='500 14px '+FONT;cx.fillText(tr('줄 버팀','Line'),bx,by+46);
 cx.fillStyle='#383C41';cx.fillRect(bx+60,by+36,bw-60,10);cx.fillStyle=f.ten<.3?'#FF5A4E':'#FFD23F';cx.fillRect(bx+60,by+36,(bw-60)*Math.max(0,f.ten),10);}

// ── 진행 ──
function el(tag,cls,text){const e=doc.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function setInfo(){const m=mOf(hookY),z=zoneAt(m),box=$('info');box.replaceChildren();if(!z){box.append(el('b','',tr('지금 위치: 배 위','Now: on the boat')),el('span','f-note',st==='idle'?tr('처음에는 얕은 바다(0~10m)만 열려 있습니다. 생물을 모으면 대황 숲, 가지초, 독도새우 바다(150~300m)가 차례로 열립니다.','At first only the shallow sea (0~10m) is open. Collect creatures to open the kelp forest, Gajicho reef and the Dokdo shrimp sea (150~300m) in turn.'):tr('내리기를 눌러 줄을 내려 보세요.','Press Drop to let your line down.')));return;}
 const near=SP.filter(s=>{const zz=ZONES.find(q=>q.id===s.zone);return zz&&zz===z;}).map(nm);box.append(el('b','',tr('지금 위치: ','Now: ')+zn(z)+' ('+zr(z)+')'),el('span','f-note',near.length?tr('이곳에 사는 생물: ','Living here: ')+near.join(', '):tr('이 수심은 화면에서 줄여 그렸습니다. 더 내려가 보세요.','This depth is drawn compressed on screen. Keep going down.')));}
function hud(){$('h-score').textContent=score;const s=Math.max(0,Math.ceil(timeLeft));$('h-time').textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0');$('h-depth').textContent=Math.round(mOf(hookY))+'m';const got=SP.filter(s=>dex[s.id]).length;$('h-dex').textContent=got+'/'+SP.length;}
function say(text,sec=2.2){flash={text,until:t+sec};}
function start(){actx();score=0;timeLeft=180;hookY=0;camY=-SKY;caughtRun=[];combo=0;bestCombo=0;runCount={};limitWarned=false;const g0=40+Math.random()*100;golden={from:g0+20,to:g0,announced:false};st='play';spawn();$('start').hidden=true;$('end').hidden=true;$('b-main').disabled=false;$('b-up').disabled=false;mainLabel();setInfo();hud();track('fish_start',{});}
function mainLabel(){const b=$('b-main');b.querySelector('span').textContent=st==='fight'?tr('감기','Reel'):st==='bite'?tr('챔질!','Strike!'):tr('내리기','Drop');b.querySelector('small').textContent=st==='fight'?tr('눌렀다 떼며 초록 칸을 맞춰요','Press and release to keep the green bar on it'):st==='bite'?tr('지금 누르면 걸려요','Press now to hook it'):tr('누르는 동안 줄이 내려가요','Hold to let the line down');
 const u=$('b-up');u.querySelector('span').textContent=tr('올리기','Raise');u.querySelector('small').textContent=tr('누르는 동안 줄을 감아요','Hold to wind the line up');}
function step(dt){t+=dt;if(flash&&t>flash.until)flash=null;
 for(const c of crit){if(c.s.spd){c.x+=c.dir*c.s.spd*40*dt;if(c.x<-80){c.x=W+60;}if(c.x>W+80){c.x=-60;}}c.ph+=dt*(c.s.spd?6:1.5);if(c.cool>0)c.cool-=dt;}
 for(const b of bubbles){b.y-=30*dt;b.a-=dt*.5;}bubbles=bubbles.filter(b=>b.a>0);
 if(st==='play'||st==='bite'||st==='fight'){timeLeft-=dt;if(timeLeft<=0){end();return;}}
 if(golden&&!golden.announced&&timeLeft<=golden.from){golden.announced=true;say(tr('황금 시간! 20초 동안 점수 2배','Golden time! Double points for 20 seconds'),2.5);[784,988,1175].forEach((f,i)=>tone(f,f,.18,.14,'triangle',i*.08));}
 if(st==='play'){const sp=380,lim=yOf(maxDepth());if(holdMain){hookY=Math.min(lim,hookY+sp*dt*(hookY>yOf(40)?3.5:1));if(hookY>=lim-1&&maxDepth()<300&&!limitWarned){limitWarned=true;const nn=nextNeed();say(tr('낚싯줄이 여기까지예요. '+(nn?nn.need+'을 모으면 다음 바다('+nn.zone.name+')가 열려요':''),'Your line ends here.'+(nn?' Collect '+nn.need+' to open the next sea ('+nn.zone.en+').':'')),3);sfx.no();}}if(hookY<lim-30)limitWarned=false;if(holdUp)hookY=Math.max(0,hookY-sp*1.6*dt);
  if((holdMain||holdUp)&&Math.random()<.2)bubbles.push({x:W*BOAT_X+40+Math.random()*10-5,y:hookY,r:2+Math.random()*3,a:.8});
  // 보호생물
  const coralY=yOf(PROTECT.depth);if(Math.abs(hookY-coralY)<18&&!step.warned){step.warned=true;say(tr('유착나무돌산호는 해양보호생물이에요. 건드리지 않고 지나가요.','This coral (유착나무돌산호) is a protected marine species. Pass by without touching it.'));sfx.no();if(badge('coral'))renderProg();}
  if(Math.abs(hookY-coralY)>40)step.warned=false;
  // 입질
  if(!holdMain&&!holdUp&&hookY>8){const hx=W*BOAT_X+40;for(const c of crit){if(c.cool>0)continue;const dx=Math.abs(c.x-hx),dy=Math.abs(c.y-hookY);const reach=c.s.spd?40:56;if(dy<reach&&dx<reach+c.s.len*.5){if(Math.random()<dt*(c.s.spd?2.2:1.4)){bite={c,until:t+(c.s.spd?1.1:1.6)};st='bite';sfx.bite();mainLabel();break;}}}}
 }else if(st==='bite'){if(t>bite.until){say(tr(ig(bite.c.s.name)+' 미끼만 물고 달아났어요.',nm(bite.c.s)+' stole the bait and got away.'));bite.c.cool=4;bite=null;st='play';sfx.miss();combo=0;mainLabel();}}
 else if(st==='fight'){const s=bite.c.s,r=fightStep(fight,s,hookY,holdMain,dt);hookY=r.hookY;if(r.reel)sfx.reel();
  if(r.outcome==='landed'){for(let k=0;k<18;k++)splash.push({x:W*BOAT_X+40,y:0,vx:(Math.random()-.5)*220,vy:-120-Math.random()*200,r:2+Math.random()*4,a:1});sfx.splash();landed();}
  else if(r.outcome==='snapped'){say(tr(ig(s.name)+' 줄을 끊고 달아났어요.',nm(s)+' broke the line and got away.'));sfx.miss();combo=0;bite.c.cool=5;bite=null;fight=null;st='play';mainLabel();}}
 for(const p of splash){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=500*dt;p.a-=dt*1.2;}splash=splash.filter(p=>p.a>0);
 const target=Math.max(-SKY,Math.min(WORLD_BOTTOM-H,hookY-H*.45));camY+=(target-camY)*Math.min(1,dt*4);
}
function hook(){if(st==='bite'){fight=startFight(bite.c.s,hookY);st='fight';sfx.splash();mainLabel();}}
function lineText(l){if(l.id==='base'){const size={big:tr('큰 녀석!','Big one!'),small:tr('작은 녀석','Little one'),normal:tr('보통 크기','Regular size')}[l.size];return tr('기본 '+l.pts+'점 · ','Base '+l.pts+' pts · ')+size;}if(l.id==='first')return tr('처음 발견 보너스','First-find bonus');if(l.id==='perfect')return tr('완벽한 손맛','Perfect touch');if(l.id==='combo')return tr(l.combo+'연속 x'+l.m.toFixed(1),l.combo+' in a row x'+l.m.toFixed(1));if(l.id==='gold')return tr('황금 시간 x2','Golden time x2');return l.text||'';}
function landed(){const c=bite.c,s=c.s,f=fight;st='catch';const first=!dex[s.id];dex[s.id]=(dex[s.id]||0)+1;store.set(KEYS.dex,dex);
 combo++;bestCombo=Math.max(bestCombo,combo);runCount[s.id]=(runCount[s.id]||0)+1;
 const size=sizeFor(Math.random());const perfect=isPerfect(f);const gold=isGolden(golden,timeLeft);
 const sc=scoreCatch({pts:s.pts,size,first,perfect,combo,gold});const lines=sc.lines.map(l=>[lineText(l),l.v]);
 const pts=sc.total;score+=pts;prog.xp+=pts;caughtRun.push(s.id);
 const got=[];const give=id=>{if(badge(id))got.push(badgeName(id));};
 give('first');if(s.id==='daehwang')give('daehwang');if(s.id==='hokdom')give('hokdom');if(s.kind==='shrimp')give('shrimp1');
 if(SP.filter(q=>q.kind==='shrimp').every(q=>dex[q.id]))give('shrimp3');if(combo>=5)give('combo5');if(perfect)give('perfect');if(score>=1000)give('score1000');
 for(const z of ZONES){if(SP.filter(q=>q.zone===z.id).every(q=>dex[q.id])&&badge('zone'+z.id)){got.push(badgeName('zone'+z.id));score+=200;prog.xp+=200;lines.push([tr(z.name+' 도감 완성',z.en+' guide complete'),200]);}}
 if(SP.every(q=>dex[q.id]))give('dexAll');
 const m=todayMission();if(!prog.mission[today()]&&missionDone(m,run())){prog.mission[today()]=true;prog.xp+=300;give('mission');lines.push([tr('오늘의 임무 완수',"Today's mission complete"),'+300 XP']);}
 const opened=[];for(const z of newlyUnlocked(prog.unlocked,dex)){prog.unlocked.push(z);opened.push(zn(ZONES.find(q=>q.id===z)));}
 saveProg();
 track('fish_catch',{species:s.id,zone:s.zone});
 c.x=c.s.spd?(Math.random()<.5?-60:W+60):W*BOAT_X+40+(Math.random()-.5)*180;c.cool=c.s.spd?3:6;bite=null;fight=null;holdMain=false;sfx.fanfare(s.pts>=100||first);hud();renderDex(s.id);renderProg();mainLabel();
 const card=$('catch-card');card.replaceChildren();const eb=el('span','f-eyebrow',first?tr('NEW · 새로 발견!','NEW · First find!'):'CATCH');
 const h=el('h2','',tr('빠밤! ','Ta-da! ')+nm(s));const pc=doc.createElement('canvas');pc.width=360;pc.height=170;pc.style.maxWidth='240px';pc.style.margin='0 auto';pc.style.width='100%';pc.setAttribute('aria-hidden','true');
 const big=el('div','f-big','+'+pts);
 const bl=el('div','f-bonus');for(const [k,v] of lines){const d=el('span','',k+'  ');const b2=el('b','',typeof v==='number'?'+'+v:v);d.append(b2);bl.append(d);}
 const extra=[];for(const z of opened)extra.push(el('div','f-unlock',tr('새 바다가 열렸습니다 · ','New sea opened · ')+z));
 if(got.length)extra.push(el('p','f-note',tr('배지 획득: ','Badges earned: ')+got.join(', ')));
 const p=el('p','f-note',s.note+' ('+tr('사는 곳: ','Lives in: ')+s.where+')');if(en())p.lang='ko';
 const ok=el('button','primary',tr('계속 낚시하기','Keep fishing'));ok.type='button';ok.onclick=()=>{$('catch').hidden=true;st='play';mainLabel();last=root.performance.now();};
 card.append(eb,h,pc,big,bl,...extra,p,ok);$('catch').hidden=false;setTimeout(()=>ok.focus({preventScroll:true}),0);
 const pcx=pc.getContext('2d');let ft=0;const anim=()=>{if($('catch').hidden)return;ft+=.016;pcx.clearRect(0,0,360,170);pcx.save();pcx.translate(180,85);for(let k=0;k<14;k++){pcx.rotate(Math.PI*2/14);pcx.fillStyle=k%2?'rgba(182,216,12,.22)':'rgba(255,210,63,.18)';pcx.beginPath();pcx.moveTo(0,0);pcx.lineTo(-16,-180);pcx.lineTo(16,-180);pcx.fill();}pcx.restore();
  pcx.save();pcx.translate(180,85+Math.sin(ft*4)*4);pcx.rotate(Math.sin(ft*3)*.08);cxSwap(pcx,()=>drawCreature(s,0,0,Math.min(2.6,180/s.len),1,ft*6));pcx.restore();
  for(let k=0;k<8;k++){const a=ft*2+k*.8,r=60+((ft*60+k*20)%70);pcx.fillStyle='#FFD23F';pcx.beginPath();pcx.arc(180+Math.cos(a)*r,85+Math.sin(a)*r*.6,2.5,0,6.283);pcx.fill();}
  if(!calm)root.requestAnimationFrame(anim);};anim();}
function endDetail(){const kinds=new Set(caughtRun).size;return tr('잡은 생물 '+caughtRun.length+'마리 · '+kinds+'종 · 최고 '+bestCombo+'연속','Caught '+caughtRun.length+' · '+kinds+' species · Best combo '+bestCombo);}
function end(){st='over';timeLeft=0;hud();$('b-main').disabled=true;$('b-up').disabled=true;holdMain=holdUp=false;$('catch').hidden=true;
 $('e-score').textContent=score;$('e-detail').textContent=endDetail();if(score>=1000&&badge('score1000'))renderProg();const m=todayMission();if(!prog.mission[today()]&&missionDone(m,run())){prog.mission[today()]=true;prog.xp+=300;badge('mission');saveProg();}renderProg();$('save-msg').textContent='';
 const can=score>0;$('save-btn').disabled=!can;$('nick').disabled=!can;$('nick').value=store.get(KEYS.nick,'');if(!can)$('save-msg').textContent=tr('점수가 있어야 명예의 전당에 오릅니다.','You need a score to enter the hall of fame.');$('end').hidden=false;track('fish_complete',{score});}

// ── 도감·순위 ──
function renderDex(newId){const box=$('dex');box.replaceChildren();for(const s of SP){const b=doc.createElement('button');b.type='button';const got=dex[s.id];b.className=got?(s.id===newId?'got new':'got'):'';
 const pc=doc.createElement('canvas');pc.width=120;pc.height=70;pc.setAttribute('aria-hidden','true');const pcx=pc.getContext('2d');if(got){cxSwap(pcx,()=>drawCreature(s,60,36,Math.min(1.3,90/s.len),1,1));}else{pcx.globalAlpha=.25;cxSwap(pcx,()=>drawCreature(Object.assign({},s,{c:'#7d8a80',c2:'#7d8a80'}),60,36,Math.min(1.3,90/s.len),1,1));}
 const nmEl=el('span','',got?nm(s):'?');const sm=el('small','',got?tr(s.pts+'점 · '+got+'마리',s.pts+' pts · '+got+' caught'):ZONES.find(z=>z.id===s.zone).range);
 b.append(pc,nmEl,sm);b.onclick=()=>showDex(s);box.append(b);}}
let shownDex=null;
function showDex(s){shownDex=s;const box=$('dex-info');box.replaceChildren();if(!s){box.append(el('span','f-note',tr('도감 칸을 누르면 사는 곳과 자료 출처가 보입니다.','Tap a guide entry to see where it lives and its sources.')));if(en())box.append(el('span','f-note','Species notes and habitats are shown in Korean, as written in the sources.'));return;}
 const b=el('b','',dex[s.id]?nm(s)+(en()&&s.en?' ('+s.name+')':''):tr('아직 못 잡은 생물','Not caught yet'));const z=ZONES.find(q=>q.id===s.zone);
 const p=el('span','',(dex[s.id]?s.note+' ':'')+tr('사는 곳: ','Lives in: ')+s.where+tr(' · 게임 속 바다: ',' · Game sea: ')+zn(z)+' · '+s.pts+tr('점',' pts'));
 const r=el('span','f-note',tr('자료: ','Sources: ')+s.src.map(i=>SRC[i-1][0].split('(')[0].trim()).join(', '));box.append(b,p,r);}
function renderProg(){const i=levelOf(prog.xp),cur=LEVELS[i],nx=LEVELS[i+1],L=en()?2:1;$('lv-name').textContent=cur[L];$('lv-xp').textContent=prog.xp.toLocaleString('en-US')+' XP'+(nx?tr(' · 다음 '+nx[1]+' '+nx[0].toLocaleString('en-US'),' · Next: '+nx[2]+' at '+nx[0].toLocaleString('en-US')):'');$('lv-bar').style.width=(nx?100*(prog.xp-cur[0])/(nx[0]-cur[0]):100)+'%';
 const zb=$('zones');zb.replaceChildren();for(const z of ZONES){const d=el('div');const open=isOpen(z.id);d.className=open?'open':'';const b=el('span','',(open?tr('열림 · ','Open · '):tr('잠김 · ','Locked · '))+zn(z));const sm=el('small','',open?z.range:(UNLOCK_NEED[z.id]?tr(need(z.id)+' 모으면','Collect '+need(z.id)):''));d.append(b,sm);zb.append(d);}
 const m=todayMission(),done=!!prog.mission[today()],mb=$('mission');mb.className='f-mission'+(done?' done':'');mb.replaceChildren();const mt=el('b','',tr('오늘의 임무 · ',"Today's mission · ")+missionText(m));const mp=el('span','f-note',done?tr('완수했습니다. +300 XP를 받았어요.','Complete! You earned +300 XP.'):missionLine(m));mb.append(mt,mp);
 const bb=$('badges');bb.replaceChildren();for(const b of BADGES){const sp=el('span',prog.badges[b[0]]?'on':'',en()?b[2]:b[1]);bb.append(sp);}
 testLabel();}
function missionLine(m){return tr('이번 판 '+missionProgress(m,run())+' / '+m.n+' · 완수하면 +300 XP','This round '+missionProgress(m,run())+' / '+m.n+' · +300 XP when complete');}
function testLabel(){$('test').textContent=testMode?tr('시험 모드 켜짐: 모든 바다 열림 (저장된 진행은 그대로)','Test mode on: all seas open (saved progress unchanged)'):tr('시험 모드: 모든 바다 열기 (운영자 확인용)','Test mode: open all seas (for operator checks)');}
$('test').onclick=()=>{testMode=!testMode;$('test').setAttribute('aria-pressed',String(testMode));renderProg();};
function renderHall(){const ol=$('hall');ol.replaceChildren();if(!hall.length){const e=el('li','f-empty',tr('아직 기록이 없습니다. 첫 번째 이름을 남겨 보세요.','No records yet. Be the first to leave your name.'));e.style.display='block';ol.append(e);return;}
 hall.slice(0,10).forEach((r,i)=>{const li=doc.createElement('li');li.innerHTML='<span class="rk"></span><span class="nm"><span></span><small></small></span><span class="sc"></span>';li.querySelector('.rk').textContent=i+1;li.querySelector('.nm span').textContent=r.name;li.querySelector('.nm small').textContent=tr(r.kinds+'종 · ',r.kinds+' species · ')+r.date;li.querySelector('.sc').textContent=r.score;ol.append(li);});}
$('save-form').addEventListener('submit',e=>{e.preventDefault();if(score<=0)return;const name=$('nick').value.trim().slice(0,12)||tr('익명','Anonymous');store.set(KEYS.nick,name);const d=new Date();
 hall.push({name,score,kinds:new Set(caughtRun).size,date:(d.getMonth()+1)+'/'+d.getDate()});hall.sort((a,b)=>b.score-a.score);hall=hall.slice(0,10);const ok=store.set(KEYS.hall,hall);renderHall();$('save-btn').disabled=true;$('save-msg').textContent=ok?tr('명예의 전당에 올렸습니다.','Added to the hall of fame.'):tr('이 브라우저는 저장을 막고 있어 순위를 남기지 못했습니다.','This browser is blocking storage, so your score could not be saved.');});
$('again').onclick=start;$('go').onclick=start;

// ── 입력 ──
const press=(v)=>{if(st==='bite'&&v){hook();return;}holdMain=v;};
const bm=$('b-main'),bu=$('b-up');
bm.addEventListener('pointerdown',e=>{e.preventDefault();actx();press(true);});['pointerup','pointercancel','pointerleave'].forEach(n=>bm.addEventListener(n,()=>press(false)));
bu.addEventListener('pointerdown',e=>{e.preventDefault();holdUp=true;});['pointerup','pointercancel','pointerleave'].forEach(n=>bu.addEventListener(n,()=>{holdUp=false;}));
doc.addEventListener('keydown',e=>{const k=keyAction(st,e.key,e.repeat,!!e.target.closest?.('input,textarea'));if(k.prevent)e.preventDefault();
 if(k.act==='close'){$('catch').hidden=true;st='play';mainLabel();}else if(k.act==='press')press(true);else if(k.act==='up')holdUp=true;});
doc.addEventListener('keyup',e=>{if(e.key===' '||e.key==='ArrowDown'){e.preventDefault();press(false);}if(e.key==='ArrowUp')holdUp=false;});

// ── 고정 문구 (한국어/영어) ──
function applyStatic(){const E=en();for(const n of doc.querySelectorAll('[data-en]')){if(!n.dataset.ko)n.dataset.ko=n.textContent;n.textContent=E?n.dataset.en:n.dataset.ko;}
 for(const n of doc.querySelectorAll('[data-en-label]')){if(!n.dataset.koLabel)n.dataset.koLabel=n.getAttribute('aria-label');n.setAttribute('aria-label',E?n.dataset.enLabel:n.dataset.koLabel);}
 for(const n of doc.querySelectorAll('[data-en-ph]')){if(!n.dataset.koPh)n.dataset.koPh=n.getAttribute('placeholder');n.setAttribute('placeholder',E?n.dataset.enPh:n.dataset.koPh);}
 for(const b of doc.querySelectorAll('[data-language-toggle]')){b.textContent=E?'한국어':'English';b.setAttribute('aria-label',E?'한국어로 바꾸기':'Switch to English');}
 doc.title=E?'Dokdo Sea Fishing · Dokdo Korea School V3':'독도 바다 낚시 · 독도 코리아 스쿨 V3';
 if(st==='over')$('e-detail').textContent=endDetail();}
function relabel(){applyStatic();mainLabel();renderDex();renderHall();renderProg();showDex(shownDex);setInfo();}
for(const b of doc.querySelectorAll('[data-language-toggle]')){if(!root.DokdoLanguage){b.hidden=true;continue;}b.addEventListener('click',()=>root.DokdoLanguage.set(en()?'ko':'en'));}
doc.addEventListener('dokdo:language',relabel);

// ── 그리기 고리 ──
const realCx=cx;
function loop(now){const dt=Math.min(.05,(now-(last||now))/1000);last=now;fit();if(st!=='catch'&&st!=='over')step(dt);else t+=dt;
 cx=realCx;cx.clearRect(0,0,W,H);drawBackground();drawWorld();setInfoThrottle();hud();root.requestAnimationFrame(loop);}
let infoT=0;function setInfoThrottle(){if(t-infoT>.4){infoT=t;setInfo();if(st==='play')renderMissionLine();}}
function renderMissionLine(){const m=todayMission();if(prog.mission[today()])return;const sp=$('mission').querySelector('.f-note');if(sp)sp.textContent=missionLine(m);}
SRC.forEach(([text,u])=>{const li=doc.createElement('li');const a=doc.createElement('a');a.href=u;a.target='_blank';a.rel='noopener';a.textContent=text;li.append(a);$('src-list').append(li);});
relabel();hud();fit();camY=-SKY;root.requestAnimationFrame(loop);
}

return{SRC,ZONES,SP,PROTECT,KEYS,LEVELS,BADGES,MISSIONS,UNLOCK_NEED,createStore,loadSaved,unlockReady,newlyUnlocked,maxDepthFor,dayKey,todayMission,levelOf,yOf,mOf,mult,sizeFor,isGolden,isPerfect,scoreCatch,startFight,fightStep,keyAction,missionDone,missionProgress,boot};
});
