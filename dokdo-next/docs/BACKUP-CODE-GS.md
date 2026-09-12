# 기록 저장·불러오기 Apps Script 코드 (운영자용)

별명만으로 다른 기기에서 기록을 불러오려면, 운영자의 Apps Script(`Code.gs`)가
`?load=` GET과 `{t:'save'}` POST 두 가지를 처리해야 합니다.
앱(클라이언트)은 이미 이 규격대로 요청을 보내고 있습니다.

## 먼저 확인할 것 (10초)

브라우저 주소창에 아래를 그대로 붙여넣고 엔터를 쳐 보십시오.

```
https://script.google.com/macros/s/AKfycbxhkR93f7__AekcpkHyd-pzfNHcPeQQK8HhHrtcRW6sLanzJGhPI3B2LRksxqrs1Uzelw/exec?load=%EB%8F%85%EC%BD%94(Dokko)
```

응답이

- `{"found":false}` → `?load=` 분기는 **있음**. 저장된 행이 없는 것이므로 아래 **doPost** 쪽을 확인.
- `{"found":true,"payload":"..."}` → 서버는 정상. 앱 쪽 문제이므로 알려 주십시오.
- 주간 순위 JSON이나 그 밖의 다른 내용 → `?load=` 분기가 **없음**. 아래 코드를 추가해야 합니다.

## 추가할 코드

아래 두 조각을 **기존 `doGet`/`doPost`의 맨 앞**에 넣습니다.
기존 로직은 그대로 두고, 해당 요청일 때만 먼저 가로채서 응답하고 끝냅니다.

```javascript
var SAVE_SHEET = 'saves';   // 없으면 자동 생성됩니다

function _saveSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SAVE_SHEET);
  if (!sh) {
    sh = ss.insertSheet(SAVE_SHEET);
    sh.appendRow(['key', 'nick', 'grade', 'payload', 'updatedAt']);
  }
  return sh;
}

// 별명 비교용 정규화: 앞뒤 공백 제거 + 유니코드 NFC + 대소문자 무시.
// "독코(Dokko)"와 "독코(dokko)"가 같은 사람으로 취급됩니다.
function _normNick_(v) {
  return String(v == null ? '' : v).trim().normalize('NFC').toLowerCase();
}

function _json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- doGet 맨 앞에 넣을 부분 ---
function handleLoad_(e) {
  if (!e || !e.parameter || !e.parameter.load) return null;
  var want = _normNick_(e.parameter.load);
  if (!want) return _json_({ found: false });

  var sh = _saveSheet_();
  var last = sh.getLastRow();
  if (last < 2) return _json_({ found: false });

  var rows = sh.getRange(2, 1, last - 1, 5).getValues();
  // 같은 별명이 여러 번 저장돼 있으면 가장 최근 것을 돌려줍니다.
  var best = null;
  for (var i = 0; i < rows.length; i++) {
    if (_normNick_(rows[i][0]) !== want) continue;
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

// --- doPost 맨 앞에 넣을 부분 ---
function handleSave_(body) {
  if (!body || body.t !== 'save') return null;
  var nick = String(body.nick || body.key || '').trim().normalize('NFC');
  var payload = String(body.payload || '');
  if (!nick || !payload) return _json_({ ok: false });
  if (payload.length > 60000) return _json_({ ok: false, reason: 'too_large' });

  var sh = _saveSheet_();
  var last = sh.getLastRow();
  var want = _normNick_(nick);
  var rowIndex = 0;
  if (last >= 2) {
    var keys = sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < keys.length; i++) {
      if (_normNick_(keys[i][0]) === want) { rowIndex = i + 2; break; }
    }
  }
  var row = [nick, nick, String(body.grade || ''), payload, new Date().toISOString()];
  if (rowIndex) sh.getRange(rowIndex, 1, 1, 5).setValues([row]);
  else sh.appendRow(row);
  return _json_({ ok: true });
}
```

기존 함수에는 이렇게 한 줄씩만 얹으면 됩니다.

```javascript
function doGet(e) {
  var loaded = handleLoad_(e);
  if (loaded) return loaded;
  /* ... 기존 주간순위/라이브 코드 그대로 ... */
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) { body = {}; }
  var saved = handleSave_(body);
  if (saved) return saved;
  /* ... 기존 활동기록(t:'a') 코드 그대로 ... */
}
```

## 반영 방법

코드를 붙여넣은 뒤 **배포 → 배포 관리 → 편집(연필) → 버전: 새 버전 → 배포**를
눌러야 실제 주소에 반영됩니다. 저장만 해서는 바뀌지 않습니다.
배포 주소(`/exec`)는 그대로 유지됩니다.

## 주의

- 이 주소는 공개되어 있으므로 누구나 호출할 수 있습니다. 별명만 알면 그 사람의
  학습 기록을 불러올 수 있다는 뜻입니다. 지금 저장하는 내용은 학습 진도·점수뿐이고
  개인정보가 아니지만, 이 점은 알고 계셔야 합니다.
- `payload`는 앱이 만든 백업 문자열(JSON)입니다. 서버는 내용을 해석하지 않고
  그대로 보관했다가 그대로 돌려주면 됩니다.
