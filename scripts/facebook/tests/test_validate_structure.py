"""구조 검증(validate.py의 `validate_structure`·`validate_facts`) 테스트.

여기서는 언어 로테이션, 게시물 수, 게시일(연속성·월), 이미지 파일(존재·크기·확장자·중복),
이미지 프롬프트의 필수 지시 문구, 사실의 존재·게시일 기준 만료만 본다. 본문이 *무엇을
말하는지*(금지 표현·CTA·대학명 맥락)와 역번역은 다른 검증 모듈의 몫이다.
"""

from __future__ import annotations

import dataclasses
import typing
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path

import pytest

from facebook import config
from facebook.facts import Fact
from facebook.plan_model import Plan, Post, load_plan
from facebook.validate import Finding, validate_facts, validate_structure

FIXTURE = Path(__file__).parent / "fixtures" / "plan-valid.json"
JST = timezone(timedelta(hours=9))

# 필수 지시 문구 두 가지를 모두 담은 정상 프롬프트.
_GOOD_PROMPT = (
    "A student at a desk, soft flat illustration, warm colors. "
    "No text, no letters, no logos. "
    "Illustration only; no real people, no real campuses, no company facilities."
)
_NO_TEXT_ONLY = "A student at a desk, flat illustration. No text, no letters, no logos."
_NO_REAL_ONLY = (
    "A student at a desk, flat illustration. "
    "Illustration only; no real people, no real campuses, no company facilities."
)


# --- 도우미 -------------------------------------------------------------------


def _plan() -> Plan:
    return load_plan(FIXTURE)


def _setup(tmp_path: Path) -> tuple[Plan, Path]:
    """유효한 플랜과, 그 플랜의 이미지 파일이 전부(1바이트씩) 들어 있는 폴더."""
    plan = _plan()
    images = tmp_path / "images"
    images.mkdir()
    for post in plan.posts:
        (images / post.image_file).write_bytes(b"x")
    return plan, images


def _edit(plan: Plan, index: int, **changes) -> Plan:
    """`index`번 게시물의 필드만 바꾼 새 플랜."""
    posts = tuple(dataclasses.replace(p, **changes) if p.index == index else p for p in plan.posts)
    return dataclasses.replace(plan, posts=posts)


def _shift(plan: Plan, start: int, days: int) -> Plan:
    """`start`번 이후 게시물의 게시일을 모두 `days`일 옮긴다(시각·오프셋은 그대로)."""
    posts = tuple(
        dataclasses.replace(p, publish_at=p.publish_at + timedelta(days=days)) if p.index >= start else p
        for p in plan.posts
    )
    return dataclasses.replace(plan, posts=posts)


def _renumbered(posts: list[Post], first_publish_at: datetime) -> tuple[Post, ...]:
    """게시물을 주어진 순서대로 0부터 번호를 다시 매기고, 게시일도 첫 게시일부터 하루씩 다시 잡는다.

    번호만 다시 매기면 빠진 자리만큼 날짜가 벌어져 의도하지 않은 `날짜연속` 오류가 따라온다.
    게시일을 함께 다시 잡으므로, 이 도우미가 만든 플랜은 번호도 날짜도 끊김이 없다.
    """
    return tuple(
        dataclasses.replace(p, index=i, publish_at=first_publish_at + timedelta(days=i))
        for i, p in enumerate(posts)
    )


def _without(plan: Plan, index: int) -> Plan:
    """`index`번 게시물을 빼고 남은 게시물의 번호와 게시일을 이어 붙인다(로더가 받아들이는 모양)."""
    kept = [p for p in plan.posts if p.index != index]
    return dataclasses.replace(plan, posts=_renumbered(kept, kept[0].publish_at))


def _arranged(plan: Plan, order: list[int]) -> Plan:
    """`order`의 순서대로 게시물을 다시 늘어놓는다. 번호와 게시일은 자리(슬롯)를 따라가므로
    날짜는 계속 하루씩 이어지고, 달라지는 것은 어느 소재의 어느 언어가 어느 자리에 있느냐뿐이다."""
    return dataclasses.replace(plan, posts=_renumbered([plan.posts[old] for old in order], plan.posts[0].publish_at))


