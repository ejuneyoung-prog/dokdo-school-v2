'use strict';
const {test}=require('node:test');
const a=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const M=require('../assets/app-model.js'),C=M.Course,Core=M.Core;
const NOW=Date.parse('2026-09-11T03:00:00Z');
const day=n=>NOW+n*86400000;
const fresh=(band='14-16')=>{const s=M.fresh(NOW);M.selectProfile(s,band,false,NOW);return s;};
const sample=(s,unit)=>{s.learningProfile.course.unit=unit;return C.lesson(s.learningProfile,s.m,'ko',5,()=>.31,'daily',NOW);};
const learn=(s,items,time=NOW)=>{items.forEach(q=>M.answer(s,q,true,{now:time}));return M.finish(s,time,items);};
const clone=Core.clone;
const FAMILIES=[...new Set(C.DATA.questions.map(q=>q.familyId))].map(id=>({id}));
function seeded(n=1513){const s=fresh();s.grade='PHD2';s.xp=18750;s.streak=7;s.gcHit=55;
 for(let i=1;i<=n;i++)s.m[i]={lv:i>1510?4:1+i%3,att:3,cor:3,seen:3,earned:20,due:'2026-09-12'};
 Core.ensure(s,NOW);return s;
}

test('New release contains 240 bilingual tasks, 60 stable families, 12 coherent units',()=>{
 a.equal(C.DATA.questions.length,240);a.equal(FAMILIES.length,60);a.equal(C.DATA.units.length,12);
 a.equal(new Set(C.DATA.questions.map(q=>q.id)).size,240);
 for(const f of FAMILIES){const qs=C.DATA.questions.filter(q=>q.familyId===f.id);a.equal(qs.length,4);a.deepEqual(qs.map(q=>q.difficulty),[1,2,3,4]);}
});
test('Old original IDs and 48 demonstration IDs cannot re-enter ordinary selection',()=>{
 for(let id=1;id<=2500;id++)a.equal(C.isActive(id),false);
 for(let id=900001;id<=900048;id++)a.equal(C.isActive(id),false);
 a.throws(()=>C.getQuestion(900024));a.throws(()=>M.answer(fresh(),{id:900024},true));
});
test('Korean and English tasks agree on identity, correct answer and family',()=>{
 for(const q of C.DATA.questions){const k=C.getQuestion(q.id,'ko'),e=C.getQuestion(q.id,'en');a.equal(k.answer,e.answer);a.equal(k.familyId,e.familyId);a.ok(k.choices.length>=2&&k.choices.length<=4);a.equal(e.choices.length,k.choices.length);a.ok(k.q&&e.q);a.equal(new Set(k.choices).size,k.choices.length);a.equal(new Set(e.choices).size,e.choices.length);}
});
test('All tasks carry direct source locators and explanation for each option',()=>{
 for(const q of C.DATA.questions){for(const s of q.sourceIds){a.ok(C.DATA.sources[s]);a.match(C.DATA.sources[s].url,/^https:\/\//);a.ok(C.DATA.sources[s].locator.length>8);}
 for(const lang of ['ko','en']){a.ok(q[lang].explain.length>=12);a.ok(q[lang].fact.length>15);a.equal(q[lang].wrong.length,q[lang].choices.length);q[lang].wrong.forEach(t=>a.ok(t.length>=12));}}
});
test('Every evidence-reading/judgment item supplies evidence, not an invisible photograph',()=>{
 for(const q of C.DATA.questions){if(q.requiresMaterial){a.ok(q.ko.material.length>0);a.ok(q.en.material.length>0);}a.equal(q.ko.q.includes('사진을 보세요'),false);}
});
test('Difficulty allocation and actual cognitive annotations are separate and counted honestly',()=>{
 for(const [track,t] of Object.entries(C.DATA.tracks)){
  const qs=t.questionIds.map(id=>C.getQuestion(id));a.equal(qs.length,60);a.equal(new Set(qs.map(q=>q.familyId)).size,60);
  a.deepEqual(t.cognitiveCounts,[1,2,3,4].map(c=>qs.filter(q=>q.cognitive===c).length));
  a.deepEqual(t.difficultyCounts,[1,2,3,4].map(c=>qs.filter(q=>q.difficulty===c).length));
 }
 a.ok(C.DATA.questions.some(q=>q.difficulty!==q.cognitive));
 a.notDeepEqual(C.DATA.tracks.early.questionIds,C.DATA.tracks.primary.questionIds);
});
test('Middle, high and adult start with real Dokdo records, not generic nature manners',()=>{
 for(const [band,unit] of [['14-16',8],['17-19',9],['20+',11]]){const s=fresh(band),items=C.lesson(s.learningProfile);a.ok(items.every(q=>q.unit===unit));a.equal(new Set(items.map(q=>q.familyId)).size,5);a.ok(items.some(q=>q.cognitive>=3));}
});
test('A repeated unit keeps its five questions but not their order',()=>{
 const s=fresh('10-11'),orders=new Set(),sets=new Set();
 for(let i=0;i<40;i++){
  const ids=C.lesson(s.learningProfile,s.m,'ko',5,Math.random,'daily').map(q=>q.id);
  a.equal(ids.length,5);orders.add(ids.join(','));sets.add(ids.slice().sort().join(','));
 }
 a.equal(sets.size,1);a.ok(orders.size>1);
});
test('Ages are required; malformed selections fail closed',()=>{
 a.throws(()=>C.profile(''));a.throws(()=>C.createPlacement(null));a.throws(()=>C.lesson(null));a.throws(()=>C.profile('99'));
});
test('All 224 age/answer-pattern placements stay in age track and use five distinct families',()=>{
 for(const b of C.BANDS)for(let pattern=0;pattern<32;pattern++){
  const p=C.profile(b.id),session=C.createPlacement(p),families=new Set();
  for(let i=0;i<5;i++){const q=C.pickPlacement(session,i%2?'en':'ko',()=>.38);a.ok(C.isActive(q.id));a.ok(q.difficulty>=session.min&&q.difficulty<=b.max);a.equal(families.has(q.familyId),false);families.add(q.familyId);C.recordPlacement(session,q,Boolean(pattern&(1<<i)));a.equal(session.track,b.track);}
  a.equal(session.answers.length,5);a.ok(C.unitInfo(C.recommendUnit(session)));a.throws(()=>C.pickPlacement(session));
 }
});
test('A wrong middle-school placement response cannot fall into a kindergarten question pool',()=>{
 const d=C.createPlacement(C.profile('14-16'));
 for(let i=0;i<5;i++){const q=C.pickPlacement(d);a.ok(q.difficulty>=2);C.recordPlacement(d,q,false);a.equal(d.track,'middle');}
});
test('Placement is diagnostic only: no light, XP, weekly score or invitation is invented',()=>{
 const s=fresh(),q=C.pickPlacement(C.createPlacement(s.learningProfile)),before=JSON.stringify(s);
 M.answer(s,q,true,{mode:'placement',now:NOW});a.equal(JSON.stringify(s),before);
 M.answer(s,q,false,{mode:'placement',now:NOW});a.equal(JSON.stringify(s),before);
});
test('All six tracks can finish 12 coherent units without falling back to the old bank',()=>{
 for(const band of ['8-9','10-11','12-13','14-16','17-19','20+']){
  const s=fresh(band),seen=new Set();for(let i=0;i<12;i++){
   const items=C.lesson(s.learningProfile,s.m);a.equal(items.length,5);a.equal(new Set(items.map(q=>q.unit)).size,1);a.equal(new Set(items.map(q=>q.familyId)).size,5);
   a.equal(seen.has(items[0].unit),false);seen.add(items[0].unit);learn(s,items);M.validate(s);
  }a.equal(seen.size,12);a.equal(C.courseEvidence(s.learningProfile,s.m).completed,12);a.equal(C.courseEvidence(s.learningProfile,s.m).count,0);
 }
});
test('Repeating an equivalent concept on the same day does not duplicate reward or ranking credit',()=>{
 const s=fresh();const qs=C.DATA.questions.filter(q=>q.familyId===FAMILIES[0].id).map(q=>C.getQuestion(q.id));
 qs.forEach(q=>M.answer(s,q,true,{now:NOW}));a.equal(s.xp,10);a.equal(s.gcHit,0);a.equal(s.visual.journey.earned,1);a.equal(s.weekly.eligible,1);a.equal(s.weekly.correct,4);
 a.equal(C.groupMastery(s.m,qs[0].familyId).days.length,0);
});
test('Same-day review after seeing the teaching is not counted as delayed independent mastery',()=>{
 const s=fresh(),q=C.getQuestion(920001);M.answer(s,q,true,{now:NOW});M.answer(s,q,true,{mode:'review',now:NOW});
 a.equal(C.groupMastery(s.m,q.familyId).days.length,0);
});
test('Two variants reviewed on one later day still count as one concept-day',()=>{
 const s=fresh(),q=C.getQuestion(920001),alternate=C.getQuestion(920002);M.answer(s,q,true,{now:NOW});
 M.answer(s,q,true,{mode:'review',now:day(2)});M.answer(s,alternate,true,{mode:'review',now:day(2)});
 a.deepEqual(C.groupMastery(s.m,q.familyId).days,['2026-09-13']);
});
test('Two due reviews on different later days produce one mastered concept, not two questions',()=>{
 const s=fresh(),q=C.getQuestion(920001);M.answer(s,q,true,{now:NOW});
 M.answer(s,q,true,{mode:'review',now:day(2)});M.answer(s,q,true,{mode:'review',now:day(8)});
 a.equal(C.groupMastery(s.m,q.familyId).days.length,2);a.equal(C.courseEvidence(s.learningProfile,s.m).count,1);
});
test('Retry cannot create an unseen question record',()=>{a.throws(()=>M.answer(fresh(),C.getQuestion(920001),true,{retry:true,now:NOW}));});
test('A wrong answer followed by correction permits learning without pretending it was first-attempt recall',()=>{
 const s=fresh(),q=C.getQuestion(920001);M.answer(s,q,false,{now:NOW});M.answer(s,q,true,{retry:true,now:NOW});
 const r=s.m[q.id];a.equal(r.att,1);a.equal(r.cor,0);a.equal(s.xp,0);a.equal(s.gcHit,0);a.equal(s.weekly.correct,0);a.equal(r.courseLearned,true);a.equal(Core.visualLevel(r),0);
});
test('Unit completion rejects missing, repeated, cross-unit and unlearned questions',()=>{
 const s=fresh(),items=sample(s,8);a.throws(()=>M.finish(s,NOW,items));items.forEach(q=>M.answer(s,q,true,{now:NOW}));
 a.throws(()=>M.finish(s,NOW,items.slice(0,4)));a.throws(()=>M.finish(s,NOW,[items[0],items[0],...items.slice(2)]));
 const another=C.getQuestion(920001);M.answer(s,another,true,{now:NOW});a.throws(()=>M.finish(s,NOW,[another,...items.slice(1)]));
});
test('Unit completion does not trust fabricated family/unit metadata attached to a valid ID',()=>{
 const s=fresh(),items=sample(s,8);items.forEach(q=>M.answer(s,q,true,{now:NOW}));const wrong=C.getQuestion(920001);M.answer(s,wrong,true,{now:NOW});
 a.throws(()=>M.finish(s,NOW,[{...wrong,unit:8,familyId:'invented'},...items.slice(1)]));
});
test('Finishing an already completed unit does not create a second bird achievement',()=>{
 const s=fresh(),items=sample(s,4);learn(s,items);const before=JSON.stringify(s.visual.unlocks);
 M.finish(s,NOW,items);a.equal(JSON.stringify(s.visual.unlocks),before);a.equal(C.courseEvidence(s.learningProfile,s.m).completed,1);
});
test('Completing classes alone does not falsely certify mastery or automatically change actual age',()=>{
 const s=fresh('8-9');for(let u=1;u<=12;u++)learn(s,sample(s,u));
 a.equal(C.advanceTrack(s.learningProfile,s.m),false);a.equal(s.learningProfile.ageBand,'8-9');a.equal(s.learningProfile.course.track,'early');
});
test('Explicit deeper study is available after 12 units and 12 mastered concept families',()=>{
 const s=fresh('8-9');for(let u=1;u<=12;u++)learn(s,sample(s,u));
 const ids=C.DATA.tracks.early.questionIds.slice(0,12);for(const id of ids){const q=C.getQuestion(id);M.answer(s,q,true,{mode:'review',now:day(2)});M.answer(s,q,true,{mode:'review',now:day(8)});}
 a.equal(C.advanceTrack(s.learningProfile,s.m),true);a.equal(s.learningProfile.course.track,'primary');a.equal(s.learningProfile.ageBand,'8-9');a.equal(Object.keys(s.learningProfile.course.completed).length,12);
});
test('Changing reading route never erases previously completed units or the old game rank',()=>{
 const s=seeded();learn(s,sample(s,8));const before=clone(s.learningProfile.course.completed);M.selectProfile(s,'8-9',true);
 a.equal(s.grade,'PHD2');for(const k in before)a.equal(s.learningProfile.course.completed[k],before[k]);
});
test('Legacy 1,513 items and 48 previous demonstration records remain unchanged when starting the new course',()=>{
 const s=seeded();for(let id=900001;id<=900048;id++)s.m[id]={lv:2,cor:2,att:3,seen:3,lightBest:2};Core.ensure(s,NOW);
 const originals=clone(s.m);learn(s,sample(s,8));for(const id in originals)a.deepEqual(s.m[id],originals[id]);a.equal(s.grade,'PHD2');
});
test('Learning-profile migration preserves old placement and accomplishment evidence',()=>{
 const s=seeded();s.learningProfile={version:1,ageBand:'14-16',easy:false,readingMax:3,stage:4,completed:{1:'2026-09-01'},placement:{at:'2026-09-01',correct:3,total:5,suggested:2,answers:[]}};
 const old=clone(s.learningProfile);M.ensure(s,NOW);a.equal(s.learningProfile.course.track,'middle');a.equal(s.learningProfile.stage,old.stage);a.deepEqual(s.learningProfile.completed,old.completed);a.deepEqual(s.learningProfile.placement,old.placement);
});
test('Course completions, family reviews and previous question rewards survive exact backup round trip',()=>{
 const s=seeded();const items=sample(s,8);learn(s,items);M.answer(s,items[0],true,{mode:'review',now:day(2)});
 const restored=M.parseImport(M.backupText(s,'ko',day(2)),s,day(2));a.deepEqual(restored.m,s.m);a.deepEqual(restored.learningProfile,s.learningProfile);a.deepEqual(restored.scene,s.scene);
});
test('An otherwise similar backup that drops a completed unit is rejected',()=>{
 const s=fresh();learn(s,sample(s,8));const lower=clone(s);lower.learningProfile.course.completed={};a.throws(()=>M.parseImport(M.backupText(lower),s,NOW));
});
test('An otherwise similar backup that drops a delayed group review is rejected',()=>{
 const s=fresh(),q=C.getQuestion(920001);M.answer(s,q,true,{now:NOW});M.answer(s,q,true,{mode:'review',now:day(2)});
 const lower=clone(s);lower.m[q.id].courseIndependentDays=[];a.throws(()=>M.parseImport(M.backupText(lower),s,day(2)));
});
test('Impossible dates and malformed course completion keys fail validation',()=>{
 for(const change of [s=>s.learningProfile.course.unit=13,s=>s.learningProfile.course.track='invented',s=>s.learningProfile.course.completed={'adult:99':'now'},s=>s.m[920001]={courseIndependentDays:['2026-02-31']}]){const s=fresh();change(s);a.throws(()=>M.validate(s));}
});
test('Weekly rollover retains concept mastery, rank, lights, beacons and completed courses',()=>{
 const s=seeded();learn(s,sample(s,8));const old=clone(s);Core.rollover(s,day(4));a.equal(s.weekly.correct,0);a.deepEqual(s.m,old.m);a.deepEqual(s.learningProfile,old.learningProfile);a.deepEqual(s.scene,old.scene);a.equal(s.grade,old.grade);
});
test('Invalid or inactive retired content cannot be resurrected by review selection',()=>{
 const s=fresh();s.m[900024]={cor:20,courseLearned:true,due:'2000-01-01'};
 a.equal(C.lesson(s.learningProfile,s.m,'ko',5,Math.random,'review').length,0);
});
test('Building the content is deterministic and audit metadata agrees with the loaded runtime',()=>{
 const report=require('../data/course-audit.json');a.equal(report.questions,C.DATA.questions.length);a.equal(report.families,FAMILIES.length);a.ok(Array.isArray(report.readingReview));a.deepEqual(report.missingSources,[]);
});
test('Opening help during a later review does not certify an independent recall day',()=>{
 const s=fresh(),q=C.getQuestion(920001);M.answer(s,q,true,{now:NOW});
 M.answer(s,q,true,{mode:'review',helped:true,now:day(2)});
 a.deepEqual(s.m[q.id].courseIndependentDays||[],[]);
 M.answer(s,q,true,{mode:'review',now:day(8)});
 a.equal((s.m[q.id].courseIndependentDays||[]).length,1);
});
