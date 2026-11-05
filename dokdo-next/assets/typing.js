/* 독도 노래 타자연습: 독도코리아 노래 가사를 한 줄씩 따라 치며 타수·정확도를 잰다.
 * 기록은 이 기기의 dk-type-* 키에만 저장한다. 놀이터의 도전권·섬 경험치·저장과 연결하지 않는다.
 * 가사는 구글 시트 「독도코리아 발매곡 아카이브」 '가사' 탭의 칸을 그대로 옮긴 것이다. 고치거나 지어내지 않는다.
 * GA에는 고정된 사건 이름과 곡 id·타수·정확도만 보낸다(assets/analytics.js 허용 목록). */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else{root.DokdoTyping=api;const d=root.document;if(d&&d.getElementById('typing'))api.boot(d);}})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
// ── 가사 원문 (시트 칸 그대로) ──
const SHEET={
// 시트 L08 · 독도코리아 Vol.7 트랙 1 「독도는 대한민국」
korea:`[Chorus]
삼국사기 우산국
세종실록 지리지
일본기록 태정관
독도는 대한민국

[Verse 1]
오백십이 년 신라
이사부 나무사자
우산국 무릎 꿇던 날
울릉과 독도가 하나
울릉과 독도가 하나
세종실록 지리지
날 맑으면 보인다
동국여지승람에
두 섬은 나란히 있다

[Verse 2]
안용복 노를 저어
에도 바다 건너가니
돗토리번 답을 했지
우리 땅이 아니오
막부는 도해금지
넘어가지 말라 했지
일본 외무성 내탐서
송도는 조선의 섬

[Verse 3]
태정관 일본 최고기구
죽도 외 일도는
일본과 관계없다
제 손으로 적어놓고
제 발로 지우러 왔나
고종황제 칙령
울도군의 섬 석도
전쟁 틈에 빼앗고
거짓 종이 한 장에
심흥택 붓을 들어
본군 소속 독도라

[Outro]
삼국사기 우산국
세종실록 지리지
일본기록 태정관
독도는 대한민국
연합국 각서 육칠칠
독도는 대한민국
에헤라 디야~ 헤이! 헤이!`,
// 시트 L13 · 독도코리아 Vol.11 트랙 1 「독도의 역사」
history:`[Chorus]
삼국사기 우산국
세종실록 지리지
일본기록 태정관
독도는 대한민국

[Verse 1]
고려, 삼국사기 기록
신라, 우산국 복속
이사부, 장군 정벌
세종, 실록 지리지
신증, 동국여지승람
어부, 안용복 일본항의.
울릉, 수토제도 시행
독도, 수천년 역사 한국땅

[Verse 2]
에도, 돗토리번 회답
막부, 도해금지령 내림
조선, 장한상 수토
영조, 동국문헌비고
순조, 만기요람 기록
조선국, 교제시말 내탐서
송도, 죽도옆에 있는 섬
조선동해안도

[Verse 3]
태정관, 일본 최고기구
지령, 독도일본아님
고종, 칙령 사십일
러일, 침탈 전쟁
시마네현, 불법 고시
심흥택, 불법편입 보고
각서, 연합국최고사령관
샌프란시스코 조약

[Outro]
삼국사기 우산국
세종실록 지리지
일본기록 태정관
독도는 대한민국
에헤라 디야~ 헤이! 헤이!`
};
// 2026-11-04 교수님 확인: 시트 L08의 받아쓰기 오류 세 곳을 바로잡음 — '칙칙령'→'칙령', '심흥붓을 들어'→'심흥택 붓을 들어', Outro 첫 줄 '삼국사기 우산국사기 우산국'→'삼국사기 우산국'.
const EXCLUDE={korea:[]};
function parseSheet(raw){const out=[];let cur=null;for(const r of String(raw).split(/\r?\n/)){const l=r.trim();if(!l)continue;const m=l.match(/^\[(.+)\]$/);if(m){cur={tag:m[1].trim(),lines:[]};out.push(cur);continue;}if(!cur){cur={tag:'',lines:[]};out.push(cur);}cur.lines.push(l);}return out;}
// 꼬리표([Chorus] 등)는 치지 않는다. 후렴은 처음 나온 곳에서 한 번만 치고, Outro 앞머리의 후렴 반복도 건너뛴다.
function buildLines(raw,exclude){const skip=(tag,text)=>(exclude||[]).some(x=>x.tag===tag&&x.text===text);let chorus=null;const out=[];
 for(const sec of parseSheet(raw)){const lines=sec.lines.filter(l=>!skip(sec.tag,l));
  if(/^chorus$/i.test(sec.tag)){if(!chorus){chorus=lines.slice();out.push(...lines);}continue;}
  if(/^outro$/i.test(sec.tag)&&chorus&&lines.length){let k=chorus.indexOf(lines[0]);while(k>=0&&k<chorus.length&&lines.length&&lines[0]===chorus[k]){lines.shift();k++;}}
  out.push(...lines);}
 return out;}
