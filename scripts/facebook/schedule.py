"""예약 실행: 검증을 통과한 월간 플랜을 Facebook에 예약하고, 다시 돌려도 같은 사진이 두 번 나가지 않게 결과를 적는다.

이 모듈은 `graph`를 불러 실제로 요청을 보내는 쪽이다. 아래가 이 모듈의 결정이다.

- **`findings`는 구조적 관문이다.** `severity == "error"`가 하나라도 있으면 `session`을 한 번도 부르지 않고 원장도 읽지
  않은 채 한국어 `ValueError`로 멈춘다. `dry_run`일 때도 그렇다. 검증을 통과하지 않은 플랜이 발행되는 길이 하나라도 있으면
  앞선 검사 전부가 선택 사항이 되기 때문이다. 시그니처가 `findings`를 요구하므로 호출자가 검증을 건너뛰었다면 `[]`를
  넘기는 줄이 코드에 남는다. 경고(`warning`)는 막지 않는다.
- **원장(`scheduled.json`)에는 값이 둘뿐이다: 사진 id와 `"결과 불명"`.** `run`은 "index가 원장에 있으면 건너뛴다"는
  규칙 하나로 재예약을 막는다 — 새 필드도 새 자료형도 없다. 무엇을 적고 무엇을 적지 않는지가 이 모듈의 핵심이다.
  - **적는다:** 성공(사진 id), 그리고 `GraphError.maybe_created`가 참인 실패(`"결과 불명"`). 요청이 나갔으므로 예약이
    만들어졌을 수 있다. 사람이 페이스북에서 확인해 원장을 고칠 때까지 그 게시물은 다시 올리지 않는다.
  - **적지 않는다:** 요청이 나가지 않은 실패 — 예약 창 밖, 이미지 파일 없음, Facebook이 분명히 거절한 응답
    (`maybe_created=False`). 운영자가 시간을 고치거나 파일을 넣고 다시 돌리면 그 건은 다시 시도되어야 한다.
  - **모르면 적는다.** 조용히 빠지는 것이 같은 사진이 두 번 나가는 것보다 싸다. 틀리게 적은 "결과 불명"은 사람이 줄을
    지우면 되돌려지고, 적지 않아서 생긴 중복 게시는 되돌릴 수 없다. 그래서 `graph`가 올리는 예외가 아닌 예기치 못한
    예외(버그, Ctrl-C)도 진행 중이던 한 건을 `"결과 불명"`으로 적고 다시 올린다 — 요청이 나갔는지 알 수 없기 때문이다.
- **원장은 매 성공 직후 통째로 다시 쓴다**(30건 규모라 성능 걱정이 없다). 도중에 끊겨도 다음 실행이 이어받는다.
  쓸 때는 임시 파일에 쓴 뒤 바꿔 끼워, 쓰다 끊겨도 앞 원장이 반쪽 파일이 되지 않는다. 그리고 **읽지 못한 원장을 빈 원장으로
  보지 않는다**(`LedgerError`로 멈춘다): 그러면 이미 예약한 게시물이 전부 다시 예약된다. 같은 이유로 **첫 요청 전에**
  원장을 쓸 수 있는지 확인하고, 예약을 만든 뒤 적지 못하면 그 자리에서 멈춘다(기록할 수 없는 예약을 더 만들지 않는다).
- **한 번에 한 실행만 돈다.** 운영자가 실제로 저지를 실수는 "멈춘 것 같아서 다른 탭에서 다시 돌렸다"이고, 두 실행이 같은
  원장을 읽으면 원장에 없는 모든 건을 양쪽이 올린다(`maybe_created`로도 막히지 않는다). 그래서 원장 옆의 잠금 파일
  (`scheduled.json.lock`)에 `fcntl.flock(LOCK_EX | LOCK_NB)`을 건다. 못 잡으면 아무것도 올리지 않고 한국어로 멈춘다.
  `dry_run`도 잡는다(실제 실행이 원장을 바꾸는 동안 읽으면 거짓 목록을 보인다). `flock`은 프로세스가 죽으면 저절로 풀리므로
  운영자가 지울 파일이 생기지 않는다(잠금 파일 자체는 빈 파일로 남고 지울 필요가 없다). `fcntl`은 유닉스 전용이다 — 이
  도구는 Mac에서 돈다.
- **예약 창은 Meta의 것과 우리 것을 따로 검사한다.** Meta의 창(지금부터 10분 ~ 75일)과 타임존 검사는 `config`의 값으로
  `graph.assert_schedulable`이 한다 — **진짜 `now`를 넘긴다.** 그래야 그 메시지의 "지금"이 참이다(운영자 글에 구현 사정을
  설명하는 문장을 덧붙이지 않는다). 가까운 쪽의 여유 5분(`SAFETY_MARGIN`)은 우리 값이라 이 모듈이 자기 검사와 자기 메시지로
  본다 — 섞으면 다음 사람이 Meta의 값을 우리 값으로 착각한다. `now`는 시험 때문에 주입받으므로 건별로 다시 읽을 수 없고, 30건을
  올리는 시간(건별 타임아웃 60초)이 `now`와 마지막 요청 사이에 쌓인다. 정확히 10분짜리 예약은 도착할 때쯤 10분 미만이 되어
  Facebook이 거절하므로 창 경계에 붙여 보내지 않는다. 먼 쪽(75일)에는 여유가 없다: 시간이 걸리면 오히려 창 안으로 들어온다.
  메시지의 시각은 모두 `publish_at`의 오프셋으로 적는다(운영자가 `plan.json`에 적은 시각과 바로 견주도록).
- **`Outcome`은 플랜의 게시물마다 하나이고 플랜 순서다.** `post_id`는 원장의 값과 같다(사진 id 또는 `UNKNOWN_RESULT`).
  모양은 넷이다 — 예약됨: `ok=True`, 사진 id / `dry_run`의 예정: `ok=True`, `post_id=None` / 실패: `ok=False`,
  `post_id=None`, `error` / **결과 불명: `ok=False`, `post_id=UNKNOWN_RESULT`, `error`** — 호출하는 쪽은 이 넷째를
  성공이나 평범한 실패와 다르게 보여 줘야 사람이 확인한다. 원장에 이미 있어 건너뛴 건도 그 값으로 한 줄 돌려준다.
- **토큰은 `graph`에 넘기는 것 외에 아무 데도 가지 않는다.** `Outcome.error`는 `graph`가 가린 예외 메시지에 이 모듈의 안내를
  덧붙인 것이고, 원장에는 사진 id(역시 `graph`가 가린 값)와 고정 글자만 적힌다.
"""

