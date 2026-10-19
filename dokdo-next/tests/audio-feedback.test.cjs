'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=name=>fs.readFileSync(require('node:path').join(__dirname,'../assets',name),'utf8');
function part(src,start,end){const x=src.indexOf(start),y=src.indexOf(end,x);a.ok(x>=0&&y>x);return src.slice(x,y);}
class Media{
 constructor(){this.paused=true;this.muted=false;this.currentTime=0;this.handlers={};this.pending=[];this.loads=0;}
 set src(v){this.path=v;this.loads++;this.currentTime=0;}
 getAttribute(k){return k==='src'?this.path:null;}
 addEventListener(k,fn){this.handlers[k]=fn;}
 play(){this.paused=false;this.handlers.play?.();return new Promise((resolve,reject)=>this.pending.push({resolve:()=>{this.paused=false;this.handlers.play?.();resolve();},reject}));}
 pause(){this.paused=true;this.pauses=(this.pauses||0)+1;}
}
function musicFixture(game=false){
 const nodes={},text=()=>{},c=vm.createContext({window:{DOKDO_SITE_CONFIG:{music:[{f:'one.mp3',t:'one'},{f:'two.mp3',t:'two'},{f:'three.mp3',t:'three'}]}},Audio:Media,Math,toast(){},tr:k=>k,text,txt:text,$:id=>nodes[id]||(nodes[id]={setAttribute(){},removeAttribute(){}}),ensureEffects(){},effectsOn:false});
 vm.runInContext(game?'let sound=false,audio=null,bgm=null,trackIndex=0,musicToken=0;'+part(source('games.js'),'const tracks=','$(\'game-effects\').onclick'):"let soundOn=false,audioToken=0,audio=null;"+part(source('app.js'),'const musicList=','let exporting=false;'),c);
 return {c,nodes,run:code=>vm.runInContext(code,c),play:()=>vm.runInContext(game?'playMusic()':'toggleSound()',c),get media(){return vm.runInContext(game?'bgm':'audio',c);},stop:()=>vm.runInContext(game?'stopMusic()':'stopSound()',c),get on(){return vm.runInContext(game?'sound':'soundOn',c);},next:()=>vm.runInContext(game?'trackIndex=(trackIndex+1)%tracks.length;playMusic()':'musicSkip(1)',c)};
}
for(const game of [false,true]){
 const name=game?'game':'learning';
 test(name+': an old AbortError cannot pause the newer Next/Next request',async()=>{
  const f=musicFixture(game),first=f.play(),m=f.media,second=f.next(),third=f.next();m.pending[2].resolve();await third;const pauses=m.pauses||0;m.pending[0].reject({name:'AbortError'});m.pending[1].reject({name:'AbortError'});await Promise.all([first,second]);a.equal(f.on,true);a.equal(m.paused,false);a.equal(m.pauses||0,pauses);
 });
 test(name+': pending play cannot revive sound after close, including a late play event',async()=>{
  const f=musicFixture(game),first=f.play(),m=f.media;f.stop();m.pending[0].resolve();await first;a.equal(f.on,false);a.equal(m.paused,true);a.equal(m.muted,true);
 });
 test(name+': On/Off/On ignores completion of the abandoned request',async()=>{
  const f=musicFixture(game),first=f.play(),m=f.media;f.stop();const second=f.play();m.pending[1].resolve();await second;const pauses=m.pauses||0;m.pending[0].reject({name:'AbortError'});await first;a.equal(f.on,true);a.equal(m.paused,false);a.equal(m.pauses||0,pauses);
 });
 test(name+': current autoplay rejection reports sound off and permits a retry',async()=>{
  const f=musicFixture(game),first=f.play();f.media.pending[0].reject({name:'NotAllowedError'});await first;a.equal(f.on,false);const retry=f.play();f.media.pending[1].resolve();await retry;a.equal(f.on,true);
 });
}
test('game: same-track resume preserves its source and playhead; ended while off stays off',async()=>{
 const f=musicFixture(true),p=f.play(),m=f.media;m.pending[0].resolve();await p;m.currentTime=42;f.stop();const loads=m.loads,q=f.play();m.pending[1].resolve();await q;a.equal(m.loads,loads);a.equal(m.currentTime,42);f.stop();m.handlers.ended();a.equal(f.on,false);a.equal(m.loads,loads);
});
test('effect voices are capped, disconnected after completion, and independent of BGM',()=>{
 const ended=[],c=vm.createContext({effectsOn:true,effectVoices:0,effectNodes:new Set(),audio:{state:'running',currentTime:0,destination:{},createOscillator(){const o={frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){o.disconnected=true;},start(){},stop(){ended.push(o);}};return o;},createGain(){return{gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}},window:{}});
 vm.runInContext(part(source('games.js'),'function ensureEffects()','const feedback='),c);for(let i=0;i<30;i++)c.tone();a.equal(ended.length,12);for(const o of ended){o.onended();a.equal(o.disconnected,true);}a.equal(c.effectVoices,0);c.effectsOn=false;c.tone();a.equal(ended.length,12);
});
const G=require('../assets/games-core.js');
function dropFixture(hammer=false,legacy=true){
 const cells=Array.from({length:64},()=>({classList:{add(){}},icons:[],append(x){this.icons.push(x);}})),events=[],game=G.newBlocks();if(legacy){game.missionVersion=1;game.board=Array.from({length:8},()=>Array(8).fill(0));for(let x=0;x<6;x++)game.board[7][x]=1+x%3;game.pieces=[1,5,6];}if(hammer){game.net=[0,7];game.hammers=1;}
 const c=vm.createContext({G,A:{trashIcon(){}},game,placing:false,paused:false,blocked:false,kind:'blocks',active:{id:'fixture'},hammerMode:hammer,selected:0,ghost:null,highlight:null,frame:0,record:{growth:{seals:0}},document:{createElement:()=>({setAttribute(){},remove(){}})},cells:()=>cells,saveRun:async()=>{},renderBlocks(){},setTimeout(){},cancelAnimationFrame(){},chime(){events.push('chime');},tone(){events.push('tone');},text(){},feedback:{burst(...args){events.push(args[1]);}},$:()=>({focus(){}}),toast:m=>events.push(m),endRun:async()=>{},fail:e=>{throw e;}});
 vm.runInContext(part(source('games.js'),'async function drop(',"$('block-hammer').onclick"),c);return{c,cells,events};
}
test('a saved legacy puzzle completion retains eight outgoing litter icons and a success burst',async()=>{const f=dropFixture();await f.c.drop(6,7);a.equal(f.c.game.phase,'mission-clear');a.equal(f.cells.reduce((n,c)=>n+c.icons.length,0),8);a.ok(f.events.includes('success'));a.ok(f.events.includes('chime'));});
test('hammer rescue animates its target and reports rescue without changing award rules',async()=>{const f=dropFixture(true);await f.c.drop(0,7);a.equal(f.c.game.rescued,1);a.equal(f.c.game.hammers,1);a.equal(f.cells[56].icons.length,1);a.ok(f.events.some(x=>typeof x==='string'&&x.includes('구조 성공')));});
test('runner collision, star and pass deliver distinct feedback from real step events',()=>{
 for(const type of ['hit','star','pass']){
  const game=G.newRunner();game.spawn=99;if(type==='hit')game.objects=[{kind:'guard',x:130,w:34,h:70,passed:false}];if(type==='star')game.stars=[{x:126,y:264,got:false}];if(type==='pass')game.objects=[{kind:'flower',x:50,w:34,h:36,passed:false}];
  const events=[],c=vm.createContext({G,A:{runner(){}},game,paused:false,active:{id:'fixture'},kind:'runner',lastFrame:1,dirtyRunner:false,lastSaved:0,frame:0,$:()=>({width:900}),stageLabel(){},scorebar(){},tone(){},runnerFeedback:k=>events.push(k),text(){},clearRound:async()=>{},endRun:async()=>{},saveRun:async()=>{},fail:e=>{throw e;},requestAnimationFrame:()=>1});vm.runInContext(part(source('games.js'),'function runFrame(','let jumpHeld=false;'),c);c.runFrame(17);a.ok(events.includes(type),type);
 }
});
test('runner round clear has a dedicated celebration and commits the same run',async()=>{
 const game=G.newRunner();game.round=2;const events=[],c=vm.createContext({game,paused:false,jumpHeld:true,frame:1,runnerFeedback:k=>events.push(k),chime:()=>events.push('chime'),cancelAnimationFrame(){},saveRun:async()=>events.push('save'),track(){},roundCover(){},stageLabel(){},text(){}});vm.runInContext(part(source('games.js'),'async function clearRound()','function runFrame('),c);await c.clearRound();a.deepEqual(events,['success','chime','save']);a.equal(c.paused,true);
});
test('checkpoints avoid rebuilding the hidden hub during active play',async()=>{
 const events=[],c=vm.createContext({active:{id:'fixture'},game:G.newRunner(),G,dirtyRunner:true,record:{},kind:'runner',drawHub:()=>events.push('paint'),$:()=>({open:true}),tx:async()=>({ok:true,opened:[]}),toast(){}});vm.runInContext(part(source('games.js'),'async function saveRun(','async function launch('),c);a.equal(await c.saveRun(),true);a.deepEqual(events,[]);a.equal(c.dirtyRunner,false);await c.saveRun(true);a.deepEqual(events,['paint']);
});
for(const game of [false,true])test((game?'game':'learning')+': an old successful play cannot pause a newer playing track',async()=>{const f=musicFixture(game),first=f.play(),m=f.media,second=f.next();m.pending[1].resolve();await second;const pauses=m.pauses||0;m.pending[0].resolve();await first;a.equal(f.media,m);a.equal(f.on,true);a.equal(m.paused,false);a.equal(m.pauses||0,pauses);});

