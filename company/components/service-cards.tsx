const SERVICES = [
  {
    no: "BUSINESS 01",
    title: "네팔 직업훈련학교",
    titleExtra: null as string | null,
    desc: "인재는 보내는 게 아니라 키우는 것 — 현지에서 직무·언어·문화를 갖춘 즉전력을 양성합니다.",
    cta: "교육 기반 양성",
    photo: "현지 교육 현장",
    img: "/kv/svc-nepal.webp",
  },
  {
    no: "BUSINESS 02",
    title: "한국 취업비자",
    titleExtra: null as string | null,
    desc: "E-9 · E-7 · D-2 · D-4 · 계절근로자까지, 제도에 맞춰 리스크 없이 채용을 지원합니다.",
    cta: "제도 기반 채용",
    photo: "한국 산업현장",
    img: "/kv/svc-korea.webp",
  },
  {
    no: "BUSINESS 03",
    title: "일본 취업비자",
    titleExtra: "(특정기능)" as string | null,
    desc: "개호·숙박 — 일본어·기능시험을 통과한 준비된 인재를 매칭합니다.",
    cta: "준비된 인재 매칭",
    photo: "일본 개호·숙박 현장",
    img: "/kv/svc-japan.webp",
  },
];

/** 3대 사업영역 카드 그리드 (홈 티저·사업영역 페이지 공용) */
export default function ServiceCards() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {SERVICES.map((s) => (
        <article
          key={s.no}
          className="group flex flex-col rounded-[20px] border border-gray-200 bg-white overflow-hidden hover:shadow-2xl hover:shadow-primary-main/10 hover:-translate-y-1 transition"
        >
          <div
            className="h-48 bg-cover bg-center"
            style={{ backgroundImage: `url('${s.img}')` }}
            role="img"
            aria-label={s.photo}
          ></div>
          <div className="p-7 flex flex-col grow">
            <span className="text-xs font-display font-semibold text-gold-deep tracking-wider">{s.no}</span>
            <h3 className="mt-2 text-xl font-bold text-gray-900">
              {s.title}
              {s.titleExtra ? <span className="text-gray-400 font-semibold text-base"> {s.titleExtra}</span> : null}
            </h3>
            <p className="mt-3 text-[15px] text-gray-600 leading-relaxed grow">{s.desc}</p>
            <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-main">
              {s.cta}{" "}
              <span aria-hidden="true" className="group-hover:translate-x-1 transition">
                →
              </span>
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
