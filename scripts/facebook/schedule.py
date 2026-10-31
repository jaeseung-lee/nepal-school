"""예약 실행: 검증을 통과한 월간 플랜을 Facebook에 예약하고, 다시 돌려도 같은 사진이 두 번 나가지 않게 결과를 적는다.

이 모듈은 `graph`를 불러 실제로 요청을 보내는 쪽이다. 아래가 이 모듈의 결정이다.

- **`findings`는 구조적 관문이다.** `severity == "error"`가 하나라도 있으면 `session`을 한 번도 부르지 않고 원장도 읽지
  않은 채 한국어 `ValueError`로 멈춘다. `dry_run`일 때도 그렇다. 검증을 통과하지 않은 플랜이 발행되는 길이 하나라도 있으면
  앞선 검사 전부가 선택 사항이 되기 때문이다. 시그니처가 `findings`를 요구하므로 호출자가 검증을 건너뛰었다면 `[]`를
  넘기는 줄이 코드에 남는다. 경고(`warning`)는 막지 않는다.
- **원장(`scheduled.json`)은 게시물마다 한 줄이고, 줄마다 결과와 그 게시물의 신원(이미지 파일 이름)을 적는다.**

      {
        "0": {"결과": "1234567890_987654321", "이미지": "00-visa-d2-vi.png"},
        "1": {"결과": "결과 불명", "이미지": "01-visa-d2-my.png"}
      }

  `결과`는 사진 id 또는 `"결과 불명"`뿐이다 — `run`은 "index가 원장에 있으면 건너뛴다"는 규칙 하나로 재예약을 막는다.
  운영자가 손으로 고치는 파일이라 줄 하나가 항목 하나이고(줄을 지워도 모양이 깨지지 않는다), `"결과 불명"`을 `"확인함"`으로
  바꾸면 끝난다. **신원은 index가 밀리는 사고를 막는다**: 플랜에 게시물을 끼워 넣거나 빼면 index가 한 칸씩 밀려, 원장의 5번이
  가리키던 게시물이 아닌 다른 게시물이 5번이 된다. 그대로 두면 엉뚱한 게시물이 건너뛰어지고 이미 예약한 게시물이 다시 올라간다.
  그래서 `run`은 **원장에 있는 index만** 지금 플랜의 같은 자리와 견주고, 어긋나면 아무것도 올리지 않고 멈춘다(아직 예약하지 않은
  게시물을 고치는 것은 막지 않는다 — 부분 실패를 고치고 다시 돌리는 것이 가장 흔한 재실행이다). `load_ledger`는 `index -> 결과`만
  돌려주고, 견주는 일은 플랜을 가진 `run`이 한다.
- **원장에는 무엇을 적고 무엇을 적지 않는가가 이 모듈의 핵심이다.**
  - **요청을 보내기 직전에 `"결과 불명"`을 먼저 적는다.** 요청이 끝난 뒤에 적으면, 업로드 도중 프로세스가 파이썬 코드를 한 줄도
    돌리지 못하고 끝나는 경우(`kill`=SIGTERM, 터미널 창 닫기=SIGHUP, SIGKILL, 전원 차단)에 원장에 아무 흔적도 없어 재실행이 같은
    사진을 다시 올린다. 한 건이 최대 8MB이고 타임아웃이 (10, 60)초라 30건의 벽시계 시간 거의 전부가 요청 안에 있다. 창 검사와
    이미지 검사를 **통과한 뒤에** 적는다(요청이 나가지 않는 실패는 적지 않는다).
  - 성공하면 사진 id로 덮어쓴다. `GraphError.maybe_created`가 참이면(예약이 만들어졌을 수 있다) 표시가 그대로 남는다 — 사람이
    페이스북에서 확인해 고칠 때까지 그 게시물은 다시 올리지 않는다. 예기치 못한 예외(버그, Ctrl-C)도 같다.
  - **분명한 거절(`maybe_created=False`)이면 그 줄을 지운다.** 아무것도 만들어지지 않았으므로 운영자가 원인을 고치고 다시 돌리면
    그 건은 다시 시도되어야 한다. 요청이 나가지 않은 실패(예약 창 밖, 이미지 파일 없음)는 애초에 적지 않는다.
  - **모르면 적는다.** 조용히 빠지는 것이 같은 사진이 두 번 나가는 것보다 싸다. 틀리게 적은 "결과 불명"은 사람이 줄을 지우면
    되돌려지고, 적지 않아서 생긴 중복 게시는 되돌릴 수 없다.
- **원장은 바뀔 때마다 통째로 다시 쓴다**(30건 규모라 성능 걱정이 없다). 임시 파일에 쓰고 디스크까지 내린(`fsync`, macOS에서는
  `F_FULLFSYNC`) 뒤 바꿔 끼우고 폴더도 내려, 쓰다 끊기거나 전원이 나가도 원장은 앞 내용 그대로이거나 새 내용 전체이다. **읽지
  못한 원장을 빈 원장으로 보지 않는다**(`LedgerError`로 멈춘다): 그러면 이미 예약한 게시물이 전부 다시 예약된다. 같은 이유로
  **첫 요청 전에** 원장을 쓸 수 있는지 확인하고, 쓰지 못하면 그 자리에서 멈춘다(기록할 수 없는 예약을 더 만들지 않는다).
- **한 번에 한 실행만 돈다.** 운영자가 실제로 저지를 실수는 "멈춘 것 같아서 다른 탭에서 다시 돌렸다"이고, 두 실행이 같은
  원장을 읽으면 원장에 없는 모든 건을 양쪽이 올린다(`maybe_created`로도 막히지 않는다). 그래서 원장 옆의 잠금 파일
  (`scheduled.json.lock`)에 `fcntl.flock(LOCK_EX | LOCK_NB)`을 건다. 못 잡으면 아무것도 올리지 않고 한국어로 멈춘다.
  `dry_run`도 잡는다(실제 실행이 원장을 바꾸는 동안 읽으면 거짓 목록을 보인다). `flock`은 프로세스가 죽으면 저절로 풀리므로
  운영자가 지울 파일이 생기지 않는다(잠금 파일 자체는 빈 파일로 남고 지울 필요가 없다). `fcntl`은 유닉스 전용이다 — 이
  도구는 Mac에서 돈다.
- **예약 창은 Meta의 것과 우리 것을 따로 검사한다.** Meta의 창(지금부터 10분 ~ 75일)과 타임존 검사는 `config`의 값으로
  `graph.assert_schedulable`이 한다 — **진짜 `now`를 넘긴다.** 그래야 그 메시지의 "지금"이 참이다(운영자 글에 구현 사정을
  설명하는 문장을 덧붙이지 않는다). 가까운 쪽(이미 지난 시각 포함)의 여유 5분(`SAFETY_MARGIN`)은 우리 값이라 이 모듈이 자기 검사와
  자기 메시지로 본다 — 섞으면 다음 사람이 Meta의 값을 우리 값으로 착각한다. 그래서 graph의 "10분 뒤 이후로만 가능" 메시지가
  가까운 쪽에서는 새어 나오지 않는다(운영자가 그 말대로 고치면 우리 하한에 한 번 더 걸린다). `now`는 시험 때문에 주입받으므로
  건별로 다시 읽을 수 없고, 30건을 올리는 시간(건별 타임아웃 60초)이 `now`와 마지막 요청 사이에 쌓인다. 정확히 10분짜리 예약은
  도착할 때쯤 10분 미만이 되어 Facebook이 거절하므로 창 경계에 붙여 보내지 않는다. 먼 쪽(75일)에는 여유가 없다: 시간이 걸리면
  오히려 창 안으로 들어온다. 메시지의 시각은 모두 `publish_at`의 오프셋으로 적는다(운영자가 `plan.json`에 적은 시각과 바로 견주도록).
- **`Outcome`은 플랜의 게시물마다 하나이고 플랜 순서다.** `post_id`는 원장의 `결과`와 같다(사진 id 또는 `UNKNOWN_RESULT`).
  `skipped`는 원장에 이미 있어 이번에 건드리지 않았다는 뜻이다("27건 예약, 3건은 이미 예약돼 건너뜀"과 "30건 예약"은
  운영자에게 다른 보고다). 모양은 다섯이다 — 이번에 예약됨: `ok=True`, 사진 id / 원장에 이미 있음: `ok=True`, 사진 id,
  `skipped=True` / `dry_run`의 예정: `ok=True`, `post_id=None` / 실패: `ok=False`, `post_id=None`, `error` / **결과 불명:
  `ok=False`, `post_id=UNKNOWN_RESULT`, `error`**(이번에 났으면 `skipped=False`, 원장에서 읽었으면 `skipped=True`) — 호출하는
  쪽은 결과 불명을 성공이나 평범한 실패와 다르게 보여 줘야 사람이 확인한다.
- **토큰은 `graph`에 넘기는 것 외에 아무 데도 가지 않는다.** `Outcome.error`는 `graph`가 가린 예외 메시지에 이 모듈의 안내를
  덧붙인 것이고, 원장에는 사진 id(역시 `graph`가 가린 값)와 이미지 파일 이름과 고정 글자만 적힌다.
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

# 원장 한 줄의 두 칸 이름. 운영자가 파일에서 읽고 고치므로 한국어이고, 안내 메시지가 이 이름을 그대로 말한다.
_RESULT = "결과"
_IMAGE = "이미지"


class LedgerError(Exception):
    """원장 파일을 믿고 쓸 수 없다(읽지 못함, 모양이 틀림, 플랜과 어긋남, 쓰지 못함, 다른 실행이 쥐고 있음). 메시지는 한국어이다.

    `ValueError`의 하위 클래스가 **아니다**: `run`의 검증 관문이 내는 `ValueError`("검증 오류")와 호출하는 쪽에서 섞이지 않게.
    """


@dataclass(frozen=True)
class Outcome:
    index: int
    ok: bool
    post_id: str | None  # 원장의 결과와 같다: 사진 id 또는 UNKNOWN_RESULT. dry_run의 예정이나 평범한 실패는 None
    error: str | None  # 한국어. ok가 아닐 때만
    skipped: bool = False  # 원장에 이미 있어 이번 실행이 건드리지 않았다


@dataclass(frozen=True)
class _Entry:
    result: str  # 사진 id 또는 UNKNOWN_RESULT (운영자가 CONFIRMED_BY_HAND 등으로 바꿀 수 있다)
    image_file: str  # 이 줄이 가리키는 게시물의 신원


# ── 원장 ─────────────────────────────────────────────────────────────────────


def _entry_line(index: int, entry: _Entry) -> str:
    return f'"{index}": {json.dumps({_RESULT: entry.result, _IMAGE: entry.image_file}, ensure_ascii=False)}'


def _unreadable(path: Path, reason: str) -> LedgerError:
    return LedgerError(
        f"원장 파일을 읽을 수 없습니다: {path} ({reason}). 읽지 못한 원장을 빈 것으로 보면 이미 예약한 게시물이 다시 예약되므로 "
        f"여기서 멈춥니다. 파일 내용을 확인해 고치세요(한 줄의 모양: "
        f'"3": {{"{_RESULT}": "{UNKNOWN_RESULT}", "{_IMAGE}": "03-파일이름.png"}}). '
        f"파일을 지우고 다시 실행하려면 먼저 페이스북 페이지의 예약된 게시물을 확인하세요 — 확인 없이 지우면 "
        f"이미 예약된 게시물이 한 번 더 예약됩니다."
    )


# 맨 끝 줄을 지우면 앞 줄 끝의 쉼표만 남아 파일이 깨진다. 손으로 줄을 지우는 파일이므로 이것은 받아 준다.
_TRAILING_COMMA = re.compile(r",(\s*)\}\s*\Z")


def _read_entries(path: Path) -> dict[int, _Entry]:
    """원장의 모든 줄. 파일이 없으면 빈 dict. 있는데 읽을 수 없거나 모양이 틀리면 **빈 dict로 읽지 않고** `LedgerError`."""
    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return {}
    except (OSError, ValueError) as exc:  # 권한·폴더 자리 / UnicodeDecodeError
        raise _unreadable(path, f"{type(exc).__name__}: {exc}") from exc
    try:
        raw = json.loads(_TRAILING_COMMA.sub(r"\1}", text))
    except ValueError as exc:
        raise _unreadable(path, f"JSON이 아닙니다 — {type(exc).__name__}: {exc}") from exc
    if not isinstance(raw, dict):
        raise _unreadable(path, "최상위가 JSON 객체가 아닙니다")
    entries: dict[int, _Entry] = {}
    for key, value in raw.items():
        ok = (
            re.fullmatch(r"[0-9]+", key) is not None
            and isinstance(value, dict)
            and set(value) == {_RESULT, _IMAGE}
            and all(isinstance(piece, str) and piece for piece in value.values())
        )
        if not ok:
            raise _unreadable(
                path, f"항목 {key!r}: {value!r}은(는) '0 이상의 정수 번호: {{\"{_RESULT}\": 글자, \"{_IMAGE}\": 글자}}' 꼴이 아닙니다"
            )
        entries[int(key)] = _Entry(value[_RESULT], value[_IMAGE])
    return entries


def load_ledger(path: Path) -> dict[int, str]:
    """이미 예약된(또는 결과를 모르는) index → 사진 id(또는 `UNKNOWN_RESULT`). 파일이 없으면 빈 dict.

    파일이 있는데 읽을 수 없거나 모양이 틀리면 **빈 dict로 읽지 않고** `LedgerError`로 멈춘다. 이 함수는 플랜을 모르므로 줄의
    신원(이미지 파일 이름)은 견주지 않는다 — 그것은 `run`이 한다.
    """
    return {index: entry.result for index, entry in _read_entries(path).items()}


def _sync(fd: int) -> None:
    """파일 내용을 디스크까지 내린다. macOS의 `fsync`는 드라이브 캐시까지 내리지 않아 가능하면 `F_FULLFSYNC`를 쓴다."""
    full = getattr(fcntl, "F_FULLFSYNC", None)
    if full is not None:
        try:
            fcntl.fcntl(fd, full)
            return
        except OSError:
            pass  # 이 파일시스템이 지원하지 않으면 보통의 fsync로 물러난다
    os.fsync(fd)


def _sync_directory(directory: Path) -> None:
    """방금 바꿔 끼운 이름이 디스크에 남도록 폴더도 내린다. 폴더 `fsync`를 못 하는 파일시스템이 있어 실패해도 멈추지 않는다."""
    with suppress(OSError):
        fd = os.open(directory, os.O_RDONLY)
        try:
            _sync(fd)
        finally:
            os.close(fd)


def _write_ledger(path: Path, entries: dict[int, _Entry]) -> None:
    """임시 파일에 쓰고 디스크까지 내린 뒤 바꿔 끼운다. 쓰다 끊기거나 전원이 나가도 `path`는 앞 내용 그대로이거나 새 내용 전체이다.

    한 줄이 항목 하나이고 번호는 숫자 순서다(`sorted`는 정수로 정렬한다 — 문자열이면 "10"이 "2" 앞에 온다).
    """
    if entries:
        body = ",\n".join(f"  {_entry_line(index, entries[index])}" for index in sorted(entries))
        text = "{\n" + body + "\n}\n"
    else:
        text = "{}\n"
    temp = path.with_name(path.name + ".tmp")
    try:
        with open(temp, "w", encoding="utf-8") as handle:
            handle.write(text)
            handle.flush()
            _sync(handle.fileno())
        os.replace(temp, path)
    except OSError:
        with suppress(OSError):
            temp.unlink(missing_ok=True)
        raise
    _sync_directory(path.parent)


def _mark_before_sending(path: Path, entries: dict[int, _Entry], post: Post) -> None:
    """요청을 보내기 **직전에** `UNKNOWN_RESULT`를 적는다. 적지 못하면 요청을 보내지 않고 멈춘다."""
    entries[post.index] = _Entry(UNKNOWN_RESULT, post.image_file)
    try:
        _write_ledger(path, entries)
    except OSError as exc:
        raise LedgerError(
            f"게시물 {post.index}을(를) 올리기 전에 원장 {path}에 표시를 적지 못해 여기서 멈춥니다 ({type(exc).__name__}: {exc}). "
            f"이 게시물은 아직 올리지 않았습니다. 폴더와 쓰기 권한, 디스크 공간을 확인한 뒤 다시 실행하세요."
        ) from exc


def _mark_scheduled(path: Path, entries: dict[int, _Entry], post: Post, post_id: str) -> None:
    """예약이 만들어졌다: 표시를 사진 id로 덮는다. 적지 못하면 **더 진행하지 않고** 사람이 손으로 적을 줄을 알려 준다."""
    entries[post.index] = _Entry(post_id, post.image_file)
    try:
        _write_ledger(path, entries)
    except OSError as exc:
        raise LedgerError(
            f"게시물 {post.index}의 예약은 만들어졌지만(사진 id {post_id}) 원장 {path}에 적지 못했습니다 ({type(exc).__name__}: {exc}). "
            f"기록할 수 없는 예약을 더 만들지 않도록 여기서 멈춥니다. 원장의 \"{post.index}\" 줄은 지금 \"{UNKNOWN_RESULT}\"으로 남아 있습니다. "
            f"다음 줄로 바꾼 뒤 다시 실행하세요: {_entry_line(post.index, entries[post.index])} "
            f"바꾸지 않고 다시 실행해도 같은 게시물이 두 번 올라가지는 않습니다(이 게시물은 건너뛰고 확인하는 법을 알려 줍니다)."
        ) from exc


def _forget(path: Path, entries: dict[int, _Entry], post: Post) -> None:
    """Facebook이 분명히 거절했다: 아무것도 만들어지지 않았으므로 먼저 적어 둔 표시를 지운다. 지우지 못하면 멈추고 알린다."""
    del entries[post.index]
    try:
        _write_ledger(path, entries)
    except OSError as exc:
        raise LedgerError(
            f"게시물 {post.index}은(는) Facebook이 거절해 올라가지 않았는데, 원장 {path}에 먼저 적어 둔 \"{UNKNOWN_RESULT}\" 표시를 지우지 못했습니다 "
            f"({type(exc).__name__}: {exc}). 여기서 멈춥니다. 원장에서 \"{post.index}\" 줄을 지운 뒤 다시 실행하세요. "
            f"지우지 않으면 이 게시물은 건너뛰어집니다."
        ) from exc


def _resolve_unknown(path: Path) -> str:
    """결과 불명을 사람이 되돌리는 법. **게시물 번호를 넣지 않는다.**

    이 글은 `Outcome.error`로 나가고 부르는 쪽(`cli._reasons`)이 **같은 까닭을 한 묶음으로** 모아 번호를 목록으로
    한 번 적는다. 여기에 번호를 박으면 까닭 문자열이 게시물마다 달라져 묶기가 쪼개진다. 전면 네트워크 장애에서
    거의 같은 ~390자 문단이 게시물 수만큼 찍혀(6건에서 까닭 절 2,880자, 서른 건이면 ~1만 4천 자) 운영자가
    읽어야 할 화면이 벽이 된다 — 하필 결과 불명이 무더기로 난 직후, 중복 게시 위험이 가장 높은 순간이다.
    원장 경로는 게시물과 무관하므로 남겨 둔다(어느 파일을 고치는지는 그 자리에 있어야 한다).
    """
    return (
        f'원장 {path}에서 그 번호의 줄의 "{_RESULT}"를 "{CONFIRMED_BY_HAND}"으로 바꾸고, 없으면 그 줄을 지운 뒤 다시 실행하세요.'
    )


def _require_same_posts(plan: Plan, entries: dict[int, _Entry], ledger_path: Path) -> None:
    """원장에 있는 번호만 지금 플랜의 같은 자리와 견준다. 어긋나면 아무것도 올리지 않고 멈춘다. 원장에 없는 번호는 보지 않는다."""
    mismatched = [
        (post, entries[post.index])
        for post in plan.posts
        if post.index in entries and entries[post.index].image_file != post.image_file
    ]
    if not mismatched:
        return
    post, entry = mismatched[0]
    more = ""
    if len(mismatched) > 1:
        numbers = ", ".join(str(other.index) for other, _ in mismatched[1:])
        more = f" 같은 문제가 {len(mismatched) - 1}건 더 있습니다(번호: {numbers})."
    raise LedgerError(
        f"원장 {ledger_path}과(와) 지금 플랜이 맞지 않아 아무것도 올리지 않고 멈춥니다. 원장의 \"{post.index}\"번 줄은 이미지 파일 "
        f"{entry.image_file}의 게시물 기록인데, 지금 플랜의 {post.index}번 자리는 {post.image_file}입니다.{more} 플랜에서 게시물을 "
        f"넣거나 빼서 번호가 밀린 것일 수 있습니다. 이대로 실행하면 엉뚱한 게시물이 건너뛰어지거나 같은 게시물이 두 번 올라갑니다. "
        f"페이스북 페이지의 예약된 게시물에서 {entry.image_file} 쪽 게시물을 찾아 확인하고, 지울 것은 지운 뒤 원장에서 "
        f"\"{post.index}\" 줄을 지우고 다시 실행하세요. 그 줄을 지우면 지금 플랜의 {post.index}번 게시물이 새로 예약됩니다."
    )


@contextmanager
def _exclusive(ledger_path: Path) -> Iterator[None]:
    """원장 옆 잠금 파일에 배타 잠금을 건다. 이미 다른 실행이 쥐고 있으면 기다리지 않고 `LedgerError`.

    `flock`은 잠금을 쥔 프로세스가 죽으면 운영체제가 풀어 주므로 멈춘 잠금이 남지 않는다. 폴더를 만들지 않는다.

    `finally`의 해제는 명시적이고 옳지만, 이것이 없어도 CPython이 참조가 사라질 때 핸들을 닫아 잠금을 풀어 준다. 그래서 이 해제를
    지우는 변이는 어떤 시험으로도 가릴 수 없다(등가 변이). 시험이 지키는 것은 잠금이 실행보다 오래 살지 않는다는 것까지다.
    """
    lock_path = ledger_path.with_name(ledger_path.name + ".lock")
    try:
        handle = open(lock_path, "a")
    except OSError as exc:
        raise LedgerError(
            f"원장을 둘 폴더 {ledger_path.parent}을(를) 쓸 수 없어 예약을 시작하지 않았습니다 ({type(exc).__name__}: {exc.strerror or exc}). "
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

    가까운 쪽은 이미 지난 시각까지 포함해 Meta의 최소(10분)에 우리 여유를 더한 `earliest_lead`보다 이른 것을 이 함수가 자기 메시지로
    거절한다. 그 밖(너무 먼 시각, 타임존 없음)은 **진짜 `now`로** `graph.assert_schedulable`이 거절한다. 시각은 `publish_at`의
    오프셋으로 적는다.
    """
    if publish_at.utcoffset() is not None and now.utcoffset() is not None:
        now = now.astimezone(publish_at.tzinfo)
        # UTC로 바꿔 뺀다: 같은 tzinfo 객체끼리 빼면 파이썬이 오프셋을 무시하고 벽시계를 뺀다(DST가 접히는 구간에서 틀린다).
        now_utc = now.astimezone(timezone.utc)
        lead = publish_at.astimezone(timezone.utc) - now_utc
        earliest_lead = config.SCHEDULE_MIN_LEAD + SAFETY_MARGIN
        if lead < earliest_lead:
            earliest = (now_utc + earliest_lead).astimezone(publish_at.tzinfo)
            what = "은(는) 이미 지난 시각입니다" if lead < timedelta(0) else "이(가) 너무 가깝습니다"
            return (
                f"예약 시각 {publish_at.isoformat()}{what}. 지금은 {now.isoformat()}이고, 예약은 지금부터 "
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
    post: Post, image_path: Path, entries: dict[int, _Entry], ledger_path: Path, *, token: str, session: graph._Session
) -> Outcome:
    # 요청 **직전에** 표시부터 적는다(모듈 설명 참고): 이 줄 뒤에서 프로세스가 신호로 갑자기 끝나도 재실행이 같은 사진을 올리지 않는다.
    _mark_before_sending(ledger_path, entries, post)
    try:
        post_id = graph.schedule_photo_post(
            token, config.PAGE_ID, image_path, post.body_local, post.publish_at, session=session
        )
    except graph.GraphError as exc:
        if exc.maybe_created:
            # 요청이 나갔고 결과를 모른다: 먼저 적은 표시가 그대로 남는다. 안내를 한 번만 한다 — graph의 메시지가 이미 "다시 실행하기
            # 전에 확인하라"고 말했으므로 여기서는 확인한 뒤에 할 일(원장을 고치는 법)만 잇는다.
            return Outcome(
                post.index, False, UNKNOWN_RESULT,
                f'{exc} 이 게시물은 원장에 "{UNKNOWN_RESULT}"으로 적어 두었으므로 다시 실행해도 건너뜁니다. '
                f"페이스북 페이지에 예약된 것이 있으면 {_resolve_unknown(ledger_path)}",
            )
        # Facebook이 분명히 거절했다(또는 요청이 나가지 않았다). 아무것도 만들어지지 않았으니 표시를 지워야 고친 뒤 다시 시도된다.
        _forget(ledger_path, entries, post)
        return Outcome(post.index, False, None, str(exc))
    # `graph`가 올리지 않는 예외(버그, Ctrl-C)는 여기서 잡지 않는다: 표시가 이미 디스크에 있다.
    _mark_scheduled(ledger_path, entries, post, post_id)
    return Outcome(post.index, True, post_id, None)


