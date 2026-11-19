"""DOKDO TOGETHER(1차 시제품)를 실제 브라우저(chromium · webkit)로 처음부터 끝까지 확인합니다.
첫 배 받기 → 태극기 올리기 → 통발 던지기 → (시간을 당겨) 건지기 → 팔기 → 메뉴 → 사진, 그리고 주소의 닉네임 지우기.
운영 Apps Script는 부르지 않고 가짜 명예의 전당 응답을 돌려줍니다. 허용한 곳 밖으로 나가는 요청이 있으면 실패합니다.
THREE_MIN_JS를 주면 CDN 대신 그 파일을 씁니다(외부 접속이 막힌 환경)."""
import json, os, re, sys, threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parent.parent
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}'
engine = sys.argv[1] if len(sys.argv) > 1 else 'chromium'
three = os.environ.get('THREE_MIN_JS')
CDN = '**/npm/three@0.160.0/build/three.min.js'
ALLOWED = (base + '/', 'data:', 'blob:', 'https://cdn.jsdelivr.net/npm/three@0.160.0/')
strays, hall_calls = [], []
KEY = 'dokdo-together-v1'

def unconfigured():
    """운영 주소를 비운 site-config(요청을 끊는 것만으로는 부족: 끊긴 시도도 나간다). 명예의 전당만 시험용 가짜 주소로 둔다(아래에서 가로채 돌려준다)."""
    text = re.sub(r"(apiUrl|gaId):'[^']*'", r"\1:''", (ROOT / 'assets/site-config.js').read_text(encoding='utf-8'))
    fake = "leaderboard:Object.freeze({apiUrl:'https://script.google.com/macros/s/TEST_ONLY_NOT_LIVE/exec'})"
    text, n = re.subn(r"leaderboard:Object\.freeze\(\{apiUrl:''\}\)", fake, text)
    assert n == 1, 'site-config leaderboard shape changed'
    return text

def route_all(context):
    def guard(route):
        url = route.request.url
        if url.startswith('https://script.google.com/'):
            hall_calls.append((route.request.method, url))
            route.fulfill(status=200, content_type='application/json', body=json.dumps({'tops': [{'nick': '<b>명예</b>', 'level': 'DK2', 'at': 'x'}]}))
        elif url.startswith(ALLOWED):
            route.continue_()
        else:
            strays.append(url)
            route.abort()
    context.route('**/*', guard)
    context.route('**/assets/site-config.js', lambda r: r.fulfill(body=unconfigured(), content_type='text/javascript'))
    if three:
        context.route(CDN, lambda r: r.fulfill(path=three, content_type='application/javascript'))

def state(page):
    return json.loads(page.evaluate(f"localStorage.getItem('{KEY}')") or 'null')

