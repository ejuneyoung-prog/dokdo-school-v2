const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../assets/app-model.js'),V=require('../assets/scene.js'),Core=M.Core,C=M.Course;
const NOW=Date.parse('2026-09-11T03:00:00Z');
const fresh=()=>M.fresh(NOW);
function heavy(){const s=fresh();s.name='Test learner';s.grade='PHD2';s.xp=18750;s.gcHit=50;s.passed=['M3'];
 for(let i=1;i<=1513;i++)s.m[i]={lv:i>1510?4:i%3+1,cor:3,att:3,seen:3,earned:20};return M.ensure(s,NOW);}
test('A real first visit starts at zero, never with a seeded animal or light',()=>{
 const s=fresh();assert.equal(M.summary(s).lights,0);assert.equal(s.gangchiVisits.length,0);assert.equal(s.gcHit,0);assert.equal(s.visual.birdVisit,null);
});
test('Unrewarded invite creates nothing and spends nothing',()=>{const s=fresh();assert.equal(Core.invite(s,NOW),0);assert.equal(s.gcHit,0);});
test('Ten newly earned credits create one 60-second visitor (v1.3 rule)',()=>{
 const s=fresh();M.selectProfile(s,'8-9',false);C.DATA.questions.filter(q=>q.difficulty===1).slice(0,10).forEach(q=>M.answer(s,C.getQuestion(q.id),true,{now:NOW}));assert.equal(s.gcHit,5);
 assert.equal(Core.invite(s,NOW,1),1);assert.equal(s.gangchiVisits[0].remainingMs,60000);assert.equal(s.gcHit,0);
});
test('Duplicate same-day answers cannot farm XP or invitation credits',()=>{
 const s=fresh(),q=C.pool(1)[0];M.answer(s,q,true,{now:NOW});const before=s.xp;
 assert.equal(M.answer(s,q,true,{now:NOW}).xp,0);assert.equal(s.xp,before);assert.equal(s.gcHit,0);assert.equal(s.visual.journey.earned,1);
});
test('Correction records understanding but no duplicate score or independent recall',()=>{
 const s=fresh(),q=C.pool(1)[0];M.answer(s,q,false,{now:NOW});
 M.answer(s,q,true,{retry:true,now:NOW});const r=s.m[q.id];
 assert.equal(s.xp,0);assert.equal(s.gcHit,0);assert.equal(r.cor,0);assert.equal(r.att,1);
 assert.equal(r.courseLearned,true);assert.equal((r.courseIndependentDays||[]).length,0);
 const before=JSON.stringify(s);M.answer(s,q,true,{retry:true,now:NOW});assert.equal(JSON.stringify(s),before);
});
test('An error preserves an already earned light',()=>{
 const s=fresh(),q=C.pool(1)[0];M.answer(s,q,true,{now:NOW});M.answer(s,q,false,{now:NOW});
 assert.equal(Core.visualLevel(s.m[q.id]),1);
});
test('Placement has no invitation or XP payout',()=>{
 const s=fresh();M.answer(s,C.pool(1)[0],true,{mode:'placement',now:NOW});assert.equal(s.gcHit,0);assert.equal(s.xp,0);
});
test('An explicit requested visitor count is respected',()=>{
 const s=heavy();assert.equal(Core.invite(s,NOW,3),3);assert.equal(s.gcHit,35);
});
test('Ten visitors are allowed and an eleventh consumes no credit',()=>{
 const s=heavy();assert.equal(Core.invite(s,NOW),10);s.gcHit=20;
 assert.equal(Core.invite(s,NOW+1),0);assert.equal(s.gcHit,20);
});
test('Invalid invite counts are not coerced into free or negative awards',()=>{
 const s=heavy();assert.equal(Core.invite(s,NOW,-3),0);assert.equal(Core.invite(s,NOW,Infinity),0);
});
test('New visits end at sixty seconds, not at ten minutes',()=>{
 const s=heavy();Core.invite(s,NOW,1);M.tick(s,59999,true);assert.equal(s.gangchiVisits.length,1);
 M.tick(s,1,true);assert.equal(s.gangchiVisits.length,0);
});
test('Hidden scenes and inactive windows do not spend remaining time',()=>{
 const s=heavy();Core.invite(s,NOW,1);M.tick(s,3600000,false);assert.equal(s.gangchiVisits[0].remainingMs,60000);
});
test('Previously saved ten-minute visitor time is never reduced by the visual update',()=>{
 const s=fresh();s.gangchiVisits=[{id:'old-1',seat:0,remainingMs:530000}];M.ensure(s,NOW);M.validate(s);
 assert.equal(s.gangchiVisits[0].remainingMs,530000);
});
test('Week boundary resets only the weekly tally and archives the previous week',()=>{
 const s=heavy();s.weekly.correct=40;s.weekly.eligible=20;const before=M.summary(s);
 Core.rollover(s,Date.parse('2026-09-13T15:00:00Z'));
 assert.equal(s.weekly.correct,0);assert.equal(s.weekly.history.at(-1).correct,40);
 assert.deepEqual(M.summary(s),before);
});
test('Clock rollback cannot erase a later week',()=>{
 const s=heavy();Core.rollover(s,Date.parse('2026-09-21T03:00:00Z'));const before=JSON.stringify(s.weekly);
 Core.rollover(s,NOW);assert.equal(JSON.stringify(s.weekly),before);
});
test('A 1,513-question backup preserves all counters and beacon records',()=>{
 const s=heavy(),out=M.parseImport(M.backupText(s,'ko',NOW),fresh(),NOW);
 assert.deepEqual(out.m,s.m);assert.deepEqual(M.summary(out),M.summary(s));
});
test('Restoring a lower-score backup is refused',()=>{
 const s=heavy(),old=M.clone(s);old.xp--;assert.throws(()=>M.parseImport(M.backupText(old,'ko',NOW),s,NOW));
});
test('A same-score backup cannot drop an individual question',()=>{
 const s=heavy(),old=M.clone(s);delete old.m[42];assert.throws(()=>M.parseImport(M.backupText(old,'ko',NOW),s,NOW));
});
test('A same-score backup cannot spend saved invitation credits',()=>{
 const s=heavy(),old=M.clone(s);old.gcHit--;assert.throws(()=>M.parseImport(M.backupText(old,'ko',NOW),s,NOW));
});
test('A chosen beacon slot cannot silently move during backup restore',()=>{
 const s=heavy();s.scene.beaconSlots[1513]=12;const old=M.clone(s);old.scene.beaconSlots[1513]=13;
 assert.throws(()=>M.parseImport(M.backupText(old,'ko',NOW),s,NOW));
});
test('Different names are not silently treated as the same profile',()=>{
 const s=heavy(),other=M.clone(s);other.name='Another learner';assert.throws(()=>M.parseImport(M.backupText(other,'ko',NOW),s,NOW));
});
test('Unknown future schemas are rejected rather than reset',()=>{
 const s=fresh();s.schemaVersion=999;assert.throws(()=>M.parseImport(JSON.stringify({format:'dokdo-school-backup',version:1,state:s,language:'ko'}),null,NOW));
});
test('Prototype pollution fields in JSON are rejected',()=>{
 assert.throws(()=>M.parseImport('{"format":"dokdo-school-backup","version":1,"language":"ko","state":{"m":{},"__proto__":{"polluted":true}}}',null,NOW));
 assert.equal({}.polluted,undefined);
});
test('Invalid bird records are rejected',()=>{
 const s=fresh();s.visual.birdVisit={event:'x',remainingMs:1e99};assert.throws(()=>M.validate(s));
});
test('An oversized backup is refused before deserializing',()=>assert.throws(()=>M.parseImport(' '.repeat(8000001),null,NOW)));
test('Unreadable persisted JSON is preserved and the editor becomes blocked',()=>{
 const storage=new M.MemoryStorage({[M.KEY]:'not-json'}),st=new M.Store(storage,{now:()=>NOW});
 assert.equal(st.load(),null);assert.equal(st.blocked,true);assert.equal(storage.getItem(M.KEY),'not-json');
});
test('Quota failure cannot replace a good profile with a fresh one',()=>{
 const raw=JSON.stringify(heavy()),storage=new M.MemoryStorage({[M.KEY]:raw}),st=new M.Store(storage,{now:()=>NOW});st.load();
 storage.setItem=()=>{throw Error('QuotaExceededError');};
 assert.throws(()=>st.transaction(s=>s.xp++));assert.equal(st.state.xp,18750);assert.equal(storage.getItem(M.KEY),raw);
});
test('Two stale tabs cannot overwrite a newer saved record',()=>{
 const mem=new M.MemoryStorage(),a=new M.Store(mem,{now:()=>NOW}),b=new M.Store(mem,{now:()=>NOW});a.load();b.load();
 a.transaction(s=>s.name='A');assert.throws(()=>b.transaction(s=>s.name='B'));assert.equal(b.blocked,true);assert.equal(JSON.parse(mem.getItem(M.KEY)).name,'A');
});
test('Legacy detection is read-only',()=>{
 const raw=JSON.stringify(heavy()),mem=new M.MemoryStorage({[M.OLD_KEYS[0]]:raw});
 assert.equal(M.legacyCandidates(mem).length,1);assert.equal(mem.getItem(M.OLD_KEYS[0]),raw);assert.equal(mem.getItem(M.KEY),null);
});
test('Explicit legacy import stores a separate copy without changing the original',()=>{
 const s=heavy(),raw=JSON.stringify(s),mem=new M.MemoryStorage({[M.OLD_KEYS[0]]:raw}),st=new M.Store(mem,{now:()=>NOW});st.load();
 st.importState(M.parseImport(Core.envelope(s,'ko',NOW)&&JSON.stringify(Core.envelope(s,'ko',NOW)),st.state,NOW),raw);
 assert.equal(mem.getItem(M.OLD_KEYS[0]),raw);assert.equal(st.state.m[1513].lv,4);assert.equal(mem.getItem(M.KEY+':before-import'),raw);
});
test('A failed source snapshot aborts import before any profile replacement',()=>{
 const mem=new M.MemoryStorage(),st=new M.Store(mem,{now:()=>NOW});st.load();mem.setItem=()=>{throw Error('full');};
 assert.throws(()=>st.importState(heavy(),'raw'));assert.equal(st.state.xp,0);
});
test('Age selection is mandatory before diagnostic routing',()=>assert.throws(()=>C.createPlacement({})));
test('Every low-primary diagnostic question is from the allowlisted easy pool',()=>{
 for(let k=0;k<20;k++){const p=C.profile('8-9'),session=C.createPlacement(p);for(let i=0;i<5;i++){
  const q=C.pickPlacement(session,'ko');assert.ok(q.cognitive<=2);assert.ok(q.choices.length>=2&&q.choices.length<=4);assert.ok(C.isActive(q.id));assert.equal(session.track,'early');
  C.recordPlacement(session,q,true);
 }}
});
test('Age edits preserve both past game grades and new learned stages',()=>{
 const s=heavy();M.selectProfile(s,'20+',false);s.learningProfile.stage=3;M.selectProfile(s,'8-9',true);
 assert.equal(s.grade,'PHD2');assert.equal(s.learningProfile.stage,3);
});
test('The new 240-question course is distinct from the unchanged original 1,513',()=>{
 assert.equal(C.DATA.questions.length,240);assert.equal(C.DATA.legacyBankEligible,false);
 assert.equal(C.DATA.questions.some(q=>q.id===1115),false);
});
test('Three completed units earn a progress celebration, not a new school grade',()=>{
 const s=heavy();M.selectProfile(s,'8-9',false);let result;
 for(const unit of [1,2,3]){
  s.learningProfile.course.unit=unit;const items=C.lesson(s.learningProfile,s.m);
  items.forEach(q=>M.answer(s,q,true,{now:NOW}));result=M.finish(s,NOW,items);
 }
 assert.equal(result.advanced,true);assert.equal(s.grade,'PHD2');assert.ok(s.visual.unlocks['stage-1']);
 assert.equal(C.courseEvidence(s.learningProfile,s.m).count,0);
});
test('An ordinary lesson does not invent a bird reward',()=>{
 const s=fresh();M.selectProfile(s,'8-9',false);M.finish(s,NOW);assert.equal(Object.keys(s.visual.unlocks).length,0);
});
test('A bird encounter unlock is idempotent and replay adds no new achievement',()=>{
 const s=fresh();assert.equal(M.unlock(s,'stage-1',NOW),true);assert.equal(M.unlock(s,'stage-1',NOW+1),false);
 const before=JSON.stringify(s.visual.unlocks);assert.equal(M.replayBirds(s),true);assert.equal(JSON.stringify(s.visual.unlocks),before);
});
test('Bird visit is 24 seconds and journal discovery remains afterwards',()=>{
 const s=fresh();M.unlock(s,'stage-1',NOW);M.tick(s,24000,true);assert.equal(s.visual.birdVisit,null);assert.equal(Object.keys(s.visual.unlocks).length,1);
});
test('Undiscovered birds cannot be replayed',()=>assert.equal(M.replayBirds(fresh()),false));
test('Untrusted profile text remains data, not executable content',()=>{
 const s=fresh();s.name='<img src=x onerror=alert(1)>';M.validate(s);assert.equal(M.parseImport(M.backupText(s),fresh(),NOW).name,s.name);
});
test('All 1,513 lights have positions; no 240-light display cap',()=>{
 const s=heavy();const p=V.lightPositions(s);assert.equal(p.length,1513);assert.equal(new Set(p.map(x=>x.id)).size,1513);
});
test('Appending a new light never reorders prior positions',()=>{
 const s=heavy(),before=V.lightPositions(s);s.m[900001]={lv:1,cor:1};M.ensure(s,NOW);
 assert.deepEqual(V.lightPositions(s).slice(0,1513),before);
});
test('Light anchors stay within their artwork island silhouettes',()=>{
 const s=heavy();for(const p of V.lightPositions(s))assert.ok(V.inside([p.x,p.y],p.island?V.ART.east:V.ART.west));
});
test('All ten visitors use the inter-island channel and avoid land with body clearance',()=>{
 const s=heavy();Core.invite(s,NOW);
 for(let t=0;t<150;t+=.5)for(const g of V.gangchiPositions(s,t)){
  assert.ok(g.x>620&&g.x<900);assert.ok(g.y>200&&g.y<565);assert.ok(V.landDistance([g.x,g.y])>=20);
 }
});
test('No birds or seals are drawn as live rewards for a new profile',()=>{
 assert.equal(V.gangchiPositions(fresh(),0).length,0);assert.equal(V.birdPositions(fresh(),0).length,0);
});
test('Deployed module exactly matches the newly authored JSON, not the old pilot',()=>{
 const data=require('../data/course-v2.json');assert.deepEqual(C.DATA,data);
 const old=require('../archive/retired-48-pilot.json');assert.equal(old.questions.length,48);
 assert.ok(old.questions.every(q=>!C.isActive(q.id)));
});

