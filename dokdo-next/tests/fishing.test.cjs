'use strict';
// 독도 바다 낚시: 점수·바다 열림·수면 착지·저장·키 입력 규칙. 화면 없이 순수 함수만 시험한다.
const{test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const F=require('../assets/fishing.js');
const ROOT=path.resolve(__dirname,'..');
const sp=id=>F.SP.find(s=>s.id===id);
const dexOf=(...ids)=>Object.fromEntries(ids.map(id=>[id,1]));

test('combo multiplier starts at x1, adds 0.1 per catch in a row and caps at x2.0',()=>{
 a.equal(F.mult(0),1);a.equal(F.mult(1),1);a.equal(F.mult(2),1.1);a.equal(F.mult(5),1.4);
 a.ok(Math.abs(F.mult(11)-2)<1e-9);a.ok(Math.abs(F.mult(12)-2)<1e-9);a.ok(Math.abs(F.mult(99)-2)<1e-9);
});

test('size grades: 15% big x1.5, next 30% small x0.8, the rest regular x1',()=>{
 a.deepEqual(F.sizeFor(0),{key:'big',mult:1.5});a.deepEqual(F.sizeFor(.1499),{key:'big',mult:1.5});
 a.deepEqual(F.sizeFor(.15),{key:'small',mult:.8});a.deepEqual(F.sizeFor(.4499),{key:'small',mult:.8});
 a.deepEqual(F.sizeFor(.45),{key:'normal',mult:1});a.deepEqual(F.sizeFor(.999),{key:'normal',mult:1});
});

test('catch score: base x size, first find +50%, perfect +30%, then combo, then golden time x2',()=>{
 const normal={key:'normal',mult:1},big={key:'big',mult:1.5};
 a.equal(F.scoreCatch({pts:100,size:normal,first:false,perfect:false,combo:1,gold:false}).total,100);
 a.equal(F.scoreCatch({pts:100,size:big,first:false,perfect:false,combo:1,gold:false}).total,150);
 a.equal(F.scoreCatch({pts:100,size:normal,first:true,perfect:false,combo:1,gold:false}).total,150);
 a.equal(F.scoreCatch({pts:100,size:normal,first:false,perfect:true,combo:1,gold:false}).total,130);
 // (150 + 50 + 30) x 1.2 x 2 = 552
 const all=F.scoreCatch({pts:100,size:big,first:true,perfect:true,combo:3,gold:true});
 a.equal(all.total,552);a.deepEqual(all.lines.map(l=>l.id),['base','first','perfect','combo','gold']);
 a.deepEqual(all.lines.map(l=>l.v),[150,50,30,46,276]);
 // Combo bonus is capped with the multiplier.
 a.equal(F.scoreCatch({pts:10,size:normal,first:false,perfect:false,combo:30,gold:false}).total,20);
});

test('perfect means landed without a single miss; golden time is the open window (to, from]',()=>{
 a.equal(F.isPerfect({got:0,clean:true}),false);a.equal(F.isPerfect({got:3,clean:true}),true);a.equal(F.isPerfect({got:3,clean:false}),false);
 const g={from:100,to:80};a.equal(F.isGolden(g,100),true);a.equal(F.isGolden(g,90),true);a.equal(F.isGolden(g,80),false);a.equal(F.isGolden(g,100.1),false);a.equal(F.isGolden(null,90),false);
});

test('zones open in order: B after 3 shallow species, C after 3 kelp-forest species, D with the wrasse or 10 entries',()=>{
 a.equal(F.unlockReady('B',dexOf('jari','yongchi')),false);
 a.equal(F.unlockReady('B',dexOf('jari','yongchi','malj')),true);
 // Kelp-forest species do not count toward B.
 a.equal(F.unlockReady('B',dexOf('jari','daehwang','gamtae')),false);
 a.equal(F.unlockReady('C',dexOf('daehwang','gamtae')),false);
 a.equal(F.unlockReady('C',dexOf('daehwang','gamtae','sora')),true);
 a.equal(F.unlockReady('D',dexOf('hokdom')),true);
 a.equal(F.unlockReady('D',dexOf('jari','yongchi','malj','damchi','doldom','bengae','daehwang','gamtae','jeonbok')),false);
 a.equal(F.unlockReady('D',dexOf('jari','yongchi','malj','damchi','doldom','bengae','daehwang','gamtae','jeonbok','sora')),true);
 a.deepEqual(F.newlyUnlocked(['A'],dexOf('jari','yongchi','malj')),['B']);
 a.deepEqual(F.newlyUnlocked(['A','B'],dexOf('jari','yongchi','malj')),[]);
 a.equal(F.maxDepthFor(z=>z==='A'),10);a.equal(F.maxDepthFor(z=>['A','B'].includes(z)),20);a.equal(F.maxDepthFor(z=>z!=='D'),40);a.equal(F.maxDepthFor(()=>true),300);
});

test('timing fight: tapping inside the green pulls it up step by step and lands it only at the surface',()=>{
 const s=sp('hokdom'),startY=F.yOf(30),f=F.startFight(s,startY);const rnd=()=>0.3;
 a.equal(f.need,F.NEED[5]);a.equal(f.zw,F.BAR[5]);
 let y=startY,r=null,prev=y;
 for(let i=0;i<6000&&!(r&&r.outcome);i++){const tap=Math.abs(f.pos-f.zone)<=f.zw/2*.5&&f.flash<=0;r=F.fightStep(f,s,y,tap,1/60,rnd);a.ok(r.hookY<=prev+1e-9,'never deeper while hitting');prev=y=r.hookY;if(!r.outcome)a.ok(y>0);}
 a.equal(r.outcome,'landed');a.equal(r.hookY,0);a.equal(f.miss,0);a.ok(F.isPerfect(f));
 // 세 번 놓치면 줄이 끊어지고, 놓쳐도 물린 깊이보다 깊어지지 않는다.
 const g=F.startFight(s,startY);let yy=startY,r2=null;
 for(let i=0;i<6000&&!(r2&&r2.outcome);i++){const tap=Math.abs(g.pos-g.zone)>g.zw&&g.flash<=0;r2=F.fightStep(g,s,yy,tap,1/60,rnd);yy=r2.hookY;a.ok(yy<=startY+1e-9);}
 a.equal(r2.outcome,'snapped');a.equal(g.miss,F.LIVES);a.equal(g.got,0);a.equal(F.isPerfect(g),false);
});

test('each hit moves the green zone away from the ball and the ball speeds up as the catch tires',()=>{
 const s=sp('jari'),f=F.startFight(s,100);let seq=[.1,.9,.5];let k=0;const rnd=()=>seq[k++%3];
 f.pos=f.zone;const sp0=f.speed;const r=F.fightStep(f,s,100,true,0,rnd);a.equal(r.hit,true);a.equal(f.got,1);a.ok(Math.abs(f.zone-f.pos)>=.25-1e-9||f.zone<=f.zw/2+1e-9||f.zone>=1-f.zw/2-1e-9);
 const x0=f.pos;F.fightStep(f,s,100,false,.1,rnd);a.ok(Math.abs(f.pos-x0)>sp0*.1);
 a.ok(F.startFight(s,100,true).speed<F.startFight(s,100).speed,'first catches are slower');
});

test('depth mapping is monotonic and round-trips across the compressed ranges',()=>{
 for(const m of [0,5,10,25,40,80,150,220,300,400])a.ok(Math.abs(F.mOf(F.yOf(m))-m)<1e-9,String(m));
 a.ok(F.yOf(40)<F.yOf(41)&&F.yOf(150)<F.yOf(151));
});

function memory(init={}){const m=new Map(Object.entries(init)),log=[];return{log,m,getItem:k=>{log.push(['get',k]);return m.has(k)?m.get(k):null;},setItem:(k,v)=>{log.push(['set',k]);m.set(k,String(v));}};}
test('records use only dk-fish-* keys and survive a save/load round trip',()=>{
 const ls=memory(),store=F.createStore(ls);
 store.set(F.KEYS.dex,{jari:2});store.set(F.KEYS.hall,[{name:'A',score:300,kinds:2,date:'10/31'}]);store.set(F.KEYS.prog,{xp:450,unlocked:['A','B'],badges:{first:'2026-10-31'},mission:{}});store.set(F.KEYS.nick,'A');
 const s=F.loadSaved(F.createStore(ls));
 a.deepEqual(s.dex,{jari:2});a.equal(s.hall[0].score,300);a.equal(s.prog.xp,450);a.deepEqual(s.prog.unlocked,['A','B']);
 a.deepEqual(Object.values(F.KEYS).sort(),['dk-fish-dex','dk-fish-hall','dk-fish-nick','dk-fish-prog']);
 a.ok(ls.log.every(([,k])=>k.startsWith('dk-fish-')));
});

test('corrupt JSON, missing storage or a blocked browser fall back to fresh records',()=>{
 const ls=memory({'dk-fish-dex':'{oops','dk-fish-hall':'[1,','dk-fish-prog':'not json'}),s=F.loadSaved(F.createStore(ls));
 a.deepEqual(s.dex,{});a.deepEqual(s.hall,[]);a.deepEqual(s.prog,{xp:0,unlocked:['A'],badges:{},mission:{}});
 const blocked={getItem(){throw Error('SecurityError');},setItem(){throw Error('QuotaExceededError');}};
 const b=F.createStore(blocked);a.deepEqual(F.loadSaved(b).prog.unlocked,['A']);a.equal(b.set(F.KEYS.hall,[]),false);
 a.equal(F.createStore(null).get(F.KEYS.dex,'fallback'),'fallback');
 // Partial progress keeps stored values and fills the rest.
 a.deepEqual(F.loadSaved(F.createStore(memory({'dk-fish-prog':'{"xp":20}'}))).prog,{xp:20,unlocked:['A'],badges:{},mission:{}});
});

test('catch card: a held Space (key repeat) is ignored; a fresh Space or Enter closes it',()=>{
 a.deepEqual(F.keyAction('catch',' ',true,false),{prevent:true,act:null});
 a.deepEqual(F.keyAction('catch','Enter',true,false),{prevent:true,act:null});
 a.deepEqual(F.keyAction('catch',' ',false,false),{prevent:true,act:'close'});
 a.deepEqual(F.keyAction('catch','Enter',false,false),{prevent:true,act:'close'});
 a.deepEqual(F.keyAction('play',' ',true,false),{prevent:true,act:null});
 a.deepEqual(F.keyAction('play',' ',false,false),{prevent:true,act:'press'});
 a.deepEqual(F.keyAction('fight','ArrowDown',false,false),{prevent:true,act:'press'});
 a.deepEqual(F.keyAction('play','ArrowUp',true,false),{prevent:true,act:'up'});
 a.deepEqual(F.keyAction('over',' ',false,false),{prevent:false,act:null});
 a.deepEqual(F.keyAction('idle',' ',false,false),{prevent:false,act:null});
 // Typing a hall-of-fame name never triggers the game.
 a.deepEqual(F.keyAction('catch',' ',false,true),{prevent:false,act:null});
});

test('daily missions and levels are deterministic and complete only on this round',()=>{
 a.equal(F.todayMission(new Date(2026,9,31)),F.todayMission(new Date(2026,9,31,23,59)));
 a.ok(F.MISSIONS.includes(F.todayMission(new Date(2026,0,1))));
 const run={runCount:{jari:3,mullung:1},score:520,bestCombo:4,caughtRun:['jari','jari','jari','mullung']};
 a.equal(F.missionDone({k:'sp',id:'jari',n:3},run),true);a.equal(F.missionDone({k:'score',n:400},run),true);a.equal(F.missionDone({k:'combo',n:5},run),false);
 a.equal(F.missionDone({k:'kinds',n:5},run),false);a.equal(F.missionDone({k:'shrimp',n:1},run),true);a.equal(F.missionProgress({k:'kinds',n:5},run),2);
 a.equal(F.levelOf(0),0);a.equal(F.levelOf(149),0);a.equal(F.levelOf(150),1);a.equal(F.levelOf(5000),5);a.equal(F.levelOf(999999),5);
});

test('17 fact-checked species, 8 sources, every source reference resolves; analytics allows exactly these ids',()=>{
 a.equal(F.SP.length,17);a.equal(F.SRC.length,8);a.equal(new Set(F.SP.map(s=>s.id)).size,17);
 for(const s of F.SP){a.ok(s.src.length>0);for(const i of s.src)a.ok(F.SRC[i-1],s.id+' source '+i);a.ok(F.ZONES.some(z=>z.id===s.zone));}
 const analytics=fs.readFileSync(path.join(ROOT,'assets/analytics.js'),'utf8'),list=analytics.match(/species:\[([^\]]*)\]/)[1].match(/'([^']+)'/g).map(x=>x.slice(1,-1));
 a.deepEqual(list,F.SP.map(s=>s.id));
});

