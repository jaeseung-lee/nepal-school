"""역번역 대조: 현지어 본문이 한국어 원문과 같은 뜻인지 사람이 볼 수 있게 자료를 만든다.

구조 검증과 문구 검증은 `source_ko`와 `body_local`을 각각 문자열로만 읽는다. 버마어 문장이 한국어 원문에
없는 약속을 한다고 해서 둘 중 어느 쪽도 알아채지 못한다. 한국어만 읽는 사람은 한국어 원문 옆에 현지어
본문의 **한국어 되번역**이 놓여 있으면 알아챌 수 있다. 이 모듈은 그 되번역을 받는 틀이다.

되번역은 API가 하지 않는다. 별도 Claude Code 세션이 워크시트를 채운다. 이 모듈이 하는 일은 셋뿐이다.

1. `worksheet(plan, glossary)`: 채울 워크시트를 낸다. 항목마다 `body_local`만 담고 **한국어 원문은 담지 않는다** —
   되번역하는 쪽이 원문을 보면 베끼기만 하고 되번역이 아니게 된다. `body_local`은 끝의 승인된 상담 문구(CTA)를
   뗀 것이라 채우는 쪽은 CTA를 보지도, 되번역하지도 않는다. 항목마다 그 본문의 짧은 해시 `body_hash`를 적는다.
2. `load(path)`: 채워 온 워크시트를 `{게시물 번호: back_ko}`로 읽는다. 모양이 틀리면 `WorksheetError`.
   `plan`과 `glossary`를 함께 넘기면 워크시트가 이 플랜의 달 것인지, 워크시트를 채운 뒤 본문이 바뀌지 않았는지
   (`body_hash`)도 확인한다.
3. `validate_backtranslation(...)`: 모든 게시물의 되번역이 왔는지, 다른 게시물의 것을 베낀 것은 아닌지, 숫자가
   원문과 같은지 보고, 되번역이 한국어 원문에서 글자로 얼마나 벌어졌는지 잰다.

**뜻이 옳은지는 여기서 판단하지 않는다.** 검토 화면에서 사람이 한국어 원문과 되번역을 나란히 놓고 읽는다.
여기서 내는 `divergence`는 글자 유사도일 뿐이다. 그래서 다음은 못 잡는다 — 한 낱말의 부정이 뒤집히는 것,
약속 한 문장이 덧붙는 것(전체 글자 중 얼마 되지 않아 의역 정도의 차이와 구별되지 않는다).
잡는 것은 주제가 달라지는 것 같은 큰 어긋남이고, 두 문장 중 한 문장이 빠지는 정도는 기본 임계값 아래일 수 있다.
경고가 없다고 뜻이 같다는 보증이 아니며, 경고가 있어도 뜻이 달라졌다는 판정이 아니다(의역한 문장은 뜻이 같아도 걸린다).

숫자: 글자 유사도는 금액이 바뀐 것(0.01)과 의역(0.12)을 구별하지 못한다. 그래서 숫자는 따로 대조한다. 원문과
되번역에서 숫자열(연속한 숫자. 세 자리씩 끊긴 천 단위 쉼표는 먼저 지운다)을 모아 **개수까지 같은지** 본다 — 숫자
하나하나가 아니라 숫자열이라 `20시간`과 `02시간`은 다르다. 다르면 `역번역수치` **오류**다: 글자 그대로 되번역한
글에서 숫자가 달라질 까닭이 없고, 현지어 본문의 잘못된 금액·시간은 이 파이프라인이 막으려는 가장 큰 결함이다.
종류와 개수가 같은데 **나오는 순서**가 다르면(`11월 5일` ↔ `5월 11일`, `1.5시간` ↔ `5.1시간`) `역번역수치순서`
**경고**다. 번역하면 숫자가 옮겨 갈 수 있어 오류로 막지는 않지만, 양쪽이 모두 한국어라 순서가 바뀐 것은 신호다.
한 게시물에 두 코드가 함께 나오지 않는다.

이 대조가 막지 못하는 것과 거짓 양성:
(1) 날짜·소수의 앞뒤가 바뀐 것은 막지 못한다. 경고(`역번역수치순서`)만 나가고 오류가 아니다.
(2) 숫자를 말로 풀어 쓴 되번역(`이십 시간`)과 단위를 바꾼 되번역(`680만 원` ↔ `6,800,000원`)은 오류로 걸린다.
    되번역은 숫자를 숫자로, 원문의 단위 그대로 적게 하는 것이 채우는 쪽에 주는 지시의 몫이다.
(3) 점으로 천 단위를 끊은 숫자(베트남어 본문의 `6.800.000`)를 되번역이 그대로 옮기면 `6`·`800`·`000`으로 읽혀
    오류가 난다. 베트남어 금액 게시물마다 예상되는 거짓 양성이다. 점은 일부러 지우지 않는다: 점을 천 단위로 보면
    원문의 `1.234`와 되번역의 `1234`가 같은 수가 되어 천 배 차이를 조용히 놓친다. 되번역을 쉼표 천 단위
    (`6,800,000`)로 다시 하게 하는 것이 맞다.
(4) 현지어 본문이 숫자를 말로 쓰면(`một năm`) 되번역은 그 숫자를 알 수 없어, 원문이 숫자로 쓴 `1년`과 맞지 않는다.
    이 경우는 되번역이 아니라 현지어 본문을 숫자로 고쳐야 한다.

복사: 한 소재의 세 게시물은 `source_ko`가 글자까지 같다. 그래서 한 게시물의 되번역을 다른 게시물에 복사해도 숫자와
글자 비교는 모두 통과한다. 공백·문장부호·대소문자를 뺀 되번역이 플랜의 두 게시물에서 똑같으면 `역번역중복`
**경고**를 나중 게시물에 붙이고 두 번호를 모두 댄다. 같은 되번역은 가장 먼저 적은 게시물과만 짝짓는다 — n건이 같으면
n-1건이다.

이 경고는 "베꼈다"가 아니라 "이 화면은 나중 게시물에 대해 독립된 증거를 내지 못했다"는 뜻이다. 우연이 아니라 체계적으로
난다: 한 소재의 세 원문이 같으므로 세 현지어 본문이 모두 충실하면 세 되번역이 같아지는 것이 오히려 정상이다. 되번역이
완벽하게 충실한 워크시트에서도 소재마다 최대 2건이 나온다(30건 한 달이면 열 소재 20건 안팎). 이 크기는
`test_완벽히_충실한_워크시트도_소재마다_역번역중복을_낸다_알려진_한계`가 고정한다. 그래도 끄지 않고, 되번역이 충실해
보인다고 억제하지도 않는다 — 억제하면 나쁜 본문 위에 좋은 답을 복사한 가장 위험한 경우를 가린다. 오류가 아니라
경고인 것은 충실한 경우에도 나오기 때문이다. 확인하는 방법은 하나다: 그 게시물의 현지어
본문만, 다른 답을 보여 주지 않는 새 세션에서 다시 되번역한다. 같게 나오면 본문이 정말 그렇게 말한다는 독립된 표본이 하나
더 생긴 것이다. 비었거나 없는 되번역은 견주지 않는다.

못 막는 것: 한 소재 안에서 되번역을 맞바꾸거나 돌려 놓은 것(4번과 5번을 바꿈, 0→1→2→0)은 서로 다른 되번역이 그대로 남아
아무것도 나지 않는다. 현지어 본문을 읽어야 알 수 있다. 되번역을 `index`와 `language`에 맞게 넣는 것은 채우는 쪽의 몫이다.

CTA: 모든 원문과 현지어 본문은 승인된 상담 문구로 끝나야 한다(`validate_copy`가 강제). 공통 CTA는 차이와
숫자를 가리므로 재기 전에 뗀다. 현지어 쪽은 `worksheet`가 `glossary["cta"][언어]`를 **정확히** 떼어 내보내므로
되번역에는 CTA가 없다(CTA가 현지어 본문의 끝이라는 보장은 `validate_copy`의 것이고, `worksheet`는 어긋나면
조용히 통째로 내보내지 않고 멈춘다. 본문이 CTA뿐이라 번역할 것이 남지 않을 때도 멈춘다). 원문 쪽은
`validate_backtranslation`이 `glossary["cta"]["ko"]`를 떼고 잰다. 되번역에 CTA를 적어 오면 떼지 않으므로 원문에서
뗀 것과 맞지 않아 차이로 잡힌다.

낡은 워크시트: `load(path)`만으로는 다른 달의 워크시트인지, 워크시트를 채운 뒤에 `body_local`을 고쳤는지 모른다.
`plan`과 `glossary`를 함께 넘겨야 `month`와 `body_hash`로 알아챈다. 둘을 넘기는 것은 부르는 쪽(CLI)의 몫이다.

코드: `역번역누락`(오류, 게시물의 항목이 워크시트에 없음) · `역번역빈칸`(오류, back_ko가 비었거나 공백·문장부호뿐) ·
`역번역플랜밖`(오류, 플랜에 없는 번호의 항목이 있음) · `역번역수치`(오류, 숫자열이 다름) ·
`역번역수치순서`(경고, 숫자열은 같고 순서만 다름) · `역번역차이`(경고, 임계값 초과) · `역번역중복`(경고, 다른
게시물의 되번역과 같음). 경고는 예약을 막지 않지만 검토 화면에 뜬다. 결과 순서는 `findings`와 같다: 게시물에 매이지
않는 항목이 먼저, 그다음 게시물 번호순이고 같은 게시물에서는 `역번역수치`, `역번역수치순서`, `역번역차이`, `역번역중복`
차례다.
"""

