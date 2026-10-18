/* Auth only. No school/game storage is read, changed, claimed or synchronised. */
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
   return {url:project.origin,key:config.publishableKey,redirect:redirect.href};
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
 function returnPath(currentUrl){
  try{const next=new URL(currentUrl).searchParams.get('next');return next==='games.html'?'games.html':'./';}catch(e){return './';}
 }
 function createController({config,sdk,currentUrl,onChange=()=>{},defer=fn=>setTimeout(fn,0)}){
  const settings=validateConfig(config,currentUrl);let url;try{url=new URL(currentUrl);}catch(e){url=new URL('https://invalid.example/');}
  const recoveryHint=url.searchParams.get('flow')==='recovery'||new URLSearchParams(url.hash.slice(1)).get('type')==='recovery';
  let recoveryWanted=false; // Only an SDK PASSWORD_RECOVERY event enables a password change.
  const state={ready:false,busy:false,user:null,mode:'login',message:'계정 서비스를 연결하고 있어요. 연결이 끝날 때까지 이메일과 비밀번호를 입력받지 않습니다.',error:false};
  let client=null,subscription=null,revision=0,pendingEvent=null,disposed=false;
  const emit=()=>{if(!disposed)onChange({...state,user:state.user?{...state.user}:null});};
  const notice=(message,error=false)=>{state.message=message;state.error=error;emit();};
  const userOut=()=>{revision++;state.user=null;if(state.mode==='recovery')state.mode='forgot';};
  async function verify(session){
   const token=++revision;
   if(!session)return {status:'none',token};
   let response;try{response=await client.auth.getUser();}catch(error){return {status:'error',token,error};}
   if(disposed||token!==revision)return {status:'stale',token};
   const {data,error}=response;
   if(error||!data?.user?.id||data.user.id!==session.user?.id)return {status:'error',token,error:error||Error('Unverified session')};
   state.user={id:data.user.id,email:data.user.email||''};
   if(recoveryWanted)state.mode='recovery';
   return {status:'verified',token};
  }
  async function restore(session){
   if(disposed)return;
   const result=await verify(session);
   // A late response, including an error, must not clear a newer verified account.
   if(disposed||result.token!==revision||result.status==='stale')return;
   if(result.status==='verified')notice(recoveryWanted?'새 비밀번호를 정해 주세요.':recoveryHint?'재설정 메일 링크를 확인하지 못했습니다. 메일의 링크를 다시 열어 주세요.':'로그인 상태를 확인했습니다.',recoveryHint&&!recoveryWanted);
   else if(result.status==='error'){userOut();notice('로그인 상태를 확인하지 못했습니다. 다시 로그인해 주세요.',true);}
   else{userOut();recoveryWanted=false;notice(recoveryHint?'재설정 링크를 확인하지 못했습니다. 메일을 다시 요청해 주세요.':'이메일 아이디로 로그인해 주세요.',recoveryHint);}
  }
  function drain(){const pending=pendingEvent;pendingEvent=null;if(pending)defer(()=>restore(pending.session));}
  async function init(){
   if(disposed||state.ready||state.busy)return false;
   if(!settings){emit();return false;}
   if(typeof sdk?.createClient!=='function'){notice('계정 화면을 불러오지 못했어요. 새로고침한 뒤 다시 이용해 주세요.',true);return false;}
   state.busy=true;emit();
   try{
    client=sdk.createClient(settings.url,settings.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit',storageKey:'dokdo-account-session-v1'}});
    const watcher=client.auth.onAuthStateChange((event,session)=>{
     if(disposed||event==='INITIAL_SESSION')return;
     if(event==='PASSWORD_RECOVERY')recoveryWanted=true;
     // Keep SDK calls outside its synchronous auth callback to avoid a lock deadlock.
     if(state.busy){pendingEvent={event,session};return;}
     defer(()=>restore(session));
    });subscription=watcher?.data?.subscription;
    const {data,error}=await client.auth.getSession();if(error)throw error;
    await restore(data?.session||null);state.ready=true;return true;
   }catch(e){userOut();notice('로그인 서비스에 연결하지 못했습니다. 입력은 잠시 닫아 두었습니다.',true);return false;}
   finally{state.busy=false;emit();drain();}
  }
  function setMode(mode){
   if(!state.ready||state.busy||state.user||!['login','signup','forgot'].includes(mode))return false;
   state.mode=mode;notice(mode==='signup'?'이메일 아이디와 8자 이상의 비밀번호로 가입해 주세요.':mode==='forgot'?'가입한 이메일 주소로 재설정 링크를 받아요.':'이메일 아이디와 비밀번호를 입력해 주세요.');return true;
  }
  async function submit({email='',password=''}={}){
   if(disposed||!state.ready||state.busy)return false;
   const mode=state.mode;email=email.trim();
   if(mode==='recovery'){
    if(!recoveryWanted||!state.user){notice('재설정 메일 링크를 먼저 열어 주세요.',true);return false;}
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
     const {data,error}=await client.auth.updateUser({password});if(error)throw error;
     if(!data?.user?.id||data.user.id!==state.user.id)throw Error('Password change not confirmed');
     recoveryWanted=false;state.mode='login';notice('비밀번호를 바꿨어요.');return true;
    }
    const result=mode==='signup'?await client.auth.signUp({email,password,options:{emailRedirectTo:settings.redirect}}):await client.auth.signInWithPassword({email,password});
    if(result.error)throw result.error;
    if(mode==='signup'&&!result.data?.session){notice('가입 확인 메일을 확인해 주세요. 이미 가입하셨다면 로그인해 주세요.');return true;}
    if(!result.data?.session)throw Error('Sign-in not verified');
    const checked=await verify(result.data.session);if(disposed||checked.token!==revision||checked.status==='stale')return false;
    if(checked.status!=='verified')throw checked.error||Error('Sign-in not verified');
    notice('로그인했습니다. 이 기기의 학습·게임 기록은 그대로 남아 있어요.');return true;
   }catch(e){notice(messageFor(e,mode),true);return false;}
   finally{state.busy=false;emit();drain();}
  }
  async function signOut(){
   if(disposed||!state.ready||state.busy||!state.user)return false;
   state.busy=true;notice('로그아웃하고 있어요.');
   try{const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;userOut();recoveryWanted=false;state.mode='login';notice('로그아웃했습니다. 이 기기의 학습·게임 기록은 남아 있습니다.');return true;}
   catch(e){notice('로그아웃하지 못했습니다. 다시 눌러 주세요.',true);return false;}
   finally{state.busy=false;emit();drain();}
  }
  function dispose(){disposed=true;revision++;subscription?.unsubscribe();}
  emit();return {init,setMode,submit,signOut,dispose,getState:()=>({...state,user:state.user?{...state.user}:null})};
 }
 function mount(root){
  const d=root.document,$=id=>d.getElementById(id),form=$('account-form');
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
   $('account-email-display').textContent=state.user?.email||'이메일 확인됨';
   if($('account-continue')){$('account-continue').href=returnPath(root.location.href);$('account-continue').textContent=returnPath(root.location.href)==='games.html'?'독도 놀이터로 돌아가기':'독도 스쿨로 돌아가기';}
  };
  const controller=createController({config:root.DOKDO_AUTH_CONFIG,sdk:root.supabase,currentUrl:root.location.href,onChange:view});
  for(const mode of ['login','signup','forgot'])$('mode-'+mode).onclick=()=>{if(controller.setMode(mode)){$('account-password').value='';$('account-email').focus();}};
  $('mode-back').onclick=()=>controller.setMode('login');
  form.onsubmit=async event=>{event.preventDefault();if(!form.reportValidity())return;const before=controller.getState();const ok=await controller.submit({email:$('account-email').value,password:$('account-password').value});$('account-password').value='';if(ok&&['login','signup'].includes(before.mode)&&controller.getState().user)root.location.assign(returnPath(root.location.href));};
  $('account-signout').onclick=()=>controller.signOut();root.addEventListener('pagehide',()=>controller.dispose(),{once:true});
  root.addEventListener('pageshow',event=>{if(event.persisted)root.location.reload();});
  controller.init();return controller;
 }
 return {createController,validateConfig,returnPath,mount};
});