test('fishing page and code never touch the playground save, tickets or island XP',()=>{
 const src=fs.readFileSync(path.join(ROOT,'assets/fishing.js'),'utf8').replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,''),page=fs.readFileSync(path.join(ROOT,'fishing.html'),'utf8');
 a.doesNotMatch(src,/DokdoGames|G\.KEY|dokdo-games|ticket|earnTicket|adopt(?:Learning|Game)/);
 a.doesNotMatch(page,/games-core\.js|garden-progress\.js|games\.js"|account-entry\.js/);
 for(const m of src.matchAll(/(?:getItem|setItem)\(([^)]*)\)/g))a.match(m[1],/^k|^KEYS\.|^key|^\w+$/);
 a.doesNotMatch(page,/<script>|\son[a-z]+=/i);a.match(page,/name="dokdo-mode" content="live"/);
 a.ok(page.indexOf('assets/site-config.js')<page.indexOf('assets/analytics.js')&&page.indexOf('assets/analytics.js')<page.indexOf('assets/fishing.js'));
 a.doesNotMatch(page+src,/__GMARKET__|fonts\.googleapis|base64/);
});

test('playground card and home entry are plain links to fishing.html, not ticket launches',()=>{
 const games=fs.readFileSync(path.join(ROOT,'assets/games.js'),'utf8'),home=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
 a.match(games,/<a class="primary" href="\.\/fishing\.html" id="fishing-card-link">/);a.doesNotMatch(games,/data-launch="fishing"/);
 a.match(home,/<a href="\.\/fishing\.html" id="play-entry-fishing">독도 바다 낚시/);
});