def _already_recorded(ledger_path: Path, index: int, entry: _Entry) -> Outcome:
    """원장에 이미 결과가 있는 게시물. 결과 불명이면 **영구히 건너뛰고** 사람이 확인할 방법을 알려 준다.

    **까닭에 그 게시물의 신원(이미지 파일 이름)을 넣지 않는다.** `_resolve_unknown`과 같은 이유다: 이 글은
    `Outcome.error`로 나가고 `cli._reasons`가 **같은 까닭을 한 묶음으로** 모으므로, 게시물마다 달라지는
    글자를 넣으면 묶기가 게시물 수만큼 쪼개진다. 하필 이 글을 읽는 때가 **우리가 "다시 실행하세요"라고
    시킨 그 재실행**이고, 그때 서른 건이 결과 불명이면 화면이 벽이 된다. 신원은 버리지 않는다 —
    부르는 쪽이 묶음 안에 「번호 + 이미지 파일」 목록으로 한 번 싣는다(원장의 신원과 플랜의 같은 자리가
    어긋나면 `_require_same_posts`가 그 전에 멈추므로, 두 신원은 여기서 같다).
    """
    if entry.result == UNKNOWN_RESULT:
        return Outcome(
            index, False, entry.result,
            f"이전 실행에서 결과를 알 수 없었던 게시물이라 건너뜁니다. 페이스북 페이지의 예약된 게시물에서 "
            f"이 게시물을 찾아보세요. 있으면 {_resolve_unknown(ledger_path)}",
            skipped=True,
        )
    return Outcome(index, True, entry.result, None, skipped=True)


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
    한 건이 실패해도 나머지를 계속한다. 원장을 믿을 수 없거나(읽지 못함, 지금 플랜과 어긋남) 다른 실행이 원장을 쥐고 있으면
    아무것도 올리지 않고 `LedgerError`로 멈춘다.
    """
    _require_no_errors(findings)
    with _exclusive(ledger_path):
        return _run_locked(plan, images_dir, ledger_path, token=token, session=session, now=now, dry_run=dry_run)


def _run_locked(
    plan: Plan, images_dir: Path, ledger_path: Path, *, token: str, session: graph._Session, now: datetime, dry_run: bool
) -> list[Outcome]:
    entries = _read_entries(ledger_path)
    _require_same_posts(plan, entries, ledger_path)
    if not dry_run:
        # 첫 요청 전에: 적을 곳이 없는데 예약부터 만들면, 다시 돌릴 때 같은 사진이 또 올라간다.
        try:
            _write_ledger(ledger_path, entries)
        except OSError as exc:
            raise LedgerError(
                f"원장 파일 {ledger_path}에 쓸 수 없어 예약을 시작하지 않았습니다 ({type(exc).__name__}: {exc}). "
                f"폴더가 있는지, 쓰기 권한이 있는지 확인하세요. 예약한 결과를 적을 곳이 없으면 다시 실행할 때 같은 게시물이 두 번 "
                f"예약되므로 시작하지 않습니다."
            ) from exc

    outcomes: list[Outcome] = []
    for post in plan.posts:
        if post.index in entries:
            outcomes.append(_already_recorded(ledger_path, post.index, entries[post.index]))
            continue
        image_path = images_dir / post.image_file
        problem = _problem_before_sending(post, image_path, now)
        if problem is not None:
            outcomes.append(Outcome(post.index, False, None, problem))
        elif dry_run:
            outcomes.append(Outcome(post.index, True, None, None))
        else:
            outcomes.append(_schedule_one(post, image_path, entries, ledger_path, token=token, session=session))
    return outcomes
