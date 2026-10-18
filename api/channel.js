'use strict';
// One verified public channel. No user-supplied URL, key or student data enters this endpoint.
const CHANNEL_ID='UCVfBrS1H2crOZHjf2I1mv0A';
const CHANNEL_URL='https://www.youtube.com/@%EB%8F%85%EB%8F%84%EC%BD%94%EB%A6%AC%EC%95%84';
const FEED_URL='https://www.youtube.com/feeds/videos.xml?channel_id='+CHANNEL_ID;
const TTL=15*60*1000;
function decodeXML(value){return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(entity,key)=>{if(key[0]==='#'){const n=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):parseInt(key.slice(1),10);return Number.isInteger(n)&&n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):'';}return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[key.toLowerCase()];}).trim();}
function text(xml,tag){const found=xml.match(new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+tag+'>'));return found?decodeXML(found[1]):'';}
function parseFeed(xml){
 if(typeof xml!=='string'||xml.length>1000000||/<!DOCTYPE|<!ENTITY/i.test(xml)||![CHANNEL_ID,CHANNEL_ID.slice(2)].includes(text(xml,'yt:channelId')))throw Error('Invalid channel feed.');
 const seen=new Set(),items=[];
 for(const match of xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/g)){const entry=match[1],id=text(entry,'yt:videoId'),title=text(entry,'title'),published=text(entry,'published');if(text(entry,'yt:channelId')!==CHANNEL_ID||!/^[A-Za-z0-9_-]{11}$/.test(id)||!title||title.length>300||!Number.isFinite(Date.parse(published))||seen.has(id))continue;seen.add(id);items.push({id,title,published:new Date(published).toISOString()});}
 items.sort((a,b)=>Date.parse(b.published)-Date.parse(a.published));if(!items.length)throw Error('The public feed has no valid videos.');return items.slice(0,6);
}
function createHandler({fetcher=globalThis.fetch,now=Date.now}={}){
 let cache=null,pending=null;
 async function load(){
  if(cache&&now()-Date.parse(cache.checkedAt)<TTL)return cache;
  if(pending)return pending;
  pending=(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);try{const response=await fetcher(FEED_URL,{signal:controller.signal,headers:{Accept:'application/atom+xml,application/xml,text/xml'}});if(!response.ok)throw Error('YouTube feed unavailable.');const xml=await response.text();const result={state:'ok',channelId:CHANNEL_ID,channelUrl:CHANNEL_URL,sourceUrl:FEED_URL,checkedAt:new Date(now()).toISOString(),items:parseFeed(xml)};cache=result;return result;}finally{clearTimeout(timer);}})();
  try{return await pending;}finally{pending=null;}
 }
 return async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET'&&req.method!=='HEAD'){res.setHeader('Allow','GET, HEAD');res.setHeader('Cache-Control','no-store');res.statusCode=405;res.end(JSON.stringify({state:'method_not_allowed'}));return;}
  try{const data=await load(),remaining=Math.max(0,Math.floor((TTL-(now()-Date.parse(data.checkedAt)))/1000));res.setHeader('Cache-Control','public, max-age='+Math.min(30,remaining)+', s-maxage='+remaining);res.statusCode=200;res.end(req.method==='HEAD'?'':JSON.stringify(data));}
  catch(e){res.setHeader('Cache-Control','no-store');res.statusCode=503;res.end(req.method==='HEAD'?'':JSON.stringify({state:'unavailable',channelUrl:CHANNEL_URL}));}
 };
}
module.exports=createHandler();
module.exports.createHandler=createHandler;
module.exports.parseFeed=parseFeed;
module.exports.CHANNEL_ID=CHANNEL_ID;
module.exports.FEED_URL=FEED_URL;
