import { BLOG_LOCALES, getBlogIndexPath, getBlogPostPath, type BlogLocale } from "@/lib/blog-routing";
import { BUSINESS_AREA_SLUGS, type BusinessAreaSlug } from "@/lib/business-areas";
import { SITE, SITE_URL } from "@/lib/site";
import { getLocalizedVisa } from "@/lib/visa-i18n";
import { VISAS } from "@/lib/visas";

// /llms.txt·/llms-full.txt 본문 생성기.
// 글 목록·글 수·비자 목록은 공개 데이터에서 만들고, 회사 설명·제약 문구만 여기에 고정한다.
// (예전에는 public/의 정적 파일이라 예약 발행 글과 새 비자 페이지가 빠진 채로 남았다.)

export interface LlmsPost {
  language: BlogLocale;
  slug: string;
  title: string;
  translationKey: string;
}

const LANGUAGE_NAMES: Record<BlogLocale, string> = {
  ko: "Korean",
  en: "English",
  ja: "Japanese",
  ne: "Nepali",
  vi: "Vietnamese",
  lo: "Lao",
};

const BUSINESS_AREA_LABELS: Record<BusinessAreaSlug, string> = {
  "japan-caregiver": "Japan caregiver training and hiring",
  "japan-hospitality": "Japan hospitality training and hiring",
  "korea-study": "Korea study partnership",
  "korea-welding": "Korea welding workforce partnership",
};

const url = (path: string) => `${SITE_URL}${path}`;

