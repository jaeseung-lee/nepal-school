import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";

export default function HeroSlideshow() {
  return (
    <section className="relative min-h-[calc(100dvh-72px)] overflow-hidden bg-ink text-white">
      <Image
        src="/kv/redesign/hero.webp"
        alt="현지 교육과 국제 이동 준비를 상징하는 직업훈련 현장"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(24,26,31,0.84)_0%,rgba(24,26,31,0.50)_43%,rgba(24,26,31,0.08)_100%)]" aria-hidden="true" />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(24,26,31,0.55),rgba(24,26,31,0.05)_48%)]" aria-hidden="true" />

      <div className="relative flex min-h-[calc(100dvh-72px)] items-end">
        <div className="max-w-content mx-auto w-full px-5 pb-16 pt-16 lg:px-8 lg:pb-20">
          <div className="max-w-3xl">
            <h1 className="font-display text-[clamp(2.75rem,6vw,5.8rem)] font-semibold leading-[0.98] text-balance">
              모든 사람에게{" "}
              <br className="hidden sm:block" />
              공평한 기회를
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-medium leading-relaxed text-white/82 sm:text-xl">
              외국인 인재를 교육, 시험, 비자, 정착까지 책임지는 기업 파트너.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/contact" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-base font-semibold text-cobalt transition hover:bg-cobalt-soft active:translate-y-px">
                문의하기 <ArrowRight size={18} weight="bold" aria-hidden="true" />
              </Link>
              <Link href="/services" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/55 bg-white/8 px-6 py-3.5 text-base font-semibold text-white backdrop-blur transition hover:bg-white/14 active:translate-y-px">
                사업영역 보기 <ArrowRight size={18} weight="bold" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
