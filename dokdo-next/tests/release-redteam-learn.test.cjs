'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../assets/app.js'),'utf8');
function part(start,end){const i=source.indexOf(start),j=source.indexOf(end,i);a.ok(i>=0&&j>i);return source.slice(i,j);}
function node(){return{hidden:true,children:[],disabled:false,textContent:'',classList:{add(){},toggle(){}},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},setAttribute(){},focus(){},scrollIntoView(){}};}
function question(){return{mode:'daily',index:0,total:5,first:0,corrected:0,xp:0,answered:false,retrying:false,order:[1,0],answer:1,item:{id:920001,answer:0,familyId:'fixture-concept',choices:['Correct original','Wrong original'],wrong:['','Original wrong feedback'],explain:'Original explanation',fact:'Original fact'}};}
function fixture(){
 const nodes={},$=id=>nodes[id]||(nodes[id]=node()),events=[],state={grade:'K'},writes=[];let complete;
 const bridge={rewardLearning:family=>{events.push(['reward',family]);return Promise.resolve(true);}},analytics={track:(...args)=>events.push(['analytics',...args])};
 const c=vm.createContext({lesson:question(),busy:false,currentView:'learn',activeYoutube:null,mapOpen:false,frameLast:0,lightDirty:false,
  window:{DokdoPlayBridge:bridge,DokdoAnalytics:analytics,scrollTo(){}},DokdoPlayBridge:bridge,DokdoAnalytics:analytics,
  mutate:fn=>new Promise((resolve,reject)=>{complete=()=>{try{writes.push('committed');resolve(fn(state));}catch(e){reject(e);}};}),
  M:{answer:()=>({xp:5}),summary:()=>({}),finish:()=>{events.push(['finish']);return{advanced:false};}},
  getS:()=>state,$,txt:(id,text)=>$(id).textContent=text,tr:(ko,en)=>ko,toast(){},num:String,
  renderGradeLine(){},renderHome(){},renderCatalog(){},renderRecords(){},renderJournal(){},renderHall(){},renderGrade(){},
  renderResult:(...args)=>events.push(['result',...args]),confirm:()=>true,stopAllYoutubeEmbeds(){},
  document:{body:{classList:{contains:()=>true}},querySelectorAll:()=>[],createElement:node,dispatchEvent(){}},Event:class{},openDispute(){}});
 vm.runInContext(part('function view(','/* A promotion'),c);
 vm.runInContext(part('async function choose(',"$('read-done').onclick"),c);
 vm.runInContext(part('async function next()',"$('next-question').onclick"),c);
 $('question-options').children=[node(),node()];
 function restart(){const newer=question();newer.item={...newer.item,id:920002};c.lesson=newer;c.currentView='learn';$('question-options').children=[node(),node()];$('question-feedback').replaceChildren();$('question-feedback').hidden=true;$('next-question').hidden=true;$('lesson').hidden=false;$('lesson-result').hidden=true;return newer;}
 return{c,nodes,$,events,writes,commit:()=>complete(),restart};
}
for(const correct of[false,true])for(const destination of['stay','leave','restart'])test(`answer commit: ${correct?'correct':'wrong'} / ${destination} preserves the current lesson boundary`,async()=>{
 const f=fixture(),old=f.c.lesson,pending=f.c.choose(correct?1:0);a.equal(f.c.busy,true);
 let newer;if(destination!=='stay'){a.equal(f.c.view('home'),true);a.equal(f.c.lesson,null);if(destination==='restart')newer=f.restart();}
 f.commit();await pending;a.equal(f.writes.length,1);a.equal(f.c.busy,false);
 a.equal(f.events.filter(e=>e[0]==='reward').length,correct?1:0,'The original committed correct answer keeps its own reward');
 a.equal(f.events.filter(e=>e[0]==='analytics'&&e[1]==='question_answered').length,1);
 if(destination==='stay'){a.equal(old.answered,true);a.ok(f.$('question-options').children.every(b=>b.disabled));a.equal(f.$('question-feedback').hidden,false);a.equal(f.$('next-question').hidden,false);}
 else{a.equal(f.$('question-feedback').hidden,true);a.equal(f.$('next-question').hidden,true);a.ok(f.$('question-options').children.every(b=>!b.disabled));if(newer){a.equal(f.c.lesson,newer);a.equal(newer.answered,false);}}
});
for(const destination of['stay','leave','restart'])test(`lesson completion commit / ${destination} cannot clear a replacement lesson or show stale results`,async()=>{
 const f=fixture(),old=f.c.lesson;old.answered=true;old.index=4;old.items=[old.item];
 const pending=f.c.next();a.equal(f.c.busy,true);let newer;
 if(destination!=='stay'){f.c.view('home');if(destination==='restart')newer=f.restart();}
 f.commit();await pending;a.equal(f.writes.length,1);a.equal(f.events.filter(e=>e[0]==='finish').length,1);a.equal(f.c.busy,false);
 if(destination==='stay'){a.equal(f.events.filter(e=>e[0]==='result').length,1);a.equal(f.c.lesson,null);a.equal(f.$('lesson-result').hidden,false);}
 else{a.equal(f.events.filter(e=>e[0]==='result').length,0);a.equal(f.$('lesson-result').hidden,true);if(newer){a.equal(f.c.lesson,newer);a.equal(f.$('lesson').hidden,false);}}
});
test('canceling leave while an answer is pending keeps the same question and its valid feedback',async()=>{
 const f=fixture(),old=f.c.lesson,pending=f.c.choose(1);f.c.confirm=()=>false;a.equal(f.c.view('home'),false);a.equal(f.c.lesson,old);f.commit();await pending;a.equal(old.answered,true);a.equal(f.$('question-feedback').hidden,false);
});
test('pending answer rejects duplicate or out-of-range input and releases the lock for a replacement lesson',async()=>{
 const f=fixture(),pending=f.c.choose(1);await f.c.choose(1);a.equal(f.writes.length,0);f.c.view('home');const newer=f.restart();f.commit();await pending;
 for(const bad of[-1,2,NaN,1.5,'1',null])await f.c.choose(bad);a.equal(f.c.busy,false);a.equal(f.writes.length,1);a.equal(newer.answered,false);
 const nextAnswer=f.c.choose(1);f.commit();await nextAnswer;a.equal(newer.answered,true);a.equal(f.writes.length,2);
});
test('channel mission switches to English and back through the actual main-page translator',()=>{
 const page=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),original=page.match(/<p[^>]*data-i18n="channelMission"[^>]*>([^<]+)<\/p>/)?.[1];a.ok(original);
 const label={dataset:{i18n:'channelMission'},textContent:original},nodes={language:{setAttribute(){}},'question-title':{}},context=vm.createContext({language:'en',ko:{channelMission:original},document:{documentElement:{},querySelectorAll:()=>[label]},window:{},$:id=>nodes[id]||null,txt(){},tr:ko=>ko,Intl});
 vm.runInContext(part('const en={','\nen.mapShapeNote='),context);vm.runInContext(part('function translate(){','function showDialog('),context);
 context.translate();a.doesNotMatch(label.textContent,/[가-힣]/);a.match(label.textContent,/history and culture through music and media/);context.language='ko';context.translate();a.equal(label.textContent,original);
});
