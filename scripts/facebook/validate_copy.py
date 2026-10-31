"""게시물의 문구 검증.

`validate_copy`는 게시물이 **무엇을 말하는지**를 본다: 승인된 상담 문구(CTA)로 끝나는지, 금지 표현이
없는지, 대학 실명이 승인 목록 안에 있고 협력·제휴로 이어지지 않는지, 용어집 표기를 지켰는지, 출처 없는
수치가 없는지, 등록금을 평균·연단위 한정과 함께 쓰는지. 멈추지 않고 발견한 문제를 전부 모아 `Finding`
목록으로 돌려준다. 호출하는 쪽(CLI)이 오류가 하나라도 있으면 다음 단계로 넘기지 않는다.

`load_banned_phrases`는 `validate_copy`가 받는 금지 표현 사전을 읽는다.

원문과 현지어 본문의 뜻이 같은지(역번역 대조)는 여기서 보지 않고, 글자 유사도도 계산하지 않는다.
구조·사실 검증(`validate_structure`·`validate_facts`)은 `validate_structure`에 있다.

결과 순서와 `Finding`의 계약은 `findings`에 있다. `validate_copy`의 검사 순서는
CTA → 금지 표현 → 대학명 → 대학 맥락 → 대학명 후보 → 용어집 → 출처 없는 수치 → 등록금 한정어다.
"""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

from .config import LANGUAGES
from .facts import Fact
from .findings import Finding, _error, _normalize, _ordered, _warning
from .plan_model import Plan, Post


class BannedPhrasesError(Exception):
    """금지 표현 사전 파일의 내용이 규칙에 맞지 않을 때."""


# 사전 파일의 구역 이름. 파일을 고치는 사람이 보는 이름이라 한국어다.
_SECTION_ALWAYS = "모든 게시물"
_SECTION_UNIVERSITY = "대학명이 나오는 게시물"
_SECTIONS = (_SECTION_ALWAYS, _SECTION_UNIVERSITY)
_DICTIONARY_LANGUAGES = ("ko", *LANGUAGES)


def _university_key(language: str) -> str:
    """대학명 구역의 항목은 `vi:대학명`처럼 돌려준다. 모든 게시물 구역은 언어 코드(`vi`) 그대로다."""
    return f"{language}:대학명"


def _banned_keys() -> tuple[str, ...]:
    return (*_DICTIONARY_LANGUAGES, *(_university_key(language) for language in _DICTIONARY_LANGUAGES))


def _compact(text: str) -> str:
    """금지 표현을 대조하려고 표기 차이를 지운다: 대소문자, 띄어쓰기·줄바꿈, 보이지 않는 서식 문자
    (미얀마어 글에 흔한 U+200B 등), 같은 글자의 NFC/NFD 표기.

    사전의 비한국어 문구는 검수를 받지 않았으므로 띄어쓰기 한 칸 차이로 새지 않게 한다. 문구는 이 정규화를
    거친 뒤에도 **통째로** 들어 있어야 걸린다 — 낱말 단위 대조가 아니다.
    """
    squeezed = unicodedata.normalize("NFC", _normalize(text))
    return "".join(ch for ch in squeezed if ch != " " and unicodedata.category(ch) != "Cf")


def _parse_phrases(section: str, language: str, labels: object) -> tuple[str, ...]:
    where = f"금지 표현 사전의 '{section}' > '{language}'"
    if not (isinstance(labels, dict) and labels):
        raise BannedPhrasesError(
            f"{where}에 문구가 하나도 없습니다. 이 언어의 검사가 통째로 사라지므로 "
            f"{{분류: [문구, ...]}} 형태로 하나 이상 적어야 합니다."
        )
    phrases: list[str] = []
    for label, entries in labels.items():
        if not (isinstance(entries, list) and entries):
            raise BannedPhrasesError(f"{where} > '{label}'은(는) 비어 있지 않은 문구 목록이어야 합니다.")
        for entry in entries:
            if not (isinstance(entry, str) and _compact(entry)):
                # 비어 있는 문구는 모든 본문에 들어맞아 게시물 전부를 막는다.
                raise BannedPhrasesError(
                    f"{where} > '{label}'에 문구가 아닌 값이 있습니다: {entry!r} "
                    f"(공백이나 보이지 않는 글자뿐인 문자열도 안 됩니다)."
                )
            phrases.append(entry)
    return tuple(dict.fromkeys(phrases))  # 겹치는 문구는 한 번만, 적은 순서는 그대로


