"""역번역 대조(backtranslation.py) 테스트.

여기서는 워크시트를 내는 것, 채워 온 워크시트를 읽는 것, 되번역이 빠짐없이 왔는지, 되번역이 한국어
원문에서 글자로 얼마나 벌어졌는지만 본다. **뜻이 옳은지는 보지 않는다** — 그것은 검토 화면에서 사람이
한국어 원문과 되번역을 나란히 놓고 판단한다. 그래서 이 파일의 어떤 테스트도 "이 되번역의 뜻이 옳다"를
주장하지 않고, 글자 유사도가 어느 쪽으로 움직이는지만 고정한다.

되번역 표본은 이 파일에서 손으로 쓴 한국어이고 검수를 받지 않았다. 표본은 임계값(0.45)을 고르는 근거가
아니다: 경계는 `divergence` 값 자체를 임계값으로 넘겨 검사하고, 기본값은 시그니처 테스트가 고정한다.
"""

from __future__ import annotations

import dataclasses
import difflib
import inspect
import json
import unicodedata
from pathlib import Path

import pytest

from facebook import config
from facebook.backtranslation import (
    WorksheetError,
    divergence,
    load,
    validate_backtranslation,
    worksheet,
)
from facebook.findings import Finding
from facebook.plan_model import Plan, load_plan

FIXTURE = Path(__file__).parent / "fixtures" / "plan-valid.json"

GLOSSARY = json.loads(config.GLOSSARY_PATH.read_text(encoding="utf-8"))
CTA = GLOSSARY["cta"]["ko"]

# 픽스처 0번(D-2)·3번(전주기전대학 등록금) 원문을 뜻 그대로 풀어 쓴 되번역과, 아무 관계 없는 글.
PARAPHRASE_0 = (
    "유학(D-2) 비자는 전문대학 이상의 교육기관이나 학술연구기관에서 정규과정 교육을 받거나 "
    "특정 연구를 하려는 사람을 위한 체류자격입니다.\n\n" + CTA
)
PARAPHRASE_3 = (
    "전주기전대학의 1년 평균 등록금은 6,800,000원입니다(1년치). 전체 학과 가중평균 공시값이라서 "
    "학생 개인이 실제로 내는 금액과 다를 수 있습니다.\n\n" + CTA
)
UNRELATED = "일본 간병 취업비자를 받으려면 N3 이상의 일본어 능력이 필요합니다.\n\n" + CTA


# --- 도우미 -------------------------------------------------------------------


def _plan() -> Plan:
    return load_plan(FIXTURE)


def _edit(plan: Plan, index: int, **changes) -> Plan:
    """`index`번 게시물의 필드만 바꾼 새 플랜."""
    posts = tuple(dataclasses.replace(p, **changes) if p.index == index else p for p in plan.posts)
    return dataclasses.replace(plan, posts=posts)


def _faithful(plan: Plan) -> dict[int, str]:
    """모든 게시물이 원문 그대로 돌아온 되번역. 차이는 0이다."""
    return {post.index: post.source_ko for post in plan.posts}


def _check(plan: Plan, back: dict[int, str], glossary: dict | None = None, **kwargs) -> list[Finding]:
    return validate_backtranslation(plan, back, GLOSSARY if glossary is None else glossary, **kwargs)


def _brief(findings: list[Finding]) -> list[tuple[int | None, str, str]]:
    return [(f.post_index, f.code, f.severity) for f in findings]


def _write(tmp_path: Path, content: str | bytes) -> Path:
    path = tmp_path / "backtranslation.json"
    if isinstance(content, bytes):
        path.write_bytes(content)
    else:
        path.write_text(content, encoding="utf-8")
    return path


def _sheet_json(entries: list) -> str:
    return json.dumps({"month": "2026-11", "entries": entries}, ensure_ascii=False)


def _load_error(path: Path) -> str:
    with pytest.raises(WorksheetError) as info:
        load(path)
    return str(info.value)


def _has_hangul(text: str) -> bool:
    return any("가" <= ch <= "힣" for ch in text)


# --- 워크시트 -------------------------------------------------------------------


