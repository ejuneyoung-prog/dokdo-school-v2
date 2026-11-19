/* DOKDO TOGETHER 화면 흐름. 몰입 설계(교수님 2026-11-20 "몰입이론 설계 중요하게"):
 *  1. 분명한 목표 — 화면에 늘 "다음 목표" 한 줄과 막대가 있다(오늘 할 일 → 다음 계급까지 남은 것).
 *  2. 즉각적인 반응 — 누르면 바로 깃발이 오르고, 진동이 오고, 잡은 것이 튀어나온다.
 *  3. 도전과 실력의 균형 — 계급은 스쿨 학년(공부)과 통발 돈(놀이)이 함께 연다. 한쪽만으로는 못 오른다.
 *  4. 내가 고른다는 느낌 — 언제 건질지, 무엇을 꾸밀지는 내가 정한다.
 *  5. 기다림을 이어 주기 — 통발을 기다리는 동안 태극기 흔들기·스쿨 공부·캠핑장으로 잇는다.
 * 이 파일은 상태(user)·계산(rules)·저장소(store)·바다(sea)·스쿨(bridge)을 잇기만 한다. */
(function(){
'use strict';
const C=window.DokdoTogetherConfig,U=window.DokdoTogetherUser,R=window.DokdoTogetherRules,S=window.DokdoTogetherStore,B=window.DokdoTogetherBridge,FL=window.DokdoTaegeukgi,SH=window.DokdoTogetherShare;
const $=id=>document.getElementById(id),money=C.MONEY.ko;
const store=S.make();let st=store.load();const inc=B.incoming();const grade=B.schoolGrade();
let tops=[],samples=[],hallMe=false,sea=null;
const fmt=n=>Number(n||0).toLocaleString('ko-KR');
let toastT=0;function toast(t){const e=$('toast');e.textContent=t;e.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>e.classList.remove('on'),2600)}
function keep(){if(!store.save(st))toast('이 브라우저는 저장을 막고 있습니다. 창을 닫으면 기록이 사라질 수 있습니다.')}
// 흔들기 단추의 작은 태극기(이모지는 기기마다 달라 직접 그린다)
{const w=$('wave'),c=document.createElement('canvas');c.width=48;c.height=32;c.setAttribute('aria-hidden','true');FL.draw(c.getContext('2d'),0,0,32);c.style.width='30px';c.style.height='20px';c.style.borderRadius='2px';w.firstChild.replaceWith(c)}
// ── 바다 ──
try{sea=window.DokdoTogetherSea.create($('sea'),{tags:$('tags')})}catch(e){sea=null}
if(!sea){const p=document.createElement('p');p.className='no3d';p.textContent='이 기기에서는 3D 바다를 켤 수 없습니다. 태극기 올리기와 통발은 그대로 할 수 있습니다.';document.body.append(p)}
const hallShip=(t,i)=>({id:'hall'+i,hall:true,nick:t.nick,cc:'KR',stage:3,flag:'l',sail:'plain',title:C.HALL.title+(B.gradeLabel(t.level)?' · '+B.gradeLabel(t.level):''),spot:U.spotOf('h'+t.nick)});
function myShip(){const rk=R.rank(st,hallMe);return{id:st.id,me:true,nick:st.nick||'나',cc:st.cc,stage:st.stage,flag:st.flag,sail:st.sail,spot:st.spot,hall:hallMe,title:rk.title,days:st.raised.days,waves:st.waves.total}}
// 명예의 전당 배(내가 그 줄에 있으면 내 배가 대신 첫째 줄에 간다)
const hallOthers=()=>tops.filter(t=>!(hallMe&&t.nick===U.cleanNick(st.nick)));
function fleetList(){return[myShip(),...hallOthers().map(hallShip),...samples.map(s=>({...s,title:R.rank(s,false).title}))]}
function refleet(){if(!st)return;if(sea){sea.setFleet(fleetList());paintTraps();sea.raiseFlag(R.raisedToday(st,Date.now()),false)}$('count').textContent=fmt(1+hallOthers().length+samples.length);$('sample-n').textContent=fmt(samples.length)}
function paintTraps(){if(!sea)return;const now=Date.now();sea.setTraps(st.traps.map(at=>({ready:R.ready(at,now,st)})))}
// ── 목표 한 줄(몰입: 분명한 목표) ──
function goal(){const now=Date.now(),ph=R.phase(st,now),nx=R.nextStage(st,grade);let t='',p=0;
 if(ph==='raise'){t='오늘의 첫 할 일: 태극기를 올려 독도를 지키세요';p=0}
 else if(ph==='throw'){t='통발을 던져 두세요. '+Math.round(R.WAIT(st)/60000)+'분 뒤에 건질 수 있어요';p=.15}
 else if(ph==='haul'){t='통발이 찼어요! 건져 보세요';p=1}
 else if(nx.why==='max'||(nx.need&&nx.need.includes('later')&&nx.need.length===1)){t='지금 만들 수 있는 가장 높은 계급입니다. 태극기를 흔들며 독도를 지켜 주세요 · 다음 계급은 곧 열립니다';p=1}
 else{const s=nx.ship,needG=nx.need.includes('grade'),m=Math.min(st.money,s.price);
  t='다음 계급 「'+s.title+'」까지 · '+(needG?'스쿨 '+B.gradeLabel(s.grade)+' 필요 · ':'')+money+' '+fmt(m)+' / '+fmt(s.price);p=(m/s.price)*(needG?.5:1)+(needG?0:0)}
 if(ph==='wait'){const left=Math.min(...st.traps.map(at=>R.leftMs(at,now,st)));t='통발 기다리는 중 · 그동안 태극기를 흔들거나 스쿨에서 공부해 보세요 ('+mmss(left)+')';p=1-left/R.WAIT(st)}
 $('goal-text').textContent=t;$('goal-bar').style.width=Math.round(Math.max(0,Math.min(1,p))*100)+'%'}
const mmss=ms=>{const s=Math.ceil(ms/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return(h?h+':'+String(m).padStart(2,'0'):m)+':'+String(x).padStart(2,'0')};
// ── 큰 단추 하나가 차례대로 바뀐다 ──
let lastPhase='';
function paint(){if(!st)return;const now=Date.now(),ph=R.phase(st,now),b=$('main');$('days').textContent=fmt(st.raised.days);
 b.disabled=ph==='wait';
 if(ph==='raise')b.textContent='태극기 올리기';
 else if(ph==='throw'){const n=R.slots(st)-st.traps.length;b.textContent='통발 던지기'+(n>1?' ('+n+'개)':'')}
 else if(ph==='haul')b.textContent='통발 건지기';
 else{const left=Math.min(...st.traps.map(at=>R.leftMs(at,now,st)));b.textContent='통발 기다리는 중 '+mmss(left)}
 if(ph!==lastPhase){if(ph==='haul'&&lastPhase){B.buzz('cue');toast('통발이 찼어요!')}lastPhase=ph;paintTraps()}
 goal()}
$('main').addEventListener('click',()=>{const now=Date.now(),ph=R.phase(st,now);
 if(ph==='raise'){if(R.raise(st,now)){keep();sea&&sea.raiseFlag(true,true);B.buzz('big');toast('태극기를 올렸습니다 · 독도를 지킨 날 '+st.raised.days+'일째');refleetSoon()}}
 else if(ph==='throw'){const n=R.throwTraps(st,now);if(n){keep();B.buzz('tap');toast('통발 '+n+'개를 던졌습니다');paintTraps()}}
 else if(ph==='haul'){const got=R.haul(st,now);keep();B.buzz(got.some(c=>c.rare)?'big':'cue');showCatch(got)}
 paint()});
let rfT=0;const refleetSoon=()=>{clearTimeout(rfT);rfT=setTimeout(refleet,1700)};
// ── 흔들기(태극기 순위의 바탕) ──
$('wave').addEventListener('click',()=>{const w=$('wave');w.classList.remove('on');void w.offsetWidth;w.classList.add('on');sea&&sea.waveFlag();
 if(!R.raisedToday(st,Date.now())){toast('먼저 태극기를 올려 주세요');return}
 const n=R.wave(st,Date.now());if(n){keep();B.buzz('tap');if(st.waves.n===C.WAVE_PER_DAY)toast('오늘 흔들기 '+C.WAVE_PER_DAY+'번을 다 셌어요. 내일 또 흔들어 주세요')}else toast('오늘 흔든 횟수는 다 셌어요. 깃발은 계속 흔들 수 있어요')});
// ── 독도 전체 보기 ──
$('view').addEventListener('click',()=>{const on=$('view').getAttribute('aria-pressed')!=='true';$('view').setAttribute('aria-pressed',String(on));if(sea){on?sea.viewIsland():sea.focusMe()}});
// ── 시트(창고·배 키우기·꾸미기·순위) ──
let lastFocus=null;
function open(title,build){lastFocus=document.activeElement;$('sheet-title').textContent=title;const body=$('sheet-body');body.textContent='';build(body);$('sheet').hidden=false;$('sheet-x').focus()}
function close(){$('sheet').hidden=true;lastFocus&&lastFocus.focus&&lastFocus.focus()}
$('sheet-x').addEventListener('click',close);$('sheet').addEventListener('click',e=>{if(e.target===$('sheet'))close()});
addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('sheet').hidden)close();if(!$('shot').hidden)$('shot').hidden=true}});
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e};
function showCatch(got){open('통발에서 나온 것',body=>{const g=el('div','catch');got.forEach((c,i)=>{const d=el('div',c.rare?'rare':'');d.style.animationDelay=(i*.12)+'s';d.append(el('b','',(c.rare?'★ ':'')+c.name),el('small','',c.alias||''),el('small','',' · '+money+' '+c.value));g.append(d)});body.append(g);
 const bt=el('div','btns'),again=el('button','btn go','바로 다시 던지기'),sell=el('button','btn','모두 팔기');
 again.addEventListener('click',()=>{const n=R.throwTraps(st,Date.now());if(n){keep();B.buzz('tap');toast('통발 '+n+'개를 다시 던졌습니다')}else toast('먼저 태극기를 올려 주세요');close();paint()});
 sell.addEventListener('click',()=>{const m=R.sellAll(st);keep();B.buzz('cue');toast(money+' '+fmt(m)+'을 벌었습니다');sell.disabled=true;paint()});
 bt.append(again,sell);body.append(bt);body.append(el('p','note','출처: 독도새우 — 서울신문 2017(대부분 통발로 잡음), 문어 — 매일신문 2009(독도 근해 통발 전언).'))})}