from __future__ import annotations

import difflib
import hashlib
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

from .findings import Finding, _error, _normalize, _ordered, _warning
from .plan_model import Plan, Post

_HASH_LENGTH = 12  # 16진수 12자(48비트). 보안이 아니라 본문이 바뀌었는지 알아채는 용도다.


class WorksheetError(Exception):
    """역번역 워크시트 파일의 내용이 규칙에 맞지 않을 때."""


def _require_cta(glossary: dict, language: str) -> str:
    """용어집의 `language` CTA를 돌려준다. 없거나 비면 `ValueError` — 빈 CTA는 떼어 낼 것이 없어 CTA를 떼는
    단계가 조용히 꺼지고, 그러면 공통 CTA가 차이와 숫자를 가린다."""
    entry = glossary.get("cta") if isinstance(glossary, dict) else None
    cta = entry.get(language) if isinstance(entry, dict) else None
    if not (isinstance(cta, str) and _comparable(cta)):
        raise ValueError(
            f"용어집에 cta.{language}가 없거나 비어 있습니다(공백이나 문장부호뿐인 값도 안 됩니다). 빈 값이면 CTA를 "
            f"떼는 단계가 조용히 꺼지므로 멈춥니다. glossary.json을 고치세요."
        )
    return cta


def _strip_cta(text: str, cta: str) -> str | None:
    """`text`가 `cta`로 끝나면(뒤쪽 공백은 무시) CTA와 그 앞의 공백을 뗀 앞부분을, 아니면 `None`을 돌려준다.

    `validate_copy`의 CTA 검사(`text.rstrip().endswith(cta)`)와 같은 기준이라 대조 없이 글자 그대로 본다.
    """
    body = text.rstrip()
    return body[: -len(cta)].rstrip() if body.endswith(cta) else None


