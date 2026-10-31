"""문구 검증(validate.py의 `load_banned_phrases`·`validate_copy`) 테스트.

여기서는 게시물이 *무엇을 말하는지*만 본다: 상담 문구(CTA), 금지 표현, 대학명과 그 맥락,
용어집 표기, 출처 없는 수치. 구조(언어·날짜·이미지)는 `test_validate_structure.py`의 몫이고
역번역 대조는 다른 모듈의 몫이다.

금지 표현 사전의 비한국어 문구는 AI가 쓴 것이고 원어민 검수를 받지 않았다. 이 파일의 비한국어
문장도 같다. 그래서 여기서 고정하는 것은 "그 문구가 실제로 원어로 옳은가"가 아니라 "사전에 적힌
문구가 검증을 끝까지 통과해 걸리는가"이다.
"""

from __future__ import annotations

import dataclasses
import json
import unicodedata
from pathlib import Path

import pytest

from facebook import config
from facebook.plan_model import Plan, load_plan
from facebook.validate import BannedPhrasesError, Finding, load_banned_phrases, validate_copy

FIXTURE = Path(__file__).parent / "fixtures" / "plan-valid.json"
LANGS = ("ko", "vi", "my", "ne")

GLOSSARY = json.loads(config.GLOSSARY_PATH.read_text(encoding="utf-8"))
UNIVERSITIES = json.loads(config.UNIVERSITIES_PATH.read_text(encoding="utf-8"))

# 사전 JSON의 구역·분류 이름. 파일을 고치는 사람이 보는 이름이므로 테스트도 글자 그대로 쓴다.
SECTION_ALWAYS = "모든 게시물"
SECTION_UNIVERSITY = "대학명이 나오는 게시물"
ALWAYS_LABELS = (
    "합격 보장", "취업 보장", "비자 발급 보장", "비용 보장·무료 유학",
    "상담 이후 절차·수수료", "협력 대학", "입학 알선",
)
UNIVERSITY_LABEL = "협력·제휴 연결"


# --- 도우미 -------------------------------------------------------------------


def _plan() -> Plan:
    return load_plan(FIXTURE)


def _edit(plan: Plan, index: int, **changes) -> Plan:
    """`index`번 게시물의 필드만 바꾼 새 플랜."""
    posts = tuple(dataclasses.replace(p, **changes) if p.index == index else p for p in plan.posts)
    return dataclasses.replace(plan, posts=posts)


def _with_cta(text: str, language: str) -> str:
    """`text` 뒤에 그 언어의 승인된 상담 문구를 붙인다(픽스처 본문과 같은 모양)."""
    return f"{text}\n\n{GLOSSARY['cta'][language]}"


def _banned(always: dict | None = None, university: dict | None = None) -> dict[str, tuple[str, ...]]:
    """여덟 항목(`ko`…`ne`, `ko:대학명`…`ne:대학명`)이 전부 있는 사전. 주어진 것만 채우고 나머지는 비운다."""
    table: dict[str, tuple[str, ...]] = {lang: () for lang in LANGS}
    table |= {f"{lang}:대학명": () for lang in LANGS}
    for lang, phrases in (always or {}).items():
        table[lang] = tuple(phrases)
    for lang, phrases in (university or {}).items():
        table[f"{lang}:대학명"] = tuple(phrases)
    return table


def _real_banned() -> dict[str, tuple[str, ...]]:
    return load_banned_phrases(config.BANNED_PHRASES_PATH)


def _check(plan: Plan, banned: dict[str, tuple[str, ...]] | None = None) -> list[Finding]:
    return validate_copy(plan, UNIVERSITIES, _banned() if banned is None else banned, GLOSSARY)


def _brief(findings: list[Finding]) -> list[tuple[int | None, str, str]]:
    return [(f.post_index, f.code, f.severity) for f in findings]


# --- 상담 문구(CTA) -------------------------------------------------------------


