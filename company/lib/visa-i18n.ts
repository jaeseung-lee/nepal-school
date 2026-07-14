import en from "@/messages/visa/en.json";
import ja from "@/messages/visa/ja.json";
import ko from "@/messages/visa/ko.json";
import lo from "@/messages/visa/lo.json";
import ne from "@/messages/visa/ne.json";
import vi from "@/messages/visa/vi.json";
import type { Locale } from "@/lib/i18n";
import { getVisa, visasByCountry, type Visa, type VisaFaq } from "@/lib/visas";

export type VisaMessages = typeof ko;

type VisaTranslation = {
  code: string;
  name: string;
  countryLabel: string;
  seoTitle: string;
  summary: string;
  keywords: string;
  glance: Record<string, { label: string; value: string }>;
  faqs: Record<string, { question: string; answer: string }>;
};

const CATALOGS: Record<Locale, VisaMessages> = {
  ko,
  en: en as VisaMessages,
  ja: ja as VisaMessages,
  ne: ne as VisaMessages,
  vi: vi as VisaMessages,
  lo: lo as VisaMessages,
};

export function getVisaMessages(locale: Locale): VisaMessages {
  return CATALOGS[locale];
}

function getVisaTranslation(locale: Locale, slug: string): VisaTranslation {
  const translation = getVisaMessages(locale).visas[slug as keyof VisaMessages["visas"]] as VisaTranslation | undefined;

  if (!translation) {
    throw new Error(`No localized visa catalog entry for: ${slug}`);
  }

  return translation;
}

/**
 * Retains the established Visa shape so existing cards, schema, and FAQ
 * components can consume localized values without duplicating route metadata.
 */
export function getLocalizedVisa(locale: Locale, slug: string): Visa {
  const base = getVisa(slug);
  const translation = getVisaTranslation(locale, slug);
  const glance = Object.values(translation.glance);
  const faqs: VisaFaq[] = Object.values(translation.faqs).map(({ question, answer }) => ({ q: question, a: answer }));

  return {
    ...base,
    code: translation.code,
    nameKo: translation.name,
    countryLabel: translation.countryLabel,
    seoTitle: translation.seoTitle,
    summary: translation.summary,
    keywords: translation.keywords.split(",").map((keyword) => keyword.trim()).filter(Boolean),
    glance,
    faqs,
  };
}

export function localizedVisasByCountry(locale: Locale, country: Visa["country"]): Visa[] {
  return visasByCountry(country).map((visa) => getLocalizedVisa(locale, visa.slug));
}
