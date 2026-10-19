/* Presentation regressions only. No network or learner record writes. */
'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),Core=require('../assets/dokdo-core.js');
const src=fs.readFileSync(require('node:path').join(__dirname,'../assets/app.js'),'utf8');const a=src.indexOf('function renderGrade(){'),b=src.indexOf('function renderVisitors()',a);const render=src.slice(a,b);
function fixture(rank,en=false){
 function element(tag){return{tag,children:[],attributes:{},textContent:'',append(...x){this.children.push(...x);},replaceChildren(){this.children=[];},setAttribute(k,v){this.attributes[k]=v;}};}
 const nodes={},state=Object.freeze({name:'UI fixture',xp:42}),$=id=>nodes[id]||(nodes[id]=element('div'));
 const c=vm.createContext({getS:()=>state,M:{summary:()=>({gradeScore:rank,correct:0,xp:42})},Core:{...Core,gradeProgress:r=>({rank:r,grade:Core.GRADES[r],need:45,have:7,graduated:r===32})},$: $,txt:(id,value)=>$(id).textContent=value,num:String,tr:(ko,english)=>en?english:ko,gradeLabel:String,document:{createElement:element}});vm.runInContext(render,c);c.renderGrade();return{nodes,state};
}
test('all 33 ranks retain order, one current stage and a current group without mutating records',()=>{
 for(let rank=0;rank<Core.GRADES.length;rank++){
  const {nodes,state}=fixture(rank),groups=nodes['grade-ladder'].children,rows=groups.flatMap(g=>g.children[1].children);assert.equal(groups.length,5);assert.equal(rows.length,Core.GRADES.length);assert.deepEqual(rows.map(r=>r.children[1].textContent),Core.GRADES);assert.equal(rows.filter(r=>r.className==='grade-row current').length,1);assert.equal(rows[rank].attributes['aria-current'],'step');assert.equal(groups.filter(g=>g.open).length,1);assert.ok(groups.find(g=>g.open).children[1].children.includes(rows[rank]));assert.equal(rows.filter(r=>r.className==='grade-row done').length,rank);assert.deepEqual(state,{name:'UI fixture',xp:42});
 }
});
test('stage states are visible text and bilingual; closed groups retain every future stage',()=>{
 for(const en of [false,true]){const {nodes}=fixture(10,en),groups=nodes['grade-ladder'].children,rows=groups.flatMap(g=>g.children[1].children);assert.match(rows[0].children[2].textContent,en?/Completed/:/완료/);assert.match(rows[10].children[2].textContent,en?/Current/:/현재/);assert.match(rows[11].children[2].textContent,en?/Up next/:/다음/);assert.equal(groups.filter(g=>!g.open).flatMap(g=>g.children[1].children).length,27);}
});
