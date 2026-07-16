import BreadcrumbSchema from "@/components/breadcrumb-schema";
import { localizedHref, type Locale } from "@/lib/i18n";
import { PRIVACY_COPY } from "@/lib/privacy-copy";

export default function PrivacyContent({ locale = "ko" }: { locale?: Locale }) {
  const copy = PRIVACY_COPY[locale];
  return (
    <main>
      <BreadcrumbSchema locale={locale} name={copy.title} path="/privacy" />
      <section className="border-b border-line bg-paper-soft">
        <div className="max-w-[920px] mx-auto px-5 py-16 lg:px-8 lg:py-24">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cobalt">PRIVACY</p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-[-0.035em] text-ink sm:text-5xl">{copy.title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">{copy.description}</p>
          <p className="mt-5 text-sm text-gray-500">{copy.updated}</p>
        </div>
      </section>
      <div className="max-w-[920px] mx-auto grid gap-6 px-5 py-14 lg:px-8 lg:py-20">
        {[
          [copy.analyticsTitle, copy.analyticsBody],
          [copy.storageTitle, copy.storageBody],
          [copy.rightsTitle, copy.rightsBody],
        ].map(([title, body]) => (
          <section key={title} className="rounded-[24px] border border-line bg-white p-6 lg:p-8">
            <h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>
            <p className="mt-4 text-base leading-8 text-muted">{body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