def test_워크시트가_모든_게시물을_담는다():
    plan = _plan()

    sheet = worksheet(plan)

    assert set(sheet) == {"month", "entries"}
    assert sheet["month"] == "2026-11"
    assert sheet["entries"] == [
        {"index": post.index, "language": post.language, "body_local": post.body_local, "back_ko": ""}
        for post in plan.posts
    ]
    assert [entry["index"] for entry in sheet["entries"]] == [0, 1, 2, 3, 4, 5]


def test_워크시트에는_한국어_원문이_들어_있지_않다():
    # 되번역을 하는 세션이 원문을 보면 베끼기만 하고 되번역이 아니게 된다. 독립성이 이 대조의 전부다.
    plan = _plan()

    dumped = json.dumps(worksheet(plan), ensure_ascii=False)

    for post in plan.posts:
        for line in post.source_ko.splitlines():  # 줄바꿈은 JSON에서 `\n`으로 바뀌므로 줄 단위로 찾는다
            if line.strip():
                assert line not in dumped


def test_워크시트의_back_ko는_모두_비어_있다():
    assert {entry["back_ko"] for entry in worksheet(_plan())["entries"]} == {""}


def test_워크시트를_JSON으로_쓰고_채워서_load로_읽으면_index별로_돌아온다(tmp_path):
    plan = _plan()
    sheet = json.loads(json.dumps(worksheet(plan), ensure_ascii=False))  # 파일을 거치는 것과 같은 왕복
    for entry in sheet["entries"]:
        entry["back_ko"] = f"{entry['index']}번 되번역"
    path = _write(tmp_path, json.dumps(sheet, ensure_ascii=False, indent=2))

    assert load(path) == {post.index: f"{post.index}번 되번역" for post in plan.posts}


# --- load ---------------------------------------------------------------------


def test_load는_채우지_않은_칸도_빈_문자열로_돌려준다(tmp_path):
    # 비어 있는지 판정하는 것은 validate의 몫이다. 여기서 버리면 빈 칸이 "빠진 게시물"로 둔갑한다.
    path = _write(tmp_path, _sheet_json([{"index": 0, "back_ko": ""}, {"index": 1, "back_ko": "가나다"}]))

    assert load(path) == {0: "", 1: "가나다"}


def test_load는_되번역을_손대지_않고_돌려준다(tmp_path):
    raw = "  유학 안내입니다.\n\n  상담은 무료입니다.\n"

    assert load(_write(tmp_path, _sheet_json([{"index": 0, "back_ko": raw}]))) == {0: raw}


def test_load는_워크시트의_다른_필드를_무시한다(tmp_path):
    entry = {"index": 2, "language": "ne", "body_local": "आ", "back_ko": "되번역", "memo": "무시"}

    assert load(_write(tmp_path, _sheet_json([entry]))) == {2: "되번역"}


def test_load는_중복된_index를_받지_않는다(tmp_path):
    # 뒤의 것이 조용히 이기면 앞에서 채운 되번역이 사라진 줄도 모르고 지나간다.
    entries = [{"index": 0, "back_ko": "가"}, {"index": 1, "back_ko": "나"}, {"index": 1, "back_ko": "다"}]

    message = _load_error(_write(tmp_path, _sheet_json(entries)))

    assert "중복" in message and "index 1" in message
    assert "entries[1]" in message and "entries[2]" in message


def test_load는_값이_같아도_중복된_index를_받지_않는다(tmp_path):
    entries = [{"index": 3, "back_ko": "같은 값"}, {"index": 3, "back_ko": "같은 값"}]

    assert "중복" in _load_error(_write(tmp_path, _sheet_json(entries)))


@pytest.mark.parametrize(
    "index",
    ["0", 1.0, True, None, [0]],
    ids=["문자열", "실수", "불리언", "null", "목록"],
)
def test_load는_정수가_아닌_index를_받지_않는다(tmp_path, index):
    message = _load_error(_write(tmp_path, _sheet_json([{"index": index, "back_ko": "가"}])))

    assert "index" in message and "entries[0]" in message and _has_hangul(message)


def test_load는_index가_없는_항목을_받지_않는다(tmp_path):
    message = _load_error(_write(tmp_path, _sheet_json([{"back_ko": "가"}])))

    assert "index" in message and "entries[0]" in message


