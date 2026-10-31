"""문구 검증(validate_copy.py의 `load_banned_phrases`·`validate_copy`) 테스트.

여기서는 게시물이 *무엇을 말하는지*만 본다: 상담 문구(CTA), 금지 표현, 대학명과 그 맥락,
용어집 표기, 출처 없는 수치. 구조(언어·날짜·이미지)는 `test_validate_structure.py`의 몫이고
역번역 대조는 다른 모듈의 몫이다.

금지 표현 사전의 비한국어 문구는 AI가 쓴 것이고 원어민 검수를 받지 않았다. 이 파일의 비한국어
문장도 같다. 그래서 여기서 고정하는 것은 "그 문구가 실제로 원어로 옳은가"가 아니라 "사전에 적힌
문구가 검증을 끝까지 통과해 걸리는가"이다.
"""

from __future__ import annotations

import copy
import dataclasses
import inspect
import json
import unicodedata
from pathlib import Path

import pytest

from facebook import config
from facebook.facts import load_facts
from facebook.plan_model import Plan, load_plan
from facebook.findings import Finding
from facebook.validate_copy import BannedPhrasesError, load_banned_phrases, validate_copy

FIXTURE = Path(__file__).parent / "fixtures" / "plan-valid.json"
LANGS = ("ko", "vi", "my", "ne")

GLOSSARY = json.loads(config.GLOSSARY_PATH.read_text(encoding="utf-8"))
UNIVERSITIES = json.loads(config.UNIVERSITIES_PATH.read_text(encoding="utf-8"))
FACTS = load_facts(config.FACTS_PATH)

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
    return validate_copy(plan, UNIVERSITIES, _banned() if banned is None else banned, GLOSSARY, FACTS)


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
        ("vi", "đảm bảo đỗ", "ĐẢM BẢO   ĐỖ"),
        ("vi", "đảm bảo đỗ", unicodedata.normalize("NFD", "đảm bảo đỗ")),
        ("my", "ဝင်ခွင့် အာမခံ", "ဝင်ခွင့်​အာမခံ"),
        ("ne", "भर्ना ग्यारेन्टी", "भर्नाग्यारेन्टी"),
    ],
    ids=["ko-띄어쓰기-없음", "ko-줄바꿈", "vi-대소문자-공백", "vi-NFD", "my-ZWSP", "ne-띄어쓰기-없음"],
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


def test_알파벳_약어는_대소문자를_구분해_낱말로만_찾는다():
    # `MOU`를 대소문자·띄어쓰기를 무시하고 찾으면 "nhóm oung" 같은 글에도 걸린다.
    banned = _banned(university={"vi": ("MOU",), "ko": ("MOU",)})

    def vi_codes(body: str) -> list[str]:
        plan = _edit(_plan(), 3, body_local=_with_cta(body, "vi"))
        return [f.code for f in _check(plan, banned)]

    # 1인칭 표지를 곁들여 약어만 변수로 둔다.
    assert vi_codes("전주기전대학 Chúng tôi nhóm oung và mouse.") == []
    assert vi_codes("전주기전대학 Chúng tôi MOUSE.") == []
    assert vi_codes("전주기전대학 Chúng tôi mou.") == []  # 약어는 대문자로 쓴 것만 약어다
    assert vi_codes("전주기전대학 Chúng tôi ký MOU.") == ["대학맥락"]
    assert vi_codes("전주기전대학 Chúng tôi ký M O U.") == ["대학맥락"]  # 띄어 쓴 약어
    assert vi_codes("전주기전대학 Chúng tôi ký M.O.U.") == ["대학맥락"]
    assert vi_codes("전주기전대학 Chúng tôi ký ＭＯＵ.") == ["대학맥락"]  # 전각
    assert vi_codes("전주기전대학 Chúng tôi TEAM OUT, I'M OUT.") == []  # 다른 낱말의 일부
    assert vi_codes("전주기전대학 (MOU), chúng tôi.") == ["대학맥락"]

    korean = _edit(_plan(), 3, fact_keys=(), source_ko=_with_cta("저희는 전주기전대학과 MOU를 체결했습니다.", "ko"))
    assert [f.code for f in _check(korean, banned)] == ["대학맥락"]


def test_같은_문구가_여러_번_나와도_문구마다_한_번만_보고한다():
    plan = _edit(_plan(), 0, source_ko=_with_cta("합격 보장! 정말 합격 보장입니다. 취업 보장.", "ko"))

    findings = _check(plan, _banned({"ko": ("합격 보장", "취업 보장")}))

    assert [f.code for f in findings] == ["금지표현", "금지표현"]
    assert "합격 보장" in findings[0].message and "취업 보장" in findings[1].message


# --- 대학명과 맥락 --------------------------------------------------------------


def test_대학명과_협력표현이_같은_게시물에_있으면_오류():
    # 등록금 사실을 쓰지 않는 글이라 fact_keys는 비운다(등록금 한정어 규칙이 끼어들지 않게).
    plan = _edit(_plan(), 3, source_ko=_with_cta("전주기전대학은 저희 협력 대학입니다.", "ko"), fact_keys=())

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
    plan = _edit(_plan(), 0, source_ko=_with_cta("저희는 한국과 네팔의 협력 분야와 무관합니다.", "ko"))

    assert _check(plan, _banned(university={"ko": ("협력",)})) == []


def test_university_names를_비워도_본문에_승인_대학명이_있으면_대학맥락을_본다():
    # university_names를 빠뜨려도 협력 표현 검사를 건너뛰지 못한다.
    plan = _edit(_plan(), 0, source_ko=_with_cta("저희는 경기대학교와 협력하여 진행합니다.", "ko"))
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


def test_대학교명이_연계_표현과_함께_있으면_경고():
    # 승인 목록 밖의 이름이 연계·협력 같은 말과 한 게시물에 있으면 목록에 없는 대학과의 관계를 말하는 글일 수 있다.
    related = _edit(_plan(), 0, source_ko=_with_cta("저희는 서울대학교와 연계되어 있습니다.", "ko"))
    assert related.posts[0].university_names == ()

    findings = _check(related, _real_banned())

    assert _brief(findings) == [(0, "대학명후보", "warning")]
    assert "서울대학교" in findings[0].message and "연계" in findings[0].message

    # 회사가 말하는 문장이 아니면(1인칭 표지가 없으면) 관계 어휘가 있어도 후보로 보지 않는다.
    third_party = _edit(_plan(), 0, source_ko=_with_cta("서울대학교는 산업체와 연계하여 교육합니다.", "ko"))

    assert _check(third_party, _real_banned()) == []

    # 같은 이름이라도 맥락 어휘가 없는 소개는 통과한다. 한국의 대학을 소개하는 글은 허용된다.
    intro = _edit(_plan(), 0, source_ko=_with_cta("서울대학교는 서울에 있는 대학교입니다.", "ko"))

    assert _check(intro, _real_banned()) == []


