import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";
import { getMessages, localizedHref, type Locale } from "@/lib/i18n";

export default function CtaBanner({ locale }: { locale?: Locale }) {
  const cta = getMessages(locale).cta;

  return (
    <section className="bg-paper pb-16 lg:pb-24">
      <div className="max-w-content mx-auto px-5 lg:px-8">
        <div className="relative overflow-hidden rounded-[32px] border border-line bg-ink text-white">
          <Image
            src="/kv/redesign/contact.webp"
            alt={cta.alt}
            fill
            sizes="(min-width: 1024px) 1180px, 100vw"
            className="object-cover opacity-[0.58]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(24,26,31,0.90),rgba(24,26,31,0.62),rgba(24,26,31,0.20))]" aria-hidden="true" />
          <div className="relative max-w-2xl px-6 py-14 sm:px-10 lg:px-14 lg:py-20">
            <h2 className="font-display text-3xl font-semibold text-balance lg:text-5xl">
              {cta.title}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/78">
              {cta.description}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={localizedHref(locale ?? "ko", "/contact")} data-seo-event="cta_clicked" data-content-id="hiring-preparation" data-locale={locale ?? "ko"} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-base font-semibold text-cobalt transition hover:bg-cobalt-soft active:translate-y-px">
                {cta.contactCta} <ArrowRight size={18} weight="bold" aria-hidden="true" />
              </Link>
              <Link href={localizedHref(locale ?? "ko", "/services")} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/55 bg-white/8 px-6 py-3.5 text-base font-semibold text-white backdrop-blur transition hover:bg-white/14 active:translate-y-px">
                {cta.processCta} <ArrowRight size={18} weight="bold" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
