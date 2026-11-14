// 독도에서 힐링하기 2·3단계 계산(2026-11-07 교수님 승인안). 화면(three.js)과 떼어 노드 시험으로 확인한다.
// - 레벨: 누적 경험치 60×(L-1)². 스쿨 경험치(배움터 기록의 xp, 읽기만 함)와 힐링 경험치를 더한다. 스쿨 경험치는 절대 깎지 않는다.
// - 힐링 경험치 하루 상한: 놀이(낚시·요리) 100, 바다 쓰레기 줍기 50. 한국 시각 날짜로 센다.
// - 장소: 배 Lv1, 동도 선착장 Lv5, 서도 주민숙소 Lv10, 동도 정상 캠핑 Lv20. 이미 대황으로 연 곳은 그대로 열어 둔다.
// - 대황(화폐)과 레벨은 따로 센다. 처음 들어오면 대황 100 환영 선물.
// - 물고기 이름·별은 낚시 페이지(assets/fishing.js)의 사실 확인을 마친 자료를 그대로 쓴다.
(function(root){
'use strict';
const K=60,CAP={game:100,clean:50},GIFT=100,CATCH_DAY=10,CLEAN_XP=5;
const xpFor=L=>K*(L-1)*(L-1);
function levelOf(xp){xp=Math.max(0,Math.floor(xp)||0);let L=Math.floor(1+Math.sqrt(xp/K));while(xpFor(L+1)<=xp)L++;while(L>1&&xpFor(L)>xp)L--;return L}
const PLACES=[['sea',1,'배'],['dock',5,'동도 선착장'],['stay',10,'서도 주민숙소'],['camp',20,'동도 정상 캠핑']];
const placeLv=m=>{const p=PLACES.find(q=>q[0]===m);return p?p[1]:1};
// 배움터 기록(문자열이나 객체)에서 xp만 읽는다. 이상한 값은 0으로 본다.
function schoolXp(raw){try{const v=typeof raw==='string'?JSON.parse(raw):raw,x=v&&v.xp;return Number.isFinite(x)&&x>0?Math.floor(x):0}catch(e){return 0}}
const kstDay=(now=Date.now())=>new Date(now+9*3600000).toISOString().slice(0,10);
// 저장값을 고쳐 읽는다. 옛 기록(1단계)에는 새 칸이 없으므로 0으로 채운다.
function tidy(st){for(const k of ['hx','xG','xC','fN','gift','ate'])if(!Number.isFinite(st[k])||st[k]<0)st[k]=0;if(typeof st.xD!=='string')st.xD='';
 const f={};if(st.fish&&typeof st.fish==='object')for(const[id,n]of Object.entries(st.fish))if(/^[a-z_]{2,12}$/.test(id)&&Number.isInteger(n)&&n>0)f[id]=Math.min(n,999);st.fish=f;return st}
function roll(st,day){if(st.xD!==day){st.xD=day;st.xG=0;st.xC=0;st.fN=0}}
// 경험치를 받을 수 있는 만큼만 더하고, 실제로 더한 양을 돌려준다.
function earn(st,kind,amt,day){roll(st,day);const key=kind==='clean'?'xC':'xG',room=Math.max(0,CAP[kind==='clean'?'clean':'game']-st[key]),g=Math.max(0,Math.min(room,Math.floor(amt)||0));st[key]+=g;st.hx+=g;return g}
function level(st,school){const xp=(st.hx||0)+(school||0),L=levelOf(xp);return{xp,L,cur:xpFor(L),next:xpFor(L+1)}}
// 이미 산 곳(pass 비트)은 레벨과 상관없이 열려 있다.
const BIT={camp:1,stay:2};
// 1단계에 서도나 동도 정상을 산 사람은 그보다 낮은 선착장도 열어 둔다.
const open=(m,L,pass)=>L>=placeLv(m)||!!(BIT[m]&&((pass|0)&BIT[m]))||(m==='dock'&&((pass|0)&3)>0);
function nextPlace(L,pass){return PLACES.find(p=>!open(p[0],L,pass))||null}
function welcome(st){if(st.gift)return 0;st.gift=1;st.c=(st.c||0)+GIFT;st.t=(st.t||0)+GIFT;return GIFT}
// 낚시: 배에서 닿는 얕은 바다(0~40m)의 물고기·조개와 해조류 대황·감태(11/08 교수님 제안, 출처: 명정구 외 2017). 어린 물고기·보호생물은 넣지 않는다.
// 미역은 프로젝트 출처 자료에서 독도 기록을 확인하지 못해 넣지 않았다(확인 필요).
const FISH_IDS=['jari','yongchi','malj','jeonbok','sora','bangeo','yeoneo','dohwa_b','hokdom','daehwang','gamtae'];
// 대황은 따면 바로 화폐 대황 1개가 된다(창고에 쌓지 않음).
const DIRECT={daehwang:1};
function pool(SP,starsOf){if(!Array.isArray(SP)||typeof starsOf!=='function')return[];return FISH_IDS.map(id=>SP.find(s=>s&&s.id===id)).filter(Boolean).map(s=>({id:s.id,name:s.name,kind:s.kind,star:starsOf(s)}))}
// 별이 많을수록 드물다(무게 1/별).
function pick(list,r){if(!list.length)return null;const w=list.map(f=>1/f.star),tot=w.reduce((a,b)=>a+b,0);let t=Math.min(.999999,Math.max(0,r))*tot;for(let i=0;i<list.length;i++){t-=w[i];if(t<0)return list[i]}return list[list.length-1]}
const catchesLeft=(st,day)=>{roll(st,day);return Math.max(0,CATCH_DAY-st.fN)};
function land(st,f,day){roll(st,day);if(!f||st.fN>=CATCH_DAY)return null;st.fN++;const coin=DIRECT[f.id]||0;if(!coin)st.fish[f.id]=(st.fish[f.id]||0)+1;return{xp:earn(st,'game',f.star*3,day),coin}}
// 셀 때: 물고기·조개는 마리, 해조류는 묶음
const unit=f=>f&&f.kind==='weed'?'묶음':'마리';
// 교환소: 물고기 한 마리를 대황으로. 별 1·2·3·4·5 → 1·2·3·5·8.
const SELL={1:1,2:2,3:3,4:5,5:8};
function sell(st,f){if(!f||!(st.fish[f.id]>0))return 0;st.fish[f.id]--;if(!st.fish[f.id])delete st.fish[f.id];return SELL[f.star]||1}
// 요리: 동도 선착장(Lv5)과 동도 정상 캠핑 자리에서(11/08 교수님 승인으로 선착장 추가). 모닥불 단계(지금은 꾸미기의 모닥불 하나 = 1단계)가 오를수록 메뉴가 는다.
const MENU=[{id:'grill',name:'구이',need:1,fire:0,per:4},{id:'stew',name:'매운탕',need:2,fire:1,per:6}];
const COOK_AT=['dock','camp'];
const menu=fire=>MENU.filter(m=>(fire|0)>=m.fire);
function cook(st,f,dish,fire,day){if(!f||f.kind==='weed'||!dish||(fire|0)<dish.fire||!((st.fish[f.id]||0)>=dish.need))return null;st.fish[f.id]-=dish.need;if(!st.fish[f.id])delete st.fish[f.id];st.ate++;return{xp:earn(st,'game',f.star*dish.per,day),name:f.name+' '+dish.name}}
function pickup(st,day){return earn(st,'clean',CLEAN_XP,day)}
const api={K,CAP,GIFT,CATCH_DAY,CLEAN_XP,xpFor,levelOf,PLACES,placeLv,schoolXp,kstDay,tidy,roll,earn,level,open,nextPlace,welcome,FISH_IDS,DIRECT,unit,pool,pick,catchesLeft,land,SELL,sell,MENU,COOK_AT,menu,cook,pickup};
if(typeof module==='object'&&module.exports)module.exports=api;else root.DokdoHealEcon=api;
})(typeof window!=='undefined'?window:globalThis);
