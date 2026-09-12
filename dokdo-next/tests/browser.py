#!/usr/bin/env python3
"""UI regression tests.
--inline uses real Chromium DOM/canvas/media/file APIs with a controlled storage adapter.
--http uses a real localhost origin and native localStorage (for GitHub CI and developer machines).
Neither mode contacts the old production API.
"""
import argparse,base64,functools,http.server,json,os,re,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--mode',choices=['inline','http'],default='http')
p.add_argument('--engine',choices=['chromium','webkit'],default='chromium')
p.add_argument('--output',default=str(ROOT/'test-results/browser'));p.add_argument('--browser',default=os.environ.get('CHROMIUM_EXECUTABLE'))
args=p.parse_args();OUT=Path(args.output);OUT.mkdir(parents=True,exist_ok=True)
KEY='dokdo-korea-school-cinematic-v1';OLD='dokdo-korea-school-v2'
checks=[];errors=[];requests=[]
def wait_until(page,expression,timeout_ms=12000,step_ms=100):
 # Polled here rather than with wait_for_function: that installs a page-side
 # predicate, which this site's CSP blocks for lacking unsafe-eval.
 for _ in range(max(1,timeout_ms//step_ms)):
  try:
   if page.evaluate(expression):return True
  except Exception:pass  # mid-navigation; keep polling
  page.wait_for_timeout(step_ms)
 raise AssertionError('Timed out waiting for: '+expression)
def check(name,condition,details=None):
    result={'name':name,'pass':bool(condition)}
    if details is not None:result['detail']=details
    checks.append(result)
    (OUT/'in-progress.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2))
    print(('PASS ' if condition else 'FAIL ')+name,flush=True)
    if not condition:print('FAIL',name,details,flush=True)
def data(path):
    f=ROOT/path;mime={'.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg','.wav':'audio/wav','.svg':'image/svg+xml'}[f.suffix]
    return 'data:'+mime+';base64,'+base64.b64encode(f.read_bytes()).decode()
def inline_html(file):
    text=(ROOT/file).read_text()
    text=text.replace("script-src 'self'","script-src 'self' 'unsafe-inline'")
    text=text.replace('<link rel="stylesheet" href="./assets/app.css">','<style>'+(ROOT/'assets/app.css').read_text()+'</style>')
    paths=re.findall(r'<script defer src="./([^"]+)"></script>',text)
    text=re.sub(r'<script defer src="./[^"]+"></script>','',text)
    scripts=[]
    for path in paths:
        src=(ROOT/path).read_text()
        for a in ['assets/dongdo-facilities.png','assets/dokdo-islands.webp','assets/sea-texture.webp','assets/dokdo-terrain.webp','assets/ambient.wav']:
            src=src.replace('./'+a,data(a))
        scripts.append('<script>'+src.replace('</script','<\\/script')+'</script>')
    text=text.replace('./assets/icon.svg',data('assets/icon.svg'))
    return text.replace('</body>',''.join(scripts)+'</body>')
def heavy():
    return {'name':'Regression learner','nick':'','flag':'KR','school':'','grade':'PHD2','xp':18750,
      'streak':7,'gcHit':50,'started':True,'passed':['M3'],'m':{str(i):{'lv':4 if i>1510 else i%3+1,
      'cor':3,'att':3,'seen':3,'earned':20,'due':'2026-09-12'} for i in range(1,1514)}}
INIT="""(entries)=>{
 const map=new Map(entries);window.__testStorage=map;
 Object.defineProperty(window,'localStorage',{value:{
  getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),
  removeItem:k=>map.delete(k),get length(){return map.size;},key:i=>[...map.keys()][i]||null
 },configurable:true});
}"""
httpd=None;base=''
if args.mode=='http':
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self,*a):pass
    httpd=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT.parent)))
    threading.Thread(target=httpd.serve_forever,daemon=True).start()
    base=f'http://127.0.0.1:{httpd.server_port}/{ROOT.name}/'
