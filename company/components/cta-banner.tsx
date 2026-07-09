import Link from "next/link";

/** 전 페이지 하단 공용 CTA 배너 */
export default function CtaBanner() {
  return (
    <section className="relative overflow-hidden bg-primary-main text-white">
      <div className="absolute inset-0 bg-gradient-to-r from-primary-deepest via-primary-main to-blue-accent/70" aria-hidden="true"></div>
      <div className="relative max-w-content mx-auto px-5 lg:px-8 py-20 lg:py-24 text-center">
        <span className="text-xs font-display font-semibold tracking-[0.22em] text-gold-light uppercase">Get Started</span>
        <h2 className="mt-4 font-display text-3xl lg:text-[52px] font-bold tracking-tight text-balance">Let&apos;s Build Your Workforce</h2>
        <p className="mt-3 text-2xl font-bold">지금 채용 상담을 시작하세요</p>
        <p className="mt-4 text-base lg:text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">외국인력 채용, 제도부터 정확하게. 기업 요건을 알려주시면 적합한 인재와 절차를 안내드립니다.</p>
        <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/contact" className="inline-flex justify-center items-center gap-2 rounded-full bg-white text-primary-main hover:bg-gold-light hover:text-white transition text-base font-semibold px-8 py-4 shadow-lg">
            제휴 문의하기 <span aria-hidden="true">→</span>
          </Link>
          <Link href="/partners" className="inline-flex justify-center items-center gap-2 rounded-full border border-white/40 hover:bg-white/10 transition text-white text-base font-semibold px-8 py-4">
            파트너십 보기
          </Link>
        </div>
      </div>
    </section>
  );
}