@pytest.mark.parametrize("back_ko", [None, 5, ["가"], {"a": 1}], ids=["null", "숫자", "목록", "객체"])
def test_load는_문자열이_아닌_back_ko를_받지_않는다(tmp_path, back_ko):
    message = _load_error(_write(tmp_path, _sheet_json([{"index": 0, "back_ko": back_ko}])))

    assert "back_ko" in message and "entries[0]" in message and _has_hangul(message)


def test_load는_back_ko_칸이_아예_없는_항목을_받지_않는다(tmp_path):
    message = _load_error(_write(tmp_path, _sheet_json([{"index": 0}])))

    assert "back_ko" in message and "entries[0]" in message


@pytest.mark.parametrize(
    "content",
    [
        "이건 JSON이 아니다",
        "[]",
        '"문자열"',
        '{"month": "2026-11"}',
        '{"month": "2026-11", "entries": {}}',
        '{"month": "2026-11", "entries": "없음"}',
        '{"month": "2026-11", "entries": [1]}',
        '{"month": "2026-11", "entries": [[0, "가"]]}',
    ],
    ids=["JSON아님", "최상위가목록", "최상위가문자열", "entries없음", "entries가객체", "entries가문자열", "항목이숫자", "항목이목록"],
)
def test_load는_워크시트_모양이_아니면_한국어_오류로_멈춘다(tmp_path, content):
    path = _write(tmp_path, content)

    message = _load_error(path)

    assert _has_hangul(message) and str(path) in message


def test_load는_빈_entries는_빈_결과로_돌려준다(tmp_path):
    # 빠진 게시물을 알리는 것은 validate의 몫이다(게시물마다 `역번역누락`).
    assert load(_write(tmp_path, _sheet_json([]))) == {}


def test_load는_없는_파일에_한국어_오류로_멈춘다(tmp_path):
    missing = tmp_path / "없는-워크시트.json"

    message = _load_error(missing)

    assert "찾을 수 없습니다" in message and str(missing) in message


def test_load는_읽을_수_없는_경로에_한국어_오류로_멈춘다(tmp_path):
    message = _load_error(tmp_path)  # 폴더

    assert _has_hangul(message) and str(tmp_path) in message


def test_load는_UTF8이_아닌_파일에_한국어_오류로_멈춘다(tmp_path):
    message = _load_error(_write(tmp_path, b"\xff\xfe\x00\x80"))

    assert "UTF-8" in message


# --- divergence ---------------------------------------------------------------

_LONG_POOL = "유학은전문대이상의교육기관또는학술연구에서정규과의을받거나특하려사람위한체류자격입니다"


def _long_pair() -> tuple[str, str]:
    """390자짜리 글과, 거기서 여섯 글자만 바꾼 글. 반복되지 않는 결정적 수열이라 환경과 무관하다."""
    x = 12345
    chars = []
    for _ in range(390):
        x = (x * 1103515245 + 12345) % (2**31)
        chars.append(_LONG_POOL[(x >> 16) % len(_LONG_POOL)])
    original = "".join(chars)
    edited = list(original)
    for position in (40, 90, 150, 210, 270, 330):
        edited[position] = "숫"
    return original, "".join(edited)


# 인자 순서를 바꾸면 `SequenceMatcher.ratio()`가 달라지는 쌍(아래 테스트가 그 전제를 직접 확인한다).
_ASYMMETRIC_PAIR = ("아마가라나", "바마마다가아")


def test_divergence는_0과_1_사이():
    source = _plan().posts[3].source_ko
    pairs = [
        (source, source),
        (source, PARAPHRASE_3),
        (source, UNRELATED),
        (source, ""),
        ("", source),
        ("", ""),
        ("가", "나"),
        ("가", "가나다라마바사"),
        ("가나다라마바사", "가"),
        ("...", "!!!"),
        _ASYMMETRIC_PAIR,
        _long_pair(),
    ]

    for a, b in pairs:
        value = divergence(a, b)
        assert isinstance(value, float)
        assert 0.0 <= value <= 1.0, (a[:20], b[:20], value)


def test_divergence는_같은_글이면_정확히_0이다():
    source = _plan().posts[0].source_ko
    long_text = _long_pair()[0]

    assert divergence(source, source) == 0.0
    assert divergence("", "") == 0.0
    assert divergence(long_text, long_text) == 0.0


