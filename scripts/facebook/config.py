"""페이스북 예약 게시 도구 공통 설정.

값을 바꿔야 할 일이 생기면 이 파일 한 곳만 고친다. 토큰은 여기에 적지 않고 `.env`의
`FB_PAGE_TOKEN` 또는 같은 이름의 환경변수에서 읽는다. 둘 다 값이 있는데 서로 다르면 멈춘다.
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
# 올릴 수 있는 이미지 확장자(소문자). JPEG와 PNG만 받는다.
ALLOWED_IMAGE_SUFFIXES: tuple[str, ...] = (".jpg", ".jpeg", ".png")

# 이미지 프롬프트에 반드시 들어가야 하는 지시 문구. 사업주가 ChatGPT 이미지 도구에 그대로 붙여넣는
# 프롬프트이므로 영어다. 검증은 대소문자와 공백 수를 무시한 부분 문자열 일치로 찾는다.
# (짧은 "no text"로 두면 "no texture"에도 걸리므로 문구 전체를 요구한다.)
# 글자: 이미지 모델이 미얀마 문자·데바나가리를 깨뜨려 그리므로 글자가 없는 그림만 받는다.
IMAGE_PROMPT_NO_TEXT = "no text, no letters, no logos"
# 삽화: AI 그림이 실존 인물·특정 캠퍼스·회사 시설의 실제 기록 사진으로 읽히면 안 된다.
IMAGE_PROMPT_NO_REAL_SUBJECTS = "no real people, no real campuses, no company facilities"

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

    출처는 환경변수 `FB_PAGE_TOKEN`과 저장소 루트 `.env`의 `FB_PAGE_TOKEN` 두 곳이다.
    한쪽에만 값이 있으면 그 값을, 둘 다 있고 같으면 그 값을 쓴다. 둘 다 있는데 다르면
    어느 쪽이 최신인지 알 수 없으므로(회전된 토큰을 낡은 셸 변수가 조용히 가리는 사고) 고르지
    않고 `RuntimeError`로 멈춘다. 토큰 값은 오류 메시지·로그에 절대 넣지 않는다.
    """
    env_token = os.environ.get(TOKEN_ENV_NAME, "").strip()
    file_token = _read_env_file(ENV_PATH, TOKEN_ENV_NAME)
    if env_token and file_token and env_token != file_token:
        raise RuntimeError(
            f"환경변수 {TOKEN_ENV_NAME}과(와) {ENV_PATH}의 {TOKEN_ENV_NAME} 값이 서로 다릅니다. "
            f"어느 쪽이 최신인지 알 수 없어 중단합니다. 낡은 쪽을 정리하세요: "
            f"셸에서 `unset {TOKEN_ENV_NAME}`을 실행하거나 {ENV_PATH}의 값을 고친 뒤 다시 실행하세요."
        )
    token = env_token or file_token
    if not token:
        raise RuntimeError(
            f"{TOKEN_ENV_NAME}을(를) 찾을 수 없습니다. "
            f"{ENV_PATH} 파일에 `{TOKEN_ENV_NAME}=<페이지 토큰>` 한 줄을 추가하거나 "
            f"같은 이름의 환경변수를 설정하세요."
        )
    return token
