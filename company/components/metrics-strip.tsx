import Link from "next/link";
import { getMessages, localizedHref, type Locale } from "@/lib/i18n";

const METRIC_KEYS = [
  { key: "visa", href: "/visa" },
  { key: "countries" },
  { key: "partners" },
] as const;

/**
 * 검증 가능한 수치 3개. 홈에서는 인트로 안에 들어가는 `inline`, 회사소개에서는 독립 섹션인 `section`.
 */
export default function MetricsStrip({ locale = "ko", layout = "section" }: { locale?: Locale; layout?: "section" | "inline" }) {
  const metrics = getMessages(locale).metrics;

  const list = (
    <dl className="grid gap-y-10 sm:grid-cols-3 sm:divide-x sm:divide-line">
      {METRIC_KEYS.map((item) => {
        const metric = metrics.items[item.key];
        const href = "href" in item ? item.href : undefined;
        return (
          <div key={metric.label} className="flex flex-col sm:px-8 sm:first:pl-0 sm:last:pr-0">
            <dt className="text-meta text-muted">{metric.label}</dt>
            <dd className="mt-3 text-[clamp(2.5rem,1.6rem+2.4vw,4rem)] font-[750] leading-none tracking-[-0.04em] tabular-nums">
              {metric.value}
              <span className="ml-1 align-top text-lg font-semibold tracking-normal text-muted">{metric.unit}</span>
            </dd>
            <dd className="mt-4 text-[13px] leading-relaxed text-muted">
              {href ? (
                <Link
                  href={localizedHref(locale, href)}
                  className="underline decoration-ink/35 underline-offset-4 transition hover:text-ink hover:decoration-ink"
                >
                  {metric.sub}
                </Link>
              ) : (
                metric.sub
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );

  if (layout === "inline") {
    return (
      <section aria-label={metrics.ariaLabel} className="mx-auto mt-24 max-w-5xl border-t border-line pt-12 text-left">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-12">
          <h3 className="text-[15px] font-bold text-ink">{metrics.title}</h3>
          <p className="text-[13px] leading-relaxed text-muted">{metrics.description}</p>
        </div>
        <div className="mt-12">{list}</div>
      </section>
    );
  }

  return (
    <section aria-label={metrics.ariaLabel} className="border-t border-line bg-surface">
      <div className="page-wrap grid gap-12 py-section lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div>
          <h2 className="text-subhead text-balance text-ink">{metrics.title}</h2>
          <p className="mt-5 max-w-md text-description text-muted">{metrics.description}</p>
        </div>
        {list}
      </div>
    </section>
  );
}
