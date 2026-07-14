import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomeContent } from "@/components/page-content/home-content";
import { AboutContent } from "@/components/page-content/about-content";
import ContactContent from "@/components/page-content/contact-content";
import { PartnersContent } from "@/components/page-content/partners-content";
import { ServicesContent } from "@/components/page-content/services-content";
import WhyContent from "@/components/page-content/why-content";
import LocalizedVisaDetail from "@/components/page-content/localized-visa-detail";
import VisaHubContent from "@/components/page-content/visa-hub-content";
import {
  getMessages,
  isLocale,
  LOCALES,
  LOCALE_DETAILS,
  localizedHref,
  type Locale,
} from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";
import { VISAS } from "@/lib/visas";
import { getLocalizedVisa, getVisaMessages } from "@/lib/visa-i18n";

type LocalizedPageProps = {
  params: Promise<{ locale: string; slug?: string[] }>;
};

function metadataForRoute(locale: Locale, route: string) {
  const messages = getMessages(locale);

  if (route === "about") return messages.pages.about.metadata;
  if (route === "services") return messages.pages.services.metadata;
  if (route === "partners") return messages.pages.partners.metadata;
  if (route === "why") return messages.pages.why.metadata;
  if (route === "contact") return messages.pages.contact.metadata;
  if (route === "visa") return getVisaMessages(locale).hub.metadata;
  if (route.startsWith("visa/")) {
    const slug = route.slice("visa/".length);
    const visa = VISAS.find((candidate) => candidate.slug === slug);
    if (visa) {
      const translatedVisa = getLocalizedVisa(locale, visa.slug);
      return { title: translatedVisa.seoTitle, description: translatedVisa.summary };
    }
  }
  if (route === "") {
    return {
      title: `${messages.site.name} - ${messages.site.seoTitle}`,
      description: messages.site.description,
    };
  }

  return {
    title: `${messages.nav.visa} - ${messages.site.name}`,
    description: messages.site.description,
  };
}

export async function generateMetadata({ params }: LocalizedPageProps): Promise<Metadata> {
  const { locale: localeParam, slug = [] } = await params;
  const locale = isLocale(localeParam) ? localeParam : "ko";
  const route = slug.join("/");
  const copy = metadataForRoute(locale, route);
  const fullTitle = route ? `${copy.title} - ${getMessages(locale).site.name}` : copy.title;
  const visaSlug = route.startsWith("visa/") ? route.slice("visa/".length) : undefined;
  const localizedVisa = visaSlug && VISAS.some((visa) => visa.slug === visaSlug)
    ? getLocalizedVisa(locale, visaSlug)
    : undefined;
  const keywords = route === "visa"
    ? getVisaMessages(locale).hub.metadata.keywords.split(",").map((keyword) => keyword.trim())
    : localizedVisa?.keywords;
  const path = localizedHref(locale, route ? `/${route}` : "/");
  const languageAlternates = Object.fromEntries(
    LOCALES.map((language) => [language, `${SITE_URL}${localizedHref(language, route ? `/${route}` : "/")}`]),
  );

  return {
    title: { absolute: fullTitle },
    description: copy.description,
    keywords,
    alternates: {
      canonical: path,
      languages: {
        ...languageAlternates,
        "x-default": `${SITE_URL}${localizedHref("ko", route ? `/${route}` : "/")}`,
      },
    },
    openGraph: {
      type: "website",
      siteName: getMessages(locale).site.name,
      locale: LOCALE_DETAILS[locale].ogLocale,
      url: path,
      title: fullTitle,
      description: copy.description,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: copy.description,
    },
  };
}

export default async function LocalizedPage({ params }: LocalizedPageProps) {
  const { locale: localeParam, slug = [] } = await params;

  if (!isLocale(localeParam)) {
    notFound();
  }

  const locale = localeParam;
  const route = slug.join("/");

  if (route === "") return <HomeContent locale={locale} />;
  if (route === "about") return <AboutContent locale={locale} />;
  if (route === "services") return <ServicesContent locale={locale} />;
  if (route === "partners") return <PartnersContent locale={locale} />;
  if (route === "why") return <WhyContent locale={locale} />;
  if (route === "contact") return <ContactContent locale={locale} />;
  if (route === "visa") return <VisaHubContent locale={locale} />;
  if (route.startsWith("visa/")) {
    const visaSlug = route.slice("visa/".length);
    if (VISAS.some((visa) => visa.slug === visaSlug)) {
      return <LocalizedVisaDetail locale={locale} slug={visaSlug} />;
    }
  }

  notFound();
}
