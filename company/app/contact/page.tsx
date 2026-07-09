import type { Metadata } from "next";
import { Buildings, IdentificationCard, MapPin } from "@phosphor-icons/react/dist/ssr";
import PageBanner from "@/components/page-banner";
import ContactForm from "@/components/contact-form";
import Reveal from "@/components/reveal";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "문의",
  description: "외국인력 채용·제휴 문의. 기업 요건을 알려주시면 적합한 인재와 절차를 안내드립니다.",
  alternates: { canonical: "/contact" },
};

const companyItems = [
  { label: "대표이사", value: SITE.founder, icon: IdentificationCard },
  { label: "사업자번호", value: SITE.bizRegNo, icon: Buildings },
  { label: "주소", value: SITE.streetAddress, icon: MapPin },
  SITE.telephone ? { label: "전화", value: SITE.telephone, icon: IdentificationCard } : null,
  SITE.email ? { label: "이메일", value: SITE.email, icon: IdentificationCard } : null,
].filter(Boolean) as { label: string; value: string; icon: typeof IdentificationCard }[];

export default function ContactPage() {
  return (
    <main>
      <PageBanner
        eyebrow="상담 안내"
        context="직무, 인원, 일정 확인부터"
        titleKo="문의"
        desc="외국인력 채용은 직무, 인원, 일정, 비자 방향을 먼저 확인해야 합니다."
        crumb="문의"
        bgImage="/kv/banner-contact.webp"
      />

      <section className="bg-paper">
        <div className="max-w-content mx-auto grid gap-12 px-5 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-28">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">
              상담 전에 필요한 사실부터 정리합니다
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
              웹폼 전송 기능은 아직 운영하지 않습니다. 회사 기본 정보와 상담 준비 항목을 먼저 제공합니다.
            </p>

            <dl className="mt-8 grid gap-4">
              {companyItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex gap-4 rounded-[22px] border border-line bg-surface p-5 shadow-sm shadow-ink/5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cobalt-soft text-cobalt">
                      <Icon size={22} weight="duotone" aria-hidden="true" />
                    </span>
                    <div>
                      <dt className="text-sm font-semibold text-ink">{item.label}</dt>
                      <dd className="mt-1 text-sm leading-relaxed text-muted">{item.value}</dd>
                    </div>
                  </div>
                );
              })}
            </dl>
          </Reveal>

          <Reveal delay={0.08}>
            <ContactForm />
          </Reveal>
        </div>
      </section>
    </main>
  );
}
