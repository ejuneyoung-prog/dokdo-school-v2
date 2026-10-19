/* Private display profile only. Never reads/writes learning/game records or public rankings. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DokdoAccountProfile=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const META='dokdo_school_profile_v1',CACHE='dokdo-account-profile-view-v1';
function normalize(input){
 const text=(v,max)=>{if(typeof v!=='string')throw Error('PROFILE_INVALID');const s=v.trim().normalize('NFC');if(s.length>max||/[\u0000-\u001f\u007f]/.test(s))throw Error('PROFILE_INVALID');return s;};
 const nickname=text(input?.nickname,40),country=text(input?.country??'',2).toUpperCase(),school=text(input?.school??'',60);
 if(!nickname||country&&!/^[A-Z]{2}$/.test(country))throw Error('PROFILE_INVALID');return{version:1,nickname,country,school};
}
function read(user){try{return user?.user_metadata?.[META]?.version===1?normalize(user.user_metadata[META]):null;}catch(e){return null;}}
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function transport(config,fetcher){return async(token,input)=>{const profile=normalize(input),url=new URL(config.supabaseUrl);if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url.href))throw Error('PROFILE_UNAVAILABLE');const r=await fetcher(url.origin+'/auth/v1/user',{method:'PUT',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',headers:{apikey:config.publishableKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({data:{[META]:profile}})});if(!r.ok)throw Error('PROFILE_UNAVAILABLE');return r.json();};}
function createController({putProfile,onChange=()=>{},onContinue=()=>{},cache=null}){
 let user=null,client=null,generation=0,requested=false,closed=false;
 const state={signed:false,loading:false,busy:false,profile:null,open:false,message:'',error:false};
 const emit=()=>onChange({...state,profile:state.profile?{...state.profile}:null});
 const current=(g,id)=>g===generation&&user?.id===id&&!!client;
 const clearCache=()=>{try{cache?.removeItem(CACHE);}catch(ignore){}};
 const remember=()=>{try{cache?.setItem(CACHE,JSON.stringify({version:1,uid:user.id,profile:state.profile}));}catch(ignore){}};
 function invalidate(){generation++;user=null;client=null;requested=false;closed=false;Object.assign(state,{signed:false,loading:false,busy:false,profile:null,open:false,message:'',error:false});clearCache();emit();}
 async function verified(g,id,c){const s=await c.auth.getSession();if(!current(g,id))throw Error('STALE');const session=s.data?.session;if(s.error||session?.user?.id!==id||!session.access_token)throw Error('AUTH_REQUIRED');const r=await c.auth.getUser(session.access_token);if(!current(g,id)||r.error||r.data?.user?.id!==id)throw Error('AUTH_REQUIRED');return{token:session.access_token,user:r.data.user};}
 function finish(){if(requested&&state.signed&&!state.error&&state.profile&&!state.loading&&!state.busy){requested=false;state.open=false;emit();onContinue();}}
 function suspend(){generation++;client=null;state.signed=false;state.loading=true;state.busy=false;state.profile=null;clearCache();emit();}
 async function connect(u,c,{openMissing=true}={}){if(!u?.id||!c){invalidate();return;}const same=user?.id===u.id;if(same&&client===c&&state.signed&&!state.error)return;
  if(!same){invalidate();closed=!openMissing;user={id:u.id};}else generation++;
  const wasOpen=state.open;client=c;state.signed=true;state.loading=true;emit();const g=generation,id=user.id;
  try{const v=await verified(g,id,c);if(!current(g,id))return;state.profile=read(v.user);state.open=state.profile?wasOpen&&!requested:!closed;state.error=false;state.message='';if(state.profile)remember();}
  catch(e){if(current(g,id)){state.error=true;state.message='계정 프로필을 확인하지 못했어요. 다시 확인해 주세요.';}}
  finally{if(current(g,id)){state.loading=false;if(requested&&!state.profile&&!closed)state.open=true;emit();finish();}}
 }
 function requestContinue(){if(!state.signed)return false;requested=true;closed=false;if(!state.loading&&!state.profile)state.open=true;emit();finish();return true;}
 function edit(){if(!state.signed||state.loading||state.busy)return false;closed=false;state.open=true;emit();return true;}
 function cancel(){if(state.busy)return false;requested=false;closed=true;state.open=false;emit();return true;}
 async function save(input){
  if(!state.signed||state.loading||state.busy)return false;let profile;try{profile=normalize(input);}catch(e){state.error=true;state.message='닉네임을 1~40자로 적어 주세요. 국가와 학교는 비워도 괜찮아요.';emit();return false;}
  const g=generation,id=user.id,c=client;state.busy=true;state.message='저장하고 있어요.';state.error=false;emit();
  try{const v=await verified(g,id,c);if(!current(g,id))return false;
   const updated=await putProfile(v.token,profile);if(!current(g,id))return false;if(updated?.id!==id||!equal(read(updated),profile))throw Error('SAVE_UNCONFIRMED');
   const check=await c.auth.getUser(v.token);if(!current(g,id))return false;if(check.error||check.data?.user?.id!==id||!equal(read(check.data.user),profile))throw Error('SAVE_UNCONFIRMED');
   const latest=await c.auth.getSession();if(!current(g,id))return false;if(latest.error||latest.data?.session?.user?.id!==id)throw Error('AUTH_REQUIRED');
   state.profile=profile;state.open=false;state.message='닉네임을 저장했어요.';state.error=false;remember();return true;
  }catch(e){if(current(g,id)){state.error=true;state.message='프로필 저장을 확인하지 못했어요. 다시 시도해 주세요.';}return false;}
  finally{if(current(g,id)){state.busy=false;emit();finish();}}
 }
 emit();return{connect,suspend,invalidate,requestContinue,edit,cancel,save,getState:()=>({...state,profile:state.profile?{...state.profile}:null})};
}
function mount(root,{onContinue=()=>{}}={}){
 const d=root.document,$=id=>d.getElementById(id),dialog=$('account-profile-dialog');if(!dialog)return null;
 let editing=false,openedFromUrl=false;
 const controller=createController({cache:root.localStorage,onContinue,putProfile:transport(root.DOKDO_AUTH_CONFIG,root.fetch.bind(root)),onChange:s=>{
  $('account-profile-summary').hidden=!s.signed;$('account-profile-name').textContent=s.profile?.nickname||'';$('account-profile-edit').disabled=s.loading||s.busy;
  $('account-profile-status').textContent=s.message;$('account-profile-status').dataset.error=String(s.error);$('account-profile-fields').disabled=s.loading||s.busy;
  if(s.open&&!dialog.open){const p=s.profile;$('account-nickname').value=p?.nickname||'';$('account-country').value=p?.country||'';$('account-school').value=p?.school||'';editing=!!p;dialog.showModal();$('account-nickname').focus();}
  else if(!s.open&&dialog.open)dialog.close();
  $('account-profile-save').textContent=s.busy?'저장 중…':editing?'저장하기':'저장하고 시작하기';
  if(s.signed&&!s.loading&&!openedFromUrl&&new URL(root.location.href).searchParams.get('profile')==='1'){openedFromUrl=true;controller.edit();}
 }});
 $('account-profile-form').onsubmit=event=>{event.preventDefault();if($('account-profile-form').reportValidity())controller.save({nickname:$('account-nickname').value,country:$('account-country').value,school:$('account-school').value});};
 $('account-profile-cancel').onclick=()=>controller.cancel();dialog.addEventListener('cancel',event=>{event.preventDefault();controller.cancel();});
 $('account-profile-edit').onclick=()=>controller.edit();
 const countries=$('account-country');function labels(){const names=new Intl.DisplayNames([d.documentElement.lang==='en'?'en-US':'ko-KR'],{type:'region'});for(const option of countries.options)if(option.value)option.textContent=names.of(option.value);}
 d.addEventListener('dokdo:language',labels);labels();
 return{requestContinue:()=>controller.requestContinue(),connect:(u,c,options)=>controller.connect(u,c,options),suspend(){controller.suspend();},invalidate(){openedFromUrl=false;controller.invalidate();}};
}
return{META,CACHE,normalize,read,transport,createController,mount};
});
