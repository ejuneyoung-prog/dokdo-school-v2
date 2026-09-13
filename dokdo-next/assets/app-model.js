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
 return ensure(Core.ensure({name:'',nick:'',flag:'KR',school:'',schoolCat:'',recoveryCode:'',introDay:'',introOff:false,grade:'K',xp:0,streak:0,
  gcHit:0,gcSummons:0,run:0,best:0,started:false,passed:[],badgesEver:[],recent:[],recentG:[],
  lastDay:'',m:{}},now),now);
}
function ensure(s,now=Date.now()){
 Core.ensure(s,now);
 if(s.flag==null)s.flag='KR';if(s.school==null)s.school='';if(s.schoolCat==null)s.schoolCat='';if(s.recoveryCode==null)s.recoveryCode='';if(s.introDay==null)s.introDay='';if(s.introOff==null)s.introOff=false;if(s.gcSummons==null)s.gcSummons=0;
 /* Highest level already celebrated. An existing record starts at the level it
  * is already on, so nobody is congratulated on a promotion they earned long
  * ago the first time they open the new build. */
 if(!Number.isSafeInteger(s.seenLevel)||s.seenLevel<0)s.seenLevel=Core.gradeProgress(Core.gradeScore(s)).rank+1;
 if(typeof s.topReported!=='boolean')s.topReported=false;
 if(s.learningProfile && s.learningProfile.completed==null)s.learningProfile.completed={};
 if(s.learningProfile)Course.ensureProfile(s.learningProfile);
 if(!s.visual)s.visual={version:1,unlocks:{},birdVisit:null,birdsEnabled:true,reduceMotion:false,language:'ko',geometry:'art-v1'};
 if(s.visual.language!=='en')s.visual.language='ko';
 if(s.visual.birdsEnabled===undefined)s.visual.birdsEnabled=true;
 if(s.visual.reduceMotion===undefined)s.visual.reduceMotion=false;
 // 새 떼·돌고래 떼는 레벨만큼 커집니다. visual이 준비된 뒤에 채웁니다.
 s.visual.birdFlock=Core.gradeProgress(Core.gradeScore(s)).rank+1;
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
  if(v.birdVisit!=null&&(!Number.isFinite(v.birdVisit.remainingMs)||v.birdVisit.remainingMs<=0||v.birdVisit.remainingMs>60000||typeof v.birdVisit.event!=='string'||!v.unlocks[v.birdVisit.event]))throw Error('Invalid bird visit.');
 }
 return true;
}
function summary(s){
 return {name:s.name||s.nick||'',questions:Object.keys(s.m).length,correct:Core.correctCount(s),gradeScore:Core.gradeScore(s),
   xp:s.xp||0,lights:Object.values(s.m).filter(r=>Core.visualLevel(r)>0).length,
   beacons:Object.values(s.m).filter(r=>Core.visualLevel(r)===4).length,
   credits:Math.floor((s.gcHit||0)/5),visitors:(s.gangchiVisits||[]).length,gcSummons:s.gcSummons||0,streak:s.streak||0,
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
  // 해설을 읽고 고쳐 맞힌 답은 점수도 불빛도 주지 않습니다. 이해했다는
  // 표시만 남기고, 불빛은 다음에 처음부터 맞혔을 때 켜집니다. 이미 켜 둔
  // 불빛은 그대로 둡니다.
  if(ok){r.courseLearned=true;r.courseFirstDay=r.courseFirstDay||day;Core.ensure(s,now);}
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
 if(s.visual.birdsEnabled)s.visual.birdVisit={event:key,remainingMs:60000};
 Core.celebrateVisit(s,now);
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
 s.visual.birdsEnabled=true;s.visual.birdVisit={event:Object.keys(s.visual.unlocks)[0],remainingMs:60000};return true;
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
function num(x){return Number.isFinite(x)&&x>=0?x:0;}
function unionArr(a,b){return Array.from(new Set([...(a||[]),...(b||[])]));}
/* BETA: matches by nickname alone (no 4-digit code) and combines two
 * devices' progress instead of one replacing the other, since the same
 * learner's name recurring across devices/browsers turned out to be the
 * common case, not an impostor. Per-question fields take the higher side
 * (never summed, so answering the same question on both devices cannot
 * double the reward); xp is then recomputed from the merged per-question
 * totals rather than adding the two xp totals directly, for the same
 * reason. Anything not explicitly merged below (scene layout, active
 * gangchi visits, this week's tally) is left as the current device's own,
 * unaffected by the incoming record.
 */
function mergeStates(current,incomingText,now=Date.now()){
 const data=JSON.parse(incomingText);
 if(data.format!=='dokdo-school-backup'||data.version!==1)throw Error('Unknown backup format.');
 if(!['ko','en'].includes(data.language))throw Error('Invalid backup language.');
 Core.validateState(data.state);
 const incoming=ensure(clone(data.state),now);
 validate(incoming);
 const merged=clone(current);
 const ids=new Set([...Object.keys(current.m||{}),...Object.keys(incoming.m||{})]);
 merged.m={};
 for(const id of ids){
  const a=current.m?.[id],b=incoming.m?.[id];
  if(a&&!b){merged.m[id]=clone(a);continue;}
  if(b&&!a){merged.m[id]=clone(b);continue;}
  const r={};
  for(const k of ['lv','att','cor','seen','earned','lightBest'])r[k]=Math.max(num(a[k]),num(b[k]));
  r.courseLearned=!!(a.courseLearned||b.courseLearned);
  if(a.courseRewardDay||b.courseRewardDay)r.courseRewardDay=[a.courseRewardDay,b.courseRewardDay].filter(Boolean).sort().pop();
  if(a.courseFirstDay||b.courseFirstDay)r.courseFirstDay=[a.courseFirstDay,b.courseFirstDay].filter(Boolean).sort()[0];
  r.courseIndependentDays=unionArr(a.courseIndependentDays,b.courseIndependentDays);
  r.pilotIndependentDays=unionArr(a.pilotIndependentDays,b.pilotIndependentDays);
  const winner=(num(a.lv)+num(a.cor))>=(num(b.lv)+num(b.cor))?a:b;
  if(winner.due!=null)r.due=winner.due;
  if(winner.lastAdvancedDay!=null)r.lastAdvancedDay=winner.lastAdvancedDay;
  if(winner.lastAnsweredAt!=null)r.lastAnsweredAt=winner.lastAnsweredAt;
  merged.m[id]=r;
 }
 merged.xp=Object.values(merged.m).reduce((sum,r)=>sum+num(r.earned),0);
 for(const k of ['gcHit','gcSummons','streak','best'])merged[k]=Math.max(num(current[k]),num(incoming[k]));
 merged.passed=unionArr(current.passed,incoming.passed);
 merged.badgesEver=unionArr(current.badgesEver,incoming.badgesEver);
 merged.visual=merged.visual||{};
 merged.visual.unlocks=Object.assign({},incoming.visual?.unlocks,current.visual?.unlocks);
 merged.visual.journey={version:1,
  legacy:Math.max(num(current.visual?.journey?.legacy),num(incoming.visual?.journey?.legacy)),
  earned:Math.max(num(current.visual?.journey?.earned),num(incoming.visual?.journey?.earned)),
  inviteRemainder:num(current.visual?.journey?.inviteRemainder)};
 if(incoming.learningProfile){
  if(!current.learningProfile||incoming.learningProfile.stage>current.learningProfile.stage){
   const keepCompleted=current.learningProfile?current.learningProfile.completed:{};
   merged.learningProfile=clone(incoming.learningProfile);
   merged.learningProfile.completed=Object.assign({},keepCompleted,incoming.learningProfile.completed);
  }else{
   merged.learningProfile.completed=Object.assign({},incoming.learningProfile.completed,current.learningProfile.completed);
  }
 }
 merged.scene=merged.scene||{version:1,order:[],beaconSlots:{}};
 merged.scene.beaconSlots=Object.assign({},incoming.scene?.beaconSlots,current.scene?.beaconSlots);
 return ensure(merged,now);
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
// Every threshold below reads directly off summary()/state fields that already
// persist and only ever grow -- no separate "earned at" bookkeeping needed.
const BADGES=[
 {id:'c1',icon:'🌱',ko:'첫 정답',en:'First Correct Answer',need:a=>a.correct>=1},
 {id:'c10',icon:'🌿',ko:'정답 10회',en:'10 Correct Answers',need:a=>a.correct>=10},
 {id:'c50',icon:'🍀',ko:'정답 50회',en:'50 Correct Answers',need:a=>a.correct>=50},
 {id:'c100',icon:'🌳',ko:'정답 100회',en:'100 Correct Answers',need:a=>a.correct>=100},
 {id:'c250',icon:'🏵️',ko:'정답 250회',en:'250 Correct Answers',need:a=>a.correct>=250},
 {id:'c500',icon:'🎖️',ko:'정답 500회',en:'500 Correct Answers',need:a=>a.correct>=500},
 {id:'l1',icon:'✨',ko:'첫 불빛',en:'First Light',need:a=>a.lights>=1},
 {id:'l10',icon:'💫',ko:'불빛 10개',en:'10 Lights',need:a=>a.lights>=10},
 {id:'l50',icon:'🌟',ko:'불빛 50개',en:'50 Lights',need:a=>a.lights>=50},
 {id:'l100',icon:'⭐',ko:'불빛 100개',en:'100 Lights',need:a=>a.lights>=100},
 {id:'l250',icon:'🌠',ko:'불빛 250개',en:'250 Lights',need:a=>a.lights>=250},
 {id:'l500',icon:'🌌',ko:'불빛 500개',en:'500 Lights',need:a=>a.lights>=500},
 {id:'b1',icon:'🔥',ko:'첫 봉화',en:'First Beacon',need:a=>a.beacons>=1},
 {id:'b3',icon:'🕯️',ko:'봉화 3개',en:'3 Beacons',need:a=>a.beacons>=3},
 {id:'b10',icon:'🚨',ko:'봉화 10개',en:'10 Beacons',need:a=>a.beacons>=10},
 {id:'b25',icon:'🗼',ko:'봉화 25개',en:'25 Beacons',need:a=>a.beacons>=25},
 {id:'b50',icon:'🏛️',ko:'봉화 50개',en:'50 Beacons',need:a=>a.beacons>=50},
 {id:'g1',icon:'🦭',ko:'강치 부르기 1회',en:'Called Gangchi Once',need:a=>a.gcSummons>=1},
 {id:'g5',icon:'🐚',ko:'강치 부르기 5회',en:'Called Gangchi 5 Times',need:a=>a.gcSummons>=5},
 {id:'g10',icon:'🌊',ko:'강치 부르기 10회',en:'Called Gangchi 10 Times',need:a=>a.gcSummons>=10},
 {id:'g25',icon:'🏝️',ko:'강치 부르기 25회',en:'Called Gangchi 25 Times',need:a=>a.gcSummons>=25},
 {id:'s3',icon:'📅',ko:'3일 연속 출석',en:'3-Day Streak',need:a=>a.streak>=3},
 {id:'s7',icon:'🗓️',ko:'7일 연속 출석',en:'7-Day Streak',need:a=>a.streak>=7},
 {id:'s14',icon:'📆',ko:'14일 연속 출석',en:'14-Day Streak',need:a=>a.streak>=14},
 {id:'s30',icon:'🏆',ko:'30일 연속 출석',en:'30-Day Streak',need:a=>a.streak>=30},
 {id:'s100',icon:'👑',ko:'100일 연속 출석',en:'100-Day Streak',need:a=>a.streak>=100},
 {id:'st2',icon:'📘',ko:'학습 2단계 도약',en:'Reached Stage 2',need:a=>a.stage>=2},
 {id:'st3',icon:'📗',ko:'학습 3단계 도약',en:'Reached Stage 3',need:a=>a.stage>=3},
 {id:'st4',icon:'🎓',ko:'학습 4단계 완성',en:'Reached Stage 4',need:a=>a.stage>=4},
 {id:'xp1000',icon:'💎',ko:'누적 1,000 XP',en:'1,000 XP Earned',need:a=>a.xp>=1000},
 /* The ceilings above were all cleared by the longest-running learners, who
  * then had nothing left to earn. These carry the same ladders far enough that
  * the most advanced record on file still has most of them ahead of it. */
 {id:'c1000',icon:'🌲',ko:'정답 1,000회',en:'1,000 Correct Answers',need:a=>a.correct>=1000},
 {id:'c2500',icon:'🏔️',ko:'정답 2,500회',en:'2,500 Correct Answers',need:a=>a.correct>=2500},
 {id:'c5000',icon:'🌋',ko:'정답 5,000회',en:'5,000 Correct Answers',need:a=>a.correct>=5000},
 {id:'l750',icon:'☄️',ko:'불빛 750개',en:'750 Lights',need:a=>a.lights>=750},
 {id:'l1000',icon:'🌞',ko:'불빛 1,000개',en:'1,000 Lights',need:a=>a.lights>=1000},
 {id:'l1500',icon:'🔆',ko:'불빛 1,500개',en:'1,500 Lights',need:a=>a.lights>=1500},
 {id:'b100',icon:'🗿',ko:'봉화 100개',en:'100 Beacons',need:a=>a.beacons>=100},
 {id:'g50',icon:'🐋',ko:'강치 부르기 50회',en:'Called Gangchi 50 Times',need:a=>a.gcSummons>=50},
 {id:'g100',icon:'🌅',ko:'강치 부르기 100회',en:'Called Gangchi 100 Times',need:a=>a.gcSummons>=100},
 {id:'s200',icon:'🎏',ko:'200일 연속 출석',en:'200-Day Streak',need:a=>a.streak>=200},
 {id:'s365',icon:'🎆',ko:'365일 연속 출석',en:'365-Day Streak',need:a=>a.streak>=365},
 {id:'xp2500',icon:'💠',ko:'누적 2,500 XP',en:'2,500 XP Earned',need:a=>a.xp>=2500},
 {id:'xp5000',icon:'🔱',ko:'누적 5,000 XP',en:'5,000 XP Earned',need:a=>a.xp>=5000},
 {id:'xp10000',icon:'👑',ko:'누적 10,000 XP',en:'10,000 XP Earned',need:a=>a.xp>=10000},
 {id:'xp25000',icon:'🏅',ko:'누적 25,000 XP',en:'25,000 XP Earned',need:a=>a.xp>=25000},
 /* One badge per 독코민 level, generated from the same count as the ladder so
  * raising DOKKOMIN_LEVELS adds its badge too instead of leaving a level
  * that celebrates nothing. */
 ...Array.from({length:Core.DOKKOMIN_LEVELS},(_,i)=>({
  id:'dk'+(i+1),icon:'🪸',ko:'독코민 Lv.'+(i+1),en:'Dokkomin Lv.'+(i+1),
  need:a=>Core.gradeProgress(a.gradeScore).rank>=Core.DOKKOMIN_FROM+i}))
];
function computeBadges(s){
 const a=summary(s);
 return BADGES.map(b=>({id:b.id,icon:b.icon,ko:b.ko,en:b.en,earned:!!b.need(a),group:b.id.replace(/\d+$/,'')}));
}
return {VERSION,KEY,OLD_KEYS,Core,Course,Journey,fresh,ensure,validate,summary,selectProfile,answer,finish,unlock,
        tick,replayBirds,backupText,parseImport,mergeStates,legacyCandidates,Store,MemoryStorage,clone,BADGES,computeBadges};
});
