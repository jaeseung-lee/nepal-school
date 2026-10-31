"""역번역 대조(backtranslation.py) 테스트.

여기서는 워크시트를 내는 것(CTA를 뗀 본문, 본문 해시), 채워 온 워크시트를 읽는 것(다른 달·낡은 워크시트 거부),
되번역이 빠짐없이 왔는지, 다른 게시물의 것을 베끼지 않았는지, 숫자가 원문과 같은지, 되번역이 한국어 원문에서
글자로 얼마나 벌어졌는지만 본다.
**뜻이 옳은지는 보지 않는다** — 그것은 검토 화면에서 사람이 한국어 원문과 되번역을 나란히 놓고 판단한다.
그래서 이 파일의 어떤 테스트도 "이 되번역의 뜻이 옳다"를 주장하지 않고, 글자 유사도가 어느 쪽으로 움직이는지와
숫자열이 같은지만 고정한다.

되번역 표본은 이 파일에서 손으로 쓴 한국어이고 검수를 받지 않았다. 표본은 임계값(0.45)을 고르는 근거가
아니다: 경계는 `divergence` 값 자체를 임계값으로 넘겨 검사하고, 기본값은 시그니처 테스트가 고정한다.
"""

from __future__ import annotations

import dataclasses
import difflib
import inspect
import json
import unicodedata
from pathlib import Path

import pytest

from facebook import config
from facebook.backtranslation import (
    WorksheetError,
    divergence,
    load,
    validate_backtranslation,
    worksheet,
)
from facebook.findings import Finding
from facebook.plan_model import Plan, load_plan

FIXTURE = Path(__file__).parent / "fixtures" / "plan-valid.json"

GLOSSARY = json.loads(config.GLOSSARY_PATH.read_text(encoding="utf-8"))
CTA = GLOSSARY["cta"]["ko"]
LANGUAGES = ("vi", "my", "ne")

# 되번역은 워크시트가 내보낸 본문(끝의 CTA를 뗀 것)을 한국어로 옮긴 것이라 CTA가 없다.
# 픽스처 0번(D-2)·3번(전주기전대학 등록금) 원문을 뜻 그대로 풀어 쓴 되번역과, 아무 관계 없는 글.
PARAPHRASE_0 = (
    "유학(D-2) 비자는 전문대학 이상의 교육기관이나 학술연구기관에서 정규과정 교육을 받거나 "
    "특정 연구를 하려는 사람을 위한 체류자격입니다."
)
PARAPHRASE_3 = (
    "전주기전대학의 연간 평균 등록금은 6,800,000원입니다(1년치). 전체 학과 가중평균 공시값이라서 "
    "학생 개인이 실제로 내는 금액과 다를 수 있습니다."
)
# 숫자열이 `2` 하나라 0·1·2번(D-2)의 숫자열과 같다 — 글자 차이 경고만 내고 숫자 오류는 내지 않는다.
UNRELATED = "일본 간병 취업비자를 받으려면 일본어 능력시험 N2 이상이 필요합니다."


# --- 도우미 -------------------------------------------------------------------


def _raw_plan() -> Plan:
    """픽스처 그대로. 한 소재의 세 게시물은 `source_ko`가 글자까지 같다."""
    return load_plan(FIXTURE)


_LABEL = {"vi": "베트남어판", "my": "미얀마어판", "ne": "네팔어판"}


def _plan() -> Plan:
    """게시물마다 원문이 다르도록 본문 끝(CTA 앞)에 언어 표지를 붙인 픽스처. 숫자는 늘지 않는다.

    원문이 글자까지 같으면 원문 그대로 돌려준 되번역도 서로 같아져 `역번역중복`이 난다. 아래 테스트 대부분은
    그 경고가 아닌 것을 보려는 것이라 되번역이 서로 다를 수 있게 원문부터 다르게 둔다.
    """
    raw = _raw_plan()
    for post in raw.posts:
        # 이 전제가 깨지면 아래 `removesuffix`가 조용히 아무것도 떼지 않아 CTA가 두 번 붙은 원문이 만들어진다.
        assert post.source_ko.endswith("\n\n" + CTA), f"픽스처 {post.index}번 원문이 본문, 빈 줄, CTA 순서가 아니다"
    posts = tuple(
        dataclasses.replace(
            post, source_ko=f"{post.source_ko.removesuffix(chr(10) * 2 + CTA)} ({_LABEL[post.language]})\n\n{CTA}"
        )
        for post in raw.posts
    )
    return dataclasses.replace(raw, posts=posts)


def _edit(plan: Plan, index: int, **changes) -> Plan:
    """`index`번 게시물의 필드만 바꾼 새 플랜."""
    posts = tuple(dataclasses.replace(p, **changes) if p.index == index else p for p in plan.posts)
    return dataclasses.replace(plan, posts=posts)


def _faithful(plan: Plan) -> dict[int, str]:
    """모든 게시물이 원문에서 CTA만 뗀 채 돌아온 되번역. 숫자도 글자도 원문과 같다."""
    return {post.index: post.source_ko.removesuffix("\n\n" + CTA) for post in plan.posts}


def _extend_body(plan: Plan, index: int, extra: str) -> Plan:
    """`index`번 게시물의 현지어 본문 CTA 앞에 문장을 덧붙인 플랜(CTA는 그대로 끝에 둔다)."""
    post = plan.posts[index]
    cta = GLOSSARY["cta"][post.language]
    assert post.body_local.endswith("\n\n" + cta)  # 픽스처의 전제
    body = post.body_local.removesuffix("\n\n" + cta)
    return _edit(plan, index, body_local=f"{body} {extra}\n\n{cta}")


def _check(plan: Plan, back: dict[int, str], glossary: dict | None = None, **kwargs) -> list[Finding]:
    return validate_backtranslation(plan, back, GLOSSARY if glossary is None else glossary, **kwargs)


def _brief(findings: list[Finding]) -> list[tuple[int | None, str, str]]:
    return [(f.post_index, f.code, f.severity) for f in findings]


def _write(tmp_path: Path, content: str | bytes) -> Path:
    path = tmp_path / "backtranslation.json"
    if isinstance(content, bytes):
        path.write_bytes(content)
    else:
        path.write_text(content, encoding="utf-8")
    return path


def _sheet_json(entries: list) -> str:
    return json.dumps({"month": "2026-11", "entries": entries}, ensure_ascii=False)


def _filled(tmp_path: Path, plan: Plan, *, drop_hash: tuple[int, ...] = (), hash_value=None) -> Path:
    """`worksheet`가 낸 워크시트의 `back_ko`를 채워 파일로 쓴다. `drop_hash`의 번호는 `body_hash`를 지우거나
    `hash_value`로 바꾼다."""
    sheet = json.loads(json.dumps(worksheet(plan, GLOSSARY), ensure_ascii=False))  # 파일을 거치는 것과 같은 왕복
    for entry in sheet["entries"]:
        entry["back_ko"] = f"{entry['index']}번 되번역"
        if entry["index"] in drop_hash:
            if hash_value is None:
                del entry["body_hash"]
            else:
                entry["body_hash"] = hash_value
    return _write(tmp_path, json.dumps(sheet, ensure_ascii=False, indent=2))


def _load_error(path: Path) -> str:
    with pytest.raises(WorksheetError) as info:
        load(path)
    return str(info.value)


def _has_hangul(text: str) -> bool:
    return any("가" <= ch <= "힣" for ch in text)


# --- 워크시트 -------------------------------------------------------------------


