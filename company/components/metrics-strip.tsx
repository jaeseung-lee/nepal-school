import Link from "next/link";
import { getMessages, localizedHref, type Locale } from "@/lib/i18n";

const METRIC_KEYS = [
  { key: "visa", href: "/visa" },
  { key: "countries" },
  { key: "partners" },
] as const;

export default function MetricsStrip({ locale }: { locale?: Locale }) {
  const messages = getMessages(locale);
  const metrics = messages.metrics;

  return (
    <section aria-label={metrics.ariaLabel} className="border-b border-line bg-paper-soft">
      <div className="max-w-content mx-auto grid gap-8 px-5 py-12 lg:grid-cols-[0.95fr_1.6fr] lg:px-8 lg:py-14">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink lg:text-3xl">
            {metrics.title}
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
            {metrics.description}
          </p>
        </div>
        <dl className="grid gap-4 sm:grid-cols-3">
          {METRIC_KEYS.map((item) => {
            const metric = metrics.items[item.key];
            const href = "href" in item ? item.href : undefined;
            return (
              <div key={metric.label} className="border-l border-line pl-5">
                <dt className="text-sm font-semibold text-ink">{metric.label}</dt>
                <dd className="mt-3 font-display text-5xl font-semibold text-cobalt">
                  {metric.value}
                  <span className="ml-1 align-top text-xl text-clay">{metric.unit}</span>
                </dd>
                <dd className="mt-2 text-sm leading-relaxed text-muted">
                  {href ? (
                    <Link href={localizedHref(locale ?? "ko", href)} className="underline underline-offset-2 transition hover:text-cobalt">
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
      </div>
    </section>
  );
}
