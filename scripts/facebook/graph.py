"""Graph API 클라이언트: 토큰 점검과 사진 예약 게시.

이 프로젝트에서 **네트워크를 쓰는 유일한 모듈**이다. 아래가 이 모듈의 결정이다.

- **`requests`는 모듈 수준에서 가져오지 않는다.** 검증 경로와 CLI의 비네트워크 서브커맨드가 `requests` 없이도 돌아야 한다.
  세션은 인자(`session`)로 받고, 진짜 `requests.Session`은 CLI가 만들어 넣는다. 테스트는 가짜 세션을 넣는다.
- **토큰은 함수 인자로만 받고 `Authorization: Bearer` 헤더에만 싣는다.** URL·쿼리·본문에는 절대 넣지 않는다 —
  `requests`의 오류 메시지와 로그에는 URL이 실리기 때문이다. 이 규칙에는 예외가 없다. 이 모듈이 만드는 모든 `GraphError`는 `_error`를 거쳐
  메시지에서 토큰 문자열을 `***`로 가리고, 원래 예외(연결 오류 등)를 `__cause__`/`__context__`로 달지 않는다
  (그 예외가 요청 객체나 헤더를 들고 있을 수 있다). 메시지는 버그 리포트에 그대로 붙여도 안전해야 한다.
- **verb는 정해져 있다.** `check_token`은 `session.get`, `schedule_photo_post`는 `session.post`. 바꿀 수 있게 하지 않는다.
- **모든 호출은 `config.GRAPH_TIMEOUT`을 명시적으로 넘긴다.** 사진 한 장에서 영원히 멈추는 것보다 크게 실패하는 편이 낫다.
- **오류 응답은 두 모양이다.** HTTP가 2xx가 아니면서 `error` 객체가 있는 경우와, HTTP 200인데 본문에 `error` 객체가 있는
  경우. 둘 다 같은 대접을 받는다. JSON이 아닌 본문, JSON 객체가 아닌 본문도 `JSONDecodeError`가 새어 나가지 않고
  `GraphError`가 된다.
- **"Facebook이 거절했다"와 "답을 못 받았다"를 구별한다.** 거절(`error` 객체)은 Facebook이 일을 하지 않았다는 뜻이다.
  연결 실패·시간 초과·알아볼 수 없는 응답은 **요청이 나갔는지 모른다** — `schedule_photo_post`는 이때 "예약이 만들어졌을 수
  있다"고 메시지로 알리고, 코드가 가를 수 있게 `GraphError.maybe_created`를 `True`로 한다. 그냥 다시 돌리면 같은
  게시물이 두 번 예약될 수 있기 때문이다. 메시지의 문장은 운영자용, 불리언은 호출하는 코드용이다.
- **`check_token`이 증명하는 것과 못 하는 것.** 증명하는 것은 **하나**다: 이 토큰으로 `GET /{page_id}?fields=id,name`이
  되고 돌아온 `id`가 `page_id`와 같다 — 토큰이 유효하고 이 페이지를 **읽을 수 있다.** `ok`는 정확히 그 뜻이다. 증명하지
  못하는 것 둘을 `message`가 **늘** 말한다: (1) 토큰이 글을 올리는 권한을 가졌는지 — 읽을 수 있다고 쓸 수 있는 것이 아니다.
  (2) 토큰의 주인이 이 페이지에서 역할을 가졌는지 — 다른 페이지의 토큰이 우리 페이지를 읽을 수 있어도 통과한다. 진짜
  증거는 운영 문서가 정한 것, 즉 테스트 글 1건을 예약해 보고 눈으로 확인한 뒤 지우는 것이다.
  권한 목록은 조회하지 않는다(`TokenStatus.missing_permissions`가 늘 비어 있는 이유는 그 필드의 문서에). `GET /me`로 토큰의
  주인을 물어 `page_id`와 견주는 방법도 쓰지 않는다: 운영 문서는 `FB_PAGE_TOKEN`에 **시스템 사용자 토큰**(안 되면 장기
  사용자 토큰)을 넣으라고 하므로 토큰 종류가 하나로 정해져 있지 않고, 그 둘에서 `/me`는 페이지가 아니라 시스템 사용자나
  사용자를 돌려줘 멀쩡한 토큰을 거부한다. `/me`에는 이 모듈에서 정해진 뜻이 없다.
- **`check_token`은 API가 거절한 경우 `ok=False`를 돌려주고, 답을 못 받은 경우는 `GraphError`로 올린다.** 후자를
  `ok=False`로 돌려주면 멀쩡한 토큰을 새로 발급하게 된다. 호출하는 쪽은 `GraphError`도 받아야 한다.
- 시각은 모두 **타임존이 있는 `datetime`**이어야 한다. 없으면 `timestamp()`가 이 컴퓨터의 시간대로 조용히 해석해 몇 시간
  어긋난 예약이 되므로 한국어 `GraphError`로 거절한다. 이 모듈은 타임존을 가정하지도 덧붙이지도 않는다.
"""

