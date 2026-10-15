import Link from "next/link";
import PageBanner from "@/components/page-banner";
import { KEY_VISUALS } from "@/lib/key-visuals";
import { SECTION_LABELS } from "@/lib/section-labels";
import CtaBanner from "@/components/cta-banner";
import VisaSchema from "@/components/visa/visa-schema";
import VisaGlance from "@/components/visa/visa-glance";
import VisaProcess from "@/components/visa/visa-process";
import FaqList from "@/components/visa/faq-list";
import RelatedVisas from "@/components/visa/related-visas";
import VisaDisclaimer from "@/components/visa/visa-disclaimer";
import VisaSources from "@/components/visa/visa-sources";
import { getLocalizedVisa, getVisaMessages } from "@/lib/visa-i18n";
import { buildVisaMetadata, getVisa } from "@/lib/visas";

// 법무부 공고 제2025-379호(2025-12-08)와 보도자료(2026-02-05·03-26·06-08) 기준.
// 체류기간 상한·동반가족처럼 공개 자료에 없는 기준은 싣지 않는다.
export const metadata = buildVisaMetadata("e-7-m");

const visa = getVisa("e-7-m");
// 기준 자료 라벨은 다른 언어판과 같은 카탈로그에서 읽는다
const koreanVisa = getLocalizedVisa("ko", "e-7-m");

const STAGES = [
  {
    step: "01 입학",
    title: "지정 학과 입학",
    desc: "TOPIK 3급 이상, 사회통합프로그램 3단계 이수(또는 사전평가 61점 이상), 세종학당 중급1 이상 중 하나를 갖춰 입학합니다. 다른 대학 유학생의 편입, 같은 대학 안의 전과, 어학연수생(D-4)이 유학(D-2)으로 변경한 뒤 입학하는 것도 허용됩니다.",
  },
  {
    step: "02 재학",
    title: "유학(D-2) 기간 지원",
    desc: "시범기간 동안 유학 비자 발급·변경·연장 때 재정능력 요건(수도권 2,000만원, 지방 1,600만원)이 면제됩니다. 시간제 취업은 주중 최대 35시간까지 허용됩니다(일반 전문대 30시간).",
  },
  {
    step: "03 취업",
    title: "E-7-M 발급",
    desc: "졸업(예정), 사회통합프로그램 4단계 이상 이수(TOPIK 5급 인정), 전공 관련 업체와의 초임 연봉 2,600만원 이상·1년 이상 고용계약을 모두 갖추면 E-7-M을 받을 수 있습니다.",
  },
  {
    step: "04 정주",
    title: "거주(F-2) 신청",
    desc: "E-7-M으로 5년 이상 계속 취업하거나, 인구감소지역 안의 같은 기업에서 3년 이상 근속하면 거주(F-2) 자격을 신청할 수 있습니다.",
  },
];

// 법무부 2026-02-05 보도자료 붙임1 명단 순서
const DEPARTMENTS = [
  { region: "경기", college: "경기과학기술대", department: "미래전기자동차과" },
  { region: "경기", college: "대림대", department: "미래자동차공학부" },
  { region: "경기", college: "부천대", department: "섬유패션비즈니스학과" },
  { region: "경기", college: "서정대", department: "글로벌섬유패션비즈니스과" },
  { region: "경기", college: "오산대", department: "전기공학과" },
  { region: "경기", college: "용인예술과학대", department: "자동차기계과" },
  { region: "대구", college: "영진전문대", department: "스마트CAD/CAM과" },
  { region: "경북", college: "구미대", department: "특수건설기계공학부" },
  { region: "부산", college: "경남정보대", department: "기계과" },
  { region: "부산", college: "동의과학대", department: "기계공학과" },
  { region: "부산", college: "부산과학기술대", department: "자동차과" },
  { region: "경남", college: "거제대", department: "기계공학과" },
  { region: "울산", college: "울산과학대", department: "기계공학부" },
  { region: "전북", college: "군장대", department: "스마트농식품과" },
  { region: "전북", college: "전주비전대", department: "미래모빌리티학과" },
  { region: "전남", college: "목포과학대", department: "신재생에너지전기과" },
];