test('Attendance shelter from the previous app is preserved and used',()=>{
 const s=fresh();s.streak=7;s.shelter=1;s.lastDay='2026-09-09';M.selectProfile(s,'20+',false);
 M.answer(s,C.pool(2)[0],true,{now:NOW});assert.equal(s.streak,8);assert.equal(s.shelter,0);
});
test('A missing legacy attendance date does not erase the stored streak',()=>{
 const s=heavy();s.streak=7;delete s.lastDay;M.selectProfile(s,'20+',false);
 M.answer(s,C.pool(2)[0],true,{now:NOW});assert.equal(s.streak,7);
});
test('Explicit recovery preserves unreadable original bytes before restoring a valid backup',()=>{
 const mem=new M.MemoryStorage({[M.KEY]:'broken-raw'}),st=new M.Store(mem,{now:()=>NOW});st.load();
 st.recoverState(heavy());assert.equal(mem.getItem(M.KEY+':before-recovery'),'broken-raw');
 assert.equal(st.state.xp,18750);assert.equal(st.blocked,false);
});
test('Recovery cannot be used to bypass a valid competing tab',()=>{
 const mem=new M.MemoryStorage(),st=new M.Store(mem,{now:()=>NOW});st.load();st.blocked=true;
 assert.throws(()=>st.recoverState(heavy()));
});
test('A previous different recovery snapshot is never silently overwritten',()=>{
 const mem=new M.MemoryStorage({[M.KEY]:'broken', [M.KEY+':before-recovery']:'older-broken'}),st=new M.Store(mem,{now:()=>NOW});st.load();
 assert.throws(()=>st.recoverState(heavy()));assert.equal(mem.getItem(M.KEY),'broken');assert.equal(mem.getItem(M.KEY+':before-recovery'),'older-broken');
});

