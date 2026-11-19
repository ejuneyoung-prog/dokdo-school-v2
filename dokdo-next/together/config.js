/* DOKDO TOGETHER 설정값. 숫자·이름·표는 모두 여기서만 바꾼다(교수님 결정 2026-11-20: 통발 1시간, 문어 포함).
 * 생물 출처: 독도새우 3종 — 서울신문 2017.11.15 "대부분 통발로 잡지만", 종·수심은 낚시 놀이(assets/fishing.js SRC 6·7)와 같다.
 *            문어 — 매일신문 2009.4.17 "독도 근해에 워낙 그물과 통발을 많이 놓으니까 문어들이 … 잡혀버린다고들 한다"(전언, 근거 약함[확인필요]).
 *                   기사 취지는 독도 근해 문어가 줄었다는 것이라, 흔한 것 가운데 가장 드물게(15%) 둔다(레드팀 11/20). 교수님 결정으로 넣음(11/20).
 * 홍게는 독도 근해 통발 조업을 확인하지 못해 넣지 않았다(통발 사고 기사는 독도에서 168km 떨어진 공해). */
(function(root){
'use strict';
const C={
 NAME:'DOKDO TOGETHER',
 STORE_KEY:'dokdo-together-v1',
 // 게임 속 돈 이름은 아직 정하지 않았다(교수님 결정 대기). 정하면 이 두 줄만 바꾼다.
 MONEY:{ko:'돈',en:'coins'},
 TRAP_MINUTES:60,           // 통발을 던지고 건질 수 있을 때까지(분)
 // 통발에 드는 것: 흔한 것 셋, 귀한 것 하나. en은 널리 확실한 영어 이름만(새우 셋은 비움, 낚시 놀이와 같은 원칙). p는 확률(합 1), value는 팔 때 받는 돈.
 CATCH:[
  {id:'mullung',name:'물렁가시붉은새우',en:'',alias:'꽃새우',rare:false,p:.40,value:12,src:'서울신문 2017 · 경북매일 2018',url:['https://m.go.seoul.co.kr/news/2017/11/15/20171115012008','https://kbmaeil.com/article/201805040221061']},
  {id:'gasibae',name:'가시배새우',en:'',alias:'닭새우',rare:false,p:.37,value:15,src:'서울신문 2017 · 경북매일 2018',url:['https://m.go.seoul.co.kr/news/2017/11/15/20171115012008','https://kbmaeil.com/article/201805040221061']},
  {id:'octopus',name:'문어',en:'Octopus',alias:'',rare:false,p:.15,value:20,src:'매일신문 2009(전언)',url:['https://www.imaeil.com/page/view/2009041709164933381']},
  {id:'dohwa',name:'도화새우',en:'',alias:'독도새우 가운데 가장 큼',rare:true,p:.08,value:60,src:'서울신문 2017 · 서울신문 2019',url:['https://m.go.seoul.co.kr/news/2017/11/15/20171115012008','https://m.go.seoul.co.kr/news/2019/05/29/20190529500039']}
 ],
 // 배(집) 단계 = 선장 계급. 학년(grade)이 그 단계를 열고, 통발로 번 돈(price)으로 짓는다. 1차는 1~3단계만 모양이 있다.
 // 계급이 높을수록 받는 혜택(교수님 2026-11-20 "계급이 높은 사람들에 대한 혜택, 계급화 몰입"):
 //  traps 통발 수 · wait 통발 기다림 배율(1=TRAP_MINUTES) · ring 정박 자리(작을수록 독도에 가깝다) · bigFlag 큰 태극기
 // 4~7단계는 자리만 둔다(ready:false). 단계를 늘릴 때는 이 표와 ship.js의 모양만 더한다.
 SHIPS:[
  {stage:1,title:'새내기 선장',name:'작은 배',traps:1,wait:1,ring:3,bigFlag:false,price:0,grade:'K',ready:true},
  {stage:2,title:'독도 선장',name:'중간 배 · 선실 한 칸',traps:2,wait:.9,ring:2,bigFlag:true,price:150,grade:'M1',ready:true},
  {stage:3,title:'독도 큰선장',name:'큰 배 · 2층 선실',traps:3,wait:.75,ring:1,bigFlag:true,price:600,grade:'U1',ready:true},
  {stage:4,title:'독도 대선장',name:'방 늘리기',traps:4,wait:.7,ring:1,bigFlag:true,price:1500,grade:'MA1',ready:false},
  {stage:5,title:'독도 선단장',name:'지붕 올리기',traps:5,wait:.65,ring:1,bigFlag:true,price:3000,grade:'PHD1',ready:false},
  {stage:6,title:'독도 바다 지킴이',name:'마당 갑판',traps:6,wait:.6,ring:1,bigFlag:true,price:6000,grade:'DK1',ready:false},
  {stage:7,title:'독도 수호 선장',name:'독도 지킴이 큰집 배',traps:7,wait:.5,ring:1,bigFlag:true,price:12000,grade:'DK12',ready:false}
 ],
 // 명예의 전당(스쿨 퀴즈 최고 단계 도달자, 운영자 승인분)은 계급과 상관없이 첫째 줄(ring 0)에 금빛 돛대로 뜬다.
 HALL:{title:'명예 선장',ring:0},
 // 태극기 흔들기: 하루에 셀 수 있는 최대 횟수(마구 누르기로 순위를 올리지 못하게). 순위는 서버가 붙은 뒤에만 공개한다.
 WAVE_PER_DAY:20,
 // 꾸미기(1차는 둘): 깃발 크기와 돛 문양. 모두 무료. '크게'는 bigFlag 계급부터.
 FLAG_SIZES:[{id:'s',name:'작게',scale:.8},{id:'m',name:'보통',scale:1},{id:'l',name:'크게',scale:1.35,big:true}],
 SAILS:[{id:'plain',name:'흰 돛'},{id:'stripe',name:'줄무늬 돛'},{id:'wave',name:'물결 돛'}],
 // 독도 앞바다: 가까운 배만 입체로, 나머지는 깃발 점으로.
 NEAR_SHIPS:12,
 SAMPLE_SHIPS:48,           // 견본 배 수(1차 임시 저장 — 실제 이용자가 아님)
 // 2차 자리(만들지 않음): 낚시 → 오늘의 문제 보상 → 응원 깃발 → 선장 복장·강치·삽살개 → 라이브 명예의 전당 → 실제 저장소·실시간
 LATER:['fishing','quizBonus','cheer','captain','liveHall','server']
};
if(typeof module==='object'&&module.exports)module.exports=C;else root.DokdoTogetherConfig=C;
})(typeof globalThis!=='undefined'?globalThis:this);
