"""페이스북 예약 게시 도구 공통 설정.

값을 바꿔야 할 일이 생기면 이 파일 한 곳만 고친다. 토큰은 여기에 적지 않고
`.env`의 `FB_PAGE_TOKEN`(또는 같은 이름의 환경변수)에서만 읽는다.
"""

from __future__ import annotations

import os
import re
from datetime import time, timedelta
from pathlib import Path

# scripts/facebook/config.py -> 저장소 루트 (scripts/*.py 의 parents[1] 관례를 한 단계 깊이에 맞춘 것)
ROOT = Path(__file__).resolve().parents[2]

PAGE_ID = "61595913932801"
GRAPH_VERSION = "v26.0"

# 언어 순서는 베트남어 -> 미얀마어 -> 네팔어로 고정한다.
LANGUAGES: tuple[str, str, str] = ("vi", "my", "ne")

# 예약 가능 창: 지금부터 10분 이후 ~ 75일 이내 (Graph API 제한).
SCHEDULE_MIN_LEAD = timedelta(minutes=10)
SCHEDULE_MAX_LEAD = timedelta(days=75)

# 게시 시각 기본값은 일본 시간(JST) 저녁이다. 최우선 독자가 일본 체류자이기 때문이다.
DEFAULT_POST_TIME_JST = time(19, 0)
# 언어별로 게시 시각을 어긋나게 하고 싶을 때 분 단위로 더한다. 기본은 전부 같은 시각.
LANGUAGE_OFFSET_MINUTES: dict[str, int] = {lang: 0 for lang in LANGUAGES}

# 업로드 전에 거르는 이미지 최대 용량.
MAX_IMAGE_BYTES = 8 * 1024 * 1024

TOKEN_ENV_NAME = "FB_PAGE_TOKEN"
ENV_PATH = ROOT / ".env"


def facebook_dir() -> Path:
    """페이스북 산출물 루트(`output/facebook`)."""
    return ROOT / "output" / "facebook"


FACTS_PATH = facebook_dir() / "facts.json"
GLOSSARY_PATH = facebook_dir() / "glossary.json"
UNIVERSITIES_PATH = facebook_dir() / "universities.json"

_MONTH_PATTERN = re.compile(r"[0-9]{4}-(0[1-9]|1[0-2])")


def month_dir(month: str) -> Path:
    """월별 산출물 폴더(`output/facebook/YYYY-MM`)."""
    if not _MONTH_PATTERN.fullmatch(month):
        raise ValueError(f"월 형식이 올바르지 않습니다: {month!r} (YYYY-MM 형식으로 입력하세요. 예: 2026-11)")
    return facebook_dir() / month


_INLINE_COMMENT = re.compile(r"\s+#.*$")


def _parse_env_value(raw: str) -> str:
    raw = raw.strip()
    if len(raw) >= 2 and raw[0] == raw[-1] and raw[0] in "\"'":
        return raw[1:-1]
    return _INLINE_COMMENT.sub("", raw).strip()


def _read_env_file(path: Path, name: str) -> str:
    """`.env`에서 `name`의 값을 읽는다. 파일이나 키가 없으면 빈 문자열."""
    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return ""
    value = ""
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export "):]
        key, sep, raw = line.partition("=")
        if sep and key.strip() == name:
            value = _parse_env_value(raw)  # 같은 키가 여러 번이면 마지막 줄이 이긴다
    return value


def load_token() -> str:
    """페이지 액세스 토큰을 돌려준다.

    이미 설정된 환경변수 `FB_PAGE_TOKEN`을 먼저 쓰고, 없으면 저장소 루트 `.env`를 읽는다.
    토큰 값은 오류 메시지·로그에 절대 넣지 않는다.
    """
    token = os.environ.get(TOKEN_ENV_NAME, "").strip()
    if not token:
        token = _read_env_file(ENV_PATH, TOKEN_ENV_NAME)
    if not token:
        raise RuntimeError(
            f"{TOKEN_ENV_NAME}을(를) 찾을 수 없습니다. "
            f"{ENV_PATH} 파일에 `{TOKEN_ENV_NAME}=<페이지 토큰>` 한 줄을 추가하거나 "
            f"같은 이름의 환경변수를 설정하세요."
        )
    return token
