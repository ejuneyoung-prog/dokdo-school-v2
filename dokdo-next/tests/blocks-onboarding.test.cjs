/* Real local play paths. These tests never contact services or change school scores. */
'use strict';
const test=require('node:test'),a=require('node:assert/strict');
const G=require('../assets/games-core.js');
const NOW=Date.parse('2026-10-19T04:00:00Z');
const ROUTES={1:[[0,2,6],[1,4,6],[2,6,6],[0,7,6],[1,4,7],[2,7,7]],2:[[0,3,5],[1,5,5],[2,7,5],[0,5,6],[1,3,7],[2,7,7]]};
function playRoute(g,route,rng=()=>0){return route.map(move=>{const result=G.place(g,...move,rng);a.equal(result.ok,true,'A certified placement stays legal');return result;});}

test('Fresh stages one and two need six legal placements and two/three complete cleanup lines',()=>{
 for(const n of[1,2]){const g=G.newBlocks(()=>0,n),result=[];for(let i=0;i<6;i++){result.push(G.place(g,...ROUTES[n][i],()=>0));a.equal(result[i].ok,true);a.equal(g.phase,i===5?'mission-clear':'playing');a.equal(g.moves,i+1);a.equal(g.over,false);a.equal(g.remainingMs,300000);}
  a.equal(g.lines,n+1);a.equal(g.cleared,n===1?16:24);a.equal(g.score,n===1?252:352,'Original per-placement, line and combo score formula is unchanged');a.deepEqual(g.clears,[n]);a.ok(result.filter(r=>r.lines>0).length>=2);a.equal(g.board.flat().filter(Boolean).length,0);
 }
});
test('No legal first placement clears an opening mission; five pieces cannot reach its cleanup target',()=>{
 for(const n of[1,2]){const original=G.newBlocks(()=>0,n),trash=original.board.flat().filter(Boolean).length,initialArea=original.pieces.reduce((sum,id)=>sum+G.SHAPES[id].length,0);let legal=0;
  for(let i=0;i<3;i++)for(let y=0;y<8;y++)for(let x=0;x<8;x++)if(G.fits(original,i,x,y)){legal++;const copy=G.clone(original),out=G.place(copy,i,x,y,()=>.99);a.equal(out.completed,false);a.equal(out.lines,0);a.equal(copy.phase,'playing');}
  a.ok(legal>20,'The opening offers real placement choices');const next=G.clone(original);playRoute(next,ROUTES[n].slice(0,3));const twoLargest=next.pieces.map(id=>G.SHAPES[id].length).sort((x,y)=>y-x).slice(0,2).reduce((x,y)=>x+y,0);
  // Cleared cells cannot exceed all original litter plus all pieces placed.
  a.ok(trash+initialArea+twoLargest<G.missionPlan(n).target,'Even the five largest available pieces cannot supply enough cells for a win');
 }
});
test('Helpful hints follow occupied litter rows and complete both openings without lucky random trays',()=>{
 for(const n of[1,2])for(const chance of[0,.01,.3,.5,.999999]){const g=G.newBlocks(()=>chance,n);const first=G.hint(g,0);a.ok(first.y>=5);a.equal(G.fits(g,first.i,first.x,first.y),true);for(let move=0;move<6;move++){const h=G.hint(g,g.pieces.findIndex(p=>p!==null));a.ok(h);a.equal(G.fits(g,h.i,h.x,h.y),true);const out=G.place(g,h.i,h.x,h.y,()=>chance);a.equal(out.ok,true);a.equal(g.over,false);}a.equal(g.phase,'mission-clear');a.equal(g.lines,n+1);}
});
test('Opening refills give an entirely playable tray even after a crowded off-path placement',()=>{
 for(const n of[1,2]){const g=G.newBlocks(()=>.99999,n);g.board=Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>(x+y)%2?1:0));g.pieces=[0,null,null];g.pieceTrash=[1,2,4];a.equal(G.place(g,0,0,0,()=>.99999).ok,true);a.equal(g.over,false);a.deepEqual(g.pieces,[0,0,0]);for(let i=0;i<3;i++){const h=G.hint(g,i);a.ok(h,'A refill cannot fail merely because the random pool drew a bad shape');a.equal(G.place(g,h.i,h.x,h.y,()=>0).ok,true);}}
});
test('Six-move opening checkpoints award exact XP once and transition without buying a second ticket',()=>{
 const s=G.fresh(NOW),r=G.begin(s,'blocks',NOW),id=r.active.id,g=G.clone(r.active.game);let afterFirst;
 for(const move of ROUTES[1]){G.place(g,...move,()=>0);a.equal(G.checkpoint(s,id,g).ok,true);}a.equal(s.xp,25);a.equal(s.growth.cleanup,1);a.equal(s.growth.runnerScore,0);a.equal(s.growth.quizFlowers,0);afterFirst=G.clone(g);
 G.checkpoint(s,id,g);a.equal(s.xp,25);a.equal(G.nextMission(g),true);a.equal(G.tickets(s),2);a.equal(g.score,252);playRoute(g,ROUTES[2]);G.checkpoint(s,id,g);a.equal(g.score,604);a.equal(s.xp,60);a.equal(s.growth.cleanup,2);a.equal(G.checkpoint(s,id,afterFirst).stale,true);a.equal(s.xp,60);G.finish(s,id,g);a.equal(s.xp,60);a.equal(G.finish(s,id,g).ok,false);
});
test('Saved v1 active puzzles keep board, tray, goal, score, clock and old one-row completion',()=>{
 const s=G.fresh(NOW),r=G.begin(s,'blocks',NOW),g=r.active.game;g.missionVersion=1;g.board=Array.from({length:8},()=>Array(8).fill(0));for(let x=0;x<6;x++)g.board[7][x]=1+x%3;g.pieces=[1,5,6];g.remainingMs=234567;g.score=120;g.moves=3;
 const before=JSON.stringify(s),restored=G.validate(JSON.parse(before));a.equal(JSON.stringify(restored),before);a.equal(G.missionPlan(1,1).target,8);a.equal(G.missionPlan(2,1).target,16);a.equal(G.place(restored.active.game,0,6,7).completed,true);a.equal(restored.active.game.score,222);a.equal(restored.active.game.remainingMs,234567);a.equal(G.nextMission(restored.active.game),true);a.equal(restored.active.game.missionVersion,1);a.deepEqual(restored.active.game.pieces,[1,5,6]);
 const old=G.clone(g),oldBoard=G.clone(g.board);delete old.missionVersion;G.validateBlocks(old);a.equal(old.missionVersion,1);a.deepEqual(old.board,oldBoard);a.equal(old.score,120);a.deepEqual(old.pieces,[1,5,6]);
});
test('Goals rise gradually after the new openings while stage ten and twenty retain their challenge',()=>{
 for(let n=2;n<=20;n++)a.ok(G.missionPlan(n).target>G.missionPlan(n-1).target);a.deepEqual(G.missionPlan(10),{number:10,target:120,combo:2,rescue:1,hard:true});a.deepEqual(G.missionPlan(20),{number:20,target:240,combo:3,rescue:1,hard:true});for(const n of[1,2])a.equal(G.missionPlan(n).rescue,0);
});
test('Quiz flowers count only newly accepted correct concepts and never runner or block points',()=>{
 const s=G.fresh(NOW);a.equal(G.earnTicket(s,'wrong-first',false,NOW),false);a.equal(s.growth.quizFlowers,0);a.equal(G.rewardLearning(s,'wrong-first',NOW),true);a.equal(s.growth.quizFlowers,1);a.equal(G.rewardLearning(s,'wrong-first',NOW),false);a.equal(G.earnTicket(s,'wrong-first',true,NOW),false);a.equal(s.growth.quizFlowers,1);a.equal(s.xp,5);
 for(let day=0;day<2;day++)for(let i=0;i<60;i++)G.rewardLearning(s,'quiz-'+day+'-'+i,NOW+day*86400000);a.equal(s.growth.quizFlowers,100);a.equal(G.tickets(s),63);G.validate(s);
});
test('Runner grass accumulates positive saved score deltas across runs and never repeated/stale snapshots',()=>{
 const s=G.fresh(NOW),r=G.begin(s,'runner',NOW),id=r.active.id,g=G.clone(r.active.game);g.elapsed=1;g.score=37;G.checkpoint(s,id,g);a.equal(s.growth.runnerScore,37);a.equal(s.xp,3);G.checkpoint(s,id,g);a.equal(s.growth.runnerScore,37);
 const old=G.clone(g);g.elapsed=2;g.score=81;G.checkpoint(s,id,g);a.equal(s.growth.runnerScore,81);a.equal(G.checkpoint(s,id,old).stale,true);a.equal(s.growth.runnerScore,81);const low=G.clone(g);low.elapsed=3;low.score=20;a.equal(G.checkpoint(s,id,low).stale,true);G.checkpoint(s,id,g);a.equal(s.growth.runnerScore,81);G.finish(s,id,g);a.equal(s.growth.runnerScore,81);
 const second=G.begin(s,'runner',NOW),next=G.clone(second.active.game);next.elapsed=1;next.score=29;G.checkpoint(s,second.active.id,next);a.equal(s.growth.runnerScore,110);a.equal(s.best.runner,81);a.equal(s.xp,10);a.equal(s.growth.quizFlowers,0);s.growth.runnerScore=1e9-2;next.elapsed=2;next.score=34;G.checkpoint(s,second.active.id,next);a.equal(s.growth.runnerScore,1e9);
});
test('Optional achievement counters migrate from prior bests without losing old records; malformed values fail closed',()=>{
 const old=G.fresh(NOW);old.best.runner=321;old.xp=160;delete old.growth.quizFlowers;delete old.growth.runnerScore;G.validate(old);a.equal(old.growth.quizFlowers,0);a.equal(old.growth.runnerScore,321);a.equal(old.xp,160);a.equal(old.best.runner,321);a.deepEqual(G.validate(JSON.parse(JSON.stringify(old))),old);
 for(const field of['quizFlowers','runnerScore'])for(const bad of[-1,1.5,null,'2',Infinity,NaN,field==='quizFlowers'?101:1e9+1]){const damaged=G.fresh(NOW);damaged.growth[field]=bad;a.throws(()=>G.validate(damaged));a.equal(damaged.growth[field],bad);}
});

test('A rejected runner checkpoint does not accrue grass before its invalid round jump is checked',()=>{const s=G.fresh(NOW),r=G.begin(s,'runner',NOW),g=G.clone(r.active.game),before=JSON.stringify(s);g.score=99;g.elapsed=1;g.roundCleared=1001;a.throws(()=>G.checkpoint(s,r.active.id,g));a.equal(JSON.stringify(s),before);});
