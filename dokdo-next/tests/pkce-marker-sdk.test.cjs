/* Actual pinned Supabase SDK + production controller; fixture HTTP/storage only.
 * No network, real account, service setting, or repository file is changed.
 * Run: node --test dokdo-next/tests/pkce-marker-sdk.test.cjs
 */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {webcrypto}=require('node:crypto');
const ROOT=process.env.DOKDO_TEST_ROOT||path.join(__dirname,'..');
const {createController,sessionCleanup}=require(path.join(ROOT,'assets/account.js'));
const KEY='dokdo-account-session-v2',MARKER=KEY+'-accepted-user',URL_NOW='https://school.example/account.html';
const CONFIG={enabled:true,registrationEnabled:true,kakaoEnabled:true,privateRecordsEnabled:true,supabaseUrl:'https://fictional.supabase.co',publishableKey:'sb_publishable_FICTIONAL_ONLY_NOT_REAL',redirectUrl:URL_NOW};
const USER_A={id:'00000000-0000-0000-0000-000000000001',email:'a@example.invalid',aud:'authenticated',app_metadata:{provider:'kakao'}};
const USER_B={id:'00000000-0000-0000-0000-000000000002',email:'b@example.invalid',aud:'authenticated',app_metadata:{provider:'email'}};
const b64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const makeSession=(user,suffix)=>({access_token:b64({alg:'HS256',typ:'JWT'})+'.'+b64({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,aud:'authenticated'})+'.'+b64({fixture:suffix}),refresh_token:'FICTIONAL_REFRESH_'+suffix,expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user});
const SESSION_A=makeSession(USER_A,'A'),SESSION_B=makeSession(USER_B,'B');
function gate(){let release;const promise=new Promise(r=>release=r);return{promise,release};}
const tick=()=>new Promise(r=>setTimeout(r,0));
async function until(fn){for(let i=0;i<100;i++){if(fn())return;await tick();}throw Error('Fixture checkpoint not reached');}
function mutex(){const tails=new Map(),names=[];return{names,request(name,options,fn){assert.equal(options.mode,'exclusive');names.push(name);const old=tails.get(name)||Promise.resolve();const result=old.then(()=>fn({name,mode:'exclusive'}));tails.set(name,result.catch(()=>{}));return result;}};}
function storage(values=new Map()){return{values,getItem:k=>values.has(k)?values.get(k):null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};}
function harness(options={}){
 const store=options.store||storage(),locks=options.locks||mutex(),requests=[],clients=[],controllers=[],connections=[];
 const tokenGate=options.tokenGate,userGate=options.userGate;
 let tokens=0,users=0;
 const fakeFetch=async(input,opts={})=>{
  const u=new URL(input),body=opts.body?JSON.parse(opts.body):null;assert.equal(u.origin,'https://fixture.example');
  requests.push({path:u.pathname,grant:u.searchParams.get('grant_type')});
  let result;
  if(u.pathname==='/auth/v1/token'){
   tokens++;const grant=u.searchParams.get('grant_type');
   assert.ok(['pkce','password'].includes(grant),'Unexpected fixture auth flow');
   if(grant==='pkce'){assert.equal(body.auth_code,'FICTIONAL_CODE');assert.ok(body.code_verifier);if(tokenGate)await tokenGate.promise;result=SESSION_A;}
   else{assert.equal(body.email,USER_B.email);result=SESSION_B;}
  }else if(u.pathname==='/auth/v1/user'){
   users++;const h=new Headers(opts.headers),token=h.get('authorization')?.replace(/^Bearer /,'');
   assert.ok(token===SESSION_A.access_token||token===SESSION_B.access_token,'Only fictional tokens are accepted');
   if(token===SESSION_A.access_token&&userGate&&users===1)await userGate.promise;
   result=token===SESSION_A.access_token?USER_A:USER_B;
  }else if(u.pathname==='/auth/v1/logout')result={};
  else throw Error('Unexpected fixture endpoint; external fetch is never used');
  return new Response(JSON.stringify(result),{status:200,headers:{'content-type':'application/json'}});
 };
 const sandbox={URL,URLSearchParams,Headers,Request,Response,TextEncoder,TextDecoder,setTimeout,clearTimeout,setInterval,clearInterval,crypto:webcrypto,atob,btoa,fetch:fakeFetch,console:{log(){},warn(){},error(){},debug(){}}};
 vm.runInNewContext(fs.readFileSync(path.join(ROOT,'assets/vendor/supabase-2.118.0.js'),'utf8'),sandbox,{filename:'actual-vendored-sdk-2.118.0.js'});
 function controller(suffix=''){
  let listener=()=>{};
  const cleanup=sessionCleanup(store,locks);
  const sdk={createClient(url,key,opts){assert.equal(typeof opts.auth.lock,'function');assert.equal(opts.auth.flowType,'pkce');assert.equal(opts.auth.detectSessionInUrl,false);
   const auth=new sandbox.supabase.AuthClient({...opts.auth,url:'https://fixture.example/auth/v1',storage:store,autoRefreshToken:false,fetch:fakeFetch});clients.push(auth);
   const original=auth.onAuthStateChange.bind(auth);auth.onAuthStateChange=fn=>{listener=fn;return original(fn);};return{auth};}};
  const seen=[];const c=createController({config:CONFIG,currentUrl:URL_NOW+suffix,sdk,cleanup,onAccount:user=>{connections.push(user?.id||null);},onChange:s=>seen.push(s)});controllers.push(c);
  return{c,seen,emit:(event,session)=>listener(event,session)};
 }
 return{store,locks,requests,connections,controller,get tokens(){return tokens;},get users(){return users;},async close(){for(const c of controllers)c.dispose();for(const auth of clients)await auth.stopAutoRefresh();await tick();}};
}
function verifier(store){store.setItem(KEY+'-code-verifier',JSON.stringify('FICTIONAL_VERIFIER_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'));}

