"""Viewport/reflow/text enlargement checks. Only fixture records, no operating API/auth."""
import argparse,functools,http.server,json,re,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
P=argparse.ArgumentParser();P.add_argument('--phase',choices=['before','after'],required=True);P.add_argument('--remote',action='store_true');args=P.parse_args()
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT.parent/'review-evidence'/args.phase;OUT.mkdir(parents=True,exist_ok=True)
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start();local='http://127.0.0.1:'+str(server.server_port)+'/';base='https://dokdo-school-v2.vercel.app/dokdo-next/' if args.remote else local
checks=[];scenes=[];blocked=[];errors=[]
MEASURE="""()=>{const all=[...document.querySelectorAll('body *')],visible=e=>!!(e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');const short=e=>({tag:e.tagName,id:e.id,cls:e.className,text:e.innerText?.slice(0,75),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,font:parseFloat(getComputedStyle(e).fontSize)});return{gmarketReady:document.fonts.check('500 16px GmarketSans')&&document.fonts.check('700 16px GmarketSans'),bodyFont:getComputedStyle(document.body).fontFamily,width:innerWidth,scroll:document.documentElement.scrollWidth,overflow:all.filter(e=>visible(e)&&e.getBoundingClientRect().right>innerWidth+1&&getComputedStyle(e).position!=='fixed').slice(0,10).map(short),textClips:[...document.querySelectorAll('.grade-row-name,.badge-tile b,.v3-stop b,.v3-choice-name,.v3-card-title h2,.nav-item')].filter(e=>visible(e)&&e.scrollWidth>e.clientWidth+2).map(short),fonts:Object.fromEntries(['#v3-entry-description','.v3-choice-description','#v3-subtitle','.v3-stop b','.grade-row-name','.badge-tile b'].map(s=>{const e=[...document.querySelectorAll(s)].find(visible);return[s,e?short(e):null]})),controls:[...document.querySelectorAll('#v3-learn-nav,#account-link,.v3-more>summary,#v3-profile-entry,#v3-main-language,#start-lesson,#v3-all-units,#start-review,.grade-group>summary,.lesson-top>.text-button,.answer-option')].filter(visible).map(short),grade:{count:document.querySelectorAll('.grade-row').length,columns:getComputedStyle(document.querySelector('.grade-group[open] .grade-group-grid')||document.querySelector('#grade-ladder')).gridTemplateColumns,names:[...document.querySelectorAll('.grade-row-name')].map(e=>e.textContent),current:[...document.querySelectorAll('.grade-row.current')].map(e=>e.textContent),card:document.querySelector('.grade-row')?short(document.querySelector('.grade-row')):null}}}"""
def record(page,name,width,zoom=100,shot=True):
 print('SCENE',width,zoom,name,flush=True);m=page.evaluate(MEASURE);m.update(scene=name,widthRequested=width,textZoom=zoom);scenes.append(m)
 if shot:page.screenshot(path=str(OUT/(str(width)+'-'+name+('-text200' if zoom==200 else '')+'.png')),full_page=True)
 if args.phase=='after':
  checks.append({'case':f'{width}/{zoom}/{name}','gmarketLoaded':m['gmarketReady'],'noPageOverflow':m['scroll']<=m['width']+1,'noTextClips':not m['textClips'],'touch44':all(c['width']>=43.5 and c['height']>=43.5 for c in m['controls'])})
 return m
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless=True,chromium_sandbox=True)
  def setup(width):
   ctx=browser.new_context(viewport={'width':width,'height':900},reduced_motion='reduce')
   def route(r):
    url=r.request.url
    if url.endswith('/assets/site-config.js'):
     s=(ROOT/'assets/site-config.js').read_text();s=re.sub(r"(apiUrl|gaId):'[^']*'",r"\1:''",s);r.fulfill(status=200,content_type='application/javascript',body=s)
    elif url.endswith('/assets/account-config.js'):r.fulfill(status=200,content_type='application/javascript',body='window.DOKDO_AUTH_CONFIG={enabled:false};')
    elif url in ['https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansMedium.woff','https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansBold.woff']:r.continue_()
    elif url.startswith(base) and r.request.method=='GET':r.continue_()
    else:blocked.append({'url':url.split('?')[0],'method':r.request.method});r.abort()
   ctx.route('**/*',route);page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base);page.wait_for_selector('#v3-entry');page.wait_for_function('typeof window.DokdoApp==="object"');page.evaluate('document.fonts.ready');return ctx,page
  for width in [360,390,430,1280,1440]:
   ctx,page=setup(width)
   record(page,'entry',width);page.locator('#v3-enter-learn').click();record(page,'learning',width)
   page.evaluate('DokdoApp.view("grade")');page.wait_for_selector('.grade-row');record(page,'grade',width)
   page.evaluate('DokdoApp.view("records")');page.wait_for_selector('#badges-grid-more');page.locator('#badges-grid-more>summary').click();record(page,'badges',width)
   # Seed a synthetic local-only profile directly in the isolated test state.
   page.evaluate('DokdoApp.store.state.learningProfile=DokdoStarter.profile("20+");DokdoApp.start("daily")');page.wait_for_selector('#read-done');page.locator('#read-done').click();page.wait_for_selector('.answer-option');record(page,'question',width)
   ctx.close()
  if args.phase=='after':
   for width in [360,390,430,1280,1440]:
    ctx,page=setup(width);page.add_style_tag(content='html{font-size:200%!important}')
    record(page,'entry',width,200);page.locator('#v3-enter-learn').click();record(page,'learning',width,200)
    page.evaluate('DokdoApp.view("grade")');page.wait_for_selector('.grade-row');record(page,'grade',width,200)
    page.evaluate('DokdoApp.view("records")');page.locator('#badges-grid-more>summary').click();record(page,'badges',width,200)
    page.evaluate('DokdoApp.store.state.learningProfile=DokdoStarter.profile("20+");DokdoApp.start("daily")');page.locator('#read-done').click();record(page,'question',width,200)
    ctx.close()
   for width in [180,195,215,640,720]:
    ctx,page=setup(width);record(page,'entry-reflow200',width,shot=False);page.locator('#v3-enter-learn').click();record(page,'learning-reflow200',width,shot=False);page.evaluate('DokdoApp.view("grade")');record(page,'grade-reflow200',width,shot=False);ctx.close()
   # Same grade/badge fixtures in English to exercise longer labels.
   ctx,page=setup(390);page.locator('#v3-main-language').click();page.evaluate('DokdoApp.view("grade")');record(page,'grade-en',390);before=page.evaluate('JSON.stringify(DokdoApp.state)');summary=page.locator('.grade-group').nth(1).locator('summary');summary.focus();summary.press('Enter');assert page.locator('.grade-group').nth(1).evaluate('e=>e.open');summary.press('Enter');assert not page.locator('.grade-group').nth(1).evaluate('e=>e.open');assert page.locator('.grade-row').count()==33;assert before==page.evaluate('JSON.stringify(DokdoApp.state)');checks.append({'case':'keyboard-group-toggle','preserves33StagesAndRecord':True});ctx.close()
  result={'phase':args.phase,'source':base,'browser':browser.version,'scenes':scenes,'checks':checks,'errors':errors,'blocked':blocked};(OUT/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps({'phase':args.phase,'scenes':len(scenes),'checks':len(checks),'failures':[r for r in checks if not all(v for k,v in r.items() if k!='case')],'errors':errors,'blockedCount':len(blocked)},ensure_ascii=False,indent=2));browser.close()
  assert not errors,errors
  assert all(all(v for k,v in r.items() if k!='case') for r in checks),'layout check failed'
except Exception as e:
 (OUT/'failure.json').write_text(json.dumps({'error':str(e),'errors':errors,'scenes':scenes,'checks':checks},ensure_ascii=False,indent=2));raise
finally:server.shutdown()
