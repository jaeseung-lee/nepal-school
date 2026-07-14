import { Buildings, IdentificationCard, MapPin } from "@phosphor-icons/react/dist/ssr";
import PageBanner from "@/components/page-banner";
import BreadcrumbSchema from "@/components/breadcrumb-schema";
import ContactForm from "@/components/contact-form";
import Reveal from "@/components/reveal";
import { DEFAULT_LOCALE, getMessages, type Locale } from "@/lib/i18n";
import { SITE } from "@/lib/site";

export default function ContactContent({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const messages = getMessages(locale);
  const copy = messages.pages.contact;
  const companyItems = [
    { label: copy.main.companyItems.founder, value: messages.site.founder, icon: IdentificationCard },
    { label: copy.main.companyItems.businessNumber, value: messages.site.businessRegistrationNumber, icon: Buildings },
    { label: copy.main.companyItems.address, value: messages.site.streetAddress, icon: MapPin },
    SITE.telephone ? { label: copy.main.companyItems.phone, value: SITE.telephone, icon: IdentificationCard } : null,
    SITE.email ? { label: copy.main.companyItems.email, value: SITE.email, icon: IdentificationCard } : null,
  ].filter(Boolean) as { label: string; value: string; icon: typeof IdentificationCard }[];

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
        imageAlt={copy.banner.alt}
        bgImage="/kv/banner-contact.webp"
      />

      <section className="bg-paper">
        <div className="max-w-content mx-auto grid gap-12 px-5 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-28">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">{copy.main.title}</h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">{copy.main.description}</p>

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
            <ContactForm locale={locale} />
          </Reveal>
        </div>
      </section>
    </main>
  );
}
