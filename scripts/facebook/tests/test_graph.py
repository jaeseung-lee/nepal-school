"""Graph API 클라이언트(graph.py) 테스트.

**실제 네트워크 호출은 하지 않는다.** `requests.Session` 자리에는 가짜 세션이 들어가고, 모든 테스트에 걸린
`_네트워크_차단` 장치가 소켓 연결 시도 자체를 실패시킨다(가짜 세션을 거치지 않고 새 연결을 여는 코드가 생기면 바로 드러난다).

토큰 자리에는 `SENTINEL`만 쓴다. 진짜 토큰이 아니라, 어디로든 새면 찾아낼 수 있게 일부러 눈에 띄게 만든 값이다.
"""

from __future__ import annotations

import ast
import dataclasses
import socket
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone, tzinfo
from pathlib import Path
from urllib.parse import quote, quote_plus
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import pytest

from facebook import config, graph

SENTINEL = "EAAZ-SENTINEL-not-a-real-token-7c41e9d2b8"
PAGE = "100200300"  # config.PAGE_ID와 일부러 다르다: 코드가 인자를 쓰는지 상수를 쓰는지 가른다
BASE = f"https://graph.facebook.com/{config.GRAPH_VERSION}"
JST = timezone(timedelta(hours=9))
NOW = datetime(2026, 11, 1, 12, 0, tzinfo=JST)
PUBLISH_AT = datetime(2026, 11, 1, 19, 0, tzinfo=JST)
PUBLISH_UNIX = "1793527200"  # 2026-11-01T10:00:00Z. `date -u`와 파이썬 두 갈래로 따로 계산한 값
CAPTION = "본문 Xin chào"

ALL_PERMISSIONS = ("pages_manage_posts", "pages_read_engagement", "pages_show_list")


# ── 가짜 세션 ────────────────────────────────────────────────────────────────


class FakeResponse:
    """`requests.Response` 가운데 graph.py가 쓰는 부분(status_code, json(), text)만 흉내 낸다."""

    def __init__(self, status_code: int = 200, body=None, *, text: str | None = None, json_error: Exception | None = None):
        self.status_code = status_code
        self._body = body
        self._json_error = json_error
        self.text = text if text is not None else repr(body)

    def json(self):
        if self._json_error is not None:
            raise self._json_error
        return self._body


@dataclass
class Call:
    verb: str
    url: str
    kwargs: dict
    upload: dict | None = None


class FakeSession:
    """`routes`: {(동사, URL): FakeResponse | 던질 예외}. 없는 경로를 부르면 AssertionError로 크게 실패한다."""

    def __init__(self, routes: dict):
        self.routes = routes
        self.calls: list[Call] = []

    def get(self, url, **kwargs):
        return self._handle("GET", url, kwargs)

    def post(self, url, **kwargs):
        return self._handle("POST", url, kwargs)

    def _handle(self, verb, url, kwargs):
        upload = None
        files = kwargs.get("files")
        if files is not None:
            filename, handle, content_type = files["source"]
            # 파일은 호출이 끝나면 닫히므로 호출 도중에 내용을 읽어 둔다.
            upload = {"fields": sorted(files), "filename": filename, "content_type": content_type,
                      "content": handle.read(), "handle": handle}
        self.calls.append(Call(verb, url, kwargs, upload))
        try:
            outcome = self.routes[(verb, url)]
        except KeyError:
            raise AssertionError(f"예상하지 못한 호출: {verb} {url}") from None
        if isinstance(outcome, BaseException):
            raise outcome
        return outcome


def token_session(*, name="정우인재개발원", returned_id=PAGE, page=None) -> FakeSession:
    """check_token이 부르는 단 한 곳(페이지 정보 `/{page_id}`)에 답하는 가짜 세션. 다른 곳을 부르면 AssertionError."""
    return FakeSession({
        ("GET", f"{BASE}/{PAGE}"): page if page is not None else FakeResponse(200, {"id": returned_id, "name": name}),
    })


def assert_token_only_in_header(session: FakeSession) -> None:
    """토큰은 어느 호출에서든 `Authorization` 헤더에만 있다: URL·params·data·files 어디에도 없다."""
    assert session.calls
    for call in session.calls:
        # 헤더 dict 전체를 견주면 User-Agent 하나가 생겨도 이 장치를 쓰는 시험 스물이 한꺼번에 깨지고,
        # 어느 보장이 깨진 것인지 알 수 없다. 같은 엄격함(헤더는 Authorization 하나뿐)을 두 줄로 나눠 짚는다.
        headers = call.kwargs["headers"]
        assert headers["Authorization"] == f"Bearer {SENTINEL}"
        assert len(headers) == 1
        assert SENTINEL not in call.url
        others = {key: value for key, value in call.kwargs.items() if key != "headers"}
        assert SENTINEL not in repr(others)


def photo_session(outcome=None) -> FakeSession:
    return FakeSession({("POST", f"{BASE}/{PAGE}/photos"): outcome if outcome is not None else FakeResponse(200, {"id": "9001"})})


@pytest.fixture(autouse=True)
def _네트워크_차단(monkeypatch):
    """어떤 테스트도 실제 소켓을 열 수 없다. 가짜 세션을 우회하는 코드가 있으면 여기서 실패한다."""

    def refuse(*args, **kwargs):
        raise AssertionError("테스트가 실제 네트워크 연결을 시도했습니다")

    monkeypatch.setattr(socket.socket, "connect", refuse)
    monkeypatch.setattr(socket, "create_connection", refuse)
    monkeypatch.setattr(socket, "getaddrinfo", refuse)


@pytest.fixture
def image(tmp_path) -> Path:
    path = tmp_path / "post-01.jpg"
    path.write_bytes(b"\xff\xd8\xff-fake-jpeg-bytes")
    return path


def new_york() -> ZoneInfo:
    """DST를 지키는 시간대 하나. 이 사업에 쓰이는 시간대(JST·KST·베트남·미얀마·네팔)에는 DST가 없으므로,
    `assert_schedulable`이 벽시계가 아니라 절대 시간으로 견주는지 가르려면 이것이 필요하다(고정 오프셋으로는 못 가른다).

    **모듈 수준에서 만들지 않는다.** 시간대 DB가 없는 환경에서 `ZoneInfo(...)`가 수집 단계에서 터지면 이 파일
    전체(그리고 묶음 전체)가 죽는다. 이 묶음이 이 프로젝트의 유일한 안전망이므로, 못 돌리는 환경에서는 안전망이
    조용히 꺼지는 대신 **DST 시험 둘만** 건너뛰어야 한다.
    """
    try:
        return ZoneInfo("America/New_York")
    except ZoneInfoNotFoundError as exc:
        pytest.skip(f"시간대 DB가 없어 DST 시험만 건너뜁니다: {exc}")


def has_hangul(text: str) -> bool:
    return any("가" <= char <= "힣" for char in text)


def chain(exc: BaseException):
    """예외와, 그것에 달린 `__cause__`·`__context__`를 모두 돌려준다."""
    seen = []
    pending = [exc]
    while pending:
        current = pending.pop()
        if current is None or any(current is s for s in seen):
            continue
        seen.append(current)
        pending += [current.__cause__, current.__context__]
    return seen


# ── 테스트 장치 자체 ─────────────────────────────────────────────────────────


def test_네트워크_차단_장치가_실제로_소켓_연결을_막는다():
    with pytest.raises(AssertionError, match="네트워크"):
        socket.create_connection(("graph.facebook.com", 443))
    with pytest.raises(AssertionError, match="네트워크"):
        socket.getaddrinfo("graph.facebook.com", 443)
    with socket.socket() as sock, pytest.raises(AssertionError, match="네트워크"):
        sock.connect(("127.0.0.1", 9))


def test_필요한_권한은_세_개다():
    assert graph.REQUIRED_PERMISSIONS == ALL_PERMISSIONS


def test_필요한_권한마다_한국어_설명이_있다():
    # 안내문이 권한 이름마다 설명을 찾아 쓴다. 권한을 하나 더하고 설명을 빼먹으면 안내문을 만드는 순간 KeyError가 난다.
    assert set(graph._PERMISSION_HELP) == set(graph.REQUIRED_PERMISSIONS)
    assert all(has_hangul(text) for text in graph._PERMISSION_HELP.values())


def test_GraphError의_maybe_created는_기본_False이고_키워드로만_받는다():
    assert graph.GraphError("x").maybe_created is False
    assert graph.GraphError("x", maybe_created=True).maybe_created is True
    with pytest.raises(TypeError):
        graph.GraphError("x", True)


# ── check_token ──────────────────────────────────────────────────────────────

def test_토큰으로_이_페이지를_읽을_수_있으면_ok():
    status = graph.check_token(SENTINEL, PAGE, session=token_session(name="정우인재개발원"))
    assert status.ok is True
    assert status.page_name == "정우인재개발원"
    assert has_hangul(status.message) and "정우인재개발원" in status.message and PAGE in status.message


def test_missing_permissions는_늘_비어_있다():
    # 권한 목록을 조회하지 않으므로(TokenStatus 문서) 어느 결과에서도 짐작으로 채우지 않는다.
    cases = [
        token_session(),
        token_session(returned_id="999888777", name="다른 페이지"),
        token_session(page=FakeResponse(400, {"error": {"message": "Invalid OAuth access token", "code": 190}})),
        token_session(page=FakeResponse(400, {"error": {"message": "Application request limit reached", "code": 4}})),
    ]
    assert [graph.check_token(SENTINEL, PAGE, session=session).missing_permissions for session in cases] == [()] * 4


def test_TokenStatus는_바꿀_수_없다():
    status = graph.check_token(SENTINEL, PAGE, session=token_session())
    with pytest.raises(dataclasses.FrozenInstanceError):
        status.ok = False