from __future__ import annotations

import mimetypes
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Protocol
from urllib.parse import quote, quote_plus

from . import config

GRAPH_HOST = "https://graph.facebook.com"

# 글을 예약하는 데 필요한 권한. 순서는 안내문에 나오는 순서이기도 하다.
REQUIRED_PERMISSIONS: tuple[str, ...] = ("pages_manage_posts", "pages_read_engagement", "pages_show_list")
# 권한 이름만 던지면 읽는 사람이 무엇인지 모르므로 한국어로 풀어 둔다. 키는 REQUIRED_PERMISSIONS와 같아야 한다.
_PERMISSION_HELP = {
    "pages_manage_posts": "페이지에 글과 사진 올리기",
    "pages_read_engagement": "페이지 게시물 읽기",
    "pages_show_list": "관리하는 페이지 목록 보기",
}

# Graph API가 "토큰이 유효하지 않다(만료·폐기·형식 오류)"를 알릴 때 쓰는 오류 코드.
_INVALID_TOKEN_CODE = 190
# 사람이 읽는 메시지에 싣는 응답 본문의 최대 길이.
_EXCERPT_LENGTH = 200
# 토큰으로 글을 올릴 수 있는지는 읽기로 알 수 없다. 운영 문서가 정한 진짜 증거 한 가지.
_PROOF = (
    "실제로 글을 올릴 수 있는지는 테스트 글 하나를 예약해 보고, 페이지의 예약된 게시물에 보이는지 눈으로 확인한 뒤 "
    "지워 보는 것으로만 알 수 있습니다."
)
# 권한 목록을 조회하지 않는 이유(운영자가 읽는다). 자세한 이유는 TokenStatus의 문서에.
_WHY_NO_SCOPES = "이 도구는 토큰의 권한 목록을 조회하지 않습니다. 조회하려면 앱 토큰이 필요하고, 토큰을 주소에 실어 보내야 하기 때문입니다"
# 요청이 나간 뒤 결과를 알 수 없을 때 덧붙이는 안내.
_MAYBE_CREATED = (
    " 요청은 이미 나갔으므로 Facebook에 예약이 만들어졌을 수 있습니다. "
    "같은 게시물이 두 번 예약되지 않도록, 다시 실행하기 전에 페이지의 예약된 게시물을 확인하세요."
)


class _Response(Protocol):
    """`requests.Response` 가운데 이 모듈이 쓰는 부분."""

    status_code: int
    text: str

    def json(self) -> Any: ...


class _Session(Protocol):
    """`requests.Session` 가운데 이 모듈이 쓰는 부분."""

    def get(self, url: str, **kwargs: Any) -> _Response: ...

    def post(self, url: str, **kwargs: Any) -> _Response: ...


class GraphError(Exception):
    """Graph API 호출·응답에 문제가 있다. 메시지는 한국어이고 토큰을 담지 않는다.

    `maybe_created`: 요청을 보낸 뒤 결과를 알 수 없어(시간 초과·JSON이 아닌 응답·id 없는 성공 응답 등) Facebook에
    **예약이 만들어졌을 수 있으면** `True`. 요청을 보내지 않았거나 Facebook이 `error`로 분명히 거절했으면 `False`다.
    호출하는 쪽이 같은 게시물을 다시 시도해도 되는지 가를 때 쓴다(메시지 문장을 비교하지 말 것).
    """

    def __init__(self, message: str, *, maybe_created: bool = False):
        super().__init__(message)
        self.maybe_created = maybe_created


