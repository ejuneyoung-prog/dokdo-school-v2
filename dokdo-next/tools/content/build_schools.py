"""Convert the operator's NEIS export into the compact list the app loads.

The raw export (schools_raw.json, produced by the operator's own Apps Script
with their NEIS key) carries fields the app never needs. This keeps only the
school name, its level and its region -- the region because 11 schools share
the name 금성초등학교 and a picker that shows the name alone cannot be used.

  python3 tools/content/build_schools.py <schools_raw.json>

Writes data/schools.json. The NEIS key never appears in this repository.
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'data' / 'schools.json'

# NEIS school kinds mapped onto the four categories the setup form offers.
CATEGORY = {
    '초등학교': 'E', '각종학교(초)': 'E', '평생학교(초)-4년12학기': 'E', '평생학교(초)-3년6학기': 'E',
    '중학교': 'M', '각종학교(중)': 'M', '방송통신중학교': 'M',
    '평생학교(중)-2년6학기': 'M', '평생학교(중)-3년6학기': 'M',
    '고등학교': 'H', '각종학교(고)': 'H', '방송통신고등학교': 'H', '고등기술학교': 'H',
    '고등공민학교': 'H', '평생학교(고)-2년6학기': 'H', '평생학교(고)-3년6학기': 'H',
    '재외한국학교(초)': 'W', '재외한국학교(중)': 'W', '재외한국학교(고)': 'W',
}


def main(source):
    raw = json.loads(pathlib.Path(source).read_text(encoding='utf-8'))
    rows = raw.get('schools') or []
    regions, seen, out = [], set(), []
    for row in rows:
        name = (row.get('name') or '').strip()
        if not name:
            continue
        region = (row.get('region') or '').strip()
        category = CATEGORY.get(row.get('kind') or '', '')
        key = (name, region, category)
        if key in seen:
            continue
        seen.add(key)
        if region not in regions:
            regions.append(region)
        out.append([name, regions.index(region), category])
    out.sort(key=lambda r: r[0])
    payload = {'v': 1, 'fetched': raw.get('fetched', ''), 'regions': regions, 'schools': out}
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(json.dumps({'schools': len(out), 'regions': len(regions), 'bytes': OUT.stat().st_size}))


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
