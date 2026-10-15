import BreadcrumbSchema from "@/components/breadcrumb-schema";
import PageBanner from "@/components/page-banner";
import { type Locale } from "@/lib/i18n";
import { PRIVACY_COPY } from "@/lib/privacy-copy";
import { SECTION_LABELS } from "@/lib/section-labels";

export default function PrivacyContent({ locale = "ko" }: { locale?: Locale }) {
  const copy = PRIVACY_COPY[locale];
  const sections = [
    [copy.analyticsTitle, copy.analyticsBody],
    [copy.storageTitle, copy.storageBody],
    [copy.rightsTitle, copy.rightsBody],
  ];

  return (
    <main>
      <BreadcrumbSchema locale={locale} name={copy.title} path="/privacy" />
      <PageBanner
        locale={locale}
        label={SECTION_LABELS.pages.privacy}
        title={copy.title}
        eyebrow={copy.updated}
        context=""
        desc={copy.description}
        crumb={copy.title}
      />

      <div className="bg-paper py-section">
        <div className="page-wrap border-t border-line">
          {sections.map(([title, body], index) => (
            <section key={title} className="grid gap-4 border-b border-line py-10 lg:grid-cols-12 lg:gap-8 lg:py-14">
              <div className="lg:col-span-4">
                <p className="text-meta tabular-nums text-muted" aria-hidden="true">{String(index + 1).padStart(2, "0")}</p>
                <h2 className="mt-3 text-title text-balance text-ink">{title}</h2>
              </div>
              <p className="max-w-[44rem] text-[1.0625rem] leading-[1.9] text-gray-700 lg:col-span-7 lg:col-start-6">{body}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