def test_CTA가_없으면_오류():
    # 현지어 본문만 CTA를 잃은 경우: 원문은 멀쩡하므로 항목은 하나이고, 어느 쪽인지 메시지가 알려 준다.
    plan = _edit(_plan(), 0, body_local="Thị thực du học (D-2) dành cho người học chương trình chính quy.")

    findings = _check(plan)

    assert _brief(findings) == [(0, "CTA없음", "error")]
    assert "현지어 본문" in findings[0].message
    assert "한국어 원문" not in findings[0].message


def test_CTA가_한국어_원문에만_없어도_오류():
    # 원문에 CTA가 없고 현지어 본문에만 있으면 역번역 대조가 모든 게시물에서 같은 만큼 벌어진다.
    plan = _edit(_plan(), 0, source_ko="유학(D-2)은 전문대학 이상의 교육기관을 위한 체류자격입니다.")

    findings = _check(plan)

    assert _brief(findings) == [(0, "CTA없음", "error")]
    assert "한국어 원문" in findings[0].message
    assert "현지어 본문" not in findings[0].message


def test_두_쪽_다_CTA가_없으면_항목이_둘이다():
    plan = _edit(_plan(), 0, source_ko="유학(D-2) 안내입니다.", body_local="Thị thực du học (D-2).")

    findings = _check(plan)

    assert _brief(findings) == [(0, "CTA없음", "error"), (0, "CTA없음", "error")]
    assert "현지어 본문" in findings[0].message and "한국어 원문" in findings[1].message


def test_CTA는_끝에_있어야_하고_중간에_있는_것은_인정하지_않는다():
    cta = GLOSSARY["cta"]["vi"]
    body = f"Thị thực du học (D-2).\n\n{cta}\n\nXem thêm thông tin tại trang này."
    plan = _edit(_plan(), 0, body_local=body)

    findings = _check(plan)

    assert _brief(findings) == [(0, "CTA없음", "error")]


def test_CTA가_한_글자라도_다르면_오류():
    changed = GLOSSARY["cta"]["vi"].replace("hoàn toàn ", "")
    assert changed != GLOSSARY["cta"]["vi"]
    plan = _edit(_plan(), 0, body_local=f"Thị thực du học (D-2).\n\n{changed}")

    assert _brief(_check(plan)) == [(0, "CTA없음", "error")]


def test_CTA_뒤의_공백과_줄바꿈은_무시한다():
    plan = _edit(_plan(), 0, body_local=_with_cta("Thị thực du học (D-2).", "vi") + " \n\n")
    plan = _edit(plan, 0, source_ko=_with_cta("유학(D-2) 안내입니다.", "ko") + "\n")

    assert _check(plan) == []


# --- 금지 표현 ----------------------------------------------------------------


def test_금지표현이_한국어_원문에_있으면_오류():
    plan = _edit(_plan(), 0, source_ko=_with_cta("유학(D-2)은 합격 보장입니다.", "ko"))

    findings = _check(plan, _banned({"ko": ("합격 보장",)}))

    assert _brief(findings) == [(0, "금지표현", "error")]
    assert "한국어 원문" in findings[0].message and "합격 보장" in findings[0].message


def test_금지표현이_현지어_본문에_있으면_오류():
    body = _with_cta("Thị thực du học (D-2). Chúng tôi đảm bảo đỗ cho bạn.", "vi")
    plan = _edit(_plan(), 0, body_local=body)

    findings = _check(plan, _banned({"vi": ("đảm bảo đỗ",)}))

    assert _brief(findings) == [(0, "금지표현", "error")]
    assert "현지어 본문" in findings[0].message and "đảm bảo đỗ" in findings[0].message


def test_금지표현은_그_게시물의_언어_목록으로만_현지어_본문에_대조한다():
    # 네팔어 목록의 문구가 베트남어 본문에 있어도, 베트남어 목록에 없으면 이 게시물에서는 금지가 아니다.
    body = _with_cta("Thị thực du học (D-2). भर्ना ग्यारेन्टी", "vi")
    plan = _edit(_plan(), 0, body_local=body)

    assert _check(plan, _banned({"ne": ("भर्ना ग्यारेन्टी",)})) == []


