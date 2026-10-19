/* V3 presentation layer. Existing lesson, ranking and storage models remain authoritative. */
(function(){
'use strict';
const App=window.DokdoApp,G=window.DokdoGames,A=window.DokdoGameArt,C=window.DokdoStarter,$=id=>document.getElementById(id);
if(!App||!document.body.classList.contains('school-v3'))return;
const copy=(ko,en)=>document.documentElement.lang==='en'?en:ko;
const label=(id,ko,en)=>{const el=$(id);if(el)el.textContent=copy(ko,en);};
// Area choice is presentation state only; lesson, backup and progress keys are unchanged.
const areaParams=new URLSearchParams(location.search);
let learningEntered=areaParams.get('area')==='learn'||areaParams.get('play')==='learn';
const originalHome=$('brand-home').onclick,originalMap=$('nav-map').onclick;
function syncArea(){
 document.body.classList.toggle('v3-choosing',!learningEntered);
 const info=document.body.classList.contains('v3-exploring'),channel=!$('view-channel').hidden;
 const nav=$('v3-learn-nav'),active=learningEntered&&!$('view-home').hidden&&!info;
 nav.classList.toggle('active',active);if(active)nav.setAttribute('aria-current','page');else nav.removeAttribute('aria-current');
 document.title=channel?copy('독도 코리아 채널 · 독도 코리아 스쿨','Dokdo Korea Channel · Dokdo Korea School'):info?copy('독도 알아보기 · 독도 코리아 스쿨','Discover Dokdo · Dokdo Korea School'):learningEntered?copy('독도 배움터 · 독도 코리아 스쿨 V3','Dokdo Learning · Dokdo Korea School V3'):copy('독도 코리아 스쿨 V3 · 배움터와 놀이터','Dokdo Korea School V3 · Learn and Play');
}
function enterLearning(){
 const previous=learningEntered;learningEntered=true;
 const moved=originalHome?originalHome():App.view('home');
 if(moved===false)learningEntered=previous;
 syncArea();return moved!==false;
}
function enterMain(){
 // Preserve the original map-close and unfinished-lesson confirmation behavior.
 const moved=originalHome?originalHome():App.view('home');
 if(moved===false)return false;
 learningEntered=false;syncArea();return true;
}
function entryArt(){
 const canvas=$('v3-entry-dog');if(!canvas||!A)return;const c=canvas.getContext('2d');c.clearRect(0,0,600,320);
 c.fillStyle='#f8d6aa';c.beginPath();c.ellipse(300,165,126,112,0,0,Math.PI*2);c.fill();
 c.fillStyle='#e7bc86';c.beginPath();c.ellipse(302,277,151,13,0,0,Math.PI*2);c.fill();
 c.strokeStyle='#b77c49';c.lineWidth=3;c.beginPath();c.moveTo(113,241);c.quadraticCurveTo(143,231,171,241);c.moveTo(414,242);c.quadraticCurveTo(447,232,476,242);c.stroke();
 for(const [x,y,r]of[[126,92,13],[445,142,18],[399,52,9]]){c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,d=i%2?r*.45:r;c.lineTo(x+Math.cos(a)*d,y+Math.sin(a)*d);}c.closePath();c.fillStyle='#d38b2d';c.fill();}
 A.sprite(c,'dog',298,260,3.25,.3);
}
function gameRecord(){try{const live=App.mode==='live',raw=live?localStorage.getItem(G.KEY):null;return raw?G.roll(G.validate(JSON.parse(raw))):G.fresh();}catch(e){return null;}}
function garden(canvas,s,game){if(!canvas||!game)return;A.animateIsland(canvas,()=>game,()=>{const lights=window.DokdoAppModel.summary(s).lights||0;if(lights){const c=canvas.getContext('2d');for(let i=0;i<Math.min(60,lights);i++){const x=(.3+(i%12)*.036)*canvas.width,y=(.58+Math.sin(i*.8)*.065+Math.floor(i/12)*.018)*canvas.height;c.beginPath();c.arc(x,y,2.6,0,Math.PI*2);c.fillStyle='#fff7b4';c.fill();}}});}
function refresh(){
 syncArea();
 label('v3-live-entry-label','실시간 독도 보러 가기 ↗','Watch Dokdo live ↗');label('v3-channel-live-label','실시간 독도 보러 가기 ↗','Watch Dokdo live ↗');label('v3-info-live','실시간 독도 보러 가기 ↗','Watch Dokdo live ↗');
 label('v3-info-menu-title','독도 알아보기','Discover Dokdo');label('v3-info-menu-copy','위치·역사·생명·오늘의 날씨','Place, history, wildlife & weather');label('v3-channel-menu-title','독도 코리아 채널','Dokdo Korea Channel');label('v3-channel-menu-copy','최근 영상·라이브·음악과 이야기','Recent videos, live & music');
 label('v3-info-title','독도 알아보기','Discover Dokdo');label('v3-info-copy','독도의 위치와 모습, 살아가는 생명과 오늘의 날씨를 만나요.','Explore Dokdo’s location, landscape, wildlife and today’s weather.');label('v3-weather-link','오늘의 날씨','Today’s weather');label('v3-question-link','240문항과 출처','240 questions & sources');label('v3-info-sources','그림·자료 출처','Artwork & sources');
 label('v3-channel-title','독도 코리아 채널','Dokdo Korea Channel');label('v3-channel-copy','음악과 영상으로 독도의 이야기를 전합니다.','Sharing Dokdo’s story through music and video.');label('v3-channel-home','← 메인으로','← Back to the main menu');label('v3-latest-title','최근 공개 영상','Recent public videos');label('youtube-channel-link','채널에서 전체 영상 보기 ↗','All videos on YouTube ↗');label('channel-feed-retry','다시 불러오기','Try again');label('v3-channel-feed-note','공식 공개 영상 목록은 최대 15분간 보관됩니다. 눌러서 YouTube에서 보며, 자동으로 재생하지 않습니다.','The official public feed is cached for up to 15 minutes. Open a video on YouTube to watch; nothing plays automatically.');
 label('v3-versions-link','V1 · V2 · V3 버전 안내','V1 · V2 · V3 version guide');
 label('v3-main-language','English','한국어');$('v3-main-language').setAttribute('aria-label',copy('Switch to English','한국어로 바꾸기'));
 label('v3-entry-title','어디로 가볼까요?','Where shall we go?');label('v3-entry-description','배우고, 놀며 독도와 가까워져요.','Learn, play, and get closer to Dokdo.');
 label('v3-choice-learn-title','독도 배움터','Dokdo Learning');label('v3-choice-learn-description','문제를 풀며 독도를 알아가요.','Discover Dokdo, one question at a time.');label('v3-choice-learn-action','배움터 들어가기 →','Start learning →');
 label('v3-choice-play-title','독도 놀이터','Dokdo Playground');label('v3-choice-play-description','게임하며 나의 섬을 가꿔요.','Play games and grow your own island.');label('v3-choice-play-action','놀이터 들어가기 →','Start playing →');
 label('v3-main-home','← 메인으로','← Back to the main menu');label('v3-back-learning','← 배움터로 돌아가기','← Back to Dokdo Learning');
 const s=App.state;if(!s)return;const en=document.documentElement.lang==='en',p=s.learningProfile,unit=C.unitInfo(p?.course?.unit||1),game=gameRecord(),summary=window.DokdoAppModel.summary(s);
 label('v3-area-label','DOKDO KOREA SCHOOL · 독도 배움터','DOKDO KOREA SCHOOL · LEARNING');
 label('v3-greeting','오늘도, 한 걸음만.','One little step today.');label('v3-subtitle','알아갈수록 가까워지는 나의 독도.','A little learning brings Dokdo closer.');
 label('v3-today','오늘의 독도 이야기','TODAY’S DOKDO STORY');label('v3-lesson-title',unit.ko,unit.en);label('v3-lesson-meta','짧은 이야기 · 5문제','A short story · 5 questions');
 label('v3-start-label',p?'이어서 시작하기':'첫 이야기 시작하기',p?'Continue learning':'Start my first story');
 label('v3-path-title','나의 배움길','My learning path');label('v3-all-units','전체 이야기 보기 →','All stories →');label('v3-island-title','배운 만큼 자라는 내 독도','My growing Dokdo');label('v3-island-link','내 독도 꾸미기 →','Decorate my Dokdo →');
 label('v3-snapshot-note','불빛과 친구는 배움을 기념하는 상상 풍경이에요.','Lights and friends are an imagined celebration of learning.');
 label('v3-review-title','배운 이야기, 기억나나요?','Remember this story?');label('v3-review-copy','전에 만난 문제로 가볍게 떠올려요.','Recall what you learned before.');
 label('v3-play-title','이제, 독도에서 놀까요?','Time to play on Dokdo?');label('v3-play-copy','삽살개와 달리고, 바다를 깨끗하게.','Run with Sapsal, or clean the sea.');label('v3-play-link','독도 놀이터 가기 →','Visit Dokdo Playground →');
 label('v3-home-note','기록은 이 브라우저에 저장돼요.','Your record is saved in this browser.');label('v3-more-label','더보기','More');label('v3-optional-label','닉네임·국가·학교 (선택)','Nickname, country & school (optional)');label('v3-profile-entry','닉네임·국가·학교 설정','Nickname, country & school');label('v3-profile-menu','닉네임·국가·학교','Nickname, country & school');
 label('v3-source-label','자료 출처 보기','Sources');label('v3-feedback-label','조금 더 알아보기','A little more detail');
 const count=p?C.courseEvidence(p,s.m).completed:0;label('v3-path-count',count+' / 12 이야기',count+' / 12 stories');
 label('v3-lights',summary.lights+'개의 불빛',summary.lights+' lights');
 if(game){garden($('play-entry-island'),s,game);const lv=G.islandLevel(game),done=game.growth.cleared>=20&&game.growth.seals>=10;label('v3-island-level',done?'★ 별 · 완성':'섬 '+lv+'단계',done?'Star · Complete':'Island stage '+lv);$('v3-garden-progress').max=20;$('v3-garden-progress').value=game.growth.cleared;label('v3-next-gift','강치 '+game.growth.seals+'/10마리 · '+game.xp+' XP','Gangchi '+game.growth.seals+'/10 · '+game.xp+' XP');}
 else label('v3-next-gift','놀이터 기록을 확인해 주세요.','Please check your playground record.');
 const list=$('v3-path');list.replaceChildren();const n=unit.id;
 for(let i=0;i<3;i++){const id=(n-1+i)%12+1,u=C.unitInfo(id),done=!!p?.course?.completed[p.course.track+':'+id],row=document.createElement('div');row.className='v3-stop'+(i===0?' current':'')+(done?' done':'');const icon=document.createElement('span');icon.className='v3-stop-icon';icon.textContent=done?'✓':i===0?'★':String(id).padStart(2,'0');icon.setAttribute('aria-hidden','true');const text=document.createElement('div'),small=document.createElement('small'),name=document.createElement('b');small.textContent=copy(i===0?'지금 만날 이야기':'다음 이야기',i===0?'YOUR NEXT STEP':'UP NEXT');name.textContent=en?u.en:u.ko;text.append(small,name);row.append(icon,text);if(i===0){row.setAttribute('aria-current','step');const tag=document.createElement('span');tag.className='v3-now';tag.textContent=copy('여기부터','START HERE');row.append(tag);}list.append(row);}
 const mascot=$('v3-mascot');if(mascot){const c=mascot.getContext('2d');c.clearRect(0,0,mascot.width,mascot.height);A.sprite(c,'dog',97,132,1.9,.3);}
 if($('lesson-result')&&!$('lesson-result').hidden)decorateResult();
 if(!$('view-channel').hidden){renderChannel();loadChannel();}
}
const channelFeed={status:'idle',data:null,loading:false,expires:0};
function renderChannel(){
 const status=$('channel-feed-status'),time=$('channel-feed-time'),list=$('channel-latest-list');list.replaceChildren();time.hidden=true;
 $('channel-feed-retry').hidden=channelFeed.status!=='error';
 if(App.mode!=='live'){status.textContent=copy('미리보기에서는 최근 영상을 불러오지 않습니다. 공식 채널에서 확인해 주세요.','This preview does not fetch recent videos. Open the official channel to see them.');return;}
 if(channelFeed.status==='error'){status.textContent=copy('최근 영상을 불러오지 못했어요. 잠시 후 다시 시도하거나 채널에서 확인해 주세요.','Recent videos could not be loaded. Try again later or open the channel.');return;}
 if(channelFeed.status!=='ready'){status.textContent=copy('공식 YouTube 채널의 최근 영상을 불러오고 있어요.','Loading recent videos from the official YouTube channel.');return;}
 status.textContent=copy('YouTube 공식 공개 목록 · 공개일이 최근인 순서','Official YouTube public feed · newest publication first');
 const locale=document.documentElement.lang==='en'?'en-US':'ko-KR';
 time.textContent=copy('목록 확인: ','Feed checked: ')+new Date(channelFeed.data.checkedAt).toLocaleString(locale,{timeZone:'Asia/Seoul'})+copy(' (한국 시간)',' (Korea time)');time.hidden=false;
 for(const item of channelFeed.data.items){const a=document.createElement('a');a.className='v3-video';a.href='https://www.youtube.com/watch?v='+item.id;a.target='_blank';a.rel='noopener noreferrer';const img=document.createElement('img');img.src='https://i.ytimg.com/vi/'+item.id+'/hqdefault.jpg';img.alt='';img.loading='lazy';img.width=480;img.height=360;const name=document.createElement('strong');name.textContent=item.title;const date=document.createElement('small');date.textContent=copy('공개일 ','Published ')+new Date(item.published).toLocaleDateString(locale,{year:'numeric',month:'short',day:'numeric',timeZone:'Asia/Seoul'});a.append(img,name,date);list.append(a);}
}
async function loadChannel(force=false){
 if(App.mode!=='live'||channelFeed.loading||!force&&(channelFeed.status==='error'||channelFeed.status==='ready'&&Date.now()<channelFeed.expires))return;
 channelFeed.loading=true;channelFeed.status='loading';renderChannel();const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),10000);
 try{const response=await fetch('/api/channel',{credentials:'omit',signal:ctrl.signal});if(!response.ok)throw Error('Channel feed unavailable.');const data=await response.json();if(data.state!=='ok'||data.channelId!=='UCVfBrS1H2crOZHjf2I1mv0A'||!Number.isFinite(Date.parse(data.checkedAt))||!Array.isArray(data.items)||!data.items.length||data.items.length>6||data.items.some(item=>!item||!/^[A-Za-z0-9_-]{11}$/.test(item.id)||typeof item.title!=='string'||!item.title.trim()||item.title.length>300||!Number.isFinite(Date.parse(item.published))))throw Error('Invalid channel feed.');channelFeed.data=data;channelFeed.expires=Date.parse(data.checkedAt)+15*60000;channelFeed.status='ready';}
 catch(e){channelFeed.data=null;channelFeed.status='error';}
 finally{clearTimeout(timer);channelFeed.loading=false;renderChannel();}
}
function decorateResult(){
 const box=$('lesson-result');if(box.querySelector('.v3-result-island'))return;
 const game=gameRecord();if(!game)return;const picture=document.createElement('canvas');picture.width=700;picture.height=265;picture.className='v3-result-island';picture.setAttribute('role','img');picture.setAttribute('aria-label',copy('이번 배움 뒤의 내 독도 상상 풍경','My imagined Dokdo after learning'));garden(picture,App.state,game);box.querySelector('.result-score')?.after(picture);
 const details=document.createElement('details'),head=document.createElement('summary');head.textContent=copy('배운 내용과 자세한 기록','What I learned & details');details.className='v3-result-details';details.append(head);for(const child of [...box.children])if(child.matches('p:not(.result-score):not(.unit-open):not(.course-done),.lesson-takeaway,.share-row'))details.append(child);box.append(details);
 const row=box.querySelector('.button-row');if(row){const play=document.createElement('a'),live=App.mode==='live';play.href=live?'./games.html':'https://dokdo-school-v2.vercel.app/dokdo-next/games.html';if(!live){play.target='_blank';play.rel='noopener noreferrer';}play.className='v3-result-play';play.textContent=live?copy('받은 도전권으로 놀기 →','Play with my tickets →'):copy('운영 독도 놀이터 열기 →','Open live Dokdo Playground →');row.append(play);}
}
// Reuse the same controls so their existing lesson handlers and keyboard semantics survive.
const start=$('start-lesson');start.replaceChildren();const startLabel=document.createElement('span');startLabel.id='v3-start-label';start.append(startLabel);$('v3-start-slot').append(start);
$('v3-review-slot').append($('start-review'));
$('v3-island-slot').append($('play-entry-island'));
$('v3-main-language').onclick=()=>$('language').click();$('v3-profile-entry').onclick=()=>{if(!window.DokdoAccountEntry?.openProfile())App.editProfile();};$('v3-profile-menu').onclick=()=>{$('v3-more').open=false;if(!window.DokdoAccountEntry?.openProfile())App.editProfile();};$('v3-enter-learn').onclick=enterLearning;$('v3-learn-nav').onclick=enterLearning;
$('brand-home').onclick=enterMain;$('v3-main-home').onclick=enterMain;
$('v3-channel-home').onclick=enterMain;$('channel-feed-retry').onclick=()=>loadChannel(true);$('v3-info-sources').onclick=()=>$('open-sources').click();
$('nav-map').onclick=()=>{const previous=learningEntered;learningEntered=true;const moved=originalMap();if(moved===false)learningEntered=previous;syncArea();};
$('v3-all-units').onclick=()=>App.view('learn');
$('v3-explore').onclick=()=>{if(!enterLearning())return;document.body.classList.add('v3-exploring');refresh();$('v3-info-title').scrollIntoView({block:'start'});};
$('v3-back-learning').onclick=()=>{document.body.classList.remove('v3-exploring');App.view('home');};
const legacy=$('legacy-banner');if(legacy)$('view-home').prepend(legacy);
// Optional public profile fields are disclosed together, with their existing visibility notices intact.
const form=$('age-form'),optional=document.createElement('details'),optionalTitle=document.createElement('summary');optional.className='v3-optional-profile';optional.open=true;optionalTitle.id='v3-optional-label';optional.append(optionalTitle);
for(const id of ['nickname','flag-select','flag-other','school-cat','school-name']){const field=$(id)?.closest('label');if(field)optional.append(field);}
for(const el of [...form.querySelectorAll('[data-i18n="nicknamePublic"],[data-i18n="schoolPublic"]')])optional.append(el);
const ageField=$('age-band').closest('label');form.insertBefore(optional,$('age-error'));form.insertBefore(ageField,$('age-recover-link'));
document.addEventListener('dokdo:present',refresh);
document.addEventListener('dokdo:view',()=>{if(App.lesson||!$('view-learn').hidden||!$('view-home').hidden)learningEntered=true;document.body.classList.remove('v3-exploring');$('v3-more').open=false;document.body.classList.toggle('v3-in-lesson',!!App.lesson);refresh();});
document.addEventListener('dokdo:question',()=>{document.body.classList.add('v3-in-lesson');const q=App.lesson;const scope=$('v3-question-scope');scope.textContent=q?.item?.scope||'';scope.hidden=!scope.textContent;label('v3-question-guide','답이라고 생각하는 보기를 눌러 보세요.','Tap the answer you think is right.');$('v3-question-guide').hidden=!$('teaching').hidden;if(q)$('lesson').setAttribute('aria-label',copy('독도 이야기 · '+(q.index+1)+'번째 문제','Dokdo story · Question '+(q.index+1)));});
document.addEventListener('dokdo:answered',()=>{$('v3-question-guide').hidden=true;});
document.addEventListener('dokdo:result',()=>{document.body.classList.remove('v3-in-lesson');decorateResult();});
window.addEventListener('storage',e=>{if(e.key===G.KEY)refresh();});window.addEventListener('pageshow',refresh);
entryArt();refresh();if(areaParams.get('profile')==='1'){if(!window.DokdoAccountEntry?.openProfile())App.editProfile();}
})();