def test_check_token은_GET_한_번으로_페이지를_읽고_토큰은_헤더에만_싣는다():
    session = token_session()
    graph.check_token(SENTINEL, PAGE, session=session)
    assert [(c.verb, c.url) for c in session.calls] == [("GET", f"{BASE}/{PAGE}")]
    (call,) = session.calls
    assert call.kwargs["params"] == {"fields": "id,name"}
    assert call.kwargs["timeout"] == config.GRAPH_TIMEOUT
    assert "data" not in call.kwargs and "files" not in call.kwargs
    assert_token_only_in_header(session)


def test_권한을_조회하는_debug_token이나_permissions를_부르지_않는다():
    # debug_token은 토큰을 URL 쿼리로 보내야 하므로 넣지 않았다(TokenStatus 문서). 가짜 세션은 다른 경로를 부르면 AssertionError를
    # 내지만, 그 예외를 삼키는 코드가 생겨도 알아채도록 호출 기록도 본다.
    for status_session in (token_session(), token_session(returned_id="999888777"), token_session(page=FakeResponse(400, {"error": "x"}))):
        graph.check_token(SENTINEL, PAGE, session=status_session)
        assert all("debug_token" not in c.url and "permissions" not in c.url for c in status_session.calls)
        assert all("input_token" not in c.kwargs.get("params", {}) for c in status_session.calls)
        assert len(status_session.calls) == 1


# 페이지 정보 확인


def test_돌아온_id가_지정한_페이지와_다르면_ok_False와_돌아온_페이지를_알려_준다():
    session = token_session(returned_id="999888777", name="다른 페이지")
    status = graph.check_token(SENTINEL, PAGE, session=session)
    assert status.ok is False
    assert status.page_name == "다른 페이지"
    assert status.missing_permissions == ()
    for needle in ("지정한 페이지(100200300)를 조회했더니 다른 페이지(id 999888777, 이름 '다른 페이지')가 돌아왔습니다",
                   "다른 페이지의 토큰을 붙여 넣었거나 페이지 id가 잘못된 것은 아닌지", config.TOKEN_ENV_NAME, str(config.ENV_PATH)):
        assert needle in status.message
    assert len(session.calls) == 1  # 엉뚱한 페이지의 권한을 물어볼 이유가 없다


def test_다른_페이지가_돌아왔는데_이름이_없으면_id만_알려_준다():
    status = graph.check_token(SENTINEL, PAGE, session=token_session(page=FakeResponse(200, {"id": "999888777"})))
    assert status.ok is False and status.page_name is None
    assert "다른 페이지(id 999888777)가 돌아왔습니다" in status.message and "이름 '" not in status.message


@pytest.mark.parametrize("body", [{"name": "정우인재개발원"}, {"id": None}, {"id": ""}, {"id": 100200300}], ids=["id-없음", "None", "빈-문자열", "숫자"])
def test_돌아온_id를_알_수_없으면_GraphError(body):
    with pytest.raises(graph.GraphError) as caught:
        graph.check_token(SENTINEL, PAGE, session=token_session(page=FakeResponse(200, body)))
    assert has_hangul(str(caught.value)) and "id" in str(caught.value) and caught.value.maybe_created is False


def test_토큰이_무효면_ok_False와_한국어_메시지():
    invalid = FakeResponse(400, {"error": {"message": "Invalid OAuth access token - Cannot parse access token",
                                           "type": "OAuthException", "code": 190, "fbtrace_id": "AbC123"}})
    session = token_session(page=invalid)
    status = graph.check_token(SENTINEL, PAGE, session=session)
    assert status.ok is False
    assert status.page_name is None
    assert status.missing_permissions == ()
    assert has_hangul(status.message)
    assert "유효하지 않" in status.message or "만료" in status.message
    # 어떻게 고치는지, 그리고 Facebook이 한 말을 그대로.
    assert config.TOKEN_ENV_NAME in status.message and "새로 발급" in status.message
    assert "Invalid OAuth access token" in status.message and "190" in status.message
    assert len(session.calls) == 1  # 페이지 정보 조회가 거절됐으니 권한 점검은 하지 않는다


def test_HTTP_200이어도_본문에_error가_있으면_ok_False():
    wrapped = FakeResponse(200, {"error": {"message": "Session has expired", "code": 190, "error_subcode": 463}})
    status = graph.check_token(SENTINEL, PAGE, session=token_session(page=wrapped))
    assert status.ok is False and has_hangul(status.message)
    assert "Session has expired" in status.message and "190" in status.message and "463" in status.message


def test_토큰_문제가_아닌_API_오류는_Facebook의_말을_그대로_싣고_토큰_탓이라고_하지_않는다():
    limited = FakeResponse(400, {"error": {"message": "Application request limit reached", "code": 4}})
    status = graph.check_token(SENTINEL, PAGE, session=token_session(page=limited))
    assert status.ok is False
    assert "Application request limit reached" in status.message and "code 4" in status.message
    assert status.message.startswith("토큰을 확인하지 못했습니다. ")
    assert "페이지 정보 조회 요청을 Facebook이 거절했습니다 (HTTP 400)" in status.message  # 어느 단계에서 무슨 상태로
    assert has_hangul(status.message)
    assert "유효하지 않" not in status.message and "만료" not in status.message


def test_error가_문자열인_거절도_ok_False이고_토큰_무효로_단정하지_않는다():
    status = graph.check_token(SENTINEL, PAGE, session=token_session(page=FakeResponse(400, {"error": "Something went wrong"})))
    assert status.ok is False and "Something went wrong" in status.message and "유효하지 않" not in status.message


def test_응답에_이름이_없으면_page_name은_None이고_안내는_page_id를_쓴다():
    status = graph.check_token(SENTINEL, PAGE, session=token_session(page=FakeResponse(200, {"id": PAGE})))
    assert status.ok is True and status.page_name is None
    assert f"이 토큰으로 페이지 '{PAGE}'({PAGE})의 정보를 읽을 수 있습니다" in status.message


@pytest.mark.parametrize("name", ["", None, 123], ids=["빈-문자열", "None", "숫자"])
def test_이름이_문자열이_아니거나_비었으면_None으로_본다(name):
    status = graph.check_token(SENTINEL, PAGE, session=token_session(page=FakeResponse(200, {"id": PAGE, "name": name})))
    assert status.page_name is None and PAGE in status.message


@pytest.mark.parametrize("failure", [
    pytest.param(OSError("Max retries exceeded"), id="연결-실패"),
    pytest.param(FakeResponse(502, text="<html>Bad Gateway</html>", json_error=ValueError("Expecting value")), id="JSON이-아닌-502"),
    pytest.param(FakeResponse(200, text="not json", json_error=ValueError("Expecting value")), id="JSON이-아닌-200"),
    pytest.param(FakeResponse(200, ["data"]), id="JSON-객체가-아님"),
    pytest.param(FakeResponse(503, {"unexpected": True}), id="오류-객체-없는-503"),
])
def test_페이지_정보의_답을_받지_못하면_ok_False가_아니라_GraphError(failure):
    # "토큰이 나쁘다"와 "Facebook에 닿지 못했다"는 다르다. 후자를 ok=False로 돌려주면 멀쩡한 토큰을 새로 발급하게 된다.
    with pytest.raises(graph.GraphError) as caught:
        graph.check_token(SENTINEL, PAGE, session=token_session(page=failure))
    assert has_hangul(str(caught.value))
    assert caught.value.maybe_created is False  # 조회일 뿐 아무것도 만들지 않는다
    assert "만들어졌을 수" not in str(caught.value)  # 예약 안내는 예약 호출에만 붙는다


_N = graph._EXCERPT_LENGTH


@pytest.mark.parametrize(("text", "shown"), [
    pytest.param("<html>Bad Gateway</html>", "<html>Bad Gateway</html>", id="짧으면-그대로"),
    pytest.param("<html>\n\n  <body>  hi </body>\n</html>", "<html> <body> hi </body> </html>", id="공백은-하나로"),
    pytest.param("y" * _N, "y" * _N, id="정확히-한도면-자르지-않는다"),
    pytest.param("y" * (_N + 1), "y" * _N + "…", id="한도를-넘으면-말줄임표"),
])
def test_응답_본문_발췌는_공백을_모으고_한도를_넘을_때만_말줄임표를_붙인다(text, shown):
    response = FakeResponse(502, text=text, json_error=ValueError("Expecting value"))
    with pytest.raises(graph.GraphError) as caught:
        graph.check_token(SENTINEL, PAGE, session=token_session(page=response))
    assert str(caught.value).endswith(f"응답 앞부분: {shown}")
    assert "HTTP 502" in str(caught.value)


def test_error가_긴_문자열이면_발췌해서_싣는다():
    response = FakeResponse(400, {"error": "z" * (_N + 50)})
    status = graph.check_token(SENTINEL, PAGE, session=token_session(page=response))
    assert status.message.endswith("z" * _N + "…")


# message의 단서: ok=True여도 이 검사가 증명하지 못한 것을 늘 말한다


