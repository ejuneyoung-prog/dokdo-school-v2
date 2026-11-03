(() => {
 const join=document.getElementById('meet'), note=document.getElementById('meetNote'), layer=document.getElementById('visitors');
 const key=crypto.randomUUID(), names=['갈매기','물결','노을','별빛','솔바람','해국'], nick=names[parseInt(key.slice(0,8),16)%names.length]+' '+key.slice(0,3);
 let client,room,ready=false,last='',generation=0;
 const config=window.DOKDO_AUTH_CONFIG;
 function svg(tag,attrs){const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n}
 function clear(){layer.replaceChildren();ready=false;last=''}
 function paint(){
   if(!ready||!room)return;
   const peers=Object.entries(room.presenceState()).filter(([id,v])=>id!==key&&v.some(p=>p.island===side)).sort(([a],[b])=>a.localeCompare(b));
   layer.replaceChildren();
   peers.slice(0,8).forEach(([id,states],i)=>{
     const p=states.find(s=>s.island===side), name=names[(parseInt(id.slice(0,8),16)||0)%6]+' '+id.slice(0,3).replace(/[^a-f0-9]/g,'');
     const group=svg('g',{transform:'translate('+(53+i*43)+' '+(299+i*2)+')'});layer.append(group);
     group.append(svg('circle',{cx:0,cy:p.sitting?-16:-23,r:5,fill:'#d9b397'}),svg('path',{d:p.sitting?'M-4 -10h8v7h9v10H8V2H-4Z':'M-4 -17h8v25H1V0H-1v8h-3Z',fill:'#afa77a'}));
     const label=svg('text',{x:0,y:-34,'text-anchor':'middle',fill:'#fff','font-size':9,stroke:'#243f42','stroke-width':2,'paint-order':'stroke'});label.textContent=name;group.append(label)
   });
   note.textContent='내 별명 '+nick+' · '+side+'에 함께 있는 사람 '+(peers.length+1)+'명';
 }
 function sync(){if(!ready||!room)return;const next=side+String(seated);if(next!==last){last=next;room.track({island:side,sitting:seated}).then(status=>{if(status!=='ok'&&last===next){last='';note.textContent='자리 동기화를 기다리고 있어요.'}})}paint()}
 async function leave(message){generation++;const old=room;room=null;clear();join.textContent='함께 입장';join.setAttribute('aria-pressed','false');note.textContent=message;if(old)await client.removeChannel(old)}
 join.onclick=async()=>{
   if(room){await leave('함께 보기를 마쳤어요.');return}
   try{
     client??=window.supabase.createClient(config.supabaseUrl,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'camp-guest-'+key}});
     const token=++generation;
     room=client.channel('dokdo-camp-meet-v1',{config:{presence:{key}}});join.textContent='입장 취소';note.textContent='다른 방문객을 찾는 중…';
     room.on('presence',{event:'sync'},paint).subscribe(status=>{if(token!==generation)return;
       if(status==='SUBSCRIBED'){ready=true;last='';join.textContent='함께 보기 나가기';join.setAttribute('aria-pressed','true');sync()}
       else if(['TIMED_OUT','CHANNEL_ERROR','CLOSED'].includes(status))void leave('연결이 끊겼어요. 함께 입장을 눌러 다시 연결하세요.')
     })
   }catch{await leave('함께 보기에 연결하지 못했어요. 다시 시도해 주세요.')}
 };
 window.addEventListener('camp-position',sync);
 window.addEventListener('pagehide',()=>void leave('함께 보기를 마쳤어요.'));
})();