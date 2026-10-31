"""역번역 대조: 현지어 본문이 한국어 원문과 같은 뜻인지 사람이 볼 수 있게 자료를 만든다.

구조 검증과 문구 검증은 `source_ko`와 `body_local`을 각각 문자열로만 읽는다. 버마어 문장이 한국어 원문에
없는 약속을 한다고 해서 둘 중 어느 쪽도 알아채지 못한다. 한국어만 읽는 사람은 한국어 원문 옆에 현지어
본문의 **한국어 되번역**이 놓여 있으면 알아챌 수 있다. 이 모듈은 그 되번역을 받는 틀이다.

되번역은 API가 하지 않는다. 별도 Claude Code 세션이 워크시트를 채운다. 이 모듈이 하는 일은 셋뿐이다.

1. `worksheet(plan)`: 채울 워크시트를 낸다. 항목마다 `body_local`만 담고 **한국어 원문은 담지 않는다** —
   되번역하는 쪽이 원문을 보면 베끼기만 하고 되번역이 아니게 된다.
2. `load(path)`: 채워 온 워크시트를 `{게시물 번호: back_ko}`로 읽는다. 모양이 틀리면 `WorksheetError`.
3. `validate_backtranslation(...)`: 모든 게시물의 되번역이 왔는지 보고, 되번역이 한국어 원문에서 글자로 얼마나
   벌어졌는지 잰다.

**뜻이 옳은지는 여기서 판단하지 않는다.** 검토 화면에서 사람이 한국어 원문과 되번역을 나란히 놓고 읽는다.
여기서 내는 `divergence`는 글자 유사도일 뿐이다. 그래서 다음은 못 잡는다 — 한 낱말의 부정이 뒤집히는 것,
금액·날짜가 바뀌는 것, 약속 한 문장이 덧붙는 것(전체 글자 중 얼마 되지 않아 의역 정도의 차이와 구별되지 않는다).
잡는 것은 주제가 달라지는 것 같은 큰 어긋남이고, 두 문장 중 한 문장이 빠지는 정도는 기본 임계값 아래일 수 있다.
경고가 없다고 뜻이 같다는 보증이 아니며, 경고가 있어도 뜻이 달라졌다는 판정이 아니다(의역한 문장은 뜻이 같아도 걸린다).

CTA: 모든 원문과 현지어 본문은 승인된 상담 문구(CTA)로 끝나야 한다(`validate_copy`가 강제). 되번역도 끝이 CTA에
가까우므로 양쪽에 같은 글자가 있어 차이가 실제보다 작게 나온다. 그래서 한국어 CTA(`glossary["cta"]["ko"]`)를
**양쪽에서 떼고** 잰다. 되번역의 CTA는 글자가 같으면(공백·줄바꿈·문장부호·대소문자 차이는 무시) 알아본다. CTA를
의역해 적어 온 되번역은 떼지 못하고 본문의 일부로 센다 — 이 경우 차이가 커 보이는 쪽(경고가 더 나오는 쪽)으로 어긋난다.

이 모듈이 모르는 것: 워크시트를 채운 뒤에 `body_local`을 고쳤는지. `load`가 번호와 되번역만 돌려주므로 되번역이
지금의 본문에서 나온 것인지는 확인하지 못한다. 본문을 고치면 워크시트를 다시 내서 채워야 한다.

코드: `역번역누락`(오류, 게시물의 항목이 워크시트에 없음) · `역번역빈칸`(오류, back_ko가 비었거나 공백·문장부호뿐) ·
`역번역플랜밖`(오류, 플랜에 없는 번호의 항목이 있음) · `역번역차이`(경고, 임계값 초과). 경고는 예약을 막지 않지만
검토 화면 맨 위에 뜬다. 결과 순서는 `findings`와 같다: 게시물에 매이지 않는 항목이 먼저, 그다음 게시물 번호순.
"""

from __future__ import annotations

import difflib
import json
import unicodedata
from pathlib import Path

from .findings import Finding, _error, _normalize, _ordered, _warning
from .plan_model import Plan


class WorksheetError(Exception):
    """역번역 워크시트 파일의 내용이 규칙에 맞지 않을 때."""


