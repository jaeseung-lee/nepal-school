"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import type { CaptureResult } from "posthog-js";
import WebVitals from "@/components/web-vitals";
import { ANALYTICS_READY_EVENT, analyticsUrl, setPostHogClient } from "@/lib/analytics";
import { localizedHref, type Locale } from "@/lib/i18n";
import { PRIVACY_COPY } from "@/lib/privacy-copy";

const STORAGE_KEY = "joongwoo_analytics_consent";
const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";
const POSTHOG_PAGE_URL_PROPERTIES = ["$current_url", "$initial_current_url", "$session_entry_url"] as const;
const POSTHOG_REFERRER_PROPERTIES = ["$referrer", "$initial_referrer"] as const;
type Choice = "accepted" | "declined" | null;

function removeSearchAndHash(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? `${url.origin}${url.pathname}` : value;
  } catch {
    return value.split(/[?#]/, 1)[0];
  }
}

function scrubPostHogUrls(capture: CaptureResult | null): CaptureResult | null {
  if (!capture) return null;

  const properties = { ...capture.properties };
  for (const property of POSTHOG_PAGE_URL_PROPERTIES) {
    if (typeof properties[property] === "string") properties[property] = analyticsUrl(properties[property]);
  }
  for (const property of POSTHOG_REFERRER_PROPERTIES) {
    if (typeof properties[property] === "string") properties[property] = removeSearchAndHash(properties[property]);
  }

  return { ...capture, properties };
}

export default function AnalyticsConsent({ locale }: { locale: Locale }) {
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const posthogProjectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || DEFAULT_POSTHOG_HOST;
  const [choice, setChoice] = useState<Choice>(null);
  const [ready, setReady] = useState(false);
  const [gaReady, setGaReady] = useState(false);
  const [posthogReady, setPosthogReady] = useState(false);
  const posthogInitialized = useRef(false);
  const readyNotified = useRef(false);
  const copy = PRIVACY_COPY[locale];
  const hasAnalytics = Boolean(gaMeasurementId || posthogProjectToken);
  const analyticsReady = choice === "accepted" && (!gaMeasurementId || gaReady) && (!posthogProjectToken || posthogReady);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    setChoice(stored === "accepted" || stored === "declined" ? stored : null);
    setReady(true);
  }, []);

  useEffect(() => {
    if (choice !== "accepted" || !posthogProjectToken || posthogInitialized.current) return;

    posthogInitialized.current = true;
    void import("posthog-js")
      .then(({ default: posthog }) => {
        posthog.init(posthogProjectToken, {
          api_host: posthogHost,
          defaults: "2026-05-30",
          autocapture: false,
          capture_pageview: false,
          capture_pageleave: false,
          capture_dead_clicks: false,
          rageclick: false,
          capture_exceptions: false,
          disable_session_recording: false,
          session_recording: {
            maskAllInputs: true,
            maskTextSelector: "*",
            recordHeaders: false,
            recordBody: false,
            recordCrossOriginIframes: false,
            captureCanvas: { recordCanvas: false },
            maskCapturedNetworkRequestFn: (request) => {
              request.name = removeSearchAndHash(request.name);
              return request;
            },
          },
          disable_surveys: true,
          capture_heatmaps: false,
          advanced_disable_flags: true,
          persistence: "localStorage",
          person_profiles: "never",
          disable_capture_url_hashes: true,
          mask_all_text: true,
          mask_all_element_attributes: true,
          mask_personal_data_properties: true,
          custom_personal_data_properties: ["email", "phone", "name", "mobile", "tel"],
          save_referrer: false,
          before_send: scrubPostHogUrls,
          loaded: setPostHogClient,
        });
        setPostHogClient(posthog);
        setPosthogReady(true);
      })
      .catch(() => setPosthogReady(true));
  }, [choice, posthogHost, posthogProjectToken]);

  useEffect(() => {
    if (!analyticsReady || readyNotified.current) return;
    readyNotified.current = true;
    window.dispatchEvent(new Event(ANALYTICS_READY_EVENT));
  }, [analyticsReady]);

  const choose = (next: Exclude<Choice, null>) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setChoice(next);
  };

  if (!hasAnalytics || !ready) return null;

  return (
    <>
      {choice === "accepted" && gaMeasurementId ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`} strategy="afterInteractive" />
          <Script id="joongwoo-ga4" strategy="afterInteractive" onReady={() => setGaReady(true)}>
            {`window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){dataLayer.push(arguments)};if(!window.__joongwooGaConfigured){window.gtag('js',new Date());window.gtag('config',${JSON.stringify(gaMeasurementId)},{anonymize_ip:true,send_page_view:false});window.__joongwooGaConfigured=true;}`}
          </Script>
        </>
      ) : null}
      {analyticsReady ? <WebVitals /> : null}
      {choice === null ? (
        <aside className="fixed inset-x-4 bottom-4 z-[70] mx-auto max-w-3xl border border-ink bg-surface p-5 shadow-[0_12px_40px_rgb(0_0_0/0.14)] sm:p-6" aria-label={copy.bannerTitle}>
          <p className="text-lg font-bold tracking-[-0.02em] text-ink">{copy.bannerTitle}</p>
          <p className="mt-2 text-sm leading-6 text-muted">{copy.bannerBody} <Link href={localizedHref(locale, "/privacy")} className="font-semibold text-ink underline decoration-ink/35 underline-offset-4 hover:decoration-ink">{copy.policy}</Link></p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => choose("accepted")} className="pill pill-dark min-w-28">{copy.accept}</button>
            <button type="button" onClick={() => choose("declined")} className="pill pill-outline min-w-28">{copy.decline}</button>
          </div>
        </aside>
      ) : null}
    </>
  );
}