def test_워크시트가_모든_게시물을_담는다():
    plan = _plan()

    sheet = worksheet(plan, GLOSSARY)

    assert set(sheet) == {"month", "entries"}
    assert sheet["month"] == "2026-11"
    assert [set(entry) for entry in sheet["entries"]] == [{"index", "language", "body_local", "body_hash", "back_ko"}] * 6
    assert [
        {key: value for key, value in entry.items() if key != "body_hash"} for entry in sheet["entries"]
    ] == [
        {
            "index": post.index,
            "language": post.language,
            "body_local": post.body_local.removesuffix("\n\n" + GLOSSARY["cta"][post.language]),
            "back_ko": "",
        }
        for post in plan.posts
    ]
    assert [entry["index"] for entry in sheet["entries"]] == [0, 1, 2, 3, 4, 5]


def test_워크시트는_CTA를_떼고_본문을_내보낸다():
    plan = _plan()

    sheet = worksheet(plan, GLOSSARY)

    for post, entry in zip(plan.posts, sheet["entries"]):
        cta = GLOSSARY["cta"][post.language]
        assert post.body_local.endswith(cta)  # 픽스처의 전제: 원래 본문은 CTA로 끝난다
        assert entry["body_local"] == post.body_local[: -len(cta)].rstrip()
        assert entry["body_local"] and cta not in entry["body_local"]
    dumped = json.dumps(sheet, ensure_ascii=False)
    for language in ("ko", *LANGUAGES):  # 채우는 쪽은 어느 언어의 CTA도 보지 않는다
        assert GLOSSARY["cta"][language] not in dumped


def test_워크시트는_CTA_뒤의_공백을_본문으로_치지_않는다():
    plan = _plan()
    padded = _edit(plan, 0, body_local=plan.posts[0].body_local + "  \n\n")

    assert worksheet(padded, GLOSSARY)["entries"][0] == worksheet(plan, GLOSSARY)["entries"][0]


@pytest.mark.parametrize(
    "body_local",
    [
        "Thị thực du học (D-2) dành cho người học chương trình chính quy.",
        "Tư vấn hoàn toàn miễn phí. Nếu bạn có thắc mắc, hãy nhắn tin cho trang này.\n\nThị thực du học (D-2).",
        "Thị thực du học (D-2).\n\n" + GLOSSARY["cta"]["ne"],
        "Thị thực du học (D-2).\n\n" + GLOSSARY["cta"]["vi"][:-1],
    ],
    ids=["CTA없음", "CTA가본문앞에있음", "다른언어CTA", "CTA가끝에서잘림"],
)
def test_워크시트는_본문이_CTA로_끝나지_않으면_통째로_내보내지_않고_멈춘다(body_local):
    plan = _edit(_plan(), 0, body_local=body_local)

    with pytest.raises(ValueError) as info:
        worksheet(plan, GLOSSARY)

    assert "0번" in str(info.value) and "CTA" in str(info.value) and _has_hangul(str(info.value))


@pytest.mark.parametrize("language", LANGUAGES)
@pytest.mark.parametrize("prefix", ["", "  \n\n", "...\n\n", "。 "], ids=["CTA만", "공백뒤CTA", "문장부호뒤CTA", "한자문장부호뒤CTA"])
def test_본문이_CTA뿐이면_워크시트가_멈춘다(language, prefix):
    # 번역할 본문이 남지 않는다. 빈 `body_local`을 내보내면 채우는 쪽이 무엇을 되번역할지 모른다.
    index = LANGUAGES.index(language)  # 첫 소재의 세 게시물은 vi, my, ne 순이다
    plan = _edit(_plan(), index, body_local=prefix + GLOSSARY["cta"][language])

    with pytest.raises(ValueError) as info:
        worksheet(plan, GLOSSARY)

    message = str(info.value)
    assert f"{index}번" in message and "되번역할 본문이 남지 않습니다" in message and _has_hangul(message)


@pytest.mark.parametrize("language", LANGUAGES)
@pytest.mark.parametrize("bad", ["__missing__", "", "   \n", "。", "​", None, 5], ids=["없음", "빈문자열", "공백", "문장부호", "제로폭", "null", "숫자"])
def test_워크시트는_게시물_언어의_CTA가_용어집에_없거나_비어_있으면_ValueError(language, bad):
    cta = {key: value for key, value in GLOSSARY["cta"].items()}
    if bad == "__missing__":
        del cta[language]
    else:
        cta[language] = bad

    with pytest.raises(ValueError) as info:
        worksheet(_plan(), {**GLOSSARY, "cta": cta})

    assert f"cta.{language}" in str(info.value) and _has_hangul(str(info.value))


def test_워크시트는_용어집에_cta가_통째로_없어도_ValueError():
    with pytest.raises(ValueError):
        worksheet(_plan(), {})


def test_워크시트는_한국어_CTA를_쓰지_않으므로_없어도_된다():
    cta = {language: GLOSSARY["cta"][language] for language in LANGUAGES}

    assert worksheet(_plan(), {"cta": cta}) == worksheet(_plan(), GLOSSARY)


def test_워크시트에는_한국어_원문이_들어_있지_않다():
    # 되번역을 하는 세션이 원문을 보면 베끼기만 하고 되번역이 아니게 된다. 독립성이 이 대조의 전부다.
    plan = _plan()

    dumped = json.dumps(worksheet(plan, GLOSSARY), ensure_ascii=False)

    for post in plan.posts:
        for line in post.source_ko.splitlines():  # 줄바꿈은 JSON에서 `\n`으로 바뀌므로 줄 단위로 찾는다
            if line.strip():
                assert line not in dumped


def test_워크시트의_back_ko는_모두_비어_있다():
    assert {entry["back_ko"] for entry in worksheet(_plan(), GLOSSARY)["entries"]} == {""}


def test_워크시트는_본문마다_짧은_body_hash를_적는다():
    plan = _plan()

    hashes = [entry["body_hash"] for entry in worksheet(plan, GLOSSARY)["entries"]]

    assert all(isinstance(h, str) and len(h) == 12 and set(h) <= set("0123456789abcdef") for h in hashes)
    assert len(set(hashes)) == 6  # 본문이 모두 다르다
    assert hashes == [entry["body_hash"] for entry in worksheet(plan, GLOSSARY)["entries"]]  # 같은 본문은 같은 해시


def test_body_hash는_CTA를_뗀_본문에_대한_것이다():
    plan = _plan()
    before = worksheet(plan, GLOSSARY)["entries"][0]["body_hash"]

    # CTA 뒤의 공백은 본문이 아니다.
    padded = _edit(plan, 0, body_local=plan.posts[0].body_local + "  \n")
    assert worksheet(padded, GLOSSARY)["entries"][0]["body_hash"] == before

    # 본문이 한 글자라도 바뀌면 달라진다.
    changed = _extend_body(plan, 0, "。")
    assert worksheet(changed, GLOSSARY)["entries"][0]["body_hash"] != before
    # 다른 게시물의 해시는 그대로다.
    assert worksheet(changed, GLOSSARY)["entries"][1:] == worksheet(plan, GLOSSARY)["entries"][1:]


def test_워크시트를_JSON으로_쓰고_채워서_load로_읽으면_index별로_돌아온다(tmp_path):
    plan = _plan()
    path = _filled(tmp_path, plan)

    assert load(path) == {post.index: f"{post.index}번 되번역" for post in plan.posts}
    assert load(path, plan=plan, glossary=GLOSSARY) == load(path)


# --- load ---------------------------------------------------------------------


def test_load는_채우지_않은_칸도_빈_문자열로_돌려준다(tmp_path):
    # 비어 있는지 판정하는 것은 validate의 몫이다. 여기서 버리면 빈 칸이 "빠진 게시물"로 둔갑한다.
    path = _write(tmp_path, _sheet_json([{"index": 0, "back_ko": ""}, {"index": 1, "back_ko": "가나다"}]))

    assert load(path) == {0: "", 1: "가나다"}


def test_load는_되번역을_손대지_않고_돌려준다(tmp_path):
    raw = "  유학 안내입니다.\n\n  상담은 무료입니다.\n"

    assert load(_write(tmp_path, _sheet_json([{"index": 0, "back_ko": raw}]))) == {0: raw}