def test_대학명후보는_현지어_본문의_연계_표현과도_짝지어_본다():
    body = _with_cta("서울대학교 hợp tác với chúng tôi.", "vi")
    plan = _edit(_plan(), 0, body_local=body)

    findings = _check(plan, _banned(university={"vi": ("hợp tác",)}))

    assert _brief(findings) == [(0, "대학명후보", "warning")]
    assert "hợp tác" in findings[0].message


def test_대학명후보는_이름마다_하나씩_보고한다():
    plan = _edit(_plan(), 0, source_ko=_with_cta("저희는 서울대학교와 연세대학교를 소개하며 서울대학교와 연계됩니다.", "ko"))

    findings = _check(plan, _banned(university={"ko": ("연계",)}))

    assert _brief(findings) == [(0, "대학명후보", "warning"), (0, "대학명후보", "warning")]
    assert "서울대학교" in findings[0].message and "연세대학교" in findings[1].message


def test_대학명후보도_같은_문장의_1인칭과_관계어휘로만_발화한다():
    # 소개하는 문장(저희)과 관계 어휘(연계)가 다른 문장이면 목록 밖의 이름이 있어도 경고하지 않는다.
    apart = _edit(
        _plan(), 0,
        source_ko=_with_cta("저희는 한국 대학을 소개합니다. 서울대학교는 산업체와 연계하여 교육합니다.", "ko"),
    )
    assert _check(apart, _real_banned()) == []

    together = _edit(_plan(), 0, source_ko=_with_cta("서울대학교를 소개합니다. 저희가 연계하는 학교입니다.", "ko"))

    assert _brief(_check(together, _real_banned())) == [(0, "대학명후보", "warning")]


def test_승인_목록에_있는_대학명은_대학명후보가_아니다():
    # 승인된 이름의 연계 표현은 대학맥락이 이미 오류로 잡는다. 후보로 또 보고하지 않는다.
    plan = _edit(_plan(), 0, source_ko=_with_cta("저희는 경기대학교와 연계되어 있습니다.", "ko"))

    findings = _check(plan, _real_banned())

    assert _brief(findings) == [(0, "대학맥락", "error")]


def test_university_names에_적은_대학명은_대학명후보가_아니다():
    # 선언한 이름은 대학명목록외가 이미 오류로 잡는다.
    plan = _edit(
        _plan(), 3,
        university_names=("서울대학교",),
        source_ko=_with_cta("저희는 서울대학교와 연계되어 있습니다.", "ko"),
        body_local=_with_cta("서울대학교 안내.", "vi"),
        fact_keys=(),
    )

    findings = _check(plan, _real_banned())

    assert [f.code for f in findings] == ["대학명목록외", "대학맥락"]


def test_전문대학_같은_일반_명사는_대학교명_후보가_아니다():
    # 후보 패턴은 `…대학교`뿐이다. 픽스처 원문에도 있는 `전문대학`이 연계 표현 옆에서 걸리면 안 된다.
    plan = _edit(_plan(), 0, source_ko=_with_cta("저희는 전문대학과 연계되어 있습니다.", "ko"))

    assert _check(plan, _real_banned()) == []


@pytest.mark.parametrize("name", ["종합대학교", "국립대학교", "4년제대학교"])
def test_종합대학교_같은_일반_명사는_대학교명_후보가_아니다(name):
    # `…대학교`가 이름이 아니라 일반 명사로 쓰인 경우. 붙여 쓴 `4년제대학교`는 낱말이 `년제대학교`로 잡힌다.
    plan = _edit(_plan(), 0, source_ko=_with_cta(f"저희는 {name}와 연계되어 있습니다.", "ko"))

    assert _check(plan, _real_banned()) == []


# 한국의 대학을 소개하는 글에 흔한 문장. 산학협력단·국제협력처는 대부분의 대학에 있는 부서 이름이고,
# 연계전공은 학사 용어이며, 합격자 발표는 일정 안내이고, 불합격은 약속의 반대다.
_UNIVERSITY_PROSE = [
    "전북대학교 산학협력단이 유학생 지원 프로그램을 운영합니다.",
    "경기대학교는 연계전공 제도를 운영합니다.",
    "청주대학교의 국제협력처가 유학생을 담당합니다.",
    "호남대학교의 합격자 발표는 12월입니다.",
    "우석대학교에 불합격하더라도 다른 선택이 있습니다.",
]


# 대학 자신의 관계를 말하는 문장과 다른 나라 말로 옮긴 부서 이름. 회사가 말하는 문장이 아니라 1인칭 표지가 없다.
# 비한국어 문장은 AI가 쓴 것이라 어법·용어가 검수되지 않았다 — 확인하는 것은 사전이 이 글들을 막지 않는다는 점이다.
_UNIVERSITY_PROSE_OTHER = {
    "ko": [
        "경기대학교는 해외 대학과 학점교류 협약을 맺고 있습니다.",
        "경기대학교는 산업체와 협력하여 실무 교육을 운영합니다.",
        "경기대학교는 지역사회와 연계하여 봉사 프로그램을 운영합니다.",
        "경기대학교 학생증은 제휴 할인이 됩니다.",
        # `파트너 대학`이라고 쓰면 주어와 상관없이 모든 게시물 구역이 금지표현으로 건다(협력 대학과 같은 꼴).
        "청주대학교는 해외 파트너십 프로그램으로 교환학생을 운영합니다.",
        "경기대학교 국제교류처는 해외 MOU 대학과의 교환학생을 담당합니다.",
        "전북대학교 산학협력단은 연계전공 학생을 지원합니다.",
    ],
    "vi": [
        "전북대학교 có Đoàn hợp tác công nghiệp - đại học hỗ trợ du học sinh.",
        "경기대학교 vận hành chương trình chuyên ngành liên kết.",
        "Phòng Hợp tác Quốc tế của 청주대학교 phụ trách du học sinh.",
        "Kết quả trúng tuyển của 호남대학교 được công bố vào tháng 12.",
        "Dù không trúng tuyển 우석대학교, bạn vẫn còn lựa chọn khác.",
    ],
    "my": [
        "전북대학교 ၏ စက်မှုလက်မှုပူးပေါင်းဆောင်ရွက်ရေးဌာနက နိုင်ငံခြားသားကျောင်းသားများကို ကူညီပါသည်။",
        "청주대학교 ၏ နိုင်ငံတကာ ပူးပေါင်းဆောင်ရွက်ရေးရုံးက ကျောင်းသားများကို တာဝန်ယူသည်။",
        "경기대학교 တွင် ချိတ်ဆက်ပညာရပ်များ ရှိသည်။",
    ],
    "ne": [
        "전북대학교 को उद्योग-विश्वविद्यालय सहकार्य एकाइले विदेशी विद्यार्थीलाई सहयोग गर्छ।",
        "청주대학교 को अन्तर्राष्ट्रिय सहकार्य कार्यालयले विद्यार्थीलाई सहयोग गर्छ।",
        "경기대학교 ले साझेदार उद्योगसँग मिलेर काम गर्छ।",
    ],
}


