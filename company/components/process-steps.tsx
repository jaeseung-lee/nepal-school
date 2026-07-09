const STEPS = [
  { n: 1, title: "선발", note: "적격자 모집·선별" },
  { n: 2, title: "교육", note: "직무·언어·문화" },
  { n: 3, title: "시험", note: "EPS-TOPIK · JFT" },
  { n: 4, title: "매칭", note: "기업 요건-인재 연결", highlight: true },
  { n: 5, title: "계약·비자", note: "고용계약 · 사증/COE" },
  { n: 6, title: "입국", note: "배치·생활지원" },
  { n: 7, title: "정착", note: "사후관리" },
];

/** 원스톱 7단계 프로세스 (홈·사업영역 공용) — 4단계(매칭)만 강조 */
export default function ProcessSteps() {
  return (
    <section className="bg-primary-dark text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-deepest via-primary-dark to-primary-main/60" aria-hidden="true"></div>
      <div className="relative max-w-content mx-auto px-5 lg:px-8 py-20 lg:py-28">
        <div className="max-w-2xl">
          <span className="text-xs font-display font-semibold tracking-[0.22em] text-gold-light uppercase">One-Stop Process</span>
          <h2 className="mt-3 font-display text-3xl lg:text-5xl font-bold tracking-tight">From Training to Settlement</h2>
          <p className="mt-3 text-2xl font-bold">선발부터 정착까지, 원스톱</p>
          <p className="mt-4 text-base text-white/70 leading-relaxed">각 단계마다 그 분야의 검증된 파트너가 함께합니다. 어디서 무엇이 진행되는지 투명하게 공개합니다.</p>
        </div>
        <ol className="mt-14 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-y-10 gap-x-4 [overflow-x:clip]">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className={`relative ${s.n !== STEPS.length ? "step-line " : ""}flex flex-col items-center text-center`}
            >
              <div
                className={
                  s.highlight
                    ? "relative z-10 w-14 h-14 rounded-full bg-gold-deep border border-gold-light flex items-center justify-center font-display text-lg font-bold shadow-lg shadow-black/30"
                    : "relative z-10 w-14 h-14 rounded-full bg-primary-light border border-white/15 flex items-center justify-center font-display text-lg font-bold"
                }
              >
                {s.n}
              </div>
              <span className="mt-3 text-[15px] font-semibold">{s.title}</span>
              <span className="mt-1 text-xs text-white/60">{s.note}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
