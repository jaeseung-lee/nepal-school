import type { Metadata } from "next";
import Link from "next/link";
import PageBanner from "@/components/page-banner";
import BreadcrumbSchema from "@/components/breadcrumb-schema";
import { buildPageMetadata } from "@/lib/seo";
import ServiceCards from "@/components/service-cards";
import ProcessSteps from "@/components/process-steps";
import CtaBanner from "@/components/cta-banner";
import Reveal from "@/components/reveal";

export const metadata: Metadata = buildPageMetadata({
  title: "사업영역",
  description:
    "네팔 직업훈련학교, 한국 취업비자(E-9·E-7·D-2·D-4·계절근로), 일본 특정기능까지. 정우인재개발원의 3대 사업영역과 원스톱 프로세스.",
  path: "/services",
});

export default function ServicesPage() {
  return (
    <main>
      <BreadcrumbSchema name="사업영역" path="/services" />
      <PageBanner
        eyebrow="사업 구조"
        context="교육, 비자, 매칭의 일괄 운영"
        titleKo="사업영역"
        desc="단순 알선이 아닙니다. 현지 교육, 비자, 매칭으로 이어지는 일괄 구조로 기업에는 검증된 인재를 연결합니다."
        crumb="사업영역"
        bgImage="/kv/banner-services.webp"
      />

      <section className="bg-paper">
        <div className="max-w-content mx-auto px-5 py-20 lg:px-8 lg:py-28">
          <Reveal className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">
              교육 기반 양성과 제도 기반 채용을 함께 설계합니다
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted">
              세 사업영역은 독립된 상품이 아니라 하나의 채용 운영 흐름입니다. 채용에 쓰이는 제도별
              요건과 절차는{" "}
              <Link href="/visa" className="font-medium text-cobalt underline underline-offset-2">
                비자 정보
              </Link>
              에서 확인할 수 있습니다.
            </p>
          </Reveal>
          <Reveal delay={0.08} className="mt-12">
            <ServiceCards />
          </Reveal>
        </div>
      </section>

      <ProcessSteps />
      <CtaBanner />
    </main>
  );
}