const ko=lines=>lines.map(l=>[l,'']);
// 곡 데이터 — 독도 아리랑 가사는 레이블 가사 문서(작사 이준영) 그대로(시트 L07).
const SONGS=[
 {id:'korea',no:'01',title:'독도는 대한민국',en:'Dokdo Is Korea',sub:'한국어',subEn:'Korean',src:'독도코리아 Vol.7 · 1번 트랙 · 가사 시트 L08',srcEn:'Dokdo Korea Vol.7 · Track 1 · Lyrics sheet L08',lines:ko(buildLines(SHEET.korea,EXCLUDE.korea))},
 {id:'history',no:'02',title:'독도의 역사',en:'History of Dokdo',sub:'한국어',subEn:'Korean',src:'독도코리아 Vol.11 · 1번 트랙 · 가사 시트 L13',srcEn:'Dokdo Korea Vol.11 · Track 1 · Lyrics sheet L13',lines:ko(buildLines(SHEET.history,[]))},
 {id:'arirang',no:'03',title:'독도 아리랑',en:'Dokdo Arirang',sub:'English · 외국인용',subEn:'English · For international players',src:'독도코리아 Vol.6 · 가사 시트 L07',srcEn:'Dokdo Korea Vol.6 · Lyrics sheet L07',lines:[
  ['Arirang Arirang Arariyo','아리랑 아리랑 아라리요'],
  ['Through the ages shining, the waves still flow','세월을 넘어 빛나며, 파도는 여전히 흐르고'],
  ['Arirang Arirang, forever we know','아리랑 아리랑, 우리는 영원히 알아'],
  ["Dokdo is Korea's beautiful island",'독도는 한국의 아름다운 섬'],
  ['From ancient times, your name was sung','먼 옛날부터, 네 이름은 노래로 불렸고'],
  ['Stories of the sea where the bells were rung','종소리 울리던 바다의 이야기가 전해져'],
  ['Written in the scrolls, in the hearts of all','두루마리에 기록되고, 모두의 가슴속에 새겨진'],
  ["Dokdo is Korea's beautiful island",'독도는 한국의 아름다운 섬'],
  ['The sea lions sang beneath the waves','파도 아래서 강치들이 노래했어'],
  ['Guardians of Dokdo through ancient days','먼 옛날부터 독도를 지키던 존재들'],
  ["They're gone now, but their cry remains",'이제 그들은 사라졌지만, 그 울음소리는 남아있어'],
  ["Dokdo is Korea's beautiful island",'독도는 한국의 아름다운 섬'],
  ['Centuries pass, yet you remain','수백 년이 흘러도, 너는 여전히 그 자리에'],
  ['Glorious isle on the endless main','끝없는 바다 위의 찬란한 섬'],
  ['Forever bright, forever ours','영원히 빛나고, 영원히 우리의 것'],
  ["Dokdo is Korea's beautiful island",'독도는 한국의 아름다운 섬'],
  ['Arirang Arirang Arariyo','아리랑 아리랑 아라리요'],
  ['From the past to the future, the winds still blow','과거에서 미래로, 바람은 여전히 불어오고'],
  ['Arirang Arirang, forever we know','아리랑 아리랑, 우리는 영원히 알아'],
  ["Dokdo is Korea's beautiful island",'독도는 한국의 아름다운 섬']
 ]}
];
// 이 놀이의 저장 키는 이 셋뿐이다. 놀이터(games-core.js)의 키를 읽거나 쓰지 않는다.
const KEYS=Object.freeze({sound:'dk-type-sound',hall:'dk-type-hall',nick:'dk-type-nick'});
const SOUNDS=['off','click','type','drop'];

