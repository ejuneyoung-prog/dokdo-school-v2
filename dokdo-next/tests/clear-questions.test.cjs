'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const fs=require('node:fs');const M=require('../assets/app-model.js'),C=M.Course,Core=M.Core;
const authored=require('../tools/content/authored-questions.json');const replacements=require('../data/question-replacements.json');
const NOW=Date.parse('2026-09-12T03:00:00Z');
function rng(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
test('All 240 active questions use new IDs, with no reuse of 1.1 correctness',()=>{
 a.equal(replacements.replacements.length,240);
 for(const {oldId,newId} of replacements.replacements){a.equal(C.isActive(oldId),false);a.equal(C.isActive(newId),true);a.notEqual(oldId,newId);}
});
test('The compiled correct answer and individual reasons match canonical authoring in both languages',()=>{
 for(const q of authored)for(const lang of ['ko','en']){
  const item=C.getQuestion(q.id,lang),opts=new Map(q.options.map(o=>[o.id,o]));
  a.equal(item.choiceIds[item.answer],q.correctOptionId);
  item.choiceIds.forEach((id,i)=>{a.equal(item.choices[i],opts.get(id).text[lang]);a.equal(item.wrong[i],opts.get(id).feedback[lang]);});
  a.equal(item.explain,opts.get(q.correctOptionId).feedback[lang]);
 }
});
test('Shuffling every question for 20 seeds preserves correct IDs and feedback association',()=>{
 for(const q of C.DATA.questions)for(const lang of ['ko','en'])for(let seed=1;seed<=20;seed++){
  const item=C.getQuestion(q.id,lang),order=C.shuffled(item.choices.map((_,i)=>i),rng(seed)),answer=order.indexOf(item.answer);
  a.equal(item.choiceIds[order[answer]],q.correctOptionId);
  const orig=authored.find(x=>x.id===q.id);
  for(const old of order){const opt=orig.options.find(o=>o.id===item.choiceIds[old]);a.equal(item.wrong[old],opt.feedback[lang]);}
 }
});
test('Correct authored positions are balanced for each choice count before runtime shuffling',()=>{
 for(const n of [2,3,4]){const counts=Array(n).fill(0);C.DATA.questions.filter(q=>q.choiceIds.length===n).forEach(q=>counts[q.answer]++);a.ok(Math.max(...counts)-Math.min(...counts)<=1);}
});
test('Sources state publisher country and historical creator separately',()=>{
 for(const s of Object.values(C.DATA.sources)){a.ok(s.publisherCountry);a.ok(s.titleEn);a.ok(s.locator);}
 a.equal(C.DATA.sources.ban1696.publisherCountry,'\uB300\uD55C\uBBFC\uAD6D');a.match(C.DATA.sources.ban1696.originalCreator.en,/Japan/);
});
test('Named-command question has only comparable historical-document alternatives',()=>{
 const q=C.getQuestion(920205,'ko');a.match(q.q,/1696/);a.match(q.q,/\uC6B8\uB989\uB3C4/);a.equal(q.choices.length,4);a.match(q.choices[q.answer],/\uB3C4\uD574\uAE08\uC9C0\uB839/);
 a.ok(!q.q.includes('\uC6B8\uB989\uB3C4\uC640 \uB3C5\uB3C4'));a.ok(q.choices.every(s=>!s.includes('\uB4F1\uB300')&&!s.includes('\uCC9C\uC7A5\uAD74')));
});
test('Winter question is direct, with four short weather alternatives and scope outside the stem',()=>{
 const q=C.getQuestion(920225,'ko');a.ok(!q.q.includes('\uC678\uAD50\uBD80'));a.equal(q.choices[q.answer],'\uB208');a.equal(q.choices.length,4);a.ok(q.scope.includes('\uC6B8\uB989\uB3C4'));
});
test('Current instruction and every curriculum difficulty preserve supplied evidence',()=>{
 for(const q of C.DATA.questions)for(const l of ['ko','en']){const item=C.getQuestion(q.id,l);a.equal(item.material,q[l].material);if(item.requiresMaterial)a.ok(item.material);}
});
test('All old 240 learned records, locations and awards survive learning one new item',()=>{
 const s=M.fresh(NOW);M.selectProfile(s,'14-16',false,NOW);for(let i=910001;i<=910240;i++)s.m[i]={lv:2,cor:3,att:3,seen:3,lightBest:2,earned:20};
 s.xp=18750;s.gcHit=40;s.grade='PHD2';s.learningProfile.course.completed={'middle:8':'2026-09-11T03:00:00Z'};M.ensure(s,NOW);
 const old=Core.clone(s);M.answer(s,C.getQuestion(920205),true,{now:NOW});
 for(let i=910001;i<=910240;i++)a.deepEqual(s.m[i],old.m[i]);a.deepEqual(s.scene.order.slice(0,old.scene.order.length),old.scene.order);a.deepEqual(s.scene.beaconSlots,old.scene.beaconSlots);a.equal(s.grade,'PHD2');a.equal(s.learningProfile.course.completed['middle:8'],old.learningProfile.course.completed['middle:8']);
 const restored=M.parseImport(M.backupText(s),s,NOW);a.deepEqual(restored.m,s.m);
});
test('Old course records remain visible awards but cannot fabricate mastery of rewritten questions',()=>{
 const s=M.fresh(NOW);M.selectProfile(s,'14-16',false,NOW);s.m[910205]={lv:4,cor:10,att:10,seen:10,lightBest:4,courseLearned:true,courseIndependentDays:['2026-09-01','2026-09-03']};M.ensure(s,NOW);
 a.equal(C.groupMastery(s.m,C.getQuestion(920205).familyId).mastered,false);a.equal(Core.visualLevel(s.m[910205]),4);
});
test('Source metadata is a footer element, not a wrapper inserted into question text',()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8');a.match(html,/id="question-citations"/);a.ok(html.indexOf('id="question-citations"')>html.indexOf('id="question-options"'));
});
