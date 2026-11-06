'use strict';
const test=require('node:test'),a=require('node:assert/strict'),M=require('../assets/app-model.js');
const state=(ageBand)=>{const s=M.fresh();M.selectProfile(s,ageBand,false);s.name='fixture';s.flag='KR';s.school='fixture-school';s.schoolCat='E';s.recoveryCode='1234';return s;};
test('Only known ages of 14 or older, or a guardian consent, may share',()=>{
 for(const band of ['u7','8-9','10-11','12-13'])a.equal(M.mayShare(state(band)),false,band);
 for(const band of ['14-16','17-19','20+'])a.equal(M.mayShare(state(band)),true,band);
 a.equal(M.mayShare(M.fresh()),false);a.equal(M.mayShare(state('10-11'),true),true);
 a.equal(M.mayShare(state('10-11'),'1'),false);
});
test('The server copy leaves out age band, school and recovery number',()=>{
 const text=M.serverCopyText(state('20+')),d=JSON.parse(text);
 a.equal(d.serverCopy,1);a.equal(d.state.name,'fixture');
 for(const word of ['fixture-school','1234','ageBand','schoolCat','recoveryCode'])a.equal(text.includes(word),false,word);
});
test('A server copy restores on an empty device and asks for the age again',()=>{
 const s=state('20+');s.xp=77;const copy=M.readServerCopy(M.serverCopyText(s),null);a.equal(copy.needsAge,true);
 const restored=M.parseImport(copy.text,null);a.equal(restored.xp,77);a.equal(restored.name,'fixture');a.equal(restored.school,'');a.equal(restored.recoveryCode,'');
});
test('A server copy merges on a device with progress and keeps this device values',()=>{
 const s=state('14-16');const here=state('14-16');here.school='here-school';here.recoveryCode='9999';
 const copy=M.readServerCopy(M.serverCopyText(s),here);a.equal(copy.needsAge,false);
 const merged=M.mergeStates(here,copy.text);a.equal(merged.school,'here-school');a.equal(merged.learningProfile.ageBand,'14-16');a.equal(merged.recoveryCode,'9999');
});
test('Records saved in the old form still load unchanged',()=>{
 const s=state('20+');s.xp=33;const old=M.backupText(s),copy=M.readServerCopy(old,null);a.equal(copy.text,old);a.equal(copy.needsAge,false);
 const restored=M.parseImport(copy.text,null);a.equal(restored.school,'fixture-school');a.equal(restored.learningProfile.ageBand,'20+');
});
test('The guardian code tool keeps the plain code out of the configuration',()=>{
 const fs=require('fs'),path=require('path'),config=fs.readFileSync(path.join(__dirname,'../assets/site-config.js'),'utf8');
 a.match(config,/guardianConsentHashes:Object\.freeze\(\[\s*\]\)/);
});
