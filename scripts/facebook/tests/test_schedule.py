"""예약 실행·결과 기록·재실행 안전성(schedule.py) 테스트.

**실제 네트워크 호출은 하지 않는다.** `requests.Session` 자리에는 가짜 세션이 들어가고, 모든 테스트에 걸린
`_네트워크_차단` 장치가 소켓 연결 시도 자체를 실패시킨다. `graph.schedule_photo_post`는 가짜로 바꾸지 않고
**진짜를 가짜 세션 위에서** 돌린다 — `maybe_created`가 참인 실패와 거짓인 실패는 시험이 흉내 낸 값이 아니라
`graph`가 실제 응답 모양에서 판정한 값이어야, 이 모듈이 둘을 가르는 선이 진짜 선이다.

토큰 자리에는 `SENTINEL`만 쓴다. 진짜 토큰이 아니라, 어디로든 새면 찾아낼 수 있게 일부러 눈에 띄게 만든 값이다.

원장(`scheduled.json`)에 들어가는 값은 둘뿐이다: 사진 id와 `"결과 불명"`. 요청이 나가지 않은 실패는 적지 않는다.
이 비대칭이 이 모듈의 핵심이라 시험도 두 방향을 모두 짚는다.
"""

from __future__ import annotations

import dataclasses
import errno
import fcntl
import json
import os
import signal
import socket
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from facebook import config, schedule
from facebook.findings import Finding
from facebook.plan_model import Plan, load_plan

FIXTURE = Path(__file__).parent / "fixtures" / "plan-valid.json"
SENTINEL = "EAAZ-SENTINEL-not-a-real-token-7c41e9d2b8"
JST = timezone(timedelta(hours=9))
NOW = datetime(2026, 10, 31, 12, 0, tzinfo=JST)  # 플랜의 첫 게시(11-01 19:00)보다 31시간 앞. 여섯 건 모두 창 안이다.
PHOTOS_URL = f"https://graph.facebook.com/{config.GRAPH_VERSION}/{config.PAGE_ID}/photos"
UNKNOWN = "결과 불명"

ERROR_A = Finding("error", "금지표현", 3, "게시물 3에 금지 표현이 있습니다.")
ERROR_B = Finding("error", "이미지없음", 4, "게시물 4의 이미지 파일이 없습니다.")
WARNING = Finding("warning", "역번역중복", 1, "게시물 1의 되번역이 다른 게시물과 같습니다.")


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
    number: int  # 0부터
    url: str
    headers: dict
    data: dict
    filename: str
    content: bytes


def photo_id(filename: str) -> str:
    """가짜 세션이 성공 응답에 싣는 사진 id. 이미지 파일 이름에서 만들어, 원장의 값이 어느 게시물의 것인지 읽힌다."""
    return f"photo-{filename}"


class FakeSession:
    """`script`: {호출 번호(0부터): FakeResponse | 던질 예외}. 없는 번호는 성공하고 `photo_id(파일 이름)`을 돌려준다.

    `on_call(번호)`는 호출이 도착한 바로 그 순간(응답을 정하기 전)에 불린다 — 그때의 원장 파일을 들여다보는 데 쓴다.
    """

    def __init__(self, script: dict | None = None, *, on_call=None):
        self.script = script or {}
        self.on_call = on_call
        self.calls: list[Call] = []

    def post(self, url, **kwargs):
        filename, handle, _content_type = kwargs["files"]["source"]
        call = Call(len(self.calls), url, kwargs["headers"], kwargs["data"], filename, handle.read())
        self.calls.append(call)
        if self.on_call is not None:
            self.on_call(call.number)
        outcome = self.script.get(call.number)
        if isinstance(outcome, BaseException):
            raise outcome
        return outcome if outcome is not None else FakeResponse(200, {"id": photo_id(filename)})

    def get(self, url, **kwargs):
        raise AssertionError("예약 실행은 GET을 부르지 않는다")

    @property
    def uploaded(self) -> list[str]:
        """올라간 이미지 파일 이름, 호출 순서대로."""
        return [call.filename for call in self.calls]


@pytest.fixture(autouse=True)
def _네트워크_차단(monkeypatch):
    """어떤 테스트도 실제 소켓을 열 수 없다. 가짜 세션을 우회하는 코드가 있으면 여기서 실패한다."""

    def refuse(*args, **kwargs):
        raise AssertionError("테스트가 실제 네트워크 연결을 시도했습니다")

    monkeypatch.setattr(socket.socket, "connect", refuse)
    monkeypatch.setattr(socket, "create_connection", refuse)
    monkeypatch.setattr(socket, "getaddrinfo", refuse)


# ── 도우미 ───────────────────────────────────────────────────────────────────


@dataclass
class Env:
    plan: Plan
    images: Path
    ledger: Path

    def run(self, session, *, plan: Plan | None = None, findings=(), dry_run: bool = False, now: datetime = NOW):
        return schedule.run(
            plan or self.plan, list(findings), self.images, self.ledger,
            token=SENTINEL, session=session, now=now, dry_run=dry_run,
        )

    def saved(self) -> dict:
        """원장 파일에 디스크에 실제로 적힌 내용(JSON을 그대로 읽은 것)."""
        return json.loads(self.ledger.read_text(encoding="utf-8"))

    def post(self, index: int):
        return self.plan.posts[index]

    def id_of(self, index: int) -> str:
        return photo_id(self.post(index).image_file)


