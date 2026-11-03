import sys, threading, uuid
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

server = ThreadingHTTPServer(('127.0.0.1', 0), SimpleHTTPRequestHandler)
threading.Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_port}/camp/'
script = Path('camp/meet.js').read_text().replace('dokdo-camp-meet-v1', 'camp-test-' + uuid.uuid4().hex)
try:
    with sync_playwright() as pw:
        browser = getattr(pw, sys.argv[1]).launch()
        a, b = browser.new_page(), browser.new_page()
        for page in [a, b]:
            page.route('**/camp/meet.js', lambda route: route.fulfill(body=script, content_type='application/javascript'))
            page.goto(url)
            page.locator('#meet').click()
        for page in [a,b]:
            expect(page.locator('#meetNote')).to_contain_text('2명', timeout=45000)
            expect(page.locator('#visitors text')).to_have_count(1)
        a.locator('#chair').click()
        expect(b.locator('#visitors circle')).to_have_attribute('cy','-16')
        a.locator('#restToggle').click()
        a.locator('#creator').click()
        expect(b.locator('#visitors text')).to_have_count(0)
        a.locator('#east').click()
        expect(b.locator('#visitors text')).to_have_count(1)
        a.locator('#meet').click()
        expect(b.locator('#meetNote')).to_contain_text('1명')
        browser.close()
finally:
    server.shutdown()
