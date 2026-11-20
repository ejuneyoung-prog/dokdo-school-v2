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
class Roomy(ThreadingHTTPServer):
    # 기본 대기열(5)이면 스크립트를 한꺼번에 받을 때 연결이 끊겨 화면이 반쯤만 켜진다(학교 화면 닉네임 창 실패의 한 원인).
    request_queue_size = 256
server = Roomy(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT)))
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

def into3d(page):
    page.locator('#v-3d').click()
    expect(page.locator('#view')).to_be_hidden()

def menu(page, want=True):
    """11/20: 아래 판 기본은 라임 단추 하나와 '메뉴'. 나머지는 메뉴 안에 있다."""
    if page.locator('#menu').is_visible() != want:
        page.locator('#more').click()
    expect(page.locator('#more')).to_have_attribute('aria-expanded', 'true' if want else 'false')

def ringed(page, sel):
    """사용 설명서의 라임 고리가 그 단추를 둘러싸는지."""
    until(page, """(()=>{const r=document.querySelector('#g-ring'),t=document.querySelector('%s');if(!r||r.hidden||!t)return false;const a=r.getBoundingClientRect(),b=t.getBoundingClientRect();return a.left<=b.left&&a.top<=b.top&&a.right>=b.right&&a.bottom>=b.bottom})()""" % sel, timeout=5000)

def tap_sea(page):
    """바다 한 점을 짧게 누른다. 자리는 healing.js가 섬이 아닌 곳으로 골라 준다.
    배가 섬 가까이에서 움직이면 고른 자리가 누르는 순간 섬 쪽으로 바뀔 수 있어, 자동 항해가 꺼질 때까지 몇 번 다시 누른다."""
    for _ in range(40):
        spot = page.evaluate('DokdoHeal.spot()')
        if spot:
            page.mouse.click(spot['x'], spot['y'])
            page.wait_for_timeout(300)
            if page.evaluate("document.querySelector('#auto').getAttribute('aria-pressed')") != 'true':
                return spot
        page.wait_for_timeout(250)
    raise AssertionError('no sea spot on screen')

def view2d(page):
    # 11/20: 2D 그림(독도 바라보기)은 첫 화면에서 빠지고 메뉴 › 쉼터에서 연다. 1분에 대황 1개는 그대로.
    expect(page.locator('#view')).to_be_visible()
    expect(page.locator('#v-go')).to_have_text('바라보기 시작')
    expect(page.locator('#v-3d')).to_have_text('3D 바다로 돌아가기')
    expect(page.locator('#v-reward')).to_be_visible()
    expect(page.locator('#view a.back')).to_have_attribute('href', '../')
    assert page.evaluate("document.body.classList.contains('v2d')"), '3D drawing pauses while the picture is shown'
    assert page.evaluate("document.documentElement.scrollWidth<=innerWidth"), 'no sideways scroll'
    page.locator('#v-go').click()
    expect(page.locator('#v-breath')).to_be_visible()
    expect(page.locator('#v-card')).to_be_hidden()
    expect(page.locator('#v-stop')).to_be_visible()
    before = heal_state(page).get('c', 0)
    page.evaluate("dispatchEvent(new CustomEvent('dokdo-view-minute'))")
    assert heal_state(page)['c'] == before + 1, 'one 대황 per minute of looking'
    expect(page.locator('#toast')).to_be_visible()
    assert page.evaluate("(()=>{const a=document.querySelector('#toast').getBoundingClientRect(),b=document.querySelector('#v-min').getBoundingClientRect();return a.bottom<=b.top||b.bottom<=a.top||a.right<=b.left||b.right<=a.left})()"), 'toast does not cover the minute line'
    page.locator('#v-stop').click()
    expect(page.locator('#v-card')).to_be_visible()
    expect(page.locator('#v-breath')).to_be_hidden()
    page.locator('#v-go').click()
    page.keyboard.press('Escape')
    expect(page.locator('#v-card')).to_be_visible()
    # 그림 뒤의 3D 화면은 Tab으로 잡히지 않는다
    assert page.evaluate("document.querySelector('#dock').inert && document.querySelector('#top').inert")
    assert page.evaluate("(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return ids.length===new Set(ids).size})()"), 'ids are unique'
    assert page.evaluate("document.querySelector('#v-sea').tagName") == 'BUTTON'
    # 세로 화면은 두 섬이 폭에 맞게(가로 1000) 들어온다
    if page.viewport_size['width'] < page.viewport_size['height']:
        assert page.get_attribute('#v-art', 'viewBox').split()[2] == '1000'
    page.locator('#v-go').click()
    page.locator('#v-3d2').click()
    expect(page.locator('#view')).to_be_hidden()
    expect(page.locator('#v-look')).to_be_focused()
    assert not page.evaluate("document.querySelector('#dock').inert or document.body.classList.contains('v2d')".replace(' or ', '||'))
    for scene, name in [('dawn', '새벽의 독도'), ('night', '밤의 독도')]:
        page.goto(page.url.split('?')[0] + '?scene=' + scene)
        expect(page.locator('#view')).to_be_hidden()
        assert page.evaluate("document.querySelector('#v-time').textContent") == name
        assert page.get_attribute('#view', 'data-scene') == scene

