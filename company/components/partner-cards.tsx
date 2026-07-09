const PARTNERS = [
  {
    flag: "🇳🇵",
    name: "Richhood Overseas",
    desc: "네팔 인력공급기관 · 근로자 선발·자격 검증·출입국 행정 MOU 파트너",
    badge: "MOU 2026.07.05",
  },
  { flag: "🇳🇵", name: "Kathmandu Technical School", desc: "네팔 직업훈련학교 · 현지 직무·기능 교육" },
  { flag: "🇳🇵", name: "청소년고용노동부", desc: "네팔 정부 부처 · 계절근로자 파견 MOU 주무 기관" },
  { flag: "🇻🇳", name: "Vinako", desc: "베트남 유학·인재 송출 협력 (한국 방향)" },
  { flag: "🇰🇷", name: "대한주택건설협회", desc: "한국 주택건설 산업 단체 · 산업 현장 수요 연계" },
  { flag: "🇰🇷", name: "용인시", desc: "외국인 계절근로자 프로그램 운영(법무부 지침) · 농업 분야 협력" },
];

/** 파트너 6곳 카드 그리드 (홈 티저·파트너십 페이지 공용) — 로고는 사용 허락 후 교체 */
export default function PartnerCards() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {PARTNERS.map((p) => (
        <article
          key={p.name}
          className="rounded-[20px] border border-gray-200 bg-white p-6 flex flex-col hover:shadow-xl hover:shadow-primary-main/10 transition"
        >
          <div className="ph h-20 rounded-xl flex items-center justify-center" aria-hidden="true">
            <span className="font-mono text-[10px] text-gray-500">[ 로고 ]</span>
          </div>
          <h3 className="mt-5 text-base font-bold text-gray-900 flex items-center gap-2">
            <span aria-hidden="true">{p.flag}</span> {p.name}
          </h3>
          {"badge" in p && p.badge ? (
            <span className="mt-3 inline-flex w-fit rounded-full bg-primary-main/10 px-3 py-1 text-[11px] font-semibold text-primary-main">
              {p.badge}
            </span>
          ) : null}
          <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{p.desc}</p>
        </article>
      ))}
    </div>
  );
}
