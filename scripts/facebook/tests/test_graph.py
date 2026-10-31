"""Graph API 클라이언트(graph.py) 테스트.

**실제 네트워크 호출은 하지 않는다.** `requests.Session` 자리에는 가짜 세션이 들어가고, 모든 테스트에 걸린
`_네트워크_차단` 장치가 소켓 연결 시도 자체를 실패시킨다(가짜 세션을 거치지 않고 새 연결을 여는 코드가 생기면 바로 드러난다).

토큰 자리에는 `SENTINEL`만 쓴다. 진짜 토큰이 아니라, 어디로든 새면 찾아낼 수 있게 일부러 눈에 띄게 만든 값이다.
"""

from __future__ import annotations

import dataclasses
import socket
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone, tzinfo
from pathlib import Path

import pytest

from facebook import config, graph

SENTINEL = "EAAZ-SENTINEL-not-a-real-token-7c41e9d2b8"
PAGE = "100200300"  # config.PAGE_ID와 일부러 다르다: 코드가 인자를 쓰는지 상수를 쓰는지 가른다
BASE = f"https://graph.facebook.com/{config.GRAPH_VERSION}"
JST = timezone(timedelta(hours=9))
NOW = datetime(2026, 11, 1, 12, 0, tzinfo=JST)
PUBLISH_AT = datetime(2026, 11, 1, 19, 0, tzinfo=JST)
PUBLISH_UNIX = "1793527200"  # 2026-11-01T10:00:00Z. `date -u`와 파이썬 두 갈래로 따로 계산한 값
MESSAGE = "본문 Xin chào"

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


def permissions_body(granted=ALL_PERMISSIONS, **other_status):
    data = [{"permission": name, "status": "granted"} for name in granted]
    data += [{"permission": name, "status": status} for name, status in other_status.items()]
    return {"data": data}


def token_session(*, name="정우인재개발원", permissions=None, page=None) -> FakeSession:
    """check_token이 부르는 두 곳(페이지 이름, 권한 목록)에 답하는 가짜 세션."""
    return FakeSession({
        ("GET", f"{BASE}/{PAGE}"): page if page is not None else FakeResponse(200, {"name": name, "id": PAGE}),
        ("GET", f"{BASE}/me/permissions"): permissions if permissions is not None else FakeResponse(200, permissions_body()),
    })


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


# ── check_token ──────────────────────────────────────────────────────────────


def test_권한이_모두_있으면_ok():
    status = graph.check_token(SENTINEL, PAGE, session=token_session(name="정우인재개발원"))
    assert status.ok is True
    assert status.page_name == "정우인재개발원"
    assert status.missing_permissions == ()
    assert has_hangul(status.message) and "정우인재개발원" in status.message


def test_TokenStatus는_바꿀_수_없다():
    status = graph.check_token(SENTINEL, PAGE, session=token_session())
    with pytest.raises(dataclasses.FrozenInstanceError):
        status.ok = False


def test_check_token은_GET으로_페이지와_권한을_묻고_토큰은_헤더에만_싣는다():
    session = token_session()
    graph.check_token(SENTINEL, PAGE, session=session)
    assert [(c.verb, c.url) for c in session.calls] == [("GET", f"{BASE}/{PAGE}"), ("GET", f"{BASE}/me/permissions")]
    assert session.calls[0].kwargs["params"] == {"fields": "name"}
    assert not session.calls[1].kwargs.get("params")
    for call in session.calls:
        # 토큰은 헤더에만 있다. URL·쿼리·본문에 있으면 요청 오류 메시지와 로그로 새기 쉽다.
        assert call.kwargs["headers"] == {"Authorization": f"Bearer {SENTINEL}"}
        assert call.kwargs["timeout"] == config.GRAPH_TIMEOUT
        assert SENTINEL not in call.url
        assert SENTINEL not in repr(call.kwargs.get("params")) and "data" not in call.kwargs and "files" not in call.kwargs