def worksheet(plan: Plan) -> dict:
    """되번역을 채울 워크시트를 낸다. 항목은 `plan.posts` 순서이고 `back_ko`는 비어 있다.

    한국어 원문(`source_ko`)은 일부러 담지 않는다. 이 딕셔너리를 `json.dumps(..., ensure_ascii=False)`로
    파일에 쓰면 되고, 채운 파일은 `load`가 읽는다.
    """
    return {
        "month": plan.month,
        "entries": [
            {"index": post.index, "language": post.language, "body_local": post.body_local, "back_ko": ""}
            for post in plan.posts
        ],
    }


def load(path: Path) -> dict[int, str]:
    """채워 온 워크시트를 읽어 `{게시물 번호: back_ko}`로 돌려준다. 규칙에 어긋나면 `WorksheetError`.

    항목의 `index`는 정수여야 하고 같은 번호가 둘이면 멈춘다(뒤의 것이 조용히 이기면 앞의 되번역이 사라진 줄 모르고
    지나간다). `back_ko`는 문자열이어야 하지만 **비어 있어도 된다** — 비었는지는 `validate_backtranslation`이
    게시물 번호와 함께 보고한다. 워크시트의 그 밖의 필드(`month`, `language`, `body_local`)는 읽지 않는다.
    """
    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError as e:
        raise WorksheetError(f"역번역 워크시트를 찾을 수 없습니다: {path}") from e
    except OSError as e:
        raise WorksheetError(f"역번역 워크시트를 읽을 수 없습니다(경로와 권한을 확인하세요): {path}") from e
    except UnicodeDecodeError as e:
        raise WorksheetError(f"역번역 워크시트가 UTF-8 텍스트가 아닙니다: {path}") from e
    try:
        raw = json.loads(text)
    except json.JSONDecodeError as e:
        raise WorksheetError(
            f"역번역 워크시트가 올바른 JSON이 아닙니다: {path} (줄 {e.lineno}, 열 {e.colno})"
        ) from e
    if not isinstance(raw, dict):
        raise WorksheetError(f"역번역 워크시트의 최상위는 {{month, entries}} 형태의 객체여야 합니다: {path}")
    entries = raw.get("entries")
    if not isinstance(entries, list):
        raise WorksheetError(f"역번역 워크시트에 'entries' 목록이 없습니다: {path}")

    back: dict[int, str] = {}
    first_seen: dict[int, int] = {}  # 번호 -> 처음 나온 entries 위치
    for position, entry in enumerate(entries):
        where = f"역번역 워크시트 {path}의 entries[{position}]"
        if not isinstance(entry, dict):
            raise WorksheetError(f"{where}은(는) index와 back_ko를 가진 객체여야 합니다.")
        index = entry.get("index")
        if not (isinstance(index, int) and not isinstance(index, bool)):
            raise WorksheetError(f"{where}의 index가 없거나 정수가 아닙니다: {index!r}")
        text_ko = entry.get("back_ko")
        if not isinstance(text_ko, str):
            raise WorksheetError(
                f"{where}(index {index})의 back_ko가 없거나 문자열이 아닙니다: {text_ko!r} "
                f"(아직 못 채웠다면 빈 문자열로 둡니다)"
            )
        if index in first_seen:
            raise WorksheetError(
                f"{where}의 index {index}이(가) entries[{first_seen[index]}]와 중복됩니다. "
                f"게시물마다 항목은 하나여야 합니다. 어느 되번역이 맞는지 정해 하나만 남기세요."
            )
        first_seen[index] = position
        back[index] = text_ko
    return back


def _is_dropped(ch: str) -> bool:
    """글자 대조에서 지우는 글자: 문장부호(Unicode `P*`)와 보이지 않는 서식 문자(`Cf`, 예: U+200B)."""
    category = unicodedata.category(ch)
    return category[0] == "P" or category == "Cf"


def _comparable(text: str) -> str:
    """글자를 견주려고 표기 차이를 지운다: NFC로 맞추고, 문장부호와 서식 문자를 지우고, 공백(줄바꿈 포함)을
    하나로 접고, 소문자로 만든다. 낱말 사이의 공백 하나는 남으므로 띄어쓰기 차이는 조금 남는다."""
    return _normalize("".join(ch for ch in unicodedata.normalize("NFC", text) if not _is_dropped(ch)))


