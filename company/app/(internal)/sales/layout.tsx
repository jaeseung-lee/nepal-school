import type { Metadata } from "next";
import Link from "next/link";
import SalesLocaleSwitcher from "@/components/sales/locale-switcher";
import SalesNav from "@/components/sales/sales-nav";
import { requireInternalProfile } from "@/lib/sales/auth";
import { localizedLabel, roleLabels, salesMessages } from "@/lib/sales/i18n";
import { getSalesLocale } from "@/lib/sales/locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getSalesLocale();
  return {
    title: salesMessages[locale].appName,
    robots: { index: false, follow: false, nocache: true },
  };
}

export const dynamic = "force-dynamic";

export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  const [profile, locale] = await Promise.all([requireInternalProfile(), getSalesLocale()]);
  const t = salesMessages[locale];
  const nav = [
    { href: "/sales", label: t.dashboard },
    { href: "/sales/jobs", label: t.jobs },
    { href: "/sales/companies", label: t.companies },
    ...(profile.role === "admin"
      ? [
          { href: "/sales/admin/runs", label: t.runs },
          { href: "/sales/admin/users", label: t.users },
        ]
      : []),
  ];

  return (
    <div className="min-h-dvh bg-[#f3f6f9] text-[#17233a]">
      <a href="#sales-main" className="sr-only z-50 rounded-lg bg-[#17233a] px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">{t.skipToContent}</a>
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-[#dce3eb] bg-white px-5 py-6 lg:flex lg:flex-col">
        <Link href="/sales" className="flex items-center gap-3 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1d5cff] text-xs font-bold text-white">JW</span>
          <span>
            <span className="block text-sm font-bold">{t.appName}</span>
            <span className="block text-[11px] uppercase tracking-[0.18em] text-[#8792a2]">{t.internal}</span>
          </span>
        </Link>
        <div className="mt-9 flex-1"><SalesNav items={nav} ariaLabel={t.appName} /></div>
        <div className="border-t border-[#e5eaf0] pt-4">
          <p className="truncate text-xs font-semibold">{profile.display_name ?? profile.email}</p>
          <p className="mt-1 truncate text-[11px] text-[#8792a2]">{profile.email} · {localizedLabel(roleLabels, profile.role, locale)}</p>
          <form action="/auth/signout" method="post" className="mt-3">
            <button className="text-xs font-semibold text-[#59667a] hover:text-red-700">{t.logout}</button>
          </form>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-[#dce3eb] bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-4 px-5 lg:px-8">
            <div className="min-w-0 lg:hidden">
              <p className="truncate text-sm font-bold">{t.appName}</p>
              <div className="mt-1 flex gap-3 overflow-x-auto text-xs text-[#59667a]">
                {nav.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
              </div>
            </div>
            <p className="hidden max-w-2xl text-xs text-[#6f7b8c] lg:block">{t.sourceNotice}</p>
            <div className="flex shrink-0 items-center gap-3">
              <SalesLocaleSwitcher locale={locale} />
              <form action="/auth/signout" method="post" className="lg:hidden">
                <button className="text-xs font-semibold text-[#59667a]">{t.logout}</button>
              </form>
            </div>
          </div>
        </header>
        <main id="sales-main" className="mx-auto max-w-[1500px] px-5 py-7 lg:px-8 lg:py-9">{children}</main>
      </div>
    </div>
  );
}