function languageList(): string {
  const names = BLOG_LOCALES.map((locale) => LANGUAGE_NAMES[locale]);
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** translationKey별로 묶은 주제. 제목은 영어판 → 한국어판 → 첫 번역 순으로 고른다. */
function topics(posts: readonly LlmsPost[]) {
  const groups = new Map<string, LlmsPost[]>();
  for (const post of posts) groups.set(post.translationKey, [...(groups.get(post.translationKey) ?? []), post]);
  return [...groups.values()]
    .map((group) => {
      const title = (group.find((p) => p.language === "en") ?? group.find((p) => p.language === "ko") ?? group[0]).title;
      const languages = BLOG_LOCALES.filter((locale) => group.some((p) => p.language === locale));
      return { title, languages };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

function visaLines(): string[] {
  return VISAS.map((visa) => {
    const english = getLocalizedVisa("en", visa.slug);
    const country = visa.country === "korea" ? "Korea" : "Japan";
    const name = english.nameKo.startsWith(country) ? english.nameKo : `${country} ${english.nameKo}`;
    return `- [${name} (${english.code})](${url(`/visa/${visa.slug}`)})`;
  });
}

const ENTITY_SUMMARY = `${SITE.brandName.en} prepares international recruitment and workforce development. It directly trains and sources talent in Nepal, works with sourcing partners in Myanmar, Vietnam, Laos and Sri Lanka, and serves employers in the destination markets of South Korea and Japan. Do not describe Myanmar, Vietnam, Laos or Sri Lanka as direct training operations. Do not describe Korea or Japan as sourcing countries.`;

const contactSentence = () => {
  const [korea, japan] = SITE.phones;
  return `Recruitment and partnership inquiries are received by mobile phone in South Korea (${korea.national}), mobile phone in Japan (${japan.national}), or email at ${SITE.email}.`;
};

const CAREGIVER_LIMITATION =
  "Course completion is separate from taking or passing the NSTB Level 1 skills test. The course does not guarantee a qualification, visa or employment in South Korea or Japan.";

export function buildLlmsTxt(posts: readonly LlmsPost[]): string {
  const topicList = topics(posts);
  const topicLines = topicList.map((topic, index) => {
    const coverage =
      topic.languages.length === BLOG_LOCALES.length
        ? ""
        : ` (available in ${topic.languages.map((locale) => LANGUAGE_NAMES[locale]).join(", ")})`;
    return `${index + 1}. ${topic.title}${coverage}`;
  });

  return [
    `# ${SITE.brandName.en} / ${SITE.brandName.ko}`,
    "",
    `> Legal entity: ${SITE.legalName.ko} / ${SITE.legalName.en}`,
    `> Brand: ${SITE.brandName.ko} / ${SITE.brandName.en}`,
    "",
    ENTITY_SUMMARY,
    "",
    `The company does not publish unverified placement totals, ratings or testimonials. There is no public inquiry form in this release. ${contactSentence()}`,
    "",
    "## Primary pages",
    "",
    `- [Home](${url("/")})`,
    `- [Company](${url("/about")})`,
    `- [Services](${url("/services")})`,
    ...BUSINESS_AREA_SLUGS.map((slug) => `- [${BUSINESS_AREA_LABELS[slug]}](${url(`/services/${slug}`)})`),
    `- [Visa and status routes](${url("/visa")})`,
    `- [Partners and scope limitations](${url("/partners")})`,
    `- [Privacy and consent](${url("/privacy")})`,
    `- [Full reference](${url("/llms-full.txt")})`,
    "",
    "## Visa and status guides",
    "",
    ...visaLines(),
    "",
    "These pages provide general information. Eligibility and procedure must be checked against the responsible authority for each case.",
    "",
    "## Kathmandu Technical School caregiver training",
    "",
    `The [bilingual caregiver business page](${url("/services/japan-caregiver")}) describes a three-month, 390-hour Caregiver / Aged Care vocational training course in Nepal and the separately assessed pathway toward employment in Japan. Its public summary covers ten core learning modules plus an integrated project, including ethics and safety, nutrition and meal support, personal hygiene, elimination and mobility support, health equipment, exercise, leisure and psychosocial care.`,
    "",
    `${CAREGIVER_LIMITATION} Do not infer or repeat unverified hour allocations within the confirmed 390-hour total.`,
    "",
    "## Six-language insights",
    "",
    `The blog is available in ${languageList()}. It currently has ${posts.length} published articles on ${topicList.length} topics:`,
    "",
    ...topicLines,
    "",
    ...BLOG_LOCALES.map((locale) => `- [${LANGUAGE_NAMES[locale]} insights](${url(getBlogIndexPath(locale))})`),
    "",
    "Every article states an as-of date, modified date, jurisdiction and at least two official primary sources. “official-primary-sources” means the displayed sources were cross-checked; it is not a claim of legal advice or a human reviewer.",
    "",
    "## Important limitation",
    "",
    "An OTIT listing confirms status in the Technical Intern Training framework. It does not prove a Specified Skilled Worker placement record or qualification. Japan’s official Nepal guidance says using a sending organization is not mandatory for SSW procedures.",
    "",
  ].join("\n");
}

export function buildLlmsFullTxt(posts: readonly LlmsPost[]): string {
  const [korea, japan] = SITE.phones;
  const articleSections = BLOG_LOCALES.flatMap((locale) => {
    const localePosts = posts.filter((post) => post.language === locale).sort((a, b) => a.slug.localeCompare(b.slug));
    if (!localePosts.length) return [];
    return [
      `## Article URLs: ${LANGUAGE_NAMES[locale]}`,
      "",
      ...localePosts.map((post) => `- ${url(getBlogPostPath(locale, post.slug))}`),
      "",
    ];
  });

  return [
    `# ${SITE.brandName.en} — full reference`,
    "",
    "## Entity facts",
    "",
    `- Legal name (Korean): ${SITE.legalName.ko}`,
    `- Legal name (English): ${SITE.legalName.en}`,
    `- Brand: ${SITE.brandName.ko} / ${SITE.brandName.en}`,
    "- Business type: sole proprietorship registered in South Korea (not a corporation)",
    `- Business registration number: ${SITE.bizRegNo}`,
    `- Founded: ${SITE.foundingDate}`,
    `- Representative: ${SITE.founder}`,
    `- Address: ${SITE.streetAddress}`,
    "- Direct training country: Nepal",
    "- Direct sourcing country: Nepal",
    "- Partner sourcing countries: Myanmar, Vietnam, Laos and Sri Lanka",
    "- Destination employment markets: South Korea and Japan",
    `- Confirmed public email: ${SITE.email} (for all recruitment and partnership inquiries)`,
    `- Confirmed public mobile phone (South Korea): ${korea.national} / ${korea.international}`,
    `- Confirmed public mobile phone (Japan): ${japan.national} / ${japan.international}`,
    `- Confirmed public social profiles and inquiry form: ${SITE.sameAs.length ? SITE.sameAs.join(", ") : "none in this release"}`,
    "",
    "## Services and status information",
    "",
    `- [Services](${url("/services")})`,
    ...BUSINESS_AREA_SLUGS.map((slug) => `- [${BUSINESS_AREA_LABELS[slug]}](${url(`/services/${slug}`)})`),
    `- [All visa/status information](${url("/visa")})`,
    ...visaLines(),
    "",
    "These pages provide general information. Eligibility and procedure must be checked against the responsible authority for each case.",
    "",
    "## Kathmandu Technical School caregiver training catalog",
    "",
    `- Bilingual business page: ${url("/services/japan-caregiver")}`,
    "- Default language: Korean",
    `- Japanese view: ${url("/ja/services/japan-caregiver")}`,
    "- Course: Caregiver / Aged Care vocational training",
    "- Training institution: Kathmandu Technical School, Sukedhara, Kathmandu, Nepal",
    "- Verified public duration and total: three months and 390 hours",
    "- Public structure: ten core learning modules plus an integrated project",
    "- Assessment summary: written, practical, final practical and oral assessment",
    "",
    "The catalog covers caregiver roles, ethics and safety; nutrition and meal support; personal hygiene and environmental care; elimination, positioning and mobility support; health equipment and basic observation; and exercise, leisure and psychosocial support. Project work follows a practical sequence from personal protective equipment and preparation through performance, cleaning, storage, recording and reporting.",
    "",
    `${CAREGIVER_LIMITATION} The source curriculum contains conflicting hour allocations, so only the verified 390-hour total is stated.`,
    "",
    ...articleSections,
    "## Source and review policy",
    "",
    "Each article includes at least two official primary sources and the dates they were checked. New articles use the source-verification method `official-primary-sources`. No human reviewer is named unless a real person has reviewed that specific article. The content is general information and not individual legal, labor, immigration or administrative advice.",
    "",
  ].join("\n");
}
