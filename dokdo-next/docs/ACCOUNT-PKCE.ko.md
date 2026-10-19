# 공개 전 인증 경계 보강 · 2026-10-19

현재 공개판은 kakaoEnabled/privateRecordsEnabled:false를 유지합니다. 새 두 기능을 활성화하면 인증은 별도 dokdo-account-session-v2의 PKCE로 분리합니다. 기존 v1 세션을 승계하지 않아 한 번 다시 로그인해야 합니다. 이메일·비밀번호 및 학습·게임 저장 키는 유지합니다. 두 설정이 false인 기존 이메일 판은 기존 v1 동작을 유지합니다.

개인 보관함의 RLS와 수동 저장 체크만으로 로그인 CSRF를 막을 수는 없습니다. URL에 다른 사람의 유효 JWT를 넣어 계정을 바꾸게 하는 경로를 차단합니다. 보안 모드는 URL 자동 세션 수입을 끄며 query/fragment의 access_token·refresh_token·provider_token·provider_refresh_token은 수입하지 않습니다. code는 query 단일값만 허용하고, 고정 SDK exchangeCodeForSession이 브라우저에 보관한 verifier로 교환한 뒤 서버 getUser와 일치해야 합니다. S256 challenge만 허용하며 plain fallback은 거절합니다. code/hash는 주소창에서 제거합니다.

verifier 부재·다른 브라우저·재사용·교환 실패에서 이전 세션으로 성공 처리하지 않습니다. 보관함 연결은 닫되 일반 이메일 로그인과 새 링크 요청은 열어 둡니다. 복구는 SDK가 검증한 PASSWORD_RECOVERY 또는 교환 결과 redirectType만 인정합니다. 교환 도중 다른 계정/로그아웃 이력은 SDK 자체 SIGNED_IN이 나중에 와도 거절합니다. 비밀번호 변경 뒤 USER_UPDATED가 성공을 옛 URL 힌트의 실패로 바꾸지 않아야 합니다.

SDK가 getUser 검증 전에 세션을 저장할 수 있어 화면 거절만으로 충분하지 않습니다. 보안 모드는 dokdo-account-session-v2-accepted-user에 명시적 로그인 검증을 수락한 UID만 기록합니다. 교환 전에 이를 제거하며, 종료·새로고침 뒤 승인 표시 없는 SDK 세션은 보관함에 연결하지 않습니다. getUser 검증 후 현재 SDK 세션 토큰·UID와 revision/disposed를 같은 Web Lock 안에서 다시 확인한 뒤 승인합니다. passive 이벤트와 토큰 갱신은 새로운 UID 승인을 만들지 않습니다. 토큰 사본은 만들지 않습니다.

고정 SDK 2.118.0은 기본적으로 lockless이므로 모든 v2 인증 클라이언트에 명시적으로 같은 exclusive auth.lock을 전달합니다. 거절 세션 정리는 같은 잠금 안에서 정확히 일치하는 SDK 토큰만 제거하고 새 B 계정의 세션·승인 표시를 보존합니다. 잠금·승인 저장소가 지원되지 않거나 승인 읽기/쓰기/제거가 실패하면 연결을 닫습니다. 이는 독도스쿨 보관함의 계정 귀속 보호이며 카카오 전체 토큰 폐기나 다른 기기의 전역 로그아웃을 뜻하지 않습니다.

이전 implicit 메일 링크는 보안 모드에서 수입하지 않습니다. 이메일로 일반 로그인하거나 해당 브라우저에서 새 재설정 링크를 요청합니다. PKCE 메일 링크는 요청한 브라우저에서 열도록 안내합니다. 메일·비밀번호 자체를 바꾸거나 학습·게임 진도를 초기화하지 않습니다.

실제 vendored SDK 2.118.0을 가짜 HTTP 응답으로 실행해 recovery verifier와 PASSWORD_RECOVERY/redirectType, verifier 소모 및 재사용 거절을 검사합니다. 외부 인증 요청과 실제 자격정보는 사용하지 않습니다. 이는 실제 카카오 동의·로그인이나 실제 가입메일 실기를 대신하지 않습니다.

교수님 승인 후 실제 DB 설치 및 A/B/익명 격리·CAS·직접쓰기 차단·가상 자료 rollback을 확인했습니다. 카카오 앱 ON·닉네임 선택 동의·정확한 callback/복귀 URI도 등록했습니다. 교수님이 코드 재발급과 Supabase 입력·저장을 완료했다고 알려주셨고, 제공자 목록의 Kakao ENABLED를 확인했습니다. 실제 로그인 검증 전이며 공개 기능은 false입니다. 화면의 기존 비밀 값이 가림 없이 출력된 사고를 알리고 관련 두 코드 재발급을 요청했습니다. 값은 문서·소스·이관팩에 넣지 않습니다.

비공개 localhost 시험본에서 실제 PKCE 카카오 로그인→놀이터 복귀와 이메일 없는 계정의 개인 DB 저장을 확인했습니다. 최신 승인 표시 보강 후 실기를 다시 확인해야 합니다. 카카오 연결해제 웹훅과 스쿨 계정 탈퇴·기록 보관/삭제 처리 절차도 별도로 확정해야 합니다. 카카오 연결해제를 스쿨 로그아웃이나 전체 기록 즉시 삭제로 안내하지 않습니다. 이메일도 연결된 사용자는 카카오 해제만으로 계정 전체를 삭제하지 않습니다.

기준 태그 before-account-pkce-20261019. 공개 설정 false를 유지하며 이 보강을 배포합니다. 병합 커밋을 git revert -m 1로 되돌릴 수 있으나 계정 보관함을 공개할 때는 이 취약점을 다시 열지 않도록 해야 합니다.

공식 안내: https://supabase.com/docs/guides/auth/sessions/pkce-flow