from __future__ import annotations

import fcntl
import json
import os
import re
from contextlib import contextmanager, suppress
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Iterable, Iterator

from . import config, graph
from .findings import Finding
from .plan_model import Plan, Post

# 가까운 쪽 예약 창(`config.SCHEDULE_MIN_LEAD`, Meta의 값)에 더하는 우리의 여유. 이 모듈의 `_window_problem`만 읽는다.
SAFETY_MARGIN = timedelta(minutes=5)

# 원장에서 "요청은 나갔지만 예약이 만들어졌는지 모른다"를 뜻하는 값. 운영자가 파일에서 이 글자를 찾아 고치므로 바꾸지 말 것.
UNKNOWN_RESULT = "결과 불명"

# 사람이 페이스북에서 직접 확인했음을 원장에 남기는 값. 사진 id 자리에는 `UNKNOWN_RESULT`가 아닌 어떤 글자든 "예약됨"으로 읽힌다.
CONFIRMED_BY_HAND = "확인함"


class LedgerError(Exception):
    """원장 파일을 믿고 쓸 수 없다(읽지 못함, 모양이 틀림, 쓰지 못함). 메시지는 한국어이다.

    `ValueError`의 하위 클래스가 **아니다**: `run`의 검증 관문이 내는 `ValueError`("검증 오류")와 호출하는 쪽에서 섞이지 않게.
    """


@dataclass(frozen=True)
class Outcome:
    index: int
    ok: bool
    post_id: str | None  # 원장의 값과 같다: 사진 id 또는 UNKNOWN_RESULT. dry_run의 예정이나 평범한 실패는 None
    error: str | None  # 한국어. ok가 아닐 때만


# ── 원장 ─────────────────────────────────────────────────────────────────────


def _unreadable(path: Path, reason: str) -> LedgerError:
    return LedgerError(
        f"원장 파일을 읽을 수 없습니다: {path} ({reason}). 읽지 못한 원장을 빈 것으로 보면 이미 예약한 게시물이 다시 예약되므로 "
        f'여기서 멈춥니다. 파일 내용을 확인해 고치세요(형식: {{"0": "사진 id", "3": "{UNKNOWN_RESULT}"}}). '
        f"파일을 지우고 다시 실행하려면 먼저 페이스북 페이지의 예약된 게시물을 확인하세요 — 확인 없이 지우면 "
        f"이미 예약된 게시물이 한 번 더 예약됩니다."
    )