@pytest.fixture
def env(tmp_path) -> Env:
    """여섯 건짜리 유효한 플랜과, 게시물마다 내용이 다른 이미지 파일이 든 폴더. 원장은 아직 없다."""
    plan = load_plan(FIXTURE)
    images = tmp_path / "images"
    images.mkdir()
    for post in plan.posts:
        (images / post.image_file).write_bytes(f"이미지-{post.index}".encode())
    return Env(plan=plan, images=images, ledger=tmp_path / "scheduled.json")


def with_publish_at(plan: Plan, index: int, publish_at: datetime) -> Plan:
    posts = tuple(dataclasses.replace(p, publish_at=publish_at) if p.index == index else p for p in plan.posts)
    return dataclasses.replace(plan, posts=posts)


def has_hangul(text: str) -> bool:
    return any("가" <= char <= "힣" for char in text)


# 요청은 나갔지만 결과를 알 수 없는 응답들(`graph`가 `maybe_created=True`로 판정하는 모양). 예약이 만들어졌을 수 있다.
UNKNOWN_RESULT_SCENARIOS = [
    pytest.param(TimeoutError("read timed out"), id="시간초과"),
    pytest.param(FakeResponse(200, text="<html>점검 중</html>", json_error=ValueError("not json")), id="JSON아님"),
    pytest.param(FakeResponse(500, text="Internal Server Error", json_error=ValueError("not json")), id="오류내용없는5xx"),
    pytest.param(FakeResponse(502, {"error": {"message": "Bad gateway", "code": 2}}), id="오류객체가있는5xx"),
    pytest.param(FakeResponse(200, {}), id="성공인데id없음"),
]

# Facebook이 분명히 거절한 응답들(`maybe_created=False`). 아무것도 만들어지지 않았으므로 다시 시도해도 안전하다.
REJECTED_SCENARIOS = [
    pytest.param(FakeResponse(400, {"error": {"message": "Invalid parameter", "code": 100}}), id="잘못된인자"),
    pytest.param(FakeResponse(403, {"error": {"message": "Permissions error", "code": 200}}), id="권한없음"),
]


# ── 테스트 장치 자체 ─────────────────────────────────────────────────────────


def test_네트워크_차단_장치가_실제로_소켓_연결을_막는다():
    with pytest.raises(AssertionError, match="네트워크"):
        socket.create_connection(("graph.facebook.com", 443))
    with pytest.raises(AssertionError, match="네트워크"):
        socket.getaddrinfo("graph.facebook.com", 443)
    with socket.socket() as sock, pytest.raises(AssertionError, match="네트워크"):
        sock.connect(("127.0.0.1", 9))


def test_Outcome은_바꿀_수_없고_필드가_정해져_있다():
    outcome = schedule.Outcome(index=0, ok=True, post_id="1_2", error=None)
    assert [f.name for f in dataclasses.fields(schedule.Outcome)] == ["index", "ok", "post_id", "error"]
    with pytest.raises(dataclasses.FrozenInstanceError):
        outcome.ok = False


def test_결과_불명_표지는_운영_문서가_기대하는_글자_그대로다():
    # 운영자가 `scheduled.json`에서 이 글자를 찾아 지운다(운영 문서). 글자가 바뀌면 문서와 어긋난다.
    assert schedule.UNKNOWN_RESULT == UNKNOWN


# ── load_ledger ──────────────────────────────────────────────────────────────


def test_원장이_없으면_빈_dict(tmp_path):
    assert schedule.load_ledger(tmp_path / "scheduled.json") == {}


def test_원장은_index를_정수로_돌려준다(tmp_path):
    path = tmp_path / "scheduled.json"
    path.write_text(json.dumps({"0": "100_1", "12": UNKNOWN}, ensure_ascii=False), encoding="utf-8")
    assert schedule.load_ledger(path) == {0: "100_1", 12: UNKNOWN}


def test_원장_파일은_사람이_읽고_고칠_수_있는_글자로_적힌다(env):
    # 운영자가 파일을 열어 "결과 불명"을 찾아 고친다. 유니코드 이스케이프(백슬래시 u 와 숫자)로 적히면 찾을 수 없다.
    env.run(FakeSession({1: TimeoutError("read timed out")}))
    text = env.ledger.read_text(encoding="utf-8")
    assert f'"1": "{UNKNOWN}"' in text
    assert "\\u" not in text
    assert text.endswith("\n")


def test_LedgerError는_ValueError가_아니다():
    # run의 검증 관문이 내는 ValueError("검증 오류, 종료코드 1")와 호출하는 쪽에서 섞이면 안 된다.
    assert not issubclass(schedule.LedgerError, ValueError)


