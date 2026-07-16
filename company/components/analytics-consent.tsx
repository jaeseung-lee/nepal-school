"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";
import WebVitals from "@/components/web-vitals";
import { localizedHref, type Locale } from "@/lib/i18n";
import { PRIVACY_COPY } from "@/lib/privacy-copy";

const STORAGE_KEY = "joongwoo_analytics_consent";
type Choice = "accepted" | "declined" | null;

export default function AnalyticsConsent({ locale }: { locale: Locale }) {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const [choice, setChoice] = useState<Choice>(null);
  const [ready, setReady] = useState(false);
  const copy = PRIVACY_COPY[locale];

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    setChoice(stored === "accepted" || stored === "declined" ? stored : null);
    setReady(true);
  }, []);

  const choose = (next: Exclude<Choice, null>) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setChoice(next);
  };

  if (!measurementId || !ready) return null;

  return (
    <>
      {choice === "accepted" ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
          <Script id="joongwoo-ga4" strategy="afterInteractive" onReady={() => { window.dispatchEvent(new Event("joongwoo:analytics-ready")); }}>
            {`window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){dataLayer.push(arguments)};if(!window.__joongwooGaConfigured){window.gtag('js',new Date());window.gtag('config','${measurementId}',{anonymize_ip:true,send_page_view:true});window.__joongwooGaConfigured=true;}`}
          </Script>
          <WebVitals />
        </>
      ) : null}
      {choice === null ? (
        <aside className="fixed inset-x-4 bottom-4 z-[70] mx-auto max-w-3xl rounded-2xl border border-line bg-paper-soft p-5 shadow-2xl shadow-ink/20" aria-label={copy.bannerTitle}>
          <p className="font-display text-lg font-semibold text-ink">{copy.bannerTitle}</p>
          <p className="mt-2 text-sm leading-6 text-muted">{copy.bannerBody} <Link href={localizedHref(locale, "/privacy")} className="font-semibold text-cobalt underline underline-offset-4">{copy.policy}</Link></p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => choose("accepted")} className="rounded-full bg-cobalt px-5 py-2.5 text-sm font-semibold text-white">{copy.accept}</button>
            <button type="button" onClick={() => choose("declined")} className="rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink">{copy.decline}</button>
          </div>
        </aside>
      ) : null}
    </>
  );
}