def test_divergence는_하나도_겹치지_않으면_1이다():
    assert divergence("가나다", "xyz") == 1.0
    assert divergence("가나다", "") == 1.0
    assert divergence("", "가나다") == 1.0


def test_divergence는_인자_순서와_무관하다():
    # `SequenceMatcher.ratio()`는 대칭이 아니다 — 같은 두 글도 인자 순서에 따라 값이 다르다.
    a, b = _ASYMMETRIC_PAIR
    assert difflib.SequenceMatcher(None, a, b).ratio() != difflib.SequenceMatcher(None, b, a).ratio()

    source = _plan().posts[3].source_ko
    pairs = [_ASYMMETRIC_PAIR, (source, PARAPHRASE_3), (source, UNRELATED), (source, "전주기전대학"), _long_pair()]
    for a, b in pairs:
        assert divergence(a, b) == divergence(b, a), (a[:20], b[:20])


def test_divergence는_긴_글에서도_작은_수정을_작게_본다():
    # 글자 종류가 적은 200자 넘는 글에서 기본 설정의 `SequenceMatcher`는 자주 나오는 글자를 버려 거의 같은 글도 크게 다르다고 한다.
    original, edited = _long_pair()
    assert len(original) >= 200
    assert 1.0 - difflib.SequenceMatcher(None, original, edited).ratio() > 0.5  # 기본 설정이 틀리는 쌍이다

    assert divergence(original, edited) < 0.05


def test_divergence는_공백과_줄바꿈과_문장부호를_무시한다():
    a = "상담은 무료입니다.\n\n궁금한 점이 있으면, 메시지를 보내 주세요!"
    b = "상담은    무료입니다 궁금한 점이 있으면 메시지를 보내 주세요"

    assert divergence(a, b) == 0.0


def test_divergence는_전각_공백과_한자_문장부호도_무시한다():
    assert divergence("상담은　무료입니다。", "상담은 무료입니다") == 0.0


def test_divergence는_보이지_않는_서식_문자를_무시한다():
    assert divergence("상담은 무​료입니다", "상담은 무료입니다") == 0.0


def test_divergence는_같은_한글의_NFC와_NFD_표기를_같게_본다():
    text = "유학(D-2) 비자 안내입니다"

    assert divergence(unicodedata.normalize("NFD", text), unicodedata.normalize("NFC", text)) == 0.0


def test_divergence는_대소문자를_무시한다():
    assert divergence("유학 D-2 안내", "유학 d-2 안내") == 0.0


def test_divergence는_낱말_사이_공백을_지우지_않고_하나로_접는다():
    # 결정: 공백은 하나로 접을 뿐 지우지 않는다. 띄어쓰기 한 칸 차이는 조금 남는다. 바꾸려면 이 테스트도 바꾼다.
    assert 0.0 < divergence("상담은 무료입니다", "상담은무료입니다") < 0.1


def test_divergence는_낱말이_달라지면_0보다_크다():
    assert divergence("상담은 무료입니다", "상담은 유료입니다") > 0.0


# --- validate_backtranslation: 정상 --------------------------------------------


def test_거의_같은_문장이면_findings가_비어_있다():
    plan = _plan()
    back = {**_faithful(plan), 0: PARAPHRASE_0, 3: PARAPHRASE_3}

    assert _check(plan, back) == []


def test_원문_그대로인_되번역은_findings가_비어_있다():
    plan = _plan()

    assert _check(plan, _faithful(plan)) == []


# --- validate_backtranslation: 차이 --------------------------------------------


def test_차이가_임계값을_넘으면_경고():
    plan = _plan()
    back = {**_faithful(plan), 3: UNRELATED}

    findings = _check(plan, back)

    assert _brief(findings) == [(3, "역번역차이", "warning")]
    assert findings[0].severity == "warning"
    assert findings[0].code == "역번역차이"
    assert "0.45" in findings[0].message and _has_hangul(findings[0].message)


