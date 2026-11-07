'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
test('The privacy policy covers the items the law asks for, in both languages',()=>{
 const page=read('privacy.html');
 for(const title of ['받는 정보와 쓰는 곳','맡긴 업체와 해외로 가는 정보','만 14세 미만 어린이','파기','이용자와 보호자의 권리','안전 조치','쿠키와 자동 수집','개인정보 보호책임자'])a.ok(page.includes(title),title);
 for(const title of ['What we collect','Service providers and transfers abroad','Children under 14','Deletion','Your rights','How we protect information','Cookies','Privacy officer'])a.ok(page.includes(title),title);
 a.doesNotMatch(page,/확인 필요|TBD|TODO/);
});
test('Every entrance links to the privacy policy',()=>{
 for(const name of ['index.html','games.html','fishing.html','typing.html','account.html'])a.match(read(name),/href="\.\/privacy\.html"/,name);
});
test('The policy names every outside service the school page connects to',()=>{
 const page=read('privacy.html');
 for(const name of ['Google LLC','Vercel Inc.','Supabase Inc.','Open-Meteo','jsDelivr','유튜브','카카오'])a.ok(page.includes(name),name);
});