def test_대학_실무_표현은_대학맥락이_아니다():
    for sentence in _UNIVERSITY_PROSE:
        plan = _edit(_plan(), 0, source_ko=_with_cta(sentence, "ko"))

        assert _check(plan, _real_banned()) == [], sentence

    # 대학 자신의 관계, 제휴 할인, 다른 나라 말로 옮긴 부서 이름도 같다.
    for language, sentences in _UNIVERSITY_PROSE_OTHER.items():
        for sentence in sentences:
            if language == "ko":
                plan = _edit(_plan(), 0, source_ko=_with_cta(sentence, "ko"))
            else:
                plan = _edit(_plan(), {"vi": 0, "my": 1, "ne": 2}[language], body_local=_with_cta(sentence, language))

            assert _check(plan, _real_banned()) == [], (language, sentence)

    # 합격자 발표와 불합격은 회사가 말하더라도 약속이 아니다. `합격` 낱말 자체는 맥락 어휘에 넣지 않는다.
    for sentence in (
        "저희는 호남대학교의 합격자 발표 일정을 안내합니다.",
        "저희는 우석대학교에 불합격하더라도 다른 선택이 있다고 안내합니다.",
    ):
        plan = _edit(_plan(), 0, source_ko=_with_cta(sentence, "ko"))

        assert _check(plan, _real_banned()) == [], sentence


def test_대학맥락은_1인칭_주체가_있어야_발화한다():
    def codes(sentence: str) -> set[str]:
        plan = _edit(_plan(), 0, source_ko=_with_cta(sentence, "ko"))
        return {f.code for f in _check(plan, _real_banned())}

    # 대학명 + 관계 어휘만으로는 통과한다: 대학 자신의 관계이거나 부서 이름이다.
    for sentence in (
        "경기대학교와 협력하고 있습니다.",
        "경기대학교 학생증은 제휴 할인이 됩니다.",
        "청주대학교는 글로벌 파트너 대학과 교환학생을 운영합니다.",
        "경기대학교는 학점교류 협약을 맺고 있습니다.",
    ):
        assert "대학맥락" not in codes(sentence), sentence

    # 회사가 스스로를 가리키는 표지(저희·우리·당사·회사명)가 붙을 때만 오류다. 우리는 주어·화제·소유 조사가 붙은 꼴이다.
    for sentence in (
        "저희는 경기대학교와 협력하고 있습니다.",
        "우리는 경기대학교와 협력하고 있습니다.",
        "우리가 경기대학교와 협력하고 있습니다.",
        "우리도 경기대학교와 협력하고 있습니다.",
        "경기대학교와의 협력은 우리의 일입니다.",
        "경기대학교는 우리를 통해 협력합니다.",
        "우리 회사는 경기대학교와 협력합니다.",
        "우리 회사와 경기대학교의 협력 소식입니다.",
        "우리 회사 경기대학교 협력 안내",
        "우리들은 경기대학교와 협약을 맺었습니다.",
        "우리들이 경기대학교와 협력합니다.",
        "우리들도 경기대학교와 협력합니다.",
        "경기대학교와의 협력은 우리들의 일입니다.",
        "경기대학교는 우리들을 통해 협력합니다.",
        "당사는 경기대학교와 협력하고 있습니다.",
        "정우인재개발원은 경기대학교와 협력하고 있습니다.",
    ):
        assert "대학맥락" in codes(sentence), sentence

    # 1인칭처럼 보이지만 아닌 말: 우리나라, 당사자, 해당사항, 담당사원, `우리 나라`·`우리 사회`·`우리 유학생`, 우리은행.
    for sentence in (
        "우리나라의 경기대학교는 산업체와 협력하고 있습니다.",
        "당사자는 경기대학교와 협력하는 기관에 문의합니다.",
        "해당사항이 없으면 경기대학교 산학협력단에 문의하세요.",
        "담당사원이 경기대학교 국제협력처를 안내합니다.",
        "우리 나라의 경기대학교는 산업체와 협력하여 교육합니다.",
        "우리 유학생들이 경기대학교 산학협력단의 지원을 받습니다.",
        "경기대학교는 우리 사회와 협력하는 대학입니다.",
        "우리은행 계좌로 경기대학교 산학협력단 등록금을 납부합니다.",
        "우리들 유학생이 경기대학교 산학협력단의 지원을 받습니다.",
        "우리 사회가 경기대학교 산학협력단을 지원합니다.",
    ):
        assert "대학맥락" not in codes(sentence), sentence

    # 1인칭 표지가 있어도 대학명이 없으면 이 규칙의 대상이 아니다.
    assert "대학맥락" not in codes("저희는 한국의 여러 기관과 협력하고 있습니다.")

    # 메시지는 무엇이 회사의 표지로 읽혔는지 알려 준다.
    plan = _edit(_plan(), 0, source_ko=_with_cta("당사는 경기대학교와 협력하고 있습니다.", "ko"))
    message = next(f.message for f in _check(plan, _real_banned()) if f.code == "대학맥락")

    assert "스스로(당사)" in message and "협력" in message