def test_임계값은_넘을_때만_경고하고_같으면_경고하지_않는다():
    plan = _edit(_plan(), 0, source_ko="유학 비자 안내")  # CTA가 없는 원문이라 떼어 낼 것이 없다
    back = {**_faithful(plan), 0: "유학 안내"}
    measured = divergence("유학 비자 안내", "유학 안내")
    assert 0.0 < measured < 0.45

    assert _check(plan, back, threshold=measured) == []
    assert _brief(_check(plan, back, threshold=measured - 1e-9)) == [(0, "역번역차이", "warning")]


def test_임계값을_낮추면_가벼운_의역도_경고한다():
    plan = _plan()
    back = {**_faithful(plan), 0: PARAPHRASE_0, 3: PARAPHRASE_3}

    assert _check(plan, back) == []
    assert _brief(_check(plan, back, threshold=0.05)) == [(0, "역번역차이", "warning"), (3, "역번역차이", "warning")]


def test_임계값_0은_글자가_하나라도_다르면_경고한다():
    plan = _plan()
    back = {**_faithful(plan), 0: PARAPHRASE_0}

    assert _brief(_check(plan, back, threshold=0.0)) == [(0, "역번역차이", "warning")]


def test_현지어_본문이_아니라_한국어_원문과_대조한다():
    plan = _plan()
    # 현지어 본문을 어떻게 고쳐도 한국어 원문과 같은 되번역이면 차이가 없다.
    assert _check(_edit(plan, 0, body_local="전혀 다른 본문입니다."), _faithful(plan)) == []

    # 되번역이라며 현지어 본문을 그대로 돌려주면 한국어 원문과 전혀 다르다.
    echoed = {post.index: post.body_local for post in plan.posts}
    assert [(f.post_index, f.code) for f in _check(plan, echoed)] == [(i, "역번역차이") for i in range(6)]


def test_CTA를_양쪽에서_떼고_재므로_공통_CTA가_차이를_가리지_못한다():
    plan = _edit(_plan(), 0, source_ko="유학 비자 안내입니다.\n\n" + CTA)
    back = {**_faithful(plan), 0: "취업을 보장합니다.\n\n" + CTA}
    # CTA를 떼지 않으면 두 글이 같은 39자를 나눠 가져 차이가 0.14로 줄어 임계값 아래로 내려간다.
    assert divergence(plan.posts[0].source_ko, back[0]) < 0.45

    assert _brief(_check(plan, back)) == [(0, "역번역차이", "warning")]


def test_원문에만_CTA가_있고_되번역에는_없어도_본문이_같으면_차이가_없다():
    plan = _edit(_plan(), 0, source_ko="유학 비자 안내입니다.\n\n" + CTA)
    back = {**_faithful(plan), 0: "유학 비자 안내입니다."}
    assert divergence(plan.posts[0].source_ko, back[0]) > 0.45  # 원문의 CTA를 떼지 않으면 걸린다

    assert _check(plan, back) == []


def test_되번역의_CTA는_띄어쓰기와_문장부호가_달라도_떼어_낸다():
    plan = _edit(_plan(), 0, source_ko="유학 비자 안내입니다.\n\n" + CTA)
    reworded_spacing = "상담은 무료입니다 궁금한 점이 있으면 이 페이지로 메시지를 보내주세요"
    back = {**_faithful(plan), 0: "유학 비자 안내입니다.\n\n" + reworded_spacing + "."}

    assert _check(plan, back) == []


def test_되번역_끝의_공백과_문장부호는_CTA를_떼는_데_걸리지_않는다():
    plan = _edit(_plan(), 0, source_ko="유학 비자 안내입니다.\n\n" + CTA)
    back = {**_faithful(plan), 0: "유학 비자 안내입니다.\n\n" + CTA + " \n)"}

    assert _check(plan, back) == []


def test_CTA는_대소문자를_가리지_않고_뗀다():
    glossary = {"cta": {"ko": "문의: Jeongwoo HRD"}}
    plan = _edit(_plan(), 0, source_ko="안내입니다.\n\n문의: Jeongwoo HRD")
    back = {**_faithful(plan), 0: "안내입니다.\n\n문의 : JEONGWOO hrd"}

    assert _check(plan, back, glossary) == []