class _Rejected(GraphError):
    """Facebook이 요청을 받아들이지 않았다(오류 응답). `check_token`은 이것을 상태로 바꿔 돌려준다."""

    def __init__(self, message: str, *, reason: str, invalid_token: bool):
        super().__init__(message)
        self.reason = reason  # Facebook이 한 말(토큰은 이미 가려진 것)
        self.invalid_token = invalid_token


@dataclass(frozen=True)
class TokenStatus:
    """`check_token`의 결과. `message`는 운영자가 터미널에서 읽는 한국어 안내문이다.

    `ok`는 **한 가지**를 뜻한다: 토큰이 유효하고 `GET /{page_id}?fields=id,name`이 이 페이지의 `id`를 돌려줬다.
    글을 올릴 수 있다는 뜻이 아니다. 그래서 `ok=True`여도 `message`는 늘 그것을 증명하지 못했다고 말한다.

    `missing_permissions`는 **지금은 늘 빈 튜플이다.** 토큰의 권한 목록은 Meta의 `GET /debug_token`으로만 읽을 수 있는데,
    그 호출은 앱 토큰(또는 앱 개발자 토큰)을 요구하고 — 시스템 사용자 토큰으로는 안 될 수도 있다 — 토큰을 URL 쿼리
    (`input_token`)로 보내야 한다. 토큰은 `Authorization` 헤더에만 싣는다는 규칙에 예외를 두지 않기로 했고, 얻는 것은
    있을지 없을지 모르는 권한 목록뿐이라 그 호출을 넣지 않았다. 앱 토큰 경로가 생기면 이 필드가 채워질 자리다.
    **이 문단과 계획 문서를 다시 읽기 전에는 그 호출을 되살리지 말 것.** (Task 9·10이 네 필드를 전제로 쓰여 있어 필드는 남겼다.)
    """

    ok: bool
    page_name: str | None
    missing_permissions: tuple[str, ...]
    message: str


# ── 공통 ─────────────────────────────────────────────────────────────────────


def _scrub(text: str, token: str) -> str:
    """`text`에서 토큰 문자열을 가린다. 원문과, URL에 실렸을 때의 퍼센트 인코딩 모양(`|` -> `%7C`, 공백 -> `+`)을 모두.

    빈 토큰은 가리지 않는다(`"abc".replace("", "*")`는 글자 사이마다 끼워 넣는다).
    """
    if not token:
        return text
    # 긴 모양부터 바꿔야 한 모양이 다른 모양의 일부를 먼저 지워 버리지 않는다.
    for form in sorted({token, quote(token, safe=""), quote_plus(token)}, key=len, reverse=True):
        text = text.replace(form, "***")
    return text


def _error(token: str, message: str, *, maybe_created: bool = False) -> GraphError:
    """이 모듈의 모든 `GraphError`는 여기를 지나 토큰이 가려진다."""
    return GraphError(_scrub(message, token), maybe_created=maybe_created)


def _url(path: str) -> str:
    return f"{GRAPH_HOST}/{config.GRAPH_VERSION}/{path}"


def _excerpt(text: object) -> str:
    """메시지에 싣기 좋게 공백을 하나로 모으고 앞부분만 남긴다."""
    collapsed = " ".join(str(text).split())
    return collapsed if len(collapsed) <= _EXCERPT_LENGTH else collapsed[:_EXCERPT_LENGTH] + "…"


def _api_error_text(error: object) -> str:
    """응답의 `error` 값을 한 줄로: `메시지 [code 190, subcode 463, fbtrace_id …]`. API가 쓴 말을 그대로 싣는다."""
    if not isinstance(error, dict):
        return _excerpt(error)
    labels = (("code", "code"), ("error_subcode", "subcode"), ("fbtrace_id", "fbtrace_id"))
    details = [f"{label} {error[key]}" for key, label in labels if error.get(key) is not None]
    message = error.get("message") or "메시지 없음"
    return f"{message} [{', '.join(details)}]" if details else str(message)


