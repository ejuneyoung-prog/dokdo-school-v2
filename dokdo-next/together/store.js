/* 저장소 인터페이스. 화면은 이 모양만 안다:
 *   load() → 이용자 상태 또는 null · save(st) → true/false · fleet() → Promise<배 목록> · kind
 * 1차는 LocalStore 하나다: 내 배는 이 기기(localStorage)에만 남고, 다른 배는 견본(sample:true)이다. 실제 이용자가 아니다.
 * 2차에 서버 저장소를 붙일 때는 같은 모양의 ServerStore를 만들어 make()에서 바꾸기만 한다(HANDOFF.md). */
(function(root,factory){const isNode=typeof module==='object'&&module.exports;const C=isNode?require('./config.js'):root.DokdoTogetherConfig,U=isNode?require('./user.js'):root.DokdoTogetherUser;const api=factory(C,U);if(isNode)module.exports=api;else root.DokdoTogetherStore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(C,U){
'use strict';
// 견본 배: 매번 같은 결과가 나오도록 씨앗 난수로 만든다. 이름은 "견본 선장 N" — 실제 사람처럼 보이지 않게.
function sampleFleet(n=C.SAMPLE_SHIPS,seed=20261120){let x=seed>>>0;const rnd=()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296};
 const cc=['KR','KR','KR','KR','US','CA','AU','DE','FR','VN','PH','BR','MX','GB','NZ','ID'],out=[];
 for(let i=0;i<n;i++){const r=rnd(),stage=r<.6?1:r<.88?2:3;const days=1+Math.floor(rnd()*rnd()*20);/* 시제품 견본: 문을 연 지 얼마 안 된 곳이라 지킨 날은 20일 안쪽 */out.push({id:'sample'+i,sample:true,nick:'견본 선장 '+(i+1),cc:cc[Math.floor(rnd()*cc.length)],stage,flag:stage>1&&rnd()<.4?'l':'m',sail:C.SAILS[Math.floor(rnd()*C.SAILS.length)].id,days,waves:Math.floor(days*C.WAVE_PER_DAY*rnd()),spot:{a:rnd()*Math.PI*2}})}
 return out}
function LocalStore(storage){const ls=storage||(typeof localStorage!=='undefined'?localStorage:null);
 return{kind:'local',
  load(){try{const raw=ls&&ls.getItem(C.STORE_KEY);return raw?U.tidy(JSON.parse(raw)):null}catch(e){return null}},
  save(st){try{ls.setItem(C.STORE_KEY,JSON.stringify(st));return true}catch(e){return false}},
  fleet(){return Promise.resolve(sampleFleet())}}}
const make=storage=>LocalStore(storage);
return{sampleFleet,LocalStore,make};
});
