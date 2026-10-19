/* Local, derived decoration only. Never changes school XP, ranks or records. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.DokdoGarden=api;})(typeof window!=='undefined'?window:{},function(host){
'use strict';
const bounded=(n,max)=>Number.isSafeInteger(n)&&n>0?Math.min(max,n):0;
let cachedLearning=0,checkedAt=0;
function learning(){
 const M=host.DokdoAppModel,Core=host.DokdoCore;
 if(!M)return 0;
 if(host.DokdoApp?.state)return bounded(M.summary(host.DokdoApp.state).lights,100);
 if(Date.now()-checkedAt<2000)return cachedLearning;checkedAt=Date.now();
 try{const raw=host.localStorage?.getItem(M.KEY);if(!raw)return cachedLearning=0;const s=JSON.parse(raw);Core.validateState(s);cachedLearning=bounded(M.summary(s).lights,100);}catch(e){cachedLearning=0;}
 return cachedLearning;
}
function plan(s,learned=0){const G=host.DokdoGames||(typeof require==='function'?require('./games-core.js'):null);const p=G.gardenPlan(s,learned);if(G.islandComplete(s,learned)){p.complete=true;p.next='star';}return p;}
function view(s){return plan(s,learning());}
return{plan,view,learning};
});