const panels={
 bag(body){const ul=el('ul','list');let total=0;C.CATCH.forEach(c=>{const n=st.bag[c.id]||0;total+=n*c.value;const li=el('li',c.rare?'rare':'');const l=el('span');l.append(el('b','',c.name));l.append(el('small','',(c.alias?c.alias+' · ':'')+money+' '+c.value+' · 출처 '+c.src));li.append(l,el('span','',n+'마리'));ul.append(li)});
  body.append(ul,el('p','note','가진 '+money+': '+fmt(st.money)));const b=el('button','btn go','모두 팔기 · '+money+' '+fmt(total));b.disabled=!total;b.addEventListener('click',()=>{const m=R.sellAll(st);keep();B.buzz('cue');toast(money+' '+fmt(m)+'을 벌었습니다');close();paint()});const w=el('div','btns');w.append(b);body.append(w)},
 ship(body){const cur=R.rank(st,hallMe);body.append(el('p','note','지금 계급: '+cur.title+(hallMe?' (명예의 전당)':'')+' · 스쿨 학년: '+B.gradeLabel(grade)+' · 가진 '+money+' '+fmt(st.money)));
  C.SHIPS.forEach(s=>{const d=el('div','rankcard'+(s.stage===st.stage?' cur':'')+(s.ready?'':' lock'));d.append(el('h3','',s.stage+'. '+s.title+' — '+s.name+(s.ready?'':' (2차)')));
   d.append(el('p','','혜택: 통발 '+s.traps+'개 · 기다림 '+Math.round(C.TRAP_MINUTES*s.wait)+'분 · 정박 '+(s.ring===1?'독도 가까이 첫째 고리':s.ring===2?'둘째 고리':'바깥 고리')+(s.bigFlag?' · 큰 태극기':'')));
   d.append(el('p','','열림: 스쿨 '+B.gradeLabel(s.grade)+' · 짓는 값 '+money+' '+fmt(s.price)+(s.ready?'':' · 2차에 열립니다')));body.append(d)});
  const nx=R.nextStage(st,grade),w=el('div','btns');
  if(nx.ship&&nx.ship.ready){const b=el('button','btn go','「'+nx.ship.title+'」로 키우기 · '+money+' '+fmt(nx.ship.price));b.disabled=!nx.ok;b.addEventListener('click',()=>{if(R.build(st,grade)){keep();B.buzz('big');toast('「'+R.ship(st).title+'」이 되었습니다! 통발이 '+R.slots(st)+'개로 늘었어요');close();refleet();paint()}});w.append(b)}
  if(nx.need&&nx.need.includes('grade')){const a=el('a','btn','스쿨에서 '+B.gradeLabel(nx.ship.grade)+'까지 공부하기');a.href=B.SCHOOL_URL;w.append(a)}
  body.append(w);body.append(el('p','note','명예의 전당(스쿨 퀴즈 최고 단계, 운영자 승인)에 오르면 독도 바로 앞 첫째 줄에 금빛 돛대로 정박합니다.'))},
 deco(body){body.append(el('p','note','태극기 크기'));const a=el('div','chips');C.FLAG_SIZES.forEach(f=>{const b=el('button','',f.name+(f.big&&!R.ship(st).bigFlag?' (독도 선장부터)':''));b.setAttribute('aria-pressed',String(st.flag===f.id));b.disabled=!!(f.big&&!R.ship(st).bigFlag);b.addEventListener('click',()=>{if(R.decorate(st,'flag',f.id)){keep();B.buzz('tap');refleet();close();open('꾸미기',panels.deco)}});a.append(b)});body.append(a);
  body.append(el('p','note','돛 문양'));const s=el('div','chips');C.SAILS.forEach(f=>{const b=el('button','',f.name);b.setAttribute('aria-pressed',String(st.sail===f.id));b.addEventListener('click',()=>{if(R.decorate(st,'sail',f.id)){keep();B.buzz('tap');refleet();close();open('꾸미기',panels.deco)}});s.append(b)});body.append(s)},
 rank(body){body.append(el('p','note','태극기를 많이 흔든 선장 순서입니다. 하루 '+C.WAVE_PER_DAY+'번까지 셉니다. 지금은 이 기기 안의 순위이고, 견본 배가 섞여 있습니다. 실제 모두의 순위는 서버 저장소가 붙은 뒤 공개합니다.'));
  const list=window.DokdoTogetherFleet.ranking([myShip(),...samples],10),ul=el('ul','list');list.forEach((s,i)=>{const li=el('li',s.me?'me':s.sample?'sample':'');li.append(el('span','',(i+1)+'. '+s.nick+(s.sample?' (견본)':'')),el('span','',fmt(s.waves)+'번'));ul.append(li)});
  if(!list.some(s=>s.me)){const li=el('li','me');li.append(el('span','','나 · '+(st.nick||'선장')),el('span','',fmt(st.waves.total)+'번'));ul.append(li)}body.append(ul)}};
