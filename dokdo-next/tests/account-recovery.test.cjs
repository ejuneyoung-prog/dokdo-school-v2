/* Release red-team regression: fictional accounts, no external authentication. */
'use strict';
const test=require('node:test'),a=require('node:assert/strict'),{createController,passwordTransport}=require('../assets/account.js');
const URL_NOW='https://school.example/account.html',CONFIG={enabled:true,supabaseUrl:'https://fixture.supabase.co',publishableKey:'sb_publishable_FICTIONAL_ONLY_NOT_REAL',redirectUrl:URL_NOW};
const A={id:'FIXTURE_A',email:'a@example.invalid'},B={id:'FIXTURE_B',email:'b@example.invalid'},SA={user:A,access_token:'FICTIONAL_A'},SB={user:B,access_token:'FICTIONAL_B'};
const tick=()=>new Promise(r=>setTimeout(r,0));
function gate(){let release;return{promise:new Promise(r=>release=r),release:()=>release()};}
function fixture(o={}){let session=SA,listener,proofGate=null,proofReads=0;const writes=[],states=[];
 const auth={onAuthStateChange(fn){listener=fn;if(o.authority!==false)fn('PASSWORD_RECOVERY',session);return{data:{subscription:{unsubscribe(){}}}};},async getSession(){return{data:{session}};},async getUser(token){proofReads++;if(proofGate)await proofGate.promise;return{data:{user:token===SA.access_token?A:B}};},async updateUser(){throw Error('Mutable SDK updateUser must never choose a password target');}};
 const c=createController({config:{...CONFIG,privateRecordsEnabled:!!o.secure},sdk:{createClient:()=>({auth})},currentUrl:URL_NOW+'?flow=recovery',onChange:s=>states.push(s),updatePassword:async(token,password)=>{if(o.beforePut)o.beforePut({switchB:()=>{session=SB;}});writes.push({token,password});if(o.putGate)await o.putGate.promise;if(o.putError)throw o.putError;return o.wrongUser?B:A;}});
 return{c,writes,states,auth,holdProof(g){proofGate=g;},releaseProof(){proofGate?.release();proofGate=null;},get reads(){return proofReads;},switchB(event=true){session=SB;if(event)listener('SIGNED_IN',SB);},emit(event,s){session=s;listener(event,s);},dispose:()=>c.dispose()};
}
test('A recovery authority cannot cross to B in implicit or secure mode',async()=>{
 for(const secure of[false,true]){const f=fixture({secure});try{await f.c.init();a.equal(f.c.getState().mode,'recovery');f.switchB();await tick();await tick();a.equal(f.c.getState().user.id,B.id);a.equal(f.c.getState().mode,'login');a.equal(await f.c.submit({password:'FICTIONAL_NEW_PASSWORD'}),false);a.equal(f.writes.length,0);}finally{f.dispose();}}
});
test('Account switching while server proof is pending prevents the password request',async()=>{
 const f=fixture(),proof=gate();try{await f.c.init();f.holdProof(proof);const pending=f.c.submit({password:'FICTIONAL_NEW_PASSWORD'});await tick();f.switchB();f.releaseProof();a.equal(await pending,false);await tick();a.equal(f.writes.length,0);a.equal(f.c.getState().user.id,B.id);a.equal(f.c.getState().mode,'login');}finally{f.releaseProof();f.dispose();}
});
test('A silent SDK storage switch is checked again before mutation',async()=>{
 const f=fixture();try{await f.c.init();f.switchB(false);a.equal(await f.c.submit({password:'FICTIONAL_NEW_PASSWORD'}),false);a.equal(f.writes.length,0);a.notEqual(f.c.getState().mode,'recovery');}finally{f.dispose();}
});
test('A switch at the mutation boundary can target only verified A, never mutable SDK account B',async()=>{
 const f=fixture({beforePut:({switchB})=>switchB()});try{await f.c.init();a.equal(await f.c.submit({password:'FICTIONAL_NEW_PASSWORD'}),false);a.equal(f.writes.length,1);a.equal(f.writes[0].token,SA.access_token);a.notEqual(f.writes[0].token,SB.access_token);a.doesNotMatch(f.c.getState().message,/비밀번호를 바꿨어요/);}finally{f.dispose();}
});
test('B arriving during an already pinned A request never receives A success or recovery permission',async()=>{
 const putGate=gate(),f=fixture({putGate});try{await f.c.init();const pending=f.c.submit({password:'FICTIONAL_NEW_PASSWORD'});await tick();a.equal(f.writes.length,1);f.switchB();putGate.release();a.equal(await pending,false);await tick();a.equal(f.writes[0].token,SA.access_token);a.equal(f.c.getState().user.id,B.id);a.equal(f.c.getState().mode,'login');a.equal(f.states.some(s=>s.user?.id===B.id&&s.message==='비밀번호를 바꿨어요.'),false);}finally{putGate.release();f.dispose();}
});
test('Signout and ordinary same-UID sign-in do not resurrect an earlier recovery authority',async()=>{
 const f=fixture();try{await f.c.init();f.emit('SIGNED_OUT',null);await tick();f.emit('SIGNED_IN',SA);await tick();a.equal(f.c.getState().mode,'login');a.equal(await f.c.submit({password:'FICTIONAL_NEW_PASSWORD'}),false);a.equal(f.writes.length,0);}finally{f.dispose();}
});
test('A changed token cannot reuse an older recovery session even for the same UID',async()=>{
 const f=fixture();try{await f.c.init();f.emit('TOKEN_REFRESHED',{user:A,access_token:'FICTIONAL_A_ROTATED'});await tick();a.notEqual(f.c.getState().mode,'recovery');a.equal(await f.c.submit({password:'FICTIONAL_NEW_PASSWORD'}),false);a.equal(f.writes.length,0);}finally{f.dispose();}
});
test('Valid recovery pins one session and blocks duplicate submission until confirmation',async()=>{
 const putGate=gate(),f=fixture({putGate});try{await f.c.init();const first=f.c.submit({password:'FICTIONAL_NEW_PASSWORD'});a.equal(await f.c.submit({password:'FICTIONAL_OTHER_PASSWORD'}),false);await tick();a.equal(f.writes.length,1);a.equal(f.c.getState().busy,true);putGate.release();a.equal(await first,true);a.equal(f.writes[0].token,SA.access_token);a.equal(f.c.getState().mode,'login');a.equal(f.c.getState().message,'비밀번호를 바꿨어요.');a.equal(f.c.getState().busy,false);}finally{putGate.release();f.dispose();}
});
test('Missing authority, a wrong returned UID, or a provider failure never reports password success',async()=>{
 for(const options of[{authority:false},{wrongUser:true},{putError:{message:'PRIVATE_PASSWORD_DETAILS'}}]){const f=fixture(options);try{await f.c.init();a.equal(await f.c.submit({password:'FICTIONAL_NEW_PASSWORD'}),false);a.doesNotMatch(f.c.getState().message,/PRIVATE|비밀번호를 바꿨어요/);}finally{f.dispose();}}
});
test('Disposal during recovery proof prevents any late password request',async()=>{
 const f=fixture(),proof=gate();await f.c.init();f.holdProof(proof);const pending=f.c.submit({password:'FICTIONAL_NEW_PASSWORD'});await tick();f.dispose();f.releaseProof();a.equal(await pending,false);a.equal(f.writes.length,0);
});
test('Password transport fixes origin, path, token, body and refuses redirects or raw provider errors',async()=>{
 let call;const put=passwordTransport(CONFIG,async(url,options)=>{call={url,options};return{ok:true,json:async()=>A};});a.equal((await put(SA.access_token,'FICTIONAL_NEW_PASSWORD')).id,A.id);a.equal(call.url,'https://fixture.supabase.co/auth/v1/user');a.equal(call.options.method,'PUT');a.equal(call.options.redirect,'error');a.equal(call.options.credentials,'omit');a.equal(call.options.referrerPolicy,'no-referrer');a.equal(call.options.headers.Authorization,'Bearer '+SA.access_token);a.deepEqual(JSON.parse(call.options.body),{password:'FICTIONAL_NEW_PASSWORD'});await a.rejects(()=>passwordTransport({...CONFIG,supabaseUrl:'https://evil.example'},()=>{throw Error('Should not call');})(SA.access_token,'x'));await a.rejects(()=>passwordTransport(CONFIG,async()=>({ok:false,json:async()=>({message:'PRIVATE'})}))(SA.access_token,'x'),error=>!error.message.includes('PRIVATE'));
});