def test_load는_워크시트의_다른_필드를_무시한다(tmp_path):
    entry = {"index": 2, "language": "ne", "body_local": "आ", "body_hash": 5, "back_ko": "되번역", "memo": "무시"}

    assert load(_write(tmp_path, _sheet_json([entry]))) == {2: "되번역"}


def test_load는_중복된_index를_받지_않는다(tmp_path):
    # 뒤의 것이 조용히 이기면 앞에서 채운 되번역이 사라진 줄도 모르고 지나간다.
    entries = [{"index": 0, "back_ko": "가"}, {"index": 1, "back_ko": "나"}, {"index": 1, "back_ko": "다"}]

    message = _load_error(_write(tmp_path, _sheet_json(entries)))

    assert "중복" in message and "index 1" in message
    assert "entries[1]" in message and "entries[2]" in message


def test_load는_값이_같아도_중복된_index를_받지_않는다(tmp_path):
    entries = [{"index": 3, "back_ko": "같은 값"}, {"index": 3, "back_ko": "같은 값"}]

    assert "중복" in _load_error(_write(tmp_path, _sheet_json(entries)))


@pytest.mark.parametrize(
    "index",
    ["0", 1.0, True, None, [0]],
    ids=["문자열", "실수", "불리언", "null", "목록"],
)
def test_load는_정수가_아닌_index를_받지_않는다(tmp_path, index):
    message = _load_error(_write(tmp_path, _sheet_json([{"index": index, "back_ko": "가"}])))

    assert "index" in message and "entries[0]" in message and _has_hangul(message)


def test_load는_index가_없는_항목을_받지_않는다(tmp_path):
    message = _load_error(_write(tmp_path, _sheet_json([{"back_ko": "가"}])))

    assert "index" in message and "entries[0]" in message


@pytest.mark.parametrize("back_ko", [None, 5, ["가"], {"a": 1}], ids=["null", "숫자", "목록", "객체"])
def test_load는_문자열이_아닌_back_ko를_받지_않는다(tmp_path, back_ko):
    message = _load_error(_write(tmp_path, _sheet_json([{"index": 0, "back_ko": back_ko}])))

    assert "back_ko" in message and "entries[0]" in message and _has_hangul(message)


def test_load는_back_ko_칸이_아예_없는_항목을_받지_않는다(tmp_path):
    message = _load_error(_write(tmp_path, _sheet_json([{"index": 0}])))

    assert "back_ko" in message and "entries[0]" in message


@pytest.mark.parametrize(
    "content",
    [
        "이건 JSON이 아니다",
        "[]",
        '"문자열"',
        '{"month": "2026-11"}',
        '{"month": "2026-11", "entries": {}}',
        '{"month": "2026-11", "entries": "없음"}',
        '{"month": "2026-11", "entries": [1]}',
        '{"month": "2026-11", "entries": [[0, "가"]]}',
    ],
    ids=["JSON아님", "최상위가목록", "최상위가문자열", "entries없음", "entries가객체", "entries가문자열", "항목이숫자", "항목이목록"],
)
def test_load는_워크시트_모양이_아니면_한국어_오류로_멈춘다(tmp_path, content):
    path = _write(tmp_path, content)

    message = _load_error(path)

    assert _has_hangul(message) and str(path) in message


def test_load는_빈_entries는_빈_결과로_돌려준다(tmp_path):
    # 빠진 게시물을 알리는 것은 validate의 몫이다(게시물마다 `역번역누락`).
    assert load(_write(tmp_path, _sheet_json([]))) == {}


def test_load는_없는_파일에_한국어_오류로_멈춘다(tmp_path):
    missing = tmp_path / "없는-워크시트.json"

    message = _load_error(missing)

    assert "찾을 수 없습니다" in message and str(missing) in message


def test_load는_읽을_수_없는_경로에_한국어_오류로_멈춘다(tmp_path):
    message = _load_error(tmp_path)  # 폴더

    assert _has_hangul(message) and str(tmp_path) in message


def test_load는_UTF8이_아닌_파일에_한국어_오류로_멈춘다(tmp_path):
    message = _load_error(_write(tmp_path, b"\xff\xfe\x00\x80"))

    assert "UTF-8" in message


# --- load: 낡은 워크시트 ----------------------------------------------------------


def test_load는_본문이_바뀐_워크시트를_거부한다(tmp_path):
    plan = _plan()
    path = _filled(tmp_path, plan)
    assert load(path, plan=plan, glossary=GLOSSARY)  # 본문이 그대로면 읽힌다

    edited = _extend_body(plan, 4, "추가 안내입니다.")
    with pytest.raises(WorksheetError) as info:
        load(path, plan=edited, glossary=GLOSSARY)

    message = str(info.value)
    assert "게시물: 4번" in message and _has_hangul(message) and str(path) in message
    assert load(path) == {post.index: f"{post.index}번 되번역" for post in plan.posts}  # 플랜을 안 넘기면 확인하지 않는다


def test_load는_다른_달의_워크시트를_거부한다(tmp_path):
    # 지난달 워크시트다: 번호는 겹쳐서 `역번역플랜밖`이 나지 않고, 본문도 달라서 달을 먼저 보지 않으면 `body_hash`가 먼저
    # 걸려 "4번 본문이 바뀌었다"로 오진한다.
    plan = _plan()
    last_month = dataclasses.replace(_extend_body(plan, 4, "지난달 안내입니다."), month="2026-10")
    path = _filled(tmp_path, last_month)
    assert load(path, plan=last_month, glossary=GLOSSARY)  # 같은 달 같은 본문이면 읽힌다

    with pytest.raises(WorksheetError) as info:
        load(path, plan=plan, glossary=GLOSSARY)

    message = str(info.value)
    assert "2026-10" in message and "2026-11" in message and "다른 달" in message and _has_hangul(message)
    assert "바뀐" not in message  # 본문이 바뀌었다고 오진하지 않는다
    assert load(path) == {post.index: f"{post.index}번 되번역" for post in plan.posts}  # 플랜을 안 넘기면 달을 보지 않는다


@pytest.mark.parametrize("month", [None, 202611, ["2026-11"], ""], ids=["없음", "숫자", "목록", "빈문자열"])
def test_load는_month가_없거나_문자열이_아닌_워크시트를_플랜과_맞출_수_없어_거부한다(tmp_path, month):
    plan = _plan()
    raw = {"entries": [{"index": 0, "back_ko": "가", "body_hash": "000000000000"}]}
    if month is not None:
        raw["month"] = month
    path = _write(tmp_path, json.dumps(raw, ensure_ascii=False))

    with pytest.raises(WorksheetError) as info:
        load(path, plan=plan, glossary=GLOSSARY)

    assert "2026-11" in str(info.value) and "month" in str(info.value)


def test_load는_본문이_바뀐_게시물을_전부_댄다(tmp_path):
    plan = _plan()
    path = _filled(tmp_path, plan)
    edited = _extend_body(_extend_body(plan, 4, "가"), 1, "나")

    with pytest.raises(WorksheetError) as info:
        load(path, plan=edited, glossary=GLOSSARY)

    assert "게시물: 1, 4번" in str(info.value)


def test_load는_CTA_뒤의_공백만_바뀐_본문은_바뀐_것으로_보지_않는다(tmp_path):
    plan = _plan()
    path = _filled(tmp_path, plan)
    padded = _edit(plan, 2, body_local=plan.posts[2].body_local + "\n")

    assert load(path, plan=padded, glossary=GLOSSARY) == load(path)


