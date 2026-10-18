# 로그인 검토 · 2026-10-19

현재 상태: 구글·카카오·아이디/비밀번호 로그인은 연결하지 않았습니다. 첫 입장은 로그인 없이 배움터 또는 놀이터를 선택하도록 단순화합니다.

## 현재 기록 방식

현재 학습은 이 브라우저의 기록과 별명 기반의 기존 서버 저장·불러오기를 사용합니다. recoveryCode는 로컬/백업에 남지만 현행 서버 불러오기에서는 검증되지 않습니다. 따라서 별명 방식은 비밀번호 인증을 대신하지 않습니다. 놀이터는 `dokdo-island-play-v1`의 브라우저 저장을 사용하며 학습 서버 백업에 게임 기록이 포함되지 않습니다.

## 실제 계정 연동에 필요한 것

- 교수님 확인: ‘아이디와 비번’이 일반 회원가입인지, 예전 별명·복구번호 방식인지.
- 계정 인증 및 비공개 기록 저장소 연결. 학습과 게임을 함께 보관하되 별명이 같다는 이유로 기존 서버 기록을 새 계정에 자동 연결하지 않습니다. 이 기기의 기록을 계정에 옮길 때 한 번 확인합니다.
- Google 웹 Client ID와 허용 출처/리디렉션 및 동의 화면 설정. 서버에서 ID 토큰을 검증하고 `sub`로 계정을 식별합니다.
- 카카오 로그인 활성화와 Redirect URI 및 서버 토큰 처리 설정. 기존 카카오 공유 키만으로 로그인이 완성되지 않습니다.
- 개인정보 처리 안내·저장 범위 변경은 교수님 결정 후 진행합니다. 비밀번호·서버 비밀 값은 정적 웹 파일이나 이관팩에 넣지 않습니다.

## 공식 자료

- Google 앱 설정: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid
- Google 서버 검증: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
- 카카오 설정: https://developers.kakao.com/docs/ko/kakaologin/prerequisite
- 카카오 로그인 API: https://developers.kakao.com/docs/ko/kakaologin/rest-api

이번 작업에서는 인증 설정·운영 Apps Script·학생 공개 범위를 바꾸지 않았습니다.
