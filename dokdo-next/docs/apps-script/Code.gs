/**
 * 독도 코리아 스쿨 — 구글 시트 백엔드 (전체 파일)
 *
 * 쓰는 법: Apps Script 편집기에서 기존 내용을 모두 지우고 이 파일을 통째로
 * 붙여넣은 뒤 [배포 → 배포 관리 → 편집(연필) → 버전: 새 버전 → 배포].
 * 저장만 해서는 반영되지 않습니다. 배포 주소(/exec)는 그대로 유지됩니다.
 *
 * 되돌리기: Apps Script 편집기 오른쪽 위 [배포 관리]에서 이전 버전을 고르면
 * 됩니다. 편집기의 [파일 → 버전 기록]에도 이전 코드가 남아 있습니다.
 *
 * 이 파일이 처리하는 것
 *   GET  (기본)        주간 명예의 전당
 *   GET  ?live=1       최근 참여 흐름
 *   GET  ?load=별명    저장된 학습기록 불러오기
 *   GET  ?tops=1       승인된 최고 단계 도달자
 *   POST {t:'a'}       문제 하나 푼 기록 (활동기록 시트에 한 줄)
 *   POST {t:'save'}    학습기록 저장
 *   POST {t:'top'}     최고 단계 도달 보고 (승인 전까지 비공개)
 */

/* ===================== 설정 ===================== */

// 활동기록 시트는 이름을 고정하지 않고 찾아 씁니다. 첫 칸(A1)이 '시각'인
// 시트를 활동기록으로 봅니다. 이름을 잘못 적어 빈 시트를 새로 만들고 기존
// 기록을 못 읽는 사고를 막기 위해서입니다. 찾지 못했을 때만 아래 이름으로
// 새로 만듭니다.
var LOG_SHEET  = '기록';

// 아래 두 개는 없으면 자동으로 만들어집니다. 그대로 두셔도 됩니다.
var SAVE_SHEET = 'saves';
var TOP_SHEET  = 'tops';

var TZ = 'Asia/Seoul';

// 활동기록 시트의 열 순서입니다. 지금 시트와 같습니다.
var LOG_HEADERS = ['시각','별명','국가','학년','문항번호','정답','연속','최고연속','모드','학교','학교코드','학교부문'];
var TOP_HEADERS = ['별명','단계','정답수','도달시각','승인','승인시각'];
// payload2~4는 긴 기록용 이어쓰기 칸입니다. 구글 시트는 한 칸에 5만 자까지만
// 담을 수 있어서, 그보다 긴 기록은 나누어 저장하고 읽을 때 다시 이어 붙입니다.
var SAVE_HEADERS = ['key','nick','grade','payload','updatedAt','payload2','payload3','payload4'];
var CELL_LIMIT = 45000;   // 한 칸에 담는 최대 글자 수 (시트 한도 5만 자보다 여유 있게)
var SAVE_COLS = 8;

/* ===================== 공통 도구 ===================== */

function _json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// 별명 비교용 정규화: 앞뒤 공백 제거 + 유니코드 NFC + 대소문자 무시.
// 기기마다 한글 자모가 다르게 저장되는 문제 때문에 NFC가 꼭 필요합니다.
function _norm_(v) {
  return String(v == null ? '' : v).trim().normalize('NFC').toLowerCase();
}

function _sheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
  }
  return sh;
}

// 첫 칸이 '시각'인 시트를 모두 찾습니다. 이름이 무엇이든 상관없고, 예전에
// 다른 이름으로 쌓인 기록도 함께 읽히므로 한 줄도 잃지 않습니다.
function _logSheets_() {
  var all = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  var found = [];
  for (var i = 0; i < all.length; i++) {
    if (all[i].getLastRow() < 1) continue;
    var head = String(all[i].getRange(1, 1).getValue() || '').trim();
    if (head === '시각') found.push(all[i]);
  }
  if (!found.length) found.push(_sheet_(LOG_SHEET, LOG_HEADERS));
  return found;
}

// 새 기록은 줄이 가장 많은 시트, 즉 지금까지 써 오던 시트에 이어 붙입니다.
function _logSheet_() {
  var sheets = _logSheets_(), best = sheets[0];
  for (var i = 1; i < sheets.length; i++) {
    if (sheets[i].getLastRow() > best.getLastRow()) best = sheets[i];
  }
  return best;
}