def walk(context, label):
    page = context.new_page()
    errors, sounds, external = [], [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if 'Content Security Policy' in m.text else None)
    page.on('response', lambda r: sounds.append((r.url.rsplit('/', 1)[-1], r.status)) if r.url.endswith('.mp3') else None)
    page.on('request', lambda r: external.append(r.url) if '127.0.0.1' not in r.url and not r.url.startswith(('data:', 'blob:')) else None)

    page.goto(f'{base}/camp/?nick={quote(NICK)}')
    # 11/20: 들어오면 바로 3D. 2D 그림은 첫 화면이 아니다. 입구의 큰 단추 하나가 동도 선착장에서 시작한다.
    expect(page.locator('#enter')).to_be_visible()
    expect(page.locator('#view')).to_be_hidden()
    assert not page.evaluate("document.body.classList.contains('v2d')")
    expect(page.locator('#enter h2')).to_have_text('독도에서 힐링하기')
    expect(page.locator('#enter .note').first).to_contain_text('가상 체험')
    expect(page.locator('#enter a.back')).to_have_attribute('href', '../')
    expect(page.locator('#top a.back')).to_have_attribute('href', '../')
    expect(page.locator('#login-cta')).to_have_attribute('href', '../account.html?next=camp%2F')
    # 큰 라임 단추는 '동도 선착장에서 시작' 하나. 로그인은 그 아래 작은 글자 링크(주소·동작은 그대로).
    expect(page.locator('#login-cta')).to_be_visible()
    expect(page.locator('#e-go')).to_have_text('동도 선착장에서 시작')
    entry = page.evaluate("""()=>{const q=e=>document.querySelector(e),b=e=>q(e).getBoundingClientRect(),c=e=>getComputedStyle(q(e));
      return {lime:[...q('#enter').querySelectorAll('a,button')].filter(e=>e.offsetParent&&getComputedStyle(e).backgroundColor==='rgb(182, 216, 12)').map(e=>e.id),
              loginBelow:b('#login-cta').top>=b('#e-go').bottom,loginSize:parseFloat(c('#login-cta').fontSize),goFirst:b('#e-go').top<b('#e-more').top}}""")
    assert entry == {'lime': ['e-go'], 'loginBelow': True, 'loginSize': entry['loginSize'], 'goFirst': True} and entry['loginSize'] >= 14, entry
    # 다른 곳(바다·서도·동도 정상)은 접어 둔 링크 하나 뒤에
    expect(page.locator('#e-alt')).to_be_hidden()
    expect(page.locator('#e-more')).to_have_attribute('aria-expanded', 'false')
    page.locator('#e-more').click()
    expect(page.locator('#e-alt')).to_be_visible()
    expect(page.locator('#start')).to_have_text('바다에서 독도 보기')
    page.locator('#e-more').click()
    expect(page.locator('#e-alt')).to_be_hidden()
    # 입구가 떠 있는 동안 아래 판과 환영 알림은 숨어 있다(입구 단추를 가리지 않게).
    expect(page.locator('#dock')).to_be_hidden()
    page.wait_for_timeout(1200)
    expect(page.locator('#toast')).to_be_hidden()
    # 동도 선착장은 처음부터 열림(Lv1). 서도 Lv10, 동도 정상 Lv20은 그대로.
    expect(page.locator('#e-dock')).to_have_text('동도 선착장')
    expect(page.locator('#e-stay')).to_contain_text('Lv10')
    expect(page.locator('#e-camp')).to_contain_text('Lv20')
    expect(page.locator('#g-text')).to_contain_text('Lv1 · 서도까지 4,860')
    assert heal_state(page)['gift'] == 1 and heal_state(page)['c'] == 100, 'welcome gift 100 대황 once'
    assert page.locator('#meet').count() == 0, 'old visitor room is gone'
    assert '사람에게도 보입니다' not in page.content(), 'solo mode does not promise shared decorations'
    # 위쪽은 ⌂ 홈과 소리 단추 둘만. 게이지·소리 크기·시각·날씨·인원·안내는 메뉴 안으로.
    assert page.evaluate("[...document.querySelectorAll('#top a,#top button,#top input')].filter(e=>e.offsetParent).map(e=>e.id||e.className)") == ['back', 'snd']
    for sel in ['#goal', '#sub', '.vol']:
        assert page.locator('#m-top ' + sel).count() == 1, sel

    page.locator('#e-go').click()
    expect(page.locator('#enter')).to_be_hidden()
    expect(page.locator('#dock')).to_be_visible()
    expect(page.locator('#toast')).to_contain_text('처음 오신 것을 환영합니다')
    assert not page.evaluate("document.body.classList.contains('v2d')")
    expect(page.locator('#v-dock')).to_have_attribute('aria-pressed', 'true')
    # 아래 판 기본: 라임 단추 하나 + 메뉴. 메뉴 줄과 판은 닫혀 있다.
    expect(page.locator('#act')).to_have_text('배 타고 바다로')
    expect(page.locator('#more')).to_be_visible()
    expect(page.locator('#menu')).to_be_hidden()
    expect(page.locator('#m-top')).to_be_hidden()
    # 11/20 3단계: 라임 단추 옆에 작은 태극기 흔들기 단추가 붙는다.
    assert page.evaluate("[...document.querySelectorAll('#dock button')].filter(e=>e.offsetParent).map(e=>e.id)") == ['act', 'flagwave', 'more']
    assert page.evaluate("getComputedStyle(document.querySelector('#act')).backgroundColor") == 'rgb(182, 216, 12)'
    # 사용 설명서 1단계: 배에 올라 바다로. 라임 고리가 그 단추를 짚는다.
    expect(page.locator('#guide')).to_be_visible()
    expect(page.locator('#g-say')).to_have_text('배에 올라 바다로 나가요')
    expect(page.locator('#g-say')).to_have_attribute('role', 'status')
    expect(page.locator('#g-skip')).to_have_text('건너뛰기')
    ringed(page, '#act')
    look = page.evaluate("""()=>{const g=getComputedStyle(document.querySelector('#guide')),s=getComputedStyle(document.querySelector('#g-say')),b=document.querySelector('#guide').getBoundingClientRect(),a=document.querySelector('#act').getBoundingClientRect();
      return {bg:g.backgroundColor,line:g.borderTopColor,width:g.borderTopWidth,text:s.color,size:parseFloat(s.fontSize),above:b.bottom<=a.top,inside:b.left>=0&&b.right<=innerWidth}}""")
    assert look == {'bg': 'rgb(46, 49, 53)', 'line': 'rgb(182, 216, 12)', 'width': '2px', 'text': 'rgb(255, 255, 255)', 'size': look['size'], 'above': True, 'inside': True} and look['size'] >= 14, look
    assert page.evaluate("getComputedStyle(document.querySelector('.rock')).backgroundColor") == 'rgba(0, 0, 0, 0)'
    assert page.evaluate("parseFloat(getComputedStyle(document.querySelector('.rock')).fontSize)") >= 16
    expect(page.locator('#count')).to_contain_text('혼자 쉬는 중')
    assert page.evaluate("document.querySelector('#top').getBoundingClientRect().height") < 70
    assert page.evaluate("document.querySelector('#dock').getBoundingClientRect().height") < 80
    # 1 → 2: 배 타고 바다로 누르면 배에 오르고 자동 항해가 켜진다. 두 번 눌러도 낚시 판까지 열리지 않는다.
    page.locator('#act').dblclick()
    expect(page.locator('#v-dock')).to_have_attribute('aria-pressed', 'false')
    expect(page.locator('#auto')).to_have_attribute('aria-pressed', 'true')
    expect(page.locator('#bow')).to_have_attribute('aria-pressed', 'false')
    expect(page.locator('#act')).to_have_text('낚시하기')
    # 배는 선착장 바로 옆 바다에서 떠난다(먼 바다로 순간 이동하지 않음).
    gap = page.evaluate("(()=>{const p=DokdoHeal.pos(),d=DokdoHeal.dock();return Math.hypot(p[0]-d[0],p[1]-d[1])})()")
    assert gap < 120, ('boat starts beside the dock', gap)
    page.wait_for_timeout(900)  # 글자가 바뀐 뒤 0.8초 동안의 누름은 무시된다(두 번 눌림 방지)
    expect(page.locator('#deck')).to_be_hidden()
    assert page.evaluate("getComputedStyle(document.querySelector('#act')).touchAction") == 'manipulation'
    expect(page.locator('#g-say')).to_contain_text('배가 저절로 독도를 돌아요')
    # 2 → 3: 바다를 누르면 자동 항해가 꺼지고 그쪽으로 간다.
    tap_sea(page)
    expect(page.locator('#auto')).to_have_attribute('aria-pressed', 'false')
    expect(page.locator('#toast')).to_contain_text('잠시 뒤 다시 저절로 돌아요')
    # 알림은 위쪽 ⌂ 홈·소리 단추를 가리지 않는다
    assert page.evaluate("""(()=>{const t=document.querySelector('#toast').getBoundingClientRect();return ['#top .back','#snd'].every(s=>{const b=document.querySelector(s).getBoundingClientRect();return t.bottom<=b.top||b.bottom<=t.top||t.right<=b.left||b.right<=t.left})})()""")
    expect(page.locator('#g-say')).to_contain_text('낚시하기')
    ringed(page, '#act')
    # 3 → 4: 낚시하기를 누르면 낚시 판이 열리고, 고리가 실제 '낚싯줄 던지기' 단추로 옮겨 간다.
    page.locator('#act').click()
    expect(page.locator('#deck')).to_be_visible()
    expect(page.locator('#deck [data-d="f"]')).to_have_attribute('aria-selected', 'true')
    expect(page.locator('#d-body .cast')).to_have_text('낚싯줄 던지기')
    expect(page.locator('#g-say')).to_contain_text('낚싯줄 던지기')
    expect(page.locator('#g-num')).to_have_text('4 / 4')
    ringed(page, '#d-body .cast')
    # 4 → 끝: 처음 던지면 설명서가 끝나고, 다시 나오지 않도록 기록에 남는다. 끝에 엉뚱한 알림은 없다.
    page.locator('#d-body .cast').click()
    expect(page.locator('#guide')).to_have_count(0)
    expect(page.locator('#g-ring')).to_have_count(0)
    assert heal_state(page)['gd'] == 1
    assert '선착장으로 돌아올' not in (page.locator('#toast').text_content() or '')
    page.locator('#d-close').click()

    # 메뉴를 누르면 목표 게이지·소리 크기·시각·날씨·가상 체험 안내와 원래 메뉴 줄이 열린다.
    menu(page)
    expect(page.locator('#m-top')).to_be_visible()
    # 11/20 레드팀: 소리 크기·시각·날씨·인원·가상 체험 안내는 내 배 판의 '더 보기' 안(처음에는 닫힘).
    expect(page.locator('#m-extra')).to_be_hidden()
    expect(page.locator('#b-more')).to_have_attribute('aria-expanded', 'false')
    page.locator('#b-more').click()
    expect(page.locator('#m-extra')).to_be_visible()
    expect(page.locator('#m-top .mnote')).to_contain_text('화면 속 가상 체험입니다')
    expect(page.locator('#m-top .vol')).to_be_visible()
    expect(page.locator('#goal')).to_be_visible()
    expect(page.locator('#count')).to_be_visible()
    expect(page.locator('#p-rest')).to_be_hidden()
    expect(page.locator('#say')).to_be_hidden()
    page.locator('#t-sail').click()
    expect(page.locator('#p-sail')).to_be_visible()
    expect(page.locator('#t-sail')).to_have_attribute('aria-expanded', 'true')
    page.locator('#t-sail').click()
    expect(page.locator('#p-sail')).to_be_hidden()
    page.locator('#t-talk').click()
    expect(page.locator('#say')).to_be_visible()
    expect(page.locator('#nick')).to_be_visible()
    # 메뉴를 닫으면 열린 판도 함께 닫힌다.
    menu(page, False)
    expect(page.locator('#say')).to_be_hidden()
    expect(page.locator('#m-top')).to_be_hidden()
    menu(page)
    # 풍경만 보기: 판이 모두 사라지고 작은 단추로 돌아온다.
    page.locator('#scenery').click()
    expect(page.locator('#dock')).to_be_hidden()
    expect(page.locator('#top')).to_be_hidden()
    expect(page.locator('#unscene')).to_be_visible()
    page.locator('#unscene').click()
    expect(page.locator('#dock')).to_be_visible()
    # 11/20: 자동 항해 중에 바다를 누르면 자동 항해를 끄고 그쪽으로 간다. 배가 닿고 15초 동안 아무것도 안 하면 다시 저절로 돈다.
    page.locator('#t-sail').click()
    if not page.locator('#auto').get_attribute('aria-pressed') == 'true':
        page.locator('#auto').click()
    expect(page.locator('#auto')).to_have_attribute('aria-pressed', 'true')
    # 메뉴(내 배 판 포함)를 닫고 바다를 누른다. 사람도 메뉴를 닫고 바다를 본다.
    menu(page, False)
    tap_sea(page)
    expect(page.locator('#auto')).to_have_attribute('aria-pressed', 'false')
    menu(page)
    page.locator('#t-sail').click()
    expect(page.locator('#p-sail')).to_be_visible()
    if label == 'pc':
        until(page, "document.querySelector('#auto').getAttribute('aria-pressed')==='true'", timeout=45000)
        # 항해 메뉴에서 직접 끈 것은 그대로 둔다.
        page.locator('#auto').click()
        expect(page.locator('#auto')).to_have_attribute('aria-pressed', 'false')
        page.wait_for_timeout(17000)
        expect(page.locator('#auto')).to_have_attribute('aria-pressed', 'false')
    page.locator('#t-sail').click()
    expect(page.locator('#tags .tag:not(.me) .name')).to_have_count(0)
    expect(page.locator('#tags .tag:not(.me) .bubble:visible')).to_have_count(0)
    assert 'nick' not in page.url, 'nickname leaves the address after it is read'
    assert page.input_value('#nick') == NICK[:8]
    until(page, "performance.getEntriesByType('resource').some(e=>e.name.endsWith('rain.mp3'))", timeout=15000)
    assert ('waves.mp3', 200) in sounds and ('rain.mp3', 200) in sounds, sounds

    page.locator('#t-deck').click()
    page.locator('#deck [data-d="q"]').click()
    choice = page.locator('#d-body button.opt').first
    before = heal_state(page)['c']  # 바위를 보면 대황이 1개씩 붙으므로 문제 앞뒤로 센다
    choice.click()
    won = 'right' in (choice.get_attribute('class') or '')
    state = heal_state(page)
    assert state['qN'] == 1 and state['c'] == before + (2 if won else 0), state
    page.locator('#deck [data-d="f"]').click()
    expect(page.locator('#d-body .lvl')).to_contain_text('Lv 1')
    expect(page.locator('#d-body .cast')).to_have_text('낚싯줄 던지기')
    page.locator('#d-close').click()
    page.locator('#t-rest').click()
    page.locator('#v-stay').click()
    expect(page.locator('#toast')).to_contain_text('서도 주민숙소는 Lv10에 열립니다')
    page.locator('#d-close').click()
    # 쉼터 › 바다에서 보기도 자동 항해로 시작한다(뱃머리 시점 아님).
    page.locator('#v-sea').click()
    expect(page.locator('#auto')).to_have_attribute('aria-pressed', 'true')
    expect(page.locator('#bow')).to_have_attribute('aria-pressed', 'false')
    # 쉼터에서 여는 2D 독도 바라보기(1분 대황 그대로)
    page.locator('#v-look').click()
    view2d(page)

    # 이전부터 기록이 있던 사람(gd 칸 없음)에게는 설명서를 띄우지 않는다.
    page.evaluate("localStorage.setItem('dokdo-heal',JSON.stringify({c:20}))")
    page.reload()
    page.locator('#e-go').click()
    page.wait_for_timeout(600)
    expect(page.locator('#guide')).to_have_count(0)
    # 기록이 없던 브라우저(새 기록)에는 나온다. 건너뛰면 새로고침해도 다시 나오지 않는다.
    page.evaluate("localStorage.removeItem('dokdo-heal')")
    page.reload()
    page.locator('#e-go').click()
    expect(page.locator('#g-say')).to_have_text('배에 올라 바다로 나가요')
    expect(page.locator('#g-num')).to_have_text('1 / 4')
    page.emulate_media(reduced_motion='reduce')
    assert page.evaluate("getComputedStyle(document.querySelector('#g-ring')).animationName") == 'none', 'no pulse with reduced motion'
    page.emulate_media(reduced_motion='no-preference')
    assert page.evaluate("getComputedStyle(document.querySelector('#g-ring')).animationName") == 'gpulse'
    page.locator('#g-skip').click()
    expect(page.locator('#guide')).to_have_count(0)
    assert heal_state(page)['gd'] == 1 and heal_state(page)['c'] >= 100, 'skip is saved, 대황 untouched'
    expect(page.locator('#act')).to_have_text('배 타고 바다로')
    menu(page)
    page.locator('#t-deck').click()
    page.locator('#deck [data-d="i"]').click()
    page.locator('#d-body .item', has_text='돛대 깃발').locator('button').click()
    assert heal_state(page)['own'] & 1, 'bought item stays in the browser'
    page.reload()
    assert heal_state(page)['own'] & 1 and page.input_value('#nick') == NICK[:8]
    expect(page.locator('#guide')).to_have_count(0)
    # 입구의 '바다에서 독도 보기'도 자동 항해로 시작한다.
    page.locator('#e-more').click()
    page.locator('#start').click()
    expect(page.locator('#act')).to_have_text('낚시하기')
    expect(page.locator('#auto')).to_have_attribute('aria-pressed', 'true')
    expect(page.locator('#bow')).to_have_attribute('aria-pressed', 'false')
    page.wait_for_timeout(600)
    expect(page.locator('#guide')).to_have_count(0)
    page.reload()

    assert all('cdn.jsdelivr.net' in u or 'api.open-meteo.com' in u for u in external), external
    assert all('nick' not in u for u in external), 'nickname stays out of outside requests'
    page.locator('#enter a.back').click()
    page.wait_for_function("location.pathname.endsWith('/') && !location.pathname.includes('/camp')")
    expect(page.locator('#v3-entry')).to_be_visible()
    assert not errors, errors
    page.close()
    print('ok', label)

