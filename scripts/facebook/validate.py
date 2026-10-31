"""월간 플랜의 구조 검증.

`validate_structure`는 게시물 수·언어 로테이션·소재 배치·게시일(연속성, 플랜의 달)·이미지 파일(경로,
확장자, 존재, 크기, 중복)·이미지 프롬프트의 필수 지시 문구를, `validate_facts`는 게시물이 쓰는
사실의 존재와 **게시일 기준** 유효기한을 본다. 둘 다 멈추지 않고 발견한 문제를 전부 모아
`Finding` 목록으로 돌려준다. 호출하는 쪽(CLI)이 오류가 하나라도 있으면 다음 단계로 넘기지 않는다.

게시물이 *무엇을 말하는지*(금지 표현·CTA·대학명 맥락)와 역번역 대조는 여기서 보지 않는다.
파일은 `stat`만 한다 — 내용을 열어 JPEG/PNG 형식인지까지는 확인하지 않는다.

결과 순서는 항상 같다. 게시물에 매이지 않는 항목(`post_index`가 `None`)이 먼저 오고, 그다음
게시물 번호 오름차순이며, 같은 게시물 안에서는 검사한 순서(언어 → 소재 배치 → 월·날짜 → 이미지 → 프롬프트)다.
"""

from __future__ import annotations

import stat
from dataclasses import dataclass
from datetime import timedelta
from pathlib import Path
from typing import Literal

from .config import (
    ALLOWED_IMAGE_SUFFIXES,
    IMAGE_PROMPT_NO_REAL_SUBJECTS,
    IMAGE_PROMPT_NO_TEXT,
    LANGUAGES,
    MAX_IMAGE_BYTES,
)
from .facts import Fact
from .plan_model import Plan


@dataclass(frozen=True)
class Finding:
    severity: Literal["error", "warning"]
    code: str
    post_index: int | None  # 플랜 전체나 게시물이 하나도 없는 소재에 관한 항목이면 None
    message: str  # 한국어


def _error(code: str, post_index: int | None, message: str) -> Finding:
    return Finding("error", code, post_index, message)


def validate_structure(plan: Plan, images_dir: Path) -> list[Finding]:
    """플랜의 구조를 검사해 문제를 전부 돌려준다. 이미지는 `images_dir / post.image_file`에서 찾는다."""
    findings: list[Finding] = []
    findings += _check_count(plan)
    findings += _check_rotation(plan)
    findings += _check_adjacency(plan)
    findings += _check_dates(plan)
    findings += _check_images(plan, images_dir)
    findings += _check_prompts(plan)
    # 정렬은 안정적이다: 같은 게시물의 항목은 위에서 검사한 순서를 지킨다.
    return sorted(findings, key=lambda f: -1 if f.post_index is None else f.post_index)


def validate_facts(plan: Plan, facts: dict[str, Fact]) -> list[Finding]:
    """게시물이 쓰는 `fact_keys`가 `facts`에 있고 게시일에도 유효한지 본다.

    유효기한은 실행일이 아니라 **각 게시물의 게시일**로 판정한다. 오늘 유효한 사실이 25일 뒤
    게시일에는 만료일 수 있기 때문이다. 게시일은 게시물 자신의 타임존 기준 달력 날짜다.
    """
    findings: list[Finding] = []
    for post in plan.posts:
        day = post.publish_at.date()
        for key in post.fact_keys:
            fact = facts.get(key)
            if fact is None:
                findings.append(_error(
                    "사실없음", post.index,
                    f"사실 '{key}'이(가) facts.json에 없습니다. 확정된 사실만 본문에 쓸 수 있습니다.",
                ))
            elif not fact.is_valid_on(day):
                findings.append(_error(
                    "사실만료", post.index,
                    f"사실 '{key}'의 유효기한({fact.expires_on})이 게시일({day})보다 먼저 끝납니다. "
                    f"출처({fact.source_url})를 다시 확인해 facts.json을 갱신하세요.",
                ))
    return findings


