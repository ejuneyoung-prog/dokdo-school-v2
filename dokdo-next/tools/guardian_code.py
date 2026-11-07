#!/usr/bin/env python3
"""보호자 동의를 메일로 확인한 뒤 보낼 링크를 만듭니다. 코드 원문은 저장소에 넣지 않습니다."""
import hashlib, secrets

code = secrets.token_urlsafe(18)
digest = hashlib.sha256(('dokdo-guardian:' + code).encode()).hexdigest()
print('보호자에게 보낼 링크:')
print('https://dokdo-school-v2.vercel.app/dokdo-next/?guardian=' + code)
print('assets/site-config.js의 guardianConsentHashes에 넣을 값:')
print(digest)
