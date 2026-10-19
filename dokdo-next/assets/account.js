/* Auth controller. Private record UI receives only server-verified identities. */
(function(root,factory){
 'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else{root.DokdoAccount=api;if(root.document?.getElementById('account-form'))api.mount(root);}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function validateConfig(config,currentUrl){
  if(!config||config.enabled!==true)return null;
  try{
   const project=new URL(config.supabaseUrl),redirect=new URL(config.redirectUrl),current=new URL(currentUrl);
   if(project.protocol!=='https:'||!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(project.href))return null;
   if(!/^sb_publishable_[A-Za-z0-9_-]{10,}$/.test(config.publishableKey||''))return null;
   const local=redirect.protocol==='http:'&&['localhost','127.0.0.1'].includes(redirect.hostname);
   if(redirect.protocol!=='https:'&&!local)return null;
   if(redirect.origin!==current.origin||redirect.pathname!==current.pathname||redirect.search||redirect.hash||redirect.username||redirect.password)return null;
   return {url:project.origin,key:config.publishableKey,redirect:redirect.href,kakaoEnabled:config.kakaoEnabled===true,secureSessions:config.kakaoEnabled===true||config.privateRecordsEnabled===true};
  }catch(e){return null;}
 }
 function messageFor(error,mode){
  const code=error?.code||'';
  const messages={email_not_confirmed:'가입 확인 메일을 먼저 열어 주세요.',weak_password:'더 긴 비밀번호로 다시 정해 주세요.',over_email_send_rate_limit:'메일 요청이 많습니다. 잠시 뒤 다시 해 주세요.',over_request_rate_limit:'요청이 많습니다. 잠시 뒤 다시 해 주세요.',otp_expired:'메일 링크가 만료됐습니다. 재설정 메일을 다시 요청해 주세요.'};
  if(code==='invalid_credentials')return '이메일 아이디와 비밀번호를 확인해 주세요.';
  // The provider's message may contain private details. Classify by code/status only.
  if(code==='unexpected_failure'&&error.status>=500&&error.status<600){
   if(mode==='signup')return '가입 확인 메일을 보내지 못했어요. 메일 연결을 확인 중이니 잠시 뒤 다시 시도해 주세요.';
   if(mode==='forgot')return '비밀번호 재설정 메일을 보내지 못했어요. 메일 연결을 확인 중이니 잠시 뒤 다시 시도해 주세요.';
  }
  if(error?.status>=500&&error.status<600)return '계정 서비스를 확인 중이에요. 잠시 뒤 다시 시도해 주세요.';
  if(error?.name==='AuthRetryableFetchError'&&error.status===0)return '인터넷 연결을 확인하고 다시 시도해 주세요.';
  return messages[code]||'지금은 요청을 완료하지 못했어요. 잠시 뒤 다시 시도해 주세요.';
 }
 function passwordTransport(config,fetcher){
  return async(token,password)=>{
   const project=new URL(config.supabaseUrl);if(typeof fetcher!=='function'||!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(project.href))throw Error('Password change unavailable');
   const response=await fetcher(project.origin+'/auth/v1/user',{method:'PUT',credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',headers:{apikey:config.publishableKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({password})});
   if(!response.ok)throw Error('Password change unavailable');return response.json();
  };
 }
 function returnPath(currentUrl){
  try{const next=new URL(currentUrl).searchParams.get('next');return next==='games.html'?'games.html':'./';}catch(e){return './';}
 }
 function kakaoReturnUrl(settings,currentUrl){const u=new URL(settings.redirect);u.searchParams.set('oauth','kakao');u.searchParams.set('next',returnPath(currentUrl));return u.href;}
 function validKakaoUrl(value,settings,currentUrl){
  try{const u=new URL(value);return u.protocol==='https:'&&u.origin===settings.url&&u.pathname==='/auth/v1/authorize'&&!u.username&&!u.password&&!u.hash&&u.searchParams.getAll('provider').length===1&&u.searchParams.get('provider')==='kakao'&&u.searchParams.getAll('redirect_to').length===1&&u.searchParams.get('redirect_to')===kakaoReturnUrl(settings,currentUrl)&&u.searchParams.getAll('scope').length===1&&u.searchParams.get('scope')==='profile_nickname'&&u.searchParams.getAll('code_challenge').length===1&&/^[A-Za-z0-9_-]{43}$/.test(u.searchParams.get('code_challenge')||'')&&u.searchParams.getAll('code_challenge_method').length===1&&u.searchParams.get('code_challenge_method')==='s256';}catch(e){return false;}
 }
 function sessionCleanup(storage,locks){
  const key='dokdo-account-session-v2',accepted=key+'-accepted-user';
  const lock=(name,timeout,fn)=>locks.request(name,{mode:'exclusive'},fn);
  const clearAccepted=()=>{storage.removeItem(accepted);if(storage.getItem(accepted)!==null)throw Error('Session acceptance cleanup unavailable');};
  return {lock,prepare(){if(typeof locks?.request!=='function'||!storage)throw Error('Session lock unavailable');storage.getItem(key);storage.getItem(accepted);},
   begin:()=>lock('lock:'+key,0,clearAccepted),
   authorize:(session,establish,isCurrent)=>lock('lock:'+key,0,()=>{const saved=JSON.parse(storage.getItem(key)||'null');if(!isCurrent()||!saved?.access_token||saved.access_token!==session?.access_token||saved.user?.id!==session?.user?.id)return false;if(establish){storage.setItem(accepted,session.user.id);if(storage.getItem(accepted)!==session.user.id)throw Error('Session acceptance unavailable');}return storage.getItem(accepted)===session.user.id;}),
   forget:id=>lock('lock:'+key,0,()=>{if(storage.getItem(accepted)===id)clearAccepted();}),async discard(session){
   if(!session?.access_token)return;
   // Explicitly shared with the pinned Auth SDK: never remove a newer account's session.
   await locks.request('lock:'+key,{mode:'exclusive'},()=>{const raw=storage.getItem(key);if(!raw)return;const saved=JSON.parse(raw);if(saved.access_token!==session.access_token)return;if(session.user?.id&&storage.getItem(accepted)===session.user.id)clearAccepted();storage.removeItem(key);if(storage.getItem(key)!==null)throw Error('Session cleanup unavailable');});
  }};
 }
 function createController({config,sdk,currentUrl,onChange=()=>{},defer=fn=>setTimeout(fn,0),navigate=()=>{},onAccount=()=>{},consumeCallback=()=>{},cleanup=null,updatePassword=null}){
  const settings=validateConfig(config,currentUrl);let url;try{url=new URL(currentUrl);}catch(e){url=new URL('https://invalid.example/');}
  const recoveryHint=url.searchParams.get('flow')==='recovery'||new URLSearchParams(url.hash.slice(1)).get('type')==='recovery';
  const fragment=new URLSearchParams(url.hash.slice(1));
  const oauthError=['error','error_code','error_description'].some(key=>url.searchParams.has(key)||fragment.has(key));
  const expiredState=[url.searchParams,fragment].some(params=>params.get('error_code')==='bad_oauth_state');
  const oauthMessage=expiredState?(settings?.kakaoEnabled?'카카오 로그인 요청 시간이 지났어요. 카카오 로그인 버튼을 눌러 새로 시작해 주세요.':'카카오 로그인 요청 시간이 지났어요. 지금은 이메일로 로그인해 주세요.'):'카카오 로그인을 마치지 못했어요. 다시 시도하거나 이메일로 로그인해 주세요.';
  const oauthHint=url.searchParams.get('oauth')==='kakao';
  const secure=!!settings?.secureSessions,code=url.searchParams.get('code');
  const tokenCallback=secure&&['access_token','refresh_token','provider_token','provider_refresh_token'].some(key=>fragment.has(key)||url.searchParams.has(key));
  const malformedCode=secure&&url.searchParams.has('code')&&(url.searchParams.getAll('code').length!==1||!code||code.length>4096);
  let callbackRejected=!!(secure&&(tokenCallback||oauthError||malformedCode)),exchangedSession=null,exchangePending=false,exchangeEvents=[],exchangeOverflow=false,recoveryConsumed=false;
  let recoveryWanted=false,recoveryAuthority=null; // Recovery is scoped to one verified SDK identity/session.
  const state={ready:false,busy:false,user:null,mode:'login',oauthComplete:false,kakaoEnabled:!!settings?.kakaoEnabled&&!recoveryHint,message:'계정 서비스를 연결하고 있어요. 연결이 끝날 때까지 이메일과 비밀번호를 입력받지 않습니다.',error:false};
  let client=null,subscription=null,revision=0,pendingEvent=null,disposed=false;
  const emit=()=>{if(!disposed)onChange({...state,user:state.user?{...state.user}:null});};
  const notice=(message,error=false)=>{state.message=message;state.error=error;emit();};
  const accountChanged=(user)=>{try{onAccount(user, user?client:null);}catch(e){/* Record UI must never interrupt authentication. */}};
  const recoveryMatches=session=>!!recoveryAuthority&&session?.user?.id===recoveryAuthority.id&&session?.access_token===recoveryAuthority.token;
  const clearRecovery=()=>{recoveryWanted=false;recoveryAuthority=null;if(state.mode==='recovery')state.mode='login';};
  const acceptRecovery=session=>{if(!session?.user?.id||!session.access_token){clearRecovery();return;}recoveryAuthority={id:session.user.id,token:session.access_token};recoveryWanted=true;};
  const userOut=()=>{accountChanged(null);revision++;state.user=null;state.oauthComplete=false;if(state.mode==='recovery')state.mode='forgot';clearRecovery();};
  async function verify(session,establish=false){
   const token=++revision;
   if(!session)return {status:'none',token};
   let response;try{response=await client.auth.getUser(session.access_token);}catch(error){return {status:'error',token,error};}
   if(disposed||token!==revision)return {status:'stale',token};
   const {data,error}=response;
   if(error||!data?.user?.id||data.user.id!==session.user?.id)return {status:'error',token,error:error||Error('Unverified session')};
   if(secure&&cleanup){
    try{if(!await cleanup.authorize(session,establish,()=>!disposed&&token===revision))throw Error('Session not accepted');}catch(error){return {status:'error',token,error};}
    if(disposed||token!==revision)return {status:'stale',token};
   }
   if(recoveryWanted&&!recoveryMatches(session))clearRecovery();
   state.user={id:data.user.id,email:data.user.email||'',provider:data.user.app_metadata?.provider==='kakao'?'kakao':'email'};
   accountChanged({...state.user});
   state.oauthComplete=!!(secure&&exchangedSession&&session.access_token===exchangedSession.access_token&&oauthHint&&!recoveryWanted&&!recoveryHint&&!oauthError&&!callbackRejected);
   if(recoveryWanted)state.mode='recovery';
   return {status:'verified',token};
  }
  async function restore(session,establish=false){
   if(disposed)return;
   if(callbackRejected){userOut();notice(oauthError?oauthMessage:'로그인 링크를 확인하지 못했어요. 이메일로 로그인하거나 이 브라우저에서 새 링크를 요청해 주세요.',true);return;}
   const result=await verify(session,establish);
   // A late response, including an error, must not clear a newer verified account.
   if(disposed||result.token!==revision||result.status==='stale')return;
   if(result.status==='verified')notice(recoveryWanted?'새 비밀번호를 정해 주세요.':oauthError?oauthMessage:recoveryHint&&!recoveryConsumed?'재설정 메일 링크를 확인하지 못했습니다. 메일의 링크를 다시 열어 주세요.':'로그인 상태를 확인했습니다.',(recoveryHint&&!recoveryWanted&&!recoveryConsumed)||oauthError);
   else if(result.status==='error'){userOut();notice('로그인 상태를 확인하지 못했습니다. 다시 로그인해 주세요.',true);}
   else{userOut();recoveryWanted=false;notice(oauthError?oauthMessage:recoveryHint?'재설정 링크를 확인하지 못했습니다. 메일을 다시 요청해 주세요.':'이메일 아이디로 로그인해 주세요.',recoveryHint||oauthError);}
  }
  function drain(){const pending=pendingEvent;pendingEvent=null;if(pending?.event==='PASSWORD_RECOVERY'&&state.mode==='recovery'&&state.user?.id===pending.session?.user?.id&&recoveryMatches(pending.session))return;if(pending)defer(()=>restore(pending.session));}
  async function init(){
   if(disposed||state.ready||state.busy)return false;
   if(!settings){emit();return false;}
   if(typeof sdk?.createClient!=='function'){notice('계정 화면을 불러오지 못했어요. 새로고침한 뒤 다시 이용해 주세요.',true);return false;}
   state.busy=true;emit();
   try{
    if(secure)cleanup?.prepare();
    if(secure&&code&&!callbackRejected)await cleanup?.begin();
    client=sdk.createClient(settings.url,settings.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:secure?false:!oauthError,flowType:secure?'pkce':'implicit',storageKey:secure?'dokdo-account-session-v2':'dokdo-account-session-v1',...(secure&&cleanup?{lock:cleanup.lock}:{})}});
    const watcher=client.auth.onAuthStateChange((event,session)=>{
     if(disposed||event==='INITIAL_SESSION')return;
     // Invalidate in-flight verification immediately, before a queued restore.
     revision++;state.oauthComplete=false;accountChanged(null);
     if(exchangePending){if(exchangeEvents.length<50)exchangeEvents.push({event,id:session?.user?.id,token:session?.access_token});else exchangeOverflow=true;}
     if(event==='PASSWORD_RECOVERY')acceptRecovery(session);else if(event==='SIGNED_OUT'||recoveryAuthority&&!recoveryMatches(session))clearRecovery();
     // Keep SDK calls outside its synchronous auth callback to avoid a lock deadlock.
     if(state.busy){pendingEvent={event,session};return;}
     defer(()=>restore(session));
    });subscription=watcher?.data?.subscription;
    if(oauthError||(secure&&(url.searchParams.has('code')||tokenCallback)))try{consumeCallback();}catch(ignore){}
    if(callbackRejected){await restore(null);state.ready=true;return true;}
    if(secure&&code){
     exchangePending=true;exchangeEvents=[];exchangeOverflow=false;
     let exchanged;try{exchanged=await client.auth.exchangeCodeForSession(code);}catch(e){exchangePending=false;exchangeEvents=[];callbackRejected=true;await restore(null);state.ready=true;return true;}
     exchangePending=false;const interrupted=exchangeOverflow||exchangeEvents.some(e=>e.event==='SIGNED_OUT'||e.id!==exchanged.data?.session?.user?.id||e.token!==exchanged.data?.session?.access_token);exchangeEvents=[];
     if(disposed){await cleanup?.discard(exchanged.data?.session);return false;}
     if(interrupted){callbackRejected=true;await cleanup?.discard(exchanged.data?.session);await restore(null);state.ready=true;return true;}
     if(pendingEvent&&(!pendingEvent.session||pendingEvent.session.user?.id!==exchanged.data?.session?.user?.id)){callbackRejected=true;await cleanup?.discard(exchanged.data?.session);await restore(null);state.ready=true;return true;}
     if(exchanged.error||!exchanged.data?.session||exchanged.data.user?.id!==exchanged.data.session.user?.id){callbackRejected=true;await cleanup?.discard(exchanged.data?.session);await restore(null);state.ready=true;return true;}
     exchangedSession=exchanged.data.session;
     if(exchanged.data.redirectType==='recovery')acceptRecovery(exchangedSession);
     await restore(exchangedSession,true);if(!state.user||state.user.id!==exchangedSession.user.id){callbackRejected=true;await cleanup?.discard(exchangedSession);}state.ready=true;return true;
    }
    const {data,error}=await client.auth.getSession();if(error)throw error;
    await restore(data?.session||null);state.ready=true;return true;
   }catch(e){userOut();notice('로그인 서비스에 연결하지 못했습니다. 입력은 잠시 닫아 두었습니다.',true);return false;}
   finally{state.busy=false;emit();drain();}
  }
  function setMode(mode){
   if(!state.ready||state.busy||state.user||!['login','signup','forgot'].includes(mode))return false;
   state.mode=mode;notice(mode==='signup'?'이메일 아이디와 8자 이상의 비밀번호로 가입해 주세요.':mode==='forgot'?'가입한 이메일 주소로 재설정 링크를 받아요.':'이메일 아이디와 비밀번호를 입력해 주세요.');return true;
  }
  async function signInKakao(){
   if(disposed||!state.ready||state.busy||state.user||!settings.kakaoEnabled||recoveryWanted||recoveryHint||!['login','signup'].includes(state.mode))return false;
   const startingRevision=revision;state.busy=true;notice('카카오 로그인으로 이동하고 있어요.');let moved=false;
   try{
    const {data,error}=await client.auth.signInWithOAuth({provider:'kakao',options:{redirectTo:kakaoReturnUrl(settings,currentUrl),skipBrowserRedirect:true,queryParams:{scope:'profile_nickname'}}});
    if(disposed||revision!==startingRevision||pendingEvent)return false;if(error||!validKakaoUrl(data?.url,settings,currentUrl))throw Error('OAuth start unavailable');
    navigate(data.url);moved=true;return true;
   }catch(e){if(!disposed)notice('카카오 로그인을 열지 못했어요. 다시 시도하거나 이메일로 로그인해 주세요.',true);return false;}
   finally{if(!moved){state.busy=false;emit();drain();}}
  }
  async function submit({email='',password=''}={}){
   if(disposed||!state.ready||state.busy)return false;
   const mode=state.mode;email=email.trim();
   if(mode==='recovery'){
    if(!recoveryWanted||!recoveryAuthority||state.user?.id!==recoveryAuthority.id){notice('재설정 메일 링크를 먼저 열어 주세요.',true);return false;}
   }else if(state.user)return false;
   if(mode!=='recovery'&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)){notice('이메일 주소를 확인해 주세요.',true);return false;}
   if(mode!=='forgot'&&(!password||password.length>128||(['signup','recovery'].includes(mode)&&password.length<8))){notice(['signup','recovery'].includes(mode)?'비밀번호를 8자 이상으로 정해 주세요.':'비밀번호를 입력해 주세요.',true);return false;}
   state.busy=true;notice('확인하고 있어요.');
   try{
    if(mode==='forgot'){
     const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:settings.redirect+'?flow=recovery'});if(error)throw error;
     notice('입력한 주소로 메일을 보낼 수 있으면 재설정 안내를 보냈습니다. 메일함을 확인해 주세요.');return true;
    }
    if(mode==='recovery'){
     const authority=recoveryAuthority,started=revision;
     const current=()=>!disposed&&revision===started&&recoveryWanted&&recoveryAuthority===authority&&state.user?.id===authority.id;
     const reject=()=>{if(current()){clearRecovery();notice('재설정 메일 링크를 먼저 열어 주세요.',true);}return false;};
     try{
      const before=await client.auth.getSession();if(!current())return false;if(before.error||!recoveryMatches(before.data?.session))return reject();
      const proof=await client.auth.getUser(authority.token);if(!current())return false;if(proof.error||proof.data?.user?.id!==authority.id)return reject();
      const latest=await client.auth.getSession();if(!current())return false;if(latest.error||!recoveryMatches(latest.data?.session))return reject();
      if(typeof updatePassword!=='function')throw Error('Password change unavailable');
      // Never let an SDK reload of mutable storage choose the password mutation target.
      const updated=await updatePassword(authority.token,password);if(!current())return false;if(updated?.id!==authority.id)throw Error('Password change not confirmed');
      const after=await client.auth.getSession();if(!current())return false;if(after.error||!recoveryMatches(after.data?.session))return reject();
      clearRecovery();recoveryConsumed=true;state.mode='login';notice('비밀번호를 바꿨어요.');return true;
     }catch(e){if(current())notice(messageFor(e,mode),true);return false;}
    }
    const result=mode==='signup'?await client.auth.signUp({email,password,options:{emailRedirectTo:settings.redirect}}):await client.auth.signInWithPassword({email,password});
    if(result.error)throw result.error;
    if(mode==='signup'&&!result.data?.session){notice('가입 확인 메일을 확인해 주세요. 이미 가입하셨다면 로그인해 주세요.');return true;}
    if(!result.data?.session)throw Error('Sign-in not verified');
    callbackRejected=false;exchangedSession=null;
    const checked=await verify(result.data.session,true);if(disposed||checked.token!==revision||checked.status==='stale')return false;
    if(checked.status!=='verified')throw checked.error||Error('Sign-in not verified');
    notice('로그인했습니다. 이 기기의 학습·게임 기록은 그대로 남아 있어요.');return true;
   }catch(e){notice(messageFor(e,mode),true);return false;}
   finally{state.busy=false;emit();drain();}
  }
  async function signOut(){
   if(disposed||!state.ready||state.busy||!state.user)return false;
   state.busy=true;notice('로그아웃하고 있어요.');
   try{if(secure)await cleanup?.forget(state.user.id);const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;userOut();recoveryWanted=false;state.mode='login';notice('로그아웃했습니다. 이 기기의 학습·게임 기록은 남아 있습니다.');return true;}
   catch(e){notice('로그아웃하지 못했습니다. 다시 눌러 주세요.',true);return false;}
   finally{state.busy=false;emit();drain();}
  }
  function dispose(){clearRecovery();accountChanged(null);disposed=true;revision++;subscription?.unsubscribe();}
  emit();return {init,setMode,submit,signInKakao,signOut,dispose,getState:()=>({...state,user:state.user?{...state.user}:null})};
 }
 function mount(root){
  const d=root.document,$=id=>d.getElementById(id),form=$('account-form');
  let continued=false,records=null;try{records=root.DokdoRecordsUI?.mount(root);}catch(e){const warning=$('record-local-error');if(warning){warning.hidden=false;warning.textContent='기기 기록을 읽지 못했어요. 원본을 지우지 말고 기록 복구를 확인해 주세요.';}}
  const view=state=>{
   const recovery=state.mode==='recovery',forgot=state.mode==='forgot',signed=!!state.user&&!recovery;
   $('account-status').textContent=state.message;$('account-status').dataset.error=String(state.error);
   $('account-title').textContent=state.ready?(recovery?'비밀번호 다시 정하기':signed?'내 계정':forgot?'비밀번호 찾기':'독도 스쿨 입장'):'내 계정';
   $('connection-note').hidden=state.ready;$('account-controls').hidden=!state.ready||signed;$('signed-in').hidden=!state.ready||!signed;
   $('account-fields').disabled=!state.ready||state.busy;
   $('mode-buttons').hidden=recovery||forgot;$('email-field').hidden=recovery;$('account-email').disabled=recovery;
   $('password-field').hidden=forgot;$('account-password').disabled=forgot;$('account-password').required=!forgot;
   $('account-password').autocomplete=state.mode==='login'?'current-password':'new-password';
   $('password-label').textContent=recovery?'새 비밀번호':'비밀번호';$('password-hint').hidden=!['signup','recovery'].includes(state.mode);
   $('account-email').required=!recovery;
   $('account-submit').textContent=state.busy?'확인 중…':({login:'로그인',signup:'가입하기',forgot:'재설정 메일 받기',recovery:'새 비밀번호 저장'})[state.mode];
   for(const mode of ['login','signup']){$('mode-'+mode).disabled=!state.ready||state.busy;$('mode-'+mode).setAttribute('aria-pressed',String(state.mode===mode));}
   $('mode-forgot').hidden=recovery||forgot;$('mode-back').hidden=!forgot;
   for(const id of ['mode-forgot','mode-back','account-signout'])$(id).disabled=!state.ready||state.busy;
   $('account-email-display').textContent=state.user?.email||(state.user?.provider==='kakao'?'카카오 계정으로 로그인했어요.':'로그인한 계정');
   if($('kakao-signin')){$('kakao-option').hidden=!state.kakaoEnabled||recovery||forgot||signed;$('kakao-signin').disabled=!state.ready||state.busy;}
   if($('account-continue')){$('account-continue').href=returnPath(root.location.href);$('account-continue').textContent=returnPath(root.location.href)==='games.html'?'독도 놀이터로 돌아가기':'독도 스쿨로 돌아가기';}
   if(state.ready&&state.oauthComplete&&state.user&&!recovery&&!continued){continued=true;root.location.assign(returnPath(root.location.href));}
  };
  let cleanup;try{cleanup=sessionCleanup(root.localStorage,root.navigator.locks);}catch(e){cleanup={prepare(){throw Error('Session storage unavailable');}};}
  const controller=createController({updatePassword:passwordTransport(root.DOKDO_AUTH_CONFIG,root.fetch?.bind(root)),config:root.DOKDO_AUTH_CONFIG,sdk:root.supabase,currentUrl:root.location.href,onChange:view,cleanup,navigate:url=>root.location.assign(url),consumeCallback:()=>{const safe=new URL(root.location.href);safe.search='';safe.hash='';safe.searchParams.set('next',returnPath(root.location.href));root.history?.replaceState(null,'',safe.href);},onAccount:(user,client)=>{if(user)records?.connect(user,client);else records?.invalidate();}});
  if($('kakao-signin'))$('kakao-signin').onclick=()=>controller.signInKakao();
  for(const mode of ['login','signup','forgot'])$('mode-'+mode).onclick=()=>{if(controller.setMode(mode)){$('account-password').value='';$('account-email').focus();}};
  $('mode-back').onclick=()=>controller.setMode('login');
  form.onsubmit=async event=>{event.preventDefault();if(!form.reportValidity())return;const before=controller.getState();const ok=await controller.submit({email:$('account-email').value,password:$('account-password').value});$('account-password').value='';if(ok&&['login','signup'].includes(before.mode)&&controller.getState().user)root.location.assign(returnPath(root.location.href));};
  $('account-signout').onclick=()=>controller.signOut();root.addEventListener('pagehide',()=>controller.dispose(),{once:true});
  root.addEventListener('pageshow',event=>{if(event.persisted)root.location.reload();});
  root.DokdoLanguage?.mount(d.body);controller.init();return controller;
 }
 return {createController,passwordTransport,validateConfig,returnPath,kakaoReturnUrl,validKakaoUrl,sessionCleanup,mount};
});
