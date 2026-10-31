"""CLI 진입점(cli.py)·npm 스크립트·운영 문서 테스트.

**실제 네트워크 호출은 하지 않는다.** `requests.Session` 자리에는 가짜 세션이 들어가고, 모든 테스트에 걸린
`_네트워크_차단` 장치가 소켓 연결 시도 자체를 실패시킨다. 실제 세션을 만드는 자리(`cli._real_session`)는
`sys.modules`에 가짜 `requests` 모듈을 끼워 넣어 본다 — 그래야 "재시도를 달지 않는다"를 글자가 아니라
동작으로 지킬 수 있다.

토큰 자리에는 `SENTINEL`만 쓴다. 진짜 토큰이 아니라, 어디로든 새면 찾아낼 수 있게 일부러 눈에 띄게 만든 값이다.

`config.ROOT`를 `tmp_path`로 바꿔 달 폴더(`output/facebook/YYYY-MM`)가 임시 폴더 아래로 가게 하고,
`config.ENV_PATH`도 임시 파일로 바꾼다(진짜 저장소의 `.env`를 읽지 않게). 반면 `facts.json`·`glossary.json`·
`universities.json`·`banned-phrases.json`은 **저장소의 진짜 파일**을 쓴다 — CLI가 실제로 읽는 사전으로 배선이
맞는지 보는 것이 이 묶음의 몫이다.
"""

from __future__ import annotations

import json
import socket
import stat
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from facebook import backtranslation, cli, config, schedule
from facebook.plan_model import Plan, load_plan

FIXTURE = Path(__file__).parent / "fixtures" / "plan-valid.json"
REPO = Path(__file__).resolve().parents[3]  # tests -> facebook -> scripts -> 저장소 루트
ENTRY = REPO / "scripts" / "facebook-cli.py"
PACKAGE_JSON = REPO / "package.json"
DOC = REPO / "docs" / "facebook-운영.md"

MONTH = "2026-11"
SENTINEL = "EAAZ-SENTINEL-not-a-real-token-7c41e9d2b8"
JST = timezone(timedelta(hours=9))
NOW = datetime(2026, 10, 31, 12, 0, tzinfo=JST)  # 픽스처의 첫 게시(11-01 19:00)보다 31시간 앞. 여섯 건 모두 예약 창 안이다.

SUBCOMMANDS = ("check-token", "images", "backtranslate-template", "validate", "review", "schedule")
NPM_SCRIPTS = ("fb:check-token", "fb:images", "fb:validate", "fb:review", "fb:schedule", "test:facebook")


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


def photo_id(filename: str) -> str:
    return f"photo-{filename}"


class FakeSession:
    """`script`: {POST 호출 번호(0부터): FakeResponse | 던질 예외}. 없는 번호는 성공한다.

    `page`는 `check-token`이 부르는 GET의 답이다. GET을 쓰지 않는 시험에서는 부르면 크게 실패한다.
    """

    def __init__(self, script: dict | None = None, *, page=None):
        self.script = script or {}
        self.page = page
        self.uploaded: list[str] = []
        self.gets: list[str] = []

    def post(self, url, **kwargs):
        filename, handle, _content_type = kwargs["files"]["source"]
        handle.read()
        number = len(self.uploaded)
        self.uploaded.append(filename)
        outcome = self.script.get(number)
        if isinstance(outcome, BaseException):
            raise outcome
        return outcome if outcome is not None else FakeResponse(200, {"id": photo_id(filename)})

    def get(self, url, **kwargs):
        self.gets.append(url)
        if self.page is None:
            raise AssertionError(f"이 시험은 GET을 부르지 않아야 한다: {url}")
        if isinstance(self.page, BaseException):
            raise self.page
        return self.page


def page_session(*, returned_id: str | None = None, name: str = "정우인재개발원") -> FakeSession:
    return FakeSession(page=FakeResponse(200, {"id": returned_id or config.PAGE_ID, "name": name}))


class RecordingSession:
    """가짜 `requests.Session`. 어댑터를 마운트하면 기록한다(재시도를 달았는지 보는 자리)."""

    def __init__(self):
        self.mounted: list[tuple] = []

    def mount(self, prefix, adapter):
        self.mounted.append((prefix, adapter))


class FakeRequests:
    """`import requests`가 돌려줄 가짜 모듈."""

    def __init__(self):
        self.sessions: list[RecordingSession] = []

    def Session(self):  # noqa: N802 — requests의 이름을 그대로 흉내 낸다
        session = RecordingSession()
        self.sessions.append(session)
        return session