def test_대학맥락_1인칭_판정은_네_언어_모두_돈다():
    # (언어, 게시물 번호, 표지 없는 문장, 표지가 있는 문장들). 3~5번 게시물은 전주기전대학을 다루는 vi·my·ne 글이다.
    cases = {
        "vi": (3, "전주기전대학 hợp tác quốc tế.", [
            "Chúng tôi hợp tác với 전주기전대학.",
            unicodedata.normalize("NFD", "Chúng tôi") + " hợp tác với 전주기전대학.",
            f"{GLOSSARY['company_name']['vi']} hợp tác với 전주기전대학.",
            "정우인재개발원 hợp tác với 전주기전대학.",
        ]),
        "my": (4, "전주기전대학 ပူးပေါင်းဆောင်ရွက်ရေး။", [
            "ကျွန်ုပ်တို့သည် 전주기전대학 နှင့် ပူးပေါင်းသည်။",
            "ကျွန်ုပ်တို့၏ 전주기전대학 နှင့် ပူးပေါင်းမှု ရှိသည်။",
            "ကျွန်ုပ်\u200bတို့သည် 전주기전대학 နှင့် ပူးပေါင်းသည်။",
            "ကျွန်တော်တို့ 전주기전대학 နှင့် ပူးပေါင်းသည်။",
            "ကျွန်မတို့ 전주기전대학 နှင့် ပူးပေါင်းသည်။",
            f"{GLOSSARY['company_name']['my']} 전주기전대학 နှင့် ပူးပေါင်းသည်။",
        ]),
        "ne": (5, "전주기전대학 सहकार्य कार्यालय।", [
            "हामी 전주기전대학 सँग सहकार्य गर्छौं।",
            "हामीले 전주기전대학 सँग सहकार्य गर्छौं।",
            "हाम्रो 전주기전대학 सँग सहकार्य छ।",
            "हाम्रा 전주기전대학 सँग सहकार्य छन्।",
            "हाम्री 전주기전대학 सँग सहकार्य छ।",
            f"{GLOSSARY['company_name']['ne']} 전주기전대학 सँग सहकार्य गर्छ।",
        ]),
    }

    def fired(index: int, language: str, sentence: str) -> bool:
        plan = _edit(_plan(), index, body_local=_with_cta(sentence, language))
        return any(f.code == "대학맥락" and f.post_index == index for f in _check(plan, _real_banned()))

    for language, (index, bare, marked) in cases.items():
        assert not fired(index, language, bare), (language, bare)
        for sentence in marked:
            assert fired(index, language, sentence), (language, sentence)

    # 한국어 표지(저희)는 현지어 본문의 표지가 아니다. `chúng tan`(그것들이 녹는다)은 `chúng tôi`가 아니다.
    assert not fired(3, "vi", "저희 hợp tác với 전주기전대학.")
    assert not fired(3, "vi", "전주기전대학 chúng tan hợp tác.")

    # 글을 읽는 사람까지 아우르는 `chúng ta`(우리 모두)는 회사가 아니다. 회사를 가리키는 것은 배타적 `chúng tôi`뿐이다.
    assert not fired(3, "vi", "Chúng ta hãy cùng tìm hiểu chương trình hợp tác của 전주기전대학.")

    # 네팔어: 나라·민족·"우리 모두"를 말하는 `हामी`·`हाम्रो`는 회사가 아니다. 회사가 하는 말(`हामी`, `हाम्रो` + 다른 말)은 그대로 걸린다.
    for generic in (
        "हाम्रो देशका विद्यार्थीहरूका लागि 전주기전대학 सहकार्य कार्यक्रम।",
        "हाम्रा देशका विद्यार्थीका लागि 전주기전대학 सहकार्य कार्यक्रम।",
        "हामी नेपालीहरूका लागि 전주기전대학 सहकार्य कार्यक्रम।",
        "हामी सबै 전주기전대학 सहकार्य कार्यक्रम हेर्न सक्छौं।",
    ):
        assert not fired(5, "ne", generic), generic
    assert fired(5, "ne", "हामी नेपालीहरूसँग 전주기전대학 सहकार्य गर्छौं भन्छौं, तर हामी गर्छौं।")

    # 미얀마어: "우리나라"·"우리 미얀마 사람들"을 말하는 대명사는 회사가 아니다.
    for generic in (
        "ကျွန်တော်တို့ မြန်မာတွေအတွက် 전주기전대학 ပူးပေါင်းဆောင်ရွက်ရေး အစီအစဉ်။",
        "ကျွန်ုပ်တို့၏ နိုင်ငံရှိ 전주기전대학 ပူးပေါင်းဆောင်ရွက်ရေး အစီအစဉ်။",
        "ကျွန်ုပ်တို့နိုင်ငံက 전주기전대학 ပူးပေါင်းဆောင်ရွက်ရေး အစီအစဉ်။",
        "ကျွန်ုပ်တို့ အားလုံး 전주기전대학 ပူးပေါင်းဆောင်ရွက်ရေး အစီအစဉ်ကို လေ့လာကြပါစို့။",
    ):
        assert not fired(4, "my", generic), generic

    # 한국어 원문에서만 1인칭이 있으면 항목은 원문 쪽 하나뿐이다. 본문은 본문의 표지로 따로 판정한다.
    plan = _edit(
        _plan(), 3, fact_keys=(),
        source_ko=_with_cta("저희는 전주기전대학과 협력합니다.", "ko"),
        body_local=_with_cta("전주기전대학 hợp tác quốc tế.", "vi"),
    )
    findings = [f for f in _check(plan, _real_banned()) if f.code == "대학맥락"]

    assert len(findings) == 1
    assert "한국어 원문" in findings[0].message and "현지어 본문" not in findings[0].message


def test_1인칭과_관계어휘가_다른_문장이면_발화하지_않는다():
    # 회사 목소리로 한국의 대학을 소개하는 것이 이 페이지의 목적이다. 소개하는 문장과 대학 부서 이름이 한 글에 있어도
    # 같은 문장이 아니면 막지 않는다.
    korean = _edit(
        _plan(), 0,
        source_ko=_with_cta("저희는 한국 대학을 소개합니다. 전북대학교 산학협력단은 유학생을 지원합니다.", "ko"),
    )
    assert _check(korean, _real_banned()) == []

    vietnamese = _edit(
        _plan(), 0,
        body_local=_with_cta("Chúng tôi giới thiệu 전북대학교. Phòng Hợp tác Quốc tế hỗ trợ du học sinh.", "vi"),
    )
    assert _check(vietnamese, _real_banned()) == []

    # 문장 끝으로 보는 글자는 모두 문장을 가른다. 공백만이면 한 문장이라 발화한다.
    def korean_codes(joiner: str) -> list[str]:
        sentence = f"저희는 한국 대학을 소개합니다{joiner}전북대학교 산학협력단은 유학생을 지원합니다"
        plan = _edit(_plan(), 0, source_ko=_with_cta(sentence, "ko"))
        return [f.code for f in _check(plan, _real_banned())]

    for end in (". ", "!", "?", "。", "\n", "।", "။"):
        assert korean_codes(end) == [], repr(end)
    assert korean_codes(" ") == ["대학맥락"]

    # 다른 나라 글의 문장 끝(데바나가리 `।`, 미얀마어 `။`)도 같다.
    def local_codes(index: int, language: str, first: str, second: str, joiner: str) -> list[str]:
        plan = _edit(_plan(), index, body_local=_with_cta(f"{first}{joiner}{second}", language))
        return [f.code for f in _check(plan, _real_banned()) if f.post_index == index]

    ne = (5, "ne", "हामी 전주기전대학 को परिचय दिन्छौं", "सहकार्य कार्यालयले सहयोग गर्छ")
    my = (4, "my", "ကျွန်ုပ်တို့သည် 전주기전대학 ကို မိတ်ဆက်ပေးပါသည်", "ပူးပေါင်းဆောင်ရွက်ရေးဌာနက ကူညီသည်")
    for case, end in ((ne, "।"), (my, "။")):
        assert local_codes(*case, end) == [], case[1]
        assert local_codes(*case, " ") == ["대학맥락"], case[1]


def test_날짜와_주소와_소수의_마침표는_문장을_끊지_않는다():
    # 마침표는 숫자 뒤가 아니고 뒤에 공백이나 글의 끝이 올 때만 문장 끝이다. 한국어 날짜(`2026. 11. 1.`), 주소(`www.a.kr`),
    # 소수(`8,028,841.1`) 안에서 끊으면 같은 문장의 1인칭과 관계 어휘가 갈라져 회사의 주장이 사라진다.
    for sentence in (
        "저희는 2026. 11. 1.부터 경기대학교와 협력합니다",
        "저희는 www.kyonggi.ac.kr 의 경기대학교와 협약을 맺었습니다",
        "저희가 안내하는 경기대학교 등록금은 8,028,841.1원이고 협력 관계는 2026년부터입니다",
    ):
        plan = _edit(_plan(), 0, source_ko=_with_cta(sentence, "ko"), fact_keys=())

        assert "대학맥락" in {f.code for f in _check(plan, _real_banned())}, sentence


