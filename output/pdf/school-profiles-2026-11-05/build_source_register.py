"""Build private claim-level source records separately from the shareable PDFs."""
from pathlib import Path
import json, re, html

BASE = Path(__file__).resolve().parent
schools = json.loads((BASE / 'profiles.json').read_text())
register = json.loads((BASE / 'source-register.json').read_text())
fallbacks = {
    'naniwa': {'identity': ['N1', 'N3'], 'fees': ['N1', 'N2'], 'default': ['N1', 'N2', 'N3']},
    'firststudy': {'identity': ['F3'], 'fees': ['F1'], 'default': ['F1', 'F2', 'F3', 'F4']},
    'himawari': {'identity': ['H1', 'H3'], 'fees': ['H1', 'H2'], 'default': ['H1', 'H2', 'H3', 'H4']},
    'sakura': {'identity': ['S1', 'S3'], 'fees': ['S1'], 'default': ['S1', 'S2', 'S3']},
}
groups = [
    ('학교명·주소·접근', ['name', 'address_ja', 'website', 'access'], 'identity'),
    ('학교 특징', ['features'], 'default'),
    ('일본어 조건', ['japanese'], 'default'),
    ('GPA·학력 조건', ['gpa'], 'default'),
    ('연차별 금액·확인 상태', ['fee_totals', 'fee_status', 'fee_status_by_term', 'tuition_override'], 'fees'),
    ('학비 상세·납부·계산 주석', ['fees', 'fee_table', 'payment', 'fee_note'], 'fees'),
    ('기존 주거 지원·요금·거주 조건', ['housing'], 'default'),
    ('별도 주거 운영 문의', ['housing_inquiry'], 'default'),
    ('추가 진로 지원', ['pathway_support'], 'default'),
    ('적용 연도·미확정 사항', ['caveat'], 'default'),
]

def codes(value):
    text = json.dumps(value, ensure_ascii=False)
    return sorted(set(code for group in re.findall(r'\[([A-Z]\d+(?:\s*,\s*[A-Z]\d+)*)\]', text)
                      for code in re.split(r'\s*,\s*', group)))

def plain(value):
    return html.unescape(re.sub(r'<[^>]+>', '', value.replace('<br/>', '\n')))

records = []
notes = ['# 학교 소개서 출처 관리 기록', '',
         '관리일: 2026-11-05. 전달용 PDF에는 출처를 표시하지 않습니다. 이 문서는 내부 갱신용입니다.', '',
         '기존 공식 자료·학교 메일과 이번 사용자 제공 안내를 구분합니다. 사용자 제공 안내는 학교의 서면 회신을 별도로 확인한 것으로 취급하지 않습니다.', '']
for school in schools:
    sid = school['id']
    notes.extend(['## ' + school['name']['ko'], '', '| PDF 항목 | 근거 코드 | 상태 |', '|---|---|---|'])
    for label, fields, fallback in groups:
        value = {key: school[key] for key in fields if key in school}
        if not value:
            continue
        source_codes = codes(value) or fallbacks[sid][fallback]
        status = '사용자 제공 안내 포함' if any(c.startswith('U') for c in source_codes) else '기존 조사 기록 참조; 문구의 연도·미확정 상태 유지'
        records.append({'school': sid, 'section': label, 'fields': list(value),
                        'content': value, 'source_codes': source_codes, 'status': status})
        notes.append('| ' + label + ' | ' + ', '.join(source_codes) + ' | ' + status + ' |')
    notes.extend(['', '기존 출처 상세:', '', plain(school['sources_line']['ko']), ''])
    if school.get('pathway_support'):
        notes.extend(['추가한 진로 지원 문구:', '', plain(school['pathway_support']['ko']), ''])

notes.extend(['## 이번 추가 정보의 근거', '',
              '- U1 — 사용자 요청(2026-11-05): 별도 셰어하우스·기숙사 운영에 관한 문의·협의 가능 문구. 기존 학교의 의무 거주 조건이 면제된다는 뜻은 아닙니다.',
              '- U2 — 사용자 안내(2026-11-05): 퍼스트스터디 일본어학교 졸업 후 한국 유학 지원 가능. 학교별 서면 확약을 확인한 정보와 구분합니다.',
              '- U3 — 사용자 안내(2026-11-05): 나니와 재학 중 중도 퇴교를 수반하는 특정기능 전환 및 지원 가능. 실제 전환에는 요건 충족과 입관 심사가 필요하다는 조건을 표시했습니다.',
              '- U4 — 사용자 안내(2026-11-05): 나니와 입학 후 1년 만에 JLPT N2 취득 시 조기졸업 가능. 세부 학교 규정은 서면 확인 전이며 개별 협의 문구를 넣었습니다.',
              '- L1 — [출입국재류관리청 특정기능 안내](https://www.ssw.go.jp/about/sswv/): 유학 등 다른 재류자격에서 변경할 때의 시험·고용계약·신청 요건. 학교별 중퇴·조기졸업 제도를 입증하는 자료는 아닙니다.', '',
              '## 보관 파일', '',
              '- claim-source-register.json: PDF 항목별 한·영 원문, 금액, 출처 코드 연결.',
              '- source-register.json: 코드별 근거, 판단 기록, 추가 정보의 확인 상태.',
              '- research/*.json: 원래 이메일 날짜·ID, 공식 URL, 모집요강 페이지와 계산 내역.',
              '- assets/logo-sources.json: 학교별 로고 및 회사 로고 원본·해시.',
              '- 회사 로고 원본: company/public/brand/logo-color.png.', '',
              '수정 후 build_source_register.py를 실행하면 이 문서와 항목별 JSON을 다시 생성합니다.', ''])
index = dict(register['display_source_codes'])
index.update(register['additional_sources'])
for record in records:
    assert all(code in index for code in record['source_codes']), record
(BASE / 'claim-source-register.json').write_text(json.dumps({
    'checked': '2026-11-05', 'visibility': 'private source management; separate from shared PDFs',
    'source_index': index, 'claims': records}, ensure_ascii=False, indent=2) + '\n')
(BASE / 'source-notes-ko.md').write_text('\n'.join(notes))
print(f'Wrote {len(records)} claim groups and the Korean source-management notes.')