def open_profile(page):
    # webkit 휴대폰 화면에서 가끔 닉네임 창이 열리지 않아 30초를 기다리다 실패했다(11/14 main 2회).
    # 추정 원인: 앞 시험(walk)의 학교 화면이 닫히며 남긴 저장이 새 화면에 늦게 도착해 두 탭 충돌 보호가 켜진다.
    # 안 열리면 그때의 보호 상태와 안내 문구를 기록에 남기고, 사람이 하듯 새로고침한 뒤 한 번 더 연다.
    dialog = page.locator('#age-dialog')
    for attempt in range(2):
        page.wait_for_function('window.DokdoApp && DokdoApp.state')
        page.evaluate('DokdoApp.editProfile()')
        try:
            expect(dialog).to_be_visible(timeout=5000)
            return
        except AssertionError:
            why = page.evaluate('({blocked:DokdoApp.store.blocked,error:DokdoApp.store.error})')
            print('profile dialog did not open', attempt, why, page.locator('#toast').all_inner_texts())
            page.reload()
    expect(dialog).to_be_visible()


def card(context, label):
    page = context.new_page()
    # 닉네임을 힐링존 주소로 건네는 것은 만 14세 이상이 확인된 기기뿐입니다.
    page.add_init_script("localStorage.setItem('dokdo-device-age-v1','20+')")
    page.goto(f'{base}/')
    entry = page.locator('#camp-entry')
    expect(entry).to_be_visible()
    assert entry.get_attribute('href') == './camp/'
    assert page.locator('#v3-entry .v3-choice-grid > *').count() == 3
    assert page.locator('#together-entry').get_attribute('href') == './together/'
    assert page.locator('#v3-entry-title').inner_text() == '내 독도 학력은 몇 학년?'
    biggest = page.evaluate("""()=>{const r=e=>{const b=document.querySelector(e).getBoundingClientRect();return b.width*b.height};return {start:r('#v3-first-class'),login:r('#account-link'),live:r('#v3-live-entry'),lang:r('#v3-main-language')}}""")
    assert biggest['start'] == max(biggest.values()), biggest
    assert entry.locator('.v3-choice-name > span').all_inner_texts() == ['독도에서', '힐링하기']
    # 힐링 칸은 두 칸 아래 가로 전체 그림 칸: 제목은 한 줄, 다른 칸보다 넓고 그림이 보인다(11/10)
    rows = page.evaluate("""()=>{const box=e=>document.querySelector(e).getBoundingClientRect();
      const lines=[...document.querySelectorAll('#camp-title > span')].map(e=>e.getBoundingClientRect());
      const c=box('#camp-entry'),l=box('#v3-enter-learn'),p=box('#v3-enter-play'),art=box('#camp-entry .camp-art'),act=box('#camp-action');
      const s=box('#v3-first-class');
      return {oneLine:Math.abs(lines[0].top-lines[1].top)<2,below:c.top>=Math.max(l.bottom,p.bottom)-1,startFirst:s.bottom<=Math.min(l.top,p.top,c.top),
              wide:c.width>=l.width+p.width,art:art.height>=90,action:act.height>0&&act.bottom<=c.bottom}}""")
    assert all(rows.values()), rows
    open_profile(page)
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
        page.locator('#e-more').click()
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
    expect(page.locator('#e-go')).to_have_text('동도 선착장에서 시작', use_inner_text=True)
    assert page.evaluate("getComputedStyle(document.querySelector('#e-go')).backgroundColor") == 'rgb(182, 216, 12)', 'signed in: the dock start is the one lime button'
    page.goto(f'{base}/')
    expect(page.locator('#account-link')).to_have_text('내 기록')
    open_profile(page)
    page.fill('#nickname', '독코')
    page.locator('#age-form button[type=submit]').click()
    expect(page.locator('#account-link')).to_have_text('독코')
    page.goto(f'{base}/games.html')
    expect(page.locator('#game-account-link')).to_have_text('독코')
    context.close()
    print('ok signed-in header and camp entry')

