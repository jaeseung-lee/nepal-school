import type { Metadata } from "next";
import PageBanner from "@/components/page-banner";
import ContactForm from "@/components/contact-form";

export const metadata: Metadata = {
  title: "문의",
  description: "외국인력 채용·제휴 문의. 기업 요건을 알려주시면 적합한 인재와 절차를 안내드립니다.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main>
      <PageBanner
        eyebrow="Get Started"
        titleEn="Let's Talk"
        titleKo="문의"
        desc="외국인력 채용, 제도부터 정확하게. 기업 요건을 알려주시면 적합한 인재와 절차를 안내드립니다."
        crumb="문의"
        bgImage="/kv/banner-contact.webp"
      />

      <section className="max-w-content mx-auto px-5 lg:px-8 py-20 lg:py-28">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-16">
          {/* 연락처 안내 */}
          <div>
            <span className="text-xs font-display font-semibold tracking-[0.22em] text-primary-main uppercase">Contact</span>
            <h2 className="mt-3 font-display text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">채용·제휴 문의</h2>
            <p className="mt-4 text-base text-gray-600 leading-relaxed">아래 정보로 연락 주시거나, 문의 양식을 남겨 주세요. 기업 요건(직무·인원·희망 비자)을 함께 알려주시면 더 빠르게 안내드립니다.</p>
            <dl className="mt-8 space-y-4">
              <div className="rounded-[16px] border border-gray-200 p-5">
                <dt className="text-xs font-display font-semibold tracking-[0.14em] text-gray-500 uppercase">대표이사</dt>
                <dd className="mt-1 text-lg font-bold text-gray-900">오제환</dd>
              </div>
              {/* 아래 [입력] 항목은 회사 확정 후 교체 예정 */}
              <div className="rounded-[16px] border border-gray-200 p-5">
                <dt className="text-xs font-display font-semibold tracking-[0.14em] text-gray-500 uppercase">전화</dt>
                <dd className="mt-1 text-base text-gray-400 italic">전화번호 입력 예정</dd>
              </div>
              <div className="rounded-[16px] border border-gray-200 p-5">
                <dt className="text-xs font-display font-semibold tracking-[0.14em] text-gray-500 uppercase">이메일</dt>
                <dd className="mt-1 text-base text-gray-400 italic">이메일 입력 예정</dd>
              </div>
              <div className="rounded-[16px] border border-gray-200 p-5">
                <dt className="text-xs font-display font-semibold tracking-[0.14em] text-gray-500 uppercase">주소 / 사업자번호</dt>
                <dd className="mt-1 text-base text-gray-400 italic">주소 입력 예정 · 사업자번호 입력 예정</dd>
              </div>
            </dl>
          </div>

          {/* 문의 양식 (백엔드 연동 예정) */}
          <ContactForm />
        </div>
      </section>
    </main>
  );
}