test('a failing or duplicate-ended effect releases its slot and cannot exhaust future effects',()=>{
 let broken=true,created=0;const oscillators=[],context=vm.createContext({effectsOn:true,effectVoices:0,effectNodes:new Set(),window:{},audio:{state:'running',currentTime:0,destination:{},createOscillator(){created++;const o={frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){o.disconnected=true;},start(){if(broken)throw Error('local audio start failed');},stop(){}};oscillators.push(o);return o;},createGain(){return{gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}}});
 vm.runInContext(part(source('games.js'),'function ensureEffects()','const feedback='),context);for(let i=0;i<20;i++)context.tone();a.equal(context.effectVoices,0);a.equal(context.effectNodes.size,0);a.equal(created,20);broken=false;context.tone();a.equal(context.effectVoices,1);const o=oscillators.at(-1);o.onended();o.onended();a.equal(context.effectVoices,0);a.equal(context.effectNodes.size,0);a.equal(o.disconnected,true);
});
test('collecting two runner stars in one frame reports both without changing the score engine',()=>{
 const game=G.newRunner();game.spawn=99;game.stars=[{x:126,y:264,got:false},{x:150,y:264,got:false}];const reactions=[],context=vm.createContext({G,A:{runner(){}},game,paused:false,active:{},kind:'runner',lastFrame:1,dirtyRunner:false,lastSaved:0,frame:0,$:()=>({width:900}),stageLabel(){},scorebar(){},tone(){},runnerFeedback:(...args)=>reactions.push(args),text(){},clearRound:async()=>{},endRun:async()=>{},saveRun:async()=>{},fail:e=>{throw e;},requestAnimationFrame:()=>1});vm.runInContext(part(source('games.js'),'function runFrame(','let jumpHeld=false;'),context);context.runFrame(17);a.equal(game.collected,2);a.equal(reactions[0][0],'star');a.equal(reactions[0][1],'별 +2');
});
function visualFixture({osReduced=false,appReduced=false,lang='ko'}={}){
 class Element{constructor(){this.children=[];this.events={};this.style={setProperty(){}};}append(node){node.remove();node.parentElement=this;this.children.push(node);}remove(){if(this.parentElement){const i=this.parentElement.children.indexOf(this);if(i>=0)this.parentElement.children.splice(i,1);this.parentElement=null;}}get isConnected(){return this.root||!!this.parentElement?.isConnected;}get firstElementChild(){return this.children[0];}setAttribute(){}addEventListener(name,fn){this.events[name]=fn;}}
 const host=new Element();host.root=true;const timers=new Map(),events={};let timerId=0;const context=vm.createContext({window:{matchMedia:()=>({matches:osReduced}),addEventListener:(name,fn)=>events[name]=fn},document:{documentElement:{lang},body:{classList:{contains:()=>appReduced}},createElement:()=>new Element()},setTimeout:fn=>(timers.set(++timerId,fn),timerId),clearTimeout:id=>timers.delete(id)});vm.runInContext(source('game-feedback.js'),context);return{api:context.window.DokdoGameFeedback,host,timers,events};
}
test('feedback caps nodes and timers, uses text, and clears on page exit',()=>{
 const f=visualFixture();for(let i=0;i<30;i++)f.api.burst(f.host,'star','<img src=private>');const layer=f.host.children[0];a.equal(layer.children.length,48);a.equal(f.timers.size,48);a.ok(layer.children.some(node=>node.textContent==='<img src=private>'));f.events.pagehide();a.equal(f.host.children.length,0);a.equal(f.timers.size,0);
});
test('OS and in-app reduced motion each retain one translated message without particles',()=>{
 for(const options of [{osReduced:true,lang:'en'},{appReduced:true,lang:'en'}]){const f=visualFixture(options);f.api.burst(f.host,'star','별 +2');const layer=f.host.children[0];a.equal(layer.children.length,1);a.equal(layer.children[0].textContent,'Star +2');const done=layer.children[0].events.animationend;done();done();a.equal(f.host.children.length,0);a.equal(f.timers.size,0);}
});
test('the habitat is painted behind all 64 cells without changing board data',()=>{
 const game=G.newBlocks(),before=JSON.stringify(game),calls=[];function element(tag){return{tag,dataset:{},style:{},children:[],classList:{add(){}},setAttribute(name,value){this[name]=value;},append(node){this.children.push(node);},replaceChildren(){this.children=[];}};}const board=element('board'),context=vm.createContext({G,game,document:{activeElement:null,createElement:element},$:()=>board,A:{blockHabitat:(canvas,state)=>calls.push([canvas,state]),trashIcon(){}},showGhost(){},cells:()=>[]});vm.runInContext(part(source('games.js'),'function renderBoard()','function renderPieces()'),context);context.renderBoard();a.equal(board.children[0].id,'board-habitat');a.equal(board.children[0].width,640);a.equal(board.children[0]['aria-hidden'],'true');a.equal(board.children.slice(1).flatMap(row=>row.children).length,64);a.equal(calls[0][1],game);a.equal(JSON.stringify(game),before);
});
test('resuming paused cleanup unlocks its effect context from the explicit gesture',()=>{
 const resume={},events=[],context=vm.createContext({$:()=>resume,blocked:false,active:{},game:G.newBlocks(),paused:true,lastFrame:99,lastSaved:0,frame:0,performance:{now:()=>100},ensureEffects:()=>events.push('effects'),requestAnimationFrame:()=>1,blockFrame(){}});vm.runInContext(part(source('games.js'),"$('block-resume').onclick",'function stageLabel()'),context);resume.onclick();a.equal(events[0],'effects');a.equal(context.paused,false);a.equal(context.lastFrame,0);
});
test('effect control language and pressed state remain independent of music',()=>{
 const node={setAttribute(name,value){this[name]=value;}},context=vm.createContext({window:{DokdoLanguage:{lang:'en'}},effectsOn:false,$:()=>node,text:(_,value)=>node.textContent=value});vm.runInContext(part(source('games.js'),'function effectsLabel()',"$('game-effects').onclick"),context);context.effectsLabel();a.equal(node.textContent,'Sound effects off');a.equal(node['aria-pressed'],'false');context.window.DokdoLanguage.lang='ko';context.effectsOn=true;context.effectsLabel();a.equal(node.textContent,'효과음 켜짐');a.equal(node['aria-pressed'],'true');
});

