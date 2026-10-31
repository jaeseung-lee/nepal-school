"""월간 운영 명령줄 도구. 사람이 이 시스템을 쓰는 유일한 문이다.

운영자는 비개발자 한 명(사업주)이고 터미널로만 본다. 그래서 이 모듈의 요구는 "기능이 있다"가 아니라
**출력을 읽고 그대로 따라 할 수 있다**이다. 아래가 그 결정이다.

- **서브커맨드는 한 달의 순서 그대로다.** `check-token` → (플랜 작성은 Claude Code 세션이 한다) →
  `images` → `backtranslate-template` → `validate` → `review` → `schedule`. 명령마다 끝에 다음 단계를
  적어 두어, 운영자가 문서를 다시 펴지 않아도 한 줄씩 따라갈 수 있게 한다.
- **`test-post`는 달의 순서 밖에 있다.** "이 토큰으로 글을 올릴 수 있다"는 증명은 `check-token`이 하지 못하고
  (읽기만 본다) 테스트 글 1건을 올려 보는 것뿐인데, 그 1건을 올리려고 플랜·그림·되번역·원장을 손으로 만들게
  하면 비개발자는 건너뛴다. 그래서 본문과 그림을 저장소가 들고, 명령 둘(`test-post` → `test-post --delete`)로
  끝낸다. 이 경로는 달 폴더를 읽지도 쓰지도 않으므로 `--month`를 받지 않고 원장에도 적지 않는다.
- **`--month YYYY-MM`은 `test-post` 말고 모든 서브커맨드에서 필수이고 기본값이 없다.** "이번 달"로 기본값을 두면 11월
  게시물을 10월에 준비하는 평상시 운영에서 조용히 다른 달 폴더를 읽는다. 어느 달인지는 사람이 적는다.
- **`schedule`은 기본이 연습(dry-run)이고 실제 예약은 `--confirm`이 있어야 한다.** 손이 미끄러져 30건이
  나가는 일이 없어야 한다. npm 스크립트에도 `--confirm`을 박아 넣지 않는다.
- **종료 코드는 셋이다.** `0` 성공 / `1` 입력에 문제가 있어 다음 단계로 갈 수 없음(플랜·사실·문구·역번역
  워크시트의 오류) / `2` 실행 자체가 안 됨(사용법, 토큰, Facebook, 원장, 뜻밖의 오류). `schedule`은 모든
  게시물이 `ok`일 때만 0이다.
- **토큰은 `config.load_token()`에서 받아 `graph`·`schedule`에 인자로 넘기는 것 외에 아무 데도 가지 않는다.**
  명령줄 옵션으로 받지 않는다(명령줄 인자는 `ps`에 보인다). 토큰을 손에 쥔 구간에서 빠져나오는 예외는 그
  자리에서 `graph._scrub`을 거쳐 가려진다 — `graph`가 자기 메시지를 가리는 것과 같은 함수를 쓴다(퍼센트
  인코딩 모양까지 아는 곳이 그 하나뿐이라, 여기서 같은 일을 다시 구현하면 둘이 어긋난다). 토큰을 쥐지 않은
  자리의 마지막 손잡이도 같은 함수를 거친다 — "여기에는 토큰이 없다"는 불변식을 지키는 것이 아무것도 없다.
- **뜻밖의 예외를 잡는 자리는 `(Exception, KeyboardInterrupt)`까지다.** Ctrl-C는 원장에 남은 표시를 확인하라고
  일러 줘야 하므로 잡지만, `BaseException`으로 넓히면 `SystemExit`까지 삼켜 프로세스를 끝내려던 신호가
  "뜻밖의 오류" 한 줄로 바뀐다.
- **`requests`는 지연 임포트다.** 네트워크를 타는 두 서브커맨드(`check-token`·`schedule`)가 실제 세션을
  만들 때만 임포트한다. `images`·`validate`·`review`는 `requests` 없이 돌아야 하고(검증은 오프라인이다),
  테스트는 가짜 세션을 넣는다.
- **호출 순서가 고정되어 있다**(선행 task들이 정한 것이고, 어기면 보호가 꺼진다):
  `validate_copy` → `backtranslation.worksheet` → `backtranslation.load(path, plan=…, glossary=…)` →
  `validate_backtranslation` **그리고** `validate_copy.validate_back_copy`. 앞의 것이 먼저인 까닭은
  `worksheet`가 본문이 그 언어의 CTA로 끝나지 않으면 멈추기 때문이고, `load`에 `plan`과 `glossary`를
  **둘 다** 넘겨야 낡은 워크시트(다른 달·고친 본문)를 알아채기 때문이다. `validate_back_copy`는 "원문에 없는
  약속이 아무도 읽지 못하는 말로 나가는 것"을 막는 **유일한 기계 검사**다 — 부르지 않으면 그 검사가 아예
  없는 것과 같다.
- **`schedule`에 넘기는 `findings`는 모든 검증기의 결과 전부다.** 빈 목록을 넘기면 `schedule`의 구조적
  관문이 통과해 검증하지 않은 플랜이 발행된다.
- **`"결과 불명"`은 성공도 실패도 아닌 셋째 모양으로 센다.** 성공으로 묶으면 사람이 확인하지 않고 그
  게시물은 조용히 빠진다. 건너뜀(원장에 이미 있던 건)과 이번에 올린 건도 가른다 — "27건 예약, 3건은 이미
  예약돼 건너뜀"은 "30건 예약"과 전혀 다른 보고다.
- **같은 까닭의 실패는 묶어 한 번만 적는다.** 토큰이 무효면 30건이 글자까지 같은 거절을 내므로, 줄줄이
  서른 번 찍으면 운영자가 진짜 다른 실패 한 건을 그 사이에서 놓친다.
"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

from . import backtranslation, config, graph, review, schedule, validate_copy, validate_structure
from .facts import Fact, FactsError, load_facts
from .findings import Finding, _ordered
from .plan_model import Plan, PlanError, load_plan

COMMANDS: tuple[str, ...] = (
    "check-token",
    "images",
    "backtranslate-template",
    "validate",
    "review",
    "schedule",
    "test-post",
)

# `--month`를 받는 명령. `test-post`는 한 달의 일이 아니다 — 묶어 둔 자리표시 그림으로 1건을 올려 보고 지우는,
# 토큰 하나를 재는 명령이라 달 폴더를 읽지도 쓰지도 않는다. `--month`를 받아 무시하면 "그 달의 플랜에서 한 건을
# 올린다"로 읽히므로 아예 받지 않는다.
MONTH_COMMANDS: tuple[str, ...] = tuple(name for name in COMMANDS if name != "test-post")

# 한 달 폴더 안의 파일 이름. 운영자가 폴더를 열어 보고 고치는 이름이라 한곳에 모아 둔다.
PLAN_FILE = "plan.json"
IMAGES_DIR = "images"
WORKSHEET_FILE = "backtranslation.json"
REVIEW_FILE = "review.html"
LEDGER_FILE = "scheduled.json"

_DOC = "docs/facebook-운영.md"

# 테스트 글 1건. "이 토큰으로 글을 올릴 수 있다"는 유일한 증명이고, 운영자가 손으로 만들 것이 하나도 없어야
# 실제로 이뤄진다(플랜도 그림도 되번역도 원장도 쓰지 않는다). 본문에는 약속이 없고, 세 현지어 글자가 페이스북을
# 지나면서 깨지지 않는지도 이 1건으로 같이 본다.
TEST_POST_MESSAGE = (
    "[테스트] 정우인재개발원 페이스북 예약 도구를 점검하려고 올린 글입니다. 확인한 뒤 지웁니다.\n"
    "글자 깨짐 확인: Tiếng Việt · မြန်မာ · नेपाली"
)

# 예약 창은 지금부터 10분 ~ 75일이다. 그 안에서 넉넉히 뒤로 둔다 — 지우는 것을 잊어도 알아챌 시간이 길고,
# 예약 글은 그 시각까지 공개되지 않는다. 너무 가까우면 눈으로 확인하기 전에 공개될 수 있다.
TEST_POST_LEAD = timedelta(days=30)


class _Stop(Exception):
    """여기서 멈추고 이 글을 보여 주고 이 종료 코드로 끝낸다. 코드 0은 표준 출력, 나머지는 표준 오류로 나간다."""

    def __init__(self, message: str, code: int):
        super().__init__(message)
        self.message = message
        self.code = code


def _now() -> datetime:
    """지금 시각(이 컴퓨터의 시간대). 예약 창 판정에 쓰고, 테스트는 이것을 바꿔 끼운다."""
    return datetime.now(timezone.utc).astimezone()


def _real_session():
    """진짜 `requests.Session`을 만든다. `requests`는 여기서만, 쓸 때만 임포트한다."""
    import requests  # 지연 임포트: 검증·검토 서브커맨드는 requests 없이 돌아야 한다

    # **이 세션에 재시도를 달지 말 것.** `HTTPAdapter(max_retries=Retry(...))`를 마운트하면 실패한 POST를
    # urllib3가 그 아래에서 조용히 다시 보내는데, `graph`는 자기가 보낸 요청 하나만 알고 그 재시도는 모른다.
    # 사진 예약은 멱등이 아니므로 재시도된 POST는 같은 사진을 같은 날짜에 한 번 더 예약하고, 그 복제는
    # "결과 불명" 회계 밖에서 일어나 원장에도 남지 않는다 — 운영자가 알아챌 길이 없다.
    # `requests.Session()`의 기본은 어댑터 재시도 0이므로 **아무것도 하지 않는 것이 맞는 선택이다.**
    # 네트워크가 불안해 보일 때 손댈 곳은 여기가 아니라 다시 실행하는 것이다(원장이 이미 올린 건을 건너뛴다).
    return requests.Session()


def _describe(exc: BaseException, token: str) -> str:
    """예외를 한 줄로. `graph`가 자기 메시지를 가리는 것과 같은 함수로 토큰을 가린다."""
    return graph._scrub(f"{type(exc).__name__}: {exc}", token)


def _scrub_unknown(text: str) -> str:
    """토큰을 쥐고 있지 않은 자리에서 찍는 글을 가린다. 토큰을 **여기서 한 번 더 읽어** 가린다.

    "이 자리에는 토큰이 없는 예외만 온다"는 불변식은 지금 참이지만 지키는 것이 아무것도 없다(`try` 밖의 줄이
    늘어나면 조용히 깨진다). 토큰을 읽지 못하면 가릴 것도 없으므로 그때는 글을 그대로 둔다.
    """
    try:
        token = config.load_token()
    except Exception:
        return text
    return graph._scrub(text, token)


# ── 인자 ─────────────────────────────────────────────────────────────────────


def _usage() -> str:
    return "\n".join((
        "페이스북 월간 예약 게시 도구",
        "",
        "쓰는 법 (달은 그 달로 바꾸세요):",
        "  npm run fb:check-token -- --month 2026-11            토큰이 살아 있는지 본다",
        "  npm run fb:images -- --month 2026-11                 이미지 프롬프트와 저장할 파일 이름을 낸다",
        "  npm run fb:backtranslate-template -- --month 2026-11  역번역 워크시트를 만든다",
        "  npm run fb:validate -- --month 2026-11               플랜·본문·역번역을 검사한다",
        "  npm run fb:review -- --month 2026-11                 사람이 읽을 검토 화면을 만든다",
        "  npm run fb:schedule -- --month 2026-11               연습 실행(아무것도 올리지 않는다)",
        "  npm run fb:schedule -- --month 2026-11 --confirm     실제로 예약한다",
        "  npm run fb:test-post                                 테스트 글 1건을 올려 본다(달을 받지 않는다)",
        "  npm run fb:test-post -- --delete <사진 id>            그 테스트 글을 지운다",
        "",
        "명령: " + ", ".join(COMMANDS),
        "옵션: --month YYYY-MM (test-post 말고는 필수)  ·  --confirm (schedule에서만, 실제로 올릴 때)",
        "      --delete <사진 id> (test-post에서만)",
        "",
        "종료 코드: 0 성공 · 1 플랜·본문·역번역에 고칠 것이 있음 · 2 실행이 안 됨(사용법·토큰·페이스북·원장)",
        f"월간 절차 전체는 {_DOC}에 있습니다.",
    ))


@dataclass(frozen=True)
class _Args:
    command: str
    month: str  # `test-post`에서는 빈 문자열이다(달 폴더를 쓰지 않는다)
    confirm: bool
    delete: str | None = None


def _parse(argv: list[str]) -> _Args:
    """명령줄을 읽는다. 잘못되면 `_Stop`. 토큰은 받지 않는다(명령줄 인자는 `ps`에 보인다)."""
    if not argv:
        raise _Stop(f"무엇을 할지 적어 주세요.\n\n{_usage()}", 2)
    if argv[0] in ("-h", "--help"):
        return _help()
    command, rest = argv[0], argv[1:]
    if command not in COMMANDS:
        raise _Stop(f"'{command}'은(는) 없는 명령입니다.\n\n{_usage()}", 2)

    month: str | None = None
    confirm = False
    delete: str | None = None
    position = 0
    while position < len(rest):
        argument = rest[position]
        if argument in ("-h", "--help"):
            return _help()
        if argument == "--delete":
            if position + 1 >= len(rest):
                raise _Stop("--delete 뒤에 지울 사진 id를 적어 주세요 (올릴 때 화면에 찍힌 그 값입니다).", 2)
            delete, position = rest[position + 1], position + 2
            continue
        if argument == "--month":
            if position + 1 >= len(rest):
                raise _Stop("--month 뒤에 달을 적어 주세요 (예: --month 2026-11).", 2)
            month, position = rest[position + 1], position + 2
            continue
        if argument.startswith("--month="):
            month, position = argument[len("--month="):], position + 1
            continue
        if argument == "--confirm":
            confirm, position = True, position + 1
            continue
        raise _Stop(f"'{argument}'은(는) 이 도구가 아는 옵션이 아닙니다.\n\n{_usage()}", 2)

    if delete is not None and command != "test-post":
        raise _Stop(
            f"--delete는 test-post 명령에만 씁니다. '{command}'은(는) 페이스북에서 아무것도 지우지 않습니다. "
            f"예약한 게시물을 지우려면 페이스북 페이지의 예약된 게시물 목록에서 직접 지우세요.",
            2,
        )
    if command == "test-post":
        if month is not None:
            raise _Stop(
                "test-post는 --month를 받지 않습니다. 저장소에 들어 있는 테스트용 그림으로 1건만 올려 보는 "
                "명령이라 그 달의 플랜·그림·원장을 읽지도, 쓰지도 않습니다. --month를 빼고 다시 실행하세요.",
                2,
            )
        return _Args(command=command, month="", confirm=confirm, delete=delete)
    if month is None:
        raise _Stop(
            f"--month가 없습니다. 어느 달의 게시물인지 적어 주세요 (예: --month 2026-11).\n\n{_usage()}", 2
        )
    if confirm and command != "schedule":
        raise _Stop(
            f"--confirm은 schedule 명령에만 씁니다. '{command}'은(는) 페이스북에 아무것도 보내지 않으므로 "
            f"확인이 필요하지 않습니다. --confirm을 빼고 다시 실행하세요.",
            2,
        )
    try:
        config.month_dir(month)  # 달 형식 판정은 config 한 곳에 둔다
    except ValueError as exc:
        raise _Stop(str(exc), 2) from None
    return _Args(command=command, month=month, confirm=confirm, delete=None)


def _help() -> _Args:
    raise _Stop(_usage(), 0)


# ── 경로와 입력 ──────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class _Paths:
    month: str
    month_dir: Path
    images: Path
    plan: Path
    worksheet: Path
    review: Path
    ledger: Path


def _paths(month: str) -> _Paths:
    month_dir = config.month_dir(month)
    return _Paths(
        month=month,
        month_dir=month_dir,
        images=month_dir / IMAGES_DIR,
        plan=month_dir / PLAN_FILE,
        worksheet=month_dir / WORKSHEET_FILE,
        review=month_dir / REVIEW_FILE,
        ledger=month_dir / LEDGER_FILE,
    )


@dataclass(frozen=True)
class _Data:
    """달과 무관한 입력: 사실·용어집·대학 목록·금지 표현 사전."""

    facts: dict[str, Fact]
    glossary: dict
    universities: list[dict]
    banned: dict[str, tuple[str, ...]]


def _read_json(path: Path, label: str):
    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        raise _Stop(f"{label} 파일을 찾을 수 없습니다: {path}", 1) from None
    except OSError:
        raise _Stop(f"{label} 파일을 읽을 수 없습니다(경로와 권한을 확인하세요): {path}", 1) from None
    except UnicodeDecodeError:
        raise _Stop(f"{label} 파일이 UTF-8 텍스트가 아닙니다: {path}", 1) from None
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise _Stop(f"{label} 파일이 올바른 JSON이 아닙니다: {path} (줄 {exc.lineno}, 열 {exc.colno})", 1) from None


def _load_plan(paths: _Paths) -> Plan:
    try:
        return load_plan(paths.plan)
    except PlanError as exc:
        raise _Stop(
            f"{exc}\n플랜은 Claude Code 세션이 {paths.month_dir}에 {PLAN_FILE}으로 만듭니다. "
            f"{_DOC}의 '플랜 만들기'를 보세요.",
            1,
        ) from None


def _load_data() -> _Data:
    try:
        facts = load_facts(config.FACTS_PATH)
        banned = validate_copy.load_banned_phrases(config.BANNED_PHRASES_PATH)
    except FactsError as exc:
        raise _Stop(str(exc), 1) from None
    except validate_copy.BannedPhrasesError as exc:
        raise _Stop(str(exc), 1) from None
    glossary = _read_json(config.GLOSSARY_PATH, "용어집")
    universities = _read_json(config.UNIVERSITIES_PATH, "대학 목록")
    if not isinstance(glossary, dict):
        raise _Stop(f"용어집 파일의 최상위는 객체여야 합니다: {config.GLOSSARY_PATH}", 1)
    if not isinstance(universities, list):
        raise _Stop(f"대학 목록 파일의 최상위는 목록이어야 합니다: {config.UNIVERSITIES_PATH}", 1)
    return _Data(facts=facts, glossary=glossary, universities=universities, banned=banned)


def _token() -> str:
    try:
        return config.load_token()
    except RuntimeError as exc:
        # `config`의 메시지가 어디에 무엇을 적어야 하는지 이미 말한다. 토큰 값은 담기지 않는다.
        raise _Stop(f"{exc}\n발급 절차는 {_DOC}의 '최초 1회 준비'에 있습니다.", 2) from None


# ── 검증 ─────────────────────────────────────────────────────────────────────


def _is_error(finding: Finding) -> bool:
    return finding.severity == "error"


def _before_worksheet(plan: Plan, paths: _Paths, data: _Data) -> list[Finding]:
    """구조·사실·문구 검증. 역번역 단계보다 **먼저** 돌아야 한다 — `backtranslation.worksheet`는 본문이 그
    언어의 CTA로 끝나지 않으면 멈추므로, 문구 검증을 건너뛰면 한국어 안내 대신 예외가 튀어나온다."""
    findings = validate_structure.validate_structure(plan, paths.images)
    findings += validate_structure.validate_facts(plan, data.facts)
    try:
        findings += validate_copy.validate_copy(
            plan, data.universities, data.banned, data.glossary, data.facts
        )
    except ValueError as exc:
        # 입력이 비어 검사가 조용히 꺼지는 경우다(빈 용어집 값, 이름 없는 대학 항목 등).
        raise _Stop(f"검증을 시작할 수 없습니다. {exc}", 1) from None
    return _ordered(findings)


def _load_worksheet(paths: _Paths, plan: Plan, glossary: dict) -> dict[int, str]:
    """채워 온 역번역 워크시트를 읽는다. **`plan`과 `glossary`를 둘 다 넘긴다** — 그래야 다른 달의 워크시트와
    워크시트를 채운 뒤 본문을 고친 게시물을 알아챈다. 하나만 넘기면 그 확인이 조용히 빠진다."""
    if not paths.worksheet.exists():
        raise _Stop(
            f"역번역 워크시트가 없습니다: {paths.worksheet}\n"
            f"먼저 `npm run fb:backtranslate-template -- --month {paths.month}`로 워크시트를 만들고, "
            f"별도의 Claude Code 세션에서 되번역을 채운 뒤 다시 실행하세요. 역번역이 없으면 현지어 본문이 "
            f"한국어 원문과 같은 뜻인지 사람이 볼 수 없습니다.",
            1,
        )
    try:
        return backtranslation.load(paths.worksheet, plan=plan, glossary=glossary)
    except backtranslation.WorksheetError as exc:
        raise _Stop(str(exc), 1) from None


def _validate_all(plan: Plan, paths: _Paths, data: _Data) -> tuple[list[Finding], dict[int, str] | None]:
    """모든 검증기를 고정된 순서로 돌린다. 되번역을 읽지 못한 경우(앞 단계에 오류)는 `back`이 `None`이다."""
    findings = _before_worksheet(plan, paths, data)
    if any(_is_error(finding) for finding in findings):
        # 문구 검증을 통과하지 않은 본문으로 역번역을 견주는 것은 뜻이 없고, 워크시트 쪽이 먼저 멈춘다.
        return findings, None
    back = _load_worksheet(paths, plan, data.glossary)
    findings += backtranslation.validate_backtranslation(plan, back, data.glossary)
    # 되번역에 한국어 금지 목록을 겹쳐 거는 검사. 사람이 검수한 사전이 한국어 목록 하나뿐이라, 세 현지어
    # 본문에 걸리는 기계 검사는 이것뿐이다 — 이 줄이 없으면 "없는 약속"을 막는 검사가 존재하지 않는다.
    findings += validate_copy.validate_back_copy(plan, back, data.banned, data.glossary)
    return _ordered(findings), back


def _where(finding: Finding) -> str:
    return "플랜 전체" if finding.post_index is None else f"게시물 {finding.post_index}번"


def _print_findings(findings: list[Finding], *, warnings_in_full: bool = True) -> int:
    """검증 결과를 보여 주고 오류 건수를 돌려준다.

    오류는 늘 글자 그대로 전부 보여 준다. 경고는 `validate`·`review`에서는 전부 보여 주지만
    `schedule`에서는 코드별로 한 줄로 줄인다(`warnings_in_full=False`): 흠 없는 한 달에도
    `역번역중복` 경고가 스무 건쯤 나므로, 예약할 때마다 같은 긴 글 스무 문단을 다시 찍으면
    운영자가 그 아래의 예약 결과를 **스크롤로 넘기는 것**을 배우게 된다. 경고를 읽는 자리는
    검토 화면이고, 예약 화면에서 볼 것은 무엇이 올라갔는지다.
    """
    errors = [finding for finding in findings if _is_error(finding)]
    warnings = [finding for finding in findings if not _is_error(finding)]
    print(f"검증 결과: 오류 {len(errors)}건, 경고 {len(warnings)}건")
    for finding in errors:
        print(f"  [오류] {finding.code} · {_where(finding)} — {finding.message}")
    if warnings_in_full:
        for finding in warnings:
            print(f"  [경고] {finding.code} · {_where(finding)} — {finding.message}")
    else:
        by_code: dict[str, list[Finding]] = {}
        for finding in warnings:
            by_code.setdefault(finding.code, []).append(finding)
        for code, group in by_code.items():
            where = ", ".join(_where(finding) for finding in group)
            print(f"  [경고] {code} {len(group)}건 ({where}) — 자세한 내용은 검토 화면에서 보세요")
    return len(errors)


# ── 서브커맨드 ───────────────────────────────────────────────────────────────


def _check_token(args: _Args, session) -> int:
    token = _token()
    try:
        status = graph.check_token(token, config.PAGE_ID, session=session or _real_session())
    except graph.GraphError as exc:
        raise _Stop(str(exc), 2) from None
    except (Exception, KeyboardInterrupt) as exc:
        # 토큰을 쥔 구간에서 나오는 예외는 여기서 가린다. `BaseException`으로 넓히지 않는다 — `SystemExit`까지
        # 삼키면 프로세스를 끝내려던 신호가 "뜻밖의 오류" 한 줄로 바뀐다.
        raise _Stop(f"토큰 점검 중에 예상하지 못한 오류가 났습니다 ({_describe(exc, token)}).", 2) from None
    print(status.message)
    if not status.ok:
        print()
        print(
            f"토큰을 다시 발급해 {config.ENV_PATH}의 {config.TOKEN_ENV_NAME}을(를) 고친 뒤 다시 실행하세요. "
            f"절차는 {_DOC}의 '최초 1회 준비'에 있습니다."
        )
        return 2
    print()
    print(f"다음 단계: npm run fb:images -- --month {args.month}")
    return 0


def _test_post(args: _Args, session) -> int:
    """테스트 글 1건을 올리거나(`--delete` 없이) 그 1건을 지운다(`--delete <사진 id>`).

    이것이 **"이 토큰으로 글을 올릴 수 있다"는 유일한 증명**이다(`check-token`은 읽기만 증명한다). 그래서
    운영자가 손으로 만들 것이 하나도 없어야 한다 — 플랜도, 그림도, 되번역도, 원장도 쓰지 않고, 달 폴더를
    만들지도 않는다. 본문과 그림은 저장소가 들고 있다.

    **원장에 적지 않는다.** 원장은 "그 달의 게시물 가운데 무엇을 이미 올렸는가"를 적는 파일이고, 이 1건은 그
    달의 게시물이 아니다. 대신 사진 id를 찍고 그것으로 지우는 명령을 그 자리에 보여 준다.
    """
    token = _token()
    session = session or _real_session()
    if args.delete is not None:
        try:
            graph.delete_post(token, args.delete, session=session)
        except graph.GraphError as exc:
            raise _Stop(str(exc), 2) from None
        except (Exception, KeyboardInterrupt) as exc:
            raise _Stop(
                f"테스트 글을 지우는 중에 예상하지 못한 오류가 났습니다 ({_describe(exc, token)}). "
                f"페이스북 페이지의 예약된 게시물 목록에서 그 글이 남아 있는지 눈으로 확인하세요.",
                2,
            ) from None
        print(f"테스트 글을 지웠습니다 (사진 id {args.delete}).")
        print("페이스북 페이지의 예약된 게시물 목록에서 그 글이 사라졌는지 눈으로 확인하세요.")
        return 0

    image = config.TEST_POST_IMAGE_PATH
    if not image.exists():
        raise _Stop(
            f"테스트 글에 쓰는 그림이 저장소에 없습니다: {image}\n"
            f"이 파일은 저장소와 함께 오는 것이라, 없으면 받아 온 파일이 온전하지 않습니다. 개발자에게 알리세요.",
            2,
        )
    now = _now()
    publish_at = now + TEST_POST_LEAD
    try:
        graph.assert_schedulable(publish_at, now)
        post_id = graph.schedule_photo_post(
            token, config.PAGE_ID, image, TEST_POST_MESSAGE, publish_at, session=session
        )
    except graph.GraphError as exc:
        raise _Stop(
            f"{exc}\n테스트 글이 올라가지 않았다면 이 토큰으로는 글을 올릴 수 없습니다. 권한 세 개"
            f"({', '.join(graph.REQUIRED_PERMISSIONS)})를 다시 확인하세요 — 절차는 {_DOC}의 '최초 1회 준비'에 있습니다.",
            2,
        ) from None
    except (Exception, KeyboardInterrupt) as exc:
        raise _Stop(
            f"테스트 글을 올리는 중에 예상하지 못한 오류가 났습니다 ({_describe(exc, token)}). "
            f"페이스북 페이지의 예약된 게시물 목록을 눈으로 확인하세요 — 글이 올라갔을 수도 있습니다.",
            2,
        ) from None

    print(f"테스트 글 1건을 예약했습니다 (사진 id {post_id}).")
    print(f"  예약 시각: {publish_at.strftime('%Y-%m-%d %H:%M')} (지금부터 {TEST_POST_LEAD.days}일 뒤)")
    print(f"  그림: {image}")
    print("  원장에는 아무것도 적지 않았습니다. 이 1건은 그 달의 게시물이 아닙니다.")
    print()
    print(
        "눈으로 확인할 것: 페이스북 페이지의 '예약된 게시물' 목록에 이 글이 보이는지. 보이면 이 토큰으로 글을 "
        "올릴 수 있다는 것이 증명된 것입니다. 미얀마 문자와 데바나가리가 네모로 보이지 않는지도 같이 보세요."
    )
    print("확인한 뒤 지우세요(그대로 두면 위 시각에 실제로 공개됩니다):")
    print(f"  npm run fb:test-post -- --delete {post_id}")
    return 0


def _images(args: _Args) -> int:
    paths = _paths(args.month)
    plan = _load_plan(paths)
    print(f"{args.month} 이미지 프롬프트 {len(plan.posts)}건")
    print()
    print("아래 프롬프트를 하나씩 그림 도구(ChatGPT 등)에 붙여넣고, 받은 그림을 적힌 파일 이름 그대로 이 폴더에 저장하세요:")
    print(f"  {paths.images}")
    print()
    print("프롬프트마다 아래 두 문구가 글자 그대로 들어 있어야 합니다(검증이 글자로 찾습니다):")
    print(f"  {config.IMAGE_PROMPT_NO_TEXT}")
    print(f"  {config.IMAGE_PROMPT_NO_REAL_SUBJECTS}")
    print("  (글자: 그림 도구가 미얀마 문자·데바나가리를 깨뜨려 그린다 / 삽화: AI 그림이 실제 기록 사진으로 읽히면 안 된다)")
    for post in plan.posts:
        print()
        print(f"[{post.index}] 저장할 파일 이름: {post.image_file}   ({post.publish_at.date()} · {post.language})")
        print(post.image_prompt)
    print()
    print(f"그림을 다 넣은 뒤: npm run fb:backtranslate-template -- --month {args.month}")
    return 0


def _backtranslate_template(args: _Args) -> int:
    paths = _paths(args.month)
    if paths.worksheet.exists():
        raise _Stop(
            f"역번역 워크시트가 이미 있습니다: {paths.worksheet}\n"
            f"덮어쓰면 채워 둔 되번역이 사라지므로 아무것도 하지 않았습니다. 플랜을 고쳐서 워크시트를 다시 "
            f"만들어야 한다면, 이 파일을 다른 이름으로 옮기거나 지운 뒤 실행하세요.",
            2,
        )
    plan = _load_plan(paths)
    data = _load_data()
    findings = _before_worksheet(plan, paths, data)  # 문구 검증이 먼저다
    if _print_findings(findings):
        raise _Stop(
            "오류가 있어 워크시트를 만들지 않았습니다. 현지어 본문이 승인된 상담 문구로 끝나지 않으면 "
            "워크시트를 낼 수 없습니다. 위의 오류를 모두 고친 뒤 다시 실행하세요.",
            1,
        )
    try:
        sheet = backtranslation.worksheet(plan, data.glossary)
    except ValueError as exc:
        raise _Stop(f"워크시트를 만들 수 없습니다. {exc}", 1) from None
    paths.worksheet.write_text(json.dumps(sheet, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print()
    print(f"역번역 워크시트를 만들었습니다: {paths.worksheet}")
    print(
        "별도의 Claude Code 세션에서 항목마다 back_ko를 채우세요. 그 세션에 한국어 원문을 보여 주지 "
        "마세요 — 원문을 보면 베끼기만 하고 되번역이 아니게 됩니다."
    )
    print(f"채운 뒤: npm run fb:validate -- --month {args.month}")
    return 0


def _validate(args: _Args) -> int:
    paths = _paths(args.month)
    plan = _load_plan(paths)
    data = _load_data()
    findings, _back = _validate_all(plan, paths, data)
    if _print_findings(findings):
        print()
        print("오류를 모두 고친 뒤 다시 실행하세요. 오류가 하나라도 남아 있으면 예약이 시작되지 않습니다.")
        return 1
    print()
    print("검증을 통과했습니다. 경고는 예약을 막지 않지만 검토 화면에서 사람이 봅니다.")
    print(f"다음 단계: npm run fb:review -- --month {args.month}")
    return 0


def _review(args: _Args) -> int:
    paths = _paths(args.month)
    plan = _load_plan(paths)
    data = _load_data()
    findings, back = _validate_all(plan, paths, data)
    errors = _print_findings(findings)
    if back is None:
        print()
        print("역번역을 읽기 전 단계에서 오류가 나 검토 화면을 만들지 않았습니다. 위의 오류를 고친 뒤 다시 실행하세요.")
        return 1
    html = review.render(
        plan,
        findings,
        back,
        backtranslation.divergences(plan, back, data.glossary),
        paths.images,
        cta_ko=data.glossary["cta"]["ko"],
    )
    try:
        paths.review.write_text(html, encoding="utf-8")
    except OSError as exc:
        raise _Stop(f"검토 화면을 쓸 수 없습니다: {paths.review} ({type(exc).__name__}: {exc})", 2) from None
    print()
    print(f"검토 화면을 만들었습니다: {paths.review}")
    print(f"열기:  open {paths.review}")
    print(
        "이 화면은 만든 이 맥에서 열어 보세요. 시스템 폰트만 쓰므로 다른 컴퓨터에서는 미얀마 글자가 네모로 "
        "보일 수 있고, 읽을 수 없는 화면은 검사가 꺼진 것과 같습니다."
    )
    print(
        "볼 것: 게시물마다 한국어 원문과 되번역을 나란히 읽으세요. 파란 막대는 되번역에만 있는 말(원문에 없는 "
        "약속이 들어온 자리), 붉은 막대는 원문에만 있는 말(한정어가 사라진 자리), 노란색은 양쪽에 말이 있는데 "
        "서로 다른 말입니다."
    )
    print(
        "세 모양은 낱말이 어떻게 다른지만 말하고 뜻이 바뀌었는지는 말하지 않습니다. 부정이 뒤집히면 노란색으로 "
        "나타나는 일이 많습니다('있다'와 '없다', '-지 않'이 붙은 자리) — 그래서 표시된 곳은 모양을 가리지 말고 "
        "모두 읽어야 합니다. 글자 차이 숫자도 뜻을 보증하지 않습니다. 뜻은 사람이 읽어야 확인됩니다."
    )
    if errors:
        print()
        print("오류가 남아 있어 예약은 시작되지 않습니다. 화면에서 확인하고 고친 뒤 다시 검증하세요.")
        return 1
    print(f"읽고 괜찮으면: npm run fb:schedule -- --month {args.month}  (연습 실행)")
    return 0


# ── 예약 ─────────────────────────────────────────────────────────────────────


def _when(publish_at: datetime) -> str:
    return publish_at.strftime("%m-%d %H:%M")


def _reasons(title: str, outcomes: list[schedule.Outcome]) -> None:
    """같은 까닭은 한 번만 적는다. 30건이 글자까지 같은 거절을 내도 진짜 다른 실패 한 건이 묻히지 않게."""
    if not outcomes:
        return
    groups: dict[str, list[int]] = {}
    for outcome in outcomes:
        groups.setdefault(outcome.error or "(까닭을 알 수 없습니다)", []).append(outcome.index)
    print()
    print(f"{title} (같은 까닭은 한 번만 적습니다):")
    for message, indexes in groups.items():
        print(f"  게시물 {', '.join(map(str, indexes))}번 ({len(indexes)}건): {message}")


def _off_plan(paths: _Paths, plan: Plan) -> None:
    """플랜에 없는 원장 줄을 센다. 플랜에서 게시물을 지워도 **그 게시물은 페이스북에 예약된 채 남아 있다**."""
    if not paths.ledger.exists():
        return
    try:
        recorded = schedule.load_ledger(paths.ledger)
    except schedule.LedgerError as exc:
        print()
        print(f"원장을 다시 읽지 못해 플랜에 없는 줄을 세지 못했습니다: {exc}")
        return
    extra = sorted(set(recorded) - {post.index for post in plan.posts})
    if not extra:
        return
    print()
    print(
        f"플랜에 없는 원장 줄 {len(extra)}개 (번호: {', '.join(map(str, extra))}) — 이 게시물들은 페이스북에 "
        f"예약된 채 남아 있습니다. 플랜에서 지웠다고 예약이 취소되지는 않습니다. 내보내지 않으려면 페이스북 "
        f"페이지의 '예약된 게시물'에서 직접 지우세요."
    )


def _category(outcome: schedule.Outcome) -> str:
    """`Outcome` 하나가 운영자에게 무엇인지. **결과 불명이 먼저**다: 원장에서 읽은 결과 불명은 건너뛴 건이기도
    하므로 건너뜀으로 세면 사람이 확인해야 하는 건이 "이미 예약됨"에 숨는다."""
    if outcome.post_id == schedule.UNKNOWN_RESULT:
        return "결과 불명"
    if outcome.skipped:
        return "건너뜀"
    return "성공" if outcome.ok else "실패"


def _report(outcomes: list[schedule.Outcome], plan: Plan, paths: _Paths, *, dry_run: bool) -> None:
    posts = {post.index: post for post in plan.posts}
    kinds = {outcome.index: _category(outcome) for outcome in outcomes}
    grouped: dict[str, list[schedule.Outcome]] = {"성공": [], "건너뜀": [], "결과 불명": [], "실패": []}
    for outcome in outcomes:
        grouped[kinds[outcome.index]].append(outcome)

    label = "예약 예정" if dry_run else "예약"
    print()
    for outcome in outcomes:
        post = posts[outcome.index]
        where = f"{outcome.index}번 · {_when(post.publish_at)} · {post.image_file}"
        kind = kinds[outcome.index]
        if kind == "결과 불명":
            print(f"[결과 불명] {where}")
        elif kind == "건너뜀":
            print(f"[건너뜀] {where} — 원장에 이미 결과가 있습니다({outcome.post_id})")
        elif kind == "성공":
            tail = f" → 사진 id {outcome.post_id}" if outcome.post_id else ""
            print(f"[{label}] {where}{tail}")
        else:
            print(f"[실패] {where}")

    print()
    print(f"{label}: {len(grouped['성공'])}건")
    print(f"이미 예약돼 건너뜀: {len(grouped['건너뜀'])}건")
    print(f"결과 불명: {len(grouped['결과 불명'])}건" + (
        "  ← 성공도 실패도 아닙니다. 페이스북에서 사람이 확인해야 합니다." if grouped["결과 불명"] else ""
    ))
    print(f"실패: {len(grouped['실패'])}건")

    _reasons("결과 불명인 게시물의 까닭", grouped["결과 불명"])
    _reasons("실패한 게시물의 까닭", grouped["실패"])
    _off_plan(paths, plan)


def _unexpected_while_scheduling(exc: BaseException, paths: _Paths, token: str) -> str:
    return (
        f"예약 중에 예상하지 못한 오류가 나 멈췄습니다 ({_describe(exc, token)}).\n"
        f'이 오류가 요청을 보내는 도중에 났다면, 원장 {paths.ledger}에 "{schedule.UNKNOWN_RESULT}"으로 적힌 줄이 '
        f"남아 있습니다 — 요청을 보내기 직전에 미리 적어 두기 때문입니다. 그 게시물은 예약이 만들어졌을 수도 있고 "
        f"아닐 수도 있습니다.\n"
        f"할 일: 페이스북 페이지의 '예약된 게시물' 목록을 눈으로 확인하세요. 그 날짜의 게시물이 **있으면** 원장의 "
        f'그 줄의 "{schedule._RESULT}"를 "{schedule.CONFIRMED_BY_HAND}"으로 바꾸고, **없으면** 그 줄을 지운 뒤 다시 '
        f"실행하세요. 고치는 예는 {_DOC}에 파일 전체로 실려 있습니다."
    )


def _schedule(args: _Args, session) -> int:
    paths = _paths(args.month)
    plan = _load_plan(paths)
    data = _load_data()
    findings, _back = _validate_all(plan, paths, data)
    _print_findings(findings, warnings_in_full=False)

    token = _token()
    session = session or _real_session()
    print()
    if args.confirm:
        print(f"{args.month} 실제 예약을 시작합니다 (--confirm). 게시물 {len(plan.posts)}건.")
    else:
        print(
            f"{args.month} 연습 실행입니다 — 페이스북에 아무것도 보내지 않고 원장도 건드리지 않습니다. "
            f"실제로 예약하려면 같은 명령에 --confirm을 붙이세요."
        )
    try:
        outcomes = schedule.run(
            plan,
            findings,  # 검증기들의 결과 전부. 빈 목록을 넘기면 구조적 관문이 통과해 검증 없이 발행된다.
            paths.images,
            paths.ledger,
            token=token,
            session=session,
            now=_now(),
            dry_run=not args.confirm,
        )
    except schedule.LedgerError as exc:
        raise _Stop(str(exc), 2) from None
    except ValueError as exc:  # 검증 관문: 오류가 남아 있으면 아무것도 보내지 않는다
        raise _Stop(str(exc), 1) from None
    except (Exception, KeyboardInterrupt) as exc:
        # Ctrl-C도 여기로 온다. 날 트레이스백만 보여 주면 원장에 남은 표시를 아무도 확인하지 않는다.
        # `BaseException`으로 넓히지 않는다 — `SystemExit`까지 삼키면 프로세스를 끝내려던 신호가 사라진다.
        raise _Stop(_unexpected_while_scheduling(exc, paths, token), 2) from None

    _report(outcomes, plan, paths, dry_run=not args.confirm)
    if all(outcome.ok for outcome in outcomes):
        print()
        if args.confirm:
            print(
                "모두 예약했습니다. 페이스북 페이지의 '예약된 게시물'에서 건수와 날짜를 눈으로 확인하세요 — "
                "이 도구가 받은 답만으로는 화면에 실제로 보이는지까지 알 수 없습니다."
            )
        else:
            print(f"실제로 예약하려면: npm run fb:schedule -- --month {args.month} --confirm")
        return 0
    print()
    print(f"끝나지 않은 건이 있습니다. 위의 까닭을 보고 고친 뒤 같은 명령을 다시 실행하세요 — 이미 예약된 건은 건너뜁니다. 자세한 절차는 {_DOC}에 있습니다.")
    return 2


# ── 진입 ─────────────────────────────────────────────────────────────────────


def main(argv: list[str], *, session=None) -> int:
    """명령줄 하나를 처리하고 종료 코드를 돌려준다.

    `session`이 `None`이면 네트워크를 타는 서브커맨드가 그때 `requests`를 지연 임포트해 실제 세션을 만든다.
    테스트는 가짜 세션을 넣는다.
    """
    try:
        args = _parse(argv)
        if args.command == "check-token":
            return _check_token(args, session)
        if args.command == "test-post":
            return _test_post(args, session)
        if args.command == "images":
            return _images(args)
        if args.command == "backtranslate-template":
            return _backtranslate_template(args)
        if args.command == "validate":
            return _validate(args)
        if args.command == "review":
            return _review(args)
        return _schedule(args, session)
    except _Stop as stop:
        print(stop.message, file=sys.stdout if stop.code == 0 else sys.stderr)
        return stop.code
    except Exception as exc:
        print(
            f"예상하지 못한 오류가 났습니다 ({_scrub_unknown(f'{type(exc).__name__}: {exc}')}). 페이스북에는 "
            f"아무것도 보내지 않았습니다. 이 글을 그대로 개발자에게 보여 주세요.",
            file=sys.stderr,
        )
        return 2
