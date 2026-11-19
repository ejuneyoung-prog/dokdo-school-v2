/* DOKDO TOGETHER 화면 흐름. 몰입 설계(교수님 2026-11-20 "몰입이론 설계 중요하게"):
 *  1. 분명한 목표 — 화면에 늘 "다음 목표" 한 줄과 막대가 있다(오늘 할 일 → 다음 계급까지 남은 것 → 태극기 순위 앞 선장까지).
 *  2. 즉각적인 반응 — 누르면 바로 깃발이 오르고, 진동이 오고, 잡은 것이 튀어나온다.
 *  3. 도전과 실력의 균형 — 계급은 스쿨 학년(공부)과 통발 돈(놀이)이 함께 연다. 한쪽만으로는 못 오른다.
 *  4. 내가 고른다는 느낌 — 언제 건질지, 무엇을 꾸밀지는 내가 정한다.
 *  5. 기다림을 이어 주기 — 통발을 기다리는 동안 태극기 흔들기·스쿨 공부·캠핑장으로 잇는다.
 * 이 파일은 상태(user)·계산(rules)·저장소(store)·바다(sea)·스쿨(bridge)을 잇기만 한다. */
(function(){
'use strict';
const C=window.DokdoTogetherConfig,U=window.DokdoTogetherUser,R=window.DokdoTogetherRules,S=window.DokdoTogetherStore,B=window.DokdoTogetherBridge,FL=window.DokdoTaegeukgi,SH=window.DokdoTogetherShare,FLEET=window.DokdoTogetherFleet;
const $=id=>document.getElementById(id),money=C.MONEY.ko;
const store=S.make();let st=store.load();const inc=B.incoming();const sch=B.school(),grade=sch.grade;
let tops=[],samples=[],hallMe=false,sea=null,started=false;
const fmt=n=>Number(n||0).toLocaleString('ko-KR');
let toastT=0;function toast(t){const e=$('toast');e.textContent=t;e.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>e.classList.remove('on'),2600)}
// 화면 읽기 프로그램에는 바뀐 일만 알린다(1초마다 바뀌는 시계는 알리지 않는다).
const say=t=>{const e=$('sr');if(e){e.textContent='';setTimeout(()=>{e.textContent=t},30)}};
function keep(){if(!store.save(st))toast('이 브라우저는 저장을 막고 있습니다. 창을 닫으면 기록이 사라질 수 있습니다.')}
// 흔들기 단추의 작은 태극기(이모지는 기기마다 달라 직접 그린다)
{const w=$('wave'),c=document.createElement('canvas');c.width=48;c.height=32;c.setAttribute('aria-hidden','true');FL.draw(c.getContext('2d'),0,0,32);c.style.width='30px';c.style.height='20px';c.style.borderRadius='2px';w.firstChild.replaceWith(c)}
// ── 바다 ──
const topEdge=()=>{const p=$('proto'),t=document.querySelector('.top');return Math.max(t?t.getBoundingClientRect().bottom:0,p&&!p.hidden?p.getBoundingClientRect().bottom:0)+4};
try{sea=window.DokdoTogetherSea.create($('sea'),{tags:$('tags'),top:topEdge,onLost:()=>toast('3D 바다를 잠시 쉬게 했습니다. 곧 다시 열립니다.')})}catch(e){sea=null}
if(!sea){const p=document.createElement('p');p.className='no3d';p.textContent='이 기기에서는 3D 바다를 켤 수 없습니다. 태극기 올리기와 통발은 그대로 할 수 있습니다.';document.body.append(p)}
const hallShip=(t,i)=>({id:'hall'+i,hall:true,nick:t.nick,cc:'KR',stage:3,flag:'l',sail:'plain',title:C.HALL.title+(B.gradeLabel(t.level)?' · '+B.gradeLabel(t.level):''),spot:U.spotOf('h'+t.nick)});
function myShip(){const rk=R.rank(st,hallMe);return{id:st.id,me:true,nick:st.nick||'나',cc:st.cc,stage:st.stage,flag:st.flag,sail:st.sail,spot:st.spot,hall:hallMe,title:rk.title,days:st.raised.days,waves:st.waves.total}}
// 명예의 전당 배(내가 그 줄에 있으면 내 배가 대신 첫째 줄에 간다)
const hallOthers=()=>tops.filter(t=>!(hallMe&&t.nick===U.cleanNick(st.nick)));
function fleetList(){return[myShip(),...hallOthers().map(hallShip),...samples.map(s=>({...s,title:R.rank(s,false).title}))]}
// "지금 독도 앞바다의 배"에는 실제 배(내 배 + 명예의 전당)만 센다. 견본은 노란 띠에 따로 적는다(레드팀 11/20).
function refleet(){if(!st)return;if(sea){sea.setFleet(fleetList());paintTraps();sea.raiseFlag(R.raisedToday(st,Date.now()),false)}$('count').textContent=fmt(1+hallOthers().length);$('sample-n').textContent=fmt(samples.length)}
function paintTraps(){if(!sea)return;const now=Date.now();sea.setTraps(st.traps.map(at=>({ready:R.ready(at,now,st)})))}
// ── 목표 한 줄(몰입: 분명한 목표) ──
function goalOf(now){const ph=R.phase(st,now),nx=R.nextStage(st,grade);
 if(ph==='raise')return{t:'오늘의 첫 할 일: 태극기를 올려 독도를 지키세요',p:0};
 if(ph==='throw')return{t:'통발을 던져 두세요. '+Math.round(R.WAIT(st)/60000)+'분 뒤에 건질 수 있어요',p:.15};
 if(ph==='haul')return{t:'통발이 찼어요! 건져 보세요',p:1};
 // 기다리는 동안: 막대는 통발이 차는 정도(정직한 막대), 글은 그사이 할 일(다음 계급 → 태극기 순위)
 const left=Math.min(...st.traps.map(at=>R.leftMs(at,now,st))),pw=1-left/R.WAIT(st);
 if(nx.ok)return{t:'다음 계급 「'+nx.ship.title+'」을 지을 수 있어요! 배 키우기를 눌러 보세요',p:pw,wait:left};
 if(nx.ship&&nx.ship.ready){const s=nx.ship,needG=nx.need.includes('grade'),m=Math.min(st.money,s.price);
  // 학년이 막혔으면 공부가 지금 할 일: 남은 문제 수와 스쿨 단추를 보여 준다
  if(needG){const g=B.toward(s.grade);return{t:'다음 계급 「'+s.title+'」은 스쿨 '+B.gradeLabel(s.grade)+'에서 열려요 · 약 '+fmt(g.left)+'문제 더 맞히면 돼요'+(m<s.price?' (짓는 '+money+' '+fmt(m)+' / '+fmt(s.price)+')':''),p:pw,wait:left,school:true}}
  return{t:'다음 계급 「'+s.title+'」까지 '+money+' '+fmt(m)+' / '+fmt(s.price)+' · 건져서 팔면 모여요',p:pw,wait:left}}
 const pl=FLEET.myPlace([myShip(),...samples]);
 if(pl&&pl.rank>1&&R.raisedToday(st,now)&&st.waves.n<C.WAVE_PER_DAY)return{t:'태극기 순위 '+pl.rank+'위 · 앞 선장까지 '+pl.ahead+'번 흔들기 (오늘 '+(C.WAVE_PER_DAY-st.waves.n)+'번 남음)',p:pw,wait:left};
 return{t:'지금 지을 수 있는 가장 높은 계급입니다. 다음 계급은 아직 준비 중이에요',p:pw,wait:left}}
function goal(){const now=Date.now(),g=goalOf(now);$('goal-text').textContent=g.t+(g.wait!=null?' · 통발 '+mmss(g.wait):'');$('goal-bar').style.width=Math.round(Math.max(0,Math.min(1,g.p))*100)+'%';$('goal-go').hidden=!g.school;return g}
const mmss=ms=>{const s=Math.ceil(ms/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return(h?h+':'+String(m).padStart(2,'0'):m)+':'+String(x).padStart(2,'0')};
// ── 큰 단추 하나가 차례대로 바뀐다 ──
let lastPhase='',lastRaised=null;
function paint(){if(!st)return;const now=Date.now(),ph=R.phase(st,now),b=$('main');$('days').textContent=fmt(st.raised.days);
 b.disabled=ph==='wait';
 if(ph==='raise')b.textContent='태극기 올리기';
 else if(ph==='throw'){const n=R.slots(st)-st.traps.length;b.textContent='통발 던지기'+(n>1?' ('+n+'개)':'')}
 else if(ph==='haul')b.textContent='통발 건지기';
 else{const left=Math.min(...st.traps.map(at=>R.leftMs(at,now,st)));b.textContent='통발 기다리는 중 '+mmss(left)}
 // 자정을 넘기면 깃발이 내려간 채로 새 날을 맞는다
 const up=R.raisedToday(st,now);if(lastRaised!==null&&up!==lastRaised&&sea&&!up)sea.raiseFlag(false,false);lastRaised=up;
 const g=goal();
 if(ph!==lastPhase){if(ph==='haul'&&lastPhase){B.buzz('cue');toast('통발이 찼어요!')}if(lastPhase)say(g.t);lastPhase=ph;paintTraps()}}
let busyT=0;$('main').addEventListener('click',()=>{const now=Date.now();if(now<busyT)return;busyT=now+700;/* 두 번 빨리 눌러 다음 단계까지 넘어가지 않게 */const ph=R.phase(st,now);
 if(ph==='raise'){if(R.raise(st,now)){keep();sea&&sea.raiseFlag(true,true);B.buzz('big');toast('태극기를 올렸습니다 · 독도를 지킨 날 '+st.raised.days+'일째');lastRaised=true;refleetSoon()}}
 else if(ph==='throw'){const n=R.throwTraps(st,now);if(n){keep();B.buzz('tap');toast('통발 '+n+'개를 던졌습니다');paintTraps()}}
 else if(ph==='haul'){const got=R.haul(st,now);keep();B.buzz(got.some(c=>c.rare)?'big':'cue');showCatch(got)}
 paint()});
let rfT=0;const refleetSoon=()=>{clearTimeout(rfT);rfT=setTimeout(refleet,1700)};
// ── 흔들기(태극기 순위의 바탕) ──
$('wave').addEventListener('click',()=>{const w=$('wave');w.classList.remove('on');void w.offsetWidth;w.classList.add('on');sea&&sea.waveFlag();
 if(!R.raisedToday(st,Date.now())){toast('먼저 태극기를 올려 주세요');return}
 const n=R.wave(st,Date.now());if(n){keep();B.buzz('tap');if(st.waves.n===C.WAVE_PER_DAY)toast('오늘 흔들기 '+C.WAVE_PER_DAY+'번을 다 셌어요. 내일 또 흔들어 주세요')}else toast('오늘 흔든 횟수는 다 셌어요. 깃발은 계속 흔들 수 있어요');goal()});
// ── 독도 전체 보기 ──
$('view').addEventListener('click',()=>{const on=$('view').getAttribute('aria-pressed')!=='true';$('view').setAttribute('aria-pressed',String(on));if(sea){on?sea.viewIsland():sea.focusMe()}});
// ── 시트(창고·배 키우기·꾸미기·순위) ──
let lastFocus=null;
function open(title,build){lastFocus=document.activeElement;$('sheet-title').textContent=title;const body=$('sheet-body');body.textContent='';build(body);$('sheet').hidden=false;$('sheet-x').focus()}
function close(){$('sheet').hidden=true;lastFocus&&lastFocus.focus&&lastFocus.focus()}
$('sheet-x').addEventListener('click',close);$('sheet').addEventListener('click',e=>{if(e.target===$('sheet'))close()});
addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('sheet').hidden)close();if(!$('shot').hidden)closeShot()}});
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e};
const sellAll=()=>{const m=R.sellAll(st);keep();B.buzz('cue');toast('모두 팔았습니다 · '+money+' +'+fmt(m));return m};
function showCatch(got){open('통발에서 나온 것',body=>{const g=el('div','catch');got.forEach((c,i)=>{const d=el('div',c.rare?'rare':'');d.style.animationDelay=(i*.12)+'s';d.append(el('b','',(c.rare?'★ ':'')+c.name),el('small','',c.alias||''),el('small','',money+' '+c.value));g.append(d)});body.append(g);
 const bt=el('div','btns'),again=el('button','btn go','바로 다시 던지기'),sell=el('button','btn','창고 모두 팔기');
 again.addEventListener('click',()=>{const n=R.throwTraps(st,Date.now());if(n){keep();B.buzz('tap');toast('통발 '+n+'개를 다시 던졌습니다')}else toast('먼저 태극기를 올려 주세요');close();paint()});
 sell.addEventListener('click',()=>{sellAll();sell.disabled=true;paint()});
 bt.append(again,sell);body.append(bt);body.append(el('p','note','출처: 독도새우 — 서울신문 2017(대부분 통발로 잡음), 문어 — 매일신문 2009(독도 근해 통발 전언, 근거 약함).'))})}
