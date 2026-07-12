import type { Metadata } from "next";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import PageBanner from "@/components/page-banner";
import CtaBanner from "@/components/cta-banner";
import Reveal from "@/components/reveal";
import JsonLd from "@/components/json-ld";
import VisaDisclaimer from "@/components/visa/visa-disclaimer";
import { SITE_URL } from "@/lib/site";
import { buildPageMetadata } from "@/lib/seo";
import { visasByCountry, VISAS, type Visa } from "@/lib/visas";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "외국인 채용 비자 정보 - 한국 E-9·E-7·E-8, 일본 특정기능",
    description:
      "외국인 인력 채용에 쓰이는 비자와 제도를 한곳에 정리했습니다. 한국 고용허가제 E-9, 전문인력 E-7, 유학 D-2·D-4, 계절근로 E-8과 일본 특정기능 1호, 개호·숙박 분야, 육성취로까지 제도별 요건과 절차를 안내합니다.",
    path: "/visa",
  }),
  keywords: ["외국인 채용 비자", "외국인 근로자 비자", "취업비자 종류", "고용허가제", "특정기능"],
};

// E-9 vs 특정기능 1호 vs 육성취로 비교 - 출처: 리포 루트 01-제도-비자.md §6
const COMPARISON = {
  columns: ["한국 E-9", "일본 특정기능 1호", "일본 육성취로 (2027.4~)"],
  rows: [
    {
      label: "법적 성격",
      values: ["비전문 외국인력 취업 비자", "인력부족 분야 즉전력 취업 자격", "특정기능 이행을 전제로 한 육성 제도"],
    },
    {
      label: "체류기간",
      values: ["기본 3년 + 재고용 연장", "통산 5년", "육성 기간 후 특정기능 1호 이행"],
    },
    {
      label: "입국 전 시험",
      values: ["EPS-TOPIK 등 고용허가제 절차", "일본어시험 + 분야별 기능시험", "제도 취지상 육성 전제 (요건은 분야별 확정)"],
    },
    {
      label: "중간기관",
      values: ["정부 간 G2G 알선", "없음 (기업 직접고용, 지원은 위탁 가능)", "감독·지원기관 구조 유지"],
    },
    {
      label: "이직·전직",
      values: ["사업장 변경 제한", "같은 분야 안에서 전직 가능", "제한적"],
    },
  ],
};

function VisaCard({ visa }: { visa: Visa }) {
  return (
    <Link
      href={`/visa/${visa.slug}`}
      className="group flex flex-col rounded-[24px] border border-line bg-surface p-6 shadow-sm shadow-ink/5 transition hover:border-cobalt"
    >
      <span className="inline-flex self-start rounded-full bg-cobalt-soft px-3 py-1 text-xs font-semibold text-cobalt">
        {visa.code}
      </span>
      <h3 className="mt-3 font-display text-xl font-semibold text-ink">{visa.nameKo}</h3>
      <p className="mt-2 flex-1 text-[15px] leading-relaxed text-muted">{visa.summary}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-cobalt">
        자세히 보기
        <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  );
}

export default function VisaHubPage() {
  const koreaVisas = visasByCountry("korea");
  const japanVisas = visasByCountry("japan");

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "홈", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "비자 정보", item: `${SITE_URL}/visa` },
    ],
  };

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "외국인 채용 비자·제도 안내",
    itemListElement: VISAS.map((visa, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: visa.nameKo,
      url: `${SITE_URL}/visa/${visa.slug}`,
    })),
  };

  return (
    <main>
      <JsonLd data={breadcrumb} />
      <JsonLd data={itemList} />

      <PageBanner
        eyebrow="비자 정보"
        context="정부 공식 기준으로 정리한 제도별 안내"
        titleKo="외국인 채용 비자 정보"
        desc="외국인 인력 채용은 어떤 비자·제도를 쓰는지에서 시작합니다. 한국과 일본의 취업 비자를 기업 인사담당자 관점에서 제도별로 정리했습니다."
        crumb="비자 정보"
        bgImage="/kv/redesign/process.webp"
      />

      <section className="bg-paper">
        <div className="max-w-content mx-auto px-5 py-20 lg:px-8 lg:py-28">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">한국 취업비자</h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
              고용허가제(E-9)부터 전문인력(E-7), 유학생 파이프라인(D-2·D-4), 계절근로(E-8)까지 —
              필요한 인력의 성격에 따라 쓰는 제도가 다릅니다.
            </p>
          </Reveal>
          <Reveal delay={0.08} className="mt-10 grid gap-5 sm:grid-cols-2">
            {koreaVisas.map((visa) => (
              <VisaCard key={visa.slug} visa={visa} />
            ))}
          </Reveal>
        </div>
      </section>

      <section className="bg-paper-soft">
        <div className="max-w-content mx-auto px-5 py-20 lg:px-8 lg:py-28">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">일본 취업 제도</h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
              일본은 특정기능 1호가 중심입니다. 개호·숙박 등 분야별 요건이 다르고, 기능실습은 2027년
              4월부터 육성취로 제도로 전환됩니다.
            </p>
          </Reveal>
          <Reveal delay={0.08} className="mt-10 grid gap-5 sm:grid-cols-2">
            {japanVisas.map((visa) => (
              <VisaCard key={visa.slug} visa={visa} />
            ))}
          </Reveal>
        </div>
      </section>

      <section className="bg-paper">
        <div className="max-w-content mx-auto px-5 py-20 lg:px-8 lg:py-28">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">
              E-9 · 특정기능 1호 · 육성취로 비교
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
              &ldquo;인력부족 업종의 외국인 채용&rdquo;이라는 기능은 비슷하지만 법적 성격과 구조가 다릅니다.
              한·일 채용을 함께 검토할 때 가장 자주 비교되는 세 제도입니다.
            </p>
          </Reveal>
          <Reveal delay={0.08} className="mt-10 overflow-x-auto rounded-[24px] border border-line bg-surface shadow-sm shadow-ink/5">
            <table className="w-full min-w-[720px] text-left text-[15px]">
              <thead>
                <tr className="border-b border-line bg-paper-soft">
                  <th scope="col" className="px-5 py-4 font-semibold text-muted">구분</th>
                  {COMPARISON.columns.map((column) => (
                    <th key={column} scope="col" className="px-5 py-4 font-display font-semibold text-ink">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {COMPARISON.rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="px-5 py-4 align-top font-semibold text-cobalt">
                      {row.label}
                    </th>
                    {row.values.map((value, index) => (
                      <td key={index} className="px-5 py-4 align-top leading-relaxed text-ink">
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
          <Reveal delay={0.12} className="mt-8">
            <VisaDisclaimer />
          </Reveal>
        </div>
      </section>

      <CtaBanner />
    </main>
  );
}
