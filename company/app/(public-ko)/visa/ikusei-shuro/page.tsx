import { ArrowsClockwise, Signpost } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import PageBanner from "@/components/page-banner";
import CtaBanner from "@/components/cta-banner";
import Reveal from "@/components/reveal";
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
        bgImage="/kv/redesign/japan.webp"
      />

      <section className="bg-paper">
        <div className="max-w-content mx-auto px-5 py-20 lg:px-8 lg:py-28">
          <Reveal>
            <VisaGlance visa={visa} />
          </Reveal>
        </div>
      </section>

      <section className="bg-paper-soft">
        <div className="max-w-content mx-auto px-5 py-20 lg:px-8 lg:py-28">
          <Reveal className="rounded-[28px] border border-line bg-surface p-7 shadow-sm shadow-ink/5 lg:p-9">
            <div className="flex max-w-3xl flex-col gap-4 sm:flex-row">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cobalt-soft text-cobalt">
                <ArrowsClockwise size={26} weight="duotone" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-display text-2xl font-semibold text-ink">무엇이 바뀌나</h2>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">
                  기능실습은 명목상 &ldquo;기술이전·국제협력&rdquo; 제도였지만, 실제로는 인력부족 업종의
                  현장 근로로 기능해 왔다는 비판이 있었습니다. 2024년 6월 공포된 개정법은 기능실습을
                  폐지하고, <strong className="font-semibold text-ink">인력 확보와 인재 육성을 목적으로
                  명시한 육성취로(育成就労)</strong>를 신설했습니다. 시행일은{" "}
                  <strong className="font-semibold text-ink">2027년 4월 1일</strong>이고, 1호 기능실습계획의
                  신규 인정신청은 2027년 2월까지만 받습니다. 육성취로는 육성 기간을 거쳐{" "}
                  <Link href="/visa/tokutei-ginou" className="font-medium text-cobalt underline underline-offset-2">
                    특정기능 1호
                  </Link>
                  로 전환할 인재를 육성하는 제도입니다.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08} className="mt-8">
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-4xl">
              기능실습 단계 (경과 기간 참고)
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted">
              전환 전까지는 기존 기능실습 제도가 유지됩니다. 단체감리형에서는 비영리 감리단체가 해외
              송출기관과 일본 기업(실습실시자)을 연결하고 감독합니다. 고용주는 감리단체가 아니라
              실습실시자입니다.
            </p>
          </Reveal>
          <Reveal delay={0.12} className="mt-8 grid gap-4 lg:grid-cols-3">
            {TRAINING_STAGES.map((item) => (
              <article key={item.stage} className="rounded-[24px] border border-line bg-surface p-6 shadow-sm shadow-ink/5">
                <span className="inline-flex rounded-full bg-cobalt-soft px-3 py-1 text-xs font-semibold text-cobalt">
                  {item.period}
                </span>
                <h3 className="mt-3 font-display text-lg font-semibold text-ink">{item.stage}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{item.desc}</p>
              </article>
            ))}
          </Reveal>
          <Reveal delay={0.16} className="mt-8 rounded-[24px] border border-line bg-surface p-6 shadow-sm shadow-ink/5 lg:p-8">
            <h3 className="font-display text-xl font-semibold text-ink">
              기능실습 수료자의 특정기능 전환
            </h3>
            <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-muted">
              기능실습 2호를 양호하게 수료한 인력은 관련 분야의 특정기능 1호로 전환할 때
              기술시험·일본어시험이 면제될 수 있습니다. 일본 국내에도 이 경로로 전환할 수 있는 인력이
              있으므로, 신규 해외 채용과 함께 검토할 수 있는 대안입니다.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="bg-paper">
        <div className="max-w-content mx-auto px-5 py-20 lg:px-8 lg:py-28">
          <Reveal>
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cobalt-soft text-cobalt">
                <Signpost size={26} weight="duotone" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">
                  육성취로 vs 특정기능 직접채용
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted">
                  2027년 이후 일본 인력 도입에서는 이 두 경로를 검토하게 됩니다. 적합한 제도는
                  인력이 필요한 시점과 육성 여력에 따라 달라집니다.
                </p>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.08} className="mt-10 overflow-x-auto rounded-[24px] border border-line bg-surface shadow-sm shadow-ink/5">
            <table className="w-full min-w-[640px] text-left text-[15px]">
              <thead>
                <tr className="border-b border-line bg-paper-soft">
                  <th scope="col" className="px-5 py-4 font-semibold text-muted">구분</th>
                  <th scope="col" className="px-5 py-4 font-display font-semibold text-ink">육성취로 (2027.4~)</th>
                  <th scope="col" className="px-5 py-4 font-display font-semibold text-ink">특정기능 1호 직접채용</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {DECISION_GUIDE.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="px-5 py-4 align-top font-semibold text-cobalt">{row.label}</th>
                    <td className="px-5 py-4 align-top leading-relaxed text-ink">{row.ikusei}</td>
                    <td className="px-5 py-4 align-top leading-relaxed text-ink">{row.ssw}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </div>
      </section>

      <section className="bg-paper-soft">
        <div className="max-w-content mx-auto px-5 py-20 lg:px-8 lg:py-28">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">자주 묻는 질문</h2>
          </Reveal>
          <Reveal delay={0.08} className="mt-10">
            <FaqList faqs={visa.faqs} />
          </Reveal>
        </div>
      </section>

      <section className="bg-paper">
        <div className="max-w-content mx-auto px-5 py-20 lg:px-8 lg:py-28">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-4xl">관련 비자·제도</h2>
          </Reveal>
          <Reveal delay={0.08} className="mt-8">
            <RelatedVisas slugs={visa.related} />
          </Reveal>
          <Reveal delay={0.12} className="mt-10 rounded-[24px] border border-line bg-surface p-6 shadow-sm shadow-ink/5 lg:p-8">
            <h3 className="font-display text-xl font-semibold text-ink">정우인재개발원의 역할</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              제도 전환기에 필요한 채용 계획을 함께 검토합니다. 시험을 통과한 특정기능 1호 직접채용과
              육성을 전제로 한 경로를 기업 상황에 맞게 비교해 드립니다.{" "}
              <Link href="/services" className="font-medium text-cobalt underline underline-offset-2">
                사업영역 보기
              </Link>
            </p>
          </Reveal>
          <Reveal delay={0.16} className="mt-8">
            <VisaDisclaimer />
          </Reveal>
        </div>
      </section>

      <CtaBanner />
    </main>
  );
}
