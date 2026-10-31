"""월간 플랜 스키마·로더(plan_model.py) 테스트.

여기서는 구조(언어 코드, 소재 참조, index 연속성, 타임존, 필드 타입)만 본다.
이미지 존재·금지 표현·CTA·역번역 같은 내용 규칙은 뒤따르는 검증 모듈의 몫이다.
"""

from __future__ import annotations

import copy
import dataclasses
import json
from datetime import datetime, timedelta
from pathlib import Path

import pytest

from facebook.plan_model import Plan, PlanError, Post, Topic, load_plan

FIXTURE = Path(__file__).parent / "fixtures" / "plan-valid.json"

_POST_FIELDS = (
    "index", "topic_id", "language", "publish_at", "source_ko",
    "body_local", "image_file", "image_prompt", "fact_keys", "university_names",
)


def _raw() -> dict:
    """유효한 픽스처의 원본 dict. 테스트마다 복사본을 받아 필요한 곳만 망가뜨린다."""
    return copy.deepcopy(json.loads(FIXTURE.read_text(encoding="utf-8")))


def _write(tmp_path, data) -> Path:
    p = tmp_path / "plan.json"
    p.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    return p


# --- 정상 경로 ---------------------------------------------------------------


def test_유효한_플랜_로드():
    plan = load_plan(FIXTURE)
    assert plan.month == "2026-11"
    assert plan.posts[0].language == "vi"
    assert plan.posts[0].publish_at.tzinfo is not None


def test_픽스처는_소재_2개_게시물_6건이다():
    plan = load_plan(FIXTURE)
    assert [t.topic_id for t in plan.topics] == ["visa-d2", "tuition-kijeon"]
    assert len(plan.posts) == 6
    assert [p.index for p in plan.posts] == [0, 1, 2, 3, 4, 5]
    assert [p.language for p in plan.posts] == ["vi", "my", "ne", "vi", "my", "ne"]


def test_필드가_모두_채워지고_목록은_튜플이다():
    post = load_plan(FIXTURE).posts[3]
    assert post.topic_id == "tuition-kijeon"
    assert post.publish_at == datetime.fromisoformat("2026-11-04T19:00:00+09:00")
    assert post.publish_at.utcoffset() == timedelta(hours=9)
    assert post.source_ko.startswith("전주기전대학의")
    assert post.body_local
    assert post.image_file == "03-tuition-kijeon-vi.png"
    assert post.image_prompt
    assert post.fact_keys == ("tuition_kijeon",)
    assert post.university_names == ("전주기전대학",)
    assert load_plan(FIXTURE).posts[0].university_names == ()


def test_posts_for는_소재의_게시물을_플랜_순서대로_돌려준다():
    plan = load_plan(FIXTURE)
    assert [p.index for p in plan.posts_for("tuition-kijeon")] == [3, 4, 5]
    assert isinstance(plan.posts_for("visa-d2"), tuple)


def test_posts_for는_없는_소재면_빈_튜플():
    assert load_plan(FIXTURE).posts_for("없는-소재") == ()


def test_모델은_불변이다():
    plan = load_plan(FIXTURE)
    for obj, field in ((plan, "month"), (plan.topics[0], "title_ko"), (plan.posts[0], "body_local")):
        with pytest.raises(dataclasses.FrozenInstanceError):
            setattr(obj, field, "다른 값")


def test_Post_필드_이름과_순서가_계약과_같다():
    assert tuple(f.name for f in dataclasses.fields(Post)) == _POST_FIELDS
    assert tuple(f.name for f in dataclasses.fields(Topic)) == ("topic_id", "title_ko")
    assert tuple(f.name for f in dataclasses.fields(Plan)) == ("month", "topics", "posts")


# --- 구조 검증: 언어·소재 참조·index·타임존 -------------------------------------


def test_알_수_없는_언어코드면_PlanError(tmp_path):
    raw = _raw()
    raw["posts"][1]["language"] = "th"
    with pytest.raises(PlanError, match=r"posts\[1\].*language.*'th'"):
        load_plan(_write(tmp_path, raw))


def test_언어코드는_대소문자까지_정확해야_한다(tmp_path):
    raw = _raw()
    raw["posts"][0]["language"] = "VI"
    with pytest.raises(PlanError, match="language"):
        load_plan(_write(tmp_path, raw))