def _only(plan: Plan, index: int, **changes) -> Plan:
    """`index`번 게시물 하나만 남긴 플랜. 사실 검증처럼 게시물 하나로 충분한 테스트에 쓴다."""
    post = dataclasses.replace(plan.posts[index], **changes)
    return dataclasses.replace(plan, posts=(post,))


def _at(findings: list[Finding], code: str) -> list[int | None]:
    """`code`인 finding들의 post_index 목록."""
    return [f.post_index for f in findings if f.code == code]


def _pairs(findings: list[Finding]) -> list[tuple[int | None, str]]:
    return [(f.post_index, f.code) for f in findings]


def _fact(key: str, expires_on: date) -> Fact:
    return Fact(
        key=key,
        value="값",
        source_url="https://example.com/source",
        verified_by="builder",
        verified_on=date(2026, 10, 1),
        expires_on=expires_on,
    )


def _facts(expires_on: date = date(2027, 10, 31)) -> dict[str, Fact]:
    return {key: _fact(key, expires_on) for key in ("visa_d2_definition", "tuition_kijeon")}


def _jst(day: date, at: time = time(19, 0)) -> datetime:
    return datetime.combine(day, at, tzinfo=JST)


# --- 계약 ---------------------------------------------------------------------


def test_Finding_필드_이름과_순서가_계약과_같다():
    assert tuple(f.name for f in dataclasses.fields(Finding)) == ("severity", "code", "post_index", "message")
    assert typing.get_args(typing.get_type_hints(Finding)["severity"]) == ("error", "warning")
    finding = Finding("warning", "코드", None, "메시지")
    with pytest.raises(dataclasses.FrozenInstanceError):
        finding.code = "다른 코드"  # type: ignore[misc]


# --- 정상 경로 ----------------------------------------------------------------


def test_모두_정상이면_findings가_비어_있다(tmp_path):
    plan, images = _setup(tmp_path)
    assert validate_structure(plan, images) == []
    assert validate_facts(plan, _facts()) == []


# --- 언어 로테이션·게시물 수 ------------------------------------------------------


def test_소재마다_세_언어가_vi_my_ne_순서로_있어야_한다(tmp_path):
    plan, images = _setup(tmp_path)
    plan = _without(plan, 1)  # visa-d2의 my 게시물을 뺀다

    findings = validate_structure(plan, images)

    # 5건이라 게시물수도 걸린다. 남은 게시물은 날짜도 이어지고 소재별로 이어 붙어 있어 그 밖의 항목은 없다.
    assert _pairs(findings) == [(None, "게시물수"), (0, "언어누락")]  # 언어누락은 그 소재의 첫 게시물에 붙는다
    missing = findings[1]
    assert missing.severity == "error"
    assert "visa-d2" in missing.message and "my" in missing.message
    assert "tuition-kijeon" not in missing.message


def test_같은_언어가_겹치면_빠진_언어를_알려준다(tmp_path):
    plan, images = _setup(tmp_path)
    plan = _edit(plan, 2, language="my")  # visa-d2: vi, my, my — ne가 없다

    findings = validate_structure(plan, images)

    missing = [f for f in findings if f.code == "언어누락"]
    assert [f.post_index for f in missing] == [0]
    assert "ne" in missing[0].message


def test_세_언어가_다_있어도_순서가_다르면_오류(tmp_path):
    plan, images = _setup(tmp_path)
    plan = _edit(_edit(plan, 0, language="my"), 1, language="vi")  # my, vi, ne

    findings = validate_structure(plan, images)

    assert _at(findings, "언어순서") == [0]
    assert _at(findings, "언어누락") == []


def test_소재에_게시물이_더_있어도_언어순서_오류(tmp_path):
    plan, images = _setup(tmp_path)
    extra = dataclasses.replace(
        plan.posts[5], index=6, publish_at=plan.posts[5].publish_at + timedelta(days=1), image_file="06-extra.png"
    )
    plan = dataclasses.replace(plan, posts=plan.posts + (extra,))  # tuition-kijeon: vi, my, ne, ne
    (images / "06-extra.png").write_bytes(b"x")

    findings = validate_structure(plan, images)

    assert _at(findings, "언어순서") == [3]  # visa-d2는 정상이고 tuition-kijeon만 걸린다


