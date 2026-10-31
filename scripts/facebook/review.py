"""검토 화면: 사람이 한국어 원문과 되번역을 나란히 읽어 뜻을 확인하는 HTML 한 장을 만든다.

이 화면이 **뜻을 확인하는 유일한 지점**이다. 현지어 본문(베트남어·미얀마어·네팔어)은 AI가 썼고 원어민이 보지 않는다.
글자 유사도(`backtranslation.divergence`)는 부정 뒤집힘(0.05)·금액 변경(0.01)·약속 문장 추가(0.12)를 충실한 의역의
잡음(0.08~0.12)과 구별하지 못한다. 그래서 이 모듈의 요구는 "보기 좋게"가 아니라 **사람이 세 단을 실제로 읽게
만드는 것**이고, 아래가 그 결정이다.

- **finding은 두 곳에 있다.** 위쪽 요약과 그 게시물의 카드. 카드에서는 세 단보다 **앞**에 놓아 글을 읽기 전에 무엇을
  의심해야 하는지 먼저 보게 한다. 요약에만 있으면 긴 목록에서 지나친다.
- **요약은 코드별로 한 줄이다.** 건수와 게시물 번호를 싣고 번호는 카드로 이어진다. `역번역중복`은 흠 없는 한 달에도
  스무 건쯤 나는데(소재마다 두 건), 같은 코드 스무 줄이 요약을 채우면 다른 finding이 묻힌다. 코드를 가리지 않고 묶고,
  어느 코드도 따로 다루지 않는다 — 그 경고의 뜻은 finding의 메시지가 말한다. 게시물에 매이지 않은 finding
  (`post_index`가 `None`)은 카드가 없으니 요약에 **메시지까지** 싣는다.
- **finding이 하나도 없으면 없다고 적는다.** 빈 요약은 "검사해서 괜찮다"로도 "아무것도 안 돌았다"로도 읽힌다.
- **한국어 원문과 되번역을 서로 붙여 두고, 서로 다른 낱말을 칠한다.** 눈이 바로 견주어야 하는 것이 그 둘이라 현지어
  본문은 그 옆(끝)이다. 그래도 다섯 문장짜리 두 단락을 맞대어 읽으며 `입니다` -> `이 아닙니다`를 잡는 것은 사람이 가장
  못하는 일이라, 공백으로 끊은 **낱말 목록**에 `difflib.SequenceMatcher`를 걸어 다른 구간을 양쪽에 칠한다(원문 쪽은
  빠졌거나 바뀐 낱말, 되번역 쪽은 덧붙었거나 바뀐 낱말). 글자 단위로 하면 한국어 조사마다 쪼개져 읽을 수 없다.
  **임계값으로 걸러 내거나 "잡음"이라고 숨기지 않는다.** 어떤 필터든 거의 같은 글에서 꺼지고, 뒤집힌 부정이 숨는 곳이 바로
  그 거의 같은 글이다(변이 시험으로 확인했다: 유사도 0.8 위에서 끄는 필터는 `입니다` -> `이 아닙니다` 하나만 다른 다섯 문장
  글에서 표시를 모두 껐다). 눈으로 구별되지 않는 차이(NFC/NFD)와 공백·줄바꿈 차이만 차이로 치지 않는다.
  **얼마나 칠해지는가(실측, 다섯 문장 글):** 부정 뒤집힘 하나면 원문 5%·되번역 10% 안팎이고 한 낱말 칩이 뚜렷하다. 충실한
  의역은 27~33%에 칩 3~4개다. 의역과 뒤집힘이 **붙어 있으면** 67~77%가 칠해지고, 문장 경계를 넘는 큰 칩 하나가 되어 그 안에서
  어느 낱말이 뜻을 바꿨는지 알 수 없다(한국어는 조사와 어미가 낱말에 붙어 있어 어미 하나만 바뀌어도 낱말 전체가 칠해진다).
  잡음에 대한 답은 숨기는 것이 아니라 **구분하는 것**이다.
- **표시는 세 가지 모양이고 칩은 문장을 넘지 않는다.** 안내가 찾으라고 하는 "없는 약속 추가"와 "빠진 한정어"가 바로 되번역에만
  있는 말(`insert`)과 원문에만 있는 말(`delete`)이다. 한 가지 노란색이면 흔한 의역(`replace`)의 잡음에 묻혀 독자가 노란색을 "또
  의역"으로 읽게 된다. 그래서 `insert`(파란 막대)·`delete`(붉은 막대)·`replace`(노랑)의 모양이 다르고 `title`에 말로도 적는다.
  또 칩은 `validate_copy.SENTENCE_END`(문장이 무엇인지에 대한 판단이 있는 유일한 곳)에서 끊는다 — 같은 양이 칠해지지만 칩이
  문장 하나씩으로 작아져 어디가 바뀌었는지 찾을 수 있다.
- **칠하는 원문은 `validate_backtranslation`이 재는 원문과 같다.** 되번역 워크시트는 끝의 승인된 상담 문구(CTA)를 떼고
  나가므로 되번역에는 CTA가 없다. 원문의 CTA까지 견주면 모든 게시물 끝에 늘 같은 표시가 생겨 "표시가 있다"가 아무것도
  알려 주지 못한다. `backtranslation.comparison_source`(CTA 떼기 규칙이 있는 유일한 곳)로 같은 방식으로 떼고, 떼어 낸
  꼬리는 글자 그대로 회색으로 보여 준다. **`cta_ko`는 필수 키워드 인자이고 기본값이 없다.** 기본값이 있으면 빼먹은
  호출이 조용히 CTA를 되번역과 견주어 강조가 아무것도 알려 주지 못하게 된다 — 검사가 스스로 꺼지는 것이다.
- **차이값은 받은 것을 그대로 보여 준다.** `render`는 `divergence`를 계산하지 않는다. 숫자가 `validate_backtranslation`의
  경고문과 어긋나지 않게 `backtranslation.divergences`가 한 곳에서 잰다. 값에 따라 색을 달리하지도 않는다 — 낮은 값을
  초록으로 칠하면 "읽지 않아도 된다"는 신호가 되는데, 위의 측정이 바로 그 신호가 틀렸음을 보였다.
- **되번역이 없으면 빈칸으로 두지 않고 없다고 적는다.** 차이값이 없는 것도 0이 아니라 "측정하지 않음"이다. 비었는지는
  `backtranslation.is_blank`(공백·문장부호·서식 문자뿐이면 빔) 하나로 정해 칸과 차이값 줄과 강조가 서로 모순되지 않는다.
  **차이값이 없는 이유를 단정하지 않는다:** 되번역이 비었으면 그렇다고 적지만, 되번역이 보이는데 값만 못 받았으면
  "측정값을 받지 못했습니다"라고만 적는다. `_divergence`가 아는 것은 번호가 `divergences`에 없다는 것뿐이다.
- 카드 머리 밑에 그 게시물이 인용한 사실 키(`fact_keys`)와 대학명(`university_names`)을 한 줄로 적는다. 값은 싣지
  않는다(수치가 사실 값과 맞는지는 `출처없는수치`가 이미 기계로 대조한다). 사람이 볼 것은 이 게시물이 **무엇에 기대어
  있다고 주장하는지**이고, 등록금 글이 사실 키를 하나도 달지 않았다면 "없음"이 눈에 띈다.
- 이미지 아래에 `image_prompt`를 그대로 적는다. 글자 금지·실존 인물 금지 지시가 형식만 맞고 내용이 어긋나는 것을
  사람이 보는 유일한 자리다.

`render`는 문자열만 돌려주고 파일을 읽거나 쓰지 않는다. 호출하는 쪽이 `month_dir / "review.html"`에 쓴다. 이미지는
HTML이 놓일 자리(`images_dir.parent`) 기준 상대 경로로 걸어 파일을 열면 바로 보인다.

템플릿 엔진 없이 f-string과 `html.escape`로 조립한다. **화면에 나가는 모든 문자열은 이스케이프한다** — 되번역은 사람이
채우고, 프롬프트와 finding 메시지에는 본문 조각이 들어간다. 스크립트나 외부 자원은 쓰지 않는다.
"""

