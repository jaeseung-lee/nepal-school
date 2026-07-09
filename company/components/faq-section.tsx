// 자주 묻는 질문 (FAQ)
// GEO/AI 검색 인용 최적화: 질문형 헤딩 + 자기완결형 답변(첫 문장에 직접 답).
// 모든 답변은 사이트 내 확인된 사실만 사용한다(추정·과장 금지).
// 상업 사이트는 FAQPage 스키마 대신 시맨틱 구조를 권장(구글 FAQ 리치결과 2026-05 종료).
const FAQS = [
  {
    q: "정우인재개발원은 어떤 회사인가요?",
    a: "정우인재개발원은 네팔·베트남 인재를 현지 직업훈련부터 양성해 한국·일본 기업에 합법적으로 연결하는 글로벌 인적자원 개발 기업입니다. 2026년 6월 설립됐으며, 선발·교육·시험·매칭·비자·정착까지 전 과정을 원스톱으로 책임집니다.",
  },
  {
    q: "어떤 취업비자와 제도를 지원하나요?",
    a: "한국은 E-9(비전문취업)·E-7(특정활동)·D-2(유학)·D-4(연수)·E-8(계절근로)를, 일본은 특정기능 1호를 지원합니다. 취급하는 비자·제도는 총 6종이며, 기업 요건과 직무에 맞는 제도를 설계해 리스크 없이 채용을 진행합니다.",
  },
  {
    q: "채용은 어떤 절차로 진행되나요?",
    a: "선발 → 교육 → 시험 → 매칭 → 계약·비자 → 입국 → 정착의 7단계 원스톱 프로세스로 진행됩니다. 각 단계마다 해당 분야의 검증된 현지 파트너가 함께하며, 어디서 무엇이 진행되는지 투명하게 공개합니다.",
  },
  {
    q: "어느 나라의 인재를 연결하나요?",
    a: "네팔과 베트남 현지에서 양성한 인재를 한국과 일본 기업에 연결합니다. 네팔·베트남·한국·일본 4개국에 걸친 협력 네트워크를 기반으로 합니다.",
  },
  {
    q: "어떤 시험을 준비시키나요?",
    a: "한국 취업을 위한 EPS-TOPIK(고용허가제 한국어능력시험)과 일본 취업을 위한 JFT(일본어 기초 테스트)를 현지 교육 단계에서 준비시킵니다. 시험을 통과한 준비된 인재만 기업에 매칭합니다.",
  },
  {
    q: "일본은 어떤 직종을 지원하나요?",
    a: "일본은 특정기능 제도의 개호(介護)와 숙박 분야를 지원합니다. 일본어와 기능시험을 통과해 현장에 바로 투입할 수 있는 인재를 매칭합니다.",
  },
  {
    q: "신생 기업인데 신뢰할 수 있나요?",
    a: "정우인재개발원은 검증 가능한 객관 지표만 공개하고, 확인할 수 없는 자사 실적 수치(취업자 수·순위 등)는 원칙적으로 표기하지 않습니다. 2026년 7월 5일 Richhood Overseas Inc. (P) Ltd.와 MOU를 체결해 네팔 근로자 선발·자격 검증·출입국 행정 협력 체계를 마련했으며, 교육·송출·유학·산업 수요 분야의 협력 파트너 기관과 함께 각 단계를 진행합니다.",
  },
];

/** FAQ 섹션 (홈 하단) — 순수 HTML details/summary로 JS 없이 동작 */
export default function FaqSection() {
  return (
    <section className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-content mx-auto px-5 lg:px-8 py-20 lg:py-28">
        <span className="text-xs font-display font-semibold tracking-[0.22em] text-primary-main uppercase">
          FAQ
        </span>
        <h2 className="mt-3 font-display text-3xl lg:text-5xl font-bold tracking-tight text-gray-900">
          자주 묻는 질문
        </h2>
        <p className="mt-4 text-base text-gray-600 leading-relaxed max-w-2xl">
          외국인력 채용을 검토하는 기업이 가장 많이 묻는 질문을 모았습니다.
        </p>

        <div className="mt-10 max-w-3xl divide-y divide-gray-200 border-y border-gray-200">
          {FAQS.map((f, i) => (
            <details key={f.q} open={i === 0} className="group py-2">
              <summary className="flex cursor-pointer items-center justify-between gap-4 py-4 text-[17px] font-semibold text-gray-900 marker:content-none [&::-webkit-details-marker]:hidden">
                {f.q}
                <span
                  aria-hidden="true"
                  className="shrink-0 text-primary-main transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="pb-5 pr-8 text-[15px] text-gray-600 leading-relaxed">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
