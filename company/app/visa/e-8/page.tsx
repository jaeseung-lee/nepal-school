import { Plant } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import PageBanner from "@/components/page-banner";
import CtaBanner from "@/components/cta-banner";
import Reveal from "@/components/reveal";
import VisaSchema from "@/components/visa/visa-schema";
import VisaGlance from "@/components/visa/visa-glance";
import VisaProcess from "@/components/visa/visa-process";
import FaqList from "@/components/visa/faq-list";
import RelatedVisas from "@/components/visa/related-visas";
import VisaDisclaimer from "@/components/visa/visa-disclaimer";
import { buildVisaMetadata, getVisa } from "@/lib/visas";

// 한국 계절근로제(E-8)의 공개된 제도 구조 기준.
// 지자체별 배정 규모 등 변동 수치는 싣지 않는다.
export const metadata = buildVisaMetadata("e-8");

const visa = getVisa("e-8");

const E9_DIFF = [
  { label: "운영 주체", e8: "법무부·지자체", e9: "고용노동부 (고용허가제)" },
  { label: "고용 기간", e8: "계절 단위 단기 순환", e9: "기본 3년 + 재고용 연장" },
  { label: "배정 방식", e8: "지자체가 해외 지자체 MOU 등으로 배정", e9: "정부 간 알선(G2G)" },
  { label: "적합한 경우", e8: "파종·수확기 등 특정 시기 집중 작업", e9: "연중 상시 인력이 필요한 사업장" },
];

const PROCESS_STEPS = [
  {
    title: "지자체 모집 공고 확인",
    desc: "소재지 시·군의 계절근로자 모집 공고와 참여 요건을 확인합니다. 배정은 지자체 단위로 이뤄집니다.",
  },
  {
    title: "배정 신청과 심사",
    desc: "농가·업체가 지자체에 배정을 신청하면, 재배 면적·시설 등 기준에 따라 배정 인원이 결정됩니다.",
  },
  {
    title: "근로계약과 사증 발급",
    desc: "배정된 근로자와 근로계약을 체결하고, 근로자는 현지에서 E-8 사증을 발급받습니다.",
  },
  {
    title: "입국·근로 개시",
    desc: "입국 후 배정된 농가·업체에서 근무를 시작합니다. 숙소 등 근로 환경 기준을 갖춰야 합니다.",
  },
  {
    title: "체류기간 만료와 출국",
    desc: "계절근로는 단기 순환이 전제이므로 체류기간 만료 시 출국합니다. 성실 근로자는 재입국 기회가 주어질 수 있습니다.",
  },
];

export default function E8Page() {
  return (
    <main>
      <VisaSchema visa={visa} />

      <PageBanner
        eyebrow="한국 비자 정보"
        context="법무부·지자체 계절근로제 기준"
        titleKo="계절근로 E-8"
        desc="파종·수확기처럼 일손이 집중적으로 필요한 시기에 농어업 현장에 단기 외국인력을 공급하는 제도입니다. 지자체 단위 배정이 핵심 구조입니다."
        crumb="비자 정보"
        bgImage="/kv/redesign/korea.webp"
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
                <Plant size={26} weight="duotone" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-display text-2xl font-semibold text-ink">지자체 단위 배정 구조</h2>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">
                  계절근로는 개별 농가·업체가 해외에서 직접 모집하는 제도가 아닙니다.{" "}
                  <strong className="font-semibold text-ink">지자체가 해외 지자체와 MOU를 맺거나
                  결혼이민자 가족을 초청하는 방식</strong>으로 인력을 확보하고, 관내 농가·업체에
                  배정합니다. 따라서 참여의 출발점은 소재지 지자체의 모집 공고입니다. 체류 상한은 제도
                  개정에 따라 조정되어 왔으며(최대 8개월 수준), 연중 상시 인력이 필요하다면{" "}
                  <Link href="/visa/e-9" className="font-medium text-cobalt underline underline-offset-2">
                    E-9 고용허가제
                  </Link>
                  를 검토하는 것이 맞습니다.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08} className="mt-8 overflow-x-auto rounded-[24px] border border-line bg-surface shadow-sm shadow-ink/5">
            <table className="w-full min-w-[640px] text-left text-[15px]">
              <caption className="px-5 pt-5 text-left font-display text-lg font-semibold text-ink">
                E-8 vs E-9
              </caption>
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="px-5 py-4 font-semibold text-muted">구분</th>
                  <th scope="col" className="px-5 py-4 font-display font-semibold text-ink">계절근로 E-8</th>
                  <th scope="col" className="px-5 py-4 font-display font-semibold text-ink">고용허가제 E-9</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {E9_DIFF.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="px-5 py-4 align-top font-semibold text-cobalt">{row.label}</th>
                    <td className="px-5 py-4 align-top leading-relaxed text-ink">{row.e8}</td>
                    <td className="px-5 py-4 align-top leading-relaxed text-ink">{row.e9}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </div>
      </section>

      <section className="bg-paper">
        <div className="max-w-content mx-auto px-5 py-20 lg:px-8 lg:py-28">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">참여 절차</h2>
          </Reveal>
          <Reveal delay={0.08} className="mt-10">
            <VisaProcess steps={PROCESS_STEPS} />
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
              계절근로와 상시 고용(E-9) 중 어느 제도가 맞는지 검토를 돕고, 지자체 협력 구조와 현지
              송출 네트워크를 연결합니다.{" "}
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
