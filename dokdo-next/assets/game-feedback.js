/* Transient visual feedback only: no game state, storage or network access. */
(function(root){
 'use strict';
 const MAX=48,layers=new Map(),timers=new Map();
 function remove(item,layer,host){const timer=timers.get(item);if(timer!==undefined){clearTimeout(timer);timers.delete(item);}item.remove();if(!layer.children.length){layer.remove();if(layers.get(host)===layer)layers.delete(host);}}
 function burst(host,type,label,x=50,y=50){
  if(!host)return;
  let layer=layers.get(host);
  if(!layer||!layer.isConnected){layer=document.createElement('div');layer.className='game-feedback';layer.setAttribute('aria-hidden','true');host.append(layer);layers.set(host,layer);}
  const reduced=root.matchMedia?.('(prefers-reduced-motion: reduce)').matches||document.body.classList.contains('motion-reduced');
  const en=document.documentElement.lang==='en',words={'멋진 점프!':'Nice jump!','별 +1':'Star +1','라운드 완주!':'Round clear!','미션 성공!':'Mission clear!','강치 구조!':'Gangchi rescued!','톡! 깨끗해요':'Clean!','다시 도전해요':'Try again'};
  if(en)label=words[label]||label.replace(/별 \+(\d+)/,'Star +$1').replace(/(\d+)줄 시원하게!/, '$1 lines cleared!');
  const add=(className,content,dx=0,dy=-24)=>{
   while(layer.children.length>=MAX)remove(layer.firstElementChild,layer,host);
   const item=document.createElement('span');item.className=className;item.textContent=content;item.style.left=Math.max(5,Math.min(95,x))+'%';item.style.top=Math.max(8,Math.min(88,y))+'%';item.style.setProperty('--dx',dx+'px');item.style.setProperty('--dy',dy+'px');layer.append(item);
   timers.set(item,setTimeout(()=>remove(item,layer,host),800));item.addEventListener('animationend',()=>remove(item,layer,host),{once:true});
  };
  // Fast consecutive events share one readable caption, rather than stacking
  // several words over the same tiles. Particle rings can finish underneath it.
  for(const old of [...layer.children])if(old.className.includes('feedback-label')){clearTimeout(timers.get(old));timers.delete(old);old.remove();}
  add('feedback-label feedback-'+type,label);
  if(!reduced)for(let i=0;i<(type==='success'?12:7);i++){const a=i*Math.PI*2/7;add('feedback-particle feedback-'+type,type==='star'||type==='success'?'✦':'○',Math.cos(a)*(20+i*3),Math.sin(a)*22-24-i*2);}
 }
 function clear(){for(const timer of timers.values())clearTimeout(timer);timers.clear();for(const layer of layers.values())layer.remove();layers.clear();}
 root.addEventListener('pagehide',clear);
 root.DokdoGameFeedback={burst,clear};
})(window);
