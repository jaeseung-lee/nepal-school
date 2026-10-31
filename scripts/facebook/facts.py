"""사람이 확정한 사실 데이터(`facts.json`) 로더.

본문에 쓰는 수치·요건은 여기에 있는 사실만 허용한다. 모든 사실은 값·출처 URL·
확인자·확인일·유효기한을 갖고, 하나라도 빠지거나 형식이 틀리면 `FactsError`로 멈춘다.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date
from pathlib import Path


class FactsError(Exception):
    """사실 파일의 내용이 규칙에 맞지 않을 때."""


@dataclass(frozen=True)
class Fact:
    key: str
    value: str
    source_url: str
    verified_by: str
    verified_on: date
    expires_on: date

    def is_valid_on(self, day: date) -> bool:
        """`day`(게시일)에 이 사실을 써도 되는지. 유효기한 당일까지 유효하다."""
        return day <= self.expires_on


# (JSON 필드명, 오류 메시지에 쓰는 한국어 이름)
_FIELDS = (
    ("value", "값"),
    ("source_url", "출처"),
    ("verified_by", "확인자"),
    ("verified_on", "확인일"),
    ("expires_on", "유효기한"),
)

def _parse_date(key: str, label: str, text: str) -> date:
    try:
        return date.fromisoformat(text)
    except ValueError:
        raise FactsError(f"사실 '{key}'의 {label}이(가) 올바른 날짜(YYYY-MM-DD)가 아닙니다: {text!r}") from None


def _parse_fact(key: str, entry: object) -> Fact:
    if not isinstance(entry, dict):
        raise FactsError(f"사실 '{key}'은(는) 값·출처·확인자·확인일·유효기한을 가진 객체여야 합니다.")

    missing = [
        f"{label}({name})"
        for name, label in _FIELDS
        if not (isinstance(entry.get(name), str) and entry[name].strip())
    ]
    if missing:
        raise FactsError(f"사실 '{key}'에 필수 항목이 없거나 비어 있습니다: {', '.join(missing)}")

    source_url = entry["source_url"]
    if not source_url.startswith(("http://", "https://")):
        raise FactsError(f"사실 '{key}'의 출처가 http:// 또는 https:// URL이 아닙니다: {source_url!r}")

    verified_on = _parse_date(key, "확인일", entry["verified_on"])
    expires_on = _parse_date(key, "유효기한", entry["expires_on"])
    if expires_on < verified_on:
        raise FactsError(f"사실 '{key}'의 유효기한({expires_on})이 확인일({verified_on})보다 빠릅니다.")

    return Fact(
        key=key,
        value=entry["value"],
        source_url=source_url,
        verified_by=entry["verified_by"],
        verified_on=verified_on,
        expires_on=expires_on,
    )


def load_facts(path: Path) -> dict[str, Fact]:
    """`facts.json`을 읽어 `{키: Fact}`로 돌려준다. 규칙에 어긋나면 `FactsError`."""
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        raise FactsError(f"사실 파일이 올바른 JSON이 아닙니다: {path} ({e})") from e
    if not isinstance(raw, dict):
        raise FactsError(f"사실 파일의 최상위는 {{사실키: {{...}}}} 형태의 객체여야 합니다: {path}")
    return {key: _parse_fact(key, entry) for key, entry in raw.items()}
