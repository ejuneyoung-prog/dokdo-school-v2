#!/usr/bin/env python3
"""독도 리듬 노트 만들기.

앱에 이미 있는 독도코리아 곡(assets/music/bgmN.mp3)의 박자와 강세를 분석해
assets/rhythm-charts.js 를 만든다. 생성물은 손으로 고치지 않는다.
박자가 어긋난 곳은 SONGS 의 설정(시작·끝·bpm 고정 등)을 고친 뒤 다시 만든다.

  python3 tools/rhythm/make_chart.py          # 다시 만들기
  python3 tools/rhythm/make_chart.py --check  # 생성물이 지금 분석과 같은지 확인(맥 afconvert 필요)

분석은 numpy 없이 표준 라이브러리만 쓴다. 맥의 afconvert 로 mp3 를 11025Hz 모노 WAV 로 푼다.
"""
import array, json, math, os, subprocess, sys, tempfile, wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets' / 'rhythm-charts.js'
RATE, HOP = 11025, 256
FPS = RATE / HOP

# 곡 목록. file 은 앱 배경음악과 같은 파일, title 은 site-config.js 의 곡 이름 그대로.
SONGS = [
    {'id': 'letsmove', 'file': 'assets/music/bgm4.mp3', 'title': "Let's Move", 'titleEn': "Let's Move"},
    {'id': 'history', 'file': 'assets/music/bgm1.mp3', 'title': '독도 히스토리 (리마스터)', 'titleEn': 'Dokdo History (Remastered)'},
    # 아리랑(가야금)은 박이 흔들려(박 정렬 74%) 빼고, 박이 또렷한 가야금 곡으로 바꿨다(11/15).
    {'id': 'gayageum', 'file': 'assets/music/bgm6.mp3', 'title': '독도의 역사 (가야금)', 'titleEn': 'Dokdo History (Gayageum)'},
]
# 난이도별 초당 노트 수 목표와 쓰는 박자 칸(1=정박만, 2=8분음표까지)
LEVELS = {'easy': {'density': 1.05, 'sub': 1, 'gap': 1}, 'normal': {'density': 2.1, 'sub': 2, 'gap': 1}}


def decode(path):
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, 'a.wav')
        subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16@%d' % RATE, '-c', '1', str(path), wav], check=True)
        with wave.open(wav) as w:
            data = array.array('h', w.readframes(w.getnframes()))
    if sys.byteorder != 'little':
        data.byteswap()
    return data


def bands(samples):
    """프레임마다 저음·고음 에너지. 한 극 저역 필터로 둘을 가른다."""
    lo_e, hi_e = [], []
    a = 1 - math.exp(-2 * math.pi * 250 / RATE)
    y = 0.0
    sl = sh = 0.0
    for i, s in enumerate(samples):
        x = s / 32768.0
        y += a * (x - y)
        h = x - y
        sl += y * y
        sh += h * h
        if (i + 1) % HOP == 0:
            lo_e.append(sl / HOP)
            hi_e.append(sh / HOP)
            sl = sh = 0.0
    return lo_e, hi_e


def onset_curve(lo_e, hi_e):
    lg = lambda v: math.log(v + 1e-7)
    lo = [lg(v) for v in lo_e]
    hi = [lg(v) for v in hi_e]
    env = [0.0]
    for i in range(1, len(lo)):
        env.append(max(0.0, lo[i] - lo[i - 1]) * 0.8 + max(0.0, hi[i] - hi[i - 1]))
    # 짧은 평활
    sm = [sum(env[max(0, i - 1):i + 2]) / len(env[max(0, i - 1):i + 2]) for i in range(len(env))]
    return sm, lo, hi


def at(env, t):
    """시각 t(초)의 값, 선형 보간."""
    f = t * FPS
    i = int(f)
    if i < 0 or i + 1 >= len(env):
        return 0.0
    return env[i] + (env[i + 1] - env[i]) * (f - i)


def peak(env, t, r=2):
    i = int(round(t * FPS))
    return max(env[max(0, i - r):i + r + 1] or [0.0])


