#!/usr/bin/env python3
"""Read-only lookup of prior outreach. This script never sends messages."""

import argparse
import json
import sys
import unicodedata
from pathlib import Path
from urllib.parse import parse_qsl, unquote, urlencode, urlsplit


ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "output/outreach/contact-register.json"


def normalized_name(value):
    return "".join(c for c in unicodedata.normalize("NFKC", value).casefold() if c.isalnum())


def normalized_email(value):
    return value.strip().casefold().removeprefix("mailto:").split("?", 1)[0]


def normalized_url(value):
    parts = urlsplit(value.strip())
    host = (parts.hostname or "").casefold().removeprefix("www.")
    if not host or parts.scheme not in ("http", "https"):
        raise ValueError("http 또는 https로 시작하는 문의 폼 URL을 입력하세요.")
    path = unquote(parts.path).rstrip("/")
    query = sorted((k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True)
                   if not k.casefold().startswith("utm_") and k.casefold() not in {"gclid", "fbclid"})
    return host, path, urlencode(query)


def main():
    parser = argparse.ArgumentParser(description="학교명·이메일·문의 폼으로 기존 연락 이력을 확인합니다.")
    parser.add_argument("queries", nargs="+", help="학교명, 이메일 또는 문의 폼 URL; 여러 개 입력 가능")
    args = parser.parse_args()
    try:
        data = json.loads(REGISTRY.read_text(encoding="utf-8"))
        contacts = data["contacts"]
        if data.get("schema_version") != 1 or not contacts:
            raise ValueError("명부가 비어 있거나 지원하지 않는 형식입니다.")
        identities = set()
        for contact in contacts:
            if contact["id"] in identities:
                raise ValueError("중복된 기관 ID가 있습니다.")
            identities.add(contact["id"])
            if contact["dedup_status"] not in {"contacted", "needs_review", "do_not_contact"}:
                raise ValueError("확인되지 않은 연락 상태가 있습니다.")
            for key in ("aliases", "emails", "contact_forms", "history"):
                if not isinstance(contact[key], list):
                    raise ValueError(f"명부의 {key} 형식이 올바르지 않습니다.")
        queries = []
        for query in args.queries:
            if not query.strip():
                raise ValueError("빈 검색어는 사용할 수 없습니다.")
            if query.startswith(("http://", "https://")):
                queries.append(("url", normalized_url(query)))
            elif "@" in query:
                queries.append(("email", normalized_email(query)))
            else:
                queries.append(("name", normalized_name(query)))
        matches = []
        for contact in contacts:
            names = {normalized_name(x) for x in [contact["organization"], *contact["aliases"]]}
            emails = {normalized_email(x) for x in contact["emails"]}
            urls = {normalized_url(x) for x in contact["contact_forms"]}
            hosts = {x[0] for x in urls} | {x.rsplit("@", 1)[1] for x in emails}
            reasons, domain_match = [], False
            for kind, value in queries:
                if kind == "name" and value in names:
                    reasons.append("학교·기관 이름 일치")
                elif kind == "email" and value in emails:
                    reasons.append("등록된 이메일 일치")
                elif kind == "url" and value in urls:
                    reasons.append("등록된 문의 폼 일치")
                elif kind == "email" and value.rsplit("@", 1)[1] in hosts:
                    domain_match = True
                elif kind == "url" and value[0] in hosts:
                    domain_match = True
            if reasons or domain_match:
                matches.append((contact, reasons))
    except (OSError, ValueError, KeyError, TypeError, AttributeError) as error:
        print(f"확인 필요: 명부를 안전하게 조회할 수 없습니다. {error}", file=sys.stderr)
        return 2

    if not matches:
        print("일치 기록 없음. 알려진 학교명과 다른 연락처도 확인하세요. 이 결과는 발송 허가가 아닙니다.")
        return 0
    blocked = False
    for contact, reasons in matches:
        status = contact["dedup_status"]
        if reasons and status in {"contacted", "do_not_contact"}:
            blocked = True
            label = "이미 문의함 — 최초 문의 재발송 제외" if status == "contacted" else "연락 중단 대상"
        else:
            label = "확인 필요 — 신규 대상으로 처리하지 않음"
        print(f"{label}: {contact['organization']} [{contact['id']}]")
        print("  일치 근거: " + ", ".join(dict.fromkeys(reasons or ["같은 도메인; 다른 담당자·캠퍼스인지 확인 필요"])))
        print(f"  상태: {status}; 기록: {contact['last_record_date']}; 채널: {contact['last_channel']}")
        print(f"  상세: {REGISTRY}")
    return 1 if blocked else 2


if __name__ == "__main__":
    sys.exit(main())