with sync_playwright() as pw:
    browser = getattr(pw, engine).launch()
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=engine == 'chromium', accept_downloads=True)
    route_all(ctx)
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))

    # 1. 주소로 받은 닉네임과 나라는 채워지고 주소에서 지워진다
    page.goto(f'{base}/together/?nick=%EB%B0%94%EB%8B%A4%EC%84%A0%EC%9E%A5&cc=US')
    expect(page.locator('#welcome')).to_be_visible()
    assert page.input_value('#w-nick') == '바다선장', page.input_value('#w-nick')
    assert page.input_value('#w-cc') == 'US'
    assert 'nick=' not in page.url and 'cc=' not in page.url, page.url
    print('ok nickname arrives by address and leaves the address')

    # 2. 빈 이름은 받지 않고, 이름을 적으면 배를 받는다
    page.fill('#w-nick', '   ')
    page.click('#w-go')
    expect(page.locator('#welcome')).to_be_visible()
    page.fill('#w-nick', '독도지킴이')
    page.click('#w-go')
    expect(page.locator('#welcome')).to_be_hidden()
    st = state(page)
    assert st['nick'] == '독도지킴이' and st['cc'] == 'US' and st['stage'] == 1, st
    expect(page.locator('#days')).to_have_text('0')
    expect(page.locator('#main')).to_have_text('태극기 올리기')
    expect(page.locator('#proto')).to_contain_text('견본')
    print('ok first boat')

    # 3. 태극기 올리기 → 지킨 날 1 → 통발 던지기 → 기다리기
    page.click('#main')
    expect(page.locator('#days')).to_have_text('1')
    expect(page.locator('#main')).to_have_text('통발 던지기')
    page.click('#main')
    expect(page.locator('#main')).to_be_disabled()
    expect(page.locator('#main')).to_contain_text('기다리는 중')
    expect(page.locator('#goal-text')).to_contain_text('통발 기다리는 중')
    assert len(state(page)['traps']) == 1
    print('ok raise and throw')

    # 4. 시간을 당겨 건지기 → 나온 것 → 모두 팔기 → 바로 다시 던지기
    page.evaluate(f"(()=>{{const s=JSON.parse(localStorage.getItem('{KEY}'));s.traps=s.traps.map(t=>t-3600001);localStorage.setItem('{KEY}',JSON.stringify(s))}})()")
    page.reload()
    expect(page.locator('#main')).to_have_text('통발 건지기')
    page.click('#main')
    expect(page.locator('#sheet')).to_be_visible()
    expect(page.locator('#sheet-title')).to_have_text('통발에서 나온 것')
    assert page.locator('.catch > div').count() == 1
    page.get_by_role('button', name='창고 모두 팔기').click()
    assert state(page)['money'] > 0
    page.get_by_role('button', name='바로 다시 던지기').click()
    expect(page.locator('#sheet')).to_be_hidden()
    assert len(state(page)['traps']) == 1
    print('ok haul, sell, throw again')

    # 5. 메뉴: 배 키우기(학년 잠김 안내), 꾸미기(큰 태극기 잠김), 순위(견본 표시), 창고
    page.click('[data-panel=ship]')
    expect(page.locator('#sheet-body')).to_contain_text('Lv.8 · 중학 1학년')
    page.click('#sheet-x')
    page.click('[data-panel=deco]')
    expect(page.get_by_role('button', name='크게 (독도 선장부터)')).to_be_disabled()
    page.get_by_role('button', name='물결 돛').click()
    assert state(page)['sail'] == 'wave'
    page.click('#sheet-x')
    page.click('[data-panel=rank]')
    expect(page.locator('#sheet-body')).to_contain_text('견본')
    page.keyboard.press('Escape')
    expect(page.locator('#sheet')).to_be_hidden()
    page.click('[data-panel=bag]')
    expect(page.locator('#sheet-body')).to_contain_text('도화새우')
    page.click('#sheet-x')
    print('ok menus')

    # 6. 흔들기는 하루 20번까지만 센다
    for _ in range(25):
        page.click('#wave')
    assert state(page)['waves']['total'] == 20, state(page)['waves']
    print('ok wave cap')

    # 7. 사진 남기기: 내려받기나 그림 띄우기 중 하나로 끝난다(이 브라우저에는 공유 시트가 없다)
    # 사진은 먼저 만들어 띄우고, 공유는 그 안의 단추를 누를 때만 부른다(여기서는 누르지 않는다).
    page.click('#photo')
    expect(page.locator('#shot')).to_be_visible(timeout=15000)
    size = page.evaluate("(()=>{const i=document.getElementById('shot-img');return [i.naturalWidth,i.naturalHeight]})()")
    assert size == [1080, 1920], size
    # 이 기기는 나이대를 고르지 않았으므로 사진에도 닉네임이 들어가지 않는다(스쿨 공유 카드와 같은 원칙). 사진 글자는 그림이라 여기서는 캠핑장 주소로 확인한다.
    page.click('#shot-x')
    print('ok photo 1080x1920')

    # 8. 명예의 전당: GET 한 번, 꺾쇠는 지워져 글자로만 보인다
    assert hall_calls and all(m == 'GET' and u.startswith('https://script.google.com/macros/s/TEST_ONLY_NOT_LIVE/exec?tops=1') for m, u in hall_calls), hall_calls
    assert page.locator('#tags script, #tags b b').count() == 0
    assert not page.evaluate("document.querySelector('#tags')?.innerHTML.includes('<b>명예')")
    print('ok hall of fame read only, escaped')

    # 9. 스쿨과 캠핑장 문
    assert page.get_attribute('.back', 'href') == '../'
    assert page.get_attribute('#camp', 'href') == '../camp/', 'no nickname to the camp without the privacy check'
    ctx.close()
    assert not errors, errors
    assert not strays, strays
    browser.close()
print('together ok', engine)