// ── 순수 규칙 (화면 없이 시험할 수 있음) ──
function createStore(storage){return{get(k,d){try{const v=storage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}},set(k,v){try{storage.setItem(k,JSON.stringify(v));return true;}catch(e){return false;}}};}
// 깨진 저장은 버리고 빈 기록으로 시작한다.
function cleanHall(v){const out={};if(!v||typeof v!=='object'||Array.isArray(v))return out;for(const s of SONGS){const rows=v[s.id];if(!Array.isArray(rows))continue;out[s.id]=rows.filter(r=>r&&typeof r==='object'&&typeof r.name==='string'&&Number.isFinite(r.cpm)&&Number.isFinite(r.acc)).map(r=>({name:r.name.slice(0,12),cpm:r.cpm,acc:r.acc,date:String(r.date||'')})).slice(0,10);}return out;}
function cleanSound(v){return SOUNDS.includes(v)?v:'click';}
function addHall(all,songId,row){const arr=(all[songId]||[]).slice();arr.push(row);arr.sort((a,b)=>b.cpm-a.cpm||b.acc-a.acc);all[songId]=arr.slice(0,10);return all;}
// 타수: 한글은 자모 타건 수(겹모음·겹받침 2타), 그 밖의 글자는 1타
const JUNG2=new Set([9,10,11,14,15,16,19]); // ㅘㅙㅚㅝㅞㅟㅢ
const JONG2=new Set([3,5,6,9,10,11,12,13,14,15,18]); // ㄳㄵㄶㄺㄻㄼㄽㄾㄿㅀㅄ
function strokes(ch){const c=ch.codePointAt(0);if(c>=0xAC00&&c<=0xD7A3){const s=c-0xAC00,jung=Math.floor(s%588/28),jong=s%28;return 1+(JUNG2.has(jung)?2:1)+(jong?(JONG2.has(jong)?2:1):0);}return 1;}
const norm=s=>s.replace(/[‘’ʼ]/g,"'").replace(/[“”]/g,'"');
function lineScore(line,typed){let gs=0,gc=0;for(let i=0;i<typed.length&&i<line.length;i++){if(typed[i]===line[i]){gs+=strokes(line[i]);gc++;}}return{gs,gc};}
function cpmOf(goodStrokes,sec){return sec>1?Math.round(goodStrokes/(sec/60)):0;}
function accOf(typedCount,errCount){return typedCount?Math.max(0,Math.round(100*(typedCount-errCount)/typedCount)):100;}
function newTally(){return{typedCount:0,errCount:0,prevLen:0,marked:new Set()};}
// 새로 친 글자마다 1번 센다. 틀린 자리는 고쳐도 오타로 남는다(같은 자리는 한 번만).
function tally(T,line,typed,composing){const upto=composing?typed.length-1:typed.length;
 if(upto>T.prevLen){for(let i=T.prevLen;i<upto;i++){T.typedCount++;if(typed[i]!==line[i]&&!T.marked.has(i)){T.errCount++;T.marked.add(i);}}}T.prevLen=Math.max(0,Math.min(T.prevLen,upto));if(upto>T.prevLen)T.prevLen=upto;return T;}
// 줄을 넘길 때 못 친 글자는 오타로 센다.
function commitTally(T,line,typed){const missing=Math.max(0,line.length-typed.length);T.typedCount+=missing;T.errCount+=missing;T.prevLen=0;T.marked=new Set();return T;}
// 붙여넣기·끌어 놓기·자동완성처럼 여러 글자를 한 번에 넣는 입력은 막는다.
function blockInput(inputType,isComposing,data){if(['insertReplacementText','insertFromPaste','insertFromDrop','insertFromYank'].includes(inputType))return true;return inputType==='insertText'&&!isComposing&&!!data&&data.length>2;}