def test_금지_문구는_낱말이_아니라_통째로_대조한다():
    # "무료"와 "유학"이 따로따로 나오는 것은 "무료 유학"이 아니다. 승인된 CTA("상담은 무료입니다")가
    # 낱말 단위 대조에 걸리면 매달 게시물 30건이 전부 막힌다.
    source = _with_cta("유학(D-2)은 전문대학 이상의 교육기관을 위한 체류자격입니다.", "ko")
    assert "무료" in source and "유학" in source
    plan = _edit(_plan(), 0, source_ko=source)

    assert _check(plan, _banned({"ko": ("무료 유학",)})) == []


@pytest.mark.parametrize(
    ("language", "phrase", "written"),
    [
        ("ko", "합격 보장", "합격보장"),
        ("ko", "합격 보장", "합격\n보장"),
        ("ko", "MOU", "mou"),
        ("vi", "đảm bảo đỗ", "ĐẢM BẢO   ĐỖ"),
        ("vi", "đảm bảo đỗ", unicodedata.normalize("NFD", "đảm bảo đỗ")),
        ("my", "ဝင်ခွင့် အာမခံ", "ဝင်ခွင့်​အာမခံ"),
        ("ne", "भर्ना ग्यारेन्टी", "भर्नाग्यारेन्टी"),
    ],
    ids=["ko-띄어쓰기-없음", "ko-줄바꿈", "ko-대소문자", "vi-대소문자-공백", "vi-NFD", "my-ZWSP", "ne-띄어쓰기-없음"],
)
def test_금지_문구는_띄어쓰기_대소문자_유니코드_표기_차이를_무시하고_찾는다(language, phrase, written):
    # 사전의 비한국어 문구는 검수되지 않았으므로, 띄어쓰기 한 칸 차이로 새지 않게 한다.
    if language == "ko":
        plan = _edit(_plan(), 0, source_ko=_with_cta(f"유학(D-2) {written} 안내입니다.", "ko"))
    else:
        index = {"vi": 0, "my": 1, "ne": 2}[language]
        # 용어집 표기 확인이 끼어들지 않도록 비자 이름은 쓰지 않는다.
        plan = _edit(_plan(), index, body_local=_with_cta(f"안내 {written} 안내", language))

    findings = _check(plan, _banned({language: (phrase,)}))

    assert [f.code for f in findings] == ["금지표현"]


def test_같은_문구가_여러_번_나와도_문구마다_한_번만_보고한다():
    plan = _edit(_plan(), 0, source_ko=_with_cta("합격 보장! 정말 합격 보장입니다. 취업 보장.", "ko"))

    findings = _check(plan, _banned({"ko": ("합격 보장", "취업 보장")}))

    assert [f.code for f in findings] == ["금지표현", "금지표현"]
    assert "합격 보장" in findings[0].message and "취업 보장" in findings[1].message


# --- 대학명과 맥락 --------------------------------------------------------------


def test_대학명과_협력표현이_같은_게시물에_있으면_오류():
    plan = _edit(_plan(), 3, source_ko=_with_cta("전주기전대학은 저희 협력 대학입니다.", "ko"))

    findings = _check(plan, _banned(university={"ko": ("협력",)}))

    assert _brief(findings) == [(3, "대학맥락", "error")]
    assert "전주기전대학" in findings[0].message and "협력" in findings[0].message


def test_대학맥락은_현지어_본문도_본다():
    body = _with_cta("전주기전대학 hợp tác với chúng tôi.", "vi")
    plan = _edit(_plan(), 3, body_local=body)

    findings = _check(plan, _banned(university={"vi": ("hợp tác",)}))

    assert _brief(findings) == [(3, "대학맥락", "error")]
    assert "현지어 본문" in findings[0].message


def test_대학명이_없는_게시물은_협력_표현이_있어도_대학맥락이_아니다():
    plan = _edit(_plan(), 0, source_ko=_with_cta("유학(D-2)은 한국과 네팔의 협력 분야와 무관합니다.", "ko"))

    assert _check(plan, _banned(university={"ko": ("협력",)})) == []