from __future__ import annotations

import difflib
import html
import os
import re
import unicodedata
from collections import Counter
from pathlib import Path
from urllib.parse import quote

from .backtranslation import comparison_source, is_blank
from .findings import Finding
from .plan_model import Plan, Post
from .validate_copy import SENTENCE_END

_LANGUAGE_NAMES = {"vi": "베트남어", "my": "미얀마어", "ne": "네팔어"}

# 시스템 글꼴만 쓴다. 미얀마 문자와 데바나가리는 한국어 글꼴에 없어서 목록에 따로 적지 않으면 네모(두부)로 깨진다.
_STYLE = """
:root {
  color-scheme: light dark;
  --bg: #f5f4ef; --panel: #ffffff; --ink: #1d1d1b; --muted: #5d5b55; --line: #d6d3c8; --accent: #1f4e79;
  --error: #a8201a; --error-bg: #fdecea; --warning: #7a4f00; --warning-bg: #fff3d1; --mark: #ffe27a;
  --mark-delete: #ffd3cf; --mark-delete-bar: #c0261d; --mark-insert: #cde3ff; --mark-insert-bar: #1f5fbf;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #151513; --panel: #201f1c; --ink: #ecebe6; --muted: #a8a59b; --line: #3b3934; --accent: #8ab4e8;
    --error: #ff9a91; --error-bg: #3b1d1a; --warning: #f3c471; --warning-bg: #3a2f12; --mark: #6e5600;
    --mark-delete: #5c2420; --mark-delete-bar: #ff8a80; --mark-insert: #1d3e66; --mark-insert-bar: #7fb0ff;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--bg); color: var(--ink); font-size: 15px; line-height: 1.7;
  font-family: system-ui, -apple-system, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR",
    "Noto Sans Myanmar", "Myanmar Text", "Myanmar Sangam MN", "Noto Sans Devanagari", "Devanagari Sangam MN",
    "Nirmala UI", sans-serif;
}
.page-head, main { max-width: 1480px; margin: 0 auto; padding: 0 16px; }
.page-head { padding-top: 24px; }
h1 { margin: 0 0 4px; font-size: 1.5rem; }
h2 { font-size: 1.1rem; }
.meta { margin: 0; color: var(--muted); }
code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .9em; }

.howto, #summary { background: var(--panel); border: 1px solid var(--line); padding: 12px 16px; margin: 16px 0; }
.howto { border-left: 4px solid var(--accent); }
.howto h2, #summary h2 { margin: 0 0 6px; }
.howto ul { margin: 6px 0; padding-left: 1.4em; }
.howto p, .howto ul { margin-top: 6px; margin-bottom: 6px; }
.caveat { color: var(--muted); }
#summary { margin-bottom: 32px; }
.tally { margin: 0 0 8px; font-size: 1.2rem; font-weight: 700; }
.tally-error { color: var(--error); }
.tally-warning { color: var(--warning); }
.tally .zero { color: var(--muted); }
.all-clear { margin: 0; padding: 8px 12px; border-left: 4px solid var(--accent); background: var(--bg); }
.legend { margin: 0 0 8px; color: var(--muted); }
.sum-lines { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.sum-line { padding: 6px 10px; border-left: 4px solid var(--line); background: var(--bg); overflow-wrap: anywhere; }
.sum-line.error { border-left-color: var(--error); }
.sum-line.warning { border-left-color: var(--warning); }
.count { font-weight: 700; margin: 0 4px; }
.where-label, .plan-wide, .no-card, .times { color: var(--muted); }
.orphan-messages { margin: 4px 0 0; padding-left: 1.4em; }

.badge {
  display: inline-block; padding: 0 8px; border: 1px solid currentColor; border-radius: 4px;
  font-size: .8rem; font-weight: 700; line-height: 1.6;
}
.error > .badge, .chip-error { color: var(--error); background: var(--error-bg); }
.warning > .badge, .chip-warning { color: var(--warning); background: var(--warning-bg); }

.post {
  background: var(--panel); border: 1px solid var(--line); border-left: 6px solid var(--line);
  margin: 0 0 28px; scroll-margin-top: 12px;
}
.post.has-warning { border-left-color: var(--warning); }
.post.has-error { border-left-color: var(--error); }
.post:target { outline: 3px solid var(--accent); }
.post-head {
  display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; padding: 10px 16px;
  border-bottom: 1px solid var(--line);
}
.post-head h2 { margin: 0; }
.topic { font-weight: 600; }
.chip { display: inline-block; padding: 0 8px; border: 1px solid var(--line); border-radius: 999px; font-size: .8rem; }
.cites { margin: 0; padding: 6px 16px; color: var(--muted); font-size: .85rem; border-bottom: 1px solid var(--line); overflow-wrap: anywhere; }
.findings { padding: 10px 16px; border-bottom: 1px solid var(--line); }
.findings-title { margin: 0 0 6px; font-weight: 700; }
.findings ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.finding { padding: 6px 10px; border-left: 4px solid var(--line); overflow-wrap: anywhere; }
.finding.error { border-left-color: var(--error); background: var(--error-bg); }
.finding.warning { border-left-color: var(--warning); background: var(--warning-bg); }

.post-body { display: grid; grid-template-columns: minmax(180px, 240px) minmax(0, 1fr); gap: 16px; padding: 16px; }
.image { margin: 0; min-width: 0; }
.image img { display: block; width: 100%; height: auto; border: 1px solid var(--line); background: var(--bg); }
.image figcaption, .prompt-label { margin: 4px 0 0; color: var(--muted); font-size: .8rem; overflow-wrap: anywhere; }
.prompt-label { margin-top: 10px; font-weight: 700; }
.prompt { margin: 2px 0 0; font-size: .8rem; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; }
.cols { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.col { min-width: 0; padding: 8px 12px 12px; border: 1px solid var(--line); border-top: 3px solid var(--line); }
.col[data-col="source"], .col[data-col="back"] { border-top-color: var(--accent); }
.col h3 { margin: 0 0 4px; font-size: .95rem; }
.divergence { margin: 0 0 6px; color: var(--muted); font-size: .8rem; }
.divergence strong { color: var(--ink); font-size: .95rem; }
.text { white-space: pre-wrap; overflow-wrap: anywhere; }
mark.diff { background: var(--mark); color: inherit; border-radius: 2px; padding: 1px 0; box-decoration-break: clone; }
mark.diff[data-diff="delete"] { background: var(--mark-delete); border-left: 3px solid var(--mark-delete-bar); padding-left: 3px; }
mark.diff[data-diff="insert"] { background: var(--mark-insert); border-left: 3px solid var(--mark-insert-bar); padding-left: 3px; }
.cta { color: var(--muted); }
.text.missing { padding: 8px; border: 2px dashed var(--error); color: var(--error); font-weight: 700; white-space: normal; }
.empty { color: var(--muted); }

@media (max-width: 1100px) {
  .post-body { grid-template-columns: minmax(0, 1fr); }
  .image { max-width: 320px; }
}
@media (max-width: 760px) {
  .cols { grid-template-columns: minmax(0, 1fr); }
}
"""

