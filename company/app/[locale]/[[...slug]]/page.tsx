import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AboutContent } from "@/components/page-content/about-content";
import ContactContent from "@/components/page-content/contact-content";
import { GalleryContent } from "@/components/page-content/gallery-content";
import { HomeContent } from "@/components/page-content/home-content";
import LocalizedVisaDetail from "@/components/page-content/localized-visa-detail";
import { PartnersContent } from "@/components/page-content/partners-content";
import PrivacyContent from "@/components/page-content/privacy-content";
import { ServicesContent } from "@/components/page-content/services-content";
import VisaHubContent from "@/components/page-content/visa-hub-content";
import WhyContent from "@/components/page-content/why-content";
import { getMessages, isLocale, LOCALES, type Locale } from "@/lib/i18n";
import { PRIVACY_COPY } from "@/lib/privacy-copy";
import { buildPageMetadata } from "@/lib/seo";
import { VISAS } from "@/lib/visas";
import { getLocalizedVisa, getVisaMessages } from "@/lib/visa-i18n";

type LocalizedPageProps = { params: Promise<{ locale: string; slug?: string[] }> };

const STATIC_ROUTES = ["", "about", "services", "gallery", "partners", "why", "contact", "privacy", "visa"] as const;

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.filter((locale) => locale !== "ko").flatMap((locale) => [
    ...STATIC_ROUTES.map((route) => ({ locale, slug: route ? [route] : [] })),
    ...VISAS.map((visa) => ({ locale, slug: ["visa", visa.slug] })),
  ]);
}

function routeMetadata(locale: Locale, route: string) {
  const messages = getMessages(locale);
  if (route === "") return { title: messages.site.seoTitle, description: messages.site.description };
  if (route === "about") return messages.pages.about.metadata;
  if (route === "services") return messages.pages.services.metadata;
  if (route === "gallery") return messages.pages.gallery.metadata;
  if (route === "partners") return messages.pages.partners.metadata;
  if (route === "why") return messages.pages.why.metadata;
  if (route === "contact") return messages.pages.contact.metadata;
  if (route === "privacy") return PRIVACY_COPY[locale];
  if (route === "visa") return getVisaMessages(locale).hub.metadata;
  if (route.startsWith("visa/")) {
    const visa = getLocalizedVisa(locale, route.slice("visa/".length));
    return visa ? { title: visa.seoTitle, description: visa.summary, keywords: visa.keywords } : null;
  }
  return null;
}

export async function generateMetadata({ params }: LocalizedPageProps): Promise<Metadata> {
  const { locale: value, slug = [] } = await params;
  if (!isLocale(value) || value === "ko") return {};
  const route = slug.join("/");
  const copy = routeMetadata(value, route);
  if (!copy) return {};
  return buildPageMetadata({
    title: copy.title,
    description: copy.description,
    path: route ? `/${route}` : "/",
    locale: value,
    keywords: "keywords" in copy ? [...copy.keywords] : undefined,
  });
}

export default async function LocalizedPage({ params }: LocalizedPageProps) {
  const { locale: value, slug = [] } = await params;
  if (!isLocale(value) || value === "ko") notFound();
  const locale = value;
  const route = slug.join("/");

  if (route === "") return <HomeContent locale={locale} />;
  if (route === "about") return <AboutContent locale={locale} />;
  if (route === "services") return <ServicesContent locale={locale} />;
  if (route === "gallery") return <GalleryContent locale={locale} />;
  if (route === "partners") return <PartnersContent locale={locale} />;
  if (route === "why") return <WhyContent locale={locale} />;
  if (route === "contact") return <ContactContent locale={locale} />;
  if (route === "privacy") return <PrivacyContent locale={locale} />;
  if (route === "visa") return <VisaHubContent locale={locale} />;
  if (route.startsWith("visa/")) {
    const visaSlug = route.slice("visa/".length);
    if (VISAS.some((visa) => visa.slug === visaSlug)) return <LocalizedVisaDetail locale={locale} slug={visaSlug} />;
  }
  notFound();
}