def test_게시물이_하나도_없는_소재는_post_index_없이_보고한다(tmp_path):
    plan, images = _setup(tmp_path)
    plan = dataclasses.replace(plan, posts=plan.posts[:3])  # tuition-kijeon 게시물 전부 없음

    findings = validate_structure(plan, images)

    assert _pairs(findings) == [(None, "언어누락")]
    assert "tuition-kijeon" in findings[0].message


def test_소재의_세_게시물이_이어붙어_있지_않으면_오류(tmp_path):
    plan, images = _setup(tmp_path)
    # A-vi, B-vi, A-my, B-my, A-ne, B-ne — 소재별 언어는 맞고 날짜도 하루씩이지만 소재가 흩어져 있다.
    plan = _arranged(plan, [0, 3, 1, 4, 2, 5])
    assert [(p.topic_id, p.language) for p in plan.posts] == [
        ("visa-d2", "vi"), ("tuition-kijeon", "vi"), ("visa-d2", "my"),
        ("tuition-kijeon", "my"), ("visa-d2", "ne"), ("tuition-kijeon", "ne"),
    ]

    findings = validate_structure(plan, images)

    assert _pairs(findings) == [(0, "소재분산"), (1, "소재분산")]  # 각 소재의 첫 게시물에 붙는다
    assert findings[0].severity == "error"
    assert "visa-d2" in findings[0].message and "tuition-kijeon" in findings[1].message
    assert "0, 2, 4" in findings[0].message  # 실제 게시물 번호를 보여 준다


def test_한_소재만_흩어지면_그_소재만_걸린다(tmp_path):
    plan, images = _setup(tmp_path)
    # A-vi, A-my, B-vi, B-my, B-ne, A-ne — A는 0,1,5로 흩어지고 B는 2,3,4로 이어진다
    plan = _arranged(plan, [0, 1, 3, 4, 5, 2])

    findings = validate_structure(plan, images)

    assert _pairs(findings) == [(0, "소재분산")]
    assert "visa-d2" in findings[0].message


def test_소재분산은_언어_오류와_따로_판정한다(tmp_path):
    plan, images = _setup(tmp_path)
    # visa-d2의 my를 빼고 그 자리에 tuition-kijeon 게시물이 끼어든다: A-vi, B-vi, A-ne, B-my, B-ne
    plan = _arranged(_without(plan, 1), [0, 2, 1, 3, 4])

    findings = validate_structure(plan, images)

    assert _pairs(findings) == [
        (None, "게시물수"),  # 5건
        (0, "언어누락"),  # visa-d2: vi, ne — my가 없다
        (0, "소재분산"),  # visa-d2는 0, 2번
        (1, "소재분산"),  # tuition-kijeon은 1, 3, 4번
    ]  # 언어순서는 없다 — 두 오류는 따로 판정한다


@pytest.mark.parametrize(
    ("count", "flagged"),
    [(1, True), (2, True), (3, False), (4, True), (5, True), (6, False)],
)
def test_게시물_수가_3의_배수가_아니면_오류(tmp_path, count, flagged):
    plan, images = _setup(tmp_path)
    plan = dataclasses.replace(plan, posts=plan.posts[:count])

    findings = validate_structure(plan, images)

    assert (_at(findings, "게시물수") == [None]) is flagged
    if flagged:
        assert str(count) in next(f for f in findings if f.code == "게시물수").message


# --- 게시일 ---------------------------------------------------------------------


@pytest.mark.parametrize(
    "days",
    [1, -1, -3],
    ids=["하루-건너뜀", "앞 게시물과-같은-날", "날짜가-거꾸로"],
)
def test_게시일이_하루씩_연속하지_않으면_오류(tmp_path, days):
    plan, images = _setup(tmp_path)
    plan = _shift(plan, 3, days)  # 3번부터 끝까지 옮긴다 — 어긋난 지점은 한 곳뿐이다

    findings = validate_structure(plan, images)

    assert _at(findings, "날짜연속") == [3]  # 뒤따르는 게시물까지 연쇄로 걸리지 않는다
    assert _at(findings, "월밖") == []
    assert next(f for f in findings if f.code == "날짜연속").severity == "error"


