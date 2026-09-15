/* GitHub-ready static client. The server and original profile keys are intentionally untouched. */
'use strict';
(function(){
const M=DokdoAppModel,C=M.Course,Core=M.Core,V=DokdoVisualScene,$=id=>document.getElementById(id);
/* demo.html deliberately ships a subset of index.html's markup, so some of the
 * controls wired below are absent there. Attaching a handler to a missing one
 * threw while this file was still executing, leaving the whole demo page dead
 * -- no DokdoApp at all -- instead of merely short one button. Wiring through
 * these two costs an absent control only its own handler. */
const wire=(id,prop,fn)=>{const el=$(id);if(el)el[prop]=fn;};
const listen=(id,type,fn,opts)=>{const el=$(id);if(el)el.addEventListener(type,fn,opts);};
const ko={};document.querySelectorAll('[data-i18n]').forEach(el=>ko[el.dataset.i18n]=el.textContent);
const en={
 facilityTitle:'Places and facilities',facilitySource:'Official facility information ↗',
 skip:'Skip to content',brandMain:'Dokdo Korea',brandSub:'School',tagline:'A little learning. A brighter Dokdo.',
 demoBanner:'PREVIEW ONLY · reload resets this demo · no real accounts',demoReset:'Try an empty record',
 myDokdo:'My Dokdo',map:'Explore the map',learn:'Learn',journal:'Life journal',myRecords:'My records',
 oldFound:'A previous learning record exists in this browser.',oldCopy:'Keep the original and copy it into this new view.',checkRecords:'Check the record',
 landscape:'My island landscape',soundOff:'♫ Sound off',zoom:'Zoom',saveImage:'Save image',firstLight:'Your first lesson becomes your first light.',
 birdsHere:'Birds are visiting Dokdo',birdsHereSub:'🦭 A gangchi stays with them for one minute',
 artNote:'An imagined landscape based on the approved artwork · not a survey map',sources:'Artwork & sources',
 todayStep:'TODAY’S SMALL STEP',fiveQuestions:'5 questions',gentleLearning:'Learn with explanations',startLesson:'Start a little learning',
 review:'Recall · review',placement:'Choose age · find a starting point',pilotNote:'12 Dokdo units · 60 concepts · 240 rewritten question pairs. Cognitive demand and difficulty are separately reviewed.',
 outlineNote:'An outline comparison simplified from official illustrations. Placement, facility coordinates and elevation contours are not surveyed.',
 locatorUlleung:'From Ulleungdo',locatorOki:'From the Oki Islands, Japan',locatorCounty:'Ulleung County, Gyeongsangbuk-do',
 locatorNote:'A location guide using real distances and coordinates. The coastlines shown are simplified illustrations, not surveyed shapes.',
 west:'Seodo',east:'Dongdo',distanceMeaning:'The shortest distance between the shores, not the centres of the drawings.',
 officialMap:'See the official island outlines ↗',topographic:'Open the National Atlas map ↗',
 myLights:'Lights I have earned',lifetime:'Lifetime correct',discoveries:'Encounters with life',gullJournal:'Black-tailed gull journal',
 placeBeacons:'Place beacons',openJournal:'Open journal',journey:'🗺️ My learning journey',seaVisitors:'🦭 Call the legendary gangchi',
 visitRule:'Earn invitations through correct answers. Gangchi then visit the water between the islands for one minute.',
 visitCount:'Number of gangchi to invite',invite:'Invite gangchi',backHome:'Back to my Dokdo',
 dailyTitle:'Learn a little',dailyDesc:'Read a short explanation, then try the questions. Revisit mistakes with help.',
 reviewTitle:'Recall what you learned',reviewDesc:'Check what you remember on different days. Repeating one answer is not mastery.',
 placementTitle:'Find your starting point',placementDesc:'Select an age band, then explore five questions at a comfortable level.',
 start:'Start',leave:'Leave lesson',beforeQuestion:'BEFORE THE QUESTION',learnTogether:'Let us learn this first',
 readDone:'I have read it · try the question',dontKnow:'I do not know yet',retry:'I have read the explanation · retry',next:'Continue',
 journalIntro:'Dokdo is a place where life lives and rests. Completing a learning stage leaves a lasting encounter in your journal.',
 gull:'Black-tailed gull',gullText:'This bird appears in the Ministry of Foreign Affairs’ Dokdo nature information. Dokdo also offers a resting place for migratory birds.',
 birdReplay:'Replay the bird visit',ecologySource:'Read about Dokdo’s natural environment ↗',
 wildlifeNote:'Gangchi and bird visits are imaginary learning celebrations. They do not represent real sightings, restoration or population counts.',
 badgesTitle:'🏅 Achievement Badges',
 backupTitle:'Keep and restore your record',localOnly:'The new view saves in this browser. It does not sync with a cloud account. Keep a private backup file, too.',
 backupFile:'Save learning backup',importFile:'Open a backup file',
 backupWarning:'A saved image is not a learning backup. Backup files may contain a name, school, old recovery code and learning history. Keep them private.',
 oldRecords:'Previous Dokdo School records',oldRecordWarning:'Only records under the same site and browser can be read. Original records and the old cloud are not modified. The two versions do not sync automatically.',
 weeklyHistory:'Weekly learning history',weeklyRule:'Only the weekly tally restarts each Monday in Korea time. Your lifetime learning, lights and beacons stay.',
 footer:'Small moments of learning make Dokdo shine.',demoLink:'Separate demo',ageTitle:'Where shall we begin together?',
 ageDesc:'Your age band helps us choose explanations. We do not ask for a birth date.',
 ageRecoverLink:'Already have a nickname? Load your record here ↗',
 nickname:'Nickname (optional)',ageBand:'Age band',
 selectAge:'Select your age band',easyStart:'Start with very simple language, regardless of age.',continue:'Continue',
 agePreserve:'Existing game grades and records are not reduced.',settings:'Settings',reduceMotion:'Reduce motion',
 enableBirds:'Show birds after achievements',seaDensity:'Life in the sea',calm:'Calm',rich:'Lively',full:'More lively',
 changeAge:'Age and starting-point settings',soundRule:'Sound starts only when you turn it on. Leaving the app turns it off. Returning does not restart it.',
 beaconHelp:'Only earned beacons can be moved. Choose a location that does not overlap another beacon.',
 beacon:'Beacon',position:'Position',savePosition:'Save this position',
 hallOfFame:'Hall of fame',
 hallNotConfiguredTitle:'Not connected to a server yet',
 hallNotConfiguredBody:'Weekly rankings, school standings and broadcast screens appear once a real aggregation server is connected. This status message is shown instead of an empty board, so a missing connection is never mistaken for zero participants.',
 hallNotConfiguredHint:'Operator action: set leaderboard.apiUrl in assets/site-config.js to the real aggregation server URL, and add that origin to connect-src in the Content-Security-Policy meta tag in index.html.',
 hallLoading:'Loading this week’s record…',
 hallRetry:'Try again',
 hallWeeklyPersonal:'Weekly personal ranking',
 hallWeeklyPersonalNote:'Sorted by correct answers, then days participated, then longest streak. Shows at most 60 people — not the full participant count.',
 hallSchool:'School standings',
 hallRecent:'Recent participation',
 flagField:'Country (shown on the hall of fame, optional)',
 flagOtherField:'Country code (ISO 2-letter, e.g. NZ)',
 schoolCatField:'School category (hall of fame section, optional)',
 schoolCatE:'Elementary school',schoolCatM:'Middle school',schoolCatH:'High school',schoolCatW:'Korean school abroad',
 schoolField:'School / organisation name (optional — type two letters to search)',
 cloudBackupTitle:'Server backup · continue on another device',
 cloudBackupWarning:'Sending alone does not guarantee storage on this legacy server, so it is automatically double-checked for a few seconds after sending. You will be told if it could not be confirmed.',
 cloudSaveBtn:'Send a backup to the server',
 cloudKeyCopy:'Copy nickname',
 cloudLoadNick:'Nickname to load',
 cloudLoadBtn:'Load a record from another device',
 introTitle:'Today’s Dokdo Korea video',
 introNote:'One of the Dokdo Korea channel’s videos. Tap to play — nothing plays automatically.',
 introOff:'Don’t show this again',
 introClose:'Close',
 youtubeTitle:'🎬 Dokdo Korea videos',
 youtubeLive:'Watch the live stream ↗',
 youtubeWatchOn:'Open on YouTube ↗',
 youtubeNote:'Shows 3 of the Dokdo Korea channel’s videos at random. Tap to play — nothing plays automatically.',
 channelInfoOpen:'About Dokdo Korea',channelInfoTitle:'About Dokdo Korea',
 channelContactTitle:'Contact',channelMusicTitle:'Music & Channel Links',channelCollabLink:'Collaboration & lecture inquiries (form) ↗',
 support:'♥ Support Dokdo Korea',headerLive:'🔴 Dokdo Live',headerChannel:'▶ YouTube\nDokdo Korea',headerCollab:'Collaborate',
 youtubeChannel:'Dokdo Korea Instagram ↗',
 tourismInfoTitle:'🚢 Ulleungdo–Dokdo travel information',
 tourismInfoBody:'Basic visitor information about Dokdo (ferry access via Ulleungdo, weather-dependent sailings, and what to know before visiting).',
 tourismInfoLink:'🎫 Booking',
 tourismProducts:'🧳 Tour packages',
 tourismCall:'☎️ Call us',
 tourismSoonNote:'The phone line is being set up. Please use the collaboration contact below for now.',
 tourismComingSoon:'🛠️ Booking and tour information are being prepared. They will appear here as soon as they are ready.',
 contactCollab:'Contact / Collaborate ↗',
 tourismInfoBtn:'Ulleungdo·Dokdo travel info',
 badgesEarned:'Badges earned',badgesLeft:'Still to earn',
 footerLearn:'About Dokdo',footerQuestions:'Browse the 240 questions',
 footerChannel:'Dokdo Korea',footerYoutube:'Dokdo Korea Label ↗',
 offerTitle:'🤲 Take part in Dokdo',
 offerLead:'Ways to meet Dokdo and lend a hand, so the learning does not stop at the screen.',
 offerTour:'Ulleungdo·Dokdo tours',offerTourSub:'Booking and packages · being prepared',
 offerSupport:'Support Dokdo Korea',offerSupportSub:'What keeps the learning and the music going',
 offerCollab:'Collaboration · talks',offerCollabSub:'Schools, institutions and companies all welcome',
 offerGoods:'Dokdo merchandise',offerGoodsSub:'Being prepared · coming soon',
 offerChat:'💬 Ask us on KakaoTalk open chat ↗',
 promoTitle:'🎵 Dokdo Korea · Music & Social',
 visitCollabTitle:'🧭 Visit · Contact',
 gradeTab:'Grade',gradeLadderTitle:'Full grade ladder',materialTip:'TIP · Show question material',gradeShare:'Share ↗',
 gradeNote:'No placement test — everyone starts at Kindergarten. Correct answers auto-promote you to the next grade, and progress already earned carries forward.',
 resetRecord:'Reset this record',
 resetWarning:'Clears this device’s record and starts empty. Save a backup file above first, or remember your nickname so “Load a record from another device” can bring it back after resetting.',
 resetConfirm:'This clears every record on this device and cannot be undone here. Have you saved a backup, or do you have your nickname#code? Continue?',
 disputeButton:'Something wrong with this question?',
 disputeTitle:'Report a question',
 disputeHelp:'If you think this question, answer or explanation is wrong, let us know. Your email app opens with the question details already filled in.',
 disputeReason:'What seems wrong? (optional)',
 disputeSend:'Send by email',
 disputeSent:'Opened your email app. Please review and send it.'
};
en.mapShapeNote='Dongdo is lower, with a comparatively level upper area. This authored comparison is not a surveyed 3D terrain or facility-position model.';
let mode=document.querySelector('meta[name="dokdo-mode"]').content;
const isolated=mode!=='live';
let storage;
try{storage=isolated?new M.MemoryStorage():window.localStorage;}catch(e){storage={getItem(){throw e;},setItem(){throw e;}};}
const store=new M.Store(storage);
let state=store.load(),language=state?.visual?.language||'ko',currentView='home',mapOpen=false,lesson=null,ageNext=null;
let busy=false,sceneTime=state?.scene?.timeSec||0,frameLast=0,drawAt=0,saveAt=0,sceneVisible=true,lightDirty=true,lightLayer=null,dirty=false,homeVideoIds=null;
let soundOn=false,audioToken=0,audio=null,importCandidate=null,importOriginal=null,assetError=false;
let writeQueue=Promise.resolve();
const tr=(a,b)=>language==='en'?b:a;
const txt=(id,value)=>{if($(id))$(id).textContent=String(value);};
const num=x=>Number(x||0).toLocaleString(language==='en'?'en-US':'ko-KR');
const getS=()=>store.state;
/* The levels past the school ladder are 독코민 Lv.1.. -- generated from the
 * one count in dokdo-core so adding levels stays a single-number change. */
const dokkomin=make=>Object.fromEntries(Array.from({length:Core.DOKKOMIN_LEVELS},(_,i)=>['DK'+(i+1),make(i+1)]));
const GRADE_LABELS={
 ko:{K:'유치원',E1:'초등 1학년',E2:'초등 2학년',E3:'초등 3학년',E4:'초등 4학년',E5:'초등 5학년',E6:'초등 6학년',
  M1:'중학 1학년',M2:'중학 2학년',M3:'중학 3학년',H1:'고등 1학년',H2:'고등 2학년',H3:'고등 3학년',
  U1:'대학 1학년',U2:'대학 2학년',U3:'대학 3학년',U4:'대학 4학년',MA1:'석사 1년차',MA2:'석사 2년차',PHD1:'박사 1년차',PHD2:'박사 2년차',
  ...dokkomin(n=>'독코민 Lv.'+n)},
 en:{K:'Kindergarten',E1:'Grade 1',E2:'Grade 2',E3:'Grade 3',E4:'Grade 4',E5:'Grade 5',E6:'Grade 6',
  M1:'Middle 1',M2:'Middle 2',M3:'Middle 3',H1:'High 1',H2:'High 2',H3:'High 3',
  U1:'University Y1',U2:'University Y2',U3:'University Y3',U4:'University Y4',MA1:"Master's Y1",MA2:"Master's Y2",PHD1:'PhD Y1',PHD2:'PhD Y2',
  ...dokkomin(n=>'Dokkomin Lv.'+n)}
};
const gradeLabel=code=>(GRADE_LABELS[language]&&GRADE_LABELS[language][code])||code;
/* Past the school ladder the label already carries its own level number, so
 * showing the ladder position too would read "Lv.22 · 독코민 Lv.1". Inside that
 * tier the tier name is the level. */
const levelText=gp=>gp.rank>=Core.DOKKOMIN_FROM?gradeLabel(gp.grade):'Lv.'+(gp.rank+1);
const nextLevelText=gp=>gp.rank+1>=Core.DOKKOMIN_FROM?gradeLabel(Core.GRADES[gp.rank+1]):'Lv.'+(gp.rank+2);
function toast(message){txt('toast',message);$('toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').hidden=true,5200);}
function translate(){
 document.documentElement.lang=language;
 document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=language==='en'?(en[el.dataset.i18n]||ko[el.dataset.i18n]):ko[el.dataset.i18n]);
 txt('language',language==='en'?'KO':'EN');
 $('language').setAttribute('aria-label',language==='en'?'한국어로 바꾸기':'Switch to English');
 $('question-title').lang=language;
}
function showDialog(id){
 const el=$(id);if(el.open)return;
 if(typeof el.showModal==='function')el.showModal();else el.setAttribute('open','');
 frameLast=0;
}
function closeDialog(id){const el=$(id);if(typeof el.close==='function')el.close();else el.removeAttribute('open');frameLast=0;}
function guarded(){
 if(!getS()||store.blocked){toast(tr('기록 보호가 작동 중입니다. 내 기록에서 복구 파일을 보관해 주세요.','Record protection is active. Save a recovery file in My records.'));return false;}return true;
}
function updateStorageStatus(){
 const err=store.error,blocked=store.blocked;
 txt('save-status',isolated?tr('시연 · 저장하지 않음','Demo · not persisted'):blocked?tr('기록 보호 중','Record protected'):err?tr('저장 확인 필요','Check saving'):store.lastSaved?tr('이 기기에 저장됨','Saved on this device'):tr('이 기기의 기록','This device’s record'));
 $('save-status').classList.toggle('error',!!err||blocked);
 if(err||blocked){
  $('storage-alert').hidden=false;$('storage-alert').replaceChildren();
  const label=document.createElement('span');label.textContent=tr('저장에 문제가 있어 기록을 보호하고 있습니다. 원본을 지우지 말고 복구 파일을 보관해 주세요.','Saving needs attention. Your original record has not been discarded. Save a recovery file.');
  const b=document.createElement('button');b.textContent=tr('복구 파일 보관','Save recovery');b.onclick=()=>download(store.recovery(),'dokdo-recovery.json','application/json');
  $('storage-alert').append(label,b);
 }else $('storage-alert').hidden=true;
}
function scheduleWrite(fn){
 const run=async()=>{
  if(navigator.locks?.request&&!isolated)return navigator.locks.request(M.KEY+'-write',fn);
  return fn();
 };
 const result=writeQueue.then(run);writeQueue=result.catch(()=>{});return result;
}
let lastAutoSaveAttempt=0;
// BETA: real users never found the manual "서버로 백업 전송" button, so their
// server save record never existed even though their answer events were
// reaching the server fine (visible in the activity log). Auto-saving here,
// throttled, means a nickname is loadable elsewhere without anyone having to
// remember to press anything.
function scheduleAutoSave(){
 const s=getS();if(!s)return;
 const nick=(s.name||'').trim().normalize('NFC');if(!nick)return;
 if(!window.DokdoLeaderboard||!DokdoLeaderboard.isConfigured())return;
 const now=Date.now();if(now-lastAutoSaveAttempt<60000)return;
 lastAutoSaveAttempt=now;
 const payload=store.blocked?store.recovery():M.backupText(s);
 DokdoLeaderboard.saveProgress(nick,nick,s.grade||'K',payload).catch(()=>{});
}
async function mutate(fn){
 if(!guarded())throw Error('Record protection is active.');
 try{
  const result=await scheduleWrite(()=>store.transaction(fn));state=getS();dirty=false;lightDirty=true;updateStorageStatus();scheduleAutoSave();return result;
 }catch(e){updateStorageStatus();toast(tr('변경을 저장하지 못했습니다. 내 기록에서 백업을 보관해 주세요.','The change could not be saved. Keep a backup in My records.'));throw e;}
}
function download(content,name,mime){
 const blob=content instanceof Blob?content:new Blob([content],{type:mime});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
function view(id,force=false){
 if(lesson&&currentView==='learn'&&id!=='learn'&&!force){
  if(!confirm(tr('이번 수업을 나갈까요? 이미 저장한 기록은 남습니다.','Leave this lesson? Recorded answers will remain.')))return false;
  lesson=null;
 }
 if(id!==currentView&&activeYoutube&&activeYoutube.containerId.startsWith('youtube-card-player'))stopAllYoutubeEmbeds();
 currentView=id;
 document.querySelectorAll('.view').forEach(el=>el.hidden=el.id!=='view-'+id);
 document.querySelectorAll('.nav-item').forEach(el=>{
  const active=el.dataset.view===id&&!mapOpen||el.id==='nav-map'&&id==='home'&&mapOpen;
  el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');
 });
 if(id==='home'){$('stage-grid').classList.toggle('map-open',mapOpen);$('map-card').hidden=!mapOpen;$('today-card').hidden=mapOpen;renderHome();}
 if(id==='learn'&&!lesson){$('learning-menu').hidden=false;$('course-catalog').hidden=false;$('lesson').hidden=true;$('lesson-result').hidden=true;renderCatalog();}
 if(id==='records')renderRecords();
 if(id==='journal')renderJournal();
 if(id==='hall')renderHall();
 if(id==='grade')renderGrade();
 frameLast=0;window.scrollTo({top:0,behavior:'instant'});
 $('main').focus({preventScroll:true});
 return true;
}
/* A promotion is celebrated on the home view, where the learner actually is.
 * s.seenLevel is the highest level already celebrated, so the strip appears
 * once per promotion and never again on a reload -- and a restored backup
 * from a higher level does not replay every level it passed on the way. */
function renderLevelBanner(s,a){
 const box=$('level-banner'),track=$('level-banner-track');
 if(!box||!track)return;
 const gp=Core.gradeProgress(a.gradeScore),reached=gp.rank+1,seen=Number(s.seenLevel||0);
 if(!a.name||reached<=seen){box.hidden=true;return;}
 const name=levelText(gp),top=gp.graduated;
 const line=top
  ?tr(`🏆 ${a.name}님이 최고 단계 ${name}에 올랐습니다 · 독도를 끝까지 밝혔어요`,
      `🏆 ${a.name} reached the top level, ${name} — Dokdo is lit all the way`)
  :tr(`🎉 ${a.name}님이 ${name}로 올라섰어요 · 축하합니다`,
      `🎉 ${a.name} has reached ${name} — congratulations`);
 track.replaceChildren();
 // Two copies so the marquee scrolls seamlessly at -50%.
 for(let i=0;i<2;i++){const el=document.createElement('span');el.textContent=line;track.append(el);}
 box.classList.toggle('top-level',top);
 box.hidden=false;
 mutate(x=>{x.seenLevel=reached;if(top)x.topReported=true;}).catch(()=>{});
 // Reaching the top level is recorded for the operator to check; it is not
 // announced to anyone else until they approve the row in their sheet.
 if(top&&!s.topReported&&window.DokdoLeaderboard)DokdoLeaderboard.reportTopLevel(a.name,name,a.correct).catch(()=>{});
}
/* Top-level reachers the operator has approved, scrolled on the home view
 * under the learner's own promotion strip. Nothing appears until a row is
 * approved, so an unreviewed arrival is never broadcast. */
let topsShown=false;
async function renderApprovedTops(){
 const box=$('tops-banner'),track=$('tops-banner-track');
 if(!box||!track||topsShown||!window.DokdoLeaderboard||!DokdoLeaderboard.isConfigured())return;
 topsShown=true;
 let res;try{res=await DokdoLeaderboard.fetchTops();}catch(e){return;}
 if(!res||res.state!=='ok'||!res.tops.length)return;
 track.replaceChildren();
 const line=r=>tr(`🏆 ${r.nick}님 · 최고 단계 ${r.level} 달성`,`🏆 ${r.nick} reached the top level, ${r.level}`);
 for(let i=0;i<2;i++)for(const r of res.tops){const el=document.createElement('span');el.textContent=line(r);track.append(el);}
 box.hidden=false;
}
function renderHome(){
 const s=getS();
 if(!s){txt('greeting',tr('기록을 먼저 확인해 주세요','Please check your record first'));updateStorageStatus();return;}
 const a=M.summary(s),p=s.learningProfile;
 const shownName=Array.from(a.name).length>25?Array.from(a.name).slice(0,25).join('')+'…':a.name;
 txt('greeting',a.name?tr(`${shownName}님, 오늘도 독도를 밝혀볼까요?`,`${shownName}, shall we brighten Dokdo today?`):tr('오늘도, 독도를 밝혀볼까요?','Shall we brighten Dokdo today?'));
 renderGradeLine('grade',s,a);
 renderLevelBanner(s,a);
 renderApprovedTops();
 txt('lights-count',num(a.lights));txt('beacon-count',tr('봉화 ','Beacons ')+num(a.beacons));
 txt('correct-count',num(a.correct));Core.rollover(s);
 txt('weekly-count',tr('이번 주 ','This week ')+num(s.weekly.correct)+(s.weekly.partial?tr(' · 전환 후',' · since update'):''));
 txt('bird-count',Object.keys(s.visual.unlocks).length?1:0);txt('xp-label',num(s.xp)+' XP');
 $('first-light').hidden=a.lights>0;
 const step=p?.stage||1;const unit=C.unitInfo(p?.course?.unit||1);txt('course-title',unit[language]);txt('course-description',tr('짧게 배우고, 다섯 문제를 풀며 나만의 독도를 밝혀보세요.','Read a little, answer five questions, and add light to your island.'));
 renderMotivationBanner(s,a,unit);
 $('journey-steps').replaceChildren();
 for(let i=1;i<=4;i++){const el=document.createElement('div');el.className='journey-step'+(i===step?' current':i<step?' done':'');
  const n=document.createElement('span');n.textContent=String(i).padStart(2,'0');const label=document.createElement('b');label.textContent=C.STAGES[language][i];el.append(n,label);$('journey-steps').append(el);}
 const evidence=p?C.courseEvidence(p,s.m,Core.dayKey()):{count:0,concepts:0};
 txt('journey-note',p?tr(`${C.trackName(p)} 경로 · 완료 ${evidence.completed}/12단원 · 다른 날 두 번 확인한 개념 ${evidence.count}/60개. 같은 개념의 다른 보기는 중복 진급으로 세지 않아요.`,`${C.trackName(p,'en')} · ${evidence.completed}/12 units complete · ${evidence.count}/60 concepts checked on two later days.`):tr('첫 수업 전에 나이대와 시작점을 고릅니다.','Choose an age band before your first lesson.'));
 renderVisitors();renderYoutubeCard();renderBadges(s);
 const olds=!isolated?M.legacyCandidates(storage):[];
 $('legacy-banner').hidden=!olds.length||a.questions>0||s.visual.importedFrom;
 $('arrange-beacon').disabled=!a.beacons;
 $('start-review').disabled=!Object.entries(s.m).some(([id,r])=>C.isActive(id)&&(r.cor>0||r.courseLearned));
 updateStorageStatus();
}
function renderGradeLine(idPrefix,s,a){
 const el=$(idPrefix+'-line');if(!el)return;
 el.hidden=!a.name;if(!a.name)return;
 const gp=Core.gradeProgress(a.gradeScore);
 if($(idPrefix+'-name'))txt(idPrefix+'-name',a.name);
 txt(idPrefix+'-badge',levelText(gp));
 txt(idPrefix+'-stats',tr(`정답 ${num(a.correct)} · XP ${num(a.xp)}`,`Correct ${num(a.correct)} · XP ${num(a.xp)}`));
 // 복습을 절반으로 세면 점수에 소수점이 생깁니다. 게이지 숫자는 올림해
 // '2.5/45' 같은 표시가 보이지 않게 합니다.
 $(idPrefix+'-gauge').max=gp.need;$(idPrefix+'-gauge').value=Math.ceil(gp.have);
 txt(idPrefix+'-gauge-label',gp.graduated?tr('최고 레벨 달성','Top level reached'):tr(`${Math.ceil(gp.have)}/${gp.need} · 다음 ${nextLevelText(gp)}까지`,`${Math.ceil(gp.have)}/${gp.need} to ${nextLevelText(gp)}`));
}
function renderGrade(){
 const s=getS();if(!s)return;
 const a=M.summary(s),gp=Core.gradeProgress(a.gradeScore);
 txt('grade-view-current',gp.rank>=Core.DOKKOMIN_FROM?gradeLabel(gp.grade):'Lv.'+(gp.rank+1)+' · '+gradeLabel(gp.grade));
 // 누적 정답은 실제로 맞힌 횟수 그대로, 레벨은 복습을 절반으로 센 점수.
 // 두 숫자가 다른 뜻이라는 걸 화면에서 밝혀 둡니다.
 txt('grade-view-stats',tr(`정답 ${num(a.correct)} · XP ${num(a.xp)} · 레벨은 같은 문항을 다시 맞힌 것을 절반으로 셉니다`,`Correct ${num(a.correct)} · XP ${num(a.xp)} · levels count a repeated question as half`));
 $('grade-view-gauge').max=gp.need;$('grade-view-gauge').value=Math.ceil(gp.have);
 txt('grade-view-gauge-label',gp.graduated?tr('최고 단계 달성','Top level reached'):tr(`${Math.ceil(gp.have)}/${gp.need} · 다음 단계(${gradeLabel(Core.GRADES[gp.rank+1])})까지`,`${Math.ceil(gp.have)}/${gp.need} to ${gradeLabel(Core.GRADES[gp.rank+1])}`));
 const ladder=$('grade-ladder');ladder.replaceChildren();
 Core.GRADES.forEach((code,i)=>{
  const row=document.createElement('div');row.className='grade-row'+(i===gp.rank?' current':i<gp.rank?' done':'');
  const n=document.createElement('span');n.className='grade-row-index';n.textContent=String(i+1);
  const name=document.createElement('span');name.className='grade-row-name';name.textContent=gradeLabel(code);
  row.append(n,name);ladder.append(row);
 });
}
function renderVisitors(){
 const s=getS();if(!s)return;
 const vis=s.gangchiVisits,ready=Math.floor((s.gcHit||0)/5),remain=vis.length?Math.ceil(Math.max(...vis.map(x=>x.remainingMs))/1000):0;
 txt('visitor-status',vis.length?`${vis.length} / 10 · ${Math.floor(remain/60)}:${String(remain%60).padStart(2,'0')}`:'0 / 10');
 txt('invite-credit',tr(`부르기 ${ready}회 보관`,`Invitations: ${ready}`));
 // gcHit only ever changes in +5 jumps (every 10 correct answers), so
 // gcHit%5 was always 0 and this gauge never visibly moved. The per-answer
 // counter is s.visual.journey.inviteRemainder (0..9, resets on the 10th).
 const toward=(s.visual&&s.visual.journey&&s.visual.journey.inviteRemainder)||0;wire('gangchi-progress','value',toward);
 txt('gangchi-progress-label',tr(`정답 ${toward}/10 · 다음 강치까지`,`${toward}/10 correct · until the next gangchi`));
 // The count slot is gone: nobody would ever ask for fewer gangchi than they
 // have, so the button always invites every one it can.
 const callable=Math.min(ready,10-vis.length);
 $('invite').disabled=ready<1||vis.length>=10||store.blocked;
 txt('invite',vis.length>=10?tr('10마리와 함께하는 중','10 visitors here'):ready?tr(`강치 ${callable}마리 부르기`,`Invite ${callable} gangchi`):tr('인정 정답 10개로 첫 만남','First visit after 10 credits'));
 $('bird-toast').hidden=!s.visual.birdVisit||!s.visual.birdsEnabled;
}
let activeYoutube=null;
function resetYoutubePlayer(containerId,videoId){
 const el=$(containerId);if(!el)return;el.innerHTML='';
 const btn=document.createElement('button');btn.type='button';btn.className='youtube-thumb';
 btn.setAttribute('aria-label',tr('영상 재생','Play video'));
 const img=document.createElement('img');img.alt=tr('독도코리아 영상 미리보기','Dokdo Korea video preview');
 img.src='https://i.ytimg.com/vi/'+encodeURIComponent(videoId)+'/hqdefault.jpg';
 const play=document.createElement('span');play.className='play-badge';play.setAttribute('aria-hidden','true');play.textContent='▶';
 btn.append(img,play);btn.onclick=()=>playYoutubeEmbed(containerId,videoId);el.append(btn);
}
function playYoutubeEmbed(containerId,videoId){
 stopAllYoutubeEmbeds();
 const el=$(containerId);if(!el)return;el.innerHTML='';
 const iframe=document.createElement('iframe');
 iframe.src='https://www.youtube-nocookie.com/embed/'+encodeURIComponent(videoId)+'?autoplay=1&rel=0&modestbranding=1&playsinline=1';
 iframe.title=tr('독도코리아 영상','Dokdo Korea video');
 iframe.className='youtube-embed';
 iframe.setAttribute('allow','autoplay; encrypted-media; picture-in-picture');
 iframe.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
 iframe.setAttribute('frameborder','0');iframe.allowFullscreen=true;
 el.append(iframe);
 const wasPlaying=soundOn;if(soundOn)stopSound();
 activeYoutube={containerId,videoId,wasPlaying};
}
function stopAllYoutubeEmbeds(){
 if(!activeYoutube)return;
 const {containerId,videoId,wasPlaying}=activeYoutube;activeYoutube=null;
 resetYoutubePlayer(containerId,videoId);
 if(wasPlaying)toggleSound().catch(()=>{});
}
function flagEmoji(code){
 if(typeof code!=='string'||!/^[A-Za-z]{2}$/.test(code))return'';
 const up=code.toUpperCase();
 return String.fromCodePoint(...Array.from(up,c=>0x1f1e6+c.charCodeAt(0)-65));
}
function renderMotivationBanner(s,a,unit){
 const banner=$('motivation-banner');
 if(!banner)return;
 if(!a.name){banner.hidden=true;return;}
 banner.hidden=false;
 txt('motivation-flag',flagEmoji(s.flag)||'🏳️');
 const shownName=Array.from(a.name).length>20?Array.from(a.name).slice(0,20).join('')+'…':a.name;
 txt('motivation-name',shownName);
 txt('motivation-question',tr(`오늘의 문제 · ${unit[language]} · 매일 들르면 더 빨리 밝아져요`,`Today's question · ${unit['en']} · visit daily to light up faster`));
}
function pickRandomDistinct(arr,n){
 const pool=arr.slice();const out=[];
 while(out.length<n&&pool.length)out.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
 return out;
}
function renderYoutubeCard(){
 const yt=(window.DOKDO_SITE_CONFIG&&window.DOKDO_SITE_CONFIG.youtube)||{};
 const ids=Array.isArray(yt.videoIds)?yt.videoIds:[];
 if(!$('youtube-card'))return;
 $('youtube-card').hidden=!ids.length;
 if(!ids.length)return;
 if(!homeVideoIds)homeVideoIds=pickRandomDistinct(ids,3);
 homeVideoIds.forEach((id,i)=>{
  const containerId='youtube-card-player-'+i;
  if(!activeYoutube||activeYoutube.containerId!==containerId)resetYoutubePlayer(containerId,id);
 });
 $('youtube-live-link').href=yt.liveUrl||yt.channelUrl||'#';
}
function maybeShowIntro(){
 if(isolated)return;
 const yt=(window.DOKDO_SITE_CONFIG&&window.DOKDO_SITE_CONFIG.youtube)||{};
 const ids=Array.isArray(yt.videoIds)?yt.videoIds:[];if(!ids.length)return;
 const s=getS();if(!s||s.introOff)return;
 const today=Core.dayKey();if(s.introDay===today)return;
 const id=ids[Math.floor(Math.random()*ids.length)];
 resetYoutubePlayer('intro-player',id);
 $('intro-video-link').href='https://www.youtube.com/watch?v='+encodeURIComponent(id);
 $('intro-off').checked=false;
 showDialog('youtube-intro-dialog');
 mutate(s2=>{s2.introDay=today;}).catch(()=>{});
}
listen('youtube-intro-dialog','close',()=>{
 stopAllYoutubeEmbeds();
 if($('intro-off').checked)mutate(s=>{s.introOff=true;}).catch(()=>{});
});
function renderOutlines(){
 $('outline-compare').replaceChildren();
 for(const key of ['west','east']){
  const pts=DOKDO_OUTLINES[key],ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','-15 -18 330 365');svg.setAttribute('role','img');svg.setAttribute('aria-label',tr(key==='west'?'서도 모양 비교':'동도 모양 비교',key==='west'?'Seodo outline comparison':'Dongdo outline comparison'));
  const path=document.createElementNS(ns,'path');path.setAttribute('d','M'+pts.map(p=>p.join(' ')).join('L')+'Z');
  path.setAttribute('fill',key==='west'?'#426965':'#536e69');path.setAttribute('stroke','#92c2b8');path.setAttribute('stroke-width','2');svg.append(path);
  const text=document.createElementNS(ns,'text');text.setAttribute('x','140');text.setAttribute('y','340');text.setAttribute('text-anchor','middle');text.setAttribute('fill','#d7e8e3');text.setAttribute('font-size','20');
  text.textContent=tr(key==='west'?'서도':'동도',key==='west'?'Seodo':'Dongdo');svg.append(text);$('outline-compare').append(svg);
 }
}
function mapFacts(which='west'){
 const west=which==='west';
 const rows=[[tr('최고 높이','Maximum elevation'),west?'168.5 m':'98.6 m'],[tr('면적','Area'),west?'88,740 m²':'73,297 m²'],
 [tr('둘레','Perimeter'),west?'2.6 km':'2.8 km'],[tr('자료','Source'),tr('외교부 · 브이월드 자료','MOFA / VWorld illustration')]];
 $('island-facts').replaceChildren();
 for(const [key,val] of rows){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=val;$('island-facts').append(dt,dd);}
 txt('facility-info',west?tr('서도에는 주민숙소와 물골 등이 소개되어 있습니다. 이 화면에서는 정확한 좌표를 확인하지 않은 시설에 지도 핀을 붙이지 않습니다.','The official information lists residents’ accommodation and Mulgol on Seodo. Unverified coordinates are not turned into map pins.'):tr('동도에는 접안시설, 독도등대, 경비대와 헬기장 등이 소개되어 있습니다. 그림의 건물 모양을 실제 시설 좌표로 간주하지 않습니다.','The official information lists docking facilities, the Dokdo lighthouse, the police facility and a helipad on Dongdo. Buildings in the illustration are not surveyed facility locations.'));
 document.querySelectorAll('[data-island]').forEach(b=>{b.classList.toggle('selected',b.dataset.island===which);b.setAttribute('aria-pressed',String(b.dataset.island===which));});
}
function toggleMap(on){
 const previous=mapOpen;mapOpen=on;if(!view('home')){mapOpen=previous;return false;}$('stage-grid').classList.toggle('map-open',on);$('map-card').hidden=!on;$('today-card').hidden=on;
 renderOutlines();mapFacts();paint();
 // 그림 출처는 지도 살펴보기에서만 보입니다. 거기가 그림과 실제 지형을
 // 견주어 보는 자리라, 출처가 필요한 유일한 화면입니다.
 if($('scene-bottom'))$('scene-bottom').hidden=!on;
 txt('save-image',on?tr('지도 저장','Save map'):tr('이미지 저장','Save image'));
}
function setupAge(callback,force=false){
 if(!guarded())return;
 if(C.valid(getS().learningProfile)&&!force){callback();return;}
 ageNext=callback;$('age-band').replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent=tr('나이대를 골라 주세요','Select your age band');$('age-band').append(empty);
 C.BANDS.forEach(b=>{const o=document.createElement('option');o.value=b.id;o.textContent=b[language];$('age-band').append(o);});
 $('age-band').value=getS().learningProfile?.ageBand||'';$('age-easy').checked=!!getS().learningProfile?.easy;
 $('nickname').value=(getS().name||'').slice(0,40);
 const knownFlags=Array.from($('flag-select').options).map(o=>o.value).filter(v=>v!=='OTHER');
 const curFlag=getS().flag||'KR';
 if(knownFlags.includes(curFlag)){$('flag-select').value=curFlag;$('flag-other-row').hidden=true;$('flag-other').value='';}
 else{$('flag-select').value='OTHER';$('flag-other-row').hidden=false;$('flag-other').value=curFlag;}
 $('school-cat').value=getS().schoolCat||'';$('school-name').value=getS().school||'';
 txt('age-error','');showDialog('age-dialog');$('age-band').focus();
}
wire('flag-select','onchange',()=>{$('flag-other-row').hidden=$('flag-select').value!=='OTHER';});
/* School name suggestions. Names come from real data only -- the operator's
 * optional ./data/schools.json export and the school names the hall of fame
 * already returns -- so nothing here invents an institution that doesn't exist. */
/* Each entry is {name, region, cat}. The region is shown because 11 schools
 * are called 금성초등학교 and a name-only picker cannot be used; only the name
 * is written into the field, since the hall of fame aggregates by name. */
const schoolList=[];
const schoolSeen=new Set();
function addSchoolEntry(name,region,cat){
 const t=String(name||'').trim();if(!t)return;
 const key=t+'|'+(region||'');if(schoolSeen.has(key))return;
 schoolSeen.add(key);schoolList.push({name:t,region:region||'',cat:cat||''});
}
function addSchoolNames(list){for(const v of list||[])addSchoolEntry(v,'','');}
// The national list is a large file, so it is fetched the first time someone
// actually uses the school field -- never on page load, and never for a
// visitor who only plays.
let schoolListLoad=null;
function loadSchoolList(){
 if(schoolListLoad)return schoolListLoad;
 schoolListLoad=fetch('./data/schools.json').then(r=>r.ok?r.json():null).then(d=>{
  if(!d)return;
  const regions=Array.isArray(d.regions)?d.regions:[];
  for(const row of d.schools||[]){
   if(Array.isArray(row))addSchoolEntry(row[0],regions[row[1]]||'',row[2]||'');
   else if(typeof row==='string')addSchoolEntry(row,'','');
   else if(row)addSchoolEntry(row.name,row.region,row.cat);
  }
  if(document.activeElement===$('school-name'))renderSchoolSuggest();
 }).catch(()=>{});
 return schoolListLoad;
}
let schoolPick=-1;
function schoolMatches(query){
 const q=query.trim().toLowerCase();if(q.length<2)return [];
 const cat=$('school-cat').value;
 // A chosen school level narrows the list; entries with no level (names that
 // came from the hall of fame) always stay visible.
 const pool=schoolList.filter(x=>!cat||!x.cat||x.cat===cat);
 const starts=[],rest=[];
 for(const item of pool){
  const n=item.name.toLowerCase();
  if(n.startsWith(q))starts.push(item);
  else if(n.includes(q))rest.push(item);
  if(starts.length>=8)break;
 }
 return starts.concat(rest).slice(0,8);
}
function closeSchoolSuggest(){const box=$('school-suggest');box.hidden=true;box.replaceChildren();schoolPick=-1;$('school-name').setAttribute('aria-expanded','false');}
function renderSchoolSuggest(){
 const box=$('school-suggest'),items=schoolMatches($('school-name').value);
 box.replaceChildren();schoolPick=-1;
 if(!items.length){closeSchoolSuggest();return;}
 items.forEach((item,i)=>{
  const b=document.createElement('button');b.type='button';b.className='suggest-item';b.setAttribute('role','option');b.dataset.index=i;b.dataset.name=item.name;
  const n=document.createElement('span');n.textContent=item.name;b.append(n);
  if(item.region){const r=document.createElement('small');r.textContent=item.region;b.append(r);}
  b.onmousedown=event=>{event.preventDefault();$('school-name').value=item.name;closeSchoolSuggest();};
  box.append(b);
 });
 box.hidden=false;$('school-name').setAttribute('aria-expanded','true');
}
function moveSchoolPick(step){
 const options=[...$('school-suggest').querySelectorAll('.suggest-item')];if(!options.length)return;
 schoolPick=(schoolPick+step+options.length)%options.length;
 options.forEach((el,i)=>el.classList.toggle('active',i===schoolPick));
 options[schoolPick].scrollIntoView({block:'nearest'});
}
listen('school-name','focus',loadSchoolList,{once:true});
listen('school-name','input',()=>{loadSchoolList();renderSchoolSuggest();});
listen('school-name','blur',()=>setTimeout(closeSchoolSuggest,120));
listen('school-name','keydown',event=>{
 if($('school-suggest').hidden)return;
 const options=[...$('school-suggest').querySelectorAll('.suggest-item')];
 if(event.key==='ArrowDown'){event.preventDefault();moveSchoolPick(1);}
 else if(event.key==='ArrowUp'){event.preventDefault();moveSchoolPick(-1);}
 else if(event.key==='Enter'&&schoolPick>=0){event.preventDefault();$('school-name').value=options[schoolPick].dataset.name;closeSchoolSuggest();}
 else if(event.key==='Escape')closeSchoolSuggest();
});
$('age-form').addEventListener('submit',async event=>{
 event.preventDefault();if(busy)return;
 if(!C.band($('age-band').value)){txt('age-error',tr('나이대를 먼저 골라 주세요.','Please select an age band.'));return;}
 busy=true;
 try{
  const band=$('age-band').value,easy=$('age-easy').checked,nick=$('nickname').value.trim().normalize('NFC');
  const flagRaw=$('flag-select').value==='OTHER'?$('flag-other').value.trim().toUpperCase():$('flag-select').value;
  const flag=/^[A-Z]{2}$/.test(flagRaw)?flagRaw:'KR';
  const schoolCat=$('school-cat').value,schoolName=$('school-name').value.trim().slice(0,60);
  await mutate(s=>{
   M.selectProfile(s,band,easy);if(!s.name||s.name.length<=40)s.name=nick;
   s.flag=flag;s.schoolCat=schoolCat;s.school=schoolName;
   if(!s.recoveryCode)s.recoveryCode=String(Math.floor(1000+Math.random()*9000));
  });
  closeDialog('age-dialog');const next=ageNext;ageNext=null;renderHome();if(next)next();
 }catch(e){txt('age-error',tr('설정을 저장하지 못했습니다. 내 기록에서 먼저 백업해 주세요.','Settings could not be saved. Back up your record first.'));}
 finally{busy=false;}
});
function start(mode,forceAge=false){
 if(!guarded())return;
 setupAge(()=>begin(mode),forceAge||mode==='placement');
}
function begin(mode){
 const s=getS();C.ensureProfile(s.learningProfile);
 const items=mode==='placement'?[]:C.lesson(s.learningProfile,s.m,language,5,Math.random,mode);
 if(mode==='review'&&!items.length){toast(tr('새 독도 과정에서 배운 내용이 아직 없어요. 먼저 한 단원을 배워 주세요.','Learn a unit in the new Dokdo course before reviewing it.'));return;}
 lesson={mode,items,diagnostic:mode==='placement'?C.createPlacement(s.learningProfile):null,index:0,total:mode==='placement'?5:items.length,first:0,corrected:0,xp:0,answered:false,retrying:false,needsRetry:false};
 view('learn',true);$('learning-menu').hidden=true;$('course-catalog').hidden=true;$('lesson').hidden=false;$('lesson-result').hidden=true;nextItem();
}
function renderCatalog(){
 const s=getS(),p=s?.learningProfile;const list=$('course-unit-list');list.replaceChildren();
 txt('catalog-age',tr('시작 수준 바꾸기','Change starting path'));
 txt('path-name',p?C.trackName(p,language)+tr(' · 독도 과정',' · Dokdo course'):tr('나에게 맞는 독도 과정','Your Dokdo pathway'));
 txt('path-explanation',p?tr('한 단원은 이어지는 5개 개념입니다. 지리·생태·생활·역사를 함께 배우며, 배움 완료와 오래 기억한 숙달은 따로 표시합니다.','Each unit connects five concepts. Geography, ecology, living and history are covered; completion and lasting mastery are distinct.'):tr('나이대를 고르면 시작 단원과 묻는 방식이 달라집니다. 중학생은 칙령 제41호부터, 초등 저학년은 독도의 위치와 구성부터 시작합니다.','Your selected path changes the starting unit and cognitive demands. Middle school begins with Decree No. 41; early primary begins with Dokdo’s location and composition.'));
 for(const u of C.DATA.units){
  const done=!!p?.course?.completed[p.course.track+':'+u.id];const b=document.createElement('button');b.type='button';b.className='unit-button'+(done?' done':'')+(p?.course?.unit===u.id?' current':'');b.dataset.unit=u.id;
  const n=document.createElement('span');n.textContent=String(u.id).padStart(2,'0');const title=document.createElement('b');title.textContent=u[language];const note=document.createElement('small');note.textContent=done?tr('배움 완료 · 다시 배우기','Completed · learn again'):tr(u.category+' · 5개념','5 connected concepts');b.append(n,title,note);
  b.onclick=()=>setupAge(async()=>{try{await mutate(st=>{C.ensureProfile(st.learningProfile);st.learningProfile.course.unit=u.id;});begin('daily');}catch(e){}});list.append(b);
 }
 // 예전에는 열 수 없으면 버튼째 숨겨서, 열두 단원을 다 마친 사람이 무엇을
 // 더 해야 하는지 알 길이 없었습니다. 이제 이유와 함께 보여 줍니다.
 const e=p?C.courseEvidence(p,s.m):null;
 const adult=p?.course?.track==='adult';
 const btn=$('deeper-course');
 if(btn){
  const show=!!e&&!adult&&(e.ready||e.completed>=12);
  btn.hidden=!show;btn.disabled=!!e&&!e.ready;
  const left=e?Math.max(0,12-e.concepts):0;
  btn.textContent=!e||e.ready?tr('다음 깊이의 과정 열기','Open a deeper pathway')
   :tr(`더 깊은 과정까지 개념 ${left}개 · 복습으로 다질 수 있어요`,`${left} concepts to go · secure them with review`);
 }
}
$('catalog-age').onclick=()=>setupAge(()=>{renderCatalog();renderHome();},true);
$('deeper-course').onclick=async()=>{try{await mutate(s=>{if(!C.advanceTrack(s.learningProfile,s.m))throw Error('Review evidence is not ready.');});renderCatalog();renderHome();}catch(e){}};
function nextItem(){
 if(!lesson)return;
 lesson.item=lesson.mode==='placement'?C.pickPlacement(lesson.diagnostic,language):lesson.items[lesson.index];
 lesson.order=C.shuffled(lesson.item.choices.map((_,i)=>i));lesson.answer=lesson.order.indexOf(lesson.item.answer);
 lesson.answered=false;lesson.retrying=false;lesson.needsRetry=false;lesson.usedHelp=false;
 renderQuestion(lesson.mode==='daily'&&lesson.index===0);
}
function renderQuestion(teach=false){
 const q=lesson;if(!q)return;
 const s0=getS();if(s0)renderGradeLine('lesson-grade',s0,M.summary(s0));
 txt('lesson-position',`${q.index+1} / ${q.total}`);$('lesson-progress').max=q.total;$('lesson-progress').value=q.index;
 txt('lesson-mode',q.mode==='placement'?tr('시작점 찾기','Starting check'):q.mode==='review'?tr('기억 꺼내기','Recall'):tr('함께 익히기','Learn together'));
 txt('lesson-stage',C.unitInfo(q.item.unit)[language]+' · '+C.COG[language][q.item.cognitive]);
 $('teaching').hidden=!teach;$('question-area').hidden=teach;$('question-feedback').hidden=true;$('retry-question').hidden=true;$('next-question').hidden=true;
 txt('teaching-text',C.unitInfo(q.item.unit).reading[language]);txt('question-title',q.item.q);
 $('question-options').replaceChildren();
 q.order.forEach((sourceIndex,i)=>{
  const b=document.createElement('button');b.type='button';b.className='answer-option';b.dataset.index=i;
  const n=document.createElement('span');n.className='answer-number';n.textContent=i+1;n.setAttribute('aria-hidden','true');
  const t=document.createElement('span');t.textContent=q.item.choices[sourceIndex];
  b.append(n,t);b.onclick=()=>choose(i);$('question-options').append(b);
 });
 $('dont-know').hidden=q.mode!=='placement';
 renderTeachingHelp(q.item);material(q.item);
 if(!teach)$('question-title').focus({preventScroll:true});
}
function renderTeachingHelp(item){
 const el=$('teaching-help'),list=$('teaching-help-list');if(!el||!list)return;list.replaceChildren();
 const corpus=C.unitInfo(item.unit)?.reading?.[language]||'';
 const glossary=language==='ko'?C.DATA.glossary:{'decree':'A formal order issued by an authority.','county':'An administrative district; it is not the same as one island.','magistrate':'The official responsible for administering a county.','jurisdiction':'The area an authority is responsible for administering.','erosion':'The wearing away and removal of rock or soil.','weathering':'The breakdown of rock exposed to the environment.','stratum':'A layer of rock or sediment.','gazette':'An official publication that records government notices.','evidence':'Information used to support an explanation.','plankton':'Small organisms that drift in water.','desalination':'Removing salt from seawater to produce fresh water.'};
 for(const [term,definition] of Object.entries(glossary)){if(corpus.toLowerCase().includes(term.toLowerCase())){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=term;dd.textContent=definition;list.append(dt,dd);}}
 el.querySelector('summary').textContent=tr('낯선 말 함께 읽기','Help with unfamiliar words');el.hidden=!list.children.length;
}
function renderQuestionSources(item){
 const box=$('question-citations');if(!box)return;box.replaceChildren();
 const links=document.createElement('div');links.className='source-links';
 const label=document.createElement('span');label.textContent=tr('출처','Sources');links.append(label);
 for(const source of item.sources){const a=document.createElement('a');a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=(language==='en'?source.titleEn:source.title)+' ↗';links.append(a);}
 box.append(links);
 if(item.scope){const scope=document.createElement('p');scope.className='source-scope';scope.textContent=item.scope;box.append(scope);}
 const historical=item.sources.filter(s=>s.originalCreator);
 if(historical.length){const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent=tr('원문 작성자와 해설 기관 구분','Historical author and modern publisher');details.append(summary);
  for(const source of historical){const p=document.createElement('p');p.className='source-provenance';p.textContent=tr('원문: ','Historical source: ')+source.originalCreator[language]+tr(' · 번역·해설 공개: ',' · Translation/commentary published by: ')+(language==='en'?source.titleEn:source.title);details.append(p);}box.append(details);
 }
}
function material(item){
 const context=$('question-context');context.replaceChildren();context.hidden=!item.context;
 if(item.context){const title=document.createElement('b');title.textContent=tr('알아두기','Background');const span=document.createElement('span');span.textContent=item.context;context.append(title,span);}
 const el=$('question-material'),body=$('question-material-body');body.replaceChildren();el.hidden=!item.material;
 // 자료를 봐야 풀 수 있는 문항은 접어 두면 안 됩니다. 접혀 있으면 자료가 있는
 // 줄도 모른 채 보기만 보고 찍게 됩니다.
 el.open=!!item.requiresMaterial;
 if(item.requiresMaterial&&!item.material)throw Error('Required question evidence is missing.');
 if(item.material){const p=document.createElement('p');p.textContent=item.material;body.append(p);}
 renderQuestionSources(item);
 const help=$('word-help'),list=$('word-help-list');
 if(help&&list){list.replaceChildren();const corpus=item.q+' '+item.material+' '+item.context+' '+item.explain;
  if(language==='ko')for(const [term,definition] of Object.entries(C.DATA.glossary)){if(corpus.includes(term)){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=term;dd.textContent=definition;list.append(dt,dd);}}
  help.hidden=!list.children.length;
 }
}
async function choose(pick,skip=false){
 const q=lesson;if(!q||q.answered||busy||(!skip&&(!Number.isInteger(pick)||pick<0||pick>=q.order.length)))return;
 busy=true;const ok=!skip&&pick===q.answer,retry=q.retrying;
 try{
  const awarded=await mutate(s=>M.answer(s,q.item,ok,{mode:q.mode,retry,skipped:skip,helped:!!q.usedHelp}));
  // Persistent commit succeeded before moving the question forward.
  if(window.DokdoLeaderboard){const cur=getS();DokdoLeaderboard.postEvent({
   nick:cur.name||'',flag:cur.flag||'KR',grade:cur.grade||'K',qid:q.item.id,ok:ok?1:0,
   run:cur.run||0,best:cur.best||0,mode:q.mode,school:cur.school||'',schoolCode:'',schoolCat:cur.schoolCat||''
  }).catch(()=>{});}
  if(window.DokdoAnalytics)DokdoAnalytics.track('question_answered',{qid:q.item.id,correct:ok?1:0,qtype:q.item.atype||q.mode,grade:getS().grade||'K',retry:retry?1:0});
  q.answered=true;q.needsRetry=q.mode!=='placement'&&!ok;
  {const s2=getS();if(s2)renderGradeLine('lesson-grade',s2,M.summary(s2));}
  if(q.mode==='placement'){C.recordPlacement(q.diagnostic,q.item,ok,skip);if(ok)q.first++;}
  else if(!retry){if(ok)q.first++;q.xp+=awarded.xp;}
  else if(ok)q.corrected++;
  const buttons=[...$('question-options').children];buttons.forEach((b,i)=>{
   b.disabled=true;const mark=document.createElement('span');mark.className='answer-mark';
   if(i===pick){b.classList.add(ok?'correct':'incorrect');mark.textContent=ok?'✓':'×';b.append(mark);}
  });
  $('dont-know').hidden=true;$('question-feedback').hidden=false;$('question-feedback').classList.toggle('bad',!ok);$('question-feedback').replaceChildren();
  const head=document.createElement('h3');head.textContent=(ok?'💡 ':'🤔 ')+(ok?(retry?tr('이제 이해했어요','Now you have it'):tr('잘 찾았어요','Well spotted')):tr('괜찮아요. 함께 다시 알아봐요.','That is okay. Let us work it out.'));
  const text=document.createElement('p');text.textContent=!ok&&!skip?q.item.wrong[q.order[pick]]:q.item.explain;
  const note=document.createElement('small');note.textContent=q.mode==='placement'?tr('시작점 확인은 이어갑니다. 틀린 뒤에는 같은 단계나 더 쉬운 문제를 살펴봅니다.','The starting check continues, at the same or an easier level after a mistake.'):retry?tr('불빛은 켜집니다. 다만 점수는 처음부터 맞혔을 때만 쌓여요.','The light still comes on. Points, though, count only a first-try answer.'):tr('불빛은 남습니다. 오래 기억했는지는 다른 날 복습으로 확인해요.','Your earned lights remain. Later review checks lasting recall.');
  const correctLine=document.createElement('p');correctLine.className='feedback-answer';correctLine.textContent=tr('정답: ','Answer: ')+q.item.choices[q.item.answer];
  const takeaway=document.createElement('p');takeaway.className='feedback-takeaway';takeaway.textContent=tr('기억할 독도 한 가지 · ','One Dokdo fact to remember · ')+q.item.fact;
  const report=document.createElement('button');report.type='button';report.className='text-button dispute-button';report.textContent=tr('이 문제가 이상한가요? 이의제기','Something wrong with this question?');
  report.onclick=()=>openDispute(q.item);
  $('question-feedback').append(head,correctLine,text,takeaway,note,report);
  $('retry-question').hidden=!q.needsRetry;$('next-question').hidden=q.needsRetry;
  txt('next-question',q.index+1===q.total?tr('결과 보기','See results'):tr('다음으로','Continue'));
  $('question-feedback').scrollIntoView({block:'nearest',behavior:'smooth'});
 }catch(e){}finally{busy=false;}
}
$('read-done').onclick=()=>{if(!lesson)return;$('teaching').hidden=true;$('question-area').hidden=false;$('question-title').focus();};
$('retry-question').onclick=()=>{if(!lesson?.needsRetry||busy)return;lesson.retrying=true;lesson.answered=false;lesson.needsRetry=false;renderQuestion(false);};
$('dont-know').onclick=()=>choose(-1,true);
$('word-help')?.addEventListener('toggle',()=>{if(lesson&&$('word-help').open)lesson.usedHelp=true;});
async function next(){
 if(!lesson||busy||!lesson.answered||lesson.needsRetry)return;
 if(lesson.index+1<lesson.total){lesson.index++;nextItem();$('lesson').scrollIntoView({block:'start',behavior:'instant'});return;}
 busy=true;
 try{
  const q=lesson;
  const outcome=await mutate(s=>{
   if(q.mode==='placement'){
    const suggested=C.recommend(q.diagnostic),p=s.learningProfile,old=p.stage;
    p.placement={at:new Date().toISOString(),correct:q.first,total:5,suggested,answers:q.diagnostic.answers};
    p.course.unit=C.recommendUnit(q.diagnostic);return {stage:p.stage,advanced:false,unit:p.course.unit,suggested};
   }
   return M.finish(s,Date.now(),q.mode==='daily'?q.items:[]);
  });
  const gradeNow=getS().grade||'K';
  if(window.DokdoAnalytics){
   if(q.mode==='placement')DokdoAnalytics.track('placement_done',{correct:q.first,grade:gradeNow});
   else{
    const total=q.total||1;
    DokdoAnalytics.track('lesson_complete',{mode:q.mode,correct:q.first,total,percent:Math.round(100*q.first/total),grade:gradeNow});
    if(outcome.advanced)DokdoAnalytics.track('grade_up',{grade:gradeNow,by:'lesson'});
   }
  }
  $('lesson').hidden=true;$('lesson-result').hidden=false;renderResult(q,outcome);lesson=null;lightDirty=true;
 }catch(e){}finally{busy=false;}
}
$('next-question').onclick=next;
function renderResult(q,outcome){
 const el=$('lesson-result');el.replaceChildren();
 const star=document.createElement('div');star.className='result-star';star.textContent='✧';
 const title=document.createElement('h2');title.textContent=q.mode==='placement'?tr('여기서 편하게 시작해요','Start comfortably here'):outcome.advanced?tr('다음 탐험이 열렸어요','Your next exploration is ready'):tr('오늘도 독도가 조금 더 빛나요','Dokdo shines a little brighter today');
 const count=document.createElement('p');count.className='result-score mono';count.textContent=`${q.first} / ${q.total}`;
 const desc=document.createElement('p');desc.textContent=q.mode==='placement'?C.unitInfo(outcome.unit)[language]+' · '+C.DIFFICULTY[language][outcome.suggested]:tr(`처음 답해서 맞힌 문제 ${q.first}개 · 해설 후 확인 ${q.corrected}개`,`${q.first} correct first attempts · ${q.corrected} corrections with help`);
 const note=document.createElement('p');note.className='fine';note.textContent=q.mode==='placement'?tr('다섯 문제로 학교 학년이나 학력을 판정하지 않습니다. 기존 성취는 유지됩니다.','Five questions do not certify a school grade. Previous achievements remain.'):tr('기억은 다른 날 다시 확인해요. 이미 얻은 불빛과 봉화는 사라지지 않습니다.','Review again on another day. Earned lights and beacons are never taken away.');
 const facts=document.createElement('div');facts.className='lesson-takeaway';const h=document.createElement('h3');h.textContent=tr('이번에 알게 된 독도','Dokdo knowledge to take away');const para=document.createElement('p');para.textContent=(q.mode==='placement'?q.diagnostic.answers.map(a=>C.getQuestion(a.id,language)):q.items).map(it=>it.fact).join(' ');facts.append(h,para);
 // 열두 단원을 다 마치면 예전에는 아무 말 없이 같은 단원만 되풀이됐습니다.
 // 무슨 일이 일어났는지, 다음에 무엇을 하면 되는지 여기서 알려 줍니다.
 let done=null;
 if(q.mode!=='placement'&&outcome.evidence&&outcome.evidence.completed>=12){
  done=document.createElement('p');done.className='course-done';
  const left=Math.max(0,12-(outcome.evidence.concepts||0));
  done.textContent=left
   ?tr(`이 과정의 열두 단원을 모두 마쳤어요. 이제 배운 문제가 다시 돌아옵니다. ‘기억 꺼내기 · 복습’을 서로 다른 이틀에 해서 개념 ${left}개를 더 다지면 더 깊은 과정이 열려요.`,`You have finished all twelve units. Learned questions now come back around. Review on two separate days to secure ${left} more concepts, and a deeper pathway opens.`)
   :tr('이 과정의 열두 단원을 모두 마쳤어요. 학습하기에서 더 깊은 과정을 열 수 있습니다.','You have finished all twelve units. Open a deeper pathway from the learning menu.');
 }
 const row=document.createElement('div');row.className='button-row';
 const home=document.createElement('button');home.className='button primary';home.textContent=tr('내 독도로 돌아가기','Back to my Dokdo');home.onclick=()=>view('home');
 const more=document.createElement('button');more.className='button secondary';more.textContent=tr('한 번 더 배우기','Learn a little more');more.onclick=()=>start('daily');row.append(home,more);
 if(done){const go=document.createElement('button');go.className='button secondary';go.textContent=tr('과정 목록 보기','Open the course list');go.onclick=()=>{view('learn');renderCatalog();};row.append(go);}
 el.append(star,title,count,desc,note,...(done?[done]:[]),facts,row,renderShareRow());el.focus();
}
function shareTrack(channel){if(window.DokdoAnalytics)DokdoAnalytics.track('share_click',{channel});}
/* V1's share sheet was a full-width list -- icon, what it does, and one line
 * saying what will happen. V2 had the same six actions squeezed into a row of
 * small buttons with no explanation, which on a phone read as a jumble. Same
 * actions, laid out so they can be read and hit with a thumb. */
function shareButton(label,onClick,icon,hint){
 const b=document.createElement('button');b.className='share-item';b.onclick=onClick;
 const ic=document.createElement('span');ic.className='share-item-icon';ic.setAttribute('aria-hidden','true');ic.textContent=icon||'↗';
 const box=document.createElement('span');box.className='share-item-text';
 const t1=document.createElement('strong');t1.textContent=label;box.append(t1);
 if(hint){const t2=document.createElement('small');t2.textContent=hint;box.append(t2);}
 b.append(ic,box);return b;
}
/* What gets copied. V1 pasted a record someone would actually want to show;
 * V2 pasted little more than a link. Built from the learner's own numbers. */
function bragText(){
 const s=getS();if(!s)return'';
 const a=M.summary(s),gp=Core.gradeProgress(a.gradeScore);
 const who=a.name||tr('독도 코리아 스쿨','Dokdo Korea School');
 return tr(
  `${who} · ${levelText(gp)} ${gradeLabel(gp.grade)} · 정답 ${num(a.correct)}문제 · 밝힌 불빛 ${num(a.lights)}개 · ${num(a.xp)} XP`,
  `${who} · ${levelText(gp)} · ${num(a.correct)} correct · ${num(a.lights)} lights · ${num(a.xp)} XP`);
}
function renderShareRow(){
 const wrap=document.createElement('div');wrap.className='share-row';
 const label=document.createElement('p');label.className='fine';label.textContent=tr('독도 코리아 스쿨을 다른 사람에게 알려주세요. "라이브에 공유하기"만 내 별명과 기록이 포함되고, 나머지는 점수·이름이 포함되지 않습니다.','Tell someone else about Dokdo Korea School. Only "Share to the live chat" includes your nickname and record — the rest never include your score or name.');
 const row=document.createElement('div');row.className='share-list';
 row.append(shareButton(tr('링크 복사','Copy link'),async()=>{
  shareTrack('link');const res=await DokdoShare.copyLink();
  toast(res.state==='copied'?tr('링크를 복사했습니다.','Link copied.'):tr('복사하지 못했습니다.','Could not copy the link.'));
 },'🔗',tr('주소만 복사합니다','Copies the address only')));
 row.append(shareButton(tr('결과 이미지 저장','Save an image'),()=>{shareTrack('card');saveImage();},'📸',tr('사진첩에 저장하거나 바로 공유합니다','Save to photos or share it straight away')));
 // The Kakao popup share flow only works reliably on mobile (where it
 // hands off to the KakaoTalk app); on desktop it opens an unauthenticated
 // blank popup, so the button is hidden there rather than shown broken.
 const isMobileDevice=navigator.userAgentData?navigator.userAgentData.mobile:/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
 if(isMobileDevice&&window.DokdoShare&&DokdoShare.isKakaoConfigured()){
  row.append(shareButton(tr('카카오톡으로 보내기','Send via KakaoTalk'),async()=>{
   shareTrack('kakaotalk');const res=await DokdoShare.kakaoShare();
   if(res.state==='error')toast(tr('카카오톡 공유를 열지 못했습니다. 이 주소가 카카오 개발자 콘솔에 등록돼 있어야 합니다.','Could not open KakaoTalk sharing. This address must be registered in the Kakao developer console.'));
  },'💬',tr('대화방을 직접 엽니다','Opens a KakaoTalk chat directly')));
 }
 if(window.DokdoShare&&DokdoShare.nativeShareSupported()){
  row.append(shareButton(tr('다른 앱으로 공유','Share to another app'),async()=>{
   shareTrack('device');const res=await DokdoShare.nativeShare();
   if(res.state==='not_supported'||res.state==='error')toast(tr('이 기기에서는 공유창을 열 수 없습니다.','Sharing isn’t available on this device.'));
  },'📤',tr('기기 공유창을 엽니다','Opens your device share sheet')));
 }
 row.append(shareButton(tr('인스타그램에 올리기','Post to Instagram'),()=>{
  shareTrack('instagram');saveImage();
  toast(tr('이미지를 저장했습니다. 인스타그램을 열어 직접 올려 주세요.','The image was saved. Open Instagram to post it yourself.'));
 },'📷',tr('이미지를 저장한 뒤 인스타를 엽니다','Saves the image, then opens Instagram')));
 const yt=(window.DOKDO_SITE_CONFIG&&window.DOKDO_SITE_CONFIG.youtube)||{};
 if(yt.liveUrl||yt.channelUrl){
  row.append(shareButton(tr('독도 코리아 라이브에 공유하기','Share to the Dokdo Korea live chat'),async()=>{
   shareTrack('live');
   // window.open must run synchronously in the click handler, before any
   // await -- Safari (and most browsers) silently block a popup opened
   // after an awaited promise, leaving a blank "about:blank" tab.
   window.open(yt.liveUrl||yt.channelUrl,'_blank','noopener');
   const brag=bragText();
   const res=await DokdoShare.copyForChat(brag);
   toast(res.state==='copied'?tr('채팅용 한 줄을 복사했습니다. 라이브를 열어 붙여넣어 주세요.','Copied a one-line message for chat. Open the live stream and paste it there.'):tr('복사하지 못했습니다.','Could not copy the text.'));
  },'▶',tr('채팅용 한 줄로 복사하고 방송을 엽니다','Copies a one-line brag and opens the stream')));
 }
 wrap.append(label,row);return wrap;
}
function renderJournal(){
 const s=getS();if(!s)return;
 const unlocked=Object.keys(s.visual.unlocks).length>0;txt('bird-unlocked',unlocked?tr('만남을 기록했어요','Encounter recorded'):tr('아직 만나기 전','Not encountered yet'));
 txt('bird-unlock-rule',unlocked?tr('성취는 도감에 남습니다. 다시 보기는 점수나 새 보상을 추가하지 않아요.','Your discovery stays. Replaying does not add points or awards.'):tr('독도 단원을 세 개 마치거나 생태 단원을 처음 완료하면 만날 수 있어요.','Meet this visitor after completing three Dokdo units or a first ecology unit.'));
 // Left enabled when locked so the click explains how to unlock it instead of
 // being a dimmed button that does nothing.
 $('bird-replay').disabled=store.blocked;
 renderJournalMore();
}
/* Every line here is the curriculum's own reviewed sentence for that species,
 * shown with the same public source it was written from -- the journal never
 * states an ecological claim the course data does not already carry. */
const JOURNAL_SPECIES=[
 {ko:'바다제비 · 슴새',en:'Storm petrel · Streaked shearwater',
  textKo:'괭이갈매기·바다제비·슴새는 독도에서 번식하는 바닷새로 소개돼요.',
  textEn:'Black-tailed gulls, storm petrels and streaked shearwaters are recorded as breeding seabirds on Dokdo.',src:'reserve'},
 {ko:'해국 · 섬기린초 · 땅채송화',en:'Seaside daisy · Island stonecrop · Rock stonecrop',
  textKo:'독도 땅에는 해국·섬기린초·땅채송화 같은 식물이 자라요.',
  textEn:'Plants on Dokdo include seaside daisy, island stonecrop and rock stonecrop.',src:'nature'},
 {ko:'강치',en:'Sea lion',
  textKo:'독도에는 강치가 살았으며, 지나친 포획은 강치의 감소와 멸종에 큰 영향을 주었어요.',
  textEn:'Sea lions once lived on Dokdo, and excessive hunting contributed greatly to their decline and extinction.',src:'gangchi'}
];
function renderJournalMore(){
 const box=$('journal-more');if(!box)return;box.replaceChildren();
 for(const entry of JOURNAL_SPECIES){
  const source=C.DATA.sources[entry.src];
  const card=document.createElement('article');card.className='journal-entry';
  const name=document.createElement('h3');name.textContent=language==='en'?entry.en:entry.ko;
  const text=document.createElement('p');text.textContent=language==='en'?entry.textEn:entry.textKo;
  card.append(name,text);
  if(source){
   const link=document.createElement('a');link.className='source-link';link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';
   link.textContent=(language==='en'?source.titleEn||source.title:source.title)+' ↗';card.append(link);
  }
  box.append(card);
 }
}
let hallSchoolFilter='E';
function hallShow(which){
 for(const id of['hall-not-configured','hall-loading','hall-error','hall-content'])$(id).hidden=id!==which;
}
function hallRenderList(container,rows,cols){
 container.replaceChildren();
 if(!rows||!rows.length){const p=document.createElement('p');p.className='fine';p.textContent=tr('아직 집계된 참여가 없습니다.','No participation recorded yet.');container.append(p);return;}
 const table=document.createElement('table');
 const thead=document.createElement('thead');const htr=document.createElement('tr');
 for(const c of cols){const th=document.createElement('th');th.textContent=c.label;htr.append(th);}
 thead.append(htr);table.append(thead);
 const tbody=document.createElement('tbody');
 for(const row of rows){const tr2=document.createElement('tr');for(const c of cols){
  const td=document.createElement('td');const v=row[c.key];
  // Anyone who actually typed a school gets it shown brightly; a blank one
  // stays dim so the two are told apart at a glance on a projector.
  if(c.key==='school'||c.key==='name'){
   const has=v!=null&&String(v).trim()!=='';
   td.textContent=has?String(v):'—';td.className=has?'hall-affil':'hall-affil-none';
  }else td.textContent=v??'';
  tr2.append(td);}tbody.append(tr2);}
 table.append(tbody);container.append(table);
}
async function renderHall(){
 if(!window.DokdoLeaderboard||!DokdoLeaderboard.isConfigured()){hallShow('hall-not-configured');return;}
 hallShow('hall-loading');
 const res=await DokdoLeaderboard.fetchWeekly();
 if(res.state==='error'){hallShow('hall-error');$('hall-error-text').textContent=tr('이번 주 기록을 불러오지 못했습니다: ','Could not load this week’s data: ')+res.error;return;}
 if(res.state==='not_configured'){hallShow('hall-not-configured');return;}
 const d=res.data||{};
 // Real school names already entered by participants feed the setup-form search.
 for(const rows of Object.values(d.schools||{}))addSchoolNames((rows||[]).map(r=>r&&r.name));
 hallShow('hall-content');
 $('hall-summary').replaceChildren();
 for(const [n,label] of [[d.today,tr('오늘 참여 시도','Attempts today')],[d.people,tr('오늘 참여자','Participants today')],[d.people_week,tr('이번 주(최대 60명)','This week (up to 60)')]]){
  const div=document.createElement('div'),v=document.createElement('strong'),t=document.createElement('small');
  v.textContent=n==null?'—':num(n);t.textContent=label;div.append(v,t);$('hall-summary').append(div);
 }
 const ticker=$('hall-ticker-track'),weekEntries=d.week||[];
 if(ticker){
  ticker.replaceChildren();
  const highlights=[];
  // Streak field isn't part of the documented week-row shape (nick/school/
  // correct/days) -- only surface it if the server actually sends one,
  // never a fabricated number.
  const streakOf=r=>Number.isFinite(r.best)?r.best:Number.isFinite(r.streak)?r.streak:null;
  const streakLeader=weekEntries.reduce((best,r)=>{const v=streakOf(r);return v!=null&&(!best||v>streakOf(best))?r:best;},null);
  if(streakLeader)highlights.push(`🔥 ${streakLeader.nick} · ${tr('연속','Streak')} ${num(streakOf(streakLeader))}`);
  const medals=['🥇','🥈','🥉'];
  weekEntries.slice(0,3).forEach((r,i)=>highlights.push(`${medals[i]} ${r.nick} · ${tr('정답','Correct')} ${num(r.correct)}`));
  if(highlights.length){
   for(let rep=0;rep<2;rep++)for(const h of highlights){const span=document.createElement('span');span.textContent=h;ticker.append(span);}
   $('hall-ticker').hidden=false;
  }else $('hall-ticker').hidden=true;
 }
 hallRenderList($('hall-week-list'),d.week,[
  {key:'nick',label:tr('별명','Nickname')},{key:'school',label:tr('학교','School')},
  {key:'correct',label:tr('정답','Correct')},{key:'days',label:tr('참여일','Days')}
 ]);
 const tabs=$('hall-school-tabs');tabs.replaceChildren();
 for(const cat of['E','M','H','W']){
  const b=document.createElement('button');b.className='fact-tab'+(cat===hallSchoolFilter?' selected':'');b.setAttribute('aria-pressed',String(cat===hallSchoolFilter));
  b.textContent={E:tr('초등','Elem.'),M:tr('중등','Middle'),H:tr('고등','High'),W:tr('해외한국학교','Korean sch. abroad')}[cat];
  b.onclick=()=>{hallSchoolFilter=cat;renderHall();};tabs.append(b);
 }
 hallRenderList($('hall-school-list'),(d.schools&&d.schools[hallSchoolFilter])||[],[
  {key:'name',label:tr('학교','School')},{key:'correct',label:tr('정답','Correct')},{key:'people',label:tr('인원','People')}
 ]);
 hallRenderList($('hall-recent-list'),d.recent,[
  {key:'nick',label:tr('별명','Nickname')},{key:'flag',label:tr('국가','Country')},{key:'min',label:tr('분 전','Min. ago')}
 ]);
}
function renderRecords(){
 const s=getS();$('record-summary').replaceChildren();
 if(s){
  const a=M.summary(s);
  for(const [n,label] of [[a.correct,tr('누적 정답','Lifetime correct')],[a.lights,tr('불빛','Lights')],[a.beacons,tr('봉화','Beacons')],[a.xp,'XP']]){
   const d=document.createElement('div'),v=document.createElement('strong'),t=document.createElement('small');v.textContent=num(n);t.textContent=label;d.append(v,t);$('record-summary').append(d);
  }
  renderWeeks(s);
  const legacy=document.createElement('p');legacy.className='fine';legacy.style.gridColumn='1 / -1';
  legacy.textContent=tr(`학년: ${gradeLabel(Core.gradeProgress(a.gradeScore).grade)} · 연속 출석 ${s.streak||0}일 (주간 집계와 별도)`,`Grade: ${gradeLabel(Core.gradeProgress(a.gradeScore).grade)} · Attendance streak: ${s.streak||0} (separate from weekly totals)`);
  $('record-summary').append(legacy);
 }
 renderLegacy();updateStorageStatus();renderCloudPanel(s);renderBadges(s);
}
function badgeTile(b){
 const tile=document.createElement('div');tile.className='badge-tile'+(b.earned?' earned':'');tile.dataset.group=b.group;
 const icon=document.createElement('span');icon.className='badge-icon';icon.setAttribute('aria-hidden','true');icon.textContent=b.icon;
 const name=document.createElement('b');name.textContent=tr(b.ko,b.en);
 tile.append(icon,name);return tile;
}
/* Received badges first; the rest folded away behind a summary. There are 57
 * of them now, and showing every unearned one turned a phone screen into a
 * wall of grey tiles that said nothing about what the learner had done. The
 * fold keeps the next goal one tap away instead of deleting it. */
function renderBadgesInto(s,gridId,countId){
 const grid=$(gridId);if(!grid)return;
 grid.replaceChildren();
 const old=$(gridId+'-more');if(old)old.remove();
 if(!s){if($(countId))$(countId).textContent='';return;}
 const badges=M.computeBadges(s);
 const got=badges.filter(b=>b.earned),left=badges.filter(b=>!b.earned);
 if($(countId))txt(countId,got.length+' / '+badges.length);
 if(got.length)for(const b of got)grid.append(badgeTile(b));
 else{const p=document.createElement('p');p.className='badges-empty';
  p.textContent=tr('아직 받은 배지가 없어요. 한 문제만 맞혀도 첫 배지가 열립니다.','No badges yet. One correct answer opens the first.');
  grid.append(p);}
 if(!left.length)return;
 const box=document.createElement('details');box.className='badges-more';box.id=gridId+'-more';
 const sum=document.createElement('summary');
 sum.textContent=tr(`아직 못 받은 배지 ${left.length}개`,`${left.length} still to earn`);
 const inner=document.createElement('div');inner.className='badges-grid';
 for(const b of left)inner.append(badgeTile(b));
 box.append(sum,inner);grid.after(box);
}
// 명예의 전당에서는 접지 않고 두 줄로 모두 펼칩니다. 홈은 화면이 좁아
// 못 받은 배지를 접어 두지만, 여기서는 무엇이 남았는지 한눈에 봅니다.
function renderBadgeList(s,earnedId,leftId,countId){
 const got=$(earnedId),left=$(leftId);if(!got||!left)return;
 got.replaceChildren();left.replaceChildren();
 if(!s){if($(countId))$(countId).textContent='';return;}
 const badges=M.computeBadges(s),earned=badges.filter(b=>b.earned),rest=badges.filter(b=>!b.earned);
 if($(countId))txt(countId,earned.length+' / '+badges.length);
 if(earned.length)for(const b of earned)got.append(badgeTile(b));
 else{const p=document.createElement('p');p.className='badges-empty';
  p.textContent=tr('아직 받은 배지가 없어요. 한 문제만 맞혀도 첫 배지가 열립니다.','No badges yet. One correct answer opens the first.');
  got.append(p);}
 for(const b of rest)left.append(badgeTile(b));
}
function renderBadges(s){
 renderBadgesInto(s,'badges-grid','badges-count');
 renderBadgesInto(s,'home-badges-grid','home-badges-count');
 renderBadgeList(s,'hall-badges-grid','hall-badges-left','hall-badges-count');
}
function renderCloudPanel(s){
 const configured=!!(window.DokdoLeaderboard&&DokdoLeaderboard.isConfigured());
 $('cloud-panel').hidden=!configured;if(!configured)return;
 const nick=(s?.name||'').trim();
 // BETA: matching by nickname alone, not nickname+code -- see mergeStates()
 // in app-model.js. Anyone using the same nickname shares one server slot;
 // that tradeoff is intentional for now and expected to be revisited.
 $('cloud-key-display').textContent=nick?tr(`내 별명: ${nick} (다른 기기에서 같은 별명으로 불러오면 기록이 합쳐져요)`,`Your nickname: ${nick} (loading with the same nickname on another device merges the records)`):tr('별명을 먼저 설정해 주세요.','Set a nickname first.');
 $('cloud-save').disabled=!nick;
 $('cloud-key-copy').hidden=!nick;
}
async function copyPlainText(text){
 try{
  if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);return true;}
  const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.append(ta);ta.focus();ta.select();document.execCommand('copy');ta.remove();return true;
 }catch(e){return false;}
}
wire('cloud-key-copy','onclick',async()=>{
 const s=getS();if(!s)return;
 const nick=(s.name||'').trim().normalize('NFC');if(!nick)return;
 const ok=await copyPlainText(nick);
 toast(ok?tr('별명을 복사했습니다. 다른 기기의 입력칸에 그대로 붙여넣으세요.','Nickname copied. Paste it exactly into the field on the other device.'):tr('복사하지 못했습니다.','Could not copy.'));
});
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
wire('cloud-save','onclick',async()=>{
 const s=getS();if(!s)return;
 const nick=(s.name||'').trim().normalize('NFC');
 if(!nick){txt('cloud-save-status',tr('별명을 먼저 설정해 주세요.','Set a nickname first.'));return;}
 $('cloud-save').disabled=true;txt('cloud-save-status',tr('전송 중…','Sending…'));
 const key=nick,payload=store.blocked?store.recovery():M.backupText(s);
 const res=await DokdoLeaderboard.saveProgress(key,nick,s.grade||'K',payload);
 if(res.state==='sent_unconfirmed'){
  // The save POST is a fire-and-forget no-cors request -- it cannot tell us
  // whether the server actually stored it. The load endpoint IS a readable
  // GET, so use it to confirm the save really landed instead of reporting
  // a blind "sent" that has caused real users to lose records silently.
  txt('cloud-save-status',tr('서버로 전송했습니다. 저장 확인 중…','Sent to the server. Confirming it was stored…'));
  let confirmed=false,unsupported=false;
  for(const delayMs of [1500,3000]){
   await sleep(delayMs);
   const check=await DokdoLeaderboard.loadProgress(key);
   if(check.state==='ok'){confirmed=true;break;}
   if(check.state==='unsupported'){unsupported=true;break;}
  }
  txt('cloud-save-status',confirmed?tr('서버에 저장이 확인되었습니다.','Confirmed: it was stored on the server.')
   :unsupported?tr('서버가 기록 저장·불러오기를 아직 지원하지 않습니다. 운영자 확인이 필요합니다.','The server does not support record storage yet.')
   :tr('서버에 전송은 했지만 저장이 아직 확인되지 않았습니다. 잠시 후 다시 시도해 주세요.','Sent, but storage could not be confirmed yet. Please try again in a moment.'));
 }
 else if(res.state==='too_large')txt('cloud-save-status',tr(`기록이 너무 커서(${res.length}자) 보내지 않았습니다.`,`Not sent — the record is too large (${res.length} chars).`));
 else if(res.state==='not_configured')txt('cloud-save-status',tr('서버가 연결되지 않았습니다.','No server is configured.'));
 else txt('cloud-save-status',tr('전송하지 못했습니다: ','Could not send: ')+(res.error||''));
 $('cloud-save').disabled=false;
});
/* 주소에 ?기록=별명 이 붙어 있으면 입력칸을 채우고 바로 불러옵니다. 직접
 * 입력하기 어려운 분께 링크 하나만 보내면 되도록 두었습니다. 영어 load= 도
 * 같이 받습니다. */