# ── 환경 ─────────────────────────────────────────────────────────────────────


@pytest.fixture(autouse=True)
def _네트워크_차단(monkeypatch):
    """어떤 테스트도 실제 소켓을 열 수 없다. 가짜 세션을 우회하는 코드가 있으면 여기서 실패한다."""

    def refuse(*args, **kwargs):
        raise AssertionError("테스트가 실제 네트워크 연결을 시도했습니다")

    monkeypatch.setattr(socket.socket, "connect", refuse)
    monkeypatch.setattr(socket, "create_connection", refuse)
    monkeypatch.setattr(socket, "getaddrinfo", refuse)


@pytest.fixture(autouse=True)
def _격리(monkeypatch, tmp_path):
    """달 폴더를 임시 폴더로, `.env`를 임시 파일로 돌리고, 셸의 토큰 변수를 치운다. 시각도 고정한다."""
    monkeypatch.setattr(config, "ROOT", tmp_path)
    monkeypatch.setattr(config, "ENV_PATH", tmp_path / ".env")
    monkeypatch.delenv(config.TOKEN_ENV_NAME, raising=False)
    monkeypatch.setattr(cli, "_now", lambda: NOW)


@pytest.fixture
def 토큰(monkeypatch):
    """셸 환경변수로 토큰을 준다(진짜 토큰이 아닌 눈에 띄는 가짜 값)."""
    monkeypatch.setenv(config.TOKEN_ENV_NAME, SENTINEL)