def load_banned_phrases(path: Path) -> dict[str, tuple[str, ...]]:
    """금지 표현 사전을 읽어 `{키: 문구 튜플}`로 돌려준다. 규칙에 어긋나면 `BannedPhrasesError`.

    키는 `ko`·`vi`·`my`·`ne`(모든 게시물에 적용)와 `ko:대학명`·`vi:대학명`·`my:대학명`·`ne:대학명`
    (대학명이 나오는 게시물에만 적용)이다. 파일은 구역 → 언어 → 분류 → 문구 목록이며, 분류는 사람이 읽으라고
    적은 이름이라 여기서 펴서 버린다. 어떤 언어든 문구가 하나도 없으면 그 언어의 검사가 조용히 사라지므로
    읽는 단계에서 멈춘다.
    """
    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError as e:
        raise BannedPhrasesError(f"금지 표현 사전을 찾을 수 없습니다: {path}") from e
    except OSError as e:
        raise BannedPhrasesError(f"금지 표현 사전을 읽을 수 없습니다(경로와 권한을 확인하세요): {path}") from e
    except UnicodeDecodeError as e:
        raise BannedPhrasesError(f"금지 표현 사전이 UTF-8 텍스트가 아닙니다: {path}") from e
    try:
        raw = json.loads(text)
    except json.JSONDecodeError as e:
        raise BannedPhrasesError(f"금지 표현 사전이 올바른 JSON이 아닙니다: {path} ({e})") from e
    if not isinstance(raw, dict):
        raise BannedPhrasesError(
            f"금지 표현 사전의 최상위는 {{구역: {{...}}}} 형태의 객체여야 합니다: {path}"
        )

    missing = [section for section in _SECTIONS if section not in raw]
    unknown = [section for section in raw if section not in _SECTIONS]
    if missing or unknown:
        raise BannedPhrasesError(
            f"금지 표현 사전의 구역이 맞지 않습니다 — 없는 구역: {missing or '없음'}, "
            f"알 수 없는 구역: {unknown or '없음'} (필요한 구역: {', '.join(_SECTIONS)})."
        )

    always = _read_section(raw, _SECTION_ALWAYS)
    university = _read_section(raw, _SECTION_UNIVERSITY)
    return {**always, **{_university_key(language): phrases for language, phrases in university.items()}}


def _read_section(raw: dict, section: str) -> dict[str, tuple[str, ...]]:
    """사전의 한 구역에서 `{언어: 문구 튜플}`을 읽는다. 언어가 하나라도 빠지거나 낯선 언어가 있으면 멈춘다."""
    by_language = raw[section]
    if not isinstance(by_language, dict):
        raise BannedPhrasesError(f"금지 표현 사전의 '{section}'은(는) {{언어: {{...}}}} 형태의 객체여야 합니다.")
    missing = [language for language in _DICTIONARY_LANGUAGES if language not in by_language]
    unknown = [language for language in by_language if language not in _DICTIONARY_LANGUAGES]
    if missing or unknown:
        raise BannedPhrasesError(
            f"금지 표현 사전의 '{section}'에서 언어가 맞지 않습니다 — 없는 언어: {missing or '없음'}, "
            f"알 수 없는 언어: {unknown or '없음'} (필요한 언어: {', '.join(_DICTIONARY_LANGUAGES)})."
        )
    return {language: _parse_phrases(section, language, by_language[language]) for language in _DICTIONARY_LANGUAGES}