def test_같은_문장에_1인칭과_관계어휘가_있으면_대학명이_다른_문장에_있어도_발화한다():
    # 대학명은 글 어디에 있어도 된다: 이름을 소개하고 다음 문장에서 관계를 주장하는 경우.
    plan = _edit(_plan(), 0, source_ko=_with_cta("경기대학교를 소개합니다. 저희가 협력하는 대학입니다.", "ko"))

    findings = _check(plan, _real_banned())

    assert _brief(findings) == [(0, "대학맥락", "error")]
    assert "경기대학교" in findings[0].message and "저희가 협력하는 대학입니다" in findings[0].message

    # 한 문장에 둘 다 있는 경우도 발화한다.
    single = _edit(_plan(), 0, source_ko=_with_cta("저희는 경기대학교와 협력하고 있습니다.", "ko"))

    assert [f.code for f in _check(single, _real_banned())] == ["대학맥락"]


def test_같은_관계_어휘가_회사가_말하는_여러_문장에_있어도_한_번만_보고한다():
    sentence = "저희는 경기대학교와 협력합니다. 저희는 또 경기대학교와 협력합니다."
    plan = _edit(_plan(), 0, source_ko=_with_cta(sentence, "ko"))

    assert [f.code for f in _check(plan, _real_banned())] == ["대학맥락"]


def test_회사명_표지는_용어집의_그_언어_표기를_따른다():
    # 용어집 표기에 한국어 이름이 들어 있지 않아도 그 표기로 쓴 글은 회사가 말하는 글이다.
    glossary = copy.deepcopy(GLOSSARY)
    glossary["company_name"]["vi"] = "Jeongwoo HRD Institute"
    plan = _edit(_plan(), 3, body_local=_with_cta("Jeongwoo HRD Institute hợp tác với 전주기전대학.", "vi"))

    findings = validate_copy(plan, UNIVERSITIES, _real_banned(), glossary, FACTS)

    assert [f.code for f in findings if f.post_index == 3 and f.code == "대학맥락"] == ["대학맥락"]


def test_합격을_보장한다는_말은_모든_게시물_구역이_한_번만_잡는다():
    # `합격을 보장`은 모든 게시물 구역에 있다. 대학명 구역에 또 두면 같은 말에 항목이 둘 생긴다.
    plan = _edit(_plan(), 0, source_ko=_with_cta("저희는 경기대학교 합격을 보장합니다.", "ko"))

    assert [f.code for f in _check(plan, _real_banned())] == ["금지표현"]


def test_대학명_구역의_문구는_모든_게시물_구역에_이미_있는_말을_되풀이하지_않는다():
    banned = _real_banned()
    for language in LANGS:
        for phrase in banned[f"{language}:대학명"]:
            if language == "ko":
                plan = _edit(_plan(), 0, source_ko=phrase)
            else:
                plan = _edit(_plan(), {"vi": 0, "my": 1, "ne": 2}[language], body_local=phrase)

            repeated = [f for f in _check(plan, banned) if f.code == "금지표현"]

            assert repeated == [], f"{language}: '{phrase}'은(는) 모든 게시물 구역이 이미 금지한다"


def test_1인칭_없는_협력_대학_표현은_금지표현이_걸린다():
    # 대학맥락이 1인칭을 요구하는 대신 주어 없는 `협력 대학` 꼴은 모든 게시물 구역이 잡는다. 네 언어 모두에 있다.
    raw = json.loads(config.BANNED_PHRASES_PATH.read_text(encoding="utf-8"))
    cases = {
        "ko": "협력 대학입니다.",
        "vi": "Đây là trường đối tác.",
        "my": "မိတ်ဖက် တက္ကသိုလ် ဖြစ်ပါသည်။",
        "ne": "यो साझेदार विश्वविद्यालय हो।",
    }
    for language, sentence in cases.items():
        if language == "ko":
            plan, index = _edit(_plan(), 0, source_ko=_with_cta(sentence, "ko")), 0
        else:
            index = {"vi": 0, "my": 1, "ne": 2}[language]
            plan = _edit(_plan(), index, body_local=_with_cta(sentence, language))

        findings = [f for f in _check(plan, _real_banned()) if f.post_index == index and f.code == "금지표현"]
        phrases = raw[SECTION_ALWAYS][language]["협력 대학"]

        assert any(f"'{phrase}'" in f.message for f in findings for phrase in phrases), (language, findings)


@pytest.mark.parametrize(
    "sentence",
    [
        "저희는 경기대학교와 협력 관계를 맺고 있습니다.",
        "저희는 경기대학교와 협력하여 진행합니다.",
        "저희는 경기대학교와 업무협약을 맺었습니다.",
        "저희는 경기대학교와 제휴되어 있습니다.",
        "경기대학교는 저희 파트너입니다.",
        "저희는 경기대학교와 연계되어 있습니다.",
        "저희는 경기대학교와 연계하여 안내합니다.",
        "저희는 경기대학교 입학을 알선합니다.",
        "저희는 경기대학교와 MOU를 체결했습니다.",
        "저희는 경기대학교 합격 가능성이 높다고 봅니다.",
    ],
    ids=["협력-관계", "협력하여", "업무협약", "제휴", "파트너", "연계되어", "연계하여", "알선", "MOU", "합격-가능"],
)
def test_약속이나_관계를_말하는_표현은_대학맥락이다(sentence):
    plan = _edit(_plan(), 0, source_ko=_with_cta(sentence, "ko"))

    codes = {f.code for f in _check(plan, _real_banned())}

    assert "대학맥락" in codes, sentence


# --- 용어집 ------------------------------------------------------------------


def test_용어집_용어가_다르게_표기되면_경고():
    plan = _edit(_plan(), 0, body_local=_with_cta("Visa D-2 dành cho người học chương trình chính quy.", "vi"))

    findings = _check(plan)

    assert _brief(findings) == [(0, "용어불일치", "warning")]
    assert "D-2" in findings[0].message and GLOSSARY["visa_d2"]["vi"] in findings[0].message


def test_용어집_표기를_그대로_쓰면_통과():
    body = _with_cta(f"{GLOSSARY['visa_d2']['vi']} dành cho người học chương trình chính quy.", "vi")

    assert _check(_edit(_plan(), 0, body_local=body)) == []


def test_D_4도_용어집_표기를_요구한다():
    plain = _with_cta("Visa D-4 dành cho người học tiếng.", "vi")
    assert _brief(_check(_edit(_plan(), 0, body_local=plain))) == [(0, "용어불일치", "warning")]

    exact = _with_cta(f"{GLOSSARY['visa_d4']['vi']} dành cho người học tiếng.", "vi")
    assert _check(_edit(_plan(), 0, body_local=exact)) == []


