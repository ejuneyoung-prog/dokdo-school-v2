# 최고 단계 도달자 — 교수님 확인 후 공개하기

최고 단계에 오른 사람이 생기면 **구글 시트에 먼저 기록만 됩니다.**
교수님이 시트에서 `승인` 칸에 `예`를 적어야 다른 사람 화면에 나갑니다.
승인 전에는 아무에게도 보이지 않습니다.

본인에게는 승인과 무관하게 자기 승급 축하가 바로 보입니다. 승인은
**남들에게 알릴지**만 결정합니다.

## 만들어지는 시트

`tops` 시트가 없으면 자동으로 만들어집니다.

| 별명 | 단계 | 정답수 | 도달시각 | 승인 | 승인시각 |
|---|---|---|---|---|---|
| 9to9 | 독코민 Lv.12 | 2640 | 2026-09-13 08:12 | | |

**교수님이 하실 일은 `승인` 칸에 `예`를 적는 것뿐입니다.** 그 줄만 공개됩니다.
취소하고 싶으면 `예`를 지우면 다시 숨겨집니다.

## 추가할 코드

기존 `doGet` / `doPost` 맨 앞에 한 줄씩만 더 얹습니다. 기존 코드는 그대로 둡니다.

```javascript
var TOP_SHEET = 'tops';
var TOP_HEADERS = ['별명', '단계', '정답수', '도달시각', '승인', '승인시각'];

function _topSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TOP_SHEET);
  if (!sh) {
    sh = ss.insertSheet(TOP_SHEET);
    sh.appendRow(TOP_HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
}

// POST {t:'top'} — 도달 사실만 적어 둡니다. 승인 칸은 비워 둡니다.
// 같은 사람이 여러 번 보내도 줄이 늘어나지 않도록 별명으로 확인합니다.
function handleTop_(body) {
  if (!body || body.t !== 'top') return null;
  var nick = String(body.nick == null ? '' : body.nick).trim().slice(0, 60);
  if (!nick) return _json_({ ok: false });

  var sh = _topSheet_();
  var rows = sh.getDataRange().getValues();
  var key = _normNick_(nick);
  for (var i = 1; i < rows.length; i++) {
    if (_normNick_(rows[i][0]) === key) return _json_({ ok: true, already: true });
  }
  sh.appendRow([
    nick,
    String(body.level == null ? '' : body.level).slice(0, 40),
    Number(body.correct) || 0,
    Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm'),
    '',   // 승인 — 교수님이 '예'를 적으면 공개됩니다
    ''
  ]);
  return _json_({ ok: true });
}

// GET ?tops=1 — 승인된 줄만 돌려줍니다. 승인 칸이 비어 있으면 보내지 않습니다.
function handleTops_(e) {
  if (!e || !e.parameter || e.parameter.tops !== '1') return null;
  var sh = _topSheet_();
  var rows = sh.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    var ok = String(rows[i][4] == null ? '' : rows[i][4]).trim();
    if (ok !== '예' && ok.toLowerCase() !== 'y' && ok.toLowerCase() !== 'yes') continue;
    out.push({ nick: String(rows[i][0]), level: String(rows[i][1]), at: String(rows[i][3]) });
  }
  return _json_({ tops: out.slice(-20) });
}
```

기존 함수에는 한 줄씩만 얹습니다.

```javascript
function doGet(e) {
  var tops = handleTops_(e);
  if (tops) return tops;
  var loaded = handleLoad_(e);       // 기록 불러오기 (이미 넣으신 것)
  if (loaded) return loaded;
  /* ... 기존 주간순위/라이브 코드 그대로 ... */
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) { body = {}; }
  var top = handleTop_(body);
  if (top) return top;
  var saved = handleSave_(body);     // 기록 저장 (이미 넣으신 것)
  if (saved) return saved;
  /* ... 기존 활동기록(t:'a') 코드 그대로 ... */
}
```

`_normNick_`과 `_json_`은 `BACKUP-CODE-GS.md`에서 이미 넣으신 함수를 그대로 씁니다.
아직 안 넣으셨다면 그 문서의 함수를 먼저 붙여넣어 주세요.

## 반영 방법

**배포 → 배포 관리 → 편집(연필) → 버전: 새 버전 → 배포**를 눌러야 실제 주소에
반영됩니다. 저장만 해서는 바뀌지 않습니다. 배포 주소(`/exec`)는 그대로입니다.

## 확인하는 법

배포한 뒤 브라우저 주소창에 `/exec` 주소 뒤에 `?tops=1`을 붙여 열어 보세요.

- `{"tops":[]}` → 정상입니다. 아직 승인한 사람이 없다는 뜻입니다.
- 주간순위 내용이 나옴 → 코드가 반영되지 않았습니다. 새 버전으로 다시 배포하세요.

## 주의

- 승인 칸이 비어 있으면 **아무에게도 보이지 않습니다.** 기본이 비공개입니다.
- 이 주소는 공개되어 있어 누구나 `?tops=1`을 호출할 수 있습니다. 그래서
  승인한 줄만 내보내고, 정답수는 내보내지 않습니다. 시트에는 남습니다.
- 별명은 본인이 직접 적은 것만 저장됩니다. 이름·학교·나이는 이 시트로 가지
  않습니다.