def test_권한이_빠지면_missing_permissions에_담긴다():
    session = token_session(permissions=FakeResponse(200, permissions_body(["pages_show_list", "pages_read_engagement"])))
    status = graph.check_token(SENTINEL, PAGE, session=session)
    assert status.ok is False
    assert status.missing_permissions == ("pages_manage_posts",)
    assert status.page_name == "정우인재개발원"
    assert "pages_manage_posts" in status.message
    # 가지고 있는 권한은 빠졌다고 말하지 않는다.
    assert "pages_show_list" not in status.message and "pages_read_engagement" not in status.message


@pytest.mark.parametrize("state", ["declined", "expired"])
def test_거절되거나_만료된_권한은_빠진_것으로_센다(state):
    body = permissions_body(["pages_show_list", "pages_read_engagement"], pages_manage_posts=state)
    status = graph.check_token(SENTINEL, PAGE, session=token_session(permissions=FakeResponse(200, body)))
    assert status.ok is False and status.missing_permissions == ("pages_manage_posts",)


def test_권한이_하나도_없으면_세_개_모두_필요한_순서대로_빠진_것이다():
    status = graph.check_token(SENTINEL, PAGE, session=token_session(permissions=FakeResponse(200, {"data": []})))
    assert status.ok is False
    assert status.missing_permissions == ALL_PERMISSIONS


def test_빠진_권한은_알파벳순이_아니라_REQUIRED_PERMISSIONS의_순서로_담긴다(monkeypatch):
    monkeypatch.setattr(graph, "REQUIRED_PERMISSIONS", ("zeta_permission", "alpha_permission"))
    monkeypatch.setattr(graph, "_PERMISSION_HELP", {"zeta_permission": "제타", "alpha_permission": "알파"})
    status = graph.check_token(SENTINEL, PAGE, session=token_session(permissions=FakeResponse(200, {"data": []})))
    assert status.missing_permissions == ("zeta_permission", "alpha_permission")
    assert status.message.index("zeta_permission(제타)") < status.message.index("alpha_permission(알파)")


def test_더_많이_받은_권한은_문제가_아니다():
    body = permissions_body([*ALL_PERMISSIONS, "email", "public_profile"])
    status = graph.check_token(SENTINEL, PAGE, session=token_session(permissions=FakeResponse(200, body)))
    assert status.ok is True and status.missing_permissions == ()


def test_빠진_권한_안내는_권한이_무엇이고_어떻게_고치는지_말한다():
    session = token_session(permissions=FakeResponse(200, {"data": []}))
    message = graph.check_token(SENTINEL, PAGE, session=session).message
    assert has_hangul(message) and "'정우인재개발원'" in message
    for name, help_text in (("pages_manage_posts", "글과 사진 올리기"),
                            ("pages_read_engagement", "게시물 읽기"),
                            ("pages_show_list", "페이지 목록 보기")):
        assert name in message and help_text in message  # 영문 권한 이름만 던지지 않고 뜻을 한국어로 풀어 준다
    # 어떻게 하면 되는지: 토큰을 다시 발급받아 어디에 넣는지.
    assert "다시 발급" in message or "새로 발급" in message
    assert config.TOKEN_ENV_NAME in message and str(config.ENV_PATH) in message
    assert "scope" not in message.lower()  # 개발자 용어를 모르는 사람이 읽는 글이다


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
    assert len(session.calls) == 1  # 페이지 조회가 거절됐으니 권한 조회는 하지 않는다


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


def test_권한_조회에서_토큰_무효를_알려도_페이지_이름은_남고_재발급을_안내한다():
    expired = FakeResponse(400, {"error": {"message": "Error validating access token: Session has expired", "code": 190}})
    status = graph.check_token(SENTINEL, PAGE, session=token_session(permissions=expired))
    assert status.ok is False and status.page_name == "정우인재개발원"
    assert "유효하지 않" in status.message and "새로 발급" in status.message and "Session has expired" in status.message


