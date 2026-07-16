"use client";

export type SeoEventName =
  | "cta_clicked"
  | "language_changed"
  | "visa_content_viewed"
  | "article_read"
  | "official_source_clicked";

export type SeoEventParams = {
  locale: string;
  page_path: string;
  content_id?: string;
  jurisdiction?: "KR" | "JP" | "NP" | string;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __joongwooGaConfigured?: boolean;
  }
}

export function trackSeoEvent(name: SeoEventName, params: SeoEventParams): boolean {
  if (typeof window === "undefined" || !window.gtag) return false;
  window.gtag("event", name, params);
  return true;
}
