'use strict';
const test=require('node:test'),a=require('node:assert/strict'),M=require('../assets/app-model.js');
const state=(ageBand)=>{const s=M.fresh();M.selectProfile(s,ageBand,false);s.name='fixture';s.flag='KR';s.school='fixture-school';s.schoolCat='E';s.recoveryCode='1234';return s;};
const gate=(seed={},hashes=[])=>{const m=new Map(Object.entries(seed));globalThis.localStorage={getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};globalThis.DOKDO_SITE_CONFIG={guardianConsentHashes:hashes};return require('../assets/privacy-gate.js');};
test('Only an age chosen on this device, or a guardian consent still on the list, may share',()=>{
 const P=gate();a.equal(P.mayShare(),false);
 for(const band of ['u7','8-9','10-11','12-13']){P.setDeviceAge(band);a.equal(P.mayShare(),false,band);a.equal(P.knownChild(),true,band);}
 for(const band of ['14-16','17-19','20+']){P.setDeviceAge(band);a.equal(P.mayShare(),true,band);}
 P.setDeviceAge('not-a-band');a.equal(P.deviceAge(),'20+');
});
test('A guardian consent stops when its code leaves the list, and reset clears it',()=>{
 const P=gate({},['abc']);P.setDeviceAge('10-11');a.equal(P.saveConsent('wrong'),false);a.equal(P.mayShare(),false);
 a.equal(P.saveConsent('abc'),true);a.equal(P.mayShare(),true);a.equal(P.knownChild(),false);
 globalThis.DOKDO_SITE_CONFIG.guardianConsentHashes=[];a.equal(P.mayShare(),false);a.equal(P.knownChild(),true);
 globalThis.DOKDO_SITE_CONFIG.guardianConsentHashes=['abc'];P.clear();a.equal(P.mayShare(),false);a.equal(P.deviceAge(),'');
});
test('The server copy leaves out age band, school and recovery number, and old code can still read it',()=>{
 const text=M.serverCopyText(state('14-16')),d=JSON.parse(text);
 a.equal(d.serverCopy,1);a.equal(d.state.name,'fixture');a.equal(d.state.school,'');a.equal(d.state.recoveryCode,'');a.equal(d.state.schoolCat,'');a.equal(d.state.learningProfile.ageBand,'20+');
 for(const word of ['fixture-school','1234','14-16'])a.equal(text.includes(word),false,word);
 const restored=M.parseImport(text,null);a.equal(restored.name,'fixture');
});
test('A server copy restores on an empty device',()=>{
 const s=state('20+');s.xp=77;const copy=M.readServerCopy(M.serverCopyText(s),null);
 const restored=M.parseImport(copy,null);a.equal(restored.xp,77);a.equal(restored.name,'fixture');a.equal(restored.school,'');a.equal(restored.recoveryCode,'');
});
test('A server copy merges on a device with progress and keeps this device values',()=>{
 const s=state('14-16');const here=state('14-16');here.school='here-school';here.recoveryCode='9999';
 const copy=M.readServerCopy(M.serverCopyText(s),here);
 const merged=M.mergeStates(here,copy);a.equal(merged.school,'here-school');a.equal(merged.learningProfile.ageBand,'14-16');a.equal(merged.recoveryCode,'9999');
});
test('Records saved in the old form still load, and cannot change this device age band',()=>{
 const s=state('20+');s.xp=33;const old=M.backupText(s);a.equal(M.readServerCopy(old,null),old);
 const restored=M.parseImport(old,null);a.equal(restored.school,'fixture-school');
 const kid=state('10-11'),merged=M.mergeStates(kid,M.readServerCopy(old,kid));a.equal(merged.learningProfile.ageBand,'10-11');
});
test('The configuration holds only hashes of guardian codes',()=>{
 const fs=require('fs'),path=require('path'),config=fs.readFileSync(path.join(__dirname,'../assets/site-config.js'),'utf8');
 const list=config.match(/guardianConsentHashes:Object\.freeze\(\[([^\]]*)\]\)/);a.ok(list);
 for(const item of list[1].split(',').map(t=>t.trim()).filter(Boolean))a.match(item,/^'[0-9a-f]{64}'$/);
});