// 읽을 때는 찾은 시트를 모두 합칩니다. 오래된 줄은 주간 집계에 쓰이지 않으므로
// 최근 것부터 일정 개수만 봅니다. 줄이 수만 개로 늘어나도 느려지지 않습니다.
var SCAN_LIMIT = 8000;
function _allLogRows_() {
  var sheets = _logSheets_(), out = [];
  for (var i = 0; i < sheets.length; i++) {
    var sh = sheets[i], last = sh.getLastRow();
    if (last < 2) continue;
    var start = Math.max(2, last - SCAN_LIMIT + 1);
    out = out.concat(sh.getRange(start, 1, last - start + 1, Math.max(12, sh.getLastColumn())).getValues());
  }
  return out;
}
function _saveSheet_() { return _sheet_(SAVE_SHEET, SAVE_HEADERS); }
function _topSheet_()  { return _sheet_(TOP_SHEET,  TOP_HEADERS); }

function _rows_(sh) {
  var last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
}

function _time_(v) {
  var d = (v instanceof Date) ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// 줄마다 Utilities.formatDate를 부르면 수천 줄에서 몇 초씩 걸려 응답이 끊깁니다.
// 한국 시간은 UTC+9로 고정이라 순수 계산으로 같은 값을 얻을 수 있습니다.
var KST_MS = 9 * 3600000;
function _dayOf_(d) { return new Date(d.getTime() + KST_MS).toISOString().slice(0, 10); }

function _weekStart_() {
  var k = new Date(Date.now() + KST_MS);
  var dow = (k.getUTCDay() + 6) % 7;   // 월요일=0
  return new Date(k.getTime() - dow * 86400000).toISOString().slice(0, 10);
}


/* ===================== 활동기록 쌓기 ===================== */

// POST {t:'a', nick, flag, grade, qid, ok, run, best, mode, school, schoolCode, schoolCat}
function handleEvent_(body) {
  if (!body || body.t !== 'a') return null;
  var nick = String(body.nick == null ? '' : body.nick).trim().slice(0, 60);
  if (!nick) return _json_({ ok: false });

  _logSheet_().appendRow([
    new Date(),
    nick,
    String(body.flag == null ? '' : body.flag).slice(0, 8),
    String(body.grade == null ? '' : body.grade).slice(0, 12),
    String(body.qid == null ? '' : body.qid).slice(0, 20),
    Number(body.ok) ? 1 : 0,
    Number(body.run) || 0,
    Number(body.best) || 0,
    String(body.mode == null ? '' : body.mode).slice(0, 20),
    String(body.school == null ? '' : body.school).slice(0, 60),
    String(body.schoolCode == null ? '' : body.schoolCode).slice(0, 20),
    String(body.schoolCat == null ? '' : body.schoolCat).slice(0, 4)
  ]);
  return _json_({ ok: true });
}

/* ===================== 주간 명예의 전당 ===================== */

// GET (기본) — 이번 주 별명별 정답수, 학교별 집계, 최근 참여자
// 집계 결과를 60초 동안 보관해 두고 그 사이 요청은 그대로 돌려줍니다.
// 여러 사람이 동시에 들어와도 시트를 매번 훑지 않아 응답이 끊기지 않습니다.
function handleWeekly_() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get('weekly');
  if (hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);

  var rows = _allLogRows_();
  var weekStart = _weekStart_();
  var now = new Date();

  var today = _dayOf_(new Date());
  // flag(국기)는 V1의 송출 화면(hall.html)이 이름 앞에 그려 쓰는 값입니다.
  // 이 화면과 V2가 같은 배포 주소를 함께 쓰므로 여기서 빠지면 방송에서
  // 국기가 사라집니다.
  var people = {};   // 별명 → {nick, flag, school, correct, days:{}}
  var schools = {};  // 학교부문 → 학교이름 → {name, correct, people:{}}
  var recent = [];
  var todayTries = 0, todayWho = {};   // 화면 위쪽 세 칸에 쓰입니다

  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var at = _time_(r[0]);
    if (!at) continue;
    var nick = String(r[1] || '').trim();
    if (!nick) continue;
    var ok = Number(r[5]) ? 1 : 0;
    var school = String(r[9] || '').trim();
    var cat = String(r[11] || '').trim().toUpperCase();
    var day = _dayOf_(at);

    if (day === today) { todayTries++; todayWho[_norm_(nick)] = true; }

    if (day >= weekStart) {
      var key = _norm_(nick);
      if (!people[key]) people[key] = { nick: nick, flag: '', school: school, correct: 0, days: {} };
      var fg = String(r[2] || '').trim();
      if (fg) people[key].flag = fg;
      if (school) people[key].school = school;
      people[key].correct += ok;
      people[key].days[day] = true;

      if (school && ['E','M','H','W'].indexOf(cat) >= 0) {
        if (!schools[cat]) schools[cat] = {};
        if (!schools[cat][school]) schools[cat][school] = { name: school, correct: 0, people: {} };
        schools[cat][school].correct += ok;
        schools[cat][school].people[key] = true;
      }
    }

    var minAgo = Math.floor((now.getTime() - at.getTime()) / 60000);
    if (minAgo >= 0 && minAgo <= 180) {
      recent.push({ nick: nick, flag: String(r[2] || ''), min: minAgo });
    }
  }

  var week = Object.keys(people).map(function (k) {
    return {
      nick: people[k].nick,
      flag: people[k].flag,
      school: people[k].school,
      correct: people[k].correct,
      days: Object.keys(people[k].days).length
    };
  }).sort(function (a, b) { return b.correct - a.correct; }).slice(0, 30);

  var schoolOut = {};
  ['E','M','H','W'].forEach(function (cat) {
    var m = schools[cat] || {};
    schoolOut[cat] = Object.keys(m).map(function (name) {
      return { name: name, correct: m[name].correct, people: Object.keys(m[name].people).length };
    }).sort(function (a, b) { return b.correct - a.correct; }).slice(0, 30);
  });

  // 같은 사람이 여러 줄이면 가장 최근 한 줄만 남깁니다.
  var seen = {}, recentOut = [];
  recent.sort(function (a, b) { return a.min - b.min; });
  for (var j = 0; j < recent.length; j++) {
    var k2 = _norm_(recent[j].nick);
    if (seen[k2]) continue;
    seen[k2] = true;
    recentOut.push(recent[j]);
    if (recentOut.length >= 20) break;
  }

  var payload = JSON.stringify({
    today: todayTries,                       // 오늘 문제를 푼 횟수
    people: Object.keys(todayWho).length,    // 오늘 참여한 사람 수
    people_week: Object.keys(people).length, // 이번 주 참여한 사람 수
    // weekStart는 V2가, weekOf는 V1 송출 화면이 읽습니다. 같은 값을 두 이름으로
    // 함께 내보내 두 화면 모두 깨지지 않게 합니다.
    week: week, schools: schoolOut, recent: recentOut,
    weekStart: weekStart, weekOf: weekStart });
  try { cache.put('weekly', payload, 60); } catch (e) {}
  return ContentService.createTextOutput(payload).setMimeType(ContentService.MimeType.JSON);
}

