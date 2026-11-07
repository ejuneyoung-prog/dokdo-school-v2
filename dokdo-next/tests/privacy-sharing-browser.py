#!/usr/bin/env python3
"""만 14세 미만의 정보가 서버로 나가지 않는지 실제 브라우저로 봅니다.

site-config의 운영 주소는 시험용 주소로 바꾸고, 그 주소로 가는 요청은 이 시험이 가로채서 답합니다.
실제 서버에는 아무것도 나가지 않습니다."""
import functools, http.server, json, re, sys, threading
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_entry import enter_learning

ROOT = Path(__file__).resolve().parents[1]
engine = sys.argv[1] if len(sys.argv) > 1 else 'chromium'
TEST_API = 'https://script.google.com/macros/s/PRIVACY-TEST/exec'
LOCAL = ('http://127.0.0.1', 'data:', 'blob:')


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}'


def site_config():
    text = (ROOT / 'assets/site-config.js').read_text(encoding='utf-8')
    text = re.sub(r"apiUrl:'[^']*'", f"apiUrl:'{TEST_API}'", text)
    text = re.sub(r"gaId:'[^']*'", "gaId:''", text)
    return re.sub(r'guardianConsentHashes:Object\.freeze\(\[[^\]]*\]\)', "guardianConsentHashes:Object.freeze(['" + GUARDIAN_HASH + "'])", text)


import hashlib
GUARDIAN_CODE = 'fixture-guardian-code'
GUARDIAN_HASH = hashlib.sha256(('dokdo-guardian:' + GUARDIAN_CODE).encode()).hexdigest()


def run(browser, band, consent=False):
    sent = []
    saved = {}
    context = browser.new_context()

    def route(r):
        url = r.request.url
        if url.startswith(LOCAL):
            return r.continue_()
        if url.startswith(TEST_API):
            if r.request.method == 'POST':
                body = r.request.post_data or ''
                sent.append(body)
                data = json.loads(body)
                if data.get('t') == 'save':
                    saved['payload'] = data['payload']
                return r.fulfill(status=200, body='{}', content_type='application/json')
            if 'load=' in url:
                return r.fulfill(status=200, body=json.dumps({'ok': True, 'payload': saved.get('payload')}), content_type='application/json')
            return r.fulfill(status=200, body='{}', content_type='application/json')
        return r.abort()

    context.route('**/*', route)
    context.route('**/assets/site-config.js', lambda r: r.fulfill(body=site_config(), content_type='text/javascript'))
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.add_init_script("if(!window.__w)window.__w=setInterval(()=>{const d=document.getElementById('youtube-intro');if(d&&d.open)d.close();},100)")
    page.goto(base + '/index.html' + (f'?guardian={GUARDIAN_CODE}' if consent else ''))
    page.wait_for_load_state('load')
    page.wait_for_timeout(600)
    enter_learning(page)
    page.click('#start-lesson')
    page.wait_for_selector('#age-dialog[open]')
    page.select_option('#age-band', band)
    if page.locator('.v3-optional-profile').count() and not page.eval_on_selector('.v3-optional-profile', 'e=>e.open'):
        page.click('.v3-optional-profile>summary')
    note = page.locator('#under14-note').is_visible()
    page.fill('#nickname', 'fixture-nick')
    page.select_option('#school-cat', 'E')
    page.fill('#school-name', 'fixture-school')
    page.click('#age-form [type=submit]')
    page.wait_for_timeout(500)
    page.wait_for_selector('#teaching', state='visible')
    page.click('#read-done')
    page.wait_for_selector('.answer-option')
    answer = page.evaluate('DokdoApp.lesson.answer')
    page.locator(f'.answer-option[data-index="{answer}"]').click()
    page.wait_for_timeout(700)
    camp = page.get_attribute('#camp-entry', 'href') if page.locator('#camp-entry').count() else ''
    context.close()
    assert not errors, errors
    return sent, note, camp, saved