test('Actual SDK successful code exchange accepts identity; reload restores only that verified marker',async()=>{
 const h=harness();verifier(h.store);
 try{const f=h.controller('?oauth=kakao&code=FICTIONAL_CODE');assert.equal(await f.c.init(),true);assert.equal(f.c.getState().user.id,USER_A.id);assert.equal(h.store.getItem(MARKER),USER_A.id);assert.equal(f.c.getState().oauthComplete,true);f.c.dispose();
  const reload=h.controller();await reload.c.init();assert.equal(reload.c.getState().user.id,USER_A.id);assert.equal(reload.c.getState().oauthComplete,false);assert.ok(h.locks.names.every(n=>n==='lock:'+KEY));
 }finally{await h.close();}
});

test('Actual SDK persisted valid A without accepted marker cannot connect on reload',async()=>{
 const h=harness();h.store.setItem(KEY,JSON.stringify(SESSION_A));
 try{const f=h.controller();await f.c.init();assert.equal(h.users,1);assert.equal(f.c.getState().user,null);assert.equal(h.connections.includes(USER_A.id),false);assert.equal(h.store.getItem(MARKER),null);assert.ok(h.store.getItem(KEY));}finally{await h.close();}
});

test('Interrupted exchange cleans actual SDK A; own final SIGNED_IN cannot reaccept it after reload',async()=>{
 const tokenGate=gate(),h=harness({tokenGate});verifier(h.store);
 try{const f=h.controller('?oauth=kakao&code=FICTIONAL_CODE'),pending=f.c.init();await until(()=>h.tokens===1);f.emit('SIGNED_OUT',null);tokenGate.release();await pending;await tick();
  assert.equal(f.c.getState().user,null);assert.equal(h.store.getItem(KEY),null);assert.equal(h.store.getItem(MARKER),null);assert.equal(h.connections.includes(USER_A.id),false);
  const reload=h.controller();await reload.c.init();assert.equal(reload.c.getState().user,null);
 }finally{tokenGate.release();await h.close();}
});