// ── 화면 ──
function boot(doc){
const $=id=>doc.getElementById(id);
let ls=null;try{ls=root.localStorage;}catch(e){}
const store=createStore(ls);
const en=()=>root.DokdoLanguage?.lang==='en';
const tr=(k,e)=>en()?e:k;
const titleOf=s=>en()?s.en:s.title;
const track=(n,p)=>{try{root.DokdoAnalytics?.track(n,p);}catch(e){}};

let song=null,li=0,startAt=0,goodStrokes=0,goodChars=0,typedChars=0,timer=0,done=false,lastResult=null,composing=false,T=newTally();
let snd=cleanSound(store.get(KEYS.sound,'click')),hallSong=SONGS[0].id;
function hallData(){return cleanHall(store.get(KEYS.hall,{}));}

function renderSongs(){const box=$('songs');box.replaceChildren();for(const s of SONGS){const b=doc.createElement('button');b.type='button';b.className='song';b.disabled=!s.lines.length;b.setAttribute('aria-pressed',String(!!song&&song.id===s.id));
 const no=doc.createElement('span');no.className='no';no.textContent=s.no;const t=doc.createElement('b');t.textContent=titleOf(s);const sub=doc.createElement('span');sub.className='sub';sub.textContent=(en()?s.subEn:s.sub)+' · '+s.lines.length+tr('줄',' lines');const src=doc.createElement('small');src.className='src';src.textContent=en()?s.srcEn:s.src;
 b.append(no,t,sub,src);b.onclick=()=>pick(s.id,true);box.append(b);}}
// 곡을 눌렀을 때만 가사와 입력칸을 화면으로 올립니다. 처음 들어올 때 고르는 기본 곡은 스크롤하지 않습니다.
function pick(id,reveal=false){song=SONGS.find(s=>s.id===id);hallSong=id;renderSongs();renderHall();reset();if(reveal)showBoard();}
function showBoard(){const lines=doc.querySelector('.t-lines'),top=lines.getBoundingClientRect().top,bottom=$('typing').getBoundingClientRect().bottom;if(top<0||bottom>root.innerHeight)lines.scrollIntoView({block:'start'});}
function reset(){li=0;startAt=0;goodStrokes=0;goodChars=0;typedChars=0;T=newTally();done=false;clearInterval(timer);$('typing').value='';$('typing').disabled=false;$('result').hidden=true;$('save-msg').textContent='';draw();stats();setTimeout(()=>$('typing').focus({preventScroll:true}),0);}
function draw(){if(done){$('target').textContent=tr('모든 줄을 쳤습니다.','All lines typed.');return;}const t=$('target'),line=norm(song.lines[li]?song.lines[li][0]:''),typed=norm($('typing').value);t.replaceChildren();[...line].forEach((ch,i)=>{const sp=doc.createElement('span');sp.textContent=ch;if(i<typed.length){const last=i===typed.length-1&&composing;sp.className=last?'y':(typed[i]===ch?'y':'n');}else sp.className='c';if(i===typed.length)sp.classList.add('cur');t.append(sp);});
 $('meaning').textContent=song.lines[li]?song.lines[li][1]:'';const nx=song.lines[li+1],next=$('next');next.replaceChildren();const em=doc.createElement('em');em.textContent=nx?'NEXT':'END';next.append(em,doc.createTextNode(nx?nx[0]:tr('마지막 줄입니다','Last line')));}
function elapsed(){return startAt?(root.performance.now()-startAt)/1000:0;}
function liveTyped(){const line=norm(song.lines[li]?song.lines[li][0]:''),typed=norm($('typing').value);return lineScore(line,typed);}
function stats(){const lt=done?{gs:0}:liveTyped(),sec=elapsed(),cpm=cpmOf(goodStrokes+lt.gs,sec),acc=accOf(T.typedCount,T.errCount);$('s-cpm').textContent=cpm;$('s-acc').textContent=acc+'%';$('s-prog').textContent=Math.min(li,song.lines.length)+'/'+song.lines.length;const m=Math.floor(sec/60),s=Math.floor(sec%60);$('s-time').textContent=m+':'+String(s).padStart(2,'0');$('bar').style.width=(100*li/song.lines.length)+'%';return{cpm,acc,sec};}
function commitLine(){const line=norm(song.lines[li][0]),typed=norm($('typing').value),sc=lineScore(line,typed);goodStrokes+=sc.gs;goodChars+=sc.gc;typedChars+=Math.max(typed.length,line.length);commitTally(T,line,typed);li++;$('typing').value='';$('sr-progress').textContent=tr(li+'번째 줄 완료','Line '+li+' done');if(li>=song.lines.length)finish();else{draw();stats();}}
function detail(r){const rs=Math.round(r.sec);return tr('정확도 '+r.acc+'% · '+Math.floor(rs/60)+'분 '+(rs%60)+'초 · '+song.title,'Accuracy '+r.acc+'% · '+Math.floor(rs/60)+' min '+(rs%60)+' s · '+song.en);}
function lowMsg(){return tr('정확도가 90%보다 낮아 명예의 전당에는 올라가지 않습니다. 한 번 더 도전해 보세요.','Accuracy is below 90%, so this run does not enter the hall of fame. Try once more.');}
function finish(){done=true;clearInterval(timer);const r=stats();$('typing').disabled=true;draw();$('meaning').textContent='';$('next').textContent='';lastResult={song:song.id,cpm:r.cpm,acc:r.acc,sec:Math.round(r.sec)};$('r-cpm').textContent=r.cpm;$('r-detail').textContent=detail(r);$('result').hidden=false;const ok=r.acc>=90;$('save-btn').disabled=!ok;$('nick').disabled=!ok;$('save-msg').textContent=ok?'':lowMsg();if(ok)$('nick').value=String(store.get(KEYS.nick,'')).slice(0,12);track('type_complete',{song:song.id,cpm:r.cpm,acc:r.acc});}

// 키보드 소리 (Web Audio로 직접 만든 소리)
let ac=null;function ctx(){if(!ac){try{ac=new (root.AudioContext||root.webkitAudioContext)();}catch(e){ac=null;}}if(ac&&ac.state==='suspended')ac.resume();return ac;}
function noise(a,dur,freq,type,gain){const len=Math.floor(a.sampleRate*dur),buf=a.createBuffer(1,len,a.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3);const src=a.createBufferSource();src.buffer=buf;const f=a.createBiquadFilter();f.type=type;f.frequency.value=freq;const g=a.createGain();g.gain.value=gain;src.connect(f).connect(g).connect(a.destination);src.start();}
function tone(a,f1,f2,dur,gain,type){const o=a.createOscillator(),g=a.createGain(),t=a.currentTime;o.type=type||'sine';o.frequency.setValueAtTime(f1,t);o.frequency.exponentialRampToValueAtTime(f2,t+dur);g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g).connect(a.destination);o.start(t);o.stop(t+dur+.02);}
function play(kind,enter){if(snd==='off')return;const a=ctx();if(!a)return;const v=.9+Math.random()*.2;
 if(snd==='click'){noise(a,.025,3200*v,'highpass',.5);tone(a,2400*v,1800,.018,.08,'square');if(enter)noise(a,.05,1400,'bandpass',.6);}
 else if(snd==='type'){noise(a,.05,900*v,'lowpass',.9);tone(a,190*v,120,.05,.25,'triangle');if(enter){tone(a,1760,1750,.6,.18,'sine');tone(a,2640,2630,.45,.06,'sine');}}
 else if(snd==='drop'){tone(a,900*v,380,.09,.22,'sine');if(enter)tone(a,620,1240,.22,.15,'sine');}}