def test_university_names를_비워도_본문에_승인_대학명이_있으면_대학맥락을_본다():
    # university_names를 빠뜨려도 협력 표현 검사를 건너뛰지 못한다.
    plan = _edit(_plan(), 0, source_ko=_with_cta("경기대학교와 협력하여 진행합니다.", "ko"))
    assert plan.posts[0].university_names == ()

    findings = _check(plan, _banned(university={"ko": ("협력",)}))

    assert _brief(findings) == [(0, "대학맥락", "error")]
    assert "경기대학교" in findings[0].message


def test_대학명_소개_맥락만_있으면_통과():
    plan = _edit(
        _plan(), 3,
        source_ko=_with_cta("전주기전대학은 전주에 있는 전문대학입니다.", "ko"),
        body_local=_with_cta("전주기전대학 là một trường cao đẳng ở Jeonju.", "vi"),
        fact_keys=(),
    )

    assert _check(plan, _real_banned()) == []


def test_universities_목록에_없는_대학명을_쓰면_오류():
    plan = _edit(
        _plan(), 3,
        university_names=("서울대학교",),
        body_local=_with_cta("서울대학교의 안내입니다.", "vi"),
    )

    findings = _check(plan)

    assert _brief(findings) == [(3, "대학명목록외", "error")]
    assert "서울대학교" in findings[0].message


def test_목록에_있는_대학명이라도_철자가_다르면_목록외다():
    plan = _edit(_plan(), 3, university_names=("전주기전대학교",), body_local=_with_cta("전주기전대학교 안내.", "vi"))

    assert [f.code for f in _check(plan)] == ["대학명목록외"]


def test_university_names에_적은_대학명이_현지어_본문에_없으면_오류():
    # 음차나 의역만 있으면 이름을 본문에서 찾을 수 없어 맥락 검사가 성립하지 않는다.
    body = _with_cta("Học phí một năm của trường cao đẳng Jeonju Kijeon là 6.800.000 won.", "vi")
    plan = _edit(_plan(), 3, body_local=body)
    assert plan.posts[3].university_names == ("전주기전대학",)

    findings = _check(plan)

    assert _brief(findings) == [(3, "대학명본문없음", "error")]
    assert "전주기전대학" in findings[0].message


def test_현지어_글자를_곁들여도_한국어_대학명이_그대로_있으면_통과():
    body = _with_cta("전주기전대학 (Cao đẳng Jeonju Kijeon) là một trường cao đẳng.", "vi")
    plan = _edit(_plan(), 3, body_local=body)

    assert _check(plan, _real_banned()) == []


# --- 용어집 ------------------------------------------------------------------


def test_용어집_용어가_다르게_표기되면_경고():
    plan = _edit(_plan(), 0, body_local=_with_cta("Visa D-2 dành cho người học chương trình chính quy.", "vi"))

    findings = _check(plan)

    assert _brief(findings) == [(0, "용어불일치", "warning")]
    assert "D-2" in findings[0].message and GLOSSARY["visa_d2"]["vi"] in findings[0].message


def test_용어집_표기를_그대로_쓰면_통과():
    body = _with_cta(f"{GLOSSARY['visa_d2']['vi']} dành cho người học chương trình chính quy.", "vi")

    assert _check(_edit(_plan(), 0, body_local=body)) == []


def test_회사명도_용어집_표기_그대로_써야_한다():
    body = _with_cta(f"{GLOSSARY['visa_d2']['vi']}. 정우인재개발원 tư vấn cho bạn.", "vi")

    findings = _check(_edit(_plan(), 0, body_local=body))

    assert _brief(findings) == [(0, "용어불일치", "warning")]
    assert "정우인재개발원" in findings[0].message


def test_용어집_표기가_있으면_회사명도_통과():
    body = _with_cta(f"{GLOSSARY['company_name']['vi']} tư vấn cho bạn.", "vi")

    assert _check(_edit(_plan(), 0, body_local=body)) == []


def test_용어가_쓰이지_않은_게시물은_용어집_검사_대상이_아니다():
    plan = _edit(_plan(), 1, body_local=_with_cta("ဗီဇာအကြောင်း အကျဉ်းချုပ်။", "my"))

    assert _check(plan) == []


