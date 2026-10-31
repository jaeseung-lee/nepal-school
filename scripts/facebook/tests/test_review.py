"""검토 화면(review.py의 `render`) 테스트.

이 화면은 뜻을 확인하는 유일한 지점이다. 글자 유사도로는 부정 뒤집힘·금액 변경·약속 문장 추가를 의역의 잡음과
구별하지 못하므로, 사람이 한국어 원문과 되번역을 읽어야 한다. 그래서 여기서는 "보기 좋은가"가 아니라 다음을 고정한다.

- 세 단(한국어 원문, 되번역, 현지어 본문)이 게시물마다 빠짐없이 놓이고, 두 한국어 단이 서로 붙어 있다.
- finding이 요약에만 있지 않고 그 게시물 자리에도 세 단보다 앞에 있다. 요약은 코드별로 묶여 길어지지 않는다.
- 차이값은 받은 그대로 보여 주고 `render`가 다시 계산하지 않는다. 차이값이 뜻의 보증처럼 읽히지 않는다.
- 사람이 채우는 칸과 기계가 만든 칸 모두 이스케이프된다.

출력은 문자열 비교가 아니라 `HTMLParser`로 만든 작은 트리로 읽는다. 닫는 태그가 맞지 않으면 파싱이 실패하므로
문서가 완결된 HTML인지도 함께 본다.
"""

from __future__ import annotations

import dataclasses
import html
import inspect
import re
import unicodedata
from datetime import datetime, timedelta
from html.parser import HTMLParser
from pathlib import Path

import pytest

from facebook import backtranslation, config, review
from facebook.findings import Finding
from facebook.plan_model import Plan, load_plan
from facebook.review import render

FIXTURE = Path(__file__).parent / "fixtures" / "plan-valid.json"
IMAGES_DIR = Path("output/facebook/2026-11/images")  # 이미지가 실제로 있을 필요는 없다. render는 파일을 열지 않는다.

# 용어집의 한국어 CTA(`cta.ko`)와 같은 문구. 픽스처의 원문이 이것으로 끝난다.
CTA = "상담은 무료입니다. 궁금한 점이 있으면 이 페이지로 메시지를 보내 주세요."

# 6개 게시물에 서로 다른, 글자에서 나올 수 없는 차이값(되번역이 원문과 똑같아도 이 값이 나와야 한다).
GAPS = {0: 0.07, 1: 0.20, 2: 0.33, 3: 0.46, 4: 0.59, 5: 0.72}

# 이스케이프하지 않으면 태그와 속성이 하나씩 생기는 문자열. 따옴표는 속성 값 안에서 속성을 끊는 용도다.
PROBE = '"><zzprobe zzattr="1">\'&amp;'


# --- 출력을 읽는 도우미 -----------------------------------------------------------


class _Node:
    def __init__(self, tag: str, attrs: list[tuple[str, str | None]], parent: "_Node | None"):
        self.tag = tag
        self.attrs = {name: (value or "") for name, value in attrs}
        self.parent = parent
        self.children: list[_Node | str] = []

    def walk(self):
        yield self
        for child in self.children:
            if isinstance(child, _Node):
                yield from child.walk()

    def text(self) -> str:
        return "".join(child if isinstance(child, str) else child.text() for child in self.children)

    def find_all(self, tag: str | None = None, **attrs: str) -> list["_Node"]:
        """`tag`와 속성이 모두 맞는 자손. 속성 이름의 `_`는 `-`로 읽고(`data_col` -> `data-col`), `class_`는
        클래스 낱말 하나를 찾는다."""
        found = []
        for node in self.walk():
            if node is self or (tag is not None and node.tag != tag):
                continue
            ok = True
            for name, value in attrs.items():
                if name == "class_":
                    ok = value in node.attrs.get("class", "").split()
                else:
                    ok = node.attrs.get(name.replace("_", "-")) == value
                if not ok:
                    break
            if ok:
                found.append(node)
        return found

    def find(self, tag: str | None = None, **attrs: str) -> "_Node":
        found = self.find_all(tag, **attrs)
        assert len(found) == 1, f"{tag} {attrs}가 {len(found)}개 있다(하나여야 한다)"
        return found[0]

    def raw_order(self, nodes: list["_Node"]) -> list[int]:
        """`nodes`가 문서 순서에서 몇 번째인지."""
        order = {id(node): position for position, node in enumerate(self.walk())}
        return [order[id(node)] for node in nodes]