def picture(browser, options):
    context = browser.new_context(**options)
    use_three(context)
    weather(context, 0)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(f'{base}/camp/')
    expect(page.locator('#view')).to_be_hidden()
    page.locator('#e-go').click()
    menu(page)
    page.locator('#t-rest').click()
    page.locator('#v-look').click()
    view2d(page)
    assert not errors, errors
    context.close()
    print('ok 3D first, 2D picture from 쉼터')

def sizes(browser):
    # 휴대폰 작은 화면(375×667)에서 입구 카드가 넘기지 않고 다 보이고, 가로(844×390)에서는 메뉴가 화면을 덮지 않는다.
    for w, h in [(375, 667), (844, 390)]:
        context = browser.new_context(viewport={'width': w, 'height': h})
        use_three(context)
        weather(context, 0)
        page = context.new_page()
        page.goto(f'{base}/camp/')
        expect(page.locator('#e-go')).to_be_visible()
        if (w, h) == (375, 667):
            fit = page.evaluate("(()=>{const e=document.querySelector('#enter'),c=e.firstElementChild.getBoundingClientRect();return {scroll:e.scrollHeight<=e.clientHeight+1,top:c.top>=0,bottom:c.bottom<=innerHeight}})()")
            assert fit == {'scroll': True, 'top': True, 'bottom': True}, fit
        page.locator('#e-go').click()
        menu(page)
        fits = "(()=>{const d=document.querySelector('#dock').getBoundingClientRect(),q=document.querySelector('#quick').getBoundingClientRect();return d.height<=innerHeight*.62+1&&q.bottom<=innerHeight&&q.top>=d.top})()"
        if h < 500:
            assert page.evaluate(fits), 'menu with the info lines fits in landscape'
        page.locator('#t-talk').click()
        expect(page.locator('#say')).to_be_visible()
        box = page.evaluate("(()=>{const d=document.querySelector('#dock').getBoundingClientRect(),q=document.querySelector('#quick').getBoundingClientRect();return {h:d.height,top:d.top,qb:q.bottom}})()")
        if h < 500:
            assert box['h'] <= h * .62 + 1 and box['qb'] <= h, box
            expect(page.locator('#m-top')).to_be_hidden()  # 판을 열면 정보 줄은 접힌다(가로)
            page.locator('#t-talk').click()
            expect(page.locator('#m-top')).to_be_visible()
        context.close()
    print('ok entry fits 375x667, menu leaves the view at 844x390')

