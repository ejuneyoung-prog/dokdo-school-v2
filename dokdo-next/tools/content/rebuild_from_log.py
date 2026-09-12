"""Rebuild a learner's record from the Google Sheet activity log.

Why this exists: the cloud save holds whatever a single device's v2 state had.
A learner who used v1 has their v1 progress in the v1 site's localStorage,
which v2 cannot read (browser storage is per-origin). The activity log is the
only place where both versions' answers sit side by side.

v1 and v2 are different question banks (v1 ids 1-863, v2 ids 920001-920240),
so there is no question-to-question mapping between them. There does not need
to be: a record's `m` map is keyed by question id and the app's lifetime
correct count sums every entry, so v1 and v2 entries coexist and add up.

This reads the log and writes one backup file per learner, which they restore
with the app's own "백업 불러오기". Nothing here invents an answer: every
entry comes from a logged row.

  python3 tools/content/rebuild_from_log.py activity.tsv --out rebuilt/
  python3 tools/content/rebuild_from_log.py activity.tsv --only "독코(Dokko)"

Nicknames are matched after trimming, NFC-normalising and case-folding, so
"독코(Dokko)" and "독코(dokko)" are the same person. Spelling variants that
are genuinely different strings (for example "독코(Doko)") are only merged
when you pass them with --alias.
"""
import argparse
import csv
import json
import pathlib
import unicodedata
from collections import defaultdict
from datetime import datetime, timezone

XP_PER_QUESTION = 10  # app-model.js: first correct answer on a question pays 10
GRADES = ['K', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'M1', 'M2', 'M3', 'H1', 'H2', 'H3',
          'U1', 'U2', 'U3', 'U4', 'MA1', 'MA2', 'PHD1', 'PHD2',
          'DK1', 'DK2', 'DK3', 'DK4', 'DK5', 'DK6', 'DK7', 'DK8', 'DK9']


def norm(name):
    return unicodedata.normalize('NFC', (name or '').strip()).casefold()


def read_rows(path):
    text = pathlib.Path(path).read_text(encoding='utf-8-sig')
    sample = text[:4096]
    delimiter = '\t' if sample.count('\t') > sample.count(',') else ','
    reader = csv.reader(text.splitlines(), delimiter=delimiter)
    rows = list(reader)
    if not rows:
        return []
    # The exported header may or may not be present.
    start = 1 if rows[0] and rows[0][1:2] == ['별명'] else 0
    return rows[start:]


def collect(rows, aliases):
    people = defaultdict(lambda: {'display': '', 'q': defaultdict(lambda: {'cor': 0, 'att': 0}),
                                  'grade': 'K', 'school': '', 'schoolCat': '', 'flag': 'KR'})
    skipped = 0
    for row in rows:
        if len(row) < 6:
            skipped += 1
            continue
        nick, flag, grade, qid, correct = row[1], row[2], row[3], row[4], row[5]
        key = aliases.get(norm(nick), norm(nick))
        if not key:
            skipped += 1  # anonymous rows cannot be attributed to anyone
            continue
        try:
            qid = int(str(qid).strip())
        except ValueError:
            skipped += 1
            continue
        person = people[key]
        person['display'] = person['display'] or unicodedata.normalize('NFC', nick.strip())
        entry = person['q'][qid]
        entry['att'] += 1
        if str(correct).strip() == '1':
            entry['cor'] += 1
        if grade in GRADES and GRADES.index(grade) > GRADES.index(person['grade']):
            person['grade'] = grade
        if flag.strip():
            person['flag'] = flag.strip()
        if len(row) > 9 and row[9].strip():
            person['school'] = row[9].strip()
        if len(row) > 11 and row[11].strip():
            person['schoolCat'] = row[11].strip()
    return people, skipped


def build_state(person, now):
    m = {}
    for qid, entry in sorted(person['q'].items()):
        if entry['cor'] <= 0:
            continue  # a question only ever answered wrong earns no record
        m[str(qid)] = {'lv': 1, 'cor': entry['cor'], 'att': entry['att'],
                       'seen': entry['att'], 'earned': XP_PER_QUESTION,
                       'lightBest': 1, 'courseLearned': True}
    return {
        'name': person['display'], 'nick': '', 'flag': person['flag'],
        'school': person['school'], 'schoolCat': person['schoolCat'], 'recoveryCode': '',
        'introDay': '', 'introOff': False, 'grade': person['grade'],
        'xp': XP_PER_QUESTION * len(m), 'streak': 0, 'gcHit': 0, 'gcSummons': 0,
        'run': 0, 'best': 0, 'started': True, 'passed': [], 'badgesEver': [],
        'recent': [], 'recentG': [], 'lastDay': '', 'm': m,
    }


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('log', help='activity log exported from the sheet (TSV or CSV)')
    p.add_argument('--out', default='rebuilt', help='directory for the backup files')
    p.add_argument('--only', action='append', default=[], help='rebuild just these nicknames')
    p.add_argument('--alias', action='append', default=[],
                   help='merge a spelling into another, as "독코(Doko)=독코(Dokko)"')
    args = p.parse_args()

    aliases = {}
    for pair in args.alias:
        if '=' not in pair:
            raise SystemExit('--alias needs the form "written=canonical"')
        written, canonical = pair.split('=', 1)
        aliases[norm(written)] = norm(canonical)

    people, skipped = collect(read_rows(args.log), aliases)
    wanted = {norm(x) for x in args.only}
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')
    out = pathlib.Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    report = []
    for key, person in sorted(people.items()):
        if wanted and key not in wanted:
            continue
        state = build_state(person, now)
        if not state['m']:
            continue
        backup = {'format': 'dokdo-school-backup', 'version': 1, 'exportedAt': now,
                  'language': 'ko', 'state': state}
        safe = ''.join(c for c in person['display'] if c.isalnum() or c in '()-_') or key
        (out / (safe + '.json')).write_text(json.dumps(backup, ensure_ascii=False), encoding='utf-8')
        report.append({'nickname': person['display'], 'questions': len(state['m']),
                       'correct': sum(r['cor'] for r in state['m'].values()),
                       'xp': state['xp'], 'grade': state['grade']})

    report.sort(key=lambda r: -r['correct'])
    print(json.dumps({'people': len(report), 'skipped_rows': skipped, 'records': report},
                     ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
