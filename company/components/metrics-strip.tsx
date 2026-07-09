const METRICS = [
  { value: "6", unit: "종", label: "취급 비자·제도", sub: "E-9·E-7·D-2·D-4·E-8·특정기능1호" },
  { value: "4", unit: "개국", label: "협력 국가", sub: "네팔 · 베트남 · 한국 · 일본" },
  { value: "6", unit: "곳", label: "협력 파트너 기관", sub: "교육 · 송출 · 유학 · 산업 · 정부 · 지자체" },
];

/** 객관 지표 스트립 (홈·회사소개 공용) — 신생기업 원칙상 검증 가능한 카운트만 표기 */
export default function MetricsStrip() {
  return (
    <section aria-label="객관 지표" className="bg-gray-50 border-b border-gray-200">
      <div className="max-w-content mx-auto px-5 lg:px-8 py-12 lg:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
          {METRICS.map((m) => (
            <div key={m.label} className="flex flex-col items-center text-center px-4 py-6 sm:py-2">
              <span className="font-display text-5xl lg:text-6xl font-bold text-primary-main tracking-tight">
                {m.value}
                <span className="text-2xl align-top text-gold-deep ml-0.5">{m.unit}</span>
              </span>
              <span className="mt-2 text-sm font-semibold text-gray-800">{m.label}</span>
              <span className="mt-1 text-xs text-gray-500">{m.sub}</span>
            </div>
          ))}
        </div>
        <p className="mt-7 text-center text-xs text-gray-400 leading-relaxed max-w-3xl mx-auto">
          ※ 객관 지표만 표기합니다. 정우인재개발원은 2026년 6월 설립된 신생 기업으로, 검증할 수 없는 자사 실적 수치(취업자 수·순위 등)는 원칙적으로 표기하지 않습니다.
        </p>
      </div>
    </section>
  );
}
