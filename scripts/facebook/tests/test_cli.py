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
import os
import re
import socket
import stat
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from facebook import backtranslation, cli, config, schedule, validate_copy
from facebook.plan_model import Plan, load_plan

FIXTURE = Path(__file__).parent / "fixtures" / "plan-valid.json"
REPO = Path(__file__).resolve().parents[3]  # tests -> facebook -> scripts -> 저장소 루트
ENTRY = REPO / "scripts" / "facebook-cli.py"
PACKAGE_JSON = REPO / "package.json"
DOC = REPO / "docs" / "facebook-운영.md"

MONTH = "2026-11"
SENTINEL = "EAAZ-SENTINEL-not-a-real-token-7c41e9d2b8"
# 페이스북이 돌려주는 사진 id의 모양(`<page>_<post>`). 가짜 세션이 기본으로 돌려주는 `photo-<파일이름>`은
# 이 모양이 아니므로, 지우기까지 가는 시험은 이 값을 쓴다 — `graph`가 URL 경로에 넣기 전에 모양을 본다.
TEST_PHOTO_ID = "61595913932801_122100000000000777"
JST = timezone(timedelta(hours=9))
NOW = datetime(2026, 10, 31, 12, 0, tzinfo=JST)  # 픽스처의 첫 게시(11-01 19:00)보다 31시간 앞. 여섯 건 모두 예약 창 안이다.

