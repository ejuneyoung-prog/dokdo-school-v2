/* Core unlock/collection behavior. All game records are fictional and local. */
'use strict';
const test=require('node:test'),a=require('node:assert/strict'),G=require('../assets/games-core.js');
const NOW=Date.parse('2026-10-19T04:00:00Z'),gift=id=>G.GIFTS.find(g=>g.id===id);
function meadows(s){s.growth.quizFlowers=100;s.growth.runnerScore=2000;return s;}
function ready(){const s=meadows(G.fresh(NOW));s.xp=3000;s.equipped=G.unlocked(s).map(g=>g.id);return s;}

test('Fresh running XP cannot invent quiz flowers, gulls or the final star',()=>{
 const s=G.fresh(NOW),r=G.begin(s,'runner',NOW),g=G.clone(r.active.game);g.elapsed=1;g.score=800;G.checkpoint(s,r.active.id,g);
 a.equal(s.xp,80);a.equal(s.growth.quizFlowers,0);a.equal(G.gardenPlan(s).grass,40);for(const id of['flower','tree','shrimp','gull','seal','star','lights']){a.equal(G.giftOpen(s,gift(id)),false,id);a.equal(s.equipped.includes(id),false,id);}a.equal(G.islandComplete(s),false);a.equal(G.nextGift(s).id,'flower');
});
test('A newly accepted correct concept plants its first flower immediately and only once',()=>{
 const s=G.fresh(NOW);a.equal(G.rewardLearning(s,'first-question',NOW),true);a.equal(s.xp,5);a.equal(s.growth.quizFlowers,1);a.equal(s.growth.runnerScore,0);a.equal(G.giftOpen(s,gift('flower')),true);a.equal(s.equipped.filter(x=>x==='flower').length,1);a.equal(G.population(s,'flower'),1);
 a.equal(G.rewardLearning(s,'first-question',NOW),false);a.equal(s.growth.quizFlowers,1);a.equal(s.xp,5);a.equal(G.equip(s,'flower'),true);a.equal(G.population(s,'flower'),0);G.validate(s);
});
test('Validated existing learning can be adopted without changing XP, starts, rank or active play',()=>{
 const s=G.fresh(NOW),r=G.begin(s,'runner',NOW),old=G.clone(s);const opened=G.adoptLearning(s,46);a.equal(s.growth.quizFlowers,46);a.deepEqual(opened.map(g=>g.id),['flower']);a.equal(G.population(s,'flower'),46);
 for(const key of['xp','used','bonus','active','best','day','answered','credited'])a.deepEqual(s[key],old[key]);const before=JSON.stringify(s);for(const invalid of[-1,1.5,NaN,'100',null,Infinity]){a.deepEqual(G.adoptLearning(s,invalid),[]);a.equal(JSON.stringify(s),before);}G.adoptLearning(s,7);a.equal(s.growth.quizFlowers,46);G.adoptLearning(s,10000);a.equal(s.growth.quizFlowers,100);a.equal(G.population(s,'flower'),100);a.equal(s.active.id,r.active.id);
});
test('Both meadows and complete prior collections gate tree, shrimp and gull counts in order',()=>{
 const s=G.fresh(NOW);s.xp=3000;s.growth.runnerScore=2000;s.growth.quizFlowers=99;for(const id of['tree','shrimp','gull','seal','star'])a.equal(G.giftOpen(s,gift(id)),false,id);
 meadows(s);s.xp=100;a.equal(G.giftOpen(s,gift('tree')),true);a.equal(G.equip(s,'tree'),true);a.equal(G.population(s,'tree'),1);a.equal(G.giftOpen(s,gift('shrimp')),false);s.growth.cleared=20;a.equal(G.population(s,'tree'),1,'High island stage must not instantly draw ten newly earned trees');
 s.xp=1000;a.equal(G.population(s,'tree'),10);a.equal(G.giftOpen(s,gift('shrimp')),false);a.equal(G.nextGift(s).id,'shrimp');s.xp=1100;a.equal(G.giftOpen(s,gift('shrimp')),true);G.equip(s,'shrimp');a.equal(G.population(s,'shrimp'),1);a.equal(G.giftOpen(s,gift('gull')),false);
 s.xp=2000;a.equal(G.population(s,'shrimp'),10);a.equal(G.giftOpen(s,gift('gull')),false);a.equal(G.nextGift(s).id,'gull');s.xp=2100;G.equip(s,'gull');a.equal(G.population(s,'gull'),1);s.xp=3000;a.equal(G.population(s,'gull'),10);a.equal(G.nextGift(s).id,'seal');a.equal(G.islandComplete(s),false);G.validate(s);
});
test('Stage ten alone cannot award Gangchi or a star before ten gulls are collected',()=>{
 const s=G.fresh(NOW),r=G.begin(s,'runner',NOW),g=G.clone(r.active.game);g.roundCleared=20;g.round=20;g.elapsed=1;g.score=1000;G.checkpoint(s,r.active.id,g);a.equal(s.growth.cleared,20);a.equal(s.growth.seals,0);a.equal(G.giftOpen(s,gift('seal')),false);a.equal(G.giftOpen(s,gift('star')),false);a.equal(G.islandComplete(s),false);s.growth.seals=10;a.equal(G.giftOpen(s,gift('star')),false,'Even ten saved Gangchi and stage twenty cannot skip both meadows and the prior collections');a.equal(G.islandComplete(s),false);
});
test('After ten gulls, each fresh eligible clear earns one Gangchi and ten plus stage twenty completes',()=>{
 const s=ready(),r=G.begin(s,'runner',NOW),g=G.clone(r.active.game);g.roundCleared=9;g.round=9;g.elapsed=1;G.checkpoint(s,r.active.id,g);a.equal(s.growth.seals,0);
 for(let round=10;round<=18;round++){g.roundCleared=round;g.round=round;g.elapsed++;G.checkpoint(s,r.active.id,g);a.equal(s.growth.seals,round-9);a.equal(G.islandComplete(s),false);G.checkpoint(s,r.active.id,g);a.equal(s.growth.seals,round-9);}
 g.roundCleared=19;g.round=19;g.elapsed++;G.checkpoint(s,r.active.id,g);a.equal(s.growth.seals,10);a.equal(G.giftOpen(s,gift('star')),false);g.roundCleared=20;g.round=20;g.elapsed++;G.checkpoint(s,r.active.id,g);a.equal(s.growth.seals,10);a.equal(G.gardenPlan(s).complete,true);a.equal(G.islandComplete(s),true);a.equal(G.giftOpen(s,gift('star')),true);a.ok(s.equipped.includes('star'));a.equal(G.nextGift(s),null);a.equal(G.giftOpen(s,gift('lights')),false);G.validate(s);
});
test('Pre-garden records preserve every previously unlocked gift, including hidden lights and final star',()=>{
 const s=G.fresh(NOW);s.xp=880;s.growth.cleared=20;s.growth.seals=10;s.best.runner=390;delete s.growth.gardenVersion;delete s.growth.gardenLegacy;s.equipped=['flag'];
 G.validate(s);a.equal(s.growth.gardenVersion,2);a.deepEqual(new Set(s.growth.gardenLegacy),new Set(G.GIFTS.map(g=>g.id)));a.equal(G.islandComplete(s),true);a.equal(G.gardenPlan(s).complete,false,'The old completion is preserved without fabricating new meadow achievements');
 for(const id of s.growth.gardenLegacy){a.equal(G.giftOpen(s,gift(id)),true,id);if(!s.equipped.includes(id))a.equal(G.equip(s,id),true,id);a.ok(G.population(s,id)>0,id);}a.equal(G.population(s,'flower'),10);a.equal(G.population(s,'seal'),10);a.equal(G.population(s,'lights'),1);const restored=G.validate(G.clone(s));a.deepEqual(restored,s);a.equal(G.islandComplete(restored),true);a.equal(G.nextGift(restored),null);
});
test('Old unlocked but unequipped gulls remain selectable while genuinely new records keep the gate',()=>{
 const old=G.fresh(NOW);old.xp=80;delete old.growth.gardenVersion;delete old.growth.gardenLegacy;G.validate(old);a.ok(old.growth.gardenLegacy.includes('gull'));a.equal(old.equipped.includes('gull'),false);a.equal(G.equip(old,'gull'),true);a.equal(G.population(old,'gull'),1);
 const fresh=G.fresh(NOW);fresh.xp=80;G.validate(fresh);a.equal(G.equip(fresh,'gull'),false);a.deepEqual(fresh.growth.gardenLegacy,[]);a.equal(G.islandComplete(fresh),false);
});
test('Malformed garden migration markers fail closed instead of dropping or inventing gifts',()=>{
 for(const version of[1,3,null,'2',NaN]){const s=G.fresh(NOW);s.growth.gardenVersion=version;a.throws(()=>G.validate(s));}
 for(const legacy of[null,{},['gull','gull'],['unknown'],['star',false]]){const s=G.fresh(NOW);s.growth.gardenLegacy=legacy;a.throws(()=>G.validate(s));}
 const s=G.fresh(NOW);delete s.growth.gardenLegacy;a.throws(()=>G.validate(s));
});