def divergence(source_ko: str, back_ko: str) -> float:
    """두 한국어 글이 글자로 얼마나 다른지: 0.0(같음)부터 1.0(하나도 겹치지 않음)까지.

    비교 전에 `_comparable`로 공백·문장부호·대소문자·NFC/NFD 차이를 지운다. 뜻을 재는 것이 아니다.

    `SequenceMatcher(None, a, b).ratio()`를 그대로 쓰지 않는 이유가 둘이다.

    - **인자 순서에 따라 값이 다르다.** `ratio()`는 대칭이 아니라서(예: `'tide'`와 `'diet'`는 0.25와 0.5) 두 방향을
      평균해 대칭으로 만든다.
    - **`autojunk`는 글자 종류가 적은 긴 글에서 값을 크게 바꾼다.** 기본값은 두 번째 글이 200자 이상이면 자주 나오는
      글자를 버린다. 글자가 41종뿐인 390자 글에서 여섯 글자만 바뀌어도 0.62 벗어났다고 나온다(끄면 0.02). 실제
      한국어 문단에서는 이 차이가 나지 않았지만, 끄는 데 드는 것은 계산 시간뿐이라 끈다.
    """
    a, b = _comparable(source_ko), _comparable(back_ko)
    forward = difflib.SequenceMatcher(None, a, b, autojunk=False).ratio()
    backward = difflib.SequenceMatcher(None, b, a, autojunk=False).ratio()
    return 1.0 - (forward + backward) / 2


def _significant(text: str) -> list[tuple[int, str]]:
    """`text`에서 공백과 `_is_dropped` 글자를 뺀 글자들을 (위치, 소문자 글자)로."""
    return [(i, ch.lower()) for i, ch in enumerate(text) if not (ch.isspace() or _is_dropped(ch))]


def _without_closing(text: str, closing: str) -> str:
    """`text`가 `closing`으로 끝나면 그 앞부분을, 아니면 `text`를 그대로 돌려준다.

    공백·줄바꿈·문장부호·서식 문자는 양쪽에서 건너뛰고 대소문자는 가리지 않으며, 남은 글자의 **뒤쪽 끝**이
    `closing`의 글자와 같은지 본다. 그러지 않으면 `보내 주세요`와 `보내주세요`처럼 띄어쓰기만 다른 CTA를 못 알아봐
    되번역이 충실해도 CTA만큼 벌어진 것으로 나온다. 글자 자체가 다른 의역은 알아보지 못한다.
    """
    text = unicodedata.normalize("NFC", text)
    wanted = [ch for _, ch in _significant(unicodedata.normalize("NFC", closing))]
    tail = _significant(text)[-len(wanted):] if wanted else []
    if not wanted or [ch for _, ch in tail] != wanted:
        return text
    return text[: tail[0][0]]


def _require_cta(glossary: dict) -> str:
    """용어집의 한국어 CTA를 돌려준다. 없거나 비면 `ValueError` — 빈 CTA는 떼어 낼 것이 없어 CTA를 떼고 재는
    단계가 조용히 꺼지고, 그러면 모든 차이가 공통 CTA만큼 작게 나온다."""
    entry = glossary.get("cta") if isinstance(glossary, dict) else None
    cta = entry.get("ko") if isinstance(entry, dict) else None
    if not (isinstance(cta, str) and _comparable(cta)):
        raise ValueError(
            "용어집에 cta.ko가 없거나 비어 있습니다(공백이나 문장부호뿐인 값도 안 됩니다). 빈 값이면 CTA를 떼고 "
            "재는 단계가 조용히 꺼져 차이가 실제보다 작게 나오므로 검증을 멈춥니다. glossary.json을 고치세요."
        )
    return cta


def _require_threshold(threshold: float) -> None:
    """임계값이 `0 <= 임계값 < 1`인지 본다. 1.0 이상이면 어떤 되번역도 경고하지 않아 검사가 조용히 꺼지고,
    NaN은 모든 비교가 거짓이라 마찬가지다."""
    ok = isinstance(threshold, (int, float)) and not isinstance(threshold, bool) and 0.0 <= threshold < 1.0
    if not ok:
        raise ValueError(
            f"threshold는 0 이상 1 미만의 수여야 합니다 (받은 값: {threshold!r}). 1 이상이면 어떤 되번역도 경고하지 "
            f"않아 검사가 꺼집니다."
        )