def _e(value: object) -> str:
    return html.escape(str(value), quote=True)


# 표시의 종류마다 말로 된 설명(`title`)이 있다. 색을 못 보는 사람과 마우스를 올린 사람이 읽는다.
_MARK_TITLES = {
    "replace": "양쪽에서 서로 바뀐 낱말",
    "delete": "원문에만 있음: 되번역에 없는 말",
    "insert": "되번역에만 있음: 원문에 없는 말",
}


def _mark(kind: str, inner: str) -> str:
    """강조 표시 하나. `inner`는 이미 이스케이프된 HTML이다."""
    return f'<mark class="diff" data-diff="{kind}" title="{_e(_MARK_TITLES[kind])}">{inner}</mark>'


def _howto() -> str:
    return f"""<aside class="howto">
<h2>이 화면으로 하는 일</h2>
<p>현지어 본문은 AI가 썼고 원어민 검수를 받지 않았습니다. 뜻이 한국어 원문과 같은지 확인할 수 있는 곳은 이 화면에서 <strong>한국어 원문</strong>과 <strong>되번역 한국어</strong>를 나란히 읽는 것뿐입니다. 게시물마다 두 단을 끝까지 읽고 다음을 찾으세요.</p>
<ul>
<li><strong>부정</strong>이 뒤집힌 곳 (할 수 있다와 할 수 없다, 필요와 불필요)</li>
<li><strong>금액</strong>·기간·시간·날짜·인원이 바뀐 곳</li>
<li>원문에 없는 <strong>약속</strong>·보장·조건이 덧붙은 곳, 원문에 있던 단서(‘평균’, ‘~일 수 있습니다’)가 빠진 곳</li>
</ul>
<p data-role="mark-legend">두 한국어 단에서 <strong>서로 다른 낱말</strong>에 표시가 있고 모양이 셋입니다. {_mark("replace", "노란색")}은 양쪽에서 서로 다른 낱말로 바뀐 곳으로 의역에서 흔합니다. {_mark("delete", "붉은 막대")}는 원문에만 있고 되번역에는 없는 말, {_mark("insert", "파란 막대")}는 되번역에만 있고 원문에는 없는 말입니다. 위에서 찾으라고 한 <strong>덧붙은 약속·조건</strong>은 파란 막대로, <strong>빠진 단서(한정어)</strong>는 붉은 막대로 나타나므로 이 둘을 먼저 읽으세요. 표시는 문장을 넘지 않게 끊었습니다. 뜻이 같은 의역에도 표시가 생기지만 일부러 걸러 내지 않았습니다 — 표시된 곳을 읽고 뜻이 같은지 판단하세요. 표시가 없는 곳은 두 글의 낱말이 똑같은 곳입니다. 원문 맨 끝의 승인된 상담 문구(회색)는 되번역에 들어가지 않으므로 견주지 않습니다.</p>
<p class="caveat">‘글자 차이’ 숫자는 두 한국어 글의 글자 유사도일 뿐 뜻을 재지 않습니다. 부정이 뒤집히거나 금액이 바뀌어도 낮게 나오고, 뜻이 같은 의역도 높게 나옵니다. 숫자가 낮다는 것은 읽지 않아도 되는 근거가 아닙니다.</p>
</aside>"""