def validate_copy(
    plan: Plan,
    universities: list[dict],
    banned: dict[str, tuple[str, ...]],
    glossary: dict,
    facts: dict[str, Fact],
) -> list[Finding]:
    """게시물이 *무엇을 말하는지* 검사해 문제를 전부 돌려준다.

    - 한국어 원문과 현지어 본문이 모두 승인된 상담 문구(CTA)로 끝나는지 (오류)
    - 금지 표현이 없는지: 원문은 `ko`, 본문은 그 게시물 언어의 사전으로 (오류)
    - `university_names`의 대학이 승인 목록(`universities`의 `name_ko`)에 있고 본문에 그대로 쓰였는지 (오류)
    - 대학명이 나오는 게시물에서 회사가 스스로 협력·제휴를 말하지 않는지: 관계 어휘와 1인칭 표지가 한 문장에 함께 있을 때 (오류)
    - 승인 목록 밖의 `…대학교` 이름이 같은 조건(관계 어휘 + 1인칭 표지가 한 문장)의 글에 있지 않은지 (경고)
    - `D-2`·`D-4`·회사명이 나오면 용어집 표기를 그대로 썼는지 (경고)
    - 원문의 금액·시간·비율 수치가 인용한 사실(`fact_keys`)의 값에 들어 있는지 (경고)
    - 등록금 사실(`tuition_*`)을 쓰는 게시물의 원문에 `평균`과 연단위 표시가 있는지 (오류)

    `banned`는 `load_banned_phrases`가 돌려준 값, `facts`는 `validate_facts`가 받는 것과 같은 사실 모음이다.
    입력이 비어 있으면 검사가 조용히 꺼지므로 `ValueError`로 멈춘다: 항목이 빠진 사전, 비어 있거나 빠진
    용어집 값(`endswith("")`는 늘 참), `name_ko`가 없거나 빈 대학 목록 항목(빈 이름은 모든 본문에 들어맞는다).
    """
    missing = [key for key in _banned_keys() if key not in banned]
    if missing:
        raise ValueError(
            f"금지 표현 사전에 항목이 없습니다: {', '.join(missing)}. load_banned_phrases로 읽은 값을 넘기세요."
        )
    _require_glossary(glossary)
    approved = _approved_names(universities)

    findings: list[Finding] = []
    findings += _check_cta(plan, glossary)
    findings += _check_banned_phrases(plan, banned)
    findings += _check_universities(plan, approved)
    findings += _check_university_context(plan, approved, banned, glossary)
    findings += _check_university_candidates(plan, approved, banned, glossary)
    findings += _check_glossary_terms(plan, glossary)
    findings += _check_unsourced_figures(plan, facts)
    findings += _check_tuition_qualifier(plan)
    return _ordered(findings)


def _require_glossary(glossary: dict) -> None:
    """CTA와 용어집 토큰 항목이 `ko`와 모든 게시 언어에서 비어 있지 않은 문자열인지 본다.

    빈 문자열은 `text.endswith("")`가 늘 참이고 `"" not in text`가 늘 거짓이라 CTA·용어집 검사를 조용히 끈다.
    """
    problems = []
    for key in ("cta", *(token_key for token_key, _ in _GLOSSARY_TOKENS)):
        entry = glossary.get(key)
        for language in _DICTIONARY_LANGUAGES:
            if not (isinstance(entry, dict) and _non_blank(entry.get(language))):
                problems.append(f"{key}.{language}")
    if problems:
        raise ValueError(
            f"용어집에 없거나 비어 있는 값이 있습니다: {', '.join(problems)}. 빈 값은 CTA·용어집 검사를 조용히 꺼 "
            f"버리므로 검증을 멈춥니다. glossary.json을 고치세요."
        )


def _approved_names(universities: list[dict]) -> tuple[str, ...]:
    """승인된 대학의 한국어 이름들. `name_ko`가 없거나 비면 멈춘다 — 빈 이름은 모든 본문에 들어맞는다."""
    names = [entry.get("name_ko") if isinstance(entry, dict) else None for entry in universities]
    bad = [str(position) for position, name in enumerate(names) if not _non_blank(name)]
    if bad:
        raise ValueError(
            f"대학 목록(universities.json)의 {', '.join(bad)}번째(0부터) 항목에 name_ko가 없거나 비어 있습니다. "
            f"빈 이름은 모든 본문에 들어맞아 모든 게시물을 대학명이 나오는 글로 만듭니다."
        )
    return tuple(names)


def _non_blank(value: object) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _check_cta(plan: Plan, glossary: dict) -> list[Finding]:
    """한국어 원문과 현지어 본문이 각자 언어의 승인된 CTA로 **끝나는지** 본다(뒤쪽 공백은 무시).

    원문에도 요구하는 이유: 역번역 대조는 현지어 본문을 한국어로 되번역해 원문과 견주는데, CTA가 한쪽에만
    있으면 모든 게시물의 차이가 같은 분량만큼 부풀어 임계값이 의미를 잃는다.
    """
    findings: list[Finding] = []
    for post in plan.posts:
        for side, text, language in (
            ("현지어 본문(body_local)", post.body_local, post.language),
            ("한국어 원문(source_ko)", post.source_ko, "ko"),
        ):
            cta = glossary["cta"][language]
            if not text.rstrip().endswith(cta):
                findings.append(_error(
                    "CTA없음", post.index,
                    f"{side}이(가) 승인된 상담 문구로 끝나지 않습니다. 맨 끝에 다음 문구를 그대로 두세요: {cta}",
                ))
    return findings


