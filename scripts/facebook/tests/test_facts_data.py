"""데이터 파일(facts.json·glossary.json·universities.json) 자체를 검사하는 테스트.

로더 규칙은 `test_facts.py`가 본다. 여기서 막는 것은 **내용**이다. 이 도구의 최우선
안티골이 "검증되지 않은 수치가 현지어로 나가는 것"이므로, 유효기한이 지난 사실과
실명이 아닌 대학 이름을 커밋 단계에서 걸러낸다.
"""

from __future__ import annotations

import json
import re
from datetime import date

from facebook import config
from facebook.facts import load_facts

_GLOSSARY_LANGS = {"ko", "vi", "my", "ne"}
_REQUIRED_TERMS = ("visa_d2", "visa_d4", "company_name", "cta")

# NETWORK_INSTITUTIONS 한 줄: `{ id: "kyonggi", kind: "university", ... }`
# 지역 좌표(`{ id: "capital", x: 30, ... }`)는 kind가 없어 걸리지 않는다.
_INSTITUTION = re.compile(r'\{\s*id:\s*"(?P<id>[^"]+)",\s*kind:\s*"(?P<kind>[^"]+)"(?P<rest>[^}]*)\}')
_STATUS = re.compile(r'status:\s*"([^"]+)"')


def _institutions_from_ts() -> dict[str, tuple[str, str]]:
    """partnership-network.ts의 `{id: (kind, status)}`. 회사 사이트가 유일한 기준이다."""
    ts = (config.ROOT / "company/lib/partnership-network.ts").read_text("utf-8")
    found: dict[str, tuple[str, str]] = {}
    for m in _INSTITUTION.finditer(ts):
        status = _STATUS.search(m.group("rest"))
        found[m.group("id")] = (m.group("kind"), status.group(1) if status else "")
    return found


def _korean_names() -> dict[str, str]:
    """ko.json의 `network.institutions.<id>.name`. 대학 한국어 실명은 여기에만 있다."""
    messages = json.loads((config.ROOT / "company/messages/ko.json").read_text("utf-8"))
    return {key: value["name"] for key, value in messages["network"]["institutions"].items()}


def test_facts_파일이_로드된다():
    facts = load_facts(config.FACTS_PATH)
    assert facts, "facts.json이 비어 있다"


def test_모든_사실이_오늘_유효하다():
    for key, f in load_facts(config.FACTS_PATH).items():
        assert f.is_valid_on(date.today()), f"{key} 유효기한 지남"


def test_용어집이_네_언어를_모두_가진다():
    g = json.loads(config.GLOSSARY_PATH.read_text("utf-8"))
    for key in _REQUIRED_TERMS:
        assert key in g, f"용어집에 {key}이(가) 없다"
        assert set(g[key]) >= _GLOSSARY_LANGS, f"{key}에 빠진 언어가 있다: {_GLOSSARY_LANGS - set(g[key])}"


def test_용어집_번역이_비어_있지_않다():
    g = json.loads(config.GLOSSARY_PATH.read_text("utf-8"))
    for key, term in g.items():
        for lang in _GLOSSARY_LANGS:
            assert term[lang].strip(), f"{key}의 {lang} 번역이 비어 있다"


def test_대학목록은_partnership_network의_planned를_제외한_실명뿐이다():
    institutions = _institutions_from_ts()
    names = _korean_names()
    entries = json.loads(config.UNIVERSITIES_PATH.read_text("utf-8"))
    assert entries, "universities.json이 비어 있다"
    for u in entries:
        uid = u["id"]
        assert uid in institutions, f"{uid}은(는) partnership-network.ts에 없다"
        kind, status = institutions[uid]
        assert kind == "university", f"{uid}의 kind가 university가 아니다: {kind}"
        assert status != "planned", f"{uid}은(는) status: planned이므로 글에 쓸 수 없다"
        assert u["name_ko"] == names[uid], f"{uid}의 한국어 실명이 ko.json과 다르다: {u['name_ko']!r}"
    ids = [u["id"] for u in entries]
    assert len(ids) == len(set(ids)), "universities.json에 중복 id가 있다"
    assert "kimpo" not in ids and "hanyeong" not in ids  # status: planned


def test_등록금_사실은_universities_목록에_있는_대학만_있다():
    """`tuition_<id>`를 글에 쓸 수 있으려면 그 대학이 실명 목록에도 있어야 한다."""
    allowed = {u["id"] for u in json.loads(config.UNIVERSITIES_PATH.read_text("utf-8"))}
    for key in load_facts(config.FACTS_PATH):
        if key.startswith("tuition_"):
            assert key[len("tuition_"):] in allowed, f"{key}: universities.json에 없는 대학이다"
