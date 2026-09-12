import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('html');ap.add_argument('--output',default='test-results/review-portable.json');args=ap.parse_args();checks=[];errors=[]
def ck(name,value):checks.append({'name':name,'pass':bool(value)})
with sync_playwright() as w:
 b=w.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);c=b.new_context(viewport={'width':390,'height':1000});c.route('https://cdn.jsdelivr.net/**',lambda r:r.abort());p=c.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.evaluate("Object.defineProperty(window,'localStorage',{get(){throw Error('Read-only review must not access records')}})")
 p.set_content(Path(args.html).read_text(),wait_until='domcontentloaded');p.wait_for_function('!!window.DokdoQuestionReview')
 ck('240 items are embedded',p.evaluate('DokdoCourseData.questions.length===240'))
 p.fill('#search','920225');ck('winter question accessible directly',p.evaluate('DokdoQuestionReview.item.id===920225'));ck('four comparable choices',p.locator('#options button').count()==4);p.click('#reveal');ck('four individual explanations',p.locator('.review-feedback').count()==4)
 ck('source separated below choices',p.evaluate("document.getElementById('sources').getBoundingClientRect().top>=document.getElementById('options').getBoundingClientRect().bottom"));ck('country included in source',p.evaluate("document.getElementById('sources').textContent.includes('\uB300\uD55C\uBBFC\uAD6D')"))
 p.select_option('#lang','en');ck('English version exists',p.evaluate('DokdoQuestionReview.item.id===920225') and p.locator('#stem').inner_text().startswith('What'))
 p.select_option('#lang','ko');p.fill('#search','920205');ck('historical question accessible',p.evaluate('DokdoQuestionReview.item.id===920205'));ck('no horizontal mobile overflow',p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));ck('no script or storage errors',not errors);b.close()
o=Path(args.output);o.parent.mkdir(parents=True,exist_ok=True);r={'checks':checks,'passed':sum(x['pass'] for x in checks),'failed':sum(not x['pass'] for x in checks),'errors':errors};o.write_text(json.dumps(r,indent=2));print(json.dumps(r));raise SystemExit(bool(r['failed']))
