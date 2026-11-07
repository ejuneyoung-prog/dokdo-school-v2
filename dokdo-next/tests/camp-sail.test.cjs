'use strict';
// 힐링 공간 자동 항해: 실제 독도 지형 자료로 섬 지도를 다시 만들고, 배가 멈추지 않고 섬을 도는지 본다.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sail = require('../camp/sail.js');

const healing = fs.readFileSync(path.join(__dirname, '..', 'camp', 'healing.js'), 'utf8');

// healing.js와 같은 계산으로 땅 칸을 만든다(그 파일의 지형·선착장·독립문바위·보찰바위 칸).
function island() {
  const M = JSON.parse(healing.match(/^const M=(\{[^}]+\});/m)[1]);
  const HB = Buffer.from(healing.match(/const HB=atob\("([^"]+)"\)/)[1], 'base64').toString('latin1');
  const CELL = 12, c = Math.cos(M.th), n = Math.sin(M.th), raw = (k) => HB.charCodeAt(k) / 255 * 176 - 4;
  const V = []; let ax = 0, an = 0; const xs = [];
  for (let j = 0; j < M.h; j++) for (let i = 0; i < M.w; i++) {
    const k = j * M.w + i, px = i * M.step - M.cx, py = j * M.step - M.cy;
    const x = (c * px - n * py) * M.s, z = (n * px + c * py) * M.s, y = raw(k);
    V.push([x, y, z]); if (y > 30 && x > 0) { ax += x; xs.push(z); an++; }
  }
  const dx = ax / an, dz = xs.reduce((a, b) => a + b, 0) / an;
  V.forEach((v) => { if (v[0] > 30) { v[0] = dx + (v[0] - dx) * 1.25; v[2] = dz + (v[2] - dz) * 1.25; } });
  const block = new Set(); let peakW = [0, 0, 0];
  V.forEach(([x, y, z]) => { if (y > .5) block.add(Math.round(x / CELL) + ',' + Math.round(z / CELL)); if (x < 30 && y > peakW[1]) peakW = [x, y, z]; });
  const BC = [peakW[0] - 318, peakW[2] + 235];
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) block.add((Math.round(BC[0] / CELL) + a) + ',' + (Math.round(BC[1] / CELL) + b));
  const toW = (ix, iy) => { const px = ix * 1.156 - M.cx, py = iy * 1.156 - M.cy; let x = (c * px - n * py) * M.s, z = (n * px + c * py) * M.s; if (x > 30) { x = dx + (x - dx) * 1.25; z = dz + (z - dz) * 1.25; } return [x, z]; };
  const [ax2, az2] = toW(840, 215), [bx, bz] = toW(735, 195);
  for (let i = -1; i <= 8; i++) { const u = i / 8; block.add(Math.round((ax2 + (bx - ax2) * u) / CELL) + ',' + Math.round((az2 + (bz - az2) * u) / CELL)); }
  { const [x, z] = toW(195, 250); block.add(Math.round(x / CELL) + ',' + Math.round(z / CELL)); }
  const hit = (x, z) => { const a = Math.round(x / CELL), b = Math.round(z / CELL); for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) if (block.has((a + i) + ',' + (b + j))) return true; return false; };
  const cells = [...block].map((k) => k.split(',').map((q) => +q * CELL));
  return { hit, cells, BC, peakW };
}

const map = island();
const C = sail.center(map.cells), ctr = [C.x, C.z];

// 자동 항해를 켜고 dt마다 한 걸음씩. 멈춘 시간이 가장 긴 구간과 섬을 돈 바퀴 수를 센다.
function voyage(start, seconds) {
  const me = { x: start[0], z: start[1], r: 0, tx: null, tz: null }, plan = { auto: true, route: [] };
  sail.next(me, plan, map.hit, ctr);
  const dt = 1 / 30; let lastA = Math.atan2(me.x - ctr[0], me.z - ctr[1]), turn = 0, still = 0, worst = 0, px = me.x, pz = me.z, inside = 0;
  for (let t = 0; t < seconds; t += dt) {
    const mv = sail.steer(me, plan, dt, map.hit, ctr);
    sail.move(me, plan, mv, dt, map.hit, ctr, 2600);
    if (map.hit(me.x, me.z)) inside++;
    const a = Math.atan2(me.x - ctr[0], me.z - ctr[1]); turn += sail.wrap(a - lastA); lastA = a;
    if (Math.hypot(me.x - px, me.z - pz) < 1.5 * dt * 42 * .3) { still += dt; worst = Math.max(worst, still); } else still = 0;
    px = me.x; pz = me.z;
    if (me.tx == null) return { laps: Math.abs(turn) / (Math.PI * 2), worst, inside, dead: t };
  }
  return { laps: Math.abs(turn) / (Math.PI * 2), worst, inside, dead: null };
}

