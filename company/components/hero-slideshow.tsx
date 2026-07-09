"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const SLIDES = [
  { key: "nepal", img: "/kv/hero-nepal.webp" },
  { key: "korea", img: "/kv/hero-korea.webp" },
  { key: "japan", img: "/kv/hero-japan.webp" },
];
const DELAY = 5500;

/** 히어로 (풀블리드 배경 슬라이드쇼) — 실사 KV 사진 */
export default function HeroSlideshow() {
  const [active, setActive] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const start = useCallback(() => {
    stop();
    timer.current = setInterval(() => setActive((i) => (i + 1) % SLIDES.length), DELAY);
  }, [stop]);

  useEffect(() => {
    start();
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [start, stop]);

  // 도트 클릭: 해당 슬라이드로 이동 후 타이머 재시작
  const goTo = (i: number) => {
    setActive(i);
    start();
  };

  return (
    <section className="relative overflow-hidden bg-primary-dark text-white">
      {/* 히어로 배경 슬라이드쇼 — 실사 KV 사진 */}
      <div className="absolute inset-0" aria-hidden="true">
        {SLIDES.map((s, i) => (
          <div key={s.key} className={`hero-slide ${i === active ? "is-active" : ""}`} style={{ backgroundImage: `url('${s.img}')` }}></div>
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-primary-deepest/85 via-primary-dark/70 to-primary-main/45" aria-hidden="true"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-primary-deepest/90 via-transparent to-transparent" aria-hidden="true"></div>
      <div className="relative max-w-content mx-auto px-5 lg:px-8 pt-36 pb-20 lg:pt-44 lg:pb-28">
        <div className="max-w-4xl">
          <span className="inline-flex items-center gap-2 text-xs font-display font-semibold tracking-[0.22em] text-gold-light uppercase">Global Human Resource Development</span>
          <h1 className="mt-5 font-display font-bold leading-[1.04] tracking-tight text-balance text-[clamp(2.6rem,7vw,6.2rem)]">
            We Don&apos;t Send Talent.
            <br />
            <span className="text-gold-light">We Grow It.</span>
          </h1>
          <p className="mt-7 text-xl sm:text-2xl font-semibold leading-snug text-white/95 text-pretty">사람을 키우는 일이, 가장 확실한 연결입니다.</p>
          <p className="mt-4 text-base sm:text-lg text-white/75 leading-relaxed max-w-2xl text-pretty">인재는 보내는 것이 아니라, 키우는 것입니다. 네팔·베트남 현지 교육부터 비자·정착까지 — 한국·일본 기업을 위한 검증된 원스톱 파트너.</p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3">
            <Link href="/contact" className="inline-flex justify-center items-center gap-2 rounded-full bg-white text-primary-main hover:bg-gold-light hover:text-white transition text-base font-semibold px-7 py-3.5 shadow-lg">
              외국인력 제휴 문의 <span aria-hidden="true">→</span>
            </Link>
            <Link href="/services" className="inline-flex justify-center items-center gap-2 rounded-full border border-white/40 hover:bg-white/10 transition text-white text-base font-semibold px-7 py-3.5">
              사업영역 살펴보기
            </Link>
          </div>
          <p className="mt-8 text-sm text-white/55">E-9 · E-7 · D-2 · D-4 · 계절근로(E-8) · 일본 특정기능1호 — 제도에 맞춰 리스크 없이.</p>
        </div>
      </div>
      <div className="absolute bottom-7 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3" role="tablist" aria-label="히어로 배경 슬라이드">
        {SLIDES.map((s, i) => (
          <button
            key={s.key}
            type="button"
            className="hero-dot"
            onClick={() => goTo(i)}
            aria-label={`슬라이드 ${i + 1}`}
            aria-selected={i === active}
          ></button>
        ))}
      </div>
    </section>
  );
}