def test_error가_문자열인_거절도_ok_False이고_토큰_무효로_단정하지_않는다():
    status = graph.check_token(SENTINEL, PAGE, session=token_session(page=FakeResponse(400, {"error": "Something went wrong"})))
    assert status.ok is False and "Something went wrong" in status.message and "유효하지 않" not in status.message


def test_권한_조회가_거절되면_ok_False이고_이미_알아낸_페이지_이름은_남긴다():
    denied = FakeResponse(400, {"error": {"message": "Tried accessing nonexisting field (permissions)", "code": 100}})
    status = graph.check_token(SENTINEL, PAGE, session=token_session(permissions=denied))
    assert status.ok is False
    assert status.page_name == "정우인재개발원"
    assert status.missing_permissions == ()
    assert "Tried accessing nonexisting field" in status.message and "code 100" in status.message
    assert "권한 조회 요청을 Facebook이 거절했습니다 (HTTP 400)" in status.message


def test_페이지_이름이_응답에_없으면_page_name은_None이고_안내는_page_id를_쓴다():
    status = graph.check_token(SENTINEL, PAGE, session=token_session(page=FakeResponse(200, {"id": PAGE})))
    assert status.ok is True and status.page_name is None
    assert PAGE in status.message


@pytest.mark.parametrize("name", ["", None, 123], ids=["빈-문자열", "None", "숫자"])
def test_페이지_이름이_문자열이_아니거나_비었으면_None으로_본다(name):
    status = graph.check_token(SENTINEL, PAGE, session=token_session(page=FakeResponse(200, {"name": name, "id": PAGE})))
    assert status.page_name is None and PAGE in status.message


@pytest.mark.parametrize("failure", [
    pytest.param(OSError("Max retries exceeded"), id="연결-실패"),
    pytest.param(FakeResponse(502, text="<html>Bad Gateway</html>", json_error=ValueError("Expecting value")), id="JSON이-아닌-502"),
    pytest.param(FakeResponse(200, text="not json", json_error=ValueError("Expecting value")), id="JSON이-아닌-200"),
    pytest.param(FakeResponse(200, ["data"]), id="JSON-객체가-아님"),
    pytest.param(FakeResponse(503, {"unexpected": True}), id="오류-객체-없는-503"),
])
@pytest.mark.parametrize("which", ["page", "permissions"])
def test_답을_받지_못하면_ok_False가_아니라_GraphError(failure, which):
    # "토큰이 나쁘다"와 "Facebook에 닿지 못했다"는 다르다. 후자를 ok=False로 돌려주면 멀쩡한 토큰을 새로 발급하게 된다.
    session = token_session(**{which: failure})
    with pytest.raises(graph.GraphError) as caught:
        graph.check_token(SENTINEL, PAGE, session=session)
    assert has_hangul(str(caught.value))


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


@pytest.mark.parametrize("body", [{"data": "pages_manage_posts"}, {"paging": {}}, {"data": None}], ids=["data가-문자열", "data-없음", "data가-None"])
def test_권한_목록_응답이_예상과_다르면_GraphError(body):
    with pytest.raises(graph.GraphError) as caught:
        graph.check_token(SENTINEL, PAGE, session=token_session(permissions=FakeResponse(200, body)))
    assert has_hangul(str(caught.value)) and "권한" in str(caught.value)


def test_권한_목록에_모양이_이상한_항목이_섞여도_멈추지_않고_받지_못한_것으로_센다():
    body = {"data": ["pages_manage_posts", None, {"permission": "pages_show_list"}, {"status": "granted"},
                     {"permission": "pages_read_engagement", "status": "granted"}]}
    status = graph.check_token(SENTINEL, PAGE, session=token_session(permissions=FakeResponse(200, body)))
    assert status.missing_permissions == ("pages_manage_posts", "pages_show_list")