def board(browser):
    """11/20 합치기 2단계: 메뉴를 열면 맨 위에 '내 배' 판. 지도(땅 모양·내 배·선착장), 레벨·대황, 오늘 할 일(실제 저장값만)."""
    for w, h in [(390, 844), (375, 667), (844, 390)]:
        context = browser.new_context(viewport={'width': w, 'height': h})
        use_three(context)
        weather(context, 0)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(f'{base}/camp/')
        # 오늘(한국 시각) 값이 든 기록을 넣고 다시 연다: 낚시 3번, 놀이 40, 줍기 15, 바라보기·쉬기 4, 대황 123
        page.evaluate("""(()=>{const d=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date());
          localStorage.setItem('dokdo-heal',JSON.stringify({c:123,t:123,gift:1,xD:d,fN:3,xG:40,xC:15,hx:55,rD:d,rN:4}))})()""")
        page.reload()
        page.locator('#e-go').click()
        expect(page.locator('#board')).to_be_hidden()
        menu(page)
        expect(page.locator('#board')).to_be_visible()
        assert page.evaluate("document.querySelector('#m-top').firstElementChild.id") == 'board', 'the card comes first in the menu'
        page.wait_for_timeout(300)
        assert page.evaluate("Math.abs(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dk'))-document.querySelector('#dock').offsetHeight)<=1"), 'the 3D view knows the open menu height (--dk)'
        assert page.locator('#board #goal').count() == 1, 'the existing gauge lives in the card (not a copy)'
        assert page.locator('#goal').count() == 1
        expect(page.locator('#board h2')).to_have_text('내 배')
        texts = page.evaluate("Object.fromEntries([...document.querySelectorAll('#board li')].map(e=>[e.dataset.k,e.textContent]))")
        # 3단계: 오늘 할 일은 짧은 줄 넷 그대로. 놀이·줍기 경험치를 한 줄로 묶고 태극기 흔들기를 더한다.
        assert texts == {'fish': '낚시 7번 남음', 'wave': '흔들기 0/20', 'xp': '놀이 40/100 · 줍기 15/50', 'look': '바라보기 대황 4/10'}, texts
        assert page.locator('#board li').count() == 4, 'four short lines (통발은 나중)'
        lv = page.evaluate("DokdoHeal.level().L")
        expect(page.locator('#board .b-lv')).to_have_text(f'Lv {lv} · 대황 123')
        assert page.evaluate("document.querySelector('#g-text').textContent").startswith(f'Lv{lv} ·')
        # 지도: 지형 칸으로 그린 땅이 있고, 선착장 표시가 지도 안에 있다.
        drawn = page.evaluate("""(()=>{const c=document.querySelector('#board canvas'),x=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0,soft=0;for(let i=3;i<x.length;i+=4){if(x[i])n++;if(x[i]>0&&x[i]<255)soft++}return {n,soft,all:c.width*c.height}})()""")
        assert 0.03 * drawn['all'] < drawn['n'] < 0.6 * drawn['all'] and drawn['soft'] > 40, drawn  # 매끈한 경계(부드러운 가장자리 픽셀)
        # 섬 이름 서도·동도, 범례(내 배·선착장). 이름표는 지도 안.
        labs = page.evaluate("""(()=>{const m=document.querySelector('#board .b-map').getBoundingClientRect();return [...document.querySelectorAll('#board .b-lab')].map(e=>{const b=e.getBoundingClientRect();return [e.textContent,b.left>=m.left&&b.right<=m.right&&b.top>=m.top&&b.bottom<=m.bottom]})})()""")
        assert labs == [['서도', True], ['동도', True]], labs
        assert page.evaluate("[...document.querySelectorAll('#board .b-key span')].map(e=>e.textContent)") == ['내 배', '선착장']
        # '더 보기'는 처음에 닫혀 있다. 메뉴는 375×667에서 화면의 55% 이하.
        expect(page.locator('#m-extra')).to_be_hidden()
        if (w, h) == (375, 667):
            share = page.evaluate("document.querySelector('#dock').getBoundingClientRect().height/innerHeight")
            assert share <= 0.55, share
        inside = page.evaluate("""(()=>{const m=document.querySelector('#board .b-map').getBoundingClientRect();return ['.b-dock','.b-dot'].map(s=>{const b=document.querySelector('#board '+s).getBoundingClientRect(),x=b.left+b.width/2,y=b.top+b.height/2;return x>=m.left&&x<=m.right&&y>=m.top&&y<=m.bottom})})()""")
        assert inside == [True, True], inside
        # 선착장에 앉아 있으면 내 배 점은 선착장 표시 가까이에 있다.
        near = page.evaluate("""(()=>{const a=document.querySelector('#board .b-dot').getBoundingClientRect(),b=document.querySelector('#board .b-dock').getBoundingClientRect();return Math.hypot(a.left+a.width/2-b.left-b.width/2,a.top+a.height/2-b.top-b.height/2)})()""")
        assert near < 12, near
        # 바다로 나가면 점이 배를 따라 움직이고, 지도 좌표는 배의 실제 자리와 맞는다.
        menu(page, False)
        page.wait_for_timeout(900)  # 라임 단추 글자가 바뀐 뒤 0.8초 동안의 누름은 무시된다(두 번 눌림 방지)
        page.locator('#act').click()
        expect(page.locator('#act')).to_have_text('낚시하기')
        menu(page)
        # 배 타고 바다로는 먼 바다에서 출발한다. 지도 밖이면 점은 가장자리에 속이 빈 채로 붙어 있다가, 지도 안으로 들어오면 채워진다.
        until(page, "!document.querySelector('#board .b-dot').classList.contains('far')", timeout=45000)
        at0 = page.evaluate("document.querySelector('#board .b-dot').dataset.at")
        first = page.evaluate("document.querySelector('#board .b-dot').style.left+','+document.querySelector('#board .b-dot').style.top")
        page.wait_for_timeout(3500)
        later = page.evaluate("document.querySelector('#board .b-dot').style.left+','+document.querySelector('#board .b-dot').style.top")
        assert first != later, (first, later)
        assert page.evaluate("document.querySelector('#board .b-dot').dataset.at") != at0, 'the boat position is live'
        page.wait_for_timeout(300)
        match = page.evaluate("""(()=>{const d=document.querySelector('#board .b-dot'),[x,z]=d.dataset.at.split(',').map(Number),p=DokdoBoard.place(x,z);return Math.hypot(parseFloat(d.style.left)-p.x,parseFloat(d.style.top)-p.y)})()""")
        assert match < 1.5, match
        # 지도 밖의 배는 가장자리 안쪽에서 배 쪽을 가리키는 화살표가 된다.
        far = page.evaluate("""(()=>{const p=DokdoBoard.place(-40,1600),m=document.querySelector('#board .b-map').getBoundingClientRect();return {far:p.far,inside:p.x>0&&p.x<m.width&&p.y>0&&p.y<m.height,down:Math.abs(p.ang-Math.PI/2)<0.3}})()""")
        assert far == {'far': True, 'inside': True, 'down': True}, far
        # 브랜드: 판 안 글자 14px 이상, 라임은 점과 강조에만, 차콜 판.
        look = page.evaluate("""(()=>{const all=[...document.querySelectorAll('#board *')].filter(e=>e.offsetParent&&e.childNodes.length&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()));
          return {min:Math.min(...all.map(e=>parseFloat(getComputedStyle(e).fontSize))),bg:getComputedStyle(document.querySelector('#board')).backgroundColor,dot:getComputedStyle(document.querySelector('#board .b-dot')).backgroundColor,wide:document.querySelector('#board').scrollWidth<=document.querySelector('#board').clientWidth}})()""")
        assert look['min'] >= 14 and look['bg'] == 'rgb(35, 37, 40)' and look['wide'] and look['dot'] in ('rgb(182, 216, 12)', 'rgb(35, 37, 40)'), look
        assert page.evaluate("document.documentElement.scrollWidth<=innerWidth"), 'no sideways scroll'
        if h < 500:
            fits = page.evaluate("(()=>{const d=document.querySelector('#dock').getBoundingClientRect(),q=document.querySelector('#quick').getBoundingClientRect(),m=document.querySelector('#m-top');return {h:d.height<=innerHeight*.62+1,q:q.bottom<=innerHeight,scroll:getComputedStyle(m).overflowY,all:m.scrollHeight<=m.clientHeight+1}})()")
            assert fits == {'h': True, 'q': True, 'scroll': 'auto', 'all': True}, fits  # 닫힌 상태로는 넘기지 않아도 다 보인다
            # '더 보기'를 열어 넘치면 아래가 흐려져 더 있다는 것을 보여 주고, 끝까지 넘기면 사라진다.
            page.locator('#b-more').click()
            expect(page.locator('#m-extra')).to_be_visible()
            if page.evaluate("(()=>{const m=document.querySelector('#m-top');return m.scrollHeight>m.clientHeight+2})()"):
                until(page, "document.querySelector('#m-top').classList.contains('more-below')", timeout=3000)
                page.evaluate("(()=>{const m=document.querySelector('#m-top');m.scrollTop=m.scrollHeight})()")
                until(page, "!document.querySelector('#m-top').classList.contains('more-below')", timeout=3000)
            page.locator('#b-more').click()
        else:
            assert page.evaluate("document.querySelector('#dock').getBoundingClientRect().top") >= 0
        assert not errors, errors
        context.close()
    print('ok 내 배 card: map, dot follows the boat, numbers match the save')