const PROCESS_STEPS = [
  {
    title: "지정 학과 졸업(예정) 여부 확인",
    desc: "후보자가 16개 지정 학과에 재학 중이거나 졸업했는지 확인합니다. 같은 학교의 다른 학과 졸업자는 E-7-M 대상이 아닙니다.",
  },
  {
    title: "마지막 학기 인턴 검토",
    desc: "졸업 전 마지막 학기에는 출입국·외국인관서장의 사전 허가를 받아 전공 관련 업체에서 인턴으로 일할 수 있습니다. 채용 전에 직무 적합성을 확인하는 기회로 쓸 수 있습니다.",
  },
  {
    title: "한국어 요건 확인",
    desc: "사회통합프로그램 4단계 이상을 이수했거나 TOPIK 5급 이상인지 확인합니다.",
  },
  {
    title: "고용계약 체결",
    desc: "전공과 관련된 직무로 초임 연봉 2,600만원 이상, 1년 이상의 고용계약을 맺습니다. 세 요건을 모두 갖추면 E-7의 고용 필요성을 충족한 것으로 인정됩니다.",
  },
  {
    title: "E-7-M 신청",
    desc: "신청 서류와 절차는 관할 출입국·외국인관서에서 확인합니다. 졸업생을 채용한 기업에는 내국인 대비 외국인 고용비율 쿼터(20%)가 완화됩니다.",
  },
];

const linkClass =
  "font-medium text-ink underline decoration-ink/35 underline-offset-4 hover:decoration-ink";