def _is_error(finding: Finding) -> bool:
    return finding.severity == "error"


def _severity_label(is_error: bool) -> str:
    return "오류" if is_error else "경고"


def _image_src(images_dir: Path, image_file: str) -> str:
    """HTML이 놓이는 자리(`images_dir.parent`) 기준 상대 경로. `#`·`?`·공백이 있으면 그림이 조용히 안 뜨므로 URL로 인코딩한다."""
    relative = os.path.relpath(images_dir / image_file, start=images_dir.parent)
    return quote(Path(relative).as_posix(), safe="/")


def _summary_line(is_error: bool, code: str, group: list[Finding], card_indexes: set[int]) -> str:
    severity = "error" if is_error else "warning"
    on_cards = Counter(f.post_index for f in group if f.post_index in card_indexes)
    places = []
    if on_cards:
        numbers = []
        for index in sorted(on_cards):
            times = f'<span class="times">({on_cards[index]}건)</span>' if on_cards[index] > 1 else ""
            numbers.append(f'<a href="#post-{_e(index)}">{_e(index)}번</a>{times}')
        places.append(f'<span class="where-label">게시물</span> {", ".join(numbers)}')

    stray = [f for f in group if f.post_index not in card_indexes]  # 이어질 카드가 없는 항목
    if any(f.post_index is None for f in stray):
        places.append('<span class="plan-wide">플랜 전체</span>')
    for index in sorted({f.post_index for f in stray if f.post_index is not None}):
        places.append(f'<span class="no-card">{_e(index)}번(플랜에 없는 번호)</span>')

    # 카드가 없는 항목은 이 줄이 메시지를 읽을 유일한 자리다.
    messages = ""
    if stray:
        items = "".join(f"<li>{_e(f.message)}</li>" for f in stray)
        messages = f'<ul class="orphan-messages">{items}</ul>'

    return (
        f'<li class="sum-line {severity}">'
        f'<span class="badge">{_severity_label(is_error)}</span> <code>{_e(code)}</code> '
        f'<span class="count">{len(group)}건</span>'
        f'<span class="where">{" · ".join(places)}</span>'
        f"{messages}</li>"
    )


