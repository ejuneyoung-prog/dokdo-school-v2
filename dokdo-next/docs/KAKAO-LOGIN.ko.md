# 카카오 로그인 연결 준비 · 2026-10-19

운영 이메일 가입·재설정은 유지합니다. 카카오 버튼은 별도 kakaoEnabled 설정이 true일 때만 보입니다. 현재 false이며 실제 카카오 로그인 성공으로 보고하지 않습니다.

## 연결 대상과 최소 동의

기존 V2 카카오 앱 1576282(독도코리아스쿨v2)를 사용합니다. V1 앱은 변경하지 않습니다. Supabase 프로젝트는 cqlvhrodebmhxbrhlmzu입니다. callback은 https://cqlvhrodebmhxbrhlmzu.supabase.co/auth/v1/callback 입니다.

카카오 기본 동의는 닉네임(profile_nickname)만 요청합니다. 카카오 이메일·프로필 사진·친구·채팅 권한은 요청하지 않습니다. Supabase Kakao 제공자의 기본 scope에 이메일이 포함되므로 options.scopes로 추가하지 않고 queryParams.scope로 최소 scope를 지정합니다. 공개 Auth 소스 기준으로 이 옵션이 기본 scope를 덮어쓰지만, 운영 Auth의 실제 동의 화면에서 최종 검증해야 합니다. Supabase의 Allow users without an email 설정이 필요합니다.

REST API 키와 Client Secret은 서버 설정에만 입력합니다. 새 비밀 키의 발급·입력·동의 승인은 교수님이 직접 합니다. 비밀 값은 저장소·문서·로그·채팅에 보관하지 않습니다.

## 운영자 마지막 절차

1. 카카오 앱의 카카오 로그인 활성화·닉네임 동의 및 위 callback 등록을 확인합니다.
2. Supabase Kakao 제공자에 REST API 키·Client Secret을 직접 입력하고, 이메일 없는 계정을 허용합니다. 기존 이메일 redirect는 유지하고 아래 두 URL을 추가합니다.
3. 교수님이 직접 최소 동의 화면과 두 입구 로그인을 시험한 뒤 kakaoEnabled를 true로 배포합니다. 동의 거절·이메일 없는 계정·기존 이메일 로그인·재설정도 확인합니다.

- https://dokdo-school-v2.vercel.app/dokdo-next/account.html?oauth=kakao&next=.%2F
- https://dokdo-school-v2.vercel.app/dokdo-next/account.html?oauth=kakao&next=games.html

## 계정·안전 경계

같은 닉네임으로 계정을 합치지 않습니다. 이메일 로그인과 카카오 로그인은 별도 계정일 수 있습니다. Supabase의 서버 확인 getUser가 반환한 사용자 ID와 세션이 일치한 뒤만 로그인으로 표시합니다. 이메일이 없는 카카오 사용자를 이메일 확인 완료로 표시하지 않습니다. 동의 취소와 오류는 기존 세션보다 우선하며 자동 이동하지 않습니다. URL에는 고정된 두 복귀 경로만 사용합니다. 오류 원문·토큰을 화면·측정으로 보내지 않습니다.

이 기기에서 로그아웃은 Supabase의 local signOut이며 카카오 계정 탈퇴나 카카오 동의 철회가 아닙니다. 앱 연결 해제는 카카오 계정의 연결 서비스 관리에서 할 수 있습니다. 실제 공개 전 서비스 개인정보 안내와 계정 삭제 문의 경로도 운영자가 확인합니다.

## 버튼 출처

공식 제공 SVG 원본을 수정 없이 보관했습니다.
- https://developers.kakao.com/tool/images/resource/preview/login-complete-ko.svg
- https://developers.kakao.com/tool/images/resource/preview/login-complete-en.svg
- https://developers.kakao.com/docs/ko/kakaologin/design-guide
- https://supabase.com/docs/guides/auth/social-login/auth-kakao

## 되돌리기

기준 태그 before-kakao-login-20261019를 남깁니다. kakaoEnabled:false로 즉시 입구를 숨길 수 있고 이메일 로그인은 유지됩니다. 이 변경의 병합 커밋은 git revert -m 1로 되돌릴 수 있습니다. 제공자 연결 해제는 코드 되돌림과 별개로 교수님 확인 후 진행합니다.
