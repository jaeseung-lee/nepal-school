import { GraduationCap } from "@phosphor-icons/react/dist/ssr";
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

// 한국 출입국관리법령상 유학(D-2)·일반연수(D-4)의 공개된 제도 구조 기준.
// 시간제취업 시간 한도 등 지침으로 바뀌는 수치는 싣지 않는다.
export const metadata = buildVisaMetadata("d-2-d-4");

const visa = getVisa("d-2-d-4");

const COMPARISON = [
  { label: "대상", d2: "전문대 이상 학위과정(학사·석사·박사 등) 유학생", d4: "대학 부설 어학원 등 어학연수·일반연수생" },
  { label: "체류 목적", d2: "학위 취득", d4: "어학 등 비학위 연수" },
  { label: "시간제취업", d2: "체류자격외활동허가 후 가능 (학년·한국어능력별 한도)", d4: "일정 기간 경과 후 제한적으로 가능" },
  { label: "다음 단계", d2: "졸업 → D-10(구직) → E-7 등 취업자격", d4: "D-2(학위과정 진학)로 변경하는 경우가 많음" },
];

const PROCESS_STEPS = [
  {
    title: "시간제취업으로 첫 접점",
    desc: "체류자격외활동허가를 받은 유학생을 시간제로 고용해 실무 적합성과 한국어 능력을 검증합니다.",
  },
  {
    title: "졸업 시점에 채용 확정",
    desc: "졸업 예정자와 채용을 협의합니다. 전공과 직무의 연관성이 이후 비자 심사의 핵심 포인트입니다.",
  },
  {
    title: "D-10(구직) 자격으로 연결",
    desc: "졸업 후 즉시 취업자격 요건을 갖추지 못한 경우, 구직 자격인 D-10으로 변경해 채용 준비 기간을 확보합니다.",
  },
  {
    title: "E-7 등 취업자격으로 전환",
    desc: "채용이 확정되면 E-7 등 취업자격으로 체류자격 변경허가를 신청합니다. 해외 초청 없이 국내 절차로 완결됩니다.",
  },
];

export default function D2D4Page() {
  return (
    <main>
      <VisaSchema visa={visa} />

      <PageBanner
        eyebrow="한국 비자 정보"
        context="법무부 출입국관리법령 기준"
        titleKo="유학 D-2 · 일반연수 D-4"
        desc="유학생은 그 자체로 취업 인력은 아니지만, 재학 중 검증을 거쳐 졸업 후 정식 채용으로 이어지는 가장 안정적인 외국인 인재 파이프라인입니다."
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
          <Reveal>
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">D-2와 D-4의 차이</h2>
            <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted">
              통상 D-4(어학연수)로 입국해 한국어를 익힌 뒤 D-2(학위과정)로 변경하는 흐름이 많습니다.
              기업 입장에서 채용 파이프라인의 중심은 D-2 유학생입니다.
            </p>
          </Reveal>
          <Reveal delay={0.08} className="mt-10 overflow-x-auto rounded-[24px] border border-line bg-surface shadow-sm shadow-ink/5">
            <table className="w-full min-w-[640px] text-left text-[15px]">
              <thead>
                <tr className="border-b border-line bg-paper-soft">
                  <th scope="col" className="px-5 py-4 font-semibold text-muted">구분</th>
                  <th scope="col" className="px-5 py-4 font-display font-semibold text-ink">유학 D-2</th>
                  <th scope="col" className="px-5 py-4 font-display font-semibold text-ink">일반연수 D-4</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {COMPARISON.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="px-5 py-4 align-top font-semibold text-cobalt">{row.label}</th>
                    <td className="px-5 py-4 align-top leading-relaxed text-ink">{row.d2}</td>
                    <td className="px-5 py-4 align-top leading-relaxed text-ink">{row.d4}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>

          <Reveal delay={0.12} className="mt-8 rounded-[28px] border border-line bg-surface p-7 shadow-sm shadow-ink/5 lg:p-9">
            <div className="flex max-w-3xl flex-col gap-4 sm:flex-row">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cobalt-soft text-cobalt">
                <GraduationCap size={26} weight="duotone" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-display text-2xl font-semibold text-ink">재학 중 고용 시 유의점</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">
                  유학생을 재학 중에 고용하려면 반드시{" "}
                  <strong className="font-semibold text-ink">체류자격외활동허가(시간제취업허가)</strong>를
                  먼저 받아야 합니다. 학위과정·학년·한국어능력에 따라 주당 근무 시간 한도가 다르고 허용
                  업종에도 제한이 있습니다. 허가 없이 고용하면 유학생의 체류와 기업 모두에 불이익이
                  생기므로, 허가 여부 확인이 첫 번째 체크포인트입니다.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-paper">
        <div className="max-w-content mx-auto px-5 py-20 lg:px-8 lg:py-28">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">
              채용 파이프라인으로 쓰는 법
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
              해외에서 처음 만나는 인재보다, 국내에서 학업과 근무 태도를 확인한 인재가 채용 리스크가
              낮습니다. 유학생 채용이 파이프라인이 되는 이유입니다.
            </p>
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
              현지에서 검증한 인재의 유학 경로 설계부터, 재학 중 시간제 고용의 적법성 확인, 졸업 후
              취업자격 전환까지 파이프라인 전체를 지원합니다.{" "}
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