document.querySelectorAll('[data-panel]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.panel;open(b.textContent,panels[k])}));
// ── 사진 남기기 ──
$('photo').addEventListener('click',async()=>{toast('사진을 만드는 중…');const scene=sea?sea.snapshot():null,rk=R.rank(st,hallMe);
 const c=await SH.make(scene,{nick:st.nick||'선장',title:rk.title,days:st.raised.days,grade:B.gradeLabel(grade),hall:hallMe,url:'dokdo-school-v2.vercel.app/dokdo-next/together/'});
 const r=await SH.save(c,'dokdo-together-'+R.kstDay()+'.png',(cv,longPress)=>{$('shot-img').src=cv.toDataURL('image/png');$('shot-help').textContent=longPress?'사진을 길게 눌러 저장한 뒤 인스타그램·틱톡에 올려 주세요.':'사진을 저장했습니다. 인스타그램·틱톡에 올려 주세요.';$('shot').hidden=false;$('shot-x').focus()});
 if(r==='shared')toast('사진을 보냈습니다')});
$('shot-x').addEventListener('click',()=>{$('shot').hidden=true});
// ── 캠핑장으로 ──
const campLink=()=>{$('camp').href=B.campUrl(st&&st.nick)};
// ── 처음 오는 사람: 닉네임과 나라 ──
const CCS=['KR','US','JP','CN','GB','CA','AU','DE','FR','VN','PH','TH','ID','IN','BR'];
function welcome(){const sel=$('w-cc');let dn=null;try{dn=new Intl.DisplayNames(['ko'],{type:'region'})}catch(e){}
 CCS.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=(dn?dn.of(c):c)+' ('+c+')';sel.append(o)});
 sel.value=CCS.includes(inc.cc)?inc.cc:'KR';$('w-nick').value=U.cleanNick(inc.nick);$('welcome').hidden=false;setTimeout(()=>$('w-nick').focus(),50);
 const go=()=>{const nick=U.cleanNick($('w-nick').value);if(!nick){toast('선장 이름을 적어 주세요');$('w-nick').focus();return}st=U.create(nick,sel.value);keep();$('welcome').hidden=true;B.buzz('big');start();toast('독도 앞바다에 내 배가 떴습니다! 태극기를 올려 보세요')};
 $('w-go').addEventListener('click',go);$('w-nick').addEventListener('keydown',e=>{if(e.key==='Enter')go()})}
function start(){campLink();refleet();paint();setInterval(paint,1000);
 store.fleet().then(f=>{samples=f;refleet()});
 B.hallOfFame().then(r=>{tops=r.tops||[];hallMe=B.inHall(tops,st.nick,grade);refleet();paint()})}
if(st){if(inc.nick&&!st.nick){st.nick=U.cleanNick(inc.nick);keep()}start()}else welcome();
// 2D만 보는 기기에서도 상태가 이어지도록, 다른 탭에서 바뀐 기록을 다시 읽는다(같은 기기의 두 탭).
addEventListener('storage',e=>{if(e.key===C.STORE_KEY){const s=store.load();if(s){st=s;refleet();paint()}}});
})();
