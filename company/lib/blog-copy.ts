import type { BlogLocale } from "@/lib/blog-routing";

type BlogCopy = {
  eyebrow: string;
  indexTitle: string;
  indexDescription: string;
  policyNotice: string;
  indexSeoTitle: string;
  indexSeoDescription: string;
  emptyTitle: string;
  emptyDescription: string;
  readArticle: string;
  updated: string;
  published: string;
  minutes: string;
  reviewBadge: string;
  home: string;
  indexName: string;
  asOf: string;
  jurisdiction: string;
  author: string;
  reviewer: string;
  reviewedAt: string;
  sourcesTitle: string;
  sourcesDescription: string;
  accessedAt: string;
  effectiveAt: string;
  relatedTitle: string;
  backToIndex: string;
  disclosureTitle: string;
  aiDisclosure: string;
  humanDisclosure: string;
  legalNotice: string;
  revisions: string;
  contactTitle: string;
  contactDescription: string;
  contactCta: string;
  latestTitle: string;
  latestDescription: string;
  latestCta: string;
  processLabel: string;
};

export const BLOG_COPY: Record<BlogLocale, BlogCopy> = {
  ko: {
    eyebrow: "INSIGHTS",
    indexTitle: "외국인력 채용을 위한 기준 있는 실무 가이드",
    indexDescription: "비자 이름만 나열하지 않습니다. 기업이 실제로 결정해야 하는 직무, 계약, 입국, 정착의 순서와 공식 확인 경로를 정리합니다.",
    policyNotice: "제도와 기준은 변동될 수 있습니다. 각 글의 기준일, 수정일, 공식 출처를 확인하고 실제 신청 전에는 관할 기관의 최신 안내를 검토하세요.",
    indexSeoTitle: "인사이트 | 외국인력 채용·비자 가이드",
    indexSeoDescription: "외국인력 채용, 한국 취업비자, 일본 특정기능 채용에 관한 기업 실무 가이드입니다. 공식 출처와 기준일을 함께 안내합니다.",
    emptyTitle: "검토를 마친 글을 준비하고 있습니다",
    emptyDescription: "공식 출처와 시행일을 확인한 글만 이 목록에 게시합니다.",
    readArticle: "글 읽기",
    updated: "수정일",
    published: "게시일",
    minutes: "분",
    reviewBadge: "검토 중",
    home: "홈",
    indexName: "인사이트",
    asOf: "기준일",
    jurisdiction: "관할",
    author: "작성",
    reviewer: "검토",
    reviewedAt: "검토일",
    sourcesTitle: "공식 출처",
    sourcesDescription: "핵심 사실은 아래 1차 출처를 기준으로 확인했습니다.",
    accessedAt: "확인일",
    effectiveAt: "시행일",
    relatedTitle: "함께 확인할 내용",
    backToIndex: "모든 인사이트 보기",
    disclosureTitle: "작성·검토 정보",
    aiDisclosure: "이 글은 AI의 초안·정리 보조를 받았으며, 게시 전 사람이 공식 출처와 표현을 검토했습니다.",
    humanDisclosure: "이 글은 사람이 작성했으며, 게시 전 공식 출처와 표현을 검토했습니다.",
    legalNotice: "이 글은 일반적인 정보 제공을 위한 것으로, 개별 사안에 대한 법률·노무·행정 자문이 아닙니다.",
    revisions: "게시 및 수정 이력",
    contactTitle: "기업의 채용 요건을 함께 정리해 보세요.",
    contactDescription: "교육, 매칭, 비자, 정착까지 필요한 단계와 역할을 안내합니다.",
    contactCta: "채용 상담 문의",
    latestTitle: "최근 인사이트",
    latestDescription: "공식 출처를 바탕으로 채용과 비자 제도의 핵심을 실무 관점에서 정리합니다.",
    latestCta: "전체 글 보기",
    processLabel: "이 글의 확인 순서",
  },
  ja: {
    eyebrow: "INSIGHTS",
    indexTitle: "外国人材の採用に役立つ、根拠のある実務ガイド",
    indexDescription: "在留資格の名称だけでなく、職務、雇用契約、入国、定着支援の順序と公式な確認先を整理します。",
    policyNotice: "制度や基準は変更される場合があります。基準日、更新日、公式情報を確認し、申請前に管轄機関の最新案内をご確認ください。",
    indexSeoTitle: "インサイト | 外国人材採用・在留資格ガイド",
    indexSeoDescription: "外国人材の採用、在留資格、特定技能に関する企業向け実務ガイドです。公式情報と基準日を明記します。",
    emptyTitle: "確認済みの記事を準備しています",
    emptyDescription: "公式情報と施行日を確認した記事のみ掲載します。",
    readArticle: "記事を読む",
    updated: "更新日",
    published: "公開日",
    minutes: "分",
    reviewBadge: "確認中",
    home: "ホーム",
    indexName: "インサイト",
    asOf: "基準日",
    jurisdiction: "管轄",
    author: "執筆",
    reviewer: "確認",
    reviewedAt: "確認日",
    sourcesTitle: "公式情報",
    sourcesDescription: "主要な事実は、以下の一次情報で確認しています。",
    accessedAt: "確認日",
    effectiveAt: "施行日",
    relatedTitle: "あわせて確認する内容",
    backToIndex: "すべてのインサイトを見る",
    disclosureTitle: "執筆・確認情報",
    aiDisclosure: "この記事はAIによる下書き・整理の補助を受け、公開前に担当者が公式情報と表現を確認しています。",
    humanDisclosure: "この記事は担当者が執筆し、公開前に公式情報と表現を確認しています。",
    legalNotice: "この記事は一般的な情報提供を目的とし、個別案件への法律・労務・行政上の助言ではありません。",
    revisions: "公開・更新履歴",
    contactTitle: "採用要件を一緒に整理しませんか。",
    contactDescription: "教育、マッチング、在留手続、定着まで必要な段階と役割をご案内します。",
    contactCta: "採用相談",
    latestTitle: "最新インサイト",
    latestDescription: "公式情報をもとに、採用と在留制度の要点を実務の視点で整理します。",
    latestCta: "すべて見る",
    processLabel: "この記事の確認順序",
  },
  ne: {
    eyebrow: "INSIGHTS",
    indexTitle: "वैदेशिक जनशक्ति भर्तीका लागि प्रमाणमा आधारित व्यावहारिक मार्गदर्शिका",
    indexDescription: "भिसाको नाम मात्र होइन, पद, सम्झौता, प्रवेश र बसोबास सहयोगको क्रम तथा आधिकारिक पुष्टि गर्ने स्थान स्पष्ट गर्छौँ।",
    policyNotice: "प्रणाली र मापदण्ड परिवर्तन हुन सक्छन्। आधार मिति, संशोधन मिति र आधिकारिक स्रोत जाँच्नुहोस् र आवेदनअघि सम्बन्धित निकायको नवीनतम सूचना पुष्टि गर्नुहोस्।",
    indexSeoTitle: "जानकारी | वैदेशिक जनशक्ति भर्ती र भिसा मार्गदर्शिका",
    indexSeoDescription: "वैदेशिक जनशक्ति भर्ती, रोजगारी भिसा र जापानको निर्दिष्ट सीपसम्बन्धी कम्पनीका लागि व्यावहारिक मार्गदर्शिका।",
    emptyTitle: "पुष्टि गरिएका लेख तयार हुँदैछन्",
    emptyDescription: "आधिकारिक स्रोत र लागू मिति जाँचिएका लेख मात्र यहाँ प्रकाशित हुन्छन्।",
    readArticle: "लेख पढ्नुहोस्",
    updated: "संशोधन मिति",
    published: "प्रकाशन मिति",
    minutes: "मिनेट",
    reviewBadge: "समीक्षामा",
    home: "गृहपृष्ठ",
    indexName: "जानकारी",
    asOf: "आधार मिति",
    jurisdiction: "अधिकार क्षेत्र",
    author: "लेखन",
    reviewer: "समीक्षा",
    reviewedAt: "समीक्षा मिति",
    sourcesTitle: "आधिकारिक स्रोत",
    sourcesDescription: "मुख्य तथ्यहरू तलका प्राथमिक स्रोतबाट पुष्टि गरिएका छन्।",
    accessedAt: "पुष्टि मिति",
    effectiveAt: "लागू मिति",
    relatedTitle: "सम्बन्धित जानकारी",
    backToIndex: "सबै जानकारी हेर्नुहोस्",
    disclosureTitle: "लेखन र समीक्षा जानकारी",
    aiDisclosure: "यस लेखको मस्यौदा र संरचनामा AI सहयोग लिइएको छ र प्रकाशनअघि व्यक्तिले आधिकारिक स्रोत तथा अभिव्यक्ति जाँच गरेका छन्।",
    humanDisclosure: "यो लेख व्यक्तिले लेखेको हो र प्रकाशनअघि आधिकारिक स्रोत तथा अभिव्यक्ति जाँच गरिएको छ।",
    legalNotice: "यो लेख सामान्य जानकारीका लागि हो; व्यक्तिगत विषयमा कानुनी, श्रम वा प्रशासनिक सल्लाह होइन।",
    revisions: "प्रकाशन र संशोधन इतिहास",
    contactTitle: "कम्पनीको भर्ती आवश्यकता सँगै व्यवस्थित गरौँ।",
    contactDescription: "शिक्षा, मिलान, भिसा र बसोबाससम्मका आवश्यक चरण र भूमिका जानकारी दिन्छौँ।",
    contactCta: "भर्ती परामर्श",
    latestTitle: "नवीनतम जानकारी",
    latestDescription: "आधिकारिक स्रोतका आधारमा भर्ती र भिसा प्रणालीका मुख्य बुँदा व्यावहारिक रूपमा प्रस्तुत गर्छौँ।",
    latestCta: "सबै लेख हेर्नुहोस्",
    processLabel: "यो लेख पढ्ने क्रम",
  },
};

export function formatBlogDate(locale: BlogLocale, date: string): string {
  const languageTag = locale === "ko" ? "ko-KR" : locale === "ja" ? "ja-JP" : "ne-NP";
  return new Intl.DateTimeFormat(languageTag, { year: "numeric", month: "long", day: "numeric" }).format(
    new Date(`${date}T00:00:00+09:00`),
  );
}
