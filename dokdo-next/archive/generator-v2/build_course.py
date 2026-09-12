from pathlib import Path
import json,collections,hashlib
HERE=Path(__file__).parent
ns={'__file__':str(HERE/'course_author.py')};exec((HERE/'course_author.py').read_text(),ns)
for p in sorted(HERE.glob('u[0-9][0-9].py')):exec(p.read_text(),ns)
S,FAMILIES,UNITS,ROOT=[ns[k] for k in ['S','FAMILIES','UNITS','ROOT']]
assert len(FAMILIES)==60
questions=[]
for f in FAMILIES:
 for li,v in enumerate(f['variants'],1):
  qid=910000+(f['number']-1)*4+li
  rot=(f['number']+li)%3;order=list(range(3));order=order[rot:]+order[:rot]
  q={'id':qid,'unit':f['unit'],'stage':(f['unit']-1)//3+1,'cognitive':li,'conceptId':f['slug'],'familyId':'dk-'+f['slug'],'sourceIds':f['sourceIds'],'reviewStatus':'AUTHOR_SOURCE_REVIEWED','ko':{},'en':{}}
  for lang in ['ko','en']:
   fact=f['fact'][lang];reason=v['reason'][lang] if v['reason'] else ''
   explain=fact+(' '+reason if reason and reason!=fact else '')
   answer=v['options'][0][lang]
   wrong=[]
   for i in order:
    if i==0:wrong.append(explain)
    elif lang=='ko':wrong.append('고른 보기 ‘'+v['options'][i][lang]+'’와 달라요. 이 문항의 정답은 ‘'+answer+'’입니다. '+explain)
    else:wrong.append('The selected option, “'+v['options'][i][lang]+'”, does not fit. The answer is “'+answer+'”. '+explain)
   q[lang]={'q':v['stem'][lang],'choices':[v['options'][i][lang] for i in order],'fact':fact,'explain':explain,'wrong':wrong,'material':f['material'][lang] if li>=3 else ''}
  q['answer']=order.index(0);questions.append(q)
TRACKS={
 'early':{'ko':'초등 저학년','en':'Early primary','counts':[42,18,0,0],'limit':48,'startUnit':1},
 'primary':{'ko':'초등 중학년','en':'Middle primary','counts':[42,18,0,0],'limit':48,'startUnit':2},
 'upper':{'ko':'초등 고학년','en':'Later primary','counts':[30,24,6,0],'limit':60,'startUnit':3},
 'middle':{'ko':'중학생','en':'Middle school','counts':[15,21,18,6],'limit':80,'startUnit':8},
 'high':{'ko':'고등학생','en':'High school','counts':[9,15,21,15],'limit':110,'startUnit':9},
 'adult':{'ko':'성인','en':'Adult','counts':[6,12,18,24],'limit':160,'startUnit':11}}
for key,t in TRACKS.items():
 used=[0]*4;levels=[]
 for i in range(60):
  j=max(range(4),key=lambda j:((i+1)*t['counts'][j]/60-used[j],j))
  used[j]+=1;levels.append(j+1)
 assert used==t['counts']
 t['levels']=levels
 t['questionIds']=[910000+i*4+lv for i,lv in enumerate(levels)]
units=[]
for i,(k,e,cat) in enumerate(UNITS,1):
 fs=[f for f in FAMILIES if f['unit']==i]
 units.append({'id':i,'ko':k,'en':e,'category':cat,'families':['dk-'+f['slug'] for f in fs],'sourceIds':sorted({s for f in fs for s in f['sourceIds']}),'reading':{lang:' '.join(f['fact'][lang] for f in fs) for lang in ['ko','en']}})
DATA={'version':'2026-09-11-course-v2','status':'SOURCE_REVIEWED_SELF_REVIEW_NOT_INDEPENDENT_TEACHER_APPROVAL','count':len(questions),'familyCount':60,'legacyBankEligible':False,'sources':S,'units':units,'tracks':TRACKS,'questions':questions,'scope':{'core':'12 units, 60 concept families, 240 bilingual question pairs','legacy1513':'original records preserved; original text not silently rewritten or enabled','legacy48':'excluded from all new lessons and assessment; records preserved'},'glossary':{
'관할':'맡아서 관리하는 구역','군수':'군의 행정을 맡는 관리','칙령':'당시 황제가 내린 명령','관보':'정부가 알릴 내용을 싣는 공식 간행물','개칭':'이름을 바꿈','관제':'정부의 직책과 조직 체계','관찬서':'나라에서 편찬한 책','도해':'바다를 건너감','영지':'어떤 나라나 권력이 자기 땅이라고 말하는 영역','지적':'토지의 위치·구역 등을 적은 기록','해식':'파도가 해안 바위를 깎는 작용','침식':'물·바람 등에 의해 깎이는 작용','풍화':'바위가 환경의 영향을 받아 부서지거나 변하는 과정','표고':'해수면을 기준으로 잰 높이','영양염':'플랑크톤 등 생물이 자라는 데 쓰이는 물속 성분','식물플랑크톤':'물속에 떠다니며 빛으로 살아가는 작은 생물','담수화':'바닷물의 소금을 줄여 쓸 물을 만드는 과정','원문':'처음 작성된 자료의 글','역문':'원문을 이해할 수 있는 말로 옮긴 글','추정':'자료와 가정으로 어떤 값을 짐작해 계산함','번식':'새끼를 낳고 기르는 일','중간기착지':'이동 중 잠시 머무는 곳'}}
(ROOT/'data/course-v2.json').write_text(json.dumps(DATA,ensure_ascii=False,indent=2))
(ROOT/'assets/course-data.js').write_text('/* Authored Dokdo core course. Stable IDs; no legacy fallback. */\n(function(r){const d='+json.dumps(DATA,ensure_ascii=False,separators=(',',':'))+';if(typeof module===\'object\'&&module.exports)module.exports=d;else r.DokdoCourseData=d;})(typeof globalThis!==\'undefined\'?globalThis:this);\n')
# Keep the supplied diagnostic untouched, and write an audit of the active new curriculum.
lookup={q['id']:q for q in questions};overflow=[]
for track,t in TRACKS.items():
 for id in t['questionIds']:
  q=lookup[id];n=len(q['ko']['q'])+max(map(len,q['ko']['choices']))
  if n>t['limit']:overflow.append({'track':track,'id':id,'length':n,'limit':t['limit'],'q':q['ko']['q'],'choices':q['ko']['choices']})
audit={'questions':len(questions),'families':len(FAMILIES),'units':len(units),'questionIdsUnique':len(set(lookup))==240,'cognitiveCounts':dict(collections.Counter(q['cognitive'] for q in questions)),'trackCounts':{k:t['counts'] for k,t in TRACKS.items()},'readingLimitOverflows':overflow,'missingSources':[q['id'] for q in questions if any(s not in S for s in q['sourceIds'])]}
(ROOT/'data/course-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2))
print(json.dumps(audit,ensure_ascii=False,indent=2))