@pytest.mark.parametrize("hash_value", [None, 5, ""], ids=["칸없음", "숫자", "빈문자열"])
def test_load는_body_hash가_없거나_이상한_항목을_확인할_수_없으므로_거부한다(tmp_path, hash_value):
    plan = _plan()
    path = _filled(tmp_path, plan, drop_hash=(2,), hash_value=hash_value)

    with pytest.raises(WorksheetError) as info:
        load(path, plan=plan, glossary=GLOSSARY)

    message = str(info.value)
    assert "body_hash가 없어 본문이 그대로인지 확인할 수 없는 게시물: 2번" in message
    # 명시적으로 `None`을 넘겨도 확인하지 않으므로 같은 파일이 그대로 읽힌다(`body_hash`를 읽지도 않는다).
    expected = {post.index: f"{post.index}번 되번역" for post in plan.posts}
    assert load(path) == expected
    assert load(path, plan=None, glossary=None) == expected


def test_load는_바뀐_본문과_body_hash_없는_항목을_함께_알린다(tmp_path):
    plan = _plan()
    path = _filled(tmp_path, plan, drop_hash=(5,))

    with pytest.raises(WorksheetError) as info:
        load(path, plan=_extend_body(plan, 0, "가"), glossary=GLOSSARY)

    assert "게시물: 0번" in str(info.value) and "게시물: 5번" in str(info.value)


@pytest.mark.parametrize("only", ["plan", "glossary"])
def test_load는_plan과_glossary_중_하나만_넘기면_ValueError(tmp_path, only):
    # 하나만 받고 조용히 확인을 건너뛰면 낡은 워크시트가 그냥 지나간다.
    path = _filled(tmp_path, _plan())
    kwargs = {"plan": _plan()} if only == "plan" else {"glossary": GLOSSARY}

    with pytest.raises(ValueError) as info:
        load(path, **kwargs)

    assert "plan" in str(info.value) and "glossary" in str(info.value) and _has_hangul(str(info.value))


def test_load는_플랜에_없는_번호의_항목은_해시를_보지_않고_그대로_돌려준다(tmp_path):
    # 플랜에 없는 번호는 `validate_backtranslation`이 `역번역플랜밖`으로 보고한다.
    plan = _plan()
    entries = [{"index": 99, "back_ko": "가", "body_hash": "000000000000"}]

    assert load(_write(tmp_path, _sheet_json(entries)), plan=plan, glossary=GLOSSARY) == {99: "가"}


def test_load는_플랜에_없는_게시물의_항목이_없어도_멈추지_않는다(tmp_path):
    # 항목이 빠진 게시물은 `validate_backtranslation`이 `역번역누락`으로 보고한다.
    plan = _plan()
    path = _write(tmp_path, _sheet_json([worksheet(plan, GLOSSARY)["entries"][0]]))

    assert load(path, plan=plan, glossary=GLOSSARY) == {0: ""}


def test_load는_확인하려는_플랜의_본문이_CTA로_끝나지_않으면_ValueError(tmp_path):
    plan = _plan()
    path = _filled(tmp_path, plan)
    broken = _edit(plan, 1, body_local="CTA 없는 본문")

    with pytest.raises(ValueError):
        load(path, plan=broken, glossary=GLOSSARY)


# --- divergence ---------------------------------------------------------------

_LONG_POOL = "유학은전문대이상의교육기관또는학술연구에서정규과의을받거나특하려사람위한체류자격입니다"


def _long_pair() -> tuple[str, str]:
    """390자짜리 글과, 거기서 여섯 글자만 바꾼 글. 반복되지 않는 결정적 수열이라 환경과 무관하다."""
    x = 12345
    chars = []
    for _ in range(390):
        x = (x * 1103515245 + 12345) % (2**31)
        chars.append(_LONG_POOL[(x >> 16) % len(_LONG_POOL)])
    original = "".join(chars)
    edited = list(original)
    for position in (40, 90, 150, 210, 270, 330):
        edited[position] = "숫"
    return original, "".join(edited)


# 인자 순서를 바꾸면 `SequenceMatcher.ratio()`가 달라지는 쌍(아래 테스트가 그 전제를 직접 확인한다).
_ASYMMETRIC_PAIR = ("아마가라나", "바마마다가아")


def test_divergence는_0과_1_사이():
    source = _plan().posts[3].source_ko
    pairs = [
        (source, source),
        (source, PARAPHRASE_3),
        (source, UNRELATED),
        (source, ""),
        ("", source),
        ("", ""),
        ("가", "나"),
        ("가", "가나다라마바사"),
        ("가나다라마바사", "가"),
        ("...", "!!!"),
        _ASYMMETRIC_PAIR,
        _long_pair(),
    ]

    for a, b in pairs:
        value = divergence(a, b)
        assert isinstance(value, float)
        assert 0.0 <= value <= 1.0, (a[:20], b[:20], value)


def test_divergence는_같은_글이면_정확히_0이다():
    source = _plan().posts[0].source_ko
    long_text = _long_pair()[0]

    assert divergence(source, source) == 0.0
    assert divergence("", "") == 0.0
    assert divergence(long_text, long_text) == 0.0


def test_divergence는_하나도_겹치지_않으면_1이다():
    assert divergence("가나다", "xyz") == 1.0
    assert divergence("가나다", "") == 1.0
    assert divergence("", "가나다") == 1.0


def test_divergence는_인자_순서와_무관하다():
    # `SequenceMatcher.ratio()`는 대칭이 아니다 — 같은 두 글도 인자 순서에 따라 값이 다르다.
    a, b = _ASYMMETRIC_PAIR
    assert difflib.SequenceMatcher(None, a, b).ratio() != difflib.SequenceMatcher(None, b, a).ratio()

    source = _plan().posts[3].source_ko
    pairs = [_ASYMMETRIC_PAIR, (source, PARAPHRASE_3), (source, UNRELATED), (source, "전주기전대학"), _long_pair()]
    for a, b in pairs:
        assert divergence(a, b) == divergence(b, a), (a[:20], b[:20])


def test_divergence는_긴_글에서도_작은_수정을_작게_본다():
    # 글자 종류가 적은 200자 넘는 글에서 기본 설정의 `SequenceMatcher`는 자주 나오는 글자를 버려 거의 같은 글도 크게 다르다고 한다.
    original, edited = _long_pair()
    assert len(original) >= 200
    assert 1.0 - difflib.SequenceMatcher(None, original, edited).ratio() > 0.5  # 기본 설정이 틀리는 쌍이다

    assert divergence(original, edited) < 0.05


def test_divergence는_공백과_줄바꿈과_문장부호를_무시한다():
    a = "상담은 무료입니다.\n\n궁금한 점이 있으면, 메시지를 보내 주세요!"
    b = "상담은    무료입니다 궁금한 점이 있으면 메시지를 보내 주세요"

    assert divergence(a, b) == 0.0


def test_divergence는_전각_공백과_한자_문장부호도_무시한다():
    assert divergence("상담은　무료입니다。", "상담은 무료입니다") == 0.0


def test_divergence는_보이지_않는_서식_문자를_무시한다():
    assert divergence("상담은 무​료입니다", "상담은 무료입니다") == 0.0


def test_divergence는_같은_한글의_NFC와_NFD_표기를_같게_본다():
    text = "유학(D-2) 비자 안내입니다"

    assert divergence(unicodedata.normalize("NFD", text), unicodedata.normalize("NFC", text)) == 0.0


def test_divergence는_대소문자를_무시한다():
    assert divergence("유학 D-2 안내", "유학 d-2 안내") == 0.0


def test_divergence는_낱말_사이_공백을_지우지_않고_하나로_접는다():
    # 결정: 공백은 하나로 접을 뿐 지우지 않는다. 띄어쓰기 한 칸 차이는 조금 남는다. 바꾸려면 이 테스트도 바꾼다.
    assert 0.0 < divergence("상담은 무료입니다", "상담은무료입니다") < 0.1


def test_divergence는_낱말이_달라지면_0보다_크다():
    assert divergence("상담은 무료입니다", "상담은 유료입니다") > 0.0


# --- validate_backtranslation: 정상 --------------------------------------------