function autoLoadFromLink(){
 let nick='';
 try{const q=new URLSearchParams(location.search);nick=(q.get('기록')||q.get('load')||'').trim();}catch(e){}
 if(!nick)return;
 const field=$('cloud-load-nick');if(!field)return;
 field.value=nick.normalize('NFC');
 view('records');
 setTimeout(()=>{const b=$('cloud-load');if(b&&!b.disabled)b.click();},400);
}
wire('cloud-load','onclick',async()=>{
 const nick=$('cloud-load-nick').value.trim().normalize('NFC');
 if(!nick){txt('cloud-load-status',tr('불러올 별명을 입력해 주세요.','Enter the nickname to load.'));return;}
 if(store.blocked&&getS()!==null){guarded();return;}
 $('cloud-load').disabled=true;txt('cloud-load-status',tr('불러오는 중…','Loading…'));
 const res=await DokdoLeaderboard.loadProgress(nick);
 if(res.state==='ok'){
  try{
   const current=getS();
   // BETA: same-nickname records are combined (mergeStates), not replaced,
   // so loading on a device that already has progress cannot erase it.
   importCandidate=current?M.mergeStates(current,res.data.payload):M.parseImport(res.data.payload,null);
   importOriginal=res.data.payload;
   txt('cloud-load-status','');showImport();
  }catch(e){txt('cloud-load-status',tr('서버 기록의 구조를 확인할 수 없어 불러오지 않았습니다.','The server record could not be validated, so nothing was loaded.'));}
 }else if(res.state==='not_found')txt('cloud-load-status',tr('해당 별명으로 저장된 기록이 없습니다.','No record found for that nickname.'));
 else if(res.state==='unsupported')txt('cloud-load-status',tr('서버가 기록 불러오기를 아직 지원하지 않습니다. (운영자 확인 필요)','The server does not support record loading yet.'));
 else if(res.state==='not_configured')txt('cloud-load-status',tr('서버가 연결되지 않았습니다.','No server is configured.'));
 else txt('cloud-load-status',tr('불러오지 못했습니다: ','Could not load: ')+(res.error||''));
 $('cloud-load').disabled=false;
});
function renderWeeks(s){
 $('weekly-history').replaceChildren();const table=document.createElement('table'),thead=document.createElement('thead'),hr=document.createElement('tr');
 [tr('시작 날짜 (한국 시간)','Week starting (Korea)'),tr('정답','Correct'),tr('집계 기준','Scope')].forEach(t=>{const th=document.createElement('th');th.scope='col';th.textContent=t;hr.append(th);});
 thead.append(hr);const body=document.createElement('tbody');
 for(const w of [s.weekly,...[...s.weekly.history].reverse()].slice(0,52)){
  const row=document.createElement('tr');[w.key,num(w.correct),w.partial?tr('업데이트 이후','Since update'):tr('한 주','Full week')].forEach(t=>{const td=document.createElement('td');td.textContent=t;row.append(td);});body.append(row);
 }table.append(thead,body);$('weekly-history').append(table);
}
function renderLegacy(){
 const target=$('legacy-records');target.replaceChildren();
 if(isolated){target.textContent=tr('시연에서는 실제 브라우저 기록을 읽지 않습니다.','The demo does not read real browser records.');return;}
 const found=M.legacyCandidates(storage);
 if(!found.length){target.textContent=tr('이 주소와 브라우저에서 이전 기록을 찾지 못했습니다. 이전 앱의 백업 JSON 파일로도 가져올 수 있습니다.','No old record was found under this site and browser. You can also import a backup JSON file.');return;}
 found.forEach(f=>{
  const box=document.createElement('div');box.className='legacy-item';const h=document.createElement('strong'),p=document.createElement('p'),b=document.createElement('button');b.className='button secondary';
  h.textContent=f.key.endsWith('preview')?tr('이전 영어판 기록','Previous English record'):tr('이전 한국어판 기록','Previous Korean record');
  p.textContent=f.error?tr('구조를 확인할 수 없습니다. 원문을 보관해 주세요.','The structure could not be validated. Save the raw record.'):tr(`${f.summary.name||'학습자'} · 정답 ${num(f.summary.correct)}회 · 불빛 ${num(f.summary.lights)}개 · 봉화 ${num(f.summary.beacons)}개`,`${f.summary.name||'Learner'} · ${num(f.summary.correct)} correct · ${num(f.summary.lights)} lights · ${num(f.summary.beacons)} beacons`);
  b.textContent=f.error?tr('원문 파일 보관','Save original file'):tr('새 풍경으로 복사 검토','Review a copy in the new landscape');
  b.onclick=()=>{
   if(f.error){download(f.raw,'dokdo-legacy-original.json','application/json');return;}
   try{
    const source=Core.envelope(JSON.parse(f.raw),f.key.endsWith('preview')?'en':'ko');
    importCandidate=M.parseImport(JSON.stringify(source),getS());importOriginal=f.raw;
    importCandidate.visual.importedFrom=f.key;
    showImport(true);
   }catch(e){toast(tr('현재 성취를 잃을 수 있어 자동 복사를 중단했습니다. 두 기록을 각각 보관해 주세요.','Copying was stopped to protect current achievements. Keep both records separately.'));}
  };
  box.append(h,p,b);target.append(box);
 });
}
function showImport(legacy=false){
 const a=M.summary(importCandidate),box=$('import-preview');box.hidden=false;box.replaceChildren();
 const title=document.createElement('strong');title.textContent=tr('저장 전 확인','Review before saving');
 const p=document.createElement('p');p.textContent=tr(`정답 ${num(a.correct)}회 · 불빛 ${num(a.lights)}개 · 봉화 ${num(a.beacons)}개 · ${num(a.xp)} XP`,`${num(a.correct)} correct · ${num(a.lights)} lights · ${num(a.beacons)} beacons · ${num(a.xp)} XP`);
 const note=document.createElement('p');note.textContent=tr('새 조감도에서는 화면상 위치가 달라집니다. 불빛 순서·봉화 자리 번호·기존 성취는 보존하고, 이전 원문을 별도 보관합니다. 원본 앱과 자동 동기화되지는 않습니다.','Screen positions differ in the new perspective. Light order, beacon slot IDs and earned records remain. The raw original is kept separately. The old app will not auto-sync.');
 const row=document.createElement('div');row.className='button-row';
 const yes=document.createElement('button');yes.className='button primary';yes.textContent=tr('확인 · 복사하여 이어하기','Confirm · continue with a copy');
 const no=document.createElement('button');no.className='button secondary';no.textContent=tr('취소','Cancel');
 yes.onclick=async()=>{
  if(!importCandidate||busy)return;busy=true;
  try{
   await scheduleWrite(()=>getS()===null?store.recoverState(importCandidate):store.importState(importCandidate,importOriginal));
   state=getS();language=state.visual.language;translate();sceneTime=state.scene.timeSec||0;lightDirty=true;importCandidate=null;importOriginal=null;box.hidden=true;renderRecords();toast(tr('복사한 기록을 저장했습니다. 원본은 그대로 남아 있습니다.','The copied record was saved. The original remains unchanged.'));
  }catch(e){toast(tr('복사를 저장하지 못했습니다. 원본은 변경하지 않았습니다.','The copy could not be saved. The original was not changed.'));updateStorageStatus();}
  finally{busy=false;}
 };
 no.onclick=()=>{box.hidden=true;importCandidate=null;importOriginal=null;};row.append(yes,no);
 const preview=document.createElement('canvas');preview.className='import-landscape';preview.width=768;preview.height=352;preview.setAttribute('role','img');preview.setAttribute('aria-label',tr('기존 성취를 옮긴 새 풍경 미리보기','Preview of copied achievements in the new landscape'));
 const previewState=M.clone(importCandidate);assetsReady.then(()=>{const pc=preview.getContext('2d');pc.scale(.5,.5);V.render(pc,previewState,0,{islands,texture,reduced:true,labels:true});});
 box.append(title,p,note,preview,row);box.scrollIntoView({block:'center',behavior:'smooth'});
}
$('import-file').onchange=async event=>{
 const file=event.target.files?.[0];event.target.value='';if(!file)return;if(store.blocked&&getS()!==null){guarded();return;}
 if(file.size>8000000){toast(tr('8MB를 넘는 파일은 가져오지 않습니다.','Files larger than 8 MB are not accepted.'));return;}
 try{const raw=await file.text();importCandidate=M.parseImport(raw,getS());importOriginal=raw;showImport();}
 catch(e){toast(tr('형식이 다르거나 현재 성취를 잃는 파일입니다. 덮어쓰지 않았습니다.','This file is invalid or would lose achievements. Nothing was overwritten.'));}
};
wire('reset-record','onclick',async()=>{
 if(!getS()||busy)return;
 if(!confirm(tr('이 기기의 모든 기록을 지우고 빈 상태로 시작합니다. 직전 기록은 이 브라우저에 한 번 더 보관되지만, 화면에서는 되돌릴 수 없습니다. 백업 파일을 저장했거나 별명을 알고 계신가요? 계속할까요?','This clears every record on this device and starts empty. The previous record is kept once more in this browser, but there is no undo button here. Have you saved a backup, or do you know your nickname? Continue?')))return;
 busy=true;
 try{
  await scheduleWrite(()=>store.importState(M.fresh()));
  state=getS();language=state.visual.language;translate();lesson=null;lightDirty=true;homeVideoIds=null;view('home',true);paint();
  toast(tr('기록을 초기화했습니다. 필요하면 내 기록에서 다른 기기 기록 불러오기로 되돌릴 수 있습니다.','Record reset. If needed, use "Load a record from another device" in My records to bring it back.'));
 }catch(e){toast(tr('초기화하지 못했습니다.','Could not reset the record.'));updateStorageStatus();}
 finally{busy=false;}
});
$('export-records').onclick=()=>{const text=store.blocked?store.recovery():M.backupText(getS());download(text,'dokdo-learning-'+Core.dayKey()+'.json','application/json');toast(tr('기록 파일을 만들었습니다. 다운로드 위치를 확인해 주세요.','Backup created. Check your download folder.'));};
function sources(){
 const wrap=$('source-content');wrap.replaceChildren();
 const sections=[
 [tr('풍경 그림과 실제 독도','Landscape artwork and the real Dokdo'),tr('기본 풍경은 사용자가 승인한 생성 이미지에서 섬과 바위 부분을 추출한 일러스트입니다. 그림 속 해안선·시설·바위의 좌표는 실제 측량 결과가 아닙니다. 고정 글자·점수·동물은 제거하고 실제 기능으로 분리했습니다.','The default landscape uses island and rock cutouts from the user-approved generated illustration. Coastlines, facilities and rock positions in this artwork are not surveyed geography. Text, scores and wildlife have been separated into working controls.')],
 [tr('지도 살펴보기','Explore the map'),tr('모양 비교도는 외교부의 별도 섬 형상 자료를 눈으로 대조해 단순화했습니다. 비교용 배치이며 실측 GIS나 고도 자료가 아닙니다. 확인하지 않은 시설 핀, 지명, 20m 등고선은 표시하지 않습니다. 공식 자료의 높이·면적·해안선 간 최단 거리는 별도로 안내합니다.','The outline comparison is visually simplified from the official separate-island illustrations. It is a comparison layout, not surveyed GIS or elevation data. Unverified facility pins and 20 m contours are not shown. Source-backed elevations, areas and shore-to-shore distance are listed separately.')],
 [tr('학습과 기록의 범위','Learning and record scope'),tr('현재 출제하는 독도 240문항 전체를 새로 작성했습니다. 질문과 출처를 분리하고 보기마다 이유를 적었습니다. 동일 작성자의 자체 검토이며 독립 교사 검수 승인은 아닙니다. 이전 1,513개·48개·240개 문항 기록과 보상은 보존하지만 새 문항의 정답으로 자동 인정하지 않습니다. 저장은 로컬과 파일 백업이며 구형 클라우드와 자동 동기화되지 않습니다.','This release rewrites all 240 active Dokdo questions. Each choice has its own reason, with sources kept outside the question. It is author-reviewed, not independently teacher-approved. All legacy records remain; saving is local or file-based, not the old cloud.')],
 [tr('강치·새·불빛','Gangchi, birds and lights'),tr('학습을 기념하는 상상 연출입니다. 새로운 강치 방문은 1분이며 이미 저장된 구버전 잔여 시간은 삭감하지 않습니다. 새는 학습 단계 진급·바다 탐험 단계 완료를 기념하며, 재생해도 보상은 중복 지급되지 않습니다.','These are imaginary learning celebrations. New gangchi visits last one minute; previously saved visitor time is not cut. Birds celebrate reviewed stage progress or Sea Explorer completion. Replaying adds no duplicate rewards.')]
 ];
 sections.forEach(([h,p])=>{const title=document.createElement('h3'),text=document.createElement('p');title.textContent=h;text.textContent=p;wrap.append(title,text);});
 const links=[
 ['대한민국 외교부 · 구성 및 위치','https://dokdo.mofa.go.kr/kor/introduce/location.jsp'],
 ['국토지리정보원 · 독도','https://nationalatlas.ngii.go.kr/pages/page_415.php'],
 ['대한민국 외교부 · 자연환경','https://dokdo.mofa.go.kr/kor/introduce/nature.jsp'],
 ['Gmarket Sans','https://corp.gmarket.com/fonts/'],['S-Core Dream','https://s-core.co.kr/company/font/']];
 links.forEach(([title,url])=>{const a=document.createElement('a');a.textContent=title+' ↗';a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.className='source-link';wrap.append(a);});
 showDialog('sources-dialog');
}
function settings(){
 if(!getS())return;$('reduce-motion').checked=getS().visual.reduceMotion;$('enable-birds').checked=getS().visual.birdsEnabled;$('sea-density').value=getS().seaDensity||'rich';showDialog('settings-dialog');fontStatus();
}
function fontStatus(){
 if(!document.fonts){txt('font-status',tr('시스템 글꼴로 표시 중입니다.','Using system fonts.'));return;}
 Promise.allSettled([document.fonts.load('500 15px GmarketSans','독도'),document.fonts.load('400 15px SCoreDream','독도')]).then(()=>{
  const ok=[...document.fonts].filter(f=>['GmarketSans','SCoreDream'].includes(f.family.replace(/["']/g,''))&&f.status==='loaded').length>=2;
  txt('font-status',ok?tr('지마켓 산스 · 에스코어 드림 적용','Gmarket Sans · S-Core Dream loaded'):tr('지정 글꼴이 연결되지 않아 시스템 글꼴을 사용합니다.','Remote fonts are unavailable; system fonts are being used.'));
 }).catch(()=>{});
}
function beaconDialog(){
 if(!guarded())return;const lights=V.lightPositions(getS()).filter(p=>p.lv===4);if(!lights.length){toast(tr('아직 획득한 봉화가 없어요.','You have not earned a beacon yet.'));return;}
 $('beacon-select').replaceChildren();lights.forEach((p,i)=>{const o=document.createElement('option');o.value=p.id;o.textContent=tr('봉화 ','Beacon ')+(i+1)+' · #'+p.id;$('beacon-select').append(o);});
 $('beacon-position').replaceChildren();V.BEACON_SLOTS.forEach((p,i)=>{const o=document.createElement('option');o.value=i;o.textContent=tr(p.island?'동도':'서도',p.island?'Dongdo':'Seodo')+' · '+(i%24+1);$('beacon-position').append(o);});txt('beacon-error','');showDialog('beacon-dialog');updateBeaconPreview(true);
}
function updateBeaconPreview(reset=false){
 const s=getS();if(!s)return;const id=+$('beacon-select').value;
 [...$('beacon-position').options].forEach(o=>o.disabled=!V.canPlace(s,id,+o.value));
 if(reset){const old=s.scene.beaconSlots[id];const first=[...$('beacon-position').options].find(o=>!o.disabled);$('beacon-position').value=old!=null?String(old):(first?.value||'0');}
 const slot=+$('beacon-position').value,copy=M.clone(s);
 if(V.canPlace(s,id,slot))copy.scene.beaconSlots[id]=slot;
 const out=$('beacon-preview'),cx=out.getContext('2d');cx.save();cx.scale(.5,.5);V.render(cx,copy,sceneTime,{islands,texture,reduced:true});
 const point=V.lightPositions(copy).find(p=>p.id===id);
 if(point){cx.strokeStyle='#ffd56f';cx.lineWidth=3;cx.beginPath();cx.arc(point.x,point.y,22,0,Math.PI*2);cx.stroke();}
 cx.restore();
}
$('beacon-select').onchange=()=>updateBeaconPreview(true);
$('beacon-position').onchange=()=>updateBeaconPreview();
$('beacon-save').onclick=async()=>{
 const id=+$('beacon-select').value,slot=+$('beacon-position').value;if(!V.canPlace(getS(),id,slot)){txt('beacon-error',tr('다른 봉화와 겹칩니다. 다른 자리를 골라 주세요.','Too close to another beacon. Choose another position.'));return;}
 try{await mutate(s=>s.scene.beaconSlots[id]=slot);closeDialog('beacon-dialog');renderHome();}catch(e){}
};

const canvas=$('island-canvas'),ctx=canvas.getContext('2d');
function image(src){return new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>{assetError=true;resolve(null);};img.src=src;});}
let islands=null,texture=null,terrain=null;
let timeMode='auto';
const weatherConfig=window.DOKDO_SITE_CONFIG?.weather||{};
const weatherClient=new DokdoWeather.Client({storage,enabled:!isolated&&weatherConfig.provider==='open-meteo'&&weatherConfig.nonCommercialConfirmed===true});
let lastEnvironmentUpdate=0;
const assetsReady=Promise.all([image('./assets/dokdo-islands.webp'),image('./assets/sea-texture.webp'),image('./assets/dokdo-terrain.webp'),image('./assets/dongdo-facilities.png')]).then(([a,b,c,east])=>{
 texture=b;terrain=c;islands=a;
 if(a&&east){const layer=document.createElement('canvas');layer.width=V.W;layer.height=V.H;const x=layer.getContext('2d');
  x.save();x.beginPath();x.rect(0,0,1030.4,V.H);x.clip();x.drawImage(a,0,0,V.W,V.H);x.restore();
  x.save();x.setTransform(0.6666992396690421,0.0003680252383592411,-0.0003680252383592411,0.6666992396690421,1030.1304036533602,159.95806066708613);x.drawImage(east,0,0);x.restore();
  return new Promise(resolve=>{const im=new Image();im.onload=()=>{islands=im;lightDirty=true;resolve();};im.onerror=()=>{assetError=true;resolve();};im.src=layer.toDataURL('image/png');});
 }
 if(!a||!east){assetError=true;toast(tr('지도 자산을 모두 불러오지 못했습니다. assets 폴더를 확인해 주세요.','Some map assets failed to load. Check the assets folder.'));}
});
const reduced=()=>!!getS()?.visual?.reduceMotion||matchMedia('(prefers-reduced-motion: reduce)').matches;
function visible(){return currentView==='home'&&!mapOpen&&!document.hidden&&sceneVisible&&!document.querySelector('dialog[open]');}
// The gold rim is grown from the terrain image's own alpha channel rather
// than from the traced ART polygons: the polygons follow the illustration,
// not this comparison plate, so an outline drawn from them would sit beside
// the island instead of on it.
let terrainRim=null;
function terrainOutline(){
 if(terrainRim)return terrainRim;
 if(!(terrain?.complete&&terrain.naturalWidth))return null;
 const c=document.createElement('canvas');c.width=V.W;c.height=V.H;const g=c.getContext('2d');
 for(let i=0;i<24;i++){const a=i/24*Math.PI*2;g.drawImage(terrain,Math.cos(a)*5,Math.sin(a)*5,V.W,V.H);}
 g.globalCompositeOperation='source-in';
 const gold=g.createLinearGradient(0,0,V.W,V.H);gold.addColorStop(0,'#ffe9a8');gold.addColorStop(.5,'#e8c266');gold.addColorStop(1,'#c9a14a');
 g.fillStyle=gold;g.fillRect(0,0,V.W,V.H);
 g.globalCompositeOperation='destination-out';g.drawImage(terrain,0,0,V.W,V.H);
 terrainRim=c;return c;
}
function drawMapReference(ctx){
 ctx.save();ctx.clearRect(0,0,V.W,V.H);
 const g=ctx.createLinearGradient(0,0,V.W,V.H);g.addColorStop(0,'#10425c');g.addColorStop(1,'#0b2b41');ctx.fillStyle=g;ctx.fillRect(0,0,V.W,V.H);
 if(terrain?.complete&&terrain.naturalWidth){
  ctx.drawImage(terrain,0,0,V.W,V.H);
  // The plate reads too dark on a phone, so the land is lifted once more.
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.3;ctx.drawImage(terrain,0,0,V.W,V.H);ctx.restore();
  const rim=terrainOutline();
  if(rim){ctx.save();ctx.shadowColor='rgba(255,214,122,.55)';ctx.shadowBlur=16;ctx.drawImage(rim,0,0);ctx.restore();}
 }
 // Same scale problem as the main plate: this is a 1536px drawing shown on a
 // phone, so anything under ~40px here is unreadable there. The 서도 caption
 // starts right of x=360 because the 빛의 길 panel is pinned to the bottom-left
 // corner and was covering both the name and the height.
 ctx.textAlign='left';
 // 설명 문장은 절반 크기로 낮추고 높이 숫자는 크게 둡니다. 읽어야 하는 값은
 // 숫자이고 문장은 그 값을 풀어 주는 곁말입니다.
 ctx.font='600 24px SCoreDream,sans-serif';ctx.fillStyle='#cfe2e6';ctx.shadowColor='#04202f';ctx.shadowBlur=10;ctx.fillText(tr('서도 · 더 높고 가파른 형태','Seodo · higher and steeper'),390,556);ctx.fillText(tr('동도 · 비교적 평탄한 상부','Dongdo · a more level upper area'),880,636);
 ctx.font='700 40px GmarketSans,sans-serif';ctx.fillStyle='#f6f7ec';ctx.shadowBlur=12;ctx.fillText('168.5 m',390,600);ctx.fillText('98.6 m',880,680);
 // Sits to the right of the weather panel, which covers the top-left corner
 // on a desktop. At the foot of the plate it ran into the island captions.
 ctx.font='500 28px SCoreDream,sans-serif';ctx.fillStyle='#b7d2d9';ctx.shadowBlur=8;ctx.fillText(tr('형상 비교용 자체 도판 · 고도·시설 좌표를 측량한 모델이 아닙니다.','An authored shape comparison, not a surveyed elevation or facility model.'),520,58);ctx.restore();
}
function environmentOptions(){return {phase:DokdoSolar.phase(Date.now(),timeMode),weather:weatherClient.current,width:canvas.getBoundingClientRect().width||V.W};}
function updateEnvironment(){
 const phase=DokdoSolar.phase(Date.now(),timeMode),s=getS();
 txt('dokdo-clock',tr('독도 ','Dokdo ')+DokdoSolar.clock(Date.now())+' KST');
 txt('dokdo-sun',tr('일출 ','Sunrise ')+DokdoSolar.clock(phase.sunrise)+tr(' · 일몰 ',' / sunset ')+DokdoSolar.clock(phase.sunset)+tr(' (계산값)',' (calculated)'));
 const w=weatherClient.current;
 const names={clear:['맑음','Clear'],cloud:['구름','Cloudy'],rain:['비','Rain'],snow:['눈','Snow'],fog:['안개','Fog']};
 txt('weather-status',w?tr(...names[w.kind])+' '+w.temperature.toFixed(1)+'°C · '+DokdoSolar.clock(w.at)+tr(' 예보',' forecast')+(weatherClient.status==='stale'?tr(' · 갱신 지연',' / delayed update'):''):weatherClient.status==='disabled'?tr('날씨: 배포자 이용조건 확인 필요','Weather: operator setup required'):weatherClient.status==='loading'?tr('날씨 불러오는 중','Loading weather'):tr('날씨 연결 지연','Weather unavailable'));
 if(s){const p=M.Journey.progress(s);txt('route-title',tr(p.shownLap+'번째 빛의 길','Learning path - circuit '+p.shownLap));txt('route-count',p.filled+' / 1,025');$('route-progress').value=p.filled;
  txt('route-note',tr('동도 '+p.east+'/500 · 서도 '+p.west+'/500 · 기념 지점 '+p.markers+'/25 · 누적 인정 '+num(p.total)+'회','Dongdo '+p.east+'/500 / Seodo '+p.west+'/500 / commemorative markers '+p.markers+'/25 / '+num(p.total)+' lifetime credits')+(p.legacy?tr(' (이전 성취 '+num(p.legacy)+'포함)',' (including '+num(p.legacy)+' legacy credits)'):'')+tr(' · 25는 실제 섬 개수가 아닙니다.',' / 25 is not the actual islet count.'));}
 const sel=$('time-mode');for(const o of sel.options){const texts={auto:['독도 실제 시간','Dokdo time'],day:['낮 미리보기','Day preview'],sunset:['노을 미리보기','Sunset preview'],night:['야경 미리보기','Night preview']};o.textContent=tr(...texts[o.value]);}
 txt('time-mode-label',tr('그림 시간','Scene time'));txt('weather-refresh',tr('날씨 연결 확인','Check weather'));
}
function paint(){
 const s=getS();if(!s)return;
 if(Date.now()-lastEnvironmentUpdate>1000){lastEnvironmentUpdate=Date.now();updateEnvironment();}
 if(lightDirty){lightLayer=document.createElement('canvas');lightLayer.width=V.W;lightLayer.height=V.H;V.drawLights(lightLayer.getContext('2d'),s);lightDirty=false;}
 if(mapOpen)drawMapReference(ctx);else // 돌고래 떼·새 떼는 레벨만큼 늘어납니다. 오래 배운 사람의 바다가 더 붐빕니다.
  V.render(ctx,s,sceneTime,{islands,texture,reduced:reduced(),labels:true,lightLayer,pod:Core.gradeProgress(M.summary(s).gradeScore).rank+1,...environmentOptions()});
}
function frame(now){
 const dt=frameLast?Math.min(1000,Math.max(0,now-frameLast)):0;frameLast=now;
 const s=getS();
 if(s&&visible()&&!store.blocked){
  sceneTime+=dt/1000;s.scene.timeSec=sceneTime;
  if(s.gangchiVisits.length||s.visual.birdVisit){M.tick(s,dt,true);dirty=true;}
  if(s.weekly.key<Core.weekKey()){Core.rollover(s);dirty=true;renderHome();}
  if(now-drawAt>(reduced()?700:1000/30)){paint();drawAt=now;renderVisitors();}
  if(now-saveAt>3000&&dirty){saveAt=now;dirty=false;scheduleWrite(()=>store.save()).then(updateStorageStatus);}
 }
 requestAnimationFrame(frame);
}
if('IntersectionObserver' in window)new IntersectionObserver(entries=>{sceneVisible=!!entries[0]?.isIntersecting;frameLast=0;},{threshold:.05}).observe(canvas);
assetsReady.then(()=>{updateEnvironment();paint();requestAnimationFrame(frame);maybeShowIntro();autoLoadFromLink();});
$('time-mode').onchange=()=>{timeMode=$('time-mode').value;updateEnvironment();paint();};
$('weather-refresh').onclick=async()=>{if(!weatherClient.enabled){toast(tr('배포자가 assets/site-config.js에서 비상업용 조건을 확인한 뒤 날씨를 연결합니다. 낮밤 전환은 계속 작동합니다.','Weather requires the operator to confirm its non-commercial terms in assets/site-config.js. Day/night still works.'));return;}await weatherClient.refresh(true);updateEnvironment();paint();};
if(weatherClient.enabled){weatherClient.refresh().then(()=>{updateEnvironment();paint();});setInterval(()=>{if(!document.hidden)weatherClient.refresh().then(updateEnvironment);},300000);}
async function updateKhoaObservation(){
 const wc=(window.DOKDO_SITE_CONFIG&&window.DOKDO_SITE_CONFIG.weather)||{};
 if(!wc.khoaViaAppsScript||!window.DokdoLeaderboard||!DokdoLeaderboard.isConfigured()){wire('khoa-observation','hidden',true);return;}
 const res=await DokdoLeaderboard.fetchKhoaWeather();
 if(res.state!=='ok'){wire('khoa-observation','hidden',true);return;}
 const d=res.data;wire('khoa-observation','hidden',false);
 txt('khoa-observation',tr(`${d.station} 실측 기온 · ${d.temperature}°C (참고값)`,`${d.station} observed · ${d.temperature}°C (reference only)`));
}
updateKhoaObservation();setInterval(()=>{if(!document.hidden)updateKhoaObservation();},1800000);
wire('hall-retry','onclick',()=>renderHall());

const musicList=(window.DOKDO_SITE_CONFIG&&window.DOKDO_SITE_CONFIG.music)||[];
let trackIndex=0;
// A track can carry an explicit `weight` (its own play probability, e.g.
// .5 for 50%); the remaining probability mass is split evenly across
// tracks that don't specify one, so adding an unweighted track never
// needs the others' numbers rebalanced by hand.
function pickWeightedTrack(excludeIndex){
 if(!musicList.length)return 0;
 // Never immediately repeat the track that just finished, even one with a
 // high weight -- excluded from this pick's pool only, so it can still come
 // back up right after any other track.
 const pool=musicList.map((m,i)=>({m,i})).filter(x=>musicList.length<2||x.i!==excludeIndex);
 const explicitSum=pool.reduce((s,x)=>s+(typeof x.m.weight==='number'?x.m.weight:0),0);
 const unweighted=pool.filter(x=>typeof x.m.weight!=='number').length;
 const share=unweighted?Math.max(0,1-explicitSum)/unweighted:0;
 const probs=pool.map(x=>typeof x.m.weight==='number'?x.m.weight:share);
 const total=probs.reduce((a,b)=>a+b,0)||1;
 let r=Math.random()*total;
 for(let k=0;k<probs.length;k++){r-=probs[k];if(r<=0)return pool[k].i;}
 return pool[pool.length-1].i;
}
function stopSound(){
 soundOn=false;audioToken++;if(audio){audio.muted=true;audio.pause();}
 txt('sound',tr('♫ 소리 꺼짐','♫ Sound off'));$('sound').setAttribute('aria-pressed','false');$('sound').removeAttribute('title');
}
function trackLabel(i){const t=musicList[i];return t?tr(t.t,t.tEn||t.t):'';}
function ensureAudio(){
 if(audio)return;
 audio=new Audio();audio.preload='none';audio.volume=.45;
 // Once the user has turned music on, keep it going until they turn it
 // off or leave the page -- a hidden/backgrounded tab is not a reason to
 // stop (see the visibilitychange listener below, which no longer stops it).
 audio.addEventListener('play',()=>{if(!soundOn){audio.muted=true;audio.pause();}});
 audio.addEventListener('error',()=>{stopSound();toast(tr('음악 파일을 재생하지 못했습니다.','The music file could not be played.'));});
 audio.addEventListener('ended',()=>{if(!musicList.length)return;trackIndex=pickWeightedTrack(trackIndex);playCurrentTrack();});
}
async function playCurrentTrack(){
 if(!musicList.length)return;
 audio.src=musicList[trackIndex].f;
 const token=++audioToken;audio.muted=false;
 try{await audio.play();if(token!==audioToken||!soundOn){audio.muted=true;audio.pause();return;}
  const label=trackLabel(trackIndex);txt('sound',tr('♫ 소리 켜짐','♫ Sound on'));$('sound').setAttribute('aria-pressed','true');
  if(label)$('sound').title=label;
 }catch(e){stopSound();toast(tr('브라우저가 음악을 재생하지 못했습니다. 다시 소리 버튼을 눌러 주세요.','The browser could not play audio. Try the sound button again.'));}
}
async function toggleSound(){
 if(soundOn){stopSound();return;}
 if(!musicList.length){toast(tr('아직 연결된 음악이 없습니다.','No music is connected yet.'));return;}
 ensureAudio();trackIndex=pickWeightedTrack();soundOn=true;await playCurrentTrack();
}
async function musicSkip(dir){
 if(!musicList.length)return;
 if(dir<0&&soundOn&&audio&&audio.currentTime>3){audio.currentTime=0;return;}
 trackIndex=dir<0?(trackIndex-1+musicList.length)%musicList.length:pickWeightedTrack(trackIndex);
 if(!soundOn){toast(tr('먼저 소리를 켜 주세요.','Turn sound on first.'));return;}
 ensureAudio();await playCurrentTrack();
}
let exporting=false;
async function waitForFonts(){if(!document.fonts)return false;try{const loads=await Promise.race([Promise.all([document.fonts.load('500 16px GmarketSans','독도 Dokdo 123'),document.fonts.load('700 16px GmarketSans','독도'),document.fonts.load('400 16px SCoreDream','독도 Dokdo 123'),document.fonts.load('600 16px SCoreDream','독도')]),new Promise(r=>setTimeout(()=>r([]),5000))]);return loads.length===4&&loads.every(arr=>arr.length>0&&arr.every(f=>f.status==='loaded'));}catch(e){return false;}}

async function saveImage(){
 if(exporting||!guarded())return;exporting=true;$('save-image').disabled=true;await assetsReady;
 if(!islands){toast(tr('이미지를 먼저 불러온 뒤 저장해 주세요.','Load the landscape image before saving.'));exporting=false;$('save-image').disabled=false;return;}
 await waitForFonts();
 const s=M.clone(getS()),when=sceneTime;
 const c=document.createElement('canvas');c.width=1536;c.height=930;const x=c.getContext('2d');
 x.fillStyle='#071b2b';x.fillRect(0,0,c.width,c.height);
 x.fillStyle='#f0e7cf';x.font='500 34px GmarketSans, sans-serif';x.fillText(tr('독도 코리아 스쿨','Dokdo Korea School'),48,62);
 x.fillStyle='#a9c5ca';x.font='20px SCoreDream, sans-serif';x.fillText(tr('배우는 만큼, 더 빛나는 독도','A little learning. A brighter Dokdo.'),48,96);
 x.save();x.translate(0,123);if(mapOpen)drawMapReference(x);else V.render(x,s,when,{islands,texture,reduced:reduced(),labels:true,...environmentOptions()});x.restore();
 const a=M.summary(s);x.fillStyle='#081f2e';x.fillRect(0,770,1536,160);
 const now=new Date();
 x.fillStyle='#e8efeb';x.font='500 25px GmarketSans, sans-serif';
 let name=a.name||tr('나의 독도','My Dokdo');while(x.measureText(name).width>1000)name=name.slice(0,-2)+'…';
 x.fillText(name,48,805);
 x.font='16px SCoreDream, sans-serif';x.fillStyle='#8fa7b2';x.textAlign='right';
 x.fillText(Core.dayKey(now.getTime())+' '+DokdoSolar.clock(now.getTime()),1488,805);x.textAlign='left';
 // What actually matters -- grade, XP, lifetime correct -- gets top billing;
 // the light-path/lap/beacon flavor text is real but secondary.
 x.fillStyle='#f5cd77';x.font='700 32px GmarketSans, sans-serif';
 const gp=Core.gradeProgress(a.gradeScore);
 x.fillText(`${levelText(gp)} · ${tr('정답','Correct')} ${num(a.correct)} · XP ${num(a.xp)}`,48,847);
 x.fillStyle='#8fa7b2';x.font='16px SCoreDream, sans-serif';const jp=M.Journey.progress(s);
 x.fillText(tr(`빛의 길 ${jp.filled}/1,025 · ${jp.shownLap}바퀴 · 봉화 ${a.beacons}`,`Path ${jp.filled}/1,025 / circuit ${jp.shownLap} / beacons ${a.beacons}`),48,878);
 x.font='14px SCoreDream, sans-serif';x.fillStyle='#75909c';x.fillText(tr('학습 기록 기념사진 · 상상 풍경이며 실제 측량지도가 아닙니다.','A learning keepsake · imagined landscape, not a survey map.'),48,916);
 try{
  await new Promise((resolve,reject)=>c.toBlob(blob=>{if(!blob){reject(Error('Canvas export failed.'));return;}download(blob,'my-dokdo-'+Core.dayKey()+'.png','image/png');resolve();},'image/png'));
  toast(tr('현재 풍경을 이미지로 저장했습니다. 학습 기록 백업은 별도로 보관해 주세요.','Saved the current landscape. Keep a separate learning backup, too.'));
 }catch(e){toast(tr('브라우저가 이미지 저장을 막았습니다. 배포 주소 또는 단일 미리보기 파일에서 다시 시도해 주세요.','The browser blocked image saving. Use the deployed address or the standalone preview.'));}
 finally{exporting=false;$('save-image').disabled=false;}
}

document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{const previous=mapOpen;mapOpen=false;if(!view(b.dataset.view))mapOpen=previous;});
document.querySelectorAll('[data-start]').forEach(b=>b.onclick=()=>start(b.dataset.start));
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeDialog(b.dataset.close));
document.querySelectorAll('[data-island]').forEach(b=>b.onclick=()=>mapFacts(b.dataset.island));
$('brand-home').onclick=()=>toggleMap(false);$('nav-map').onclick=()=>toggleMap(!mapOpen);$('close-map').onclick=()=>toggleMap(false);
$('start-lesson').onclick=()=>start('daily');$('start-review').onclick=()=>start('review');
$('leave-lesson').onclick=()=>view('home');$('open-settings').onclick=settings;$('change-age').onclick=()=>{closeDialog('settings-dialog');setupAge(renderHome,true);};
wire('age-recover-link','onclick',()=>{closeDialog('age-dialog');ageNext=null;view('records');$('cloud-load-nick')?.focus();});
$('open-sources').onclick=sources;wire('footer-sources','onclick',sources);$('arrange-beacon').onclick=beaconDialog;
(function(){
 const yt=(window.DOKDO_SITE_CONFIG&&window.DOKDO_SITE_CONFIG.youtube)||{};
 wire('support-link','href',yt.membershipUrl||yt.channelUrl||'#');
 wire('offer-support','href',yt.membershipUrl||yt.channelUrl||'#');
 wire('header-live-link','href',yt.liveUrl||yt.channelUrl||'#');
 wire('header-channel-link','href',yt.channelUrl||'#');
 if(!yt.liveUrl&&!yt.channelUrl)wire('header-live-link','hidden',true);
 if(!yt.channelUrl)wire('header-channel-link','hidden',true);
})();
// 관광·굿즈는 홈의 큰 블록에서 엽니다. 바닥글에 있던 작은 링크는 이 블록과
// 겹쳐서 없앴습니다.
wire('offer-tour','onclick',()=>showDialog('tourism-dialog'));
wire('offer-goods','onclick',()=>toast(tr('굿즈는 준비 중입니다. 준비되는 대로 여기에서 안내합니다.','Merchandise is being prepared. It will be announced here.')));
wire('open-channel-info','onclick',()=>showDialog('channel-info-dialog'));
wire('footer-channel-info','onclick',()=>showDialog('channel-info-dialog'));