# ── assert_schedulable ───────────────────────────────────────────────────────


def test_10분_이내_예약이면_GraphError():
    with pytest.raises(graph.GraphError) as caught:
        graph.assert_schedulable(NOW + timedelta(minutes=5), NOW)
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
    assert "이미 지난" in message and "보다 2시간 앞)" in message and "너무 가깝" not in message
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


# ── schedule_photo_post ──────────────────────────────────────────────────────


def test_schedule_photo_post가_published_false와_scheduled_publish_time을_보낸다(image):
    session = photo_session()
    graph.schedule_photo_post(SENTINEL, PAGE, image, MESSAGE, PUBLISH_AT, session=session)
    (call,) = session.calls
    # 전송되는 값은 문자열이다(멀티파트 필드). 파이썬 False를 그대로 넘기면 requests가 "False"로 적는다.
    # 정확한 모양을 못 박아 두어야 토큰이나 다른 필드가 몰래 끼어들지도 못한다.
    assert call.kwargs["data"] == {"message": MESSAGE, "published": "false", "scheduled_publish_time": PUBLISH_UNIX}


def test_예약_시각은_정수_유닉스_초이고_오프셋과_상관없이_같은_순간이면_같다(image):
    for publish_at in (PUBLISH_AT, PUBLISH_AT.astimezone(timezone.utc), PUBLISH_AT.astimezone(timezone(timedelta(hours=-8)))):
        session = photo_session()
        graph.schedule_photo_post(SENTINEL, PAGE, image, MESSAGE, publish_at, session=session)
        assert session.calls[0].kwargs["data"]["scheduled_publish_time"] == PUBLISH_UNIX


def test_1초_미만은_버리고_초_단위로_보낸다(image):
    session = photo_session()
    graph.schedule_photo_post(SENTINEL, PAGE, image, MESSAGE, PUBLISH_AT.replace(microsecond=999999), session=session)
    assert session.calls[0].kwargs["data"]["scheduled_publish_time"] == PUBLISH_UNIX


def test_schedule_photo_post는_POST로_페이지의_photos에_보내고_토큰은_헤더에만_싣는다(image):
    session = photo_session()
    graph.schedule_photo_post(SENTINEL, PAGE, image, MESSAGE, PUBLISH_AT, session=session)
    (call,) = session.calls
    assert (call.verb, call.url) == ("POST", f"{BASE}/{PAGE}/photos")
    assert call.kwargs["headers"] == {"Authorization": f"Bearer {SENTINEL}"}
    assert call.kwargs["timeout"] == config.GRAPH_TIMEOUT
    assert SENTINEL not in call.url and SENTINEL not in repr(call.kwargs["data"]) and "params" not in call.kwargs


def test_이미지는_source_필드로_이름과_형식과_내용을_실어_보내고_호출_뒤에_닫는다(tmp_path):
    for filename, content_type in (("a.jpg", "image/jpeg"), ("b.jpeg", "image/jpeg"), ("c.png", "image/png")):
        path = tmp_path / filename
        path.write_bytes(b"bytes-of-" + filename.encode())
        session = photo_session()
        graph.schedule_photo_post(SENTINEL, PAGE, path, MESSAGE, PUBLISH_AT, session=session)
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
    graph.schedule_photo_post(SENTINEL, PAGE, path, MESSAGE, PUBLISH_AT, session=session)
    assert session.calls[0].upload["content_type"] == "application/octet-stream"


def test_요청이_실패해도_이미지_파일은_닫힌다(image):
    session = photo_session(OSError("boom"))
    with pytest.raises(graph.GraphError):
        graph.schedule_photo_post(SENTINEL, PAGE, image, MESSAGE, PUBLISH_AT, session=session)
    assert session.calls[0].upload["handle"].closed


