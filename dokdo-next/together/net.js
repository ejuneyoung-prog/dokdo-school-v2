/* 통신 자리(2차: 실시간 만남). 1차는 아무것도 보내지 않고 아무것도 받지 않는다.
 * 2차에 붙일 모양: connect() → 방 · room.presence(내 배 요약) · room.onPeers(목록 받기) · room.leave()
 * 지금은 connect()가 늘 null을 돌려주어 화면은 "혼자" 상태로 동작한다. */
(function(root){
'use strict';
const api={kind:'none',connect(){return null}};
if(typeof module==='object'&&module.exports)module.exports=api;else root.DokdoTogetherNet=api;
})(typeof globalThis!=='undefined'?globalThis:this);