def _require_back(back: dict) -> None:
    """`back`이 `{게시물 번호(정수): 되번역(문자열)}`인지 본다. `load`가 돌려준 값이면 늘 맞다."""
    shape = "되번역(back)은 {게시물 번호(정수): 되번역(문자열)} 형태여야 합니다"
    fix = "backtranslation.load로 읽은 값을 넘기세요."
    if not isinstance(back, dict):
        raise ValueError(f"{shape} (받은 값의 형: {type(back).__name__}). {fix}")
    bad = [
        index for index, text in back.items()
        if not (isinstance(index, int) and not isinstance(index, bool) and isinstance(text, str))
    ]
    if bad:
        raise ValueError(f"{shape}. 맞지 않는 항목의 키: {', '.join(map(repr, bad[:5]))}. {fix}")


def validate_backtranslation(
    plan: Plan, back: dict[int, str], glossary: dict, *, threshold: float = 0.45
) -> list[Finding]:
    """되번역이 빠짐없이 왔는지 보고 한국어 원문(`source_ko`)에서 얼마나 벌어졌는지 재서 문제를 전부 돌려준다.

    - 게시물의 되번역이 `back`에 없으면 `역번역누락`, 있는데 비었거나 공백·문장부호뿐이면 `역번역빈칸` (오류)
    - `back`에 플랜에 없는 번호가 있으면 `역번역플랜밖` (오류) — 다른 달·다른 판의 워크시트가 섞였다는 신호다
    - 한국어 CTA를 양쪽에서 뗀 뒤의 `divergence`가 `threshold`를 **넘으면** `역번역차이` (경고, 같으면 아니다)

    비교 대상은 한국어 원문이다 — 현지어 본문이 아니다. `glossary`는 `glossary["cta"]["ko"]`만 쓴다.
    입력이 어긋나면 검사가 조용히 꺼지므로 `ValueError`로 멈춘다: 없거나 빈 `cta.ko`, `0 <= threshold < 1`이
    아닌 임계값, `{정수: 문자열}`이 아닌 `back`.

    임계값 기본값 0.45는 글자 유사도에 대한 것으로, 뜻을 재지 않는다. 이 모듈 머리말의 한계를 볼 것.
    """
    cta = _require_cta(glossary)
    _require_threshold(threshold)
    _require_back(back)

    findings: list[Finding] = []
    for post in plan.posts:
        text = back.get(post.index)
        if text is None:
            findings.append(_error(
                "역번역누락", post.index,
                f"게시물 {post.index}번의 역번역이 워크시트에 없습니다. 워크시트에 index {post.index}번 항목을 넣고 "
                f"back_ko를 채우세요. 역번역이 없으면 현지어 본문이 한국어 원문과 같은 뜻인지 사람이 볼 수 없습니다.",
            ))
        elif not _comparable(text):
            findings.append(_error(
                "역번역빈칸", post.index,
                f"게시물 {post.index}번의 back_ko가 비어 있습니다. 현지어 본문(body_local)을 한국어로 되번역해 "
                f"채우세요. 공백이나 문장부호뿐인 값도 비어 있는 것으로 봅니다.",
            ))
        else:
            measured = divergence(_without_closing(post.source_ko, cta), _without_closing(text, cta))
            if measured > threshold:
                findings.append(_warning(
                    "역번역차이", post.index,
                    f"게시물 {post.index}번의 역번역이 한국어 원문에서 글자 기준으로 {measured:.2f}만큼 벗어났습니다"
                    f"(기준 {threshold:.2f}). 뜻이 달라졌거나 빠진 부분이 있을 수 있으니 검토 화면에서 한국어 원문과 "
                    f"역번역을 나란히 읽어 보세요. 글자 유사도일 뿐이라 의역한 문장은 뜻이 같아도 걸리고, 낱말 하나의 "
                    f"부정이나 숫자가 바뀐 것은 걸리지 않습니다.",
                ))

    known = {post.index for post in plan.posts}
    for index in sorted(index for index in back if index not in known):
        findings.append(_error(
            "역번역플랜밖", None,
            f"워크시트에 이 플랜에 없는 게시물 번호 {index}의 역번역이 있습니다. 다른 달이나 다른 판의 "
            f"워크시트를 가져온 것은 아닌지 확인하세요.",
        ))
    return _ordered(findings)