def test_message는_권한을_확인하지_못했고_읽기가_쓰기를_뜻하지_않는다고_늘_말한다():
    message = graph.check_token(SENTINEL, PAGE, session=token_session()).message
    assert has_hangul(message)
    # 이 메시지의 존재 이유가 과장하지 않는 것이므로 "접근"처럼 쓰기까지 포함해 읽히는 말을 쓰지 않는다:
    # 증명한 것은 읽을 수 있다는 것뿐이고, 모든 줄이 같은 말을 써야 한 줄만 느슨해지는 일이 없다.
    assert f"이 토큰으로 페이지 '정우인재개발원'({PAGE})의 정보를 읽을 수 있습니다" in message
    assert "접근" not in message
    assert "이 토큰이 가졌는지는 확인하지 못했습니다" in message
    for name, help_text in (("pages_manage_posts", "페이지에 글과 사진 올리기"),
                            ("pages_read_engagement", "페이지 게시물 읽기"),
                            ("pages_show_list", "관리하는 페이지 목록 보기")):
        assert f"{name}({help_text})" in message  # 영문 권한 이름만 던지지 않고 뜻을 한국어로 풀어 준다
    # 영문 권한 이름은 사업주가 Business Manager에서 권한을 줄 때 필요하므로 지우지 않고 맨 끝 참고 줄로 옮겼다.
    assert ("참고 — 올리기에 필요한 권한: pages_manage_posts(페이지에 글과 사진 올리기), pages_read_engagement(페이지 게시물 읽기), "
            "pages_show_list(관리하는 페이지 목록 보기).") in message
    assert "권한(pages" not in message  # 괄호 속 괄호로 읽기 어려워지지 않게 목록을 문장에서 떼어 놓았다
    # 권한을 확인하지 못했다는 사실은 말하고, 왜 조회하지 않는지(앱 토큰·토큰을 주소에 싣는 문제)는 말하지 않는다:
    # 그것은 구현 근거이고 읽는 사람이 그 말로 할 수 있는 일이 없다. 근거는 TokenStatus의 문서에 있다.
    assert "이 도구는 토큰의 권한 목록을 조회하지 않습니다" in message
    assert "앱 토큰" not in message and "주소에 실어" not in message
    assert "scope" not in message.lower()  # 개발자 용어를 모르는 사람이 읽는 글이다


def test_message는_역할을_증명하지_못한다는_것도_늘_말한다():
    # 이 검사는 읽을 수 있음만 증명한다. 다른 페이지의 토큰이 우리 페이지를 읽을 수 있어도 통과하므로, 그 사실을 감추지 않는다.
    message = graph.check_token(SENTINEL, PAGE, session=token_session()).message
    assert "이 검사가 알려 주는 것은 그 하나입니다" in message
    assert "이 토큰의 주인이 이 페이지에서 역할을 가졌는지도 확인하지 못했습니다" in message
    assert "다른 페이지의 토큰이라도 이 페이지를 읽을 수 있으면 이 검사를 통과할 수 있습니다" in message


def test_message는_읽기가_쓰기를_뜻하지_않으며_진짜_증거는_테스트_예약이라고_늘_안내한다():
    message = graph.check_token(SENTINEL, PAGE, session=token_session()).message
    assert "페이지를 읽을 수 있다는 것만으로는 글을 올릴 수 있다는 뜻이 아닙니다" in message
    # 운영 문서가 정한 진짜 증거: 테스트 글 하나를 예약해 보고, 눈으로 보고, 지운다.
    assert "테스트 글 1건을 예약해 보고, 페이지의 예약된 게시물에 보이는지 눈으로 확인한 뒤 지우세요" in message
    assert "이 토큰으로 글을 올릴 수 있는지는 그렇게 해 보는 것으로만 알 수 있습니다" in message


def test_message는_할_일을_맨_앞에_두고_줄로_끊어_적는다():
    # 운영자는 비개발자 한 명이고 이 글을 터미널에서 읽는다. 한 문단으로 쏟아지면 할 수 있는 일이 단서 더미에 묻히므로,
    # 줄바꿈은 여기서 넣는다(출력하는 쪽이 다시 손보지 않게).
    for session in (token_session(), token_session(page=FakeResponse(200, {"id": PAGE}))):
        message = graph.check_token(SENTINEL, PAGE, session=session).message
        lines = message.split("\n")
        assert len(lines) >= 5
        assert lines[0].startswith("다음으로 할 일: ")                      # 할 일이 첫 줄
        assert lines[-1].startswith("참고 — 올리기에 필요한 권한: ")        # 영문 권한 이름은 맨 끝 참고 줄
        assert all(line.strip() == line and line for line in lines)      # 빈 줄이나 어긋난 들여쓰기 없이
        assert max(len(line) for line in lines[:-1]) <= 110              # 한 줄이 다시 문단이 되지 않게


def test_message는_초록불처럼_읽히는_문장을_쓰지_않는다():
    for session in (token_session(), token_session(page=FakeResponse(200, {"id": PAGE}))):
        message = graph.check_token(SENTINEL, PAGE, session=session).message
        for overclaim in ("정상", "예약할 수 있습니다", "가지고 있다고", "확인했습니다"):
            assert overclaim not in message


def test_message의_단서는_페이지_이름이_없어도_같다():
    named = graph.check_token(SENTINEL, PAGE, session=token_session()).message
    unnamed = graph.check_token(SENTINEL, PAGE, session=token_session(page=FakeResponse(200, {"id": PAGE}))).message
    assert f"페이지 '{PAGE}'({PAGE})의 정보를 읽을 수 있습니다" in unnamed
    assert named.split("의 정보를 읽을 수 있습니다", 1)[1] == unnamed.split("의 정보를 읽을 수 있습니다", 1)[1]


# ── assert_schedulable ───────────────────────────────────────────────────────


def test_10분_이내_예약이면_GraphError():
    with pytest.raises(graph.GraphError) as caught:
        graph.assert_schedulable(NOW + timedelta(minutes=5), NOW)
    assert caught.value.maybe_created is False  # 요청을 보내지 않았다
    message = str(caught.value)
    assert has_hangul(message) and "너무 가깝" in message
    assert (NOW + timedelta(minutes=5)).isoformat() in message          # 어느 게시물 시각이 문제인지
    assert f"10분 뒤({(NOW + config.SCHEDULE_MIN_LEAD).isoformat()})" in message  # 창과, 가장 이른 가능 시각
    assert "5분 뒤입니다" in message                                                 # 지금 얼마나 모자라는지


def test_75일_초과_예약이면_GraphError():
    publish_at = NOW + timedelta(days=80)
    with pytest.raises(graph.GraphError) as caught:
        graph.assert_schedulable(publish_at, NOW)
    message = str(caught.value)
    assert has_hangul(message) and "너무 멉니다" in message
    assert publish_at.isoformat() in message
    assert f"75일 뒤({(NOW + config.SCHEDULE_MAX_LEAD).isoformat()})" in message
    assert "80일 뒤입니다" in message


def test_이미_지난_시각이면_지났다고_말한다():
    with pytest.raises(graph.GraphError) as caught:
        graph.assert_schedulable(NOW - timedelta(hours=2), NOW)
    message = str(caught.value)
    # "2시간 앞"은 '2시간 나중'으로도 읽힌다. 운영자에게는 한 뜻으로만 읽히는 말이어야 한다.
    assert "이미 지난" in message and "보다 2시간 전)" in message and "너무 가깝" not in message
    assert "앞)" not in message
    assert f"10분 뒤({(NOW + config.SCHEDULE_MIN_LEAD).isoformat()})" in message


def test_지금과_같은_시각은_지난_시각이_아니라_너무_가까운_시각이다():
    with pytest.raises(graph.GraphError) as caught:
        graph.assert_schedulable(NOW, NOW)
    assert "너무 가깝" in str(caught.value) and "이미 지난" not in str(caught.value)
    assert "0초 뒤입니다" in str(caught.value)


def test_경계값_정확히_10분과_75일은_통과():
    assert graph.assert_schedulable(NOW + config.SCHEDULE_MIN_LEAD, NOW) is None
    assert graph.assert_schedulable(NOW + config.SCHEDULE_MAX_LEAD, NOW) is None


def test_경계에서_1마이크로초라도_벗어나면_거부한다():
    tick = timedelta(microseconds=1)
    with pytest.raises(graph.GraphError):
        graph.assert_schedulable(NOW + config.SCHEDULE_MIN_LEAD - tick, NOW)
    with pytest.raises(graph.GraphError):
        graph.assert_schedulable(NOW + config.SCHEDULE_MAX_LEAD + tick, NOW)
    # 안쪽으로 1마이크로초는 통과한다.
    graph.assert_schedulable(NOW + config.SCHEDULE_MIN_LEAD + tick, NOW)
    graph.assert_schedulable(NOW + config.SCHEDULE_MAX_LEAD - tick, NOW)


def test_창_밖_메시지는_초_단위까지_말한다():
    with pytest.raises(graph.GraphError) as caught:
        graph.assert_schedulable(NOW + timedelta(minutes=9, seconds=59, microseconds=999999), NOW)
    assert "9분 59초 뒤" in str(caught.value)


def test_창_밖_메시지는_일_시간_분_초를_빠짐없이_적는다():
    with pytest.raises(graph.GraphError) as caught:
        graph.assert_schedulable(NOW + timedelta(days=76, hours=2, minutes=3, seconds=4), NOW)
    assert "76일 2시간 3분 4초 뒤입니다" in str(caught.value)


def test_타임존_오프셋이_달라도_같은_순간으로_견준다():
    utc_now = NOW.astimezone(timezone.utc)
    # 같은 순간을 UTC로 적은 publish_at과 JST로 적은 now
    graph.assert_schedulable((NOW + config.SCHEDULE_MIN_LEAD).astimezone(timezone.utc), NOW)
    graph.assert_schedulable(PUBLISH_AT, utc_now)
    with pytest.raises(graph.GraphError):
        graph.assert_schedulable((NOW + timedelta(minutes=9)).astimezone(timezone(timedelta(hours=-5))), utc_now)


def test_DST가_접히는_구간에서도_벽시계가_아니라_절대_시간으로_견준다():
    # 두 시각의 tzinfo가 같으면 파이썬은 오프셋을 무시하고 벽시계를 뺀다(CPython이 문서로 정한 동작).
    # 미국 동부가 서머타임을 끝내는 새벽 한 시가 두 번 지나가는 구간에서, 절대 시간으로 10분 뒤인 예약이
    # 벽시계로는 50분 전으로 계산돼 "이미 지난 시각"으로 거절됐다.
    zone = new_york()
    now = datetime(2026, 11, 1, 1, 55, tzinfo=zone, fold=0)        # EDT, -04:00
    publish_at = datetime(2026, 11, 1, 1, 5, tzinfo=zone, fold=1)  # EST, -05:00 → 절대 시간으로 10분 뒤
    assert publish_at.astimezone(timezone.utc) - now.astimezone(timezone.utc) == timedelta(minutes=10)
    assert publish_at - now == timedelta(minutes=-50)               # 벽시계로 빼면 이렇게 어긋난다
    assert graph.assert_schedulable(publish_at, now) is None


