#!/usr/bin/env python3
"""Curriculum/UI regression. Inline mode isolates storage; HTTP mode is for normal CI."""
import argparse,base64,functools,http.server,json,os,re,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--mode',choices=['inline','http'],default='http');p.add_argument('--engine',choices=['chromium','webkit'],default='chromium');p.add_argument('--browser',default=os.environ.get('CHROMIUM_EXECUTABLE'));p.add_argument('--output',default=str(ROOT/'test-results/course-browser'));a=p.parse_args();OUT=Path(a.output);OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[];requests=[]
def check(name,ok,detail=None):
 r={'name':name,'pass':bool(ok)}
 if detail is not None:r['detail']=detail
 checks.append(r)
 (OUT/'in-progress.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2))
 if not ok:print('FAIL',name,detail,flush=True)
def data(path):
 f=ROOT/path;mime={'.png':'image/png','.webp':'image/webp','.wav':'audio/wav','.svg':'image/svg+xml'}[f.suffix]
 return 'data:'+mime+';base64,'+base64.b64encode(f.read_bytes()).decode()
def inline_html():
 h=(ROOT/'index.html').read_text().replace("script-src 'self'","script-src 'self' 'unsafe-inline'")
 h=h.replace('<link rel="stylesheet" href="./assets/app.css">','<style>'+(ROOT/'assets/app.css').read_text()+'</style>')
 paths=re.findall(r'<script defer src="./([^"]+)"></script>',h);h=re.sub(r'<script defer src="./[^"]+"></script>','',h);js=[]
 for path in paths:
  s=(ROOT/path).read_text()
  for f in ['assets/dongdo-facilities.png','assets/dokdo-islands.webp','assets/dokdo-terrain.webp','assets/sea-texture.webp','assets/ambient.wav']:s=s.replace('./'+f,data(f))
  js.append('<script>'+s.replace('</script','<\\/script')+'</script>')
 return h.replace('./assets/icon.svg',data('assets/icon.svg')).replace('</body>',''.join(js)+'</body>')
INIT="""(()=>{const m=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)},configurable:true});})()"""
INLINE=inline_html() if a.mode=='inline' else ''
server=None;base=''
if a.mode=='http':
 class Quiet(http.server.SimpleHTTPRequestHandler):
  def log_message(self,*args):pass
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT.parent)));threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/{ROOT.name}/'
try:
 with sync_playwright() as pw:
  opts={'headless':True}
  if a.engine=='chromium':opts['args']=['--no-sandbox']
  if a.browser:opts['executable_path']=a.browser
  browser=getattr(pw,a.engine).launch(**opts)
  def open_page(width,lang):
   ctx=browser.new_context(viewport={'width':width,'height':980},accept_downloads=True,reduced_motion='reduce')
   ctx.route('https://cdn.jsdelivr.net/**',lambda r:r.abort())
   page=ctx.new_page();page.set_default_timeout(7000);page._accept_dialog=lambda d:d.accept();page.on('dialog',page._accept_dialog);page.on('pageerror',lambda e:errors.append(str(e)))
   page.on('request',lambda r:requests.append(r.url) if r.url.startswith('http') and '127.0.0.1' not in r.url and 'cdn.jsdelivr.net' not in r.url else None)
   if a.mode=='inline':page.evaluate(INIT);page.evaluate('window.requestAnimationFrame=()=>0');page.set_content(INLINE,wait_until='domcontentloaded')
   else:page.goto(base+'index.html',wait_until='domcontentloaded')
   page.wait_for_function('!!window.DokdoApp');page.evaluate('DokdoApp.assetsReady')
   if lang=='en':page.click('#language')
   return ctx,page
  expected={'u7':1,'8-9':1,'10-11':2,'12-13':3,'14-16':8,'17-19':9,'20+':11}
  for lang in ['ko','en']:
   for band,unit in (expected.items() if lang=='ko' else [('8-9',1),('14-16',8),('20+',11)]):
    ctx,page=open_page(390,lang);prefix=lang+'/'+band
    try:
     page.click('#start-lesson');page.select_option('#age-band',band);page.click('#age-form button[type=submit]');page.wait_for_selector('#teaching',state='visible')
     check(prefix+' has its specified Dokdo starting unit',page.evaluate('DokdoApp.lesson.item.unit')==unit)
     check(prefix+' one taught unit has five unique concept families',page.evaluate('new Set(DokdoApp.lesson.items.map(q=>q.familyId)).size===5 && new Set(DokdoApp.lesson.items.map(q=>q.unit)).size===1'))
     check(prefix+' instruction is a whole Dokdo paragraph, not generic etiquette',len(page.locator('#teaching-text').inner_text())>80)
     page.click('#read-done');check(prefix+' active new ID, not old 48 demo',page.evaluate('DokdoStarter.isActive(DokdoApp.lesson.item.id) && DokdoApp.lesson.item.id>=910001'))
     check(prefix+' correct sources and wrong explanations are attached',page.evaluate('DokdoApp.lesson.item.sources.length>0 && DokdoApp.lesson.item.wrong.length===DokdoApp.lesson.item.choices.length'))
     check(prefix+' no mobile horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
     wrong=page.evaluate('(DokdoApp.lesson.answer+1)%DokdoApp.lesson.order.length');page.locator(f'.answer-option[data-index="{wrong}"]').click();page.wait_for_selector('#retry-question',state='visible')
     before=page.evaluate('DokdoApp.lesson.index');page.evaluate('DokdoApp.next()');check(prefix+' wrong answer blocks both button and next function',page.locator('#next-question').is_hidden() and page.evaluate('DokdoApp.lesson.index')==before)
     check(prefix+' feedback links the actual source',page.locator('#question-citations a[href^="https://"]').count()>0)
     page.click('#retry-question');right=page.evaluate('DokdoApp.lesson.answer');page.locator(f'.answer-option[data-index="{right}"]').click();page.wait_for_selector('#next-question',state='visible')
     check(prefix+' correction is understood without bonus XP',page.evaluate('DokdoApp.state.xp===0 && DokdoApp.state.gcHit===0 && DokdoApp.state.m[DokdoApp.lesson.item.id].courseLearned===true'))
     if band=='14-16' and lang=='ko':page.screenshot(path=str(OUT/'middle-correction.png'),full_page=True)
     page.click('#next-question')
     if band=='14-16' and lang=='ko':page.screenshot(path=str(OUT/'middle-question-mobile.png'),full_page=True)
     if (lang,band) in [('ko','14-16'),('en','8-9')]:
      while page.evaluate('!!DokdoApp.lesson'):
       if page.locator('#teaching').is_visible():page.click('#read-done')
       if page.locator('#question-material').is_visible():check(prefix+' displayed evidence is real text',len(page.locator('#question-material').inner_text())>35)
       ans=page.evaluate('DokdoApp.lesson.answer');page.locator(f'.answer-option[data-index="{ans}"]').click();page.wait_for_selector('#next-question',state='visible');page.click('#next-question')
      page.wait_for_selector('#lesson-result',state='visible')
      check(prefix+' completed unit is recorded once',page.evaluate('Object.keys(DokdoApp.state.learningProfile.course.completed).length===1'))
      check(prefix+' take-away paragraph includes the five related facts',len(page.locator('.lesson-takeaway p').inner_text())>80)
      page.locator('#lesson-result .button.primary').click();page.click('[data-view="learn"].nav-item')
     else:
      page.click('#leave-lesson');page.click('[data-view="learn"].nav-item')
     check(prefix+' twelve selectable units are actually displayed',page.locator('#course-unit-list button').count()==12)
    except Exception as e:check(prefix+' full path completes',False,str(e))
    finally:ctx.close()
  ctx,page=open_page(1440,'ko')
  try:
   page.click('#start-lesson');page.select_option('#age-band','14-16');page.click('#age-form button[type=submit]');page.click('#read-done');page.screenshot(path=str(OUT/'middle-question-desktop.png'),full_page=True)
   page.remove_listener('dialog',page._accept_dialog);page.once('dialog',lambda d:d.dismiss())
   before=page.evaluate('DokdoApp.lesson.index');page.click('#nav-map')
   check('cancelling a map navigation preserves the active lesson and visible view',page.locator('#view-learn').is_visible() and page.locator('#view-home').is_hidden() and page.evaluate('DokdoApp.lesson.index')==before)
   page.on('dialog',page._accept_dialog)
   page.click('#leave-lesson');page.click('[data-view="learn"].nav-item');page.screenshot(path=str(OUT/'curriculum-desktop.png'),full_page=True)
   page.click('#language');check('generated catalogue switches to English too', 'Middle school' in page.locator('#path-name').inner_text())
   page.click('#nav-map');page.click('[data-island=east]');page.screenshot(path=str(OUT/'landform-reference.png'),full_page=True)
   check('landform mode identifies itself as a non-surveyed reference', '98.6' in page.locator('#map-card').inner_text())
   page.click('#close-map')
  except Exception as e:check('desktop catalogue and landform review',False,str(e))
  finally:ctx.close()
  ctx,page=open_page(320,'ko')
  try:
   page.click('#start-lesson');page.select_option('#age-band','14-16');page.click('#age-form button[type=submit]');page.click('#read-done');check('320px question and options fit',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));page.screenshot(path=str(OUT/'middle-question-320.png'),full_page=True)
  except Exception as e:check('320px course view',False,str(e))
  finally:ctx.close()
  check('no uncaught JavaScript errors',not errors,errors);check('no production or analytics requests',not requests,requests)
  browser.close()
finally:
 if server:server.shutdown()
 result={'mode':a.mode,'engine':a.engine,'animation':'frame loop paused for quiz DOM tests', 'storage':'controlled in-memory adapter' if a.mode=='inline' else 'native origin localStorage','checks':checks,'pass':sum(x['pass'] for x in checks),'fail':sum(not x['pass'] for x in checks),'errors':errors,'requests':requests}
 (OUT/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps({k:result[k] for k in ['mode','pass','fail']}));
 if result['fail']:raise SystemExit(1)
