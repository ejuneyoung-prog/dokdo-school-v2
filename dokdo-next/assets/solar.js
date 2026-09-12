/* Solar-only adaptation of SunCalc 1.9.0, (c) 2014 Vladimir Agafonkin.
 * BSD-2-Clause, full notice in licenses/SUNCALC-LICENSE.txt.
 * Approximate geometric times, not measured observations or a navigation aid.
 */
(function(r,f){const a=f();if(typeof module==='object'&&module.exports)module.exports=a;else r.DokdoSolar=a;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const RAD=Math.PI/180,DAY=86400000,J2000=2451545,PI=Math.PI;
const sin=Math.sin,cos=Math.cos,asin=Math.asin,acos=Math.acos,atan=Math.atan2;
const days=t=>+new Date(t)/DAY+2440587.5-J2000;
const fromJ=j=>(j-2440587.5)*DAY;
function coords(d){const M=RAD*(357.5291+.98560028*d),L=M+RAD*(1.9148*sin(M)+.02*sin(2*M)+.0003*sin(3*M))+RAD*102.9372+PI;
 return {M,L,dec:asin(sin(L)*sin(RAD*23.4397)),ra:atan(sin(L)*cos(RAD*23.4397),cos(L))};}
function altitude(t,lat,lon){const d=days(t),c=coords(d),h=RAD*(280.16+360.9856235*d)+RAD*lon-c.ra,p=lat*RAD;
 return asin(sin(p)*sin(c.dec)+cos(p)*cos(c.dec)*cos(h))/RAD;}
function times(t=Date.now(),lat=37.241,lon=131.864){
 // Anchor to local noon on the Korean date, regardless of the user's device timezone.
 const day=new Date(+new Date(t)+9*3600000).toISOString().slice(0,10),noon=Date.parse(day+'T03:00:00Z');
 const lw=-lon*RAD,d=days(noon),n=Math.round(d-.0009-lw/(2*PI)),ds=.0009+lw/(2*PI)+n,c=coords(ds),phi=lat*RAD;
 const transit=x=>J2000+x+.0053*sin(c.M)-.0069*sin(2*c.L),jn=transit(ds),out={day,solarNoon:fromJ(jn)};
 for(const [angle,rise,set] of [[-.833,'sunrise','sunset'],[-6,'dawn','dusk']]){
  const u=(sin(angle*RAD)-sin(phi)*sin(c.dec))/(cos(phi)*cos(c.dec));
  if(u < -1 || u > 1){out[rise]=out[set]=null;continue;}
  const jset=transit(.0009+(acos(u)+lw)/(2*PI)+n);out[rise]=fromJ(2*jn-jset);out[set]=fromJ(jset);
 }
 return out;
}
function phase(t=Date.now(),mode='auto'){
 const clock=times(t),alt=altitude(t,37.241,131.864);
 const override={day:0,sunset:.48,night:1};
 const darkness=mode in override?override[mode]:Math.max(0,Math.min(1,(6-alt)/12));
 return {mode,preview:mode!=='auto',darkness,altitude:alt,...clock};
}
function clock(t){return new Date(t).toLocaleTimeString('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit'});}
return {times,altitude,phase,clock};
});