// GET ?live=1 — 최근 참여 흐름만
function handleLive_(e) {
  if (!e || !e.parameter || e.parameter.live !== '1') return null;
  var rows = _allLogRows_();
  var now = new Date();
  var out = [], seen = {};
  for (var i = rows.length - 1; i >= 0 && out.length < 20; i--) {
    var at = _time_(rows[i][0]);
    if (!at) continue;
    var nick = String(rows[i][1] || '').trim();
    if (!nick) continue;
    var k = _norm_(nick);
    if (seen[k]) continue;
    seen[k] = true;
    out.push({ nick: nick, flag: String(rows[i][2] || ''), min: Math.floor((now.getTime() - at.getTime()) / 60000) });
  }
  return _json_({ recent: out });
}

/* ===================== 학습기록 저장·불러오기 ===================== */

// GET ?load=별명
function handleLoad_(e) {
  if (!e || !e.parameter || !e.parameter.load) return null;
  var want = _norm_(e.parameter.load);
  if (!want) return _json_({ found: false });

  var rows = _rows_(_saveSheet_());
  var best = null;
  for (var i = 0; i < rows.length; i++) {
    if (_norm_(rows[i][0]) !== want) continue;
    if (!best || String(rows[i][4]) > String(best[4])) best = rows[i];
  }
  if (!best) return _json_({ found: false });
  var payload = String(best[3] || '')
    + String(best[5] || '') + String(best[6] || '') + String(best[7] || '');
  return _json_({
    found: true,
    key: String(best[0]),
    nick: String(best[1]),
    grade: String(best[2]),
    payload: payload,
    updatedAt: String(best[4])
  });
}

