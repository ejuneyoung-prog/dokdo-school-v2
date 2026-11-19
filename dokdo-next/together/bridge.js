/* 스쿨 연결 — 독도 코리아 스쿨에 기대는 부분은 모두 이 파일 하나에 모은다.
 * 나중에 DOKDO TOGETHER를 별도 서비스로 떼어 낼 때는 이 파일만 바꾸면 된다(HANDOFF.md).
 *  1. 닉네임·나라: 스쿨 문이 어린이 보호 확인(DokdoPrivacy.mayShare)을 통과한 때만 주소(?nick=&cc=)로 넘긴다. 받은 뒤 주소에서 지운다.
 *     스쿨 저장소의 이름·나라는 읽지 않는다(힐링캠프와 같은 원칙).
 *  2. 학년: 스쿨 배움 기록(dokdo-korea-school-cinematic-v1)의 grade만 읽는다. 쓰지 않는다. 승급 공식·사다리는 건드리지 않는다.
 *  3. 명예의 전당: 스쿨이 이미 쓰는 공개 응답(Apps Script GET ?tops=1: 닉네임·학년·날짜, 운영자 승인분)을 읽기만 한다.
 *     Apps Script는 고치지 않는다. 연결 승인: 교수님 2026-11-20(결정 1).
 *  4. 문: 스쿨 첫 화면(../), 캠핑장(../camp/). 진동: 스쿨 놀이와 같은 ../assets/haptic.js(있으면). */
(function(root,factory){const isNode=typeof module==='object'&&module.exports;const R=isNode?require('./rules.js'):root.DokdoTogetherRules;const api=factory(R,root);if(isNode)module.exports=api;else root.DokdoTogetherBridge=api;})(typeof globalThis!=='undefined'?globalThis:this,function(R,root){
'use strict';
const SCHOOL_URL='../';
const SCHOOL_KEY='dokdo-korea-school-cinematic-v1';
// 스쿨의 옛 단계 이름(경력·교수)은 독코민 단계로 읽는다(dokdo-core.js GRADE_ALIASES와 같다).
const ALIAS={CR1:'DK1',CR2:'DK2',CR3:'DK3',CR4:'DK4',CR5:'DK5',PR1:'DK6',PR2:'DK7',PR3:'DK8',HEAD:'DK9'};
const normGrade=g=>{g=String(g||'');g=ALIAS[g]||g;return R.GRADES.includes(g)?g:''};
// 학년 이름(스쿨 app.js GRADE_LABELS 한국어와 같은 말)
function gradeLabel(g){g=normGrade(g);if(!g)return'';if(g==='K')return'유치원';let m;
 if((m=/^E(\d)$/.exec(g)))return'초등 '+m[1]+'학년';if((m=/^M(\d)$/.exec(g)))return'중학 '+m[1]+'학년';if((m=/^H(\d)$/.exec(g)))return'고등 '+m[1]+'학년';
 if((m=/^U(\d)$/.exec(g)))return'대학 '+m[1]+'학년';if((m=/^MA(\d)$/.exec(g)))return'석사 '+m[1]+'년차';if((m=/^PHD(\d)$/.exec(g)))return'박사 '+m[1]+'년차';
 if((m=/^DK(\d+)$/.exec(g)))return'독코민 Lv.'+m[1];return g}
// 주소로 받은 닉네임·나라(스쿨 문). 읽은 뒤 주소에서 지운다.
function incoming(loc,hist){const out={nick:'',cc:''};try{const u=new URL((loc||root.location).href);out.nick=u.searchParams.get('nick')||'';out.cc=(u.searchParams.get('cc')||'').toUpperCase();
 if(u.searchParams.has('nick')||u.searchParams.has('cc')){u.searchParams.delete('nick');u.searchParams.delete('cc');(hist||root.history).replaceState(null,'',u.pathname+u.search+u.hash)}}catch(e){}return out}
// 스쿨 학년(읽기만). 기록이 없거나 깨졌으면 'K'.
function schoolGrade(storage){try{const ls=storage||root.localStorage,raw=ls&&ls.getItem(SCHOOL_KEY);if(!raw)return'K';const v=JSON.parse(raw);return normGrade(v&&v.grade)||'K'}catch(e){return'K'}}
// 명예의 전당 명단. 실패하면 빈 목록(견본으로 채우지 않는다 — 진짜 명단처럼 보이면 안 된다).
const cleanNick=v=>[...String(v==null?'':v).replace(/[\u0000-\u001f\u007f<>]/g,'').replace(/\s+/g,' ').trim()].slice(0,20).join('');
function parseTops(data){if(!data||!Array.isArray(data.tops))return[];const seen=new Set(),out=[];
 for(const r of data.tops){const nick=cleanNick(r&&r.nick),level=normGrade(r&&r.level);if(!nick||seen.has(nick))continue;seen.add(nick);out.push({nick,level})}return out.slice(0,20)}
function apiUrl(){const c=root.DOKDO_SITE_CONFIG&&root.DOKDO_SITE_CONFIG.leaderboard,u=c&&c.apiUrl;return typeof u==='string'&&/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(u)?u:''}
async function hallOfFame(fetchFn,timeoutMs=15000){const url=apiUrl();const f=fetchFn||(root.fetch&&root.fetch.bind(root));if(!url||!f)return{state:'off',tops:[]};
 const ctrl=typeof AbortController!=='undefined'?new AbortController():null;const t=setTimeout(()=>ctrl&&ctrl.abort(),timeoutMs);
 try{const res=await f(url+'?tops=1&ts='+Date.now(),{method:'GET',credentials:'omit',signal:ctrl&&ctrl.signal});if(!res.ok)return{state:'error',tops:[]};return{state:'ok',tops:parseTops(await res.json())}}
 catch(e){return{state:'error',tops:[]}}finally{clearTimeout(t)}}
// 내가 명예의 전당에 있는가: 닉네임이 같고, 내 스쿨 학년이 그 줄의 학년 이상일 때만(닉네임만 따라 쓰면 첫째 줄에 못 간다).
function inHall(tops,nick,grade){const n=cleanNick(nick);return!!n&&tops.some(t=>t.nick===n&&t.level&&R.gradeRank(grade)>=R.gradeRank(t.level))}
const buzz=k=>{try{root.DokdoHaptic&&root.DokdoHaptic.buzz(k)}catch(e){}};
const campUrl=nick=>'../camp/'+(nick?'?nick='+encodeURIComponent(nick):'');
return{SCHOOL_URL,SCHOOL_KEY,normGrade,gradeLabel,incoming,schoolGrade,parseTops,apiUrl,hallOfFame,inHall,buzz,campUrl};
});
