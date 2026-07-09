import Link from "next/link";
import { NAV_ITEMS } from "@/lib/nav";
import { SITE } from "@/lib/site";

export default function SiteFooter() {
  return (
    <footer className="bg-black text-gray-400">
      <div className="max-w-content mx-auto px-5 lg:px-8 py-16">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_0.8fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-md bg-gold-deep flex items-center justify-center text-white text-[12px] font-bold font-display" aria-hidden="true">JW</span>
              <span className="leading-tight">
                <span className="block text-[15px] font-bold text-white">{SITE.nameKo}</span>
                <span className="block text-[10px] font-display font-medium tracking-[0.14em] text-gray-500 uppercase">{SITE.nameEn}</span>
              </span>
            </div>
            <p className="mt-5 text-sm leading-relaxed max-w-md">네팔·베트남 인재를 현지 교육부터 양성해 한국·일본 기업에 합법적이고 안정적으로 연결하는 글로벌 인적자원 개발 기업입니다.</p>
            <p className="mt-4 text-xs text-gray-600">2026년 6월 설립 · 해외 거점: 네팔 · 베트남</p>
          </div>
          <div>
            <h3 className="text-xs font-display font-semibold tracking-[0.16em] text-gray-500 uppercase">Menu</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-white transition">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-display font-semibold tracking-[0.16em] text-gray-500 uppercase">Company</h3>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex gap-2">
                <dt className="text-gray-600 w-16 shrink-0">대표</dt>
                <dd className="text-gray-200">{SITE.founder}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-600 w-16 shrink-0">사업자번호</dt>
                <dd className="text-gray-300">{SITE.bizRegNo}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-600 w-16 shrink-0">주소</dt>
                <dd className="text-gray-300">{SITE.streetAddress}</dd>
              </div>
            </dl>
          </div>
          <div>
            <h3 className="text-xs font-display font-semibold tracking-[0.16em] text-gray-500 uppercase">Contact</h3>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex gap-2">
                <dt className="text-gray-600 w-16 shrink-0">전화</dt>
                <dd className={SITE.telephone ? "text-gray-300" : "text-gray-600 italic"}>
                  {SITE.telephone || "입력 예정"}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-600 w-16 shrink-0">이메일</dt>
                <dd className={SITE.email ? "text-gray-300" : "text-gray-600 italic"}>
                  {SITE.email || "입력 예정"}
                </dd>
              </div>
              <div className="flex gap-2 pt-1">
                <dt className="text-gray-600 w-16 shrink-0">언어</dt>
                <dd className="text-gray-500">
                  KO · EN · JA · VI · NE <span className="text-[11px]">(준비 중)</span>
                </dd>
              </div>
            </dl>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between gap-3 text-xs text-gray-600">
          <p>© 2026 {SITE.nameKo} ({SITE.nameEn}) All rights reserved.</p>
          <p>네팔 · 베트남 · 한국 · 일본</p>
        </div>
      </div>
    </footer>
  );
}
