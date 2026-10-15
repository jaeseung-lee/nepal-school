"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { getNavItems } from "@/lib/nav";
import { getBlogIndexPath, isBlogLocale } from "@/lib/blog-routing";
import { SITE } from "@/lib/site";
import { getLocaleFromPathname, getMessages, localizedHref } from "@/lib/i18n";
import { isInternalPath } from "@/lib/internal-routes";
import { PRIVACY_COPY } from "@/lib/privacy-copy";

export default function SiteFooter() {
  const pathname = usePathname() || "/";
  const locale = getLocaleFromPathname(pathname);
  const messages = getMessages(locale);
  const navItems = getNavItems(locale);
  const resolveHref = (href: string) => href === "/blog" && isBlogLocale(locale) ? getBlogIndexPath(locale) : localizedHref(locale, href);
  const contacts = [
    ...SITE.phones.map((phone) => ({
      label: `${messages.site.areaServed[phone.market]} ${messages.common.mobile}`,
      value: phone.national,
      href: phone.href,
    })),
    SITE.email ? { label: messages.common.email, value: SITE.email, href: `mailto:${SITE.email}` } : null,
  ].filter(Boolean) as { label: string; value: string; href?: string }[];

  if (isInternalPath(pathname)) return null;

  return (
    <footer className="surface-dark bg-night-deep text-white">
      <div className="page-wrap grid gap-12 pb-7 pt-16 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16 lg:pt-20">
        <div>
          <BrandLogo
            kind="lockup"
            tone="white"
            className="h-10 w-auto max-w-[170px]"
            screenReaderLabel={`${messages.site.name} — ${messages.site.alternateName}`}
          />
          <p className="mt-6 max-w-sm text-[13px] leading-relaxed text-night-muted">{messages.footer.description}</p>
        </div>

        <div className="grid gap-10 sm:grid-cols-3 sm:gap-12">
          <nav aria-label={messages.common.menu}>
            <h2 className="text-meta text-night-muted">{messages.common.menu}</h2>
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 text-[13px] sm:grid-cols-1">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link href={resolveHref(item.href)} className="text-white/85 underline-offset-4 transition hover:text-white hover:underline">
                    {messages.nav[item.key]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-meta text-night-muted">{messages.common.companyInfo}</h2>
            <dl className="mt-4 space-y-3 text-[13px]">
              <div>
                <dt className="text-night-muted">{messages.common.representative}</dt>
                <dd className="mt-0.5 text-white/85">{messages.site.founder}</dd>
              </div>
              <div>
                <dt className="text-night-muted">{messages.common.businessNumber}</dt>
                <dd className="mt-0.5 tabular-nums text-white/85">{messages.site.businessRegistrationNumber}</dd>
              </div>
              <div>
                <dt className="text-night-muted">{messages.common.address}</dt>
                <dd className="mt-0.5 max-w-[16rem] text-white/85">{messages.site.streetAddress}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h2 className="text-meta text-night-muted">{messages.common.contact}</h2>
            {contacts.length ? (
              <dl className="mt-4 space-y-3 text-[13px]">
                {contacts.map((item) => (
                  <div key={item.label}>
                    <dt className="text-night-muted">{item.label}</dt>
                    <dd className="mt-0.5 tabular-nums text-white/85">
                      {item.href ? <a href={item.href} className="underline-offset-4 transition hover:text-white hover:underline">{item.value}</a> : item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-4 text-[13px] leading-relaxed text-night-muted">{messages.footer.contactNotice}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/15 pt-6 text-xs text-night-muted sm:flex-row sm:items-center sm:justify-between lg:col-span-2">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <p>© 2026 {SITE.legalName.ko}. {messages.common.allRightsReserved}</p>
            <Link href={localizedHref(locale, "/privacy")} className="underline-offset-4 transition hover:text-white hover:underline">{PRIVACY_COPY[locale].title}</Link>
          </div>
          <p>{messages.footer.countries}</p>
        </div>
      </div>
    </footer>
  );
}