// POST {t:'save', nick, grade, payload}
function handleSave_(body) {
  if (!body || body.t !== 'save') return null;
  var nick = String(body.nick || body.key || '').trim().normalize('NFC');
  var payload = String(body.payload || '');
  if (!nick || !payload) return _json_({ ok: false });
  if (payload.length > CELL_LIMIT * 4) return _json_({ ok: false, reason: 'too_large' });

  var sh = _saveSheet_();
  var want = _norm_(nick);
  var last = sh.getLastRow();
  var rowIndex = 0;
  if (last >= 2) {
    var keys = sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < keys.length; i++) {
      if (_norm_(keys[i][0]) === want) { rowIndex = i + 2; break; }
    }
  }
  // 한 칸에 다 들어가지 않는 기록은 payload / payload2 / payload3 / payload4로
  // 잘라 담습니다. 불러올 때 순서대로 다시 이어 붙입니다.
  var parts = [];
  for (var c = 0; c < payload.length; c += CELL_LIMIT) parts.push(payload.substr(c, CELL_LIMIT));
  while (parts.length < 4) parts.push('');

  var row = [nick, nick, String(body.grade || ''), parts[0], new Date().toISOString(),
             parts[1], parts[2], parts[3]];
  if (rowIndex) sh.getRange(rowIndex, 1, 1, SAVE_COLS).setValues([row]);
  else sh.appendRow(row);
  return _json_({ ok: true, parts: parts.filter(function (p) { return p; }).length });
}

/* ===================== 최고 단계 도달자 ===================== */

// POST {t:'top', nick, level, correct}
// 기록만 합니다. 승인 칸이 비어 있으면 아무에게도 보이지 않습니다.
function handleTop_(body) {
  if (!body || body.t !== 'top') return null;
  var nick = String(body.nick == null ? '' : body.nick).trim().slice(0, 60);
  if (!nick) return _json_({ ok: false });

  var sh = _topSheet_();
  var rows = _rows_(sh);
  var want = _norm_(nick);
  for (var i = 0; i < rows.length; i++) {
    if (_norm_(rows[i][0]) === want) return _json_({ ok: true, already: true });
  }
  sh.appendRow([
    nick,
    String(body.level == null ? '' : body.level).slice(0, 40),
    Number(body.correct) || 0,
    Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm'),
    '',   // 승인 — 교수님이 '예'를 적으면 그때 공개됩니다
    ''
  ]);
  return _json_({ ok: true });
}

// GET ?tops=1 — 승인된 줄만. 정답수는 내보내지 않습니다(공개 주소이므로).
function handleTops_(e) {
  if (!e || !e.parameter || e.parameter.tops !== '1') return null;
  var rows = _rows_(_topSheet_());
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var ok = String(rows[i][4] == null ? '' : rows[i][4]).trim().toLowerCase();
    if (ok !== '예' && ok !== 'y' && ok !== 'yes') continue;
    out.push({ nick: String(rows[i][0]), level: String(rows[i][1]), at: String(rows[i][3]) });
  }
  return _json_({ tops: out.slice(-20) });
}

/* ===================== 입구 ===================== */

function doGet(e) {
  try {
    var r = handleTops_(e);  if (r) return r;
    r = handleLoad_(e);      if (r) return r;
    r = handleLive_(e);      if (r) return r;
    return handleWeekly_();
  } catch (err) {
    return _json_({ error: String(err) });
  }
}

function doPost(e) {
  try {
    var body = {};
    try { body = JSON.parse(e.postData.contents); } catch (parseErr) { body = {}; }
    var r = handleTop_(body);   if (r) return r;
    r = handleSave_(body);      if (r) return r;
    r = handleEvent_(body);     if (r) return r;
    return _json_({ ok: false, reason: 'unknown_request' });
  } catch (err) {
    return _json_({ ok: false, error: String(err) });
  }
}