def test_되번역이_CTA의_뒷부분일_뿐이면_CTA로_끝난_것이_아니다():
    # 원문 본문이 CTA의 마지막 문장과 같은 경우: 되번역이 그 문장 그대로면 차이가 없다. CTA 일부와 맞는다고 떼면
    # 본문이 통째로 사라져 차이로 잡힌다.
    plan = _edit(_plan(), 0, source_ko="이 페이지로 메시지를 보내 주세요.\n\n" + CTA)
    back = {**_faithful(plan), 0: "이 페이지로 메시지를 보내 주세요."}

    assert _check(plan, back) == []


def test_CTA만_적어_온_되번역은_본문이_없으므로_경고():
    plan = _plan()
    back = {**_faithful(plan), 0: CTA}

    assert _brief(_check(plan, back)) == [(0, "역번역차이", "warning")]


def test_되번역에서_CTA를_의역하면_떼지_못하고_차이로_잡힌다():
    # 알려진 한계: 같은 글자열(공백·문장부호 차이 제외)만 CTA로 알아본다. 의역한 CTA는 본문 일부로 센다.
    plan = _edit(_plan(), 0, source_ko="유학 비자 안내입니다.\n\n" + CTA)
    reworded = "상담은 완전히 무료입니다. 궁금한 점이 있으면 이 페이지로 메시지를 보내 주십시오."
    back = {**_faithful(plan), 0: "유학 비자 안내입니다.\n\n" + reworded}

    assert _brief(_check(plan, back)) == [(0, "역번역차이", "warning")]


# --- validate_backtranslation: 누락·빈 칸·플랜 밖 --------------------------------


def test_비어있는_back_ko가_있으면_오류():
    plan = _plan()
    back = {**_faithful(plan), 2: ""}

    findings = _check(plan, back)

    assert _brief(findings) == [(2, "역번역빈칸", "error")]
    assert "2번" in findings[0].message and "back_ko" in findings[0].message


@pytest.mark.parametrize(
    "blank",
    ["   ", "\n\t \n", "　", "...", "-", "。", "​", "﻿ ​"],
    ids=["공백", "줄바꿈과탭", "전각공백", "마침표", "하이픈", "한자마침표", "제로폭공백", "BOM과제로폭"],
)
def test_공백이나_문장부호뿐인_back_ko도_빈_칸으로_본다(blank):
    plan = _plan()
    back = {**_faithful(plan), 1: blank}

    assert _brief(_check(plan, back)) == [(1, "역번역빈칸", "error")]


def test_게시물_하나라도_빠지면_오류():
    plan = _plan()
    back = _faithful(plan)
    del back[4]

    findings = _check(plan, back)

    assert _brief(findings) == [(4, "역번역누락", "error")]
    assert "4번" in findings[0].message


def test_되번역이_하나도_없으면_게시물마다_누락_오류():
    plan = _plan()

    findings = _check(plan, {})

    assert _brief(findings) == [(i, "역번역누락", "error") for i in range(6)]


def test_누락과_빈_칸은_차이_경고를_함께_내지_않는다():
    plan = _plan()
    back = {**_faithful(plan), 0: ""}
    del back[1]

    assert [(f.post_index, f.code) for f in _check(plan, back)] == [(0, "역번역빈칸"), (1, "역번역누락")]


def test_플랜에_없는_번호의_되번역은_오류():
    # 다른 달이나 다른 판의 워크시트가 섞여 들어왔다는 신호다. 조용히 무시하면 낡은 되번역을 믿게 된다.
    plan = _plan()
    back = {**_faithful(plan), 99: "어느 게시물의 것인지 모르는 되번역"}

    findings = _check(plan, back)

    assert _brief(findings) == [(None, "역번역플랜밖", "error")]
    assert "99" in findings[0].message


def test_플랜에_없는_번호가_여럿이면_번호순으로_하나씩_오류():
    plan = _plan()
    back = {**_faithful(plan), 12: "가", 7: "나", -1: "다"}

    findings = _check(plan, back)

    assert [(f.post_index, f.code) for f in findings] == [(None, "역번역플랜밖")] * 3
    for finding, number in zip(findings, ("-1", "7", "12")):
        assert f"번호 {number}" in finding.message