def test_DST가_접히는_구간의_안내도_절대_시간으로_계산한_시각을_적는다():
    zone = new_york()
    now = datetime(2026, 11, 1, 1, 55, tzinfo=zone, fold=0)
    publish_at = datetime(2026, 11, 1, 1, 4, tzinfo=zone, fold=1)  # 절대 시간으로 9분 뒤: 창 밖
    with pytest.raises(graph.GraphError) as caught:
        graph.assert_schedulable(publish_at, now)
    message = str(caught.value)
    assert "너무 가깝" in message and "9분 뒤입니다" in message
    # 가장 이른 가능 시각도 벽시계가 아니라 절대 시간으로 센다: 01:55 EDT + 10분 = 01:05 EST(같은 순간).
    # 운영자가 읽는 시각은 now의 시간대로 적는다(UTC로 바꿔 적으면 읽는 사람이 다시 환산해야 한다).
    assert "10분 뒤(2026-11-01T01:05:00-05:00)" in message


def test_DST를_건너는_75일_경계의_안내도_절대_시간으로_계산한_시각을_적는다():
    # 창의 먼 쪽 경계(latest)도 같은 산수여야 한다. 가까운 쪽(earliest)만 고치면 이 메시지가 한 시간 틀린 시각을
    # 적고, 운영자는 되는 시각을 안 된다고 읽거나 그 반대로 읽는다.
    zone = new_york()
    now = datetime(2026, 11, 1, 1, 55, tzinfo=zone, fold=0)        # EDT, -04:00 (= 05:55 UTC)
    publish_at = datetime(2027, 1, 15, 0, 56, tzinfo=zone)         # EST, -05:00 → 절대 시간으로 75일 1분 뒤
    assert publish_at.astimezone(timezone.utc) - now.astimezone(timezone.utc) == timedelta(days=75, minutes=1)
    assert publish_at - now == timedelta(days=74, hours=23, minutes=1)  # 벽시계로 빼면 창 안으로 보인다
    with pytest.raises(graph.GraphError) as caught:
        graph.assert_schedulable(publish_at, now)
    message = str(caught.value)
    assert "너무 멉니다" in message and "75일 1분 뒤입니다" in message
    # 01:55 EDT + 75일 = 00:55 EST(같은 순간). 벽시계로 더하면 01:55로 한 시간 틀린다.
    assert "75일 뒤(2027-01-15T00:55:00-05:00)" in message


def test_예약_창은_config_값을_따른다(monkeypatch):
    # 코드가 10분·75일이라는 숫자를 따로 적어 두었다면 이 시험이 잡는다.
    monkeypatch.setattr(config, "SCHEDULE_MIN_LEAD", timedelta(hours=1))
    monkeypatch.setattr(config, "SCHEDULE_MAX_LEAD", timedelta(days=1))
    graph.assert_schedulable(NOW + timedelta(hours=1), NOW)
    graph.assert_schedulable(NOW + timedelta(days=1), NOW)
    with pytest.raises(graph.GraphError) as early:
        graph.assert_schedulable(NOW + timedelta(minutes=30), NOW)
    with pytest.raises(graph.GraphError) as late:
        graph.assert_schedulable(NOW + timedelta(days=2), NOW)
    with pytest.raises(graph.GraphError) as past:
        graph.assert_schedulable(NOW - timedelta(minutes=1), NOW)
    assert "1시간" in str(early.value) and "10분" not in str(early.value)
    assert "1시간 뒤(" in str(past.value) and "10분" not in str(past.value)
    assert "1일" in str(late.value) and "75일" not in str(late.value)


@pytest.mark.parametrize("naive_arg", ["publish_at", "now"])
def test_타임존_없는_시각은_TypeError가_아니라_한국어_GraphError(naive_arg):
    aware = NOW + timedelta(days=1)
    naive = aware.replace(tzinfo=None)
    args = {"publish_at": aware, "now": NOW}
    args[naive_arg] = naive if naive_arg == "publish_at" else NOW.replace(tzinfo=None)
    with pytest.raises(graph.GraphError) as caught:
        graph.assert_schedulable(**args)
    message = str(caught.value)
    assert has_hangul(message) and naive_arg in message and "타임존" in message
    assert args[naive_arg].isoformat() in message


class _오프셋_없는_tzinfo(tzinfo):
    """tzinfo는 붙어 있지만 utcoffset()이 None이다. 파이썬은 이런 시각도 타임존이 없는 시각으로 친다."""

    def utcoffset(self, dt):
        return None

    def dst(self, dt):
        return None

    def tzname(self, dt):
        return None


def test_tzinfo가_붙어_있어도_오프셋을_알_수_없으면_타임존이_없는_시각으로_거절한다():
    odd = datetime(2026, 11, 2, 12, 0, tzinfo=_오프셋_없는_tzinfo())
    assert odd.tzinfo is not None
    with pytest.raises(graph.GraphError) as caught:
        graph.assert_schedulable(odd, NOW)
    assert "타임존이 없습니다" in str(caught.value)


# ── read_photo_caption ───────────────────────────────────────────────────────


POST_ID = "100200300_122100000000000001"


def caption_session(outcome=None) -> FakeSession:
    return FakeSession({("GET", f"{BASE}/{POST_ID}"): outcome if outcome is not None else FakeResponse(200, {"name": CAPTION})})


def test_read_photo_caption은_fields_name으로_읽는다():
    """사진 노드에서 읽을 수 있는 캡션 필드는 `name`이다(`message`는 읽기 필드가 아니다).
    출처: https://developers.facebook.com/docs/graph-api/reference/photo/"""
    session = caption_session()
    assert graph.read_photo_caption(SENTINEL, POST_ID, session=session) == CAPTION
    (call,) = session.calls
    assert (call.verb, call.url) == ("GET", f"{BASE}/{POST_ID}")
    assert call.kwargs["params"] == {"fields": "name"}
    assert_token_only_in_header(session)


def test_read_photo_caption은_글이_없으면_None이다():
    for body in ({}, {"name": ""}, {"name": "   "}, {"name": 12}, {"id": POST_ID}):
        assert graph.read_photo_caption(SENTINEL, POST_ID, session=caption_session(FakeResponse(200, body))) is None


def test_read_photo_caption은_읽지_못하면_GraphError다():
    session = caption_session(FakeResponse(400, {"error": {"message": "Unsupported get request", "code": 100}}))
    with pytest.raises(graph.GraphError) as caught:
        graph.read_photo_caption(SENTINEL, POST_ID, session=session)
    assert SENTINEL not in str(caught.value)


def test_read_photo_caption이_돌려주는_글도_토큰을_가린_값이다():
    session = caption_session(FakeResponse(200, {"name": f"본문 {SENTINEL}"}))
    assert SENTINEL not in graph.read_photo_caption(SENTINEL, POST_ID, session=session)


# ── id 모양 ──────────────────────────────────────────────────────────────────


# **가까운 오답을 일부러 넣는다.** 모양 검사가 느슨해지는 길은 "아무 글자나 통과"가 아니라 한 글자씩
# 넓어지는 쪽이다 — 앞의 `/`(절대 경로로 바뀐다), 퍼센트 인코딩된 구분자(서버가 디코드하면 경로가 된다),
# `.`과 `..`(상위로 올라간다), 그리고 `\d`가 받아 주는 전각·아랍 숫자(URL에 실리면 우리 id가 아니다).
NOT_IDS = (
    "me/feed", f"{POST_ID}/likes", "me", "../me", f"{POST_ID}?fields=name", "", "100 200", "100-200",
    "/100200300", "100200300/", "100%2F200", "100200300%2Flikes", "..", ".", ".100200300",
    "１２３", "١٢٣", "100200300\n", "100200300#x", "100200300;x",
)


@pytest.mark.parametrize("object_id", NOT_IDS)
def test_delete_post는_id가_숫자와_밑줄이_아니면_부르지도_않는다(object_id):
    """사용자가 준 글자가 URL 경로에 들어가는 자리다. `me/feed`는 엔드포인트 자체를 바꾼다.
    실제 사진 id는 숫자이거나 `<page>_<post>`뿐이다."""
    session = FakeSession({})  # 어떤 경로를 불러도 AssertionError로 크게 실패한다
    with pytest.raises(graph.GraphError) as caught:
        graph.delete_post(SENTINEL, object_id, session=session)
    assert session.calls == []
    assert has_hangul(str(caught.value))


@pytest.mark.parametrize("object_id", NOT_IDS)
def test_read_photo_caption도_같은_모양_검사를_한다(object_id):
    session = FakeSession({})
    with pytest.raises(graph.GraphError):
        graph.read_photo_caption(SENTINEL, object_id, session=session)
    assert session.calls == []


