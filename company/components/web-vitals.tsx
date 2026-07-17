"use client";

import { useReportWebVitals } from "next/web-vitals";
import { trackWebVital } from "@/lib/analytics";

export default function WebVitals() {
  useReportWebVitals((metric) => {
    if (metric.name !== "LCP" && metric.name !== "INP" && metric.name !== "CLS") return;
    trackWebVital(metric.name, {
      value: metric.name === "CLS" ? Math.round(metric.value * 1000) : Math.round(metric.value),
      event_category: "Web Vitals",
      event_label: metric.id,
      non_interaction: true,
    });
  });
  return null;
}
