const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),{spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
function client(mode,withoutDocument=false){
 const requests=[],scripts=[];
 const context={window:{DOKDO_SITE_CONFIG:{leaderboard:{apiUrl:'https://example.invalid/test-only'},analytics:{gaId:'G-TESTONLY'}}},AbortController,setTimeout,clearTimeout,
  fetch:async(url,options)=>{requests.push({url,options});return {ok:true,headers:{get:()=> 'application/json'},json:async()=>({found:true,tops:[],temperature:10,station:'test'})};}};
 if(!withoutDocument)context.document={querySelector:()=>mode===null?null:{content:mode},createElement:()=>({}),head:{appendChild:s=>scripts.push(s)}};
 vm.createContext(context);
 for(const name of ['leaderboard.js','analytics.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,'assets',name),'utf8'),context);
 return {context,requests,scripts};
}
async function callBackend(c){const b=c.window.DokdoLeaderboard;await b.fetchWeekly();await b.fetchLive();await b.postEvent({nick:'fictional',qid:920001});await b.loadProgress('fictional');await b.saveProgress('fictional','fictional','K','{}');await b.fetchKhoaWeather();await b.reportTopLevel('fictional','K',1);await b.fetchTops();}
for(const mode of ['preview','demo','unknown',null])test('Non-live mode '+String(mode)+' cannot read/write the operating backend or load analytics',async()=>{
 const h=client(mode);a.equal(h.context.window.DokdoLeaderboard.isConfigured(),false);
 await callBackend(h.context);h.context.window.DokdoAnalytics.track('question_answered',{qid:920001});
 a.equal(h.requests.length,0);a.equal(h.scripts.length,0);a.equal(h.context.window.dataLayer,undefined);
});
test('A document-less VM fails closed without throwing',async()=>{const h=client(null,true);await callBackend(h.context);h.context.window.DokdoAnalytics.track('question_answered');a.equal(h.requests.length,0);a.equal(h.scripts.length,0);});
test('Explicit live mode preserves configured backend and analytics behavior',async()=>{
 const h=client('live');a.equal(h.context.window.DokdoLeaderboard.isConfigured(),true);await callBackend(h.context);
 a.equal(h.requests.length,8);a.equal(h.requests.filter(r=>r.options.method==='POST').length,3);
 h.context.window.DokdoAnalytics.track('question_answered',{qid:920001});a.equal(h.scripts.length,1);a.match(h.scripts[0].src,/gtag\/js\?id=G-TESTONLY$/);a.equal(h.context.window.dataLayer.length,3);
});
test('Switching a live document to preview blocks subsequent backend and analytics events',async()=>{
 const h=client('live');h.context.window.DokdoAnalytics.track('before');a.equal(h.context.window.dataLayer.length,3);
 h.context.document.querySelector=()=>({content:'preview'});await callBackend(h.context);h.context.window.DokdoAnalytics.track('after');
 a.equal(h.requests.length,0);a.equal(h.scripts.length,1);a.equal(h.context.window.dataLayer.length,3);
});
test('The generated portable preview strips operating backend and analytics configuration',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dokdo-preview-isolation-')),output=path.join(dir,'preview.html');
 try{const run=spawnSync('python3',[path.join(ROOT,'tools/build_preview.py'),output],{encoding:'utf8'});a.equal(run.status,0,run.stderr);
  const html=fs.readFileSync(output,'utf8');a.match(html,/name="dokdo-mode" content="preview"/);a.match(html,/leaderboard:Object\.freeze\(\{apiUrl:''\}\)/);a.match(html,/analytics:Object\.freeze\(\{gaId:''\}\)/);
  a.doesNotMatch(html,/AKfycb[A-Za-z0-9_-]+\/exec/);a.doesNotMatch(html,/gaId:'G-[A-Z0-9]+'/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