def test_게시일_연속성은_시각이_아니라_달력_날짜로_본다(tmp_path):
    plan, images = _setup(tmp_path)
    plan = _edit(plan, 0, publish_at=_jst(date(2026, 11, 1), time(23, 59)))  # 다음 글까지 1분
    plan = _edit(plan, 1, publish_at=_jst(date(2026, 11, 2), time(0, 0)))
    plan = _edit(plan, 2, publish_at=_jst(date(2026, 11, 3), time(23, 59)))  # 앞 글과 거의 48시간

    assert validate_structure(plan, images) == []


def test_게시일은_각_게시물의_타임존_기준_날짜로_비교한다(tmp_path):
    plan, images = _setup(tmp_path)
    # 2026-11-02 06:00 JST는 UTC로 11-01 21:00 — UTC 날짜로 보면 0번(11-01)과 같은 날이 된다.
    plan = _edit(plan, 1, publish_at=_jst(date(2026, 11, 2), time(6, 0)))

    assert validate_structure(plan, images) == []


def test_게시일이_plan_month_밖이면_오류(tmp_path):
    plan, images = _setup(tmp_path)
    plan = _shift(plan, 0, 25)  # 11-26 … 12-01 — 마지막 게시물만 12월로 넘어간다

    findings = validate_structure(plan, images)

    assert _at(findings, "월밖") == [5]
    assert _at(findings, "날짜연속") == []
    out = next(f for f in findings if f.code == "월밖")
    assert out.severity == "error"
    assert "2026-11" in out.message and "2026-12-01" in out.message


def test_월_기준은_plan_month를_따른다(tmp_path):
    plan, images = _setup(tmp_path)
    december = dataclasses.replace(_shift(plan, 0, 30), month="2026-12")  # 12-01 … 12-06

    assert validate_structure(december, images) == []
    assert _at(validate_structure(dataclasses.replace(december, month="2026-11"), images), "월밖") == list(range(6))


def test_이전_달에_걸쳐도_월밖(tmp_path):
    plan, images = _setup(tmp_path)
    plan = _shift(plan, 0, -1)  # 10-31 … 11-05

    assert _at(validate_structure(plan, images), "월밖") == [0]


def test_월_경계도_게시물의_타임존_기준_날짜로_본다(tmp_path):
    plan, images = _setup(tmp_path)
    plan = _shift(plan, 0, 24)  # 11-25 … 11-30
    # 현지 11-30 23:30(UTC-5)은 UTC로 12-01이지만 달력 날짜는 11월이다.
    plan = _edit(plan, 5, publish_at=datetime(2026, 11, 30, 23, 30, tzinfo=timezone(timedelta(hours=-5))))
    assert validate_structure(plan, images) == []

    # 반대로 현지 12-01 00:30(+09:00)은 UTC로 11-30이어도 12월이다.
    plan = _edit(plan, 5, publish_at=datetime(2026, 12, 1, 0, 30, tzinfo=JST))
    assert _at(validate_structure(plan, images), "월밖") == [5]


# --- 이미지 파일 -----------------------------------------------------------------


def test_이미지_파일이_없으면_오류(tmp_path):
    plan, images = _setup(tmp_path)
    (images / plan.posts[4].image_file).unlink()

    findings = validate_structure(plan, images)

    assert _pairs(findings) == [(4, "이미지없음")]
    assert findings[0].severity == "error"
    assert plan.posts[4].image_file in findings[0].message


def test_이미지_폴더가_아예_없어도_멈추지_않고_게시물마다_보고한다(tmp_path):
    plan = _plan()

    findings = validate_structure(plan, tmp_path / "없는-폴더")

    assert _pairs(findings) == [(i, "이미지없음") for i in range(6)]


def test_이미지_폴더_자리에_파일이_있어도_멈추지_않는다(tmp_path):
    plan = _plan()
    not_a_dir = tmp_path / "images"
    not_a_dir.write_bytes(b"x")  # 폴더가 아니라 파일 — 그 아래를 stat하면 NotADirectoryError

    assert _pairs(validate_structure(plan, not_a_dir)) == [(i, "이미지없음") for i in range(6)]