def _send(call: Any, url: str, token: str, what: str, *, may_create: bool = False, **kwargs: Any) -> dict:
    """요청 하나를 보내고 성공 본문(JSON 객체)을 돌려준다.

    Facebook이 거절하면 `_Rejected`, 보내지 못했거나 알아볼 수 없는 응답이면 `GraphError`다. `may_create`인 호출(예약)에서
    후자는 `maybe_created=True`이고 메시지 끝에 "만들어졌을 수 있다"는 안내가 붙는다.
    예외는 모두 `except` 블록 **밖에서** 올린다 — 안에서 올리면 원래 예외가 `__context__`로 달린다.
    """
    problem = None
    try:
        response = call(url, headers={"Authorization": f"Bearer {token}"}, timeout=config.GRAPH_TIMEOUT, **kwargs)
    except OSError as exc:  # requests.RequestException(연결·시간 초과 등)은 OSError(IOError)의 하위 클래스다
        problem = f"{what} 요청을 Facebook에 보내지 못했습니다 ({type(exc).__name__}: {exc}). 인터넷 연결을 확인하세요."
    else:
        status = response.status_code
        try:
            body = response.json()
        except ValueError:
            problem = f"{what}에 대한 Facebook의 응답이 JSON이 아닙니다 (HTTP {status}). 응답 앞부분: {_excerpt(response.text)}"
        else:
            if not isinstance(body, dict):
                problem = f"{what}에 대한 Facebook의 응답이 JSON 객체가 아닙니다 (HTTP {status}). 응답 앞부분: {_excerpt(response.text)}"
            elif "error" not in body and not 200 <= status < 300:
                # 거절한다는 말(error 객체)도 없이 실패 상태만 왔다: Facebook이 무엇을 했는지 알 수 없다.
                problem = f"{what} 요청이 실패했습니다 (HTTP {status}). 응답에 오류 내용이 없습니다. 응답 앞부분: {_excerpt(response.text)}"
    if problem is not None:
        raise _error(token, problem + (_MAYBE_CREATED if may_create else ""), maybe_created=may_create)

    if "error" in body:
        error = body["error"]
        reason = _scrub(_api_error_text(error), token)
        raise _Rejected(
            f"{what} 요청을 Facebook이 거절했습니다 (HTTP {status}): {reason}",
            reason=reason,
            invalid_token=isinstance(error, dict) and error.get("code") == _INVALID_TOKEN_CODE,
        )
    return body


def _require_aware(name: str, value: datetime) -> None:
    if value.utcoffset() is None:
        raise GraphError(
            f"{name}에 타임존이 없습니다: {value.isoformat()}. 타임존이 없는 시각은 어느 나라 시각인지 알 수 없어 "
            f"예약 시각을 정할 수 없습니다. +09:00 같은 오프셋이 붙은 시각을 쓰세요."
        )


def _describe(delta: timedelta) -> str:
    """`timedelta`를 `1일 2시간 3분 4초`처럼 적는다(0인 단위는 생략, 부호는 버린다)."""
    days, rest = divmod(int(abs(delta).total_seconds()), 86400)
    hours, rest = divmod(rest, 3600)
    minutes, seconds = divmod(rest, 60)
    parts = [f"{number}{unit}" for number, unit in ((days, "일"), (hours, "시간"), (minutes, "분"), (seconds, "초")) if number]
    return " ".join(parts) or "0초"


# ── 토큰 점검 ────────────────────────────────────────────────────────────────


def _permission_list(names) -> str:
    return ", ".join(f"{name}({_PERMISSION_HELP[name]})" for name in names)


