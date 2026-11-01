"""검증기들이 함께 쓰는 `Finding`과 그 도우미.

`validate_structure`·`validate_facts`·`validate_copy`는 모두 멈추지 않고 발견한 문제를 전부 모아 `Finding`
목록으로 돌려준다. 호출하는 쪽(CLI)이 오류가 하나라도 있으면 다음 단계로 넘기지 않는다. `severity`는
막아야 하는 문제면 `"error"`, 사람이 봐야 하는 문제면 `"warning"`이다.

결과 순서는 항상 같다. 게시물에 매이지 않는 항목(`post_index`가 `None`)이 먼저 오고, 그다음
게시물 번호 오름차순이며, 같은 게시물 안에서는 검사한 순서다. 그 정렬이 `_ordered`다.

`_error`·`_warning`·`_ordered`·`_normalize`는 밑줄로 시작하지만 이 패키지의 검증기 모듈들이 가져다 쓴다.
여러 모듈이 쓰는 것만 여기 두고, 한 검증기만 쓰는 도우미는 그 검증기 모듈에 둔다.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True)
class Finding:
    severity: Literal["error", "warning"]
    code: str
    post_index: int | None  # 플랜 전체나 게시물이 하나도 없는 소재에 관한 항목이면 None
    message: str  # 한국어


def _error(code: str, post_index: int | None, message: str) -> Finding:
    return Finding("error", code, post_index, message)


def _warning(code: str, post_index: int | None, message: str) -> Finding:
    return Finding("warning", code, post_index, message)


def _ordered(findings: list[Finding]) -> list[Finding]:
    """게시물에 매이지 않는 항목을 앞에, 그다음 게시물 번호순으로. 정렬이 안정적이라 같은 게시물의
    항목은 검사한 순서를 지킨다."""
    return sorted(findings, key=lambda f: -1 if f.post_index is None else f.post_index)


def _normalize(text: str) -> str:
    """대소문자와 공백 수(줄바꿈 포함)를 무시하고 비교하려고 소문자·단일 공백으로 만든다."""
    return " ".join(text.split()).lower()
