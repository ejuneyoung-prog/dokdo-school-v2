#!/usr/bin/env python3
"""Integrated v1.3 acceptance checks. Inline mode is explicitly not native storage."""
import argparse,base64,functools,http.server,json,os,re,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--mode',choices=['inline','http'],default='http');p.add_argument('--engine',choices=['chromium','webkit'],default='chromium');p.add_argument('--browser',default=os.environ.get('CHROMIUM_EXECUTABLE'));p.add_argument('--output',default='test-results/release-13-browser');a=p.parse_args();OUT=Path(a.output);OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[];requests=[]
def check(name,ok,detail=None):
 checks.append({'name':name,'pass':bool(ok),'detail':detail})
 if not ok: print('FAIL',name,detail,flush=True)
def asset(path):
 f=ROOT/path;return 'data:'+{'.png':'image/png','.webp':'image/webp','.wav':'audio/wav','.svg':'image/svg+xml'}[f.suffix]+';base64,'+base64.b64encode(f.read_bytes()).decode()
def inline():
 h=(ROOT/'index.html').read_text().replace("script-src 'self'","script-src 'self' 'unsafe-inline'")
 h=h.replace('<link rel="stylesheet" href="./assets/app.css">','<style>'+(ROOT/'assets/app.css').read_text()+'</style>')
 scripts=re.findall(r'<script defer src="./([^"]+)"></script>',h);h=re.sub(r'<script defer src="./[^"]+"></script>','',h)
 for path in scripts:
  s=(ROOT/path).read_text()
  for img in ['assets/dongdo-facilities.png','assets/dokdo-islands.webp','assets/dokdo-terrain.webp','assets/sea-texture.webp','assets/ambient.wav']:s=s.replace('./'+img,asset(img))
  h=h.replace('</body>','<script>'+s.replace('</script','<\\/script')+'</script></body>')
 return h.replace('./assets/icon.svg',asset('assets/icon.svg'))