def test_topic_id가_topics에_없으면_PlanError(tmp_path):
    raw = _raw()
    raw["posts"][4]["topic_id"] = "없는-소재"
    with pytest.raises(PlanError, match=r"posts\[4\].*topic_id.*없는-소재"):
        load_plan(_write(tmp_path, raw))


def test_index가_0부터_연속하지_않으면_PlanError(tmp_path):
    raw = _raw()
    raw["posts"][3]["index"] = 7  # 0,1,2,7,4,5 — 중간이 비었다
    with pytest.raises(PlanError, match=r"posts\[3\].*index"):
        load_plan(_write(tmp_path, raw))


@pytest.mark.parametrize(
    "indices",
    [
        [1, 2, 3, 4, 5, 6],  # 1부터 시작
        [0, 1, 1, 3, 4, 5],  # 중복
        [0, 2, 1, 3, 4, 5],  # 순서가 뒤바뀜
    ],
    ids=["starts-at-1", "duplicate", "swapped"],
)
def test_index가_posts_순서와_어긋나면_PlanError(tmp_path, indices):
    raw = _raw()
    for post, index in zip(raw["posts"], indices):
        post["index"] = index
    with pytest.raises(PlanError, match="index"):
        load_plan(_write(tmp_path, raw))


def test_publish_at에_타임존이_없으면_PlanError(tmp_path):
    raw = _raw()
    raw["posts"][2]["publish_at"] = "2026-11-03T19:00:00"
    with pytest.raises(PlanError, match=r"posts\[2\].*publish_at.*타임존"):
        load_plan(_write(tmp_path, raw))


def test_publish_at이_날짜만이면_타임존이_없으므로_PlanError(tmp_path):
    raw = _raw()
    raw["posts"][0]["publish_at"] = "2026-11-01"
    with pytest.raises(PlanError, match="타임존"):
        load_plan(_write(tmp_path, raw))


def test_publish_at이_UTC_Z표기면_통과한다(tmp_path):
    raw = _raw()
    raw["posts"][0]["publish_at"] = "2026-11-01T10:00:00Z"
    plan = load_plan(_write(tmp_path, raw))
    assert plan.posts[0].publish_at.utcoffset() == timedelta(0)


@pytest.mark.parametrize(
    "value",
    [
        pytest.param("tomorrow evening", id="words"),
        pytest.param("2026-13-01T19:00:00+09:00", id="month-13"),
        pytest.param(20261101, id="number"),
    ],
)
def test_publish_at이_ISO_시각이_아니면_PlanError(tmp_path, value):
    raw = _raw()
    raw["posts"][0]["publish_at"] = value
    with pytest.raises(PlanError, match=r"posts\[0\].*publish_at"):
        load_plan(_write(tmp_path, raw))


# --- 필드 존재·타입 ----------------------------------------------------------


@pytest.mark.parametrize("field", _POST_FIELDS)
def test_게시물_필드가_빠지면_PlanError가_필드명을_알려준다(tmp_path, field):
    raw = _raw()
    del raw["posts"][2][field]
    with pytest.raises(PlanError, match=rf"posts\[2\].*{field}"):
        load_plan(_write(tmp_path, raw))


@pytest.mark.parametrize("field", ["source_ko", "body_local", "image_file", "image_prompt"])
@pytest.mark.parametrize(
    "value",
    [pytest.param("", id="empty"), pytest.param("   ", id="blank"), pytest.param(None, id="null"), 3],
)
def test_본문_계열_필드가_비었거나_문자열이_아니면_PlanError(tmp_path, field, value):
    raw = _raw()
    raw["posts"][0][field] = value
    with pytest.raises(PlanError, match=rf"posts\[0\].*{field}"):
        load_plan(_write(tmp_path, raw))


@pytest.mark.parametrize("value", ["0", 0.0, None])
def test_index가_정수가_아니면_PlanError(tmp_path, value):
    raw = _raw()
    raw["posts"][0]["index"] = value
    with pytest.raises(PlanError, match=r"posts\[0\].*index"):
        load_plan(_write(tmp_path, raw))


@pytest.mark.parametrize("position, value", [(0, False), (1, True)])
def test_index가_bool이면_값이_0_1과_같아도_PlanError(tmp_path, position, value):
    raw = _raw()
    raw["posts"][position]["index"] = value  # False == 0, True == 1 이라 연속성 검사만으로는 통과한다
    with pytest.raises(PlanError, match=rf"posts\[{position}\].*index"):
        load_plan(_write(tmp_path, raw))


