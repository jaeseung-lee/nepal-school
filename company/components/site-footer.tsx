"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { SITE } from "@/lib/site";
import { getLocaleFromPathname, getMessages, localizedHref } from "@/lib/i18n";

export default function SiteFooter() {
  const pathname = usePathname() || "/";
  const locale = getLocaleFromPathname(pathname);
  const messages = getMessages(locale);
  const contacts = [
    SITE.telephone ? { label: messages.common.phone, value: SITE.telephone } : null,
    SITE.email ? { label: messages.common.email, value: SITE.email } : null,
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
                <span className="block text-[15px] font-bold text-ink">{messages.site.name}</span>
                <span className="block text-[10px] font-display font-medium text-muted">{messages.site.alternateName}</span>
              </span>
            </div>
            <p className="mt-5 max-w-md text-sm leading-relaxed">{messages.footer.description}</p>
            <p className="mt-4 text-xs text-gray-500">{messages.footer.network}</p>
            {locale === "ko" ? (
              <Link href="/blog" className="mt-5 inline-flex text-sm font-semibold text-cobalt underline underline-offset-4 transition hover:text-cobalt-ink">
                외국인력 채용 인사이트 보기
              </Link>
            ) : null}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">{messages.common.menu}</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link href={localizedHref(locale, item.href)} className="transition hover:text-cobalt">
                    {messages.nav[item.key]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">{messages.common.companyInfo}</h3>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="grid grid-cols-[76px_1fr] gap-2">
                <dt className="text-gray-500">{messages.common.representative}</dt>
                <dd className="text-ink">{messages.site.founder}</dd>
              </div>
              <div className="grid grid-cols-[76px_1fr] gap-2">
                <dt className="text-gray-500">{messages.common.businessNumber}</dt>
                <dd className="text-ink">{messages.site.businessRegistrationNumber}</dd>
              </div>
              <div className="grid grid-cols-[76px_1fr] gap-2">
                <dt className="text-gray-500">{messages.common.address}</dt>
                <dd className="text-ink">{messages.site.streetAddress}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">{messages.common.contact}</h3>
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
              <p className="mt-4 text-sm leading-relaxed">{messages.footer.contactNotice}</p>
            )}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-xs text-gray-500 sm:flex-row sm:justify-between">
          <p>© 2026 {messages.site.name}. {messages.common.allRightsReserved}</p>
          <p>{messages.footer.countries}</p>
        </div>
      </div>
    </footer>
  );
}