def test_토큰을_받는_함수는_날_GraphError를_만들지_않는다():
    """모듈 머리말의 약속을 **구조로** 못박는다: `raise GraphError(...)`를 그대로 쓰는 자리는 토큰을 인자로
    받지 않는 함수뿐이다(`_require_aware` 한 곳과 `assert_schedulable`의 세 거절 — 메시지를 시각만으로
    만든다). 토큰을 받는 함수는 `_error`/`_rejected`를 지나야 가려진다.

    이 시험이 없어서 `_require_object_id`가 머리말을 거짓으로 만든 채 한 라운드를 통과했다. 값이 새는 것보다
    **보안 불변식을 문서가 거짓으로 보증하는 것**이 나쁘다.
    """
    tree = ast.parse(Path(graph.__file__).read_text(encoding="utf-8"))
    offenders = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.FunctionDef):
            continue
        if not any(arg.arg == "token" for arg in node.args.args + node.args.kwonlyargs):
            continue
        for inner in ast.walk(node):
            if isinstance(inner, ast.Raise) and isinstance(inner.exc, ast.Call):
                if getattr(inner.exc.func, "id", None) in {"GraphError", "_Rejected"}:
                    offenders.append(f"{node.name}() {inner.lineno}줄")
    assert offenders == []


@pytest.mark.parametrize("call", ("delete_post", "read_photo_caption"))
def test_id_모양_오류도_토큰을_가린다(call):
    """**토큰을 인자로 받는 함수가 만드는 모든 `GraphError`는 토큰을 가린다**(모듈 머리말의 약속).

    운영자가 `--delete` 뒤에 사진 id 대신 토큰을 붙여 넣는 혼동은 충분히 일어난다. 그때 모양 검사가
    입력을 그대로 되풀이하면 **토큰이 화면에 찍히고** 그 글은 버그 리포트로 그대로 옮겨진다.
    """
    session = FakeSession({})
    with pytest.raises(graph.GraphError) as caught:
        getattr(graph, call)(SENTINEL, SENTINEL, session=session)
    assert session.calls == []
    assert SENTINEL not in str(caught.value)
    assert "***" in str(caught.value)


def test_id_모양_오류_메시지는_긴_입력을_그대로_싣지_않는다():
    """붙여넣기 사고는 짧지 않다. 화면을 덮지 않게 앞부분만 싣는다(가리기가 자르기보다 먼저다)."""
    with pytest.raises(graph.GraphError) as caught:
        graph.delete_post(SENTINEL, "x" * 500, session=FakeSession({}))
    assert len(str(caught.value)) < 450  # 자르지 않으면 500자가 그대로 실려 670자쯤이 된다


@pytest.mark.parametrize("object_id", ("100200300", "100200300_122100000000000001", "1", "0", "00123_0"))
def test_멀쩡한_id는_그대로_지나간다(object_id):
    session = FakeSession({("GET", f"{BASE}/{object_id}"): FakeResponse(200, {"name": CAPTION})})
    assert graph.read_photo_caption(SENTINEL, object_id, session=session) == CAPTION


# ── delete_post ──────────────────────────────────────────────────────────────


def delete_session(outcome=None) -> FakeSession:
    return FakeSession({("POST", f"{BASE}/{POST_ID}"): outcome if outcome is not None else FakeResponse(200, {"success": True})})


def test_delete_post는_method_delete를_POST로_보내고_토큰은_헤더에만_싣는다():
    session = delete_session()
    graph.delete_post(SENTINEL, POST_ID, session=session)
    (call,) = session.calls
    assert (call.verb, call.url) == ("POST", f"{BASE}/{POST_ID}")
    assert call.kwargs["data"] == {"method": "delete"}
    assert call.upload is None
    assert_token_only_in_header(session)


def test_delete_post는_success가_아니면_실패로_본다():
    """운영자에게 무엇을 하라고 말하는 것은 CLI의 몫이다(한곳에서 말한다). 이 모듈은 사실만 말한다."""
    for body in ({"success": False}, {}, {"id": POST_ID}):
        session = delete_session(FakeResponse(200, body))
        with pytest.raises(graph.GraphError) as caught:
            graph.delete_post(SENTINEL, POST_ID, session=session)
        assert "성공을 확인해 주지 않았습니다" in str(caught.value)


def test_delete_post의_거절은_Facebook의_말을_그대로_싣는다():
    rejected = FakeResponse(400, {"error": {"message": "Unsupported delete request", "code": 100}})
    session = delete_session(rejected)
    with pytest.raises(graph.GraphError) as caught:
        graph.delete_post(SENTINEL, POST_ID, session=session)
    assert "Unsupported delete request" in str(caught.value)
    assert SENTINEL not in str(caught.value)


# ── schedule_photo_post ──────────────────────────────────────────────────────


def test_schedule_photo_post가_caption과_published_false와_scheduled_publish_time을_보낸다(image):
    """본문은 **`caption`**으로 보낸다. Meta의 `/{page-id}/photos` 레퍼런스가 `message`를
    "Deprecated. Please use the caption param instead."로 적었고, 같은 문서가 사진 노드의 읽기 필드
    `name`을 "The user-provided caption given to this photo"로 적는다 — `caption`으로 보내야
    `--delete`의 본문 대조(`fields=name`)가 문서로 정의된 왕복이 된다.
    출처: https://developers.facebook.com/docs/graph-api/reference/page/photos/ ·
    https://developers.facebook.com/docs/graph-api/reference/photo/
    """
    session = photo_session()
    graph.schedule_photo_post(SENTINEL, PAGE, image, CAPTION, PUBLISH_AT, session=session)
    (call,) = session.calls
    # 전송되는 값은 문자열이다(멀티파트 필드). 파이썬 False를 그대로 넘기면 requests가 "False"로 적는다.
    # 정확한 모양을 못 박아 두어야 토큰이나 다른 필드가 몰래 끼어들지도 못한다.
    assert call.kwargs["data"] == {"caption": CAPTION, "published": "false", "scheduled_publish_time": PUBLISH_UNIX}


def test_예약_시각은_정수_유닉스_초이고_오프셋과_상관없이_같은_순간이면_같다(image):
    for publish_at in (PUBLISH_AT, PUBLISH_AT.astimezone(timezone.utc), PUBLISH_AT.astimezone(timezone(timedelta(hours=-8)))):
        session = photo_session()
        graph.schedule_photo_post(SENTINEL, PAGE, image, CAPTION, publish_at, session=session)
        assert session.calls[0].kwargs["data"]["scheduled_publish_time"] == PUBLISH_UNIX


def test_1초_미만은_버리고_초_단위로_보낸다(image):
    session = photo_session()
    graph.schedule_photo_post(SENTINEL, PAGE, image, CAPTION, PUBLISH_AT.replace(microsecond=999999), session=session)
    assert session.calls[0].kwargs["data"]["scheduled_publish_time"] == PUBLISH_UNIX


def test_schedule_photo_post는_POST로_페이지의_photos에_보내고_토큰은_헤더에만_싣는다(image):
    session = photo_session()
    graph.schedule_photo_post(SENTINEL, PAGE, image, CAPTION, PUBLISH_AT, session=session)
    (call,) = session.calls
    assert (call.verb, call.url) == ("POST", f"{BASE}/{PAGE}/photos")
    assert call.kwargs["headers"] == {"Authorization": f"Bearer {SENTINEL}"}
    assert call.kwargs["timeout"] == config.GRAPH_TIMEOUT
    assert SENTINEL not in call.url and SENTINEL not in repr(call.kwargs["data"]) and "params" not in call.kwargs
    assert_token_only_in_header(session)


def test_이미지는_source_필드로_이름과_형식과_내용을_실어_보내고_호출_뒤에_닫는다(tmp_path):
    for filename, content_type in (("a.jpg", "image/jpeg"), ("b.jpeg", "image/jpeg"), ("c.png", "image/png")):
        path = tmp_path / filename
        path.write_bytes(b"bytes-of-" + filename.encode())
        session = photo_session()
        graph.schedule_photo_post(SENTINEL, PAGE, path, CAPTION, PUBLISH_AT, session=session)
        upload = session.calls[0].upload
        assert upload["fields"] == ["source"]
        assert upload["filename"] == filename           # 경로가 아니라 파일 이름만
        assert upload["content_type"] == content_type
        assert upload["content"] == b"bytes-of-" + filename.encode()
        assert upload["handle"].closed


def test_알_수_없는_확장자는_octet_stream으로_보낸다(tmp_path):
    path = tmp_path / "photo.unknownext"
    path.write_bytes(b"x")
    session = photo_session()
    graph.schedule_photo_post(SENTINEL, PAGE, path, CAPTION, PUBLISH_AT, session=session)
    assert session.calls[0].upload["content_type"] == "application/octet-stream"


def test_요청이_실패해도_이미지_파일은_닫힌다(image):
    session = photo_session(OSError("boom"))
    with pytest.raises(graph.GraphError):
        graph.schedule_photo_post(SENTINEL, PAGE, image, CAPTION, PUBLISH_AT, session=session)
    assert session.calls[0].upload["handle"].closed


def test_성공하면_응답의_id를_문자열로_돌려준다(image):
    session = photo_session(FakeResponse(200, {"id": "1234567890", "post_id": "100200300_555"}))
    assert graph.schedule_photo_post(SENTINEL, PAGE, image, CAPTION, PUBLISH_AT, session=session) == "1234567890"


def test_돌려주는_사진_id도_토큰을_가린_값이다(image):
    # Task 9가 이 반환값을 원장 파일에 적는다. 응답이 토큰을 id로 되돌려 주면 토큰이 디스크에 남는다.
    # 메시지만 가리고 반환값을 가리지 않으면 "토큰은 어디에도 나타나지 않는다"는 규칙에 구멍이 하나 남는다.
    session = photo_session(FakeResponse(200, {"id": SENTINEL}))
    returned = graph.schedule_photo_post(SENTINEL, PAGE, image, CAPTION, PUBLISH_AT, session=session)
    assert SENTINEL not in returned
    assert not [piece for piece in token_fragments(SENTINEL) if piece in returned]
    # 실제 사진 id는 숫자와 밑줄(`<page>_<post>`)뿐이라 토큰 모양을 부분 문자열로 품을 수 없다: 가리기가
    # 멀쩡한 id를 건드리지 않는다.
    plain = photo_session(FakeResponse(200, {"id": "100200300_555"}))
    assert graph.schedule_photo_post(SENTINEL, PAGE, image, CAPTION, PUBLISH_AT, session=plain) == "100200300_555"