def _summary(findings: list[Finding], card_indexes: set[int]) -> str:
    errors = sum(1 for f in findings if _is_error(f))
    warnings = len(findings) - errors
    tally = (
        f'<p class="tally"><span class="tally-error{" zero" if not errors else ""}">오류 {errors}건</span> · '
        f'<span class="tally-warning{" zero" if not warnings else ""}">경고 {warnings}건</span></p>'
    )
    if not findings:
        body = (
            '<p class="all-clear">검증기가 오류와 경고를 하나도 내지 않았습니다. 그래도 뜻이 맞는지는 아래 게시물마다 '
            "한국어 원문과 되번역을 직접 읽어야 알 수 있습니다.</p>"
        )
    else:
        groups: dict[tuple[bool, str], list[Finding]] = {}
        for finding in findings:
            groups.setdefault((_is_error(finding), finding.code), []).append(finding)
        lines = "".join(
            _summary_line(is_error, code, group, card_indexes)
            for (is_error, code), group in sorted(groups.items(), key=lambda item: not item[0][0])  # 오류가 먼저, 안정 정렬
        )
        body = (
            '<p class="legend">오류는 올리기 전에 고쳐야 하는 항목이고 경고는 사람이 읽고 판단하는 항목입니다. '
            "같은 코드는 한 줄로 묶었고, 게시물 번호를 누르면 그 게시물로 갑니다.</p>"
            f'<ul class="sum-lines">{lines}</ul>'
        )
    return f'<section id="summary"><h2>검증 요약</h2>{tally}{body}</section>'


def _findings_box(post_findings: list[Finding]) -> str:
    if not post_findings:
        return ""
    ordered = sorted(post_findings, key=lambda f: not _is_error(f))  # 오류가 먼저, 같은 심각도 안에서는 받은 순서
    items = "".join(
        f'<li class="finding {"error" if _is_error(f) else "warning"}">'
        f'<span class="badge">{_severity_label(_is_error(f))}</span> <code>{_e(f.code)}</code> '
        f'<span class="message">{_e(f.message)}</span></li>'
        for f in ordered
    )
    return f'<div class="findings" data-role="findings"><p class="findings-title">이 게시물에서 걸린 항목</p><ul>{items}</ul></div>'


def _blank(text: str | None) -> bool:
    """되번역 칸이 없거나 빈 것으로 보는지. 빈칸의 판정은 `backtranslation.is_blank` 하나라서(`validate_backtranslation`·
    `divergences`와 같다) 칸과 차이값 줄이 서로 모순되지 않는다."""
    return text is None or is_blank(text)


