'use strict';
// 독도 노래 타자연습: 타수·정확도, 고친 오타, 입력 차단, 저장 복구, 가사 꼬리표·후렴 규칙. 화면 없이 순수 함수만 시험한다.
const{test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const T=require('../assets/typing.js');
const ROOT=path.resolve(__dirname,'..');
const song=id=>T.SONGS.find(s=>s.id===id).lines.map(l=>l[0]);

test('strokes count Korean jamo keystrokes (double vowels and double finals = 2) and 1 for other characters',()=>{
 a.equal(T.strokes('가'),2);a.equal(T.strokes('한'),3);a.equal(T.strokes('과'),3);a.equal(T.strokes('닭'),4);a.equal(T.strokes('A'),1);a.equal(T.strokes('~'),1);
 a.deepEqual(T.lineScore('독도','독도'),{gs:5,gc:2});a.deepEqual(T.lineScore('독도','독두'),{gs:3,gc:1});
 a.equal(T.cpmOf(300,60),300);a.equal(T.cpmOf(150,30),300);a.equal(T.cpmOf(500,1),0);a.equal(T.norm('Korea’s “isle”'),'Korea\'s "isle"');
});

test('accuracy: 100% before typing; a fixed typo still counts once; missing characters count as errors',()=>{
 a.equal(T.accOf(0,0),100);a.equal(T.accOf(10,1),90);a.equal(T.accOf(3,9),0);
 const line='독도는',t=T.newTally();
 T.tally(t,line,'독',false);T.tally(t,line,'독두',false); // typo at index 1
 a.deepEqual([t.typedCount,t.errCount],[2,1]);
 T.tally(t,line,'독',false);T.tally(t,line,'독도',false);T.tally(t,line,'독도는',false); // fixed and finished
 a.deepEqual([t.typedCount,t.errCount],[4,1]);a.equal(T.accOf(t.typedCount,t.errCount),75);
 // Fixing the same spot twice is still one error.
 T.tally(t,line,'독',false);T.tally(t,line,'독두',false);a.equal(t.errCount,1);
 // The syllable still being composed is not counted until it is finished.
 const c=T.newTally();T.tally(c,line,'독ㄷ',true);a.equal(c.typedCount,1);
 // Moving on with 1 of 3 characters typed adds 2 errors.
 const m=T.newTally();T.tally(m,line,'독',false);T.commitTally(m,line,'독');a.deepEqual([m.typedCount,m.errCount,m.prevLen],[3,2,0]);
});

test('paste, drop, autocomplete and multi-character input are blocked; normal typing and IME composition are not',()=>{
 for(const t of ['insertFromPaste','insertFromDrop','insertReplacementText','insertFromYank'])a.equal(T.blockInput(t,false,'x'),true,t);
 a.equal(T.blockInput('insertText',false,'독도는'),true);a.equal(T.blockInput('insertText',false,'abc'),true);
 a.equal(T.blockInput('insertText',false,'a'),false);a.equal(T.blockInput('insertText',false,'ab'),false);a.equal(T.blockInput('insertText',true,'독도는'),false);
 a.equal(T.blockInput('deleteContentBackward',false,null),false);a.equal(T.blockInput('insertCompositionText',true,'도'),false);
});

function memory(init={}){const m=new Map(Object.entries(init)),log=[];return{log,getItem:k=>{log.push(k);return m.has(k)?m.get(k):null;},setItem:(k,v)=>{log.push(k);m.set(k,String(v));}};}
test('hall of fame recovers from broken saves and keeps only dk-type-* keys',()=>{
 const S=T.createStore(memory({'dk-type-hall':'{oops','dk-type-sound':'"loud"'}));
 a.deepEqual(T.cleanHall(S.get(T.KEYS.hall,{})),{});a.equal(T.cleanSound(S.get(T.KEYS.sound,'click')),'click');
 for(const bad of [null,5,'x',[],{korea:'x'},{korea:[null,{name:1},{name:'a',cpm:'9',acc:90}]}])a.deepEqual(Object.values(T.cleanHall(bad)).flat(),[]);
 const ok=T.cleanHall({korea:[{name:'가나다라마바사아자차카타파하',cpm:300,acc:98,date:'11/4'}],unknown:[{name:'x',cpm:1,acc:1}]});
 a.equal(ok.korea[0].name.length,12);a.equal(ok.unknown,undefined);
 const blocked=T.createStore({getItem(){throw Error('SecurityError');},setItem(){throw Error('QuotaExceededError');}});a.deepEqual(blocked.get(T.KEYS.hall,{}),{});a.equal(blocked.set(T.KEYS.hall,{}),false);
 let all={};for(let i=0;i<12;i++)all=T.addHall(all,'arirang',{name:'p'+i,cpm:100+i,acc:i%2?95:99,date:'11/4'});a.equal(all.arirang.length,10);a.equal(all.arirang[0].cpm,111);
 all=T.addHall(all,'arirang',{name:'tie',cpm:111,acc:100,date:'11/4'});a.equal(all.arirang[0].name,'tie');
 a.deepEqual(Object.values(T.KEYS).sort(),['dk-type-hall','dk-type-nick','dk-type-sound']);
});

test('section tags are not typed and the chorus is typed once, in order Chorus → Verse 1 → 2 → 3 → Outro',()=>{
 const raw='[Chorus]\nA\nB\n\n[Verse 1]\nC\n\n[Chorus]\nA\nB\n\n[Outro]\nA\nB\nD';
 a.deepEqual(T.buildLines(raw,[]),['A','B','C','D']);
 for(const s of T.SONGS)for(const l of s.lines)a.doesNotMatch(l[0],/^\[.*\]$/);
 const history=song('history');a.equal(history.length,29);a.deepEqual(history.slice(0,4),['삼국사기 우산국','세종실록 지리지','일본기록 태정관','독도는 대한민국']);
 a.equal(history[4],'고려, 삼국사기 기록');a.equal(history.at(-1),'에헤라 디야~ 헤이! 헤이!');a.equal(history.filter(l=>l==='삼국사기 우산국').length,1);
});

test('독도는 대한민국 uses the sheet as is, minus the three lines waiting for confirmation',()=>{
 const korea=song('korea');a.equal(korea.length,33);
 for(const l of ['고종황제 칙칙령','심흥붓을 들어','삼국사기 우산국사기 우산국'])a.ok(!korea.includes(l),l);
 a.equal(T.EXCLUDE.korea.length,3);a.match(fs.readFileSync(path.join(ROOT,'assets/typing.js'),'utf8'),/TODO\(교수님 확인 필요\)[\s\S]*TODO\(교수님 확인 필요\)[\s\S]*TODO\(교수님 확인 필요\)/);
 a.deepEqual(korea.slice(-3),['연합국 각서 육칠칠','독도는 대한민국','에헤라 디야~ 헤이! 헤이!']);
 a.deepEqual(korea.slice(4,6),['오백십이 년 신라','이사부 나무사자']);a.equal(korea.filter(l=>l==='삼국사기 우산국').length,1);
 // Every typed line exists word for word in the sheet text.
 for(const id of ['korea','history'])for(const l of song(id))a.ok(T.SHEET[id].split('\n').includes(l),l);
 a.equal(song('arirang').length,20);
});

test('typing page is separate from playground saves and loads analytics before the game',()=>{
 const src=fs.readFileSync(path.join(ROOT,'assets/typing.js'),'utf8').replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,''),page=fs.readFileSync(path.join(ROOT,'typing.html'),'utf8');
 a.doesNotMatch(src,/DokdoGames|G\.KEY|ticket|earnTicket/);a.doesNotMatch(page,/games-core\.js|garden-progress\.js|games\.js"/);
 a.doesNotMatch(page,/<script>|\son[a-z]+=/i);a.match(page,/name="dokdo-mode" content="live"/);a.doesNotMatch(page+src,/__GMARKET__|fonts\.googleapis/);
 a.ok(page.indexOf('assets/site-config.js')<page.indexOf('assets/analytics.js')&&page.indexOf('assets/analytics.js')<page.indexOf('assets/typing.js'));
 a.match(src,/track\('type_start',\{song:song\.id\}\)/);a.match(src,/track\('type_complete',\{song:song\.id,cpm:r\.cpm,acc:r\.acc\}\)/);
 const games=fs.readFileSync(path.join(ROOT,'assets/games.js'),'utf8'),home=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
 a.match(games,/<a class="primary" href="\.\/typing\.html" id="typing-card-link">/);a.doesNotMatch(games,/game-card-soon|data-launch="typing"/);a.match(home,/<a href="\.\/typing\.html" id="play-entry-typing">독도 노래 타자연습/);
});
