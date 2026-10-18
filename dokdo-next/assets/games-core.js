/* Original browser-local game logic. No school scores, ranks or server writes. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DokdoGames=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const KEY='dokdo-island-play-v1',SIZE=8;
const SHAPES=[[[0,0]],[[0,0],[1,0]],[[0,0],[0,1]],[[0,0],[1,0],[2,0]],[[0,0],[0,1],[0,2]],[[0,0],[1,0],[0,1],[1,1]],[[0,0],[0,1],[1,1]],[[0,0],[1,0],[1,1]],[[0,0],[1,0],[2,0],[1,1]],[[0,0],[1,0],[2,0],[3,0]],[[0,0],[0,1],[0,2],[1,2]],[[0,0],[1,0],[1,1],[2,1]]];
const GIFTS=[{id:'flag',level:1,name:'첫 깃발'},{id:'flower',level:2,name:'해국 꽃밭'},{id:'gull',level:3,name:'괭이갈매기'},{id:'shrimp',level:4,name:'도화새우 캐릭터'},{id:'seal',level:5,name:'강치 캐릭터'},{id:'dog',level:6,name:'삽살개 캐릭터'},{id:'guard',level:7,name:'경비대 캐릭터'},{id:'lights',level:8,name:'반짝이는 불빛'}];
const THRESHOLDS=[0,30,80,160,270,420,620,880];
const TRASH=['생수병','비닐봉지','빨대','찌그러진 커피컵','폐타이어','버려진 그물'];
const clone=x=>JSON.parse(JSON.stringify(x));
const day=(now=Date.now())=>new Date(now+9*3600000).toISOString().slice(0,10);
const level=xp=>{let n=1;while(n<THRESHOLDS.length&&xp>=THRESHOLDS[n])n++;return n;};
function fresh(now=Date.now()){return{version:1,day:day(now),used:0,bonus:0,answered:[],credited:[],xp:0,best:{blocks:0,runner:0,rounds:0},equipped:['flag'],active:null,sequence:0};}
function validInt(n,max=1e9){return Number.isSafeInteger(n)&&n>=0&&n<=max;}
function validate(s){
 if(!s||s.version!==1||!/^\d{4}-\d{2}-\d{2}$/.test(s.day)||!validInt(s.used,10000)||!validInt(s.bonus,60)||!validInt(s.xp)||!validInt(s.sequence))throw Error('게임 기록을 읽을 수 없습니다. 원본 기록은 그대로 보관됩니다.');
 if(!Array.isArray(s.answered)||s.answered.length>60||new Set(s.answered).size!==s.answered.length||s.answered.some(x=>typeof x!=='string'||x.length>80))throw Error('도전권 기록을 확인해 주세요.');
 if(s.credited===undefined)s.credited=s.answered.slice();if(!Array.isArray(s.credited)||s.credited.length>60||new Set(s.credited).size!==s.credited.length||s.credited.some(x=>typeof x!=='string'||x.length>80))throw Error('Invalid game learning credits.');
 if(s.best&&s.best.rounds===undefined)s.best.rounds=0;if(s.best&&!validInt(s.best.rounds))throw Error('라운드 기록을 확인해 주세요.');
 if(!s.best||!validInt(s.best.blocks)||!validInt(s.best.runner)||!Array.isArray(s.equipped)||new Set(s.equipped).size!==s.equipped.length||s.equipped.some(id=>!GIFTS.some(g=>g.id===id&&g.level<=level(s.xp))))throw Error('꾸미기 기록을 확인해 주세요.');
 if(s.active){const a=s.active;if(!['blocks','runner'].includes(a.kind)||typeof a.id!=='string'||!validInt(a.awarded)||!a.game)throw Error('진행 중인 게임을 확인해 주세요.');if(a.kind==='blocks')validateBlocks(a.game);else validateRunner(a.game);}
 return s;
}
function roll(s,now=Date.now()){validate(s);const d=day(now);if(d>s.day){s.day=d;s.used=0;s.bonus=0;s.answered=[];s.credited=[];}return s;}
const tickets=s=>Math.max(0,3+s.bonus-s.used);
function unlocked(s){return GIFTS.filter(g=>g.level<=level(s.xp));}
function award(s,n){const before=level(s.xp);s.xp=Math.min(1e9,s.xp+Math.max(0,Math.floor(n)));const opened=GIFTS.filter(g=>g.level>before&&g.level<=level(s.xp));for(const g of opened)if(!s.equipped.includes(g.id))s.equipped.push(g.id);return opened;}
function equip(s,id){const g=unlocked(s).find(g=>g.id===id);if(!g)return false;const i=s.equipped.indexOf(id);if(i>=0)s.equipped.splice(i,1);else s.equipped.push(id);return true;}
function rewardLearning(s,family,now=Date.now()){roll(s,now);if(typeof family!=='string'||!family||s.credited.includes(family)||s.credited.length>=60||(!s.answered.includes(family)&&s.answered.length>=60))return false;s.credited.push(family);if(!s.answered.includes(family))s.answered.push(family);s.bonus++;award(s,5);return true;}
function earnTicket(s,family,correct,now=Date.now()){roll(s,now);if(typeof family!=='string'||!family||s.answered.includes(family)||s.answered.length>=60)return false;s.answered.push(family);return correct?rewardLearning(s,family,now):false;}
function choosePieces(rng=Math.random){return Array.from({length:3},()=>Math.min(SHAPES.length-1,Math.max(0,Math.floor(rng()*SHAPES.length))));}
function newBlocks(rng=Math.random){const board=Array.from({length:SIZE},()=>Array(SIZE).fill(0));for(let x=0;x<6;x++)board[7][x]=1+x%3;return{board,pieceTrash:[1,2,4],pieces:[1,5,6],score:0,lines:0,moves:0,combo:0,cleared:0,remainingMs:30000,endReason:null,over:false,seeded:true};}
function validateBlocks(g){if(g&&g.pieceTrash===undefined)g.pieceTrash=[1,2,4];if(g&&(!Array.isArray(g.pieceTrash)||g.pieceTrash.length!==3||g.pieceTrash.some(x=>!Number.isInteger(x)||x<1||x>6)))throw Error('청소할 쓰레기 기록을 확인해 주세요.');if(g&&g.remainingMs===undefined)g.remainingMs=30000;if(g&&(!Number.isFinite(g.remainingMs)||g.remainingMs<0||g.remainingMs>30000))throw Error('블록 제한 시간을 확인해 주세요.');if(!g||!Array.isArray(g.board)||g.board.length!==8||g.board.some(r=>!Array.isArray(r)||r.length!==8||r.some(x=>!validInt(x,6)))||!Array.isArray(g.pieces)||g.pieces.length!==3||g.pieces.some(x=>x!==null&&(!validInt(x,SHAPES.length-1)))||!['score','lines','moves','combo','cleared'].every(k=>validInt(g[k]))||typeof g.over!=='boolean')throw Error('블록 게임 기록을 확인해 주세요.');return g;}
function fits(g,index,x,y){const id=g.pieces[index];if(!Number.isInteger(x)||!Number.isInteger(y)||id==null||!SHAPES[id])return false;return SHAPES[id].every(([dx,dy])=>x+dx>=0&&y+dy>=0&&x+dx<SIZE&&y+dy<SIZE&&!g.board[y+dy][x+dx]);}
function hint(g,index=null){for(let i=0;i<3;i++){if(index!==null&&i!==index)continue;for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)if(fits(g,i,x,y))return{i,x,y};}return null;}
function place(g,index,x,y,rng=Math.random){
 if(g.over||!fits(g,index,x,y))return{ok:false,cells:[],lines:0,xp:0};
 for(const[dx,dy]of SHAPES[g.pieces[index]])g.board[y+dy][x+dx]=g.pieceTrash[index];
 g.pieces[index]=null;g.moves++;
 const rows=[],cols=[];for(let k=0;k<SIZE;k++){if(g.board[k].every(Boolean))rows.push(k);if(g.board.every(r=>r[k]))cols.push(k);}
 const cells=[];for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++)if(rows.includes(r)||cols.includes(c)){cells.push([c,r]);g.board[r][c]=0;}
 const lines=rows.length+cols.length;g.lines+=lines;g.cleared+=cells.length;g.combo=lines?g.combo+1:0;g.score+=SHAPES.length+lines*80+(lines>1?(lines-1)*60:0)+(lines?g.combo*10:0);
 if(g.pieces.every(p=>p===null)){g.pieces=choosePieces(rng);g.pieceTrash=Array.from({length:3},()=>1+Math.min(5,Math.floor(rng()*6)));}
 g.remainingMs=30000;g.over=!hint(g);g.endReason=g.over?'no-space':null;return{ok:true,cells,lines,xp:Math.floor(g.score/10)};
}
function blockTick(g,ms){if(g.over)return;if(!hint(g)){g.over=true;g.endReason='no-space';return;}if(!Number.isFinite(ms)||ms<=0)return;g.remainingMs=Math.max(0,g.remainingMs-ms);if(!g.remainingMs){g.over=true;g.endReason='time';}}
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
function begin(s,kind,now=Date.now(),rng=Math.random){roll(s,now);if(!['blocks','runner'].includes(kind))throw Error('게임 종류를 확인해 주세요.');if(s.active)return{ok:false,reason:'active',active:s.active};if(!tickets(s))return{ok:false,reason:'tickets'};s.used++;s.sequence++;s.active={id:s.day+'-'+s.sequence,kind,awarded:0,game:kind==='blocks'?newBlocks(rng):newRunner()};return{ok:true,active:s.active};}
function checkpoint(s,id,game){if(!s.active||s.active.id!==id)return{ok:false,opened:[]};const a=s.active;if(a.kind==='blocks')validateBlocks(game);else validateRunner(game);a.game=clone(game);const earned=Math.floor(game.score/10);const opened=award(s,Math.max(0,earned-a.awarded));a.awarded=Math.max(a.awarded,earned);s.best[a.kind]=Math.max(s.best[a.kind],game.score);if(a.kind==='runner')s.best.rounds=Math.max(s.best.rounds,game.round);return{ok:true,opened};}
function finish(s,id,game){if(!s.active||s.active.id!==id)return{ok:false,opened:[]};const result=checkpoint(s,id,game);s.active=null;return result;}
function nextGift(s){return GIFTS.find(g=>g.level>level(s.xp))||null;}
return{KEY,SIZE,TRASH,SHAPES,GIFTS,THRESHOLDS,day,level,fresh,validate,roll,tickets,unlocked,equip,earnTicket,rewardLearning,begin,checkpoint,finish,nextGift,clone,newBlocks,validateBlocks,fits,hint,place,blockTick,newRunner,validateRunner,jump,releaseJump,nextRound,roundPlan,spawnRunner,runnerStep,RUN_WIDTH,RUN_HEIGHT,FLOOR,DOG_X,OBSTACLES,RUN_STAGES,runnerStage};
});
