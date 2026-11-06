일본어학교 4개교 소개서 / Four school partner profiles
최종 확인일 / Checked: 2026-11-05

전달용 PDF
전달용 PDF에는 출처 번호·목록을 표시하지 않습니다. 출처는 별도 관리 파일에 보관합니다.
- school-profiles-ko.pdf: 한국어 합본, A4 4페이지
- school-profiles-en.pdf: 영어 합본, A4 4페이지
- individual/: 학교별 1페이지 PDF 8개
- school-profiles-pdf.zip: 위 PDF 10개만 담은 전달용 묶음

수정용 원본
- assets/: 학교 공식 홈페이지 로고와 원본 URL·해시 기록. profiles.json의 logo.file로 선택합니다.
- profiles.json: 모든 문구·금액·언어별 내용을 담은 편집 원본
- build_profiles.py: 원본에서 합본과 개별 PDF를 생성하는 ReportLab 스크립트
- verify_profiles.py: 양 언어 금액, 페이지 수, 표 열 위치, 개별파일 일치 검사
- source-notes-ko.md / claim-source-register.json: 정보 항목별 출처와 확인 상태를 별도 관리합니다.
- build_source_register.py: 항목별 출처 기록과 한국어 관리 문서를 재생성합니다.
- source-register.json: 출처 코드 N/F/H/S와 사용자 제공 안내 U1~U4, 제도 확인 L1 연결 및 판단 기록
- research/*.json: 학교별 출처 URL, 메일 날짜/ID, PDF 페이지, 상세 계산, 미확인 사항
- validation.json / content-checks.json / qa-summary.json: 검수 기록

갱신 방법
1. 새 공식 모집요강이나 학교 답변으로 확인한 내용을 research에 추가합니다.
2. profiles.json의 한국어와 영어 문구를 함께 수정합니다.
3. fee_totals와 fees(퍼스트스터디는 fee_table)의 숫자를 함께 갱신합니다.
4. Python(reportlab, pypdf 설치 필요)으로 build_profiles.py와 build_source_register.py를 실행합니다.
5. verify_profiles.py를 실행하고, PDF 전 페이지를 이미지로 렌더링해 확인합니다.
6. 글꼴은 build_profiles.py의 FONT_FILES에 지정합니다. 이 컴퓨터에서는 Spoqa Han Sans Neo 및 Arial Unicode를 사용하며 PDF에 필요한 글꼴이 포함되어 있습니다. 다른 컴퓨터에서 재생성할 때는 해당 경로 또는 동등한 한·일·영문 글꼴 경로를 지정합니다.

이 컴퓨터에서 사용한 Python
/Users/ijaeseung/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3

읽을 때 중요한 구분
- 2027년은 모집 검토 대상이며, 모든 가격·조건의 적용연도를 뜻하지 않습니다.
- 퍼스트스터디의 1·2년 차 연간 총액은 미확인입니다. 실제 수신한 2027 초기비용을 상세표에 넣었으며, 졸업 직전 2개월분 선납 및 2028년 4월 인상 예정을 표시했습니다.
- 히마와리는 일본어 요강·청구서의 기본학비를 사용했습니다. 2년 차 및 10월 금액은 계산액이고 별도비용이 있습니다. 동봉 영문 안내서와의 금액 차이를 표시했습니다.
- 사쿠라코토노하의 금액은 2026 자료입니다. 2027년 10월 N5+300시간은 학교가 제시한 예상 조건입니다.
- 숫자 GPA 최소점수·만점 척도는 4개교 모두 확인이 필요합니다.

출처 원문
수정용 ZIP의 evidence/에는 비용·주거 관련 원본 자료만 담았습니다. 소개 계약서와 수수료 합의서, 원본 메일 전체는 전달용 PDF ZIP에 포함하지 않았습니다.

이번 추가 진로 지원·주거 운영 문의 문구는 사용자 안내를 별도 근거로 기록했습니다. 학교별 서면 확약과 구분하며, 특정기능 전환은 요건 충족·재류자격 심사를 전제로 표시했습니다. 회사 로고는 assets/jeongwoo-logo-color.png입니다.