@pytest.mark.parametrize("response", [
    pytest.param(FakeResponse(400, {"error": {"message": "(#100) Invalid parameter", "type": "OAuthException", "code": 100,
                                               "error_subcode": 1366046, "fbtrace_id": "TRACE9"}}), id="HTTP-오류와-error-객체"),
    pytest.param(FakeResponse(200, {"error": {"message": "(#100) Invalid parameter", "type": "OAuthException", "code": 100,
                                               "error_subcode": 1366046, "fbtrace_id": "TRACE9"}}), id="HTTP-200인데-error-객체"),
])
def test_API가_오류를_주면_GraphError에_한국어_설명(image, response):
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, CAPTION, PUBLISH_AT, session=photo_session(response))
    message = str(caught.value)
    assert has_hangul(message)
    assert caught.value.maybe_created is False  # Facebook이 분명히 거절했다: 다시 시도해도 중복이 아니다
    assert "(#100) Invalid parameter [code 100, subcode 1366046, fbtrace_id TRACE9]" in message   # API가 한 말 그대로
    assert f"사진 예약 게시 요청을 Facebook이 거절했습니다 (HTTP {response.status_code})" in message  # 무엇을, 어떤 상태로
    # Facebook이 분명히 거절했으니 "만들어졌을 수도 있다"는 안내는 붙이지 않는다.
    assert "만들어졌을 수" not in message


@pytest.mark.parametrize("status", [500, 502, 503])
def test_5xx에_error_객체가_있으면_결과를_알_수_없는_실패다(image, status):
    # 5xx는 Facebook이 요청을 받아 처리하다 자기 쪽에서 실패한 것이다. 사진 업로드는 멱등이 아니므로 그 사이에
    # 게시물이 만들어졌을 수 있다. maybe_created를 False로 두면 Task 9가 "안 나갔으니 재시도해도 안전하다"로
    # 읽어 같은 사진이 실제 페이지에 두 번 나간다. 가르는 기준은 상태 코드뿐이다 — 어떤 오류 코드가 일시 장애인지를
    # 1차 출처 없이 적지 않는다(아래 응답은 그런 응답의 한 예일 뿐이고, 코드 번호에 기대는 단정은 하지 않는다).
    response = FakeResponse(status, {"error": {"message": "An unexpected error has occurred. Please retry your request later.",
                                               "type": "OAuthException", "code": 2, "fbtrace_id": "TRACE5"}})
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, CAPTION, PUBLISH_AT, session=photo_session(response))
    assert caught.value.maybe_created is True
    message = str(caught.value)
    assert has_hangul(message)
    assert "만들어졌을 수" in message and "예약된 게시물" in message
    # "거절했습니다"는 "Facebook이 아무것도 하지 않았다"로 읽힌다. 5xx에서는 그것이 바로 틀린 결론이다.
    assert f"사진 예약 게시 요청을 Facebook 쪽에서 처리하지 못했습니다 (HTTP {status})" in message
    assert "거절했습니다" not in message
    assert "An unexpected error has occurred" in message and "code 2" in message


def test_토큰_점검의_5xx도_거절이_아니라_처리_실패로_적는다():
    # 같은 문장이 _refused_status를 거쳐 check_token의 출력에도 간다. 조회는 아무것도 만들지 않으므로 ok=False 상태다.
    response = FakeResponse(503, {"error": {"message": "(#1) An unknown error occurred", "code": 1}})
    session = token_session(page=response)
    status = graph.check_token(SENTINEL, PAGE, session=session)
    assert status.ok is False and status.missing_permissions == ()
    assert status.message.startswith("토큰을 확인하지 못했습니다. ")
    assert "페이지 정보 조회 요청을 Facebook 쪽에서 처리하지 못했습니다 (HTTP 503)" in status.message
    assert "거절했습니다" not in status.message
    assert "An unknown error occurred" in status.message and "code 1" in status.message
    assert "유효하지 않" not in status.message and "만료" not in status.message  # 토큰 탓이라고 단정하지 않는다
    # 결과 불명 안내는 **쓰기**에만 붙는다. 읽기만 하는 검사가 "예약이 만들어졌을 수 있다"고 말하면 거짓이고,
    # 운영자는 만들지도 않은 게시물을 찾으러 간다.
    assert "만들어졌을 수" not in status.message and "예약된 게시물" not in status.message
    assert len(session.calls) == 1


def test_5xx는_오류_코드가_무엇이든_토큰에_대한_판정을_내지_않는다():
    # 5xx는 Facebook 쪽에서 처리에 실패한 것이므로 그 응답에 실린 코드가 무엇이든 토큰에 대해 아무것도 증명하지
    # 않는다. 토큰에 대한 결론("유효하지 않다", "새로 발급받으라")은 4xx에서만 낸다 — 증명하지 않은 것을
    # 단정하지 않는다는 원칙을 토큰 판정에도 적용한 것이다. 멀쩡한 토큰을 버리게 만들면 안 된다.
    response = FakeResponse(500, {"error": {"message": "Error validating access token", "code": 190}})
    session = token_session(page=response)
    status = graph.check_token(SENTINEL, PAGE, session=session)
    assert status.ok is False and status.page_name is None and status.missing_permissions == ()
    assert status.message.startswith("토큰을 확인하지 못했습니다. ")
    assert "페이지 정보 조회 요청을 Facebook 쪽에서 처리하지 못했습니다 (HTTP 500)" in status.message
    assert "유효하지 않" not in status.message and "만료" not in status.message
    assert "새로 발급" not in status.message  # 토큰을 바꾸라고 시키지 않는다
    assert "Error validating access token" in status.message and "code 190" in status.message  # 한 말은 그대로 보여 준다
    assert len(session.calls) == 1


@pytest.mark.parametrize("status_code", [400, 403, 200])
def test_5xx가_아니면_토큰_무효_코드는_판정을_낸다(status_code):
    # 반대쪽을 함께 묶어 둔다. 못 믿을 경우는 **서버가 애초에 처리를 못 한 5xx뿐**이고, 그 밖의 상태에서
    # code 190은 Facebook이 토큰에 대해 하는 말이므로 판정을 낸다 — 200에 실려 와도 마찬가지다.
    # 이것을 "4xx에서만"으로 좁히면 200에 실린 190이 판정 없이 지나간다.
    response = FakeResponse(status_code, {"error": {"message": "Error validating access token", "code": 190}})
    status = graph.check_token(SENTINEL, PAGE, session=token_session(page=response))
    assert status.ok is False
    assert "유효하지 않" in status.message or "만료" in status.message
    assert "새로 발급" in status.message and config.TOKEN_ENV_NAME in status.message


def test_모든_호출은_리다이렉트를_따라가지_않는다(image):
    # 진짜 requests.Session은 3xx를 따라간다. 쓰기 경로에서 301·302·303을 따라가면 POST가 GET으로 바뀌고 본문이
    # 버려지며, 307·308은 이미 다 읽은 파일 핸들을 다시 보내려 한다. 따라가지 않으면 "2xx가 아니면 실패"가 글자
    # 그대로 참이 되고, 3xx를 거절로 다루는 아래 시험이 실제로 닿을 수 있는 상태를 설명하게 된다.
    read = token_session()
    graph.check_token(SENTINEL, PAGE, session=read)
    write = photo_session()
    graph.schedule_photo_post(SENTINEL, PAGE, image, CAPTION, PUBLISH_AT, session=write)
    for session in (read, write):
        for call in session.calls:
            assert call.kwargs["allow_redirects"] is False


@pytest.mark.parametrize("status", [200, 201, 299])
def test_2xx는_모두_성공으로_본다(image, status):
    session = photo_session(FakeResponse(status, {"id": "9001"}))
    assert graph.schedule_photo_post(SENTINEL, PAGE, image, CAPTION, PUBLISH_AT, session=session) == "9001"


@pytest.mark.parametrize("status", [199, 300, 301, 404])
def test_2xx가_아니면_본문이_멀쩡해도_실패다(image, status):
    session = photo_session(FakeResponse(status, {"id": "9001"}))
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, CAPTION, PUBLISH_AT, session=session)
    assert f"HTTP {status}" in str(caught.value)


@pytest.mark.parametrize("status", [199, 300, 301, 400, 404])
def test_오류_객체_없이_실패한_상태는_4xx여도_쓰기에서는_결과_불명이다(image, status):
    # 거절한다는 말(error 객체)이 없으면 이 응답을 Facebook이 썼는지조차 알 수 없다 — 중간 장비(프록시·게이트웨이)가
    # 답했을 수도 있고, Facebook이 받아 처리한 뒤 답이 바뀐 것일 수도 있다. 그래서 4xx여도 **보수적으로** 결과
    # 불명이다: 모르면 사람이 한 번 확인하는 쪽이 같은 사진을 두 번 올리는 것보다 싸다.
    session = photo_session(FakeResponse(status, {"ok": False}, text='{"ok": false}'))
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, CAPTION, PUBLISH_AT, session=session)
    assert caught.value.maybe_created is True
    message = str(caught.value)
    assert f"요청이 실패했습니다 (HTTP {status}). 응답에 오류 내용이 없습니다" in message
    assert "만들어졌을 수" in message and "예약된 게시물" in message


def test_빈_error_객체도_거절이다(image):
    # error 키가 있으면 내용이 비어도 Facebook이 거절한 것이다. 성공으로 읽고 id를 찾다가 엉뚱한 메시지를 내면 안 된다.
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, CAPTION, PUBLISH_AT, session=photo_session(FakeResponse(200, {"error": {}})))
    assert "거절했습니다" in str(caught.value) and "메시지 없음" in str(caught.value)
    assert caught.value.maybe_created is False