@pytest.mark.parametrize(
    "content",
    [
        pytest.param("", id="빈파일"),
        pytest.param('{"0": "100_1"', id="잘린JSON"),
        pytest.param('["100_1"]', id="객체가아님"),
        pytest.param('{"첫째": "100_1"}', id="index가숫자아님"),
        pytest.param('{"-1": "100_1"}', id="음수index"),
        pytest.param('{"0": 100}', id="값이문자열아님"),
        pytest.param('{"0": ""}', id="값이빔"),
    ],
)
def test_망가진_원장은_빈_원장으로_보지_않고_멈춘다(env, content):
    # 읽지 못한 원장을 "없음"으로 읽으면 이미 예약한 게시물이 전부 다시 예약된다. 큰 소리로 멈추는 쪽이 싸다.
    env.ledger.write_text(content, encoding="utf-8")
    session = FakeSession()
    with pytest.raises(schedule.LedgerError) as info:
        env.run(session)
    assert session.calls == []
    assert has_hangul(str(info.value)) and str(env.ledger) in str(info.value)
    assert env.ledger.read_text(encoding="utf-8") == content  # 멈추면서 손대지 않는다
    with pytest.raises(schedule.LedgerError):
        schedule.load_ledger(env.ledger)


# ── dry_run ──────────────────────────────────────────────────────────────────


def test_dry_run은_API를_호출하지_않고_예정_목록을_돌려준다(env):
    session = FakeSession()
    outcomes = env.run(session, dry_run=True)
    assert session.calls == []
    assert [o.index for o in outcomes] == [0, 1, 2, 3, 4, 5]
    assert all(o.ok and o.post_id is None and o.error is None for o in outcomes)  # 예정: 아직 사진 id가 없다
    assert not env.ledger.exists()  # 예정을 보는 것만으로 원장을 만들지 않는다


def test_dry_run도_창_밖과_없는_이미지는_실패로_알린다(env):
    # "예정 목록"에 실제로는 나가지 못할 건이 섞여 있으면 운영자가 실제 실행에서야 알게 된다.
    plan = with_publish_at(env.plan, 1, NOW + timedelta(minutes=14, seconds=59))
    (env.images / env.post(4).image_file).unlink()
    session = FakeSession()
    outcomes = env.run(session, plan=plan, dry_run=True)
    assert session.calls == []
    assert [o.ok for o in outcomes] == [True, False, True, True, False, True]
    assert has_hangul(outcomes[1].error) and has_hangul(outcomes[4].error)
    assert env.post(4).image_file in outcomes[4].error
    assert not env.ledger.exists()


def test_창_밖이면서_이미지도_없는_건은_두_문제를_모두_알린다(env):
    # 하나만 알리면 운영자가 고치고 다시 돌려서야 둘째를 알게 된다.
    (env.images / env.post(2).image_file).unlink()
    plan = with_publish_at(env.plan, 2, NOW - timedelta(hours=1))
    (outcome,) = [o for o in env.run(FakeSession(), plan=plan, dry_run=True) if o.index == 2]
    assert "지난" in outcome.error and env.post(2).image_file in outcome.error


def test_dry_run은_원장에_이미_있는_건을_예정에_넣지_않고_알려_준다(env):
    env.ledger.write_text(json.dumps({"1": "100_1", "3": UNKNOWN}), encoding="utf-8")
    before = env.ledger.read_text(encoding="utf-8")
    session = FakeSession()
    outcomes = env.run(session, dry_run=True)
    assert session.calls == []
    assert (outcomes[1].ok, outcomes[1].post_id) == (True, "100_1")  # 이미 예약됨
    assert (outcomes[3].ok, outcomes[3].post_id) == (False, schedule.UNKNOWN_RESULT)  # 사람이 확인해야 함
    assert env.ledger.read_text(encoding="utf-8") == before


# ── 정상 실행 ────────────────────────────────────────────────────────────────


def test_게시물마다_한_번씩_올리고_결과를_플랜_순서대로_돌려준다(env):
    session = FakeSession()
    outcomes = env.run(session)
    assert session.uploaded == [p.image_file for p in env.plan.posts]
    assert outcomes == [schedule.Outcome(index=i, ok=True, post_id=env.id_of(i), error=None) for i in range(6)]
    assert env.saved() == {str(i): env.id_of(i) for i in range(6)}


def test_각_게시물의_현지어_본문과_이미지와_시각을_올린다(env):
    # 한국어 원문(source_ko)이 네팔어·미얀마어 독자에게 나가거나 다른 게시물의 그림이 붙는 것이 가장 나쁜 오류다.
    session = FakeSession()
    env.run(session)
    for post, call in zip(env.plan.posts, session.calls):
        assert call.url == PHOTOS_URL
        assert call.headers == {"Authorization": f"Bearer {SENTINEL}"}
        assert call.data["message"] == post.body_local
        assert call.data["scheduled_publish_time"] == str(int(post.publish_at.timestamp()))
        assert call.filename == post.image_file
        assert call.content == f"이미지-{post.index}".encode()


# ── 즉시 기록 ────────────────────────────────────────────────────────────────


def test_성공할_때마다_원장에_즉시_기록된다(env):
    # 다음 호출이 도착한 순간에 이미 앞 건이 디스크에 있어야 한다. 실행 끝에 한꺼번에 적는 구현은 여기서 빨개진다.
    seen = {}

    def snapshot(number):
        seen[number] = env.saved() if env.ledger.exists() else {}

    env.run(FakeSession(on_call=snapshot))
    assert seen == {n: {str(i): env.id_of(i) for i in range(n)} for n in range(6)}


