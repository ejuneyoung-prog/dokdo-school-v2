'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const G=require('../assets/games-core.js'),P=require('../assets/garden-progress.js'),R=require('../assets/personal-records.js');
test('questions and running grow different decorations without changing scores or stored gifts',()=>{
 const s=G.fresh(),before=JSON.stringify(s);a.equal(P.plan(s,47).flowers,47);a.equal(P.plan(s,47).grass,0);a.equal(JSON.stringify(s),before);
 s.growth.runnerScore=840;s.growth.quizFlowers=3;const p=P.plan(s,2);a.equal(p.flowers,3);a.equal(p.grass,42);a.equal(p.next,'meadow');
});
test('both meadows fill before new collections and the final star needs earned Gangchi and stage 20',()=>{
 const s=G.fresh();s.xp=3000;s.growth.quizFlowers=99;s.growth.runnerScore=2000;s.growth.cleared=20;s.growth.seals=10;
 a.equal(P.plan(s).trees,0);s.growth.quizFlowers=100;let p=P.plan(s);a.equal(p.trees,10);a.equal(p.shrimp,10);a.equal(p.gulls,10);a.equal(p.seals,10);a.equal(p.complete,true);
 s.growth.cleared=9;p=P.plan(s);a.equal(p.seals,0);a.equal(p.complete,false);s.growth.cleared=19;p=P.plan(s);a.equal(p.complete,false);
 s.growth.cleared=20;s.growth.seals=9;a.equal(P.plan(s).complete,false);
});
test('garden counters survive private backup projection and cannot be rolled back over earned growth',()=>{
 const s=G.fresh();s.growth.quizFlowers=17;s.growth.runnerScore=1820;
 const snapshot={version:1,school:null,game:s};const projected=R.project(snapshot);a.equal(projected.game.growth.quizFlowers,17);a.equal(projected.game.growth.runnerScore,1820);const older=structuredClone(snapshot);older.game.growth.quizFlowers=16;a.throws(()=>R.protects(older,snapshot),/RECORD_CONFLICT/);older.game.growth.quizFlowers=17;older.game.growth.runnerScore=1800;a.throws(()=>R.protects(older,snapshot),/RECORD_CONFLICT/);
});
test('legacy flower quantities agree in the progress caption, card, accessible name and artwork',()=>{
 const s=G.fresh();s.xp=880;delete s.growth.gardenVersion;delete s.growth.gardenLegacy;G.validate(s);a.equal(P.plan(s).flowers,G.population({...s,equipped:['flag','flower']},'flower'));
 G.adoptLearning(s,37);if(!s.equipped.includes('flower'))G.equip(s,'flower');a.equal(G.population(s,'flower'),37);a.equal(P.plan(s).flowers,37);G.equip(s,'flower');a.equal(G.population(s,'flower'),0);a.equal(P.plan(s).flowers,37);
});
test('100 planting places stay on the two island silhouettes and the dog walks on Dongdo',()=>{
 const context={window:{DokdoGames:G,matchMedia:()=>({matches:false,addEventListener(){}})},document:{body:{classList:{contains:()=>false}},addEventListener(){}},MutationObserver:class{observe(){}},performance:{now:()=>0}};
 vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../assets/games-art.js'),'utf8'),context);
 const A=context.window.DokdoGameArt,points=A.meadowSites;a.equal(points.length,100);a.equal(new Set(points.map(p=>p.join(','))).size,100);
 a.equal(points.filter(([x])=>x<500).length,50);a.equal(points.filter(([x])=>x>600).length,50);a.ok(points.every(([x,y])=>y>100&&y<330&&(x<500||x>600)));
 const first=A.dogWalk(0),later=A.dogWalk(10);a.notEqual(first.x,later.x);for(let i=0;i<200;i++){const p=A.dogWalk(i);a.ok(p.x>=798&&p.x<=892&&p.y>=315&&p.y<=321);}
});
test('the real lesson bridge grows one first flower, without double counting the newly learned question',async()=>{
 const memory=new Map(),nodes={'play-entry-island':{},'play-entry-level':{}},events=[];
 const window={DokdoGames:G,DokdoGameArt:{island(){}},DokdoGarden:{learning:()=>1},addEventListener(){}};
 const context={window,document:{getElementById:id=>nodes[id],querySelector:()=>({content:'live'}),dispatchEvent:e=>events.push(e.type)},localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},navigator:{},Event:class{constructor(type){this.type=type;}}};
 vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../assets/games-entry.js'),'utf8'),context);
 a.equal(await window.DokdoPlayBridge.rewardLearning('first-flower'),true);let saved=JSON.parse(memory.get(G.KEY));a.equal(saved.growth.quizFlowers,1);a.ok(saved.equipped.includes('flower'));a.equal(saved.xp,5);
 a.equal(await window.DokdoPlayBridge.rewardLearning('first-flower'),false);saved=JSON.parse(memory.get(G.KEY));a.equal(saved.growth.quizFlowers,1);a.equal(saved.xp,5);a.equal(events.length,2);
});
test('picture export handles failure, never reads live storage in preview, and revokes its local URL',()=>{
 for(const success of[false,true]){const created=[],timers=[],clicked=[],urls=[],stored=[];
  const ctx={fillRect(){},fillText(){},drawImage(){}};
  const node=tag=>{const n={tag,append(...children){this.children=children;},after(){},getContext:()=>ctx,toBlob:cb=>cb(success?{fake:true}:null),click(){clicked.push(this.download);}};created.push(n);return n;};
  const rendered=[],target={after(){}},window={DokdoGames:G,DokdoGarden:{view:s=>P.plan(s,3),learning:()=>3},DokdoGameArt:{island(canvas,s){rendered.push(s);}},DokdoApp:{mode:'preview'},addEventListener(){}};
  const context={window,document:{documentElement:{lang:'en'},querySelector:()=>target,createElement:node,addEventListener(){}},localStorage:{getItem:k=>{stored.push(k);throw Error('must not read');}},URL:{createObjectURL(){urls.push('local');return'blob:local';},revokeObjectURL:x=>urls.push(x)},setTimeout:fn=>timers.push(fn)};
  vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../assets/garden-ui.js'),'utf8'),context);
  const button=created.find(n=>n.tag==='button');button.onclick();a.equal(button.disabled,false);a.equal(stored.length,0);a.equal(rendered.length,1);a.equal(rendered[0].growth.quizFlowers,3);a.ok(rendered[0].equipped.includes('flower'));
  if(success){a.deepEqual(clicked,['my-dokdo.png']);a.equal(timers.length,1);timers[0]();a.deepEqual(urls,['local','blob:local']);}else{a.equal(clicked.length,0);a.ok(created.some(n=>n.textContent?.includes('Could not save')));}
 }
});