SHIFT = """(()=>{const real=Date.now.bind(Date);Date.now=()=>real()+(+localStorage.getItem('__shift')||0);
  window.__voices=[];addEventListener('dokdo-shout-voice',e=>window.__voices.push(e.detail.file));
  try{navigator.vibrate=ms=>{(window.__vib=window.__vib||[]).push(ms);return true}}catch(e){}
  localStorage.setItem('nick','바다')})()"""
DAY = 86400000

def skip_guide(page):
    """처음 온 사람의 사용 설명서가 뜨면 건너뛴다(설명서가 떠 있는 동안 외침판은 숨는다)."""
    until(page, "!document.querySelector('#guide')||!document.querySelector('#guide').hidden", timeout=5000)
    if page.locator('#guide').count():
        expect(page.locator('#shout')).to_be_hidden()
        page.locator('#g-skip').click()
        expect(page.locator('#guide')).to_have_count(0)

def flagday(browser):
    """11/20 합치기 3단계: 태극기 게양(하루 한 번)·지킨 날(줄지 않음)·흔들기(하루 20번)·목소리(연속 없음)·외침판(독도 친구)."""
    context = browser.new_context(viewport={'width': 375, 'height': 667}, has_touch=True, is_mobile=True, device_scale_factor=2)
    use_three(context)
    weather(context, 0)
    context.add_init_script(SHIFT)
    page = context.new_page()
    errors, mp3, outside = [], [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: mp3.append(r.url.rsplit('/', 1)[-1]) if '/voice/' in r.url else None)
    page.on('request', lambda r: outside.append(r.url) if '127.0.0.1' not in r.url and not r.url.startswith(('data:', 'blob:', 'https://cdn.jsdelivr.net/npm/three@')) and 'api.open-meteo.com' not in r.url else None)
    page.goto(f'{base}/camp/')
    kday = "(()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10))()"
    # 입구에 있는 동안은 올리지 않는다(장소를 고른 뒤에).
    page.wait_for_timeout(1500)
    assert heal_state(page).get('kN', 0) == 0
    page.locator('#e-go').click()
    skip_guide(page)
    until(page, "(JSON.parse(localStorage.getItem('dokdo-heal')||'{}').kN||0)===1", timeout=8000)
    assert heal_state(page)['kD'] == page.evaluate(kday)
    # 선착장에서는 선착장 깃대에 올라간다(짧게 움직여 꼭대기까지).
    until(page, "(()=>{const f=DokdoWave.flags();return f.pole===f.top.pole})()", timeout=6000)
    expect(page.locator('#sh-list li.sys')).to_contain_text('오늘 태극기를 올렸어요')
    expect(page.locator('#toast')).to_contain_text('독도를 지킨 날 1일째', timeout=8000)
    # 같은 날 다시 와도 그대로 1일째. 외침판도 새 줄 없이 숨어 있다(메모리에만 두므로).
    page.reload()
    page.locator('#e-go').click()
    page.wait_for_timeout(2500)
    assert heal_state(page)['kN'] == 1
    expect(page.locator('#shout')).to_be_hidden()
    assert page.evaluate("DokdoWave.flags().pole") is not None, 'already raised today: the flag stays up'
    # 다음 날(시계를 하루 미룸) 2일째, 닷새 뒤 3일째(빠진 날이 있어도 줄지 않음), 시계를 되돌려도 그대로.
    for shift, want in [(1, 2), (6, 3), (3, 3)]:
        page.evaluate(f"localStorage.setItem('__shift',String({shift}*{DAY}))")
        page.reload()
        if shift == 6:
            page.locator('#e-more').click()
            page.locator('#start').click()  # 바다에서 시작하면 내 배 돛대에 올라간다
        else:
            page.locator('#e-go').click()
        page.wait_for_timeout(2600)
        assert heal_state(page)['kN'] == want, (shift, heal_state(page))
        if shift == 6:
            until(page, "(()=>{const f=DokdoWave.flags();return f.mast===f.top.mast})()", timeout=6000)
    # 흔들기: 라임 단추 바로 옆 작은 차콜 단추. 아래 줄은 한 줄 그대로, 375 폭에서도 붐비지 않는다.
    page.evaluate("localStorage.removeItem('__shift')")
    page.reload()
    page.locator('#e-go').click()
    expect(page.locator('#flagwave')).to_be_visible()
    row = page.evaluate("""(()=>{const r=s=>document.querySelector(s).getBoundingClientRect(),a=r('#act'),f=r('#flagwave'),m=r('#more'),c=getComputedStyle(document.querySelector('#flagwave'));
      return {order:[...document.querySelectorAll('#quick button')].map(e=>e.id),line:Math.abs(a.top-f.top)<2&&Math.abs(f.top-m.top)<2,actW:a.width,bg:c.backgroundColor,label:document.querySelector('#flagwave').getAttribute('aria-label'),h:f.height}})()""")
    assert row['order'] == ['act', 'flagwave', 'more'] and row['line'] and row['actW'] >= 150 and row['bg'] == 'rgb(35, 37, 40)' and row['label'] == '태극기 흔들기' and row['h'] >= 44, row
    assert not mp3, 'voices are not loaded with the page'
    wave = page.locator('#flagwave')
    wave.click()
    expect(page.locator('#tags .tag.me .bubble')).to_have_text('독도는 한국 땅!')
    expect(page.locator('#tags .tag.me .bubble')).to_be_visible()
    assert page.evaluate("DokdoWave.waving()"), 'the captain waves a hand flag'
    if page.evaluate("!!(window.DokdoHaptic&&DokdoHaptic.available)"):
        assert page.evaluate("(window.__vib||[]).length") >= 1, 'short vibration on touch phones'
    until(page, "window.__voices.length===1", timeout=8000)
    assert sorted(set(mp3)) == ['shout-f1.mp3', 'shout-f2.mp3', 'shout-m1.mp3', 'shout-m2.mp3'], mp3
    expect(page.locator('#sh-list li').last).to_contain_text('독도 친구: 독도는 한국 땅!')
    page.wait_for_timeout(800)
    # 소리를 끄면 세기는 하지만 목소리는 내지 않는다.
    page.locator('#snd').click()
    wave.click()
    page.wait_for_timeout(400)
    assert page.evaluate("window.__voices.length") == 1 and heal_state(page)['wN'] == 2
    page.locator('#snd').click()
    for i in range(20):
        wave.click()
        page.wait_for_timeout(260)
    until(page, "window.__voices.length>=19", timeout=8000)
    page.wait_for_timeout(1200)
    voices = page.evaluate("window.__voices")
    st = heal_state(page)
    assert st['wN'] == 20 and st['wD'] == page.evaluate(kday), st
    assert len(voices) == 19, ('20 counted presses, one with the sound off', len(voices))
    assert all(a != b for a, b in zip(voices, voices[1:])), voices
    assert len(set(voices)) >= 3, voices
    # 20번이 넘으면 흔들기는 되지만 세지 않고 목소리도 없다.
    wave.click()
    page.wait_for_timeout(600)
    assert heal_state(page)['wN'] == 20 and len(page.evaluate("window.__voices")) == 19
    expect(page.locator('#tags .tag.me .bubble')).to_have_text('독도는 한국 땅!')
    # 내 배 판: 지킨 날과 흔들기 20/20
    menu(page)
    expect(page.locator('#board .b-days')).to_have_text('지킨 날 3일째')
    expect(page.locator('#board .b-days')).to_have_attribute('aria-label', '독도를 지킨 날 3일째')
    assert page.evaluate("document.querySelector('#board .b-days').parentElement.className") == 'b-head', 'kept days sit in the title line'
    expect(page.locator('#board li[data-k="wave"]')).to_have_text('태극기 흔들기 20/20')
    # 인사 줄의 말도 외침판에. 새 자유 입력은 없다.
    page.locator('#t-talk').click()
    page.locator('#p-talk .q', has_text='같이 쉬어요').click()
    page.locator('#wave').click()
    texts = page.evaluate("DokdoWave.lines().map(l=>(l.who?l.who+': ':'')+l.text)")
    assert texts[-2:] == ['독도 친구: 같이 쉬어요', '독도 친구: 안녕하세요!'], texts[-3:]
    # 11/20 교수님: 인사는 문장 골라 보내기만. 자유 입력 칸과 보내기 단추는 없고 이름 칸만 남는다.
    assert page.locator('#text').count() == 0 and page.locator('#send').count() == 0 and page.locator('#say form, form#say').count() == 0
    assert page.locator('input[type=text],input:not([type]),textarea').count() == 1, 'only the existing name field'
    expect(page.locator('#nick')).to_be_visible()
    assert page.evaluate("[...document.querySelectorAll('#p-talk button')].map(b=>b.textContent)") == ['손 흔들기', '풍경이 참 좋아요', '같이 쉬어요', '또 만나요', '독도는 한국 땅!']
    page.locator('#p-talk .q', has_text='독도는 한국 땅!').click()
    expect(page.locator('#tags .tag.me .bubble')).to_have_text('독도는 한국 땅!')
    assert page.evaluate("DokdoWave.lines().slice(-1)[0].text") == '독도는 한국 땅!'
    assert heal_state(page)['wN'] == 20, 'the phrase button is a chat line, not a counted wave'
    menu(page, False)
    # 만 14세 이상이 확인된 기기면 닉네임, 아니면 '독도 친구'.
    page.evaluate("localStorage.setItem('dokdo-device-age-v1','20+')")
    wave.click()
    expect(page.locator('#sh-list li').last).to_contain_text('바다: 독도는 한국 땅!')
    page.evaluate("localStorage.setItem('dokdo-device-age-v1','10-11')")
    wave.click()
    expect(page.locator('#sh-list li').last).to_contain_text('독도 친구: 독도는 한국 땅!')
    for i in range(10):
        wave.click()
    assert page.evaluate("DokdoWave.lines().length") == 30, 'at most 30 lines'
    expect(page.locator('#sh-tab b')).to_have_text('30')
    # 몇 초 뒤 작은 탭으로 접힌다. 탭을 누르면 다시 열린다.
    expect(page.locator('#sh-pane')).to_be_visible()
    expect(page.locator('#sh-pane')).to_be_hidden(timeout=8000)
    expect(page.locator('#sh-tab')).to_be_visible()
    page.locator('#sh-tab').click()
    expect(page.locator('#sh-pane')).to_be_visible()
    assert not errors, errors
    assert not outside, outside
    context.close()
    print('ok flag raised once a day, kept days never drop, waves cap 20, voices never repeat, board says 독도 친구')