def test_도중에_끊겨도_앞_건은_원장에_남아_있고_끊긴_건은_결과_불명이다(env):
    session = FakeSession({1: RuntimeError("예상하지 못한 오류")})
    with pytest.raises(RuntimeError):
        env.run(session)
    # 둘째 건은 요청이 나갔는지 알 수 없다 → 모르면 적는다. 셋째 건으로 가지 않는다.
    assert env.saved() == {"0": env.id_of(0), "1": UNKNOWN}
    assert len(session.calls) == 2


@pytest.mark.parametrize("interrupt", [KeyboardInterrupt, RuntimeError], ids=["Ctrl-C", "예기치못한오류"])
def test_업로드_중_끊긴_건은_다음_실행에서_다시_올라가지_않는다(env, interrupt):
    with pytest.raises(interrupt):
        env.run(FakeSession({2: interrupt()}))
    second = FakeSession()
    outcomes = env.run(second)
    assert env.post(2).image_file not in second.uploaded
    assert second.uploaded == [env.post(i).image_file for i in (3, 4, 5)]
    assert (outcomes[2].ok, outcomes[2].post_id) == (False, schedule.UNKNOWN_RESULT)


# ── 재실행 ───────────────────────────────────────────────────────────────────


def test_이미_원장에_있는_index는_건너뛴다(env):
    # 부분 실패 후 재실행: 첫 실행에서 2번이 거절되고 나머지는 예약된다.
    first = FakeSession({2: FakeResponse(400, {"error": {"message": "Invalid parameter", "code": 100}})})
    env.run(first)
    assert len(first.calls) == 6

    second = FakeSession()
    outcomes = env.run(second)
    assert second.uploaded == [env.post(2).image_file]  # 실패한 건만 다시, 예약된 다섯 건은 다시 올라가지 않는다
    assert all(o.ok for o in outcomes)
    assert env.saved() == {str(i): env.id_of(i) for i in range(6)}

    third = FakeSession()
    env.run(third)
    assert third.calls == []  # 다 끝난 달은 다시 돌려도 아무것도 올리지 않는다


def test_원장에_이미_있는_건은_성공으로_알리되_원래_사진_id를_보존한다(env):
    env.ledger.write_text(json.dumps({"0": "100_old", "5": "100_older"}), encoding="utf-8")
    session = FakeSession()
    outcomes = env.run(session)
    assert session.uploaded == [env.post(i).image_file for i in (1, 2, 3, 4)]
    assert (outcomes[0].ok, outcomes[0].post_id, outcomes[0].error) == (True, "100_old", None)
    assert (outcomes[5].ok, outcomes[5].post_id, outcomes[5].error) == (True, "100_older", None)
    assert env.saved()["0"] == "100_old" and env.saved()["5"] == "100_older"  # 덮어쓰지 않는다


def test_원장의_결과_불명은_건너뛰되_실패로_알리고_확인_방법을_말한다(env):
    env.ledger.write_text(json.dumps({"1": UNKNOWN}), encoding="utf-8")
    session = FakeSession()
    outcomes = env.run(session)
    assert env.post(1).image_file not in session.uploaded
    outcome = outcomes[1]
    assert (outcome.ok, outcome.post_id) == (False, schedule.UNKNOWN_RESULT)
    # 운영자가 할 일: 페이스북에서 확인 → 없으면 원장에서 그 줄을 지우고 다시 실행
    for needle in ("페이스북", "예약된 게시물", str(env.ledger), "지우고", schedule.CONFIRMED_BY_HAND):
        assert needle in outcome.error
    assert env.saved()["1"] == UNKNOWN  # 사람이 지우기 전에는 그대로 남는다


def test_결과_불명_줄을_사람이_지우면_그_건만_다시_올라간다(env):
    env.ledger.write_text(json.dumps({str(i): env.id_of(i) for i in range(6)} | {"4": UNKNOWN}), encoding="utf-8")
    env.run(FakeSession())  # 건너뛴다
    ledger = env.saved()
    del ledger["4"]
    env.ledger.write_text(json.dumps(ledger), encoding="utf-8")
    session = FakeSession()
    outcomes = env.run(session)
    assert session.uploaded == [env.post(4).image_file]
    assert all(o.ok for o in outcomes)


# ── 한 건의 실패 ─────────────────────────────────────────────────────────────


def test_일부_실패해도_나머지를_계속_시도한다(env):
    session = FakeSession({1: FakeResponse(400, {"error": {"message": "Invalid parameter", "code": 100}})})
    outcomes = env.run(session)
    assert len(session.calls) == 6
    assert [o.ok for o in outcomes] == [True, False, True, True, True, True]
    failed = outcomes[1]
    assert failed.post_id is None and has_hangul(failed.error)
    assert "Invalid parameter" in failed.error  # Facebook이 한 말이 운영자에게 닿는다
    assert all(o.error is None for o in outcomes if o.ok)


