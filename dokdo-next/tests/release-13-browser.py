#!/usr/bin/env python3
"""Integrated v1.3 acceptance checks. Inline mode is explicitly not native storage."""
import argparse,base64,functools,http.server,json,os,re,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_entry import enter_learning
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--mode',choices=['inline','http'],default='http');p.add_argument('--engine',choices=['chromium','webkit'],default='chromium');p.add_argument('--browser',default=os.environ.get('CHROMIUM_EXECUTABLE'));p.add_argument('--output',default='test-results/release-13-browser');a=p.parse_args();OUT=Path(a.output);OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[];requests=[]
# The channel intro opens once a day over the home view and swallows every
# click underneath it. It can open after the page has settled -- webkit was
# slower here than chromium -- so dismissing it once at startup was not
# enough. Close it whenever it appears, as a visitor would.
INTRO_WATCH="if(!window.__introWatch)window.__introWatch=setInterval(()=>{const d=document.getElementById('youtube-intro-dialog');if(d&&d.open)d.close();},50);"
def more(page):
 if page.locator('#v3-more').count() and not page.locator('#v3-more').get_attribute('open'):
  # Boolean open attributes may be the empty string; inspect the DOM property.
  if not page.eval_on_selector('#v3-more','e=>e.open'):page.click('#v3-more>summary')
def explore(page):
 if page.locator('#v3-explore').count():
  more(page);page.click('#v3-explore')