def _is_acronym(phrase: str) -> bool:
    """`MOU`처럼 알파벳 대문자뿐인 약어."""
    return phrase.isascii() and phrase.isalpha() and phrase.isupper()


def _acronym_pattern(phrase: str) -> re.Pattern[str]:
    """영문 약어를 알파벳 낱말로 찾는 정규식. 글자 사이의 공백·점(`M O U`, `M.O.U.`)은 허용한다."""
    letters = r"[\s.]*".join(re.escape(letter) for letter in phrase)
    return re.compile(rf"(?<![A-Za-z]){letters}(?![A-Za-z])")


def _hits(text: str, phrases: tuple[str, ...]) -> list[str]:
    """`text`에 통째로 들어 있는 `phrases`의 문구들(사전 순서). 표기 차이는 `_compact`가 지운다.

    영문 약어(`MOU`)만 예외로, 대소문자를 구분하고 알파벳 낱말로 떨어져 있을 때만 찾는다 — 띄어쓰기를 지우고
    소문자로 보면 `nhóm oung`의 `m ou`에도 걸린다. 글자 사이의 공백·점과 전각(`ＭＯＵ`)은 같은 약어로 본다.
    """
    haystack = _compact(text)
    cased = "".join(ch for ch in unicodedata.normalize("NFKC", text) if unicodedata.category(ch) != "Cf")
    found = []
    for phrase in phrases:
        if _is_acronym(phrase):
            matched = _acronym_pattern(phrase).search(cased) is not None
        else:
            matched = _compact(phrase) in haystack
        if matched:
            found.append(phrase)
    return found


def _check_banned_phrases(plan: Plan, banned: dict[str, tuple[str, ...]]) -> list[Finding]:
    findings: list[Finding] = []
    for post in plan.posts:
        for side, text, language in (
            ("한국어 원문(source_ko)", post.source_ko, "ko"),
            ("현지어 본문(body_local)", post.body_local, post.language),
        ):
            for phrase in _hits(text, banned[language]):
                findings.append(_error(
                    "금지표현", post.index,
                    f"{side}에 금지 표현 '{phrase}'이(가) 있습니다. 게시물은 무료 상담 안내까지만 말합니다 — "
                    f"합격·취업·비자 보장, 비용 약속, 협력 관계, 상담 이후 절차는 쓰지 않습니다. 이 표현을 빼고 다시 쓰세요.",
                ))
    return findings


def _check_universities(plan: Plan, approved: tuple[str, ...]) -> list[Finding]:
    """`university_names`의 이름이 승인 목록에 있는지, 있다면 현지어 본문에 한국어 이름 그대로 쓰였는지 본다.

    음차나 의역만 있으면 본문에서 이름을 찾을 수 없어 맥락 검사가 성립하지 않으므로 한국어 이름을 요구한다.
    현지어 설명을 곁들이는 것은 괜찮아서 같음이 아니라 포함을 본다.
    """
    findings: list[Finding] = []
    for post in plan.posts:
        for name in post.university_names:
            if name not in approved:
                findings.append(_error(
                    "대학명목록외", post.index,
                    f"대학명 '{name}'은(는) 승인된 대학 목록(universities.json)에 없습니다. "
                    f"목록에 있는 한국어 실명만 쓸 수 있습니다.",
                ))
            elif name not in post.body_local:
                findings.append(_error(
                    "대학명본문없음", post.index,
                    f"university_names에 적은 '{name}'이(가) 현지어 본문에 한국어 이름 그대로 나오지 않습니다. "
                    f"음차나 의역만 쓰면 맥락을 검사할 수 없으니 한국어 이름을 그대로 넣고 현지어 설명은 곁들이세요.",
                ))
    return findings


def _named_universities(post: Post, approved: tuple[str, ...]) -> list[str]:
    """게시물이 다루는 대학: 플랜이 적은 이름, 그리고 적지 않았어도 원문·본문에 쓰인 승인 목록의 이름."""
    detected = [name for name in approved if name in post.source_ko or name in post.body_local]
    return list(dict.fromkeys([*post.university_names, *detected]))