def tempo(env, start, end):
    """bpm 과 첫 박 위치. 빗살(comb) 점수로 거친 탐색 → 세밀 탐색."""
    def score(bpm, phase):
        step = 60.0 / bpm
        t = start + phase
        s = n = 0
        while t < end:
            s += at(env, t) + 0.5 * at(env, t + step / 2)
            n += 1
            t += step
        return s / max(n, 1)

    best = (0, 0, 0)
    for b10 in range(800, 1650, 5):
        bpm = b10 / 10
        step = 60 / bpm
        for k in range(16):
            sc = score(bpm, step * k / 16)
            if sc > best[0]:
                best = (sc, bpm, step * k / 16)
    _, bpm0, ph0 = best
    for b100 in range(int(bpm0 * 100) - 60, int(bpm0 * 100) + 61, 1):
        bpm = b100 / 100
        step = 60 / bpm
        for k in range(-8, 9):
            ph = (ph0 + step * k / 64) % step
            sc = score(bpm, ph)
            if sc > best[0]:
                best = (sc, bpm, ph)
    return best[1], start + best[2]


def track(env, step, beat0, end, tight=400.0):
    """동적 계획법 박자 추적(Ellis 2007). 전체 bpm 을 기대값으로 두고, 곡 안에서 조금씩
    빨라지거나 느려지는 박을 따라간다. 반환값은 박 시각(초) 목록."""
    period = step * FPS
    top = sorted(env)[int(len(env) * 0.95)] or 1.0
    o = [v / top for v in env]
    n = min(len(o), int(end * FPS) + 1)
    first = max(0, int(beat0 * FPS - period / 2))
    score = [0.0] * n
    back = [-1] * n
    for t in range(first, n):
        best, arg = 0.0, -1
        lo_i, hi_i = int(t - 1.5 * period), int(t - 0.67 * period)
        for u in range(max(first, lo_i), max(first, hi_i + 1)):
            pen = math.log((t - u) / period)
            v = score[u] - tight * pen * pen
            if v > best or arg < 0:
                best, arg = v, u
        score[t] = o[t] + (best if arg >= 0 else 0.0)
        back[t] = arg
    # 끝 근처에서 점수가 가장 높은 곳부터 거꾸로
    tail = range(max(first, n - int(period)), n)
    t = max(tail, key=lambda i: score[i])
    out = []
    while t >= 0 and t >= first:
        out.append(t)
        t = back[t]
    out.reverse()
    # 프레임 해상도(23ms)를 넘어서도록 꼭짓점 보간
    res = []
    for f in out:
        if 0 < f < len(env) - 1:
            a, b, c = env[f - 1], env[f], env[f + 1]
            d = a - 2 * b + c
            f = f + (max(-0.5, min(0.5, 0.5 * (a - c) / d)) if d < -1e-9 else 0.0)
        res.append(f / FPS)
    # 프레임 단위 흔들림을 지운다: 앞뒤 4박씩, 박 번호에 대한 직선 맞춤 값을 쓴다(느린 빨라짐·느려짐은 남는다).
    smooth = []
    for i in range(len(res)):
        lo_i, hi_i = max(0, i - 4), min(len(res), i + 5)
        xs = list(range(lo_i, hi_i))
        ys = res[lo_i:hi_i]
        mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
        sxx = sum((x - mx) ** 2 for x in xs) or 1.0
        k = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sxx
        smooth.append(my + k * (i - mx))
    return smooth


def active_range(lo_e, hi_e):
    tot = [a + b for a, b in zip(lo_e, hi_e)]
    loud = sorted(tot)[int(len(tot) * 0.9)]
    th = loud * 0.03
    first = next(i for i, v in enumerate(tot) if v > th)
    last = len(tot) - 1 - next(i for i, v in enumerate(reversed(tot)) if v > th)
    return first / FPS, last / FPS


def local_norm(vals, times, win=8.0):
    out = []
    for i, t in enumerate(times):
        w = sorted(v for v, u in zip(vals, times) if abs(u - t) <= win / 2)
        ref = w[int(len(w) * 0.8)] if w else 1
        out.append(vals[i] / (ref + 1e-9))
    return out


