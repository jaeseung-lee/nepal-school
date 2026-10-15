import PageBanner from "@/components/page-banner";
import { KEY_VISUALS } from "@/lib/key-visuals";
import { SECTION_LABELS } from "@/lib/section-labels";
import BreadcrumbSchema from "@/components/breadcrumb-schema";
import ContactForm from "@/components/contact-form";
import { DEFAULT_LOCALE, getMessages, type Locale } from "@/lib/i18n";
import { SITE } from "@/lib/site";

export default function ContactContent({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const messages = getMessages(locale);
  const copy = messages.pages.contact;
  const companyItems = [
    { key: "founder", label: copy.main.companyItems.founder, value: messages.site.founder },
    { key: "business-number", label: copy.main.companyItems.businessNumber, value: messages.site.businessRegistrationNumber },
    { key: "address", label: copy.main.companyItems.address, value: messages.site.streetAddress },
    ...SITE.phones.map((phone) => ({
      key: `phone-${phone.countryCode}`,
      label: messages.common.mobile,
      value: phone.national,
      href: phone.href,
    })),
    SITE.email ? { key: "email", label: copy.main.companyItems.email, value: SITE.email, href: `mailto:${SITE.email}` } : null,
  ].filter(Boolean) as { key: string; label: string; value: string; href?: string }[];

  return (
    <main>
      <BreadcrumbSchema name={copy.banner.crumb} path="/contact" locale={locale} />
      <PageBanner
        locale={locale}
        eyebrow={copy.banner.eyebrow}
        context={copy.banner.context}
        title={copy.banner.title}
        desc={copy.banner.description}
        crumb={copy.banner.crumb}
        photo={KEY_VISUALS.pages.contact}
        label={SECTION_LABELS.pages.contact}
      />

      <section aria-labelledby="contact-title" className="bg-paper py-section">
        <div className="page-wrap grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <p className="text-meta tabular-nums text-muted" aria-hidden="true">01</p>
            <h2 id="contact-title" className="mt-4 text-headline text-balance text-ink">{copy.main.title}</h2>
            <p className="mt-6 max-w-xl text-description text-muted">{copy.main.description}</p>

            <dl className="mt-10 border-t border-line">
              {companyItems.map((item) => (
                <div key={item.key} className="grid gap-1 border-b border-line py-5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6">
                  <dt className="text-[13px] text-muted">{item.label}</dt>
                  <dd className="text-[15px] font-semibold leading-relaxed text-ink">
                    {item.href ? (
                      <a href={item.href} className="tabular-nums underline decoration-ink/35 underline-offset-4 hover:decoration-ink">
                        {item.value}
                      </a>
                    ) : item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="lg:col-span-6 lg:col-start-7">
            <ContactForm locale={locale} />
          </div>
        </div>
      </section>
    </main>
  );
}
