"""사실 데이터 로더(facts.py) 테스트."""

from __future__ import annotations

import dataclasses
import json
from datetime import date

import pytest

from facebook.facts import Fact, FactsError, load_facts


def _write(tmp_path, data):
    p = tmp_path / "facts.json"
    p.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    return p


def _raw(**overrides):
    """유효한 사실 한 건의 원본 dict. 필요한 필드만 덮어쓴다."""
    base = {
        "value": "주 25시간",
        "source_url": "https://www.hikorea.go.kr/...",
        "verified_by": "builder",
        "verified_on": "2026-10-31",
        "expires_on": "2027-10-31",
    }
    base.update(overrides)
    return base


def test_load_facts_파싱(tmp_path):
    p = _write(tmp_path, {"work_hours_d2": {
        "value": "주 25시간", "source_url": "https://www.hikorea.go.kr/...",
        "verified_by": "builder", "verified_on": "2026-10-31", "expires_on": "2027-10-31"}})
    facts = load_facts(p)
    assert facts["work_hours_d2"].value == "주 25시간"
    assert facts["work_hours_d2"].expires_on == date(2027, 10, 31)


def test_load_facts_키와_나머지_필드도_채워진다(tmp_path):
    f = load_facts(_write(tmp_path, {"k": _raw()}))["k"]
    assert (f.key, f.source_url, f.verified_by) == ("k", "https://www.hikorea.go.kr/...", "builder")
    assert f.verified_on == date(2026, 10, 31)


def test_is_valid_on_게시일_기준():
    f = Fact("k", "v", "https://x", "builder", date(2026, 10, 1), date(2026, 11, 15))
    assert f.is_valid_on(date(2026, 11, 15)) is True   # 유효기한 당일은 유효
    assert f.is_valid_on(date(2026, 11, 16)) is False


def test_Fact는_불변이다():
    f = Fact("k", "v", "https://x", "builder", date(2026, 10, 1), date(2026, 11, 15))
    with pytest.raises(dataclasses.FrozenInstanceError):
        f.value = "다른 값"  # type: ignore[misc]


def test_필수_필드_누락이면_FactsError(tmp_path):
    p = _write(tmp_path, {"k": {"value": "v"}})
    with pytest.raises(FactsError, match="출처"):
        load_facts(p)


def test_오류_메시지에_사실_키가_들어간다(tmp_path):
    p = _write(tmp_path, {"work_hours_d2": {"value": "v"}})
    with pytest.raises(FactsError, match="work_hours_d2"):
        load_facts(p)


def test_빈_값은_누락과_같이_취급한다(tmp_path):
    p = _write(tmp_path, {"k": _raw(value="   ")})
    with pytest.raises(FactsError, match=r"값\(value\)"):
        load_facts(p)


def test_유효기한이_확인일보다_빠르면_FactsError(tmp_path):
    p = _write(tmp_path, {"k": _raw(verified_on="2026-10-31", expires_on="2026-10-30")})
    with pytest.raises(FactsError, match="유효기한"):
        load_facts(p)


def test_유효기한이_확인일과_같은_날이면_허용한다(tmp_path):
    p = _write(tmp_path, {"k": _raw(verified_on="2026-10-31", expires_on="2026-10-31")})
    assert load_facts(p)["k"].is_valid_on(date(2026, 10, 31)) is True


@pytest.mark.parametrize("url", ["www.hikorea.go.kr", "ftp://example.com/x", "출처 미상", "httpx://x"],
                         ids=["no-scheme", "ftp", "plain-text", "httpx"])
def test_출처가_http로_시작하지_않으면_FactsError(tmp_path, url):
    p = _write(tmp_path, {"k": _raw(source_url=url)})
    with pytest.raises(FactsError, match="출처"):
        load_facts(p)


@pytest.mark.parametrize("field,label", [("verified_on", "확인일"), ("expires_on", "유효기한")],
                         ids=["verified_on", "expires_on"])
def test_날짜_형식이_틀리면_FactsError(tmp_path, field, label):
    p = _write(tmp_path, {"k": _raw(**{field: "2026/10/31"})})
    with pytest.raises(FactsError, match=label):
        load_facts(p)


def test_파일이_없으면_경로를_담은_한국어_FactsError(tmp_path):
    p = tmp_path / "없는-facts.json"
    with pytest.raises(FactsError, match="찾을 수 없습니다") as e:
        load_facts(p)
    assert str(p) in str(e.value)


def test_읽을_수_없는_경로면_경로를_담은_한국어_FactsError(tmp_path):
    # 파일 자리에 폴더가 있으면 OSError(IsADirectoryError)가 난다.
    with pytest.raises(FactsError, match="읽을 수 없습니다") as e:
        load_facts(tmp_path)
    assert str(tmp_path) in str(e.value)


def test_UTF8이_아니면_경로를_담은_한국어_FactsError(tmp_path):
    p = tmp_path / "facts.json"
    p.write_bytes(b"\xff\xfe\x00")
    with pytest.raises(FactsError, match="UTF-8") as e:
        load_facts(p)
    assert str(p) in str(e.value)


def test_JSON이_깨졌으면_FactsError(tmp_path):
    p = tmp_path / "facts.json"
    p.write_text("{ 깨진 json", encoding="utf-8")
    with pytest.raises(FactsError, match="JSON"):
        load_facts(p)


def test_최상위가_객체가_아니면_FactsError(tmp_path):
    p = _write(tmp_path, [_raw()])
    with pytest.raises(FactsError, match="객체"):
        load_facts(p)


def test_사실_한_건이_객체가_아니면_FactsError(tmp_path):
    p = _write(tmp_path, {"k": "주 25시간"})
    with pytest.raises(FactsError, match="k"):
        load_facts(p)
