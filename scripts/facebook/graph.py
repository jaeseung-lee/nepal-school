"""Graph API 클라이언트: 토큰 점검과 사진 예약 게시.

이 프로젝트에서 **네트워크를 쓰는 유일한 모듈**이다. 아래가 이 모듈의 결정이다.

- **`requests`는 모듈 수준에서 가져오지 않는다.** 검증 경로와 CLI의 비네트워크 서브커맨드가 `requests` 없이도 돌아야 한다.
  세션은 인자(`session`)로 받고, 진짜 `requests.Session`은 CLI가 만들어 넣는다. 테스트는 가짜 세션을 넣는다.
- **토큰은 함수 인자로만 받고 `Authorization: Bearer` 헤더에 싣는다.** URL·쿼리·본문에는 넣지 않는다 —
  `requests`의 오류 메시지와 로그에는 URL이 실리기 때문이다. **예외가 하나 있다:** `check_token`의 `debug_token` 호출은
  Meta의 정해진 형식상 토큰을 쿼리(`input_token`, `access_token`)로 보내야 한다. 그 호출이 연결 오류를 내면 `requests`가
  쿼리 달린 URL을 예외 문자열에 싣는다. 그래서 `_scrub`가 토큰의 원문과 퍼센트 인코딩된 모양을 모두 가리고, 그 호출의
  실패는 어차피 `check_token` 안에서 삼킨다. 이 모듈이 만드는 모든 `GraphError`는 `_error`를 거쳐
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
- **`check_token`이 증명하는 것과 못 하는 것.** 증명하는 것은 하나다: 이 토큰으로 `GET /{page_id}?fields=id,name`이
  되고, 돌아온 `id`가 `page_id`와 같다 — 토큰이 유효하고 이 페이지를 읽을 수 있다. 그 이상은 증명하지 않는다.
  (`GET /me`로 토큰의 주인을 물어 `page_id`와 견주면 다른 페이지의 토큰을 더 잘 잡지만, 운영 문서가 정한 토큰인 **시스템
  사용자 토큰**에서는 `/me`가 시스템 사용자를 돌려주므로 멀쩡한 토큰을 거부하게 된다. 그래서 쓰지 않았다. 다른 페이지의
  토큰을 붙여 넣은 실수를 이 비교가 얼마나 잡는지는 Graph가 남의 페이지 공개 필드를 어떻게 다루는지에 달려 있고 확인하지
  못했다.) 권한(scope)은 `GET /debug_token`으로 **최선 노력**으로만 본다 — Meta는 앱 토큰이나 앱 개발자 토큰을 요구하므로 안
  될 수 있다. 그 호출이 실패하면 `ok`를 바꾸지 않고, `missing_permissions`를 짐작으로 채우지 않고, `message`가 "확인하지
  못했다"고 말한다. 읽을 수 있다는 것이 쓸 수 있다는 뜻은 아니므로, 진짜 증거는 테스트 글 1건을 예약해 보고 확인한 뒤 지우는
  것이라고 안내한다. `ok=False`가 되는 것은 거절됐거나, 돌아온 `id`가 다르거나, debug_token이 **분명히** 권한이 빠졌다고
  답한 경우뿐이다.
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
    """`check_token`의 결과. `message`는 운영자가 터미널에서 읽는 한국어 안내문이다."""

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


def _missing_message(label: str, missing: tuple[str, ...]) -> str:
    return (
        f"토큰은 유효하지만 페이지 '{label}'에 글을 예약하는 데 필요한 권한이 빠져 있습니다. 빠진 권한: {_permission_list(missing)}. "
        f"토큰을 새로 발급받을 때 이 권한을 모두 허용한 뒤, 새 토큰을 {config.ENV_PATH}의 {config.TOKEN_ENV_NAME}에 넣으세요."
    )


def _verified_message(label: str, page_id: str) -> str:
    return (
        f"토큰이 이 페이지('{label}', {page_id})의 것이고, 글을 예약하는 데 필요한 권한 {len(REQUIRED_PERMISSIONS)}개를 "
        f"모두 가지고 있다고 Facebook이 확인했습니다. 다만 권한 목록이 맞아도 그 토큰의 주인이 이 페이지에 글을 올릴 수 있는지는 "
        f"따로입니다. {_PROOF}"
    )


def _unverified_message(label: str, page_id: str, why: str) -> str:
    return (
        f"이 토큰으로 페이지 '{label}'({page_id})에 접근할 수 있습니다. 다만 글을 올리는 데 필요한 권한을 이 토큰이 "
        f"가졌는지는 확인하지 못했습니다. 확인하려던 권한: {_permission_list(REQUIRED_PERMISSIONS)}. 확인하지 못한 이유: {why}. "
        f"페이지를 읽을 수 있다는 것만으로는 글을 올릴 수 있다는 뜻이 아닙니다. {_PROOF}"
    )


def _read_scopes(session: _Session, token: str) -> tuple[set[str] | None, str]:
    """`GET /debug_token`으로 토큰이 가진 권한을 최선 노력으로 읽는다. `(권한 집합, "")` 또는 `(None, 못 읽은 이유)`.

    Meta는 이 호출에 앱 토큰이나 앱 개발자 토큰을 요구하므로 페이지 토큰으로는 거절될 수 있다. 어떤 실패도 예외로
    올리지 않는다. 비어 있거나 모양이 이상한 답은 "권한이 없다"가 아니라 "모른다"로 센다 — 권한 목록이 빈 것이 정말로
    아무 권한이 없다는 뜻인지, 이 토큰 종류가 목록을 안 채워 주는 것인지 구별할 수 없기 때문이다.
    """
    try:
        reply = _send(
            session.get, _url("debug_token"), token, "권한 조회(debug_token)",
            params={"input_token": token, "access_token": token},
        )
    except _Rejected as rejected:
        return None, f"권한 조회 기능(debug_token)을 쓰지 못했습니다. Facebook 응답: {rejected.reason}"
    except GraphError:
        return None, "권한 조회 기능(debug_token)에 닿지 못했거나 응답을 알아볼 수 없었습니다"
    data = reply.get("data")
    if not isinstance(data, dict) or data.get("is_valid") is False:
        return None, "권한 조회 기능(debug_token)의 응답을 믿을 수 없었습니다"
    scopes = data.get("scopes")
    named = {scope for scope in scopes if isinstance(scope, str)} if isinstance(scopes, list) else set()
    if not named:
        return None, "권한 조회 기능(debug_token)의 응답에 권한 목록이 없거나 비어 있었습니다"
    return named, ""


def check_token(token: str, page_id: str, *, session: _Session) -> TokenStatus:
    """토큰으로 이 페이지를 읽을 수 있는지 확인하고, 가능하면 필요한 권한도 확인한다 (`session.get` 최대 두 번).

    1. `GET /{page_id}?fields=id,name`: 토큰이 유효하고 돌아온 `id`가 `page_id`와 같으면 통과하고 `page_name`을 얻는다.
       `id`가 다르면 `ok=False`와 실제로 돌아온 페이지를 알려 주는 메시지.
    2. `GET /debug_token`(최선 노력): 답하면 `missing_permissions`를 채우고 빠진 것이 있으면 `ok=False`. 답하지 않으면
       `ok`는 1번의 결과 그대로이고 `missing_permissions`는 비며 `message`가 "확인하지 못했다"고 말한다.

    Facebook이 1번을 거절하면(토큰 만료 등) 예외가 아니라 `ok=False`인 상태를 돌려준다. Facebook에 닿지 못했거나 응답을
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

    label = page_name or page_id
    scopes, why = _read_scopes(session, token)
    if scopes is None:
        return TokenStatus(ok=True, page_name=page_name, missing_permissions=(), message=_unverified_message(label, page_id, why))
    missing = tuple(permission for permission in REQUIRED_PERMISSIONS if permission not in scopes)
    if missing:
        return TokenStatus(ok=False, page_name=page_name, missing_permissions=missing, message=_missing_message(label, missing))
    return TokenStatus(ok=True, page_name=page_name, missing_permissions=(), message=_verified_message(label, page_id))


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