test('orbit points stay off the island and every leg is clear water', () => {
  const pts = sail.orbit(map.hit, ctr[0], ctr[1], -40, 1050);
  assert.equal(pts.length, 60);
  for (let i = 0; i < 60; i++) {
    const a = pts[i], b = pts[(i + 1) % 60];
    assert.ok(!map.hit(a[0], a[1]), 'point ' + i + ' on land');
    assert.ok(sail.clear(map.hit, a[0], a[1], b[0], b[1]), 'leg ' + i + ' crosses land');
  }
});

test('the tiny rocks (보찰바위, 독립문바위) are inside the loop, not on it', () => {
  const pts = sail.orbit(map.hit, ctr[0], ctr[1], -40, 1050);
  const minD = (x, z) => Math.min(...pts.map((p) => Math.hypot(p[0] - x, p[1] - z)));
  assert.ok(minD(map.BC[0], map.BC[1]) > 40, '보찰바위 kept clear');
});

test('auto sail keeps going around the islands from many starting points', () => {
  const starts = [[-40, 1050], [map.peakW[0] - 420, map.peakW[2] + 200], [map.BC[0] - 60, map.BC[1] + 40], [ctr[0], ctr[1] + 700], [ctr[0] + 800, ctr[1]], [ctr[0] - 700, ctr[1] - 300]];
  starts.forEach((s, i) => {
    if (map.hit(s[0], s[1])) return;
    const r = voyage(s, 600);
    assert.equal(r.dead, null, 'start ' + i + ' lost its route');
    assert.equal(r.inside, 0, 'start ' + i + ' ran onto land');
    assert.ok(r.worst < 3, 'start ' + i + ' stood still ' + r.worst.toFixed(1) + 's');
    assert.ok(r.laps >= 2, 'start ' + i + ' laps ' + r.laps.toFixed(2));
  });
});

test('a boat pinned against the shore escapes instead of switching auto off', () => {
  // 서도 해안에 바짝 붙어 섬 쪽을 보고 선 배
  let s = null;
  for (let r = 0; r < 900 && !s; r += 4) { const x = map.peakW[0] - r, z = map.peakW[2]; if (!map.hit(x, z)) s = [x, z]; }
  // 목표가 섬 건너편에 걸린 채(예전 길의 남은 점) 자동 항해가 켜져 있다.
  const me = { x: s[0], z: s[1], r: -Math.PI / 2, tx: map.peakW[0] + 400, tz: map.peakW[2] }, plan = { auto: true, route: [] };
  let turn = 0, lastA = Math.atan2(me.x - ctr[0], me.z - ctr[1]);
  for (let t = 0; t < 120; t += 1 / 30) { const mv = sail.steer(me, plan, 1 / 30, map.hit, ctr); sail.move(me, plan, mv, 1 / 30, map.hit, ctr, 2600); assert.ok(!map.hit(me.x, me.z)); const a = Math.atan2(me.x - ctr[0], me.z - ctr[1]); turn += sail.wrap(a - lastA); lastA = a; }
  assert.ok(plan.auto && me.tx != null, 'still sailing');
  assert.ok(Math.abs(turn) > Math.PI, 'went on around the islands: ' + (turn / Math.PI / 2).toFixed(2) + ' laps');
});

test('island center sits between 동도 and 서도', () => {
  assert.ok(C.ext > 200 && C.ext < 1500, 'extent ' + C.ext);
  assert.ok(Math.hypot(C.x - map.peakW[0], C.z - map.peakW[2]) < C.ext);
});

test('manual tap sailing still stops at the shore (no wall sliding outside auto)', () => {
  const me = { x: map.peakW[0] - 600, z: map.peakW[2], r: 0, tx: map.peakW[0], tz: map.peakW[2] }, plan = { auto: false, route: [] };
  for (let t = 0; t < 60 && me.tx != null; t += 1 / 30) { const mv = sail.steer(me, plan, 1 / 30, map.hit, ctr); sail.move(me, plan, mv, 1 / 30, map.hit, ctr, 2600); }
  assert.equal(me.tx, null);
  assert.ok(!map.hit(me.x, me.z));
});

test('page loads sail.js before healing.js and healing uses it', () => {
  const page = fs.readFileSync(path.join(__dirname, '..', 'camp', 'index.html'), 'utf8');
  assert.ok(page.indexOf('./sail.js') > 0 && page.indexOf('./sail.js') < page.indexOf('./healing.js'));
  assert.match(healing, /const SAIL=window\.DokdoSail/);
  assert.match(healing, /SAIL\.move\(/);
  assert.match(healing, /SAIL\.steer\(/);
});