def test_성공하면_응답의_id를_문자열로_돌려준다(image):
    session = photo_session(FakeResponse(200, {"id": "1234567890", "post_id": "100200300_555"}))
    assert graph.schedule_photo_post(SENTINEL, PAGE, image, MESSAGE, PUBLISH_AT, session=session) == "1234567890"


@pytest.mark.parametrize("response", [
    pytest.param(FakeResponse(400, {"error": {"message": "(#100) Invalid parameter", "type": "OAuthException", "code": 100,
                                               "error_subcode": 1366046, "fbtrace_id": "TRACE9"}}), id="HTTP-오류와-error-객체"),
    pytest.param(FakeResponse(200, {"error": {"message": "(#100) Invalid parameter", "type": "OAuthException", "code": 100,
                                               "error_subcode": 1366046, "fbtrace_id": "TRACE9"}}), id="HTTP-200인데-error-객체"),
])
def test_API가_오류를_주면_GraphError에_한국어_설명(image, response):
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, MESSAGE, PUBLISH_AT, session=photo_session(response))
    message = str(caught.value)
    assert has_hangul(message)
    assert "(#100) Invalid parameter [code 100, subcode 1366046, fbtrace_id TRACE9]" in message   # API가 한 말 그대로
    assert f"사진 예약 게시 요청을 Facebook이 거절했습니다 (HTTP {response.status_code})" in message  # 무엇을, 어떤 상태로
    # Facebook이 분명히 거절했으니 "만들어졌을 수도 있다"는 안내는 붙이지 않는다.
    assert "만들어졌을 수" not in message


@pytest.mark.parametrize("status", [200, 201, 299])
def test_2xx는_모두_성공으로_본다(image, status):
    session = photo_session(FakeResponse(status, {"id": "9001"}))
    assert graph.schedule_photo_post(SENTINEL, PAGE, image, MESSAGE, PUBLISH_AT, session=session) == "9001"


@pytest.mark.parametrize("status", [199, 300, 301, 404])
def test_2xx가_아니면_본문이_멀쩡해도_실패다(image, status):
    session = photo_session(FakeResponse(status, {"id": "9001"}))
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, MESSAGE, PUBLISH_AT, session=session)
    assert f"HTTP {status}" in str(caught.value)


def test_빈_error_객체도_거절이다(image):
    # error 키가 있으면 내용이 비어도 Facebook이 거절한 것이다. 성공으로 읽고 id를 찾다가 엉뚱한 메시지를 내면 안 된다.
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, MESSAGE, PUBLISH_AT, session=photo_session(FakeResponse(200, {"error": {}})))
    assert "거절했습니다" in str(caught.value) and "메시지 없음" in str(caught.value)


@pytest.mark.parametrize("raised", [RuntimeError("버그"), KeyError("x"), TypeError("잘못된 인자")])
def test_OSError가_아닌_예외는_네트워크_문제로_둔갑시키지_않고_그대로_올라간다(image, raised):
    with pytest.raises(type(raised)):
        graph.schedule_photo_post(SENTINEL, PAGE, image, MESSAGE, PUBLISH_AT, session=photo_session(raised))
    with pytest.raises(type(raised)):
        graph.check_token(SENTINEL, PAGE, session=token_session(page=raised))


def test_JSON_객체가_아닌_응답은_상태와_본문_앞부분을_말한다(image):
    response = FakeResponse(200, ["id"], text='["id"]')
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, MESSAGE, PUBLISH_AT, session=photo_session(response))
    assert '사진 예약 게시에 대한 Facebook의 응답이 JSON 객체가 아닙니다 (HTTP 200). 응답 앞부분: ["id"]' in str(caught.value)


def test_JSON이_아닌_응답의_메시지는_상태와_본문_앞부분을_말한다(image):
    response = FakeResponse(200, text="ok", json_error=ValueError("Expecting value"))
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, MESSAGE, PUBLISH_AT, session=photo_session(response))
    assert "사진 예약 게시에 대한 Facebook의 응답이 JSON이 아닙니다 (HTTP 200). 응답 앞부분: ok" in str(caught.value)