def test_결과는_플랜에_매이지_않은_항목이_먼저이고_그다음_게시물_번호순이다():
    plan = _plan()
    back = {**_faithful(plan), 3: UNRELATED, 1: " ", 99: "가"}
    del back[4]

    findings = _check(plan, back)

    assert _brief(findings) == [
        (None, "역번역플랜밖", "error"),
        (1, "역번역빈칸", "error"),
        (3, "역번역차이", "warning"),
        (4, "역번역누락", "error"),
    ]


def test_검증은_멈추지_않고_발견한_문제를_전부_모은다():
    plan = _plan()
    back = {0: "", 1: UNRELATED, 2: _faithful(plan)[2], 5: ""}

    codes = [(f.post_index, f.code) for f in _check(plan, back)]

    assert codes == [(0, "역번역빈칸"), (1, "역번역차이"), (3, "역번역누락"), (4, "역번역누락"), (5, "역번역빈칸")]


def test_오류와_경고는_Finding이다():
    findings = _check(_plan(), {})

    assert findings and all(isinstance(f, Finding) for f in findings)


def test_게시물이_없는_플랜도_되번역이_있으면_플랜밖_오류():
    plan = dataclasses.replace(_plan(), posts=())

    assert _brief(_check(plan, {0: "가"})) == [(None, "역번역플랜밖", "error")]
    assert _check(plan, {}) == []


# --- validate_backtranslation: 입력 가드 ----------------------------------------


@pytest.mark.parametrize(
    "glossary",
    [
        {},
        {"cta": {}},
        {"cta": {"vi": "x"}},
        {"cta": {"ko": ""}},
        {"cta": {"ko": "   \n"}},
        {"cta": {"ko": "。"}},
        {"cta": {"ko": "​"}},
        {"cta": {"ko": None}},
        {"cta": {"ko": 5}},
        {"cta": "상담은 무료입니다."},
        {"cta": None},
    ],
    ids=["용어집비어있음", "cta비어있음", "ko없음", "ko빈문자열", "ko공백", "ko문장부호", "ko제로폭", "ko_null", "ko숫자", "cta문자열", "cta_null"],
)
def test_CTA가_없거나_비어_있으면_ValueError(glossary):
    # 빈 CTA는 "끝이 같은가"가 늘 참이고 떼어 낼 것이 없어, CTA를 떼고 재는 단계가 조용히 꺼진다.
    with pytest.raises(ValueError) as info:
        _check(_plan(), _faithful(_plan()), glossary)

    assert "cta.ko" in str(info.value) and _has_hangul(str(info.value))


def test_용어집에_ko_CTA만_있어도_된다():
    # 다른 언어·다른 용어는 이 대조가 쓰지 않는다. `validate_copy`의 용어집 가드와 달리 전부 요구하지 않는다.
    plan = _plan()

    assert _check(plan, _faithful(plan), {"cta": {"ko": CTA}}) == []


def test_CTA_가드는_플랜에_게시물이_없어도_작동한다():
    plan = dataclasses.replace(_plan(), posts=())

    with pytest.raises(ValueError):
        _check(plan, {}, {"cta": {"ko": ""}})


@pytest.mark.parametrize("threshold", [-0.1, 1.0, 1.5, 2, float("nan"), float("inf"), float("-inf")])
def test_임계값이_0이상_1미만이_아니면_ValueError(threshold):
    # 1.0 이상이면 어떤 되번역도 경고하지 않아 검사가 조용히 꺼진다.
    with pytest.raises(ValueError) as info:
        _check(_plan(), _faithful(_plan()), threshold=threshold)

    assert "threshold" in str(info.value) and _has_hangul(str(info.value))


@pytest.mark.parametrize(
    "back",
    [{"0": "가"}, {0: None}, {0: 5}, {0: ["가"]}, {True: "가"}, {1.0: "가"}],
    ids=["문자열키", "null값", "숫자값", "목록값", "불리언키", "실수키"],
)
def test_back의_모양이_틀리면_ValueError(back):
    with pytest.raises(ValueError) as info:
        _check(_plan(), back)

    assert "load" in str(info.value) and _has_hangul(str(info.value))


def test_시그니처가_계약과_같다():
    parameters = inspect.signature(validate_backtranslation).parameters

    assert list(parameters) == ["plan", "back", "glossary", "threshold"]
    assert parameters["threshold"].kind is inspect.Parameter.KEYWORD_ONLY
    assert parameters["threshold"].default == 0.45
