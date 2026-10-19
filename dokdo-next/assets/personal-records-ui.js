/* One private dashboard. Rendering never writes or claims existing device records. */
(function(root){'use strict';root.DokdoRecordsUI={mount};
function mount(root){const d=root.document,$=id=>d.getElementById(id),R=root.DokdoRecords;if(!$('my-records')||!R)return null;
 const en=()=>d.documentElement.lang==='en',tr=(ko,us)=>en()?us:ko,plural=(n,word)=>n+' '+word+(n===1?'':'s');let account=null,cloudState=null;
 const paint=()=>{try{const local=R.capture(root.localStorage),s=R.summary(local.snapshot);$('record-name').textContent=tr('이 기기의 독도 기록','Dokdo records on this device');$('record-learning').textContent=tr('배운 문제 '+s.questions+'개 · 정답 '+s.correct+'회',plural(s.questions,'question')+' explored · '+plural(s.correct,'correct answer'));$('record-learning-detail').textContent=tr('학습 '+s.learningXP+' XP · '+s.streak+'일 연속',s.learningXP+' learning XP · '+s.streak+'-day streak');$('record-game').textContent=tr('달리기 최고 '+s.rounds+'라운드','Best run · round '+s.rounds);$('record-game-detail').textContent=tr('바다 청소 '+s.blocks+'점 · 달리기 '+s.runner+'점','Cleanup '+plural(s.blocks,'point')+' · Run '+plural(s.runner,'point'));$('record-island').textContent=s.complete?tr('완성의 별이 빛나요','Your final star is shining'):tr('섬 '+s.island+'단계 · 강치 '+s.seals+'/10마리','Island stage '+s.island+' · Gangchi '+s.seals+'/10');$('record-next').textContent=s.nextGift?tr('다음 선물: '+s.nextGift,'Next gift: '+root.DokdoLanguage.translate(s.nextGift)):tr('모든 선물 완성 · 최고 기록에 도전해요','All gifts unlocked · Beat your best');
 root.DokdoGameArt?.animateIsland($('record-island-canvas'),()=>local.snapshot.game||root.DokdoGames.fresh());
 $('record-local-error').hidden=true;
 }catch(e){$('record-local-error').hidden=false;$('record-local-error').textContent=tr('기기 기록을 읽지 못했어요. 원본을 지우지 말고 기록 복구를 확인해 주세요.','Device records could not be read. Keep the originals and check record recovery.');}
 const s=cloudState;if(!s)return;if(s.enabled)$('account-scope').textContent=tr('계정 보관은 저장 버튼을 눌러 이용해요. 로그아웃해도 이 기기 기록은 남아요.','Use Save to keep a copy in your account. Signing out leaves the device records in place.');$('record-cloud').hidden=!s.enabled||!s.signed;$('record-cloud-status').textContent=tr(s.message,root.DokdoLanguage.translate(s.message));$('record-cloud-status').dataset.error=String(s.error);$('record-save').disabled=s.busy||!$('record-consent').checked;$('record-restore').disabled=s.busy||!s.remote;$('record-refresh').disabled=s.busy;
 $('record-remote').textContent=s.remote?tr('계정 기록: 학습 '+s.remote.summary.questions+'개 · 섬 '+s.remote.summary.island+'단계','Account record: '+plural(s.remote.summary.questions,'question')+' · Island stage '+s.remote.summary.island):tr('계정에 보관된 기록이 아직 없어요.','No account record saved yet.');if(s.remote){const date=new Date(s.remote.updatedAt);$('record-saved-at').textContent=Number.isFinite(date.getTime())?tr('마지막 저장: ','Last saved: ')+date.toLocaleString(en()?'en-US':'ko-KR'):'';}else $('record-saved-at').textContent='';
 };
 const controller=R.createController({storage:root.localStorage,enabled:root.DOKDO_AUTH_CONFIG?.privateRecordsEnabled===true,locks:root.navigator.locks,onChange:s=>{cloudState=s;paint();},transportFor:token=>root.supabase.createClient(root.DOKDO_AUTH_CONFIG.supabaseUrl,root.DOKDO_AUTH_CONFIG.publishableKey,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})});
 $('record-consent').onchange=paint;
 $('record-save').onclick=()=>{if($('record-consent').checked)controller.save().finally(paint);};
 $('record-restore').onclick=()=>{$('record-restore-confirm').hidden=false;};
 $('record-restore-cancel').onclick=()=>{$('record-restore-confirm').hidden=true;};
 $('record-restore-yes').onclick=async()=>{$('record-restore-confirm').hidden=true;await controller.restore();paint();};
 $('record-refresh').onclick=()=>{if(account)controller.connect(account.user,account.client);};
 d.addEventListener('dokdo:language',paint);root.addEventListener('storage',event=>{if([root.DokdoAppModel.KEY,root.DokdoGames.KEY].includes(event.key))paint();});
 paint();return{connect(user,client){account=user?{user,client}:null;if(!user)$('record-consent').checked=false;return controller.connect(user,client);},invalidate(){account=null;$('record-consent').checked=false;controller.invalidate();}};
}
})(globalThis);