def _refused_status(rejected: _Rejected) -> TokenStatus:
    if rejected.invalid_token:
        message = (
            f"토큰이 유효하지 않거나 만료되었습니다. Facebook에서 페이지 토큰을 새로 발급받아 "
            f"{config.ENV_PATH}의 {config.TOKEN_ENV_NAME} 값을 바꾼 뒤 다시 확인하세요. (Facebook 응답: {rejected.reason})"
        )
    else:
        # 토큰 탓인지 Facebook 쪽 사정인지(요청 한도 등) 여기서는 알 수 없다. 단정하지 않고 Facebook이 한 말을 보여 준다.
        message = f"토큰을 확인하지 못했습니다. {rejected}"
    return TokenStatus(ok=False, page_name=None, missing_permissions=(), message=message)


def _wrong_page_message(page_id: str, returned_id: str, returned_name: str | None) -> str:
    found = f"id {returned_id}" + (f", 이름 '{returned_name}'" if returned_name else "")
    return (
        f"이 토큰으로 지정한 페이지({page_id})를 조회했더니 다른 페이지({found})가 돌아왔습니다. "
        f"다른 페이지의 토큰을 붙여 넣었거나 페이지 id가 잘못된 것은 아닌지 확인하세요. 올바른 페이지의 토큰을 새로 발급받아 "
        f"{config.ENV_PATH}의 {config.TOKEN_ENV_NAME} 값을 바꾼 뒤 다시 확인하세요."
    )


def _read_only_message(label: str, page_id: str) -> str:
    """`ok=True`일 때도 늘 이 글이다: 이 검사는 읽을 수 있음만 증명한다."""
    return (
        f"이 토큰으로 페이지 '{label}'({page_id})에 접근할 수 있습니다. 다만 글을 올리는 데 필요한 권한을 이 토큰이 "
        f"가졌는지는 확인하지 못했습니다. 확인하려던 권한: {_permission_list(REQUIRED_PERMISSIONS)}. 확인하지 못한 이유: "
        f"{_WHY_NO_SCOPES}. "
        f"또 이 검사는 토큰으로 이 페이지를 읽을 수 있다는 것만 알려 줍니다. 이 토큰의 주인이 이 페이지에서 역할을 가졌는지는 "
        f"알려 주지 못하므로, 다른 페이지의 토큰이라도 이 페이지를 읽을 수 있으면 통과할 수 있습니다. "
        f"페이지를 읽을 수 있다는 것만으로는 글을 올릴 수 있다는 뜻이 아닙니다. {_PROOF}"
    )


def check_token(token: str, page_id: str, *, session: _Session) -> TokenStatus:
    """토큰으로 이 페이지를 읽을 수 있는지 확인한다 (`session.get` 한 번: `GET /{page_id}?fields=id,name`).

    토큰이 유효하고 돌아온 `id`가 `page_id`와 같으면 `ok=True`이고 `page_name`을 얻는다. `id`가 다르면 `ok=False`와 실제로
    돌아온 페이지를 알려 주는 메시지. **`ok=True`는 읽을 수 있다는 뜻일 뿐이다** — `message`가 늘 권한과 역할을 증명하지
    못했다고 말하고 테스트 글 1건 예약을 안내한다. `missing_permissions`는 늘 비어 있다(`TokenStatus` 참고).

    Facebook이 거절하면(토큰 만료 등) 예외가 아니라 `ok=False`인 상태를 돌려준다. Facebook에 닿지 못했거나 응답을
    알아볼 수 없으면 `GraphError`다. 이때 "토큰이 나쁘다"고 단정할 근거가 없기 때문이다.
    """
    try:
        page = _send(session.get, _url(page_id), token, "페이지 정보 조회", params={"fields": "id,name"})
    except _Rejected as rejected:
        return _refused_status(rejected)
    returned_id = page.get("id")
    if not isinstance(returned_id, str) or not returned_id:
        raise _error(token, "페이지 정보 조회 응답에 id가 없거나 형식이 예상과 다릅니다. 토큰 종류나 Graph API 버전을 확인하세요.")
    name = page.get("name")
    page_name = _scrub(name, token) if isinstance(name, str) and name else None
    if returned_id != page_id:
        return TokenStatus(ok=False, page_name=page_name, missing_permissions=(), message=_wrong_page_message(page_id, returned_id, page_name))
    return TokenStatus(ok=True, page_name=page_name, missing_permissions=(), message=_read_only_message(page_name or page_id, page_id))