# 회사가 스스로를 가리키는 1인칭 표지. 대학과의 관계를 말하는 어휘(`협력`·`연계`)는 대학 소개글에도 흔하다 —
# `산학협력단`, 해외 대학과의 협약, 제휴 할인. 막으려는 것은 **회사가** 맺지 않은 관계를 내세우는 글이므로
# 관계 어휘가 회사의 1인칭 표지와 **같은 문장**에 있을 때만 본다. 대명사는 다른 말 속에 들어 있거나 나라·민족·
# "우리 모두"를 가리키는 데 쓰이기도 해서 언어마다 좁힌다.
#
# - ko: `저희`는 다른 뜻이 없어 그대로. `당사`는 음절 뒤에 붙지 않은 것만(`해당사항`·`담당사원` 제외)이고 `당사자`·
#   `당사국`도 뺀다. `우리`·`우리들`은 주어·화제·소유·목적 조사가 붙은 것만이라 `우리 나라`·`우리 사회`·`우리은행`은 아니다.
#   `우리 회사`는 뒤에 무엇이 오든 회사 자신이라 그 자체로 표지다.
# - vi: 배타적 `chúng tôi`만. `chúng ta`는 글 읽는 사람까지 아우르는 "우리 모두"라 회사가 아니다.
# - my·ne: 조사·어미가 붙는 말이라 뒤쪽 경계는 보지 않는다(`हामीले`). 나라·민족·"우리 모두"를 말하는 닫힌 몇 꼴만 뺀다
#   (ne `हाम्रो/हाम्रा देश`·`हामी नेपाली`·`हामी सबै`, my `…နိုင်ငံ`·`…မြန်မာ` 앞의 대명사). 대학 부서 이름처럼 계속 늘어나는
#   말이 아니라 국적·"우리 모두"는 이 독자층에게 닫힌 집합이라서 제외 목록을 쓴다.
_FIRST_PERSON = {
    "ko": re.compile(r"저희|우리(?=[는가도의를])|우리들(?=[은이도의을])|우리\s*회사|(?<![가-힣])당사(?!자|국)"),
    "vi": re.compile(r"chúng\s+tôi(?!\w)", re.IGNORECASE),
    "my": re.compile(r"(?:ကျွန်ုပ်တို့|ကျွန်တော်တို့|ကျွန်မတို့)(?!\s*(?:၏\s*)?(?:နိုင်ငံ|မြန်မာ|အားလုံး))"),
    "ne": re.compile(r"हामी(?!\s*(?:नेपाली|सबै))|हाम्रो(?!\s*देश)|हाम्रा(?!\s*देश)|हाम्री"),
}
# 문장 끝으로 보는 글자: 느낌표·물음표, 일본식 마침표, 줄바꿈, 데바나가리 다리(।), 미얀마어 문장 끝(။), 그리고 마침표.
# 마침표는 숫자 뒤가 아니고 뒤에 공백이나 글의 끝이 올 때만이다 — 한국어 날짜(`2026. 11. 1.부터`), 주소(`www.a.kr`),
# 소수(`8,028,841.1`) 안에서 끊으면 같은 문장의 1인칭과 관계 어휘가 갈라진다.
# 정규화(`_compact`)는 줄바꿈을 지우므로 문장은 정규화 **전에** 가른다.
_SENTENCE_END = re.compile(r"(?:(?<!\d)\.(?=\s|$)|[!?。\n।။])+")


def _sentences(text: str) -> list[str]:
    return [sentence for sentence in _SENTENCE_END.split(text) if sentence.strip()]


def _first_person_marker(text: str, language: str, glossary: dict) -> str | None:
    """`text`에서 회사를 가리키는 표지를 찾아 돌려준다. 없으면 `None`.

    표지는 그 언어의 1인칭 대명사와 회사명이다. 회사명은 용어집의 그 언어 표기이고, 한국어 이름
    (`정우인재개발원`)만 쓴 글도 같은 회사이므로 함께 본다.
    """
    cleaned = "".join(
        ch for ch in unicodedata.normalize("NFC", text) if unicodedata.category(ch) != "Cf"  # U+200B 등
    )
    pronoun = _FIRST_PERSON[language].search(cleaned)
    if pronoun:
        return pronoun.group()
    compact = _compact(text)
    for name in (glossary["company_name"][language], dict(_GLOSSARY_TOKENS)["company_name"]):
        if _compact(name) in compact:
            return name
    return None


