import { SITE, SITE_URL } from "./site";

export type BlogTable = {
  caption: string;
  headers: string[];
  rows: string[][];
};

export type BlogSection = {
  heading: string;
  lead?: string;
  paragraphs?: string[];
  bullets?: string[];
  table?: BlogTable;
};

export type BlogSource = {
  label: string;
  href: string;
  description: string;
};

export type RelatedLink = {
  label: string;
  href: string;
  description: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  excerpt: string;
  keywords: string[];
  category: string;
  publishedAt: string;
  modifiedAt: string;
  readingMinutes: number;
  image: string;
  imageAlt: string;
  sections: BlogSection[];
  sources: BlogSource[];
  relatedLinks: RelatedLink[];
};

const PUBLISHED_AT = "2026-07-15";

// 콘텐츠는 CMS 의존성 없이 이 파일에서 관리한다. 제도 변경이 잦은 주제이므로
// 게시·수정일과 공식 출처를 함께 보관하고, 수정 시 modifiedAt도 반드시 갱신한다.
export const BLOG_POSTS: readonly BlogPost[] = [
  {
    slug: "foreign-worker-hiring-checklist",
    title: "외국인력 채용 전 기업이 확인할 7가지",
    seoTitle: "외국인력 채용 전 기업 체크리스트",
    description: "외국인력 채용을 준비하는 기업이 직무, 비자 경로, 선발, 근로조건, 정착 지원, 증빙, 사후 관리를 순서대로 점검하는 실무 가이드입니다.",
    excerpt: "비자부터 고르기보다 채용할 직무와 현장의 준비도를 먼저 정리해야 합니다. 기업이 계약 전 확인할 핵심 항목을 한 번에 점검합니다.",
    keywords: ["외국인력 채용", "외국인 근로자 고용", "외국인 채용 절차", "네팔 인재 채용"],
    category: "외국인력 채용 가이드",
    publishedAt: PUBLISHED_AT,
    modifiedAt: PUBLISHED_AT,
    readingMinutes: 6,
    image: "/kv/redesign/partner.webp",
    imageAlt: "기업과 인재의 국제 채용 협업을 상징하는 상담 장면",
    sections: [
      {
        heading: "먼저 정리할 답: 비자보다 직무와 현장입니다",
        lead: "외국인력 채용은 ‘어느 국가의 인재를 뽑을지’보다 ‘어떤 업무에, 어떤 고용 구조로, 누가 입국 후 적응을 지원할지’를 먼저 정리해야 합니다.",
        paragraphs: ["채용 경로마다 허용 업종·직무, 사업주 요건, 신청 시점, 근로자 요건이 다릅니다. 모집을 시작하기 전 한 장의 채용 요건표를 만들면 비자 선택과 서류 준비가 뒤엉키는 일을 줄일 수 있습니다."],
      },
      {
        heading: "1. 실제 업무를 한 문장으로 정의합니다",
        paragraphs: ["‘생산직 인력이 필요하다’는 표현만으로는 부족합니다. 근무 장소, 담당 공정, 교대 여부, 필요한 숙련도, 안전상 주의사항, 현장 언어 사용 수준을 문서화하세요. 이 문장이 채용 경로 적합성, 교육 내용, 근로계약의 출발점이 됩니다."],
        bullets: ["직무명과 실제 수행 업무가 일치하는가", "현장 안전교육과 작업 지시를 이해할 언어 지원이 가능한가", "사업장 이동·교대·기숙사 등 근무 조건을 사전에 설명할 수 있는가"],
      },
      {
        heading: "2. 제도 경로와 사업주 요건을 따로 확인합니다",
        paragraphs: ["한국의 고용허가제 일반고용 절차는 내국인 구인 노력, 고용센터 신청, 고용허가서 발급, 근로계약과 고용의 순서로 안내됩니다. 적용 업종과 고용 가능 인원, 해당 회차의 세부 요건은 달라질 수 있으므로 신청 전 공식 공고를 다시 확인해야 합니다.", "E-7처럼 직종·자격·임금 기준을 함께 보는 체류자격은 같은 ‘외국인 채용’이라도 검토 방식이 다릅니다. 회사 규모만으로 경로를 정하지 말고, 실제 직무와 후보자의 경력·자격을 함께 대조하는 것이 안전합니다."],
      },
      {
        heading: "3. 선발 기준은 서류와 인터뷰에서 같은 질문으로 검증합니다",
        paragraphs: ["이력서만으로 배치 가능 여부를 판단하지 마세요. 직무별 체크리스트를 만들어 경력, 언어 수준, 근무지 적응, 입국 가능 시점, 가족·주거 관련 필요 지원을 동일한 기준으로 확인합니다."],
        bullets: ["신분·학력·경력 증빙의 원본과 번역본 확인", "직무 시연 또는 상황형 인터뷰로 업무 이해도 확인", "교육 이수·시험 결과·건강 관련 제출 요건의 확인 시점 합의"],
      },
      {
        heading: "4. 근로조건은 입국 전에 이해 가능한 언어로 설명합니다",
        paragraphs: ["급여만 전달하면 분쟁을 막기 어렵습니다. 기본급, 수당, 공제, 근무시간, 휴일, 숙소비, 식비, 담당 업무, 배치 장소와 변경 가능성을 계약 전부터 같은 문서로 안내하세요. 설명 언어와 설명 일자를 남겨 두면 이후의 오해를 줄이는 데 도움이 됩니다."],
      },
      {
        heading: "5. 정착 지원을 채용 일정에 포함합니다",
        paragraphs: ["입국일은 채용의 끝이 아니라 현장 적응의 시작입니다. 공항 이동, 입주, 계좌·통신, 기초 안전교육, 현장 멘토 지정, 초기 상담의 책임자를 미리 정해 두어야 합니다. 지원 주체가 기업인지, 현지 파트너인지, 외부 기관인지도 역할표에 명시하세요."],
      },
      {
        heading: "6. 증빙과 비용의 책임자를 분리해 기록합니다",
        paragraphs: ["채용 과정에서는 계약서, 허가·신청 서류, 교육·시험 결과, 안내 기록, 비용 정산 자료가 여러 기관에 흩어지기 쉽습니다. 문서마다 보관 책임자·갱신일·공유 범위를 정해 두면 감사와 갱신 절차에 대응하기 수월합니다."],
      },
      {
        heading: "7. 계약 전 최종 검토 회의를 한 번 더 엽니다",
        paragraphs: ["마지막에는 인사, 현장 관리자, 재무·노무 담당자, 채용 파트너가 같은 요건표를 보고 누락을 확인하세요. 비자·노무·송출 관련 판단은 개별 사안에 따라 달라질 수 있으므로, 최종 계약과 신청 전에는 관할 기관 또는 자격 있는 전문가의 최신 안내를 확인해야 합니다."],
      },
    ],
    sources: [
      { label: "한국산업인력공단 EPS — 일반고용허가제와의 비교", href: "https://eps.hrdkorea.or.kr/h2/h2empl/empPermComp.do", description: "일반고용허가제의 사업주 고용 절차와 적용 기준을 확인하는 공식 안내입니다." },
      { label: "고용노동부 — E-9 고용허가 신청 안내", href: "https://www.moel.go.kr/news/enews/report/enewsView.do?news_seq=16843", description: "내국인 구인 노력 후 고용허가 신청 절차를 설명한 정부 안내입니다." },
    ],
    relatedLinks: [
      { label: "정우인재개발원의 채용 지원 범위", href: "/services", description: "선발부터 정착까지의 운영 흐름을 확인합니다." },
      { label: "한국·일본 비자 정보", href: "/visa", description: "채용 경로별 기본 요건과 절차를 살펴봅니다." },
    ],
  },
  {
    slug: "e9-vs-e7-hiring-guide",
    title: "E-9과 E-7의 차이: 외국인 채용 전 비교할 5가지 기준",
    seoTitle: "E-9과 E-7 비자 차이와 외국인 채용 기준",
    description: "E-9과 E-7 체류자격의 목적, 직무 기준, 사업주 검토, 후보자 요건, 채용 절차를 기업 관점에서 비교하고 확인 순서를 안내합니다.",
    excerpt: "E-9과 E-7은 같은 외국인 채용이라도 출발점이 다릅니다. 비자 이름이 아니라 직무와 후보자 요건부터 비교해야 하는 이유를 정리했습니다.",
    keywords: ["E-9 E-7 차이", "E-9 비자", "E-7 비자", "외국인 채용 비자", "외국인력 채용"],
    category: "한국 취업비자",
    publishedAt: PUBLISHED_AT,
    modifiedAt: PUBLISHED_AT,
    readingMinutes: 7,
    image: "/kv/redesign/korea.webp",
    imageAlt: "한국 기업의 외국인 인재 채용과 현장 배치를 상징하는 이미지",
    sections: [
      {
        heading: "핵심 차이: E-9은 고용허가제 경로, E-7은 지정 활동·직종 검토가 중심입니다",
        lead: "E-9과 E-7을 단순히 ‘단순노무’와 ‘전문직’으로만 나누면 실제 검토에서 빠지는 항목이 생깁니다. 기업은 먼저 직무, 업종, 후보자의 자격, 회사의 고용 요건을 같은 표에서 확인해야 합니다.",
        paragraphs: ["E-9은 고용허가제 절차 안에서 검토하는 비전문취업 경로입니다. E-7은 법무부 장관이 지정하는 활동 분야에 따라 전문·준전문·일반기능·숙련기능인력 등으로 세분되어 있어, 직종과 세부 요건을 확인하는 일이 중요합니다."],
      },
      {
        heading: "기업이 먼저 비교할 5가지",
        table: {
          caption: "E-9과 E-7 검토의 출발점",
          headers: ["비교 기준", "E-9 검토의 중심", "E-7 검토의 중심"],
          rows: [
            ["제도 성격", "고용허가제 절차와 적용 업종", "지정 활동·직종과 세부 체류자격"],
            ["직무 확인", "허용 업종과 사업장 조건", "직종 적합성, 수행 업무, 자격·경력"],
            ["후보자 검토", "고용허가제의 구직·입국 절차", "직종별 학력·경력·자격 등 해당 기준"],
            ["사업주 검토", "내국인 구인 노력, 고용허가 신청, 인원·업종 기준", "고용기업 요건, 고용 형태, 임금 등 세부 기준"],
            ["최종 확인", "해당 회차의 고용허가 공고", "해당 연도의 체류관리·직종 안내"],
          ],
        },
      },
      {
        heading: "1. 직무가 어느 제도에 맞는지부터 봅니다",
        paragraphs: ["E-9은 고용허가제에서 정하는 업종과 사업주 절차가 출발점입니다. 반면 E-7은 후보자를 먼저 확보했다는 사실만으로 진행되지 않으며, 실제 업무가 세부 직종에 맞는지와 후보자의 자격이 기준을 충족하는지를 함께 봐야 합니다.", "따라서 채용 요청서에는 직무명뿐 아니라 업무 범위, 필요한 기능, 근무 장소, 급여 구조, 조직 내 해당 역할을 구체적으로 적는 편이 좋습니다."],
      },
      {
        heading: "2. 후보자의 이력은 제도별로 확인 항목이 달라집니다",
        paragraphs: ["E-7은 세부 유형과 직종에 따라 학력, 경력, 자격, 임금 등 확인할 요소가 달라집니다. E-9은 고용허가제의 구직·입국 단계와 사업주 배정 절차를 기준으로 일정이 진행됩니다. 한 종류의 이력서 양식으로 모든 경로를 평가하지 않는 것이 좋습니다."],
      },
      {
        heading: "3. 일정은 ‘입국 희망일’이 아니라 ‘공식 절차의 완료일’ 기준으로 잡습니다",
        paragraphs: ["고용허가 신청 회차, 서류 보완, 자격 확인, 사증·입국 절차는 각각 별도의 시간이 필요합니다. 근무 시작일을 먼저 확정하기보다 필요한 승인·계약·교육·입주 단계를 역산해 채용 일정을 세우세요."],
      },
      {
        heading: "4. 임금과 근로조건은 비자 판단과 분리하지 않습니다",
        paragraphs: ["임금, 근로시간, 근무 장소, 실제 업무는 모두 채용의 핵심 사실입니다. 서류에 적은 내용과 현장에서 수행할 내용이 다르면 이후 체류·노무 관리에도 위험이 생길 수 있습니다. 제안 조건은 후보자가 이해할 수 있는 언어로 설명하고 기록하세요."],
      },
      {
        heading: "5. 제도 명칭만으로 결론내리지 않습니다",
        paragraphs: ["E-9과 E-7은 세부 고시와 안내가 바뀔 수 있고, 같은 E-7 안에서도 유형마다 기준이 다릅니다. 이 글은 기업의 초기 분류를 돕기 위한 안내이며, 실제 신청 가능 여부는 관할 출입국·고용 관련 기관의 최신 기준과 개별 사실관계로 확인해야 합니다."],
      },
    ],
    sources: [
      { label: "한국산업인력공단 EPS — 일반고용허가제와의 비교", href: "https://eps.hrdkorea.or.kr/h2/h2empl/empPermComp.do", description: "E-9 고용허가제의 고용 절차와 적용 업종을 확인하는 공식 안내입니다." },
      { label: "법무부 — 2026년 외국인 유입 경로 관련 설명자료", href: "https://mojhome.moj.go.kr/bbs/moj/182/490648/download.do", description: "E-7의 세부 구분과 E-9의 활동 범위를 확인하는 정부 설명자료입니다." },
      { label: "법무부 — 특정활동(E-7) 임금 기준 설명", href: "https://www.moj.go.kr/bbs/moj/183/490558/download.do", description: "E-7 세부 유형에 따라 적용 기준이 다를 수 있음을 확인하는 정부 설명자료입니다." },
    ],
    relatedLinks: [
      { label: "E-9 비전문취업", href: "/visa/e-9", description: "고용허가제 기반 채용 경로를 확인합니다." },
      { label: "E-7 특정활동", href: "/visa/e-7", description: "E-7의 기본 검토 항목을 확인합니다." },
    ],
  },
  {
    slug: "japan-ssw-nepal-hiring-guide",
    title: "일본 특정기능 1호로 네팔 인재를 채용하는 절차",
    seoTitle: "일본 특정기능 1호 네팔 인재 채용 절차",
    description: "일본 기업이 특정기능 1호로 네팔 인재를 채용할 때 확인해야 할 직무, 시험·계약, 재류자격인정증명서, 입국 후 지원 절차를 정리했습니다.",
    excerpt: "특정기능 1호 채용은 후보자 시험만으로 끝나지 않습니다. 고용계약, 소속기관 서류, 재류 절차, 입국 후 지원을 한 흐름으로 준비해야 합니다.",
    keywords: ["일본 특정기능 1호", "네팔 인재 채용", "특정기능 비자", "일본 외국인 채용", "특정기능 채용 절차"],
    category: "일본 특정기능",
    publishedAt: PUBLISHED_AT,
    modifiedAt: PUBLISHED_AT,
    readingMinutes: 7,
    image: "/kv/redesign/japan.webp",
    imageAlt: "일본 취업 준비와 현지 정착 지원을 상징하는 이미지",
    sections: [
      {
        heading: "핵심 답: 특정기능 1호 채용은 계약·재류 절차·지원계획을 함께 준비하는 일입니다",
        lead: "일본의 특정기능 1호는 인력 확보가 어려운 특정 산업 분야에서 고용계약을 바탕으로 활동하는 재류자격입니다. 해외에서 새로 입국하는 경우, 후보자의 준비뿐 아니라 수용기관의 서류와 입국 후 지원 준비가 동시에 필요합니다.",
        paragraphs: ["네팔 국적 지원자를 채용할 때도 일본의 재류 절차와 송출국에서 요구하는 절차를 각각 확인해야 합니다. 어느 한 단계가 준비되지 않으면 채용 일정 전체가 지연될 수 있습니다."],
      },
      {
        heading: "1. 수용할 분야와 실제 업무를 먼저 확정합니다",
        paragraphs: ["특정기능은 분야별로 수행할 수 있는 업무와 제출 서류가 정해져 있습니다. 채용 공고를 내기 전 현장의 업무가 어느 분야의 기준에 맞는지, 직접고용 여부와 근무 조건이 적합한지부터 확인하세요. 직무 범위가 불명확하면 계약과 재류 신청 서류의 정합성을 맞추기 어렵습니다."],
      },
      {
        heading: "2. 후보자의 시험·경력 준비 상태를 분야 기준으로 확인합니다",
        paragraphs: ["특정기능 1호는 분야에 따라 일본어와 기능 관련 요건을 확인합니다. 다만 면제·대체 가능 여부와 세부 시험은 후보자의 이력과 분야에 따라 달라질 수 있으므로, 모집 단계에서 ‘어떤 시험 또는 증빙으로 확인할지’를 분명히 해야 합니다."],
      },
      {
        heading: "3. 고용계약과 지원계획을 입국 전에 설명합니다",
        paragraphs: ["수용기관은 고용 조건을 명확히 하고, 1호 특정기능 외국인을 위한 지원을 직접 수행하거나 등록지원기관에 위탁하는 구조를 준비해야 합니다. 임금, 업무, 주거·생활 지원, 상담 창구의 내용을 지원자가 이해할 수 있는 언어로 설명하고 확인 기록을 남기는 것이 중요합니다."],
      },
      {
        heading: "4. 재류자격인정증명서 절차에 필요한 서류를 분리 관리합니다",
        paragraphs: ["해외에서 새로 입국하려는 경우 재류자격인정증명서 교부 신청이 핵심 단계입니다. 일본 출입국재류관리청은 신청인, 소속기관, 분야별로 필요한 서류 목록을 나누어 안내합니다. 후보자 서류와 기업·지원기관 서류의 담당자를 분명히 하고, 누락 여부를 별도 표로 관리하세요."],
      },
      {
        heading: "5. 송출국 절차와 일본의 재류 절차를 한 일정표에 묶습니다",
        paragraphs: ["비자 발급·입국 과정과 송출국의 해외취업 관련 절차는 동일한 일이 아닙니다. 네팔 관련 양국 협력각서와 송출 절차의 최신 안내를 확인하고, 고용기관·송출기관·지원기관이 어느 서류를 언제 처리하는지 일정표로 공유하세요."],
      },
      {
        heading: "6. 입국 후 지원과 신고까지 채용 범위로 봅니다",
        paragraphs: ["입국 후에는 거주지, 생활 안내, 상담, 근무 적응과 관련된 지원이 이어집니다. 소속기관이나 등록지원기관의 신고·지원 관련 의무도 발생할 수 있으므로, 담당자·언어 지원·정기 확인 방법을 채용 전부터 정해 두는 편이 안전합니다."],
      },
      {
        heading: "제도는 수시로 바뀔 수 있습니다",
        paragraphs: ["특정기능의 분야별 기준, 양식, 신청·신고 방식은 개정될 수 있습니다. 이 글은 채용 준비의 순서를 설명하는 자료이며, 실제 계약·신청 전에는 일본 출입국재류관리청의 최신 분야별 안내와 송출국 관련 절차를 반드시 확인해야 합니다."],
      },
    ],
    sources: [
      { label: "일본 출입국재류관리청 — 특정기능 제도", href: "https://www.moj.go.jp/isa/applications/ssw/index.html", description: "특정기능 제도, 분야별 안내와 국가별 절차를 확인하는 공식 페이지입니다." },
      { label: "일본 출입국재류관리청 — 특정기능 재류자격 신청", href: "https://www.moj.go.jp/isa/applications/status/specifiedskilledworker.html", description: "신규 입국을 위한 재류자격인정증명서와 소속기관·분야별 필요 서류를 확인합니다." },
      { label: "일본 출입국재류관리청 — 특정기능 신청·신고 양식", href: "https://www.moj.go.jp/isa/policies/ssw/10_00020.html", description: "고용계약, 지원계획, 신고 관련 최신 양식을 확인합니다." },
    ],
    relatedLinks: [
      { label: "일본 특정기능 1호 안내", href: "/visa/tokutei-ginou", description: "제도 개요와 기본 요건을 확인합니다." },
      { label: "개호 분야 특정기능", href: "/visa/tokutei-ginou-kaigo", description: "개호 분야의 준비 항목을 확인합니다." },
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

export function getBlogPostUrl(slug: string): string {
  return SITE_URL + "/blog/" + slug;
}

export const BLOG_AUTHOR = {
  "@type": "Organization",
  name: SITE.nameKo,
  url: SITE_URL,
} as const;