def adult_record_on_child_device(browser):
    sent = []
    context = browser.new_context()

    def route(r):
        url = r.request.url
        if url.startswith(LOCAL):
            return r.continue_()
        if url.startswith(TEST_API) and r.request.method == 'POST':
            sent.append(r.request.post_data or '')
            return r.fulfill(status=200, body='{}', content_type='application/json')
        if url.startswith(TEST_API):
            return r.fulfill(status=200, body='{}', content_type='application/json')
        return r.abort()

    context.route('**/*', route)
    context.route('**/assets/site-config.js', lambda r: r.fulfill(body=site_config(), content_type='text/javascript'))
    page = context.new_page()
    page.add_init_script("localStorage.setItem('dokdo-device-age-v1','10-11')")
    page.goto(base + '/index.html')
    page.wait_for_function('window.DokdoApp&&DokdoApp.state')
    page.evaluate("""async()=>{const A=DokdoApp;const s=A.state;s.name='adult-nick';s.school='adult-school';const M=DokdoAppModel;M.selectProfile(s,'20+',false);localStorage.setItem(M.KEY,JSON.stringify(s));}""")
    page.reload()
    page.wait_for_timeout(900)
    state_band = page.evaluate('DokdoPrivacy.deviceAge()')
    assert state_band == '10-11', state_band
    assert page.evaluate('DokdoPrivacy.mayShare()') is False
    context.close()
    return sent


def adoption(browser):
    def gate_age(init, path='/index.html'):
        context = browser.new_context()
        context.route('**/*', lambda r: r.continue_() if r.request.url.startswith(LOCAL) else r.abort())
        context.route('**/assets/site-config.js', lambda r: r.fulfill(body=site_config(), content_type='text/javascript'))
        page = context.new_page()
        page.goto(base + '/index.html')
        page.wait_for_function('window.DokdoApp&&DokdoApp.state')
        saved = page.evaluate("""()=>{const s=DokdoAppModel.fresh();DokdoAppModel.selectProfile(s,'20+',false);return JSON.stringify(s)}""")
        page.evaluate(init, saved)
        page.goto(base + path)
        page.wait_for_timeout(700)
        band = page.evaluate("localStorage.getItem('dokdo-device-age-v1')||''")
        context.close()
        return band
    older = gate_age("s=>{localStorage.clear();localStorage.setItem(DokdoAppModel.KEY,s)}")
    restored = gate_age("s=>{localStorage.removeItem('dokdo-device-age-v1');localStorage.setItem(DokdoAppModel.KEY,s)}")
    demo = gate_age("s=>{localStorage.clear();localStorage.setItem(DokdoAppModel.KEY,s)}", '/demo.html')
    return older, restored, demo


with sync_playwright() as pw:
    browser = getattr(pw, engine).launch()
    for band in ('u7', '8-9', '10-11', '12-13'):
        sent, note, camp, _ = run(browser, band)
        assert not sent, (band, sent)
        assert note, band
        assert 'fixture-nick' not in (camp or ''), camp
        print('ok under 14 sends nothing', band)
    sent, note, camp, saved = run(browser, '20+')
    assert not note
    kinds = [json.loads(body).get('t') for body in sent]
    assert 'a' in kinds and 'save' in kinds, kinds
    payload = saved['payload']
    for word in ('fixture-school', '"school":"fixture'):
        assert word not in payload, word
    print('ok 14 or older keeps rankings and saves a stripped copy')
    sent, note, camp, saved = run(browser, '10-11', consent=True)
    assert not note and any(json.loads(body).get('t') == 'a' for body in sent)
    print('ok guardian link opens rankings on this device')
    # 불러온 기록의 나이대가 어린이 기기의 전송을 열면 안 됩니다.
    sent = adult_record_on_child_device(browser)
    assert not sent, sent
    print('ok an adult record does not open sharing on a child device')
    assert adoption(browser) == ('20+', '', '')
    print('ok age is adopted once, and never from a restored record or the demo')
    browser.close()
print('privacy sharing ok')
