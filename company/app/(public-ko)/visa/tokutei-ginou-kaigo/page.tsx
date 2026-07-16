import { HandHeart } from "@phosphor-icons/react/dist/ssr";
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

// 사실 출처: 리포 루트 01-제도-비자.md §3 (MHLW 운용방침·시험 안내, ISA 통계)
export const metadata = buildVisaMetadata("tokutei-ginou-kaigo");

const visa = getVisa("tokutei-ginou-kaigo");

// 시험 3종 - 01-제도-비자.md §3
const EXAMS = [
  {
    name: "일본어시험",
    detail: "JFT-Basic 250점 만점 중 200점 이상(CEFR A2 상당) 또는 JLPT N4 이상",
    note: "다른 분야와 공통 요건",
  },
  {
    name: "介護技能評価試験 (개호기능평가시험)",
    detail: "학과 40문 + 실기 5문 = 45문, 60분, 총득점 60% 이상 합격",
    note: "돌봄 기술·지식 평가",
  },
  {
    name: "介護日本語評価試験 (개호일본어평가시험)",
    detail: "개호 용어·대화·문서, 30분, 총득점 73% 이상 합격 (2026년 4월 1일부터)",
    note: "개호 분야에만 추가되는 시험",
  },
];

const PROCESS_STEPS = [
  {
    title: "시험 3종 합격",
    desc: "일본어시험, 개호기능평가시험, 개호일본어평가시험을 모두 통과합니다. 네팔 등 해외 시험장에서 응시할 수 있습니다.",
  },
  {
    title: "시설과 고용계약 체결·지원계획 수립",
    desc: "요양시설이 수용기관으로서 직접 고용계약을 맺고 의무적 지원 10항목의 지원계획을 작성합니다.",
  },
  {
    title: "COE 신청과 사증 발급",
    desc: "시설이 재류자격인정증명서(COE)를 신청(표준 처리기간 1~3개월)하고, 근로자는 현지 일본대사관에서 사증을 받습니다.",
  },
  {
    title: "송출국 절차 이행 후 입국·근무 개시",
    desc: "송출국 국내 절차를 마친 뒤 입국해 재류카드를 받고 근무를 시작합니다. 시설의 의무적 지원도 함께 시작됩니다.",
  },
];

export default function KaigoPage() {
  return (
    <main>
      <VisaSchema visa={visa} />

      <PageBanner
        eyebrow="일본 비자 정보 · 특정기능 분야"
        context="厚生労働省 운용방침 기준"
        titleKo="특정기능 개호(介護)"
        desc="일본 요양 현장의 인력 부족을 메우는 특정기능 최대 분야입니다. 시험 3종 합격과 시설의 직접고용이 요건이며, 介護福祉士를 통한 장기 정주 경로가 열려 있습니다."
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
          <Reveal>
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">
              시험은 3종 - 개호만의 요건
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted">
              대부분의 특정기능 분야는 일본어시험과 기능시험 2개를 요구하지만, 개호는 이용자와의
              의사소통이 업무의 본질이라{" "}
              <strong className="font-semibold text-ink">개호일본어평가시험이 하나 더 추가</strong>됩니다.
              세 시험을 모두 합격해야 채용 절차를 시작할 수 있습니다.
            </p>
          </Reveal>
          <Reveal delay={0.08} className="mt-10 grid gap-4 lg:grid-cols-3">
            {EXAMS.map((exam) => (
              <article key={exam.name} className="rounded-[24px] border border-line bg-surface p-6 shadow-sm shadow-ink/5">
                <span className="inline-flex rounded-full bg-cobalt-soft px-3 py-1 text-xs font-semibold text-cobalt">
                  {exam.note}
                </span>
                <h3 className="mt-3 font-display text-lg font-semibold text-ink">{exam.name}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{exam.detail}</p>
              </article>
            ))}
          </Reveal>

          <Reveal delay={0.12} className="mt-8 rounded-[24px] border border-line bg-surface p-6 shadow-sm shadow-ink/5 lg:p-8">
            <h3 className="font-display text-xl font-semibold text-ink">수용상한과 채용 여력</h3>
            <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-muted">
              개호 분야의 특정기능 1호 수용상한은 <strong className="font-semibold text-ink">126,900명</strong>
              (2026년 1월 각의결정 운용방침)입니다. 2025년 12월 말 기준 실제 재류자는 67,871명으로
              상한 대비 절반 수준이어서, 제도적으로는 채용 여지가 상당히 남아 있는 분야입니다. 네팔
              국적 재류자도 6,013명(같은 시점 ISA 통계)으로 주요 송출국 중 하나입니다.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="bg-paper">
        <div className="max-w-content mx-auto px-5 py-20 lg:px-8 lg:py-28">
          <Reveal className="rounded-[28px] border border-line bg-surface p-7 shadow-sm shadow-ink/5 lg:p-9">
            <div className="flex max-w-3xl flex-col gap-4 sm:flex-row">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cobalt-soft text-cobalt">
                <HandHeart size={26} weight="duotone" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-display text-2xl font-semibold text-ink">
                  5년 이후: 介護福祉士와 재류자격 「介護」
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">
                  개호에는 특정기능 2호가 없습니다. 대신 특정기능 1호로 근무하면서{" "}
                  <strong className="font-semibold text-ink">介護福祉士(개호복지사) 국가시험</strong>에
                  합격하면 별도 재류자격 「介護」로 이행할 수 있고, 이 경우 장기 체류와 가족동반이
                  가능해집니다. 시설 입장에서는 5년 상한에 막히지 않고 숙련 인력을 정착시키는 경로가
                  제도적으로 마련되어 있는 셈입니다.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-paper-soft">
        <div className="max-w-content mx-auto px-5 py-20 lg:px-8 lg:py-28">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">채용 절차</h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
              전체 구조는{" "}
              <Link href="/visa/tokutei-ginou" className="font-medium text-cobalt underline underline-offset-2">
                특정기능 1호 공통 절차
              </Link>
              와 같고, 시험 단계가 3종이라는 점이 다릅니다.
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
              네팔 현지에서 개호 직업훈련과 일본어·개호일본어 시험 준비를 함께 진행하고, 일본
              요양시설과의 매칭부터 입국·정착까지 지원합니다.{" "}
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
