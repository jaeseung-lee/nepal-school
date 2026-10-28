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

const CAMPAIGN_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

// 분석 도구로 보내는 주소는 UTM 캠페인 태그만 남기고 나머지 쿼리와 해시는 지운다.
export function analyticsUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return value;
    const campaign = new URLSearchParams();
    for (const key of CAMPAIGN_PARAMS) {
      const param = url.searchParams.get(key);
      if (param) campaign.set(key, param);
    }
    const query = campaign.toString();
    return `${url.origin}${url.pathname}${query ? `?${query}` : ""}`;
  } catch {
    return value.split(/[?#]/, 1)[0];
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