let disputeItem=null;
function openDispute(item){disputeItem=item;$('dispute-reason').value='';showDialog('dispute-dialog');}
wire('dispute-send','onclick',()=>{
 if(!disputeItem)return;
 const item=disputeItem,reason=$('dispute-reason').value.trim();
 const subject=encodeURIComponent('[독도 코리아 스쿨] 문제 이의제기 - 문항 '+item.id);
 const body=encodeURIComponent('문항 ID: '+item.id+'\n문제: '+item.q+'\n정답으로 표시된 보기: '+item.choices[item.answer]+'\n\n의견:\n'+(reason||'(작성 없음)'));
 location.href='mailto:officialdokdokorea@gmail.com?subject='+subject+'&body='+body;
 closeDialog('dispute-dialog');
 toast(tr('이메일 앱을 열었습니다. 내용을 확인하고 보내주세요.','Opened your email app. Please review and send it.'));
});
// The standing "being prepared" line now lives at the top of the dialog
// (item 11), so these buttons only confirm what the reader already sees.
wire('tourism-go','onclick',()=>toast(tr('예약 창구는 준비 중입니다. 열리는 대로 이 화면에서 바로 안내합니다.','Booking is being prepared. It will open right here.')));
wire('tourism-products','onclick',()=>toast(tr('울릉도·독도 상품 소개는 곧 게시됩니다.','Tour packages will be posted here soon.')));
wire('tourism-call','onclick',()=>toast(tr('전화번호는 개설 중입니다. 문의 · 협업 링크로 먼저 보내 주세요.','The phone line is being set up. Please use the collaboration link for now.')));
$('sound').onclick=toggleSound;$('save-image').onclick=saveImage;
/* This used to save an image and nothing else, so the one button labelled
 * 공유하기 never showed the six things you could actually do with a result.
 * It opens the sheet; saving an image is one row inside it. */
