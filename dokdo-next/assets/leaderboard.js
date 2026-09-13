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

/* Apps Script는 잠들어 있다 깨어날 때 첫 응답이 몇 초 늦습니다. 8초는 그때
 * 모자라 명예의 전당과 기록 불러오기가 '중단됨'으로 끊겼습니다. */
async function getJSON(url,timeoutMs=15000){
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

/* GET <SHEET_API>?load=<key> — key is the legacy "nickname#4-digit-code" scheme. */
async function loadProgress(key){
 if(!isConfigured())return{state:'not_configured'};
 try{
  const data=await getJSON(apiUrl()+'?load='+encodeURIComponent(key));
  // A server with no ?load= branch answers the weekly feed (or anything else)
  // with no `found` field at all. That is not the same as "this nickname has
  // no record", and reporting both as not_found made the real cause
  // undiagnosable from the UI.
  if(!data||typeof data.found==='undefined')return{state:'unsupported'};
  if(data.found!==true)return{state:'not_found'};
  return{state:'ok',data};
 }catch(e){return{state:'error',error:String(e&&e.message||e)};}
}

/* POST {t:'save',key,nick,grade,payload}. Same no-cors caveat as postEvent: a
 * resolved promise means the request was sent, not that the server stored
 * it. payloadText must already be a JSON string (the caller's backup text),
 * matching the legacy field shape exactly. */
async function saveProgress(key,nick,grade,payloadText){
 if(!isConfigured())return{state:'not_configured'};
 if(typeof payloadText==='string'&&payloadText.length>45000)return{state:'too_large',length:payloadText.length};
 const body=JSON.stringify({t:'save',key,nick,grade,payload:payloadText});
 try{
  await fetch(apiUrl(),{method:'POST',mode:'no-cors',credentials:'omit',body});
  return{state:'sent_unconfirmed'};
 }catch(e){return{state:'error',error:String(e&&e.message||e)};}
}

/* GET <SHEET_API>?weather=1 — proposed KHOA relay (see
 * docs/WEATHER-PROXY-CODE-GS.md). Inert until the operator's Apps Script
 * actually implements this branch; a missing/unexpected shape is treated
 * as an error, never as fabricated weather. */
async function fetchKhoaWeather(){
 if(!isConfigured())return{state:'not_configured'};
 try{
  const data=await getJSON(apiUrl()+'?weather=1&ts='+Date.now());
  if(!data||typeof data.temperature!=='number'||typeof data.station!=='string')return{state:'error',error:'unexpected_response_shape'};
  return{state:'ok',data};
 }catch(e){return{state:'error',error:String(e&&e.message||e)};}
}

/* POST {t:'top'} — records that a learner reached the top level, for the
 * operator to check before anyone else sees it. Recording is not
 * announcing: nothing is shown to other visitors until the operator marks
 * the row approved in their sheet. Same no-cors shape as the other writes,
 * so a resolved promise means sent, not stored. */
async function reportTopLevel(nick,level,correct){
 if(!isConfigured())return{state:'not_configured'};
 const body=JSON.stringify({t:'top',nick:String(nick||''),level:String(level||''),correct:Number(correct)||0});
 try{
  await fetch(apiUrl(),{method:'POST',mode:'no-cors',credentials:'omit',body});
  return{state:'sent_unconfirmed'};
 }catch(e){return{state:'error',error:String(e&&e.message||e)};}
}

/* GET <SHEET_API>?tops=1 — the top-level reachers the operator has approved.
 * A server without this branch answers with no `tops` field at all, which is
 * not the same as "nobody has been approved"; reporting both as an empty
 * list would make the real cause undiagnosable, so they stay separate. */
async function fetchTops(){
 if(!isConfigured())return{state:'not_configured'};
 try{
  const data=await getJSON(apiUrl()+'?tops=1&ts='+Date.now());
  if(!data||!Array.isArray(data.tops))return{state:'unsupported'};
  const tops=data.tops
   .filter(r=>r&&typeof r.nick==='string'&&r.nick.trim())
   .map(r=>({nick:String(r.nick).slice(0,60),level:String(r.level||'').slice(0,40),at:String(r.at||'').slice(0,25)}))
   .slice(0,20);
  return{state:'ok',tops};
 }catch(e){return{state:'error',error:String(e&&e.message||e)};}
}

return{isConfigured,fetchWeekly,fetchLive,postEvent,loadProgress,saveProgress,fetchKhoaWeather,reportTopLevel,fetchTops};
})();