def _check_count(plan: Plan) -> list[Finding]:
    per_topic = len(LANGUAGES)
    count = len(plan.posts)
    if count % per_topic == 0:
        return []
    return [_error(
        "게시물수", None,
        f"게시물이 {count}건입니다. 소재 1개당 {per_topic}건({' → '.join(LANGUAGES)})이므로 "
        f"{per_topic}의 배수여야 합니다.",
    )]


def _check_rotation(plan: Plan) -> list[Finding]:
    """소재마다 게시물의 언어가 정확히 `LANGUAGES` 순서(vi → my → ne)인지 본다."""
    expected = " → ".join(LANGUAGES)
    findings: list[Finding] = []
    for topic in plan.topics:
        posts = plan.posts_for(topic.topic_id)
        actual = tuple(post.language for post in posts)
        if actual == LANGUAGES:
            continue
        shown = " → ".join(actual) if actual else "게시물 없음"
        # 항목은 그 소재의 첫 게시물에 붙인다. 게시물이 하나도 없으면 붙일 곳이 없어 None이다.
        index = posts[0].index if posts else None
        missing = [lang for lang in LANGUAGES if lang not in actual]
        if missing:
            findings.append(_error(
                "언어누락", index,
                f"소재 '{topic.topic_id}'에 {', '.join(missing)} 게시물이 없습니다 "
                f"(현재: {shown}, 필요: {expected}).",
            ))
        else:
            findings.append(_error(
                "언어순서", index,
                f"소재 '{topic.topic_id}'의 언어가 {expected} 순서와 다릅니다 (현재: {shown}).",
            ))
    return findings


def _check_adjacency(plan: Plan) -> list[Finding]:
    """한 소재의 게시물이 `plan.posts`에서 이어 붙어 있는지(번호가 n, n+1, n+2…) 본다.

    게시일이 게시물마다 하루씩 이어지는지는 `_check_dates`가 전체 목록에서 보므로, 번호가 이어
    붙어 있으면 그 소재의 게시물은 연속한 날짜에 놓인다. 날짜를 여기서 다시 계산하지 않는다.
    언어가 맞는지는 `_check_rotation`의 몫이라 여기서는 보지 않는다(서로 독립이다).
    """
    findings: list[Finding] = []
    for topic in plan.topics:
        indices = [post.index for post in plan.posts_for(topic.topic_id)]
        if all(later == earlier + 1 for earlier, later in zip(indices, indices[1:])):
            continue  # 게시물이 0건이거나 1건이어도 여기서는 이어 붙은 것으로 본다
        findings.append(_error(
            "소재분산", indices[0],
            f"소재 '{topic.topic_id}'의 게시물이 이어 붙어 있지 않습니다 (게시물 번호: "
            f"{', '.join(map(str, indices))}). 한 소재의 게시물은 연속한 번호, 곧 하루에 한 건씩 "
            f"연속한 날짜에 놓여야 합니다.",
        ))
    return findings


def _check_dates(plan: Plan) -> list[Finding]:
    """게시일이 플랜의 달 안에 있고 게시물마다 정확히 하루씩 이어지는지 본다.

    날짜는 각 게시물의 타임존 기준 달력 날짜다. 시각은 보지 않는다(예약 창 판정은 스케줄러의 몫).
    """
    findings: list[Finding] = []
    previous = None
    for post in plan.posts:
        day = post.publish_at.date()
        if f"{day.year:04d}-{day.month:02d}" != plan.month:
            findings.append(_error(
                "월밖", post.index,
                f"게시일 {day}이(가) 플랜의 달({plan.month})을 벗어납니다.",
            ))
        if previous is not None and day != previous + timedelta(days=1):
            findings.append(_error(
                "날짜연속", post.index,
                f"게시일 {day}이(가) 앞 게시물({previous})의 다음 날({previous + timedelta(days=1)})이 아닙니다. "
                f"게시물은 하루에 한 건씩 이어져야 합니다.",
            ))
        previous = day
    return findings