wire('grade-share','onclick',()=>{
 shareTrack('grade_badge');
 const body=$('share-dialog-body');
 if(body){body.replaceChildren(renderShareRow());showDialog('share-dialog');}
 else saveImage();
});
wire('music-prev','onclick',()=>musicSkip(-1));wire('music-next','onclick',()=>musicSkip(1));
$('zoom').onclick=()=>{const on=$('canvas-shell').classList.toggle('zoomed');$('zoom').setAttribute('aria-pressed',String(on));txt('zoom',on?tr('전체 보기','Fit'):tr('확대','Zoom'));if(on)$('canvas-shell').scrollLeft=$('canvas-shell').scrollWidth*.22;};
$('invite').onclick=async()=>{if(busy||!guarded())return;busy=true;try{
 const n=await mutate(s=>Core.invite(s,Date.now()));renderHome();toast(n?tr(`${n}마리의 강치가 1분 동안 찾아왔어요.`,`${n} gangchi will visit for one minute.`):tr('부르기 보상이나 빈자리가 부족해요. 보상은 사용되지 않았습니다.','No invitation or free space. No credits were spent.'));
}catch(e){}finally{busy=false;}};
$('bird-replay').onclick=async()=>{
 // The visit is drawn on the home canvas, so replaying it from the journal
 // looked like a dead button until the view followed the bird.
 try{const ok=await mutate(s=>M.replayBirds(s));toggleMap(false);
  if(ok){view('home');toast(tr('새가 다시 찾아왔어요. 바다를 보세요.','The visitor is back — watch the sea.'));}
  else toast(tr('아직 만난 생명이 없어요. 한 단원을 마치면 찾아옵니다.','No encounter yet. Finish a unit and a visitor will come.'));
 }catch(e){}};