@pytest.mark.parametrize("response", REJECTED_SCENARIOS)
def test_Facebook이_분명히_거절한_건은_원장에_적지_않고_다시_시도된다(env, response):
    # maybe_created가 거짓: 아무것도 만들어지지 않았다. 원인을 고치고 다시 돌리면 그 건은 올라가야 한다.
    outcomes = env.run(FakeSession({3: response}))
    assert (outcomes[3].ok, outcomes[3].post_id) == (False, None)
    assert "3" not in env.saved()
    assert set(env.saved()) == {"0", "1", "2", "4", "5"}

    retry = FakeSession()
    again = env.run(retry)
    assert retry.uploaded == [env.post(3).image_file]
    assert all(o.ok for o in again)
    assert env.saved()["3"] == env.id_of(3)


@pytest.mark.parametrize("response", UNKNOWN_RESULT_SCENARIOS)
def test_결과를_알_수_없는_실패는_결과_불명으로_원장에_적고_다시_올리지_않는다(env, response):
    # maybe_created가 참: 요청이 나갔으므로 예약이 만들어졌을 수 있다. 같은 사진이 두 번 나가는 것을 막는다.
    session = FakeSession({3: response})
    outcomes = env.run(session)
    assert len(session.calls) == 6  # 한 건의 불명이 나머지를 멈추지 않는다
    assert (outcomes[3].ok, outcomes[3].post_id) == (False, schedule.UNKNOWN_RESULT)
    assert has_hangul(outcomes[3].error) and "페이스북" in outcomes[3].error
    assert env.saved()["3"] == UNKNOWN
    assert [o.ok for o in outcomes] == [True, True, True, False, True, True]

    retry = FakeSession()
    again = env.run(retry)
    assert retry.calls == []  # 다시 돌려도 불명 건을 올리지 않는다
    assert (again[3].ok, again[3].post_id) == (False, schedule.UNKNOWN_RESULT)


def test_결과_불명_안내는_원장_경로와_지우는_방법을_알려_준다(env):
    outcomes = env.run(FakeSession({0: TimeoutError("read timed out")}))
    error = outcomes[0].error
    for needle in (str(env.ledger), "지우고", "다시 실행", "페이스북", schedule.CONFIRMED_BY_HAND):
        assert needle in error


# ── 요청이 나가지 않은 실패 ──────────────────────────────────────────────────


@pytest.mark.parametrize(
    ("when", "needle"),
    [
        pytest.param(NOW - timedelta(hours=1), "지난", id="과거"),
        pytest.param(NOW + timedelta(minutes=8), "가깝", id="너무가까움"),
        pytest.param(NOW + timedelta(days=76), "멉니다", id="75일넘음"),
    ],
)
def test_예약창_밖인_게시물은_호출하지_않고_실패로_기록된다(env, when, needle):
    plan = with_publish_at(env.plan, 2, when)
    session = FakeSession()
    outcomes = env.run(session, plan=plan)
    assert env.post(2).image_file not in session.uploaded
    assert len(session.calls) == 5  # 나머지는 올라간다
    assert (outcomes[2].ok, outcomes[2].post_id) == (False, None)
    assert has_hangul(outcomes[2].error) and needle in outcomes[2].error
    assert [o.ok for o in outcomes] == [True, True, False, True, True, True]
    assert "2" not in env.saved()  # 요청이 나가지 않았으므로 원장에 적지 않는다


def test_예약창_밖이던_건은_시각을_고치고_다시_돌리면_올라간다(env):
    env.run(FakeSession(), plan=with_publish_at(env.plan, 2, NOW - timedelta(hours=1)))
    retry = FakeSession()
    outcomes = env.run(retry)  # 원래 플랜(창 안)으로 다시
    assert retry.uploaded == [env.post(2).image_file]
    assert all(o.ok for o in outcomes)


def test_이미지_파일이_없으면_호출하지_않고_실패로_기록되고_넣으면_올라간다(env):
    (env.images / env.post(1).image_file).unlink()
    session = FakeSession()
    outcomes = env.run(session)
    assert env.post(1).image_file not in session.uploaded
    assert len(session.calls) == 5
    assert (outcomes[1].ok, outcomes[1].post_id) == (False, None)
    assert env.post(1).image_file in outcomes[1].error and has_hangul(outcomes[1].error)
    assert "1" not in env.saved()

    (env.images / env.post(1).image_file).write_bytes(b"x")
    retry = FakeSession()
    again = env.run(retry)
    assert retry.uploaded == [env.post(1).image_file]
    assert all(o.ok for o in again)


# ── 예약 창 ──────────────────────────────────────────────────────────────────
# 가까운 쪽: Meta의 10분에 우리 여유 5분을 더해 지금부터 15분 뒤가 가장 이르다. 이 모듈이 자기 검사와 자기 메시지로 거절한다.
# 지난 쪽·먼 쪽·타임존: Meta의 창 그대로이며 **진짜 `now`로** `graph.assert_schedulable`이 거절한다. 여유는 가까운 쪽에만 있다.

NEAR_MESSAGE = (
    "예약 시각 2026-10-31T12:12:00+09:00이(가) 너무 가깝습니다. 지금은 2026-10-31T12:00:00+09:00이고, 예약은 지금부터 "
    "15분 뒤인 2026-10-31T12:15:00+09:00 이후로만 받습니다. Facebook은 지금부터 10분 뒤부터 받지만, 올리는 데 시간이 걸려 "
    "요청이 도착할 때쯤 그보다 가까워지면 거절하므로 5분을 더 띄워 둡니다. 예약 시각을 늦추세요."
)


