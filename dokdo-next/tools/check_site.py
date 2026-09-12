#!/usr/bin/env python3
"""Static deployment checks; not a substitute for native browser or education review."""
from pathlib import Path
from html.parser import HTMLParser
import json,re,subprocess,sys
ROOT=Path(__file__).resolve().parents[1]
checks=[]
def check(name,ok,detail=None):
    d={'name':name,'pass':bool(ok)}
    if detail is not None:d['detail']=detail
    checks.append(d)
class Parser(HTMLParser):
    def __init__(self):super().__init__();self.refs=[];self.ids=[];self.unsafe=[];self.meta=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        if any(k.startswith('on') for k in a):self.unsafe.append(tag)
        if tag in ['script','link','img','audio','source']:
            self.refs.extend([a[k] for k in ['src','href'] if k in a])
        if tag=='meta':self.meta.append(a)
for name in ['index.html','demo.html','question-review.html']:
    p=Parser();text=(ROOT/name).read_text();p.feed(text)
    check(name+' has unique element IDs',len(p.ids)==len(set(p.ids)))
    check(name+' has no inline event handlers',not p.unsafe)
    for ref in p.refs:
        if ref.startswith('./'):check(name+' local asset '+ref,(ROOT/ref).is_file())
    csp=next((a.get('content','') for a in p.meta if a.get('http-equiv')=='Content-Security-Policy'),'')
    connect_allowlist={"'self'","'none'",'https://api.open-meteo.com','https://script.google.com','https://script.googleusercontent.com','https://*.googleusercontent.com','https://www.google-analytics.com','https://*.google-analytics.com','https://www.googletagmanager.com','https://*.analytics.google.com'}
    connect_directive=next((d for d in csp.split(';') if d.strip().startswith('connect-src')),'')
    connect_tokens=connect_directive.strip().split()[1:]
    check(name+' connect-src only names the approved weather/leaderboard/analytics endpoints',bool(connect_tokens) and set(connect_tokens)<=connect_allowlist,connect_tokens)
    script_allowlist={"'self'",'https://www.googletagmanager.com','https://t1.kakaocdn.net'}
    script_directive=next((d for d in csp.split(';') if d.strip().startswith('script-src')),'')
    script_tokens=script_directive.strip().split()[1:]
    check(name+' restricts executable scripts to local files or the approved GA4/Kakao loaders',bool(script_tokens) and set(script_tokens)<=script_allowlist,script_tokens)
    frame_allowlist={"'none'",'https://www.youtube-nocookie.com'}
    frame_directive=next((d for d in csp.split(';') if d.strip().startswith('frame-src')),'')
    frame_tokens=frame_directive.strip().split()[1:]
    check(name+' frame-src only names the approved YouTube embed host',(not frame_tokens) or set(frame_tokens)<=frame_allowlist,frame_tokens)
for f in sorted((ROOT/'assets').glob('*.js')):
    r=subprocess.run(['node','--check',str(f)],capture_output=True,text=True)
    check(f.name+' JavaScript syntax',r.returncode==0,r.stderr.strip() if r.returncode else None)
all_js='\n'.join(p.read_text() for p in (ROOT/'assets').glob('*.js'))
non_config_js='\n'.join(p.read_text() for p in (ROOT/'assets').glob('*.js') if p.name!='site-config.js')
check('Apps Script endpoint is only configured in site-config.js, not hardcoded elsewhere',not re.search(r'AKfycb|script\.google\.com/macros',non_config_js))
check('No common embedded credential patterns',not re.search(r'AIza[0-9A-Za-z_-]{30,}|sk-[A-Za-z0-9]{35,}',all_js))
check('No eval or dynamic Function constructor',not re.search(r'\beval\s*\(|new\s+Function\s*\(',all_js))
check('No font binaries distributed',not any(p.suffix.lower() in ['.woff','.woff2','.ttf','.otf','.ttc'] for p in ROOT.rglob('*')))
check('No service worker with unknown stale caches',(ROOT/'sw.js').exists()==False and 'serviceWorker.register' not in all_js)
check('Default page is not a synthetic demo','name="dokdo-mode" content="live"' in (ROOT/'index.html').read_text())
check('Demo has a distinct route','name="dokdo-mode" content="demo"' in (ROOT/'demo.html').read_text())
check('Artwork exists and has reasonable size',0<(ROOT/'assets/dokdo-islands.webp').stat().st_size<1500000)
check('Media asset has a valid RIFF/WAVE header',(ROOT/'assets/ambient.wav').read_bytes()[:4]==b'RIFF')
course=json.loads((ROOT/'data/course-v2.json').read_text())
check('Active curriculum explicitly excludes legacy routing',course['legacyBankEligible'] is False)
check('Active curriculum has exactly 240 stable unique IDs',len(course['questions'])==len(set(q['id'] for q in course['questions']))==240)
check('Outline data does not claim georeferencing',json.loads((ROOT/'data/outline-provenance.json').read_text())['kind']=='schematic-outline-comparison-not-georeferenced')
check('Course data loads before the course engine', (ROOT/'index.html').read_text().index('assets/course-data.js') < (ROOT/'index.html').read_text().index('assets/starter-course.js'))
check('Retired content is not loaded by HTML', 'starter-pilot.json' not in (ROOT/'index.html').read_text() and 'archive/' not in (ROOT/'index.html').read_text())
# Runtime asset strings must resolve under the same deployed subdirectory.
for asset in set(re.findall(r"['\"](\./assets/[^'\"]+\.(?:webp|png|wav|svg))['\"]",all_js)):
    check('Runtime asset '+asset,(ROOT/asset).is_file())
result={'checks':checks,'passed':sum(c['pass'] for c in checks),'failed':sum(not c['pass'] for c in checks)}
out=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'test-results/static.json';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps({'passed':result['passed'],'failed':result['failed']}))
for c in checks:
    if not c['pass']:print('FAIL:',c['name'],c.get('detail',''))
raise SystemExit(bool(result['failed']))