export default function E7MPage() {
  return (
    <main>
      <VisaSchema visa={visa} />

      <PageBanner
        eyebrow="한국 비자 정보"
        context="법무부 공고 제2025-379호 기준"
        titleKo="육성형 전문기술인력 E-7-M (K-CORE)"
        desc="법무부가 지정한 전문대 학과에서 한국어와 기술을 익힌 유학생이 지역 제조업체에 취업할 때 받는 비자입니다. 2027년 말까지 시범 운영됩니다."
        crumb="비자 정보"
        photo={KEY_VISUALS.visas["e-7-m"]}
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
          <div>
            <h2 className="text-headline text-balance text-ink">입학부터 정주까지</h2>
            <p className="mt-6 max-w-3xl text-description text-muted">
              E-7-M은 졸업할 때 한 번 신청하는 비자가 아닙니다. 지정 학과에 입학할 때부터 단계별
              요건과 혜택이 이어집니다. 법무부는 저학력·단순노무 인력을 해외에서 직접 들여오던 방식
              대신, 국내 전문대에서 적정 임금을 받는 인력을 길러 지역에 정착시키려는 제도라고
              설명합니다.
            </p>
          </div>
          <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2">
            {STAGES.map((stage) => (
              <article key={stage.step} className="border-t border-ink pt-6">
                <span className="inline-flex text-meta font-semibold text-muted">{stage.step}</span>
                <h3 className="mt-3 text-lg font-bold tracking-[-0.02em] text-ink">{stage.title}</h3>
                <p className="mt-3 text-description text-muted">{stage.desc}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 border-l-2 border-ink py-1 pl-6">
            <h3 className="text-lg font-bold tracking-[-0.02em] text-ink">연봉 2,600만원 기준의 위치</h3>
            <p className="mt-3 max-w-3xl text-description text-muted">
              2025년 숙련기능인력(E-7-4) 임금 요건을 준용한 금액입니다. 최저임금(연 2,515만원)보다
              높고 전문인력 E-7-1 기준(연 2,867만원)보다 낮게 정해졌습니다(모두 2025년 기준). 법무부는
              임금 기준이 바뀌면 이 금액도 조정할 수 있다고 밝혔습니다.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-paper py-section">
        <div className="page-wrap">
          <div>
            <h2 className="text-headline text-balance text-ink">지정 학과 16곳</h2>
            <p className="mt-6 max-w-3xl text-description text-muted">
              법무부가 2026년 2월 5일 학교당 1개 학과씩 시범 지정했습니다. 2024년 교육국제화역량
              인증제에서 인증대학 이상 평가를 받은 전문대 22곳 중에서 선정됐습니다. 학과별 유학생은
              학과 정원 안에서 최대 50명이며, 법무부는 연간 최대 800명이 지역 중소기업에 공급될 것으로
              기대한다고 밝혔습니다.
            </p>
          </div>
          <div className="mt-10 overflow-x-auto border-t border-ink">
            <table className="w-full text-left text-[15px]">
              <thead>
                <tr className="border-b border-ink">
                  <th scope="col" className="py-4 pr-4 sm:pr-6 font-semibold text-muted">지역</th>
                  <th scope="col" className="py-4 pr-4 sm:pr-6 font-bold text-ink">대학</th>
                  <th scope="col" className="py-4 pr-4 sm:pr-6 font-bold text-ink">지정 학과</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {DEPARTMENTS.map((row) => (
                  <tr key={row.college}>
                    <th scope="row" className="py-4 pr-4 sm:pr-6 align-top font-semibold text-muted">{row.region}</th>
                    <td className="py-4 pr-4 sm:pr-6 align-top leading-relaxed text-ink">{row.college}</td>
                    <td className="py-4 pr-4 align-top leading-relaxed text-ink [overflow-wrap:anywhere] sm:pr-6">{row.department}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 max-w-3xl text-meta text-muted">
            법무부 발표(2026년 2월 5일) 기준 명단입니다. 추가 지정이나 변경 여부는 법무부 공지를
            확인해야 합니다.
          </p>
        </div>
      </section>

      <section className="border-t border-line bg-paper py-section">
        <div className="page-wrap">
          <div>
            <h2 className="text-headline text-balance text-ink">채용 기업이 확인할 내용</h2>
            <p className="mt-6 max-w-2xl text-description text-muted">
              후보자가 지정 학과 출신인지, 한국어와 임금 요건을 채울 수 있는지를 채용 전에 확인하는
              것이 핵심입니다. 일반 유학생 채용은{" "}
              <Link href="/visa/e-7" className={linkClass}>
                E-7
              </Link>{" "}
              안내를 참고하세요.
            </p>
          </div>
          <div className="mt-10">
            <VisaProcess steps={PROCESS_STEPS} />
          </div>

          <div className="mt-8 bg-paper-soft p-8 lg:p-12">
            <div className="max-w-3xl">
              <h3 className="text-title text-ink">시범사업이라는 점을 함께 고려하세요</h3>
              <p className="mt-3 text-description text-muted">
                시범기간은 2026년 1월부터 2027년 12월 31일까지입니다. 법무부는 기간이 끝나기 전에
                유학생 취업률, 불법체류율, 한국어 능력, 내국인 학생 고용에 미치는 영향 등을 평가해 연장
                또는 정규사업화를 결정합니다. 체류기간 상한과 동반가족 기준은 공개된 공고·보도자료에
                나와 있지 않으므로, 신청 시점에 관할 출입국·외국인관서에서 확인해야 합니다.
              </p>
            </div>
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
              한국 대학의 기준에 맞춰 네팔 현지 학생 모집과 한국어 준비, 입학·비자 안내를 지원합니다.
              지정 학과 진학을 검토하는 학생과 졸업생 채용을 검토하는 기업에는 이 페이지의 공개 요건을
              기준으로 안내합니다.{" "}
              <Link href="/services" className={linkClass}>
                사업영역 보기
              </Link>
            </p>
          </div>
          {koreanVisa.sources?.length ? (
            <div className="mt-8">
              <VisaSources heading={getVisaMessages("ko").ui.officialSources} sources={koreanVisa.sources} />
            </div>
          ) : null}
          <div className="mt-8">
            <VisaDisclaimer />
          </div>
        </div>
      </section>

      <CtaBanner />
    </main>
  );
}