@pytest.mark.parametrize("field", ["fact_keys", "university_names"])
@pytest.mark.parametrize("value", ["tuition_kijeon", None, [1], [""], {"a": "b"}])
def test_목록_필드가_문자열_목록이_아니면_PlanError(tmp_path, field, value):
    raw = _raw()
    raw["posts"][0][field] = value
    with pytest.raises(PlanError, match=rf"posts\[0\].*{field}"):
        load_plan(_write(tmp_path, raw))


def test_목록_필드는_빈_목록이어도_된다(tmp_path):
    raw = _raw()
    raw["posts"][3]["fact_keys"] = []
    raw["posts"][3]["university_names"] = []
    post = load_plan(_write(tmp_path, raw)).posts[3]
    assert post.fact_keys == () and post.university_names == ()


def test_게시물이_객체가_아니면_PlanError(tmp_path):
    raw = _raw()
    raw["posts"][1] = "게시물"
    with pytest.raises(PlanError, match=r"posts\[1\]"):
        load_plan(_write(tmp_path, raw))


# --- 소재·월·최상위 구조 -------------------------------------------------------


def test_소재_id가_겹치면_PlanError(tmp_path):
    raw = _raw()
    raw["topics"][1]["topic_id"] = raw["topics"][0]["topic_id"]
    with pytest.raises(PlanError, match="visa-d2.*중복|중복.*visa-d2"):
        load_plan(_write(tmp_path, raw))


@pytest.mark.parametrize("field", ["topic_id", "title_ko"])
@pytest.mark.parametrize("value", ["", None, 5])
def test_소재_필드가_비었거나_문자열이_아니면_PlanError(tmp_path, field, value):
    raw = _raw()
    raw["topics"][0][field] = value
    with pytest.raises(PlanError, match=rf"topics\[0\].*{field}"):
        load_plan(_write(tmp_path, raw))


@pytest.mark.parametrize("month", ["2026-1", "2026-13", "26-11", "2026/11", "", None, 202611])
def test_month가_YYYY_MM이_아니면_PlanError(tmp_path, month):
    raw = _raw()
    raw["month"] = month
    with pytest.raises(PlanError, match="month"):
        load_plan(_write(tmp_path, raw))


@pytest.mark.parametrize("key", ["month", "topics", "posts"])
def test_최상위_항목이_빠지면_PlanError(tmp_path, key):
    raw = _raw()
    del raw[key]
    with pytest.raises(PlanError, match=key):
        load_plan(_write(tmp_path, raw))


@pytest.mark.parametrize("key", ["topics", "posts"])
@pytest.mark.parametrize(
    "value",
    [pytest.param([], id="empty-list"), pytest.param({}, id="empty-object"), pytest.param("text", id="str"), None],
)
def test_topics와_posts는_비어_있지_않은_목록이어야_한다(tmp_path, key, value):
    raw = _raw()
    raw[key] = value
    with pytest.raises(PlanError, match=key):
        load_plan(_write(tmp_path, raw))


def test_최상위가_객체가_아니면_PlanError(tmp_path):
    with pytest.raises(PlanError, match="최상위"):
        load_plan(_write(tmp_path, [1, 2, 3]))


# --- 파일 읽기 ---------------------------------------------------------------


def test_파일이_없으면_PlanError(tmp_path):
    with pytest.raises(PlanError, match="찾을 수 없습니다"):
        load_plan(tmp_path / "없는-plan.json")


def test_경로가_디렉터리면_한국어_PlanError(tmp_path):
    with pytest.raises(PlanError, match="읽을 수 없습니다"):
        load_plan(tmp_path)


def test_UTF8이_아니면_한국어_PlanError(tmp_path):
    p = tmp_path / "plan.json"
    p.write_bytes(b'{"month": "\xff\xfe"}')
    with pytest.raises(PlanError, match="UTF-8"):
        load_plan(p)


def test_JSON이_아니면_PlanError가_위치를_알려준다(tmp_path):
    p = tmp_path / "plan.json"
    p.write_text('{"month": "2026-11",\n "topics": ]', encoding="utf-8")
    with pytest.raises(PlanError, match=r"올바른 JSON이 아닙니다.*줄 2"):
        load_plan(p)


def test_PlanError는_영어_예외를_연결하지_않는다(tmp_path):
    p = tmp_path / "plan.json"
    p.write_text("{", encoding="utf-8")
    with pytest.raises(PlanError) as excinfo:
        load_plan(p)
    assert excinfo.value.__cause__ is None
    assert excinfo.value.__suppress_context__ is True