def test_용어집_불일치는_용어마다_하나씩_보고한다():
    body = _with_cta("Visa D-2 do 정우인재개발원 tư vấn.", "vi")

    findings = _check(_edit(_plan(), 0, body_local=body))

    assert _brief(findings) == [(0, "용어불일치", "warning"), (0, "용어불일치", "warning")]
    assert "D-2" in findings[0].message and "정우인재개발원" in findings[1].message


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
        "주 20 시간까지 일할 수 있습니다.",
        "하루 4시간 근무합니다.",
        "합격률은 95%입니다.",
        "장학금 50퍼센트를 받습니다.",
        "비용은 $500입니다.",
        "비용은 ¥100,000입니다.",
    ],
    ids=["원", "만-원", "엔", "주-시간", "주-시간-공백", "하루-시간", "퍼센트-기호", "퍼센트-글자", "달러-기호", "엔-기호"],
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
    # 범위를 정한 것이다: 현지어 숫자 표기까지 상대하지 않고 원문만 본다. 원문에 수치가 없으면
    # 본문 쪽에 금액처럼 보이는 글이 있어도 이 검사는 판정하지 않는다(본문의 수치는 역번역 대조가 본다).
    body = _with_cta("Học phí của 전주기전대학 là 6,800,000원 một năm.", "vi")
    plan = _edit(
        _plan(), 3, fact_keys=(), body_local=body,
        source_ko=_with_cta("전주기전대학의 등록금을 안내합니다.", "ko"),
    )
    assert "6,800,000원" in plan.posts[3].body_local

    assert _check(plan) == []


def test_같은_수치가_되풀이되어도_메시지에는_한_번만_나온다():
    sentence = "등록금은 6,800,000원입니다. 다시 말해 6,800,000원입니다."
    plan = _edit(_plan(), 0, source_ko=_with_cta(sentence, "ko"), fact_keys=())

    findings = _check(plan)

    assert _brief(findings) == [(0, "출처없는수치", "warning")]
    assert findings[0].message.count("6,800,000원") == 1


def test_수치가_여럿이어도_출처없는수치는_게시물당_하나다():
    sentence = "등록금은 6,800,000원이고 주 20시간 일하며 합격률은 95%입니다."
    plan = _edit(_plan(), 0, source_ko=_with_cta(sentence, "ko"), fact_keys=())

    findings = _check(plan)

    assert _brief(findings) == [(0, "출처없는수치", "warning")]
    for shown in ("6,800,000원", "20시간", "95%"):
        assert shown in findings[0].message


def test_인용한_사실에_없는_수치는_경고():
    # 사실을 하나라도 인용하면 모든 수치가 통과하던 구멍. 주 20시간은 1차 출처가 없어 일부러 뺀 수치이고
    # 장학금 50%는 비용 약속이다. 원문과 번역이 같은 수치를 말하므로 역번역 대조도 못 잡는다.
    sentence = "유학(D-2) 학생은 주 20시간까지 아르바이트를 할 수 있고 장학금 50%를 받습니다."
    plan = _edit(_plan(), 0, source_ko=_with_cta(sentence, "ko"), fact_keys=("part_time_work_permit_required",))
    assert plan.posts[0].fact_keys

    findings = _check(plan)

    assert _brief(findings) == [(0, "출처없는수치", "warning")]
    for shown in ("20시간", "50%", "part_time_work_permit_required"):
        assert shown in findings[0].message


def test_수치의_숫자는_인용한_사실에_통째로_들어_있어야_한다():
    # 사실 값의 `2026`에 `20`이 부분 문자열로 들어 있어도 `주 20시간`의 출처가 되지는 않는다.
    sentence = "전주기전대학의 연간 평균 등록금은 6,800,000원이고 주 20시간 일합니다."
    assert "20" in FACTS["tuition_kijeon"].value
    plan = _edit(_plan(), 3, source_ko=_with_cta(sentence, "ko"))

    findings = _check(plan)

    assert _brief(findings) == [(3, "출처없는수치", "warning")]
    assert "20시간" in findings[0].message and "6,800,000원" not in findings[0].message


@pytest.mark.parametrize(
    ("key", "sentence"),
    [
        ("tuition_kijeon", "전주기전대학의 연간 평균 등록금은 6800000원입니다."),
        ("tuition_kyonggi", "경기대학교의 연간 평균 등록금은 8,028,841.1원입니다."),
        ("tuition_kyonggi", "경기대학교의 연간 평균 등록금은 8,028,841원입니다."),
    ],
    ids=["쉼표-없이", "소수점", "소수점-버림"],
)
def test_천_단위_쉼표는_숫자_비교에서_무시하고_소수점은_그대로_본다(key, sentence):
    plan = _edit(_plan(), 0, source_ko=_with_cta(sentence, "ko"), fact_keys=(key,))

    assert _check(plan) == []


def test_반올림하거나_단위를_바꾼_수치는_경고한다():
    # 알려진 거짓 양성: 803은 8028841.1이 아니다. 경고라서 검토 화면에서 사람이 넘긴다.
    sentence = "경기대학교의 연간 평균 등록금은 약 803만원입니다."
    plan = _edit(_plan(), 0, source_ko=_with_cta(sentence, "ko"), fact_keys=("tuition_kyonggi",))

    findings = _check(plan)

    assert _brief(findings) == [(0, "출처없는수치", "warning")]
    assert "803만원" in findings[0].message


def test_소수점_아래가_다른_수치는_경고한다():
    # 정수부가 같아도 소수가 다르면 다른 수다.
    sentence = "경기대학교의 연간 평균 등록금은 8,028,841.9원입니다."
    plan = _edit(_plan(), 0, source_ko=_with_cta(sentence, "ko"), fact_keys=("tuition_kyonggi",))

    findings = _check(plan)

    assert _brief(findings) == [(0, "출처없는수치", "warning")]
    assert "8,028,841.9원" in findings[0].message


def test_인용한_사실이_여럿이면_어느_하나에든_있으면_통과한다():
    sentence = "전주기전대학의 연간 평균 등록금은 6,800,000원입니다."
    plan = _edit(
        _plan(), 0, source_ko=_with_cta(sentence, "ko"),
        fact_keys=("part_time_work_permit_required", "tuition_kijeon"),
    )

    assert _check(plan) == []


def test_인용하지_않은_사실에만_있는_수치는_경고한다():
    assert "6,800,000" in FACTS["tuition_kijeon"].value
    plan = _edit(_plan(), 0, source_ko=_with_cta("등록금은 6,800,000원입니다.", "ko"), fact_keys=("visa_d2_definition",))

    assert _brief(_check(plan)) == [(0, "출처없는수치", "warning")]


def test_facts에_없는_키를_인용해도_수치의_출처로_치지_않는다():
    # 없는 키 자체는 validate_facts가 사실없음으로 보고한다. 여기서는 그 키를 근거로 삼지 않을 뿐이다.
    plan = _edit(_plan(), 0, source_ko=_with_cta("등록금은 6,800,000원입니다.", "ko"), fact_keys=("없는-키",))

    assert _brief(_check(plan)) == [(0, "출처없는수치", "warning")]