test('canvas logical width follows the box (360~900) so phones are not shrunk to 0.38x',()=>{
 a.deepEqual(F.fitSize(340),{W:360,H:450});a.deepEqual(F.fitSize(390),{W:390,H:488});
 a.deepEqual(F.fitSize(730),{W:730,H:560});a.deepEqual(F.fitSize(1200),{W:900,H:560});a.deepEqual(F.fitSize(0),{W:900,H:560});
 // On a 340px phone box the scene is drawn at about 0.94x instead of 900px squeezed to 0.38x.
 a.ok(340/F.fitSize(340).W>2*(340/900));
 a.equal(F.pixelRatio(3),2);a.equal(F.pixelRatio(2),2);a.equal(F.pixelRatio(1.5),1.5);a.equal(F.pixelRatio(undefined),1);a.equal(F.pixelRatio(0.5),1);
});

test('first-round guide appears once: only for a new player, steps 1→4 in order, and never after the first catch',()=>{
 const fresh=F.loadSaved(F.createStore(memory()));a.equal(F.needsCoach(fresh.prog,fresh.dex),true);
 // An older save without the new field but with catches does not see the guide again.
 const old=F.loadSaved(F.createStore(memory({'dk-fish-dex':'{"jari":1}','dk-fish-prog':'{"xp":30,"unlocked":["A"],"badges":{},"mission":{}}'})));
 a.equal(old.prog.coachDone,undefined);a.equal(F.needsCoach(old.prog,old.dex),false);
 const done={...fresh.prog,coachDone:true};a.equal(F.needsCoach(done,{}),false);
 // The new field round-trips without changing the other saved fields.
 const ls=memory(),st=F.createStore(ls);st.set(F.KEYS.prog,done);const back=F.loadSaved(F.createStore(ls)).prog;a.equal(back.coachDone,true);a.deepEqual(back.unlocked,['A']);
 a.equal(F.coachStep('play',false,0,null),1);a.equal(F.coachStep('play',true,120,null),1);a.equal(F.coachStep('play',false,120,null),2);a.equal(F.coachStep('bite',false,120,null),2);
 a.equal(F.coachStep('fight',true,120,{got:0}),3);a.equal(F.coachStep('fight',true,60,{got:1}),4);a.equal(F.coachStep('catch',false,0,null),0);a.equal(F.coachStep('over',false,0,null),0);
 for(const n of [1,2,3,4]){a.match(F.COACH[n][0],/^\d\/4 /);a.match(F.COACH[n][1],/^\d\/4 /);a.match(F.COACH[n][0],/[.다]$/);a.doesNotMatch(F.COACH[n][1],/[가-힣]/);}
 const src=fs.readFileSync(path.join(ROOT,'assets/fishing.js'),'utf8');a.match(src,/if\(coachOn\)\{coachOn=false;prog\.coachDone=true;\}/);
});