def test_지금부터_15분_뒤_예약은_받고_14분_59초_뒤_예약은_호출_없이_거절한다(env):
    # 여유 없이 Meta의 10분만 보면 14분 59초도 통과하므로, 이 한 쌍이 여유가 실제로 걸려 있는지 가른다.
    plan = with_publish_at(with_publish_at(env.plan, 0, NOW + timedelta(minutes=15)), 1, NOW + timedelta(minutes=14, seconds=59))
    session = FakeSession()
    outcomes = env.run(session, plan=plan)
    assert env.post(0).image_file in session.uploaded
    assert env.post(1).image_file not in session.uploaded
    assert outcomes[0].ok and not outcomes[1].ok


def test_가까운_쪽_거절_메시지_전문(env):
    # 운영자가 읽는 글이다: 실제 현재 시각, 가장 이른 허용 시각, 창 경계에 붙여 보내지 않는 이유. 구현 사정을 설명하는 문장은 없다.
    outcomes = env.run(FakeSession(), plan=with_publish_at(env.plan, 0, NOW + timedelta(minutes=12)))
    assert outcomes[0].error == NEAR_MESSAGE


@pytest.mark.parametrize("minutes", [0, 9, 12], ids=["지금과같음", "Meta의10분미만", "여유구간"])
def test_가까운_예약은_Meta의_10분_안이든_여유_구간이든_같은_메시지로_15분_뒤를_알린다(env, minutes):
    # graph의 "10분 뒤(12:10) 이후로만 가능" 메시지로 새면 운영자가 12:10으로 고쳤다가 한 번 더 거절당한다.
    outcomes = env.run(FakeSession(), plan=with_publish_at(env.plan, 0, NOW + timedelta(minutes=minutes)))
    error = outcomes[0].error
    assert f"지금은 {NOW.isoformat()}이고" in error
    assert f"15분 뒤인 {(NOW + timedelta(minutes=15)).isoformat()} 이후로만 받습니다" in error


@pytest.mark.parametrize(
    "when",
    [pytest.param(NOW + timedelta(minutes=12), id="너무가까움"), pytest.param(NOW - timedelta(hours=1), id="지난시각"),
     pytest.param(NOW + timedelta(days=76), id="75일넘음")],
)
def test_거절_메시지의_지금은_주입한_now_그대로이고_여유가_더해진_거짓_지금이_없다(env, when):
    error = env.run(FakeSession(), plan=with_publish_at(env.plan, 0, when))[0].error
    assert NOW.isoformat() in error
    assert (NOW + schedule.SAFETY_MARGIN).isoformat() not in error  # now + 여유를 "지금"으로 적은 글이 없다


@pytest.mark.parametrize(
    "when",
    [pytest.param(NOW + timedelta(minutes=12), id="너무가까움"), pytest.param(NOW - timedelta(hours=1), id="지난시각"),
     pytest.param(NOW + timedelta(days=76), id="75일넘음")],
)
def test_거절_메시지의_시각은_plan에_적은_시각과_같은_오프셋으로_적힌다(env, when):
    # CLI가 UTC 같은 다른 시간대의 now를 넘겨도 운영자는 plan.json에 적은 +09:00 시각과 바로 견줄 수 있어야 한다.
    now_utc = NOW.astimezone(timezone.utc)
    error = env.run(FakeSession(), plan=with_publish_at(env.plan, 0, when), now=now_utc)[0].error
    assert NOW.isoformat() in error
    assert "+00:00" not in error


def test_먼_쪽_경계는_여유_없이_Meta의_75일_그대로다(env):
    # 가까운 쪽 여유가 먼 쪽을 5분 늘려 놓으면 75일 + 몇 분짜리 예약이 로컬 검사를 통과해 Facebook에서 거절당한다.
    plan = with_publish_at(with_publish_at(env.plan, 0, NOW + timedelta(days=75)), 1, NOW + timedelta(days=75, seconds=1))
    session = FakeSession()
    outcomes = env.run(session, plan=plan)
    assert env.post(0).image_file in session.uploaded
    assert env.post(1).image_file not in session.uploaded
    assert outcomes[0].ok and not outcomes[1].ok


def test_타임존_없는_now는_graph의_타임존_메시지로_거절되고_요청은_나가지_않는다(env):
    session = FakeSession()
    outcomes = env.run(session, now=NOW.replace(tzinfo=None))
    assert session.calls == []
    assert not any(o.ok for o in outcomes)
    assert all("타임존" in o.error for o in outcomes)


# ── 검증 관문 ────────────────────────────────────────────────────────────────


@pytest.mark.parametrize("dry_run", [False, True], ids=["실제실행", "dry_run"])
def test_오류_finding이_있으면_아무것도_호출하지_않고_ValueError(env, dry_run):
    # 원장이 망가져 있어도 관문이 먼저다: 관문은 파일도 세션도 건드리기 전에 선다.
    env.ledger.write_text("{깨진", encoding="utf-8")
    session = FakeSession()
    with pytest.raises(ValueError) as info:
        env.run(session, findings=[WARNING, ERROR_A, ERROR_B], dry_run=dry_run)
    assert session.calls == []
    assert env.ledger.read_text(encoding="utf-8") == "{깨진"
    message = str(info.value)
    assert has_hangul(message)
    assert "오류 2건" in message  # 경고(1건)는 세지 않는다
    assert "검증을 다시 돌려" in message  # 할 일: 검증을 다시 돌려 오류를 없앤다


