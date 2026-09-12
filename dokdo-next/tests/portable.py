#!/usr/bin/env python3
"""Exercise the generated standalone preview, without accessing real local storage."""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('html');p.add_argument('--browser',default='/usr/bin/chromium');p.add_argument('--output',default='test-results/portable.json');a=p.parse_args()
checks=[];errors=[]
def check(name,ok):
 checks.append({'name':name,'pass':bool(ok)})
 if not ok:print('FAIL',name)
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path=a.browser,args=['--no-sandbox']);ctx=b.new_context(viewport={'width':1280,'height':1000},accept_downloads=True,reduced_motion='reduce');ctx.route('https://cdn.jsdelivr.net/**',lambda r:r.abort());page=ctx.new_page();page.set_default_timeout(8000);page.on('dialog',lambda d:d.accept());page.on('pageerror',lambda e:errors.append(str(e)))
 page.evaluate("Object.defineProperty(window,'localStorage',{get(){throw Error('Preview must not read real storage')},configurable:true})")
 page.set_content(Path(a.html).read_text(),wait_until='domcontentloaded');page.wait_for_function('!!window.DokdoApp');page.evaluate('DokdoApp.assetsReady')
 check('Standalone preview uses isolated memory',page.evaluate('DokdoApp.mode==="preview" && DokdoApp.state.xp===0 && Object.keys(DokdoApp.state.m).length===0'))
 check('All 240 revised questions are embedded',page.evaluate('DokdoStarter.DATA.questions.length===240'))
 check('Age selection blocks first lesson',page.locator('#age-dialog').is_hidden())
 page.click('#start-lesson');check('Age dialog is required',page.locator('#age-dialog').is_visible());page.select_option('#age-band','14-16');page.click('#age-form button[type=submit]')
 check('Middle-school lesson is an actual Dokdo history unit',page.evaluate('DokdoApp.lesson.item.unit===8 && DokdoApp.lesson.item.id>=920001 && DokdoApp.lesson.item.id<=920240'))
 page.click('#read-done');check('Material and choices are visible',page.locator('#question-material').is_visible() and page.locator('.answer-option').count()==3)
 page.click('#leave-lesson');page.click('#demo-sample');check('Heavy-user sample is explicit, with 1,513 old records',page.evaluate('Object.keys(DokdoApp.state.m).length===1513'))
 page.click('#nav-map');check('Reference map has loaded',page.locator('#map-card').is_visible());page.click('#close-map')
 with page.expect_download() as info:page.click('#save-image')
 download=info.value;path=Path(download.path());check('Current scene exports as a real PNG',path.read_bytes()[:8]==b'\x89PNG\r\n\x1a\n' and path.stat().st_size>50000)
 page.click('[data-view="records"]')
 with page.expect_download() as info:page.click('#export-records')
 backup=json.loads(Path(info.value.path()).read_text());check('Backup preserves all old question records',len(backup['state']['m'])==1513)
 check('No uncaught preview errors',not errors);ctx.close();b.close()
out=Path(a.output);out.parent.mkdir(parents=True,exist_ok=True);r={'checks':checks,'passed':sum(c['pass'] for c in checks),'failed':sum(not c['pass'] for c in checks),'errors':errors,'storage':'isolated memory; no access to real account'};out.write_text(json.dumps(r,indent=2));print(json.dumps({'passed':r['passed'],'failed':r['failed']}));raise SystemExit(bool(r['failed']))
