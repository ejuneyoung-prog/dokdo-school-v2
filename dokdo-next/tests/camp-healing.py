"""세 번째 문 '독도에서 힐링하기'의 입구와 복귀 길을 실제 브라우저로 확인합니다.
THREE_MIN_JS를 주면 CDN 대신 그 파일을 씁니다(외부 접속이 막힌 환경에서 쓰는 값)."""
import json, os, re, sys, threading
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

def unconfigured():
    """운영 주소를 비운 site-config. 요청을 끊는 것만으로는 부족합니다. 끊긴 시도도 나가기 때문입니다."""
    return re.sub(r"(apiUrl|gaId):'[^']*'", r"\1:''", (ROOT / 'assets/site-config.js').read_text(encoding='utf-8'))

ALLOWED = (base + '/', 'data:', 'blob:', 'https://cdn.jsdelivr.net/npm/three@0.160.0/')
strays = []

def guard(route):
    url = route.request.url
    if url.startswith(ALLOWED):
        route.continue_()
    else:
        strays.append(url)
        route.abort()

def seal(browser):
    """이 브라우저로 여는 모든 창에서 운영 저장소와 분석으로 가는 길을 막습니다. 나중에 건 경로가 먼저 처리됩니다."""
    opened = browser.new_context
    def new_context(**options):
        context = opened(**options)
        context.route('**/*', guard)
        context.route('**/assets/site-config.js', lambda r: r.fulfill(body=unconfigured(), content_type='text/javascript'))
        sealed.append(context)
        return context
    browser.new_context = new_context

sealed = []

def use_three(context):
    if three:
        context.route(CDN, lambda r: r.fulfill(path=three, content_type='text/javascript', headers={'Access-Control-Allow-Origin': '*'}))

def weather(context, code):
    body = json.dumps({'current': {'weather_code': code, 'temperature_2m': 11.5}})
    context.route('**/api.open-meteo.com/**', lambda r: r.fulfill(body=body, content_type='application/json', headers={'Access-Control-Allow-Origin': '*'}))