def load_ledger(path: Path) -> dict[int, str]:
    """이미 예약된(또는 결과를 모르는) index → 사진 id(또는 `UNKNOWN_RESULT`). 파일이 없으면 빈 dict.

    파일이 있는데 읽을 수 없거나 모양이 틀리면 **빈 dict로 읽지 않고** `LedgerError`로 멈춘다.
    """
    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return {}
    except (OSError, ValueError) as exc:  # 권한·폴더 자리 / UnicodeDecodeError
        raise _unreadable(path, f"{type(exc).__name__}: {exc}") from exc
    try:
        raw = json.loads(text)
    except ValueError as exc:
        raise _unreadable(path, f"JSON이 아닙니다 — {type(exc).__name__}: {exc}") from exc
    if not isinstance(raw, dict):
        raise _unreadable(path, "최상위가 JSON 객체가 아닙니다")
    ledger: dict[int, str] = {}
    for key, value in raw.items():
        if not (re.fullmatch(r"[0-9]+", key) and isinstance(value, str) and value):
            raise _unreadable(path, f"항목 {key!r}: {value!r}은(는) '0 이상의 정수 index: 비어 있지 않은 문자열' 꼴이 아닙니다")
        ledger[int(key)] = value
    return ledger


def _write_ledger(path: Path, ledger: dict[int, str]) -> None:
    """임시 파일에 쓴 뒤 바꿔 끼운다. 쓰다 끊겨도 `path`는 앞 내용 그대로이거나 새 내용 전체이다."""
    text = json.dumps({str(index): ledger[index] for index in sorted(ledger)}, ensure_ascii=False, indent=2) + "\n"
    temp = path.with_name(path.name + ".tmp")
    try:
        temp.write_text(text, encoding="utf-8")
        os.replace(temp, path)
    except OSError:
        with suppress(OSError):
            temp.unlink(missing_ok=True)
        raise


def _record(path: Path, ledger: dict[int, str], index: int, value: str) -> None:
    """`ledger[index] = value`를 즉시 디스크에 적는다. 적지 못하면 **더 진행하지 않고** 사람이 손으로 적을 줄을 알려 준다."""
    ledger[index] = value
    try:
        _write_ledger(path, ledger)
    except OSError as exc:
        reason = f"{type(exc).__name__}: {exc}"
        line = f'"{index}": "{value}"'
        if value == UNKNOWN_RESULT:
            raise LedgerError(
                f"게시물 {index}의 예약 결과를 알 수 없는데, 그 사실을 원장 {path}에 적지 못했습니다 ({reason}). 여기서 멈춥니다. "
                f"원장에 {line} 줄을 직접 적고, 페이스북 페이지의 예약된 게시물에서 이 게시물이 있는지 확인한 뒤 다시 실행하세요."
            ) from exc
        raise LedgerError(
            f"게시물 {index}의 예약은 만들어졌지만(사진 id {value}) 원장 {path}에 적지 못했습니다 ({reason}). 기록할 수 없는 예약을 "
            f"더 만들지 않도록 여기서 멈춥니다. 원장에 {line} 줄을 직접 적어 넣은 뒤 다시 실행하세요. "
            f"적지 않고 다시 실행하면 이 게시물이 두 번 예약됩니다."
        ) from exc


@contextmanager
def _exclusive(ledger_path: Path) -> Iterator[None]:
    """원장 옆 잠금 파일에 배타 잠금을 건다. 이미 다른 실행이 쥐고 있으면 기다리지 않고 `LedgerError`.

    `flock`은 잠금을 쥔 프로세스가 죽으면 운영체제가 풀어 주므로 멈춘 잠금이 남지 않는다. 폴더를 만들지 않는다.
    """
    lock_path = ledger_path.with_name(ledger_path.name + ".lock")
    try:
        handle = open(lock_path, "a")
    except OSError as exc:
        raise LedgerError(
            f"원장 폴더에 잠금 파일 {lock_path}을(를) 만들 수 없어 예약을 시작하지 않았습니다 ({type(exc).__name__}: {exc}). "
            f"폴더가 있는지, 쓰기 권한이 있는지 확인하세요."
        ) from exc
    try:
        try:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise LedgerError(
                "다른 예약 실행이 같은 원장을 쓰고 있어 아무것도 올리지 않고 멈춥니다. 멈춘 것처럼 보여도 다른 터미널이나 탭에서 "
                "돌고 있을 수 있으니, 그 실행이 끝날 때까지 기다리세요. 두 실행이 같은 원장을 읽으면 원장에 없는 게시물을 양쪽이 "
                "모두 올립니다. 그 실행이 끝났거나 중단됐다면 잠금은 저절로 풀렸으니 다시 실행하면 됩니다."
            ) from None
        except OSError as exc:
            raise LedgerError(
                f"원장 잠금을 걸 수 없어 예약을 시작하지 않았습니다 ({type(exc).__name__}: {exc}). 같은 원장을 두 실행이 동시에 쓰면 "
                f"게시물이 두 번 올라가므로 잠금 없이는 시작하지 않습니다."
            ) from exc
        yield
    finally:
        try:
            fcntl.flock(handle, fcntl.LOCK_UN)
        finally:
            handle.close()


