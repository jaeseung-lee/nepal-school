import Link from "next/link";

const METRICS: { value: string; unit: string; label: string; sub: string; href?: string }[] = [
  { value: "6", unit: "종", label: "취급 비자와 제도", sub: "한국 5종, 일본 특정기능 1호", href: "/visa" },
  { value: "3", unit: "개국", label: "협력 국가", sub: "네팔, 한국, 일본" },
  { value: "9", unit: "곳", label: "협력 파트너", sub: "교육, 송출, 산업, 정부, 지자체" },
];

export default function MetricsStrip() {
  return (
    <section aria-label="객관 지표" className="border-b border-line bg-paper-soft">
      <div className="max-w-content mx-auto grid gap-8 px-5 py-12 lg:grid-cols-[0.95fr_1.6fr] lg:px-8 lg:py-14">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink lg:text-3xl">
            확인 가능한 사실만 전면에 둡니다
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
            신생 기업으로서 취업자 수나 순위처럼 검증할 수 없는 실적 수치는 표기하지 않습니다.
          </p>
        </div>
        <dl className="grid gap-4 sm:grid-cols-3">
          {METRICS.map((metric) => (
            <div key={metric.label} className="border-l border-line pl-5">
              <dt className="text-sm font-semibold text-ink">{metric.label}</dt>
              <dd className="mt-3 font-display text-5xl font-semibold text-cobalt">
                {metric.value}
                <span className="ml-1 align-top text-xl text-clay">{metric.unit}</span>
              </dd>
              <dd className="mt-2 text-sm leading-relaxed text-muted">
                {metric.href ? (
                  <Link href={metric.href} className="underline underline-offset-2 transition hover:text-cobalt">
                    {metric.sub}
                  </Link>
                ) : (
                  metric.sub
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
