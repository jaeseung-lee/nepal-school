import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import PageBanner from "@/components/page-banner";
import CtaBanner from "@/components/cta-banner";
import JsonLd from "@/components/json-ld";
import Reveal from "@/components/reveal";
import VisaDisclaimer from "@/components/visa/visa-disclaimer";
import { DEFAULT_LOCALE, getMessages, localizedHref, type Locale } from "@/lib/i18n";
import { getLocalizedVisa, getVisaMessages, localizedVisasByCountry } from "@/lib/visa-i18n";
import { VISAS, type Visa } from "@/lib/visas";
import { SITE_URL } from "@/lib/site";

const COMPARISON_ROW_KEYS = ["legalNature", "stayDuration", "preEntryExamination", "intermediary", "jobChange"] as const;

function VisaCard({ visa, locale }: { visa: Visa; locale: Locale }) {
  const messages = getVisaMessages(locale);

  return (
    <Link
      href={localizedHref(locale, `/visa/${visa.slug}`)}
      className="group flex flex-col rounded-[24px] border border-line bg-surface p-6 shadow-sm shadow-ink/5 transition hover:border-cobalt"
    >
      <span className="inline-flex self-start rounded-full bg-cobalt-soft px-3 py-1 text-xs font-semibold text-cobalt">
        {visa.code}
      </span>
      <h3 className="mt-3 font-display text-xl font-semibold text-ink">{visa.nameKo}</h3>
      <p className="mt-2 flex-1 text-[15px] leading-relaxed text-muted">{visa.summary}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-cobalt">
        {messages.ui.viewDetails}
        <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  );
}

export default function VisaHubContent({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const visaMessages = getVisaMessages(locale);
  const rootMessages = getMessages(locale);
  const hub = visaMessages.hub;
  const koreaVisas = localizedVisasByCountry(locale, "korea");
  const japanVisas = localizedVisasByCountry(locale, "japan");
  const localizedVisas = VISAS.map((visa) => getLocalizedVisa(locale, visa.slug));

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: rootMessages.common.home, item: `${SITE_URL}${localizedHref(locale, "/")}` },
      { "@type": "ListItem", position: 2, name: hub.banner.crumb, item: `${SITE_URL}${localizedHref(locale, "/visa")}` },
    ],
  };

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: hub.comparison.itemListName,
    itemListElement: localizedVisas.map((visa, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: visa.nameKo,
      url: `${SITE_URL}${localizedHref(locale, `/visa/${visa.slug}`)}`,
    })),
  };
  const service = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${SITE_URL}${localizedHref(locale, "/visa")}#service`,
    name: hub.metadata.title,
    description: hub.metadata.description,
    provider: { "@id": `${SITE_URL}/#organization` },
    areaServed: [
      { "@type": "Country", name: "South Korea" },
      { "@type": "Country", name: "Japan" },
    ],
    serviceType: "employment visa process information",
  };

  return (
    <main>
      <JsonLd data={breadcrumb} />
      <JsonLd data={itemList} />
      <JsonLd data={service} />

      <PageBanner
        locale={locale}
        eyebrow={hub.banner.eyebrow}
        context={hub.banner.context}
        title={hub.banner.title}
        desc={hub.banner.description}
        crumb={hub.banner.crumb}
        imageAlt={hub.banner.alt}
        bgImage="/kv/redesign/process.webp"
      />

      <section className="bg-paper">
        <div className="max-w-content mx-auto px-5 py-20 lg:px-8 lg:py-28">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">{hub.koreaSection.title}</h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">{hub.koreaSection.description}</p>
          </Reveal>
          <Reveal delay={0.08} className="mt-10 grid gap-5 sm:grid-cols-2">
            {koreaVisas.map((visa) => <VisaCard key={visa.slug} visa={visa} locale={locale} />)}
          </Reveal>
        </div>
      </section>

      <section className="bg-paper-soft">
        <div className="max-w-content mx-auto px-5 py-20 lg:px-8 lg:py-28">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">{hub.japanSection.title}</h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">{hub.japanSection.description}</p>
          </Reveal>
          <Reveal delay={0.08} className="mt-10 grid gap-5 sm:grid-cols-2">
            {japanVisas.map((visa) => <VisaCard key={visa.slug} visa={visa} locale={locale} />)}
          </Reveal>
        </div>
      </section>

      <section className="bg-paper">
        <div className="max-w-content mx-auto px-5 py-20 lg:px-8 lg:py-28">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">{hub.comparison.title}</h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">{hub.comparison.description}</p>
          </Reveal>
          <Reveal delay={0.08} className="mt-10 overflow-x-auto rounded-[24px] border border-line bg-surface shadow-sm shadow-ink/5">
            <table className="w-full min-w-[720px] text-left text-[15px]">
              <thead>
                <tr className="border-b border-line bg-paper-soft">
                  <th scope="col" className="px-5 py-4 font-semibold text-muted">{hub.comparison.table.header}</th>
                  <th scope="col" className="px-5 py-4 font-display font-semibold text-ink">{hub.comparison.table.koreaE9}</th>
                  <th scope="col" className="px-5 py-4 font-display font-semibold text-ink">{hub.comparison.table.japanSpecifiedSkilledWorker}</th>
                  <th scope="col" className="px-5 py-4 font-display font-semibold text-ink">{hub.comparison.table.japanEmploymentForSkillDevelopment}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {COMPARISON_ROW_KEYS.map((key) => {
                  const row = hub.comparison.table.rows[key];
                  return (
                    <tr key={key}>
                      <th scope="row" className="px-5 py-4 align-top font-semibold text-cobalt">{row.label}</th>
                      <td className="px-5 py-4 align-top leading-relaxed text-ink">{row.koreaE9}</td>
                      <td className="px-5 py-4 align-top leading-relaxed text-ink">{row.japanSpecifiedSkilledWorker}</td>
                      <td className="px-5 py-4 align-top leading-relaxed text-ink">{row.japanEmploymentForSkillDevelopment}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Reveal>
          <Reveal delay={0.12} className="mt-8">
            <VisaDisclaimer locale={locale} />
          </Reveal>
        </div>
      </section>

      <CtaBanner locale={locale} />
    </main>
  );
}