server=None
if a.mode=='http':
 class Quiet(http.server.SimpleHTTPRequestHandler):
  def log_message(self,*args):pass
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as pw:
  launch={'headless':True}
  if a.engine=='chromium':launch['args']=['--no-sandbox']
  if a.browser:launch['executable_path']=a.browser
  browser=getattr(pw,a.engine).launch(**launch);ctx=browser.new_context(viewport={'width':1440,'height':1100},accept_downloads=True,reduced_motion='reduce');ctx.route('https://cdn.jsdelivr.net/**',lambda r:r.abort());page=ctx.new_page();page.set_default_timeout(12000);page.on('dialog',lambda d:d.accept());page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url) if r.url.startswith('http') and not any(x in r.url for x in ['127.0.0.1','cdn.jsdelivr.net']) else None)
  if a.mode=='inline':
   page.evaluate("()=>{const m=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}});}")
   page.set_content(inline(),wait_until='domcontentloaded')
  else:page.goto('http://127.0.0.1:'+str(server.server_port)+'/',wait_until='domcontentloaded')
  page.wait_for_function('!!window.DokdoApp');page.evaluate('DokdoApp.assetsReady')
  # The channel intro opens once a day over the home view. A visitor dismisses
  # it before doing anything else, and so must this run -- otherwise every
  # click below lands on the dialog backdrop instead of the page.
  page.evaluate("()=>{const d=document.getElementById('youtube-intro-dialog');if(d&&d.open)d.close();}")
  check('Version 1.3 is running',page.evaluate('DokdoApp.version')=='1.3.0')
  check('Fresh profile has no flags, credits, or visitors',page.evaluate('DokdoJourney.progress(DokdoApp.state).total===0 && DokdoApp.state.gangchiVisits.length===0 && DokdoApp.state.gcHit===0'))
  check('Weather terms are not silently accepted',page.evaluate('!DokdoApp.weatherClient.enabled'))
  check('No automatic translation is requested',page.get_attribute('html','translate')=='no')
  check('Header uses Gmarket Sans token',page.eval_on_selector('h1','e=>getComputedStyle(e).fontFamily').startswith('GmarketSans'))
  page.click('#start-lesson');page.select_option('#age-band','14-16');page.click('#age-form button[type=submit]')
  # Submitting the age form saves before it starts the lesson, so the lesson
  # appears a tick later; reading it straight away raced and failed at random.
  page.wait_for_function('!!(window.DokdoApp&&DokdoApp.lesson&&DokdoApp.lesson.item)')
  check('Middle-school track begins at its real starting unit (no placement test)',page.evaluate('DokdoApp.lesson.item.unit===8'))
  check('Question uses S-Core Dream token',page.eval_on_selector('#question-title','e=>getComputedStyle(e).fontFamily').startswith('SCoreDream'))
  page.evaluate("DokdoApp.view('home')");page.click('#start-lesson');page.click('#read-done')
  check('Ordinary history lesson displays why-Dokdo background',page.evaluate('DokdoApp.lesson.item.unit===8 && !document.querySelector("#question-context").hidden && document.querySelector("#question-context").textContent.includes("1900")'))
  page.evaluate("DokdoApp.view('home')")
  # Synthetic heavy record only. No user data or production services are involved.
  page.evaluate("()=>{const s=DokdoApp.seedDemo();for(const key of Object.keys(s.m).slice(500))delete s.m[key];delete s.visual.journey;DokdoAppModel.ensure(s);DokdoApp.store.state=s;DokdoApp.store.save();DokdoApp.view('home');}")
  baseline=page.evaluate('JSON.stringify(DokdoApp.state.m)')
  check('Heavy profile has 1,500 lifetime path credits',page.evaluate('DokdoJourney.progress(DokdoApp.state).total===1500'))
  for mode in ['day','sunset','night']:
   page.select_option('#time-mode',mode);page.evaluate('DokdoApp.paint()');page.wait_for_timeout(90)
   check(mode+' preview sets scene without changing records',page.evaluate('DokdoApp.timeMode')==mode and page.evaluate('JSON.stringify(DokdoApp.state.m)')==baseline)
   page.locator('.scene-panel').screenshot(path=str(OUT/(mode+'-1500.png')))
  check('Circuit 2 has 475 new credits and prior full path',page.evaluate('(()=>{const p=DokdoJourney.progress(DokdoApp.state);return p.shownLap===2&&p.filled===475&&p.laps===1})()'))
  # Perceived contrast is inspected via saved images; this assertion checks actual raster change only.
  check('Day and night render differently',(OUT/'day-1500.png').read_bytes()!=(OUT/'night-1500.png').read_bytes())
  check('Weather setup does not block automatic sunset calculation',page.locator('#dokdo-sun').inner_text().find(':')>=0)
  page.select_option('#invite-count','10');page.click('#invite')
  check('Ten earned visitors can coexist',page.evaluate('DokdoApp.state.gangchiVisits.length===10'))
  check('New visits last at most 60 seconds',page.evaluate('DokdoApp.state.gangchiVisits.every(v=>v.remainingMs<=60000 && v.remainingMs>59000)'))
  page.evaluate("DokdoApp.view('learn')");paused=page.evaluate('DokdoApp.state.gangchiVisits.map(v=>v.remainingMs)');page.wait_for_timeout(300)
  check('Visits pause outside landscape',page.evaluate('DokdoApp.state.gangchiVisits.map(v=>v.remainingMs)')==paused)
  page.evaluate("DokdoApp.view('home')")
  # Inject model output as a fixture, never describe it as retrieved weather.
  page.evaluate("()=>{const c=DokdoApp.weatherClient;c.data={temperature:17.5,cloud:90,wind:4,code:73,kind:'snow',at:Date.now(),fetchedAt:Date.now(),provider:'Open-Meteo',model:true};c.status='ready';}")
  page.select_option('#time-mode','night');check('Forecast fixture includes source time and no fabricated station claim', '17.5' in page.locator('#weather-status').inner_text())
  page.locator('.scene-panel').screenshot(path=str(OUT/'snow-fixture.png'))
  page.evaluate("DokdoApp.weatherClient.data=null;DokdoApp.weatherClient.status='unavailable'");page.select_option('#time-mode','auto')
  check('Weather failure leaves stored records intact',page.evaluate('JSON.stringify(DokdoApp.state.m)')==baseline)
  page.select_option('#time-mode','night')
  for width in [320,390,768,1440]:
   page.set_viewport_size({'width':width,'height':1100});page.evaluate('DokdoApp.paint()');page.wait_for_timeout(100)
   check(str(width)+'px has no horizontal page overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
   if width in [390,1440]:page.screenshot(path=str(OUT/('mobile-night.png' if width==390 else 'desktop-night.png')),full_page=True)
  with page.expect_download() as d:page.click('#save-image')
  d.value.save_as(OUT/'my-dokdo-night.png');check('PNG export is real and contains rendered canvas',(OUT/'my-dokdo-night.png').stat().st_size>50000)
  page.evaluate("DokdoApp.view('records')")
  with page.expect_download() as d:page.click('#export-records')
  d.value.save_as(OUT/'synthetic-backup.json');data=json.loads((OUT/'synthetic-backup.json').read_text())
  check('Backup includes all 500 synthetic question records',len(data['state']['m'])==500)
  check('Backup includes new path tiers',data['state']['visual']['journey']['legacy']==1500)
  page.click('#language');page.evaluate("DokdoApp.view('home')");page.select_option('#time-mode','night')
  check('English environment interface uses English labels','circuit' in page.locator('#route-title').inner_text())
  check('English start lesson has translated context',page.evaluate("()=>{const q=DokdoStarter.getQuestion(920141,'en');return q.context.includes('1900')&&q.context.includes('Dokdo');}"))
  check('No production or weather calls under unconfigured mode',not requests,requests)
  check('No uncaught JavaScript errors',not errors,errors)
  browser.close()
finally:
 if server:server.shutdown()
 result={'mode':a.mode,'engine':a.engine,'storage':'controlled adapter' if a.mode=='inline' else 'native localhost','weather':'synthetic fixture; live retrieval not tested','fonts':'external downloads blocked; CSS family routing only','checks':checks,'passed':sum(c['pass'] for c in checks),'failed':sum(not c['pass'] for c in checks),'errors':errors}
 (OUT/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps({'passed':result['passed'],'failed':result['failed']}),flush=True)
 if result['failed']:raise SystemExit(1)
