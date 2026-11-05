/* 구글 로그인 입구: 가상 계정만 쓰고 외부 인증에 접속하지 않습니다. */
'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),{createController,googleReturnUrl,validGoogleUrl,returnPath,sessionCleanup,mount}=require('../assets/account.js');
const URL_NOW='https://school.example/account.html?next=camp/',CONFIG={enabled:true,googleEnabled:true,supabaseUrl:'https://fixture.supabase.co',publishableKey:'sb_publishable_FICTIONAL_ONLY_0000',redirectUrl:'https://school.example/account.html'};
const settings={url:'https://fixture.supabase.co',redirect:CONFIG.redirectUrl};
const authorize=(over={})=>{const u=new URL('https://fixture.supabase.co/auth/v1/authorize');const q={provider:'google',redirect_to:googleReturnUrl(settings,URL_NOW),code_challenge:'a'.repeat(43),code_challenge_method:'s256',prompt:'select_account',...over};for(const[k,v]of Object.entries(q))u.searchParams.set(k,v);return u.href;};
test('Google return stays on the account page and keeps a known destination',()=>{a.equal(new URL(googleReturnUrl(settings,URL_NOW)).searchParams.get('next'),'camp/');a.equal(returnPath(URL_NOW),'camp/');a.equal(returnPath('https://school.example/account.html?next=https://evil.example/'),'./');});
test('Only the project authorize address with PKCE is followed',()=>{a.equal(validGoogleUrl(authorize(),settings,URL_NOW),true);a.equal(validGoogleUrl(authorize({provider:'kakao'}),settings,URL_NOW),false);a.equal(validGoogleUrl(authorize({redirect_to:'https://evil.example/'}),settings,URL_NOW),false);a.equal(validGoogleUrl(authorize().replace('fixture.supabase.co','evil.example'),settings,URL_NOW),false);a.equal(validGoogleUrl(authorize({code_challenge:'short'}),settings,URL_NOW),false);});
test('Google sign-in starts through the SDK and refuses a changed address',async()=>{
 for(const good of [true,false]){const moved=[];const auth={onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}};},async getSession(){return{data:{session:null},error:null};},async signInWithOAuth(o){a.equal(o.provider,'google');a.equal(o.options.skipBrowserRedirect,true);return{data:{url:good?authorize():'https://evil.example/'},error:null};}};
  const c=createController({config:CONFIG,sdk:{createClient:()=>({auth})},currentUrl:URL_NOW,onChange(){},navigate:u=>moved.push(u)});await c.init();a.equal(await c.signInGoogle(),good);a.equal(moved.length,good?1:0);c.dispose();}
});
test('Google stays closed until the setting is on',async()=>{let called=0;const auth={onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}};},async getSession(){return{data:{session:null},error:null};},async signInWithOAuth(){called++;return{data:{},error:null};}};const c=createController({config:{...CONFIG,googleEnabled:false},sdk:{createClient:()=>({auth})},currentUrl:URL_NOW,onChange(){},navigate(){}});await c.init();a.equal(await c.signInGoogle(),false);a.equal(called,0);c.dispose();});

const memory=seed=>{const m=new Map(Object.entries(seed));return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k),has:k=>m.has(k)};};
const locks={request:(name,options,fn)=>fn()};
test('The account page clears the session of the other sign-in method',()=>{
 const on=memory({'dokdo-account-session-v1':'{}','dokdo-account-session-v2':'{}'});sessionCleanup(on,locks).prepare();a.equal(on.has('dokdo-account-session-v1'),false);a.equal(on.has('dokdo-account-session-v2'),true);
 const off=memory({'dokdo-account-session-v1':'{}','dokdo-account-session-v2':'{}'});sessionCleanup(off,locks).retire();a.equal(off.has('dokdo-account-session-v1'),true);a.equal(off.has('dokdo-account-session-v2'),false);
});
test('The header believes only the session of the current sign-in method',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../assets/account-entry.js'),'utf8');
 const label=(config,saved)=>{const link={classList:{toggle(){}},setAttribute(){}};const doc={documentElement:{lang:'ko'},querySelector:()=>null,addEventListener(){},getElementById:id=>id==='account-link'?link:null};
  vm.runInNewContext(source,{DOKDO_AUTH_CONFIG:config,window:{},document:doc,localStorage:memory(saved),encodeURIComponent,JSON,String});return link.textContent;};
 const session=JSON.stringify({user:{id:'fixture'}});
 a.equal(label({googleEnabled:true},{'dokdo-account-session-v1':session}),'로그인');a.equal(label({googleEnabled:true},{'dokdo-account-session-v2':session}),'내 기록');
 a.equal(label({googleEnabled:false},{'dokdo-account-session-v2':session}),'로그인');a.equal(label({googleEnabled:false},{'dokdo-account-session-v1':session}),'내 기록');
 a.equal(label(undefined,{'dokdo-account-session-v2':session}),'내 기록');
});
test('The Google button does nothing until the age is confirmed',async()=>{
 const nodes={};const doc={getElementById(id){return nodes[id]||(nodes[id]={hidden:false,disabled:false,value:'',dataset:{},classList:{toggle(){}},setAttribute(){},focus(){},reportValidity(){return true;}});},body:{}};
 let started=0;const auth={onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}};},async getSession(){return{data:{session:null},error:null};},async signInWithOAuth(o){started++;a.equal(o.options.queryParams.prompt,'select_account');return{data:{url:'https://fixture.supabase.co/nowhere'},error:null};}};
 const root={document:doc,location:{href:URL_NOW,assign(){}},navigator:{locks},localStorage:memory({}),DOKDO_AUTH_CONFIG:CONFIG,supabase:{createClient:()=>({auth})},addEventListener(){}};
 mount(root);await new Promise(r=>setTimeout(r,5));nodes['age-14'].checked=false;await nodes['google-signin'].onclick();a.equal(started,0);a.equal(nodes['account-status'].textContent,'만 14세 이상인지 먼저 확인해 주세요.');
 nodes['age-14'].checked=true;await nodes['google-signin'].onclick();a.equal(started,1);
});
test('A Google failure does not speak of Kakao',async()=>{
 const auth={onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}};},async getSession(){return{data:{session:null},error:null};}};let seen='';
 const c=createController({config:CONFIG,sdk:{createClient:()=>({auth})},currentUrl:'https://school.example/account.html?oauth=google&error=access_denied',onChange:s=>{seen=s.message;},consumeCallback(){},cleanup:{prepare(){},begin(){},discard(){}}});await c.init();a.doesNotMatch(seen,/카카오/);a.match(seen,/구글/);c.dispose();
});
