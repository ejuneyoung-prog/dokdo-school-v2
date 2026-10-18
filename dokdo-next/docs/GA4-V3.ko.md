# V3 GA4 · 2026-10-19

교수님 요청에 따라 기존 공용 GA4 G-WJM7KL33ST를 유지하며 메인과 놀이터를 연결합니다. 기존에는 첫 학습 이벤트 전까지 태그가 로딩되지 않았고 게임은 태그를 로딩하지 않았습니다. 이제 첫 페이지 로드부터 페이지 조회를 보내며, 여러 이벤트가 발생해도 태그/설정을 한 번만 실행합니다.

## 측정

- navigation_click: destination은 learn/play/info/channel/live/video/account/weather, placement는 main/nav/menu/learning/info/channel/playground/result 중 고정값입니다. 버튼·썸네일의 제목이나 URL은 보내지 않습니다.
- game_start/game_resume: 새 놀이와 보관한 놀이를 구분합니다. 빠른 중복 클릭은 시작 진행 잠금으로 막고 저장 트랜잭션 결과로 분류합니다.
- game_complete: 정상 저장 후 score·round·lines·reason(time/no-space/collision/manual)을 보냅니다. 다른 게임으로 바꾸며 수동 종료하는 경우도 포함합니다.
- round_complete: 라운드 완료 저장 후 runner·round·score를 보냅니다.
- 기존 question_answered/placement_done/lesson_complete/grade_up/share_click는 유지합니다. 모든 기존 독코민 DK1~DK12 등급도 보존합니다.

## 제외·개인정보

운영 호스트의 학교 메인/index.html과 games.html만 허용합니다. 로컬·Vercel 미리보기·시연·휴대용 미리보기·계정 페이지는 제외합니다. 계정 화면에는 GA 스크립트 자체가 없습니다.

이벤트 이름과 매개변수를 고정 목록으로 제한하고 점수·라운드는 유효한 정수만 허용합니다. 아이디·이메일·별명·학교·비밀번호·세션토큰·사용자 ID·문항 본문·선택지·자유 텍스트를 붙이지 않습니다. 페이지 주소의 query/hash와 referrer 경로를 제거합니다. 기존 공유 UTM 4가지(link/yt_live/os_share/kakao, medium=share)만 고정 campaign 값으로 보존합니다. Google Signals와 광고 개인화는 꺼진 설정을 유지합니다.

실제 GA 관리 화면에서 기존 스트림 ID 15723202321과 측정 ID를 확인했습니다. 향상된 측정은 페이지 로드와 스크롤만 남기고 자동 검색·폼·이탈 링크·동영상·다운로드·히스토리 변경 측정은 껐습니다. 자동 링크 수집 대신 위 고정 destination 클릭만 집계합니다. 이 스트림은 기존 앱 공용이므로 변경은 분석 항목에 공통 적용되며 앱/기록/순위/QR은 바꾸지 않습니다. UI 증빙은 이관팩 화면/GA4_설정.png입니다.

## 검사·복구

단위검사에서 최초 방문 태그 1회, 이벤트 필터, 주소 정리, 전체 학년 코드, 고정 공유 UTM 보존, 계정/로컬/미리보기 차단을 검사합니다. 독립검수에서 발견한 최고등급 누락·시작 중복·전환 종료 누락을 수정했습니다. 가짜 큐 검사는 실제 GA 수신 증명이 아니므로 배포 후 실시간 화면에서 별도로 확인합니다.

반영 전 기준은 693ca159052c481322701dc4963845063c01a069이며 GA PR 병합 커밋을 git revert -m 1하는 별도 PR로 코드 복구합니다. 분석 설정은 위 자동 항목을 다시 켜서 되돌릴 수 있으나 개인정보 최소 수집을 위해 유지하는 것을 권합니다.