function renderSounds(){doc.querySelectorAll('[data-snd]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.snd===snd)));}
doc.querySelectorAll('[data-snd]').forEach(b=>b.onclick=()=>{snd=cleanSound(b.dataset.snd);store.set(KEYS.sound,snd);renderSounds();play('key',false);$('typing').focus({preventScroll:true});});

// 입력
const inp=$('typing');
inp.addEventListener('paste',e=>{e.preventDefault();$('save-msg').textContent='';});
inp.addEventListener('drop',e=>e.preventDefault());
// 휴대폰 자판의 단어 추천·자동완성처럼 여러 글자를 한 번에 넣는 입력은 막습니다.
inp.addEventListener('beforeinput',e=>{if(blockInput(e.inputType,e.isComposing,e.data))e.preventDefault();});
inp.addEventListener('compositionstart',()=>{composing=true;});
inp.addEventListener('compositionend',()=>{composing=false;tallyErrors();draw();stats();autoNext();});
inp.addEventListener('keydown',e=>{if(done)return;if(e.key==='Enter'){e.preventDefault();if(e.isComposing||composing){setTimeout(()=>{if(norm(inp.value).length)submitLine();},0);return;}submitLine();return;}
 if(e.key.length===1||e.key==='Backspace'||e.keyCode===229)play('key',false);});
function tallyErrors(){tally(T,norm(song.lines[li]?song.lines[li][0]:''),norm(inp.value),composing);}
inp.addEventListener('input',()=>{if(done)return;tallyErrors();if(!startAt&&inp.value.length){startAt=root.performance.now();timer=setInterval(stats,250);track('type_start',{song:song.id});}draw();stats();if(!composing)autoNext();});
function submitLine(){if(!inp.value.length)return;play('key',true);commitLine();}
function autoNext(){const line=norm(song.lines[li]?song.lines[li][0]:'');if(line&&norm(inp.value)===line){play('key',true);commitLine();}}
$('restart').onclick=()=>reset();

// 명예의 전당 (이 기기 저장)
function renderHall(){const tabs=$('hall-tabs');tabs.replaceChildren();for(const s of SONGS){const b=doc.createElement('button');b.type='button';b.className='chip';b.textContent=titleOf(s);b.setAttribute('aria-pressed',String(s.id===hallSong));b.onclick=()=>{hallSong=s.id;renderHall();};tabs.append(b);}
 const list=$('hall-list');list.replaceChildren();const rows=(hallData()[hallSong]||[]).slice(0,10);if(!rows.length){const e=doc.createElement('li');e.className='empty';e.textContent=SONGS.find(s=>s.id===hallSong).lines.length?tr('아직 기록이 없습니다. 첫 번째 이름을 남겨 보세요.','No records yet. Be the first to leave your name.'):tr('가사가 들어오면 이 곡의 순위가 열립니다.','Rankings for this song open once the lyrics are added.');list.append(e);return;}
 rows.forEach((r,i)=>{const row=doc.createElement('li');row.innerHTML='<span class="rk"></span><span class="nm"><span></span><small></small></span><span class="sc"></span>';row.querySelector('.rk').textContent=i+1;row.querySelector('.nm span').textContent=r.name;row.querySelector('.nm small').textContent=tr('정확도 ','Accuracy ')+r.acc+'% · '+r.date;row.querySelector('.sc').textContent=r.cpm;list.append(row);});}
$('save-form').addEventListener('submit',e=>{e.preventDefault();if(!lastResult||lastResult.acc<90)return;const name=$('nick').value.trim().slice(0,12)||tr('익명','Anonymous');store.set(KEYS.nick,name);const d=new Date();const all=addHall(hallData(),lastResult.song,{name,cpm:lastResult.cpm,acc:lastResult.acc,date:(d.getMonth()+1)+'/'+d.getDate()});const ok=store.set(KEYS.hall,all);hallSong=lastResult.song;renderHall();$('save-btn').disabled=true;$('save-msg').textContent=ok?tr('명예의 전당에 올렸습니다.','Added to the hall of fame.'):tr('이 브라우저는 저장을 막고 있어 순위를 남기지 못했습니다.','This browser is blocking storage, so your score could not be saved.');});

// ── 고정 문구 (한국어/영어) ──
function applyStatic(){const E=en();for(const n of doc.querySelectorAll('[data-en]')){if(!n.dataset.ko)n.dataset.ko=n.textContent;n.textContent=E?n.dataset.en:n.dataset.ko;}
 for(const n of doc.querySelectorAll('[data-en-label]')){if(!n.dataset.koLabel)n.dataset.koLabel=n.getAttribute('aria-label');n.setAttribute('aria-label',E?n.dataset.enLabel:n.dataset.koLabel);}
 for(const n of doc.querySelectorAll('[data-en-ph]')){if(!n.dataset.koPh)n.dataset.koPh=n.getAttribute('placeholder');n.setAttribute('placeholder',E?n.dataset.enPh:n.dataset.koPh);}
 for(const b of doc.querySelectorAll('[data-language-toggle]')){b.textContent=E?'한국어':'English';b.setAttribute('aria-label',E?'한국어로 바꾸기':'Switch to English');}
 doc.title=E?'Dokdo Song Typing · Dokdo Korea School':'독도 노래 타자연습 · 독도 코리아 스쿨';}
function relabel(){applyStatic();renderSongs();renderHall();if(song){draw();if(done){$('meaning').textContent='';$('next').textContent='';if(lastResult){$('r-detail').textContent=detail(lastResult);if(lastResult.acc<90)$('save-msg').textContent=lowMsg();}}}}
for(const b of doc.querySelectorAll('[data-language-toggle]')){if(!root.DokdoLanguage){b.hidden=true;continue;}b.addEventListener('click',()=>root.DokdoLanguage.set(en()?'ko':'en'));}
doc.addEventListener('dokdo:language',relabel);

renderSounds();applyStatic();pick(SONGS.find(s=>s.lines.length).id);
}

return{SHEET,EXCLUDE,SONGS,KEYS,SOUNDS,parseSheet,buildLines,createStore,cleanHall,cleanSound,addHall,strokes,norm,lineScore,cpmOf,accOf,newTally,tally,commitTally,blockInput,boot};
});