def test_json_해석에서_ValueError가_아닌_예외는_가리지_않고_올라간다(image):
    response = FakeResponse(200, json_error=RuntimeError("버그"))
    with pytest.raises(RuntimeError):
        graph.schedule_photo_post(SENTINEL, PAGE, image, MESSAGE, PUBLISH_AT, session=photo_session(response))


def test_error가_딕셔너리가_아니어도_GraphError(image):
    response = FakeResponse(400, {"error": "Something went wrong"})
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, MESSAGE, PUBLISH_AT, session=photo_session(response))
    assert "Something went wrong" in str(caught.value) and has_hangul(str(caught.value))


def test_code가_0이어도_적는다(image):
    response = FakeResponse(400, {"error": {"message": "m", "code": 0}})
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, MESSAGE, PUBLISH_AT, session=photo_session(response))
    assert "m [code 0]" in str(caught.value)


def test_error에_message가_없어도_GraphError이고_없다고_적는다(image):
    response = FakeResponse(400, {"error": {"code": 2}})
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, MESSAGE, PUBLISH_AT, session=photo_session(response))
    assert "code 2" in str(caught.value) and "메시지 없음" in str(caught.value)


def test_오류_객체_없이_HTTP_상태만_실패면_상태_코드를_말한다(image):
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, MESSAGE, PUBLISH_AT,
                                  session=photo_session(FakeResponse(500, {"ok": False}, text='{"ok": false}')))
    assert '요청이 실패했습니다 (HTTP 500). 응답에 오류 내용이 없습니다. 응답 앞부분: {"ok": false}' in str(caught.value)
    assert has_hangul(str(caught.value))


@pytest.mark.parametrize("outcome", [
    pytest.param(OSError("Connection reset by peer"), id="연결-실패"),
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
        graph.schedule_photo_post(SENTINEL, PAGE, image, MESSAGE, PUBLISH_AT, session=photo_session(outcome))
    message = str(caught.value)
    assert has_hangul(message) and "만들어졌을 수" in message and "예약된 게시물" in message


@pytest.mark.parametrize("body", [{}, {"id": ""}, {"id": None}, {"id": 9001}, {"post_id": "1_2"}], ids=["id-없음", "빈-id", "None", "숫자", "post_id만"])
def test_성공_응답에_id가_없으면_그렇다고_말한다(image, body):
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, MESSAGE, PUBLISH_AT, session=photo_session(FakeResponse(200, body)))
    assert "성공(HTTP 2xx)으로 응답했지만 응답에 생성된 id가 없습니다" in str(caught.value)


def test_JSON이_아닌_응답은_본문_앞부분과_상태를_보여_준다(image):
    html = "<html>" + "x" * 500 + "</html>"
    response = FakeResponse(502, text=html, json_error=ValueError("Expecting value"))
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, MESSAGE, PUBLISH_AT, session=photo_session(response))
    message = str(caught.value)
    assert "HTTP 502" in message
    assert html[:_N] + "…" in message and html[: _N + 1] not in message  # 통째로 싣지 않고 앞부분만


def test_연결_실패_메시지에는_예외_종류와_내용이_있다(image):
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, MESSAGE, PUBLISH_AT, session=photo_session(TimeoutError("Read timed out")))
    message = str(caught.value)
    assert "사진 예약 게시 요청을 Facebook에 보내지 못했습니다 (TimeoutError: Read timed out)" in message
    assert "인터넷 연결을 확인하세요" in message