@pytest.mark.parametrize(
    "sentence",
    ["제1원칙은 안전입니다.", "3원색으로 나타냅니다.", "2026 원서 접수가 시작됩니다."],
    ids=["원칙", "원색", "원서"],
)
def test_원칙_원색의_원은_금액이_아니다(sentence):
    plan = _edit(_plan(), 0, source_ko=_with_cta(sentence, "ko"), fact_keys=())

    assert _check(plan) == []


# --- 등록금 한정어 -------------------------------------------------------------


def _tuition_plan(source: str, **changes) -> Plan:
    """3번(vi, tuition_kijeon) 게시물의 원문만 `source`로 바꾼다(상담 문구는 붙여 준다)."""
    return _edit(_plan(), 3, source_ko=_with_cta(source, "ko"), **changes)


def test_등록금_사실을_인용하면_평균과_연단위_한정어가_있어야_한다():
    # 한정어가 모두 있는 픽스처 원문은 통과하고, '평균'을 뗀 원문은 오류다.
    assert _check(_plan()) == []

    findings = _check(_tuition_plan("전주기전대학의 연간 등록금은 6,800,000원입니다."))

    assert _brief(findings) == [(3, "등록금한정어", "error")]
    assert "평균" in findings[0].message
    assert "1년" not in findings[0].message  # 연단위는 '연간'으로 갖췄으므로 빠졌다고 하지 않는다


def test_등록금_원문에_연단위_한정어가_없으면_오류():
    findings = _check(_tuition_plan("전주기전대학의 평균 등록금은 6,800,000원입니다."))

    assert _brief(findings) == [(3, "등록금한정어", "error")]
    assert "1년" in findings[0].message and "연간" in findings[0].message
    assert "'평균'" not in findings[0].message


def test_등록금_원문에_평균도_연단위도_없으면_한_항목에_둘_다_알린다():
    findings = _check(_tuition_plan("전주기전대학의 등록금은 6,800,000원입니다."))

    assert _brief(findings) == [(3, "등록금한정어", "error")]
    assert "평균" in findings[0].message and "1년" in findings[0].message


@pytest.mark.parametrize("year_marker", ["1년치", "1년에", "연간", "연간 기준"], ids=["1년치", "1년에", "연간", "연간-기준"])
def test_연단위_한정어는_1년이나_연간_중_하나면_된다(year_marker):
    findings = _check(_tuition_plan(f"전주기전대학의 평균 등록금은 {year_marker} 6,800,000원입니다."))

    assert findings == []


def test_2021년_같은_연도의_1년은_연단위_한정어가_아니다():
    # `2021년`에도 문자열 `1년`이 들어 있다. 연도가 연단위 표시로 둔갑하면 안 된다.
    findings = _check(_tuition_plan("2021년 기준 전주기전대학의 평균 등록금은 6,800,000원입니다."))

    assert _brief(findings) == [(3, "등록금한정어", "error")]


def test_등록금이_아닌_사실은_평균과_연단위_한정어를_요구하지_않는다():
    plan = _tuition_plan("전주기전대학은 유학(D-2) 안내를 합니다.", fact_keys=("visa_d2_definition",))

    assert _check(plan) == []


def test_등록금_사실이_여럿_중_하나여도_한정어를_요구한다():
    plan = _tuition_plan(
        "전주기전대학의 등록금은 6,800,000원입니다.",
        fact_keys=("visa_d2_definition", "tuition_kijeon"),
    )

    assert _brief(_check(plan)) == [(3, "등록금한정어", "error")]


def test_등록금한정어는_같은_게시물의_다른_검사_뒤에_온다():
    plan = _edit(
        _plan(), 3,
        source_ko="전주기전대학의 등록금은 6,800,000원입니다.",  # CTA 없음, 평균·연단위 없음
        body_local=_with_cta("Visa D-2 và 전주기전대학.", "vi"),  # 용어집 표기 아님
    )

    assert [f.code for f in _check(plan)] == ["CTA없음", "용어불일치", "등록금한정어"]


# --- 결과 순서 ----------------------------------------------------------------


def test_같은_게시물_안에서는_검사_순서를_따른다():
    # 한 게시물에서 일곱 가지 검사가 모두 걸리게 한다. 이웃한 두 검사의 순서가 바뀌면 여기서 깨진다.
    # (등록금한정어는 fact_keys가 비면 걸릴 수 없어 따로 본다 — 등록금한정어는_같은_게시물의_다른_검사_뒤에_온다.)
    plan = _edit(
        _plan(), 3, fact_keys=(), university_names=("서울대학교",),
        source_ko="저희는 전주기전대학의 연간 평균등록금 6,800,000원과 합격 보장을, 부산대학교와 협력을 말합니다.",  # CTA 없음
        body_local=_with_cta("Visa D-2 và 전주기전대학.", "vi"),  # 용어집 표기 아님
    )
    banned = _banned(always={"ko": ("합격 보장",)}, university={"ko": ("협력",)})

    findings = _check(plan, banned)

    assert [f.code for f in findings] == [
        "CTA없음", "금지표현", "대학명목록외", "대학맥락", "대학명후보", "용어불일치", "출처없는수치",
    ]
    assert {f.post_index for f in findings} == {3}


def test_결과는_게시물_번호순이다():
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


# --- 입력 가드 ---------------------------------------------------------------


@pytest.mark.parametrize(
    ("key", "language", "value"),
    [
        ("cta", "my", ""),
        ("cta", "ko", "   "),
        ("visa_d2", "my", ""),
        ("visa_d4", "ne", None),
        ("company_name", "vi", 5),
    ],
    ids=["cta-my-빈-문자열", "cta-ko-공백", "visa_d2-my-빈-문자열", "visa_d4-ne-None", "company_name-vi-숫자"],
)
def test_용어집_값이_비면_멈춘다(key, language, value):
    # 빈 문자열은 `endswith("")`가 늘 참이고 `"" not in text`가 늘 거짓이라 CTA·용어집 검사를 조용히 끈다.
    glossary = copy.deepcopy(GLOSSARY)
    glossary[key][language] = value

    with pytest.raises(ValueError, match=rf"{key}\.{language}"):
        validate_copy(_plan(), UNIVERSITIES, _banned(), glossary, FACTS)


@pytest.mark.parametrize(
    ("drop", "message"),
    [
        (lambda g: g.pop("cta"), "cta"),
        (lambda g: g.pop("visa_d2"), "visa_d2"),
        (lambda g: g["cta"].pop("ne"), r"cta\.ne"),
        (lambda g: g["company_name"].pop("ko"), r"company_name\.ko"),
    ],
    ids=["cta-항목", "visa_d2-항목", "cta-ne", "company_name-ko"],
)
def test_용어집에_항목이나_언어가_빠져도_멈춘다(drop, message):
    glossary = copy.deepcopy(GLOSSARY)
    drop(glossary)

    with pytest.raises(ValueError, match=message):
        validate_copy(_plan(), UNIVERSITIES, _banned(), glossary, FACTS)