class _TreeBuilder(HTMLParser):
    _VOID = {"meta", "img", "br", "hr", "link", "input"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = _Node("#root", [], None)
        self.current = self.root

    def handle_starttag(self, tag, attrs):
        node = _Node(tag, attrs, self.current)
        self.current.children.append(node)
        if tag not in self._VOID:
            self.current = node

    def handle_startendtag(self, tag, attrs):
        self.current.children.append(_Node(tag, attrs, self.current))

    def handle_endtag(self, tag):
        if tag in self._VOID:
            return
        assert self.current.tag == tag, f"닫는 태그 </{tag}>가 열려 있는 <{self.current.tag}>와 맞지 않는다"
        self.current = self.current.parent

    def handle_data(self, data):
        self.current.children.append(data)


def _parse(output: str) -> _Node:
    builder = _TreeBuilder()
    builder.feed(output)
    builder.close()
    assert builder.current is builder.root, f"닫히지 않은 태그가 있다: <{builder.current.tag}>"
    return builder.root


# --- 입력을 만드는 도우미 ---------------------------------------------------------


def _plan() -> Plan:
    return load_plan(FIXTURE)


def _back(plan: Plan) -> dict[int, str]:
    return {post.index: f"{post.index}번 게시물의 되번역 고유 문장입니다." for post in plan.posts}


def _output(plan=None, findings=(), back=None, gaps=None, images_dir=IMAGES_DIR, **render_kwargs) -> str:
    plan = _plan() if plan is None else plan
    render_kwargs.setdefault("cta_ko", CTA)  # `render`는 `cta_ko`를 반드시 받는다. 시험 입력은 보통의 CTA를 넘긴다.
    return render(
        plan, list(findings), _back(plan) if back is None else back, dict(GAPS) if gaps is None else gaps, images_dir,
        **render_kwargs,
    )


def _doc(*args, **kwargs) -> _Node:
    return _parse(_output(*args, **kwargs))


def _summary(doc: _Node) -> _Node:
    return doc.find(id="summary")


def _cards(doc: _Node) -> list[_Node]:
    return doc.find_all("article", class_="post")


def _card(doc: _Node, index: int) -> _Node:
    return doc.find("article", id=f"post-{index}")


def _col(card: _Node, name: str) -> _Node:
    return card.find(data_col=name)


def _text_of(card: _Node, name: str) -> str:
    return _col(card, name).find(data_role="text").text()


def _finding(severity: str, code: str, post_index: int | None, message: str | None = None) -> Finding:
    return Finding(severity, code, post_index, message or f"{code} 메시지 (게시물 {post_index})")


def _error(code: str, post_index: int | None, message: str | None = None) -> Finding:
    return _finding("error", code, post_index, message)


def _warning(code: str, post_index: int | None, message: str | None = None) -> Finding:
    return _finding("warning", code, post_index, message)


def _plan_of(count: int) -> Plan:
    """픽스처 게시물을 돌려 써서 `count`개로 늘린 플랜. 게시일은 하루씩 늘어난다."""
    base = _plan()
    posts = tuple(
        dataclasses.replace(
            base.posts[i % 6], index=i, publish_at=base.posts[0].publish_at + timedelta(days=i), image_file=f"{i:02d}.png"
        )
        for i in range(count)
    )
    return dataclasses.replace(base, posts=posts)


def _edit(plan: Plan, index: int, **changes) -> Plan:
    posts = tuple(dataclasses.replace(p, **changes) if p.index == index else p for p in plan.posts)
    return dataclasses.replace(plan, posts=posts)


# --- 게시물과 세 단 -------------------------------------------------------------


def test_모든_게시물이_렌더된다():
    plan = _plan()

    doc = _doc(plan)

    assert [card.attrs["id"] for card in _cards(doc)] == [f"post-{i}" for i in range(6)]
    for post in plan.posts:
        assert _text_of(_card(doc, post.index), "local") == post.body_local


def test_한국어_원문과_되번역이_모두_들어간다():
    plan = _plan()
    back = _back(plan)

    doc = _doc(plan, back=back)

    for post in plan.posts:
        card = _card(doc, post.index)
        # 줄바꿈과 들여쓰기는 그대로여야 한다(칸이 `pre-wrap`이라 앞뒤에 낀 공백이 화면에 그대로 나온다).
        assert _text_of(card, "source") == post.source_ko
        assert _text_of(card, "back") == back[post.index]


def test_한국어_원문과_되번역은_서로_붙어_있고_현지어_본문은_그_옆이다():
    # 두 한국어 단을 눈이 바로 견주도록 사이에 다른 단을 끼우지 않는다.
    doc = _doc()

    for card in _cards(doc):
        order = [col.attrs["data-col"] for col in card.find_all(class_="col")]
        assert sorted(order) == ["back", "local", "source"]
        assert abs(order.index("source") - order.index("back")) == 1


def test_세_단은_같은_너비다():
    output = _output()
    doc = _parse(output)

    assert "grid-template-columns: repeat(3, minmax(0, 1fr))" in doc.find("style").text()
    for card in _cards(doc):
        assert len(card.find_all(class_="col")) == 3


def test_단마다_제목과_언어_표지가_있다():
    doc = _doc()

    card = _card(doc, 1)  # 미얀마어

    assert _col(card, "source").find("h3").text() == "한국어 원문"
    assert _col(card, "back").find("h3").text() == "되번역 한국어"
    assert "미얀마어" in _col(card, "local").find("h3").text()
    assert _col(card, "source").attrs["lang"] == "ko" and _col(card, "back").attrs["lang"] == "ko"
    assert _col(card, "local").attrs["lang"] == "my"  # 글리프를 고르는 데 쓰인다


def test_카드_머리에_번호_언어_소재_게시시각이_있다():
    head = _card(_doc(), 3).find("header").text()

    assert "게시물 3번" in head
    assert "베트남어" in head
    assert "전주기전대학 연간 평균등록금" in head
    assert "2026-11-04 19:00+09:00" in head


def test_게시물은_게시일_순으로_놓인다_플랜_순서가_아니라():
    base = _plan()
    first = base.posts[0].publish_at
    posts = tuple(dataclasses.replace(p, publish_at=first + timedelta(days=5 - p.index)) for p in base.posts)

    doc = _doc(dataclasses.replace(base, posts=posts))

    assert [card.attrs["id"] for card in _cards(doc)] == [f"post-{i}" for i in (5, 4, 3, 2, 1, 0)]


def test_게시일_순서는_글자가_아니라_시각으로_정한다():
    # 글자로 견주면 1번(2026-11-01T20:00+00:00)이 0번(2026-11-02T01:00+09:00)보다 앞이지만, 시각은 0번이 4시간 이르다.
    base = _plan()
    zero = dataclasses.replace(base.posts[0], publish_at=datetime.fromisoformat("2026-11-02T01:00:00+09:00"))
    one = dataclasses.replace(base.posts[1], publish_at=datetime.fromisoformat("2026-11-01T20:00:00+00:00"))
    assert zero.publish_at < one.publish_at
    assert zero.publish_at.isoformat() > one.publish_at.isoformat()  # 이 전제가 이 테스트의 뜻이다
    plan = dataclasses.replace(base, posts=(one, zero))

    doc = _doc(plan, back=_back(plan))

    assert [card.attrs["id"] for card in _cards(doc)] == ["post-0", "post-1"]


def test_게시시각이_같으면_번호_순이다():
    base = _plan()
    same = base.posts[0].publish_at
    posts = tuple(dataclasses.replace(p, publish_at=same) for p in reversed(base.posts))

    doc = _doc(dataclasses.replace(base, posts=posts))

    assert [card.attrs["id"] for card in _cards(doc)] == [f"post-{i}" for i in range(6)]


def test_게시물이_없는_플랜은_없다고_말한다():
    plan = dataclasses.replace(_plan(), posts=())

    doc = _doc(plan, back={}, gaps={})

    assert _cards(doc) == []
    assert "게시물이 없습니다" in doc.find(id="posts").text()


# --- 요약 ---------------------------------------------------------------------


def test_오류가_있으면_상단_요약에_표시된다():
    doc = _doc(findings=[_error("역번역수치", 2, "숫자가 다릅니다")])

    summary = _summary(doc)

    assert "오류 1건" in summary.text() and "경고 0건" in summary.text()
    line = summary.find("li", class_="sum-line")
    assert "오류" in line.text() and "역번역수치" in line.text()
    assert "error" in line.attrs["class"].split()
    summary_position, card_position = doc.raw_order([summary, _card(doc, 0)])
    assert summary_position < card_position  # 요약은 카드보다 앞이다


def test_상단_요약이_경고도_빠짐없이_싣는다():
    # 역번역중복은 뒤쪽 게시물에만 붙는다. 가장 앞선 게시물의 카드만 보는 사람은 자기 되번역이 다른 게시물과
    # 똑같다는 사실을 요약에서만 알 수 있다.
    findings = [
        _warning("역번역중복", 1),
        _warning("역번역중복", 2),
        _error("역번역수치", 4),
        _warning("출처없는수치", 3),
    ]

    summary = _summary(_doc(findings=findings))

    assert "오류 1건" in summary.text() and "경고 3건" in summary.text()
    codes = {line.find("code").text() for line in summary.find_all("li", class_="sum-line")}
    assert codes == {"역번역중복", "역번역수치", "출처없는수치"}
    duplicate = next(l for l in summary.find_all("li", class_="sum-line") if l.find("code").text() == "역번역중복")
    assert [a.text() for a in duplicate.find_all("a")] == ["1번", "2번"]


def test_상단_요약은_오류를_경고보다_앞에_싣는다():
    findings = [_warning("역번역중복", 1), _error("역번역수치", 4), _warning("출처없는수치", 0), _error("금지표현", 2)]

    lines = _summary(_doc(findings=findings)).find_all("li", class_="sum-line")

    assert [(l.find("code").text(), l.find(class_="badge").text()) for l in lines] == [
        ("역번역수치", "오류"),
        ("금지표현", "오류"),
        ("역번역중복", "경고"),
        ("출처없는수치", "경고"),
    ]


def test_상단_요약은_코드별로_묶고_건수와_게시물_번호를_싣는다():
    # 역번역중복은 흠 없는 한 달에도 20건쯤 난다(소재마다 2건). 같은 코드 20줄이 요약을 채우면 다른 finding이
    # 묻히므로, 코드마다 한 줄로 건수와 번호를 싣는다.
    plan = _plan_of(21)
    findings = [_warning("역번역중복", i) for i in range(1, 21)] + [_error("이미지없음", 7)]

    summary = _summary(_doc(plan, findings=findings, back=_back(plan), gaps={}))

    lines = summary.find_all("li", class_="sum-line")
    assert len(lines) == 2
    duplicate = next(l for l in lines if l.find("code").text() == "역번역중복")
    assert "20건" in duplicate.find(class_="count").text()
    assert [a.text() for a in duplicate.find_all("a")] == [f"{i}번" for i in range(1, 21)]
    assert summary.text().count("역번역중복") == 1  # 20번 되풀이되지 않는다


def test_같은_게시물에_같은_코드가_여럿이면_번호는_한_번_적고_건수를_덧붙인다():
    findings = [_error("금지표현", 2), _error("금지표현", 2), _error("금지표현", 4)]

    line = _summary(_doc(findings=findings)).find("li", class_="sum-line")

    assert "3건" in line.find(class_="count").text()
    assert [a.text() for a in line.find_all("a")] == ["2번", "4번"]
    assert "(2건)" in line.find(class_="where").text()


def test_요약의_게시물_번호는_그_게시물_카드로_이어진다():
    doc = _doc(findings=[_error("역번역수치", 2), _warning("역번역중복", 4)])

    links = _summary(doc).find_all("a")

    assert [a.attrs["href"] for a in links] == ["#post-2", "#post-4"]
    for link in links:
        assert doc.find_all("article", id=link.attrs["href"].removeprefix("#"))  # 이어질 카드가 실제로 있다


def test_오류가_없으면_없다고_명시한다():
    # 빈 요약은 "검사해서 괜찮다"로도 "아무것도 안 돌았다"로도 읽힌다.
    summary = _summary(_doc(findings=[]))

    assert "오류 0건" in summary.text() and "경고 0건" in summary.text()
    assert "하나도 내지 않았습니다" in summary.find(class_="all-clear").text()
    assert summary.find_all("li", class_="sum-line") == []


def test_finding이_있으면_없다는_문구를_내지_않는다():
    summary = _summary(_doc(findings=[_warning("역번역중복", 1)]))

    assert summary.find_all(class_="all-clear") == []
    assert "경고 1건" in summary.text() and "오류 0건" in summary.text()


def test_게시물에_매이지_않은_finding은_요약에만_있고_카드를_만들지_않는다():
    message = "게시물 수가 3의 배수가 아닙니다 (플랜 전체)"
    findings = [_error("게시물수", None, message)]

    doc = _doc(findings=findings)

    summary = _summary(doc)
    line = summary.find("li", class_="sum-line")
    assert line.find("code").text() == "게시물수"
    assert "플랜 전체" in line.find(class_="where").text()
    assert message in line.text()  # 카드가 없으니 메시지가 여기에 있어야 읽을 수 있다
    assert line.find_all("a") == []
    assert len(_cards(doc)) == 6
    assert all(message not in card.text() for card in _cards(doc))
    assert "오류 1건" in summary.text()


def test_플랜에_없는_게시물_번호의_finding도_요약에_메시지와_함께_남는다():
    message = "99번 게시물에 관한 말"

    doc = _doc(findings=[_warning("엉뚱한번호", 99, message)])

    line = _summary(doc).find("li", class_="sum-line")
    assert message in line.text() and "99번" in line.find(class_="where").text()
    assert line.find_all("a") == []  # 이어질 카드가 없다
    assert all(message not in card.text() for card in _cards(doc))


def test_묶음에_카드가_있는_번호와_없는_번호가_함께_있어도_둘_다_보인다():
    findings = [_warning("역번역플랜밖", None, "플랜에 없는 7"), _warning("역번역플랜밖", 3)]

    line = _summary(_doc(findings=findings)).find("li", class_="sum-line")

    assert "2건" in line.find(class_="count").text()
    assert [a.text() for a in line.find_all("a")] == ["3번"]
    assert "플랜 전체" in line.find(class_="where").text() and "플랜에 없는 7" in line.text()


# --- 게시물 카드 안의 finding --------------------------------------------------


def test_게시물에_달린_finding이_그_게시물_자리에도_표시된다():
    # post_index=2의 error가 2번 게시물 블록 안에 코드와 메시지로 나타난다(요약에만 있으면 긴 목록에서 지나친다).
    findings = [_error("역번역수치", 2, "원문에만 있는 숫자: 20"), _warning("역번역중복", 4, "4번은 3번과 같다")]

    doc = _doc(findings=findings)

    box = _card(doc, 2).find(data_role="findings")
    assert "역번역수치" in box.text() and "원문에만 있는 숫자: 20" in box.text()
    assert "오류" in box.find("li").find(class_="badge").text()
    assert "4번은 3번과 같다" in _card(doc, 4).find(data_role="findings").text()
    # 다른 게시물 카드에는 나오지 않는다.
    for index in (0, 1, 3, 5):
        assert _card(doc, index).find_all(data_role="findings") == []
    assert "원문에만 있는 숫자: 20" not in _card(doc, 4).text()


def test_카드의_finding은_세_단과_이미지보다_앞에_놓인다():
    # 아래의 글을 읽기 전에 무엇을 의심해야 하는지 먼저 보게 한다.
    doc = _doc(findings=[_warning("역번역차이", 3)])
    card = _card(doc, 3)

    findings_box = card.find(data_role="findings")
    positions = card.raw_order([findings_box, _col(card, "image"), _col(card, "source"), _col(card, "back"), _col(card, "local")])

    assert positions[0] < min(positions[1:])


def test_카드의_finding은_오류가_경고보다_앞이고_같은_심각도_안에서는_받은_순서다():
    findings = [_warning("가경고", 2), _error("나오류", 2), _warning("다경고", 2), _error("라오류", 2)]

    items = _card(_doc(findings=findings), 2).find(data_role="findings").find_all("li")

    assert [item.find("code").text() for item in items] == ["나오류", "라오류", "가경고", "다경고"]


def test_오류가_있는_카드는_눈에_띄게_표시된다():
    findings = [_error("역번역수치", 1), _warning("역번역중복", 2), _warning("역번역차이", 3), _error("금지표현", 3)]

    doc = _doc(findings=findings)

    def classes(index: int) -> set[str]:
        return set(_card(doc, index).attrs["class"].split())

    assert "has-error" in classes(1) and "has-warning" not in classes(1)
    assert "has-warning" in classes(2) and "has-error" not in classes(2)
    assert {"has-error"} <= classes(3)  # 오류가 경고를 이긴다
    assert not ({"has-error", "has-warning"} & classes(0))
    # 머리에도 건수가 있다
    assert "오류 1" in _card(doc, 1).find("header").text()
    assert "경고 1" in _card(doc, 2).find("header").text()


# --- 차이값 -------------------------------------------------------------------


def test_차이값이_게시물마다_표시된다():
    doc = _doc()

    for index, value in GAPS.items():
        assert f"{value:.2f}" in _card(doc, index).find(data_role="divergence").text()


def test_차이값은_backtranslation의_측정을_그대로_쓴다(monkeypatch):
    # render가 받은 divergences의 값이 출력에 그대로 들어간다(재계산하지 않는다). 되번역이 원문과 같아도
    # 받은 값이 나와야 하고, `divergence`를 부르는 순간 터지게 해 둔다. (낱말 강조가 `SequenceMatcher`를 쓰므로
    # difflib을 막을 수는 없다. 값이 직접 잰 0.00이 아니라 받은 0.91이라는 것이 재계산하지 않았다는 증거다.)
    def boom(*args, **kwargs):
        raise AssertionError("render가 divergence를 불렀다")

    monkeypatch.setattr(backtranslation, "divergence", boom)
    if hasattr(review, "divergence"):
        monkeypatch.setattr(review, "divergence", boom)
    plan = _plan()
    identical = {post.index: post.source_ko for post in plan.posts}  # 직접 재면 0.00이다
    gaps = {post.index: 0.91 for post in plan.posts}

    doc = _doc(plan, back=identical, gaps=gaps)

    for post in plan.posts:
        shown = _card(doc, post.index).find(data_role="divergence").text()
        assert "0.91" in shown and "0.00" not in shown


def test_차이값은_소수_둘째_자리까지_적는다():
    gaps = {**GAPS, 0: 0.5, 1: 0.123456, 2: 0.0, 3: 1.0}

    doc = _doc(gaps=gaps)

    shown = {i: _card(doc, i).find(data_role="divergence").text() for i in range(4)}
    assert "0.50" in shown[0] and "0.12" in shown[1] and "0.00" in shown[2] and "1.00" in shown[3]


def test_차이값이_없는_게시물은_측정하지_않았다고_적고_숫자를_내지_않는다():
    # 되번역이 없거나 비어 있으면 `divergences`가 키를 넣지 않는다. 0.00(같음)이나 1.00(최악)으로 읽히면 안 된다.
    gaps = {i: v for i, v in GAPS.items() if i != 2}

    doc = _doc(gaps=gaps)

    shown = _card(doc, 2).find(data_role="divergence").text()
    assert "측정하지 않음" in shown
    assert not any(ch.isdigit() for ch in shown)


def test_차이값은_값과_상관없이_같은_모양으로_보여_준다():
    # 낮은 값을 초록으로, 높은 값을 빨강으로 칠하면 "낮으니 읽지 않아도 된다"는 신호가 된다. 글자 유사도로는
    # 부정 뒤집힘(0.05)·금액 변경(0.01)이 의역(0.08~0.12)과 구별되지 않으므로 값으로 꾸미지 않는다.
    low = _card(_doc(gaps={**GAPS, 0: 0.01}), 0).find(data_role="divergence")
    high = _card(_doc(gaps={**GAPS, 0: 0.99}), 0).find(data_role="divergence")

    assert low.attrs == high.attrs
    assert [(n.tag, n.attrs) for n in low.walk()] == [(n.tag, n.attrs) for n in high.walk()]


def test_차이값이_뜻의_보증이_아니라는_안내가_있다():
    doc = _doc()

    howto = doc.find(class_="howto").text()

    assert "뜻을 재지 않습니다" in howto
    assert "읽지 않아도 되는 근거가 아닙니다" in howto
    assert "원어민 검수를 받지 않았습니다" in howto


def test_안내가_사람이_찾아야_할_세_가지를_하나씩_적는다():
    # Task 6이 글자 유사도로 못 잡는다고 잰 것들이다. 캐비엇 문단에도 같은 낱말이 나오므로 목록 항목을 따로 본다.
    items = [item.text() for item in _doc().find(class_="howto").find_all("li")]

    assert len(items) == 3
    for item, keyword in zip(items, ("부정", "금액", "약속")):
        assert keyword in item


# --- 이미지 -------------------------------------------------------------------


def test_이미지_경로가_HTML_위치_기준_상대경로다(tmp_path):
    # src == "images/<image_file>"  (images_dir=<month>/images, HTML=<month>/review.html)
    month = tmp_path / "2026-11"
    plan = _plan()

    doc = _doc(plan, images_dir=month / "images")

    for post in plan.posts:
        image = _col(_card(doc, post.index), "image").find("img")
        assert image.attrs["src"] == f"images/{post.image_file}"
    assert str(tmp_path) not in _output(plan, images_dir=month / "images")  # 이 컴퓨터의 절대 경로가 새지 않는다


def test_이미지_경로는_상대_경로로_받은_images_dir에서도_같다():
    doc = _doc(images_dir=Path("output/facebook/2026-11/images"))

    assert _col(_card(doc, 0), "image").find("img").attrs["src"] == "images/00-visa-d2-vi.png"


def test_이미지_경로는_images_dir의_이름을_따른다():
    # 이름이 images가 아니어도 HTML이 놓이는 자리(`images_dir.parent`) 기준이다.
    doc = _doc(images_dir=Path("output/facebook/2026-11/그림"))

    assert _col(_card(doc, 0), "image").find("img").attrs["src"] == "%EA%B7%B8%EB%A6%BC/00-visa-d2-vi.png"


@pytest.mark.parametrize(
    "image_file, expected",
    [
        ("a b.png", "images/a%20b.png"),
        ("a#b.png", "images/a%23b.png"),
        ("a?b.png", "images/a%3Fb.png"),
        ("한글.png", "images/%ED%95%9C%EA%B8%80.png"),
        ("sub/x.png", "images/sub/x.png"),
    ],
    ids=["공백", "해시", "물음표", "한글", "하위폴더"],
)
def test_이미지_파일_이름의_URL에서_뜻이_있는_글자는_인코딩한다(image_file, expected):
    # `#`·`?`가 그대로 있으면 파일을 열었을 때 그림이 조용히 안 뜬다.
    plan = _edit(_plan(), 0, image_file=image_file)

    doc = _doc(plan)

    assert _col(_card(doc, 0), "image").find("img").attrs["src"] == expected


def test_이미지_파일_이름이_캡션과_대체_텍스트로_보인다():
    # 그림이 안 뜨면 어느 파일이 빠졌는지 알아야 한다.
    image = _col(_card(_doc(), 0), "image")

    assert image.find("img").attrs["alt"] == "00-visa-d2-vi.png"
    assert "00-visa-d2-vi.png" in image.find("figcaption").text()


def test_이미지_프롬프트가_들어간다():
    # 글자 금지·실존 인물 금지 지시가 형식만 맞고 내용이 어긋나는 경우를 사람이 보는 유일한 자리다.
    plan = _plan()

    doc = _doc(plan)

    for post in plan.posts:
        image = _col(_card(doc, post.index), "image")
        assert image.find(data_role="prompt").text() == post.image_prompt
        # 이미지 아래다.
        picture_position, prompt_position = image.raw_order([image.find("img"), image.find(data_role="prompt")])
        assert picture_position < prompt_position


def test_이미지는_세_단의_왼쪽이다():
    card = _card(_doc(), 0)

    body = card.find(class_="post-body")

    parts = [child for child in body.children if isinstance(child, _Node)]
    assert [part.attrs.get("data-col") or part.attrs["class"] for part in parts] == ["image", "cols"]


# --- 이스케이프 -----------------------------------------------------------------


def test_본문이_HTML_이스케이프된다():
    # body_local에 "<script>" -> 출력에 "&lt;script&gt;"
    plan = _edit(_plan(), 0, body_local="<script>alert(1)</script>")

    output = _output(plan)

    assert "&lt;script&gt;alert(1)&lt;/script&gt;" in output
    assert "<script" not in output
    assert not any(node.tag == "script" for node in _parse(output).walk())


def test_되번역과_프롬프트와_finding_메시지도_이스케이프된다():
    # 사람이 채우는 칸과 기계가 만든 메시지 모두 이스케이프된다.
    plan = _edit(_plan(), 0, image_prompt="<b>prompt</b>")
    back = {**_back(plan), 0: "<img src=x onerror=alert(1)>"}
    findings = [_error("역번역수치", 0, "<i>숫자</i>가 다릅니다")]

    output = _output(plan, findings, back)

    for raw in ("<b>prompt</b>", "<img src=x onerror=alert(1)>", "<i>숫자</i>"):
        assert raw not in output
        assert html.escape(raw) in output
    assert not any(node.tag in {"i", "b"} for node in _parse(output).walk())
    assert not any("onerror" in node.attrs for node in _parse(output).walk())


def _inject(field: str) -> tuple[Plan, list[Finding], dict[int, str]]:
    plan, findings, back = _plan(), [_error("역번역수치", 0, "메시지")], _back(_plan())
    if field in {"source_ko", "body_local", "image_prompt", "image_file", "language"}:
        plan = _edit(plan, 0, **{field: PROBE})
    elif field in {"fact_keys", "university_names"}:
        plan = _edit(plan, 0, **{field: (PROBE,)})
    elif field == "title_ko":
        plan = dataclasses.replace(plan, topics=tuple(dataclasses.replace(t, title_ko=PROBE) for t in plan.topics))
    elif field == "month":
        plan = dataclasses.replace(plan, month=PROBE)
    elif field == "back_ko":
        back[0] = PROBE
    elif field == "message":
        findings = [_error("역번역수치", 0, PROBE)]
    elif field == "code":
        findings = [_error(PROBE, 0, "메시지")]
    elif field == "orphan_message":
        findings = [_error("게시물수", None, PROBE)]
    elif field == "orphan_code":
        findings = [_error(PROBE, None, "메시지")]
    else:
        raise AssertionError(field)
    return plan, findings, back


@pytest.mark.parametrize(
    "field",
    [
        "source_ko", "body_local", "back_ko", "image_prompt", "image_file", "language", "title_ko", "month",
        "message", "code", "orphan_message", "orphan_code", "fact_keys", "university_names",
    ],
)
def test_화면에_나오는_모든_문자열이_이스케이프된다(field):
    plan, findings, back = _inject(field)

    output = _output(plan, findings, back)

    assert PROBE not in output
    assert html.escape(PROBE) in output  # 사라진 것이 아니라 글자로 보인다
    nodes = list(_parse(output).walk())
    assert not any(node.tag == "zzprobe" for node in nodes)
    assert not any("zzattr" in node.attrs for node in nodes)


def test_인코딩된_이미지_경로_속성도_따옴표로_끊을_수_없다():
    plan = _edit(_plan(), 0, image_file='x.png" onerror="alert(1)')

    nodes = list(_parse(_output(plan)).walk())

    assert not any("onerror" in node.attrs for node in nodes)


# --- 되번역이 없는 경우 -----------------------------------------------------------


def test_되번역이_없으면_빈칸이_아니라_없다고_눈에_띄게_적는다():
    back = {i: t for i, t in _back(_plan()).items() if i != 3}

    doc = _doc(back=back)

    column = _col(_card(doc, 3), "back")
    assert "되번역이 없습니다" in column.find(data_role="text").text()
    assert "missing" in column.find(data_role="text").attrs["class"].split()


@pytest.mark.parametrize("blank", ["", "  \n "], ids=["빈문자열", "공백"])
def test_되번역이_비어_있으면_비어_있다고_적는다(blank):
    doc = _doc(back={**_back(_plan()), 3: blank})

    column = _col(_card(doc, 3), "back")
    assert "비어 있습니다" in column.find(data_role="text").text()
    assert "missing" in column.find(data_role="text").attrs["class"].split()


def test_되번역이_있는_칸은_빈칸_표시가_없다():
    doc = _doc()

    for card in _cards(doc):
        assert "missing" not in _col(card, "back").find(data_role="text").attrs["class"].split()


# --- 문서 ---------------------------------------------------------------------


def test_완결된_HTML_문서다():
    output = _output()
    doc = _parse(output)

    assert output.lstrip().lower().startswith("<!doctype html>")
    assert doc.find("html").attrs["lang"] == "ko"
    assert doc.find("meta", charset="utf-8")  # 미얀마 문자와 데바나가리가 깨지지 않게
    assert doc.find("meta", name="viewport")
    assert doc.find("title").text() == "페이스북 게시물 검토 2026-11"
    assert doc.find("h1") and "2026-11" in doc.find("h1").text()
    assert not doc.find_all("script")  # 스크립트 없이 파일을 열기만 하면 된다
    assert not any("http://" in v or "https://" in v for n in doc.walk() for v in n.attrs.values())  # 외부 자원 없음


def test_글꼴_목록에_미얀마_문자와_데바나가리_글꼴이_들어간다():
    style = _doc().find("style").text()

    assert "Myanmar" in style and "Devanagari" in style and "Apple SD Gothic Neo" in style


def test_좁은_화면에서는_단이_세로로_쌓인다():
    style = _doc().find("style").text()

    # 좁은 화면용 규칙 안에서 세 단이 한 열이 된다(다른 @media 규칙이 있어도 이 규칙을 대신하지 못한다).
    assert re.search(r"@media \(max-width: \d+px\)\s*\{[^@]*?\.cols\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\)\s*;", style)


def test_소재가_목록에_없는_게시물도_렌더되고_소재_ID를_보여_준다():
    plan = _edit(_plan(), 0, topic_id="목록에-없는-소재")

    doc = _doc(plan)

    assert "목록에-없는-소재" in _card(doc, 0).find("header").text()
    assert len(_cards(doc)) == 6


def test_게시물_수가_머리에_적힌다():
    assert "게시물 6건" in _doc().find("header", class_="page-head").text()


def test_render는_파일을_읽거나_쓰지_않는다(tmp_path):
    # 이미지가 없어도, 폴더가 없어도 문자열을 돌려준다. 쓰는 일은 호출하는 쪽의 몫이다.
    missing = tmp_path / "없는달" / "images"

    output = _output(images_dir=missing)

    assert isinstance(output, str) and not (tmp_path / "없는달").exists()


def test_입력을_바꾸지_않는다():
    plan = _plan()
    findings = [_error("역번역수치", 2), _warning("역번역중복", 1)]
    back, gaps = _back(plan), dict(GAPS)
    before = (list(findings), dict(back), dict(gaps))

    render(plan, findings, back, gaps, IMAGES_DIR, cta_ko=CTA)

    assert (findings, back, gaps) == before


def test_시그니처가_계약과_같다():
    parameters = inspect.signature(render).parameters
    assert list(parameters) == ["plan", "findings", "back", "divergences", "images_dir", "cta_ko"]
    assert parameters["cta_ko"].kind is inspect.Parameter.KEYWORD_ONLY and parameters["cta_ko"].default is inspect.Parameter.empty
    assert config.LANGUAGES == ("vi", "my", "ne")  # 언어 이름 표가 이 세 언어를 모두 덮는지 아래에서 본다
    assert set(review._LANGUAGE_NAMES) >= set(config.LANGUAGES)


# --- 다른 낱말 강조 ---------------------------------------------------------------
# 글자 유사도는 부정 뒤집힘(0.03~0.05)을 의역의 잡음(0.08~0.12)과 구별하지 못하고, 다섯 문장짜리 두 단락을 맞대어
# 읽으며 `입니다` -> `이 아닙니다`를 잡는 일은 사람이 가장 못하는 일이다. 그래서 두 한국어 단에서 서로 다른 낱말을
# 칠한다. 임계값으로 걸러 내거나 잡음이라고 숨기지 않는다 — 숨기면 뒤집힌 부정이 그 안에 들어간다.


def _marks(col: _Node) -> list[tuple[str, str]]:
    """칸 안의 강조 표시를 (글, 종류)로. 종류는 replace / delete / insert."""
    return [(mark.text(), mark.attrs["data-diff"]) for mark in col.find_all("mark")]


def _diff_card(source: str, back: str, **kwargs) -> _Node:
    """0번 게시물의 원문과 되번역만 바꿔 렌더한 카드."""
    plan = _edit(_plan(), 0, source_ko=source)
    return _card(_doc(plan, back={**_back(plan), 0: back}, **kwargs), 0)


def test_원문과_되번역의_다른_낱말이_강조된다():
    # "…입니다" -> "…이 아닙니다": 바뀐 낱말이 양쪽 단의 강조 표시 안에 들어간다.
    card = _diff_card("이 비자는 유학생을 위한 체류자격입니다.", "이 비자는 유학생을 위한 체류자격이 아닙니다.")

    assert _marks(_col(card, "source")) == [("체류자격입니다.", "replace")]
    assert _marks(_col(card, "back")) == [("체류자격이 아닙니다.", "replace")]


def test_같은_글이면_강조가_하나도_없다():
    source = "비자는 신청 후 심사를 거칩니다. 심사 결과는 이메일로 알려 드립니다."

    card = _diff_card(source, source)

    assert _marks(_col(card, "source")) == [] and _marks(_col(card, "back")) == []


def test_공백과_줄바꿈만_다른_글은_강조하지_않는다():
    # 낱말 목록으로 견주므로 띄어 쓴 칸 수나 줄바꿈은 차이가 아니다(글자로 견주던 `divergence`도 공백을 접는다).
    card = _diff_card("비자는 신청 후\n\n심사를 거칩니다.", "비자는   신청 후 심사를\n거칩니다.")

    assert _marks(_col(card, "source")) == [] and _marks(_col(card, "back")) == []


def test_같은_낱말의_NFC와_NFD_표기는_강조하지_않는다():
    # 눈으로 구별되지 않는 차이를 칠하면 사람이 칠해진 곳에서 아무 차이도 못 찾는다.
    source = "체류자격입니다."

    card = _diff_card(source, unicodedata.normalize("NFD", source))

    assert _marks(_col(card, "source")) == [] and _marks(_col(card, "back")) == []


def test_빠진_문장은_원문_쪽에만_강조된다():
    card = _diff_card(
        "비자는 신청 후 심사를 거칩니다. 심사 결과는 이메일로 알려 드립니다.",
        "비자는 신청 후 심사를 거칩니다.",
    )

    assert _marks(_col(card, "source")) == [("심사 결과는 이메일로 알려 드립니다.", "delete")]
    assert _marks(_col(card, "back")) == []


def test_덧붙은_문장은_되번역_쪽에만_강조된다():
    # 약속 한 문장이 덧붙는 것은 글자 유사도 0.12로 의역과 구별되지 않던 오류다.
    card = _diff_card("비자는 신청할 수 있습니다.", "비자는 신청할 수 있습니다. 합격을 보장합니다.")

    assert _marks(_col(card, "source")) == []
    assert _marks(_col(card, "back")) == [("합격을 보장합니다.", "insert")]


def test_금액이_바뀐_낱말도_강조된다():
    card = _diff_card("연간 등록금은 6,800,000원입니다.", "연간 등록금은 8,600,000원입니다.")

    assert _marks(_col(card, "source")) == [("6,800,000원입니다.", "replace")]
    assert _marks(_col(card, "back")) == [("8,600,000원입니다.", "replace")]


def test_강조는_글자가_아니라_낱말_단위다():
    # 글자 단위로 하면 `체류자격입니다.`/`체류자격이다.`의 `입니`만 칠해져 읽을 수 없다.
    card = _diff_card("이 비자는 체류자격입니다.", "이 비자는 체류자격이다.")

    assert _marks(_col(card, "source")) == [("체류자격입니다.", "replace")]
    assert _marks(_col(card, "back")) == [("체류자격이다.", "replace")]


def test_강조는_걸러_내지_않는다_한_낱말도_전부도():
    # 임계값이나 "잡음" 필터가 있으면 뒤집힌 부정이 그 안에 숨는다. 마침표 하나 차이도, 전혀 다른 글도 칠한다.
    one = _diff_card("비자는 신청할 수 있습니다", "비자는 신청할 수 있습니다.")
    assert _marks(_col(one, "source")) == [("있습니다", "replace")]
    assert _marks(_col(one, "back")) == [("있습니다.", "replace")]

    unrelated = _diff_card("비자는 신청할 수 있습니다.", "일본 간병 취업은 어렵습니다.")
    assert _marks(_col(unrelated, "source")) == [("비자는 신청할 수 있습니다.", "replace")]
    assert _marks(_col(unrelated, "back")) == [("일본 간병 취업은 어렵습니다.", "replace")]


def test_거의_같은_다섯_문장_글에서_뒤집힌_부정_하나도_칠한다():
    # 이 화면이 존재하는 이유: 글이 거의 같을수록(유사도가 높을수록) 사람은 한 낱말의 부정을 놓치고, 유사도로 걸러 내는
    # 필터는 바로 그런 글을 통째로 끈다. 다섯 문장에서 한 낱말(`입니다` -> `이 아닙니다`)만 달라도 칠해진다.
    sentences = [
        "유학(D-2)은 전문대학 이상의 교육기관에서 정규과정의 교육을 받으려는 사람을 위한 체류자격입니다.",
        "신청하려면 입학허가서와 재정증명서를 준비해서 가까운 출입국 사무소에 제출해야 합니다.",
        "심사에는 보통 2주에서 4주가 걸리며 서류가 부족하면 더 길어질 수 있습니다.",
        "체류 기간은 학교의 교육과정에 따라 정해지고 필요하면 연장을 신청할 수 있습니다.",
        "자세한 조건은 학교와 출입국 사무소의 안내를 먼저 확인해 주세요.",
    ]
    source = " ".join(sentences)
    flipped = source.replace("체류자격입니다.", "체류자격이 아닙니다.")
    assert flipped != source

    card = _diff_card(source, flipped)

    assert _marks(_col(card, "source")) == [("체류자격입니다.", "replace")]
    assert _marks(_col(card, "back")) == [("체류자격이 아닙니다.", "replace")]


def test_강조는_멀리_떨어진_바뀐_낱말을_따로_칠한다():
    card = _diff_card(
        "비자는 학생이 신청하고 심사는 한 달 걸립니다.",
        "비자는 학부모가 신청하고 심사는 두 달 걸립니다.",
    )

    assert _marks(_col(card, "source")) == [("학생이", "replace"), ("한", "replace")]
    assert _marks(_col(card, "back")) == [("학부모가", "replace"), ("두", "replace")]


def test_강조해도_원문_글자와_줄바꿈이_그대로다():
    source = "첫 문단입니다.\n\n둘째 문단은 다릅니다.\n\n셋째 문단입니다."
    back = "첫 문단입니다.\n\n둘째 문단은 같습니다.\n\n셋째 문단입니다."

    card = _diff_card(source, back)

    assert _text_of(card, "source") == source and _text_of(card, "back") == back
    assert _marks(_col(card, "source")) == [("다릅니다.", "replace")]


def test_여러_낱말에_걸친_강조는_사이의_줄바꿈도_한_표시_안에_둔다():
    card = _diff_card("앞입니다.\n\n빠진\n문단  둘\n\n입니다 뒤.", "앞입니다. 입니다 뒤.")

    # 구간 안의 줄바꿈과 겹친 공백은 그대로다(낱말마다 끊기거나 한 칸으로 접히지 않는다).
    assert _marks(_col(card, "source")) == [("빠진\n문단  둘", "delete")]


def test_강조_안의_글자도_이스케이프된다():
    # 다른 낱말이 "<script>"여도 강조 표시 안에서 마크업이 되지 않는다.
    payload = "<script>alert(1)</script>"
    plan = _edit(_plan(), 0, source_ko=f"비자 {payload} 안내입니다.")
    back = {**_back(plan), 0: "비자 <b>굵게</b> 안내입니다."}

    output = _output(plan, back=back)

    assert re.search(r"<mark[^>]*>&lt;script&gt;alert\(1\)&lt;/script&gt;</mark>", output)
    assert re.search(r"<mark[^>]*>&lt;b&gt;굵게&lt;/b&gt;</mark>", output)
    assert not re.search(r"<script|<b>", output)
    card = _card(_parse(output), 0)
    assert _marks(_col(card, "source")) == [(payload, "replace")]
    assert _marks(_col(card, "back")) == [("<b>굵게</b>", "replace")]


def test_되번역이_없거나_비면_원문에_강조가_없다():
    plan = _plan()

    doc = _doc(plan, back={i: t for i, t in _back(plan).items() if i != 3})
    assert _marks(_col(_card(doc, 3), "source")) == []

    doc = _doc(plan, back={**_back(plan), 3: "  "})
    assert _marks(_col(_card(doc, 3), "source")) == []
    assert _marks(_col(_card(doc, 3), "back")) == []


def test_강조는_게시물마다_그_게시물의_글끼리_견준다():
    plan = _edit(_edit(_plan(), 0, source_ko="가 나 다"), 1, source_ko="가 나 다")
    back = {**_back(plan), 0: "가 나 다", 1: "가 나 라"}

    doc = _doc(plan, back=back)

    assert _marks(_col(_card(doc, 0), "source")) == []
    assert _marks(_col(_card(doc, 1), "source")) == [("다", "replace")]


def test_표시가_무엇인지_안내한다():
    howto = _doc().find(class_="howto").text()

    assert "표시" in howto and "낱말" in howto


# --- 강조와 CTA ---------------------------------------------------------------
# 되번역 워크시트는 끝의 승인된 상담 문구(CTA)를 떼고 나가므로 되번역에는 CTA가 없다. 원문의 CTA를 되번역과 견주면
# 모든 게시물의 끝에 늘 같은 표시가 생겨 "표시가 있다"가 아무것도 알려 주지 못한다. `validate_backtranslation`이 원문에서
# CTA를 떼고 재는 것과 같은 규칙(`backtranslation.comparison_source`)으로 뗀다. 그래서 `render`는 `cta_ko`를 반드시 받는다.


def test_cta_ko를_주면_원문_끝의_CTA는_강조하지_않는다():
    body = "비자는 신청할 수 있습니다."

    card = _diff_card(f"{body}\n\n{CTA}", body, cta_ko=CTA)

    assert _marks(_col(card, "source")) == []
    assert _text_of(card, "source") == f"{body}\n\n{CTA}"  # 글자는 그대로 보인다
    assert _col(card, "source").find(class_="cta").text() == f"\n\n{CTA}"


def test_cta_ko_없이는_render를_부를_수_없다():
    # `cta_ko`에 기본값이 없는 까닭을 코드로 적어 둔다. 기본값(예: None)이 있으면 CTA를 넘기는 것을 잊은 호출이 아무
    # 오류 없이 돌아가고, 그때 강조는 되번역에 없는 CTA를 모든 게시물 끝에서 칠한다 — "표시가 있다"가 아무것도 알려 주지
    # 못하게 되는데도 아무도 알아채지 못한다. 검사가 조용히 꺼지는 것이다. 빼먹은 호출이 `TypeError`로 멈추는 것이
    # 이 파이프라인이 원하는 방향이다. (TypeError 자체가 흥미로운 것이 아니라 이 규칙을 시험으로 말해 두려는 것이다.)
    plan = _plan()
    args = (plan, [], _back(plan), dict(GAPS), IMAGES_DIR)

    with pytest.raises(TypeError) as info:
        render(*args)
    assert "cta_ko" in str(info.value)

    with pytest.raises(TypeError):
        render(*args, CTA)  # 키워드 전용이라 자리로도 넘길 수 없다

    parameter = inspect.signature(render).parameters["cta_ko"]
    assert parameter.kind is inspect.Parameter.KEYWORD_ONLY and parameter.default is inspect.Parameter.empty
    assert "<html" in render(*args, cta_ko=CTA)  # 넘기면 된다


def test_CTA를_떼고도_본문의_다른_낱말은_강조한다():
    card = _diff_card("비자는 신청할 수 있습니다.\n\n" + CTA, "비자는 신청할 수 없습니다.", cta_ko=CTA)

    assert _marks(_col(card, "source")) == [("있습니다.", "replace")]
    assert _marks(_col(card, "back")) == [("없습니다.", "replace")]


def test_원문이_CTA로_끝나지_않으면_원문_통째로_견준다():
    # validate_backtranslation의 대체 경로와 같다.
    source = f"{CTA}\n\n비자는 신청할 수 있습니다."

    card = _diff_card(source, "비자는 신청할 수 있습니다.", cta_ko=CTA)

    assert _marks(_col(card, "source")) == [(CTA, "delete")]
    assert _col(card, "source").find_all(class_="cta") == []


def test_되번역에_CTA가_적혀_있으면_되번역_쪽에서_강조된다():
    # 되번역에서는 아무것도 떼지 않는다. 채우는 쪽이 CTA를 덧붙였다면 그것이 보여야 한다.
    body = "비자는 신청할 수 있습니다."

    card = _diff_card(f"{body}\n\n{CTA}", f"{body}\n\n{CTA}", cta_ko=CTA)

    assert _marks(_col(card, "source")) == []
    assert _marks(_col(card, "back")) == [(CTA, "insert")]


@pytest.mark.parametrize("blank", ["", "  \n", 5, None], ids=["빈문자열", "공백", "문자열아님", "None"])
def test_cta_ko가_비어_있으면_ValueError(blank):
    # 빈 CTA는 "끝이 같은가"가 늘 참이라 원문 전체가 떼어 낼 꼬리가 되어 강조가 조용히 꺼진다. `None`을 명시해서
    # 넘기는 것도 기본값을 둔 것과 같으므로 받아들이지 않는다.
    with pytest.raises(ValueError) as info:
        _output(cta_ko=blank)

    assert "cta_ko" in str(info.value)


def test_안내가_회색_상담_문구를_설명한다():
    assert "회색" in _doc().find(class_="howto").text()


def test_픽스처의_원문은_이_시험의_CTA로_끝난다():
    # 기본 시험 입력(`_output`)이 실제 용어집 CTA와 같은 문구를 넘기므로, 이 전제가 깨지면 아래 시험들이 다른 경로를 탄다.
    assert all(post.source_ko.endswith("\n\n" + CTA) for post in _plan().posts)


def test_CTA_꼬리가_없으면_cta_표시도_없다():
    card = _diff_card("비자는 신청할 수 있습니다.", "비자는 신청할 수 있습니다.", cta_ko=CTA)

    assert _col(card, "source").find_all(class_="cta") == []


# --- 인용한 사실과 대학 ------------------------------------------------------------


def test_인용한_사실_키와_대학명이_카드에_들어간다():
    # 그 게시물이 무엇에 기대어 있다고 주장하는지 보이게 한다. 값은 싣지 않는다(출처없는수치가 이미 기계로 대조한다).
    doc = _doc()

    tuition = _card(doc, 3).find(data_role="cites")
    assert "tuition_kijeon" in tuition.text() and "전주기전대학" in tuition.text()
    assert [code.text() for code in tuition.find_all("code")] == ["tuition_kijeon"]
    assert "visa_d2_definition" in _card(doc, 0).find(data_role="cites").text()


def test_인용한_사실이_없으면_없다고_적는다():
    # 등록금 카드가 사실 키를 하나도 달지 않았다면 눈에 띄어야 한다.
    plan = _edit(_edit(_plan(), 3, fact_keys=()), 4, university_names=())

    doc = _doc(plan)

    assert "인용한 사실 없음" in _card(doc, 3).find(data_role="cites").text()
    assert "대학 없음" in _card(doc, 4).find(data_role="cites").text()


def test_여러_사실_키와_대학명은_모두_적힌다():
    plan = _edit(_plan(), 3, fact_keys=("tuition_kijeon", "tuition_geumgang"), university_names=("전주기전대학", "금강대학교"))

    cites = _card(_doc(plan), 3).find(data_role="cites")

    assert [code.text() for code in cites.find_all("code")] == ["tuition_kijeon", "tuition_geumgang"]
    assert "전주기전대학" in cites.text() and "금강대학교" in cites.text()


def test_인용한_사실은_한_줄이고_사실의_값은_싣지_않는다():
    cites = _card(_doc(), 3).find(data_role="cites")

    assert cites.tag == "p" and "\n" not in cites.text()
    assert "6,800,000" not in cites.text()


def test_긴_글에서도_바뀐_낱말_하나만_칠한다():
    # `SequenceMatcher`는 두 번째 글이 200낱말 이상이면 자주 나오는 낱말을 버려(autojunk) 바뀐 곳 뒤를 통째로 다른 것으로
    # 만든다. 낱말 종류가 적은 긴 글에서 하나가 바뀌었는데 150낱말이 칠해지면 표시가 아무것도 알려 주지 못한다.
    vocabulary = ("가", "나", "다")
    words = [vocabulary[(i * 7 + i // 5) % 3] for i in range(300)]
    changed = list(words)
    changed[150] = "라"

    card = _diff_card(" ".join(words), " ".join(changed))

    assert _marks(_col(card, "source")) == [(words[150], "replace")]
    assert _marks(_col(card, "back")) == [("라", "replace")]


def _assert_nothing_injected(output: str) -> None:
    assert PROBE not in output
    assert html.escape(PROBE) in output  # 사라진 것이 아니라 글자로 보인다
    nodes = list(_parse(output).walk())
    assert not any(node.tag == "zzprobe" for node in nodes)
    assert not any("zzattr" in node.attrs for node in nodes)


@pytest.mark.parametrize(
    "source, back, cta_ko, where",
    [
        (f"앞 {PROBE} 뒤 가", f"앞 {PROBE} 뒤 나", CTA, "표시보다 앞"),
        (f"가 앞 {PROBE} 뒤", f"나 앞 {PROBE} 뒤", CTA, "마지막 표시 뒤"),
        (f"앞 {PROBE} 뒤", f"앞 {PROBE} 뒤", CTA, "표시가 하나도 없음"),
        (f"앞 {PROBE} 뒤", None, CTA, "되번역이 없음"),
        (f"본문입니다.\n\n{PROBE}", "본문입니다.", PROBE, "떼어 낸 CTA 꼬리"),
    ],
    ids=["표시앞", "표시뒤", "표시없음", "되번역없음", "CTA꼬리"],
)
def test_강조_바깥의_글자도_이스케이프된다(source, back, cta_ko, where):
    # 칠해지지 않는 글자는 따로 이어 붙이므로 칠한 글자의 이스케이프와 별개로 본다.
    plan = _edit(_plan(), 0, source_ko=source)
    backs = _back(plan)
    if back is None:
        del backs[0]
    else:
        backs[0] = back

    output = _output(plan, back=backs, cta_ko=cta_ko)

    _assert_nothing_injected(output)


def test_원문이_CTA로_끝나지_않으면_뒤쪽_공백도_떼지_않고_꼬리도_만들지_않는다():
    # 대체 경로는 원문 통째다(`comparison_source`). 호출하는 쪽이 자기 규칙으로 뒤쪽 공백을 떼면 가짜 꼬리가 생긴다.
    card = _diff_card(f"{CTA}\n\n비자는 신청할 수 있습니다.\n", "비자는 신청할 수 있습니다.", cta_ko=CTA)

    assert _col(card, "source").find_all(class_="cta") == []
    assert _text_of(card, "source") == f"{CTA}\n\n비자는 신청할 수 있습니다.\n"


def test_안내가_노란_표시의_뜻을_설명한다():
    howto = _doc().find(class_="howto")

    assert howto.find("mark").text() == "노란 표시"
    assert "서로 다른 낱말" in howto.text()
