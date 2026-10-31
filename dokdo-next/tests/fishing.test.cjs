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

test('perfect needs at least 85% of the fight on target; golden time is the open window (to, from]',()=>{
 a.equal(F.isPerfect({total:0,onT:0}),false);a.equal(F.isPerfect({total:10,onT:8.5}),true);a.equal(F.isPerfect({total:10,onT:8.4}),false);
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

test('a fish is landed only at the surface; staying on target at depth keeps the fight going',()=>{
 const s=sp('hokdom'),startY=F.yOf(30),f=F.startFight(s,startY);
 // Keep the fish inside the green bar by fixing its target to the bar centre.
 let y=startY,result=null,steps=0;const rnd=()=>0.5;
 while(steps<2000){f.target=f.zone+f.zw/2;f.fish=f.target;const r=F.fightStep(f,s,y,false,1/60,rnd);y=r.hookY;steps++;if(r.outcome){result=r;break;}
  a.ok(y>2,'not landed before reaching the surface');}
 a.equal(result.outcome,'landed');a.equal(result.hookY,0);a.ok(steps>60,'reeling from 30m takes time');
 // A fish that is never on target breaks the line instead of landing.
 const g=F.startFight(s,startY);let r2,yy=startY;for(let i=0;i<5000;i++){g.fish=g.zone>.5?.02:.98;g.target=g.fish;r2=F.fightStep(g,s,yy,false,1/60,rnd);yy=r2.hookY;if(r2.outcome)break;}
 a.equal(r2.outcome,'snapped');a.ok(yy>2);
 // Off target, the fish pulls back down but never deeper than where it bit.
 a.ok(yy<=startY);
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
 a.equal(F.missionDone({k:'sp',id:'jari',n:3},run),true);a.equal(F.missionDone({k:'score',n:500},run),true);a.equal(F.missionDone({k:'combo',n:5},run),false);
 a.equal(F.missionDone({k:'kinds',n:5},run),false);a.equal(F.missionDone({k:'shrimp',n:1},run),true);a.equal(F.missionProgress({k:'kinds',n:5},run),2);
 a.equal(F.levelOf(0),0);a.equal(F.levelOf(299),0);a.equal(F.levelOf(300),1);a.equal(F.levelOf(10000),5);a.equal(F.levelOf(999999),5);
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
 a.equal(F.coachStep('fight',true,120,{onT:.2}),3);a.equal(F.coachStep('fight',true,60,{onT:1.5}),4);a.equal(F.coachStep('catch',false,0,null),0);a.equal(F.coachStep('over',false,0,null),0);
 for(const n of [1,2,3,4]){a.match(F.COACH[n][0],/^\d\/4 /);a.match(F.COACH[n][1],/^\d\/4 /);a.match(F.COACH[n][0],/[.다]$/);a.doesNotMatch(F.COACH[n][1],/[가-힣]/);}
 const src=fs.readFileSync(path.join(ROOT,'assets/fishing.js'),'utf8');a.match(src,/if\(coachOn\)\{coachOn=false;prog\.coachDone=true;\}/);
});