def test_용어집_표기가_언어마다_따로_적용된다():
    # 미얀마어 게시물이 베트남어 용어집 표기를 써도 미얀마어 표기가 아니므로 경고다.
    body = _with_cta(f"{GLOSSARY['visa_d2']['vi']} ...", "my")

    findings = _check(_edit(_plan(), 1, body_local=body))

    assert _brief(findings) == [(1, "용어불일치", "warning")]
    assert GLOSSARY["visa_d2"]["my"] in findings[0].message


@pytest.mark.parametrize("dash", ["‐", "‑", "–", "—", "−"],
                         ids=["hyphen", "non-breaking", "en-dash", "em-dash", "minus"])
def test_하이픈_모양이_달라도_D_2를_알아본다(dash):
    plan = _edit(_plan(), 0, body_local=_with_cta(f"Visa D{dash}2 dành cho người học.", "vi"))

    assert _brief(_check(plan)) == [(0, "용어불일치", "warning")]


def test_소문자_d_2도_알아본다():
    plan = _edit(_plan(), 0, body_local=_with_cta("Visa d-2 dành cho người học.", "vi"))

    assert _brief(_check(plan)) == [(0, "용어불일치", "warning")]


# --- 출처 없는 수치 -------------------------------------------------------------


def test_출처없는_수치가_본문에_있으면_경고():
    plan = _edit(_plan(), 3, fact_keys=())
    assert "6,800,000원" in plan.posts[3].source_ko

    findings = _check(plan)

    assert _brief(findings) == [(3, "출처없는수치", "warning")]
    assert "6,800,000원" in findings[0].message and "fact_keys" in findings[0].message


def test_fact_keys가_있으면_수치가_있어도_통과():
    plan = _plan()
    assert plan.posts[3].fact_keys == ("tuition_kijeon",)
    assert "6,800,000원" in plan.posts[3].source_ko

    assert _check(plan) == []


@pytest.mark.parametrize(
    "sentence",
    [
        "한 해 등록금은 6,800,000원입니다.",
        "한 학기 등록금은 약 300만 원입니다.",
        "한 달에 15만 엔을 법니다.",
        "주 20시간까지 일할 수 있습니다.",
        "하루 4시간 근무합니다.",
        "합격률은 95%입니다.",
        "장학금 50퍼센트를 받습니다.",
        "비용은 $500입니다.",
        "비용은 ¥100,000입니다.",
    ],
    ids=["원", "만-원", "엔", "주-시간", "하루-시간", "퍼센트-기호", "퍼센트-글자", "달러-기호", "엔-기호"],
)
def test_금액_시간_비율을_수치로_본다(sentence):
    plan = _edit(_plan(), 0, source_ko=_with_cta(sentence, "ko"), fact_keys=())

    assert _brief(_check(plan)) == [(0, "출처없는수치", "warning")]


@pytest.mark.parametrize(
    "sentence",
    [
        "2026년 10월에 시작합니다.",
        "2학기부터 입학합니다.",
        "TOPIK 3급이 필요합니다.",
        "만 18세 이상이어야 합니다.",
        "유학(D-2)은 4년제 대학도 포함합니다.",
        "출입국관리법 시행령 제12조를 따릅니다.",
    ],
    ids=["연도-월", "학기-수", "급수", "나이", "비자-코드-학제", "조문"],
)
def test_연도_학기_급수_같은_숫자는_수치로_보지_않는다(sentence):
    plan = _edit(_plan(), 0, source_ko=_with_cta(sentence, "ko"), fact_keys=())

    assert _check(plan) == []


def test_수치는_한국어_원문만_본다():
    # 현지어 숫자 표기까지 상대하지 않는다. 원문에 수치가 없으면 본문 쪽 숫자는 판정하지 않는다.
    plan = _edit(_plan(), 3, fact_keys=(), source_ko=_with_cta("전주기전대학의 등록금을 안내합니다.", "ko"))
    assert "6.800.000" in plan.posts[3].body_local

    assert _check(plan) == []


