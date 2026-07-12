import Link from "next/link";
import { NAV_ITEMS } from "@/lib/nav";
import { SITE } from "@/lib/site";

export default function SiteFooter() {
  const contacts = [
    SITE.telephone ? { label: "전화", value: SITE.telephone } : null,
    SITE.email ? { label: "이메일", value: SITE.email } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <footer className="border-t border-line bg-paper-soft text-muted">
      <div className="max-w-content mx-auto px-5 py-14 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_0.7fr_1fr_0.9fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cobalt text-[12px] font-bold text-white" aria-hidden="true">
                JW
              </span>
              <span className="leading-tight">
                <span className="block text-[15px] font-bold text-ink">{SITE.nameKo}</span>
                <span className="block text-[10px] font-display font-medium text-muted">{SITE.alternateName}</span>
              </span>
            </div>
            <p className="mt-5 max-w-md text-sm leading-relaxed">
              네팔 인재를 현지 교육부터 양성해 한국과 일본 기업에 합법적으로 연결합니다.
            </p>
            <p className="mt-4 text-xs text-gray-500">2026년 6월 설립, 해외 협력망은 네팔을 중심으로 운영합니다.</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">메뉴</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="transition hover:text-cobalt">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">회사 정보</h3>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="grid grid-cols-[76px_1fr] gap-2">
                <dt className="text-gray-500">대표</dt>
                <dd className="text-ink">{SITE.founder}</dd>
              </div>
              <div className="grid grid-cols-[76px_1fr] gap-2">
                <dt className="text-gray-500">사업자번호</dt>
                <dd className="text-ink">{SITE.bizRegNo}</dd>
              </div>
              <div className="grid grid-cols-[76px_1fr] gap-2">
                <dt className="text-gray-500">주소</dt>
                <dd className="text-ink">{SITE.streetAddress}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">문의</h3>
            {contacts.length ? (
              <dl className="mt-4 space-y-2.5 text-sm">
                {contacts.map((item) => (
                  <div key={item.label} className="grid grid-cols-[64px_1fr] gap-2">
                    <dt className="text-gray-500">{item.label}</dt>
                    <dd className="text-ink">{item.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-4 text-sm leading-relaxed">
                웹 문의 채널은 정식 운영 전입니다. 기업 요건 정리를 위한 안내 영역을 먼저 제공합니다.
              </p>
            )}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-xs text-gray-500 sm:flex-row sm:justify-between">
          <p>© 2026 {SITE.nameKo}. All rights reserved.</p>
          <p>네팔, 한국, 일본</p>
        </div>
      </div>
    </footer>
  );
}