def until(page, script, timeout=30000):
    """힐링존 CSP가 문자열 실행을 막아 wait_for_function을 쓸 수 없습니다. evaluate로 살핍니다."""
    for _ in range(timeout // 100):
        if page.evaluate(script):
            return
        page.wait_for_timeout(100)
    raise AssertionError(script)

def heal_state(page):
    return json.loads(page.evaluate("localStorage.getItem('dokdo-heal')||'{}'"))

def walk(context, label):
    page = context.new_page()
    errors, sounds, external = [], [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if 'Content Security Policy' in m.text else None)
    page.on('response', lambda r: sounds.append((r.url.rsplit('/', 1)[-1], r.status)) if r.url.endswith('.mp3') else None)
    page.on('request', lambda r: external.append(r.url) if '127.0.0.1' not in r.url and not r.url.startswith(('data:', 'blob:')) else None)

    page.goto(f'{base}/camp/?nick={quote(NICK)}')
    expect(page.locator('#enter h2')).to_have_text('독도에서 힐링하기')
    expect(page.locator('#enter .note').first).to_contain_text('가상 체험')
    expect(page.locator('#enter a.back')).to_have_attribute('href', '../')
    expect(page.locator('#top a.back')).to_have_attribute('href', '../')
    expect(page.locator('#login-cta')).to_have_attribute('href', '../account.html?next=camp%2F')
    expect(page.locator('#start')).to_have_text('로그인 없이 둘러보기')
    # 2단계: 장소는 레벨로 열린다(선착장 Lv5, 서도 Lv10, 동도 정상 Lv20)
    expect(page.locator('#e-dock')).to_contain_text('Lv5')
    expect(page.locator('#e-stay')).to_contain_text('Lv10')
    expect(page.locator('#e-camp')).to_contain_text('Lv20')
    expect(page.locator('#g-text')).to_contain_text('Lv1 · 선착장까지 960')
    assert heal_state(page)['gift'] == 1 and heal_state(page)['c'] == 100, 'welcome gift 100 대황 once'
    assert page.locator('#meet').count() == 0, 'old visitor room is gone'
    assert '사람에게도 보입니다' not in page.content(), 'solo mode does not promise shared decorations'

    page.locator('#start').click()
    expect(page.locator('#enter')).to_be_hidden()
    assert page.evaluate("getComputedStyle(document.querySelector('.rock')).backgroundColor") == 'rgba(0, 0, 0, 0)'
    assert page.evaluate("parseFloat(getComputedStyle(document.querySelector('.rock')).fontSize)") >= 16
    expect(page.locator('#count')).to_contain_text('혼자 쉬는 중')
    # 위는 한 줄(스쿨로·게이지·소리), 아래 메뉴도 처음엔 한 줄. 메뉴를 누르면 열리고 다시 누르면 닫힌다.
    expect(page.locator('#p-rest')).to_be_hidden()
    expect(page.locator('#say')).to_be_hidden()
    assert page.evaluate("document.querySelector('#top').getBoundingClientRect().height") < 70
    assert page.evaluate("document.querySelector('#dock').getBoundingClientRect().height") < 80
    page.locator('#t-sail').click()
    expect(page.locator('#p-sail')).to_be_visible()
    expect(page.locator('#t-sail')).to_have_attribute('aria-expanded', 'true')
    page.locator('#t-sail').click()
    expect(page.locator('#p-sail')).to_be_hidden()
    page.locator('#t-talk').click()
    expect(page.locator('#say')).to_be_visible()
    expect(page.locator('#nick')).to_be_visible()
    page.locator('#t-talk').click()
    # 풍경만 보기: 판이 모두 사라지고 작은 단추로 돌아온다.
    page.locator('#scenery').click()
    expect(page.locator('#dock')).to_be_hidden()
    expect(page.locator('#top')).to_be_hidden()
    expect(page.locator('#unscene')).to_be_visible()
    page.locator('#unscene').click()
    expect(page.locator('#dock')).to_be_visible()
    # 자동 항해 중에 바다를 짧게 눌러도 자동 항해는 꺼지지 않는다.
    page.locator('#t-sail').click()
    page.locator('#auto').click()
    expect(page.locator('#auto')).to_have_attribute('aria-pressed', 'true')
    page.mouse.click(page.viewport_size['width'] // 2, page.viewport_size['height'] // 2 + 60) if page.viewport_size else None
    expect(page.locator('#toast')).to_contain_text('자동 항해 중')
    expect(page.locator('#auto')).to_have_attribute('aria-pressed', 'true')
    page.locator('#auto').click()
    page.locator('#t-sail').click()
    expect(page.locator('#tags .tag:not(.me) .name')).to_have_count(0)
    expect(page.locator('#tags .tag:not(.me) .bubble:visible')).to_have_count(0)
    assert 'nick' not in page.url, 'nickname leaves the address after it is read'
    assert page.input_value('#nick') == NICK[:8]
    until(page, "performance.getEntriesByType('resource').some(e=>e.name.endsWith('rain.mp3'))", timeout=15000)
    assert ('waves.mp3', 200) in sounds and ('rain.mp3', 200) in sounds, sounds

    page.locator('#t-deck').click()
    choice = page.locator('#d-body button.opt').first
    choice.click()
    won = 'right' in (choice.get_attribute('class') or '')
    state = heal_state(page)
    assert state['qN'] == 1 and state['c'] == (102 if won else 100), state
    page.locator('#deck [data-d="f"]').click()
    expect(page.locator('#d-body .lvl')).to_contain_text('Lv 1')
    expect(page.locator('#d-body .cast')).to_have_text('낚싯줄 던지기')
    page.locator('#d-close').click()
    page.locator('#t-rest').click()
    page.locator('#v-dock').click()
    expect(page.locator('#toast')).to_contain_text('동도 선착장은 Lv5에 열립니다')
    page.locator('#d-close').click()

    page.evaluate("localStorage.setItem('dokdo-heal',JSON.stringify({c:20}))")
    page.reload()
    page.locator('#start').click()
    page.locator('#t-deck').click()
    page.locator('#deck [data-d="i"]').click()
    page.locator('#d-body .item', has_text='돛대 깃발').locator('button').click()
    assert heal_state(page)['own'] & 1, 'bought item stays in the browser'
    page.reload()
    assert heal_state(page)['own'] & 1 and page.input_value('#nick') == NICK[:8]

    assert all('cdn.jsdelivr.net' in u or 'api.open-meteo.com' in u for u in external), external
    assert all('nick' not in u for u in external), 'nickname stays out of outside requests'
    page.locator('#enter a.back').click()
    page.wait_for_function("location.pathname.endsWith('/') && !location.pathname.includes('/camp')")
    expect(page.locator('#v3-entry')).to_be_visible()
    assert not errors, errors
    page.close()
    print('ok', label)

def card(context, label):
    page = context.new_page()
    # 닉네임을 힐링존 주소로 건네는 것은 만 14세 이상이 확인된 기기뿐입니다.
    page.add_init_script("localStorage.setItem('dokdo-device-age-v1','20+')")
    page.goto(f'{base}/')
    entry = page.locator('#camp-entry')
    expect(entry).to_be_visible()
    assert entry.get_attribute('href') == './camp/'
    assert page.locator('#v3-entry .v3-choice-grid > *').count() == 3
    assert page.locator('#v3-entry-title').inner_text() == '내 독도 학력은 몇 학년?'
    biggest = page.evaluate("""()=>{const r=e=>{const b=document.querySelector(e).getBoundingClientRect();return b.width*b.height};return {start:r('#v3-first-class'),login:r('#account-link'),live:r('#v3-live-entry'),lang:r('#v3-main-language')}}""")
    assert biggest['start'] == max(biggest.values()), biggest
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
    fresh = context.browser.new_context(viewport=context.pages[0].viewport_size if context.pages else {'width': 1280, 'height': 800})
    first = fresh.new_page()
    first.goto(f'{base}/')
    expect(first.locator('#v3-first-class')).to_have_text('1교시 시작')
    first.locator('#v3-first-class').click()
    expect(first.locator('#age-dialog')).to_be_visible()
    first.select_option('#age-band', '14-16')
    first.locator('#age-form button[type=submit]').click()
    first.locator('#read-done').click()
    for _ in range(80):
        if first.locator('#lesson-result .result-grade').count():
            break
        first.evaluate("""()=>{const seen=e=>e&&e.offsetParent&&!e.disabled;
          const next=[document.querySelector('#read-done'),document.querySelector('#next-question')].find(seen);
          if(next){next.click();return}
          const option=[...document.querySelectorAll('.answer-option')].find(seen);if(option)option.click()}""")
        first.wait_for_timeout(250)
    expect(first.locator('#lesson-result .result-grade strong')).to_contain_text('내 독도 학력은')
    expect(first.locator('#lesson-result .result-grade')).to_be_visible()
    first.screenshot(path=os.environ.get('RESULT_SHOT') or '/dev/null') if os.environ.get('RESULT_SHOT') else None
    fresh.close()
    print('ok card', label)

def rain(browser):
    results = {}
    for code, name in [(0, 'clear'), (63, 'rain')]:
        context = browser.new_context()
        use_three(context)
        weather(context, code)
        page = context.new_page()
        # 비 소리 음량은 1.2초에 걸쳐 바뀌는 값으로만 설정된다. 그 값을 모아 소리가 났는지 판단한다.
        page.add_init_script("window.__gain=[];const o=AudioParam.prototype.setTargetAtTime;AudioParam.prototype.setTargetAtTime=function(v,t,c){if(c===1.2)window.__gain.push(v);return o.call(this,v,t,c)}")
        page.goto(f'{base}/camp/')
        page.locator('#start').click()
        expect(page.locator('#now')).to_contain_text('비' if name == 'rain' else '맑음', timeout=25000)
        until(page, 'window.__gain.length>20', timeout=25000)
        if name == 'rain':
            until(page, 'Math.max(...window.__gain)>.05', timeout=30000)
        results[name] = page.evaluate('Math.max(...window.__gain)')
        assert page.evaluate("JSON.parse(localStorage.getItem('dokdo-heal-weather')).code") == code
        context.close()
    assert results['clear'] == 0 and results['rain'] > .05, results
    print('ok rain follows the weather', results)

def member(browser):
    context = browser.new_context()
    use_three(context)
    weather(context, 0)
    context.add_init_script("localStorage.setItem('dokdo-account-session-v1',JSON.stringify({user:{id:'fixture'}}));localStorage.setItem('nick','독코')")
    page = context.new_page()
    page.goto(f'{base}/camp/')
    expect(page.locator('#login-cta')).to_be_hidden()
    expect(page.locator('#start')).to_have_text('바다에서 독도 보기')
    page.goto(f'{base}/')
    expect(page.locator('#account-link')).to_have_text('내 기록')
    page.evaluate('DokdoApp.editProfile()')
    page.fill('#nickname', '독코')
    page.locator('#age-form button[type=submit]').click()
    expect(page.locator('#account-link')).to_have_text('독코')
    page.goto(f'{base}/games.html')
    expect(page.locator('#game-account-link')).to_have_text('독코')
    context.close()
    print('ok signed-in header and camp entry')

def blocked(browser):
    context = browser.new_context()
    context.route(CDN, lambda r: r.abort())
    page = context.new_page()
    page.goto(f'{base}/camp/')
    expect(page.locator('#err')).to_be_visible()
    expect(page.locator('#err a.back')).to_be_visible()
    page.locator('#err a.back').click()
    page.wait_for_function("!location.pathname.includes('/camp')")
    context.close()
    print('ok three.js blocked path')

try:
    with sync_playwright() as pw:
        browser = getattr(pw, engine).launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] if engine == 'chromium' else [])
        seal(browser)
        for label, options in [('pc', {'viewport': {'width': 1280, 'height': 800}}), ('phone', {**pw.devices['iPhone 13'], 'default_browser_type': None})]:
            options = {k: v for k, v in options.items() if k != 'default_browser_type'}
            context = browser.new_context(**options)
            use_three(context)
            weather(context, 0)
            walk(context, label)
            card(context, label)
            context.close()
        rain(browser)
        member(browser)
        blocked(browser)
        browser.close()
    assert len(sealed) >= 6 and not strays, (len(sealed), strays)
    print('ok nothing left this machine for the operating servers')
finally:
    server.shutdown()