def test_수치가_여럿이어도_출처없는수치는_게시물당_하나다():
    sentence = "등록금은 6,800,000원이고 주 20시간 일하며 합격률은 95%입니다."
    plan = _edit(_plan(), 0, source_ko=_with_cta(sentence, "ko"), fact_keys=())

    findings = _check(plan)

    assert _brief(findings) == [(0, "출처없는수치", "warning")]
    for shown in ("6,800,000원", "20시간", "95%"):
        assert shown in findings[0].message


# --- 결과 순서 ----------------------------------------------------------------


def test_결과는_게시물_번호순이고_같은_게시물_안에서는_검사_순서를_따른다():
    plan = _plan()
    # 1번(my): CTA 없음 + 금지 표현 + 용어집 불일치.
    plan = _edit(plan, 1, body_local="ပညာသင်ဗီဇာ D-2 ဝန်ဆောင်ခ မရှိပါ။")
    # 3번(vi): 금지 표현(원문) + 대학 맥락(현지어) + 출처 없는 수치.
    plan = _edit(
        plan, 3, fact_keys=(),
        source_ko=_with_cta("전주기전대학의 연간 평균등록금은 6,800,000원입니다. 합격 보장.", "ko"),
        body_local=_with_cta("전주기전대학 hợp tác với chúng tôi.", "vi"),
    )
    banned = _banned(
        always={"ko": ("합격 보장",), "my": ("ဝန်ဆောင်ခ",)},
        university={"vi": ("hợp tác",)},
    )

    findings = _check(plan, banned)

    assert [(f.post_index, f.code) for f in findings] == [
        (1, "CTA없음"), (1, "금지표현"), (1, "용어불일치"),
        (3, "금지표현"), (3, "대학맥락"), (3, "출처없는수치"),
    ]


# --- 사전을 읽는 쪽 --------------------------------------------------------------


def test_사전이_빠진_항목을_가지면_조용히_건너뛰지_않고_멈춘다():
    banned = _banned()
    del banned["my"]

    with pytest.raises(ValueError, match="my"):
        _check(_plan(), banned)


def _valid_raw() -> dict:
    return {
        SECTION_ALWAYS: {lang: {"합격 보장": [f"{lang}-금지"]} for lang in LANGS},
        SECTION_UNIVERSITY: {lang: {UNIVERSITY_LABEL: [f"{lang}-맥락"]} for lang in LANGS},
    }


def _write(tmp_path: Path, raw) -> Path:
    path = tmp_path / "banned.json"
    path.write_text(raw if isinstance(raw, str) else json.dumps(raw, ensure_ascii=False), encoding="utf-8")
    return path


def test_사전_로더는_모든_게시물_항목과_대학명_항목을_함께_돌려준다(tmp_path):
    raw = _valid_raw()
    raw[SECTION_ALWAYS]["vi"] = {"합격 보장": ["a", "b"], "취업 보장": ["c", "a"]}

    banned = load_banned_phrases(_write(tmp_path, raw))

    assert set(banned) == {*LANGS, *(f"{lang}:대학명" for lang in LANGS)}
    assert banned["vi"] == ("a", "b", "c")  # 분류를 펴고 순서를 지키며 겹치는 문구는 한 번만
    assert banned["vi:대학명"] == ("vi-맥락",)
    assert all(isinstance(phrases, tuple) for phrases in banned.values())


def test_사전_로더는_파일이_없으면_BannedPhrasesError(tmp_path):
    with pytest.raises(BannedPhrasesError, match="찾을 수 없습니다"):
        load_banned_phrases(tmp_path / "없음.json")


