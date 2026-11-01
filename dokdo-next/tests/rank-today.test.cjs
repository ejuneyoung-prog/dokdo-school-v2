'use strict';
// Device-only tally that tells a learner whether a correct answer counted toward today's weekly ranking.
const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','assets','app.js'),'utf8');
function load(){const store={},els={'rank-today':{textContent:'',hidden:true}};const ctx={localStorage:{getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v);}},$:id=>els[id],tr:(ko)=>ko};
 const body=src.slice(src.indexOf('const RANK_TODAY_KEY'),src.indexOf('function toast(message)'));
 const fn=new Function('localStorage','$','tr',body+';return {rankTodayMark,showRankToday,rankQid};');return {api:fn(ctx.localStorage,ctx.$,ctx.tr),store,els};}
test('same question on the same Korea day counts once',()=>{const {api,els}=load();api.showRankToday('Tester',920001);assert.match(els['rank-today'].textContent,/1개/);api.showRankToday(' tester',920001);assert.match(els['rank-today'].textContent,/이미 순위에/);api.showRankToday('Tester',920006);assert.match(els['rank-today'].textContent,/2개/);});
test('new Korea day, other nickname or broken storage starts fresh',()=>{const {api,store}=load();assert.equal(api.rankTodayMark('A',920001).count,1);assert.equal(api.rankTodayMark('A',920001,Date.now()+864e5).fresh,true);assert.equal(api.rankTodayMark('B',920001).fresh,true);store['dokdo-rank-today']='{bad';assert.equal(api.rankTodayMark('A',920001).count,1);});
test('no nickname or out-of-range question shows nothing',()=>{const {api,els}=load();api.showRankToday('',920001);api.showRankToday('A','abc');api.showRankToday('A',5000);assert.equal(els['rank-today'].hidden,true);assert.equal(api.rankQid(1999),true);assert.equal(api.rankQid(920999),true);assert.equal(api.rankQid(921000),false);});
