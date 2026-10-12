'use strict';
const {test}=require('node:test');
const a=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const load=()=>{const ctx={window:{},URL,navigator:{},document:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/share.js'),'utf8'),ctx);return ctx.window.DokdoShare;};
const BASE='https://dokdo-school-v2.vercel.app/dokdo-next/';
test('Share links carry only the fixed utm source and medium',()=>{
 const S=load();
 for(const src of ['link','yt_live','os_share','kakao']){
  const u=new URL(S.withUtm(BASE,src));
  a.equal(u.origin+u.pathname,BASE);
  a.deepEqual([...u.searchParams.keys()].sort(),['utm_medium','utm_source']);
  a.equal(u.searchParams.get('utm_source'),src);a.equal(u.searchParams.get('utm_medium'),'share');
 }
 // 정해진 이름이 아니면(별명 등 사용자 값) 주소를 바꾸지 않습니다.
 a.equal(S.withUtm(BASE,'9to9'),BASE);
 a.equal(S.withUtm('not a url','link'),'not a url');
});
