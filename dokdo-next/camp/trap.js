/* 힐링존 통발 값(11/20 교수님: 힐링존에도 통발). together/config.js 의 TRAP_MINUTES·FIRST_TRAP_MINUTES·CATCH 를 그대로 옮겨 적은 것.
 * 힐링존은 together/ 를 불러오지 않는다(따로 배포·시험). 두 값이 같은지는 tests/camp-trap.test.cjs 가 지킨다.
 * 생물 출처: 독도새우 3종 — 서울신문 2017.11.15 "대부분 통발로 잡지만"
 *            문어 — 매일신문 2009.4.17(독도 근해 통발 전언, 근거 약함[확인필요]). 흔한 것 가운데 가장 드물게(15%).
 * COIN: 힐링존에서 건지면 바로 받는 대황(낚시 교환소 값과 어울리게: 새우 2 · 문어 3 · 도화새우 9). */
(function(root){
'use strict';
const T={
 TRAP_MINUTES:60,
 FIRST_TRAP_MINUTES:3,
 CATCH:[
  {id:'mullung',name:'물렁가시붉은새우',rare:false,p:.40},
  {id:'gasibae',name:'가시배새우',rare:false,p:.37},
  {id:'octopus',name:'문어',rare:false,p:.15},
  {id:'dohwa',name:'도화새우',rare:true,p:.08}
 ],
 COIN:{mullung:2,gasibae:2,octopus:3,dohwa:9}
};
if(typeof module==='object'&&module.exports)module.exports=T;else root.DokdoHealTrap=T;
})(typeof globalThis!=='undefined'?globalThis:this);
