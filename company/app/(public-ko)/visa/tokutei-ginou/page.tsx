import { Exam, Handshake, Translate } from "@phosphor-icons/react/dist/ssr";
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

// 사실 출처: 리포 루트 01-제도-비자.md §1·2·6·7·8·9, docs/ssw-faq.md (출입국재류관리청 공식 FAQ)
export const metadata = buildVisaMetadata("tokutei-ginou");

const visa = getVisa("tokutei-ginou");

// 1호 vs 2호 - 01-제도-비자.md §1
const GRADE_COMPARISON = [
  { label: "체류기간", first: "통산 5년 상한", second: "갱신 무제한" },
  { label: "가족동반", first: "원칙 불가", second: "가능" },
  { label: "대상 분야", first: "16개 분야", second: "일부 분야만 (개호는 2호 없음)" },
  { label: "숙련도", first: "바로 일할 수 있는 수준", second: "숙련 수준" },
];

// 기능실습(→육성취로) vs 특정기능 1호 - 01-제도-비자.md §6·7
const SYSTEM_COMPARISON = [
  { label: "제도 목적", old: "기술이전·국제협력 (→ 육성취로는 인재육성·특정기능 전환)", ssw: "인력부족 분야의 인력 채용" },
  { label: "고용 방식", old: "감리단체 등 감독·지원기관 경유", ssw: "수용기관 직접고용" },
  { label: "입국 전 시험", old: "원칙적으로 없음 (개호 등 일부 예외)", ssw: "일본어시험 + 분야별 기능시험" },
  { label: "전직", old: "원칙 제한", ssw: "같은 분야(업무구분) 안에서 가능" },
  { label: "파견", old: "분야별 제한", ssw: "개호·숙박은 파견 불가" },
];

// 의무적 지원 10항목 - 01-제도-비자.md §7
const SUPPORT_ITEMS = [
  "사전 가이던스 (재류신청 전, 이해 가능한 언어로)",
  "공항 이동 지원 (입·출국 시)",
  "주거 확보·계약 지원",
  "생활 오리엔테이션",
  "행정·금융 수속 동행 (시청·은행·연금 등)",
  "일본어 학습 기회 제공",
  "상담·고충 대응 (이해 가능한 언어로)",
  "일본인과의 교류 촉진",
  "전직 지원 (비자발적 이직 시)",
  "정기 면담·행정 신고",
];

// 해외 신규 입국 절차 - 01-제도-비자.md §8
const PROCESS_STEPS = [
  {
    title: "일본어시험 + 분야별 기능시험 합격",
    desc: "JFT-Basic(250점 만점 중 200점 이상) 또는 JLPT N4 이상, 그리고 분야별 기능시험에 합격합니다. 개호는 개호일본어시험이 추가됩니다.",
  },
  {
    title: "고용계약 체결과 지원계획 수립",
    desc: "수용기관(일본 기업)이 후보자와 고용계약을 맺고, 의무적 지원 10항목을 담은 지원계획을 작성합니다.",
  },
  {
    title: "재류자격인정증명서(COE) 신청",
    desc: "수용기관이 출입국재류관리관서에 COE 교부를 신청합니다. 표준 처리기간은 1~3개월입니다.",
  },
  {
    title: "비자(사증) 신청·발급",
    desc: "수용기관이 교부된 COE를 후보자에게 보냅니다. 후보자는 재외 일본대사관·영사관에서 사증을 신청해 발급받습니다.",
  },
  {
    title: "송출국 국내 절차 이행",
    desc: "네팔 등 송출국의 해외노동허가 같은 국내 절차를 별도로 거칩니다. 일본 제도와 별개로 필요한 절차입니다.",
  },
  {
    title: "일본 입국과 근무 시작",
    desc: "입국 후 재류카드를 받고 근무를 시작합니다. 이때부터 수용기관의 의무적 지원이 함께 시작됩니다.",
  },
];

