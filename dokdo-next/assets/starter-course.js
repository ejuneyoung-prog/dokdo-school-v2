/* Dokdo curriculum v3 (explicitly authored). Old file name retained for client compatibility.
 * Question identity, concept mastery, age/reading path, and legacy game rank are separate.
 */
(function(r,f){const d=typeof module==='object'&&module.exports?require('./course-data.js'):r.DokdoCourseData;const a=f(d);if(typeof module==='object'&&module.exports)module.exports=a;else r.DokdoStarter=a;})(typeof globalThis!=='undefined'?globalThis:this,function(DATA){
'use strict';
if(!DATA||DATA.questions.length!==240)throw Error('The complete Dokdo course data is required.');
const VERSION=DATA.version;
const BANDS=[
{id:'u7',ko:'7세 이하 · 함께 읽기',en:'Age 7 and under · read together',track:'early',start:1,max:2},
{id:'8-9',ko:'초등 1–2학년 · 8–9세 참고',en:'Primary years 1–2',track:'early',start:1,max:2},
{id:'10-11',ko:'초등 3–4학년 · 10–11세 참고',en:'Primary years 3–4',track:'primary',start:1,max:2},
{id:'12-13',ko:'초등 5–6학년 · 12–13세 참고',en:'Primary years 5–6',track:'upper',start:2,max:3},
{id:'14-16',ko:'중학생',en:'Middle school',track:'middle',start:2,max:4},
{id:'17-19',ko:'고등학생',en:'High school',track:'high',start:3,max:4},
{id:'20+',ko:'성인',en:'Adult',track:'adult',start:3,max:4}];
const STAGES={ko:['','독도와 첫 만남','생명과 생활','기록 속 독도','자료로 설명하기'],en:['','Meet Dokdo','Life and living','Dokdo in records','Explain with evidence']};
const COG={ko:['','알아보기','이어보기','자료읽기','따져보기'],en:['','Recognise','Connect','Read evidence','Evaluate']};
const DIFFICULTY={ko:['','기초 확인','개념 연결','자료 활용','심화 연습'],en:['','Foundations','Connections','Using evidence','Extended practice']};
const ids=new Map(DATA.questions.map(q=>[q.id,q]));
const families=new Map();for(const q of DATA.questions){if(!families.has(q.familyId))families.set(q.familyId,[]);families.get(q.familyId).push(q);}
const band=id=>BANDS.find(b=>b.id===id);
const trackName=(p,l='ko')=>DATA.tracks[p.course?.track||band(p.ageBand)?.track||'early'][l];
const trackKeys=Object.keys(DATA.tracks);
function emptyCourse(track){return {version:2,track,unit:DATA.tracks[track].startUnit,completed:{}};}
function migrateProfile(p){
 if(!p)return p;
 if(!p.course)p.course=emptyCourse(p.easy?'early':band(p.ageBand)?.track||'early');
 return p;
}
function profile(ageBand,easy=false,previous=null){
 const b=band(ageBand);if(!b)throw Error('Select a school/age band first.');
 const p={...(previous||{}),version:1,ageBand,easy:!!easy,stage:Math.max(previous?.stage||1,b.start),readingMax:easy?1:b.max,completed:{...(previous?.completed||{})},placement:previous?.placement||null};
 const track=easy?'early':b.track;
 p.course=previous?.course?JSON.parse(JSON.stringify(previous.course)):emptyCourse(track);
 if(p.course.track!==track){p.course.track=track;p.course.unit=DATA.tracks[track].startUnit;}
 return p;
}
function valid(p){
 if(!p||!band(p.ageBand)||!Number.isInteger(p.stage)||p.stage<1||p.stage>4)return false;
 const c=p.course;if(c==null)return true;
 if(c.version!==2||!DATA.tracks[c.track]||!Number.isInteger(c.unit)||c.unit<1||c.unit>12||!c.completed||typeof c.completed!=='object'||Array.isArray(c.completed))return false;
 return Object.entries(c.completed).every(([k,v])=>/^(early|primary|upper|middle|high|adult):(1[0-2]|[1-9])$/.test(k)&&typeof v==='string'&&Number.isFinite(Date.parse(v)));
}
function ensureProfile(p){migrateProfile(p);if(!valid(p))throw Error('Invalid course profile.');return p;}
function translated(q,lang='ko'){
 const t=q[lang]||q.ko;return {id:q.id,unit:q.unit,stage:q.stage,difficulty:q.difficulty,cognitive:q.cognitive,conceptId:q.conceptId,familyId:q.familyId,group:q.familyId,q:t.q,choices:t.choices.slice(),choiceIds:q.choiceIds.slice(),answer:q.answer,explain:t.explain,fact:t.fact,wrong:t.wrong.slice(),material:t.material,context:t.context,scope:t.scope,goal:t.goal,topic:t.topic,requiresMaterial:q.requiresMaterial,source:DATA.sources[q.sourceIds[0]],sources:q.sourceIds.map(k=>DATA.sources[k]),curriculum:true,pilot:false};
}
function getQuestion(id,lang='ko'){const q=ids.get(+id);if(!q)throw Error('Question is not in the active Dokdo curriculum.');return translated(q,lang);}
function isActive(id){return ids.has(+id);}
function pool(stage,lang='ko',p=null){return DATA.questions.filter(q=>q.stage===stage&&(!p||DATA.tracks[ensureProfile(p).course.track].questionIds.includes(q.id))).map(q=>translated(q,lang));}
function shuffled(a,rng=Math.random){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function unitInfo(n){return DATA.units.find(x=>x.id===+n);}
function unitQuestions(p,n=p.course?.unit,lang='ko'){
 const c=ensureProfile(p).course,t=DATA.tracks[c.track];n=n||c.unit;
 return t.questionIds.map(id=>ids.get(id)).filter(q=>q.unit===n).map(q=>translated(q,lang));
}
function groupRecords(records,family){return (families.get(family)||[]).map(q=>({id:q.id,q,r:records[q.id]})).filter(x=>x.r);}
function groupMastery(records,family){
 const rows=groupRecords(records,family),days=new Set();for(const {r} of rows)for(const d of r.courseIndependentDays||[])days.add(d);
 return {known:rows.some(x=>x.r.courseLearned||x.r.cor>0),days:[...days].sort(),mastered:days.size>=2};
}
function lesson(p,records={},lang='ko',n=5,rng=Math.random,mode='daily',now=Date.now()){
 ensureProfile(p);
 // A unit is a fixed set of five concepts, but presenting them in data order
// every time made a repeated unit feel like the same lesson replayed.
 if(mode!=='review')return shuffled(unitQuestions(p,p.course.unit,lang),rng).slice(0,n);
 const selected=DATA.tracks[p.course.track].questionIds.map(id=>ids.get(id));
 const rows=selected.map(q=>({q,rs:groupRecords(records,q.familyId)})).filter(x=>x.rs.some(y=>y.r.courseLearned||y.r.cor>0));
 rows.sort((a,b)=>{
  const due=x=>x.rs.map(y=>y.r.due||'9999').sort()[0];return due(a).localeCompare(due(b))||a.q.id-b.q.id;
 });
 return rows.slice(0,n).map(x=>translated(x.q,lang));
}
function createPlacement(p){
 ensureProfile(p);const track=p.course.track,b=band(p.ageBand),level=p.easy?1:b.start;
 const plans={early:[1,2,4,6,3],primary:[2,1,3,6,4],upper:[3,2,7,4,8],middle:[2,4,6,8,11],high:[2,3,7,8,9],adult:[2,6,8,9,11]};
 return {track,stage:level,min:p.easy?1:['middle','high','adult'].includes(track)?2:1,max:p.easy?2:b.max,streak:0,used:[],answers:[],total:5,unitPlan:plans[track]};
}
function pickPlacement(session,lang='ko',rng=Math.random){
 const i=session.answers.length;if(i>=5)throw Error('Placement is complete.');const unit=session.unitPlan[i];
 const candidates=DATA.questions.filter(q=>q.unit===unit&&q.difficulty===session.stage&&!session.used.some(id=>ids.get(id)?.familyId===q.familyId));
 if(!candidates.length)throw Error('No eligible Dokdo placement question. No legacy fallback.');
 const q=candidates[Math.min(candidates.length-1,Math.floor(rng()*candidates.length))];session.used.push(q.id);return translated(q,lang);
}
function recordPlacement(session,item,correct,skipped=false){
 if(!isActive(item.id)||session.answers.some(a=>a.id===item.id))return false;
 session.answers.push({id:item.id,stage:item.difficulty,unit:item.unit,correct:!!correct,skipped:!!skipped});
 if(!correct){session.stage=Math.max(session.min,session.stage-1);session.streak=0;}
 else if(++session.streak>=2){session.stage=Math.min(session.max,session.stage+1);session.streak=0;}
 return true;
}
function recommend(session){const correct=session.answers.filter(a=>a.correct);return Math.max(session.min,Math.min(session.max,correct.length?Math.round(correct.reduce((n,a)=>n+a.stage,0)/correct.length):session.min));}
function recommendUnit(session){return session.answers.find(a=>!a.correct)?.unit||DATA.tracks[session.track].startUnit;}
function courseEvidence(p,records,today){
 ensureProfile(p);const groups=DATA.tracks[p.course.track].questionIds.map(id=>ids.get(id).familyId);
 const count=groups.filter(g=>groupMastery(records,g).mastered).length;
 const completed=Object.keys(p.course.completed).filter(k=>k.startsWith(p.course.track+':')).length;
 // 다음 과정은 열두 단원을 마치면 열립니다. 예전에는 복습으로 개념 열두 개까지
 // 다져야 열렸는데, 그러면 단원을 다 끝낸 사람이 갈 곳이 없어 같은 문제만
 // 되풀이하게 됐습니다. 숙달(count)은 그대로 세어 화면에 보여 주되, 다음
 // 과정을 막는 조건으로는 쓰지 않습니다.
 return {count,concepts:count,total:groups.length,completed,mastered:count>=12,ready:completed>=12};
}
function completeUnit(p,unit,now=Date.now()){
 ensureProfile(p);if(!unitInfo(unit))throw Error('Unknown unit.');const key=p.course.track+':'+unit,first=!p.course.completed[key];
 p.course.completed[key]=p.course.completed[key]||new Date(now).toISOString();
 // 아직 마치지 않은 단원을 먼저 찾습니다.
 let next=null;for(let step=1;step<=12;step++){const u=(unit-1+step)%12+1;if(!p.course.completed[p.course.track+':'+u]){next=u;break;}}
 // 열두 단원을 모두 마친 사람은 예전에 이 자리에서 제자리에 묶였습니다. 다음
 // 단원이 없다고 같은 단원을 계속 돌려주면, 매번 똑같은 다섯 문제만 나오고
 // 앱 안에서 빠져나갈 길이 없었습니다. 다 마쳤으면 다음 단원으로 돌립니다.
 if(next===null)next=unit%12+1;
 p.course.unit=next;return first;
}
function advanceTrack(p,records){
 ensureProfile(p);if(!courseEvidence(p,records).ready)return false;const i=trackKeys.indexOf(p.course.track);if(i>=trackKeys.length-1)return false;
 p.course.track=trackKeys[i+1];p.course.unit=DATA.tracks[p.course.track].startUnit;return true;
}
return {DATA,VERSION,BANDS,STAGES,COG,DIFFICULTY,band,profile,valid,migrateProfile,ensureProfile,trackName,getQuestion,isActive,pool,unitInfo,unitQuestions,groupRecords,groupMastery,lesson,createPlacement,pickPlacement,recordPlacement,recommend,recommendUnit,courseEvidence,completeUnit,advanceTrack,shuffled};
});