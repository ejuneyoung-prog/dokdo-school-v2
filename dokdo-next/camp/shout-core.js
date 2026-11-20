// 태극기 게양·지킨 날·태극기 흔들기·외침판의 계산(11/20 합치기 3단계). 화면과 떼어 노드 시험으로 확인한다(tests/camp-shout.test.cjs).
// 저장은 healing.js의 'dokdo-heal' 기록에 새 칸 넷을 더해 쓴다. 옛 기록에는 칸이 없으므로 0과 빈 날짜로 읽는다.
//  kD 마지막으로 태극기를 올린 한국 날짜(YYYY-MM-DD) · kN 독도를 지킨 날(올린 날 수, 빠진 날이 있어도 줄지 않음)
//  wD 흔들기를 센 한국 날짜 · wN 그날 센 흔들기 수(하루 20번까지)
(function(root){
'use strict';
const WAVE_DAY=20,LINES=30;
// 한국 시각 날짜. 한국은 서머타임이 없어 UTC+9로 셈한다.
const kstDay=(now=Date.now())=>new Date(now+9*3600000).toISOString().slice(0,10);
// 칸을 고쳐 읽는다. 이상한 값만 0이나 빈 날짜로 바꾸고, 멀쩡한 값은 건드리지 않는다(줄이지 않음).
function tidy(st){for(const k of ['kN','wN'])if(!Number.isFinite(st[k])||st[k]<0)st[k]=0;else st[k]=Math.floor(st[k]);
 for(const k of ['kD','wD'])if(typeof st[k]!=='string'||!/^\d{4}-\d\d-\d\d$/.test(st[k]))st[k]='';return st}
// 그날 처음 들어오면 태극기를 올리고 지킨 날을 하나 더한다. 같은 날 다시 와도, 기기 시계가 뒤로 가도 더하지 않는다.
function raise(st,day){tidy(st);if(st.kD&&day<=st.kD)return{raised:false,n:st.kN};st.kD=day;st.kN+=1;return{raised:true,n:st.kN}}
const raisedOn=(st,day)=>st.kD===day;
// 태극기 흔들기: 하루 20번까지 센다. 20번이 넘으면 흔들기는 되지만 세지 않는다(목소리도 내지 않음).
function wave(st,day){tidy(st);if(st.wD!==day){st.wD=day;st.wN=0}if(st.wN>=WAVE_DAY)return{counted:false,n:st.wN};st.wN+=1;return{counted:true,n:st.wN}}
const wavesOn=(st,day)=>st.wD===day?Math.min(WAVE_DAY,st.wN|0):0;
// n개 가운데 하나를 고르되 바로 앞과 같은 것은 고르지 않는다(교수님 결정: 목소리 넷을 무작위로, 같은 목소리 두 번 연속 없이).
function picker(n,rnd){rnd=rnd||Math.random;let last=-1;return function(){if(n<2){last=0;return 0}let i=Math.floor(Math.min(.999999,Math.max(0,rnd()))*(last<0?n:n-1));if(last>=0&&i>=last)i++;last=i;return i}}
// 외침판에 쓰는 이름: 어린이 보호 확인(DokdoPrivacy.mayShare)이 참일 때만 닉네임, 아니거나 확인할 수 없으면 '독도 친구'.
function speaker(privacy,nick){let ok=false;try{ok=!!(privacy&&typeof privacy.mayShare==='function'&&privacy.mayShare()===true)}catch(e){ok=false}const n=String(nick||'').trim();return ok&&n?n.slice(0,8):'독도 친구'}
// 외침판 줄은 메모리에만 30줄까지 둔다(오래된 줄부터 버림).
function push(list,line,max){list.push(line);const m=max||LINES;while(list.length>m)list.shift();return list}
const api={WAVE_DAY,LINES,kstDay,tidy,raise,raisedOn,wave,wavesOn,picker,speaker,push};
if(typeof module==='object'&&module.exports)module.exports=api;else root.DokdoShout=api;
})(typeof window!=='undefined'?window:globalThis);
