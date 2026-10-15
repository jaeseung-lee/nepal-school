import Link from "next/link";
import PageBanner from "@/components/page-banner";
import { KEY_VISUALS } from "@/lib/key-visuals";
import { SECTION_LABELS } from "@/lib/section-labels";
import CtaBanner from "@/components/cta-banner";
import VisaSchema from "@/components/visa/visa-schema";
import VisaGlance from "@/components/visa/visa-glance";
import FaqList from "@/components/visa/faq-list";
import RelatedVisas from "@/components/visa/related-visas";
import VisaDisclaimer from "@/components/visa/visa-disclaimer";
import { buildVisaMetadata, getVisa } from "@/lib/visas";

// 사실 출처: 리포 루트 01-제도-비자.md §5·6 (OTIT·出入国在留管理庁 안내)
export const metadata = buildVisaMetadata("ikusei-shuro");

const visa = getVisa("ikusei-shuro");

// 기능실습 단계 구조 - 01-제도-비자.md §6
const TRAINING_STAGES = [
  { stage: "技能実習 1호", period: "1년 이내", desc: "입국, 원칙 약 2개월 강습, 기초 실습" },
  { stage: "技能実習 2호", period: "2년 이내", desc: "기초급 시험 합격 후 2~3년차 실습" },
  { stage: "技能実習 3호", period: "2년 이내", desc: "우량 감리단체·실습실시자에서 4~5년차 실습" },
];

// 육성취로 vs 특정기능 직접채용 - 01-제도-비자.md §7
const DECISION_GUIDE = [
  { label: "제도 목적", ikusei: "인재육성 후 특정기능으로 전환", ssw: "시험 합격 인력 채용" },
  { label: "투입 시점", ikusei: "육성 후 현장 배치", ssw: "시험 통과 인력을 바로 현장 투입" },
  { label: "중간기관", ikusei: "감독·지원기관 체계 존재", ssw: "없음 (기업 직접고용)" },
  { label: "전직", ikusei: "제한적", ssw: "같은 분야 안에서 가능" },
  { label: "적합한 경우", ikusei: "육성 전제의 장기 수급 계획", ssw: "당장 인력이 필요한 현장" },
];