def _context_terms(
    post: Post, banned: dict[str, tuple[str, ...]], glossary: dict
) -> list[tuple[str, str, str, str]]:
    """회사가 말하는 문장에서 찾은 맥락 어휘를 `(출처, 어휘, 1인칭 표지, 문장)`으로.

    원문(`ko:대학명` 사전, 한국어 표지)과 본문(그 게시물 언어의 `:대학명` 사전, 그 언어의 표지)을 따로 보고,
    각각 **문장마다** 판정한다 — 관계 어휘와 회사의 1인칭 표지가 같은 문장에 있어야 한다. 한 글 안의 다른 문장에
    표지가 있다고 해서 `산학협력단` 같은 부서 이름이 걸리면 안 된다. 같은 어휘는 출처마다 한 번만 돌려준다.
    """
    found: dict[tuple[str, str], tuple[str, str]] = {}
    for side, text, language in (
        ("한국어 원문(source_ko)", post.source_ko, "ko"),
        ("현지어 본문(body_local)", post.body_local, post.language),
    ):
        for sentence in _sentences(text):
            marker = _first_person_marker(sentence, language, glossary)
            if marker is None:
                continue
            for term in _hits(sentence, banned[_university_key(language)]):
                found.setdefault((side, term), (marker, sentence.strip()))
    return [(side, term, marker, sentence) for (side, term), (marker, sentence) in found.items()]


def _check_university_context(
    plan: Plan, approved: tuple[str, ...], banned: dict[str, tuple[str, ...]], glossary: dict
) -> list[Finding]:
    """대학명이 나오는 게시물에서 회사가 협력·제휴·입학 알선·합격 가능성을 스스로 말하지 않는지 본다.

    대학 실명은 소개 맥락에서만 쓸 수 있다. 대학명은 글 어디에 있어도 되고(이름을 소개한 뒤 다음 문장에서 관계를
    주장하는 글이 있다), 관계 어휘와 회사의 1인칭 표지는 같은 문장에 있어야 한다. `university_names`를 비워
    두고 본문에만 대학명을 쓰는 경우도 놓치지 않도록 본문에서 찾은 승인 목록의 이름도 대학명으로 친다.
    """
    findings: list[Finding] = []
    for post in plan.posts:
        named = _named_universities(post, approved)
        if not named:
            continue
        for side, term, marker, sentence in _context_terms(post, banned, glossary):
            shown = sentence if len(sentence) <= 60 else sentence[:60] + "…"
            findings.append(_error(
                "대학맥락", post.index,
                f"대학명({', '.join(named)})이 나오는 게시물의 {side}에서 회사가 스스로({marker}) 협력·제휴를 말하는 것처럼 "
                f"읽히는 표현 '{term}'이(가) 있습니다 — 문장: '{shown}'. 대학 실명은 소개 맥락에서만 쓰고 협력 관계·제휴·"
                f"입학 알선·합격 가능성과 연결하지 마세요.",
            ))
    return findings


# 대학 이름처럼 보이는 낱말. `대학`으로 끝나는 것까지 넓히지 않는다: `전문대학`·`종합대학` 같은 일반 명사가
# 걸리고, 픽스처 원문에도 `전문대학`이 있다. `…대학교`는 이름일 가능성이 높지만 일반 명사로 쓰이는 것도 있어
# (`종합대학교`·`국립대학교`) 그런 낱말은 건너뛴다. 붙여 쓴 `4년제대학교`는 숫자가 빠진 `년제대학교`로 잡힌다.
_UNIVERSITY_LIKE = re.compile(r"[가-힣]{2,}대학교")
_GENERIC_UNIVERSITY_WORDS = frozenset({"종합대학교", "국립대학교", "사립대학교", "공립대학교", "년제대학교"})


