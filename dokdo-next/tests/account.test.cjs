/* No network, real Supabase project or real credentials are used by these tests. */
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createController,validateConfig,returnPath,mount}=require('../assets/account.js');
const URL_NOW='https://school.example/auth/account.html';
const CONFIG={enabled:true,supabaseUrl:'https://fixture-project.supabase.co',publishableKey:'sb_publishable_FIXTURE_ONLY_NOT_A_REAL_KEY',redirectUrl:URL_NOW};
const USER={id:'00000000-0000-0000-0000-000000000001',email:'fictional@example.invalid'};
const SESSION={user:USER,access_token:'FICTIONAL_TEST_TOKEN'};
const flush=()=>new Promise(resolve=>setTimeout(resolve,0));
function fixture(options={}){
 let listener=()=>{},session=options.session||null,verified=options.verified===undefined?session?.user:options.verified;
 const calls=[];let factoryCalls=0;
 const call=(name,data)=>calls.push({name,data});
 const auth={
  onAuthStateChange(fn){listener=fn;if(options.recoveryEventOnSubscribe)fn('PASSWORD_RECOVERY',session);return {data:{subscription:{unsubscribe(){call('unsubscribe');}}}};},
  async getSession(){call('getSession');return {data:{session},error:options.sessionError||null};},
  async getUser(){call('getUser');if(options.getUserResponse)return options.getUserResponse();return {data:{user:verified},error:options.verifyError||null};},
  async signInWithPassword(data){call('signInWithPassword',data);if(options.gate)await options.gate;if(options.loginThrow)throw Error('network down');if(options.loginError)return {error:options.loginError};session=options.noSession?null:SESSION;verified=USER;return {data:{session,user:USER},error:null};},
  async signUp(data){call('signUp',data);if(options.signupSession){session=SESSION;verified=USER;}return {data:{session,user:USER},error:options.signupError||null};},
  async signOut(data){call('signOut',data);if(options.logoutError)return {error:options.logoutError};session=null;verified=null;return {error:null};},
  async resetPasswordForEmail(email,data){call('resetPasswordForEmail',{email,...data});return {error:options.resetError||null};},
  async updateUser(data){call('updateUser',data);return {data:{user:USER},error:options.updateError||null};}
 };
 const sdk={createClient(url,key,settings){factoryCalls++;call('createClient',{url,key,settings});return {auth};}};
 const changes=[];const c=createController({config:options.config===undefined?CONFIG:options.config,sdk:options.missingSdk?null:sdk,currentUrl:options.url||URL_NOW,onChange:s=>changes.push(s)});
 return {c,sdk,calls,changes,emit:(event,s)=>{session=s;verified=s?.user||null;listener(event,s);},factoryCalls:()=>factoryCalls};
}
test('Unconnected preparation never creates a client, enables fields or simulates login',async()=>{
 const f=fixture({config:{enabled:false,supabaseUrl:'',publishableKey:'',redirectUrl:''}});
 a.equal(await f.c.init(),false);a.equal(await f.c.submit({email:USER.email,password:'fictional-password'}),false);a.equal(f.factoryCalls(),0);a.equal(f.c.getState().ready,false);a.equal(f.c.getState().user,null);
});
test('Missing, secret, legacy and foreign-origin settings fail closed',()=>{
 for(const cfg of [null,{...CONFIG,enabled:false},{...CONFIG,publishableKey:''},{...CONFIG,publishableKey:'sb_secret_DO_NOT_USE'},{...CONFIG,publishableKey:'eyJhbGciOiJIUzI1NiJ9.legacy.jwt'},{...CONFIG,supabaseUrl:'https://evil.example'},{...CONFIG,redirectUrl:'https://other.example/account.html'},{...CONFIG,redirectUrl:URL_NOW+'#token'},{...CONFIG,redirectUrl:URL_NOW+'?next=elsewhere'}])a.equal(validateConfig(cfg,URL_NOW),null);
 a.ok(validateConfig(CONFIG,URL_NOW));
});
test('Missing SDK or malformed page URL cannot activate the login form',async()=>{
 const f=fixture({missingSdk:true});a.equal(await f.c.init(),false);a.equal(f.c.getState().ready,false);
 const bad=fixture({url:'not a URL'});a.equal(await bad.c.init(),false);a.equal(bad.factoryCalls(),0);
});
test('Official client uses a separate persistent refreshable session and explicit implicit redirect flow',async()=>{
 const f=fixture();a.equal(await f.c.init(),true);const options=f.calls[0].data.settings.auth;
 a.equal(options.persistSession,true);a.equal(options.autoRefreshToken,true);a.equal(options.detectSessionInUrl,true);a.equal(options.flowType,'implicit');a.equal(options.storageKey,'dokdo-account-session-v1');a.equal(f.c.getState().user,null);
});
test('Sign in requires a real API session and verified matching server user',async()=>{
 const f=fixture();await f.c.init();a.equal(await f.c.submit({email:USER.email,password:'fictional-password'}),true);a.equal(f.c.getState().user.id,USER.id);a.ok(f.calls.some(c=>c.name==='getUser'));
 const no=fixture({noSession:true});await no.c.init();a.equal(await no.c.submit({email:USER.email,password:'fictional-password'}),false);a.equal(no.c.getState().user,null);
});
test('Invalid sign-in shows a safe error and releases the submission lock',async()=>{
 const f=fixture({loginError:{code:'invalid_credentials',message:'DO_NOT_DISPLAY_INTERNAL_DETAILS'}});await f.c.init();a.equal(await f.c.submit({email:USER.email,password:'wrong'}),false);
 a.equal(f.c.getState().user,null);a.equal(f.c.getState().busy,false);a.match(f.c.getState().message,/아이디와 비밀번호/);a.doesNotMatch(f.c.getState().message,/INTERNAL/);
});
test('A network exception cannot leave a fake signed-in state or locked form',async()=>{
 const f=fixture({loginThrow:true});await f.c.init();a.equal(await f.c.submit({email:USER.email,password:'fictional-password'}),false);a.equal(f.c.getState().busy,false);a.equal(f.c.getState().user,null);
});
test('A signup mail-service 500 gives fixed mail guidance without blaming the user network or reflecting private details',async()=>{
 const error={code:'unexpected_failure',status:500,message:'535 PRIVATE_SMTP_USER fictional@example.invalid token=PRIVATE_TOKEN password=PRIVATE_PASSWORD'},f=fixture({signupError:error});
 await f.c.init();f.c.setMode('signup');a.equal(await f.c.submit({email:USER.email,password:'fictional-password'}),false);
 const state=f.c.getState();a.equal(state.message,'가입 확인 메일을 보내지 못했어요. 메일 연결을 확인 중이니 잠시 뒤 다시 시도해 주세요.');a.equal(state.user,null);a.equal(state.busy,false);a.equal(state.error,true);a.doesNotMatch(state.message,/인터넷|535|SMTP|fictional|PRIVATE|token|password/);
});
test('A reset-mail service 500 never reveals the address or whether an account exists',async()=>{
 const f=fixture({resetError:{code:'unexpected_failure',status:500,message:'No such user fictional@example.invalid PRIVATE_TOKEN'}});await f.c.init();f.c.setMode('forgot');a.equal(await f.c.submit({email:USER.email}),false);
 const state=f.c.getState();a.equal(state.message,'비밀번호 재설정 메일을 보내지 못했어요. 메일 연결을 확인 중이니 잠시 뒤 다시 시도해 주세요.');a.equal(state.user,null);a.equal(state.busy,false);a.doesNotMatch(state.message,/인터넷|없는 계정|가입하지|fictional|PRIVATE|No such/);
});
test('Sign-in server failures are account-service failures rather than mail or internet failures',async()=>{
 const f=fixture({loginError:{code:'unexpected_failure',status:500,message:'PRIVATE_PROVIDER_DETAILS'}});await f.c.init();a.equal(await f.c.submit({email:USER.email,password:'fictional-password'}),false);
 a.equal(f.c.getState().message,'계정 서비스를 확인 중이에요. 잠시 뒤 다시 시도해 주세요.');a.doesNotMatch(f.c.getState().message,/메일|인터넷|PRIVATE/);
});
test('Only a classified SDK network failure receives internet guidance; retryable HTTP server errors do not',async()=>{
 for(const [status,internet]of [[0,true],[503,false]]){const f=fixture({loginError:{name:'AuthRetryableFetchError',status,message:'PRIVATE_RAW_MESSAGE'}});await f.c.init();await f.c.submit({email:USER.email,password:'fictional-password'});a.equal(f.c.getState().message.includes('인터넷'),internet);a.doesNotMatch(f.c.getState().message,/PRIVATE/);}
});
test('Unknown and account-existence error messages are not reflected or presented as network trouble',async()=>{
 let baseline;for(const code of ['unknown_error','user_already_exists','email_exists']){const f=fixture({signupError:{code,status:422,message:'fictional@example.invalid already exists PRIVATE_TOKEN'}});await f.c.init();f.c.setMode('signup');await f.c.submit({email:USER.email,password:'fictional-password'});const message=f.c.getState().message;baseline=baseline||message;a.equal(message,baseline);a.doesNotMatch(message,/인터넷|fictional|exists|PRIVATE|이미 가입|없는 계정/);}
});
test('Repeated submission while a sign-in is pending makes only one auth request',async()=>{
 let release;const gate=new Promise(resolve=>release=resolve),f=fixture({gate});await f.c.init();const first=f.c.submit({email:USER.email,password:'fictional-password'});
 a.equal(f.c.getState().busy,true);a.equal(await f.c.submit({email:USER.email,password:'fictional-password'}),false);a.equal(f.calls.filter(c=>c.name==='signInWithPassword').length,1);release();await first;a.equal(f.c.getState().busy,false);
});
test('Signup awaiting email confirmation never claims the user is logged in',async()=>{
 const f=fixture();await f.c.init();f.c.setMode('signup');a.equal(await f.c.submit({email:USER.email,password:'long-fictional-password'}),true);a.equal(f.c.getState().user,null);a.match(f.c.getState().message,/가입 확인 메일/);
 a.equal(f.calls.find(c=>c.name==='signUp').data.options.emailRedirectTo,URL_NOW);
});
test('Signup with an actual server session is verified before admission',async()=>{
 const f=fixture({signupSession:true});await f.c.init();f.c.setMode('signup');await f.c.submit({email:USER.email,password:'long-fictional-password'});a.equal(f.c.getState().user.id,USER.id);a.ok(f.calls.some(c=>c.name==='getUser'));
});
test('Email and signup password validation prevents invalid auth submissions',async()=>{
 const f=fixture();await f.c.init();a.equal(await f.c.submit({email:'not-an-email',password:'password'}),false);f.c.setMode('signup');a.equal(await f.c.submit({email:USER.email,password:'short'}),false);a.equal(f.calls.filter(c=>['signUp','signInWithPassword'].includes(c.name)).length,0);
});
test('A stored session restores only after server verification; an expired or mismatched session does not',async()=>{
 const valid=fixture({session:SESSION});await valid.c.init();a.equal(valid.c.getState().user.id,USER.id);
 const expired=fixture({session:SESSION,verifyError:{code:'bad_jwt'}});await expired.c.init();a.equal(expired.c.getState().user,null);
 const forged=fixture({session:SESSION,verified:{...USER,id:'different-user'}});await forged.c.init();a.equal(forged.c.getState().user,null);
});
test('Logout is local to this device and leaves unrelated local records untouched',async()=>{
 const records={school:'ORIGINAL_SCHOOL',playground:'ORIGINAL_GAME'},before=JSON.stringify(records),f=fixture({session:SESSION});await f.c.init();a.equal(await f.c.signOut(),true);a.equal(f.c.getState().user,null);a.equal(f.calls.find(c=>c.name==='signOut').data.scope,'local');a.equal(JSON.stringify(records),before);
 a.doesNotMatch(fs.readFileSync(path.join(__dirname,'../assets/account.js'),'utf8'),/localStorage\.(?:clear|removeItem|setItem)|dokdo-island-play-v1|dokdo-korea-school-cinematic-v1/);
});
test('Failed logout never reports successful logout or discards the verified account display',async()=>{
 const f=fixture({session:SESSION,logoutError:{code:'network'}});await f.c.init();a.equal(await f.c.signOut(),false);a.equal(f.c.getState().user.id,USER.id);a.match(f.c.getState().message,/못했습니다/);
});
test('Forgot-password uses only email, the registered recovery redirect and a non-enumerating response',async()=>{
 const f=fixture();await f.c.init();f.c.setMode('forgot');a.equal(await f.c.submit({email:USER.email}),true);a.equal(f.calls.find(c=>c.name==='resetPasswordForEmail').data.redirectTo,URL_NOW+'?flow=recovery');a.equal(f.c.getState().user,null);a.match(f.c.getState().message,/보낼 수 있으면/);
});
test('Recovery requires a verified session and updates a real user before reporting success',async()=>{
 const f=fixture({session:SESSION,url:URL_NOW+'?flow=recovery',recoveryEventOnSubscribe:true});await f.c.init();a.equal(f.c.getState().mode,'recovery');a.equal(await f.c.submit({password:'new-fictional-password'}),true);a.equal(f.calls.find(c=>c.name==='updateUser').data.password,'new-fictional-password');a.equal(f.c.getState().mode,'login');a.match(f.c.getState().message,/바꿨어요/);
 const invalid=fixture({url:URL_NOW+'?flow=recovery'});await invalid.c.init();a.equal(await invalid.c.submit({password:'new-fictional-password'}),false);a.equal(invalid.calls.filter(c=>c.name==='updateUser').length,0);
});
test('A recovery URL hint alone cannot authorise changing a persisted account password',async()=>{
 for(const suffix of ['?flow=recovery','#type=recovery']){const f=fixture({session:SESSION,url:URL_NOW+suffix});await f.c.init();a.equal(f.c.getState().mode,'login');a.equal(await f.c.submit({password:'new-fictional-password'}),false);a.equal(f.calls.filter(c=>c.name==='updateUser').length,0);}
});
test('Out-of-order auth verification and stale failures never clear or invalidate the latest account',async()=>{
 for(const staleFirst of [true,false]){
  const requests=[],other={...USER,id:'00000000-0000-0000-0000-000000000002'},f=fixture({getUserResponse:()=>new Promise((resolve,reject)=>requests.push({resolve,reject}))});await f.c.init();
  f.emit('SIGNED_IN',SESSION);await flush();f.emit('SIGNED_IN',{user:other});await flush();a.equal(requests.length,2);
  if(staleFirst){requests[0].reject(Error('stale network failure'));await flush();requests[1].resolve({data:{user:other},error:null});}
  else{requests[1].resolve({data:{user:other},error:null});await flush();requests[0].resolve({data:{user:USER},error:null});}
  await flush();await flush();a.equal(f.c.getState().user.id,other.id);a.equal(f.c.getState().error,false);
 }
});
test('PASSWORD_RECOVERY and SIGNED_OUT events update the view outside the synchronous SDK callback',async()=>{
 const f=fixture();await f.c.init();f.emit('PASSWORD_RECOVERY',SESSION);await flush();await flush();a.equal(f.c.getState().mode,'recovery');a.equal(f.c.getState().user.id,USER.id);
 f.emit('SIGNED_OUT',null);await flush();a.equal(f.c.getState().user,null);f.c.dispose();a.ok(f.calls.some(c=>c.name==='unsubscribe'));
});
test('Login and signup share exactly two fields; disconnected HTML starts hidden and disabled',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../account.html'),'utf8');a.equal((html.match(/<form id="account-form">([\s\S]*?)<\/form>/)[1].match(/<input\s/g)||[]).length,2);a.match(html,/<input[^>]*type="email"/);a.match(html,/<input[^>]*type="password"/);a.match(html,/<section id="account-controls" hidden/);a.match(html,/<fieldset id="account-fields" disabled/);
});
test('DOM binding keeps the unconnected preparation page non-interactive',async()=>{
 const nodes={};const doc={getElementById(id){return nodes[id]||(nodes[id]={hidden:false,disabled:false,value:'',dataset:{},setAttribute(k,v){this[k]=v;},focus(){},reportValidity(){return true;}});}};
 const root={document:doc,location:{href:URL_NOW},DOKDO_AUTH_CONFIG:{enabled:false},addEventListener(){}};const c=mount(root);await flush();a.equal(nodes['account-controls'].hidden,true);a.equal(nodes['account-fields'].disabled,true);a.equal(nodes['mode-login'].disabled,true);a.equal(c.getState().user,null);
});
test('Post-login destinations have a closed same-site allowlist',()=>{
 a.equal(returnPath(URL_NOW+'?next=games.html'),'games.html');a.equal(returnPath(URL_NOW+'?next=./'),'./');
 for(const next of ['https://evil.example','//evil.example','/other-page','../','games.html?redirect=evil','javascript:alert(1)','./games.html'])a.equal(returnPath(URL_NOW+'?next='+encodeURIComponent(next)),'./');
});
function bindFixture(options={}){
 const f=fixture(options),nodes={},assigned=[],listeners={};
 const doc={getElementById(id){return nodes[id]||(nodes[id]={hidden:false,disabled:false,value:'',dataset:{},setAttribute(k,v){this[k]=v;},focus(){},reportValidity(){return true;}});}};
 const root={document:doc,location:{href:options.url||URL_NOW+'?next=games.html',assign:path=>assigned.push(path)},DOKDO_AUTH_CONFIG:CONFIG,supabase:f.sdk,DokdoRecordsUI:options.recordsUI,addEventListener:(type,fn)=>listeners[type]=fn};
 const c=mount(root);return {...f,c,nodes,assigned,listeners};
}
test('The real form binding returns to the allowed destination only after verified sign-in',async()=>{
 const f=bindFixture();await flush();f.nodes['account-email'].value=USER.email;f.nodes['account-password'].value='fictional-password';
 await f.nodes['account-form'].onsubmit({preventDefault(){}});a.deepEqual(f.assigned,['games.html']);a.equal(f.nodes['account-password'].value,'');
});
test('Form failures and email-confirmation-pending signup cannot redirect as a successful login',async()=>{
 for(const signup of [false,true]){const f=bindFixture(signup?{}:{loginError:{code:'invalid_credentials'}});await flush();if(signup)f.c.setMode('signup');f.nodes['account-email'].value=USER.email;f.nodes['account-password'].value='fictional-password';await f.nodes['account-form'].onsubmit({preventDefault(){}});a.deepEqual(f.assigned,[]);a.equal(f.c.getState().user,null);}
});
test('The account entry utility contains no SDK initialization or student-record access',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../assets/account-entry.js'),'utf8');a.doesNotMatch(source,/createClient|localStorage|sessionStorage|fetch\s*\(/);
 const game=fs.readFileSync(path.join(__dirname,'../games.html'),'utf8');a.match(game,/id="game-account-link" href="\.\/account\.html\?next=games\.html"/);
 const account=fs.readFileSync(path.join(__dirname,'../account.html'),'utf8');a.match(account,/connect-src 'self' https:\/\/cqlvhrodebmhxbrhlmzu\.supabase\.co/);a.doesNotMatch(account,/https:\/\/\*\.supabase\.co|assets\/app\.js|assets\/games\.js/);
});
test('Portable preview account entry opens the operating account in a safe new tab; live entry stays relative',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../assets/account-entry.js'),'utf8');
 for(const mode of ['preview','live',null]){
  const link={setAttribute(){}},doc={documentElement:{lang:'ko'},querySelector:()=>mode?{content:mode}:null,getElementById:id=>id==='account-link'?link:null,addEventListener(){}};
  require('node:vm').runInNewContext(source,{document:doc});
  if(mode==='preview'){a.equal(link.href,'https://dokdo-school-v2.vercel.app/dokdo-next/account.html?next=.%2F');a.equal(link.target,'_blank');a.equal(link.rel,'noopener noreferrer');}
  else a.equal(link.href,'./account.html?next=.%2F');
 }
});
test('The vendored fixed SDK and license match the recorded hashes and HTML integrity attribute',()=>{
 const meta=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/vendor/supabase-VENDOR.json'),'utf8'));a.equal(meta.version,'2.118.0');
 for(const [name,hash]of Object.entries(meta.files))a.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../assets/vendor',name))).digest('hex'),hash);
 const bytes=fs.readFileSync(path.join(__dirname,'../assets/vendor/supabase-2.118.0.js')),sri='sha384-'+crypto.createHash('sha384').update(bytes).digest('base64');a.equal(meta.script_integrity,sri);a.ok(fs.readFileSync(path.join(__dirname,'../account.html'),'utf8').includes('integrity="'+sri+'"'));
});

test('Private record UI initialization failure cannot stop the existing login controller',async()=>{const f=bindFixture({recordsUI:{mount(){throw Object.assign(Error('storage blocked'),{name:'SecurityError'});}}});await flush();a.equal(f.c.getState().ready,true);a.equal(f.nodes['record-local-error'].hidden,false);f.nodes['account-email'].value=USER.email;f.nodes['account-password'].value='fictional-password';await f.nodes['account-form'].onsubmit({preventDefault(){}});a.deepEqual(f.assigned,['games.html']);});