def test_거의_같은_문장이면_findings가_비어_있다():
    plan = _plan()
    back = {**_faithful(plan), 0: PARAPHRASE_0, 3: PARAPHRASE_3}

    assert _check(plan, back) == []


def test_원문에서_CTA만_뗀_되번역은_findings가_비어_있다():
    plan = _plan()

    assert _check(plan, _faithful(plan)) == []


# --- validate_backtranslation: 차이 --------------------------------------------


def test_차이가_임계값을_넘으면_경고():
    plan = _plan()
    back = {**_faithful(plan), 0: UNRELATED}

    findings = _check(plan, back)

    assert _brief(findings) == [(0, "역번역차이", "warning")]
    assert findings[0].severity == "warning"
    assert findings[0].code == "역번역차이"
    assert "0.45" in findings[0].message and _has_hangul(findings[0].message)


def test_임계값은_넘을_때만_경고하고_같으면_경고하지_않는다():
    plan = _edit(_plan(), 0, source_ko="유학 비자 안내")  # CTA가 없는 원문이라 떼어 낼 것이 없다
    back = {**_faithful(plan), 0: "유학 안내"}
    measured = divergence("유학 비자 안내", "유학 안내")
    assert 0.0 < measured < 0.45

    assert _check(plan, back, threshold=measured) == []
    assert _brief(_check(plan, back, threshold=measured - 1e-9)) == [(0, "역번역차이", "warning")]


def test_임계값을_낮추면_가벼운_의역도_경고한다():
    plan = _plan()
    back = {**_faithful(plan), 0: PARAPHRASE_0, 3: PARAPHRASE_3}

    assert _check(plan, back) == []
    assert _brief(_check(plan, back, threshold=0.05)) == [(0, "역번역차이", "warning"), (3, "역번역차이", "warning")]


def test_임계값_0은_글자가_하나라도_다르면_경고한다():
    plan = _plan()
    back = {**_faithful(plan), 0: PARAPHRASE_0}

    assert _brief(_check(plan, back, threshold=0.0)) == [(0, "역번역차이", "warning")]


def test_현지어_본문이_아니라_한국어_원문과_대조한다():
    plan = _plan()
    # 현지어 본문을 어떻게 고쳐도 한국어 원문과 같은 되번역이면 차이가 없다.
    assert _check(_edit(plan, 0, body_local="전혀 다른 본문입니다."), _faithful(plan)) == []

    # 되번역이라며 현지어 본문을 그대로 돌려주면 한국어 원문과 전혀 다르다.
    echoed = {post.index: post.body_local for post in plan.posts}
    differs = {f.post_index for f in _check(plan, echoed) if f.code == "역번역차이"}
    assert differs == set(range(6))


def test_원문의_CTA를_떼고_재므로_본문이_같은_되번역은_차이가_없다():
    # 되번역에는 CTA가 없다(워크시트가 뗐다). 원문의 CTA를 떼지 않으면 그 분량만큼 벌어진 것으로 나온다.
    plan = _edit(_plan(), 0, source_ko="유학 비자 안내입니다.\n\n" + CTA)
    back = {**_faithful(plan), 0: "유학 비자 안내입니다."}
    assert divergence(plan.posts[0].source_ko, back[0]) > 0.45  # 원문의 CTA를 떼지 않으면 걸린다

    assert _check(plan, back) == []


def test_원문의_CTA_뒤에_공백이_있어도_뗀다():
    # `validate_copy`는 CTA 뒤의 공백을 무시하고 끝을 본다. 같은 기준으로 뗀다.
    plan = _edit(_plan(), 0, source_ko="유학 비자 안내입니다.\n\n" + CTA + "  \n\n")
    back = {**_faithful(plan), 0: "유학 비자 안내입니다."}

    assert _check(plan, back) == []


def test_CTA가_원문의_끝이_아니면_떼지_않는다():
    plan = _edit(_plan(), 0, source_ko=CTA + "\n\n유학 비자 안내입니다.")
    back = {**_faithful(plan), 0: "유학 비자 안내입니다."}

    assert _brief(_check(plan, back)) == [(0, "역번역차이", "warning")]


def test_되번역에_CTA가_남아_있으면_떼지_않고_차이로_잡는다():
    # 되번역에서 CTA를 떼는 일은 없다. 워크시트가 CTA 없이 내보내므로 CTA가 있다면 채우는 쪽이 덧붙인 것이다.
    plan = _edit(_plan(), 0, source_ko="유학 비자 안내입니다.\n\n" + CTA)
    back = {**_faithful(plan), 0: "유학 비자 안내입니다.\n\n" + CTA}

    assert _brief(_check(plan, back)) == [(0, "역번역차이", "warning")]


# --- validate_backtranslation: 숫자 --------------------------------------------


def test_되번역의_숫자가_원문과_다르면_오류():
    plan = _plan()
    changed = _faithful(plan)[3].replace("6,800,000", "3,800,000")
    assert 0.0 < divergence(plan.posts[3].source_ko, changed) < 0.45  # 글자만 보면 놓치는 변경이다

    findings = _check(plan, {**_faithful(plan), 3: changed})

    assert _brief(findings) == [(3, "역번역수치", "error")]
    message = findings[0].message
    assert findings[0].severity == "error" and findings[0].code == "역번역수치"
    assert "원문에만 있는 숫자: 6800000" in message and "역번역에만 있는 숫자: 3800000" in message
    assert "3번" in message and _has_hangul(message)


def test_숫자는_낱자가_아니라_숫자열로_견준다():
    plan = _edit(_plan(), 0, source_ko="주 20시간 일합니다.\n\n" + CTA)  # 20과 02는 같은 낱자 {0, 2}로 이뤄진다
    back = {**_faithful(plan), 0: "주 02시간 일합니다."}

    findings = _check(plan, back)

    assert _brief(findings) == [(0, "역번역수치", "error")]
    assert "원문에만 있는 숫자: 20" in findings[0].message and "역번역에만 있는 숫자: 02" in findings[0].message


def test_숫자는_개수까지_견준다():
    plan = _edit(_plan(), 0, source_ko="1일 1회 상담합니다.\n\n" + CTA)
    back = {**_faithful(plan), 0: "1일 상담합니다."}

    findings = _check(plan, back)

    assert _brief(findings) == [(0, "역번역수치", "error")]
    assert "원문에만 있는 숫자: 1" in findings[0].message and "역번역에만" not in findings[0].message


def test_같은_숫자가_여러_번_다르면_횟수를_적는다():
    plan = _edit(_plan(), 0, source_ko="7일, 7일, 7일 연속입니다.\n\n" + CTA)
    back = {**_faithful(plan), 0: "연속입니다."}

    assert "7(3번)" in _check(plan, back)[0].message


def test_숫자가_같은데_순서가_다르면_경고():
    plan = _edit(_plan(), 0, source_ko="마감은 11월 5일입니다.\n\n" + CTA)
    back = {**_faithful(plan), 0: "마감은 5월 11일입니다."}
    assert 0.0 < divergence("마감은 11월 5일입니다.", back[0]) < 0.45  # 글자만 보면 놓치는 변경이다

    findings = _check(plan, back)

    assert _brief(findings) == [(0, "역번역수치순서", "warning")]  # 종류와 개수가 같으므로 `역번역수치`는 아니다
    assert "11 → 5" in findings[0].message and "5 → 11" in findings[0].message and _has_hangul(findings[0].message)


@pytest.mark.parametrize(
    ("source", "back"),
    [
        ("마감은 11월 5일입니다.", "마감은 5월 11일입니다."),
        ("소요 시간은 1.5시간입니다.", "소요 시간은 5.1시간입니다."),
        ("마감일은 2026-11-05입니다.", "마감일은 2026-05-11입니다."),
        ("1일 1회, 2일 안내", "1일 2회, 1일 안내"),
        ("20시간, 3일 근무합니다.", "3일, 20시간 근무합니다."),
    ],
    ids=["월일", "소수", "ISO날짜", "겹치는숫자", "순서만바뀜"],
)
def test_숫자열의_순서만_다르면_오류가_아니라_경고(source, back):
    plan = _edit(_plan(), 0, source_ko=source + "\n\n" + CTA)

    findings = _check(plan, {**_faithful(plan), 0: back})

    assert [(f.code, f.severity) for f in findings] == [("역번역수치순서", "warning")]