# `--month`를 받는 여섯. `test-post`는 한 달의 일이 아니라 "이 토큰으로 글을 올릴 수 있다"를 재는 1건이고
# 묶어 둔 자리표시 그림을 쓰므로 달 폴더가 없다 — 그래서 이 묶음에서 빠진다.
SUBCOMMANDS = ("check-token", "images", "backtranslate-template", "validate", "review", "schedule")
ALL_COMMANDS = SUBCOMMANDS + ("test-post",)
NPM_SCRIPTS = (
    "fb:check-token",
    "fb:images",
    "fb:backtranslate-template",
    "fb:validate",
    "fb:review",
    "fb:schedule",
    "fb:test-post",
    "test:facebook",
)


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

    `page`는 이 세션이 받는 **GET의 답**이다: `check-token`의 페이지 조회, `test-post --delete`의 본문 조회.
    GET을 쓰지 않는 시험에서는 부르면 크게 실패한다.
    """

    def __init__(self, script: dict | None = None, *, page=None):
        self.script = script or {}
        self.page = page
        self.uploaded: list[str] = []
        self.posts: list[dict] = []
        self.gets: list[str] = []

    def post(self, url, **kwargs):
        number = len(self.posts)
        self.posts.append({"url": url, "data": kwargs.get("data", {})})
        files = kwargs.get("files")
        if files is not None:  # 사진 예약은 파일을 싣고, 게시물 삭제는 싣지 않는다
            filename, handle, _content_type = files["source"]
            handle.read()
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


def caption_session(caption: str | None = None, *, script: dict | None = None) -> FakeSession:
    """`test-post --delete`가 부르는 본문 조회(GET)에 답하는 세션. `caption=None`이면 글이 없는 사진이다."""
    body = {} if caption is None else {"name": caption}
    return FakeSession(script, page=FakeResponse(200, body))


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
    for name in ALL_COMMANDS:
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
    for name in ALL_COMMANDS:
        assert name in text


def test_도움말은_한국어로_서브커맨드와_월_인자를_보여_준다(capsys):
    assert cli.main(["--help"]) == 0
    text = shown(capsys)
    assert has_hangul(text)
    assert "--month" in text
    for name in ALL_COMMANDS:
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


def test_validate는_본문이_CTA뿐인_게시물을_고칠_수_있는_오류로_말한다(env, capsys):
    """고칠 수 있는 조건이 「예상하지 못한 오류 … 이 글을 그대로 개발자에게 보여 주세요」로 끝나면 안 된다 —
    **이 운영에 개발자는 없다(비개발자 한 명이 터미널로만 쓴다).**

    현지어 본문이 승인된 상담 문구뿐이면 되번역할 본문이 남지 않는다. 그때 터지는 예외의 한국어 메시지는
    이미 무엇을 어떻게 고칠지 정확히 말하고 있었는데, 그것이 `ValueError`라서 `cli._load_worksheet`의
    `except WorksheetError`를 비껴가고 종료 코드 2의 "예상하지 못한 오류"로 포장됐다. 그 상태에서 문서 §5-6은
    운영자를 "도구 자체가 고장 난 것 같다"로 보낸다.
    """
    fill_worksheet(env)
    plan = json.loads(env.plan_path.read_text(encoding="utf-8"))
    post = plan["posts"][0]
    post["body_local"] = env.glossary["cta"][post["language"]]  # CTA만 남긴다(validate_copy의 CTA 검사는 통과한다)
    env.plan_path.write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding="utf-8")

    assert env.run("validate", "--month", MONTH) == 1
    text = shown(capsys)
    assert "본문을 쓰세요" in text  # 할 일이 그대로 운영자에게 닿는다
    assert "예상하지 못한 오류" not in text
    assert "개발자" not in text


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


# 검토 화면의 '글자 차이' 줄. 이 표지(`data-role="divergence"`)를 찍는 곳은 `review._divergence` 하나다 —
# 같은 화면의 안내문도 '차이'라는 낱말을 쓰지만 표지는 쓰지 않는다(측정: 한 화면에 '차이' 7곳, 그 중 안내문 1곳).
_DIVERGENCE_LINE = re.compile(r'<p class="divergence" data-role="divergence">(.*?)</p>', re.DOTALL)


def divergence_lines(html: str) -> list[str]:
    """검토 화면이 게시물 순서대로 찍은 '글자 차이' 줄(태그를 뗀 글)."""
    return [re.sub(r"<[^>]+>", "", match.group(1)) for match in _DIVERGENCE_LINE.finditer(html)]


def test_review는_실제로_잰_차이값을_게시물마다_화면에_싣는다(env):
    """`cli`가 `backtranslation.divergences(plan, back, glossary)`의 결과를 화면에 넘기는 **배선**을 못박는다.

    이전 단언은 `"차이" in html` 하나였다. 그런데 그 낱말은 화면의 안내문(`review._howto`)이 **늘** 찍으므로,
    배선을 `{}`로 바꿔 서른 건의 수치가 전부 "측정값을 받지 못했습니다"로 사라져도 초록이었다(측정: 1353건 통과).
    그래서 게시물마다 **실제로 잰 값**이 그 게시물의 차이 줄에 실렸는지를 본다. 되번역을 게시물마다 다르게 비틀어
    여섯 값이 서로 다르게 나오므로, 값이 사라지는 것뿐 아니라 번호가 뒤섞이는 것도 걸린다.
    """
    fill_worksheet(env, edit=lambda index, text: text if index == 0 else text + " 다른 말" * index)
    assert env.run("review", "--month", MONTH) == 0

    back = backtranslation.load(env.worksheet, plan=env.plan, glossary=env.glossary)
    measured = backtranslation.divergences(env.plan, back, env.glossary)
    assert len(measured) == len(env.plan.posts)
    expected = [f"{measured[post.index]:.2f}" for post in env.plan.posts]
    assert len(set(expected)) == len(expected), f"잰 값이 서로 겹쳐 뒤섞임을 못 잡는다: {expected}"

    html = env.review.read_text(encoding="utf-8")
    lines = divergence_lines(html)
    assert len(lines) == len(env.plan.posts), f"차이 줄이 {len(lines)}개다(게시물 수와 같아야 한다)"
    for value, line in zip(expected, lines):
        assert value in line, f"차이 줄에 잰 값 {value}이(가) 없다: {line!r}"
    assert "측정값을 받지 못했습니다" not in html


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


def test_schedule은_전면_장애의_결과_불명_까닭도_한_묶음으로_적는다(env, 토큰, capsys):
    """머리글이 「같은 까닭은 한 번만 적습니다」라고 약속한다. 전면 네트워크 장애에서는 여섯 건이 거의 같은
    ~390자 문단으로 **여섯 번** 찍혔다(측정: 출력 3,204자). 서른 건이면 까닭만 1만 2천 자다. 그리고 이 글을
    읽는 순간은 하필 결과 불명이 무더기로 난 직후, **중복 게시 위험이 가장 높은 순간**이다 — 벽이 되면
    운영자는 그 문단 안의 "다시 실행하기 전에 페이스북의 예약된 게시물을 확인하세요"를 넘겨 읽는다.

    묶는 기계가 고장난 것이 아니라 **열쇠**가 잘못됐다: `schedule._resolve_unknown`이 원장 수정 지시에 게시물
    번호를 박아 까닭 문자열이 게시물마다 달라졌다. 번호는 묶음 머리에 목록으로 한 번 실린다.
    """
    fill_worksheet(env)
    session = FakeSession({number: OSError("Network is unreachable") for number in range(6)})
    assert env.run("schedule", "--month", MONTH, "--confirm", session=session) == 2
    text = shown(capsys)
    assert "결과 불명: 6건" in text
    assert "게시물 0, 1, 2, 3, 4, 5번 (6건)" in text  # 번호는 잃지 않고 묶음 머리에 목록으로
    assert text.count("인터넷 연결을 확인하세요") == 1  # ~390자 문단이 한 번만
    assert text.count(f'"{schedule.CONFIRMED_BY_HAND}"으로 바꾸고') == 1  # 원장 수정 지시도 한 번만
    assert str(env.ledger) in text  # 묶었어도 어느 파일을 고치는지는 그 자리에 남는다


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


# ── test-post (글을 올릴 수 있다는 유일한 증명) ───────────────────────────────


def test_test_post는_손으로_만들_파일_없이_한_건을_예약한다(토큰, tmp_path, capsys):
    """이것이 "이 토큰으로 글을 올릴 수 있다"는 유일한 증명이다. 손으로 만들 것이 하나라도 있으면
    비개발자는 건너뛰고, 건너뛰면 30건이 전부 거절되는 달을 예약을 시도하다 처음 알게 된다.
    그러므로 플랜도, 그림도, 워크시트도, 원장도, 달 폴더도 **없이** 돌아야 한다.
    """
    session = FakeSession({0: FakeResponse(200, {"id": TEST_PHOTO_ID})})
    assert cli.main(["test-post"], session=session) == 0
    assert session.uploaded == [config.TEST_POST_IMAGE_PATH.name]
    text = shown(capsys)
    assert TEST_PHOTO_ID in text  # 지울 때 쓸 사진 id를 찍는다
    assert "--delete" in text
    assert "예약된 게시물" in text  # 눈으로 확인할 곳
    assert list(tmp_path.rglob("scheduled.json")) == []  # 원장을 쓰지 않는다


def test_test_post는_예약_창_안의_시각으로_보낸다(토큰):
    """예약 창은 지금부터 10분 ~ 75일이다. 이 1건의 시각은 사람이 정하지 않으므로 도구가 창 안에
    들어가는 값을 골라야 한다 — 창 밖이면 증명 자체가 시작되지 않는다."""
    session = FakeSession()
    assert cli.main(["test-post"], session=session) == 0
    data = session.posts[0]["data"]
    assert data["published"] == "false"
    publish_at = datetime.fromtimestamp(int(data["scheduled_publish_time"]), tz=JST)
    assert NOW + config.SCHEDULE_MIN_LEAD < publish_at < NOW + config.SCHEDULE_MAX_LEAD
    # 본문은 `caption`으로 간다(`message`는 Meta가 deprecated로 적었다).
    assert data["caption"] == cli.TEST_POST_MESSAGE
    assert "message" not in data


def test_test_post의_본문은_테스트임을_밝히고_금지_문구가_없다():
    """공개되기 전에 지우는 글이지만, 지우지 않고 공개되는 경우에도 약속이 들어 있으면 안 된다."""
    banned = validate_copy.load_banned_phrases(config.BANNED_PHRASES_PATH)
    assert "테스트" in cli.TEST_POST_MESSAGE
    for phrase in banned["ko"] + banned["ko:대학명"]:
        assert phrase not in cli.TEST_POST_MESSAGE, phrase


def test_자리표시_그림이_저장소에_들어_있다():
    """운영자가 그림을 만들지 않아야 하므로 저장소가 들고 있어야 한다. 검증기가 받아들이는 모양이어야 한다."""
    path = config.TEST_POST_IMAGE_PATH
    assert path.exists(), path
    assert path.suffix in config.ALLOWED_IMAGE_SUFFIXES
    data = path.read_bytes()
    assert data.startswith(b"\x89PNG\r\n\x1a\n")  # 페이스북이 실제로 읽을 수 있는 PNG다
    assert 0 < len(data) <= config.MAX_IMAGE_BYTES


def test_test_post는_month를_받지_않는다(capsys):
    """달 폴더를 쓰지 않는다. `--month`를 받아 무시하면 "그 달의 플랜에서 한 건을 올린다"로 읽힌다."""
    assert cli.main(["test-post", "--month", MONTH]) == 2
    text = shown(capsys)
    assert "--month" in text
    assert has_hangul(text)


def test_test_post는_토큰이_없으면_종료코드_2다(capsys):
    assert cli.main(["test-post"]) == 2
    text = shown(capsys)
    assert config.TOKEN_ENV_NAME in text
    assert has_hangul(text)


def test_test_post_delete는_그래프_API로_그_게시물만_지운다(토큰, capsys):
    session = caption_session(cli.TEST_POST_MESSAGE, script={0: FakeResponse(200, {"success": True})})
    assert cli.main(["test-post", "--delete", TEST_PHOTO_ID], session=session) == 0
    assert session.uploaded == []  # 지우는 길에 새 글을 올리지 않는다
    assert session.posts[0]["url"].endswith("/" + TEST_PHOTO_ID)
    assert session.posts[0]["data"] == {"method": "delete"}
    assert "지웠습니다" in shown(capsys)


def test_test_post_delete가_실패하면_직접_지우라고_말한다(토큰, capsys):
    """지워졌다고 잘못 말하면 운영자는 확인하지 않고, 그 테스트 글은 날짜가 되면 실제로 공개된다."""
    session = FakeSession({0: FakeResponse(200, {"success": False})})
    assert cli.main(["test-post", "--delete", "photo-1"], session=session) == 2
    text = shown(capsys)
    assert "예약된 게시물" in text
    assert has_hangul(text)


def test_delete는_test_post에만_쓸_수_있다(capsys):
    assert cli.main(["schedule", "--month", MONTH, "--delete", "photo-1"]) == 2
    text = shown(capsys)
    assert "--delete" in text
    assert "test-post" in text


def test_test_post도_SystemExit을_삼키지_않는다(토큰):
    with pytest.raises(SystemExit):
        cli.main(["test-post"], session=FakeSession({0: SystemExit(3)}))


# ── test-post: 지우기 전에 그 글인지 본다 (N1) ───────────────────────────────


def test_test_post_delete는_본문이_테스트_글과_같을_때만_지운다(토큰, capsys):
    session = caption_session(cli.TEST_POST_MESSAGE, script={0: FakeResponse(200, {"success": True})})
    assert cli.main(["test-post", "--delete", "61595913932801_122100000000000001"], session=session) == 0
    assert len(session.posts) == 1  # 본문을 읽은 뒤에 한 번만 지운다
    assert session.gets  # 읽지 않고 지우지 않는다
    assert "지웠습니다" in shown(capsys)


def test_test_post_delete는_본문이_다르면_아무것도_지우지_않는다(토큰, capsys):
    """진짜 달 게시물의 id는 `scheduled.json`의 `"결과"`에 같은 모양으로 들어 있고 문서 §4는 그 파일을
    열어 고치라고 가르친다. 잘못 붙여 넣은 id를 그대로 지우면 그 게시물은 원장에 남은 채 조용히 영영
    나가지 않는다 — 이 시스템에서 가장 비싼 사고다."""
    session = caption_session("11월 1일 안내입니다. 무료 상담을 신청하세요.", script={0: FakeResponse(200, {"success": True})})
    assert cli.main(["test-post", "--delete", "61595913932801_122100000000000009"], session=session) == 2
    assert session.posts == []  # 지우기를 아예 보내지 않는다
    text = shown(capsys)
    assert "직접 지우세요" in text
    assert "61595913932801_122100000000000009" in text


@pytest.mark.parametrize("caption", [None, "", "   "])
def test_test_post_delete는_본문이_없으면_지우지_않는다(caption, 토큰, capsys):
    """모를 때 지우지 않는 것이 유일하게 안전한 기본값이다(실제 왕복을 시험할 수 없다)."""
    session = caption_session(caption, script={0: FakeResponse(200, {"success": True})})
    assert cli.main(["test-post", "--delete", "100200300_1"], session=session) == 2
    assert session.posts == []
    assert "직접 지우세요" in shown(capsys)


def test_test_post_delete는_본문을_읽지_못하면_지우지_않는다(토큰, capsys):
    session = FakeSession({}, page=FakeResponse(400, {"error": {"message": "Unsupported get request", "code": 100}}))
    assert cli.main(["test-post", "--delete", "100200300_1"], session=session) == 2
    assert session.posts == []
    text = shown(capsys)
    assert "직접 지우세요" in text
    assert has_hangul(text)


def test_test_post_delete는_id_모양이_아니면_아무_요청도_보내지_않는다(토큰, capsys):
    """`--delete "me/feed"`는 엔드포인트를 바꾼다. 모양 검사가 그것을 먼저 막는다."""
    session = FakeSession({})
    assert cli.main(["test-post", "--delete", "me/feed"], session=session) == 2
    assert session.gets == [] and session.posts == []
    assert has_hangul(shown(capsys))


# ── test-post: 답을 못 받은 것과 거절을 가른다 (N2·N5) ───────────────────────


def test_test_post는_답을_받지_못하면_권한_이야기를_하지_않는다(토큰, capsys):
    """`maybe_created`가 참이면 글이 올라갔을 수 있다. 그 자리에서 "권한이 없다"고 말하면 같은 화면이
    서로 반대인 두 말을 하고, 운영자는 올라간 글을 찾아보지 않는다. 게다가 id가 없어 `--delete`로
    지울 수도 없다."""
    session = FakeSession({0: TimeoutError("read timed out")})
    assert cli.main(["test-post"], session=session) == 2
    text = shown(capsys)
    assert "올라갔을 수 있" in text
    # 권한 안내가 섞이지 않아야 한다. (임시 폴더 이름에 이 시험의 이름이 들어가므로 "권한"이라는 글자
    # 하나로는 걸 수 없다 — 권한 안내가 실제로 쓰는 말로 건다.)
    assert "권한 세 개" not in text and "pages_manage_posts" not in text
    assert "직접 지우세요" in text


def test_test_post는_확정_거절에는_권한을_확인하라고_말한다(토큰, capsys):
    session = FakeSession({0: FakeResponse(403, {"error": {"message": "Permissions error", "code": 200}})})
    assert cli.main(["test-post"], session=session) == 2
    text = shown(capsys)
    assert "권한" in text
    assert "올라갔을 수 있" not in text


def test_test_post_delete가_답을_못_받으면_지워졌는지_모른다고_말한다(토큰, capsys):
    session = caption_session(cli.TEST_POST_MESSAGE, script={0: TimeoutError("read timed out")})
    assert cli.main(["test-post", "--delete", "100200300_1"], session=session) == 2
    text = shown(capsys)
    assert "알 수 없" in text
    assert "직접 지우세요" in text


# ── test-post: 다시 돌려도 조용히 쌓이지 않는다 (N3) ─────────────────────────


def record_path():
    return config.facebook_dir() / cli.TEST_POST_RECORD_FILE


def test_test_post는_올린_글을_적어_두고_다시_돌리면_거절한다(토큰, capsys):
    first = FakeSession({0: FakeResponse(200, {"id": TEST_PHOTO_ID})})
    assert cli.main(["test-post"], session=first) == 0
    recorded = json.loads(record_path().read_text(encoding="utf-8"))
    assert recorded["사진 id"] == TEST_PHOTO_ID
    shown(capsys)  # **첫 실행의 출력을 여기서 비운다.** `capsys`는 누적이라, 비우지 않으면 아래 단언이
    #               첫 실행이 찍은 사진 id와 `--delete` 안내로 채워져 거절 메시지가 아무 말을 안 해도 통과한다.

    second = FakeSession()
    assert cli.main(["test-post"], session=second) == 2
    assert second.uploaded == []  # 둘째 글이 조용히 쌓이지 않는다
    text = shown(capsys)
    assert recorded["사진 id"] in text  # 거절만 하고 id를 숨기면 지울 길을 알려 주지 않는 것이다
    assert "--delete" in text


def test_test_post_delete는_id를_적지_않으면_적어_둔_글을_지운다(토큰, capsys):
    assert cli.main(["test-post"], session=FakeSession({0: FakeResponse(200, {"id": TEST_PHOTO_ID})})) == 0
    assert json.loads(record_path().read_text(encoding="utf-8"))["사진 id"] == TEST_PHOTO_ID

    session = caption_session(cli.TEST_POST_MESSAGE, script={0: FakeResponse(200, {"success": True})})
    assert cli.main(["test-post", "--delete"], session=session) == 0
    assert session.posts[0]["url"].endswith("/" + TEST_PHOTO_ID)
    assert not record_path().exists()  # 지운 뒤에는 기록도 없다
    # 그래서 다음 달에 다시 쓸 수 있다.
    assert cli.main(["test-post"], session=FakeSession({0: FakeResponse(200, {"id": TEST_PHOTO_ID})})) == 0


def test_test_post_delete는_적어_둔_것도_없고_id도_없으면_멈춘다(토큰, capsys):
    session = FakeSession({})
    assert cli.main(["test-post", "--delete"], session=session) == 2
    assert session.gets == [] and session.posts == []
    assert has_hangul(shown(capsys))


def test_test_post_delete가_실패하면_기록을_지우지_않는다(토큰):
    """지워졌는지 모르는 채 기록을 지우면 잊은 글을 되찾을 길이 없어진다."""
    assert cli.main(["test-post"], session=FakeSession({0: FakeResponse(200, {"id": TEST_PHOTO_ID})})) == 0
    session = caption_session(cli.TEST_POST_MESSAGE, script={0: TimeoutError("read timed out")})
    assert cli.main(["test-post", "--delete"], session=session) == 2
    assert record_path().exists()


def test_test_post_delete는_공백만_다른_본문은_같게_본다(토큰):
    """줄바꿈이 어떻게 저장돼 돌아올지 보증되지 않는다. 공백의 종류·개수만 다른 것은 같은 글이다."""
    session = caption_session(cli.TEST_POST_MESSAGE.replace("\n", "   "), script={0: FakeResponse(200, {"success": True})})
    assert cli.main(["test-post", "--delete", "100200300_1"], session=session) == 0
    assert len(session.posts) == 1


@pytest.mark.parametrize(
    "caption",
    [
        cli.TEST_POST_MESSAGE + "\n무료 상담 신청하세요.",
        cli.TEST_POST_MESSAGE[:30],
        cli.TEST_POST_MESSAGE * 2,
        "안내 " + cli.TEST_POST_MESSAGE,
    ],
)
def test_test_post_delete는_가까운_오답도_지우지_않는다(caption, 토큰, capsys):
    """대조를 "부분 포함이면 같다"로 느슨하게 하면 **비슷한 글**을 지우게 된다 — 이 대조가 막는 사고가
    바로 그것이다. 멀쩡히 다른 글(위의 다른 시험)보다 이 가까운 오답들이 경계를 지킨다."""
    session = caption_session(caption, script={0: FakeResponse(200, {"success": True})})
    assert cli.main(["test-post", "--delete", "100200300_1"], session=session) == 2
    assert session.posts == []
    assert "직접 지우세요" in shown(capsys)


# ── test-post: 보내기 **전에** 적는다 (N-a·N-b) ──────────────────────────────


class WatchingSession(FakeSession):
    """POST가 나가는 순간 기록 파일이 어떤 상태였는지 적어 두는 세션(순서를 재는 자리)."""

    def __init__(self, script: dict | None = None, **kwargs):
        super().__init__(script, **kwargs)
        self.record_when_sent: list[dict | None] = []

    def post(self, url, **kwargs):
        path = record_path()
        self.record_when_sent.append(json.loads(path.read_text(encoding="utf-8")) if path.exists() else None)
        return super().post(url, **kwargs)


def test_test_post는_보내기_전에_기록을_적는다(토큰):
    """Task 9의 `_mark_before_sending`과 같은 이유다: 요청이 **나간 뒤에** 적으면 그 사이에 죽는 경우가
    덮이지 않는다. 보내기 전에 적으면 (1) 적지 못했을 때 "아무것도 보내지 않았습니다"가 참이 되고
    (2) 결과를 몰라도 기록이 남아 재실행이 거절한다."""
    session = WatchingSession({0: FakeResponse(200, {"id": TEST_PHOTO_ID})})
    assert cli.main(["test-post"], session=session) == 0
    (before,) = session.record_when_sent
    assert before is not None  # 보내기 전에 이미 적혀 있다
    assert not before["사진 id"]  # 아직 id는 모른다 — 자리표시다
    assert json.loads(record_path().read_text(encoding="utf-8"))["사진 id"] == TEST_PHOTO_ID  # 성공 뒤 덮는다


def test_test_post는_기록을_적지_못하면_아무것도_보내지_않는다(토큰, capsys):
    """이 길이 N-b였다: 보낸 **뒤에** 적다 실패하면 도구가 "페이스북에는 아무것도 보내지 않았습니다"라고
    거짓을 말하고 사진 id도 잃었다. 보내기 전에 적으면 그 말이 참이 된다."""
    folder = config.facebook_dir()
    folder.mkdir(parents=True, exist_ok=True)
    folder.chmod(0o500)
    try:
        try:
            (folder / "쓰기확인.tmp").write_text("x", encoding="utf-8")
        except OSError:
            pass
        else:
            pytest.skip("이 사용자는 읽기 전용 폴더에도 쓸 수 있다(root)")
        session = FakeSession({0: FakeResponse(200, {"id": TEST_PHOTO_ID})})
        assert cli.main(["test-post"], session=session) == 2
    finally:
        folder.chmod(0o700)
    assert session.posts == []  # 진짜로 아무것도 보내지 않았다
    text = shown(capsys)
    assert "아무것도 보내지 않았습니다" in text  # 그러므로 이 말은 참이다
    assert has_hangul(text) and "Errno" not in text


def test_test_post는_결과를_모르면_기록을_남겨_다시_돌리기를_막는다(토큰, capsys):
    """원래 N3이 말한 바로 그 경우다 — 올라갔는지 확신이 없어 한 번 더 돌리는 것."""
    first = FakeSession({0: TimeoutError("read timed out")})
    assert cli.main(["test-post"], session=first) == 2
    assert not json.loads(record_path().read_text(encoding="utf-8"))["사진 id"]
    shown(capsys)

    second = FakeSession()
    assert cli.main(["test-post"], session=second) == 2
    assert second.uploaded == []  # 올라갔는지 모르는 채 둘째 글을 쌓지 않는다
    text = shown(capsys)
    assert schedule.UNKNOWN_RESULT in text  # 무슨 상태인지 말해 준다
    assert str(record_path()) in text  # 확인한 뒤 지울 파일을 말해 준다


def test_test_post는_확정_거절에는_기록을_남기지_않는다(토큰, capsys):
    """Facebook이 분명히 거절했으면 아무것도 만들어지지 않았다. 자리표시를 남기면 권한을 고친 뒤
    다시 돌릴 때 "지난번 글이 남아 있다"고 막는다(`schedule.py`의 `_forget`과 같은 이유다)."""
    session = FakeSession({0: FakeResponse(403, {"error": {"message": "Permissions error", "code": 200}})})
    assert cli.main(["test-post"], session=session) == 2
    assert not record_path().exists()
    assert "권한" in shown(capsys)


def test_test_post는_id를_적지_못해도_올라갔다는_것과_사진_id를_말한다(토큰, capsys, monkeypatch):
    """성공 뒤 갱신이 실패하는 경우만 남는다. 그때 글은 **살아 있으므로** id를 반드시 찍어야 한다 —
    id가 없으면 운영자는 그 글을 지울 수 없고, 30일 뒤 실제로 공개된다."""
    real = cli._write_record
    calls: list[dict] = []

    def flaky(record):
        calls.append(record)
        if len(calls) == 1:
            return real(record)
        raise OSError(28, "No space left on device")

    monkeypatch.setattr(cli, "_write_record", flaky)
    session = FakeSession({0: FakeResponse(200, {"id": TEST_PHOTO_ID})})
    assert cli.main(["test-post"], session=session) == 2
    text = shown(capsys)
    assert TEST_PHOTO_ID in text
    assert "아무것도 보내지 않았습니다" not in text  # 나간 뒤에 그 말을 하면 거짓이다
    assert "--delete" in text  # 지우는 법까지 말해 준다


# ── test-post: 기록 파일이 깨졌을 때 (N-f) ───────────────────────────────────


def write_record_raw(raw: str) -> None:
    record_path().parent.mkdir(parents=True, exist_ok=True)
    record_path().write_text(raw, encoding="utf-8")


@pytest.mark.parametrize("raw", ["{", "", "[]", '{"예약 시각": "x"}', '﻿{"사진 id": "100200300_1"}'])
def test_기록이_깨졌으면_종료코드_2로_멈추고_할_일을_말한다(raw, 토큰, capsys):
    """종료 코드 1은 문서의 표에서 "플랜·본문·역번역에 고칠 것이 있다"는 뜻이다. 이것은 그것이 아니다."""
    write_record_raw(raw)
    session = FakeSession()
    assert cli.main(["test-post"], session=session) == 2
    assert session.uploaded == []
    text = shown(capsys)
    assert str(record_path()) in text  # 어느 파일인지
    assert "지운 뒤" in text  # 무엇을 할지


def test_기록이_깨져도_명시한_id는_지울_수_있다(토큰, capsys):
    """제일 나쁜 경우를 막는다: **살아 있는 글을 지우려는데 파일 하나 때문에 막힌다.** 문서는 id를
    적어도 된다고 가르치고, 그 길은 기록 파일을 필요로 하지 않는다."""
    write_record_raw("{")
    session = caption_session(cli.TEST_POST_MESSAGE, script={0: FakeResponse(200, {"success": True})})
    assert cli.main(["test-post", "--delete", TEST_PHOTO_ID], session=session) == 0
    assert len(session.posts) == 1
    text = shown(capsys)
    assert "지웠습니다" in text
    assert str(record_path()) in text  # 깨진 파일 이야기를 삼키지도 않는다


def test_기록에_사진_id가_없으면_파일이_없다고_말하지_않는다(토큰, capsys):
    write_record_raw('{"사진 id": ""}')
    session = FakeSession({})
    assert cli.main(["test-post", "--delete"], session=session) == 2
    assert session.gets == [] and session.posts == []
    text = shown(capsys)
    assert "사진 id가 없습니다" in text
    assert str(record_path()) in text


def test_기록_쓰기가_끊겨도_앞_내용이_남는다(토큰, monkeypatch):
    """원장과 같은 방식(임시 파일 + 교체)이어야 한다. `write_text`는 쓰다 끊기면 빈 파일을 남기고,
    그 빈 파일은 위 시험이 보는 "깨진 기록" 상태다."""
    assert cli.main(["test-post"], session=FakeSession({0: FakeResponse(200, {"id": TEST_PHOTO_ID})})) == 0
    before = record_path().read_text(encoding="utf-8")

    def refuse(*args, **kwargs):
        raise OSError("바꿔 끼우다 끊겼다")

    # `monkeypatch.undo()`를 부르지 않는다 — 이 픽스처는 `_격리`와 **같은 인스턴스**라서 `config.ROOT`를
    # 임시 폴더로 돌려놓은 것까지 함께 되돌린다(그러면 아래 단언이 진짜 저장소를 본다).
    monkeypatch.setattr(os, "replace", refuse)
    with pytest.raises(OSError):
        cli._write_record({"사진 id": "100200300_2"})
    assert record_path().read_text(encoding="utf-8") == before
    assert list(record_path().parent.glob("*.tmp")) == []  # 임시 파일도 남기지 않는다


# ── test-post 지우기: 느슨한 자리들 (N-h) ────────────────────────────────────


def test_명시한_id를_지워도_기록이_다른_글을_가리키면_기록은_남는다(토큰):
    """기록을 무조건 치우면 적어 둔 글(아직 페이스북에 있는 글)을 잊는다."""
    assert cli.main(["test-post"], session=FakeSession({0: FakeResponse(200, {"id": TEST_PHOTO_ID})})) == 0
    other = "61595913932801_122100000000000123"
    session = caption_session(cli.TEST_POST_MESSAGE, script={0: FakeResponse(200, {"success": True})})
    assert cli.main(["test-post", "--delete", other], session=session) == 0
    assert json.loads(record_path().read_text(encoding="utf-8"))["사진 id"] == TEST_PHOTO_ID


def test_본문을_읽다_예상하지_못한_오류가_나면_직접_지우라고_말한다(토큰, capsys):
    """`main`의 일반 안전망으로 떨어지면 "개발자에게 보여 주세요"로 끝난다 — 운영자가 할 일은
    페이스북에서 눈으로 확인하는 것이다."""
    session = FakeSession({}, page=RuntimeError("설명할 수 없는 오류"))
    assert cli.main(["test-post", "--delete", "100200300_1"], session=session) == 2
    assert session.posts == []
    assert "직접 지우세요" in shown(capsys)


def test_지우다_예상하지_못한_오류가_나면_보내지_않았다고_말하지_않는다(토큰, capsys):
    """삭제 요청은 이미 나갔다. 그 뒤에 "아무것도 보내지 않았습니다"라고 말하면 거짓이고, 운영자는
    페이스북을 다시 보지 않는다."""
    session = caption_session(cli.TEST_POST_MESSAGE, script={0: RuntimeError("설명할 수 없는 오류")})
    assert cli.main(["test-post", "--delete", "100200300_1"], session=session) == 2
    assert len(session.posts) == 1
    text = shown(capsys)
    assert "아무것도 보내지 않았습니다" not in text
    assert "알 수 없" in text


def test_지운_뒤_기록을_치우지_못해도_지웠다고_말하고_그_파일을_알려_준다(토큰, capsys, monkeypatch):
    """삭제는 성공했다. 여기서 `main`의 안전망으로 떨어지면 지운 뒤에 "아무것도 보내지 않았습니다"가
    나온다."""
    assert cli.main(["test-post"], session=FakeSession({0: FakeResponse(200, {"id": TEST_PHOTO_ID})})) == 0
    shown(capsys)

    def refuse(*args, **kwargs):
        raise OSError("지울 수 없다")

    monkeypatch.setattr(Path, "unlink", refuse)  # `undo()`는 부르지 않는다(위 시험의 주석과 같은 이유)
    session = caption_session(cli.TEST_POST_MESSAGE, script={0: FakeResponse(200, {"success": True})})
    assert cli.main(["test-post", "--delete"], session=session) == 0
    text = shown(capsys)
    assert "지웠습니다" in text
    assert "아무것도 보내지 않았습니다" not in text
    assert str(record_path()) in text


# ── schedule: 검증 오류가 토큰 안내에 묻히지 않는다 (m7) ─────────────────────


def test_schedule은_검증_오류가_있고_토큰이_없으면_종료코드_1이다(env, capsys):
    """고칠 것은 플랜이다. 토큰이 없다고 코드 2로 끝내면 문서가 "개발자에게 보여 주세요"로 보낸다.
    관문은 그대로 `schedule.run` 안에 있다 — `findings`는 여전히 그 함수로 흘러간다."""
    fill_worksheet(env, edit=lambda index, text: text + " 취업을 보장합니다." if index == 1 else text)
    assert env.run("schedule", "--month", MONTH, "--confirm", session=FakeSession()) == 1
    text = shown(capsys)
    assert "역번역금지표현" in text
    assert has_hangul(text)


def test_schedule은_검증_오류가_없고_토큰만_없으면_종료코드_2다(env, capsys):
    """위의 다시 던지기는 **검증 오류가 있을 때만** 하는 일이다. 오류가 0건이면 원래 토큰 안내(코드 2)가
    그대로 나와야 한다 — 그러지 않으면 토큰이 없는 운영자가 "플랜을 고치세요"라는 말을 듣는다."""
    fill_worksheet(env)
    assert env.run("schedule", "--month", MONTH, "--confirm", session=FakeSession()) == 2
    text = shown(capsys)
    assert config.TOKEN_ENV_NAME in text
    assert "검증 오류" not in text


def test_schedule의_검증_오류_안내는_토큰이_왜_없는지도_전한다(env, capsys, monkeypatch):
    """토큰 실패는 한 가지가 아니다(설정 없음·셸과 `.env`가 다름·`.env`가 UTF-8이 아님). 원래 예외가
    말하는 것을 버리고 "설정되어 있지 않습니다"로 뭉개면, 플랜을 고친 뒤 **한 번 더** 돌려야 비로소
    진짜 원인을 보게 된다."""
    fill_worksheet(env, edit=lambda index, text: text + " 취업을 보장합니다." if index == 1 else text)
    config.ENV_PATH.write_text(f"{config.TOKEN_ENV_NAME}=파일에-적힌-값\n", encoding="utf-8")
    monkeypatch.setenv(config.TOKEN_ENV_NAME, "셸에-있는-다른-값")
    assert env.run("schedule", "--month", MONTH, "--confirm", session=FakeSession()) == 1
    text = shown(capsys)
    assert "역번역금지표현" in text  # 먼저 고칠 것은 여전히 플랜이다
    assert "서로 다릅니다" in text  # 그런데 토큰이 왜 없는지도 그대로 전한다
    assert "파일에-적힌-값" not in text and "셸에-있는-다른-값" not in text  # 값은 싣지 않는다


# ── 그림을 넣기 전 단계 ─────────────────────────────────────────────────────


def test_그림을_넣기_전에_검사하면_남는_오류는_이미지없음뿐이다(env, capsys):
    """문서 「플랜 작성 지침」 10번이 **그 단계에서 실제로 도달할 수 있는** 멈추는 조건을 적는지 본다.

    플랜을 만드는 단계에는 `images/`가 비어 있고 워크시트도 없다. 그때 `validate`는 게시물마다
    `이미지없음`을 내고 그 뒤 단계(역번역)로 가지 않으므로, "오류 0건"은 **도달할 수 없는 상태**다.
    도달할 수 있는 상태는 "남은 오류가 `이미지없음`뿐"이고, 문서는 그것을 적어야 한다.
    """
    for post in env.plan.posts:
        (env.images / post.image_file).unlink()
    assert not env.worksheet.exists()
    assert env.run("validate", "--month", MONTH) == 1
    text = shown(capsys)
    codes = {
        line.split("]", 1)[1].split("·", 1)[0].strip()
        for line in text.splitlines()
        if line.strip().startswith("[오류]")
    }
    assert codes == {"이미지없음"}, codes
    assert f"오류 {len(env.plan.posts)}건" in text
    # 워크시트가 없다는 오류는 이 단계에 **나타나지 않는다** — 그것을 면제해 주는 문장은 쓸모가 없다.
    assert "역번역 워크시트가 없습니다" not in text


# ── 결과 불명 ────────────────────────────────────────────────────────────────


def test_원장에_있던_결과_불명은_건너뜀에_숨지_않는다(env, 토큰, capsys):
    """지난 실행이 남긴 `결과 불명`은 이번 실행에서 건너뛴 건이기도 하다. 건너뜀으로 세면 **사람이
    확인해야 하는 건**이 "이미 예약됨" 아래로 숨는다 — 둘은 운영자에게 전혀 다른 보고다."""
    fill_worksheet(env)
    env.seed_ledger({0: (schedule.UNKNOWN_RESULT, env.plan.posts[0].image_file)})
    session = FakeSession()
    assert env.run("schedule", "--month", MONTH, "--confirm", session=session) == 2
    text = shown(capsys)
    assert "결과 불명: 1건" in text
    assert "이미 예약돼 건너뜀: 0건" in text
    assert "예약: 5건" in text
    assert session.uploaded == [post.image_file for post in env.plan.posts[1:]]


# ── 예외를 삼키지 않는다 ────────────────────────────────────────────────────


def test_schedule은_SystemExit을_삼키지_않는다(env, 토큰):
    """`except BaseException`은 `SystemExit`까지 잡아 "뜻밖의 오류"로 바꿔 버린다. 종료 코드 2를
    돌려주며 끝난 것처럼 보이는데, 실제로는 프로세스를 끝내려던 신호를 집어삼킨 것이다."""
    fill_worksheet(env)
    with pytest.raises(SystemExit):
        env.run("schedule", "--month", MONTH, "--confirm", session=FakeSession({0: SystemExit(3)}))


def test_check_token도_SystemExit을_삼키지_않는다(토큰):
    session = FakeSession(page=SystemExit(3))
    with pytest.raises(SystemExit):
        cli.main(["check-token", "--month", MONTH], session=session)


def test_schedule은_Ctrl_C에는_원장_확인을_안내한다(env, 토큰, capsys):
    """Ctrl-C는 여전히 한국어 안내로 바꾼다. 날 트레이스백만 보여 주면 요청 직전에 적어 둔 표시를
    아무도 확인하지 않는다."""
    fill_worksheet(env)
    assert env.run("schedule", "--month", MONTH, "--confirm", session=FakeSession({0: KeyboardInterrupt()})) == 2
    text = shown(capsys)
    assert schedule.UNKNOWN_RESULT in text
    assert schedule.CONFIRMED_BY_HAND in text
    assert env.ledger_raw()["0"]["결과"] == schedule.UNKNOWN_RESULT


def test_마지막_손잡이도_토큰을_가린다(env, 토큰, monkeypatch, capsys):
    """`main`의 마지막 `except`는 "여기엔 토큰이 없다"는 불변식에 기대고 있었다. 그 불변식을 지키는
    것은 아무것도 없으므로, 이 손잡이도 `graph._scrub`을 거친다."""

    def boom(month):
        raise RuntimeError(f"어딘가에서 {SENTINEL}이(가) 새어 나왔습니다")

    monkeypatch.setattr(cli, "_paths", boom)
    assert env.run("images", "--month", MONTH) == 2
    text = shown(capsys)
    assert SENTINEL not in text
    assert "RuntimeError" in text
    assert has_hangul(text)


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
    """§3-2만 가진 문장을 못박는다. `원어민`·`banned-phrases.json`은 §6-1에도 있어서, 그 둘만 보면
    §3-2(현지어 금지 검사가 아직 검수되지 않았다는 고백)를 통째로 지워도 초록이었다."""
    doc = doc_text()
    assert "원어민" in doc
    assert "banned-phrases.json" in doc
    assert "사람이 확인한 것은" in doc


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
    """`중복`은 문서 곳곳(`역번역중복`)에 있어 실질 단정이 `재시도` 한 낱말이었다. 왜 위험한지를 말하는
    문장(§7-1만 가진 것)을 못박는다 — 복제가 원장에 남지 않아 아무도 알아챌 수 없다는 것이 이유다."""
    doc = doc_text()
    assert "재시도" in doc
    assert "중복" in doc
    assert "원장에도 남지 않습니다" in doc


def test_운영_문서가_첫_실제_월_전에_할_일을_따로_묶는다():
    """`첫 실제 월`·`테스트 예약`은 §1-4의 상호 참조에도 있어서 §6 전체를 지워도 초록이었다.
    §6-2만 가진 문장(올릴 수 있다는 유일한 증명)을 못박는다."""
    doc = doc_text()
    assert "첫 실제 월" in doc
    assert "테스트 예약" in doc
    assert "유일한 증명" in doc


def test_운영_문서가_출처없는_수치는_경고일_뿐이라고_적는다():
    """§3-3은 「이 도구가 **못 하는 것**」 절 안에 있다. 그 절의 몫은 기계가 지켜 주지 않는 자리를 운영자에게
    알리는 것인데, 거기에 "플랜에 그 숫자를 쓰면 검사에서 막힙니다"라고 적혀 있었다. 실측은 **오류 0건 ·
    경고 10건 · `검증을 통과했습니다` · 종료 코드 0**이다 — 막히지 않는다. 「못 하는 것」 절에 든 거짓 안심은
    그 절의 목적을 뒤집는다.

    `경고`는 문서에 세 곳 있어 그것만으로는 이 문장을 못 박지 못한다. `출처없는수치`는 이 문장만 쓰는
    낱말이다(측정: 고치기 전 문서에 0곳). 경고 코드가 `warning`이라는 것 자체는 `test_validate_copy`가 잠근다.
    """
    doc = doc_text()
    assert "검사에서 막힙니다" not in doc
    assert "출처없는수치" in doc
    assert "예약은 막히지 않습니다" in doc
    assert "「플랜 작성 지침」 4항" in doc


def test_운영_문서가_토큰이_안_먹힐_때_env_한_줄을_먼저_의심하라고_적는다():
    """§1-2에서 값을 따옴표로 싸거나 줄 끝에 메모를 붙이는 것은 사람이 자연스럽게 하는 일이고, 바로 다음 §1-4가
    Facebook의 거절을 「토큰이 유효하지 않거나 만료되었습니다」로 보여 준다. 코드는 두 경우를 모두 떼어 내도록
    고쳤지만(`config._parse_env_value`) 닫는 따옴표를 빠뜨린 경우는 남는다 — 그때 `.env` 한 줄을 의심할 길이
    문서에 없으면 운영자는 멀쩡한 토큰을 계속 재발급한다. `따옴표`는 문서에서 이 자리만 쓰는 낱말이다
    (측정: 적기 전 0곳). `다시 발급`은 §1-1에도 있어서 `다시 발급하기 전에`로 좁힌다.
    """
    doc = doc_text()
    assert "따옴표" in doc
    assert "다시 발급하기 전에" in doc


def test_운영_문서의_플랜_작성_지침이_게시_시각을_직접_지시한다():
    """계획의 전역 제약 「게시 시각 기본값은 JST 저녁」이 플랜을 쓰는 세션에 닿는 유일한 경로가
    `plan_model.py`의 docstring **예시**였다. 운영 문서에는 `19:00`도 `저녁`도 없었고, 플랜 작성 지침 10항목은
    시각을 한 번도 말하지 않았다. 설정 상수 둘(`DEFAULT_POST_TIME_JST`·`LANGUAGE_OFFSET_MINUTES`)이 있었지만
    읽는 코드가 하나도 없어 제약을 지키게 하지 못했다 — `publish_at`은 전부 플랜 JSON에서 온다.

    그래서 지시가 실제로 읽히는 자리(세션에 붙여넣는 글) 안에 있는지를 본다. 문서 어딘가에 있는 것으로는
    모자란다.
    """
    doc = doc_text()
    guide = doc[doc.index("#### 플랜 작성 지침"):doc.index("### 단계 3")]
    assert "T19:00:00+09:00" in guide
    assert "저녁" in guide


def test_운영_문서가_모든_npm_명령을_싣는다():
    doc = doc_text()
    for name in NPM_SCRIPTS:
        assert name in doc, name


def test_운영_문서는_개발자_용어를_쓰지_않는다():
    """운영자는 비개발자 한 명이다. 코드 안의 이름이 문서에 나오면 그 문장은 읽히지 않는다."""
    doc = doc_text()
    for jargon in ("maybe_created", "Outcome", "findings", "LedgerError", "GraphError", "dict["):
        assert jargon not in doc, jargon


def test_운영_문서가_uv_설치를_첫_명령보다_앞에_적는다():
    """운영자는 터미널을 열어 본 적이 없다고 가정한다. 모든 명령이 `uv`를 타므로, 설치 안내가 없으면
    첫 명령에서 `uv: command not found`(종료 코드 127)로 끝나고 이 시스템 전체에 닿지 못한다.
    안내가 **첫 명령보다 앞**에 있어야 한다 — 뒤에 있으면 읽기 전에 막힌다."""
    doc = doc_text()
    for needle in ("uv --version", "astral.sh/uv/install.sh", "node --version", "127"):
        assert needle in doc, needle
    assert doc.index("uv --version") < doc.index("npm run fb:")


def test_운영_문서가_그림_전_단계의_멈추는_조건을_이미지없음으로_적는다():
    """플랜을 만드는 단계에서 "오류 0건"은 도달할 수 없다(그림이 아직 없다). 도달할 수 있는 조건을
    코드 이름 그대로 적어야 플랜 세션이 멈추지도, 고치려고 플랜을 망치지도 않는다."""
    doc = doc_text()
    assert "이미지없음" in doc
    assert "남은 오류가 `이미지없음`뿐" in doc


def test_운영_문서가_노란색에도_부정_뒤집힘이_나타난다고_적는다():
    """검토 화면이 뜻을 보는 유일한 지점이고, 부정 뒤집힘은 노란색으로 나타난다(§3-1이 0.05로 재 둔
    바로 그 변경이다). "노란색은 의역이면 정상"이라고 적으면 그 하나뿐인 사람 검사를 건너뛰게 된다."""
    doc = doc_text()
    assert "의역이면 정상" not in doc
    assert "부정이 뒤집히면 노란색" in doc
    assert "모양을 가리지 말고" in doc


def test_review_안내도_노란색을_건너뛰라고_말하지_않는다(env, capsys):
    """터미널 안내와 화면 안내(`review.py`의 범례)가 서로 다른 방향을 가리키면, 운영자는 먼저 읽은
    쪽을 따른다."""
    fill_worksheet(env)
    assert env.run("review", "--month", MONTH) == 0
    text = shown(capsys)
    assert "노란색" in text
    assert "부정" in text
    assert "의역이면 정상" not in text


def test_운영_문서의_테스트_예약이_한_명령으로_끝난다():
    """손으로 만들 파일 넷(플랜·그림·되번역·원장)을 요구하면 건너뛴다. 명령 둘이면 하게 된다."""
    doc = doc_text()
    assert doc.count("fb:test-post") >= 2  # 올리기와 지우기
    assert "--delete" in doc
    assert "손으로 만들 파일은 없습니다" in doc


def test_운영_문서의_대학_금지_문구_목록이_사전과_맞는다():
    """"여덟 문구"라고 적고 여섯만 실으면, 주어가 없을 때 놓치는 표현 둘을 운영자가 모른다.
    수를 세는 문장과 목록이 같이 틀릴 수 없게 사전에서 끌어와 맞춰 본다."""
    phrases = validate_copy.load_banned_phrases(config.BANNED_PHRASES_PATH)["ko:대학명"]
    doc = doc_text()
    for phrase in phrases:
        assert phrase in doc, phrase
    assert f"{len(phrases)}개 중 0개" in doc


def test_운영_문서가_보내기_전_검사도_실패로_센다고_적는다():
    """예약 시각이 창 밖이면 요청이 나가지도 않는데 `실패`로 세어지고, `validate`를 통과한 플랜이
    `schedule`에서 종료 코드 2로 끝난다. 그때 고칠 것은 플랜의 날짜다 — 개발자에게 보낼 일이 아니다."""
    doc = doc_text()
    assert "보내기 전 검사" in doc
    assert "예약 시각이 너무 가깝거나 멀다" in doc


def test_운영_문서가_연습_실행이_남기는_잠금_파일을_적는다():
    """연습 실행도 잠금 파일을 만든다. 폴더를 열어 본 운영자가 설명 없는 파일을 보게 된다."""
    assert "scheduled.json.lock" in doc_text()


def test_운영_문서가_원장_잠금_안내를_코드와_같은_말로_적는다():
    """운영자는 화면에 나온 글을 문서에서 찾는다. 문서가 다른 말로 적으면 찾지 못한다."""
    말 = "다른 예약 실행이 같은 원장을 쓰고 있어"
    assert 말 in (REPO / "scripts" / "facebook" / "schedule.py").read_text(encoding="utf-8")
    assert 말 in doc_text()


def test_운영_문서가_env는_UTF_8로_저장하라고_적는다():
    """`.env`가 UTF-8이 아니면(편집기가 한국어 주석을 EUC-KR로 저장한 경우) 도구가 한국어로 멈춘다.
    그 자리에서 무엇을 해야 하는지 문서가 미리 말해 두어야 한다."""
    doc = doc_text()
    assert "UTF-8" in doc
    assert ".env" in doc


def test_운영_문서가_그림_전_단계의_npm_오류_덩어리를_설명한다():
    """그 단계의 `validate`는 늘 종료 코드 1로 끝나므로 npm이 자기 오류 덩어리를 찍는다.
    문서가 127만 설명하고 이것을 설명하지 않으면 읽는 쪽이 멈춘 것으로 본다.
    짧은 조각으로 못 박으면 안 된다 — 문서에 이미 있는 `npm ERR! code 127`이 `npm ERR! code 1`을
    품고 있어서, 그 설명을 통째로 지워도 통과했다(변이로 확인했다). 문장 고유의 말까지 함께 본다."""
    doc = doc_text()
    assert "`npm ERR! code 1` 덩어리" in doc
    assert "그 단계에서는 정상이고" in doc
    # npm 버전에 따라 이 덩어리는 아예 안 찍힌다(측정: npm 11.10.1). 단정하면 그것이 거짓이 된다.
    assert "찍을 수 있습니다" in doc


def test_운영_문서의_테스트_글_지우기가_본문_대조와_기록을_적는다():
    """운영자가 아는 것 넷. **짧은 조각으로 못박지 않는다** — `"--delete"`(문서에 세 번)나
    `"본문"`(스물여덟 번)은 이 문단을 통째로 지워도 참이므로 못이 아니다(변이로 확인했다).
    문단이 사라지면 함께 사라지는 말로 건다."""
    doc = doc_text()
    assert "본문을 읽어 테스트 글과 같은지 대조" in doc  # 엉뚱한 id는 지워지지 않는다
    assert "id를 적지 않으면" in doc  # id를 적지 않아도 된다
    assert "테스트 글이 두 건 쌓이지 않게" in doc  # 지우기 전에는 새로 못 올린다
    # 손으로 지운 뒤에는 이 파일도 지운다. `"test-post.json"`만으로는 못이 아니다 — 1번 항목에도 그 이름이
    # 있어서 이 문단을 지워도 통과한다(변이로 확인했다. 이 부류의 다섯째다).
    assert "손으로 지웠을 때는" in doc
    assert "test-post.json" in doc


def test_운영_문서가_거절과_답을_못_받은_것을_가려_말한다():
    """N2가 코드에서 가른 둘을 문서도 가려 말해야 한다. 라운드 2의 이 문서 수정에는 시험이 없었다 —
    지워도 아무것도 빨개지지 않았다."""
    doc = doc_text()
    assert "거절당했다고 나오면" in doc  # 글은 올라가지 않았다 → 권한을 본다
    assert "권한 문제가 아닙니다" in doc  # 답을 못 받았다 → 눈으로 확인한다


def test_운영_문서가_결과_불명_기록을_어떻게_치우는지_적는다():
    """보내기 전에 적으므로, 결과를 모른 채 끝나면 `결과 불명` 기록이 남아 다음 실행을 막는다.
    그 상태에서 무엇을 해야 하는지가 문서에 없으면 운영자는 막힌 채로 멈춘다."""
    doc = doc_text()
    assert "결과 불명" in doc
    assert "눈으로 확인한 뒤 이 파일을 지우고 다시 실행" in doc