def _worksheet_body(post: Post, glossary: dict) -> str:
    """워크시트에 내보내는, CTA를 뗀 `body_local`. 본문이 CTA로 끝나지 않으면 `ValueError`."""
    body = _strip_cta(post.body_local, _require_cta(glossary, post.language))
    if body is None:
        raise ValueError(
            f"게시물 {post.index}번의 현지어 본문(body_local)이 {post.language}의 승인된 상담 문구로 끝나지 않아 "
            f"CTA를 뗄 수 없습니다. 본문을 통째로 내보내면 채우는 쪽이 CTA를 되번역하게 되므로 멈춥니다. "
            f"validate_copy의 CTA없음을 먼저 고치세요."
        )
    if not _comparable(body):
        raise ValueError(
            f"게시물 {post.index}번의 현지어 본문(body_local)에 승인된 상담 문구(CTA)밖에 없어 되번역할 본문이 남지 "
            f"않습니다(공백이나 문장부호뿐인 것도 없는 것으로 봅니다). 본문이 비어 있는 워크시트를 내면 채우는 쪽이 "
            f"무엇을 되번역해야 하는지 알 수 없으니 멈춥니다. 본문을 쓰세요."
        )
    return body


def _body_hash(body: str) -> str:
    return hashlib.sha256(body.encode("utf-8")).hexdigest()[:_HASH_LENGTH]