def test_이름만_같은_폴더는_이미지가_아니다(tmp_path):
    plan, images = _setup(tmp_path)
    (images / plan.posts[1].image_file).unlink()
    (images / plan.posts[1].image_file).mkdir()

    assert _pairs(validate_structure(plan, images)) == [(1, "이미지없음")]


def test_이미지가_0바이트면_오류(tmp_path):
    plan, images = _setup(tmp_path)
    (images / plan.posts[0].image_file).write_bytes(b"")

    findings = validate_structure(plan, images)

    assert _pairs(findings) == [(0, "이미지비어있음")]
    assert findings[0].severity == "error"


@pytest.mark.parametrize("name", ["00-a.webp", "00-a.gif", "00-a.bmp", "00-a", "00-a.png.txt"])
def test_이미지_확장자가_jpg_png가_아니면_오류(tmp_path, name):
    plan, images = _setup(tmp_path)
    plan = _edit(plan, 0, image_file=name)
    (images / name).write_bytes(b"x")  # 파일은 있다 — 확장자만 문제다

    findings = validate_structure(plan, images)

    assert _pairs(findings) == [(0, "이미지확장자")]
    assert findings[0].severity == "error"


@pytest.mark.parametrize("name", ["00-a.jpg", "00-a.jpeg", "00-a.png", "00-a.PNG", "00-a.JPG"])
def test_jpg_jpeg_png는_대소문자와_상관없이_통과한다(tmp_path, name):
    plan, images = _setup(tmp_path)
    plan = _edit(plan, 0, image_file=name)
    (images / name).write_bytes(b"x")

    assert validate_structure(plan, images) == []


def test_이미지가_8MB를_넘으면_오류(tmp_path):
    plan, images = _setup(tmp_path)
    with (images / plan.posts[2].image_file).open("wb") as f:
        f.truncate(config.MAX_IMAGE_BYTES + 1)  # 희소 파일 — 실제로 8MiB를 쓰지 않는다

    findings = validate_structure(plan, images)

    assert _pairs(findings) == [(2, "이미지용량")]
    assert findings[0].severity == "error"


def test_이미지가_정확히_상한_크기면_통과한다(tmp_path):
    plan, images = _setup(tmp_path)
    with (images / plan.posts[2].image_file).open("wb") as f:
        f.truncate(config.MAX_IMAGE_BYTES)

    assert validate_structure(plan, images) == []


def test_게시물마다_이미지_파일명이_달라야_한다(tmp_path):
    plan, images = _setup(tmp_path)
    shared = plan.posts[0].image_file
    plan = _edit(_edit(plan, 1, image_file=shared), 2, image_file=shared)  # 같은 소재의 세 건이 한 파일을 쓴다

    findings = validate_structure(plan, images)

    assert _pairs(findings) == [(1, "이미지중복"), (2, "이미지중복")]  # 처음 쓴 0번은 걸지 않는다
    assert findings[0].severity == "error"
    assert shared in findings[0].message
    assert all("0번" in f.message for f in findings)  # 둘 다 처음 쓴 0번을 가리킨다


def test_다른_소재끼리_같은_파일명을_써도_중복이다(tmp_path):
    plan, images = _setup(tmp_path)
    plan = _edit(plan, 3, image_file=plan.posts[0].image_file)

    assert _pairs(validate_structure(plan, images)) == [(3, "이미지중복")]


def test_대소문자만_다른_파일명도_중복이다(tmp_path):
    # 맥의 기본 파일 시스템은 대소문자를 구분하지 않아 두 이름이 한 파일을 가리킨다.
    plan, images = _setup(tmp_path)
    clash = plan.posts[0].image_file.upper().replace(".PNG", ".png")
    plan = _edit(plan, 1, image_file=clash)
    (images / clash).write_bytes(b"x")

    assert _at(validate_structure(plan, images), "이미지중복") == [1]