@pytest.mark.parametrize("raised", [RuntimeError("버그"), KeyError("x"), TypeError("잘못된 인자")])
def test_OSError가_아닌_예외는_네트워크_문제로_둔갑시키지_않고_그대로_올라간다(image, raised):
    with pytest.raises(type(raised)):
        graph.schedule_photo_post(SENTINEL, PAGE, image, CAPTION, PUBLISH_AT, session=photo_session(raised))
    with pytest.raises(type(raised)):
        graph.check_token(SENTINEL, PAGE, session=token_session(page=raised))


def test_JSON_객체가_아닌_응답은_상태와_본문_앞부분을_말한다(image):
    response = FakeResponse(200, ["id"], text='["id"]')
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, CAPTION, PUBLISH_AT, session=photo_session(response))
    assert '사진 예약 게시에 대한 Facebook의 응답이 JSON 객체가 아닙니다 (HTTP 200). 응답 앞부분: ["id"]' in str(caught.value)


def test_JSON이_아닌_응답의_메시지는_상태와_본문_앞부분을_말한다(image):
    response = FakeResponse(200, text="ok", json_error=ValueError("Expecting value"))
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, CAPTION, PUBLISH_AT, session=photo_session(response))
    assert "사진 예약 게시에 대한 Facebook의 응답이 JSON이 아닙니다 (HTTP 200). 응답 앞부분: ok" in str(caught.value)


def test_json_해석에서_ValueError가_아닌_예외는_가리지_않고_올라간다(image):
    response = FakeResponse(200, json_error=RuntimeError("버그"))
    with pytest.raises(RuntimeError):
        graph.schedule_photo_post(SENTINEL, PAGE, image, CAPTION, PUBLISH_AT, session=photo_session(response))


def test_error가_딕셔너리가_아니어도_GraphError(image):
    response = FakeResponse(400, {"error": "Something went wrong"})
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, CAPTION, PUBLISH_AT, session=photo_session(response))
    assert "Something went wrong" in str(caught.value) and has_hangul(str(caught.value))
    assert caught.value.maybe_created is False


def test_code가_0이어도_적는다(image):
    response = FakeResponse(400, {"error": {"message": "m", "code": 0}})
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, CAPTION, PUBLISH_AT, session=photo_session(response))
    assert "m [code 0]" in str(caught.value)


def test_error에_message가_없어도_GraphError이고_없다고_적는다(image):
    response = FakeResponse(400, {"error": {"code": 2}})
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, CAPTION, PUBLISH_AT, session=photo_session(response))
    assert "code 2" in str(caught.value) and "메시지 없음" in str(caught.value)


def test_오류_객체_없이_HTTP_상태만_실패면_상태_코드를_말한다(image):
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, CAPTION, PUBLISH_AT,
                                  session=photo_session(FakeResponse(500, {"ok": False}, text='{"ok": false}')))
    assert '요청이 실패했습니다 (HTTP 500). 응답에 오류 내용이 없습니다. 응답 앞부분: {"ok": false}' in str(caught.value)
    assert caught.value.maybe_created is True  # error 객체 없이 실패 상태만 왔다: Facebook이 무엇을 했는지 모른다
    assert has_hangul(str(caught.value))


@pytest.mark.parametrize("outcome", [
    pytest.param(OSError("Connection reset by peer"), id="연결-실패"),
    pytest.param(TimeoutError("Read timed out"), id="시간-초과"),
    pytest.param(FakeResponse(502, text="<html>Bad Gateway</html>", json_error=ValueError("Expecting value")), id="JSON이-아닌-502"),
    pytest.param(FakeResponse(200, text="ok", json_error=ValueError("Expecting value")), id="JSON이-아닌-200"),
    pytest.param(FakeResponse(200, ["id"]), id="JSON-객체가-아님"),
    pytest.param(FakeResponse(500, {"ok": False}), id="오류-객체-없는-500"),
    pytest.param(FakeResponse(200, {}), id="id-없음"),
    pytest.param(FakeResponse(200, {"id": ""}), id="id가-빈-문자열"),
    pytest.param(FakeResponse(200, {"id": None}), id="id가-None"),
    pytest.param(FakeResponse(200, {"id": 9001}), id="id가-문자열이-아님"),
])
def test_응답을_믿을_수_없으면_GraphError이고_예약이_만들어졌을_수_있다고_알린다(image, outcome):
    # 요청은 나갔는데 결과를 모르는 경우다. 그냥 다시 돌리면 같은 게시물이 두 번 예약될 수 있으므로 안내가 있어야 한다.
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, CAPTION, PUBLISH_AT, session=photo_session(outcome))
    message = str(caught.value)
    assert caught.value.maybe_created is True  # 코드가 가르는 신호. 메시지 문장은 운영자용이다
    assert has_hangul(message) and "만들어졌을 수" in message and "예약된 게시물" in message


@pytest.mark.parametrize("body", [{}, {"id": ""}, {"id": None}, {"id": 9001}, {"post_id": "1_2"}], ids=["id-없음", "빈-id", "None", "숫자", "post_id만"])
def test_성공_응답에_id가_없으면_그렇다고_말한다(image, body):
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, CAPTION, PUBLISH_AT, session=photo_session(FakeResponse(200, body)))
    assert "성공(HTTP 2xx)으로 응답했지만 응답에 생성된 id가 없습니다" in str(caught.value)
    assert caught.value.maybe_created is True


def test_JSON이_아닌_응답은_본문_앞부분과_상태를_보여_준다(image):
    html = "<html>" + "x" * 500 + "</html>"
    response = FakeResponse(502, text=html, json_error=ValueError("Expecting value"))
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, CAPTION, PUBLISH_AT, session=photo_session(response))
    message = str(caught.value)
    assert "HTTP 502" in message
    assert html[:_N] + "…" in message and html[: _N + 1] not in message  # 통째로 싣지 않고 앞부분만


def test_연결_실패_메시지에는_예외_종류와_내용이_있다(image):
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, CAPTION, PUBLISH_AT, session=photo_session(TimeoutError("Read timed out")))
    message = str(caught.value)
    assert "사진 예약 게시 요청을 Facebook에 보내지 못했습니다 (TimeoutError: Read timed out)" in message
    assert "인터넷 연결을 확인하세요" in message


def test_이미지_파일을_열_수_없으면_요청_없이_GraphError(tmp_path):
    session = photo_session()
    missing = tmp_path / "없는-파일.jpg"
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, missing, CAPTION, PUBLISH_AT, session=session)
    message = str(caught.value)
    assert has_hangul(message) and str(missing) in message and "FileNotFoundError" in message
    assert "파일이 있는지, 읽을 권한이 있는지 확인하세요" in message
    assert caught.value.maybe_created is False  # 요청을 보내지 않았다
    # 파일 오류는 토큰을 담을 수 없으므로 원인을 남겨 둔다(네트워크 예외와 다르다).
    assert isinstance(caught.value.__cause__, FileNotFoundError)
    assert session.calls == []
    assert "만들어졌을 수" not in message  # 아무것도 보내지 않았다


def test_타임존_없는_예약_시각은_요청_없이_GraphError(image):
    # naive datetime의 timestamp()는 이 컴퓨터의 시간대로 조용히 해석된다. 몇 시간 어긋난 예약이 되므로 보내지 않는다.
    session = photo_session()
    naive = PUBLISH_AT.replace(tzinfo=None)
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, CAPTION, naive, session=session)
    assert has_hangul(str(caught.value)) and "타임존" in str(caught.value) and "publish_at" in str(caught.value)
    assert session.calls == []
    assert caught.value.maybe_created is False


# ── 토큰이 새지 않는다 ───────────────────────────────────────────────────────

LEAKY_ERROR = f"request failed, headers={{'Authorization': 'Bearer {SENTINEL}'}}"
LEAKY_API = f"Invalid OAuth access token {SENTINEL} - Cannot parse access token"

LEAK_SCENARIOS = [
    pytest.param(OSError(LEAKY_ERROR), id="연결-예외가-토큰을-담음"),
    pytest.param(FakeResponse(400, {"error": {"message": LEAKY_API, "code": 190}}), id="API-메시지가-토큰을-되풀이"),
    pytest.param(FakeResponse(200, {"error": {"message": LEAKY_API, "code": 190, "fbtrace_id": SENTINEL}}), id="200-오류가-토큰을-되풀이"),
    pytest.param(FakeResponse(400, {"error": LEAKY_API}), id="error가-문자열이고-토큰을-담음"),
    pytest.param(FakeResponse(502, text=f"<html>token={SENTINEL}</html>", json_error=ValueError(f"bad json near {SENTINEL}")), id="JSON이-아닌-본문이-토큰을-담음"),
    pytest.param(FakeResponse(200, {"id": None, "echo": SENTINEL}), id="id-없는-본문이-토큰을-담음"),
    pytest.param(FakeResponse(500, {"echo": SENTINEL}), id="오류-객체-없는-본문이-토큰을-담음"),
]
# 사진 예약에서는 성공 응답이라 예외가 없다. 토큰 점검에서만 의미가 있는 경우.
TOKEN_CHECK_ONLY_SCENARIOS = [
    pytest.param(FakeResponse(200, {"name": SENTINEL, "id": PAGE}), id="페이지-이름이-토큰"),
    # 돌아온 id는 "다른 페이지가 돌아왔습니다" 안내에 그대로 실린다. 이름과 똑같이 가려져야 한다.
    pytest.param(FakeResponse(200, {"id": SENTINEL, "name": "x"}), id="페이지-id가-토큰"),
]


def assert_no_leak(exc: BaseException):
    for item in chain(exc):
        assert SENTINEL not in str(item), f"{type(item).__name__}.str에 토큰이 들어 있다"
        assert SENTINEL not in repr(item), f"{type(item).__name__}.repr에 토큰이 들어 있다"
        assert not any(SENTINEL in str(arg) for arg in item.args)