def worksheet(plan: Plan, glossary: dict) -> dict:
    """되번역을 채울 워크시트를 낸다. 항목은 `plan.posts` 순서이고 `back_ko`는 비어 있다.

    `body_local`은 끝의 CTA(`glossary["cta"][언어]`)를 뗀 것이고 `body_hash`는 그 본문의 해시다. 한국어 원문
    (`source_ko`)은 일부러 담지 않는다. 이 딕셔너리를 `json.dumps(..., ensure_ascii=False)`로 파일에 쓰면 되고,
    채운 파일은 `load`가 읽는다. 용어집에 게시물 언어의 CTA가 없거나 본문이 그 CTA로 끝나지 않으면 `ValueError`.
    """
    entries = []
    for post in plan.posts:
        body = _worksheet_body(post, glossary)
        entries.append({
            "index": post.index,
            "language": post.language,
            "body_local": body,
            "body_hash": _body_hash(body),
            "back_ko": "",
        })
    return {"month": plan.month, "entries": entries}


def load(path: Path, *, plan: Plan | None = None, glossary: dict | None = None) -> dict[int, str]:
    """채워 온 워크시트를 읽어 `{게시물 번호: back_ko}`로 돌려준다. 규칙에 어긋나면 `WorksheetError`.

    항목의 `index`는 정수여야 하고 같은 번호가 둘이면 멈춘다(뒤의 것이 조용히 이기면 앞의 되번역이 사라진 줄 모르고
    지나간다). `back_ko`는 문자열이어야 하지만 **비어 있어도 된다** — 비었는지는 `validate_backtranslation`이
    게시물 번호와 함께 보고한다. 워크시트의 그 밖의 필드(`language`, `body_local`)는 읽지 않는다. `month`는 아래처럼
`plan`을 받을 때만 읽는다 — 그때는 `month`가 있어야 하고, `plan` 없이는 손으로 만든 워크시트에 없어도 읽힌다.

    `plan`과 `glossary`를 **둘 다** 넘기면 먼저 워크시트의 `month`가 `plan.month`와 같은지 본다 — 지난달 워크시트는
    번호가 겹쳐 `역번역플랜밖`이 나지 않고 "본문이 바뀌었다"로 오진되기 때문이다. 이어서 항목마다 `body_hash`를 지금
    플랜의 본문(`worksheet`가 내보내는 것과 같은 CTA 뗀 본문)의 해시와 견주어, 워크시트를 채운 뒤 본문이 바뀐 게시물이
    있으면 그 번호를 대고 멈춘다. `body_hash`가 없는 항목도 확인할 수 없으므로 멈춘다. 플랜에 없는 번호의 항목은 여기서
    보지 않는다(`역번역플랜밖`의 몫).
    둘 다 생략하면 `body_hash`를 읽지 않는다. 하나만 넘기면 확인이 조용히 빠지므로 `ValueError`.
    """
    if (plan is None) != (glossary is None):
        raise ValueError(
            "load의 plan과 glossary는 함께 넘기거나 둘 다 생략하세요. 하나만 넘기면 본문이 바뀌었는지 확인하는 "
            "단계가 조용히 빠집니다."
        )
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
    if plan is not None and raw.get("month") != plan.month:
        raise WorksheetError(
            f"역번역 워크시트 {path}의 month는 {raw.get('month')!r}이고 지금 플랜의 month는 {plan.month!r}입니다. "
            f"다른 달의 워크시트입니다. 번호가 같은 항목이 있어도 다른 달 본문에서 나온 되번역이니 이번 달 플랜으로 "
            f"워크시트를 다시 내서 채우세요."
        )

    back: dict[int, str] = {}
    hashes: dict[int, object] = {}
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
        hashes[index] = entry.get("body_hash")

    if plan is not None and glossary is not None:
        _require_unchanged(path, plan, glossary, hashes)
    return back


