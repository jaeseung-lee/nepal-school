"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ANALYTICS_READY_EVENT, trackPageView, trackSeoEvent, type SeoEventName } from "@/lib/analytics";
import type { Locale } from "@/lib/i18n";

export default function SeoTracker({ locale }: { locale: Locale }) {
  const pathname = usePathname() || "/";
  const recorded = useRef(new Set<string>());

  useEffect(() => {
    let pageViewRecorded = false;
    const recordPageView = () => {
      if (pageViewRecorded) return;
      const sent = trackPageView({
        locale,
        page_path: pathname,
        page_location: `${window.location.origin}${pathname}`,
        page_title: document.title,
      });
      if (sent) pageViewRecorded = true;
    };

    recordPageView();
    window.addEventListener(ANALYTICS_READY_EVENT, recordPageView);
    return () => window.removeEventListener(ANALYTICS_READY_EVENT, recordPageView);
  }, [locale, pathname]);

  useEffect(() => {
    const recordVisaView = () => {
      const eventKey = `visa:${pathname}`;
      if (!pathname.includes("/visa") || recorded.current.has(eventKey)) return;
      const sent = trackSeoEvent("visa_content_viewed", {
        locale,
        page_path: pathname,
        content_id: pathname.split("/").filter(Boolean).at(-1) ?? "visa",
        jurisdiction: pathname.includes("tokutei") || pathname.includes("ikusei") ? "JP" : "KR",
      });
      if (sent) recorded.current.add(eventKey);
    };
    recordVisaView();
    window.addEventListener(ANALYTICS_READY_EVENT, recordVisaView);

    if (!pathname.includes("/blog/")) return () => window.removeEventListener(ANALYTICS_READY_EVENT, recordVisaView);
    const articleKey = `article:${pathname}`;
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0 || window.scrollY / scrollable < 0.75 || recorded.current.has(articleKey)) return;
      const sent = trackSeoEvent("article_read", { locale, page_path: pathname, content_id: pathname.split("/").at(-1) });
      if (sent) {
        recorded.current.add(articleKey);
        window.removeEventListener("scroll", onScroll);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener(ANALYTICS_READY_EVENT, recordVisaView);
    };
  }, [locale, pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const element = (event.target as Element | null)?.closest<HTMLElement>("[data-seo-event]");
      const name = element?.dataset.seoEvent as SeoEventName | undefined;
      if (!element || !name) return;
      trackSeoEvent(name, {
        locale: element.dataset.locale ?? locale,
        page_path: pathname,
        content_id: element.dataset.contentId,
        jurisdiction: element.dataset.jurisdiction,
      });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [locale, pathname]);

  return null;
}