@pytest.mark.parametrize(
    "universities",
    [
        [{"id": "x"}],
        [{"id": "x", "name_ko": ""}],
        [{"id": "x", "name_ko": "  "}],
        ["경기대학교"],
        [{"id": "kyonggi", "name_ko": "경기대학교"}, {"id": "x"}],
    ],
    ids=["name_ko-없음", "name_ko-빈-문자열", "name_ko-공백", "문자열-항목", "둘째-항목만-나쁨"],
)
def test_대학_목록_항목에_name_ko가_없거나_비면_멈춘다(universities):
    # 빈 이름은 모든 본문에 들어맞아 모든 게시물을 대학명이 나오는 글로 만든다.
    with pytest.raises(ValueError, match="name_ko"):
        validate_copy(_plan(), universities, _banned(), GLOSSARY, FACTS)


def test_validate_copy는_facts를_마지막_인자로_받는다():
    # 네 인자로 부르던 호출이 조용히 통과하지 않고 TypeError로 깨지게 한다.
    assert list(inspect.signature(validate_copy).parameters) == [
        "plan", "universities", "banned", "glossary", "facts",
    ]


# --- 사전을 읽는 쪽 --------------------------------------------------------------


@pytest.mark.parametrize("missing", ["my", "ko:대학명", "ne:대학명"])
def test_사전이_빠진_항목을_가지면_조용히_건너뛰지_않고_멈춘다(missing):
    banned = _banned()
    del banned[missing]

    with pytest.raises(ValueError, match=missing):
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
        (lambda raw: {**raw, SECTION_UNIVERSITY: None}, "객체"),
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
        "JSON-아님", "최상위-배열", "구역-빠짐", "구역-값-null", "구역-오타", "언어-빠짐", "언어-오타", "언어-문구-없음",
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
    ("ko", "비용 보장·무료 유학", "무료 유학의 기회를 드립니다."),
    ("ko", "상담 이후 절차·수수료", "상담 이후 수수료가 발생합니다."),
    ("ko", "협력 대학", "저희 협력 대학을 소개합니다."),
    ("ko", "입학 알선", "저희가 입학을 도와드립니다."),
    ("vi", "합격 보장", "Chúng tôi đảm bảo đỗ cho bạn."),
    ("vi", "취업 보장", "Chúng tôi đảm bảo việc làm sau khi tốt nghiệp."),
    ("vi", "비자 발급 보장", "Chúng tôi đảm bảo visa cho bạn."),
    ("vi", "비용 보장·무료 유학", "Cơ hội du học miễn phí dành cho bạn."),
    ("vi", "상담 이후 절차·수수료", "Phí dịch vụ sẽ được tính sau."),
    ("vi", "협력 대학", "Đây là trường đối tác của chúng tôi."),
    ("vi", "입학 알선", "Chúng tôi hỗ trợ nhập học cho bạn."),
    ("my", "합격 보장", "ကျွန်ုပ်တို့သည် ဝင်ခွင့် အာမခံ ပေးပါသည်။"),
    ("my", "취업 보장", "ကျွန်ုပ်တို့သည် အလုပ်အကိုင် အာမခံ ပေးပါသည်။"),
    ("my", "비자 발급 보장", "ဗီဇာ အာမခံ ရရှိမည်။"),
    ("my", "비용 보장·무료 유학", "ကျောင်းလခ အခမဲ့ ပညာသင်ခွင့်ရပါမည်။"),
    ("my", "상담 이후 절차·수수료", "ဝန်ဆောင်ခ ကောက်ခံပါမည်။"),
    ("my", "협력 대학", "ကျွန်ုပ်တို့၏ မိတ်ဖက် တက္ကသိုလ် ဖြစ်ပါသည်။"),
    ("my", "입학 알선", "ဝင်ခွင့်လျှောက်ရန် ကူညီပေးပါမည်။"),
    ("ne", "합격 보장", "हामी भर्ना ग्यारेन्टी दिन्छौं।"),
    ("ne", "취업 보장", "हामी जागिरको ग्यारेन्टी दिन्छौं।"),
    ("ne", "비자 발급 보장", "भिसा ग्यारेन्टी उपलब्ध छ।"),
    ("ne", "비용 보장·무료 유학", "निःशुल्क अध्ययनको अवसर।"),
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

    findings = [f for f in _check(plan, _real_banned()) if f.post_index == index and f.code == "금지표현"]

    # 표본이 두 분류의 문구에 걸려도 시험 중인 분류의 문구가 하나는 걸려야 한다 — 분류가 사전에서
    # 빠지면 KeyError로, 그 분류의 문구가 모두 바뀌면 단언 실패로 알게 된다.
    raw = json.loads(config.BANNED_PHRASES_PATH.read_text(encoding="utf-8"))
    phrases = raw[SECTION_ALWAYS][language][category]
    assert any(f"'{phrase}'" in f.message for f in findings for phrase in phrases), (language, category, findings)


def _blocked_by_dictionary(plan: Plan) -> list[Finding]:
    """실제 사전으로 검증했을 때 사전 때문에 나온 항목(금지표현·대학맥락)만."""
    return [f for f in _check(plan, _real_banned()) if f.code in ("금지표현", "대학맥락")]


def test_금지_문구는_승인된_용어집_문자열을_막지_않는다():
    # 사전을 고치다가 CTA·비자명·회사명에 들어 있는 말을 금지해 버리면, 이 문자열을 그대로 쓰는
    # 게시물이 매달 전부 막힌다. 낱말이 아니라 문구로 대조하는 이유와 같은 위험을 데이터에서 고정한다.
    # 정규화 함수를 거치지 않고 실제 검증에 넣어 본다. 대학명 구역의 사전도 함께 시험하려고 승인된 대학명을 붙인다.
    for term, by_language in GLOSSARY.items():
        for lang in LANGS:
            text = f"경기대학교 {by_language[lang]}"
            if lang == "ko":
                plan = _edit(_plan(), 0, source_ko=text)
            else:
                plan = _edit(_plan(), {"vi": 0, "my": 1, "ne": 2}[lang], body_local=text)

            assert _blocked_by_dictionary(plan) == [], f"용어집 {term}({lang}): {by_language[lang]!r}"


def test_한국어_금지_문구는_확정된_사실_문장을_막지_않는다():
    # 검증된 사실을 그대로 옮겨 쓴 원문이 금지 표현이나 대학 맥락 용어에 걸리면, 사실을 쓰는 게시물이
    # 사전 때문에 막힌다. 한국어 사실 문장만 있으므로 원문에 넣어 본다.
    for key, fact in FACTS.items():
        plan = _edit(_plan(), 0, source_ko=f"경기대학교 {fact.value}")

        assert _blocked_by_dictionary(plan) == [], f"사실 {key}: {fact.value!r}"


# --- 정상 경로 ----------------------------------------------------------------


def test_픽스처_플랜은_findings가_비어_있다():
    # 실제 사전·용어집·대학 목록으로 돌린다. 승인된 CTA("무료 상담" 포함)가 금지 문구에 걸리면
    # 여기서 깨진다.
    findings = validate_copy(_plan(), UNIVERSITIES, _real_banned(), GLOSSARY, FACTS)

    assert findings == []