@dataclass
class Env:
    month: str
    dir: Path
    images: Path
    plan_path: Path
    worksheet: Path
    review: Path
    ledger: Path
    plan: Plan
    glossary: dict

    def run(self, *argv: str, session=None) -> int:
        return cli.main(list(argv), session=session)

    def ledger_raw(self) -> dict:
        return json.loads(self.ledger.read_text(encoding="utf-8"))

    def seed_ledger(self, entries: dict[int, tuple[str, str]]) -> None:
        """원장을 미리 놓는다: {번호: (결과, 이미지 파일 이름)}."""
        self.ledger.write_text(
            json.dumps({str(i): {"결과": r, "이미지": f} for i, (r, f) in entries.items()}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )


@pytest.fixture
def env(_격리) -> Env:
    """여섯 건짜리 유효한 플랜과 이미지가 놓인 달 폴더. 역번역 워크시트와 원장은 아직 없다."""
    month_dir = config.month_dir(MONTH)
    images = month_dir / "images"
    images.mkdir(parents=True)
    plan_path = month_dir / "plan.json"
    plan_path.write_text(FIXTURE.read_text(encoding="utf-8"), encoding="utf-8")
    plan = load_plan(plan_path)
    for post in plan.posts:
        (images / post.image_file).write_bytes(b"\xff\xd8\xff" + f"이미지-{post.index}".encode())
    return Env(
        month=MONTH,
        dir=month_dir,
        images=images,
        plan_path=plan_path,
        worksheet=month_dir / "backtranslation.json",
        review=month_dir / "review.html",
        ledger=month_dir / "scheduled.json",
        plan=plan,
        glossary=json.loads(config.GLOSSARY_PATH.read_text(encoding="utf-8")),
    )


def fill_worksheet(env: Env, *, edit=None) -> None:
    """완벽히 충실한 되번역(한국어 원문에서 CTA만 뗀 것)으로 워크시트를 채운다.

    `edit(번호, 글) -> 글`을 주면 그 결과를 적는다. 이렇게 채운 워크시트는 오류가 없고 소재마다
    `역번역중복` 경고 2건이 난다(한 소재의 세 원문이 같아서 나는, 알려진 정상 경고다).
    """
    sheet = backtranslation.worksheet(env.plan, env.glossary)
    cta_ko = env.glossary["cta"]["ko"]
    for entry in sheet["entries"]:
        post = env.plan.posts[entry["index"]]
        text = backtranslation.comparison_source(post.source_ko, cta_ko)
        entry["back_ko"] = text if edit is None else edit(entry["index"], text)
    env.worksheet.write_text(json.dumps(sheet, ensure_ascii=False, indent=2), encoding="utf-8")


def shown(capsys) -> str:
    """운영자가 터미널에서 보는 모든 글(표준 출력과 표준 오류를 합친 것)."""
    captured = capsys.readouterr()
    return captured.out + captured.err


def has_hangul(text: str) -> bool:
    return any("가" <= char <= "힣" for char in text)


# ── 시험 장치 자체 ───────────────────────────────────────────────────────────


def test_네트워크_차단_장치가_실제로_소켓_연결을_막는다():
    with pytest.raises(AssertionError, match="네트워크"):
        socket.create_connection(("graph.facebook.com", 443))
    with pytest.raises(AssertionError, match="네트워크"):
        socket.getaddrinfo("graph.facebook.com", 443)


def test_격리_장치가_달_폴더와_env를_임시_폴더로_돌린다(tmp_path):
    assert config.month_dir(MONTH) == tmp_path / "output" / "facebook" / MONTH
    assert config.ENV_PATH == tmp_path / ".env"


def test_완벽히_채운_워크시트는_오류가_없고_중복_경고만_낸다(env, capsys):
    fill_worksheet(env)
    assert env.run("validate", "--month", MONTH) == 0
    assert "오류 0건, 경고 4건" in shown(capsys)


# ── 인자 ─────────────────────────────────────────────────────────────────────


def test_알_수_없는_서브커맨드는_종료코드_2와_한국어_메시지(capsys):
    assert cli.main(["schedul", "--month", MONTH]) == 2
    text = shown(capsys)
    assert has_hangul(text)
    for name in SUBCOMMANDS:
        assert name in text


def test_month_인자가_없으면_오류(capsys):
    assert cli.main(["validate"]) == 2
    text = shown(capsys)
    assert "--month" in text
    assert "2026-11" in text  # 베낄 수 있는 예를 보여 준다
    assert has_hangul(text)


@pytest.mark.parametrize("command", SUBCOMMANDS)
def test_모든_서브커맨드가_month를_받는다(command, capsys):
    assert cli.main([command]) == 2
    assert "--month" in shown(capsys)


def test_month_형식이_틀리면_종료코드_2와_한국어_안내(capsys):
    assert cli.main(["validate", "--month", "2026-13"]) == 2
    text = shown(capsys)
    assert "2026-13" in text
    assert has_hangul(text)


def test_month는_등호로도_받는다(env):
    fill_worksheet(env)
    assert env.run("validate", f"--month={MONTH}") == 0


def test_confirm은_schedule에만_쓸_수_있다(capsys):
    assert cli.main(["validate", "--month", MONTH, "--confirm"]) == 2
    text = shown(capsys)
    assert "--confirm" in text
    assert "schedule" in text


def test_알_수_없는_옵션은_종료코드_2다(capsys):
    assert cli.main(["validate", "--month", MONTH, "--force"]) == 2
    assert "--force" in shown(capsys)


def test_인자가_하나도_없으면_사용법과_종료코드_2(capsys):
    assert cli.main([]) == 2
    text = shown(capsys)
    for name in SUBCOMMANDS:
        assert name in text


def test_도움말은_한국어로_서브커맨드와_월_인자를_보여_준다(capsys):
    assert cli.main(["--help"]) == 0
    text = shown(capsys)
    assert has_hangul(text)
    assert "--month" in text
    for name in SUBCOMMANDS:
        assert name in text


def test_도움말에_토큰_값이_들어가지_않는다(monkeypatch, capsys):
    monkeypatch.setenv(config.TOKEN_ENV_NAME, SENTINEL)
    assert cli.main(["--help"]) == 0
    assert SENTINEL not in shown(capsys)


# ── images ───────────────────────────────────────────────────────────────────


def test_images는_프롬프트와_파일명을_모두_출력한다(env, capsys):
    assert env.run("images", "--month", MONTH) == 0
    text = shown(capsys)
    for post in env.plan.posts:
        assert post.image_file in text
        assert post.image_prompt in text


def test_images는_글자금지와_실존인물금지_지시도_출력한다(env, capsys):
    assert env.run("images", "--month", MONTH) == 0
    text = shown(capsys)
    assert config.IMAGE_PROMPT_NO_TEXT in text
    assert config.IMAGE_PROMPT_NO_REAL_SUBJECTS in text


def test_images는_이미지를_저장할_폴더를_알려_준다(env, capsys):
    assert env.run("images", "--month", MONTH) == 0
    assert str(env.images) in shown(capsys)


def test_images는_플랜이_없으면_종료코드_1과_한국어_안내(env, capsys):
    env.plan_path.unlink()
    assert env.run("images", "--month", MONTH) == 1
    text = shown(capsys)
    assert "plan.json" in text
    assert has_hangul(text)


# ── backtranslate-template ───────────────────────────────────────────────────


def test_backtranslate_template은_워크시트를_만든다(env, capsys):
    assert env.run("backtranslate-template", "--month", MONTH) == 0
    sheet = json.loads(env.worksheet.read_text(encoding="utf-8"))
    assert sheet["month"] == MONTH
    assert [entry["index"] for entry in sheet["entries"]] == [post.index for post in env.plan.posts]
    assert all(entry["back_ko"] == "" for entry in sheet["entries"])
    assert str(env.worksheet) in shown(capsys)


def test_backtranslate_template은_주어를_적으라는_지침을_싣는다(env):
    assert env.run("backtranslate-template", "--month", MONTH) == 0
    sheet = json.loads(env.worksheet.read_text(encoding="utf-8"))
    assert "주어" in sheet["작성_지침"]


def test_backtranslate_template은_이미_있는_워크시트를_덮어쓰지_않는다(env, capsys):
    fill_worksheet(env)
    before = env.worksheet.read_text(encoding="utf-8")
    assert env.run("backtranslate-template", "--month", MONTH) == 2
    assert env.worksheet.read_text(encoding="utf-8") == before
    text = shown(capsys)
    assert str(env.worksheet) in text
    assert has_hangul(text)


def test_backtranslate_template은_문구_오류가_있으면_워크시트를_만들지_않는다(env, capsys):
    # CTA를 뗀 본문은 `worksheet`가 raise하는 자리다. 문구 검증이 먼저여야 한국어 안내가 나온다.
    raw = json.loads(env.plan_path.read_text(encoding="utf-8"))
    raw["posts"][0]["body_local"] = "Thị thực du học (D-2) dành cho sinh viên."
    env.plan_path.write_text(json.dumps(raw, ensure_ascii=False), encoding="utf-8")
    assert env.run("backtranslate-template", "--month", MONTH) == 1
    assert not env.worksheet.exists()
    text = shown(capsys)
    assert "CTA없음" in text
    assert has_hangul(text)


# ── validate ─────────────────────────────────────────────────────────────────


def test_validate_오류가_있으면_종료코드_1(env, capsys):
    fill_worksheet(env)
    (env.images / env.plan.posts[3].image_file).unlink()
    assert env.run("validate", "--month", MONTH) == 1
    text = shown(capsys)
    assert "이미지없음" in text
    assert "게시물 3번" in text


def test_validate는_워크시트가_없으면_종료코드_1과_만드는_법을_안내한다(env, capsys):
    assert env.run("validate", "--month", MONTH) == 1
    text = shown(capsys)
    assert "backtranslate-template" in text
    assert has_hangul(text)


def test_validate는_낡은_역번역_워크시트를_오류로_잡는다(env, capsys):
    fill_worksheet(env)
    raw = env.plan_path.read_text(encoding="utf-8")
    assert "dành cho người học" in raw
    env.plan_path.write_text(raw.replace("dành cho người học", "hiện dành cho người học"), encoding="utf-8")
    assert env.run("validate", "--month", MONTH) == 1
    text = shown(capsys)
    assert "본문(body_local)이 바뀐 게시물" in text  # `load`에 plan·glossary를 둘 다 넘겼을 때만 나오는 말
    assert "0번" in text


def test_validate는_되번역의_한국어_금지표현을_잡는다(env, capsys):
    # 현지어 본문은 그대로라 `validate_copy`는 통과한다. 되번역에만 한국어 금지 문구가 있다.
    fill_worksheet(env, edit=lambda index, text: text + " 합격을 보장합니다." if index == 0 else text)
    assert env.run("validate", "--month", MONTH) == 1
    text = shown(capsys)
    assert "역번역금지표현" in text
    assert "합격을 보장" in text


def test_validate는_빈_되번역을_오류로_잡는다(env, capsys):
    fill_worksheet(env, edit=lambda index, text: "" if index == 2 else text)
    assert env.run("validate", "--month", MONTH) == 1
    text = shown(capsys)
    assert "역번역빈칸" in text
    assert "게시물 2번" in text


def test_validate는_경고만_있으면_종료코드_0이고_경고를_보여_준다(env, capsys):
    fill_worksheet(env)
    assert env.run("validate", "--month", MONTH) == 0
    text = shown(capsys)
    assert "역번역중복" in text
    assert "경고" in text


def test_validate는_경고를_전부_보여_준다(env, capsys):
    """경고를 읽는 자리는 검증과 검토 화면이다. 여기서는 줄이지 않는다."""
    fill_worksheet(env)
    assert env.run("validate", "--month", MONTH) == 0
    assert shown(capsys).count("역번역중복") >= 4


def test_validate는_다음_단계를_알려_준다(env, capsys):
    fill_worksheet(env)
    assert env.run("validate", "--month", MONTH) == 0
    assert "fb:review" in shown(capsys)


def test_네트워크를_타지_않는_서브커맨드는_requests를_임포트하지_않는다(env, monkeypatch):
    monkeypatch.setitem(sys.modules, "requests", None)  # `import requests`가 ImportError가 된다
    fill_worksheet(env)
    assert env.run("validate", "--month", MONTH) == 0
    assert env.run("images", "--month", MONTH) == 0
    assert env.run("review", "--month", MONTH) == 0


# ── review ───────────────────────────────────────────────────────────────────


def test_review는_달_폴더에_HTML을_쓰고_이미지를_상대경로로_건다(env, capsys):
    fill_worksheet(env)
    assert env.run("review", "--month", MONTH) == 0
    html = env.review.read_text(encoding="utf-8")
    assert f'src="images/{env.plan.posts[0].image_file}"' in html
    assert str(env.review) in shown(capsys)


def test_review는_생성한_맥에서_열라고_안내한다(env, capsys):
    fill_worksheet(env)
    assert env.run("review", "--month", MONTH) == 0
    text = shown(capsys)
    assert "맥" in text


def test_review는_오류가_있어도_화면을_쓰고_종료코드_1을_낸다(env, capsys):
    fill_worksheet(env, edit=lambda index, text: text + " 합격을 보장합니다." if index == 0 else text)
    assert env.run("review", "--month", MONTH) == 1
    html = env.review.read_text(encoding="utf-8")
    assert "역번역금지표현" in html


def test_review는_차이값을_화면에_싣는다(env):
    fill_worksheet(env, edit=lambda index, text: text.replace("체류자격입니다", "체류자격이 아닙니다") if index == 0 else text)
    assert env.run("review", "--month", MONTH) == 0
    html = env.review.read_text(encoding="utf-8")
    assert "차이" in html


# ── check-token ──────────────────────────────────────────────────────────────


def test_check_token은_페이지를_읽을_수_있으면_종료코드_0(env, 토큰, capsys):
    session = page_session()
    assert env.run("check-token", "--month", MONTH, session=session) == 0
    text = shown(capsys)
    assert "정우인재개발원" in text
    assert "올릴 수 있다는 뜻이 아닙니다" in text  # 읽기가 쓰기를 뜻하지 않는다는 말이 늘 남아야 한다


def test_check_token은_토큰이_무효면_종료코드_2(env, 토큰, capsys):
    session = FakeSession(page=FakeResponse(400, {"error": {"message": "Error validating access token", "code": 190}}))
    assert env.run("check-token", "--month", MONTH, session=session) == 2
    assert has_hangul(shown(capsys))


def test_FB_PAGE_TOKEN이_없으면_종료코드_2와_한국어_안내(env, capsys):
    assert env.run("check-token", "--month", MONTH, session=page_session()) == 2
    text = shown(capsys)
    assert config.TOKEN_ENV_NAME in text
    assert ".env" in text
    assert has_hangul(text)


def test_토큰이_없으면_세션을_만들지도_않는다(env, monkeypatch, capsys):
    """토큰을 먼저 읽으므로 requests가 필요하지 않다. requests가 없는 탓으로 끝나면 안내가 달라진다."""
    monkeypatch.setitem(sys.modules, "requests", None)
    assert env.run("check-token", "--month", MONTH) == 2
    text = shown(capsys)
    assert config.TOKEN_ENV_NAME in text
    assert "requests" not in text


def test_check_token은_세션을_받으면_requests를_임포트하지_않는다(env, 토큰, monkeypatch):
    monkeypatch.setitem(sys.modules, "requests", None)
    assert env.run("check-token", "--month", MONTH, session=page_session()) == 0


# ── 토큰 누출 ────────────────────────────────────────────────────────────────


def test_오류_출력에_토큰_값이_들어가지_않는다(env, 토큰, capsys):
    fill_worksheet(env)

    # (1) Facebook이 토큰을 되돌려 주는 거절
    session = FakeSession(page=FakeResponse(400, {"error": {"message": f"Invalid token: {SENTINEL}", "code": 190}}))
    assert env.run("check-token", "--month", MONTH, session=session) == 2
    assert SENTINEL not in shown(capsys)

    # (2) 예약 도중 토큰을 품은 뜻밖의 예외
    session = FakeSession({0: RuntimeError(f"내부 오류 token={SENTINEL}")})
    assert env.run("schedule", "--month", MONTH, "--confirm", session=session) == 2
    assert SENTINEL not in shown(capsys)

    # (3) 원장 파일에도 남지 않는다
    assert SENTINEL not in env.ledger.read_text(encoding="utf-8")


def test_정상_실행의_출력에도_토큰_값이_없다(env, 토큰, capsys):
    fill_worksheet(env)
    assert env.run("schedule", "--month", MONTH, "--confirm", session=FakeSession()) == 0
    assert SENTINEL not in shown(capsys)


# ── schedule ─────────────────────────────────────────────────────────────────


def test_schedule은_confirm_없이는_dry_run이다(env, 토큰, capsys):
    fill_worksheet(env)
    session = FakeSession()
    assert env.run("schedule", "--month", MONTH, session=session) == 0
    assert session.uploaded == []  # 페이스북에 아무것도 보내지 않았다
    assert not env.ledger.exists()
    text = shown(capsys)
    assert "--confirm" in text
    assert "예약 예정: 6건" in text


def test_schedule은_confirm이_있으면_올리고_원장에_적는다(env, 토큰, capsys):
    fill_worksheet(env)
    session = FakeSession()
    assert env.run("schedule", "--month", MONTH, "--confirm", session=session) == 0
    assert session.uploaded == [post.image_file for post in env.plan.posts]
    saved = env.ledger_raw()
    assert saved["0"] == {"결과": photo_id(env.plan.posts[0].image_file), "이미지": env.plan.posts[0].image_file}
    assert "예약: 6건" in shown(capsys)


def test_schedule은_검증_오류가_있으면_종료코드_1로_멈춘다(env, 토큰, capsys):
    """모든 검증기를 먼저 돌려 그 findings를 schedule.run에 넘긴다. 가짜 session은 한 번도 호출되지 않는다."""
    fill_worksheet(env)
    (env.images / env.plan.posts[3].image_file).unlink()
    session = FakeSession()
    assert env.run("schedule", "--month", MONTH, "--confirm", session=session) == 1
    assert session.uploaded == []
    assert not env.ledger.exists()
    text = shown(capsys)
    assert "이미지없음" in text
    assert "검증 오류" in text


def test_schedule은_되번역_금지표현만_있어도_멈춘다(env, 토큰, capsys):
    # 7b의 검사가 schedule 경로에 배선되지 않으면 30건이 그대로 나간다.
    fill_worksheet(env, edit=lambda index, text: text + " 취업을 보장합니다." if index == 1 else text)
    session = FakeSession()
    assert env.run("schedule", "--month", MONTH, "--confirm", session=session) == 1
    assert session.uploaded == []
    assert "역번역금지표현" in shown(capsys)


def test_schedule은_경고를_코드별_한_줄로_줄인다(env, 토큰, capsys):
    """흠 없는 한 달에도 `역번역중복` 경고가 스무 건쯤 난다. 예약할 때마다 같은 긴 글을 스무 번 찍으면
    운영자가 그 아래의 예약 결과를 스크롤로 넘기는 것을 배운다. 오류는 줄이지 않는다."""
    fill_worksheet(env)
    assert env.run("schedule", "--month", MONTH, session=FakeSession()) == 0
    text = shown(capsys)
    assert "역번역중복 4건" in text
    assert text.count("역번역중복") == 1


def test_schedule의_결과_불명은_성공도_실패도_아닌_셋째_모양으로_센다(env, 토큰, capsys):
    fill_worksheet(env)
    session = FakeSession({2: TimeoutError("read timed out")})
    assert env.run("schedule", "--month", MONTH, "--confirm", session=session) == 2
    text = shown(capsys)
    assert "[결과 불명]" in text
    assert "결과 불명: 1건" in text
    assert "예약: 5건" in text
    assert "실패: 0건" in text
    assert env.ledger_raw()["2"]["결과"] == schedule.UNKNOWN_RESULT
    assert "확인함" in text  # 되돌리는 법을 그 자리에서 말한다


def test_schedule은_모든_건이_성공할_때만_종료코드_0이다(env, 토큰):
    fill_worksheet(env)
    rejected = FakeResponse(403, {"error": {"message": "Permissions error", "code": 200}})
    assert env.run("schedule", "--month", MONTH, "--confirm", session=FakeSession({4: rejected})) == 2


def test_schedule은_같은_실패_메시지를_묶어_한_번만_보여_준다(env, 토큰, capsys):
    fill_worksheet(env)
    rejected = FakeResponse(400, {"error": {"message": "Error validating access token", "code": 190}})
    session = FakeSession({number: rejected for number in range(6)})
    assert env.run("schedule", "--month", MONTH, "--confirm", session=session) == 2
    text = shown(capsys)
    assert text.count("Error validating access token") == 1
    assert "실패: 6건" in text
    assert "0, 1, 2, 3, 4, 5번" in text


def test_schedule은_이미_예약된_건을_건너뛴_것으로_따로_센다(env, 토큰, capsys):
    fill_worksheet(env)
    env.seed_ledger({
        0: ("photo-old-0", env.plan.posts[0].image_file),
        1: ("photo-old-1", env.plan.posts[1].image_file),
    })
    session = FakeSession()
    assert env.run("schedule", "--month", MONTH, "--confirm", session=session) == 0
    assert session.uploaded == [post.image_file for post in env.plan.posts[2:]]
    text = shown(capsys)
    assert "예약: 4건" in text
    assert "이미 예약돼 건너뜀: 2건" in text


def test_schedule은_플랜에_없는_원장_줄을_세어_알려_준다(env, 토큰, capsys):
    fill_worksheet(env)
    env.seed_ledger({9: ("photo-old-9", "09-지운-게시물.png")})
    assert env.run("schedule", "--month", MONTH, session=FakeSession()) == 0
    text = shown(capsys)
    assert "플랜에 없는 원장 줄 1개" in text
    assert "9" in text
    assert "페이스북에 예약된 채 남아" in text


def test_schedule은_원장과_플랜이_어긋나면_종료코드_2로_멈춘다(env, 토큰, capsys):
    fill_worksheet(env)
    env.seed_ledger({0: ("photo-old", "다른-게시물.png")})
    session = FakeSession()
    assert env.run("schedule", "--month", MONTH, "--confirm", session=session) == 2
    assert session.uploaded == []
    assert "다른-게시물.png" in shown(capsys)


def test_schedule은_원장을_읽을_수_없으면_종료코드_2다(env, 토큰, capsys):
    fill_worksheet(env)
    env.ledger.write_text("원장이 아니다", encoding="utf-8")
    session = FakeSession()
    assert env.run("schedule", "--month", MONTH, "--confirm", session=session) == 2
    assert session.uploaded == []
    assert has_hangul(shown(capsys))


def test_schedule은_뜻밖의_예외를_한국어로_말하고_원장_확인을_안내한다(env, 토큰, capsys):
    fill_worksheet(env)
    session = FakeSession({0: RuntimeError("보드가 녹았습니다")})
    assert env.run("schedule", "--month", MONTH, "--confirm", session=session) == 2
    text = shown(capsys)
    assert "RuntimeError" in text
    assert schedule.UNKNOWN_RESULT in text
    assert schedule.CONFIRMED_BY_HAND in text
    assert str(env.ledger) in text
    assert has_hangul(text)
    # Task 9가 요청 직전에 적은 표시가 그대로 남아 있다 — 그래서 안내가 필요하다.
    assert env.ledger_raw()["0"]["결과"] == schedule.UNKNOWN_RESULT


def test_schedule의_dry_run도_원장에_있는_건을_건너뛴_것으로_본다(env, 토큰, capsys):
    fill_worksheet(env)
    env.seed_ledger({0: ("photo-old-0", env.plan.posts[0].image_file)})
    assert env.run("schedule", "--month", MONTH, session=FakeSession()) == 0
    text = shown(capsys)
    assert "예약 예정: 5건" in text
    assert "이미 예약돼 건너뜀: 1건" in text


# ── 실제 세션 ────────────────────────────────────────────────────────────────


def test_실제_세션은_requests를_지연_임포트해_만든다(monkeypatch):
    fake = FakeRequests()
    monkeypatch.setitem(sys.modules, "requests", fake)
    session = cli._real_session()
    assert fake.sessions == [session]


def test_실제_세션에는_재시도를_달지_않는다(monkeypatch):
    """재시도된 POST는 `결과 불명` 회계 밖에서 게시물을 복제한다. 어댑터를 마운트하면 이 시험이 깨진다."""
    fake = FakeRequests()
    monkeypatch.setitem(sys.modules, "requests", fake)
    session = cli._real_session()
    assert session.mounted == []


def test_세션을_넣지_않으면_schedule이_실제_세션을_만든다(env, 토큰, monkeypatch, capsys):
    fake = FakeRequests()
    monkeypatch.setitem(sys.modules, "requests", fake)
    fill_worksheet(env)
    # 가짜 세션은 post를 모르므로 여섯 건 모두 뜻밖의 예외로 끝난다. 세션을 만들었다는 것이 여기서 볼 것이다.
    assert env.run("schedule", "--month", MONTH, "--confirm") == 2
    assert len(fake.sessions) == 1


# ── 진입점·npm 스크립트 ──────────────────────────────────────────────────────


def test_진입점은_uv_run_script_헤더와_실행_권한을_갖는다():
    text = ENTRY.read_text(encoding="utf-8")
    assert text.startswith("#!/usr/bin/env -S uv run --script\n")
    assert "# /// script" in text
    assert "requests" in text
    assert ENTRY.stat().st_mode & stat.S_IXUSR


def test_진입점으로_도움말을_볼_수_있다():
    done = subprocess.run([sys.executable, str(ENTRY), "--help"], capture_output=True, text=True)
    assert done.returncode == 0, done.stderr
    assert "--month" in done.stdout


def test_진입점은_종료코드를_그대로_돌려준다():
    done = subprocess.run([sys.executable, str(ENTRY), "없는명령", "--month", MONTH], capture_output=True, text=True)
    assert done.returncode == 2


def test_package_json에_fb_스크립트가_있다():
    scripts = json.loads(PACKAGE_JSON.read_text(encoding="utf-8"))["scripts"]
    for name in NPM_SCRIPTS:
        assert name in scripts, name
    assert "facebook-cli.py" in scripts["fb:validate"]
    assert "scripts/facebook/tests" in scripts["test:facebook"]


def test_npm_schedule_스크립트는_confirm을_미리_붙이지_않는다():
    """npm 쪽에 `--confirm`이 박혀 있으면 연습 실행이 사라지고 실수로 30건이 나간다."""
    scripts = json.loads(PACKAGE_JSON.read_text(encoding="utf-8"))["scripts"]
    assert "--confirm" not in scripts["fb:schedule"]


def test_기존_npm_스크립트를_지우지_않았다():
    scripts = json.loads(PACKAGE_JSON.read_text(encoding="utf-8"))["scripts"]
    for name in ("prepare", "test:i18n", "test:lp-v1", "catalog:kts", "catalog:kts:check"):
        assert name in scripts, name


# ── 운영 문서 ────────────────────────────────────────────────────────────────


def doc_text() -> str:
    return DOC.read_text(encoding="utf-8")


def test_운영_문서가_역번역_유사도의_실측_한계를_숨기지_않는다():
    doc = doc_text()
    for needle in ("0.05", "0.01", "0.12", "0.08"):
        assert needle in doc, needle
    assert "임계값" in doc


def test_운영_문서가_원어민_검수가_아직_없다고_적는다():
    doc = doc_text()
    assert "원어민" in doc
    assert "banned-phrases.json" in doc


def test_운영_문서가_결과_불명을_되돌리는_법을_적는다():
    doc = doc_text()
    assert schedule.UNKNOWN_RESULT in doc
    assert schedule.CONFIRMED_BY_HAND in doc


def test_운영_문서가_원장_손편집을_파일_전체_예로_보여_준다():
    """산문이 아니라 베낄 수 있는 before/after 두 벌(표시하기·줄 지우기)이 있어야 한다."""
    doc = doc_text()
    assert doc.count("고치기 전") >= 2
    assert doc.count("고친 뒤") >= 2
    assert doc.count('"이미지"') >= 4  # 두 예가 모두 파일 전체다


def test_운영_문서가_재시도를_달지_말라고_적는다():
    doc = doc_text()
    assert "재시도" in doc
    assert "중복" in doc


def test_운영_문서가_첫_실제_월_전에_할_일을_따로_묶는다():
    doc = doc_text()
    assert "첫 실제 월" in doc
    assert "테스트 예약" in doc


def test_운영_문서가_모든_npm_명령을_싣는다():
    doc = doc_text()
    for name in NPM_SCRIPTS:
        assert name in doc, name


def test_운영_문서는_개발자_용어를_쓰지_않는다():
    """운영자는 비개발자 한 명이다. 코드 안의 이름이 문서에 나오면 그 문장은 읽히지 않는다."""
    doc = doc_text()
    for jargon in ("maybe_created", "Outcome", "findings", "LedgerError", "GraphError", "dict["):
        assert jargon not in doc, jargon
