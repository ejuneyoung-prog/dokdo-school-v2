/* Offline DOM + real account controller, fixture SDK only. No browser/network I/O. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=process.env.DOKDO_TEST_ROOT||path.join(__dirname,'..');
const ACCOUNT=require(path.join(ROOT,'assets/account.js'));
const SOURCE=fs.readFileSync(path.join(ROOT,'assets/account-entry.js'),'utf8');
const BASE='https://school.example/dokdo-next/',KEY='dokdo-account-session-v2',ACCEPTED=KEY+'-accepted-user';
const USER={id:'00000000-0000-0000-0000-000000000001',email:'fixture@example.invalid',user_metadata:{dokdo_school_profile_v1:{version:1,nickname:'Verified friend',country:'',school:''}}};
const SESSION={access_token:'FICTIONAL_A_TOKEN',user:{...USER,user_metadata:{dokdo_school_profile_v1:{version:1,nickname:'UNVERIFIED_SESSION_NAME'}}}};
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
async function until(check){for(let n=0;n<60;n++){if(check())return;await tick();}throw Error('Fixture UI checkpoint not reached');}
function gate(){let release;return{promise:new Promise(r=>release=r),release:()=>release()};}
function fixture(options={}){
 const registry=new Map(),docEvents=new Map(),rootEvents=new Map(),values=new Map(),reads=[],writes=[],scripts=[],calls=[],clients=[],moves=[];
 const config={enabled:true,profileEnabled:true,kakaoEnabled:false,privateRecordsEnabled:false,supabaseUrl:'https://fixture.supabase.co',publishableKey:'sb_publishable_FICTIONAL_ONLY_NOT_REAL',redirectUrl:BASE+'account.html',...options.config};
 const secure=config.profileEnabled||config.kakaoEnabled||config.privateRecordsEnabled,key=secure?KEY:'dokdo-account-session-v1';
 let session=options.anonymous?null:SESSION,serverUser=options.serverUser===undefined?USER:options.serverUser,verifyGate=options.verifyGate||null,logoutError=options.logoutError||null;
 if(session){values.set(key,JSON.stringify(session));if(secure)values.set(ACCEPTED,session.user.id);}
 const allowed=new Set(['dokdo-account-session-v1',KEY,ACCEPTED]);
 const storage={getItem(k){assert.ok(allowed.has(k),'Entry must not access learner/game storage: '+k);reads.push(k);return values.get(k)??null;},setItem(k,v){assert.ok(allowed.has(k),'Entry must not write learner/game storage: '+k);writes.push({kind:'set',key:k});values.set(k,String(v));},removeItem(k){assert.ok(allowed.has(k),'Entry must not erase learner/game storage: '+k);writes.push({kind:'remove',key:k});values.delete(k);}};
 class Element{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.attributes={};this.children=[];this.hidden=false;this.disabled=false;this.style={};this.textContent='';this.parentElement=null;this.focused=0;}
  set id(value){this._id=value;registry.set(value,this);}get id(){return this._id;}
  setAttribute(k,v){this.attributes[k]=String(v);}removeAttribute(k){delete this.attributes[k];}getAttribute(k){return this.attributes[k]??null;}
  append(...nodes){for(const n of nodes){n.parentElement=this;this.children.push(n);}}
  contains(target){return this===target||this.children.some(c=>c.contains(target));}
  focus(){this.focused++;}getBoundingClientRect(){return{right:350,bottom:64};}
  set innerHTML(value){throw Error('Untrusted profile must never be rendered as HTML');}
 }
 const header=new Element(),link=new Element('a');link.id=options.linkId||'account-link';header.append(link);
 const on=(map,type,fn)=>{if(!map.has(type))map.set(type,[]);map.get(type).push(fn);};
 const dispatch=(map,type,event={})=>{for(const fn of map.get(type)||[])fn(event);};
 const d={documentElement:{lang:options.lang||'ko'},hidden:false,querySelector:()=>({content:options.mode||'live'}),getElementById:id=>registry.get(id)||null,createElement:tag=>new Element(tag),addEventListener:(type,fn)=>on(docEvents,type,fn),head:{append(script){scripts.push(script);queueMicrotask(async()=>{if(options.loadGate)await options.loadGate.promise;if(options.loadError)script.onerror();else{root.supabase=sdk;script.onload();}});}}};
 // The fixture mutex preserves the SDK/cleanup lock contract without stealing locks.
 const pendingLocks=new Map(),locks={request(name,opts,fn){assert.equal(opts.mode,'exclusive');const old=pendingLocks.get(name)||Promise.resolve(),result=old.then(fn);pendingLocks.set(name,result.catch(()=>{}));return result;}};
 const sdk={createClient(url,pub,opts){calls.push({name:'createClient',opts});assert.equal(url,config.supabaseUrl);assert.equal(pub,config.publishableKey);let listener,unsubscribed=false;
  const auth={async getSession(){calls.push({name:'getSession'});return{data:{session}};},async getUser(token){calls.push({name:'getUser',token});if(verifyGate)await verifyGate.promise;return options.verifyError?{data:{user:null},error:{code:'fixture_error'}}:{data:{user:serverUser}};},onAuthStateChange(fn){listener=fn;return{data:{subscription:{unsubscribe(){unsubscribed=true;calls.push({name:'unsubscribe'});}}}};},async signOut(input){calls.push({name:'signOut',input});if(logoutError)return{error:logoutError};session=null;storage.removeItem(key);if(!unsubscribed)listener('SIGNED_OUT',null);return{error:null};},async stopAutoRefresh(){calls.push({name:'stopAutoRefresh'});}};
  clients.push({auth,emit(event,s){if(!unsubscribed)listener(event,s);},get active(){return!unsubscribed;}});return{auth};}};
 const root={URL,document:d,location:{href:BASE+(options.linkId==='game-account-link'?'games.html':'index.html'),assign:u=>moves.push(u)},navigator:{locks},innerWidth:390,DOKDO_AUTH_CONFIG:config,DokdoAccount:ACCOUNT,addEventListener:(type,fn)=>on(rootEvents,type,fn)};
 Object.defineProperty(root,'localStorage',{get(){if(options.forbidStorage)throw Error('Preview must not read browser storage');return storage;}});
 Object.defineProperty(root,'fetch',{get(){throw Error('Entry must never upload progress or call fetch directly');}});
 if(options.preloadedSdk)root.supabase=sdk;
 root.globalThis=root;
 vm.runInNewContext(SOURCE,root,{filename:'production-account-entry.js'});
 return{root,d,link,values,reads,writes,scripts,calls,clients,moves,node:id=>registry.get(id),event:(type,e)=>dispatch(rootEvents,type,e),docEvent:(type,e)=>dispatch(docEvents,type,e),click:()=>link.onclick?.({preventDefault(){}}),setLanguage(lang){d.documentElement.lang=lang;dispatch(docEvents,'dokdo:language');},setLogoutError(error){logoutError=error;},holdVerify(g){verifyGate=g;},releaseVerify(){verifyGate?.release();verifyGate=null;},switchAccount(user,token='FICTIONAL_B_TOKEN'){serverUser=user;session={user,access_token:token};values.set(key,JSON.stringify(session));if(secure)values.set(ACCEPTED,user.id);for(const c of clients)c.emit('SIGNED_IN',session);},dispose(){dispatch(rootEvents,'pagehide');}};
}

test('Anonymous entry does not load SDK, create a client, write storage, or touch learner/game keys',async()=>{
 const f=fixture({anonymous:true});await tick();assert.equal(f.scripts.length,0);assert.equal(f.clients.length,0);assert.equal(f.writes.length,0);assert.deepEqual(f.reads,[KEY]);assert.equal(f.link.textContent,'로그인');assert.equal(f.link.href,'./account.html?next=.%2F');assert.equal(f.root.DokdoAccountEntry.openProfile(),false);assert.equal(f.moves.length,0);
});
test('Preview and demo entry never touch browser storage or load the auth SDK',async()=>{
 for(const mode of['preview','demo','snapshot']){const f=fixture({mode,forbidStorage:true});await tick();assert.equal(f.reads.length,0);assert.equal(f.scripts.length,0);assert.equal(f.clients.length,0);assert.equal(f.link.href,'https://dokdo-school-v2.vercel.app/dokdo-next/account.html?next=.%2F');assert.equal(f.link.target,'_blank');assert.equal(f.link.rel,'noopener noreferrer');assert.equal(f.root.DokdoAccountEntry.openProfile(),false);}
});
test('Disabled accounts do not inspect even an existing auth session',async()=>{
 const f=fixture({config:{enabled:false},forbidStorage:true});await tick();assert.equal(f.reads.length,0);assert.equal(f.scripts.length,0);assert.equal(f.clients.length,0);assert.equal(f.link.textContent,'로그인');
});
test('Stored auth state loads the pinned SDK but only server-verified nickname can appear',async()=>{
 const verifyGate=gate(),f=fixture({verifyGate});try{await until(()=>f.calls.some(c=>c.name==='getUser'));assert.equal(f.scripts.length,1);assert.equal(f.scripts[0].src,'./assets/vendor/supabase-2.118.0.js');assert.match(f.scripts[0].integrity,/^sha384-/);assert.equal(f.scripts[0].crossOrigin,'anonymous');assert.doesNotMatch(f.link.textContent,/UNVERIFIED_SESSION_NAME|Verified friend/);f.releaseVerify();await until(()=>f.link.textContent==='Verified friend · 내 기록');assert.equal(f.writes.length,0);assert.equal(f.clients.length,1);assert.equal(f.calls.find(c=>c.name==='getUser').token,SESSION.access_token);}finally{f.releaseVerify();f.dispose();}
});
test('Wrong server identity cannot produce a signed-in nickname or dropdown',async()=>{
 const f=fixture({serverUser:{...USER,id:'wrong-fixture-user'}});try{await until(()=>f.calls.some(c=>c.name==='getUser'));await tick();assert.equal(f.link.textContent,'로그인');assert.equal(f.link.onclick,null);assert.equal(f.link.getAttribute('aria-haspopup'),null);}finally{f.dispose();}
});
test('Verified dropdown uses fixed destination links; Escape and outside clicks dismiss it',async()=>{
 for(const linkId of['account-link','game-account-link']){const f=fixture({linkId});try{await until(()=>f.link.textContent.includes('Verified friend'));f.click();const menu=f.node('account-entry-menu'),next=linkId==='game-account-link'?'games.html':'.%2F';assert.equal(menu.hidden,false);assert.equal(f.link.getAttribute('aria-expanded'),'true');assert.equal(f.node('account-menu-records').href,'./account.html?next='+next);assert.equal(f.node('account-menu-profile').href,'./account.html?next='+next+'&profile=1');f.docEvent('keydown',{key:'Escape'});assert.equal(menu.hidden,true);assert.equal(f.link.focused,1);f.click();f.docEvent('click',{target:{}});assert.equal(menu.hidden,true);assert.equal(f.link.getAttribute('aria-expanded'),'false');}finally{f.dispose();}}
});
test('Successful dropdown logout calls real controller local signout and removes signed-in affordances',async()=>{
 const f=fixture();try{await until(()=>f.link.textContent.includes('Verified friend'));f.click();await f.node('account-menu-signout').onclick();await tick();assert.deepEqual(f.calls.find(c=>c.name==='signOut').input,{scope:'local'});assert.equal(f.link.textContent,'로그인');assert.equal(f.node('account-entry-menu').hidden,true);assert.equal(f.values.has(KEY),false);assert.equal(f.values.has(ACCEPTED),false);assert.equal(f.link.getAttribute('aria-haspopup'),null);assert.ok(f.writes.every(w=>[KEY,ACCEPTED].includes(w.key)));}finally{f.dispose();}
});
test('Failed dropdown logout preserves the menu and announces a safe retry message',async()=>{
 const f=fixture({logoutError:{code:'fixture',message:'PRIVATE_PROVIDER_DETAIL'}});try{await until(()=>f.link.textContent.includes('Verified friend'));f.click();await f.node('account-menu-signout').onclick();assert.equal(f.node('account-entry-menu').hidden,false);assert.equal(f.link.textContent,'Verified friend · 내 기록');assert.equal(f.node('account-menu-status').textContent,'로그아웃하지 못했어요. 다시 눌러 주세요.');assert.equal(f.node('account-menu-signout').disabled,false);assert.doesNotMatch(f.node('account-menu-status').textContent,/PRIVATE/);assert.equal(f.values.has(KEY),true);}finally{f.dispose();}
});
test('Dropdown labels and accessible menu name follow Korean-English-Korean changes',async()=>{
 const f=fixture();try{await until(()=>f.link.textContent.includes('Verified friend'));f.click();f.setLanguage('en');assert.equal(f.link.textContent,'Verified friend · My records');assert.equal(f.node('account-entry-menu').getAttribute('aria-label'),'My account menu');assert.equal(f.node('account-menu-profile').textContent,'Profile settings');assert.equal(f.node('account-menu-signout').textContent,'Sign out');f.setLanguage('ko');assert.equal(f.node('account-entry-menu').getAttribute('aria-label'),'내 계정 메뉴');assert.equal(f.node('account-menu-records').textContent,'내 기록');}finally{f.dispose();}
});
test('Repeated bfcache restoration creates fresh verification and never reuses a disposed controller',async()=>{
 const f=fixture();try{await until(()=>f.link.textContent.includes('Verified friend'));for(let n=1;n<=3;n++){f.click();f.event('pagehide');f.event('pageshow',{persisted:true});assert.doesNotMatch(f.link.textContent,/Verified friend/);await until(()=>f.clients.length===n+1&&f.link.textContent==='Verified friend · 내 기록');assert.equal(f.node('account-entry-menu').hidden,true);assert.equal(f.clients.filter(c=>c.active).length,1);assert.equal(f.calls.filter(c=>c.name==='getUser').length,n+1);assert.equal(f.calls.filter(c=>c.name==='unsubscribe').length,n);assert.equal(f.calls.filter(c=>c.name==='stopAutoRefresh').length,n);}}finally{f.dispose();}
});
test('Account switch immediately clears old identity until B server verification completes',async()=>{
 const verifyGate=gate(),f=fixture();try{await until(()=>f.link.textContent.includes('Verified friend'));f.holdVerify(verifyGate);const userB={...USER,id:'00000000-0000-0000-0000-000000000002',user_metadata:{dokdo_school_profile_v1:{version:1,nickname:'Second friend'}}};f.switchAccount(userB);assert.doesNotMatch(f.link.textContent,/Verified friend|Second friend/);await tick();assert.doesNotMatch(f.link.textContent,/Second friend/);f.releaseVerify();await until(()=>f.link.textContent==='Second friend · 내 기록');assert.equal(f.calls.filter(c=>c.name==='createClient').length,1);assert.equal(f.writes.length,0);}finally{f.releaseVerify();f.dispose();}
});
test('Nickname is rendered literally as text and invalid metadata uses the setup entry',async()=>{
 for(const nickname of['<img src=x onerror=alert(1)>','bad\nname']){const f=fixture({serverUser:{...USER,user_metadata:{dokdo_school_profile_v1:{version:1,nickname}}}});try{await until(()=>f.calls.some(c=>c.name==='getUser'));await tick();assert.equal(f.link.textContent,nickname.includes('\n')?'닉네임 설정':nickname+' · 내 기록');assert.equal(f.link.children.length,0);}finally{f.dispose();}}
});
test('Failed lazy SDK loading leaves a usable sign-in link and can retry when visible',async()=>{
 const f=fixture({loadError:true});await until(()=>f.scripts.length===1);await tick();assert.equal(f.link.textContent,'로그인');assert.equal(f.clients.length,0);f.docEvent('visibilitychange');await until(()=>f.scripts.length===2);await tick();assert.equal(f.link.textContent,'로그인');
});
test('All-false optional features preserve v1 auth presence without changing learner/game data',async()=>{
 const f=fixture({preloadedSdk:true,config:{profileEnabled:false,privateRecordsEnabled:false,kakaoEnabled:false}});try{await until(()=>f.link.textContent.includes('Verified friend'));assert.equal(f.scripts.length,0);assert.equal(f.calls.find(c=>c.name==='createClient').opts.auth.storageKey,'dokdo-account-session-v1');assert.equal(f.writes.length,0);assert.ok(f.reads.every(k=>k==='dokdo-account-session-v1'));}finally{f.dispose();}
});

 test('A bfcache return during pending lazy SDK loading cannot create two live auth controllers',async()=>{
 const loadGate=gate(),f=fixture({loadGate});try{await until(()=>f.scripts.length===1);f.event('pagehide');f.event('pageshow',{persisted:true});await until(()=>f.scripts.length===2);loadGate.release();await until(()=>f.link.textContent.includes('Verified friend'));await tick();assert.equal(f.clients.filter(c=>c.active).length,1);assert.equal(f.calls.filter(c=>c.name==='createClient').length,1);}finally{loadGate.release();f.dispose();}
 });
