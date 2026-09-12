const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const M=require('../assets/app-model.js'),ids=require('../data/legacy-question-ids.json');
let seed=12345678;function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
const cases=[];const now=Date.parse('2026-09-11T03:00:00Z');
for(let k=0;k<200;k++){
 const s=M.fresh(now),count=k===199?1513:Math.floor(rand()*1514);s.name='Synthetic '+k;s.grade=['K','E6','M3','H3','PHD2'][k%5];s.xp=Math.floor(rand()*50000);s.gcHit=Math.floor(rand()*120);
 for(const id of ids.slice(0,count)){const cor=1+Math.floor(rand()*12),lv=1+Math.floor(rand()*4);s.m[id]={lv,cor,att:cor+3,seen:cor+3,earned:cor*10,due:'2026-09-12'};}
 M.ensure(s,now);const raw=JSON.stringify(s);
 const mem=new M.MemoryStorage({[M.OLD_KEYS[0]]:raw}),store=new M.Store(mem,{now:()=>now});store.load();
 const candidate=M.legacyCandidates(mem)[0];assert.ok(candidate);store.importState(candidate.state,raw);
 const exported=M.backupText(store.state,'ko',now),restored=M.parseImport(exported,M.fresh(now),now);
 assert.deepEqual(restored.m,s.m);assert.equal(restored.xp,s.xp);assert.equal(restored.gcHit,s.gcHit);assert.equal(restored.grade,s.grade);
 assert.equal(mem.getItem(M.OLD_KEYS[0]),raw);assert.deepEqual(restored.scene.order,s.scene.order);
 cases.push({case:k,questions:count,preserved:true});
}
const out=process.argv[2]||path.join(__dirname,'migration-results.json');
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify({synthetic:true,seed:12345678,cases:200,failed:0,details:cases},null,2));
console.log('200 synthetic legacy copies/export/restore cases passed.');