def make(song):
    samples = decode(ROOT / song['file'])
    duration = len(samples) / RATE
    lo_e, hi_e = bands(samples)
    env, lo, hi = onset_curve(lo_e, hi_e)
    start, end = active_range(lo_e, hi_e)
    bpm, beat0 = tempo(env, start, end)
    step = 60.0 / bpm
    while beat0 - step >= start - step / 4:
        beat0 -= step
    beats = track(env, step, beat0, end)
    charts = {}
    for name, lv in LEVELS.items():
        sub = lv['sub']
        grid = []
        for k in range(len(beats) * sub):
            b = k // sub
            if k % sub == 0:
                t = beats[b]
            elif b + 1 < len(beats):
                t = (beats[b] + beats[b + 1]) / 2
            else:
                continue
            if start + 1.0 <= t <= end - 1.0:
                grid.append((k, t))
        raw = [peak(env, t) for _, t in grid]
        times = [t for _, t in grid]
        norm = local_norm(raw, times)
        # 정박·강박에 가산점: 마디 첫 박 > 정박 > 8분
        weight = []
        for (k, t), v in zip(grid, norm):
            beat_k = k / sub
            w = v
            if beat_k == int(beat_k):
                w *= 1.25
                if int(beat_k) % 4 == 0:
                    w *= 1.15
            weight.append(w)
        target = int((end - start) * lv['density'])
        order = sorted(range(len(grid)), key=lambda i: -weight[i])
        chosen = set()
        for i in order:
            if len(chosen) >= target:
                break
            if weight[i] < 0.35:
                break
            if any(j in chosen for j in range(i - lv['gap'], i + lv['gap'] + 1) if j != i) and sub == 1:
                continue
            chosen.add(i)
        idx = sorted(chosen)
        notes = []
        last_lane, run = -1, 0
        for n, i in enumerate(idx):
            k, t = grid[i]
            f = int(round(t * FPS))
            tilt = (hi[f] - lo[f]) if f < len(lo) else 0
            # 저음이 큰 소리는 왼쪽(D·F), 고음이 큰 소리는 오른쪽(J·K). 박 번호로 두 칸 중 하나.
            side = 0 if tilt < -1.0 else 2
            lane = side + (k // sub + n) % 2
            if lane == last_lane:
                run += 1
                if run >= 2:
                    lane = (lane + 1) % 4 if side == 0 else (lane + 3) % 4
                    run = 0
            else:
                run = 0
            last_lane = lane
            # 길게 누르기: 다음 노트까지 2박 이상 비고, 그 사이 소리가 이어지면
            length = 0
            nxt = grid[idx[n + 1]][1] if n + 1 < len(idx) else end
            if nxt - t >= 2 * step:
                f2 = int(round((t + step) * FPS))
                if f2 < len(lo) and lo[f2] + hi[f2] > lo[f] + hi[f] - 2.5:
                    length = min(2 * step, nxt - t - step)
            notes.append([int(round(t * 1000)), lane, int(round(length * 1000)) if length >= step * 0.9 else 0])
        charts[name] = notes
    return {
        'id': song['id'], 'title': song['title'], 'titleEn': song['titleEn'], 'file': './' + song['file'],
        'bpm': round(bpm, 2), 'duration': int(duration * 1000), 'easy': charts['easy'], 'normal': charts['normal'],
    }


def render(data):
    body = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    return ('/* 독도 리듬 노트 — tools/rhythm/make_chart.py 가 만든 생성물입니다. 손으로 고치지 마세요.\n'
            ' * 노트 한 개 = [시각(ms), 줄(0~3 = D·F·J·K), 길게 누르기 길이(ms, 0이면 짧은 노트)] */\n'
            "(function(root){const charts=%s;if(typeof module==='object'&&module.exports)module.exports=charts;else root.DokdoRhythmCharts=charts;})(typeof globalThis!=='undefined'?globalThis:this);\n" % body)


def main():
    data = [make(s) for s in SONGS]
    text = render(data)
    if '--check' in sys.argv:
        ok = OUT.read_text(encoding='utf-8') == text
        print(json.dumps({'charts': len(data), 'mode': 'check', 'same': ok}))
        sys.exit(0 if ok else 1)
    OUT.write_text(text, encoding='utf-8')
    for d in data:
        print(d['id'], 'bpm', d['bpm'], 'easy', len(d['easy']), 'normal', len(d['normal']), 'holds', sum(1 for n in d['normal'] if n[2]))


if __name__ == '__main__':
    main()
