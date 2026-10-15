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
import { buildVisaMetadata, getVisa } from "@/lib/visas";

// 사실 출처: 리포 루트 01-제도-비자.md §4 (観光庁 운용방침, CAIPT, ISA 통계)
export const metadata = buildVisaMetadata("tokutei-ginou-shukuhaku");

const visa = getVisa("tokutei-ginou-shukuhaku");

// 업무 범위 - 01-제도-비자.md §4 (관광청 운용방침)
const WORK_SCOPE = [
  { title: "프런트", desc: "체크인·체크아웃, 예약 관리, 안내 등 프런트 데스크 업무" },
  { title: "기획·홍보", desc: "상품 기획, 프로모션, 판촉물 제작 지원 등" },
  { title: "접객", desc: "관내 안내, 고객 응대, 컨시어지 성격의 서비스" },
  { title: "레스토랑 서비스", desc: "관내 식당의 고객 응대·음식 제공 등 식음 서비스" },
];

const PROCESS_STEPS = [
  {
    title: "일본어시험 + 숙박업기능측정시험 합격",
    desc: "JFT-Basic(또는 JLPT N4)과 宿泊業技能測定試験을 통과합니다. 해외 시험 일정은 CAIPT 공지로 확인합니다.",
  },
  {
    title: "호텔·료칸과 고용계약 체결·지원계획 수립",
    desc: "숙박시설이 수용기관으로서 직접 고용계약을 맺고 의무적 지원 10항목의 지원계획을 작성합니다.",
  },
  {
    title: "COE 신청과 사증 발급",
    desc: "시설이 재류자격인정증명서(COE)를 신청(표준 처리기간 1~3개월)하고, 근로자는 현지 일본대사관에서 사증을 받습니다.",
  },
  {
    title: "송출국 절차 이행 후 입국·근무 개시",
    desc: "송출국 국내 절차를 마친 뒤 입국해 재류카드를 받고 근무를 시작합니다.",
  },
];

export default function ShukuhakuPage() {
  return (
    <main>
      <VisaSchema visa={visa} />

      <PageBanner
        eyebrow="일본 비자 정보 · 특정기능 분야"
        context="観光庁 운용방침 기준"
        titleKo="특정기능 숙박(宿泊)"
        desc="호텔·료칸의 프런트부터 레스토랑 서비스까지 숙박 서비스 전반을 맡을 수 있는 특정기능 분야입니다. 수용상한 14,800명 가운데 2025년 12월 말 재류자는 1,968명입니다."
        crumb="비자 정보"
        photo={KEY_VISUALS.visas["tokutei-ginou-shukuhaku"]}
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
            <h2 className="text-headline text-balance text-ink">
              맡길 수 있는 업무 범위
            </h2>
            <p className="mt-6 max-w-3xl text-description text-muted">
              숙박 분야의 특정기능 인력은 <strong className="font-semibold text-ink">숙박 서비스 제공
              전반</strong>을 담당할 수 있습니다. 청소 같은 부수 업무도 주된 업무에 수반되는 범위에서는
              맡길 수 있지만, 부수 업무만 전담시키는 것은 허용되지 않습니다.
            </p>
          </div>
          <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2">
            {WORK_SCOPE.map((scope) => (
              <article key={scope.title} className="border-t border-ink pt-6">
                <h3 className="mt-4 text-lg font-bold tracking-[-0.02em] text-ink">{scope.title}</h3>
                <p className="mt-3 text-description text-muted">{scope.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-paper py-section">
        <div className="page-wrap">
          <div className="bg-paper-soft p-8 lg:p-12">
            <div className="max-w-3xl">
              <div>
                <h2 className="text-title text-ink">
                  수용상한과 재류 현황
                </h2>
                <p className="mt-3 text-description text-muted">
                  숙박 분야의 특정기능 1호 수용상한은{" "}
                  <strong className="font-semibold text-ink">14,800명</strong>(2026년 1월 각의결정
                  운용방침)이고, 2025년 12월 말 기준 실제 재류자는 1,968명입니다. 상한의 13% 수준이므로
                  수용상한만 놓고 보면 추가 수용 여지가 있습니다. 인바운드 관광 회복으로 인력 수요가
                  커진 호텔·료칸이라면 검토할 수 있는 경로입니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-paper py-section">
        <div className="page-wrap">
          <div>
            <h2 className="text-headline text-balance text-ink">채용 절차</h2>
            <p className="mt-6 max-w-2xl text-description text-muted">
              전체 절차는{" "}
              <Link href="/visa/tokutei-ginou" className="font-medium text-ink underline decoration-ink/35 underline-offset-4 hover:decoration-ink">
                특정기능 1호 공통 절차
              </Link>
              와 같습니다. 숙박은 직접고용만 가능하고 파견은 인정되지 않습니다.
            </p>
          </div>
          <div className="mt-10">
            <VisaProcess steps={PROCESS_STEPS} />
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
              네팔 현지의 접객·일본어 교육과 숙박업기능측정시험 준비부터 일본 숙박시설과의 매칭,
              입국·정착까지 지원합니다.{" "}
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