@pytest.mark.parametrize(
    ("mutate", "message"),
    [
        (lambda raw: "{ 이건 JSON이 아니다", "올바른 JSON"),
        (lambda raw: [], "객체"),
        (lambda raw: {SECTION_ALWAYS: raw[SECTION_ALWAYS]}, SECTION_UNIVERSITY),
        (lambda raw: {**raw, "오타": {}}, "오타"),
        (lambda raw: {**raw, SECTION_ALWAYS: {k: v for k, v in raw[SECTION_ALWAYS].items() if k != "vi"}}, "vi"),
        (lambda raw: {**raw, SECTION_ALWAYS: {**raw[SECTION_ALWAYS], "fr": {"x": ["y"]}}}, "fr"),
        (lambda raw: {**raw, SECTION_ALWAYS: {**raw[SECTION_ALWAYS], "ne": {}}}, "ne"),
        (lambda raw: {**raw, SECTION_ALWAYS: {**raw[SECTION_ALWAYS], "ne": {"합격 보장": []}}}, "ne"),
        (lambda raw: {**raw, SECTION_ALWAYS: {**raw[SECTION_ALWAYS], "ne": {"합격 보장": "문자열"}}}, "ne"),
        (lambda raw: {**raw, SECTION_ALWAYS: {**raw[SECTION_ALWAYS], "ne": {"합격 보장": [3]}}}, "ne"),
        (lambda raw: {**raw, SECTION_ALWAYS: {**raw[SECTION_ALWAYS], "ne": {"합격 보장": ["  "]}}}, "ne"),
        (lambda raw: {**raw, SECTION_ALWAYS: {**raw[SECTION_ALWAYS], "ne": {"합격 보장": ["​ ​"]}}}, "ne"),
        (lambda raw: {**raw, SECTION_UNIVERSITY: {**raw[SECTION_UNIVERSITY], "my": {}}}, "my"),
    ],
    ids=[
        "JSON-아님", "최상위-배열", "구역-빠짐", "구역-오타", "언어-빠짐", "언어-오타", "언어-문구-없음",
        "분류-비어있음", "분류-문자열", "문구-숫자", "문구-공백만", "문구-보이지않는-문자만", "대학명-언어-문구-없음",
    ],
)
def test_사전_로더는_규칙에_어긋나면_BannedPhrasesError(tmp_path, mutate, message):
    # 어떤 언어의 사전이 조용히 비어 읽히면 그 언어의 금지 표현 검사가 통째로 사라진다. 빈 문구는
    # 모든 본문에 들어맞으므로 이것도 막는다.
    path = _write(tmp_path, mutate(_valid_raw()))

    with pytest.raises(BannedPhrasesError, match=message):
        load_banned_phrases(path)


def test_실제_사전은_네_언어_모두_필수_분류를_가진다():
    raw = json.loads(config.BANNED_PHRASES_PATH.read_text(encoding="utf-8"))

    for lang in LANGS:
        have = set(raw[SECTION_ALWAYS][lang])
        assert have >= set(ALWAYS_LABELS), f"{lang}에 빠진 분류: {set(ALWAYS_LABELS) - have}"
        assert UNIVERSITY_LABEL in raw[SECTION_UNIVERSITY][lang], f"{lang}에 '{UNIVERSITY_LABEL}' 분류가 없다"


def test_실제_사전이_로더를_통과해_여덟_항목을_모두_채운다():
    banned = _real_banned()

    assert set(banned) == {*LANGS, *(f"{lang}:대학명" for lang in LANGS)}
    assert all(phrases for phrases in banned.values())