def test_숫자열이_다르면_순서_경고를_함께_내지_않는다():
    plan = _edit(_plan(), 0, source_ko="마감은 11월 5일입니다.\n\n" + CTA)

    findings = _check(plan, {**_faithful(plan), 0: "마감은 5월 12일입니다."})

    assert [(f.code, f.severity) for f in findings] == [("역번역수치", "error")]


def test_숫자열과_순서가_모두_같으면_순서_경고가_없다():
    plan = _edit(_plan(), 0, source_ko="마감은 11월 5일입니다.\n\n" + CTA)

    assert _check(plan, {**_faithful(plan), 0: "마감은 11월 5일까지입니다."}) == []


def test_천_단위_쉼표는_지우고_견준다():
    plan = _edit(_plan(), 0, source_ko="등록금은 6,800,000원입니다.\n\n" + CTA)

    assert _check(plan, {**_faithful(plan), 0: "등록금은 6800000원입니다."}) == []
    plan = _edit(_plan(), 0, source_ko="등록금은 6800000원입니다.\n\n" + CTA)
    assert _check(plan, {**_faithful(plan), 0: "등록금은 6,800,000원입니다."}) == []


def test_세_자리씩_끊긴_쉼표가_아니면_숫자_사이의_쉼표를_지우지_않는다():
    # `1,2,3`은 숫자 셋이다. 쉼표를 전부 지우면 `123`과 같아져 숫자가 바뀐 것을 놓친다.
    plan = _edit(_plan(), 0, source_ko="1,2,3번 창구입니다.\n\n" + CTA)

    assert _brief(_check(plan, {**_faithful(plan), 0: "123번 창구입니다."})) == [(0, "역번역수치", "error")]


@pytest.mark.parametrize(
    "written",
    ["２０시간", "२०시간", "၂၀시간"],
    ids=["전각", "데바나가리", "미얀마"],
)
def test_다른_글자체의_숫자도_같은_숫자로_본다(written):
    # 되번역이 현지어 숫자를 그대로 가져와도 같은 수면 오류가 아니다.
    plan = _edit(_plan(), 0, source_ko="주 20시간 일합니다.\n\n" + CTA)

    assert _check(plan, {**_faithful(plan), 0: f"주 {written} 일합니다."}) == []


def test_다른_글자체의_숫자에도_천_단위_쉼표를_지운다():
    plan = _edit(_plan(), 0, source_ko="등록금은 6,800,000원입니다.\n\n" + CTA)

    assert _check(plan, {**_faithful(plan), 0: "등록금은 ६,८००,०००원입니다."}) == []


def test_원문의_CTA에_숫자가_있어도_본문의_숫자_차이를_가리지_못한다():
    # CTA에 `24`가 있고 되번역이 지어낸 `24`를 덧붙이면, CTA를 떼기 전의 원문 숫자열과 우연히 같아진다.
    glossary = {"cta": {"ko": "상담은 24시간 열려 있습니다. 메시지를 보내 주세요."}}
    plan = _plan()
    plan = dataclasses.replace(
        plan, posts=(dataclasses.replace(plan.posts[0], source_ko="주 20시간 근무 안내입니다.\n\n" + glossary["cta"]["ko"]),)
    )
    back = {0: "주 20시간 근무 안내입니다. 하루 24시간 지원합니다."}

    findings = _check(plan, back, glossary)

    assert _brief(findings) == [(0, "역번역수치", "error")]
    assert "역번역에만 있는 숫자: 24" in findings[0].message and "원문에만" not in findings[0].message


def test_숫자를_말로_풀어_쓴_되번역은_오류로_잡힌다_알려진_한계():
    # 되번역은 숫자를 숫자로 적어야 한다(채우는 쪽에 주는 지시의 몫). 그렇지 않으면 이 검사는 거짓 양성을 낸다.
    plan = _edit(_plan(), 0, source_ko="주 20시간 일합니다.\n\n" + CTA)

    assert _brief(_check(plan, {**_faithful(plan), 0: "주 이십 시간 일합니다."})) == [(0, "역번역수치", "error")]


def test_단위를_바꿔_쓴_되번역도_오류로_잡힌다_알려진_한계():
    plan = _edit(_plan(), 0, source_ko="등록금은 6,800,000원입니다.\n\n" + CTA)

    assert _brief(_check(plan, {**_faithful(plan), 0: "등록금은 680만 원입니다."})) == [(0, "역번역수치", "error")]


def test_점으로_천_단위를_끊은_숫자는_오류로_잡힌다_알려진_한계():
    # 베트남어 본문의 `6.800.000`을 그대로 옮긴 되번역이다. 점을 천 단위로 읽으면 원문의 `1.234`와 되번역의 `1234`가
    # 같아져 천 배 차이를 놓치므로 일부러 지우지 않는다. 대신 메시지가 이 경우를 알려 주고 다시 하라고 한다.
    plan = _edit(_plan(), 0, source_ko="등록금은 6,800,000원입니다.\n\n" + CTA)

    findings = _check(plan, {**_faithful(plan), 0: "등록금은 6.800.000원입니다."})

    assert _brief(findings) == [(0, "역번역수치", "error")]
    message = findings[0].message
    assert "원문에만 있는 숫자: 6800000" in message and "역번역에만 있는 숫자: 000, 6, 800" in message
    assert "6.800.000" in message and "6,800,000" in message and "다시 되번역하세요" in message


def test_점이_든_숫자의_천_배_차이를_놓치지_않는다():
    # 위의 한계를 없애려고 점을 지우면 생기는 구멍: 원문 `1.234`(소수)와 되번역 `1234`가 같은 수로 읽힌다.
    plan = _edit(_plan(), 0, source_ko="배율은 1.234입니다.\n\n" + CTA)

    assert _brief(_check(plan, {**_faithful(plan), 0: "배율은 1234입니다."})) == [(0, "역번역수치", "error")]


def test_날짜의_앞뒤가_바뀐_되번역은_오류가_아니라_경고만_낸다_알려진_한계():
    # 날짜를 거꾸로 적은 되번역이 게시 전에 막히지 않는다는 뜻이다. 사람이 경고를 보고 확인해야 한다.
    plan = _edit(_plan(), 0, source_ko="신청 마감은 2026-11-05입니다.\n\n" + CTA)

    findings = _check(plan, {**_faithful(plan), 0: "신청 마감은 2026-05-11입니다."})

    assert [f.severity for f in findings] == ["warning"]
    assert findings[0].code == "역번역수치순서"


def test_숫자가_없는_글은_숫자가_없는_되번역과_같다():
    plan = _edit(_plan(), 0, source_ko="유학 비자 안내입니다.\n\n" + CTA)

    assert _check(plan, {**_faithful(plan), 0: "유학 비자 안내입니다."}) == []


def test_숫자_오류와_차이_경고가_같은_게시물에_함께_나오면_오류가_먼저다():
    plan = _plan()
    back = {**_faithful(plan), 3: UNRELATED}

    assert _brief(_check(plan, back)) == [(3, "역번역수치", "error"), (3, "역번역차이", "warning")]


