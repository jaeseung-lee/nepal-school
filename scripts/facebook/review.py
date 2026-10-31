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
- **한국어 원문과 되번역을 서로 붙여 둔다.** 눈이 바로 견주어야 하는 것이 그 둘이다. 현지어 본문은 그 옆이다.
- **차이값은 받은 것을 그대로 보여 준다.** `render`는 글자 대조를 하지 않는다. 숫자가 `validate_backtranslation`의 경고문과
  어긋나지 않게 `backtranslation.divergences`가 한 곳에서 잰다. 값에 따라 색을 달리하지도 않는다 — 낮은 값을 초록으로
  칠하면 "읽지 않아도 된다"는 신호가 되는데, 위의 측정이 바로 그 신호가 틀렸음을 보였다.
- **되번역이 없으면 빈칸으로 두지 않고 없다고 적는다.** 차이값이 없는 것도 0이 아니라 "측정하지 않음"이다.
- 이미지 아래에 `image_prompt`를 그대로 적는다. 글자 금지·실존 인물 금지 지시가 형식만 맞고 내용이 어긋나는 것을
  사람이 보는 유일한 자리다.

`render`는 문자열만 돌려주고 파일을 읽거나 쓰지 않는다. 호출하는 쪽이 `month_dir / "review.html"`에 쓴다. 이미지는
HTML이 놓일 자리(`images_dir.parent`) 기준 상대 경로로 걸어 파일을 열면 바로 보인다.

템플릿 엔진 없이 f-string과 `html.escape`로 조립한다. **화면에 나가는 모든 문자열은 이스케이프한다** — 되번역은 사람이
채우고, 프롬프트와 finding 메시지에는 본문 조각이 들어간다. 스크립트나 외부 자원은 쓰지 않는다.
"""

from __future__ import annotations

import html
import os
from collections import Counter
from pathlib import Path
from urllib.parse import quote

from .findings import Finding
from .plan_model import Plan, Post

_LANGUAGE_NAMES = {"vi": "베트남어", "my": "미얀마어", "ne": "네팔어"}

# 시스템 글꼴만 쓴다. 미얀마 문자와 데바나가리는 한국어 글꼴에 없어서 목록에 따로 적지 않으면 네모(두부)로 깨진다.
_STYLE = """
:root {
  color-scheme: light dark;
  --bg: #f5f4ef; --panel: #ffffff; --ink: #1d1d1b; --muted: #5d5b55; --line: #d6d3c8; --accent: #1f4e79;
  --error: #a8201a; --error-bg: #fdecea; --warning: #7a4f00; --warning-bg: #fff3d1;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #151513; --panel: #201f1c; --ink: #ecebe6; --muted: #a8a59b; --line: #3b3934; --accent: #8ab4e8;
    --error: #ff9a91; --error-bg: #3b1d1a; --warning: #f3c471; --warning-bg: #3a2f12;
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

_HOWTO = """<aside class="howto">
<h2>이 화면으로 하는 일</h2>
<p>현지어 본문은 AI가 썼고 원어민 검수를 받지 않았습니다. 뜻이 한국어 원문과 같은지 확인할 수 있는 곳은 이 화면에서 <strong>한국어 원문</strong>과 <strong>되번역 한국어</strong>를 나란히 읽는 것뿐입니다. 게시물마다 두 단을 끝까지 읽고 다음을 찾으세요.</p>
<ul>
<li><strong>부정</strong>이 뒤집힌 곳 (할 수 있다와 할 수 없다, 필요와 불필요)</li>
<li><strong>금액</strong>·기간·시간·날짜·인원이 바뀐 곳</li>
<li>원문에 없는 <strong>약속</strong>·보장·조건이 덧붙은 곳, 원문에 있던 단서(‘평균’, ‘~일 수 있습니다’)가 빠진 곳</li>
</ul>
<p class="caveat">‘글자 차이’ 숫자는 두 한국어 글의 글자 유사도일 뿐 뜻을 재지 않습니다. 부정이 뒤집히거나 금액이 바뀌어도 낮게 나오고, 뜻이 같은 의역도 높게 나옵니다. 숫자가 낮다는 것은 읽지 않아도 되는 근거가 아닙니다.</p>
</aside>"""


def _e(value: object) -> str:
    return html.escape(str(value), quote=True)


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


def _divergence(value: float | None) -> str:
    if value is None:
        return '<p class="divergence" data-role="divergence">글자 차이: 측정하지 않음(되번역이 없거나 비어 있음)</p>'
    return (
        f'<p class="divergence" data-role="divergence">원문과 글자 차이 <strong>{value:.2f}</strong> '
        f"(글자 기준일 뿐 뜻의 보증이 아님)</p>"
    )


def _back_text(text: str | None) -> str:
    if text is None:
        return '<div class="text missing" data-role="text">되번역이 없습니다. 워크시트가 채워지지 않았거나 이 번호의 항목이 빠졌습니다.</div>'
    if not text.strip():
        return '<div class="text missing" data-role="text">되번역 칸이 비어 있습니다.</div>'
    # 안쪽에 공백이나 줄바꿈을 끼우지 않는다: 칸이 `pre-wrap`이라 그대로 화면에 나온다.
    return f'<div class="text" data-role="text">{_e(text)}</div>'


def _card(
    post: Post, title: str, post_findings: list[Finding], back_text: str | None, gap: float | None, images_dir: Path
) -> str:
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
        f'<div class="text" data-role="text">{_e(post.source_ko)}</div></div>'
        '<div class="col" data-col="back" lang="ko"><h3>되번역 한국어</h3>'
        f"{_divergence(gap)}{_back_text(back_text)}</div>"
        f'<div class="col" data-col="local" lang="{_e(post.language)}"><h3>현지어 본문 ({_e(language)})</h3>'
        f'<div class="text" data-role="text">{_e(post.body_local)}</div></div>'
        "</div></div></article>"
    )


def render(
    plan: Plan, findings: list[Finding], back: dict[int, str], divergences: dict[int, float], images_dir: Path
) -> str:
    """검토 화면의 완결된 HTML 문서를 문자열로 돌려준다. 파일을 읽거나 쓰지 않는다.

    `findings`는 검증기들이 낸 목록 전부이고 이미 `findings._ordered` 순서다. `back`은 `backtranslation.load`가 읽은
    `{게시물 번호: 되번역}`, `divergences`는 `backtranslation.divergences`가 잰 `{게시물 번호: 차이값}`이다. 여기서는
    **다시 재지 않고** 받은 값을 보여 준다. 되번역이 없거나 비어 있어 `divergences`에 번호가 없는 게시물은 0이 아니라
    "측정하지 않음"으로 보인다.

    게시물은 게시 시각 순으로(같으면 번호 순으로) 놓는다. `images_dir`는 `<달 폴더>/images`로, 이미지의 `src`는
    그 부모(HTML이 놓일 달 폴더) 기준 상대 경로다.
    """
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
        f"<main>\n{_HOWTO}\n"
        f"{_summary(findings, {post.index for post in plan.posts})}\n"
        f'<section id="posts">\n{cards}\n</section>\n</main>\n</body>\n</html>\n'
    )