export default function IkuseiShuroPage() {
  return (
    <main>
      <VisaSchema visa={visa} />

      <PageBanner
        eyebrow="일본 비자 정보 · 제도 전환"
        context="OTIT·出入国在留管理庁 안내 기준"
        titleKo="육성취로 (구 기능실습)"
        desc="기능실습제도는 2027년 4월 폐지되고 육성취로(育成就労)로 전환됩니다. 특정기능 1호로 전환할 인재를 육성하는 새 제도와 채용 시 확인할 내용을 정리했습니다."
        crumb="비자 정보"
        photo={KEY_VISUALS.visas["ikusei-shuro"]}
        label={SECTION_LABELS.pages.visa}
      />

      <section className="bg-paper py-section">
        <div className="page-wrap">
          <div>
            <VisaGlance visa={visa} />
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-paper py-section">
        <div className="page-wrap">
          <div className="bg-paper-soft p-8 lg:p-12">
            <div className="max-w-3xl">
              <div>
                <h2 className="text-title text-ink">무엇이 바뀌나</h2>
                <p className="mt-3 text-description text-muted">
                  기능실습은 명목상 &ldquo;기술이전·국제협력&rdquo; 제도였지만, 실제로는 인력부족 업종의
                  현장 근로로 기능해 왔다는 비판이 있었습니다. 2024년 6월 공포된 개정법은 기능실습을
                  폐지하고, <strong className="font-semibold text-ink">인력 확보와 인재 육성을 목적으로
                  명시한 육성취로(育成就労)</strong>를 신설했습니다. 시행일은{" "}
                  <strong className="font-semibold text-ink">2027년 4월 1일</strong>이고, 1호 기능실습계획의
                  인정신청은 OTIT가 2027년 2월까지 하도록 안내합니다. 기존 실습생과 시행 전 신청된
                  계획에는 별도의 경과조치가 있습니다. 육성취로는 육성 기간을 거쳐{" "}
                  <Link href="/visa/tokutei-ginou" className="font-medium text-ink underline decoration-ink/35 underline-offset-4 hover:decoration-ink">
                    특정기능 1호
                  </Link>
                  로 전환할 인재를 육성하는 제도입니다.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-subhead text-balance text-ink">
              기능실습 단계 (경과 기간 참고)
            </h2>
            <p className="mt-6 max-w-3xl text-description text-muted">
              전환 전까지는 기존 기능실습 제도가 유지됩니다. 단체감리형에서는 비영리 감리단체가 해외
              송출기관과 일본 기업(실습실시자)을 연결하고 감독합니다. 고용주는 감리단체가 아니라
              실습실시자입니다.
            </p>
          </div>
          <div className="mt-10 grid gap-x-8 gap-y-10 lg:grid-cols-3">
            {TRAINING_STAGES.map((item) => (
              <article key={item.stage} className="border-t border-ink pt-6">
                <span className="inline-flex text-meta font-semibold text-muted">
                  {item.period}
                </span>
                <h3 className="mt-3 text-lg font-bold tracking-[-0.02em] text-ink">{item.stage}</h3>
                <p className="mt-3 text-description text-muted">{item.desc}</p>
              </article>
            ))}
          </div>
          <div className="mt-8 border-l-2 border-ink py-1 pl-6">
            <h3 className="text-lg font-bold tracking-[-0.02em] text-ink">
              기능실습 수료자의 특정기능 전환
            </h3>
            <p className="mt-3 max-w-3xl text-description text-muted">
              기능실습 2호를 양호하게 수료한 인력은 관련 분야의 특정기능 1호로 전환할 때
              기술시험·일본어시험이 면제될 수 있습니다. 일본 국내에도 이 경로로 전환할 수 있는 인력이
              있으므로, 신규 해외 채용과 함께 검토할 수 있는 대안입니다.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-paper py-section">
        <div className="page-wrap">
          <div>
            <div className="flex items-start gap-4">
              <div>
                <h2 className="text-headline text-balance text-ink">
                  육성취로 vs 특정기능 직접채용
                </h2>
                <p className="mt-6 max-w-3xl text-description text-muted">
                  2027년 이후 일본 인력 도입에서는 이 두 경로를 검토하게 됩니다. 적합한 제도는
                  인력이 필요한 시점과 육성 여력에 따라 달라집니다.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-10 overflow-x-auto border-t border-ink">
            <table className="w-full min-w-[640px] text-left text-[15px]">
              <thead>
                <tr className="border-b border-ink">
                  <th scope="col" className="py-4 pr-6 font-semibold text-muted">구분</th>
                  <th scope="col" className="py-4 pr-6 font-bold text-ink">육성취로 (2027.4~)</th>
                  <th scope="col" className="py-4 pr-6 font-bold text-ink">특정기능 1호 직접채용</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {DECISION_GUIDE.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="py-4 pr-6 align-top font-semibold text-ink">{row.label}</th>
                    <td className="py-4 pr-6 align-top leading-relaxed text-ink">{row.ikusei}</td>
                    <td className="py-4 pr-6 align-top leading-relaxed text-ink">{row.ssw}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-paper py-section">
        <div className="page-wrap">
          <div>
            <h2 className="text-headline text-balance text-ink">자주 묻는 질문</h2>
          </div>
          <div className="mt-10">
            <FaqList faqs={visa.faqs} />
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-paper py-section">
        <div className="page-wrap">
          <div>
            <h2 className="text-subhead text-balance text-ink">관련 비자·제도</h2>
          </div>
          <div className="mt-8">
            <RelatedVisas slugs={visa.related} />
          </div>
          <div className="mt-10 border-l-2 border-ink py-1 pl-6">
            <h3 className="text-lg font-bold tracking-[-0.02em] text-ink">정우인재개발원의 역할</h3>
            <p className="mt-3 text-description text-muted">
              제도 전환기에 필요한 채용 계획을 함께 검토합니다. 시험을 통과한 특정기능 1호 직접채용과
              육성을 전제로 한 경로를 기업 상황에 맞게 비교해 드립니다.{" "}
              <Link href="/services" className="font-medium text-ink underline decoration-ink/35 underline-offset-4 hover:decoration-ink">
                사업영역 보기
              </Link>
            </p>
          </div>
          <div className="mt-8">
            <VisaDisclaimer />
          </div>
        </div>
      </section>

      <CtaBanner />
    </main>
  );
}
