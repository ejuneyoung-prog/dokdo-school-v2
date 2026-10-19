/* Original browser-local game logic. No school scores, ranks or server writes. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DokdoGames=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const KEY='dokdo-island-play-v1',SIZE=8;
const SHAPES=[[[0,0]],[[0,0],[1,0]],[[0,0],[0,1]],[[0,0],[1,0],[2,0]],[[0,0],[0,1],[0,2]],[[0,0],[1,0],[0,1],[1,1]],[[0,0],[0,1],[1,1]],[[0,0],[1,0],[1,1]],[[0,0],[1,0],[2,0],[1,1]],[[0,0],[1,0],[2,0],[3,0]],[[0,0],[0,1],[0,2],[1,2]],[[0,0],[1,0],[1,1],[2,1]]];
const GIFTS=[{id:'flag',level:1,name:'첫 깃발'},{id:'flower',level:2,name:'해국 꽃밭'},{id:'gull',level:3,name:'괭이갈매기'},{id:'shrimp',level:4,name:'도화새우 캐릭터'},{id:'tree',level:8,name:'사철나무'},{id:'seal',level:10,name:'강치 캐릭터'},{id:'dog',level:6,name:'삽살개 캐릭터'},{id:'guard',level:7,name:'경비대 캐릭터'},{id:'lights',level:8,name:'섬의 작은 불빛'},{id:'star',level:20,name:'완성의 별'}];
const THRESHOLDS=[0,30,80,160,270,420,620,880];
const TRASH=['생수병','비닐봉지','빨대','찌그러진 커피컵','폐타이어','버려진 그물'];
const clone=x=>JSON.parse(JSON.stringify(x));
const day=(now=Date.now())=>new Date(now+9*3600000).toISOString().slice(0,10);
const level=xp=>{let n=1;while(n<THRESHOLDS.length&&xp>=THRESHOLDS[n])n++;return n;};
function fresh(now=Date.now()){return{version:1,day:day(now),used:0,bonus:0,answered:[],credited:[],xp:0,best:{blocks:0,runner:0,rounds:0},equipped:['flag'],growth:{cleared:0,cleanup:0,seals:0,legacy:[],quizFlowers:0,runnerScore:0,gardenVersion:2,gardenLegacy:[]},active:null,sequence:0};}
// XP remains intact. Stages 9–20 require cleared missions or completed runner rounds.
const islandLevel=s=>Math.min(20,Math.max(level(s.xp),s.growth?.cleared||0));
const LEGACY_LEVELS={flag:1,flower:2,gull:3,shrimp:4,seal:5,dog:6,guard:7,lights:8};
// Keep the pre-garden entitlement rule only for migrating already earned gifts.
function oldGiftOpen(s,g){return (s.growth?.legacy||[]).includes(g.id)||(g.id==='seal'?(s.growth?.seals||0)>0:g.id==='star'?(s.growth?.cleared||0)>=20&&(s.growth?.seals||0)>=10:g.level<=islandLevel(s));}
function preservedGift(s,id){return(s.growth?.gardenLegacy||[]).includes(id)||(s.growth?.legacy||[]).includes(id);}
function gardenPlan(s,learned=0){
 const bounded=(n,max)=>Number.isSafeInteger(n)&&n>0?Math.min(max,n):0;
 const growth=s.growth||{},legacyFlowers=preservedGift(s,'flower')?Math.min(10,1+Math.floor(Math.max(0,islandLevel(s)-2)*9/18)):0,flowers=Math.max(legacyFlowers,bounded(learned,100),bounded(growth.quizFlowers,100));
 const grass=Math.min(100,Math.floor(bounded(growth.runnerScore??s.best?.runner,1e9)/20));
 const full=flowers===100&&grass===100,xp=bounded(s.xp,1e9);
 const trees=full?Math.min(10,Math.floor(xp/100)):0;
 const shrimp=trees===10?Math.min(10,Math.floor(Math.max(0,xp-1000)/100)):0;
 const gulls=shrimp===10?Math.min(10,Math.floor(Math.max(0,xp-2000)/100)):0;
 const seals=gulls===10&&bounded(growth.cleared,20)>=10?bounded(growth.seals,10):0;
 const complete=seals===10&&bounded(growth.cleared,20)>=20;
 const next=flowers<100||grass<100?'meadow':trees<10?'tree':shrimp<10?'shrimp':gulls<10?'gull':seals<10?'seal':complete?'star':'challenge';
 return{flowers,grass,trees,shrimp,gulls,seals,complete,next};
}
function islandComplete(s,learned=0){return preservedGift(s,'star')||gardenPlan(s,learned).complete;}
function giftOpen(s,g,learned=0){
 if(preservedGift(s,g.id))return true;const p=gardenPlan(s,learned);
 if(g.id==='flower')return p.flowers>0;if(g.id==='tree')return p.trees>0;if(g.id==='shrimp')return p.shrimp>0;if(g.id==='gull')return p.gulls>0;if(g.id==='seal')return p.seals>0;if(g.id==='star')return p.complete;if(g.id==='lights')return false;return g.level<=islandLevel(s);
}
function population(s,id,learned=0){
 if(!s.equipped.includes(id))return 0;if(id==='seal')return Math.min(10,s.growth?.seals||1);if(['flag','guard','dog','lights','star'].includes(id))return 1;
 const gift=GIFTS.find(g=>g.id===id);if(!gift)return 0;
 const p=gardenPlan(s,learned),grown=({flower:p.flowers,tree:p.trees,shrimp:p.shrimp,gull:p.gulls})[id]||0;
 if(preservedGift(s,id))return Math.max(grown,Math.min(10,1+Math.floor(Math.max(0,islandLevel(s)-gift.level)*9/(20-gift.level))));
 return grown;
}
function validInt(n,max=1e9){return Number.isSafeInteger(n)&&n>=0&&n<=max;}
function validate(s){
 if(!s||s.version!==1||!/^\d{4}-\d{2}-\d{2}$/.test(s.day)||!validInt(s.used,10000)||!validInt(s.bonus,60)||!validInt(s.xp)||!validInt(s.sequence))throw Error('게임 기록을 읽을 수 없습니다. 원본 기록은 그대로 보관됩니다.');
 if(!Array.isArray(s.answered)||s.answered.length>60||new Set(s.answered).size!==s.answered.length||s.answered.some(x=>typeof x!=='string'||x.length>80))throw Error('도전권 기록을 확인해 주세요.');
 if(s.credited===undefined)s.credited=s.answered.slice();if(!Array.isArray(s.credited)||s.credited.length>60||new Set(s.credited).size!==s.credited.length||s.credited.some(x=>typeof x!=='string'||x.length>80))throw Error('Invalid game learning credits.');
 if(s.growth===undefined){s.growth={cleared:0,cleanup:0,seals:level(s.xp)>=5?1:0,legacy:Object.keys(LEGACY_LEVELS).filter(id=>LEGACY_LEVELS[id]<=level(s.xp))};}
 if(!s.growth||!validInt(s.growth.cleared,20)||!validInt(s.growth.cleanup,20)||!validInt(s.growth.seals,10)||!Array.isArray(s.growth.legacy)||new Set(s.growth.legacy).size!==s.growth.legacy.length||s.growth.legacy.some(id=>!LEGACY_LEVELS[id]||LEGACY_LEVELS[id]>level(s.xp)))throw Error('섬 성장 기록을 확인해 주세요.');
 if(s.growth.quizFlowers===undefined)s.growth.quizFlowers=0;if(s.growth.runnerScore===undefined)s.growth.runnerScore=s.best?.runner??0;if(!validInt(s.growth.quizFlowers,100)||!validInt(s.growth.runnerScore))throw Error('놀이별 성장 기록을 확인해 주세요.');
 const garden=s.growth;if(garden.gardenLegacy!==undefined&&(!Array.isArray(garden.gardenLegacy)||new Set(garden.gardenLegacy).size!==garden.gardenLegacy.length||garden.gardenLegacy.some(id=>!GIFTS.some(g=>g.id===id))))throw Error('기존 정원 선물 기록을 확인해 주세요.');
 if(garden.gardenVersion===undefined){garden.gardenLegacy=GIFTS.filter(g=>oldGiftOpen(s,g)).map(g=>g.id);garden.gardenVersion=2;}
 if(garden.gardenVersion!==2||!Array.isArray(garden.gardenLegacy))throw Error('정원 진행 기록을 확인해 주세요.');
 if(s.best&&s.best.rounds===undefined)s.best.rounds=0;if(s.best&&!validInt(s.best.rounds))throw Error('라운드 기록을 확인해 주세요.');
 if(!s.best||!validInt(s.best.blocks)||!validInt(s.best.runner)||!Array.isArray(s.equipped)||new Set(s.equipped).size!==s.equipped.length||s.equipped.some(id=>!GIFTS.some(g=>g.id===id&&giftOpen(s,g))))throw Error('꾸미기 기록을 확인해 주세요.');
 if(s.active){const a=s.active;if(!['blocks','runner'].includes(a.kind)||typeof a.id!=='string'||!validInt(a.awarded)||!a.game)throw Error('진행 중인 게임을 확인해 주세요.');if(a.revision===undefined)a.revision=0;if(!validInt(a.revision,Number.MAX_SAFE_INTEGER-1))throw Error('게임 저장 순서를 확인해 주세요.');if(a.creditedClears===undefined)a.creditedClears=0;if(!validInt(a.creditedClears,10000000))throw Error('완료 보상 기록을 확인해 주세요.');if(a.kind==='blocks')validateBlocks(a.game);else validateRunner(a.game);}
 return s;
}
function roll(s,now=Date.now()){validate(s);const d=day(now);if(d>s.day){s.day=d;s.used=0;s.bonus=0;s.answered=[];s.credited=[];}return s;}
const tickets=s=>Math.max(0,3+s.bonus-s.used);
function unlocked(s){return GIFTS.filter(g=>giftOpen(s,g));}
function award(s,n){const before=unlocked(s).map(g=>g.id);s.xp=Math.min(1e9,s.xp+Math.max(0,Math.floor(n)));return openGifts(s,before);}
function openGifts(s,before){const opened=unlocked(s).filter(g=>!before.includes(g.id));for(const g of opened)if(!s.equipped.includes(g.id))s.equipped.push(g.id);return opened;}
function creditClear(s,n){s.growth.cleared=Math.min(20,Math.max(s.growth.cleared,n));if(n>=10&&gardenPlan(s).gulls===10)s.growth.seals=Math.min(10,s.growth.seals+1);}
function equip(s,id){const g=unlocked(s).find(g=>g.id===id);if(!g)return false;const i=s.equipped.indexOf(id);if(i>=0)s.equipped.splice(i,1);else s.equipped.push(id);return true;}
function adoptLearning(s,n){if(!Number.isSafeInteger(n)||n<0)return[];const before=unlocked(s).map(g=>g.id);s.growth.quizFlowers=Math.max(s.growth.quizFlowers,Math.min(100,n));return openGifts(s,before);}
function rewardLearning(s,family,now=Date.now()){roll(s,now);if(typeof family!=='string'||!family||s.credited.includes(family)||s.credited.length>=60||(!s.answered.includes(family)&&s.answered.length>=60))return false;const before=unlocked(s).map(g=>g.id);s.credited.push(family);if(!s.answered.includes(family))s.answered.push(family);s.bonus++;s.growth.quizFlowers=Math.min(100,s.growth.quizFlowers+1);award(s,5);openGifts(s,before);return true;}
function earnTicket(s,family,correct,now=Date.now()){roll(s,now);if(typeof family!=='string'||!family||s.answered.includes(family)||s.answered.length>=60)return false;s.answered.push(family);return correct?rewardLearning(s,family,now):false;}
function choosePieces(rng=Math.random){return Array.from({length:3},()=>Math.min(SHAPES.length-1,Math.max(0,Math.floor(rng()*SHAPES.length))));}
const BLOCK_TIME=300000;
const LEGACY_MISSION_TARGETS=[8,16,24,32,40,48,56,64,80,120,128,136,144,152,160,176,192,208,224,240];
const MISSION_TARGETS=[16,24,32,40,48,56,64,72,80,120,128,136,144,152,160,176,192,208,224,240];
function missionPlan(n,version=2){const number=Math.min(20,Math.max(1,Math.floor(n)));return{number,target:(version===1?LEGACY_MISSION_TARGETS:MISSION_TARGETS)[number-1],combo:number===20?3:number>=10?2:1,rescue:number>=10?1:0,hard:number===10||number===20};}
function opening(g){return g.missionVersion===2&&g.mission<=2;}
function seedMission(g,n){
 g.mission=n;g.phase='playing';g.missionCleared=0;g.missionCombo=0;g.missionRescued=0;g.board=Array.from({length:SIZE},()=>Array(SIZE).fill(0));
 if(opening(g)){const rows=n+1,filled=n+1;for(let y=SIZE-rows;y<SIZE;y++)for(let x=0;x<filled;x++)g.board[y][x]=1+(x+y)%6;g.pieces=[5,1,2];}
 else{for(let x=0;x<6;x++)g.board[7][x]=1+x%3;g.pieces=[1,5,6];}
 g.pieceTrash=[1,2,4];g.net=n>=3?[4,7]:null;
}
function newBlocks(rng=Math.random,n=1){const g={score:0,lines:0,moves:0,combo:0,cleared:0,remainingMs:BLOCK_TIME,endReason:null,over:false,seeded:true,missionVersion:2,hammers:0,rescued:0,clears:[]};seedMission(g,missionPlan(n).number);return g;}
function validateBlocks(g){
 if(g&&g.pieceTrash===undefined)g.pieceTrash=[1,2,4];
 if(g&&g.missionVersion===undefined){g.missionVersion=1;g.mission=1;g.phase='playing';g.missionCleared=0;g.missionCombo=0;g.missionRescued=0;g.net=null;g.hammers=0;g.rescued=0;g.clears=[];g.remainingMs=BLOCK_TIME;}
 if(!g||![1,2].includes(g.missionVersion)||!Array.isArray(g.pieceTrash)||g.pieceTrash.length!==3||g.pieceTrash.some(x=>!Number.isInteger(x)||x<1||x>6)||!Number.isFinite(g.remainingMs)||g.remainingMs<0||g.remainingMs>BLOCK_TIME||!validInt(g.mission,20)||g.mission<1||!['playing','mission-clear'].includes(g.phase)||!['hammers','rescued','missionCleared','missionCombo','missionRescued'].every(k=>validInt(g[k]))||g.hammers>3||!Array.isArray(g.clears)||g.clears.length>128||g.clears.some(n=>!validInt(n,20)||n<1))throw Error('청소 미션 기록을 확인해 주세요.');
 if(!Array.isArray(g.board)||g.board.length!==8||g.board.some(r=>!Array.isArray(r)||r.length!==8||r.some(x=>!validInt(x,6)))||!Array.isArray(g.pieces)||g.pieces.length!==3||g.pieces.some(x=>x!==null&&(!validInt(x,SHAPES.length-1)))||!['score','lines','moves','combo','cleared'].every(k=>validInt(g[k]))||typeof g.over!=='boolean')throw Error('블록 게임 기록을 확인해 주세요.');
 if(g.net!==null&&(!Array.isArray(g.net)||g.net.length!==2||g.net.some(x=>!validInt(x,7))||!g.board[g.net[1]][g.net[0]]))throw Error('강치 구조 위치를 확인해 주세요.');return g;
}
function fits(g,index,x,y){const id=g.pieces[index];if(!Number.isInteger(x)||!Number.isInteger(y)||id==null||!SHAPES[id])return false;return SHAPES[id].every(([dx,dy])=>x+dx>=0&&y+dy>=0&&x+dx<SIZE&&y+dy<SIZE&&!g.board[y+dy][x+dx]);}
function hint(g,index=null){
 let best=null,value=-1;const row=g.board.map(r=>r.filter(Boolean).length),col=Array.from({length:SIZE},(_,x)=>g.board.filter(r=>r[x]).length);
 for(let i=0;i<3;i++){if(index!==null&&i!==index)continue;for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)if(fits(g,i,x,y)){
  if(!opening(g))return{i,x,y};
  // Show a useful continuation of the litter rows, rather than the first empty sea cell.
  const addRow=Array(SIZE).fill(0),addCol=Array(SIZE).fill(0);for(const[dx,dy]of SHAPES[g.pieces[i]]){addRow[y+dy]++;addCol[x+dx]++;}
  let score=0;for(let k=0;k<SIZE;k++){const r=row[k]+addRow[k],c=col[k]+addCol[k];score+=(r===SIZE?10000:0)+(c===SIZE?10000:0)+4*(r*r-row[k]*row[k])+c*c-col[k]*col[k];}
  if(score>value){best={i,x,y};value=score;}
 }}return best;
}
function openingTray(g){
 const pieces=g.mission===1?[0,1,0]:[5,1,0],trial={...g,board:g.board.map(r=>r.slice()),pieces:pieces.slice()};
 // Deal a complete playable tray. A badly crowded opening gets three singles, never a random dead draw.
 for(let i=0;i<3;i++){const h=hint(trial,i);if(!h)return[0,0,0];for(const[dx,dy]of SHAPES[pieces[i]])trial.board[h.y+dy][h.x+dx]=1;trial.pieces[i]=null;
  const rows=[],cols=[];for(let k=0;k<SIZE;k++){if(trial.board[k].every(Boolean))rows.push(k);if(trial.board.every(r=>r[k]))cols.push(k);}for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)if(rows.includes(y)||cols.includes(x))trial.board[y][x]=0;
 }return pieces;
}
function checkMission(g){const p=missionPlan(g.mission,g.missionVersion);if(g.missionCleared>=p.target&&g.missionCombo>=p.combo&&g.missionRescued>=p.rescue&&g.clears.length<128){g.phase='mission-clear';g.clears.push(g.mission);g.over=false;g.endReason=null;return true;}return false;}
function rescue(g,cells){if(g.net&&cells.some(([x,y])=>x===g.net[0]&&y===g.net[1])){g.net=null;g.rescued++;g.missionRescued++;g.hammers=Math.min(3,g.hammers+1);return true;}return false;}
function checkSpace(g){if(g.phase==='playing'&&!hint(g)&&!g.hammers){g.over=true;g.endReason='no-space';}}
function place(g,index,x,y,rng=Math.random){
 if(g.over||g.phase!=='playing'||!fits(g,index,x,y))return{ok:false,cells:[],lines:0,xp:0};
 for(const[dx,dy]of SHAPES[g.pieces[index]])g.board[y+dy][x+dx]=g.pieceTrash[index];g.pieces[index]=null;g.moves++;
 const rows=[],cols=[];for(let k=0;k<SIZE;k++){if(g.board[k].every(Boolean))rows.push(k);if(g.board.every(r=>r[k]))cols.push(k);}
 const cells=[];for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++)if(rows.includes(r)||cols.includes(c))cells.push([c,r]);
 const saved=rescue(g,cells);for(const[c,r]of cells)g.board[r][c]=0;
 const lines=rows.length+cols.length;g.lines+=lines;g.cleared+=cells.length;g.missionCleared+=cells.length;g.combo=lines?g.combo+1:0;g.missionCombo=Math.max(g.missionCombo,g.combo);g.score+=SHAPES.length+lines*80+(lines>1?(lines-1)*60:0)+(lines?g.combo*10:0);
 if(g.pieces.every(p=>p===null)){const pool=g.mission<=2?[0,1,2,3,4,5]:g.mission<=5?[0,1,2,3,4,5,6,7]:null;g.pieces=opening(g)?openingTray(g):pool?Array.from({length:3},()=>pool[Math.min(pool.length-1,Math.max(0,Math.floor(rng()*pool.length)))]):choosePieces(rng);g.pieceTrash=Array.from({length:3},()=>1+Math.min(5,Math.max(0,Math.floor(rng()*6))));}
 const completed=checkMission(g);if(!completed)checkSpace(g);return{ok:true,cells,lines,rescued:saved,completed,xp:Math.floor(g.score/10)};
}
function hammer(g,x,y){if(g.over||g.phase!=='playing'||!g.hammers||!validInt(x,7)||!validInt(y,7)||!g.board[y][x])return false;g.hammers--;rescue(g,[[x,y]]);g.board[y][x]=0;g.cleared++;g.missionCleared++;g.score+=10;checkMission(g);checkSpace(g);return true;}
function nextMission(g){if(g.over||g.phase!=='mission-clear'||g.remainingMs<=0)return false;seedMission(g,Math.min(20,g.mission+1));g.combo=0;return true;}
function blockTick(g,ms){if(g.over||g.phase!=='playing')return;checkSpace(g);if(g.over||!Number.isFinite(ms)||ms<=0)return;g.remainingMs=Math.max(0,g.remainingMs-ms);if(!g.remainingMs){g.over=true;g.endReason='time';}}
const RUN_WIDTH=900,RUN_HEIGHT=360,FLOOR=288,DOG_X=126;
const OBSTACLES=[{kind:'flower',w:34,h:34},{kind:'shrimp',w:44,h:30},{kind:'gull',w:42,h:44},{kind:'seal',w:54,h:43},{kind:'guard',w:34,h:70}];
const RUN_STAGES=[{name:'삼국사기 속 우산국 기록',theme:'chronicle'},{name:'안용복의 항해',theme:'voyage'},{name:'오늘의 독도',theme:'today'},{name:'노을빛 독도',theme:'sunset'},{name:'별빛 독도',theme:'night'}];
function runnerStage(score){const index=Math.floor(score/500),themeIndex=index<2?index:2+(index-2)%3;return{...RUN_STAGES[themeIndex],index,number:index+1,toward:score%500};}
function roundPlan(round){const n=Math.max(1,Math.floor(round)),i=n-1;return{number:n,theme:runnerStage(i*500).theme,name:runnerStage(i*500).name,speed:Math.min(600,245+i*17),duration:18+Math.min(8,Math.floor(i/3)),gap:Math.max(.85,1.7-i*.035),pairs:i>=3,high:i>=2};}
function newRunner(){return{round:1,roundElapsed:0,phase:'running',roundStartScore:0,roundStartStars:0,roundCleared:0,transition:null,bag:[],lastKind:null,hitKind:null,elapsed:0,distance:0,y:0,vy:0,speed:245,spawn:1.5,objects:[],stars:[],collected:0,passed:0,score:0,over:false,won:false,nextKind:0};}
function validateRunner(g){
 if(g&&g.round===undefined){g.round=1;g.roundElapsed=0;g.phase='running';g.roundStartScore=g.score;g.roundStartStars=g.collected;g.roundCleared=g.round-1;g.transition=null;g.bag=[];g.lastKind=null;}
 if(!g||!['elapsed','distance','y','vy','speed','spawn','collected','passed','score','nextKind','roundElapsed','roundStartScore','roundStartStars','roundCleared'].every(k=>Number.isFinite(g[k])&&Math.abs(g[k])<1e9)||!validInt(g.round,1e7)||g.round<1||!['running','round-clear'].includes(g.phase)||!Array.isArray(g.bag)||g.bag.length>5||g.bag.some(i=>!validInt(i,4))||!Array.isArray(g.objects)||g.objects.length>20||!Array.isArray(g.stars)||g.stars.length>30||typeof g.over!=='boolean'||typeof g.won!=='boolean')throw Error('달리기 기록을 확인해 주세요.');
 if(g.transition&&(!['chronicle','voyage','today','sunset','night'].includes(g.transition.from)||!Number.isFinite(g.transition.progress)||g.transition.progress<0||g.transition.progress>1))throw Error('배경 전환을 확인해 주세요.');
 for(const o of g.objects)if(!OBSTACLES.some(x=>x.kind===o.kind)||![o.x,o.w,o.h].every(Number.isFinite))throw Error('달리기 캐릭터 기록을 확인해 주세요.');for(const o of g.stars)if(![o.x,o.y].every(Number.isFinite))throw Error('달리기 별 기록을 확인해 주세요.');return g;
}
function jump(g){if(g.over||g.phase!=='running'||g.y>0.5)return false;g.vy=640;return true;}
function releaseJump(g){if(g.vy>300)g.vy=300;}
function nextRound(g){if(g.over||g.phase!=='round-clear')return false;const from=roundPlan(g.round).theme;g.round++;g.roundElapsed=0;g.roundStartScore=g.score;g.roundStartStars=g.collected;g.phase='running';g.speed=Math.min(620,Math.max(g.speed+8,roundPlan(g.round).speed));g.y=0;g.vy=0;g.spawn=1.5;g.objects=[];g.stars=[];g.bag=[];g.transition={from,progress:0};return true;}
function spawnRunner(g,rng){
 const plan=roundPlan(g.round),limit=plan.high?5:4;
 if(!g.bag.length){g.bag=Array.from({length:limit},(_,i)=>i);for(let i=g.bag.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[g.bag[i],g.bag[j]]=[g.bag[j],g.bag[i]];}if(OBSTACLES[g.bag[0]].kind===g.lastKind&&g.bag.length>1)[g.bag[0],g.bag[1]]=[g.bag[1],g.bag[0]];}
 const spec=OBSTACLES[g.bag.shift()],x=RUN_WIDTH+30;g.lastKind=spec.kind;g.objects.push({...spec,x,passed:false});
 const pair=plan.pairs&&spec.h<=44&&rng()<Math.min(.4,.12+g.round*.012);
 if(pair)g.objects.push({...spec,x:x+spec.w+27,passed:false});
 const stars=rng()<.45?2:1,high=spec.h>=60||rng()<.48;
 for(let i=0;i<stars;i++)g.stars.push({x:x+spec.w/2+i*48,y:FLOOR-(high?125:72),got:false});
 g.spawn=plan.gap+rng()*.65+(pair?.25:0);g.nextKind++;
}
function runnerStep(g,dt,rng=Math.random){
 if(g.over||g.phase!=='running'||!Number.isFinite(dt)||dt<=0)return[];dt=Math.min(.05,dt);const events=[],plan=roundPlan(g.round);g.elapsed+=dt;g.roundElapsed+=dt;g.speed=Math.min(620,Math.max(g.speed,plan.speed+g.roundElapsed*1.3));g.distance+=g.speed*dt;g.y=Math.max(0,g.y+g.vy*dt);g.vy-=1580*dt;if(g.y===0)g.vy=0;
 if(g.transition){g.transition.progress=Math.min(1,g.transition.progress+dt/1.2);if(g.transition.progress===1)g.transition=null;}
 g.spawn-=dt;if(g.spawn<=0&&g.roundElapsed<plan.duration-3.4)spawnRunner(g,rng);
 const dog={x:DOG_X-23,y:FLOOR-g.y-46,w:46,h:40};
 for(const o of g.objects){o.x-=g.speed*dt;if(!o.passed&&o.x+o.w<DOG_X-30){o.passed=true;g.passed++;events.push('pass');}if(dog.x+dog.w>o.x+7&&dog.x<o.x+o.w-7&&dog.y+dog.h>FLOOR-o.h+9&&dog.y<FLOOR-4){g.over=true;g.hitKind=o.kind;events.push('hit');break;}}
 for(const s of g.stars){s.x-=g.speed*dt;if(!s.got&&Math.abs(s.x-DOG_X)<31&&Math.abs(s.y-(FLOOR-g.y-24))<30){s.got=true;g.collected++;events.push('star');}}
 g.objects=g.objects.filter(o=>o.x+o.w>-30);g.stars=g.stars.filter(s=>s.x>-30&&!s.got);g.score=Math.floor(g.distance/22)+g.collected*20+g.passed*15;
 if(!g.over&&g.roundElapsed>=plan.duration&&g.objects.every(o=>o.passed)){g.phase='round-clear';g.roundCleared=g.round;events.push('round');}
 return events;
}
function begin(s,kind,now=Date.now(),rng=Math.random){roll(s,now);if(!['blocks','runner'].includes(kind))throw Error('게임 종류를 확인해 주세요.');if(s.active)return{ok:false,reason:'active',active:s.active};if(!tickets(s))return{ok:false,reason:'tickets'};s.used++;s.sequence++;s.active={id:s.day+'-'+s.sequence,kind,awarded:0,creditedClears:0,revision:0,game:kind==='blocks'?newBlocks(rng,Math.min(20,s.growth.cleanup+1)):newRunner()};return{ok:true,active:s.active};}
function checkpoint(s,id,game,expectedRevision){if(!s.active||s.active.id!==id)return{ok:false,opened:[]};const a=s.active;if(a.revision===undefined)a.revision=0;if(expectedRevision!==undefined&&expectedRevision!==a.revision)return{ok:false,opened:[],conflict:true,revision:a.revision};if(!validInt(a.revision,Number.MAX_SAFE_INTEGER-2))throw Error('게임 저장 순서를 확인해 주세요.');if(a.kind==='blocks')validateBlocks(game);else validateRunner(game);if((a.kind==='blocks'&&(game.moves<a.game.moves||game.clears.length<a.creditedClears||game.score<a.game.score))||(a.kind==='runner'&&(game.elapsed<a.game.elapsed||game.score<a.game.score)))return{ok:true,opened:[],stale:true,revision:a.revision};if(a.kind==='blocks')game.remainingMs=Math.min(game.remainingMs,a.game.remainingMs);const before=unlocked(s).map(g=>g.id);if(a.kind==='blocks'){for(const n of game.clears.slice(a.creditedClears)){creditClear(s,n);s.growth.cleanup=Math.max(s.growth.cleanup,n);}a.creditedClears=Math.max(a.creditedClears,game.clears.length);}else{if(game.roundCleared-a.creditedClears>1000)throw Error('라운드 완료 기록을 확인해 주세요.');s.growth.runnerScore=Math.min(1e9,s.growth.runnerScore+Math.max(0,game.score-a.game.score));for(let n=a.creditedClears+1;n<=game.roundCleared;n++)creditClear(s,n);a.creditedClears=Math.max(a.creditedClears,game.roundCleared);}const milestones=openGifts(s,before);a.game=clone(game);const earned=Math.floor(game.score/10);const opened=award(s,Math.max(0,earned-a.awarded));a.awarded=Math.max(a.awarded,earned);s.best[a.kind]=Math.max(s.best[a.kind],game.score);if(a.kind==='runner')s.best.rounds=Math.max(s.best.rounds,game.round);a.revision++;return{ok:true,opened:[...milestones,...opened],revision:a.revision};}
function finish(s,id,game,expectedRevision){if(!s.active||s.active.id!==id)return{ok:false,opened:[]};const result=checkpoint(s,id,game,expectedRevision);if(!result.ok||result.stale)return{...result,ok:false};s.active=null;return result;}
function nextGift(s){const order=['flag','flower','dog','guard','tree','shrimp','gull','seal','star'];return order.map(id=>GIFTS.find(g=>g.id===id)).find(g=>!giftOpen(s,g))||null;}
return{KEY,SIZE,TRASH,SHAPES,GIFTS,THRESHOLDS,day,level,islandLevel,islandComplete,gardenPlan,population,giftOpen,BLOCK_TIME,missionPlan,hammer,nextMission,fresh,validate,roll,tickets,unlocked,equip,earnTicket,rewardLearning,adoptLearning,begin,checkpoint,finish,nextGift,clone,newBlocks,validateBlocks,fits,hint,place,blockTick,newRunner,validateRunner,jump,releaseJump,nextRound,roundPlan,spawnRunner,runnerStep,RUN_WIDTH,RUN_HEIGHT,FLOOR,DOG_X,OBSTACLES,RUN_STAGES,runnerStage};
});
