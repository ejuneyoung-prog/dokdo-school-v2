/* Private progress only. Auth sessions and cloud ownership never enter school/game states. */
(function(r,f){const a=f(typeof module==='object'&&module.exports?require('./app-model.js'):r.DokdoAppModel,typeof module==='object'&&module.exports?require('./games-core.js'):r.DokdoGames);if(typeof module==='object'&&module.exports)module.exports=a;else r.DokdoRecords=a;})(typeof globalThis!=='undefined'?globalThis:this,function(M,G){
'use strict';
const BINDING='dokdo-private-binding-v1',BACKUP='dokdo-private-restore-backup-v1',LIMIT=2000000;
const scalar=x=>x===null||['string','number','boolean'].includes(typeof x);
const keys=new Set(('name nick flag school schoolCat introDay introOff grade xp streak gcHit gcSummons run best started passed badgesEver recent recentG lastDay schemaVersion seenLevel topReported shelter sheltered seaDensity m visual scene gangchiVisits weekly learningProfile '+
'lv att cor seen earned lightBest courseFirstDay courseIndependentDays courseLearned courseRewardDay due lastAdvancedDay lastAnsweredAt pilotIndependentDays '+
'version unlocks at species birdVisit remainingMs event birdsEnabled reduceMotion language geometry birdFlock journey legacy inviteRemainder importedFrom '+
'order beaconSlots timeSec id seat key correct eligible credits history since partial ageBand easy stage readingMax practiceStage completed placement answers total track min max streak used unitPlan skipped unit course '+
'day bonus answered credited equipped growth cleared cleanup seals quizFlowers runnerScore gardenVersion gardenLegacy active sequence blocks runner rounds kind awarded creditedClears game '+
'score lines moves combo endReason over seeded missionVersion hammers rescued clears mission phase missionCleared missionCombo missionRescued board pieces pieceTrash net '+
'round roundElapsed roundStartScore roundStartStars roundCleared transition bag lastKind hitKind elapsed distance y vy speed spawn objects stars collected showed passed won nextKind from progress x w h got').split(/\s+/));
const maps={m:/^[1-9][0-9]*$/,beaconSlots:/^[1-9][0-9]*$/,credits:/^\d{4}-\d{2}-\d{2}:([1-9][0-9]*|dk-[a-z0-9-]{1,80})$/,unlocks:/^(stage-[1-4]|ecology-1)$/,completed:/^(1|2|3|4|(early|primary|upper|middle|high|adult):(1[0-2]|[1-9]))$/};
function project(value,parent='',depth=0){
 if(depth>30)throw Error('RECORD_INVALID');
 if(scalar(value)){if(typeof value==='number'&&!Number.isFinite(value))throw Error('RECORD_INVALID');return value;}
 if(Array.isArray(value))return value.map(x=>project(x,'',depth+1));
 if(!value||typeof value!=='object')throw Error('RECORD_INVALID');
 const out={};for(const[k,v]of Object.entries(value))if(k!=='__proto__'&&k!=='prototype'&&k!=='constructor'&&(maps[parent]?maps[parent].test(k):keys.has(k)))out[k]=project(v,k,depth+1);return out;
}
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));return value;}
function encode(value){return JSON.stringify(canonical(value));}
function validate(snapshot){
 if(!snapshot||snapshot.version!==1||!('school'in snapshot)||!('game'in snapshot))throw Error('RECORD_INVALID');
 const clean={version:1,school:snapshot.school===null?null:project(snapshot.school),game:snapshot.game===null?null:project(snapshot.game)};
 if(clean.school){M.validate(clean.school);if(!clean.school.visual||!clean.school.weekly)throw Error('RECORD_INVALID');}
 if(clean.game)G.validate(clean.game);
 if(new TextEncoder().encode(encode(clean)).length>LIMIT)throw Error('RECORD_TOO_LARGE');return clean;
}
function capture(storage){const schoolRaw=storage.getItem(M.KEY),gameRaw=storage.getItem(G.KEY);return{schoolRaw,gameRaw,snapshot:validate({version:1,school:schoolRaw===null?null:JSON.parse(schoolRaw),game:gameRaw===null?null:JSON.parse(gameRaw)})};}
function summary(snapshot){const s=validate(snapshot),school=s.school||M.fresh(),game=s.game||G.fresh(),a=M.summary(school),next=G.nextGift(game);return{name:a.name,questions:a.questions,correct:a.correct,streak:a.streak,learningXP:a.xp,unit:school.learningProfile?.course?.unit||1,island:G.islandLevel(game),seals:game.growth.seals,blocks:game.best.blocks,runner:game.best.runner,rounds:game.best.rounds,nextGift:next?.name||'',complete:G.islandComplete(game)};}
function protects(incoming,current){
 const a=validate(incoming),b=validate(current);
 if(b.school){if(!a.school)throw Error('RECORD_CONFLICT');M.parseImport(M.backupText(a.school),b.school);}
 if(b.game){if(!a.game)throw Error('RECORD_CONFLICT');for(const k of ['xp'])if(a.game[k]<b.game[k])throw Error('RECORD_CONFLICT');for(const k of ['blocks','runner','rounds'])if(a.game.best[k]<b.game.best[k])throw Error('RECORD_CONFLICT');if(b.game.growth.legacy.some(x=>!a.game.growth.legacy.includes(x))||b.game.growth.gardenLegacy.some(x=>!a.game.growth.gardenLegacy.includes(x)))throw Error('RECORD_CONFLICT');for(const k of ['cleared','cleanup','seals','quizFlowers','runnerScore'])if(a.game.growth[k]<b.game.growth[k])throw Error('RECORD_CONFLICT');if(b.game.day===a.game.day&&(a.game.used<b.game.used||b.game.credited.some(x=>!a.game.credited.includes(x))))throw Error('RECORD_CONFLICT');}
 return a;
}
function readBinding(storage){try{const b=JSON.parse(storage.getItem(BINDING));return b&&b.version===1&&typeof b.uid==='string'&&Number.isSafeInteger(b.revision)&&b.revision>0&&typeof b.hash==='string'?b:null;}catch(e){return null;}}
function createController({storage,enabled=false,onChange=()=>{},locks=null,now=()=>Date.now(),transportFor=null}){
 let client=null,uid=null,generation=0,busy=false,remote=null,confirmed=false,conflict=false;
 const state={enabled:enabled===true,signed:false,busy:false,remote:null,message:'',error:false};
 const emit=()=>onChange({...state,busy,remote:remote?{revision:remote.revision,updatedAt:remote.updated_at,summary:summary(remote.snapshot)}:null});
 const message=(text,error=false)=>{state.message=text;state.error=error;emit();};
 const current=(g,id)=>g===generation&&id===uid&&!!client;
 function invalidate(){generation++;client=null;uid=null;remote=null;confirmed=false;conflict=false;busy=false;state.signed=false;state.message='';state.error=false;emit();}
 async function verified(g,id,c){const session=await c.auth.getSession();if(!current(g,id))throw Error('STALE');const token=session.data?.session?.access_token;if(session.error||!token||session.data?.session?.user?.id!==id||typeof transportFor!=='function')throw Error('AUTH_REQUIRED');const r=await c.auth.getUser(token);if(!current(g,id))throw Error('STALE');if(r.error||r.data?.user?.id!==id)throw Error('AUTH_REQUIRED');return transportFor(token);}
 async function connect(user,c){invalidate();if(!user?.id||!c)return;uid=user.id;client=c;state.signed=true;emit();if(!enabled)return;const g=generation,id=uid;busy=true;emit();try{const api=await verified(g,id,c);const r=await api.from('dokdo_private_records').select('revision,snapshot,updated_at').eq('user_id',id).maybeSingle();if(!current(g,id))return;if(r.error)throw Error('CLOUD_UNAVAILABLE');if(r.data){if(!Number.isSafeInteger(r.data.revision)||r.data.revision<1)throw Error('RECORD_INVALID');remote={...r.data,snapshot:validate(r.data.snapshot)};}confirmed=true;message(remote?'계정에 보관된 기록을 확인했어요.':'이 기기의 기록이 본인 것인지 확인한 뒤 계정에 담아 주세요.');}catch(e){if(current(g,id))message('계정 기록을 확인하지 못했어요. 기기의 원본 기록은 그대로 있어요.',true);}finally{if(current(g,id)){busy=false;emit();}}}
 async function save(){
 if(!enabled||!uid||!client||busy||!confirmed||conflict)return false;
 const g=generation,id=uid,c=client,expected=remote?.revision||0;let start;try{start=capture(storage);}catch(e){message('기기 기록을 읽지 못했어요. 원본을 지우지 말고 기록 복구를 확인해 주세요.',true);return false;}
 if(remote)try{protects(start.snapshot,remote.snapshot);}catch(e){message('두 기록이 달라 자동으로 합치지 않았어요. 원본을 보관하고 기록을 확인해 주세요.',true);return false;}
 busy=true;emit();try{
  const api=await verified(g,id,c);const r=await api.rpc('dokdo_save_private_record',{p_expected:expected,p_snapshot:start.snapshot});if(!current(g,id))return false;
  if(r.error){if(r.error.code==='40001'||r.error.code==='23505'){conflict=true;throw Error('CONFLICT');}throw Error('CLOUD_UNAVAILABLE');}
  const row=Array.isArray(r.data)?r.data[0]:r.data;if(!row||row.revision!==expected+1||typeof row.updated_at!=='string')throw Error('SAVE_UNCONFIRMED');
  remote={revision:row.revision,updated_at:row.updated_at,snapshot:start.snapshot};
  const still=capture(storage);if(still.schoolRaw!==start.schoolRaw||still.gameRaw!==start.gameRaw){message('보낸 시점의 기록은 저장됐어요. 새 기록은 한 번 더 저장해 주세요.');return true;}
  storage.setItem(BINDING,JSON.stringify({version:1,uid:id,revision:row.revision,hash:encode(start.snapshot)}));
  message('내 계정에 저장했어요. 다른 기기에서도 이 기록을 불러올 수 있어요.');return true;
 }catch(e){if(current(g,id))message(e.message==='CONFLICT'?'다른 기기에서 기록이 바뀌었어요. 새로 확인한 뒤 다시 선택해 주세요.':'계정 저장을 확인하지 못했어요. 이 기기 기록은 그대로 남아 있어요.',true);return false;}finally{if(current(g,id)){busy=false;emit();}}
 }
 async function restore(){
 if(!enabled||!uid||!client||busy||!confirmed||!remote||conflict)return false;
 if(!locks?.request){message('이 브라우저에서는 안전한 이어하기를 지원하지 않아요. 최신 브라우저에서 다시 열어 주세요.',true);return false;}
 const g=generation,id=uid,c=client,chosen=remote;let start;try{start=capture(storage);}catch(e){message('기기 기록을 읽지 못했어요. 원본을 지우지 말고 기록 복구를 확인해 주세요.',true);return false;}
 busy=true;emit();try{
  const api=await verified(g,id,c);if(!current(g,id))return false;
  const check=await api.from('dokdo_private_records').select('revision').eq('user_id',id).single();if(!current(g,id))return false;if(check.error||check.data?.revision!==chosen.revision)throw Error('RECORD_CONFLICT');
  const run=()=>{if(!current(g,id))throw Error('STALE');if(storage.getItem(M.KEY)!==start.schoolRaw||storage.getItem(G.KEY)!==start.gameRaw)throw Error('RECORD_CONFLICT');
   if(start.snapshot.game?.active)throw Error('ACTIVE_GAME');const incoming=protects(chosen.snapshot,start.snapshot);
   const newSchool=incoming.school?JSON.stringify(incoming.school):null,newGame=incoming.game?JSON.stringify(incoming.game):null;
   // A verified, complete two-key recovery copy must exist before either original is changed.
   const backup=JSON.stringify({version:1,at:new Date(now()).toISOString(),schoolRaw:start.schoolRaw,gameRaw:start.gameRaw});storage.setItem(BACKUP,backup);if(storage.getItem(BACKUP)!==backup)throw Error('BACKUP_FAILED');
   if(storage.getItem(M.KEY)!==start.schoolRaw||storage.getItem(G.KEY)!==start.gameRaw)throw Error('RECORD_CONFLICT');
   let wroteSchool=false,wroteGame=false;try{if(newSchool!==null){storage.setItem(M.KEY,newSchool);wroteSchool=true;}if(newGame!==null){storage.setItem(G.KEY,newGame);wroteGame=true;}if((newSchool!==null&&storage.getItem(M.KEY)!==newSchool)||(newGame!==null&&storage.getItem(G.KEY)!==newGame))throw Error('RESTORE_FAILED');storage.setItem(BINDING,JSON.stringify({version:1,uid:id,revision:chosen.revision,hash:encode(incoming)}));}catch(e){if(wroteSchool&&storage.getItem(M.KEY)===newSchool){if(start.schoolRaw===null)storage.removeItem(M.KEY);else storage.setItem(M.KEY,start.schoolRaw);}if(wroteGame&&storage.getItem(G.KEY)===newGame){if(start.gameRaw===null)storage.removeItem(G.KEY);else storage.setItem(G.KEY,start.gameRaw);}throw e;}
  };
  await locks.request(M.KEY+'-write',()=>locks.request(G.KEY,run));if(!current(g,id))return false;message('계정 기록을 이 기기로 가져왔어요. 배움터나 놀이터에서 이어 하세요.');return true;
 }catch(e){if(current(g,id))message(e.message==='ACTIVE_GAME'?'진행 중인 게임을 먼저 마쳐 주세요. 원본 기록은 바꾸지 않았어요.':'기록이 충돌하거나 저장을 확인하지 못해 이어하기를 멈췄어요. 원본과 복구 사본을 확인해 주세요.',true);return false;}finally{if(current(g,id)){busy=false;emit();}}
 }
 emit();return{connect,invalidate,save,restore,getState:()=>({...state,busy,remote}),getLocal:()=>capture(storage)};
}
return{BINDING,BACKUP,LIMIT,project,encode,validate,capture,summary,protects,readBinding,createController};
});