@pytest.mark.parametrize("outcome", LEAK_SCENARIOS)
def test_토큰_값이_예외_메시지에_들어가지_않는다(image, outcome):
    session = photo_session(outcome)
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, CAPTION, PUBLISH_AT, session=session)
    assert_no_leak(caught.value)
    # 이 시험이 헛돌지 않는다는 보증: 토큰은 실제로 요청 헤더에 실려 나갔고, 시험 장치가 그것을 볼 수 있다.
    assert session.calls[0].kwargs["headers"]["Authorization"] == f"Bearer {SENTINEL}"
    assert_token_only_in_header(session)


@pytest.mark.parametrize("outcome", LEAK_SCENARIOS + TOKEN_CHECK_ONLY_SCENARIOS)
def test_토큰_값이_토큰_점검의_예외와_상태_메시지에도_들어가지_않는다(outcome):
    session = token_session(page=outcome)
    try:
        status = graph.check_token(SENTINEL, PAGE, session=session)
    except graph.GraphError as exc:
        assert_no_leak(exc)
    else:
        # API가 오류를 알려 준 경우에는 예외 대신 상태로 돌아온다. 그 안에도 토큰은 없다.
        assert SENTINEL not in status.message and SENTINEL not in repr(status)
    assert session.calls[0].kwargs["headers"]["Authorization"] == f"Bearer {SENTINEL}"
    assert_token_only_in_header(session)


# `assert_schedulable`에는 토큰 누출 시험이 없다. 그 함수는 토큰을 받지 않으므로 어떻게 고쳐도 실패할 수 없는
# 시험이 되기 때문이다(그 사실은 graph.py의 `assert_schedulable` 문서에 적어 두었다).


def token_fragments(token: str, length: int = 8) -> set[str]:
    """토큰에서 잘라 낸 `length`자 토막 전부. 하나라도 메시지에 남으면 가리기가 새는 것이다."""
    return {token[start:start + length] for start in range(len(token) - length + 1)}


# `_excerpt`를 부르는 자리는 네 곳이고 **자리마다 토큰을 넘겨야** 한다. 한 자리만 토큰을 빼먹어도 그 경로에서는
# 토큰 조각이 샌다. 그래서 네 자리를 한 묶음이 아니라 **케이스 하나씩** 겨눈다 — 한 자리만 되돌리면 그 케이스
# 하나만 빨개져야 한다. `증거`는 그 케이스가 겨눈 자리를 실제로 지났다는 표시다(응답 모양이 바뀌어 다른 분기로
# 흘러가면 가리기를 시험하지 않고도 통과할 수 있기 때문이다).
@pytest.mark.parametrize(("make_response", "증거"), [
    pytest.param(lambda body: FakeResponse(502, text=body, json_error=ValueError("Expecting value")),
                 "응답이 JSON이 아닙니다 (HTTP 502)", id="JSON이-아닌-본문"),
    pytest.param(lambda body: FakeResponse(200, ["목록"], text=body),
                 "응답이 JSON 객체가 아닙니다 (HTTP 200)", id="JSON-객체가-아닌-본문"),
    pytest.param(lambda body: FakeResponse(500, {"다른": "값"}, text=body),
                 "요청이 실패했습니다 (HTTP 500). 응답에 오류 내용이 없습니다", id="오류-객체-없는-실패-상태"),
    pytest.param(lambda body: FakeResponse(400, {"error": body}),
                 "Facebook이 거절했습니다 (HTTP 400)", id="error가-문자열"),
])
def test_토큰이_발췌_경계에_걸쳐도_토큰_조각이_남지_않는다(make_response, 증거):
    # 가리기보다 자르기가 먼저 일어나면 경계에 걸친 토큰의 앞부분만 남아 세 모양 어디에도 맞지 않는 조각이 메시지에 실린다.
    # (프록시·WAF의 오류 페이지가 Authorization 헤더를 되풀이하는 경우.) 가린 뒤에 자르면 남을 조각이 없다.
    body = "A" * (_N - 20) + SENTINEL
    session = token_session(page=make_response(body))
    try:
        rendered = graph.check_token(SENTINEL, PAGE, session=session).message
    except graph.GraphError as exc:
        rendered = "".join(f"{item}{item!r}" for item in chain(exc))
    assert 증거 in rendered
    assert SENTINEL not in rendered
    assert not [piece for piece in token_fragments(SENTINEL) if piece in rendered]


def test_응답_발췌_한도는_합당한_범위_안이다():
    # 한도가 터무니없이 크면 응답 본문이 통째로 운영자 메시지에 붙고(가려야 할 범위도 그만큼 넓어진다),
    # 너무 작으면 무슨 일이 있었는지 알 단서가 사라진다. 다른 발췌 시험은 상수를 읽어 쓰므로 값 자체는 여기서만 못 박는다.
    assert 100 <= graph._EXCERPT_LENGTH <= 300


def test_거절_예외도_토큰을_가리는_자리를_지난다():
    # `_Rejected`는 토큰이 범위에 있는 `_send` 안에서 만들어진다. 만드는 길 자체가 가리기를 지나야,
    # 나중에 누가 메시지나 reason에 응답 본문을 덧붙여도 토큰이 새지 않는다.
    rejected = graph._rejected(SENTINEL, f"거절 {SENTINEL}", reason=f"이유 {SENTINEL}", invalid_token=False)
    assert SENTINEL not in str(rejected) and SENTINEL not in rejected.reason
    assert "거절 ***" in str(rejected) and rejected.reason == "이유 ***"


def test_빈_토큰이어도_메시지가_망가지지_않는다(image):
    # "abc".replace("", "***")는 글자 사이사이에 별표를 끼워 넣는다. 지우기가 빈 문자열에는 일어나지 않아야 한다.
    response = FakeResponse(400, {"error": {"message": "An access token is required", "code": 104}})
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post("", PAGE, image, CAPTION, PUBLISH_AT, session=photo_session(response))
    assert "An access token is required" in str(caught.value) and "***" not in str(caught.value)


SPECIAL_TOKEN = "123|AbCd Ef+Gh/Ij=sentinel"  # URL에 실리면 원문·quote·quote_plus 세 모양이 서로 다르다


def test_토큰에_특수문자가_있으면_URL에_인코딩되어_실린_모양까지_가린다(image):
    forms = {SPECIAL_TOKEN, quote(SPECIAL_TOKEN, safe=""), quote_plus(SPECIAL_TOKEN)}
    assert len(forms) == 3
    leaky = OSError(f"Max retries exceeded with url: /v26.0/debug_token?input_token={quote(SPECIAL_TOKEN, safe='')}"
                    f"&access_token={quote_plus(SPECIAL_TOKEN)} raw={SPECIAL_TOKEN}")
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SPECIAL_TOKEN, PAGE, image, CAPTION, PUBLISH_AT, session=photo_session(leaky))
    for form in forms:
        assert form not in str(caught.value) and form not in repr(caught.value)
    assert str(caught.value).count("***") == 3


# 토큰이 여럿인 것은 집합 순회 순서가 문자열 해시에 따라 달라지기 때문이다: 정렬을 잃어도 한두 개는 우연히 통과하지만
# 열두 개가 모두 우연히 통과하기는 어렵다.
@pytest.mark.parametrize("token", [f"tok{n}%" for n in range(12)])
def test_인코딩된_모양이_원문을_부분_문자열로_품어도_조각이_남지_않게_긴_모양부터_가린다(image, token):
    # 토큰 "tok0%"의 인코딩 "tok0%25"는 원문 "tok0%"로 시작한다. 원문을 먼저 지우면 "***25"가 남는다.
    assert quote(token, safe="").startswith(token)
    leaky = OSError(f"Max retries exceeded with url: /x?input_token={quote(token, safe='')}&raw={token}")
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(token, PAGE, image, CAPTION, PUBLISH_AT, session=photo_session(leaky))
    assert "/x?input_token=***&raw=***" in str(caught.value)


def test_토큰이_메시지에_있으면_별표로_가린다(image):
    response = FakeResponse(400, {"error": {"message": f"bad {SENTINEL}", "code": 190}})
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, CAPTION, PUBLISH_AT, session=photo_session(response))
    assert "bad ***" in str(caught.value)


def test_연결_예외는_GraphError에_달려_나가지_않는다(image):
    # 원래 예외는 호출 스택에 토큰(요청 객체·헤더)을 들고 있을 수 있다. 메시지뿐 아니라 연쇄도 끊는다.
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, CAPTION, PUBLISH_AT, session=photo_session(OSError(LEAKY_ERROR)))
    assert caught.value.__cause__ is None and caught.value.__context__ is None


# ── requests 의존 ────────────────────────────────────────────────────────────


def test_graph는_requests를_모듈_수준에서_import하지_않는다():
    # requests를 import할 수 없는 상태(sys.modules[...] = None)에서 새 인터프리터로 graph를 가져온다.
    # importlib.reload는 쓰지 않는다: 이 프로세스의 graph.GraphError가 새 클래스로 바뀌어, 이미 `from facebook.graph import
    # GraphError`를 한 다른 시험 파일(Task 9·10)의 pytest.raises가 틀어지기 때문이다.
    scripts_dir = Path(__file__).resolve().parents[2]
    program = (
        "import sys\n"
        "sys.modules['requests'] = None\n"
        "try:\n"
        "    import requests\n"
        "except ImportError:\n"
        "    pass\n"
        "else:\n"
        "    raise SystemExit('차단 장치가 작동하지 않는다')\n"
        f"sys.path.insert(0, {str(scripts_dir)!r})\n"
        "import facebook.graph\n"
        "assert sys.modules['requests'] is None\n"
    )
    result = subprocess.run([sys.executable, "-I", "-c", program], capture_output=True, text=True, timeout=60)
    assert result.returncode == 0, result.stderr