def _divergence(value: float | None, back_text: str | None) -> str:
    # 되번역이 비었다면 값이 없는 까닭을 안다. 되번역이 보이는데 값이 없다면 번호가 `divergences`에 없다는 것밖에 모른다 —
    # 까닭을 지어내 "되번역이 없다"고 적으면 눈앞의 되번역과 모순되는 거짓말이 된다.
    if _blank(back_text):
        return '<p class="divergence" data-role="divergence">글자 차이: 측정하지 않음(되번역이 없거나 비어 있음)</p>'
    if value is None:
        return '<p class="divergence" data-role="divergence">글자 차이: 측정값을 받지 못했습니다</p>'
    return (
        f'<p class="divergence" data-role="divergence">원문과 글자 차이 <strong>{value:.2f}</strong> '
        f"(글자 기준일 뿐 뜻의 보증이 아님)</p>"
    )


_PIECE = re.compile(r"\S+|\s+")
_SENTENCE_FINAL = re.compile(SENTENCE_END.pattern + r"\Z")  # 낱말이 문장 끝 글자로 끝나는가


def _pieces(text: str) -> tuple[list[str], list[int]]:
    """`text`를 낱말과 공백 조각으로 나눈다: (조각들, 낱말인 조각의 위치들). 조각을 이어 붙이면 `text`가 그대로 나온다."""
    pieces = _PIECE.findall(text)
    return pieces, [position for position, piece in enumerate(pieces) if not piece.isspace()]


def _ends_sentence(pieces: list[str], words: list[int], number: int) -> bool:
    """`number`번째 낱말 뒤에서 문장이 끝나는가: 그 낱말이 문장 끝 글자로 끝나거나, 다음 낱말과의 사이에 줄바꿈이 있다.
    무엇이 문장 끝인지는 `validate_copy.SENTENCE_END`가 정한다(숫자 뒤의 마침표는 끝이 아니고 줄바꿈은 끝이다)."""
    if _SENTENCE_FINAL.search(pieces[words[number]]):
        return True
    return number + 1 < len(words) and "\n" in "".join(pieces[words[number] + 1 : words[number + 1]])


def _split_at_sentences(
    pieces: list[str], words: list[int], runs: list[tuple[int, int, str]]
) -> list[tuple[int, int, str]]:
    """구간을 문장 끝에서 끊어 칩이 문장을 넘지 않게 한다. 칠해지는 낱말은 그대로이고 칩만 잘게 나뉜다.

    의역 둘에 걸쳐 한 칩이 문장 경계를 넘으면 그 안에서 어느 낱말이 뜻을 바꿨는지 알 수 없다(실측 67~77%)."""
    chips = []
    for first, end, kind in runs:
        start = first
        for number in range(first, end - 1):  # 구간의 마지막 낱말 뒤는 끊을 필요가 없다
            if _ends_sentence(pieces, words, number):
                chips.append((start, number + 1, kind))
                start = number + 1
        chips.append((start, end, kind))
    return chips


def _marked(pieces: list[str], words: list[int], runs: list[tuple[int, int, str]]) -> str:
    """조각을 이스케이프해 이어 붙이되 `runs`(낱말 번호의 [처음, 끝) 구간과 종류)를 문장 끝에서 끊어 `<mark>`로 감싼다.

    같은 문장 안의 공백은 표시 안에 그대로 둔다(표시가 낱말마다 끊기지 않는다). 칸이 `pre-wrap`이라 표시 바깥의
    글자도 하나도 바꾸거나 덧붙이지 않는다."""
    out, cursor = [], 0
    for first, end, kind in _split_at_sentences(pieces, words, runs):
        start, stop = words[first], words[end - 1] + 1
        out.append(_e("".join(pieces[cursor:start])))
        out.append(_mark(kind, _e("".join(pieces[start:stop]))))
        cursor = stop
    out.append(_e("".join(pieces[cursor:])))
    return "".join(out)


def _word_diff(source: str, back: str) -> tuple[str, str]:
    """한국어 원문과 되번역에서 서로 다른 낱말을 칠한 (원문 HTML, 되번역 HTML).

    공백으로 끊은 낱말 목록에 `SequenceMatcher`를 건다. `replace`는 양쪽, `delete`(되번역에 없음)는 원문 쪽, `insert`
    (원문에 없음)는 되번역 쪽에 칠한다. **구간을 걸러 내지 않는다** — 임계값도, 짧은 구간 무시도, 비슷하면 건너뛰기도 없다.
    낱말은 NFC로 맞춰 견준다: 눈으로 구별되지 않는 표기 차이를 칠하면 칠해진 곳에서 아무 차이도 못 찾는다.
    `autojunk`는 끈다(긴 글에서 자주 나오는 낱말을 버려 차이를 지어낸다. `divergence`도 끈다).
    """
    source_pieces, source_words = _pieces(source)
    back_pieces, back_words = _pieces(back)
    keys = [
        [unicodedata.normalize("NFC", pieces[position]) for position in words]
        for pieces, words in ((source_pieces, source_words), (back_pieces, back_words))
    ]
    source_runs: list[tuple[int, int, str]] = []
    back_runs: list[tuple[int, int, str]] = []
    for kind, first, end, back_first, back_end in difflib.SequenceMatcher(None, *keys, autojunk=False).get_opcodes():
        if kind == "equal":
            continue
        if end > first:
            source_runs.append((first, end, kind))
        if back_end > back_first:
            back_runs.append((back_first, back_end, kind))
    return _marked(source_pieces, source_words, source_runs), _marked(back_pieces, back_words, back_runs)