const panels={
 bag(body){const ul=el('ul','list');let total=0;C.CATCH.forEach(c=>{const n=st.bag[c.id]||0;total+=n*c.value;const li=el('li',c.rare?'rare':'');const l=el('span');l.append(el('b','',c.name));l.append(el('small','',(c.alias?c.alias+' · ':'')+money+' '+c.value+' · 출처 '+c.src));li.append(l,el('span','',n+'마리'));ul.append(li)});
  body.append(ul,el('p','note','가진 '+money+': '+fmt(st.money)));const b=el('button','btn go','창고 모두 팔기 · '+money+' '+fmt(total));b.disabled=!total;b.addEventListener('click',()=>{sellAll();close();paint()});const w=el('div','btns');w.append(b);body.append(w)},
 ship(body){const cur=R.rank(st,hallMe);body.append(el('p','note','지금 계급: '+cur.title+(hallMe?' (명예의 전당)':'')+' · 스쿨 '+(sch.has?B.gradeLabel(grade):'기록 없음 (Lv.1)')+' · 가진 '+money+' '+fmt(st.money)));
  C.SHIPS.forEach(s=>{const d=el('div','rankcard'+(s.stage===st.stage?' cur':'')+(s.ready?'':' lock'));d.append(el('span','num',String(s.stage).padStart(2,'0')),el('h3','',s.title+' — '+s.name+(s.ready?'':' (2차)')));
   d.append(el('p','','혜택: 통발 '+s.traps+'개 · 기다림 '+Math.round(C.TRAP_MINUTES*s.wait)+'분 · 정박 '+(s.ring===1?'안쪽 고리(독도 가까이)':s.ring===2?'가운데 고리':'바깥 고리')+(s.bigFlag?' · 큰 태극기':'')));
   d.append(el('p','','열림: 스쿨 '+B.gradeLabel(s.grade)+' · 짓는 값 '+money+' '+fmt(s.price)+(s.ready?'':' · 2차에 열립니다')));body.append(d)});
  const nx=R.nextStage(st,grade),w=el('div','btns');
  if(nx.ship&&nx.ship.ready){const b=el('button','btn go','「'+nx.ship.title+'」 계급으로 키우기 · '+money+' '+fmt(nx.ship.price));b.disabled=!nx.ok;b.addEventListener('click',()=>{if(R.build(st,grade)){keep();B.buzz('big');toast('「'+R.ship(st).title+'」 계급이 되었습니다! 통발이 '+R.slots(st)+'개로 늘었어요');close();refleet();paint()}});w.append(b)}
  if(nx.ship&&nx.ship.ready&&nx.need.includes('grade')){const a=el('a','btn','스쿨에서 '+B.gradeLabel(nx.ship.grade)+'까지 공부하기');a.href=B.SCHOOL_URL;w.append(a)}
  body.append(w);body.append(el('p','note','명예의 전당(스쿨 퀴즈 최고 단계, 운영자 승인)에 오르면 독도 바로 앞 맨 앞 줄에 금빛 돛대로 정박합니다.'))},
 deco(body){body.append(el('p','note','태극기 크기'));const a=el('div','chips');C.FLAG_SIZES.forEach(f=>{const b=el('button','',f.name+(f.big&&!R.ship(st).bigFlag?' (독도 선장부터)':''));b.setAttribute('aria-pressed',String(st.flag===f.id));b.disabled=!!(f.big&&!R.ship(st).bigFlag);b.addEventListener('click',()=>{if(R.decorate(st,'flag',f.id)){keep();B.buzz('tap');refleet();close();open('꾸미기',panels.deco)}});a.append(b)});body.append(a);
  body.append(el('p','note','돛 문양'));const s=el('div','chips');C.SAILS.forEach(f=>{const b=el('button','',f.name);b.setAttribute('aria-pressed',String(st.sail===f.id));b.addEventListener('click',()=>{if(R.decorate(st,'sail',f.id)){keep();B.buzz('tap');refleet();close();open('꾸미기',panels.deco)}});s.append(b)});body.append(s)},
 rank(body){const all=[myShip(),...samples],pl=FLEET.myPlace(all);
  if(pl)body.append(el('p','','내 순위 '+pl.rank+'위 / '+pl.of+'척'+(pl.rank>1?' · 앞 선장까지 '+pl.ahead+'번':' · 1위입니다!')));
  body.append(el('p','note','태극기를 많이 흔든 선장 순서입니다. 하루 '+C.WAVE_PER_DAY+'번까지 셉니다. 지금은 이 기기 안의 순위이고, 견본 배가 섞여 있습니다. 실제 모두의 순위는 서버 저장소가 붙은 뒤 공개합니다.'));
  const list=FLEET.ranking(all,10),ul=el('ul','list');list.forEach((s,i)=>{const li=el('li',s.me?'me':s.sample?'sample':'');li.append(el('span','',(i+1)+'. '+s.nick+(s.sample?' (견본)':'')),el('span','',fmt(s.waves)+'번'));ul.append(li)});
  if(!list.some(s=>s.me)){const li=el('li','me');li.append(el('span','',(pl?pl.rank+'. ':'')+'나 · '+(st.nick||'선장')),el('span','',fmt(st.waves.total)+'번'));ul.append(li)}body.append(ul)}};