@pytest.mark.parametrize("name", ["../outside.png", "sub/inner.png", "/abs/outside.png"])
def test_이미지_파일명에_경로가_섞이면_오류(tmp_path, name):
    plan, images = _setup(tmp_path)
    (tmp_path / "outside.png").write_bytes(b"x")  # 폴더 밖에 실제로 있는 파일
    (images / "sub").mkdir()
    (images / "sub" / "inner.png").write_bytes(b"x")
    plan = _edit(plan, 0, image_file=name)

    findings = validate_structure(plan, images)

    assert _pairs(findings) == [(0, "이미지경로")]  # 폴더 밖 파일을 '있다'고 보증하지 않는다


# --- 이미지 프롬프트 --------------------------------------------------------------


def test_이미지_프롬프트에_글자금지_지시가_없으면_오류(tmp_path):
    plan, images = _setup(tmp_path)
    plan = _edit(plan, 1, image_prompt=_NO_REAL_ONLY)

    findings = validate_structure(plan, images)

    assert _pairs(findings) == [(1, "프롬프트글자")]
    assert findings[0].severity == "error"


def test_이미지_프롬프트에_실존인물_실제캠퍼스_금지_지시가_없으면_오류(tmp_path):
    plan, images = _setup(tmp_path)
    plan = _edit(plan, 4, image_prompt=_NO_TEXT_ONLY)

    findings = validate_structure(plan, images)

    assert _pairs(findings) == [(4, "프롬프트삽화")]
    assert findings[0].severity == "error"


def test_두_지시가_모두_없으면_둘_다_보고한다(tmp_path):
    plan, images = _setup(tmp_path)
    plan = _edit(plan, 2, image_prompt="A student at a desk, flat illustration.")

    assert _pairs(validate_structure(plan, images)) == [(2, "프롬프트글자"), (2, "프롬프트삽화")]


@pytest.mark.parametrize(
    ("prompt", "code"),
    [
        (
            "A student, flat illustration. No text. No real people, no real campuses, no company facilities.",
            "프롬프트글자",
        ),
        (
            "A student, flat illustration. No text, no letters, no logos. No real people.",
            "프롬프트삽화",
        ),
    ],
    ids=["글자금지-일부만", "삽화금지-일부만"],
)
def test_필수_지시는_문구_전체가_있어야_인정한다(tmp_path, prompt, code):
    plan, images = _setup(tmp_path)
    plan = _edit(plan, 0, image_prompt=prompt)

    assert _pairs(validate_structure(plan, images)) == [(0, code)]  # 일부만 쓴 쪽의 코드만 나온다


def test_프롬프트_지시는_대소문자와_줄바꿈·공백_수에_상관없이_찾는다(tmp_path):
    plan, images = _setup(tmp_path)
    prompt = (
        "A student at a desk.\nNO TEXT,\n  NO LETTERS,   NO LOGOS.\n"
        "Illustration only; No Real People, no real\tcampuses, NO COMPANY FACILITIES."
    )
    plan = _edit(plan, 0, image_prompt=prompt)

    assert validate_structure(plan, images) == []


# --- 사실 ------------------------------------------------------------------------


def test_fact_key가_facts에_없으면_오류():
    plan = _plan()
    facts = _facts()
    del facts["tuition_kijeon"]

    findings = validate_facts(plan, facts)

    assert _pairs(findings) == [(3, "사실없음"), (4, "사실없음"), (5, "사실없음")]
    assert findings[0].severity == "error"
    assert "tuition_kijeon" in findings[0].message


def test_fact가_게시일에_만료되면_오류():
    today = date.today()
    publish_day = today + timedelta(days=30)
    # 실행일(오늘)에는 유효하지만 게시일에는 이미 만료된 사실 — date.today()로 판정하면 놓친다.
    facts = {"visa_d2_definition": _fact("visa_d2_definition", today + timedelta(days=10))}
    assert facts["visa_d2_definition"].is_valid_on(today)
    plan = _only(_plan(), 0, publish_at=_jst(publish_day))

    findings = validate_facts(plan, facts)

    assert _pairs(findings) == [(0, "사실만료")]
    assert findings[0].severity == "error"
    assert "visa_d2_definition" in findings[0].message
    assert str(today + timedelta(days=10)) in findings[0].message and str(publish_day) in findings[0].message