test('Reduced-motion bird positions stay fixed while the viewing budget changes',()=>{
 const s=fresh();M.unlock(s,'stage-1',NOW);const before=V.birdPositions(s,0,true);
 M.tick(s,5000,true);assert.deepEqual(V.birdPositions(s,0,true),before);
});
test('An old English backup keeps its UI language in the shared new client',()=>{
 const s=heavy();delete s.visual;const raw=JSON.stringify(Core.envelope(s,'en',NOW));
 assert.equal(M.parseImport(raw,fresh(),NOW).visual.language,'en');
});
test('Gangchi do not visibly teleport at coastline avoidance boundaries',()=>{
 const s=heavy();Core.invite(s,NOW);let prev=V.gangchiPositions(s,0),jump=0;
 for(let k=1;k<=4500;k++){const next=V.gangchiPositions(s,k/30);for(let i=0;i<next.length;i++)jump=Math.max(jump,Math.hypot(next[i].x-prev[i].x,next[i].y-prev[i].y));prev=next;}
 assert.ok(jump<5,'maximum per-frame jump='+jump);
});

test('Easy practice is separate from the preserved earned stage',()=>{
 const s=fresh();M.selectProfile(s,'20+',false);s.learningProfile.stage=3;
 M.selectProfile(s,'8-9',true);assert.equal(s.learningProfile.stage,3);assert.equal(s.learningProfile.course.track,'early');
});
test('An invalid practice route is rejected on import',()=>{
 const s=fresh();M.selectProfile(s,'20+',false);s.learningProfile.practiceStage=99;assert.throws(()=>M.validate(s));
});

test('Malformed review-day data cannot break course rendering after import',()=>{
 const s=fresh();s.m[900001]={cor:1,pilotIndependentDays:'not-an-array'};
 assert.throws(()=>M.validate(s));
});
test('Non-string due dates cannot break review sorting',()=>{
 const s=fresh();s.m[900001]={cor:1,due:{day:12}};assert.throws(()=>M.validate(s));
});
test('A completed-course string is rejected instead of failing after the last answer',()=>{
 const s=fresh();M.selectProfile(s,'20+',false);s.learningProfile.completed='done';assert.throws(()=>M.validate(s));
});
test('An animation cannot claim an unrecorded bird event',()=>{
 const s=fresh();s.visual.birdVisit={event:'stage-1',remainingMs:24000};assert.throws(()=>M.validate(s));
});