def test_오류_finding_관문은_원장도_잠금_파일도_만들지_않는다(env):
    with pytest.raises(ValueError):
        env.run(FakeSession(), findings=[ERROR_A])
    assert list(env.ledger.parent.glob("scheduled.json*")) == []


@pytest.mark.parametrize("dry_run", [False, True], ids=["실제실행", "dry_run"])
def test_경고만_있으면_정상_진행한다(env, dry_run):
    session = FakeSession()
    outcomes = env.run(session, findings=[WARNING, WARNING], dry_run=dry_run)
    assert len(outcomes) == 6 and all(o.ok for o in outcomes)
    assert len(session.calls) == (0 if dry_run else 6)


def test_finding이_없으면_정상_진행한다(env):
    assert all(o.ok for o in env.run(FakeSession(), findings=[]))


# ── 동시 실행 잠금 ───────────────────────────────────────────────────────────
# "멈춘 것 같아서 다른 탭에서 다시 돌렸다": 두 실행이 같은 원장을 읽으면 원장에 없는 건을 양쪽이 올린다.


@contextmanager
def no_hanging(seconds: int = 5):
    """잠금을 기다리며 영원히 멈추는 구현이 시험 묶음 전체를 멈추지 않도록, 늦으면 실패시킨다(유닉스 전용, fcntl과 같다)."""

    def give_up(signum, frame):
        raise AssertionError(f"{seconds}초 안에 끝나지 않았습니다 — 잠금을 기다리며 멈춘 것으로 보입니다")

    previous = signal.signal(signal.SIGALRM, give_up)
    signal.alarm(seconds)
    try:
        yield
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, previous)


@pytest.fixture
def lock_path(env) -> Path:
    return env.ledger.with_name("scheduled.json.lock")  # 원장과 같은 자리, 같은 이름 + .lock


@pytest.mark.parametrize("dry_run", [False, True], ids=["실제실행", "dry_run"])
def test_다른_실행이_잠금을_쥐고_있으면_session을_부르지_않고_기다리지_않고_멈춘다(env, monkeypatch, dry_run):
    # 다른 실행이 쥐고 있는 것을 흉내 낸다. 기다리는 요청(LOCK_NB 없음)은 시험을 멈추는 대신 곧바로 AssertionError다.
    attempts = []

    def flock(handle, operation):
        attempts.append(operation)
        if operation & fcntl.LOCK_UN:
            return
        if not operation & fcntl.LOCK_NB:
            raise AssertionError("LOCK_NB 없이 잠금을 기다리려 합니다 — 실제로는 다른 실행이 끝날 때까지 영원히 멈춥니다")
        raise BlockingIOError(errno.EAGAIN, "Resource temporarily unavailable")

    monkeypatch.setattr(schedule.fcntl, "flock", flock)
    session = FakeSession()
    with pytest.raises(schedule.LedgerError) as info:
        env.run(session, dry_run=dry_run)
    assert session.calls == []
    assert any(op & fcntl.LOCK_EX for op in attempts)  # 잠금을 시도했다
    assert not env.ledger.exists()  # 원장도 건드리지 않았다
    message = str(info.value)
    assert "다른 예약 실행" in message and "기다리" in message and has_hangul(message)


@pytest.mark.parametrize("dry_run", [False, True], ids=["실제실행", "dry_run"])
def test_진짜_잠금이_걸려_있으면_두_번째_실행은_멈추고_풀리면_돌아간다(env, lock_path, dry_run):
    with open(lock_path, "a") as other_run:
        fcntl.flock(other_run, fcntl.LOCK_EX | fcntl.LOCK_NB)
        session = FakeSession()
        with no_hanging(), pytest.raises(schedule.LedgerError):
            env.run(session, dry_run=dry_run)
        assert session.calls == []
        assert not env.ledger.exists()
    # 쥐고 있던 쪽이 끝나면(닫히면) 운영체제가 풀어 준다. 지울 파일도, 기다릴 이유도 남지 않는다.
    with no_hanging():
        outcomes = env.run(FakeSession(), dry_run=dry_run)
    assert all(o.ok for o in outcomes)


def test_잠금은_예외로_끝나도_풀린다(env, lock_path):
    with pytest.raises(RuntimeError) as info:
        env.run(FakeSession({1: RuntimeError("예상하지 못한 오류")}))
    # `info`가 트레이스백(과 그 프레임의 파일 핸들)을 붙들고 있다: finally에서 풀지 않으면 여기서 잠금이 잡히지 않는다.
    with open(lock_path, "a") as probe:
        fcntl.flock(probe, fcntl.LOCK_EX | fcntl.LOCK_NB)
    assert info.value is not None


# ── 원장 쓰기 안전 ───────────────────────────────────────────────────────────


