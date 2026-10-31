"""데이터 파일(facts.json·glossary.json·universities.json) 자체를 검사하는 테스트.

로더 규칙은 `test_facts.py`가 본다. 여기서 막는 것은 **내용**이다. 이 도구의 최우선
안티골이 "검증되지 않은 수치가 현지어로 나가는 것"이므로, 유효기한이 지난 사실과
실명이 아닌 대학 이름을 커밋 단계에서 걸러낸다.
"""

from __future__ import annotations

import json
import re
from datetime import date
from urllib.parse import urlsplit

from facebook import config
from facebook.facts import load_facts

_GLOSSARY_LANGS = {"ko", "vi", "my", "ne"}
_REQUIRED_TERMS = ("visa_d2", "visa_d4", "company_name", "cta")

# 1차 출처로 인정하는 호스트. 블로그·에이전시·뉴스가 끼어드는 것을 여기서 막는다.
_ALLOWED_SOURCE_HOSTS = ("law.go.kr", "hikorea.go.kr", "data.go.kr")

# 등록금 값에서 절대 빠지면 안 되는 한정. 숫자만 떼어 현지어 글에 붙였을 때
# "학기당"이나 "전 과정"으로 읽히는 것을 막는 문구들이다.
_TUITION_REQUIRED = (
    "연간 평균등록금",
    "1년치, 학기당 아님",
    "전체 학과 가중평균",
    "공시 평균값",
    "실제 납부액과 다를 수 있다",
    "입학금",
    "데이터기준일자",
)

# 모든 글의 마지막 문장. 무료 상담 안내와 메시지 요청 말고는 아무것도 약속하지 않는다.
_CTA_SNAPSHOT = {
    "ko": "상담은 무료입니다. 궁금한 점이 있으면 이 페이지로 메시지를 보내 주세요.",
    "vi": "Tư vấn hoàn toàn miễn phí. Nếu bạn có thắc mắc, hãy nhắn tin cho trang này.",
    "my": "အကြံပေးဆွေးနွေးမှုမှာ အခမဲ့ဖြစ်ပါသည်။ သိလိုသည်များရှိပါက ဤစာမျက်နှာသို့ မက်ဆေ့ချ်ပို့ပေးပါ။",
    "ne": "परामर्श निःशुल्क छ। कुनै जिज्ञासा भए यस पेजमा म्यासेज पठाउनुहोस्।",
}
_CTA_FORBIDDEN_KO = re.compile(r"합격|입학|취업|보장|비용")

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


def test_유효기한_실패_안내는_고장이_아니라_갱신하라고_말한다():
    """등록금 사실 11건의 `expires_on`이 모두 2027-02-28이다(직접 셈: 사실 15건 가운데 11건이 그날, 4건이 2027-10-31). 그날이 지나면 **코드를 하나도 고치지 않아도**
    정규 명령이 빨개진다. 유효기한 장치 자체는 옳다 — 사실은 늙고, 늙은 수치가 아무도 읽지 못하는 현지어로
    나가는 것이 이 도구의 최우선 안티골이다.

    문제는 그때 운영자가 받는 **말**이다. 문서 §5-6(「도구 자체가 고장 난 것 같다」)이 "하나라도 실패하면 그
    출력을 그대로 개발자에게 보여 주고 예약은 하지 마세요"로 보내므로, 운영자가 보는 그림은 "도구가 고장
    났다"이고 실제 상황은 "등록금 공시를 갱신할 때가 됐다"다. 1인 운영에 보여 줄 개발자는 없다.

    그래서 실패 메시지가 **무엇이 만료됐는지와 무엇을 하면 되는지**를 말하는지 본다. 문서 쪽 짝은
    `tests/test_cli.py`가 못박는다.
    """
    message = _expired_message({"tuition_kyonggi": date(2027, 2, 28)})
    assert "tuition_kyonggi" in message and "2027-02-28" in message  # 무엇이 만료됐는지
    for needle in ("도구가 고장 난 것이 아닙니다", "다시 확인", "expires_on", "예약하지 마세요"):
        assert needle in message, needle


def _expired_message(expired: dict[str, date]) -> str:
    """유효기한이 지난 사실 때문에 이 묶음이 빨개질 때 운영자가 읽는 글.

    "도구가 고장 났다"가 아니라 "사실이 늙었다"로 읽혀야 한다. 첫 건에서 멈추지 않고 만료된 사실을 전부
    대는 것도 같은 이유다 — 열두 건을 한 건씩 열두 번 만나게 하지 않는다.
    """
    what = ", ".join(f"{key}(expires_on {day.isoformat()})" for key, day in sorted(expired.items()))
    return (
        f"유효기한이 지난 사실 {len(expired)}건: {what}. "
        f"**사실의 유효기간이 지난 것이고 도구가 고장 난 것이 아닙니다.** 1차 출처에서 그 수치를 다시 확인해 "
        f"output/facebook/facts.json의 값과 expires_on을 갱신하세요. 갱신하기 전에는 그 사실을 쓴 게시물을 "
        f"예약하지 마세요."
    )


def test_모든_사실이_오늘_유효하다():
    expired = {
        key: f.expires_on
        for key, f in load_facts(config.FACTS_PATH).items()
        if not f.is_valid_on(date.today())
    }
    assert not expired, _expired_message(expired)


def test_모든_출처가_1차_출처_호스트다():
    """출처 호스트를 법령·하이코리아·공공데이터포털로 묶는다.

    '1차 출처만 쓴다'는 규칙이 이 테스트 하나로 관례에서 검사로 바뀐다.
    블로그·에이전시 페이지·뉴스 기사가 출처로 들어오면 여기서 깨진다.
    """
    for key, f in load_facts(config.FACTS_PATH).items():
        host = urlsplit(f.source_url).hostname or ""
        ok = any(host == allowed or host.endswith("." + allowed) for allowed in _ALLOWED_SOURCE_HOSTS)
        assert ok, f"{key}의 출처 호스트가 1차 출처가 아니다: {host!r} ({f.source_url})"


def test_등록금_값은_연_단위와_평균값_한정을_담는다():
    """숫자만 떼어 쓰지 못하도록, 기간·평균·입학금 범위를 값 안에 묶어 둔다."""
    tuitions = {k: f for k, f in load_facts(config.FACTS_PATH).items() if k.startswith("tuition_")}
    assert tuitions, "등록금 사실이 하나도 없다"
    for key, f in tuitions.items():
        for phrase in _TUITION_REQUIRED:
            assert phrase in f.value, f"{key}의 값에 '{phrase}'가 없다: {f.value!r}"


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


def test_cta는_무료상담_안내에서_한_글자도_벗어나지_않는다():
    """`cta`는 모든 글의 마지막 문장이다. 네 언어를 통째로 고정한다.

    글자 단위로 묶어 두는 이유: 어느 한 언어에만 '취업 보장' 한 줄이 끼어들어도
    사장이 그 언어를 읽지 못해 끝까지 걸러지지 않는다. 문구를 바꿀 일이 생기면
    이 스냅숏을 함께 고치면서 네 언어를 다시 검토하게 된다.
    """
    cta = json.loads(config.GLOSSARY_PATH.read_text("utf-8"))["cta"]
    assert cta == _CTA_SNAPSHOT, "cta 문구가 바뀌었다. 네 언어를 다시 검토하고 스냅숏을 고쳐라."
    assert not _CTA_FORBIDDEN_KO.search(cta["ko"]), (
        f"cta(ko)에 상담 외의 약속으로 읽힐 말이 들어 있다: {cta['ko']!r}"
    )


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
