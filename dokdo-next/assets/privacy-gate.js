/* 서버와 통계로 무엇을 보낼 수 있는지 한곳에서 정합니다.
 * 나이대는 기록이 아니라 이 기기에서 직접 고른 값만 믿습니다.
 * 불러온 기록이 어른 나이대를 담고 있어도 어린이 기기의 전송을 열지 않기 위해서입니다. */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.DokdoPrivacy=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const AGE_KEY='dokdo-device-age-v1',CONSENT_KEY='dokdo-guardian-consent-v2';
const CHILD=['u7','8-9','10-11','12-13'],OLDER=['14-16','17-19','20+'];
const read=key=>{try{return root.localStorage?.getItem(key)||'';}catch(e){return '';}};
const write=(key,value)=>{try{root.localStorage?.setItem(key,value);}catch(e){}};
const remove=key=>{try{root.localStorage?.removeItem(key);}catch(e){}};
function deviceAge(){const band=read(AGE_KEY);return CHILD.includes(band)||OLDER.includes(band)?band:'';}
function setDeviceAge(band){if(CHILD.includes(band)||OLDER.includes(band))write(AGE_KEY,band);}
function hashes(){const list=root.DOKDO_SITE_CONFIG?.guardianConsentHashes;return Array.isArray(list)?list:[];}
function consent(){const stored=read(CONSENT_KEY);return !!stored&&hashes().includes(stored);}
function saveConsent(hash){if(hashes().includes(hash)){write(CONSENT_KEY,hash);return true;}return false;}
function isChildBand(band){return CHILD.includes(band);}
function knownChild(){return isChildBand(deviceAge())&&!consent();}
function mayShare(){return OLDER.includes(deviceAge())||consent();}
function clear(){remove(AGE_KEY);remove(CONSENT_KEY);}
return{AGE_KEY,CONSENT_KEY,deviceAge,setDeviceAge,consent,saveConsent,isChildBand,knownChild,mayShare,clear};
});
