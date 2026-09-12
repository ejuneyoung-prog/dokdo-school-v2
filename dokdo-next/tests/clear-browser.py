#!/usr/bin/env python3
"""Content/UI exhaustive rendering on one browser page.
Inline mode uses a controlled storage adapter and pauses the landscape frame loop;
actual course/DOM/event handlers/Blob remain the app's own implementations.
"""
import argparse,base64,functools,http.server,json,os,re,threading,time
from pathlib import Path
from playwright.sync_api import sync_playwright
A=Path(__file__).resolve().parents[1]
ap=argparse.ArgumentParser();ap.add_argument('--mode',choices=['inline','http'],default='http');ap.add_argument('--browser',default=os.environ.get('CHROMIUM_EXECUTABLE'));ap.add_argument('--engine',choices=['chromium','webkit'],default='chromium');ap.add_argument('--output',default=str(A/'test-results/clear-browser'));ap.add_argument('--phase',choices=['flow','matrix','screens','all'],default='all');args=ap.parse_args();OUT=Path(args.output);OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[];requests=[];rows=[]
def ck(name,ok,detail=None):
 r={'name':name,'pass':bool(ok)}
 if detail is not None:r['detail']=detail
 checks.append(r);(OUT/'in-progress.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2))
 if not ok:print('FAIL',name,detail,flush=True)
def asset(path):
 p=A/path;return 'data:'+{'.png':'image/png','.webp':'image/webp','.wav':'audio/wav','.svg':'image/svg+xml'}[p.suffix]+';base64,'+base64.b64encode(p.read_bytes()).decode()
def inline(file='index.html'):
 h=(A/file).read_text().replace("script-src 'self'","script-src 'self' 'unsafe-inline'")
 h=h.replace('<link rel="stylesheet" href="./assets/app.css">','<style>'+(A/'assets/app.css').read_text()+'</style>')
 paths=re.findall(r'<script defer src="./([^"]+)"></script>',h);h=re.sub(r'<script defer src="./[^"]+"></script>','',h)
 for path in paths:
  s=(A/path).read_text()
  for a in ['assets/dongdo-facilities.png','assets/dokdo-islands.webp','assets/dokdo-terrain.webp','assets/sea-texture.webp','assets/ambient.wav']:s=s.replace('./'+a,asset(a))
  h=h.replace('</body>','<script>'+s.replace('</script','<\\/script')+'</script></body>')
 return h.replace('./assets/icon.svg',asset('assets/icon.svg'))
server=None
if args.mode=='http':
 class Quiet(http.server.SimpleHTTPRequestHandler):
  def log_message(self,*args):pass
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(A)));threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/'
try:
 with sync_playwright() as pw:
  launch={'headless':True}
  if args.engine=='chromium':launch['args']=['--no-sandbox']
  if args.browser:launch['executable_path']=args.browser
  browser=getattr(pw,args.engine).launch(**launch);ctx=browser.new_context(viewport={'width':1440,'height':1100},reduced_motion='reduce',accept_downloads=True);ctx.route('https://cdn.jsdelivr.net/**',lambda r:r.abort());ctx.route('https://script.google.com/**',lambda r:r.abort());p=ctx.new_page();p.set_default_timeout(6000);p.on('dialog',lambda d:d.accept());p.on('pageerror',lambda e:errors.append(str(e)));p.on('request',lambda r:requests.append(r.url) if r.url.startswith('http') and not any(x in r.url for x in ['127.0.0.1','cdn.jsdelivr.net','i.ytimg.com']) else None)
  if args.mode=='inline':
   p.evaluate("()=>{const m=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}});}")
   p.set_content(inline(),wait_until='domcontentloaded')
  else:p.goto(base,wait_until='domcontentloaded')
  p.wait_for_function('!!window.DokdoApp');p.evaluate('DokdoApp.assetsReady')
  # The channel intro opens once a day over the home view and swallows every
  # click underneath it, so dismiss it as a visitor would.
  p.evaluate("()=>{const d=document.getElementById('youtube-intro-dialog');if(d&&d.open)d.close();}")
  ck('live starts with zero question rewards',p.evaluate('Object.keys(DokdoApp.state.m).length===0 && DokdoApp.state.xp===0'))
  if args.phase in ['flow','all']:
   p.eval_on_selector('#start-lesson','e=>e.click()');p.eval_on_selector('#age-form button[type=submit]','e=>e.click()');ck('age gate remains mandatory',p.evaluate('DokdoApp.lesson===null'))
   expected={'u7':1,'8-9':1,'10-11':2,'12-13':3,'14-16':8,'17-19':9,'20+':11}
   for band,unit in expected.items():
    p.evaluate("DokdoApp.start('daily',true)");p.select_option('#age-band',band);p.eval_on_selector('#age-form button[type=submit]','e=>e.click()');ck(band+' routes to intended unit',p.evaluate('DokdoApp.lesson.item.unit')==unit);ck(band+' has five distinct concepts',p.evaluate('new Set(DokdoApp.lesson.items.map(q=>q.familyId)).size===5'));p.eval_on_selector('#read-done','e=>e.click()');ck(band+' source shown before answering',p.locator('#question-citations a').count()>0)
    old=p.evaluate('DokdoApp.lesson.index');wrong=p.evaluate('(DokdoApp.lesson.answer+1)%DokdoApp.lesson.order.length');p.eval_on_selector(f'.answer-option[data-index="{wrong}"]','e=>e.click()');p.wait_for_selector('#retry-question',state='visible');p.evaluate('DokdoApp.next()');ck(band+' wrong answer cannot advance',p.evaluate('DokdoApp.lesson.index')==old and p.locator('#next-question').is_hidden());p.eval_on_selector('#retry-question','e=>e.click()');ans=p.evaluate('DokdoApp.lesson.answer');p.eval_on_selector(f'.answer-option[data-index="{ans}"]','e=>e.click()');p.wait_for_selector('#next-question',state='visible');ck(band+' correction permits next with specific reason',p.locator('#question-feedback .feedback-answer').is_visible());p.evaluate("DokdoApp.view('home')")
  # All 240 questions are placed into the ordinary lesson renderer, without changing their text or handlers.
  if args.phase in ['matrix','all']:
   p.evaluate('window.__nativeRAF=window.requestAnimationFrame;window.requestAnimationFrame=()=>0')
   for lang in ['ko','en']:
    if p.evaluate('document.documentElement.lang')!=lang:p.eval_on_selector('#language','e=>e.click()')
    p.evaluate("DokdoApp.start('daily')")
    if p.locator('#age-dialog').is_visible():p.select_option('#age-band','14-16');p.eval_on_selector('#age-form button[type=submit]','e=>e.click()')
    # Start uses the current unit; force nextItem by putting index=-1 then using the normal next handler.
    p.evaluate("()=>{const l=DokdoApp.lesson;l.items=DokdoStarter.DATA.questions.map(q=>DokdoStarter.getQuestion(q.id,document.documentElement.lang));l.total=l.items.length;l.index=-1;l.answered=true;l.needsRetry=false;}")
    p.evaluate('DokdoApp.next()')
    if p.locator('#teaching').is_visible():p.eval_on_selector('#read-done','e=>e.click()')
    out=p.evaluate('''async()=>{
     const out=[];for(let n=0;n<240;n++){
      const l=DokdoApp.lesson,q=l.item,sourceLinks=[...document.querySelectorAll('#question-citations a')];
      const r={id:q.id,language:document.documentElement.lang,stem:document.getElementById('question-title').textContent===q.q,choiceCount:document.querySelectorAll('.answer-option').length===q.choices.length,sourceBefore:sourceLinks.length===q.sources.length,material:!q.requiresMaterial||(!document.getElementById('question-material').hidden&&document.getElementById('question-material').textContent.includes(q.material)),country:sourceLinks.every((a,i)=>a.textContent.includes(document.documentElement.lang==='en'?q.sources[i].titleEn:q.sources[i].title))};
      const wrong=(l.answer+1)%l.order.length,why=q.wrong[l.order[wrong]];await DokdoApp.choose(wrong);r.wrongFeedback=document.getElementById('question-feedback').textContent.includes(why);await DokdoApp.next();r.wrongBlocks=DokdoApp.lesson.index===n;
      document.getElementById('retry-question').click();await DokdoApp.choose(l.answer);r.correctFeedback=document.getElementById('question-feedback').textContent.includes(q.explain);r.takeaway=document.getElementById('question-feedback').textContent.includes(q.fact);out.push(r);
      if(n<239){await DokdoApp.next();if(!document.getElementById('teaching').hidden)document.getElementById('read-done').click();}
     }return out;
    }''')
    rows+=out;(OUT/'question-paths.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));ck(lang+' all 240 ordinary quiz renders and both answer paths',len(out)==240 and all(all(v is True for k,v in r.items() if k not in ['id','language']) for r in out),[r for r in out if not all(v is True for k,v in r.items() if k not in ['id','language'])]);p.evaluate("DokdoApp.view('home')")
   p.evaluate('window.requestAnimationFrame=window.__nativeRAF;true')
  # Selected examples on actual desktop/mobile question layouts, including long historical scope.
  if args.phase in ['screens','all']:
   if not p.evaluate('!!DokdoApp.state.learningProfile'):
    p.evaluate("DokdoApp.start('daily',true)");p.select_option('#age-band','14-16');p.eval_on_selector('#age-form button[type=submit]','e=>e.click()');p.evaluate("DokdoApp.view('home')")
   if p.evaluate('document.documentElement.lang')!='ko':p.eval_on_selector('#language','e=>e.click()')
   for width,qid,name in [(1440,920205,'ban-desktop'),(390,920205,'ban-mobile'),(390,920225,'snow-mobile'),(1440,920202,'dajokan-desktop'),(320,920232,'address-320')]:
    p.set_viewport_size({'width':width,'height':1050});p.evaluate("DokdoApp.start('daily')");p.evaluate('(id)=>{const l=DokdoApp.lesson;l.items=[DokdoStarter.getQuestion(id)];l.total=1;l.index=-1;l.answered=true;l.needsRetry=false;}',qid);p.evaluate('DokdoApp.next()');
    if p.locator('#teaching').is_visible():p.eval_on_selector('#read-done','e=>e.click()')
    ck(name+' no horizontal overflow',p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));p.eval_on_selector('#question-title',"e=>e.scrollIntoView({block:'start',behavior:'instant'})");p.screenshot(path=str(OUT/(name+'.png')),full_page=True)
    if qid==920205 and width==390:
     p.evaluate('DokdoApp.choose(DokdoApp.lesson.answer)');p.screenshot(path=str(OUT/'ban-feedback-mobile.png'),full_page=True)
    p.evaluate("DokdoApp.view('home')")
   # Full five-question lesson and actual backup Blob download after new records are earned.
   p.set_viewport_size({'width':390,'height':1050});p.evaluate("DokdoApp.start('daily')")
   if p.locator('#teaching').is_visible():p.eval_on_selector('#read-done','e=>e.click()')
   for n in range(5):p.evaluate('DokdoApp.choose(DokdoApp.lesson.answer)');p.evaluate('DokdoApp.next()')
   ck('whole lesson still reaches a recorded five-concept conclusion',p.locator('#lesson-result').is_visible())
   p.evaluate("DokdoApp.view('records')")
   with p.expect_download() as d:p.click('#export-records')
   dest=OUT/'course-backup.json';d.value.save_as(dest);ck('actual backup JSON contains new question records',any(k.startswith('920') for k in json.loads(dest.read_text()).get('state',{}).get('m',{})))
   # Read-only 240-item viewer has no access to the app's records.
   if args.mode=='inline':p.set_content(inline('question-review.html'),wait_until='domcontentloaded')
   else:p.goto(base+'question-review.html',wait_until='domcontentloaded')
   p.wait_for_function('!!window.DokdoQuestionReview');p.fill('#search','920225');ck('read-only review can jump straight to a specific item',p.evaluate('DokdoQuestionReview.item.id')==920225);p.click('#reveal');ck('review exposes every option-specific explanation',p.locator('.review-feedback').count()==4);p.screenshot(path=str(OUT/'review-snow.png'),full_page=True)
  ck('no uncaught script errors',not errors,errors);ck('no production requests',not requests,requests);browser.close()
finally:
 if server:server.shutdown()
 report={'mode':args.mode,'phase':args.phase,'storage':'controlled adapter' if args.mode=='inline' else 'native localhost','landscapeAnimation':'native requestAnimationFrame; reduced-motion preference','checks':checks,'pass':sum(c['pass'] for c in checks),'fail':sum(not c['pass'] for c in checks),'questionRenderPaths':len(rows),'paths':rows,'errors':errors,'requests':requests}
 (OUT/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps({k:report[k] for k in ['pass','fail','questionRenderPaths']}),flush=True)
 if report['fail']:raise SystemExit(1)
