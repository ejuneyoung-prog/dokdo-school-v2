/* Weekly hall of fame / leaderboard client.
 * Contract source: legacy Apps Script GET/POST fields documented in
 * dokdo-claude-handoff/docs/02-LEGACY-API-CONTRACT.ko.md. This module never
 * invents a production endpoint: it stays inert until an operator sets
 * window.DOKDO_SITE_CONFIG.leaderboard.apiUrl to a real, deployed URL.
 * configured = a URL is set. connected = a real request to that URL has
 * actually succeeded. The two are reported separately, never merged.
 */
window.DokdoLeaderboard=(function(){
'use strict';
const cfg=()=>(window.DOKDO_SITE_CONFIG&&window.DOKDO_SITE_CONFIG.leaderboard)||{};
const apiUrl=()=>{const u=cfg().apiUrl;return typeof u==='string'&&/^https:\/\//.test(u)?u:'';};
const isConfigured=()=>!!apiUrl();

async function getJSON(url,timeoutMs=8000){
 const ctrl=new AbortController();const t=setTimeout(()=>ctrl.abort(),timeoutMs);
 try{
  const res=await fetch(url,{method:'GET',signal:ctrl.signal,credentials:'omit'});
  if(!res.ok)throw Object.assign(new Error('http_'+res.status),{httpStatus:res.status});
  const ct=res.headers.get('content-type')||'';
  if(!ct.includes('application/json'))throw new Error('non_json_response');
  return await res.json();
 }finally{clearTimeout(t);}
}

/* GET <SHEET_API>?ts=... — weekly aggregate feed (60s server cache upstream). */
async function fetchWeekly(){
 if(!isConfigured())return{state:'not_configured'};
 try{
  const data=await getJSON(apiUrl()+'?ts='+Date.now());
  return{state:'ok',data};
 }catch(e){return{state:'error',error:String(e&&e.message||e)};}
}

/* GET <SHEET_API>?live=1&ts=... — recent/live stream (10s server cache upstream). */
async function fetchLive(){
 if(!isConfigured())return{state:'not_configured'};
 try{
  const data=await getJSON(apiUrl()+'?live=1&ts='+Date.now());
  return{state:'ok',data};
 }catch(e){return{state:'error',error:String(e&&e.message||e)};}
}

/* POST {t:'a',...} — a single learning event. The legacy server appends
 * near-anything as an event and can return ok even on server-side failure,
 * so a resolved promise here is NOT proof the row was recorded. Callers
 * must not mark local state as "synced" from this alone; that requires a
 * versioned adapter endpoint the operator has not provided yet. */
async function postEvent(eventFields){
 if(!isConfigured())return{state:'not_configured'};
 const body=JSON.stringify(Object.assign({t:'a'},eventFields));
 try{
  await fetch(apiUrl(),{method:'POST',mode:'no-cors',credentials:'omit',body});
  return{state:'sent_unconfirmed'};
 }catch(e){return{state:'error',error:String(e&&e.message||e)};}
}

return{isConfigured,fetchWeekly,fetchLive,postEvent};
})();
