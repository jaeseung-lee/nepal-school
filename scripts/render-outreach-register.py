#!/usr/bin/env python3
"""Render local outreach summaries from the canonical JSON register."""

import csv
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output/outreach"
STATE_LABELS = {
    "contacted": "문의 완료 · 최초 문의 재발송 제외",
    "needs_review": "확인 필요 · 신규 발송 제외",
    "do_not_contact": "연락 중단",
}
REPLY_LABELS = {
    "not_checked": "미확인",
    "received_meeting_availability_requested": "답장 수신 · 미팅 가능 일정 요청",
    "availability_sent_awaiting_confirmation": "가능 일정 회신 완료 · 확정 대기",
    "received": "답장 수신",
    "no_new_reply": "최근 조회에서 새 답장 없음",
    "automatic_receipt_received": "자동 접수 확인 · 담당자 답변 대기",
}


def cell(value):
    return str(value or "").replace("|", "\\|").replace("\n", " ")


def main():
    data = json.loads((OUT / "contact-register.json").read_text(encoding="utf-8"))
    contacts = data["contacts"]
    lines = [
        "# 연락 명부 — 중복 최초 문의 방지", "",
        f"갱신일: {data['updated_on']} · 총 {len(contacts)}개 학교·기관", "",
        "이메일과 문의 폼을 같은 기관의 이력으로 확인합니다. 새 주소가 확인되면 기존 기관에 추가합니다.", "",
        "| 학교·기관 | 담당자 | 등록 이메일 | 최근 기록일 | 중복 처리 | 답장 상태 |",
        "|---|---|---|---|---|---|",
    ]
    for contact in contacts:
        values = [contact["organization"], contact.get("contact_person") or "미확인",
                  ", ".join(contact["emails"]) or "문의 폼",
                  contact["last_record_date"], STATE_LABELS.get(contact["dedup_status"], contact["dedup_status"]),
                  REPLY_LABELS.get(contact.get("reply_status"), contact.get("reply_status", "미확인"))]
        lines.append("| " + " | ".join(map(cell, values)) + " |")
    lines.extend(["", "## 확인된 수신·후속 연락", ""])
    for contact in contacts:
        for entry in contact["history"]:
            if entry.get("channel") not in {"email_received", "email_reply"}:
                continue
            lines.append(f"- **{contact['organization']}** · {entry.get('record_date', '')} · "
                         f"{entry.get('status', '')}: {entry.get('content_summary', '')}")
    lines.extend([
        "", "## 운영 안내", "",
        "- 기존 2026-07-27 개호시설 초안은 당시 기록이며 현재 발송 여부를 확인하기 전에는 신규 대상으로 처리하지 않습니다.",
        "- 조회: `python3 scripts/check-outreach.py \"학교명\" \"이메일 또는 문의 폼 URL\"`",
        "- 기준 데이터: `output/outreach/contact-register.json`",
        "- 답장 확인 기록: `output/outreach/reply-monitor-state.json`",
        "- 개호 채용처 답장 확인 기록: `output/outreach/osaka-care-reply-monitor-state.json`",
        "- JSON 갱신 후 요약 재생성: `python3 scripts/render-outreach-register.py`",
        "- 운영 규칙: `docs/outreach-records.md` 및 프로젝트 `AGENTS.md`",
        "- 발송·접수 확인은 상대방의 열람 또는 협업 수락을 의미하지 않습니다. 미팅 날짜는 상대방 확인 전까지 제안 상태입니다.",
        "- 이 명부는 로컬 프로젝트에 저장되며 공개 사이트에 게시하지 않습니다.", "",
    ])
    (OUT / "contact-register.md").write_text("\n".join(lines), encoding="utf-8")
    with (OUT / "contact-register.csv").open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(["기관ID", "학교·기관명", "다른 이름", "지역", "담당자명", "이메일", "문의폼",
                         "기록일", "최종채널", "중복처리", "회신상태", "발신·회신주소", "최근이력", "원본기록"])
        for contact in contacts:
            latest = contact["history"][-1]
            writer.writerow([contact["id"], contact["organization"], " | ".join(contact["aliases"]),
                             contact.get("region", ""), contact.get("contact_person") or "미확인",
                             " | ".join(contact["emails"]), " | ".join(contact["contact_forms"]),
                             contact["last_record_date"], contact["last_channel"],
                             STATE_LABELS.get(contact["dedup_status"], contact["dedup_status"]),
                             REPLY_LABELS.get(contact.get("reply_status"), contact.get("reply_status", "미확인")),
                             latest.get("sender_reply_to", ""), latest.get("content_summary", "과거 초안 기록"),
                             latest.get("source_file", latest.get("source_url", ""))])
    print(f"연락 명부 {len(contacts)}개 항목의 Markdown/CSV 요약 갱신 완료")


if __name__ == "__main__":
    main()