def _source_text(compared_html: str, tail: str) -> str:
    # 안쪽에 공백이나 줄바꿈을 끼우지 않는다: 칸이 `pre-wrap`이라 그대로 화면에 나온다.
    cta = f'<span class="cta">{_e(tail)}</span>' if tail else ""
    return f'<div class="text" data-role="text">{compared_html}{cta}</div>'


def _back_text(text: str | None, marked_html: str) -> str:
    if text is None:
        return '<div class="text missing" data-role="text">되번역이 없습니다. 워크시트가 채워지지 않았거나 이 번호의 항목이 빠졌습니다.</div>'
    if is_blank(text):
        return '<div class="text missing" data-role="text">되번역 칸이 비어 있습니다. 공백이나 문장부호뿐인 값도 비어 있는 것으로 봅니다.</div>'
    return f'<div class="text" data-role="text">{marked_html}</div>'


def _cites(post: Post) -> str:
    """그 게시물이 인용한 사실 키와 대학명 한 줄. 없으면 "없음" — 등록금 글이 사실을 하나도 달지 않았다면 보여야 한다."""
    keys = ", ".join(f"<code>{_e(key)}</code>" for key in post.fact_keys) or "없음"
    names = ", ".join(_e(name) for name in post.university_names) or "없음"
    return f'<p class="cites" data-role="cites">인용한 사실 {keys} · 대학 {names}</p>'


def _card(
    post: Post,
    title: str,
    post_findings: list[Finding],
    back_text: str | None,
    gap: float | None,
    images_dir: Path,
    cta_ko: str,
) -> str:
    # 견주는 원문은 `validate_backtranslation`이 재는 원문과 같다. 떼어 낸 CTA 꼬리는 칠하지 않고 그대로 보여 준다.
    compared = comparison_source(post.source_ko, cta_ko)
    tail = post.source_ko[len(compared):]
    if _blank(back_text):  # 견줄 되번역이 없으면 칠할 것도 없다
        source_html, back_html = _e(compared), ""
    else:
        source_html, back_html = _word_diff(compared, back_text)
    errors = sum(1 for f in post_findings if _is_error(f))
    warnings = len(post_findings) - errors
    state = " has-error" if errors else " has-warning" if warnings else ""
    chips = (f'<span class="chip chip-error">오류 {errors}</span>' if errors else "") + (
        f'<span class="chip chip-warning">경고 {warnings}</span>' if warnings else ""
    )
    language = _LANGUAGE_NAMES.get(post.language, post.language)
    image_file = _e(post.image_file)
    return (
        f'<article class="post{state}" id="post-{_e(post.index)}">'
        f'<header class="post-head"><h2>게시물 {_e(post.index)}번</h2>'
        f'<span class="chip">{_e(language)}</span><span class="topic">{_e(title)}</span>'
        f'<time datetime="{_e(post.publish_at.isoformat())}">{_e(post.publish_at.isoformat(sep=" ", timespec="minutes"))}</time>'
        f"{chips}</header>"
        f"{_cites(post)}"
        f"{_findings_box(post_findings)}"
        '<div class="post-body">'
        '<figure class="image" data-col="image">'
        f'<img src="{_e(_image_src(images_dir, post.image_file))}" alt="{image_file}">'
        f"<figcaption>이미지 파일 <code>{image_file}</code></figcaption>"
        '<p class="prompt-label">이미지 프롬프트</p>'
        f'<div class="prompt" data-role="prompt">{_e(post.image_prompt)}</div>'
        "</figure>"
        '<div class="cols">'
        '<div class="col" data-col="source" lang="ko"><h3>한국어 원문</h3>'
        f"{_source_text(source_html, tail)}</div>"
        '<div class="col" data-col="back" lang="ko"><h3>되번역 한국어</h3>'
        f"{_divergence(gap, back_text)}{_back_text(back_text, back_html)}</div>"
        f'<div class="col" data-col="local" lang="{_e(post.language)}"><h3>현지어 본문 ({_e(language)})</h3>'
        f'<div class="text" data-role="text">{_e(post.body_local)}</div></div>'
        "</div></div></article>"
    )


