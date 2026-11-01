"""월간 플랜(`plan.json`) 스키마와 로더.

Claude Code 세션이 매달 만드는 `output/facebook/YYYY-MM/plan.json`의 모양을 정의하고,
읽을 때 **구조**가 맞는지만 확인한다: 언어 코드, 소재 참조, index 연속성, 시각의
타임존, 필드 타입. 이미지 존재·금지 표현·CTA·역번역처럼 게시물이 *무엇을 말하는지*에
관한 규칙은 여기서 보지 않는다(검증 모듈의 몫). 하나라도 어긋나면 `PlanError`로 멈춘다.

JSON 모양::

    {
      "month": "2026-11",
      "topics": [{"topic_id": "visa-d2", "title_ko": "..."}],
      "posts": [{
        "index": 0, "topic_id": "visa-d2", "language": "vi",
        "publish_at": "2026-11-01T19:00:00+09:00",
        "source_ko": "...", "body_local": "...",
        "image_file": "...", "image_prompt": "...",
        "fact_keys": ["visa_d2_definition"], "university_names": []
      }]
    }

`fact_keys`·`university_names`는 비어 있어도 키를 반드시 적는다. 철자가 틀린 키가 조용히
빈 목록으로 읽혀 후속 검증을 건너뛰는 일을 막기 위해서다.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from .config import LANGUAGES, month_dir


class PlanError(Exception):
    """플랜 파일의 구조가 규칙에 맞지 않을 때."""


@dataclass(frozen=True)
class Topic:
    topic_id: str
    title_ko: str


@dataclass(frozen=True)
class Post:
    index: int
    topic_id: str
    language: str
    publish_at: datetime  # 타임존 오프셋을 가진 시각
    source_ko: str
    body_local: str
    image_file: str
    image_prompt: str
    fact_keys: tuple[str, ...]
    university_names: tuple[str, ...]  # 한국어 대학명(`universities.json`의 `name_ko`)


@dataclass(frozen=True)
class Plan:
    month: str  # "YYYY-MM"
    topics: tuple[Topic, ...]
    posts: tuple[Post, ...]

    def posts_for(self, topic_id: str) -> tuple[Post, ...]:
        """`topic_id` 소재의 게시물을 플랜 순서대로. 없는 소재면 빈 튜플."""
        return tuple(post for post in self.posts if post.topic_id == topic_id)


def _text(where: str, entry: dict, name: str) -> str:
    value = entry.get(name)
    if not (isinstance(value, str) and value.strip()):
        raise PlanError(f"{where}의 '{name}'이(가) 없거나 비어 있습니다(비어 있지 않은 문자열이어야 합니다).")
    return value


def _text_list(where: str, entry: dict, name: str) -> tuple[str, ...]:
    value = entry.get(name)
    if not (isinstance(value, list) and all(isinstance(item, str) and item.strip() for item in value)):
        raise PlanError(f"{where}의 '{name}'은(는) 문자열 목록이어야 합니다(없으면 [] 로 적습니다).")
    return tuple(value)


def _parse_topic(position: int, entry: object) -> Topic:
    where = f"topics[{position}]"
    if not isinstance(entry, dict):
        raise PlanError(f"{where}은(는) topic_id와 title_ko를 가진 객체여야 합니다.")
    return Topic(topic_id=_text(where, entry, "topic_id"), title_ko=_text(where, entry, "title_ko"))


def _parse_publish_at(where: str, entry: dict) -> datetime:
    text = _text(where, entry, "publish_at")
    try:
        publish_at = datetime.fromisoformat(text)
    except ValueError:
        raise PlanError(
            f"{where}의 publish_at이 올바른 ISO 8601 시각이 아닙니다: {text!r} "
            f"(예: 2026-11-01T19:00:00+09:00)"
        ) from None
    if publish_at.utcoffset() is None:
        raise PlanError(
            f"{where}의 publish_at에 타임존이 없습니다: {text!r} "
            f"(예: 2026-11-01T19:00:00+09:00 처럼 +09:00 같은 오프셋을 붙이세요)"
        )
    return publish_at


def _parse_post(position: int, entry: object, topic_ids: frozenset[str]) -> Post:
    where = f"posts[{position}]"
    if not isinstance(entry, dict):
        raise PlanError(f"{where}은(는) 게시물 필드를 가진 객체여야 합니다.")

    index = entry.get("index")
    if not (isinstance(index, int) and not isinstance(index, bool)):
        raise PlanError(f"{where}의 index가 없거나 정수가 아닙니다: {index!r}")
    if index != position:
        raise PlanError(
            f"{where}의 index가 {index}입니다. index는 0부터 1씩 늘어나며 posts의 순서와 "
            f"같아야 하므로 여기서는 {position}이어야 합니다."
        )

    topic_id = _text(where, entry, "topic_id")
    if topic_id not in topic_ids:
        raise PlanError(
            f"{where}의 topic_id '{topic_id}'이(가) topics에 없습니다. (topics: {', '.join(sorted(topic_ids))})"
        )

    language = _text(where, entry, "language")
    if language not in LANGUAGES:
        raise PlanError(
            f"{where}의 language '{language}'은(는) 지원하지 않는 언어 코드입니다. (허용: {', '.join(LANGUAGES)})"
        )

    return Post(
        index=index,
        topic_id=topic_id,
        language=language,
        publish_at=_parse_publish_at(where, entry),
        source_ko=_text(where, entry, "source_ko"),
        body_local=_text(where, entry, "body_local"),
        image_file=_text(where, entry, "image_file"),
        image_prompt=_text(where, entry, "image_prompt"),
        fact_keys=_text_list(where, entry, "fact_keys"),
        university_names=_text_list(where, entry, "university_names"),
    )


def _non_empty_list(raw: dict, name: str) -> list:
    value = raw.get(name)
    if not (isinstance(value, list) and value):
        raise PlanError(f"플랜의 '{name}'이(가) 없거나 비어 있습니다(비어 있지 않은 목록이어야 합니다).")
    return value


def load_plan(path: Path) -> Plan:
    """`plan.json`을 읽어 `Plan`으로 돌려준다. 구조가 규칙에 어긋나면 `PlanError`."""
    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        raise PlanError(f"플랜 파일을 찾을 수 없습니다: {path}") from None
    except OSError:
        raise PlanError(f"플랜 파일을 읽을 수 없습니다(경로와 권한을 확인하세요): {path}") from None
    except UnicodeDecodeError:
        raise PlanError(f"플랜 파일이 UTF-8 텍스트가 아닙니다: {path}") from None
    try:
        raw = json.loads(text)
    except json.JSONDecodeError as e:
        raise PlanError(f"플랜 파일이 올바른 JSON이 아닙니다: {path} (줄 {e.lineno}, 열 {e.colno})") from None
    if not isinstance(raw, dict):
        raise PlanError(f"플랜 파일의 최상위는 {{month, topics, posts}} 형태의 객체여야 합니다: {path}")

    month = raw.get("month")
    if not isinstance(month, str):
        raise PlanError(f"플랜의 'month'가 없거나 문자열이 아닙니다: {month!r} (예: 2026-11)")
    try:
        month_dir(month)  # 월 형식 판정은 config 한 곳에 둔다(폴더 이름으로도 쓰이는 값이다)
    except ValueError as e:
        raise PlanError(f"플랜의 'month'가 올바르지 않습니다. {e}") from None

    topics = tuple(_parse_topic(i, entry) for i, entry in enumerate(_non_empty_list(raw, "topics")))
    seen: set[str] = set()
    for topic in topics:
        if topic.topic_id in seen:
            raise PlanError(f"topics에 같은 topic_id가 중복되어 있습니다: {topic.topic_id!r}")
        seen.add(topic.topic_id)

    topic_ids = frozenset(seen)
    posts = tuple(_parse_post(i, entry, topic_ids) for i, entry in enumerate(_non_empty_list(raw, "posts")))
    return Plan(month=month, topics=topics, posts=posts)
