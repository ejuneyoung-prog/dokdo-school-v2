'use strict';
/* 처리방침의 한국어·영어를 고릅니다. 저장값은 앱의 언어 설정을 읽기만 합니다. */
(()=>{
 const ko=document.getElementById('policy-ko'),en=document.getElementById('policy-en'),button=document.getElementById('policy-language');
 let lang='ko';
 try{lang=new URLSearchParams(location.search).get('lang')==='en'||localStorage.getItem('dokdo-ui-language-v1')==='en'?'en':'ko';}catch(e){}
 const show=()=>{ko.hidden=lang==='en';en.hidden=lang!=='en';document.documentElement.lang=lang;document.title=lang==='en'?'Privacy Policy · Dokdo Korea School':'개인정보 처리방침 · 독도 코리아 스쿨';button.textContent=lang==='en'?'한국어':'English';};
 button.addEventListener('click',()=>{lang=lang==='en'?'ko':'en';show();});
 show();
})();