export default function TokuteiGinouPage() {
  return (
    <main>
      <VisaSchema visa={visa} />

      <PageBanner
        eyebrow="일본 비자 정보"
        context="出入国在留管理庁 공식 기준"
        titleKo="일본 특정기능 1호"
        desc="인력부족 분야에서 바로 일할 인력을 일본 기업이 직접 고용하는 취업 재류자격입니다. 16개 분야, 통산 5년, 시험을 거친 선발이 핵심입니다."
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
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">제도 개요</h2>
            <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted">
              특정기능(特定技能)은 일본이 인력부족 분야에 한해 외국인의 취업을 허용하는
              재류자격입니다. 1호는 <strong className="font-semibold text-ink">16개 분야</strong>
              (2024년 각의결정으로 자동차운송·철도·임업·목재산업 추가)에서 통산 5년까지 일할 수 있고,
              기능실습과 달리 <strong className="font-semibold text-ink">기업이 감리단체를 거치지 않고 직접 고용</strong>합니다.
              개호·숙박 분야는 파견이 허용되지 않아 직접고용이 유일한 형태입니다.
            </p>
          </Reveal>

          <Reveal delay={0.08} className="mt-10 overflow-x-auto rounded-[24px] border border-line bg-surface shadow-sm shadow-ink/5">
            <table className="w-full min-w-[560px] text-left text-[15px]">
              <caption className="px-5 pt-5 text-left font-display text-lg font-semibold text-ink">
                특정기능 1호 vs 2호
              </caption>
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="px-5 py-4 font-semibold text-muted">구분</th>
                  <th scope="col" className="px-5 py-4 font-display font-semibold text-ink">1호</th>
                  <th scope="col" className="px-5 py-4 font-display font-semibold text-ink">2호</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {GRADE_COMPARISON.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="px-5 py-4 align-top font-semibold text-cobalt">{row.label}</th>
                    <td className="px-5 py-4 align-top leading-relaxed text-ink">{row.first}</td>
                    <td className="px-5 py-4 align-top leading-relaxed text-ink">{row.second}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>

          <Reveal delay={0.12} className="mt-8 grid gap-4 lg:grid-cols-2">
            <article className="rounded-[24px] border border-line bg-surface p-6 shadow-sm shadow-ink/5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cobalt-soft text-cobalt">
                <Translate size={22} weight="duotone" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-xl font-semibold text-ink">일본어 요건</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">
                JFT-Basic(国際交流基金日本語基礎テスト) 250점 만점 중 200점 이상(CEFR A2 상당) 또는
                JLPT N4 이상 중 하나를 충족하면 됩니다. JFT-Basic은 CBT 방식으로 네팔어 안내를
                지원하며 네팔 현지에서 응시할 수 있습니다.
              </p>
            </article>
            <article className="rounded-[24px] border border-line bg-surface p-6 shadow-sm shadow-ink/5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cobalt-soft text-cobalt">
                <Exam size={22} weight="duotone" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-xl font-semibold text-ink">분야별 기능시험</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">
                분야마다 별도의 기능평가시험이 있습니다. 개호는{" "}
                <Link href="/visa/tokutei-ginou-kaigo" className="font-medium text-cobalt underline underline-offset-2">
                  개호기능·개호일본어 시험
                </Link>
                , 숙박은{" "}
                <Link href="/visa/tokutei-ginou-shukuhaku" className="font-medium text-cobalt underline underline-offset-2">
                  숙박업기능측정시험
                </Link>
                을 통과해야 합니다.
              </p>
            </article>
          </Reveal>
        </div>
      </section>

      <section className="bg-paper">
        <div className="max-w-content mx-auto px-5 py-20 lg:px-8 lg:py-28">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">
              기능실습과 무엇이 다른가
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted">
              두 제도 모두 외국인이 일본에서 일하는 경로이지만 법적 성격은 다릅니다. 기능실습은 기술이전
              명목의 실습 제도이고, 특정기능 1호는 처음부터 취업 자격입니다. 기능실습은 2027년 4월
              1일부터{" "}
              <Link href="/visa/ikusei-shuro" className="font-medium text-cobalt underline underline-offset-2">
                육성취로 제도
              </Link>
              로 전환됩니다.
            </p>
          </Reveal>
          <Reveal delay={0.08} className="mt-10 overflow-x-auto rounded-[24px] border border-line bg-surface shadow-sm shadow-ink/5">
            <table className="w-full min-w-[640px] text-left text-[15px]">
              <thead>
                <tr className="border-b border-line bg-paper-soft">
                  <th scope="col" className="px-5 py-4 font-semibold text-muted">구분</th>
                  <th scope="col" className="px-5 py-4 font-display font-semibold text-ink">기능실습 (→ 육성취로)</th>
                  <th scope="col" className="px-5 py-4 font-display font-semibold text-ink">특정기능 1호</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {SYSTEM_COMPARISON.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="px-5 py-4 align-top font-semibold text-cobalt">{row.label}</th>
                    <td className="px-5 py-4 align-top leading-relaxed text-ink">{row.old}</td>
                    <td className="px-5 py-4 align-top leading-relaxed text-ink">{row.ssw}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>

          <Reveal delay={0.12} className="mt-8 rounded-[28px] border border-line bg-surface p-7 shadow-sm shadow-ink/5 lg:p-9">
            <div className="flex max-w-3xl flex-col gap-4 sm:flex-row">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cobalt-soft text-cobalt">
                <Handshake size={26} weight="duotone" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-display text-2xl font-semibold text-ink">수용기관의 의무적 지원 10항목</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  특정기능 1호 인력을 고용하는 기업은 아래 지원을 직접 수행하거나 등록지원기관에
                  위탁해야 합니다. 지원 비용은 기업 부담이며 근로자에게 전가할 수 없습니다.
                </p>
              </div>
            </div>
            <ul className="mt-7 grid gap-3 sm:grid-cols-2">
              {SUPPORT_ITEMS.map((item, index) => (
                <li key={item} className="flex gap-3 rounded-[18px] border border-line bg-paper p-4 text-sm leading-relaxed text-ink">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cobalt-soft text-xs font-semibold text-cobalt">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <section className="bg-paper-soft">
        <div className="max-w-content mx-auto px-5 py-20 lg:px-8 lg:py-28">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">채용 절차</h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
              해외에서 새로 입국할 때 거치는 주요 절차입니다. 네팔은 일본과 특정기능 협력각서(MOC)가
              체결되어 있어(2024년 4월 1일부터 5년간 갱신) 이 경로가 공식적으로 열려 있습니다.
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
              네팔 현지 직업훈련·일본어 교육부터 시험 준비, 일본 수용기관과의 매칭, COE·사증과 송출
              절차까지 특정기능 채용의 전 과정을 현지 파트너와 함께 지원합니다.{" "}
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