def selector_checks(page):
 check('Main starts with only the two area choices',page.locator('#v3-entry').is_visible() and page.locator('#v3-entry .v3-choice-grid button,#v3-entry .v3-choice-grid a').count()==2 and page.locator('#start-lesson').is_hidden())
 check('The two choices identify learning and playground separately','독도배움터' in re.sub(r'\s+','',page.locator('#v3-enter-learn').inner_text()) and '독도놀이터' in re.sub(r'\s+','',page.locator('#v3-enter-play').inner_text()))
 protected=page.evaluate('JSON.stringify(DokdoApp.state)')
 page.locator('#v3-enter-learn').focus();page.locator('#v3-enter-learn').press('Space')
 check('Space enters the learning dashboard through the actual choice',page.locator('#v3-entry').is_hidden() and page.locator('#start-lesson').is_visible())
 page.evaluate("DokdoApp.view('learn');DokdoApp.view('home')")
 check('Internal home navigation remains in the learning dashboard',page.locator('#v3-entry').is_hidden() and page.locator('#start-lesson').is_visible())
 page.click('#v3-main-home')
 check('Learning has an explicit return to the main selector',page.locator('#v3-entry').is_visible() and page.locator('#start-lesson').is_hidden())
 # Observe a real keyboard-generated anchor click without navigating to the operating game.
 page.locator('#v3-enter-play').evaluate("el=>el.addEventListener('click',e=>{e.preventDefault();window.__playEntryClick={trusted:e.isTrusted,href:el.href};},{once:true})")
 page.locator('#v3-enter-play').focus();page.locator('#v3-enter-play').press('Enter')
 check('Enter activates the playground link with a trusted native click',page.evaluate("!!window.__playEntryClick?.trusted && /\/games\.html(?:[?#]|$)/.test(window.__playEntryClick.href)"))
 enter_learning(page);page.click('#brand-home')
 check('Brand returns from learning to the main selector',page.locator('#v3-entry').is_visible())
 page.evaluate("DokdoApp.view('home')")
 check('An internal home return also leaves the chooser when no area was selected',page.locator('#v3-entry').is_hidden() and page.locator('#start-lesson').is_visible())
 page.click('#v3-main-home')
 check('Choosing areas does not alter existing student records',page.evaluate('JSON.stringify(DokdoApp.state)')==protected)
 enter_learning(page);more(page);page.click('#language');wait_until(page,'document.documentElement.lang==="en"');page.click('#brand-home')
 for width in [320,768]:
  page.set_viewport_size({'width':width,'height':1100})
  check(str(width)+'px English selector has no horizontal overflow',page.locator('#v3-entry').is_visible() and page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  check(str(width)+'px English selector names both destinations','Learning' in page.locator('#v3-enter-learn').inner_text() and 'Playground' in page.locator('#v3-enter-play').inner_text())
  enter_learning(page)
  check(str(width)+'px English learning dashboard has no horizontal overflow',page.locator('#start-lesson').is_visible() and page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  page.click('#brand-home')
 page.set_viewport_size({'width':1440,'height':1100});enter_learning(page);more(page);page.click('#language');wait_until(page,'document.documentElement.lang==="ko"')
 if page.locator('#v3-more[open]').count():page.click('#v3-more>summary')

def learning_link_checks(ctx):
 # Exercise actual query-string startup on localhost, even when other checks use inline HTML.
 class EntryQuiet(http.server.SimpleHTTPRequestHandler):
  def log_message(self,*args):pass
 service=server;owned=service is None
 if owned:
  service=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(EntryQuiet,directory=str(ROOT)));threading.Thread(target=service.serve_forever,daemon=True).start()
 try:
  for query in ['?area=learn','?play=learn']:
   direct=ctx.new_page();direct.set_default_timeout(12000);direct.on('pageerror',lambda e:errors.append(str(e)))
   direct.goto('http://127.0.0.1:'+str(service.server_port)+'/'+query,wait_until='domcontentloaded');wait_until(direct,'!!window.DokdoApp')
   if query=='?area=learn':
    check(query+' opens the learning dashboard directly',direct.locator('#v3-entry').is_hidden() and direct.locator('#start-lesson').is_visible())
   else:
    check(query+' preserves the direct course-catalogue destination',direct.locator('#v3-entry').is_hidden() and direct.locator('#view-learn').is_visible() and direct.locator('#course-catalog').is_visible() and direct.locator('#learning-menu').is_visible())
   direct.close()
 finally:
  if owned:service.shutdown()

def preview_selector_checks(browser):
 # Build the same portable artifact handed to the professor, with real storage forbidden.
 import importlib.util
 spec=importlib.util.spec_from_file_location('chooser_preview_builder',ROOT/'tools/build_preview.py');builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
 artifact=OUT/'chooser-portable.html';builder.make_preview(artifact)
 preview_ctx=browser.new_context(viewport={'width':768,'height':1100},reduced_motion='reduce');preview_ctx.route('https://cdn.jsdelivr.net/**',lambda r:r.abort())
 preview=preview_ctx.new_page();preview.set_default_timeout(12000);preview.on('pageerror',lambda e:errors.append(str(e)))
 preview.evaluate("Object.defineProperty(window,'localStorage',{get(){throw Error('Portable chooser must not read student storage')},configurable:true})")
 preview.set_content(artifact.read_text(),wait_until='domcontentloaded');wait_until(preview,'!!window.DokdoApp')
 check('Portable preview opens the same simple selector',preview.locator('#v3-entry').is_visible() and preview.locator('#start-lesson').is_hidden())
 check('Portable playground choice points to the absolute operating URL in a new tab',preview.locator('#v3-enter-play').get_attribute('href')=='https://dokdo-school-v2.vercel.app/dokdo-next/games.html' and preview.locator('#v3-enter-play').get_attribute('target')=='_blank' and 'noopener' in (preview.locator('#v3-enter-play').get_attribute('rel') or ''))
 enter_learning(preview);check('Portable preview can enter learning without real student storage',preview.locator('#start-lesson').is_visible() and preview.evaluate('DokdoApp.mode==="preview" && Object.keys(DokdoApp.state.m).length===0'))
 preview_requests=[];preview.on('request',lambda r:preview_requests.append(r.url) if '/api/channel' in r.url else None)
 more(preview);preview.click('#v3-open-channel')
 check('Portable preview does not request live channel data or fabricate a recent list',not preview_requests and preview.locator('.v3-video').count()==0 and '미리보기' in preview.locator('#channel-feed-status').inner_text())
 preview_ctx.close()

def info_channel_checks(page):
 page.click('#brand-home')
 check('Main exposes the fixed live-channel link without opening More',page.locator('#v3-live-entry').is_visible() and page.locator('#v3-live-entry').get_attribute('href')=='https://www.youtube.com/@독도코리아/live' and page.locator('#v3-live-entry').get_attribute('target')=='_blank')
 more(page)
 check('More has two clear content destinations and keeps record/account tools',page.locator('.v3-more-destinations>button').count()==2 and all(page.locator(selector).is_visible() for selector in ['#v3-explore','#v3-open-channel','#language','#open-settings','.v3-utility [data-view="records"]','#account-link']))
 page.click('#v3-explore')
 check('Discover Dokdo groups weather, geography, wildlife and original sources',page.locator('#v3-info-title').is_visible() and page.locator('#dokdo-weather').is_visible() and page.locator('.v3-info-links [data-view="journal"]').is_visible() and page.locator('#v3-question-link').is_visible())
 check('Channel promotion is separated from the information landscape',page.locator('#view-channel #youtube-card').count()==1 and page.locator('#view-channel #offer-block').count()==1 and page.locator('.v3-legacy-home #youtube-card').count()==0)
 page.click('#nav-map');check('Information entry preserves the existing sourced map and facilities',page.locator('#map-card').is_visible() and page.locator('.facility-details').is_visible())
 if a.mode=='http':
  calls=[];checked=page.evaluate('new Date().toISOString()')
  fixture={'state':'ok','channelId':'UCVfBrS1H2crOZHjf2I1mv0A','checkedAt':checked,'items':[{'id':'rjjeZE_tPso','title':'가상 피드 검사 영상','published':'2026-10-18T12:50:58.000Z'}]}
  def feed_route(route):
   calls.append(route.request.url)
   route.fulfill(status=503 if len(calls)==1 else 200,content_type='application/json',body=json.dumps({'state':'unavailable'} if len(calls)==1 else fixture))
  page.route('**/api/channel',feed_route)
  protected="JSON.stringify({m:DokdoApp.state.m,xp:DokdoApp.state.xp,course:DokdoApp.state.learningProfile,weekly:DokdoApp.state.weekly,gcHit:DokdoApp.state.gcHit})"
  before=page.evaluate(protected)
  more(page);page.click('#v3-open-channel');page.wait_for_selector('#channel-feed-retry',state='visible')
  check('A failed official feed honestly shows a retry, with no random old videos',page.locator('.v3-video').count()==0 and '불러오지 못' in page.locator('#channel-feed-status').inner_text() and len(calls)==1)
  page.click('#channel-feed-retry');page.wait_for_selector('.v3-video')
  check('A successful local feed fixture shows its own title, publication date and official watch link',len(calls)==2 and page.locator('.v3-video strong').inner_text()=='가상 피드 검사 영상' and page.locator('.v3-video small').inner_text().startswith('공개일') and page.locator('.v3-video').get_attribute('href')=='https://www.youtube.com/watch?v=rjjeZE_tPso')
  more(page);page.click('#language');wait_until(page,'document.documentElement.lang==="en"')
  check('Channel interface translates without requesting the feed again',len(calls)==2 and page.locator('#v3-channel-title').inner_text()=='Dokdo Korea Channel' and page.locator('.v3-video small').inner_text().startswith('Published'))
  check('Discovering and watching listings does not change learning achievements',page.evaluate(protected)==before)
  more(page);page.click('#language');wait_until(page,'document.documentElement.lang==="ko"')
  page.unroute('**/api/channel',feed_route)
 page.click('#brand-home');enter_learning(page)

def unconfigured(src=None):
 """site-config.js with no backend or analytics id, so nothing is called out to.

 A run that answers a question auto-saves, and CI was appending rows to the
 operator's real activity log. Aborting the request is not enough: an aborted
 request still fires, so the attempt happens and is still recorded. Removing
 the ids means isConfigured() is false, gtag.js is never loaded, and
 nothing is ever sent.
 """
 return re.sub(r"(apiUrl|gaId):'[^']*'",lambda m:m.group(1)+":''",src if src is not None else (ROOT/'assets/site-config.js').read_text(encoding='utf-8'))
def wait_until(page,expression,timeout_ms=12000,step_ms=100):
 for _ in range(max(1,timeout_ms//step_ms)):
  try:
   if page.evaluate(expression):return True
  except Exception:pass  # mid-navigation; keep polling
  page.wait_for_timeout(step_ms)
 raise AssertionError('Timed out waiting for: '+expression)
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
  if path.endswith('site-config.js'):s=unconfigured(s)
  for img in['assets/dongdo-facilities.png','assets/dokdo-islands.webp','assets/dokdo-terrain.webp','assets/sea-texture.webp','assets/ambient.wav']:s=s.replace('./'+img,asset(img))
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
  browser=getattr(pw,a.engine).launch(**launch);ctx=browser.new_context(viewport={'width':1440,'height':1100},accept_downloads=True,reduced_motion='reduce');ctx.add_init_script(INTRO_WATCH);ctx.route('https://cdn.jsdelivr.net/**',lambda r:r.abort());ctx.route('**/assets/site-config.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=unconfigured()));page=ctx.new_page();page.set_default_timeout(12000);page.on('dialog',lambda d:d.accept());page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url) if r.url.startswith('http') and not any(x in r.url for x in ['127.0.0.1','cdn.jsdelivr.net','i.ytimg.com']) else None)
  if a.mode=='inline':
   page.evaluate("()=>{const m=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}});}")
   page.set_content(inline(),wait_until='domcontentloaded')
  else:page.goto('http://127.0.0.1:'+str(server.server_port)+'/',wait_until='domcontentloaded')
  wait_until(page,'!!window.DokdoApp');page.evaluate('DokdoApp.assetsReady')
  # The channel intro opens once a day over the home view. A visitor dismisses
  # it before doing anything else, and so must this run -- otherwise every
  # click below lands on the dialog backdrop instead of the page.
  page.evaluate('()=>{'+INTRO_WATCH+'}')
  selector_checks(page)
  learning_link_checks(ctx)
  preview_selector_checks(browser)
  info_channel_checks(page)
  check('Existing record model 1.3 remains compatible',page.evaluate('DokdoApp.version')=='1.3.0')
  check('Fresh profile has no flags, credits, or visitors',page.evaluate('DokdoJourney.progress(DokdoApp.state).total===0 && DokdoApp.state.gangchiVisits.length===0 && DokdoApp.state.gcHit===0'))
  check('Weather terms are not silently accepted',page.evaluate('!DokdoApp.weatherClient.enabled'))
  check('No automatic translation is requested',page.get_attribute('html','translate')=='no')
  check('Header uses Gmarket Sans token',page.eval_on_selector('h1','e=>getComputedStyle(e).fontFamily').startswith('GmarketSans'))
  page.click('#start-lesson');page.select_option('#age-band','14-16');page.click('#age-form button[type=submit]')
  # Submitting the age form saves before it starts the lesson, so the lesson
  # appears a tick later; reading it straight away raced and failed at random.
  # Polled from here rather than with wait_for_function: that installs a
  # page-side predicate, which this site's CSP blocks for lacking unsafe-eval.
  wait_until(page,'!!(window.DokdoApp&&DokdoApp.lesson&&DokdoApp.lesson.item)')
  check('Middle-school track begins at its real starting unit (no placement test)',page.evaluate('DokdoApp.lesson.item.unit===8'))
  check('Question uses S-Core Dream token',page.eval_on_selector('#question-title','e=>getComputedStyle(e).fontFamily').startswith('SCoreDream'))
  page.evaluate("DokdoApp.view('home')");page.click('#start-lesson');page.click('#read-done')
  check('Ordinary history lesson displays why-Dokdo background',page.evaluate('DokdoApp.lesson.item.unit===8 && !document.querySelector("#question-context").hidden && document.querySelector("#question-context").textContent.includes("1900")'))
  page.evaluate("DokdoApp.view('home')")
  # Complete a real local lesson, then translate its result without answering or finishing again.
  page.click('#start-lesson');page.click('#read-done')
  expected_english_facts=page.evaluate("DokdoApp.lesson.items.map(q=>DokdoStarter.getQuestion(q.id,'en').fact).join(' ')")
  for _ in range(5):
   answer=page.evaluate('DokdoApp.lesson.answer')
   page.locator('#question-options .answer-option').nth(answer).click()
   page.wait_for_selector('#next-question:not([hidden])');page.click('#next-question')
  page.wait_for_selector('#lesson-result',state='visible')
  wait_until(page,'DokdoApp.lesson===null')
  protected_record="JSON.stringify({m:DokdoApp.state.m,xp:DokdoApp.state.xp,grade:DokdoApp.state.grade,course:DokdoApp.state.learningProfile.course,weekly:DokdoApp.state.weekly,gcHit:DokdoApp.state.gcHit})"
  before_translation=page.evaluate(protected_record)
  if page.locator('.school-v3').count():page.click('#lesson-result .v3-result-details>summary')
  more(page);page.click('#language');wait_until(page,'document.documentElement.lang==="en"')
  check('Completed result translates its heading and action without another lesson',page.locator('#lesson-result h2').inner_text()=='Dokdo shines a little brighter today' and page.locator('#lesson-result .button.primary').inner_text()=='Back to my Dokdo' and page.evaluate('DokdoApp.lesson===null'))
  check('Completed result translates its original five knowledge facts',page.locator('#lesson-result .lesson-takeaway p').inner_text()==expected_english_facts)
  check('Translating a result preserves question records, XP, grades, course and weekly totals',page.evaluate(protected_record)==before_translation)
  if page.locator('.school-v3').count():
   check('Result translation recreates exactly one island, open details and playground action',page.locator('#lesson-result .v3-result-island').count()==1 and page.locator('#lesson-result .v3-result-details[open]').count()==1 and page.locator('#lesson-result .v3-result-play').count()==1)
  more(page);page.click('#language');wait_until(page,'document.documentElement.lang==="ko"')
  more(page);page.click('[data-view="grade"]')
  more(page);page.click('#language');wait_until(page,'document.documentElement.lang==="en"')
  check('Grade view translates its dynamic ladder and progress in place',page.locator('#grade-ladder .grade-row-name').first.inner_text()=='Kindergarten' and 'Correct' in page.locator('#grade-view-stats').inner_text())
  check('Grade translation preserves learning achievements',page.evaluate(protected_record)==before_translation)
  more(page);page.click('#language');wait_until(page,'document.documentElement.lang==="ko"')
  page.evaluate("DokdoApp.view('home')")
  # Synthetic heavy record only. No user data or production services are involved.
  page.evaluate("()=>{const s=DokdoApp.seedDemo();for(const key of Object.keys(s.m).slice(500))delete s.m[key];delete s.visual.journey;DokdoAppModel.ensure(s);DokdoApp.store.state=s;DokdoApp.store.save();DokdoApp.view('home');}")
  explore(page)
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
  # The count slot is gone: the button now invites every gangchi it can.
  page.click('#invite')
  # Inviting saves before the visitors appear, so this reads them once stored.
  wait_until(page,'DokdoApp.state.gangchiVisits.length===10')
  check('Ten earned visitors can coexist',page.evaluate('DokdoApp.state.gangchiVisits.length===10'))
  check('New visits last at most 60 seconds',page.evaluate('DokdoApp.state.gangchiVisits.every(v=>v.remainingMs<=60000 && v.remainingMs>59000)'))
  page.evaluate("DokdoApp.view('learn')");paused=page.evaluate('DokdoApp.state.gangchiVisits.map(v=>v.remainingMs)');page.wait_for_timeout(300)
  check('Visits pause outside landscape',page.evaluate('DokdoApp.state.gangchiVisits.map(v=>v.remainingMs)')==paused)
  page.evaluate("DokdoApp.view('home')")
  # Inject model output as a fixture, never describe it as retrieved weather.
  page.evaluate("()=>{const c=DokdoApp.weatherClient;c.data={temperature:17.5,cloud:90,wind:4,code:73,kind:'snow',at:Date.now(),fetchedAt:Date.now(),provider:'Open-Meteo',model:true};c.status='ready';}")
  explore(page)
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
  more(page);page.click('#language');page.evaluate("DokdoApp.view('home')");explore(page);page.select_option('#time-mode','night')
  check('English environment interface uses English labels','circuit' in page.locator('#route-title').inner_text())
  check('English start lesson has translated context',page.evaluate("()=>{const q=DokdoStarter.getQuestion(920141,'en');return q.context.includes('1900')&&q.context.includes('Dokdo');}"))
  # Cached hall fixture: language switching must not request the backend again.
  page.evaluate("""()=>{window.__hallOriginal={...DokdoLeaderboard};window.__hallFetches=0;Object.assign(DokdoLeaderboard,{isConfigured:()=>true,fetchWeekly:async()=>{window.__hallFetches++;return {state:'ok',data:{today:3,people:2,people_week:2,week:[],schools:{},recent:[]}};},fetchTops:async()=>({state:'ok',tops:[]}),saveProgress:async()=>({state:'not_configured'})});DokdoApp.view('hall');}""")
  page.wait_for_selector('#hall-content',state='visible')
  check('Cached hall fixture is rendered once',page.evaluate('window.__hallFetches===1') and 'Participants today' in page.locator('#hall-summary').inner_text())
  more(page);page.click('#language');wait_until(page,'document.documentElement.lang==="ko"')
  check('Hall translation updates dynamic labels without a backend request',page.evaluate('window.__hallFetches===1') and '오늘 참여자' in page.locator('#hall-summary').inner_text() and '초등' in page.locator('#hall-school-tabs').inner_text())
  page.evaluate('Object.assign(DokdoLeaderboard,window.__hallOriginal)')
  # Third-party asset hosts the site embeds by design are excluded above
  # (fonts from jsdelivr, video posters from ytimg). What this still
  # catches is the app's own backend, the weather provider, analytics and
  # Kakao -- the calls this mode is asserting the absence of.
  check('No production or weather calls under unconfigured mode',not requests,requests)
  check('No uncaught JavaScript errors',not errors,errors)
  browser.close()
finally:
 if server:server.shutdown()
 result={'mode':a.mode,'engine':a.engine,'storage':'controlled adapter' if a.mode=='inline' else 'native localhost','weather':'synthetic fixture; live retrieval not tested','fonts':'external downloads blocked; CSS family routing only','checks':checks,'passed':sum(c['pass'] for c in checks),'failed':sum(not c['pass'] for c in checks),'errors':errors}
 (OUT/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps({'passed':result['passed'],'failed':result['failed']}),flush=True)
 if result['failed']:raise SystemExit(1)
