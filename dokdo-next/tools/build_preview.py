#!/usr/bin/env python3
"""Create a portable preview. No user storage is accessed in preview mode."""
from pathlib import Path
import base64,re,argparse
ROOT=Path(__file__).resolve().parents[1]
def make_preview(output):
    html=(ROOT/'index.html').read_text(encoding='utf-8')
    html=html.replace('name="dokdo-mode" content="live"','name="dokdo-mode" content="preview"')
    html=html.replace("script-src 'self'","script-src 'self' 'unsafe-inline'")
    html=html.replace('<link rel="stylesheet" href="./assets/app.css">','<style>'+ (ROOT/'assets/app.css').read_text()+'</style>')
    def data(path):
        p=ROOT/path
        mime={'png':'image/png','webp':'image/webp','mp3':'audio/mpeg','wav':'audio/wav','svg':'image/svg+xml'}[p.suffix[1:]]
        return 'data:'+mime+';base64,'+base64.b64encode(p.read_bytes()).decode()
    assets=['assets/dongdo-facilities.png','assets/dokdo-islands.webp','assets/sea-texture.webp','assets/dokdo-terrain.webp','assets/ambient.wav']
    def script(match):
        text=(ROOT/match[1]).read_text()
        for asset in assets:text=text.replace('./'+asset,data(asset))
        return '<script>'+text.replace('</script','<\\/script')+'</script>'
    # Keep execution after DOM parsing; otherwise app.js sees no elements.
    sources=re.findall(r'<script defer src="./([^"]+)"></script>',html)
    html=re.sub(r'<script defer src="./[^"]+"></script>','',html)
    scripts=[]
    for path in sources:
        text=(ROOT/path).read_text()
        for asset in assets:text=text.replace('./'+asset,data(asset))
        scripts.append('<script>'+text.replace('</script','<\\/script')+'</script>')
    scripts.insert(-1,'<script>'+(ROOT/'assets/demo-ids.js').read_text()+'</script>')
    html=html.replace('</body>',''.join(scripts)+'</body>')
    html=html.replace('./assets/icon.svg',data('assets/icon.svg')).replace('href="./demo.html"','href="#demo-banner"')
    html=html.replace('href="./question-review.html"', 'href="./dokdo-questions-v1.3-review.html"')
    Path(output).write_text(html,encoding='utf-8')
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('output',nargs='?',default=str(ROOT/'preview.html'));a=p.parse_args()
    make_preview(a.output);print(a.output)