$('reduce-motion').onchange=async()=>{try{await mutate(s=>s.visual.reduceMotion=$('reduce-motion').checked);document.body.classList.toggle('motion-reduced',reduced());paint();}catch(e){}};
$('enable-birds').onchange=async()=>{try{await mutate(s=>s.visual.birdsEnabled=$('enable-birds').checked);}catch(e){}};
$('sea-density').onchange=async()=>{try{await mutate(s=>s.seaDensity=$('sea-density').value);paint();}catch(e){}};
$('language').onclick=async()=>{
 if(lesson){toast(tr('수업을 마치거나 나온 뒤 언어를 바꿔 주세요.','Finish or leave the lesson before switching language.'));return;}
 try{const next=language==='ko'?'en':'ko';await mutate(s=>s.visual.language=next);language=next;translate();renderHome();renderJournal();if(currentView==='records')renderRecords();if(currentView==='learn'&&!lesson)renderCatalog();renderOutlines();mapFacts();
  if(soundOn){const label=trackLabel(trackIndex);if(label)$('sound').title=label;}
 }catch(e){}
};
document.addEventListener('visibilitychange',()=>{
 // A backgrounded/hidden tab is not a reason to stop music the user turned
 // on -- only stopSound() (their own choice) or pagehide (leaving) should.
 frameLast=0;if(document.hidden){if(getS()&&!store.blocked)store.save();}else paint();
});
window.addEventListener('pagehide',()=>{stopSound();if(getS()&&!store.blocked)store.save();});
window.addEventListener('storage',event=>{if(event.key===M.KEY&&event.newValue!==store.expected){store.blocked=true;store.error='CONFLICT: another tab changed this record.';stopSound();updateStorageStatus();}});
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('close',()=>{frameLast=0;paint();}));
function seedDemo(){
 const s=M.fresh();s.name=tr('가상 탐험가','Demo explorer');s.started=true;s.grade='PHD2';s.xp=18750;s.gcHit=50;s.streak=7;s.passed=['M3'];
 const ids=window.DOKDO_DEMO_IDS||Array.from({length:1513},(_,i)=>i+1);
 ids.forEach((id,i)=>{s.m[id]={lv:i>=1510?4:i%3+1,cor:3,att:3,seen:3,earned:20,due:Core.addDays(Core.dayKey(),1)};});
 s.learningProfile=C.profile('20+');s.visual.language=language;s.visual.unlocks['stage-1']={species:'black-tailed-gull',at:new Date().toISOString()};
 delete s.visual.journey;return M.ensure(s);
}
function initializeDemo(){
 $('demo-banner').hidden=false;
 const sample=document.createElement('button');sample.className='small-button';sample.id='demo-sample';sample.textContent=tr('가상 1,513문항 풍경 보기','Show a fictional 1,513-question landscape');
 sample.onclick=()=>{if(!confirm(tr('시연 기록을 가상 헤비유저 상태로 바꿀까요? 실제 기록에는 영향이 없습니다.','Replace this isolated demo with a fictional heavy-user state? Real records are unaffected.')))return;store.state=seedDemo();store.save();lightDirty=true;lesson=null;view('home',true);paint();};
 $('demo-banner').append(sample);
 $('demo-reset').onclick=()=>{if(!confirm(tr('시연 기록만 비우고 처음부터 볼까요?','Clear only the isolated demo?')))return;store.state=M.fresh();store.save();language='ko';translate();lesson=null;lightDirty=true;view('home',true);paint();};
 if(mode==='demo'&&getS()&&!Object.keys(getS().m).length){store.state=seedDemo();store.save();state=getS();}
}
translate();if(isolated)initializeDemo();renderHome();renderOutlines();mapFacts();updateStorageStatus();
if(!getS())view('records',true);
document.body.classList.toggle('motion-reduced',reduced());
window.DokdoApp={
 version:M.VERSION,mode,get state(){return getS();},store,start,choose,next,view,mutate,paint,saveImage,
 tick:(ms,active=true)=>{M.tick(getS(),ms,active);paint();renderVisitors();},
 get lesson(){return lesson;},get sceneTime(){return sceneTime;},get assetsReady(){return assetsReady;},
 get audio(){return audio;},stopSound,seedDemo,weatherClient,get timeMode(){return timeMode;}
};
})();