try:
 with sync_playwright() as pw:
    launch={'headless':True}
    if args.engine=='chromium':launch['args']=['--no-sandbox']
    if args.browser:launch['executable_path']=args.browser
    browser=getattr(pw,args.engine).launch(**launch)
    def open_page(width=1440,seed=None,file='index.html',lang='ko'):
        ctx=browser.new_context(viewport={'width':width,'height':1000},device_scale_factor=1,accept_downloads=True)
        page=ctx.new_page();page.set_default_timeout(8000);page.on('pageerror',lambda e:errors.append(str(e)))
        # Only optional fonts are blocked for deterministic screenshots.
        ctx.route('https://cdn.jsdelivr.net/**',lambda r:r.abort())
        # A test must never reach the operator's live sheet: CI runs were
        # appending rows to the real activity log.
        ctx.route('https://script.google.com/**',lambda r:r.abort())
        ctx.on('request',lambda r: requests.append(r.url) if r.url.startswith('http') and '127.0.0.1' not in r.url and 'cdn.jsdelivr.net' not in r.url else None)
        entries=list((seed or {}).items())
        if args.mode=='inline':
            page.evaluate(INIT,entries);page.set_content(inline_html(file),wait_until='domcontentloaded')
        else:
            if entries:
                ctx.add_init_script('(()=>{const entries='+json.dumps(entries)+';try{for(const [k,v] of entries)if(!localStorage.getItem(k))localStorage.setItem(k,v);}catch(e){}})();')
            page.goto(base+file,wait_until='domcontentloaded',timeout=15000)
        wait_until(page,'!!window.DokdoApp')
        # The channel intro opens once a day over the home view and swallows
        # every click underneath it, so dismiss it as a visitor would.
        page.evaluate("()=>{const d=document.getElementById('youtube-intro-dialog');if(d&&d.open)d.close();}")
        page.evaluate('DokdoApp.assetsReady')
        page.wait_for_timeout(100)
        if lang=='en':page.click('#language');wait_until(page,'document.documentElement.lang==="en"')
        return ctx,page
    for width in [390,768,1440]:
      for lang in ['ko','en']:
        ctx,page=open_page(width,lang=lang);prefix=f'{lang}/{width}'
        try:
            check(prefix+' first visit has no seeded rewards',page.evaluate('DokdoApp.state.xp===0 && DokdoApp.state.gangchiVisits.length===0 && Object.keys(DokdoApp.state.m).length===0'))
            check(prefix+' no horizontal document overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
            check(prefix+' real labels and controls not baked into background',page.locator('#start-lesson').is_visible() and page.locator('#sound').is_visible())
            check(prefix+' invite without credits is disabled',page.locator('#invite').is_disabled())
            page.click('#nav-map')
            check(prefix+' map information appears',page.locator('#map-card').is_visible() and page.locator('#today-card').is_hidden())
            check(prefix+' sourced outline comparison, no fake measured contours',page.locator('#outline-compare svg').count()==2 and page.locator('#map-card').inner_text().find('20m')==-1)
            page.click('[data-island=east]')
            check(prefix+' separate eastern-island facts', '98.6 m' in page.locator('#island-facts').inner_text())
            if width==1440 and lang=='ko':page.screenshot(path=str(OUT/'map-desktop.png'),full_page=True)
            page.click('#close-map')
            check(prefix+' landscape and map are independently switchable',page.locator('#map-card').is_hidden() and page.locator('#today-card').is_visible())
            page.click('#start-lesson')
            check(prefix+' age gate before lesson (no placement test)',page.locator('#age-dialog').is_visible() and page.evaluate('DokdoApp.lesson===null'))
            page.click('#age-form button[type=submit]')
            check(prefix+' missing age cannot start lesson',page.locator('#age-dialog').is_visible() and page.evaluate('DokdoApp.state.learningProfile==null'))
            page.fill('#nickname','Learner');page.select_option('#age-band','8-9');page.click('#age-form button[type=submit]')
            page.wait_for_selector('#teaching',state='visible')
            check(prefix+' low-primary pool is actually simple, everyone starts unplaced',page.evaluate("DokdoApp.lesson.item.cognitive<=2 && DokdoApp.lesson.items.length===5 && DokdoApp.state.learningProfile.course.track==='early' && DokdoApp.state.grade==='K' && DokdoApp.state.gcHit===0 && DokdoApp.state.xp===0"))
            page.click('#read-done')
            for _ in range(5):
                ans=page.evaluate('DokdoApp.lesson.answer')
                page.locator(f'.answer-option[data-index="{ans}"]').click()
                page.wait_for_selector('#next-question',state='visible');page.click('#next-question')
            page.wait_for_selector('#lesson-result',state='visible')
            check(prefix+' five correct answers grade-promote past kindergarten',page.evaluate('DokdoApp.state.xp===50 && DokdoAppModel.Core.gradeProgress(DokdoAppModel.Core.correctCount(DokdoApp.state)).grade==="E1"'))
            page.locator('#lesson-result .button.primary').click()
            page.click('#start-lesson')
            check(prefix+' teach before testing',page.locator('#teaching').is_visible() and page.locator('#question-area').is_hidden())
            page.click('#read-done')
            check(prefix+' question and options visible',2<=page.locator('#question-options button').count()<=4)
            wrong=page.evaluate('(DokdoApp.lesson.answer+1)%DokdoApp.lesson.order.length')
            page.locator(f'.answer-option[data-index="{wrong}"]').click()
            page.wait_for_selector('#retry-question',state='visible')
            index=page.evaluate('DokdoApp.lesson.index')
            page.evaluate('DokdoApp.next()')
            check(prefix+' wrong answer blocks next and programmatic bypass',page.locator('#next-question').is_hidden() and page.evaluate('DokdoApp.lesson.index')==index)
            xp=page.evaluate('DokdoApp.state.xp')
            page.click('#retry-question');ans=page.evaluate('DokdoApp.lesson.answer')
            page.locator(f'.answer-option[data-index="{ans}"]').click()
            page.wait_for_selector('#next-question',state='visible')
            check(prefix+' correction does not grant extra XP',page.evaluate('DokdoApp.state.xp')==xp)
            page.click('#next-question')
            for _ in range(4):
                if page.locator('#teaching').is_visible():page.click('#read-done')
                ans=page.evaluate('DokdoApp.lesson.answer')
                page.locator(f'.answer-option[data-index="{ans}"]').click()
                page.wait_for_selector('#next-question',state='visible');page.click('#next-question')
            page.wait_for_selector('#lesson-result',state='visible')
            check(prefix+' full lesson completes',page.locator('#lesson-result').is_visible())
            page.locator('#lesson-result .button.primary').click()
            check(prefix+' learned lights are visible',int(page.locator('#lights-count').inner_text().replace(',',''))>0)
            page.click('#open-settings');page.check('#reduce-motion')
            wait_until(page,'DokdoApp.state.visual.reduceMotion===true')
            check(prefix+' reduced motion is saved',page.evaluate('DokdoApp.state.visual.reduceMotion'))
            page.click('[data-close=settings-dialog]')
            page.click('#open-sources')
            check(prefix+' art/source limitations are visible',page.locator('#sources-dialog').is_visible())
            page.click('[data-close=sources-dialog]')
            if lang=='ko' and width==390:page.screenshot(path=str(OUT/'mobile-learning-progress.png'),full_page=True)
            check(prefix+' translated main page after completion',page.evaluate('document.documentElement.lang')==lang)
        except Exception as e:check(prefix+' flow completed',False,str(e))
        finally:ctx.close()

    raw=json.dumps(heavy(),ensure_ascii=False);ctx,page=open_page(1440,{OLD:raw})
    try:
        check('migration banner detects existing records',page.locator('#legacy-banner').is_visible())
        page.locator('#legacy-banner [data-view=records]').click()
        page.locator('.legacy-item .button').click()
        check('migration requires explicit confirmation',page.locator('#import-preview').is_visible() and page.evaluate('Object.keys(DokdoApp.state.m).length')==0)
        page.locator('#import-preview .primary').click()
        wait_until(page,'Object.keys(DokdoApp.state.m).length===1513')
        check('full history, XP and grade preserved after copy',page.evaluate('DokdoApp.state.xp===18750 && DokdoApp.state.grade==="PHD2" && Object.keys(DokdoApp.state.m).length===1513'))
        check('legacy original is byte-for-byte unchanged',page.evaluate('(key)=>localStorage.getItem(key)',OLD)==raw)
        with page.expect_download() as d:page.click('#export-records')
        downloaded=OUT/'learning-backup.json';d.value.save_as(downloaded)
        exported=json.loads(downloaded.read_text())
        check('real Blob download contains all 1513 records',len(exported['state']['m'])==1513)
        page.evaluate('DokdoApp.view("home")')
        page.select_option('#invite-count','10');page.click('#invite')
        wait_until(page,'DokdoApp.state.gangchiVisits.length===10')
        check('ten visible visitors have one-minute budgets',page.evaluate('DokdoApp.state.gangchiVisits.every(v=>v.remainingMs<=60000&&v.remainingMs>50000)'))
        check('three beacons and 1513 lights are reflected by UI',page.locator('#beacon-count').inner_text().endswith('3') and page.locator('#lights-count').inner_text()=='1,513')
        before=page.evaluate('DokdoApp.state.gangchiVisits.map(v=>v.remainingMs)')
        page.click('#open-settings');stopped=page.evaluate('DokdoApp.state.gangchiVisits.map(v=>v.remainingMs)')
        page.wait_for_timeout(170)
        check('a dialog pauses active visitor time',page.evaluate('DokdoApp.state.gangchiVisits.map(v=>v.remainingMs)')==stopped)
        page.click('[data-close=settings-dialog]')
        page.screenshot(path=str(OUT/'desktop-heavy.png'),full_page=True)
        with page.expect_download() as d:page.click('#save-image')
        card=OUT/'actual-saved-card.png';d.value.save_as(card)
        check('actual canvas export creates PNG',card.read_bytes().startswith(b'\x89PNG') and card.stat().st_size>30000)
        page.click('#sound');page.wait_for_timeout(300)
        check('native media can play after an explicit click',page.evaluate('DokdoApp.audio && !DokdoApp.audio.paused'))
        page.click('#sound');page.wait_for_timeout(100)
        check('sound-off really pauses and mutes the native player',page.evaluate('DokdoApp.audio.paused && DokdoApp.audio.muted'))
        page.evaluate('DokdoApp.tick(60000,true)')
        check('visitors expire without losing credits or lights',page.evaluate('DokdoApp.state.gangchiVisits.length===0 && DokdoApp.state.gcHit===0 && Object.keys(DokdoApp.state.m).length===1513'))
        page.evaluate('DokdoApp.mutate(s=>DokdoAppModel.unlock(s,"stage-1"))')
        check('bird award is recorded once',page.evaluate('Object.keys(DokdoApp.state.visual.unlocks).length===1'))
        page.evaluate('DokdoApp.mutate(s=>DokdoAppModel.unlock(s,"stage-1"))')
        check('duplicate bird achievement gives no duplicate discovery',page.evaluate('Object.keys(DokdoApp.state.visual.unlocks).length===1'))
        page.screenshot(path=str(OUT/'birds-desktop.png'),full_page=True)
        page.evaluate('DokdoApp.tick(24000,true)')
        check('bird journal remains after animation finishes',page.evaluate('DokdoApp.state.visual.birdVisit===null && Object.keys(DokdoApp.state.visual.unlocks).length===1'))
    except Exception as e:check('migration/landscape flow completed',False,str(e))
    finally:ctx.close()

    ctx,page=open_page(390)
    try:
        page.evaluate('DokdoApp.view("records")')
        page.set_input_files('#import-file',str(OUT/'learning-backup.json'))
        page.wait_for_selector('#import-preview',state='visible')
        check('file picker parses and previews backup before importing',page.evaluate('Object.keys(DokdoApp.state.m).length===0'))
        page.locator('#import-preview .primary').click();wait_until(page,'Object.keys(DokdoApp.state.m).length===1513')
        check('file restore in another isolated browser preserves full history',page.evaluate('DokdoApp.state.xp===18750 && Object.values(DokdoApp.state.m).filter(r=>r.lightBest===4).length===3'))
        page.evaluate('DokdoApp.view("home")')
        page.screenshot(path=str(OUT/'mobile-heavy.png'),full_page=True)
        check('heavy user mobile layout remains within viewport',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
        page.click('#language');wait_until(page,'document.documentElement.lang==="en"')
        check('language switch preserves the shared new record',page.evaluate('Object.keys(DokdoApp.state.m).length===1513'))
    except Exception as e:check('file restore flow completed',False,str(e))
    finally:ctx.close()

    ctx,page=open_page(768,{KEY:'{damaged'})
    try:
        check('damaged real record is not replaced by a fresh account',page.evaluate('DokdoApp.state===null && DokdoApp.store.blocked') and page.locator('#storage-alert').is_visible())
        check('damaged raw bytes stay intact',page.evaluate('(k)=>localStorage.getItem(k)',KEY)=='{damaged')
        page.set_input_files('#import-file',str(OUT/'learning-backup.json'))
        page.wait_for_selector('#import-preview',state='visible')
        page.locator('#import-preview .primary').click()
        wait_until(page,'!!DokdoApp.state && Object.keys(DokdoApp.state.m).length===1513')
        check('unreadable record has an explicit backup-based recovery path',page.evaluate('!DokdoApp.store.blocked && DokdoApp.state.xp===18750'))
        check('recovery keeps exact damaged bytes in a separate snapshot',page.evaluate('(k)=>localStorage.getItem(k)',KEY+':before-recovery')=='{damaged')
    except Exception as e:check('damaged record handling',False,str(e))
    finally:ctx.close()

    ctx,page=open_page(1440,file='demo.html')
    try:
        check('demo is clearly labelled and separate',page.locator('#demo-banner').is_visible() and page.evaluate('DokdoApp.mode==="demo"'))
        check('demo data is not written to the real new key',page.evaluate('(k)=>localStorage.getItem(k)',KEY) is None)
    finally:ctx.close()
    ctx,page=open_page(390)
    try:
        page.evaluate("""()=>{
         window.__finishPlay=[];
         window.Audio=class extends EventTarget{
          constructor(){super();this.paused=true;this.muted=true;}
          play(){this.paused=false;this.dispatchEvent(new Event('play'));return new Promise(resolve=>window.__finishPlay.push(()=>{this.paused=false;this.dispatchEvent(new Event('play'));resolve();}));}
          pause(){this.paused=true;}
         };
        }""")
        page.click('#sound');page.click('#sound')
        page.evaluate('window.__finishPlay.forEach(f=>f())');page.wait_for_timeout(70)
        check('late audio completion cannot undo a user mute (controlled media race)',page.evaluate('DokdoApp.audio.muted&&DokdoApp.audio.paused'))
        page.evaluate('(key)=>{const other=DokdoAppModel.fresh();other.xp=33;localStorage.setItem(key,JSON.stringify(other));}',KEY)
        page.evaluate('DokdoApp.mutate(s=>s.xp=999).catch(()=>false)')
        check('stale browser tab enters record protection',page.evaluate('DokdoApp.store.blocked'))
        check('stale browser tab cannot overwrite the newer record',page.evaluate('(key)=>JSON.parse(localStorage.getItem(key)).xp',KEY)==33)
    except Exception as e:check('media race and stale-tab checks completed',False,str(e))
    finally:ctx.close()
    long_record=heavy();long_record['name']='A'*280
    ctx,page=open_page(390,{KEY:json.dumps(long_record)})
    try:
        check('long imported name is not allowed to break mobile layout',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
        check('long name is preserved in data rather than truncated in storage',page.evaluate('DokdoApp.state.name.length')==280)
    finally:ctx.close()
    check('no unhandled browser JavaScript errors',len(errors)==0,errors)
    check('no operational server or tracking request attempts',len(requests)==0,requests)
    browser.close()
except Exception as e:
    check('browser environment',False,str(e))
finally:
    if httpd:httpd.shutdown()
    report={'mode':args.mode,'nativeOrigin':args.mode=='http','storage':'native localStorage' if args.mode=='http' else 'controlled adapter',
      'media':'native HTMLMediaElement','device':'desktop '+args.engine+', responsive viewport (not a physical phone)',
      'checks':checks,'passed':sum(c['pass'] for c in checks),'failed':sum(not c['pass'] for c in checks),'errors':errors}
    (OUT/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps({'passed':report['passed'],'failed':report['failed'],'mode':args.mode}))
    raise SystemExit(1 if report['failed'] else 0)
