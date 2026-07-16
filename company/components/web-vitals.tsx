"use client";

import { useReportWebVitals } from "next/web-vitals";

export default function WebVitals() {
  useReportWebVitals((metric) => {
    if (!window.gtag || !["LCP", "INP", "CLS"].includes(metric.name)) return;
    window.gtag("event", metric.name, {
      value: metric.name === "CLS" ? Math.round(metric.value * 1000) : Math.round(metric.value),
      event_category: "Web Vitals",
      event_label: metric.id,
      non_interaction: true,
    });
  });
  return null;
}