def _check_university_candidates(
    plan: Plan, approved: tuple[str, ...], banned: dict[str, tuple[str, ...]], glossary: dict
) -> list[Finding]:
    """승인 목록에도 `university_names`에도 없는 `…대학교` 이름이 `대학맥락`과 같은 조건의 글에 있으면 경고한다.

    한국의 대학을 소개하는 글에서 실명을 쓰는 것은 허용되므로 이름만으로는 걸지 않는다. 걸리는 것은
    `저희는 서울대학교와 연계되어 있습니다`처럼 회사가 관계를 말하는 문장(관계 어휘 + 1인칭 표지)이 있는 글에
    목록 밖의 이름이 있을 때뿐이다 — 승인된 이름의 같은 문장은 `대학맥락`이, 선언한 이름은 `대학명목록외`가 이미 오류로
    잡는다. 이름 모양만 보는 추정이라 오류가 아닌 경고다.
    """
    findings: list[Finding] = []
    for post in plan.posts:
        terms = _context_terms(post, banned, glossary)
        if not terms:
            continue
        known = {*approved, *post.university_names, *_GENERIC_UNIVERSITY_WORDS}
        candidates = dict.fromkeys(
            name
            for text in (post.source_ko, post.body_local)
            for name in _UNIVERSITY_LIKE.findall(text)
            if name not in known
        )
        shown = ", ".join(dict.fromkeys(f"'{term}'" for _, term, _, _ in terms))
        for name in candidates:
            findings.append(_warning(
                "대학명후보", post.index,
                f"승인된 대학 목록에 없는 대학명 후보 '{name}'이(가) 회사가 스스로 협력·제휴를 말하는 것처럼 읽히는 표현({shown})과 "
                f"같은 글에 있습니다. 목록 밖의 대학은 관계를 말하는 글에 쓸 수 없습니다 — 연결 표현을 빼거나 "
                f"이름을 빼세요. 대학 이름이 아니라면 무시해도 됩니다.",
            ))
    return findings


# 용어집 항목 → 본문에 그 용어를 쓰고 있음을 알리는 식별 토큰. 토큰이 없는 게시물은 그 용어를 쓰지 않은 것이다.
_GLOSSARY_TOKENS = (
    ("visa_d2", "D-2"),
    ("visa_d4", "D-4"),
    ("company_name", "정우인재개발원"),
)
# 하이픈 모양이 다른 글자(비분리 하이픈, 엔 대시 등). 토큰을 찾을 때만 보통 하이픈으로 본다.
_DASHES = str.maketrans(dict.fromkeys(map(ord, "‐‑‒–—―−"), "-"))


def _check_glossary_terms(plan: Plan, glossary: dict) -> list[Finding]:
    """본문에 용어의 식별 토큰이 있으면 그 언어의 용어집 표기가 통째로 있어야 한다(경고).

    용어를 의역해 토큰 없이 쓰면 이 검사를 빠져나간다. 경고인 이유다.
    """
    findings: list[Finding] = []
    for post in plan.posts:
        text = post.body_local.translate(_DASHES).casefold()
        for key, token in _GLOSSARY_TOKENS:
            if token.casefold() not in text:
                continue
            expected = glossary[key][post.language]
            if expected not in post.body_local:
                findings.append(_warning(
                    "용어불일치", post.index,
                    f"현지어 본문에 '{token}'이(가) 있는데 용어집({key})의 {post.language} 표기 '{expected}'가 없습니다. "
                    f"용어집 표기를 그대로 쓰세요.",
                ))
    return findings


# 금액·시간·비율처럼 보이는 수치. 연도, 학기 수, 급수 같은 숫자는 여기에 걸리지 않는다.
# `원` 뒤의 `칙`·`색`·`서`는 금액이 아니다(제1원칙, 3원색, `2026 원서 접수`). `6,800,000원입니다`처럼 한글이 이어지는 금액은 그대로 잡는다.
_FIGURE = re.compile(
    r"[₩$¥￥]\s*\d[\d,.]*"                                       # 기호가 앞에 붙는 금액: $500, ¥100,000
    r"|\d[\d,.]*\s*[만천백억]?\s*(?:원(?!칙|색|서)|엔|円|달러|위안)"    # 금액: 6,800,000원, 300만 원, 15만 엔
    r"|\d[\d,.]*\s*시간"                                         # 시간 수: 주 20시간
    r"|\d[\d,.]*\s*(?:%|％|퍼센트)"                               # 비율: 95%
)
_THOUSANDS_COMMA = re.compile(r"(?<=\d),(?=\d)")
_NUMBER = re.compile(r"\d+(?:\.\d+)?")


def _numbers(text: str) -> list[str]:
    """`text` 속의 수를 숫자열로(천 단위 쉼표 제거): `8,028,841.1원` -> `['8028841.1']`."""
    return _NUMBER.findall(_THOUSANDS_COMMA.sub("", text))


