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
import difflib
import html
import inspect
import re
from datetime import datetime, timedelta
from html.parser import HTMLParser
from pathlib import Path

import pytest

from facebook import config, review
from facebook.findings import Finding
from facebook.plan_model import Plan, load_plan
from facebook.review import render

FIXTURE = Path(__file__).parent / "fixtures" / "plan-valid.json"
IMAGES_DIR = Path("output/facebook/2026-11/images")  # 이미지가 실제로 있을 필요는 없다. render는 파일을 열지 않는다.

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


def _output(plan=None, findings=(), back=None, gaps=None, images_dir=IMAGES_DIR) -> str:
    plan = _plan() if plan is None else plan
    return render(plan, list(findings), _back(plan) if back is None else back, dict(GAPS) if gaps is None else gaps, images_dir)


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
    # 받은 값이 나와야 하고, 글자 대조를 부르는 순간 터지게 해 둔다.
    def boom(*args, **kwargs):
        raise AssertionError("render가 글자 대조(difflib)를 불렀다")

    monkeypatch.setattr(difflib, "SequenceMatcher", boom)
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
    ["source_ko", "body_local", "back_ko", "image_prompt", "image_file", "language", "title_ko", "month", "message", "code", "orphan_message", "orphan_code"],
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

    render(plan, findings, back, gaps, IMAGES_DIR)

    assert (findings, back, gaps) == before


def test_시그니처가_계약과_같다():
    assert list(inspect.signature(render).parameters) == ["plan", "findings", "back", "divergences", "images_dir"]
    assert config.LANGUAGES == ("vi", "my", "ne")  # 언어 이름 표가 이 세 언어를 모두 덮는지 아래에서 본다
    assert set(review._LANGUAGE_NAMES) >= set(config.LANGUAGES)