def test_이미지_파일을_열_수_없으면_요청_없이_GraphError(tmp_path):
    session = photo_session()
    missing = tmp_path / "없는-파일.jpg"
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, missing, MESSAGE, PUBLISH_AT, session=session)
    message = str(caught.value)
    assert has_hangul(message) and str(missing) in message and "FileNotFoundError" in message
    assert "파일이 있는지, 읽을 권한이 있는지 확인하세요" in message
    # 파일 오류는 토큰을 담을 수 없으므로 원인을 남겨 둔다(네트워크 예외와 다르다).
    assert isinstance(caught.value.__cause__, FileNotFoundError)
    assert session.calls == []
    assert "만들어졌을 수" not in message  # 아무것도 보내지 않았다


def test_타임존_없는_예약_시각은_요청_없이_GraphError(image):
    # naive datetime의 timestamp()는 이 컴퓨터의 시간대로 조용히 해석된다. 몇 시간 어긋난 예약이 되므로 보내지 않는다.
    session = photo_session()
    naive = PUBLISH_AT.replace(tzinfo=None)
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, MESSAGE, naive, session=session)
    assert has_hangul(str(caught.value)) and "타임존" in str(caught.value) and "publish_at" in str(caught.value)
    assert session.calls == []


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
        graph.schedule_photo_post(SENTINEL, PAGE, image, MESSAGE, PUBLISH_AT, session=session)
    assert_no_leak(caught.value)
    # 이 시험이 헛돌지 않는다는 보증: 토큰은 실제로 요청 헤더에 실려 나갔고, 시험 장치가 그것을 볼 수 있다.
    assert session.calls[0].kwargs["headers"]["Authorization"] == f"Bearer {SENTINEL}"


@pytest.mark.parametrize("outcome", LEAK_SCENARIOS + TOKEN_CHECK_ONLY_SCENARIOS)
@pytest.mark.parametrize("which", ["page", "permissions"])
def test_토큰_값이_토큰_점검의_예외와_상태_메시지에도_들어가지_않는다(outcome, which):
    session = token_session(**{which: outcome})
    try:
        status = graph.check_token(SENTINEL, PAGE, session=session)
    except graph.GraphError as exc:
        assert_no_leak(exc)
    else:
        # API가 오류를 알려 준 경우에는 예외 대신 상태로 돌아온다. 그 안에도 토큰은 없다.
        assert SENTINEL not in status.message and SENTINEL not in repr(status)
    assert session.calls[0].kwargs["headers"]["Authorization"] == f"Bearer {SENTINEL}"


def test_assert_schedulable_메시지에도_토큰이_없다():
    # 이 함수는 토큰을 받지 않는다. 시각만 있는 메시지에 토큰이 생길 길이 없음을 못 박는다.
    with pytest.raises(graph.GraphError) as caught:
        graph.assert_schedulable(NOW, NOW)
    assert_no_leak(caught.value)


def test_빈_토큰이어도_메시지가_망가지지_않는다(image):
    # "abc".replace("", "***")는 글자 사이사이에 별표를 끼워 넣는다. 지우기가 빈 문자열에는 일어나지 않아야 한다.
    response = FakeResponse(400, {"error": {"message": "An access token is required", "code": 104}})
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post("", PAGE, image, MESSAGE, PUBLISH_AT, session=photo_session(response))
    assert "An access token is required" in str(caught.value) and "***" not in str(caught.value)


def test_토큰이_메시지에_있으면_별표로_가린다(image):
    response = FakeResponse(400, {"error": {"message": f"bad {SENTINEL}", "code": 190}})
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, MESSAGE, PUBLISH_AT, session=photo_session(response))
    assert "bad ***" in str(caught.value)


def test_연결_예외는_GraphError에_달려_나가지_않는다(image):
    # 원래 예외는 호출 스택에 토큰(요청 객체·헤더)을 들고 있을 수 있다. 메시지뿐 아니라 연쇄도 끊는다.
    with pytest.raises(graph.GraphError) as caught:
        graph.schedule_photo_post(SENTINEL, PAGE, image, MESSAGE, PUBLISH_AT, session=photo_session(OSError(LEAKY_ERROR)))
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