def shout_fit(browser):
    """외침판이 위 단추(⌂ 홈·소리)와 아래 단추를 가리지 않는다(375×667, 844×390, 390×844)."""
    for w, h in [(375, 667), (844, 390), (390, 844)]:
        context = browser.new_context(viewport={'width': w, 'height': h})
        use_three(context)
        weather(context, 0)
        page = context.new_page()
        page.goto(f'{base}/camp/')
        page.locator('#e-go').click()
        page.locator('#flagwave').click()
        skip_guide(page)
        for i in range(8):
            page.locator('#flagwave').click()
        expect(page.locator('#sh-pane')).to_be_visible()
        clear = page.evaluate("""(()=>{const r=s=>document.querySelector(s).getBoundingClientRect(),p=r('#shout'),off=(a,b)=>a.bottom<=b.top||b.bottom<=a.top||a.right<=b.left||b.right<=a.left;
          return {top:['#top .back','#snd'].every(s=>off(p,r(s))),bottom:[...document.querySelectorAll('#dock button')].filter(e=>e.offsetParent).every(e=>off(p,e.getBoundingClientRect())),inside:p.left>=0&&p.right<=innerWidth&&p.top>=0}})()""")
        assert clear == {'top': True, 'bottom': True, 'inside': True}, (w, h, clear)
        shot = os.environ.get('SHOT_DIR')
        if shot:
            page.wait_for_timeout(600)
            page.screenshot(path=f'{shot}/pr3-{w}x{h}.png')
        menu(page)
        expect(page.locator('#sh-pane')).to_be_hidden()  # 메뉴를 열면 판은 접고 탭만
        clear = page.evaluate("""(()=>{const r=s=>document.querySelector(s).getBoundingClientRect(),p=r('#shout'),off=(a,b)=>a.bottom<=b.top||b.bottom<=a.top||a.right<=b.left||b.right<=a.left;
          return ['#top .back','#snd','#dock'].every(s=>off(p,r(s)))})()""")
        assert clear, (w, h, 'tab clear of the open menu')
        if shot:
            page.screenshot(path=f'{shot}/pr3-menu-{w}x{h}.png')
        context.close()
    print('ok shout board leaves the top and bottom buttons free')