@pytest.mark.parametrize(
    ("back_text", "expected"),
    [
        ("일본 간병 취업비자 5월 12일 시험 접수", ["역번역수치", "역번역차이", "역번역중복"]),
        ("일본 간병 취업비자 5월 11일 시험 접수", ["역번역수치순서", "역번역차이", "역번역중복"]),
    ],
    ids=["수치", "수치순서"],
)
def test_한_게시물의_결과는_수치_수치순서_차이_중복_차례다(back_text, expected):
    source = "마감은 11월 5일입니다. 유학 비자 서류 안내\n\n" + CTA
    plan = _edit(_edit(_plan(), 1, source_ko=source), 2, source_ko=source)
    back = {**_faithful(plan), 1: back_text, 2: back_text}

    findings = [f for f in _check(plan, back) if f.post_index == 2]

    assert [f.code for f in findings] == expected
    assert [f.severity for f in findings] == [("error" if code == "역번역수치" else "warning") for code in expected]


def test_누락되었거나_빈_게시물에는_숫자_오류를_더하지_않는다():
    plan = _plan()
    back = {**_faithful(plan), 3: ""}
    del back[4]

    assert _brief(_check(plan, back)) == [(3, "역번역빈칸", "error"), (4, "역번역누락", "error")]


# --- validate_backtranslation: 누락·빈 칸·플랜 밖 --------------------------------


def test_비어있는_back_ko가_있으면_오류():
    plan = _plan()
    back = {**_faithful(plan), 2: ""}

    findings = _check(plan, back)

    assert _brief(findings) == [(2, "역번역빈칸", "error")]
    assert "2번" in findings[0].message and "back_ko" in findings[0].message


@pytest.mark.parametrize(
    "blank",
    ["   ", "\n\t \n", "　", "...", "-", "。", "​", "﻿ ​"],
    ids=["공백", "줄바꿈과탭", "전각공백", "마침표", "하이픈", "한자마침표", "제로폭공백", "BOM과제로폭"],
)
def test_공백이나_문장부호뿐인_back_ko도_빈_칸으로_본다(blank):
    plan = _plan()
    back = {**_faithful(plan), 1: blank}

    assert _brief(_check(plan, back)) == [(1, "역번역빈칸", "error")]


def test_게시물_하나라도_빠지면_오류():
    plan = _plan()
    back = _faithful(plan)
    del back[4]

    findings = _check(plan, back)

    assert _brief(findings) == [(4, "역번역누락", "error")]
    assert "4번" in findings[0].message


def test_되번역이_하나도_없으면_게시물마다_누락_오류():
    plan = _plan()

    findings = _check(plan, {})

    assert _brief(findings) == [(i, "역번역누락", "error") for i in range(6)]


def test_누락과_빈_칸은_차이_경고를_함께_내지_않는다():
    plan = _plan()
    back = {**_faithful(plan), 0: ""}
    del back[1]

    assert [(f.post_index, f.code) for f in _check(plan, back)] == [(0, "역번역빈칸"), (1, "역번역누락")]


def test_플랜에_없는_번호의_되번역은_오류():
    # 다른 달이나 다른 판의 워크시트가 섞여 들어왔다는 신호다. 조용히 무시하면 낡은 되번역을 믿게 된다.
    plan = _plan()
    back = {**_faithful(plan), 99: "어느 게시물의 것인지 모르는 되번역"}

    findings = _check(plan, back)

    assert _brief(findings) == [(None, "역번역플랜밖", "error")]
    assert "99" in findings[0].message


def test_플랜에_없는_번호가_여럿이면_번호순으로_하나씩_오류():
    plan = _plan()
    back = {**_faithful(plan), 12: "가", 7: "나", -1: "다"}

    findings = _check(plan, back)

    assert [(f.post_index, f.code) for f in findings] == [(None, "역번역플랜밖")] * 3
    for finding, number in zip(findings, ("-1", "7", "12")):
        assert f"번호 {number}" in finding.message


def test_결과는_플랜에_매이지_않은_항목이_먼저이고_그다음_게시물_번호순이다():
    plan = _plan()
    back = {
        **_faithful(plan),
        0: UNRELATED,
        1: " ",
        3: _faithful(plan)[3].replace("6,800,000", "3,800,000"),
        99: "가",
    }
    del back[4]

    findings = _check(plan, back)

    assert _brief(findings) == [
        (None, "역번역플랜밖", "error"),
        (0, "역번역차이", "warning"),
        (1, "역번역빈칸", "error"),
        (3, "역번역수치", "error"),
        (4, "역번역누락", "error"),
    ]


def test_검증은_멈추지_않고_발견한_문제를_전부_모은다():
    plan = _plan()
    back = {0: "", 1: UNRELATED, 2: _faithful(plan)[2], 5: ""}

    codes = [(f.post_index, f.code) for f in _check(plan, back)]

    assert codes == [(0, "역번역빈칸"), (1, "역번역차이"), (3, "역번역누락"), (4, "역번역누락"), (5, "역번역빈칸")]


def test_오류와_경고는_Finding이다():
    findings = _check(_plan(), {})

    assert findings and all(isinstance(f, Finding) for f in findings)


def test_게시물이_없는_플랜도_되번역이_있으면_플랜밖_오류():
    plan = dataclasses.replace(_plan(), posts=())

    assert _brief(_check(plan, {0: "가"})) == [(None, "역번역플랜밖", "error")]
    assert _check(plan, {}) == []


# --- validate_backtranslation: 복사 --------------------------------------------


def _distinct_raw_backs() -> dict[int, str]:
    """픽스처의 여섯 게시물에 대한 충실한 되번역. 같은 소재의 세 개가 서로 다른 문장이다(원문은 셋이 같다)."""
    plan = _raw_plan()
    return {
        0: _faithful(plan)[0],
        1: PARAPHRASE_0,
        2: "유학(D-2) 체류자격은 전문대학 이상 교육기관이나 학술연구기관에서 정규과정 교육을 받거나 특정 연구를 하려는 사람을 위한 것입니다.",
        3: _faithful(plan)[3],
        4: PARAPHRASE_3,
        5: "전주기전대학의 연간 평균 등록금은 6,800,000원입니다(1년치). 이 금액은 전체 학과의 가중평균 공시값이어서 학생 개인이 실제로 내는 금액과 다를 수 있습니다.",
    }


def _duplicates(findings: list[Finding]) -> list[tuple[int | None, str]]:
    return [(f.post_index, f.code) for f in findings if f.code == "역번역중복"]


def test_역번역이_다른_게시물과_똑같으면_경고():
    # 한 소재의 세 게시물은 `source_ko`가 글자까지 같다. 그래서 복사한 되번역은 숫자도 글자 유사도도 통과한다. 같은
    # 입력이 충실한 되번역 셋에서도 나온다(아래 알려진 한계 테스트) — 경고는 "베꼈다"가 아니라 독립된 증거가 없다는 뜻이다.
    plan = _raw_plan()
    assert len({post.source_ko for post in plan.posts[3:]}) == 1
    backs = _distinct_raw_backs()
    assert _check(plan, backs) == []  # 게시물마다 따로 되번역하면 문제가 없다

    findings = _check(plan, {**backs, 4: backs[3], 5: backs[3]})

    # 나중 게시물마다 가장 먼저 같은 것을 적은 3번과 짝지어 하나씩: 4번 -> 3번, 5번 -> 3번. 4번과 5번은 짝짓지 않는다.
    assert _brief(findings) == [(4, "역번역중복", "warning"), (5, "역번역중복", "warning")]
    assert findings[0].severity == "warning" and findings[0].code == "역번역중복"
    assert "3번과 4번" in findings[0].message and "3번과 5번" in findings[1].message
    assert not any("4번과 5번" in f.message for f in findings) and _has_hangul(findings[0].message)
    # 메시지는 충실한 경우와 베낀 경우를 이 화면이 구별하지 못한다고 말하고, 정보를 만드는 한 가지 행동을 일러 준다.
    # 현지어를 읽을 사람은 없으므로 "본문을 읽어 확인하라"고 하지 않는다.
    for finding in findings:
        assert "구별할 수 없" in finding.message and "새 세션" in finding.message and "다시 되번역하세요" in finding.message
        assert "각각 읽어" not in finding.message and "베꼈" not in finding.message
    assert "4번의 현지어 본문 하나만" in findings[0].message and "5번의 현지어 본문 하나만" in findings[1].message


