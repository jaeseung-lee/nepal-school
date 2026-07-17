"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import type { CaptureResult } from "posthog-js";
import WebVitals from "@/components/web-vitals";
import { ANALYTICS_READY_EVENT, setPostHogClient } from "@/lib/analytics";
import { localizedHref, type Locale } from "@/lib/i18n";
import { PRIVACY_COPY } from "@/lib/privacy-copy";

const STORAGE_KEY = "joongwoo_analytics_consent";
const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";
const POSTHOG_URL_PROPERTIES = ["$current_url", "$initial_current_url", "$referrer", "$initial_referrer", "$session_entry_url"] as const;
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
  for (const property of POSTHOG_URL_PROPERTIES) {
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