def _check_images(plan: Plan, images_dir: Path) -> list[Finding]:
    findings: list[Finding] = []
    first_use: dict[str, int] = {}  # 대소문자 무시한 파일명 -> 처음 쓴 게시물 번호
    limit_mib = f"{MAX_IMAGE_BYTES / (1024 * 1024):g}"
    for post in plan.posts:
        name = post.image_file

        # image_file은 images_dir 안의 파일 이름이어야 한다. 경로가 섞이면 폴더 밖 파일을 가리킬 수 있다.
        bare = Path(name).name == name
        if not bare:
            findings.append(_error(
                "이미지경로", post.index,
                f"image_file '{name}'에 경로가 섞여 있습니다. 이미지 폴더 안의 파일 이름만 적으세요.",
            ))

        if Path(name).suffix.lower() not in ALLOWED_IMAGE_SUFFIXES:
            findings.append(_error(
                "이미지확장자", post.index,
                f"이미지 '{name}'의 확장자가 {'/'.join(ALLOWED_IMAGE_SUFFIXES)} 중 하나가 아닙니다.",
            ))

        if bare:
            findings += _check_image_file(post.index, images_dir / name, limit_mib)

        # 맥의 기본 파일 시스템은 대소문자를 구분하지 않으므로 대소문자만 다른 이름도 같은 파일로 본다.
        key = name.casefold()
        if key in first_use:
            findings.append(_error(
                "이미지중복", post.index,
                f"이미지 파일명 '{name}'을(를) 게시물 {first_use[key]}번도 씁니다. "
                f"게시물마다 따로 만든 이미지를 써야 합니다.",
            ))
        else:
            first_use[key] = post.index
    return findings


def _check_image_file(index: int, path: Path, limit_mib: str) -> list[Finding]:
    """디스크의 이미지 파일이 있고, 비어 있지 않고, 상한을 넘지 않는지 본다."""
    try:
        info = path.stat()
    except OSError:
        return [_error("이미지없음", index, f"이미지 파일을 찾을 수 없거나 읽을 수 없습니다: {path}")]
    if not stat.S_ISREG(info.st_mode):
        return [_error("이미지없음", index, f"이미지 경로가 파일이 아닙니다: {path}")]
    if info.st_size == 0:
        return [_error("이미지비어있음", index, f"이미지 파일이 0바이트입니다: {path}")]
    if info.st_size > MAX_IMAGE_BYTES:
        return [_error(
            "이미지용량", index,
            f"이미지 파일이 {info.st_size:,}바이트로 상한 {limit_mib}MiB를 넘습니다: {path}",
        )]
    return []


def _normalize(text: str) -> str:
    """대소문자와 공백 수(줄바꿈 포함)를 무시하고 비교하려고 소문자·단일 공백으로 만든다."""
    return " ".join(text.split()).lower()


def _check_prompts(plan: Plan) -> list[Finding]:
    """이미지 프롬프트에 필수 지시 문구 두 가지가 있는지 본다."""
    need_no_text = _normalize(IMAGE_PROMPT_NO_TEXT)
    need_no_real = _normalize(IMAGE_PROMPT_NO_REAL_SUBJECTS)
    findings: list[Finding] = []
    for post in plan.posts:
        prompt = _normalize(post.image_prompt)
        if need_no_text not in prompt:
            findings.append(_error(
                "프롬프트글자", post.index,
                f"이미지 프롬프트에 글자 금지 지시 '{IMAGE_PROMPT_NO_TEXT}'가 없습니다. "
                f"이미지 모델이 미얀마 문자·데바나가리를 깨뜨려 그리므로 글자 없는 그림만 받습니다.",
            ))
        if need_no_real not in prompt:
            findings.append(_error(
                "프롬프트삽화", post.index,
                f"이미지 프롬프트에 삽화 지시 '{IMAGE_PROMPT_NO_REAL_SUBJECTS}'가 없습니다. "
                f"실존 인물·실제 캠퍼스·회사 시설처럼 보이는 장면이 나오면 실제 기록 사진으로 읽힐 수 있습니다.",
            ))
    return findings