def test_완벽히_충실한_워크시트도_소재마다_역번역중복을_낸다_알려진_한계(tmp_path):
    # 한 소재의 세 원문은 글자까지 같으므로 세 본문이 모두 충실하면 세 되번역이 같아진다. 되번역이 원문을 그대로 되살린
    # 가장 충실한 경우에도 소재마다 2건이 난다. 열 소재 한 달이면 20건이다. 체계적이고, 억제하지 않는다.
    plan = _raw_plan()
    sheet = json.loads(json.dumps(worksheet(plan, GLOSSARY), ensure_ascii=False))
    for entry, post in zip(sheet["entries"], plan.posts):
        entry["back_ko"] = post.source_ko.removesuffix("\n\n" + CTA)
    path = _write(tmp_path, json.dumps(sheet, ensure_ascii=False))

    findings = _check(plan, load(path, plan=plan, glossary=GLOSSARY))

    assert _brief(findings) == [(index, "역번역중복", "warning") for index in (1, 2, 4, 5)]
    for finding, pair in zip(findings, ("0번과 1번", "0번과 2번", "3번과 4번", "3번과 5번")):
        assert pair in finding.message


def test_한_소재_안에서_되번역을_맞바꾸거나_돌려_놓아도_아무것도_나지_않는다_알려진_한계():
    # 서로 다른 충실한 되번역이 그대로 남아 있어 숫자도 글자도 중복도 걸리지 않는다. 현지어 본문을 읽어야 알 수 있다.
    plan = _raw_plan()
    backs = _distinct_raw_backs()
    assert _check(plan, backs) == []

    assert _check(plan, {**backs, 4: backs[5], 5: backs[4]}) == []
    assert _check(plan, {**backs, 0: backs[1], 1: backs[2], 2: backs[0]}) == []


def test_같은_역번역이_많아도_먼저_적은_게시물과만_짝지어_n_1건만_낸다():
    # 한 답을 한 달 치에 복사하면 쌍마다 낼 때 435건이다. 덮어쓴 29건만 나오고 모두 0번과 짝지어진다.
    posts = tuple(dataclasses.replace(_plan().posts[0], index=i) for i in range(30))
    plan = dataclasses.replace(_plan(), posts=posts)
    back = {i: "같은 답입니다." for i in range(30)}

    duplicates = [f for f in _check(plan, back) if f.code == "역번역중복"]

    assert [f.post_index for f in duplicates] == list(range(1, 30))
    assert all(f"게시물 0번과 {f.post_index}번" in f.message for f in duplicates)


def test_역번역중복은_공백과_문장부호와_대소문자를_빼고_견준다():
    plan = _plan()
    back = {**_faithful(plan), 1: "유학(D-2) 비자 안내입니다.", 2: "유학(d-2)  비자 안내입니다!!"}

    assert _duplicates(_check(plan, back)) == [(2, "역번역중복")]


def test_역번역중복은_다른_소재의_게시물_사이에서도_본다():
    plan = _plan()
    back = {**_faithful(plan), 4: _faithful(plan)[1]}

    findings = [f for f in _check(plan, back) if f.code == "역번역중복"]

    assert [(f.post_index, f.severity) for f in findings] == [(4, "warning")]
    assert "1번과 4번" in findings[0].message


def test_역번역중복은_이웃하지_않은_게시물_사이에서도_본다():
    plan = _plan()
    back = {**_faithful(plan), 2: _faithful(plan)[0]}

    findings = [f for f in _check(plan, back) if f.code == "역번역중복"]

    assert [f.post_index for f in findings] == [2] and "0번과 2번" in findings[0].message


def test_역번역중복은_글자가_다르면_내지_않는다():
    plan = _plan()

    assert _duplicates(_check(plan, {**_faithful(plan), 2: _faithful(plan)[0] + " 안내"})) == []


def test_역번역중복은_비었거나_없는_되번역끼리는_견주지_않는다():
    plan = _plan()
    back = {**_faithful(plan), 1: "", 2: "  ", 5: "..."}
    del back[4]

    findings = _check(plan, back)

    assert _brief(findings) == [
        (1, "역번역빈칸", "error"),
        (2, "역번역빈칸", "error"),
        (4, "역번역누락", "error"),
        (5, "역번역빈칸", "error"),
    ]


# --- validate_backtranslation: 입력 가드 ----------------------------------------


@pytest.mark.parametrize(
    "glossary",
    [
        {},
        {"cta": {}},
        {"cta": {"vi": "x"}},
        {"cta": {"ko": ""}},
        {"cta": {"ko": "   \n"}},
        {"cta": {"ko": "。"}},
        {"cta": {"ko": "​"}},
        {"cta": {"ko": None}},
        {"cta": {"ko": 5}},
        {"cta": "상담은 무료입니다."},
        {"cta": None},
    ],
    ids=["용어집비어있음", "cta비어있음", "ko없음", "ko빈문자열", "ko공백", "ko문장부호", "ko제로폭", "ko_null", "ko숫자", "cta문자열", "cta_null"],
)
def test_CTA가_없거나_비어_있으면_ValueError(glossary):
    # 빈 CTA는 "끝이 같은가"가 늘 참이고 떼어 낼 것이 없어, CTA를 떼는 단계가 조용히 꺼진다.
    with pytest.raises(ValueError) as info:
        _check(_plan(), _faithful(_plan()), glossary)

    assert "cta.ko" in str(info.value) and _has_hangul(str(info.value))


def test_용어집에_ko_CTA만_있어도_된다():
    # 다른 언어·다른 용어는 이 검증이 쓰지 않는다. `validate_copy`의 용어집 가드와 달리 전부 요구하지 않는다.
    plan = _plan()

    assert _check(plan, _faithful(plan), {"cta": {"ko": CTA}}) == []


def test_CTA_가드는_플랜에_게시물이_없어도_작동한다():
    plan = dataclasses.replace(_plan(), posts=())

    with pytest.raises(ValueError):
        _check(plan, {}, {"cta": {"ko": ""}})


@pytest.mark.parametrize("threshold", [-0.1, 1.0, 1.5, 2, float("nan"), float("inf"), float("-inf")])
def test_임계값이_0이상_1미만이_아니면_ValueError(threshold):
    # 1.0 이상이면 어떤 되번역도 경고하지 않아 검사가 조용히 꺼진다.
    with pytest.raises(ValueError) as info:
        _check(_plan(), _faithful(_plan()), threshold=threshold)

    assert "threshold" in str(info.value) and _has_hangul(str(info.value))


@pytest.mark.parametrize(
    "back",
    [{"0": "가"}, {0: None}, {0: 5}, {0: ["가"]}, {True: "가"}, {1.0: "가"}],
    ids=["문자열키", "null값", "숫자값", "목록값", "불리언키", "실수키"],
)
def test_back의_모양이_틀리면_ValueError(back):
    with pytest.raises(ValueError) as info:
        _check(_plan(), back)

    assert "load" in str(info.value) and _has_hangul(str(info.value))


def test_시그니처가_계약과_같다():
    parameters = inspect.signature(validate_backtranslation).parameters

    assert list(parameters) == ["plan", "back", "glossary", "threshold"]
    assert parameters["threshold"].kind is inspect.Parameter.KEYWORD_ONLY
    assert parameters["threshold"].default == 0.45

    assert list(inspect.signature(worksheet).parameters) == ["plan", "glossary"]
    load_parameters = inspect.signature(load).parameters
    assert list(load_parameters) == ["path", "plan", "glossary"]
    assert all(load_parameters[name].kind is inspect.Parameter.KEYWORD_ONLY for name in ("plan", "glossary"))
    assert all(load_parameters[name].default is None for name in ("plan", "glossary"))
