import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";

export default function CtaBanner() {
  return (
    <section className="bg-paper pb-16 lg:pb-24">
      <div className="max-w-content mx-auto px-5 lg:px-8">
        <div className="relative overflow-hidden rounded-[32px] border border-line bg-ink text-white">
          <Image
            src="/kv/redesign/contact.webp"
            alt="상담 준비가 된 회의실과 문서"
            fill
            sizes="(min-width: 1024px) 1180px, 100vw"
            className="object-cover opacity-[0.58]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(24,26,31,0.90),rgba(24,26,31,0.62),rgba(24,26,31,0.20))]" aria-hidden="true" />
          <div className="relative max-w-2xl px-6 py-14 sm:px-10 lg:px-14 lg:py-20">
            <h2 className="font-display text-3xl font-semibold text-balance lg:text-5xl">
              기업 요건을 먼저 확인하겠습니다
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/78">
              직무, 인원, 희망 일정, 비자 방향을 알려주시면 가능한 절차와 준비 순서를 정리해 안내합니다.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/contact" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-base font-semibold text-cobalt transition hover:bg-cobalt-soft active:translate-y-px">
                문의하기 <ArrowRight size={18} weight="bold" aria-hidden="true" />
              </Link>
              <Link href="/services" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/55 bg-white/8 px-6 py-3.5 text-base font-semibold text-white backdrop-blur transition hover:bg-white/14 active:translate-y-px">
                절차 보기 <ArrowRight size={18} weight="bold" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
