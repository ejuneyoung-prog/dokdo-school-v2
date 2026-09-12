# 독도 코리아 스쿨 — 문항 개편 1.2

2026-09-12. 현재 출제 240문항을 한국어·영어로 전수 교체한 콘텐츠 검토용 배포본입니다. 독립 교육 승인·기존 클라우드 이관·지도 수정이 완료된 정식 출시판으로 표시하지 않습니다.

## 빠르게 확인

`question-review.html`: 240문항을 단원/난이도/언어/번호로 찾아 질문·보기·개별 해설·출처 확인. 기록을 읽거나 바꾸지 않습니다.
`index.html`: 실제 앱 경로. 같은 사이트의 기존 새 앱 저장 키를 유지합니다.
`demo.html`: 가상 기록 시연. 실제 기록과 분리됩니다.

## 실제 바뀐 것

- 출처를 질문 밖으로 분리; 역사 주체·시기·대상을 필요한 경우 질문에 명시.
- 240개 새 ID 920001~920240. 이전 910001~910240은 보관하되 출제 제외.
- 711개 보기별 해설 쌍. 보기 고유 ID를 정답·해설과 연결.
- 필요한 자료는 인지단계와 관계없이 문제에 표시.
- 난이도와 실제 인지활동을 분리. 네 번째 변형이라고 자동 L4로 표시하지 않음.
- 원래 1,513문항·이전48문항은 재작성하지 않았고 출제 대상에서 제외된 보관 자료.

## 단일 원본과 재생성

실행 문항의 원본: `tools/content/authored-questions.json`.
출처 원본: `tools/content/source-registry.json`.

```sh
python tools/content/build_course.py
python tools/content/build_course.py --check
python -m unittest tests.test_content_gate -v
node --test tests/model.test.cjs tests/course-v2.test.cjs tests/clear-questions.test.cjs
node tests/migration.cjs test-results/migration.json
python tests/clear-browser.py --phase flow --mode http --engine chromium
python tests/clear-browser.py --phase matrix --mode http --engine chromium
python tests/clear-browser.py --phase screens --mode http --engine chromium
```

`data/course-v2.json`의 파일명은 기존 연결 호환용이며 내부 버전은 course-v3-clear입니다. 생성 파일이나 Excel만 손으로 수정하면 다음 빌드와 불일치하므로 원본 JSON을 바꾸고 재생성하십시오.

## 보존 및 미변경

저장 키 `dokdo-korea-school-cinematic-v1` 유지. 구형 문항 이력·불빛·봉화는 보존하지만, 예전 정답을 의미가 다른 새 문제의 숙달로 자동 옮기지 않습니다. 지도/등대/지형 이미지/동물 동선/운영 서버는 이번 작업에서 고치지 않았습니다.

## 검증 한계

`docs/VERIFICATION.ko.md`와 `evidence/`를 확인하십시오. 작성자의 문항별 자체 검토 및 자동 반례 검사입니다. 별도 교사·역사전문가·어린이 사용자의 승인 검사는 수행하지 않았습니다. 로컬 HTTP 접속이 차단된 환경에서 DOM/파일 검사는 실제 Chromium, 저장은 통제된 대역을 썼습니다. GitHub Actions의 실제 HTTP Chromium/WebKit 검사는 설정만 제공하며 원격 실행 완료를 뜻하지 않습니다.

폰트 파일은 포함하지 않습니다. 외부 웹폰트를 불러오지 못하면 대체 글꼴을 사용합니다.