"""Isolated game/audio UI regression. Native media; no live account or backend calls."""
import argparse,functools,http.server,json,os,re,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--engine',choices=['chromium','webkit'],default='chromium');parser.add_argument('--browser');parser.add_argument('--output',default=str(ROOT/'test-results/audio-feedback'));args=parser.parse_args();OUT=Path(args.output);OUT.mkdir(parents=True,exist_ok=True)
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  if self.path.split('?')[0].endswith('/assets/site-config.js'):
   source=(ROOT/'assets/site-config.js').read_text();source=re.sub(r"(apiUrl|gaId):'[^']*'",r"\1:''",source);body=source.encode();self.send_response(200);self.send_header('Content-Type','application/javascript');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
  else:super().do_GET()
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start();base='http://127.0.0.1:'+str(server.server_port)
checks=[];external=[];errors=[]
def check(name,value):
 assert value,name
 checks.append(name);print('PASS',name,flush=True)
def wait_until(page,expression,timeout=15000):
 for _ in range(timeout//100):
  if page.evaluate(expression):return
  page.wait_for_timeout(100)
 raise AssertionError('Timed out: '+expression)
def fixture(page,kind,setup=''):
 page.goto(base+'/games.html',wait_until='domcontentloaded')
 page.evaluate("""({kind,setup})=>{const s=DokdoGames.fresh(),r=DokdoGames.begin(s,kind);if(setup==='legacy'){const g=r.active.game;g.missionVersion=1;g.board=Array.from({length:8},()=>Array(8).fill(0));for(let x=0;x<6;x++)g.board[7][x]=1+x%3;g.pieces=[1,5,6];}if(setup==='hammer'){r.active.game.net=[0,7];r.active.game.hammers=1;}if(setup==='hit'){r.active.game.spawn=99;r.active.game.objects=[{kind:'guard',x:140,w:34,h:70,passed:false}];}localStorage.setItem(DokdoGames.KEY,JSON.stringify(s));}""",{'kind':kind,'setup':setup})
 page.reload(wait_until='domcontentloaded');page.locator('[data-launch="'+kind+'"]').first.click();page.wait_for_selector('#player-dialog[open]')
def complete_mission(page):
 for _ in range(6):
  step=page.evaluate('()=>{const g=JSON.parse(localStorage.getItem(DokdoGames.KEY)).active.game,i=g.pieces.findIndex(p=>p!==null),h=DokdoGames.hint(g,i);return {...h,moves:g.moves};}')
  page.locator('[data-piece="'+str(step['i'])+'"]').click()
  page.locator('.cell[data-x="'+str(step['x'])+'"][data-y="'+str(step['y'])+'"]').click()
  wait_until(page,'JSON.parse(localStorage.getItem(DokdoGames.KEY)).active.game.moves==='+str(step['moves']+1))
 return page.evaluate('JSON.parse(localStorage.getItem(DokdoGames.KEY)).active.game')
try:
 with sync_playwright() as pw:
  options={'headless':True}
  if args.engine=='chromium':options['args']=['--no-sandbox']
  executable=args.browser or (os.environ.get('CHROMIUM_EXECUTABLE') if args.engine=='chromium' else None)
  if executable:options['executable_path']=executable
  browser=getattr(pw,args.engine).launch(**options);ctx=browser.new_context(viewport={'width':1200,'height':1100})
  # Observe actual native media, without substituting successful playback or changing auth.
  ctx.add_init_script("""{const NativeAudio=window.Audio;window.__players=[];window.Audio=function(...args){const media=new NativeAudio(...args);window.__players.push(media);media.__events=[];for(const event of ['loadstart','play','pause','waiting','stalled','error'])media.addEventListener(event,()=>media.__events.push(event));return media;};window.Audio.prototype=NativeAudio.prototype;}""")
  def route(request):
   if request.request.url.startswith(base+'/'):request.continue_()
   else:external.append({'url':request.request.url.split('?')[0],'method':request.request.method});request.abort()
  ctx.route('**/*',route);page=ctx.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
  fixture(page,'blocks','legacy');page.locator('.cell[data-x="6"][data-y="7"]').click();page.wait_for_selector('.trash-release',state='attached')
  check('saved legacy mission retains the cleared board and all eight outgoing litter icons',page.locator('#block-board').is_visible() and page.locator('.trash-release').count()==8 and page.locator('.feedback-success').count()>0)
  page.wait_for_timeout(120);page.screenshot(path=str(OUT/'first-clear.png'))
  fixture(page,'blocks');page.locator('#game-sound').click();wait_until(page,'__players.length===1&&!__players[0].paused&&__players[0].currentTime>0')
  check('native MP3 advances after an explicit gesture',True)
  start=page.evaluate('__players[0].currentTime');loads=page.evaluate('__players[0].__events.filter(x=>x==="loadstart").length')
  page.locator('#game-effects').click();page.locator('#game-effects').click();finished=complete_mission(page);page.wait_for_timeout(700)
  check('new first mission needs six placements and clears sixteen cells',finished['moves']==6 and finished['missionCleared']==16 and finished['phase']=='mission-clear')
  check('effect toggles and clearing do not reload, pause or restart BGM',page.evaluate(f'__players[0].currentTime>{start}&&!__players[0].paused&&__players[0].__events.filter(x=>x==="loadstart").length==={loads}'))
  page.locator('#game-sound').click();position=page.evaluate('__players[0].currentTime');page.locator('#game-sound').click();wait_until(page,f'!__players[0].paused&&__players[0].currentTime>={position}')
  check('same-track BGM resumes from its previous playhead',True)
  page.locator('#mission-next').click();wait_until(page,'JSON.parse(localStorage.getItem(DokdoGames.KEY)).active.game.mission===2');finished=complete_mission(page)
  check('new second mission needs six more placements and clears twenty-four cells',finished['moves']==12 and finished['missionCleared']==24 and finished['phase']=='mission-clear')
  page.locator('#player-back').click();page.wait_for_selector('#player-dialog[open]',state='hidden');check('leaving the game pauses and mutes native BGM',page.evaluate('__players[0].paused&&__players[0].muted'))
  fixture(page,'blocks','hammer');page.locator('#block-hammer').click();page.locator('.cell[data-x="0"][data-y="7"]').click();page.wait_for_selector('.trash-release',state='attached')
  check('hammer rescue shows one outgoing litter icon and a rescue message',page.locator('.trash-release').count()==1 and '구조' in page.locator('.feedback-label').inner_text());page.screenshot(path=str(OUT/'hammer-rescue.png'))
  page.locator('#player-back').click();fixture(page,'runner','hit');page.locator('#runner-resume').click();page.wait_for_timeout(100);check('runner collision provides immediate local feedback',page.locator('.feedback-hit').count()>0);page.screenshot(path=str(OUT/'runner-hit.png'))
  fixture(page,'runner');page.emulate_media(reduced_motion='reduce');page.evaluate('DokdoGameFeedback.burst(document.querySelector(".runner-stage"),"success","라운드 완주!")')
  check('OS reduced motion keeps a message without particles',page.locator('.feedback-particle').count()==0 and page.locator('.feedback-label').count()==1)
  page.wait_for_timeout(900);check('transient effects remove their finished layers',page.locator('.game-feedback').count()==0)
  page.emulate_media(reduced_motion='no-preference');page.evaluate('document.body.classList.add("motion-reduced");DokdoGameFeedback.burst(document.querySelector(".runner-stage"),"star","별 +2")')
  check('in-app reduced motion also omits particles',page.locator('.feedback-particle').count()==0)
  page.evaluate('DokdoGameFeedback.clear();document.body.classList.remove("motion-reduced");for(let i=0;i<20;i++)DokdoGameFeedback.burst(document.querySelector(".runner-stage"),"star","별 +1")')
  check('a burst storm stays within 48 transient nodes',page.locator('.game-feedback>span').count()<=48)
  check('no browser JavaScript errors',not errors)
  check('no external API request is attempted',not any('cdn.jsdelivr.net' not in item['url'] for item in external))
  result={'passed':len(checks),'checks':checks,'page_errors':errors,'blocked_external_requests':external,'engine':args.engine,'browser':browser.version,'note':'Isolated local fixture and native media timing. No real account, user record or external API. Audible quality is not verified.'};(OUT/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));browser.close()
finally:server.shutdown()