def test_실행일에는_만료됐어도_게시일에_유효하면_통과한다():
    today = date.today()
    # 과거 날짜 플랜을 다시 검사하는 경우 — 실행일 기준으로 보면 억울하게 걸린다.
    facts = {"visa_d2_definition": _fact("visa_d2_definition", today - timedelta(days=10))}
    assert not facts["visa_d2_definition"].is_valid_on(today)
    plan = _only(_plan(), 0, publish_at=_jst(today - timedelta(days=30)))

    assert validate_facts(plan, facts) == []


def test_유효기한_당일_게시는_통과하고_다음날부터_만료다():
    plan = _only(_plan(), 0)  # 0번: 2026-11-01, visa_d2_definition
    on_expiry_day = {"visa_d2_definition": _fact("visa_d2_definition", date(2026, 11, 1))}
    day_before = {"visa_d2_definition": _fact("visa_d2_definition", date(2026, 10, 31))}

    assert validate_facts(plan, on_expiry_day) == []
    assert _pairs(validate_facts(plan, day_before)) == [(0, "사실만료")]


def test_사실_만료도_게시물의_타임존_기준_날짜로_본다():
    # 2026-11-02 00:30 JST는 UTC로 11-01이다. 달력 날짜(11-02)로 보면 11-01 만료는 이미 지났다.
    plan = _only(_plan(), 0, publish_at=datetime(2026, 11, 2, 0, 30, tzinfo=JST))
    facts = {"visa_d2_definition": _fact("visa_d2_definition", date(2026, 11, 1))}

    assert _pairs(validate_facts(plan, facts)) == [(0, "사실만료")]


def test_게시물_하나의_사실_문제는_모두_모아서_보고한다():
    plan = _only(_plan(), 0, fact_keys=("없는_키", "visa_d2_definition", "tuition_kijeon"))
    facts = {
        "visa_d2_definition": _fact("visa_d2_definition", date(2026, 10, 1)),  # 만료
        "tuition_kijeon": _fact("tuition_kijeon", date(2027, 10, 31)),  # 유효
    }

    findings = validate_facts(plan, facts)

    assert _pairs(findings) == [(0, "사실없음"), (0, "사실만료")]  # fact_keys에 적힌 순서
    assert "없는_키" in findings[0].message
    assert "visa_d2_definition" in findings[1].message


def test_fact_keys가_비어_있으면_사실_검사를_건너뛴다():
    plan = _only(_plan(), 0, fact_keys=())

    assert validate_facts(plan, {}) == []


# --- 누적과 순서 ------------------------------------------------------------------


def test_깨진_게시물이_여럿이면_하나도_빠뜨리지_않고_보고한다(tmp_path):
    plan, images = _setup(tmp_path)
    (images / plan.posts[4].image_file).unlink()  # 4: 파일 없음
    (images / plan.posts[0].image_file).write_bytes(b"")  # 0: 0바이트
    plan = _edit(plan, 2, image_file="02-visa-d2-ne.webp")  # 2: 확장자
    (images / "02-visa-d2-ne.webp").write_bytes(b"x")

    findings = validate_structure(plan, images)

    assert _pairs(findings) == [(0, "이미지비어있음"), (2, "이미지확장자"), (4, "이미지없음")]


def test_findings는_플랜_전체_항목이_먼저_오고_게시물_번호순_검사순서로_나온다(tmp_path):
    plan, images = _setup(tmp_path)
    plan = dataclasses.replace(plan, posts=plan.posts[:5])  # 5건 — 게시물수, tuition-kijeon의 ne 누락
    plan = _edit(plan, 1, image_file="01-visa-d2-my.webp", image_prompt="A student, flat illustration.")
    (images / "01-visa-d2-my.webp").write_bytes(b"x")

    findings = validate_structure(plan, images)

    assert _pairs(findings) == [
        (None, "게시물수"),
        (1, "이미지확장자"),
        (1, "프롬프트글자"),
        (1, "프롬프트삽화"),
        (3, "언어누락"),
    ]
    assert validate_structure(plan, images) == findings  # 같은 입력이면 같은 결과