def _unknown_guidance(path: Path, index: int) -> str:
    return (
        f'원장 {path}의 "{index}" 줄이 "{UNKNOWN_RESULT}"입니다. 페이스북 페이지의 예약된 게시물에서 이 게시물을 찾아보세요. '
        f'있으면 "{UNKNOWN_RESULT}"을(를) "{CONFIRMED_BY_HAND}"으로 바꾸고, 없으면 그 줄을 지우고 다시 실행하세요.'
    )


# ── 실행 ─────────────────────────────────────────────────────────────────────


def _require_no_errors(findings: Iterable[Finding]) -> None:
    errors = [finding for finding in findings if finding.severity == "error"]
    if errors:
        raise ValueError(
            f"검증 오류 {len(errors)}건이 남아 있어 예약을 시작하지 않았습니다(Facebook에는 아무것도 보내지 않았고 원장도 건드리지 않았습니다). "
            f"검증을 다시 돌려 오류를 모두 없앤 뒤에 실행하세요."
        )


def _minutes(delta: timedelta) -> str:
    return f"{delta.total_seconds() / 60:g}분"


def _window_problem(publish_at: datetime, now: datetime) -> str | None:
    """`publish_at`이 예약 창 밖이면 한국어 이유. 안이면 None.

    가까운 쪽은 Meta의 최소(10분)에 우리 여유를 더한 `earliest_lead`까지를 이 함수가 자기 메시지로 거절한다. 그 밖(지난 시각,
    너무 먼 시각, 타임존 없음)은 **진짜 `now`로** `graph.assert_schedulable`이 거절한다. 시각은 `publish_at`의 오프셋으로 적는다.
    """
    if publish_at.utcoffset() is not None and now.utcoffset() is not None:
        now = now.astimezone(publish_at.tzinfo)
        # UTC로 바꿔 뺀다: 같은 tzinfo 객체끼리 빼면 파이썬이 오프셋을 무시하고 벽시계를 뺀다(DST가 접히는 구간에서 틀린다).
        now_utc = now.astimezone(timezone.utc)
        lead = publish_at.astimezone(timezone.utc) - now_utc
        earliest_lead = config.SCHEDULE_MIN_LEAD + SAFETY_MARGIN
        if timedelta(0) <= lead < earliest_lead:
            earliest = (now_utc + earliest_lead).astimezone(publish_at.tzinfo)
            return (
                f"예약 시각 {publish_at.isoformat()}이(가) 너무 가깝습니다. 지금은 {now.isoformat()}이고, 예약은 지금부터 "
                f"{_minutes(earliest_lead)} 뒤인 {earliest.isoformat()} 이후로만 받습니다. Facebook은 지금부터 "
                f"{_minutes(config.SCHEDULE_MIN_LEAD)} 뒤부터 받지만, 올리는 데 시간이 걸려 요청이 도착할 때쯤 그보다 가까워지면 "
                f"거절하므로 {_minutes(SAFETY_MARGIN)}을 더 띄워 둡니다. 예약 시각을 늦추세요."
            )
    try:
        graph.assert_schedulable(publish_at, now)
    except graph.GraphError as exc:
        return str(exc)
    return None


def _problem_before_sending(post: Post, image_path: Path, now: datetime) -> str | None:
    """요청을 보내기 전에 알 수 있는 문제(예약 창 밖, 이미지 파일 없음)를 한국어로. 없으면 None. 둘 다 있으면 둘 다 적는다."""
    problems = []
    window = _window_problem(post.publish_at, now)
    if window is not None:
        problems.append(window)
    if not image_path.is_file():
        problems.append(f"이미지 파일이 없습니다: {image_path}. 파일을 넣은 뒤 다시 실행하세요.")
    return " ".join(problems) or None


