#!/usr/bin/env python3
"""Compile explicitly authored bilingual questions; never synthesize a missing answer.
Canonical input: authored-questions.json + source-registry.json + course-meta.json.
The old automatic fact/distractor generator is archived and not imported.
"""
from __future__ import annotations
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import urlparse
import argparse, copy, hashlib, json, re, sys
ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
LANGS = ('ko','en')

def read(name):
    return json.loads((HERE/name).read_text(encoding='utf-8'))

def require(ok, message):
    if not ok:
        raise ValueError(message)

def text_pair(value, at, allow_empty=False):
    require(isinstance(value,dict),f'{at}: bilingual text object required')
    for lang in LANGS:
        require(isinstance(value.get(lang),str),f'{at}: missing {lang}')
        if not allow_empty: require(bool(value[lang].strip()),f'{at}: empty {lang}')
        require('<script' not in value[lang].lower(),f'{at}: executable markup forbidden')

def validate(questions, sources, meta, retired):
    require(len(questions)==240,'Exactly 240 active authored questions are required')
    ids=[q['id'] for q in questions]
    require(len(ids)==len(set(ids)),'Duplicate active IDs')
    require(set(ids)==set(range(920001,920241)),'Unexpected active ID range')
    require(not set(ids)&set(retired['retiredQuestionIds']),'Retired ID reused')
    require({q['replaces'] for q in questions}==set(range(910001,910241)),'Replacement manifest incomplete')
    families=defaultdict(list)
    stems={lang:set() for lang in LANGS}
    for key,s in sources.items():
        require(bool(s.get('publisherCountry')),f'{key}: publisher country missing')
        require(bool(s.get('locator')),f'{key}: exact source locator missing')
        require(urlparse(s.get('url','')).scheme=='https',f'{key}: HTTPS source URL required')
        require(bool(s.get('titleEn')),f'{key}: English source title missing')
        if 'mofa.go.kr' in s['url'] or 'mof.go.kr' in s['url']:
            require(s['publisherCountry']=='\ub300\ud55c\ubbfc\uad6d',f'{key}: source publisher country is not Japan')
            require(s['title'].startswith('\ub300\ud55c\ubbfc\uad6d '),f'{key}: ROK must be named in source label')
    for q in questions:
        p=str(q['id']);families[q['familyId']].append(q)
        for key in ('stem','topic','goal','takeaway'):
            text_pair(q.get(key),f'{p}.{key}')
        for key in ('context','material','scope'):
            text_pair(q.get(key),f'{p}.{key}',True)
        require(q['cognitive'] in range(1,5),f'{p}: invalid cognitive annotation')
        require(q['difficulty'] in range(1,5),f'{p}: invalid difficulty variant')
        require(q['unit'] in range(1,13),f'{p}: unknown unit')
        require(q['sourceIds'] and all(k in sources for k in q['sourceIds']),f'{p}: missing source')
        require(q.get('evidence') and all(e.get('locator') for e in q['evidence']),f'{p}: evidence locator missing')
        opts=q.get('options',[])
        require(2<=len(opts)<=4,f'{p}: use 2 to 4 substantive choices')
        oids=[o.get('id') for o in opts]
        require(len(oids)==len(set(oids)) and all(oids),f'{p}: duplicate/empty choice IDs')
        require(q.get('correctOptionId') in oids,f'{p}: missing correct choice ID')
        for lang in LANGS:
            stem=q['stem'][lang].strip()
            require(stem.endswith('?'),f'{p}.{lang}: explicit question required')
            require(stem not in stems[lang],f'{p}.{lang}: duplicate question')
            stems[lang].add(stem)
            if lang=='ko':
                require(not re.match(r'^(\ub300\ud55c\ubbfc\uad6d )?\uc678\uad50\ubd80.*(\uc548\ub0b4|\ud574\uc124|\uc5ed\ubb38).*?(\uc5d0\uc11c|\ub530\ub974\uba74)',stem),f'{p}: publisher preamble belongs in source footer')
            else:
                require(not stem.lower().startswith('according to the ministry'),f'{p}: publisher preamble belongs in footer')
            references = re.search(r'\b(?:table|timeline|passage|position chart|source card|given|shown|provided)\b',stem,re.I) if lang=='en' else re.search(r'\uc704 \uc790\ub8cc|\uc544\ub798 \uc790\ub8cc|\uc81c\uc2dc\ub41c|\uc790\ub8cc\uc5d0\uc11c|\uc790\ub8cc \uce74\ub4dc|\uc704\uce58\ud45c|\ub300\uc751\ud45c|\uba74\uc801\ud45c|\ub192\uc774\ud45c|\uac70\ub9ac\ud45c|\uc8fc\uc18c\ud45c|\uc5f0\ud45c\uc5d0\uc11c|\uc124\uba85 A|\ud45c\uc5d0 \ub530\ub974\uba74|\ub450 \ubb38\uc7a5',stem)
            if references or q.get('requiresMaterial'):
                require(bool(q['material'][lang].strip()),f'{p}.{lang}: question refers to absent material')
            texts=[o['text'][lang].strip() for o in opts]
            require(len(texts)==len(set(texts)),f'{p}.{lang}: duplicate option text')
        for o in opts:
            text_pair(o.get('text'),f'{p}.{o["id"]}.text')
            text_pair(o.get('feedback'),f'{p}.{o["id"]}.feedback')
            for lang in LANGS:
                require(o['feedback'][lang]!=q['takeaway'][lang],f'{p}: feedback cannot silently reuse family takeaway')
                require(len(o['feedback'][lang])>=12,f'{p}: empty or token-only choice reason')
        require(len({o['feedback']['ko'] for o in opts})==len(opts),f'{p}: repeated generic choice feedback')
        # Source-specific historical object must not be expanded by a rewrite.
        if 'ban1696' in q['sourceIds']:
            require(not re.search(r'\uc6b8\ub989\ub3c4\uc640 \ub3c5\ub3c4.*(?:\ub3c4\ud56d|\uac74\ub108|\ub3c4\ud574).*\uae08\uc9c0',q['stem']['ko']),f'{p}: 1696 destination expanded beyond cited text')
    require(len(families)==60,'Exactly 60 concept families are required')
    for family,qs in families.items():
        require(sorted(q['difficulty'] for q in qs)==[1,2,3,4],f'{family}: missing difficulty variant')
        require(len({q['unit'] for q in qs})==1,f'{family}: crosses units')
    byid={q['id']:q for q in questions}
    for k,t in meta['tracks'].items():
        require(len(t['questionIds'])==60 and len(set(t['questionIds']))==60,f'{k}: incomplete route')
        require(all(i in byid for i in t['questionIds']),f'{k}: inactive route item')
        for unit in range(1,13):
            qq=[byid[i] for i in t['questionIds'] if byid[i]['unit']==unit]
            require(len(qq)==5 and len({q['familyId'] for q in qq})==5,f'{k}/{unit}: five distinct concepts required')
    return families

