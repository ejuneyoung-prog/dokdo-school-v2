#!/usr/bin/env python3
"""DOKDO TOGETHER 의 독도 지형 자료를 힐링캠프에서 그대로 뽑아 together/terrain.js 로 만든다.

힐링캠프(camp/healing.js)는 읽기만 한다. 고치지 않는다. 두 곳의 섬 모양이 같도록 같은 높이 자료를 쓴다.
  python3 tools/together/extract_terrain.py          # 다시 만들기
  python3 tools/together/extract_terrain.py --check  # 생성물이 힐링캠프 자료와 같은지 확인
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'camp' / 'healing.js'
OUT = ROOT / 'together' / 'terrain.js'


def build():
    s = SRC.read_text(encoding='utf-8')
    m = re.search(r'^const M=(\{[^\n]*?\});', s, re.M)
    hb = re.search(r'^const HB=atob\("([A-Za-z0-9+/=]+)"\);', s, re.M)
    if not m or not hb:
        sys.exit('camp/healing.js 에서 지형 자료(M, HB)를 찾지 못했습니다.')
    meta = json.loads(m.group(1))
    return ('/* 독도 지형 높이 자료 — tools/together/extract_terrain.py 가 camp/healing.js 에서 그대로 뽑은 생성물입니다. 손으로 고치지 마세요. */\n'
            'window.DokdoTogetherTerrain={M:%s,HB:"%s"};\n' % (json.dumps(meta, separators=(',', ':')), hb.group(1)))


def main():
    text = build()
    if '--check' in sys.argv:
        ok = OUT.exists() and OUT.read_text(encoding='utf-8') == text
        print(json.dumps({'terrain': 'together', 'mode': 'check', 'same': ok}))
        sys.exit(0 if ok else 1)
    OUT.write_text(text, encoding='utf-8')
    print('wrote', OUT.relative_to(ROOT), len(text))


if __name__ == '__main__':
    main()
