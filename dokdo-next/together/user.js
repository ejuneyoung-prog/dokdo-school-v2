/* 이용자 상태: 이 기기에 남는 내 배 기록의 모양과 고쳐 읽기. 저장은 store.js가, 계산은 rules.js가 한다.
 * 닉네임 말고는 자유 입력이 없다. 닉네임은 짧게 자르고 글자만 남긴다. */
(function(root,factory){const C=typeof module==='object'&&module.exports?require('./config.js'):root.DokdoTogetherConfig;const api=factory(C);if(typeof module==='object'&&module.exports)module.exports=api;else root.DokdoTogetherUser=api;})(typeof globalThis!=='undefined'?globalThis:this,function(C){
'use strict';
const VERSION=1;
// 닉네임: 앞뒤 공백 정리, 제어문자·꺾쇠 제거, 12글자까지. 비어 있으면 ''.
// 글자 방향을 뒤집거나 보이지 않는 글자(U+200B~200F, 202A~202E, 2060~2069, FEFF)도 지운다.
function cleanNick(v){return [...String(v==null?'':v).normalize('NFC').replace(/[\u0000-\u001f\u007f<>\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g,'').replace(/\s+/g,' ').trim()].slice(0,20).join('')}
const cleanCC=v=>/^[A-Z]{2}$/.test(String(v||''))?String(v):'KR';
const newId=(rnd=Math.random)=>'s'+Math.floor(rnd()*36**8).toString(36).padStart(8,'0');
// 처음 받는 배: 독도 둘레 바다 위 자리(각도 a, 거리 r)는 id로 정해 다시 와도 같은 자리에 있다.
function spotOf(id){let h=2166136261;for(const ch of String(id)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return{a:(h%3600)/3600*Math.PI*2,r:2}}
function create(nick,cc,now=Date.now(),rnd=Math.random){const id=newId(rnd);return tidy({v:VERSION,id,nick:cleanNick(nick),cc:cleanCC(cc),made:now,stage:1,flag:'m',sail:'plain',spot:spotOf(id),raised:{days:0,last:''},waves:{total:0,day:'',n:0},traps:[],bag:{},money:0,earned:0,hauled:0})}
const num=(v,max=1e9)=>Number.isFinite(v)&&v>=0?Math.min(Math.floor(v),max):0;
// 저장값을 믿지 않고 고쳐 읽는다(손으로 고친 값, 옛 판, 깨진 값).
function tidy(st,now=Date.now()){if(!st||typeof st!=='object')return null;if(typeof st.id!=='string'||!/^s[0-9a-z]{8}$/.test(st.id))return null;
 const o={v:VERSION,id:st.id,nick:cleanNick(st.nick),cc:cleanCC(st.cc),made:num(st.made,9e15)};
 const max=C.SHIPS.filter(s=>s.ready).length;o.stage=Math.max(1,Math.min(max,num(st.stage)||1));
 const fz=C.FLAG_SIZES.find(f=>f.id===st.flag);o.flag=fz&&(!fz.big||C.SHIPS[o.stage-1].bigFlag)?fz.id:'m';o.sail=C.SAILS.some(f=>f.id===st.sail)?st.sail:'plain';
 o.spot=spotOf(o.id);
 const day=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)?v:'';
 // 기기 시계가 미래로 잘못 맞았던 흔적(오늘보다 뒤의 날, 지금보다 뒤에 던진 통발)은 지금으로 당긴다. 그대로 두면 다시는 못 올리거나 영원히 기다린다.
 const today=new Date(now+9*3600000).toISOString().slice(0,10),last=day(st.raised&&st.raised.last);
 o.raised={days:num(st.raised&&st.raised.days,1e6),last:last>today?'':last};
 o.waves={total:num(st.waves&&st.waves.total),day:day(st.waves&&st.waves.day),n:num(st.waves&&st.waves.n,C.WAVE_PER_DAY)};
 const slots=C.SHIPS[o.stage-1].traps;o.traps=(Array.isArray(st.traps)?st.traps:[]).filter(t=>Number.isFinite(t)&&t>0).map(t=>Math.min(t,now)).slice(0,slots);
 o.bag={};const ids=new Set(C.CATCH.map(c=>c.id));if(st.bag&&typeof st.bag==='object')for(const[k,v]of Object.entries(st.bag))if(ids.has(k)&&num(v,9999)>0)o.bag[k]=num(v,9999);
 o.money=num(st.money);o.earned=num(st.earned);o.hauled=num(st.hauled);return o}
return{VERSION,cleanNick,cleanCC,newId,spotOf,create,tidy};
});
