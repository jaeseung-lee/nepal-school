import type { PostHog } from "posthog-js";

export const ANALYTICS_READY_EVENT = "joongwoo:analytics-ready";

type AnalyticsProperties = Record<string, string | number | boolean | undefined>;
type PostHogClient = Pick<PostHog, "capture">;

let postHogClient: PostHogClient | null = null;

export type SeoEventName =
  | "cta_clicked"
  | "language_changed"
  | "visa_content_viewed"
  | "article_read"
  | "official_source_clicked";

export type SeoEventParams = AnalyticsProperties & {
  locale: string;
  page_path: string;
  content_id?: string;
  jurisdiction?: "KR" | "JP" | "NP" | string;
};

export type PageViewParams = AnalyticsProperties & {
  locale: string;
  page_path: string;
  page_location: string;
  page_title: string;
};

export type WebVitalName = "LCP" | "INP" | "CLS";
export type WebVitalParams = AnalyticsProperties & {
  value: number;
  event_category: string;
  event_label: string;
  non_interaction: boolean;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __joongwooGaConfigured?: boolean;
  }
}

export function setPostHogClient(client: PostHogClient) {
  postHogClient = client;
}

function trackAnalyticsEvent(
  gaEventName: string,
  gaParams: AnalyticsProperties,
  postHogEventName = gaEventName,
  postHogParams = gaParams,
): boolean {
  let tracked = false;

  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", gaEventName, gaParams);
    tracked = true;
  }

  if (postHogClient) {
    postHogClient.capture(postHogEventName, postHogParams);
    tracked = true;
  }

  return tracked;
}

export function trackSeoEvent(name: SeoEventName, params: SeoEventParams): boolean {
  return trackAnalyticsEvent(name, params);
}

export function trackPageView(params: PageViewParams): boolean {
  return trackAnalyticsEvent(
    "page_view",
    params,
    "$pageview",
    {
      ...params,
      $current_url: params.page_location,
    },
  );
}

export function trackWebVital(name: WebVitalName, params: WebVitalParams): boolean {
  return trackAnalyticsEvent(name, params);
}