test('the test-mode button is for operators: hidden unless the address has ?operator=1',()=>{
 const F=require('../assets/fishing.js'),page=fs.readFileSync(path.join(__dirname,'../fishing.html'),'utf8');
 a.match(page,/id="test"[^>]*\bhidden\b/);
 a.equal(F.operatorView(''),false);a.equal(F.operatorView('?operator=0'),false);a.equal(F.operatorView('?x=1'),false);a.equal(F.operatorView('?operator=1'),true);
 a.ok(!page.includes('시험판'));a.ok(!page.includes('Trial version'));
});

test('one big button: no separate raise button, a four-tile guide, and the sea picture works as the button',()=>{
 const page=fs.readFileSync(path.join(ROOT,'fishing.html'),'utf8'),src=fs.readFileSync(path.join(ROOT,'assets/fishing.js'),'utf8'),css=fs.readFileSync(path.join(ROOT,'assets/fishing.css'),'utf8');
 a.doesNotMatch(page,/id="b-up"/);a.doesNotMatch(src,/\$\('b-up'\)/);
 a.equal((page.match(/<ol class="f-guide"[\s\S]*?<\/ol>/)[0].match(/<li>/g)||[]).length,4);
 a.match(src,/sea\.addEventListener\('pointerdown',e=>\{if\(!live\(\)\)return;e\.preventDefault\(\);actx\(\);press\(true\);\}\)/);
 // 휴대폰에서는 낚시하는 동안에만 단추를 화면 아래에 붙인다(시작 카드의 출항 단추를 가리지 않게).
 a.match(css,/\.f-stage\.is-live \.f-controls\{position:sticky;/);
 a.match(src,/classList\.add\('is-live'\)/);a.match(src,/classList\.remove\('is-live'\)/);
 a.match(page,/id="save-btn"[^>]*>명예의 전당에 남기기</);
});

test('difficulty: stars 1~5 from fight, points double per star, kelp and mussels are the cheapest',()=>{
 for(const s of F.SP){const n=F.starsOf(s);a.ok(n>=1&&n<=5,s.id);a.equal(s.pts,F.STAR_PTS[n],s.id+' points follow stars');}
 a.deepEqual(F.STAR_PTS,[0,10,20,40,80,160]);
 for(const id of ['daehwang','gamtae','damchi'])a.equal(F.starsOf(sp(id)),1,id);
 for(const id of ['hokdom','dohwa_s','gasibae'])a.equal(F.starsOf(sp(id)),5,id);
 // 더 센 생물이 더 싼 일은 없다.
 const by=[...F.SP].sort((x,y)=>x.fight-y.fight);for(let i=1;i<by.length;i++)a.ok(by[i].pts>=by[i-1].pts,by[i].id);
});

test('bait: most passers ignore the hook; checked over 100,000 simulated passes',()=>{
 let seed=7;const rnd=()=>{seed=(seed+0x6D2B79F5)|0;let x=Math.imul(seed^(seed>>>15),1|seed);x=(x+Math.imul(x^(x>>>7),61|x))^x;return((x^(x>>>14))>>>0)/4294967296;};
 const N=100000,rate=s=>{let w=0,nibMin=9,nibMax=0,ignMin=9;for(let i=0;i<N;i++){const r=F.approach(s,rnd);if(r.want){w++;nibMin=Math.min(nibMin,r.nibble);nibMax=Math.max(nibMax,r.nibble);}else ignMin=Math.min(ignMin,r.ignore);}return{p:w/N,nibMin,nibMax,ignMin};};
 const kelp=rate(sp('daehwang')),jari=rate(sp('jari')),hok=rate(sp('hokdom'));
 a.ok(Math.abs(kelp.p-.2)<.01,'kelp '+kelp.p);a.ok(Math.abs(jari.p-.45)<.01,'jari '+jari.p);a.ok(Math.abs(hok.p-.25)<.01,'hokdom '+hok.p);
 for(const s of F.SP)a.ok(F.baitChance(s)<.5,s.id+' more than half pass by');
 // 톡톡 건드리는 시간은 0.7~2초, 관심 없는 녀석은 3초 넘게 다시 오지 않는다.
 a.ok(jari.nibMin>=.7&&jari.nibMax<=2);a.ok(jari.ignMin>=3);
 // 기대 점수(문 확률 x 점수)는 별이 많을수록 크다: 어려운 것을 노릴 이유가 있다.
 const ev=n=>F.baitChance(F.SP.find(s=>F.starsOf(s)===n))*F.STAR_PTS[n];for(let n=2;n<=5;n++)a.ok(ev(n)>ev(n-1),'star '+n);
});

test('the green bar narrows as the creature gets pricier',()=>{
 a.deepEqual(F.BAR,[0,.26,.22,.18,.15,.12]);a.deepEqual(F.SPEED,[0,.55,.7,.85,1.05,1.3]);a.deepEqual(F.NEED,[0,2,3,3,4,5]);
 for(let n=2;n<=5;n++)a.ok(F.SPEED[n]>F.SPEED[n-1]&&F.NEED[n]>=F.NEED[n-1]);
 for(let n=2;n<=5;n++)a.ok(F.BAR[n]<F.BAR[n-1]);
 a.equal(F.startFight(sp('daehwang'),100).zw,.26);a.equal(F.startFight(sp('dohwa_s'),100).zw,.12);
});

test('flow ladder: a child lands easy creatures almost always and the priciest only with practice',()=>{
 let seed=11;const rnd=()=>{seed=(seed+0x6D2B79F5)|0;let x=Math.imul(seed^(seed>>>15),1|seed);x=(x+Math.imul(x^(x>>>7),61|x))^x;return((x^(x>>>14))>>>0)/4294967296;};
 const gauss=()=>{let u=0;for(let i=0;i<6;i++)u+=rnd();return u-3;};
 // 공이 초록 칸 한가운데 오는 순간을 노려 누르는데, 누르는 때가 sigma초만큼 들쭉날쭉한 사람.
 const play=(s,sigma)=>{const f=F.startFight(s,200);let y=200,plan=null;for(let i=0;i<60*120;i++){const dt=1/60;
  if(plan===null){const sp=f.speed*(1+.12*f.got),d=f.dir>0?(f.zone>=f.pos?f.zone-f.pos:(1-f.pos)+(1-f.zone)):(f.zone<=f.pos?f.pos-f.zone:f.pos+f.zone);plan=d/sp+gauss()*sigma;if(plan<0)plan=0;}
  plan-=dt;const tap=plan<=0;if(tap)plan=null;const r=F.fightStep(f,s,y,tap,dt,rnd);y=r.hookY;if(r.outcome)return r.outcome==='landed';}return false;};
 const rate=(n,sig)=>{const ss=F.SP.filter(s=>F.starsOf(s)===n);let ok=0,N=0;for(const s of ss)for(let k=0;k<150;k++){N++;if(play(s,sig))ok++;}return ok/N;};
 const kid=[0,1,2,3,4,5].map(n=>n?rate(n,.12):1),good=[0,1,2,3,4,5].map(n=>n?rate(n,.05):1);
 a.ok(kid[1]>=.95&&kid[2]>=.85,'child, easy ones: '+kid.join());
 for(let n=2;n<=5;n++){a.ok(kid[n]<=kid[n-1]+.03,'child never easier with more stars: '+kid.join());a.ok(good[n]>=kid[n]-.03,'practice helps: '+good.join());}
 a.ok(kid[5]<=.35,'priciest is hard for a beginner: '+kid[5]);a.ok(good[5]>=.5,'and reachable with practice: '+good[5]);
});

test('a landed creature swims again, and seaweed or shells bite without a nibble',()=>{
 const src=fs.readFileSync(path.join(ROOT,'assets/fishing.js'),'utf8');
 const i0=src.indexOf('function landed('),landed=src.slice(i0,src.indexOf('\nfunction ',i0+10));
 a.match(landed,/c\.hold=false;/,'catching releases the hold so the creature swims again');
 a.match(src,/function end\(\)\{st='over';coachOn=false;nib=null;/);
 const rnd=()=>0;a.equal(F.approach(sp('daehwang'),rnd).nibble,0);a.equal(F.approach(sp('jeonbok'),rnd).nibble,0);a.ok(F.approach(sp('jari'),rnd).nibble>=.7);
 a.doesNotMatch(src,/tr\('톡톡'/,'the nibble mark is not called 톡톡 (that word means press)');
});

test('after the scoring change the level ladder and score goals only got lower, so nobody is demoted',()=>{
 a.deepEqual(F.LEVELS.map(l=>l[0]),[0,150,500,1250,2500,5000]);
 const old=[0,300,1000,2500,5000,10000];for(const xp of [0,299,300,999,1000,4999,5000,12000])a.ok(F.levelOf(xp)>=old.filter(v=>xp>=v).length-1,String(xp));
 a.ok(F.MISSIONS.some(m=>m.k==='score'&&m.n===400));a.ok(F.BADGES.some(b=>b[0]==='score1000'&&b[1]==='한 판 600점'));
});

test('after a hit the new green zone is always at least .25 away from the ball, so no free second hit',()=>{
 let seed=3;const rnd=()=>{seed=(seed+0x6D2B79F5)|0;let x=Math.imul(seed^(seed>>>15),1|seed);x=(x+Math.imul(x^(x>>>7),61|x))^x;return((x^(x>>>14))>>>0)/4294967296;};
 for(const id of ['daehwang','jari','malj','bangeo','dohwa_s'])for(let i=0;i<3000;i++){const s=sp(id),f=F.startFight(s,100);f.pos=f.zw/2+rnd()*(1-f.zw);f.zone=f.pos;
  const r=F.fightStep(f,s,100,true,0,rnd);a.equal(r.hit,true);a.ok(Math.abs(f.zone-f.pos)>=.25-1e-9,id+' '+f.pos+' '+f.zone);a.ok(f.zone>=f.zw/2-1e-9&&f.zone<=1-f.zw/2+1e-9);}
});

test('losing the bait reels the line back up for new bait, and a short pause stops a held tap from skipping the catch card',()=>{
 const src=fs.readFileSync(path.join(ROOT,'assets/fishing.js'),'utf8');
 a.equal((src.match(/lockUntil=t\+\.5;autoUp=true;holdMain=false;/g)||[]).length,3,'snapped, escaped and too-early all reel up');
 a.match(src,/if\(holdUp\|\|autoUp\)hookY=Math\.max\(0,hookY-sp\*1\.6\*dt\);/);
 a.match(src,/const press=\(v\)=>\{if\(v&&t<lockUntil\)return;/);a.match(src,/if\(k\.act==='close'\)\{if\(t<lockUntil\)return;/);
 const page=fs.readFileSync(path.join(ROOT,'fishing.html'),'utf8');a.match(page,/<div class="f-controls">\s*<p class="f-coach" id="coach"/,'guide line sticks with the button');
});

test('bait: 10 a day, 2 more for each quiz question answered correctly today, and the school save is only read',()=>{
 const day='2026-11-07',school={m:{a:{courseRewardDay:day},b:{courseRewardDay:day},c:{courseRewardDay:'2026-11-06'},d:null}};
 a.equal(F.kstDay(Date.UTC(2026,10,6,15,0,0)),'2026-11-07','Korean midnight starts the new day');
 a.equal(F.quizToday(school,day),2);a.equal(F.quizToday(null,day),0);a.equal(F.quizToday({m:'x'},day),0);
 const prog={};a.equal(F.baitLeft(prog,0,day),10);for(let i=0;i<10;i++)F.useBait(prog,day);a.equal(F.baitLeft(prog,0,day),0);
 a.equal(F.baitLeft(prog,2,day),4,'two right answers give four more');
 a.equal(F.baitLeft(prog,0,'2026-11-08'),10,'a new day starts fresh');F.useBait(prog,'2026-11-08');a.deepEqual(prog.bait,{day:'2026-11-08',used:1});
 const src=fs.readFileSync(path.join(ROOT,'assets/fishing.js'),'utf8');
 a.match(src,/SCHOOL_KEY='dokdo-korea-school-cinematic-v1'/);a.doesNotMatch(src,/store\.set\(SCHOOL_KEY/,'never writes the school save');
 a.match(src,/function start\(\)\{actx\(\);if\(baitNow\(\)<=0\)/);
 const page=fs.readFileSync(path.join(ROOT,'fishing.html'),'utf8');a.match(page,/id="nobait"[^>]*hidden/);a.match(page,/href="\.\/\?area=learn" id="nobait-go"/);
});

test('closing the no-bait card always leaves a card to press (no dead screen after Play again)',()=>{
 const src=fs.readFileSync(path.join(ROOT,'assets/fishing.js'),'utf8');
 a.match(src,/\$\('nobait-close'\)\.onclick=\(\)=>\{\$\('nobait'\)\.hidden=true;if\(\$\('end'\)\.hidden\)\$\('start'\)\.hidden=false;\};/);
 // 지나가기만 하는 생물로는 판이 끝나지 않는다: 관심을 보인 뒤에만 미끼를 확인한다.
 a.ok(src.indexOf('const a=approach(c.s);if(!a.want)')<src.indexOf('if(baitNow()<=0){noBait();break;}'));
});