def compile_data(questions=None, sources=None, meta=None, retired=None):
    questions=read('authored-questions.json') if questions is None else questions
    sources=read('source-registry.json') if sources is None else sources
    meta=read('course-meta.json') if meta is None else meta
    retired=read('retired-ids.json') if retired is None else retired
    families=validate(questions,sources,meta,retired)
    result=copy.deepcopy(meta);result['sources']=sources;result['questions']=[]
    count=Counter()
    for q in sorted(questions,key=lambda x:x['id']):
        opts=copy.deepcopy(q['options']);n=len(opts)
        correct=next(o for o in opts if o['id']==q['correctOptionId'])
        rest=[o for o in opts if o['id']!=q['correctOptionId']]
        place=count[n]%n;count[n]+=1;rest.insert(place,correct);opts=rest
        item={k:copy.deepcopy(q[k]) for k in ('id','replaces','unit','stage','difficulty','cognitive','familyId','conceptId','sourceIds','requiresMaterial','evidence','review')}
        item['choiceIds']=[o['id'] for o in opts];item['answer']=place;item['correctOptionId']=q['correctOptionId']
        for lang in LANGS:
            item[lang]={'q':q['stem'][lang],'choices':[o['text'][lang] for o in opts],
                'explain':correct['feedback'][lang],'wrong':[o['feedback'][lang] for o in opts],
                'fact':q['takeaway'][lang],'material':q['material'][lang],
                'context':q['context'][lang],'scope':q['scope'][lang],
                'goal':q['goal'][lang],'topic':q['topic'][lang]}
        result['questions'].append(item)
    byid={q['id']:q for q in result['questions']}
    for t in result['tracks'].values():
        t['cognitiveCounts']=[sum(byid[i]['cognitive']==l for i in t['questionIds']) for l in range(1,5)]
        t['difficultyCounts']=[sum(byid[i]['difficulty']==l for i in t['questionIds']) for l in range(1,5)]
    audit={
      'version':result['version'],'questions':len(questions),'families':len(families),
      'bilingualPairs':len(questions),'optionFeedbackPairs':sum(len(q['options']) for q in questions),
      'questionContextCount':sum(bool(q['context']['ko']) for q in questions),
      'requiredMaterialCount':sum(q['requiresMaterial'] for q in questions),
      'distinctStemCount':len({q['stem']['ko'] for q in questions}),
      'distinctFeedbackCount':len({o['feedback']['ko'] for q in questions for o in q['options']}),
      'cognitiveCounts':dict(sorted(Counter(q['cognitive'] for q in questions).items())),
      'tracks':{k:{'cognitiveCounts':t['cognitiveCounts'],'difficultyCounts':t['difficultyCounts']} for k,t in result['tracks'].items()},
      'choiceCounts':dict(sorted(Counter(len(q['options']) for q in questions).items())),
      'correctPositionByChoiceCount':{str(n):dict(sorted(Counter(q['answer']+1 for q in result['questions'] if len(q['choiceIds'])==n).items())) for n in (2,3,4)},
      'missingSources':[], 'reviewStatus':'author self-review; independent educational and learner validation pending',
      'liveAccessLimitedSources':[k for k,s in sources.items() if 'limited' in s['verificationAccess']],
      'readingReview':[],'nonGoals':['no 1513-item rewrite','no geometry modification','no operational server change']}
    for k,t in result['tracks'].items():
        lim=t['readingGuideline']
        for i in t['questionIds']:
            q=byid[i]['ko'];stem_len=len(q['q'])+max(map(len,q['choices']))
            if stem_len>lim:
                audit['readingReview'].append({'track':k,'id':i,'stemAndLongestChoice':stem_len,'guideline':lim,'fullTextLength':stem_len+len(q['context'])+len(q['material']),'status':'flagged-not-truncated; learner review required'})
    manifest={'version':result['version'],'preserveOriginalRecordIds':True,'automaticNewMasteryCredit':False,
        'replacements':[{'oldId':q['replaces'],'newId':q['id'],'familyId':q['familyId'],'policy':'retire-content-only; keep records and earned lights'} for q in questions],
        'nonDeployedDraftIds':retired['proposedNeverDeployedIds']}
    return result,audit,manifest

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--check',action='store_true');args=ap.parse_args()
    try:
        data,audit,manifest=compile_data()
        pretty=lambda x:json.dumps(x,ensure_ascii=False,indent=2)+'\n'
        packed=json.dumps(data,ensure_ascii=False,separators=(',',':'))
        # Both server app and portable preview consume this exact generated object.
        js="/* Generated from tools/content/authored-questions.json. Do not edit. */\n(function(r){const d="+packed+";if(typeof module==='object'&&module.exports)module.exports=d;else r.DokdoCourseData=d;})(typeof globalThis!=='undefined'?globalThis:this);\n"
        outputs={ROOT/'data/course-v2.json':pretty(data),ROOT/'assets/course-data.js':js,
                 ROOT/'data/course-audit.json':pretty(audit),ROOT/'data/question-replacements.json':pretty(manifest)}
        for p,text in outputs.items():
            if args.check:require(p.exists() and p.read_text(encoding='utf-8')==text,f'Generated file stale: {p.relative_to(ROOT)}')
            else:p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text,encoding='utf-8')
        print(json.dumps({'questions':audit['questions'],'feedbackPairs':audit['optionFeedbackPairs'],'readingFlags':len(audit['readingReview']),'mode':'check' if args.check else 'build'}))
    except (ValueError,KeyError,TypeError) as e:
        print('CONTENT BUILD STOPPED: '+str(e),file=sys.stderr);return 1
    return 0
if __name__=='__main__':raise SystemExit(main())