test('Crash snapshot after SDK persistence but before getUser verification remains denied after reload',async()=>{
 const userGate=gate(),h=harness({userGate});verifier(h.store);let crash;
 try{const f=h.controller('?oauth=kakao&code=FICTIONAL_CODE'),pending=f.c.init();await until(()=>h.users===1);assert.ok(h.store.getItem(KEY));assert.equal(h.store.getItem(MARKER),null);
  // Clone the disk state at process death; no old async continuation exists in the new process.
  crash=harness({store:storage(new Map(h.store.values))});f.c.dispose();
  const reload=crash.controller();await reload.c.init();assert.equal(reload.c.getState().user,null);assert.equal(crash.connections.includes(USER_A.id),false);assert.equal(crash.store.getItem(MARKER),null);
  userGate.release();await pending;assert.equal(h.store.getItem(KEY),null);
 }finally{userGate.release();if(crash)await crash.close();await h.close();}
});

test('Actual explicit B sign-in while A getUser is delayed preserves B session/marker and denies late A',async()=>{
 const userGate=gate(),h=harness({userGate});verifier(h.store);
 try{const a=h.controller('?oauth=kakao&code=FICTIONAL_CODE'),pending=a.c.init();await until(()=>h.users===1);
  const b=h.controller();await b.c.init();assert.equal(b.c.getState().user,null);
  assert.equal(await b.c.submit({email:USER_B.email,password:'FICTIONAL_PASSWORD'}),true);assert.equal(b.c.getState().user.id,USER_B.id);assert.equal(h.store.getItem(MARKER),USER_B.id);
  userGate.release();await pending;await tick();assert.equal(a.c.getState().user,null);assert.equal(h.connections.includes(USER_A.id),false);assert.equal(h.store.getItem(MARKER),USER_B.id);assert.equal(JSON.parse(h.store.getItem(KEY)).user.id,USER_B.id);
  const reload=h.controller();await reload.c.init();assert.equal(reload.c.getState().user.id,USER_B.id);
 }finally{userGate.release();await h.close();}
});

test('Conditional discard/forget of rejected A preserve already accepted B and unrelated records',async()=>{
 const store=storage(),locks=mutex(),cleanup=sessionCleanup(store,locks);store.setItem(KEY,JSON.stringify(SESSION_B));store.setItem(MARKER,USER_B.id);store.setItem('school-fixture','ORIGINAL');
 await cleanup.discard(SESSION_A);await cleanup.forget(USER_A.id);assert.equal(JSON.parse(store.getItem(KEY)).user.id,USER_B.id);assert.equal(store.getItem(MARKER),USER_B.id);assert.equal(store.getItem('school-fixture'),'ORIGINAL');
});

test('Marker cannot be minted by passive actual SDK restore, but explicit password admission can establish it',async()=>{
 const h=harness();h.store.setItem(KEY,JSON.stringify(SESSION_B));
 try{const f=h.controller();await f.c.init();assert.equal(f.c.getState().user,null);assert.equal(h.store.getItem(MARKER),null);assert.equal(await f.c.submit({email:USER_B.email,password:'FICTIONAL_PASSWORD'}),true);await tick();assert.equal(h.store.getItem(MARKER),USER_B.id);assert.equal(f.c.getState().user.id,USER_B.id);}finally{await h.close();}
});

test('Unavailable marker persistence fails closed after actual SDK exchange, without cloud admission',async()=>{
 const store=storage(),set=store.setItem;store.setItem=(key,value)=>{if(key===MARKER)throw Error('Fixture storage quota');return set(key,value);};const h=harness({store});verifier(store);
 try{const f=h.controller('?oauth=kakao&code=FICTIONAL_CODE');await f.c.init();assert.equal(f.c.getState().user,null);assert.equal(h.connections.includes(USER_A.id),false);assert.equal(store.getItem(MARKER),null);assert.equal(store.getItem(KEY),null);}finally{await h.close();}
});

test('Late rejected old A must preserve a newer explicitly accepted session for the same UID',async()=>{
 const store=storage(),locks=mutex(),cleanup=sessionCleanup(store,locks),newA={...SESSION_A,access_token:SESSION_A.access_token+'NEW_FIXTURE_TOKEN'};
 store.setItem(KEY,JSON.stringify(newA));store.setItem(MARKER,USER_A.id);
 await cleanup.discard(SESSION_A);
 assert.equal(JSON.parse(store.getItem(KEY)).access_token,newA.access_token);
 assert.equal(store.getItem(MARKER),USER_A.id);
});