# ── 예약 ─────────────────────────────────────────────────────────────────────


def assert_schedulable(publish_at: datetime, now: datetime) -> None:
    """`publish_at`이 예약 창 안(`now`로부터 최소 10분 ~ 최대 75일, 양 끝 포함)이 아니면 `GraphError`.

    창의 길이는 `config.SCHEDULE_MIN_LEAD`·`SCHEDULE_MAX_LEAD`에서만 읽는다. 두 시각 모두 타임존이 있어야 한다.
    """
    _require_aware("publish_at", publish_at)
    _require_aware("now", now)
    lead = publish_at - now
    earliest = now + config.SCHEDULE_MIN_LEAD
    latest = now + config.SCHEDULE_MAX_LEAD
    if lead < timedelta(0):
        raise GraphError(
            f"예약 시각 {publish_at.isoformat()}은(는) 이미 지난 시각입니다 (지금 {now.isoformat()}보다 {_describe(lead)} 앞). "
            f"예약은 지금부터 {_describe(config.SCHEDULE_MIN_LEAD)} 뒤({earliest.isoformat()}) 이후로만 가능합니다. 예약 시각을 늦추세요."
        )
    if lead < config.SCHEDULE_MIN_LEAD:
        raise GraphError(
            f"예약 시각 {publish_at.isoformat()}이(가) 너무 가깝습니다. 예약은 지금({now.isoformat()})부터 "
            f"{_describe(config.SCHEDULE_MIN_LEAD)} 뒤({earliest.isoformat()}) 이후로만 가능한데 {_describe(lead)} 뒤입니다. "
            f"예약 시각을 늦추세요."
        )
    if lead > config.SCHEDULE_MAX_LEAD:
        raise GraphError(
            f"예약 시각 {publish_at.isoformat()}이(가) 너무 멉니다. 예약은 지금({now.isoformat()})부터 "
            f"{_describe(config.SCHEDULE_MAX_LEAD)} 뒤({latest.isoformat()}) 이전으로만 가능한데 {_describe(lead)} 뒤입니다. "
            f"예약 시각을 앞당기거나, 예약할 수 있는 날이 가까워진 뒤에 다시 실행하세요."
        )


def schedule_photo_post(
    token: str, page_id: str, image_path: Path, message: str, publish_at: datetime, *, session: _Session
) -> str:
    """사진 한 장과 본문을 `publish_at`에 게시되도록 예약하고, 생성된 사진 id를 돌려준다 (`session.post` 한 번).

    페이지의 `/photos`에 멀티파트로 보내며 `published=false`와 `scheduled_publish_time`(유닉스 초)을 함께 싣는다.
    예약 창은 **검사하지 않는다**(`now`를 받지 않는다) — 부르기 전에 `assert_schedulable`을 거쳐야 한다.
    """
    _require_aware("publish_at", publish_at)
    try:
        handle = image_path.open("rb")
    except OSError as exc:
        raise _error(
            token,
            f"이미지 파일을 열 수 없습니다: {image_path} ({type(exc).__name__}). 파일이 있는지, 읽을 권한이 있는지 확인하세요.",
        ) from exc
    content_type = mimetypes.guess_type(image_path.name)[0] or "application/octet-stream"
    with handle:
        body = _send(
            session.post, _url(f"{page_id}/photos"), token, "사진 예약 게시",
            may_create=True,
            # 멀티파트 필드는 문자열이다. False를 그대로 넘기면 requests가 "False"로 적는다.
            data={"message": message, "published": "false", "scheduled_publish_time": str(int(publish_at.timestamp()))},
            files={"source": (image_path.name, handle, content_type)},
        )
    post_id = body.get("id")
    if not isinstance(post_id, str) or not post_id:
        raise _error(
            token, "사진 예약 게시 요청에 성공(HTTP 2xx)으로 응답했지만 응답에 생성된 id가 없습니다." + _MAYBE_CREATED, maybe_created=True
        )
    return post_id
