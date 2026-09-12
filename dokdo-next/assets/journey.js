/* A 1,025-credit learning circuit: Dongdo 500, Seodo 500, 25 commemorative markers.
 * 25 is NOT the actual number of Dokdo's offshore islets. Legacy achievements survive.
 * This is a local learning reward, NOT a tamper-proof competitive ranking.
 */
(function(r,f){const a=f();if(typeof module==='object'&&module.exports)module.exports=a;else r.DokdoJourney=a;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';const LAP=1025,COLORS=['#F4C85F','#F5F9FF','#65E0BF'];
function natural(n){return Number.isSafeInteger(n)&&n>=0;}
function baseline(s){let c=0,l=0;for(const r of Object.values(s.m||{})){c+=Number.isSafeInteger(r.cor)?r.cor:0;if(Math.max(r.lightBest||0,r.lv||0,r.cor>0?1:0)>0)l++;}return Math.max(c,l);}
function ensure(s){
 if(!s.visual)s.visual={};
 if(!s.visual.journey)s.visual.journey={version:1,legacy:baseline(s),earned:0,inviteRemainder:0};
 validate(s);return s.visual.journey;
}
function validate(s){const j=s.visual?.journey;if(j==null)return true;
 if(j.version!==1||!natural(j.legacy)||!natural(j.earned)||!natural(j.legacy+j.earned)||!natural(j.inviteRemainder)||j.inviteRemainder>=10)throw Error('Invalid journey record.');return true;}
function progress(s){const j=s.visual?.journey||{legacy:baseline(s),earned:0};const total=j.legacy+j.earned,laps=Math.floor(total/LAP),part=total%LAP;
 const wholeLaps=laps,shownLap=part===0&&laps>0?laps:laps+1,filled=part===0&&laps>0?LAP:part;
 const blocks=Math.min(100,Math.floor(filled/10));
 const east=Math.min(500,Math.floor(Math.min(filled,1000)/20)*10+Math.min(filled%20,10));
 const west=Math.min(500,Math.floor(Math.min(filled,1000)/20)*10+Math.max(0,filled%20-10));
 return {total,legacy:j.legacy,earned:j.earned,laps:wholeLaps,shownLap,filled,remaining:LAP-filled,east,west,markers:Math.max(0,filled-1000),flags:wholeLaps?100:blocks,color:COLORS[Math.min(2,shownLap-1)],previousColor:COLORS[Math.min(2,Math.max(0,shownLap-2))]};
}
function earned(s){const j=ensure(s);if(j.legacy+j.earned>=Number.MAX_SAFE_INTEGER)throw Error('Journey counter is full.');j.earned++;j.inviteRemainder++;
 let invitation=false;if(j.inviteRemainder===10){j.inviteRemainder=0;s.gcHit=(s.gcHit||0)+5;invitation=true;}return {invitation,...progress(s)};}
function protects(incoming,current){if(!current?.visual?.journey||progress(current).total===0)return true;const a=progress(current),b=progress(incoming);if(b.total<a.total||!incoming.visual?.journey)throw Error('This backup would lose the learning path.');return true;}
return {LAP,COLORS,baseline,ensure,validate,progress,earned,protects};
});