test('new first and second missions keep playing for six hinted moves, then celebrate their completed cleanup',async()=>{
 const f=dropFixture(false,false);for(const mission of [1,2]){const startMoves=f.c.game.moves,startLines=f.c.game.lines,startEvents=f.events.filter(x=>x==='success').length;for(let move=0;move<6;move++){const index=f.c.game.pieces.findIndex(p=>p!==null),hint=G.hint(f.c.game,index);a.ok(hint);f.c.selected=index;await f.c.drop(hint.x,hint.y);a.equal(f.c.game.phase,move===5?'mission-clear':'playing');}a.equal(f.c.game.moves-startMoves,6);a.equal(f.c.game.lines-startLines,mission+1);a.equal(f.events.filter(x=>x==='success').length,startEvents+1);a.equal(f.c.game.missionCleared,G.missionPlan(mission,2).target);if(mission===1){a.equal(G.nextMission(f.c.game),true);f.c.paused=false;}}
});

test('finishing announces a newly unlocked garden gift even when its legacy level is below the run start',async()=>{
 const record=G.fresh();record.xp=2099;record.growth.quizFlowers=100;record.growth.runnerScore=2000;const started=G.begin(record,'blocks'),active=G.clone(started.active),game=G.clone(active.game),runStartGifts=G.unlocked(record).map(g=>g.id),nodes={},values={};game.score=10;
 a.equal(runStartGifts.includes('gull'),false);a.ok(G.islandLevel(record)>G.GIFTS.find(g=>g.id==='gull').level);
 const c=vm.createContext({G,record,active,game,kind:'blocks',paused:false,frame:0,runStartGifts,cancelAnimationFrame(){},saveRun:async()=>G.finish(record,active.id,game),track(){},$:id=>nodes[id]||(nodes[id]={focus(){}}),text:(id,value)=>values[id]=value,A:{animateIsland(){}},tone(){}});vm.runInContext(part(source('games.js'),'async function finishRun()','async function leave()'),c);await c.finishRun();a.equal(record.xp,2100);a.equal(G.giftOpen(record,G.GIFTS.find(g=>g.id==='gull')),true);a.equal(values['result-gifts'],'괭이갈매기 선물을 섬에 놓았어요.');a.equal(c.active,null);
});

test('new gift announcements wait for a mission boundary instead of interrupting an ordinary move',async()=>{
 for(const phase of ['playing','mission-clear']){const events=[],game=G.newBlocks();game.phase=phase;const c=vm.createContext({active:{id:'fixture'},game,G,dirtyRunner:true,record:G.fresh(),kind:'blocks',drawHub(){},$:()=>({open:true}),tx:async()=>({ok:true,opened:[{name:'사철나무'}]}),toast:message=>events.push(message)});vm.runInContext(part(source('games.js'),'async function saveRun(','async function launch('),c);await c.saveRun();a.equal(events.length,phase==='mission-clear'?1:0);}
});
