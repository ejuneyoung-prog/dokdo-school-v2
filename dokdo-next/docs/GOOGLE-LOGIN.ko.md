# 구글 로그인 켜는 순서

코드는 준비되어 있고 `assets/account-config.js`의 `googleEnabled:false`로 꺼져 있습니다. 설정과 실제 로그인 확인이 끝나기 전에는 켜지 않습니다.

## 1. Google Cloud
1. Google Auth Platform의 Branding, Audience, Data Access를 채웁니다. 범위는 openid, email, profile만 씁니다.
2. Clients에서 웹 애플리케이션을 만듭니다.
3. 승인된 JavaScript 원본: `https://dokdo-school-v2.vercel.app`
4. 승인된 리디렉션 URI: `https://cqlvhrodebmhxbrhlmzu.supabase.co/auth/v1/callback`

## 2. Supabase
1. Authentication > Providers > Google에 Client ID와 Secret을 넣습니다. 교수님이 직접 넣습니다.
2. Authentication > URL Configuration의 Redirect URLs에 `https://dokdo-school-v2.vercel.app/dokdo-next/account.html**`를 더합니다.
   복귀 주소는 목적지마다 달라서 끝의 별표가 필요합니다.
   - `account.html?oauth=google&next=.%2F`
   - `account.html?oauth=google&next=games.html`
   - `account.html?oauth=google&next=camp%2F`

## 3. 켜기 전 확인
1. 미리 보기에서 `googleEnabled:true`로 세 목적지 모두 실제 로그인이 끝나는지 봅니다.
2. 카카오톡 안의 브라우저에서 구글 로그인이 열리는지 봅니다. 막히면 이메일 로그인이 대안입니다.
3. 브라우저 저장소의 세션에 `provider_token`이 남는지 봅니다.

## 4. 켜면 달라지는 것
- 세션 저장 키가 `dokdo-account-session-v2`로 바뀝니다. 기존 이메일 로그인 사용자는 한 번 로그아웃되고, 계정 화면을 여는 순간 옛 세션이 지워집니다.
- 보안 모드는 `navigator.locks`가 없는 브라우저에서 이메일 로그인도 닫습니다.
- 끄면 계정 화면을 여는 순간 새 방식 세션을 지웁니다.

## 5. 나이 확인
가입과 소셜 로그인 앞의 만 14세 확인은 본인 확인일 뿐 기록이 남지 않습니다. 동의 기록을 남길지는 켜기 전에 결정합니다.