def test_원장을_쓸_수_없으면_첫_요청_전에_멈춘다(env, monkeypatch):
    # 읽기는 되는데(원장이 아직 없음) 쓰기가 안 되는 경우. 사진부터 만들어 놓고 기록할 곳이 없으면, 다시 돌릴 때 같은 사진이 또 올라간다.
    def cannot_write(src, dst):
        raise PermissionError(13, "Permission denied")

    monkeypatch.setattr(schedule.os, "replace", cannot_write)
    session = FakeSession()
    with pytest.raises(schedule.LedgerError) as info:
        env.run(session)
    assert session.calls == []
    assert has_hangul(str(info.value)) and "원장" in str(info.value) and "시작하지 않았습니다" in str(info.value)
    assert not [p for p in env.ledger.parent.iterdir() if p.name.endswith(".tmp")]


@pytest.mark.parametrize("dry_run", [False, True], ids=["실제실행", "dry_run"])
def test_원장_자리가_폴더면_읽지_못하고_멈춘다(env, dry_run):
    # dry_run은 원장을 쓰지 않으므로, 읽기에서 멈추지 못하면 읽지 못한 원장을 "없음"으로 보고 예정 목록을 내보낸다.
    env.ledger.mkdir()
    session = FakeSession()
    with pytest.raises(schedule.LedgerError):
        env.run(session, dry_run=dry_run)
    assert session.calls == []
    with pytest.raises(schedule.LedgerError):
        schedule.load_ledger(env.ledger)


def test_UTF8이_아닌_원장도_빈_원장으로_보지_않고_멈춘다(env):
    env.ledger.write_bytes(b"\xff\xfe{")
    with pytest.raises(schedule.LedgerError):
        schedule.load_ledger(env.ledger)
    with pytest.raises(schedule.LedgerError):
        env.run(FakeSession(), dry_run=True)


def test_원장을_둘_폴더가_없으면_첫_요청_전에_멈춘다(env, tmp_path):
    # 폴더를 몰래 만들지 않는다: 원장 경로가 틀렸다면 엉뚱한 곳에 원장이 생겨 다음 실행이 그것을 못 찾는다.
    session = FakeSession()
    missing = tmp_path / "없는-폴더" / "scheduled.json"
    with pytest.raises(schedule.LedgerError) as info:
        schedule.run(env.plan, [], env.images, missing, token=SENTINEL, session=session, now=NOW, dry_run=False)
    assert session.calls == []
    assert str(missing) in str(info.value) and "시작하지 않았습니다" in str(info.value)
    assert not missing.parent.exists()


def test_원장에_적지_못하면_그_자리에서_멈추고_만들어진_사진_id를_알려_준다(env, monkeypatch):
    session = FakeSession()
    real_replace = os.replace

    def disk_full_after_second_upload(src, dst):
        if len(session.calls) >= 2:
            raise OSError(28, "No space left on device")
        real_replace(src, dst)

    monkeypatch.setattr(schedule.os, "replace", disk_full_after_second_upload)
    with pytest.raises(schedule.LedgerError) as info:
        env.run(session)
    message = str(info.value)
    assert len(session.calls) == 2  # 기록할 수 없는 예약을 더 만들지 않는다
    assert env.id_of(1) in message and "1" in message  # 사람이 원장에 손으로 적을 수 있게
    assert "두 번" in message  # 적지 않고 다시 돌리면 어떻게 되는지
    assert env.saved() == {"0": env.id_of(0)}  # 쓰다 끊겨도 앞 원장은 온전하다(임시 파일에 쓴 뒤 바꿔 끼운다)
    assert not [p for p in env.ledger.parent.iterdir() if p.name.endswith(".tmp")]  # 임시 파일을 남기지 않는다


# ── 토큰 ─────────────────────────────────────────────────────────────────────


def test_토큰_값이_원장_결과_메시지_어디에도_남지_않는다(env, tmp_path):
    # 실패 응답마다 토큰을 되풀이하게 한다. 성공 응답은 사진 id 자리에 토큰을 되돌려 준다(원장에 적히는 값이다).
    session = FakeSession({
        0: FakeResponse(200, {"id": SENTINEL}),
        1: FakeResponse(400, {"error": {"message": f"Invalid OAuth access token {SENTINEL}", "code": 190}}),
        2: OSError(f"Connection aborted: Authorization: Bearer {SENTINEL}"),
        3: FakeResponse(200, text=f"<html>{SENTINEL}</html>", json_error=ValueError(SENTINEL)),
    })
    outcomes = env.run(session)
    # 헛돌지 않도록: 토큰은 정말 요청에 실렸고, 실패는 정말 났고, 가려진 흔적("***")이 남아 있다.
    assert session.calls[0].headers == {"Authorization": f"Bearer {SENTINEL}"}
    assert [o.ok for o in outcomes] == [True, False, False, False, True, True]
    assert env.saved()["0"] == "***"
    assert env.saved()["2"] == UNKNOWN and env.saved()["3"] == UNKNOWN

    assert SENTINEL not in repr(outcomes)
    for path in tmp_path.rglob("*"):
        if path.is_file():
            assert SENTINEL.encode() not in path.read_bytes(), f"토큰이 {path}에 남았습니다"
