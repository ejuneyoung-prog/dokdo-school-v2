/* Model-based weather near Dokdo, not island-station observations.
 * No user location, identifiers or learning data leave the browser.
 */
(function(r,f){const a=f();if(typeof module==='object'&&module.exports)module.exports=a;else r.DokdoWeather=a;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const URL='https://api.open-meteo.com/v1/forecast?latitude=37.241&longitude=131.864&current=temperature_2m,weather_code,cloud_cover,wind_speed_10m&wind_speed_unit=ms&timeformat=unixtime&timezone=Asia%2FSeoul&forecast_days=1';
const VALID_CODES=[0,1,2,3,45,48,51,53,55,56,57,61,63,65,66,67,71,73,75,77,80,81,82,85,86,95,96,99];
const CACHE='dokdo-weather-cache-v1',TTL=30*60000,MAX_AGE=3*3600000;
function validNum(n,lo,hi){return typeof n==='number'&&Number.isFinite(n)&&n>=lo&&n<=hi;}
function kind(code){if([71,73,75,77,85,86].includes(code))return 'snow';if(code>=51&&code<=82||code>=95)return 'rain';if([45,48].includes(code))return 'fog';if(code>=1&&code<=3)return 'cloud';return 'clear';}
function parse(data,now=Date.now()){
 const c=data?.current,u=data?.current_units;
 if(!c||u?.time!=='unixtime'||u?.temperature_2m!=='\u00b0C'||u?.wind_speed_10m!=='m/s')throw Error('Unsupported weather units.');
 if(!validNum(c.temperature_2m,-70,60)||!validNum(c.cloud_cover,0,100)||!validNum(c.wind_speed_10m,0,120)||!Number.isInteger(c.weather_code)||!VALID_CODES.includes(c.weather_code)||!validNum(c.time,0,1e12))throw Error('Invalid weather values.');
 const at=c.time*1000;if(at>now+3600000||now-at>MAX_AGE)throw Error('Weather source is stale.');
 if(!validNum(data.latitude,36.8,37.7)||!validNum(data.longitude,131.3,132.4))throw Error('Weather location mismatch.');
 return {temperature:c.temperature_2m,cloud:c.cloud_cover,wind:c.wind_speed_10m,code:c.weather_code,kind:kind(c.weather_code),at,fetchedAt:now,provider:'Open-Meteo',model:true};
}
class Client{
 constructor({storage=null,fetcher=globalThis.fetch,now=()=>Date.now(),enabled=false}={}){this.storage=storage;this.fetcher=fetcher;this.now=now;this.enabled=enabled;this.data=null;this.status=enabled?'idle':'disabled';this.inflight=null;this.lastAttempt=0;
  try{const c=JSON.parse(storage?.getItem(CACHE)||'null');if(c?.raw&&this.now()-c.savedAt<TTL)this.data=parse(c.raw,this.now());}catch(e){}
 }
 get current(){return this.data&&this.now()-this.data.at<=MAX_AGE?this.data:null;}
 async refresh(force=false){
  if(!this.enabled){this.status='disabled';return this.current;}
  if(this.inflight)return this.inflight;
  if(!force&&this.current&&this.now()-this.data.fetchedAt<TTL){this.status='cached';return this.current;}
  if(this.lastAttempt&&this.now()-this.lastAttempt<60000)return this.current;
  this.lastAttempt=this.now();this.status='loading';
  this.inflight=(async()=>{const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);
   try{const res=await this.fetcher(URL,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
    if(!res.ok)throw Error('Weather HTTP '+res.status);
    const raw=await res.json(),value=parse(raw,this.now());this.data=value;this.status='ready';
    try{this.storage?.setItem(CACHE,JSON.stringify({raw,savedAt:this.now()}));}catch(e){}
    return value;
   }catch(e){this.status=this.current?'stale':'unavailable';return this.current;}
   finally{clearTimeout(timer);this.inflight=null;}
  })();return this.inflight;
 }
}
return {URL,CACHE,TTL,MAX_AGE,kind,parse,Client};
});