def _require_unchanged(path: Path, plan: Plan, glossary: dict, hashes: dict[int, object]) -> None:
    """워크시트에 적힌 `body_hash`가 지금 플랜의 본문과 맞는지 본다. 어긋난 번호를 전부 대고 `WorksheetError`."""
    stale: list[int] = []
    unhashed: list[int] = []
    for post in plan.posts:
        if post.index not in hashes:
            continue  # 항목이 없는 게시물은 validate_backtranslation이 `역번역누락`으로 보고한다
        recorded = hashes[post.index]
        if not isinstance(recorded, str) or not recorded:
            unhashed.append(post.index)
        elif recorded != _body_hash(_worksheet_body(post, glossary)):
            stale.append(post.index)
    if not (stale or unhashed):
        return
    parts = []
    if stale:
        parts.append(
            f"워크시트를 채운 뒤 현지어 본문(body_local)이 바뀐 게시물: {', '.join(map(str, stale))}번"
        )
    if unhashed:
        parts.append(
            f"body_hash가 없어 본문이 그대로인지 확인할 수 없는 게시물: {', '.join(map(str, unhashed))}번"
        )
    raise WorksheetError(
        f"역번역 워크시트 {path}가 지금의 플랜과 맞지 않습니다. {' / '.join(parts)}. 이 되번역은 지금의 본문에서 나온 "
        f"것이 아닐 수 있으니 워크시트를 다시 내서 해당 게시물을 다시 되번역하세요."
    )


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


# 천 단위 쉼표: 앞이 숫자이고 뒤가 정확히 세 자리인 쉼표만. `1,2,3`은 숫자 셋이라 지우면 안 된다.
# `validate_copy._THOUSANDS_COMMA`는 이름이 같지만 `(?<=\d),(?=\d)`로 숫자 사이의 쉼표를 전부 지운다. 일부러 다르다:
# 거기서는 사실 값 속의 수를 넉넉히 읽어 출처를 찾는 것이 목적이고, 여기서는 `1,2,3`이 `123`으로 합쳐져 숫자가 바뀐
# 것을 놓치지 않는 것이 목적이다. 한쪽을 맞추려고 다른 쪽을 고치지 말 것.
_THREE_DIGIT_COMMA = re.compile(r"(?<=[0-9]),(?=[0-9]{3}(?![0-9]))")


def _digit_sequence(text: str) -> list[str]:
    """`text`의 숫자열(연속한 숫자)을 나온 순서대로. 세 자리씩 끊긴 쉼표는 먼저 지우고, 숫자 문자는 모두 0-9로 바꾼다
    (`２０`, `२०`, `၂၀`은 `20`). 숫자열은 문자열 그대로 견주므로 `20`과 `02`는 다르다."""
    ascii_text = "".join(str(unicodedata.decimal(ch)) if ch.isdecimal() else ch for ch in text)
    return re.findall(r"[0-9]+", _THREE_DIGIT_COMMA.sub("", ascii_text))