def _schedule_one(
    post: Post, image_path: Path, ledger: dict[int, str], ledger_path: Path, *, token: str, session: graph._Session
) -> Outcome:
    try:
        post_id = graph.schedule_photo_post(
            token, config.PAGE_ID, image_path, post.body_local, post.publish_at, session=session
        )
    except graph.GraphError as exc:
        if not exc.maybe_created:
            # 요청이 나가지 않았거나 Facebook이 분명히 거절했다. 원장에 적지 않아야 고친 뒤 다시 시도된다.
            return Outcome(post.index, False, None, str(exc))
        _record(ledger_path, ledger, post.index, UNKNOWN_RESULT)
        return Outcome(
            post.index, False, UNKNOWN_RESULT,
            f"{exc} 이 게시물은 다시 실행해도 건너뜁니다. {_unknown_guidance(ledger_path, post.index)}",
        )
    except BaseException:
        # `graph`가 올리지 않는 예외(버그, Ctrl-C): 요청이 나갔는지 알 수 없다. 모르면 적고, 멈춘다(30건에 같은 버그를 되풀이하지 않는다).
        _record(ledger_path, ledger, post.index, UNKNOWN_RESULT)
        raise
    _record(ledger_path, ledger, post.index, post_id)
    return Outcome(post.index, True, post_id, None)


def _already_recorded(ledger_path: Path, index: int, value: str) -> Outcome:
    if value == UNKNOWN_RESULT:
        return Outcome(index, False, value, f"이전 실행에서 결과를 알 수 없었던 게시물이라 건너뜁니다. {_unknown_guidance(ledger_path, index)}")
    return Outcome(index, True, value, None)


def run(
    plan: Plan,
    findings: list[Finding],
    images_dir: Path,
    ledger_path: Path,
    *,
    token: str,
    session: graph._Session,
    now: datetime,
    dry_run: bool,
) -> list[Outcome]:
    """플랜의 게시물을 플랜 순서대로 예약하고, 게시물마다 `Outcome` 하나를 돌려준다.

    `findings`에 오류가 있으면 아무것도 호출하지 않고 `ValueError`(`dry_run`이어도). `dry_run`이면 요청도 원장 쓰기도 없이
    같은 검사(원장, 예약 창, 이미지 파일)만 하고, 보낼 건을 `ok=True, post_id=None`으로 돌려준다.
    한 건이 실패해도 나머지를 계속한다. 원장을 믿을 수 없거나 다른 실행이 원장을 쥐고 있으면 `LedgerError`로 멈춘다.
    """
    _require_no_errors(findings)
    with _exclusive(ledger_path):
        return _run_locked(plan, images_dir, ledger_path, token=token, session=session, now=now, dry_run=dry_run)


def _run_locked(
    plan: Plan, images_dir: Path, ledger_path: Path, *, token: str, session: graph._Session, now: datetime, dry_run: bool
) -> list[Outcome]:
    ledger = load_ledger(ledger_path)
    if not dry_run:
        # 첫 요청 전에: 적을 곳이 없는데 예약부터 만들면, 다시 돌릴 때 같은 사진이 또 올라간다.
        try:
            _write_ledger(ledger_path, ledger)
        except OSError as exc:
            raise LedgerError(
                f"원장 파일 {ledger_path}에 쓸 수 없어 예약을 시작하지 않았습니다 ({type(exc).__name__}: {exc}). "
                f"폴더가 있는지, 쓰기 권한이 있는지 확인하세요. 예약한 결과를 적을 곳이 없으면 다시 실행할 때 같은 게시물이 두 번 "
                f"예약되므로 시작하지 않습니다."
            ) from exc

    outcomes: list[Outcome] = []
    for post in plan.posts:
        if post.index in ledger:
            outcomes.append(_already_recorded(ledger_path, post.index, ledger[post.index]))
            continue
        image_path = images_dir / post.image_file
        problem = _problem_before_sending(post, image_path, now)
        if problem is not None:
            outcomes.append(Outcome(post.index, False, None, problem))
        elif dry_run:
            outcomes.append(Outcome(post.index, True, None, None))
        else:
            outcomes.append(_schedule_one(post, image_path, ledger, ledger_path, token=token, session=session))
    return outcomes
