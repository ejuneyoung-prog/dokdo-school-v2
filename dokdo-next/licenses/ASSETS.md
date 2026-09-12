# 자산 출처와 공개 범위

## 사용자 승인 그림
- 원본: 이 대화에서 생성되어 사용자가 승인한 독도 코리아 스쿨 조감도.
- `approved-concept.webp`: 승인 그림의 참고 사본. 실제 화면 배경으로 통째로 사용하지 않습니다.
- `dokdo-islands.webp`: 승인 그림에서 섬·바위 부분을 마스킹해 추출. 글자와 시설 핀은 제거/보정했습니다.
- `sea-texture.webp`: 승인 그림의 작은 바다 부분을 대칭 연결해 만든 무늬.
- 런타임 불빛·물고기·고래·강치·새는 코드로 그립니다.
- 이 그림은 실제 지형 측량 결과나 사진이 아닙니다. 지도 자료의 정확성을 입증하는 근거로 사용하지 않습니다.

## 윤곽 비교
- 원자료 페이지: https://dokdo.mofa.go.kr/kor/introduce/location.jsp
- 비교한 원본 형상 그림: https://dokdo.mofa.go.kr/m/kor/img/contents/location_img01.jpg
- 공식 그림 하단의 두 섬을 각각 눈으로 대조해 경계 굴곡을 단순화했습니다.
- 공식 지도 이미지 파일을 이 패키지에 복사하지 않았습니다.
- 산출물은 모양 비교용 벡터이며 GIS 좌표·실제 상대 배치·거리 축척·고도 자료가 아닙니다.
- 데이터와 한계: `data/outline-provenance.json`.
- 제원/시설/생태 설명:
  https://dokdo.mofa.go.kr/kor/introduce/location.jsp
  https://dokdo.mofa.go.kr/kor/introduce/facility.jsp
  https://dokdo.mofa.go.kr/kor/introduce/nature.jsp

## 글꼴
- Gmarket Sans: https://corp.gmarket.com/fonts/
- S-Core Dream: https://s-core.co.kr/company/font/
- CSS에서 웹폰트 URL만 참조하며 폰트 바이너리는 포함하지 않습니다.
- 네트워크 차단 시 대체 글꼴로 모든 기능이 작동해야 합니다.
- 이번 빌드 환경은 외부 글꼴 요청을 차단했으므로 실제 두 웹폰트의 다운로드/최종 외형을 검증하지 않았습니다.

## 소리
- `ambient.wav`는 이번 작업에서 수학적으로 합성한 24초 단일 채널 루프입니다.
- 난수 시드 271828의 잡음을 80Hz 부근 아래에서 줄이고 1150Hz 위에서 감쇠한 성분, 110/164.8/220/261.6/329.6Hz 부근 사인파를 작게 혼합했습니다.
- 기존 업로드 MP3는 별도 공개 배포권한을 확인할 수 없어 포함하지 않았습니다.
- 음성, 상업 음원, 동물 녹음, 외부 음악 스트림을 사용하지 않습니다.
- 기본은 음소거이며 사용자 조작 후에만 재생합니다.

## 코드와 교육 내용
RC3에서 이어받은 사용자 제공 코드/문항과 이번 수정 코드입니다. 원래 제공물의 권리나 라이선스를 임의로 다른 라이선스로 바꾸지 않습니다.
문항의 교육적 승인·번역 승인·국가 교육과정 정합성을 이 배포 준비만으로 주장하지 않습니다.


## Version 1.1 landform comparison
`dokdo-terrain.webp` is newly authored procedural terrain artwork using simplified outline shapes as a reference. It is not a measured DEM or realistic reconstruction; no user-supplied third-party photo pixels were used. It is shown only in the map-reference mode. Existing home artwork and anchor geometry remain unchanged.


## Additions in 1.3
- `assets/dongdo-facilities.png`: a prior conversation-generated edited facility crop, composited onto the existing generated landscape with the affine transform documented in `data/facilities-overlay.json`. Not a survey or third-party field photograph.
- `assets/solar.js`: solar-only adaptation of SunCalc 1.9.0; BSD-2-Clause notice in `SUNCALC-LICENSE.txt`.
- Taegeukgi reward markers and route/rain/snow drawing code authored for this application.
- Gmarket Sans and S-Core Dream are referenced via remote CSS font resources, not redistributed as font files.
- Open-Meteo weather is a separate opt-in external service subject to its terms; data attribution remains visible.