document.querySelectorAll('[data-panel]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.panel;open(b.textContent,panels[k])}));
// ── 사진 남기기: 먼저 만들어 보여 주고, 공유는 그 안의 단추를 누를 때(사파리는 누른 직후에만 공유 시트를 허락한다) ──
// 어린이 보호 확인을 통과하지 않은 기기는 사진에 닉네임·학년을 넣지 않는다(스쿨 공유 카드와 같은 원칙).
let shotBlob=null,shotName='';
const closeShot=()=>{$('shot').hidden=true;$('photo').focus()};
$('photo').addEventListener('click',async()=>{const p=$('photo');if(p.disabled)return;p.disabled=true;toast('사진을 만드는 중…');
 try{const ok=B.mayShare(),scene=sea?sea.snapshot():null,rk=R.rank(st,hallMe);
  const c=await SH.make(scene,{nick:ok?st.nick:'',title:rk.title,days:st.raised.days,grade:ok&&sch.has?B.gradeLabel(grade):'',hall:hallMe,url:'dokdo-school-v2.vercel.app/dokdo-next/together/'});
  shotBlob=await SH.toBlob(c);shotName='dokdo-together-'+R.kstDay()+'.png';$('shot-img').src=c.toDataURL('image/png');
  const inApp=SH.inApp(),share=!!shotBlob&&SH.canShare(shotBlob,shotName);$('shot-share').hidden=!share;$('shot-save').hidden=!shotBlob||inApp;
  $('shot-help').textContent=(inApp?'이 앱 안에서는 내려받기가 막혀 있어요. ':'')+'저장되지 않으면 사진을 길게 눌러 저장한 뒤 인스타그램·틱톡에 올려 주세요.';
  $('shot').hidden=false;$('shot-x').focus()}finally{p.disabled=false}});
$('shot-share').addEventListener('click',async()=>{const r=await SH.share(shotBlob,shotName);if(r==='shared')toast('사진을 보냈습니다');else if(r==='failed')toast('공유가 막혀 있어요. 사진을 길게 눌러 저장해 주세요')});
$('shot-save').addEventListener('click',()=>{if(SH.download(shotBlob,shotName))toast('내려받기를 시작했어요. 안 되면 사진을 길게 눌러 저장해 주세요')});
$('shot-x').addEventListener('click',closeShot);
// ── 캠핑장으로: 보호 확인을 통과한 때만 닉네임을 붙인다 ──
const campLink=()=>{$('camp').href=B.campUrl(st&&st.nick,B.mayShare())};
// ── 처음 오는 사람: 닉네임과 나라 ──
const CCS=['KR','US','JP','CN','GB','CA','AU','DE','FR','VN','PH','TH','ID','IN','BR'];
function welcome(){const sel=$('w-cc');let dn=null;try{dn=new Intl.DisplayNames(['ko'],{type:'region'})}catch(e){}
 const list=CCS.includes(inc.cc)||!/^[A-Z]{2}$/.test(inc.cc)?CCS:[...CCS,inc.cc];/* 스쿨에서 고른 나라가 목록 밖이어도 그대로 둔다 */
 list.forEach(c=>{const o=document.createElement('option');o.value=c;let nm=c;try{nm=dn?dn.of(c):c}catch(e){}o.textContent=nm+' ('+c+')';sel.append(o)});
 sel.value=list.includes(inc.cc)?inc.cc:'KR';$('w-nick').value=U.cleanNick(inc.nick);$('welcome').hidden=false;setTimeout(()=>$('w-nick').focus(),50);
 const go=()=>{const nick=U.cleanNick($('w-nick').value);if(!nick){toast('선장 이름을 적어 주세요');$('w-nick').focus();return}
  // 그사이 다른 탭에서 배를 받았으면 새로 만들지 않고 그 배를 쓴다(기록을 덮어쓰지 않게)
  let saved=true;const there=store.load();if(there){st=there}else{st=U.create(nick,sel.value);saved=store.save(st)}
  $('welcome').hidden=true;B.buzz('big');start();toast('독도 앞바다에 내 배가 떴습니다! 태극기를 올려 보세요');if(!saved)setTimeout(()=>toast('이 브라우저는 저장을 막고 있습니다. 창을 닫으면 내 배가 사라질 수 있습니다.'),2800)};
 $('w-go').addEventListener('click',go);$('w-nick').addEventListener('keydown',e=>{if(e.key==='Enter')go()})}
function start(){if(started){refleet();paint();return}started=true;campLink();refleet();paint();setInterval(paint,1000);
 store.fleet().then(f=>{samples=f;refleet()});
 B.hallOfFame().then(r=>{tops=r.tops||[];hallMe=B.inHall(tops,st.nick,grade);refleet();paint()})}
if(st){if(inc.nick&&!st.nick){st.nick=U.cleanNick(inc.nick);keep()}start()}else welcome();
// 같은 기기의 다른 탭에서 바뀐 기록을 다시 읽는다. 처음 화면이 떠 있으면 닫고 그 배로 시작한다.
addEventListener('storage',e=>{if(e.key===C.STORE_KEY){const s=store.load();if(s){st=s;if(!$('welcome').hidden)$('welcome').hidden=true;start();campLink()}}});
})();
