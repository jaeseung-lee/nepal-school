import { Buildings, ClipboardText, UsersThree } from "@phosphor-icons/react/dist/ssr";
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

// 한국 고용허가제(EPS)의 공개된 제도 구조 기준.
// 연도별 고시로 바뀌는 쿼터·업종 수치는 싣지 않는다.
export const metadata = buildVisaMetadata("e-9");

const visa = getVisa("e-9");

const EMPLOYER_POINTS = [
  {
    icon: ClipboardText,
    title: "내국인 구인노력이 먼저",
    desc: "고용허가를 신청하기 전에 워크넷 구인 등 정해진 기간의 내국인 구인노력을 거쳐야 합니다. 이 절차 없이는 신청 자체가 성립하지 않습니다.",
  },
  {
    icon: Buildings,
    title: "업종·규모별 허용 인원",
    desc: "고용허가제 적용 업종과 사업장 규모에 따라 고용 가능한 외국인 수가 정해집니다. 연도별 쿼터와 업종 기준은 고시로 변동되므로 관할 고용센터에서 확인합니다.",
  },
  {
    icon: UsersThree,
    title: "정부 간 알선 구조",
    desc: "기업이 해외에서 직접 모집하는 것이 아니라, 송출국 정부가 선발한 인력 풀(EPS-TOPIK 통과자)에서 알선받는 G2G 구조입니다. 네팔을 포함한 16개 송출국이 참여합니다.",
  },
];

const PROCESS_STEPS = [
  {
    title: "내국인 구인노력",
    desc: "워크넷 등에서 정해진 기간 동안 내국인 채용을 시도합니다. 고용허가 신청의 선행 요건입니다.",
  },
  {
    title: "고용허가 신청·발급",
    desc: "관할 고용센터에 고용허가를 신청합니다. 업종·규모 요건을 충족하면 외국인 구직자 명부에서 알선이 이뤄집니다.",
  },
  {
    title: "근로계약 체결",
    desc: "알선받은 후보자와 표준근로계약을 체결합니다. 계약 내용은 송출국을 거쳐 근로자 본인에게 전달됩니다.",
  },
  {
    title: "사증발급인정서 신청",
    desc: "법무부(출입국·외국인청)에 사증발급인정서를 신청하고, 근로자는 이를 근거로 현지에서 E-9 사증을 발급받습니다.",
  },
  {
    title: "입국과 취업교육",
    desc: "입국 후 정해진 취업교육을 이수합니다. 건강진단 등 부수 절차도 이 단계에서 진행됩니다.",
  },
  {
    title: "사업장 배치·고용 개시",
    desc: "교육을 마친 근로자가 사업장에 배치되어 근무를 시작합니다. 고용변동 신고 등 사후 의무는 계속 관리해야 합니다.",
  },
];

export default function E9Page() {
  return (
    <main>
      <VisaSchema visa={visa} />

      <PageBanner
        eyebrow="한국 비자 정보"
        context="고용노동부 고용허가제(EPS) 기준"
        titleKo="비전문취업 E-9 (고용허가제)"
        desc="제조·농축산·어업·건설 등 인력부족 업종에서 외국인 근로자를 합법적으로 고용하는 대표 제도입니다. 정부 간 알선과 사업장 직접고용이 핵심 구조입니다."
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
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">
              기업이 먼저 확인할 것
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted">
              고용허가제는 &ldquo;기업이 원하는 사람을 데려오는&rdquo; 제도가 아니라, 정부가 검증한 인력
              풀에서 <strong className="font-semibold text-ink">알선받는</strong> 제도입니다. 그래서 기업
              쪽 요건과 절차 이해가 채용 성패를 좌우합니다.
            </p>
          </Reveal>
          <Reveal delay={0.08} className="mt-10 grid gap-4 lg:grid-cols-3">
            {EMPLOYER_POINTS.map((point) => (
              <article key={point.title} className="rounded-[24px] border border-line bg-surface p-6 shadow-sm shadow-ink/5">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cobalt-soft text-cobalt">
                  <point.icon size={22} weight="duotone" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-display text-xl font-semibold text-ink">{point.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{point.desc}</p>
              </article>
            ))}
          </Reveal>

          <Reveal delay={0.12} className="mt-8 rounded-[24px] border border-line bg-surface p-6 shadow-sm shadow-ink/5 lg:p-8">
            <h3 className="font-display text-xl font-semibold text-ink">체류기간과 재고용</h3>
            <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-muted">
              E-9의 기본 체류·취업활동 기간은 3년이고, 사업주가 재고용을 신청하면 최대 1년 10개월을
              연장할 수 있습니다. 일정 요건을 갖춘 성실근로자는 출국 후 재입국해 다시 근무하는 제도도
              운영되어, 검증된 인력을 장기적으로 활용하는 경로가 존재합니다. 장기 고용 전환이
              필요하다면{" "}
              <Link href="/visa/e-7" className="font-medium text-cobalt underline underline-offset-2">
                E-7-4 숙련기능인력
              </Link>{" "}
              경로도 함께 검토할 수 있습니다.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="bg-paper">
        <div className="max-w-content mx-auto px-5 py-20 lg:px-8 lg:py-28">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">채용 절차</h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
              구인노력부터 사업장 배치까지의 표준 흐름입니다. 시기별 쿼터와 송출국 사정에 따라 전체
              기간은 달라지므로 수개월 단위로 계획하는 것이 안전합니다.
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
              송출국 현지의 사전 교육과 한국어 준비부터 기업의 제도 검토, 채용 후 정착 지원까지
              고용허가제 채용의 실무를 단계별로 지원합니다.{" "}
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
