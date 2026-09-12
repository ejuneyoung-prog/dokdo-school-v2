from pathlib import Path
import json,re,hashlib,collections
ROOT=Path(__file__).resolve().parents[2]
S={}
def source(key,title,url,locator): S[key]={'title':title,'url':url,'locator':locator,'checked':'2026-09-11'}
source('location','외교부 · 독도의 구성 및 위치','https://dokdo.mofa.go.kr/kor/introduce/location.jsp','두 큰 섬·부속 도서 / 높이·면적 / 울릉도·오키섬 거리')
source('geology','한국해양과학기술원 · 독도 지형 및 지질','https://www.dokdo.re.kr/home/cms/cmsCont.do?cntnts_sn=66','해저 화산의 형성 / 해안 침식 지형 / 물골 / 지형 변화')
source('nature','외교부 · 독도의 자연환경','https://dokdo.mofa.go.kr/kor/introduce/nature.jsp','독도 식물·조류·해양생물 / 철새 이동경로의 휴식처')
source('forest','한국해양과학기술원 · 독도 암반생태계','https://www.dokdo.re.kr/home/cms/cmsCont.do?cntnts_sn=87','감태·대황 해조숲 / 바위틈 생물 / 장기 관찰')
source('mix','한국해양과학기술원 · 독도의 해양환경','https://www.dokdo.re.kr/home/cms/cmsCont.do?cntnts_sn=78','수괴 혼합·영양염·식물플랑크톤과 조사 자료')
source('facility','외교부 · 독도 주요시설물','https://dokdo.mofa.go.kr/kor/introduce/facility.jsp','서도 주민숙소 / 동도 접안시설·등대·경비대 / 담수시설')
source('visit','외교부 · 주민 및 입도 안내','https://dokdo.mofa.go.kr/kor/introduce/residence.jsp','입도 유의사항·동도 선착장 관람 / 2026년 7월 기준 표기. 실제 방문 전 최신 안내 확인')
source('sejong','외교부 자료실 · 세종실록 지리지(1454)','https://dokdo.mofa.go.kr/kor/pds/part06_view02.jsp','우산·무릉과 맑은 날의 가시성; 괄호 안 현대 지명은 외교부 해석')
source('an','외교부 · 안용복의 활동과 기록','https://dokdo.mofa.go.kr/kor/include/print_faq.jsp?class_faq=q5','1693년과 1696년 / 숙종실록과 오키섬 조사 기록')
source('timeline','외교부 · 독도 연표','https://dokdo.mofa.go.kr/m/kor/dokdo/reason_list.jsp','1694 수토 / 1696년 1월 금지령·5월 도일 / 1900·1905·1906 순서')
source('decree','외교부 자료실 · 대한제국 칙령 제41호','https://dokdo.mofa.go.kr/kor/pds/part02_view02.jsp','1900.10.25 / 제1조 울도·군수 / 제2조 울릉전도·죽도·석도')
source('gazette','외교부 자료실 · 관보(1900.10.27)','https://dokdo.mofa.go.kr/kor/pds/part02_view03.jsp','관보 게재 날짜와 칙령 날짜의 구분')
source('petition','외교부 자료실 · 의정부 청의서(1900.10.22)','https://dokdo.mofa.go.kr/kor/pds/part02_view01.jsp','행정 개편 제안과 칙령안')
source('shim','외교부 자료실 · 심흥택 보고서(1906)','https://dokdo.mofa.go.kr/kor/pds/part02_view04.jsp','본군 소속 독도 / 일본 관리 발언의 인용 / 보고 전달')
source('order','외교부 자료실 · 지령 제3호(1906.5.10)','https://dokdo.mofa.go.kr/kor/pds/part02_view05.jsp','일본 주장 부인과 형편·행동 재조사 지시')
source('dajokan','외교부 자료실 · 태정관지령(1877)','https://dokdo.mofa.go.kr/kor/pds/part05_view03.jsp','행정 질의·지령, 다케시마 외 일도; 현대 지명 식별은 외교부 해설')
source('dajokanmap','외교부 · 태정관지령과 기죽도약도','https://dokdo.mofa.go.kr/kor/include/print_faq.jsp?class_faq=q7','첨부 지도와 문서의 지명 대응')
source('arch','한국관광공사 · 독립문바위','https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid=0fe4eeb6-3f6a-48b1-ab75-c8d4ab6b43be','동도 해식아치의 형태와 형성')
source('cave','한국관광공사 · 천장굴','https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid=21978541-1e2d-4dd8-83fd-92ce4f55dec6','동도 중앙의 우물 모양 함몰 지형')
source('photos','전북교육청 · 독도 사진 자료','https://www.jbe.go.kr/dokdo/assets/sub/picture.html','두 섬·선착장·등대로 가는 길·바위의 사진 설명; 사진 파일은 재배포하지 않음')
source('reserve','국가유산청 · 독도 천연보호구역','https://www.heritage.go.kr/heri/cul/culSelectDetail.do?VdkVgwKey=16%2C03360000%2C37&pageNo=1_1_2_0','해안지형·조류 번식지·식생 보호; 지정 날짜를 묻는 문항은 제외')
source('gangchi','해양수산부 · 독도 강치 연구 발표(2022)','https://www.mof.go.kr/doc/ko/selectDoc.do?bbsSeq=10&docSeq=45126&menuSeq=971','포획 자료 기반 개체군 추정과 남획의 영향; 모델과 직접 관측 구분')
UNITS=[('독도는 어디에 있을까','Finding Dokdo','지리'),('동도와 서도 비교','Two distinctive islands','지리'),('화산이 만든 독도','A volcanic island group','지형'),('생명이 머무는 독도','A home and a stopover','생태'),('독도 바다의 연결','Connections in the sea','생태'),('사람과 시설','People and facilities','생활'),('옛 기록의 두 섬','Islands in early records','역사'),('칙령 제41호 읽기','Reading Decree No. 41','역사'),('1906년의 보고와 대응','Reports and responses in 1906','역사'),('바위와 물길 살펴보기','Rocks and waterways','지형'),('기록을 함께 읽기','Comparing historical records','역사'),('나의 독도 해설','Explaining Dokdo','종합')]
FAMILIES=[]
def B(s):
 a=s.split('|');assert len(a)==2,s;return {'ko':a[0],'en':a[1]}
def Q(stem,a,b,c,reason=''):
 return {'stem':B(stem),'options':[B(a),B(b),B(c)],'reason':B(reason) if reason else None}
def F(unit,slug,sources,fact,material,rows):
 assert len(rows)==4
 FAMILIES.append({'number':len(FAMILIES)+1,'unit':unit,'slug':slug,'sourceIds':sources.split(),'fact':B(fact),'material':B(material),'variants':rows})