"""세 번째 문 '독도에서 힐링하기'의 입구와 복귀 길을 실제 브라우저로 확인합니다.
THREE_MIN_JS를 주면 CDN 대신 그 파일을 씁니다(외부 접속이 막힌 환경에서 쓰는 값)."""
import json, os, sys, threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import quote
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parent.parent
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}'
engine = sys.argv[1] if len(sys.argv) > 1 else 'chromium'
three = os.environ.get('THREE_MIN_JS')
NICK = '독코 #1'
CDN = '**/npm/three@0.160.0/build/three.min.js'

def use_three(context):
    if three:
        context.route(CDN, lambda r: r.fulfill(path=three, content_type='text/javascript', headers={'Access-Control-Allow-Origin': '*'}))

def heal_state(page):
    return json.loads(page.evaluate("localStorage.getItem('dokdo-heal')||'{}'"))

def walk(context, label):
    page = context.new_page()
    errors, sounds, external = [], [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('response', lambda r: sounds.append((r.url.rsplit('/', 1)[-1], r.status)) if r.url.endswith('.mp3') else None)
    page.on('request', lambda r: external.append(r.url) if '127.0.0.1' not in r.url and not r.url.startswith(('data:', 'blob:')) else None)

    page.goto(f'{base}/camp/?nick={quote(NICK)}')
    expect(page.locator('#enter h2')).to_have_text('독도에서 힐링하기')
    expect(page.locator('#enter .note')).to_contain_text('가상 체험')
    expect(page.locator('#enter a.back')).to_have_attribute('href', '../?area=learn')
    expect(page.locator('#e-camp')).to_contain_text('대황 30')
    expect(page.locator('#e-stay')).to_contain_text('대황 6')
    expect(page.locator('#g-text')).to_contain_text('서도 주민숙소')
    assert page.locator('#meet').count() == 0, 'old visitor room is gone'
    assert '사람에게도 보입니다' not in page.content(), 'solo mode does not promise shared decorations'

    page.locator('#start').click()
    expect(page.locator('#enter')).to_be_hidden()
    expect(page.locator('#count')).to_contain_text('혼자 쉬는 중')
    expect(page.locator('#tags .tag:not(.me) .name')).to_have_count(0)
    expect(page.locator('#tags .tag:not(.me) .bubble:visible')).to_have_count(0)
    assert 'nick' not in page.url, 'nickname leaves the address after it is read'
    assert page.input_value('#nick') == NICK[:8]
    page.wait_for_function("performance.getEntriesByType('resource').some(e=>e.name.endsWith('rain.mp3'))", timeout=15000)
    assert ('waves.mp3', 200) in sounds and ('rain.mp3', 200) in sounds, sounds

    page.locator('#t-deck').click()
    choice = page.locator('#d-body button.opt').first
    choice.click()
    won = 'right' in (choice.get_attribute('class') or '')
    state = heal_state(page)
    assert state['qN'] == 1 and state['c'] == (2 if won else 0), state

    page.evaluate("localStorage.setItem('dokdo-heal',JSON.stringify({c:20}))")
    page.reload()
    page.locator('#start').click()
    page.locator('#t-deck').click()
    page.locator('#deck [data-d="i"]').click()
    page.locator('#d-body .item', has_text='돛대 깃발').locator('button').click()
    assert heal_state(page)['own'] & 1, 'bought item stays in the browser'
    page.reload()
    assert heal_state(page)['own'] & 1 and page.input_value('#nick') == NICK[:8]

    assert all('cdn.jsdelivr.net' in u for u in external), external
    page.locator('#enter a.back').click()
    page.wait_for_url('**/?area=learn')
    expect(page.locator('.v3-home')).to_be_visible()
    assert not errors, errors
    page.close()
    print('ok', label)

def card(context, label):
    page = context.new_page()
    page.goto(f'{base}/')
    entry = page.locator('#camp-entry')
    expect(entry).to_be_visible()
    assert entry.get_attribute('href') == './camp/'
    assert page.locator('#v3-entry .v3-choice-grid > *').count() == 3
    assert entry.locator('.v3-choice-name > span').all_inner_texts() == ['독도에서', '힐링하기']
    rows = page.evaluate("""()=>{const lines=[...document.querySelectorAll('#camp-title > span')].map(e=>e.getBoundingClientRect());
      const buttons=[...document.querySelectorAll('#v3-entry .v3-choice-action')].map(e=>e.getBoundingClientRect());
      const size=parseFloat(getComputedStyle(document.querySelector('#camp-title')).fontSize);
      return {size,lines:lines.map(r=>Math.round(r.height)),oneRowEach:lines.every(r=>r.height<size*1.9)&&lines[1].top>=lines[0].bottom-1,
              heights:buttons.map(r=>Math.round(r.height))}}""")
    assert rows['oneRowEach'], rows
    assert len(set(rows['heights'])) == 1, rows
    page.evaluate('DokdoApp.editProfile()')
    page.fill('#nickname', NICK)
    page.locator('#age-form button[type=submit]').click()
    expect(page.locator('#age-dialog')).to_be_hidden()
    expect(entry).to_have_attribute('href', './camp/?nick=' + quote(NICK, safe=''))
    page.reload()
    expect(entry).to_have_attribute('href', './camp/?nick=' + quote(NICK, safe=''))
    assert '캠핑장' not in page.locator('#v3-entry').inner_text()
    page.close()
    print('ok card', label)

def blocked(browser):
    context = browser.new_context()
    context.route(CDN, lambda r: r.abort())
    page = context.new_page()
    page.goto(f'{base}/camp/')
    expect(page.locator('#err')).to_be_visible()
    expect(page.locator('#err a.back')).to_be_visible()
    page.locator('#err a.back').click()
    page.wait_for_url('**/?area=learn')
    context.close()
    print('ok three.js blocked path')

try:
    with sync_playwright() as pw:
        browser = getattr(pw, engine).launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] if engine == 'chromium' else [])
        for label, options in [('pc', {'viewport': {'width': 1280, 'height': 800}}), ('phone', {**pw.devices['iPhone 13'], 'default_browser_type': None})]:
            options = {k: v for k, v in options.items() if k != 'default_browser_type'}
            context = browser.new_context(**options)
            use_three(context)
            walk(context, label)
            card(context, label)
            context.close()
        blocked(browser)
        browser.close()
finally:
    server.shutdown()