def _check_unsourced_figures(plan: Plan, facts: dict[str, Fact]) -> list[Finding]:
    """원문의 금액·시간·비율 수치마다, 그 숫자가 인용한 사실(`fact_keys`) 중 하나의 값에 있는지 본다(경고).

    숫자열이 사실 값 속의 수(소수는 정수부도)와 **통째로** 같아야 한다 — 부분 문자열이면 `2026`이 `주 20시간`의 출처가 된다.
    `fact_keys`가 비면 모든 수치가 출처 없는 수치다. 사실을 하나라도 인용하면 아무 수치나 통과하던 구멍을 막는
    것으로, 검증되지 않은 학비·아르바이트 시간이 아무도 읽지 않는 현지어로 나가는 길을 닫는다. 현지어 숫자 표기까지
    알아보려 하지 않고 원문만 본다. 숫자만 보므로 단위는 따지지 않고, 반올림하거나 단위를 바꾼 수치(`803만원`과
    `8,028,841.1원`)는 걸린다. 연도나 학기 수처럼 정당한 숫자도 있어 오류가 아닌 경고다. 없는 키는 근거로 치지 않는다
    (그 키는 `validate_facts`가 보고한다).
    """
    findings: list[Finding] = []
    for post in plan.posts:
        # 소수는 소수점 아래를 버린 정수부도 출처로 친다: 사실 값 `8,028,841.1원`을 `8,028,841원`으로 쓴 것은 같은 수다.
        sourced = {
            part
            for key in post.fact_keys if key in facts
            for number in _numbers(facts[key].value)
            for part in (number, number.split(".")[0])
        }
        figures = list(dict.fromkeys(
            match.group().strip()
            for match in _FIGURE.finditer(post.source_ko)
            if _numbers(match.group())[0] not in sourced
        ))
        if not figures:
            continue
        why = (
            "fact_keys가 비어 있어" if not post.fact_keys
            else f"인용한 사실({', '.join(post.fact_keys)})의 값에 그 숫자가 없어"
        )
        findings.append(_warning(
            "출처없는수치", post.index,
            f"한국어 원문에 수치({', '.join(figures)})가 있는데 {why} 출처를 검증할 수 없습니다. "
            f"facts.json의 확정된 사실에서 가져온 수치라면 그 사실의 키를 fact_keys에 적고, 아니라면 수치를 빼세요. "
            f"반올림하거나 단위를 바꿔 쓴 수치는 사실 값과 숫자가 달라 걸릴 수 있습니다.",
        ))
    return findings


# 등록금 사실의 키 접두사(`tuition_<대학 id>`)와, 연단위를 알리는 표시: `1년`(앞이 숫자인 `2021년`은 제외) 또는 `연간`.
_TUITION_PREFIX = "tuition_"
_YEARLY_MARKER = re.compile(r"(?<!\d)1년|연간")


def _check_tuition_qualifier(plan: Plan) -> list[Finding]:
    """등록금 사실을 인용하는 게시물의 한국어 원문에 `평균`과 연단위(`1년` 또는 `연간`)가 있어야 한다.

    사실 값은 등록금이 전체 학과 가중평균 공시값이고 1년치(학기당 아님)라고 못박는다. 숫자만 떼어 쓰면 정확한
    금액이나 학기당 금액으로 읽혀 이 독자층이 가장 신경 쓰는 숫자를 잘못 전하므로 오류다. 문장 전체를
    대조하지 않고 이 두 표시만 보는 것은 표현을 조금 바꿔 쓸 때 검사가 깨지지 않게 하려는 것이다.
    """
    findings: list[Finding] = []
    for post in plan.posts:
        keys = [key for key in post.fact_keys if key.startswith(_TUITION_PREFIX)]
        if not keys:
            continue
        missing = []
        if "평균" not in post.source_ko:
            missing.append("'평균'")
        if not _YEARLY_MARKER.search(post.source_ko):
            missing.append("'1년' 또는 '연간'")
        if missing:
            findings.append(_error(
                "등록금한정어", post.index,
                f"등록금 사실({', '.join(keys)})을 쓰는 글인데 한국어 원문에 {' · '.join(missing)}이(가) 없습니다. "
                f"등록금은 전체 학과 가중평균 공시값이고 한 해 금액입니다. 이 한정이 빠지면 정확한 금액이나 "
                f"학기당 금액으로 읽히니 빠진 표현을 원문에 넣으세요.",
            ))
    return findings
