import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pretendard } from "@/app/fonts";
import PublicShell from "@/components/public-shell";
import { isLocale, LOCALES } from "@/lib/i18n";
import { buildRootMetadata } from "@/lib/seo";
import "../globals.css";

export const dynamicParams = false;

// (public-ko) 레이아웃과 같은 이유로 서울 리전에서 실행한다.
export const preferredRegion = "icn1";

export function generateStaticParams() {
  return LOCALES.filter((locale) => locale !== "ko").map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) && locale !== "ko" ? buildRootMetadata(locale) : {};
}

export default async function LocaleLayout({ children, params }: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale) || locale === "ko") notFound();

  return (
    <html lang={locale} className={pretendard.variable}>
      <body className="bg-paper font-sans text-ink antialiased">
        <PublicShell locale={locale}>{children}</PublicShell>
      </body>
    </html>
  );
}
