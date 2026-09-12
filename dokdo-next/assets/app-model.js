/* Dokdo visual release. No production API and no writes to legacy keys.
 * New awards use 60 seconds. Imported old visitor time is preserved, not cut.
 */
(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./dokdo-core.js'):root.DokdoCore,
                    typeof module==='object'&&module.exports?require('./starter-course.js'):root.DokdoStarter);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.DokdoAppModel=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Core,Course){
'use strict';
const KEY='dokdo-korea-school-cinematic-v1';
const OLD_KEYS=['dokdo-korea-school-v2','dokdo-korea-school-v2-en-expanded-preview'];
const VERSION='1.3.0';
const Journey=typeof module==='object'&&module.exports?require('./journey.js'):globalThis.DokdoJourney;
const clone=Core.clone;
function fresh(now=Date.now()){
 return ensure(Core.ensure({name:'',nick:'',flag:'KR',school:'',grade:'K',xp:0,streak:0,
  gcHit:0,run:0,best:0,started:false,passed:[],badgesEver:[],recent:[],recentG:[],
  lastDay:'',m:{}},now),now);
}
function ensure(s,now=Date.now()){
 Core.ensure(s,now);
 if(s.learningProfile && s.learningProfile.completed==null)s.learningProfile.completed={};
 if(s.learningProfile)Course.ensureProfile(s.learningProfile);
 if(!s.visual)s.visual={version:1,unlocks:{},birdVisit:null,birdsEnabled:true,reduceMotion:false,language:'ko',geometry:'art-v1'};
 if(s.visual.language!=='en')s.visual.language='ko';
 if(s.visual.birdsEnabled===undefined)s.visual.birdsEnabled=true;
 if(s.visual.reduceMotion===undefined)s.visual.reduceMotion=false;
 Journey.ensure(s);validate(s);return s;
}
function strictDate(d){return typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;}
function validate(s){
 Core.validateState(s);Journey.validate(s);
 for(const r of Object.values(s.m)){
  if(r.courseIndependentDays!=null&&(!Array.isArray(r.courseIndependentDays)||r.courseIndependentDays.length>4000||new Set(r.courseIndependentDays).size!==r.courseIndependentDays.length||r.courseIndependentDays.some(d=>!strictDate(d))))throw Error('Invalid course evidence dates.');
  if(r.courseLearned!=null&&typeof r.courseLearned!=='boolean')throw Error('Invalid learned marker.');
  for(const k of ['courseFirstDay','courseRewardDay'])if(r[k]!=null&&!strictDate(r[k]))throw Error('Invalid course date.');
  if(r.due!=null && r.due!=='' && (typeof r.due!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(r.due)))throw Error('Invalid review date.');
  if(r.pilotIndependentDays!=null && (!Array.isArray(r.pilotIndependentDays)||r.pilotIndependentDays.length>4000||r.pilotIndependentDays.some(d=>typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d))))throw Error('Invalid independent review days.');
 }
 if(s.learningProfile?.completed!=null && (typeof s.learningProfile.completed!=='object'||Array.isArray(s.learningProfile.completed)))throw Error('Invalid completed-course record.');
 if(s.learningProfile && (!Course.valid(s.learningProfile) || (s.learningProfile.practiceStage!=null && (!Number.isInteger(s.learningProfile.practiceStage)||s.learningProfile.practiceStage<1||s.learningProfile.practiceStage>4))))throw Error('Invalid learning profile.');
 if(s.visual!=null){
  const v=s.visual;
  if(!v||v.version!==1||!v.unlocks||Array.isArray(v.unlocks)||typeof v.unlocks!=='object')throw Error('Unsupported visual record.');
  if(!['ko','en'].includes(v.language)||typeof v.birdsEnabled!=='boolean'||typeof v.reduceMotion!=='boolean')throw Error('Invalid visual settings.');
  for(const [k,r] of Object.entries(v.unlocks)){
   if(!/^(stage-[1-4]|ecology-1)$/.test(k)||!r||typeof r.at!=='string'||r.species!=='black-tailed-gull')throw Error('Invalid bird journal.');
  }
  if(v.birdVisit!=null&&(!Number.isFinite(v.birdVisit.remainingMs)||v.birdVisit.remainingMs<=0||v.birdVisit.remainingMs>24000||typeof v.birdVisit.event!=='string'||!v.unlocks[v.birdVisit.event]))throw Error('Invalid bird visit.');
 }
 return true;
}
function summary(s){
 return {name:s.name||s.nick||'',questions:Object.keys(s.m).length,correct:Core.correctCount(s),
   xp:s.xp||0,lights:Object.values(s.m).filter(r=>Core.visualLevel(r)>0).length,
   beacons:Object.values(s.m).filter(r=>Core.visualLevel(r)===4).length,
   credits:Math.floor((s.gcHit||0)/5),visitors:(s.gangchiVisits||[]).length,
   stage:s.learningProfile?.stage||0,grade:s.grade||'K'};
}
function activity(s,now){
 const d=Core.dayKey(now);if(s.lastDay===d || (s.lastDay && s.lastDay>d))return;
 if(!s.lastDay)s.streak=Math.max(1,s.streak||0);
 else if(s.lastDay===Core.addDays(d,-1))s.streak=(s.streak||0)+1;
 else if(s.lastDay===Core.addDays(d,-2)&&(s.shelter||0)>0){s.shelter--;s.streak=(s.streak||0)+1;s.sheltered=true;}
 else s.streak=1;
 s.lastDay=d;
}
function selectProfile(s,age,easy,now=Date.now()){
 // Age is an entry guide. Editing it cannot downgrade an earned stage or legacy grade.
 const old=s.learningProfile,next=Course.profile(age,easy,old);
 next.practiceStage=next.stage;
 if(old)next.stage=Math.max(old.stage,next.stage);
 s.learningProfile=next;s.started=true;return next;
}
function answer(s,item,ok,{mode='daily',retry=false,skipped=false,helped=false,now=Date.now()}={}){
 ensure(s,now);
 if(!Course.isActive(item.id))throw Error('This question is not part of the active curriculum.');
 if(mode==='placement'||skipped)return {xp:0,independent:false};
 const day=Core.dayKey(now),family=Course.getQuestion(item.id).familyId;
 const prior=Course.groupRecords(s.m,family);
 if(retry){
  const r=s.m[item.id];if(!r||!r.att)throw Error('A correction requires an earlier attempt.');
  if(ok){r.courseLearned=true;r.courseFirstDay=r.courseFirstDay||day;r.lightBest=Math.max(1,r.lightBest||0);Core.ensure(s,now);}
  return {xp:0,independent:false};
 }
 const due=prior.some(({r})=>r.courseLearned&&r.courseFirstDay<day&&(!r.due||r.due<=day));
 const alreadyReviewed=prior.some(({r})=>(r.courseIndependentDays||[]).includes(day));
 const paid=prior.some(({r})=>r.courseRewardDay===day);
 const r=s.m[item.id]||(s.m[item.id]={lv:0,cor:0,att:0,seen:0,earned:0});
 r.att=(r.att||0)+1;r.seen=(r.seen||0)+1;if(ok)r.cor=(r.cor||0)+1;
 const independent=mode==='review'&&ok&&due&&!alreadyReviewed&&!helped;
 const w=Core.rollover(s,now),weeklyBefore=w.eligible,groupCredit=day+':'+family,credited=!!w.credits[groupCredit];
 Core.advanceLearning(s,item.id,ok,!independent,now);
 if(ok&&Core.weekKey(now)===w.key){delete w.credits[day+':'+item.id];w.credits[groupCredit]=true;w.eligible=weeklyBefore+(credited?0:1);}
 if(ok){r.courseLearned=true;r.courseFirstDay=r.courseFirstDay||day;}
 if(independent){r.courseIndependentDays=r.courseIndependentDays||[];r.courseIndependentDays.push(day);}
 let xp=0;if(ok&&!paid){xp=10;r.courseRewardDay=day;r.earned=(r.earned||0)+xp;s.xp=(s.xp||0)+xp;Journey.earned(s);}
 s.recent=[item.id,...(s.recent||[]).filter(x=>x!==item.id)].slice(0,24);activity(s,now);
 return {xp,independent};
}
function unlock(s,key,now=Date.now()){
 ensure(s,now);
 if(!/^(stage-[1-4]|ecology-1)$/.test(key))throw Error('Invalid achievement.');
 if(s.visual.unlocks[key])return false;
 s.visual.unlocks[key]={at:new Date(now).toISOString(),species:'black-tailed-gull'};
 if(s.visual.birdsEnabled)s.visual.birdVisit={event:key,remainingMs:24000};
 return true;
}
function finish(s,now=Date.now(),items=[]){
 if(!Course.valid(s.learningProfile))throw Error('Age selection required.');
 Course.ensureProfile(s.learningProfile);const p=s.learningProfile;
 let completed=false,unit=null;
 if(items.length){
  items=items.map(q=>Course.getQuestion(q.id));
  if(items.length!==5||new Set(items.map(q=>q.familyId)).size!==5||new Set(items.map(q=>q.unit)).size!==1||items.some(q=>!Course.isActive(q.id)||!s.m[q.id]?.courseLearned))throw Error('Five understood questions from one unit are required.');
  unit=items[0].unit;completed=Course.completeUnit(p,unit,now);
 }
 const e=Course.courseEvidence(p,s.m,Core.dayKey(now));
 const tier=Math.min(4,Math.floor(e.completed/3));
 let advanced=false;
 if(completed&&tier>0)advanced=unlock(s,'stage-'+tier,now)||advanced;
 if(completed&&(unit===4||unit===5))unlock(s,'ecology-1',now);
 p.stage=Math.max(p.stage,Math.max(1,tier));activity(s,now);
 return {advanced,stage:p.stage,evidence:e,unit,completed,nextUnit:p.course.unit};
}
function tick(s,ms,visible){
 if(!visible||!Number.isFinite(ms)||ms<=0)return;
 Core.tickVisits(s,ms,true);
 const v=s.visual.birdVisit;
 if(v){v.remainingMs-=ms;if(v.remainingMs<=0)s.visual.birdVisit=null;}
}
function replayBirds(s){
 if(!Object.keys(s.visual.unlocks).length)return false;
 s.visual.birdsEnabled=true;s.visual.birdVisit={event:Object.keys(s.visual.unlocks)[0],remainingMs:24000};return true;
}
function backupText(s,lang=s.visual.language,now=Date.now()){
 validate(s);return JSON.stringify(Core.envelope(s,lang,now),null,2);
}
function parseImport(text,current,now=Date.now(),allowRaw=false){
 if(typeof text!=='string'||text.length>8000000)throw Error('Backup exceeds 8 MB.');
 let d=JSON.parse(text);
 if(allowRaw&&d.m)d=Core.envelope(d,current?.visual?.language||'ko',now);
 const incoming=Core.readBackup(JSON.stringify(d),current,now);
 Journey.protects(incoming,current);ensure(incoming,now);
 if(!d.state?.visual)incoming.visual.language=d.language;
 if(current?.learningProfile?.course){
  const old=current.learningProfile.course, fresh=incoming.learningProfile?.course;
  if(!fresh)throw Error('This backup would lose the course record.');
  for(const k of Object.keys(old.completed))if(!fresh.completed[k])throw Error('This backup would lose a completed unit.');
 }
 if(current)for(const [id,r] of Object.entries(current.m)){
  const n=incoming.m[id];
  if(r.courseLearned&&!n?.courseLearned)throw Error('This backup would lose understood content.');
  if((r.courseIndependentDays||[]).some(d=>!(n?.courseIndependentDays||[]).includes(d)))throw Error('This backup would lose delayed-review evidence.');
 }
 if(current?.visual){
  for(const k of Object.keys(current.visual.unlocks||{}))if(!incoming.visual.unlocks[k])throw Error('This backup would lose a bird discovery.');
  const a=current.visual.birdVisit,b=incoming.visual.birdVisit;
  if(a&&(!b||a.event!==b.event||b.remainingMs<a.remainingMs))throw Error('This backup would lose active bird time.');
 }
 return incoming;
}
function legacyCandidates(storage){
 const found=[];
 for(const key of OLD_KEYS){
  let raw=null;
  try{raw=storage.getItem(key);if(!raw)continue;const parsed=JSON.parse(raw);Core.validateState(parsed);
   const s=ensure(clone(parsed));found.push({key,raw,state:s,summary:summary(s),error:null});
  }catch(e){if(raw)found.push({key,raw,error:String(e.message||e)});}
 }
 return found;
}
class MemoryStorage{
 constructor(seed={}){this.data=new Map(Object.entries(seed));}
 getItem(k){return this.data.has(k)?this.data.get(k):null;}
 setItem(k,v){this.data.set(k,String(v));}
 removeItem(k){this.data.delete(k);}
}
class Store{
 constructor(storage,{key=KEY,now=()=>Date.now()}={}){
  this.storage=storage;this.key=key;this.now=now;this.state=null;this.expected=null;this.blocked=false;this.error='';this.lastSaved=null;
 }
 load(){
  let raw=null;
  try{
   raw=this.storage.getItem(this.key);this.expected=raw;
   if(!raw){this.state=fresh(this.now());return this.state;}
   const parsed=JSON.parse(raw);validate(parsed);
   this.state=ensure(parsed,this.now());return this.state;
  }catch(e){
   this.blocked=true;this.error=String(e.message||e);
   // A damaged or future record is NEVER presented as a new writable profile.
   this.state=null;this.raw=raw;return null;
  }
 }
 save(next=this.state){
  if(this.blocked||!next)return false;
  try{
   validate(next);
   if(this.storage.getItem(this.key)!==this.expected){this.blocked=true;throw Error('CONFLICT: another tab changed this record.');}
   const serialized=JSON.stringify(next);
   if(serialized===this.expected){this.state=next;return true;}
   // Only one rolling recovery snapshot. No unbounded snapshots filling storage.
   if(this.expected!==null)this.storage.setItem(this.key+':last-good',this.expected);
   if(this.storage.getItem(this.key)!==this.expected){this.blocked=true;throw Error('CONFLICT: another tab changed this record.');}
   this.storage.setItem(this.key,serialized);
   if(this.storage.getItem(this.key)!==serialized){this.blocked=true;throw Error('CONFLICT: storage changed during saving.');}
   this.expected=serialized;this.state=next;this.lastSaved=this.now();this.error='';return true;
  }catch(e){this.error=String(e.message||e);return false;}
 }
 transaction(change){
  if(this.blocked||!this.state)throw Error(this.error||'Record protection is active.');
  const candidate=clone(this.state);
  const result=change(candidate);
  if(!this.save(candidate))throw Error(this.error);
  return result;
 }
 recovery(){
  let raw=this.raw||null;
  try{raw=this.storage.getItem(this.key)||raw;}catch(ignore){}
  return JSON.stringify({format:'dokdo-conflict-recovery',version:1,exportedAt:new Date(this.now()).toISOString(),
    persistedRaw:raw,memory:this.state,reason:this.error},null,2);
 }
 recoverState(next){
  if(this.state!==null)throw Error('Reload a valid record before resolving a write conflict.');
  validate(next);
  const raw=this.storage.getItem(this.key);
  if(raw!==this.expected)throw Error('The damaged record changed. Reload before recovery.');
  // Preserve the exact damaged bytes before replacing them. No silent reset.
  const recoveryKey=this.key+':before-recovery';
  const previous=this.storage.getItem(recoveryKey);
  if(previous!==null && previous!==raw)throw Error('A previous recovery copy exists. Export both before another recovery.');
  if(raw!==null)this.storage.setItem(recoveryKey,raw);
  const oldBlocked=this.blocked;this.blocked=false;
  if(!this.save(next)){this.blocked=oldBlocked;throw Error(this.error);}
  this.state=next;this.raw=null;return next;
 }
 importState(next,sourceRaw=null){
  if(this.blocked)throw Error(this.error);
  validate(next);
  if(this.storage.getItem(this.key)!==this.expected)throw Error('CONFLICT: reload before importing.');
  const original=sourceRaw||this.expected;
  if(original!==null)this.storage.setItem(this.key+':before-import',original);
  if(!this.save(next))throw Error(this.error);
  return next;
 }
}
return {VERSION,KEY,OLD_KEYS,Core,Course,Journey,fresh,ensure,validate,summary,selectProfile,answer,finish,unlock,
        tick,replayBirds,backupText,parseImport,legacyCandidates,Store,MemoryStorage,clone};
});