def _describe(runs: Counter[str]) -> str:
    return ", ".join(run if count == 1 else f"{run}({count}번)" for run, count in sorted(runs.items()))


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
    """되번역이 빠짐없이 왔는지, 숫자가 같은지, 한국어 원문(`source_ko`)에서 얼마나 벌어졌는지 보고 문제를 전부 돌려준다.

    - 게시물의 되번역이 `back`에 없으면 `역번역누락`, 있는데 비었거나 공백·문장부호뿐이면 `역번역빈칸` (오류)
    - `back`에 플랜에 없는 번호가 있으면 `역번역플랜밖` (오류) — 다른 달·다른 판의 워크시트가 섞였다는 신호다
    - 원문과 되번역의 숫자열이 개수까지 같지 않으면 `역번역수치` (오류) — 어느 쪽에만 어떤 숫자가 있는지 적는다
    - 숫자열의 종류와 개수는 같은데 나오는 순서가 다르면 `역번역수치순서` (경고). `역번역수치`와 함께 나오지 않는다
    - `divergence`가 `threshold`를 **넘으면** `역번역차이` (경고, 같으면 아니다)
    - 플랜의 두 게시물의 되번역이 (공백·문장부호·대소문자를 뺀 뒤) 똑같으면 `역번역중복` (경고) — 두 번호를 모두 대고
      나중 게시물에 붙인다. 같은 되번역은 **가장 먼저 적은 게시물**과만 짝지으므로 n개가 같으면 n-1건이다. 비었거나
      없는 되번역은 견주지 않는다. "베꼈다"는 판정이 아니라 이 화면이 그 게시물에 독립된 증거를 내지 못했다는 뜻이고,
      충실한 되번역에서도 소재마다 최대 2건이 난다(머리말의 복사 문단)

    비교 대상은 한국어 원문이다 — 현지어 본문이 아니다. 원문은 끝의 한국어 CTA(`glossary["cta"]["ko"]`)를 뗀 뒤에
    숫자와 글자를 견준다(`worksheet`가 되번역할 본문에서 CTA를 뗐으므로 짝이 맞는다). 원문이 CTA로 끝나지 않으면
    떼지 않는다 — 그것은 `validate_copy`가 `CTA없음`으로 보고한다. 되번역에서는 아무것도 떼지 않는다.
    입력이 어긋나면 검사가 조용히 꺼지므로 `ValueError`로 멈춘다: 없거나 빈 `cta.ko`, `0 <= threshold < 1`이
    아닌 임계값, `{정수: 문자열}`이 아닌 `back`.

    임계값 기본값 0.45는 글자 유사도에 대한 것으로, 뜻을 재지 않는다. 이 모듈 머리말의 한계를 볼 것.
    """
    cta_ko = _require_cta(glossary, "ko")
    _require_threshold(threshold)
    _require_back(back)

    findings: list[Finding] = []
    comparable_back: dict[int, str] = {}  # 비교할 수 있는(없지도 비지도 않은) 되번역만
    for post in plan.posts:
        text = back.get(post.index)
        if text is None:
            findings.append(_error(
                "역번역누락", post.index,
                f"게시물 {post.index}번의 역번역이 워크시트에 없습니다. 워크시트에 index {post.index}번 항목을 넣고 "
                f"back_ko를 채우세요. 역번역이 없으면 현지어 본문이 한국어 원문과 같은 뜻인지 사람이 볼 수 없습니다.",
            ))
            continue
        comparable = _comparable(text)
        if not comparable:
            findings.append(_error(
                "역번역빈칸", post.index,
                f"게시물 {post.index}번의 back_ko가 비어 있습니다. 현지어 본문(body_local)을 한국어로 되번역해 "
                f"채우세요. 공백이나 문장부호뿐인 값도 비어 있는 것으로 봅니다.",
            ))
            continue
        comparable_back[post.index] = comparable

        stripped = _strip_cta(post.source_ko, cta_ko)
        source = post.source_ko if stripped is None else stripped

        source_sequence, back_sequence = _digit_sequence(source), _digit_sequence(text)
        source_runs, back_runs = Counter(source_sequence), Counter(back_sequence)
        if source_runs != back_runs:
            detail = []
            if source_runs - back_runs:
                detail.append(f"원문에만 있는 숫자: {_describe(source_runs - back_runs)}")
            if back_runs - source_runs:
                detail.append(f"역번역에만 있는 숫자: {_describe(back_runs - source_runs)}")
            findings.append(_error(
                "역번역수치", post.index,
                f"게시물 {post.index}번의 역번역 숫자가 한국어 원문과 다릅니다 — {'; '.join(detail)}. 숫자는 천 단위 "
                f"쉼표를 뺀 숫자열 단위로 개수까지 맞춰 봅니다. 금액·시간·날짜가 정말 바뀌었을 수 있으니 한국어 원문과 "
                f"현지어 본문의 숫자를 먼저 확인하세요. 본문의 숫자는 그대로인데 표기만 달라서 걸린 것일 수도 있습니다: "
                f"숫자를 말로 풀어 쓰거나(이십), 단위를 바꾸거나(680만 원), 점으로 천 단위를 끊은 숫자를 그대로 "
                f"옮긴(베트남어 본문의 6.800.000) 경우입니다. 이 역번역은 고쳐 쓰지 말고, 숫자는 숫자로, 천 단위는 "
                f"쉼표로(6,800,000), 원문의 단위 그대로 적어 다시 되번역하세요.",
            ))
        elif source_sequence != back_sequence:
            findings.append(_warning(
                "역번역수치순서", post.index,
                f"게시물 {post.index}번의 역번역은 원문과 숫자의 종류와 개수는 같지만 나오는 순서가 다릅니다 — "
                f"원문: {' → '.join(source_sequence)}, 역번역: {' → '.join(back_sequence)}. 날짜(11월 5일과 5월 11일)나 "
                f"소수(1.5와 5.1)의 앞뒤가 뒤바뀌었을 수 있습니다. 번역하면 숫자가 옮겨 갈 수 있어 오류로 막지는 않으니 "
                f"원문과 현지어 본문의 숫자를 직접 확인하세요.",
            ))

        measured = divergence(source, text)
        if measured > threshold:
            findings.append(_warning(
                "역번역차이", post.index,
                f"게시물 {post.index}번의 역번역이 한국어 원문에서 글자 기준으로 {measured:.2f}만큼 벗어났습니다"
                f"(기준 {threshold:.2f}). 뜻이 달라졌거나 빠진 부분이 있을 수 있으니 검토 화면에서 한국어 원문과 "
                f"역번역을 나란히 읽어 보세요. 글자 유사도일 뿐이라 의역한 문장은 뜻이 같아도 걸리고, 낱말 하나의 "
                f"부정이 바뀐 것은 걸리지 않습니다.",
            ))

    # 같은 되번역은 가장 먼저 적은 게시물 하나와만 짝짓는다. 쌍마다 내면 n개가 같을 때 n(n-1)/2건이 나와 다른 결과를 묻는다.
    first_with: dict[str, int] = {}  # 정규화한 되번역 -> 그것을 처음 적은 게시물 번호
    for post in plan.posts:
        if post.index not in comparable_back:
            continue
        earlier = first_with.setdefault(comparable_back[post.index], post.index)
        if earlier != post.index:
            findings.append(_warning(
                "역번역중복", post.index,
                f"게시물 {earlier}번과 {post.index}번의 역번역이 (공백·문장부호·대소문자를 빼면) 똑같습니다. 한 소재의 세 "
                f"게시물은 한국어 원문이 같아서, 두 현지어 본문이 모두 충실하게 되번역돼도 똑같이 나오고 한쪽을 베껴도 "
                f"똑같이 나옵니다. 이 화면만으로는 둘을 구별할 수 없으니 {post.index}번에 대해서는 독립된 증거가 아직 "
                f"없는 셈입니다. 확인하려면 {post.index}번의 현지어 본문 하나만, 다른 답을 보여 주지 않는 새 세션에서 "
                f"다시 되번역하세요. 같게 나오면 본문이 정말 그렇게 말한다는 독립된 표본이 하나 더 생긴 것입니다.",
            ))

    known = {post.index for post in plan.posts}
    for index in sorted(index for index in back if index not in known):
        findings.append(_error(
            "역번역플랜밖", None,
            f"워크시트에 이 플랜에 없는 게시물 번호 {index}의 역번역이 있습니다. 다른 달이나 다른 판의 "
            f"워크시트를 가져온 것은 아닌지 확인하세요.",
        ))
    return _ordered(findings)