# 사전에 적힌 문구가 검증을 끝까지 통과해 걸리는지 보는 표본. 비한국어 문장은 AI가 쓴 것이고
# 어법이 맞는지는 모른다 — 확인하는 것은 문구가 본문 속에서 찾아지는가이다.
_SAMPLES = [
    ("ko", "합격 보장", "저희를 통하면 합격 보장입니다."),
    ("ko", "취업 보장", "저희와 하면 취업을 보장합니다."),
    ("ko", "비자 발급 보장", "비자 발급을 보장합니다."),
    ("ko", "무료 유학", "무료 유학의 기회를 드립니다."),
    ("ko", "상담 이후 절차·수수료", "상담 이후 수수료가 발생합니다."),
    ("ko", "협력 대학", "저희 협력 대학을 소개합니다."),
    ("ko", "입학 알선", "저희가 입학을 도와드립니다."),
    ("vi", "합격 보장", "Chúng tôi đảm bảo đỗ cho bạn."),
    ("vi", "취업 보장", "Chúng tôi đảm bảo việc làm sau khi tốt nghiệp."),
    ("vi", "비자 발급 보장", "Chúng tôi đảm bảo visa cho bạn."),
    ("vi", "무료 유학", "Cơ hội du học miễn phí dành cho bạn."),
    ("vi", "상담 이후 절차·수수료", "Phí dịch vụ sẽ được tính sau."),
    ("vi", "협력 대학", "Đây là trường đối tác của chúng tôi."),
    ("vi", "입학 알선", "Chúng tôi hỗ trợ nhập học cho bạn."),
    ("my", "합격 보장", "ကျွန်ုပ်တို့သည် ဝင်ခွင့် အာမခံ ပေးပါသည်။"),
    ("my", "취업 보장", "ကျွန်ုပ်တို့သည် အလုပ်အကိုင် အာမခံ ပေးပါသည်။"),
    ("my", "비자 발급 보장", "ဗီဇာ အာမခံ ရရှိမည်။"),
    ("my", "무료 유학", "ကျောင်းလခ အခမဲ့ ပညာသင်ခွင့်ရပါမည်။"),
    ("my", "상담 이후 절차·수수료", "ဝန်ဆောင်ခ ကောက်ခံပါမည်။"),
    ("my", "협력 대학", "ကျွန်ုပ်တို့၏ မိတ်ဖက် တက္ကသိုလ် ဖြစ်ပါသည်။"),
    ("my", "입학 알선", "ဝင်ခွင့်လျှောက်ရန် ကူညီပေးပါမည်။"),
    ("ne", "합격 보장", "हामी भर्ना ग्यारेन्टी दिन्छौं।"),
    ("ne", "취업 보장", "हामी जागिरको ग्यारेन्टी दिन्छौं।"),
    ("ne", "비자 발급 보장", "भिसा ग्यारेन्टी उपलब्ध छ।"),
    ("ne", "무료 유학", "निःशुल्क अध्ययनको अवसर।"),
    ("ne", "상담 이후 절차·수수료", "सेवा शुल्क लाग्नेछ।"),
    ("ne", "협력 대학", "यो हाम्रो साझेदार विश्वविद्यालय हो।"),
    ("ne", "입학 알선", "हामी भर्नामा सहयोग गर्छौं।"),
]


@pytest.mark.parametrize(("language", "category", "sentence"), _SAMPLES,
                         ids=[f"{lang}-{category}" for lang, category, _ in _SAMPLES])
def test_실제_사전은_네_언어의_대표_문구를_잡는다(language, category, sentence):
    if language == "ko":
        plan = _edit(_plan(), 0, source_ko=_with_cta(sentence, "ko"))
        index = 0
    else:
        index = {"vi": 0, "my": 1, "ne": 2}[language]
        plan = _edit(_plan(), index, body_local=_with_cta(sentence, language))

    findings = _check(plan, _real_banned())

    assert ("금지표현" in {f.code for f in findings if f.post_index == index}), (language, category, findings)


def test_금지_문구는_승인된_용어집_문자열을_막지_않는다():
    # 사전을 고치다가 CTA·비자명·회사명에 들어 있는 말을 금지해 버리면, 이 문자열을 그대로 쓰는
    # 게시물이 매달 전부 막힌다. 낱말이 아니라 문구로 대조하는 이유와 같은 위험을 데이터에서 고정한다.
    from facebook.validate import _compact  # 대조에 쓰는 바로 그 정규화

    banned = _real_banned()
    for term, by_language in GLOSSARY.items():
        for lang in LANGS:
            text = _compact(by_language[lang])
            for key in (lang, f"{lang}:대학명"):
                hits = [phrase for phrase in banned[key] if _compact(phrase) in text]
                assert not hits, f"용어집 {term}({lang})이 사전 '{key}'의 {hits}에 걸린다: {by_language[lang]!r}"


# --- 정상 경로 ----------------------------------------------------------------


def test_픽스처_플랜은_findings가_비어_있다():
    # 실제 사전·용어집·대학 목록으로 돌린다. 승인된 CTA("무료 상담" 포함)가 금지 문구에 걸리면
    # 여기서 깨진다.
    findings = validate_copy(_plan(), UNIVERSITIES, _real_banned(), GLOSSARY)

    assert findings == []
