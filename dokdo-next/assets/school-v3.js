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
 const nav=$('v3-learn-nav'),active=learningEntered&&!$('view-home').hidden;
 nav.classList.toggle('active',active);if(active)nav.setAttribute('aria-current','page');else nav.removeAttribute('aria-current');
 document.title=learningEntered?copy('독도 배움터 · 독도 코리아 스쿨 V3','Dokdo Learning · Dokdo Korea School V3'):copy('독도 코리아 스쿨 V3 · 배움터와 놀이터','Dokdo Korea School V3 · Learn and Play');
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
function garden(canvas,s,game){if(!canvas||!game)return;A.island(canvas,game);const lights=window.DokdoAppModel.summary(s).lights||0;if(lights){const c=canvas.getContext('2d');for(let i=0;i<Math.min(60,lights);i++){const x=(.3+(i%12)*.036)*canvas.width,y=(.58+Math.sin(i*.8)*.065+Math.floor(i/12)*.018)*canvas.height;c.beginPath();c.arc(x,y,2.6,0,Math.PI*2);c.fillStyle='#fff7b4';c.fill();}}}
function refresh(){
 syncArea();
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
 label('v3-home-note','기록은 이 브라우저에 저장돼요.','Your record is saved in this browser.');label('v3-more-label','더보기','More');label('v3-optional-label','별명·학교 추가하기 (선택)','Add nickname / school (optional)');
 label('v3-source-label','자료 출처 보기','Sources');label('v3-feedback-label','조금 더 알아보기','A little more detail');
 const count=p?C.courseEvidence(p,s.m).completed:0;label('v3-path-count',count+' / 12 이야기',count+' / 12 stories');
 label('v3-lights',summary.lights+'개의 불빛',summary.lights+' lights');
 if(game){garden($('play-entry-island'),s,game);label('v3-island-level','꾸미기 Lv. '+G.level(game.xp),'Decorating Lv. '+G.level(game.xp));const next=G.nextGift(game),lv=G.level(game.xp),floor=G.THRESHOLDS[lv-1],ceil=G.THRESHOLDS[lv]||floor+1;$('v3-garden-progress').max=ceil-floor;$('v3-garden-progress').value=next?game.xp-floor:ceil-floor;label('v3-next-gift',next?next.name+'까지 '+(ceil-game.xp)+' XP':'모든 친구를 만났어요',next?(ceil-game.xp)+' XP to the next gift':'All friends are here');}
 else label('v3-next-gift','놀이터 기록을 확인해 주세요.','Please check your playground record.');
 const list=$('v3-path');list.replaceChildren();const n=unit.id;
 for(let i=0;i<3;i++){const id=(n-1+i)%12+1,u=C.unitInfo(id),done=!!p?.course?.completed[p.course.track+':'+id],row=document.createElement('div');row.className='v3-stop'+(i===0?' current':'')+(done?' done':'');const icon=document.createElement('span');icon.className='v3-stop-icon';icon.textContent=done?'✓':i===0?'★':String(id).padStart(2,'0');icon.setAttribute('aria-hidden','true');const text=document.createElement('div'),small=document.createElement('small'),name=document.createElement('b');small.textContent=copy(i===0?'지금 만날 이야기':'다음 이야기',i===0?'YOUR NEXT STEP':'UP NEXT');name.textContent=en?u.en:u.ko;text.append(small,name);row.append(icon,text);if(i===0){row.setAttribute('aria-current','step');const tag=document.createElement('span');tag.className='v3-now';tag.textContent=copy('여기부터','START HERE');row.append(tag);}list.append(row);}
 const mascot=$('v3-mascot');if(mascot){const c=mascot.getContext('2d');c.clearRect(0,0,mascot.width,mascot.height);A.sprite(c,'dog',97,132,1.9,.3);}
 if($('lesson-result')&&!$('lesson-result').hidden)decorateResult();
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
$('v3-enter-learn').onclick=enterLearning;$('v3-learn-nav').onclick=enterLearning;
$('brand-home').onclick=enterMain;$('v3-main-home').onclick=enterMain;
$('nav-map').onclick=()=>{const previous=learningEntered;learningEntered=true;const moved=originalMap();if(moved===false)learningEntered=previous;syncArea();};
$('v3-all-units').onclick=()=>App.view('learn');
$('v3-explore').onclick=()=>{if(!enterLearning())return;document.body.classList.add('v3-exploring');$('stage-grid').scrollIntoView({block:'start'});};
$('v3-back-learning').onclick=()=>{document.body.classList.remove('v3-exploring');App.view('home');};
const legacy=$('legacy-banner');if(legacy)$('view-home').prepend(legacy);
// Optional public profile fields are disclosed together, with their existing visibility notices intact.
const form=$('age-form'),optional=document.createElement('details'),optionalTitle=document.createElement('summary');optional.className='v3-optional-profile';optionalTitle.id='v3-optional-label';optional.append(optionalTitle);
for(const id of ['nickname','flag-select','flag-other','school-cat','school-name']){const field=$(id)?.closest('label');if(field)optional.append(field);}
for(const el of [...form.querySelectorAll('[data-i18n="nicknamePublic"],[data-i18n="schoolPublic"]')])optional.append(el);
const ageField=$('age-band').closest('label');form.insertBefore(optional,$('age-error'));form.insertBefore(ageField,$('age-recover-link'));
document.addEventListener('dokdo:present',refresh);
document.addEventListener('dokdo:view',()=>{if(App.lesson||!$('view-learn').hidden||!$('view-home').hidden)learningEntered=true;document.body.classList.remove('v3-exploring');$('v3-more').open=false;document.body.classList.toggle('v3-in-lesson',!!App.lesson);refresh();});
document.addEventListener('dokdo:question',()=>{document.body.classList.add('v3-in-lesson');const q=App.lesson;const scope=$('v3-question-scope');scope.textContent=q?.item?.scope||'';scope.hidden=!scope.textContent;label('v3-question-guide','답이라고 생각하는 보기를 눌러 보세요.','Tap the answer you think is right.');$('v3-question-guide').hidden=!$('teaching').hidden;if(q)$('lesson').setAttribute('aria-label',copy('독도 이야기 · '+(q.index+1)+'번째 문제','Dokdo story · Question '+(q.index+1)));});
document.addEventListener('dokdo:answered',()=>{$('v3-question-guide').hidden=true;});
document.addEventListener('dokdo:result',()=>{document.body.classList.remove('v3-in-lesson');decorateResult();});
window.addEventListener('storage',e=>{if(e.key===G.KEY)refresh();});window.addEventListener('pageshow',refresh);
entryArt();refresh();
})();
