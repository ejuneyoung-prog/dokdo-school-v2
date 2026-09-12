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

// 활동기록이 쌓이는 시트 이름입니다. 지금 쓰시는 시트 이름과 다르면
// 아래 따옴표 안만 실제 이름으로 바꿔 주세요.
var LOG_SHEET  = '활동기록';

// 아래 두 개는 없으면 자동으로 만들어집니다. 그대로 두셔도 됩니다.
var SAVE_SHEET = 'saves';
var TOP_SHEET  = 'tops';

var TZ = 'Asia/Seoul';

// 활동기록 시트의 열 순서입니다. 지금 시트와 같습니다.
var LOG_HEADERS = ['시각','별명','국가','학년','문항번호','정답','연속','최고연속','모드','학교','학교코드','학교부문'];
var TOP_HEADERS = ['별명','단계','정답수','도달시각','승인','승인시각'];
var SAVE_HEADERS = ['key','nick','grade','payload','updatedAt'];

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

function _logSheet_()  { return _sheet_(LOG_SHEET,  LOG_HEADERS); }
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

function _weekStart_() {
  var now = new Date();
  var day = Number(Utilities.formatDate(now, TZ, 'u')); // 월=1 … 일=7
  var d = new Date(now.getTime() - (day - 1) * 86400000);
  return Utilities.formatDate(d, TZ, 'yyyy-MM-dd');
}

function _dayOf_(d) { return Utilities.formatDate(d, TZ, 'yyyy-MM-dd'); }

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
function handleWeekly_() {
  var rows = _rows_(_logSheet_());
  var weekStart = _weekStart_();
  var now = new Date();

  var people = {};   // 별명 → {nick, school, correct, days:{}}
  var schools = {};  // 학교부문 → 학교이름 → {name, correct, people:{}}
  var recent = [];

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

    if (day >= weekStart) {
      var key = _norm_(nick);
      if (!people[key]) people[key] = { nick: nick, school: school, correct: 0, days: {} };
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

  return _json_({ week: week, schools: schoolOut, recent: recentOut, weekStart: weekStart });
}

// GET ?live=1 — 최근 참여 흐름만
function handleLive_(e) {
  if (!e || !e.parameter || e.parameter.live !== '1') return null;
  var rows = _rows_(_logSheet_());
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
  return _json_({
    found: true,
    key: String(best[0]),
    nick: String(best[1]),
    grade: String(best[2]),
    payload: String(best[3]),
    updatedAt: String(best[4])
  });
}

// POST {t:'save', nick, grade, payload}
function handleSave_(body) {
  if (!body || body.t !== 'save') return null;
  var nick = String(body.nick || body.key || '').trim().normalize('NFC');
  var payload = String(body.payload || '');
  if (!nick || !payload) return _json_({ ok: false });
  if (payload.length > 60000) return _json_({ ok: false, reason: 'too_large' });

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
  var row = [nick, nick, String(body.grade || ''), payload, new Date().toISOString()];
  if (rowIndex) sh.getRange(rowIndex, 1, 1, 5).setValues([row]);
  else sh.appendRow(row);
  return _json_({ ok: true });
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
