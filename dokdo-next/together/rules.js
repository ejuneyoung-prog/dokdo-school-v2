/* DOKDO TOGETHER 계산(화면 없이 노드로 시험한다). 날짜는 한국 시각으로 센다.
 * 흐름: 태극기 올리기(하루 한 번) → 통발 던지기 → TRAP_MINUTES 뒤 건지기 → 바로 다시 던지기 → 팔기 → 배(집) 키우기.
 * "독도를 지킨 날"은 올린 날의 수다. 하루 빠져도 처음으로 돌아가지 않는다. */
(function(root,factory){const C=typeof module==='object'&&module.exports?require('./config.js'):root.DokdoTogetherConfig;const api=factory(C);if(typeof module==='object'&&module.exports)module.exports=api;else root.DokdoTogetherRules=api;})(typeof globalThis!=='undefined'?globalThis:this,function(C){
'use strict';
const kstDay=(now=Date.now())=>new Date(now+9*3600000).toISOString().slice(0,10);
const ship=st=>C.SHIPS[Math.max(0,Math.min(C.SHIPS.length-1,(st.stage|0)-1))];
const raisedToday=(st,now)=>st.raised.last===kstDay(now);
// 태극기 올리기: 오늘 처음이면 지킨 날 +1. 이미 올렸으면 아무 일도 없다(false).
function raise(st,now=Date.now()){if(raisedToday(st,now))return false;st.raised.days++;st.raised.last=kstDay(now);return true}
// 태극기 흔들기: 하루 WAVE_PER_DAY번까지만 센다. 센 횟수를 돌려준다(못 세면 0).
function wave(st,now=Date.now()){const d=kstDay(now);if(st.waves.day!==d){st.waves.day=d;st.waves.n=0}if(st.waves.n>=C.WAVE_PER_DAY)return 0;st.waves.n++;st.waves.total++;return 1}
// 기다림은 설정값 하나(TRAP_MINUTES)에 계급 배율(wait)을 곱한다. 던질 때의 배율을 쓰도록 통발마다 다 되는 시각을 따로 두지 않고, 지금 계급으로 센다(계급은 내려가지 않는다).
const WAIT=st=>Math.round(C.TRAP_MINUTES*60000*(st?ship(st).wait:1));
const slots=st=>ship(st).traps;
const ready=(at,now,st)=>now-at>=WAIT(st);
const leftMs=(at,now,st)=>Math.max(0,WAIT(st)-(now-at));
// 통발 상태: 'raise'(먼저 태극기) · 'throw'(던질 자리 있음) · 'wait'(기다리는 중) · 'haul'(건질 것 있음)
// 오늘 태극기를 아직 안 올렸으면 무엇보다 먼저 'raise'(자정을 넘겨 통발이 물에 있어도 올릴 길이 막히지 않게, 레드팀 11/20).
function phase(st,now=Date.now()){if(!raisedToday(st,now))return'raise';if(st.traps.some(t=>ready(t,now,st)))return'haul';if(st.traps.length<slots(st))return'throw';return'wait'}
// 빈 자리마다 통발을 던진다. 오늘 태극기를 올린 뒤에만 던질 수 있다. 던진 개수를 돌려준다.
function throwTraps(st,now=Date.now()){if(!raisedToday(st,now))return 0;let n=0;while(st.traps.length<slots(st)){st.traps.push(now);n++}return n}
// 확률표에서 하나 고르기. r은 0 이상 1 미만.
function roll(r){let t=Math.min(.999999,Math.max(0,+r||0));for(const c of C.CATCH){t-=c.p;if(t<0)return c}return C.CATCH[C.CATCH.length-1]}
// 다 된 통발을 모두 건진다. 잡은 것 목록을 돌려준다. 건진 자리는 비어서 바로 다시 던질 수 있다.
function haul(st,now=Date.now(),rnd=Math.random){const got=[];st.traps=st.traps.filter(at=>{if(!ready(at,now,st))return true;const c=roll(rnd());st.bag[c.id]=(st.bag[c.id]||0)+1;got.push(c);return false});return got}
const valueOf=id=>(C.CATCH.find(c=>c.id===id)||{}).value||0;
// 팔기: 창고의 모든 것을 판다. 받은 돈을 돌려준다.
function sellAll(st){let m=0;for(const[id,n]of Object.entries(st.bag))m+=valueOf(id)*n;st.bag={};st.money+=m;st.earned+=m;return m}
// 학년 사다리(스쿨 dokdo-core.js의 GRADES와 같은 순서, 시험으로 대조). 학년이 단계를 연다.
const GRADES=['K','E1','E2','E3','E4','E5','E6','M1','M2','M3','H1','H2','H3','U1','U2','U3','U4','MA1','MA2','PHD1','PHD2',...Array.from({length:12},(_,i)=>'DK'+(i+1))];
const gradeRank=g=>{const i=GRADES.indexOf(String(g||''));return i<0?0:i};
// 다음 단계: 무엇이 모자라는지까지 알려 준다(학년 · 돈 · 아직 모양 없음).
function nextStage(st,grade){const nx=C.SHIPS[st.stage];if(!nx)return{ok:false,why:'max'};const need=[];if(!nx.ready)need.push('later');if(gradeRank(grade)<gradeRank(nx.grade))need.push('grade');if(st.money<nx.price)need.push('money');return{ok:!need.length,need,ship:nx}}
function build(st,grade){const n=nextStage(st,grade);if(!n.ok)return false;st.money-=n.ship.price;st.stage=n.ship.stage;return true}
function decorate(st,kind,id){const list=kind==='flag'?C.FLAG_SIZES:kind==='sail'?C.SAILS:null,it=list&&list.find(x=>x.id===id);if(!it)return false;if(it.big&&!ship(st).bigFlag)return false;st[kind]=id;return true}
// 계급(선장 이름)과 정박 자리. 명예의 전당이면 첫째 줄.
const rank=(st,hall)=>hall?{title:C.HALL.title,ring:C.HALL.ring}:{title:ship(st).title,ring:ship(st).ring};
return{WAIT,rank,kstDay,ship,raisedToday,raise,wave,slots,ready,leftMs,phase,throwTraps,roll,haul,valueOf,sellAll,GRADES,gradeRank,nextStage,build,decorate};
});