def render(
    plan: Plan,
    findings: list[Finding],
    back: dict[int, str],
    divergences: dict[int, float],
    images_dir: Path,
    *,
    cta_ko: str,
) -> str:
    """검토 화면의 완결된 HTML 문서를 문자열로 돌려준다. 파일을 읽거나 쓰지 않는다.

    `findings`는 검증기들이 낸 목록 전부이고 이미 `findings._ordered` 순서다. `back`은 `backtranslation.load`가 읽은
    `{게시물 번호: 되번역}`, `divergences`는 `backtranslation.divergences`가 잰 `{게시물 번호: 차이값}`이다. 여기서는
    **다시 재지 않고** 받은 값을 보여 준다. 되번역이 없거나 비어 있는 게시물은 0이 아니라 "측정하지 않음"으로 보이고(그때
    값이 와 있어도 보이지 않는다 — 칸이 비어 있다고 말하는 카드에 숫자를 함께 둘 수 없다), 되번역이 보이는데 값만 없으면
    까닭을 지어내지 않고 "측정값을 받지 못했습니다"라고 적는다. **플랜에 없는 번호가 `divergences`에 있으면 `ValueError`** —
    다른 달·다른 판의 값이 섞였다는 신호이고, 조용히 버리면 그 값이 화면에 안 나오는 것을 아무도 모른다.

    `cta_ko`는 용어집의 한국어 CTA(`glossary["cta"]["ko"]`)이고 **반드시 넘겨야 한다**(키워드 전용, 기본값 없음 —
    빼먹으면 `TypeError`). 낱말 강조가 `validate_backtranslation`과 같은 원문(끝의 CTA를 뗀 것)을 되번역과 견주고 떼어 낸
    꼬리는 칠하지 않고 회색으로 보여 준다. 기본값이 없는 까닭: 있다면 빼먹은 호출이 조용히 CTA를 견주어 되번역에 없는
    CTA가 모든 게시물 끝에 칠해진다. 문자열이 아니거나 비어 있는 값(`None` 포함)은 `ValueError` — 빈 CTA는 원문 전체를
    "꼬리"로 만들어 강조를 조용히 끈다.

    게시물은 게시 시각 순으로(같으면 번호 순으로) 놓는다. `images_dir`는 `<달 폴더>/images`로, 이미지의 `src`는
    그 부모(HTML이 놓일 달 폴더) 기준 상대 경로다.
    """
    if not (isinstance(cta_ko, str) and cta_ko.strip()):
        raise ValueError(
            f"cta_ko가 비어 있거나 문자열이 아닙니다 (받은 값: {cta_ko!r}). 빈 CTA는 원문 전체를 떼어 낼 꼬리로 보아 낱말 "
            f"강조가 조용히 꺼집니다. 용어집의 cta.ko를 넘기세요."
        )
    off_plan = sorted(set(divergences) - {post.index for post in plan.posts})
    if off_plan:
        raise ValueError(
            f"divergences에 이 플랜에 없는 게시물 번호가 있습니다: {', '.join(map(str, off_plan))}. 다른 달이나 다른 판의 값이 "
            f"섞인 것은 아닌지 확인하세요. divergences는 같은 플랜으로 backtranslation.divergences가 낸 값이어야 합니다."
        )
    titles = {topic.topic_id: topic.title_ko for topic in plan.topics}
    by_post: dict[int | None, list[Finding]] = {}
    for finding in findings:
        by_post.setdefault(finding.post_index, []).append(finding)

    posts = sorted(plan.posts, key=lambda post: (post.publish_at, post.index))
    cards = "".join(
        _card(
            post,
            titles.get(post.topic_id, post.topic_id),
            by_post.get(post.index, []),
            back.get(post.index),
            divergences.get(post.index),
            images_dir,
            cta_ko,
        )
        for post in posts
    ) or '<p class="empty">플랜에 게시물이 없습니다.</p>'

    month = _e(plan.month)
    return (
        "<!doctype html>\n"
        '<html lang="ko">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        f"<title>페이스북 게시물 검토 {month}</title>\n<style>{_STYLE}</style>\n</head>\n<body>\n"
        f'<header class="page-head"><h1>페이스북 게시물 검토 <span class="month">{month}</span></h1>'
        f'<p class="meta">게시물 {len(plan.posts)}건 · 게시일 순</p></header>\n'
        f"<main>\n{_howto()}\n"
        f"{_summary(findings, {post.index for post in plan.posts})}\n"
        f'<section id="posts">\n{cards}\n</section>\n</main>\n</body>\n</html>\n'
    )
