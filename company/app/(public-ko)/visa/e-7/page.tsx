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

// 한국 출입국관리법령상 특정활동(E-7)의 공개된 제도 구조 기준.
// 직종 목록·임금 하한 등 연도별 지침 수치는 싣지 않는다.
export const metadata = buildVisaMetadata("e-7");

const visa = getVisa("e-7");

const TYPES = [
  {
    code: "E-7-1",
    title: "전문인력",
    desc: "관리자·전문가 직종으로, 학위와 전공·직무의 연관성이 주요 심사 요소입니다.",
  },
  {
    code: "E-7-2",
    title: "준전문인력",
    desc: "사무·서비스 분야의 준전문 직종으로, 직종별 학력·경력 조합 요건이 적용됩니다.",
  },
  {
    code: "E-7-3",
    title: "일반기능인력",
    desc: "특정 기능 직종으로, 해당 분야의 경력과 자격이 요구됩니다.",
  },
  {
    code: "E-7-4",
    title: "숙련기능인력",
    desc: "국내 장기 체류 이력을 점수제로 평가해 전환하는 유형이며, E-9 인력을 장기 고용하는 경로로 활용됩니다.",
  },
];

const E9_DIFF = [
  { label: "선발 방식", e7: "기업이 특정 인재를 지정해 채용", e9: "정부 간 알선(G2G)으로 배정" },
  { label: "대상", e7: "고시 직종의 전문·숙련 인력", e9: "인력부족 업종의 비전문 인력" },
  { label: "핵심 심사", e7: "직종 해당 여부 + 개인 학력·경력 + 임금 요건", e9: "기업의 고용허가 요건" },
  { label: "장기 고용", e7: "갱신을 통한 장기 고용 가능", e9: "3년 + 재고용 연장 (이후 E-7-4 전환 검토)" },
];

const PROCESS_STEPS = [
  {
    title: "직종 해당 여부 확인",
    desc: "채용하려는 직무가 법무부 고시 E-7 허용 직종에 해당하는지 확인합니다. 해당하지 않으면 다른 제도를 검토해야 합니다.",
  },
  {
    title: "인재 요건·기업 요건 검토",
    desc: "후보자의 학력·경력이 직종별 요건을 충족하는지, 자사의 외국인 고용비율에 여유가 있는지 함께 확인합니다.",
  },
  {
    title: "고용계약 체결",
    desc: "임금 요건을 충족하는 조건으로 고용계약을 체결합니다.",
  },
  {
    title: "사증발급인정서 신청 또는 체류자격 변경",
    desc: "해외 인재는 사증발급인정서를 신청하고, 국내 체류 인재(유학생 등)는 체류자격 변경허가를 신청합니다.",
  },
  {
    title: "입국·근무 개시",
    desc: "사증 발급 후 입국해 근무를 시작합니다. 체류자격 변경의 경우 허가일부터 근무할 수 있습니다.",
  },
];

export default function E7Page() {
  return (
    <main>
      <VisaSchema visa={visa} />

      <PageBanner
        eyebrow="한국 비자 정보"
        context="법무부 출입국관리법령 기준"
        titleKo="특정활동 E-7 (전문·숙련인력)"
        desc="기업이 특정 직종의 외국인 전문·숙련 인력을 지정해 채용하는 비자입니다. 직종 해당 여부와 개인별 요건 심사가 핵심입니다."
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
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">네 가지 유형</h2>
            <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted">
              E-7은 하나의 비자가 아니라 전문성 수준에 따라 네 유형으로 나뉩니다. 어느 유형에
              해당하는지에 따라 요건과 절차가 달라집니다.
            </p>
          </Reveal>
          <Reveal delay={0.08} className="mt-10 grid gap-4 sm:grid-cols-2">
            {TYPES.map((type) => (
              <article key={type.code} className="rounded-[24px] border border-line bg-surface p-6 shadow-sm shadow-ink/5">
                <span className="inline-flex rounded-full bg-cobalt-soft px-3 py-1 text-xs font-semibold text-cobalt">
                  {type.code}
                </span>
                <h3 className="mt-3 font-display text-xl font-semibold text-ink">{type.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{type.desc}</p>
              </article>
            ))}
          </Reveal>

          <Reveal delay={0.12} className="mt-8 rounded-[24px] border border-line bg-surface p-6 shadow-sm shadow-ink/5 lg:p-8">
            <h3 className="font-display text-xl font-semibold text-ink">요건의 뼈대</h3>
            <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-muted">
              공통적으로 ① 직종별 학력·경력 조합 요건(일반적으로 관련 전공 학사 이상, 또는
              전문학사·상당 경력의 조합), ② 일정 수준 이상의 임금 요건, ③ 업종별 내국인 고용 대비
              외국인 고용비율 제한이 적용됩니다. 구체 기준은 법무부의 연도별 지침으로 바뀌므로 채용
              시점에 반드시 최신 기준을 확인해야 합니다.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="bg-paper">
        <div className="max-w-content mx-auto px-5 py-20 lg:px-8 lg:py-28">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">E-9와의 차이</h2>
          </Reveal>
          <Reveal delay={0.08} className="mt-10 overflow-x-auto rounded-[24px] border border-line bg-surface shadow-sm shadow-ink/5">
            <table className="w-full min-w-[640px] text-left text-[15px]">
              <thead>
                <tr className="border-b border-line bg-paper-soft">
                  <th scope="col" className="px-5 py-4 font-semibold text-muted">구분</th>
                  <th scope="col" className="px-5 py-4 font-display font-semibold text-ink">E-7</th>
                  <th scope="col" className="px-5 py-4 font-display font-semibold text-ink">E-9</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {E9_DIFF.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="px-5 py-4 align-top font-semibold text-cobalt">{row.label}</th>
                    <td className="px-5 py-4 align-top leading-relaxed text-ink">{row.e7}</td>
                    <td className="px-5 py-4 align-top leading-relaxed text-ink">{row.e9}</td>
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
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">채용 절차</h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
              국내 대학을 졸업한 유학생(
              <Link href="/visa/d-2-d-4" className="font-medium text-cobalt underline underline-offset-2">
                D-2
              </Link>
              )을 채용하는 경우에는 해외 초청 없이 체류자격 변경으로 진행할 수 있어 절차가 단축됩니다.
            </p>
          </Reveal>
          <Reveal delay={0.08} className="mt-10">
            <VisaProcess steps={PROCESS_STEPS} />
          </Reveal>
        </div>
      </section>

      <section className="bg-paper">
        <div className="max-w-content mx-auto px-5 py-20 lg:px-8 lg:py-28">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">자주 묻는 질문</h2>
          </Reveal>
          <Reveal delay={0.08} className="mt-10">
            <FaqList faqs={visa.faqs} />
          </Reveal>
        </div>
      </section>

      <section className="bg-paper-soft">
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
              직종 해당 여부와 기업·인재 요건의 사전 검토부터 해외 인재 발굴, 절차 진행까지 E-7 채용의
              실무를 지원합니다.{" "}
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
