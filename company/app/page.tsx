import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import HeroSlideshow from "@/components/hero-slideshow";
import MetricsStrip from "@/components/metrics-strip";
import Collage from "@/components/collage";
import ServiceCards from "@/components/service-cards";
import PartnerCards from "@/components/partner-cards";
import ProcessSteps from "@/components/process-steps";
import FaqSection from "@/components/faq-section";
import CtaBanner from "@/components/cta-banner";
import Reveal from "@/components/reveal";

export default function HomePage() {
  return (
    <main>
      <HeroSlideshow />
      <MetricsStrip />

      <section className="bg-paper">
        <div className="max-w-content mx-auto grid gap-12 px-5 py-20 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-28">
          <Reveal>
            <Collage />
          </Reveal>
          <Reveal delay={0.08} className="flex flex-col justify-center">
            <h2 className="font-display text-3xl font-semibold text-ink text-balance lg:text-5xl">
              단순 알선보다 먼저, 교육과 검증을 설계합니다
            </h2>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted">
              2026년 6월 출발한 신생 기업입니다. 그래서 과장된 실적 대신 현지 파트너, 제도 기준, 단계별 역할을 분명히 공개합니다.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/about" className="inline-flex items-center justify-center gap-2 rounded-full bg-cobalt px-5 py-3 text-sm font-semibold text-white transition hover:bg-cobalt-ink active:translate-y-px">
                회사소개 <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </Link>
              <Link href="/why" className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-cobalt hover:text-cobalt active:translate-y-px">
                신뢰 기준 <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-paper-soft">
        <div className="max-w-content mx-auto px-5 py-20 lg:px-8 lg:py-28">
          <Reveal className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">
              교육, 한국, 일본을 하나의 운영 체계로 묶습니다
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted">
              각 사업영역은 따로 보이지만 실제 운영에서는 선발, 교육, 시험, 비자, 정착이 연결됩니다.
            </p>
          </Reveal>
          <Reveal delay={0.08} className="mt-12">
            <ServiceCards />
          </Reveal>
        </div>
      </section>

      <ProcessSteps />

      <section className="bg-paper">
        <div className="max-w-content mx-auto px-5 py-20 lg:px-8 lg:py-28">
          <Reveal className="mb-10 max-w-2xl">
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">
              협력 기관은 이름보다 역할이 중요합니다
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted">
              로고가 준비되지 않은 기관을 장식하지 않고, 각 파트너가 실제로 맡는 책임을 먼저 보여줍니다.
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <PartnerCards />
          </Reveal>
          <div className="mt-8">
            <Link href="/partners" className="inline-flex items-center gap-2 text-sm font-semibold text-cobalt transition hover:text-cobalt-ink">
              파트너십 자세히 보기 <ArrowRight size={16} weight="bold" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <FaqSection />
      <CtaBanner />
    </main>
  );
}