def blocked(browser):
    context = browser.new_context()
    context.route(CDN, lambda r: r.abort())
    page = context.new_page()
    page.goto(f'{base}/camp/')
    expect(page.locator('#err')).to_be_visible()
    # 3D를 못 켜도 2D 그림은 본다(예전처럼 바로 뜬다). 3D 단추를 누르면 안내와 홈 길이 나온다. 설명서는 없다.
    expect(page.locator('#view')).to_be_visible()
    page.wait_for_load_state('load')
    expect(page.locator('#v-reward')).to_be_hidden()
    expect(page.locator('#v-3d')).to_have_text('3D로 독도 여행하기')
    assert page.locator('#guide').count() == 0
    page.locator('#v-go').click()
    expect(page.locator('#v-breath')).to_be_visible()
    page.locator('#v-stop').click()
    into3d(page)
    expect(page.locator('#err a.back')).to_be_visible()
    expect(page.locator('#err a.back')).to_be_focused()
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
        picture(browser, {'viewport': {'width': 1280, 'height': 800}})
        picture(browser, {k: v for k, v in pw.devices['iPhone 13'].items() if k != 'default_browser_type'})
        rain(browser)
        sizes(browser)
        board(browser)
        flagday(browser)
        shout_fit(browser)
        member(browser)
        blocked(browser)
        browser.close()
    assert len(sealed) >= 8 and not strays, (len(sealed), strays)
    print('ok nothing left this machine for the operating servers')
finally:
    server.shutdown()
