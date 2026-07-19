import { LP_V1_COPY } from "./lp-v1-copy";

export const BUSINESS_AREA_SLUGS = [
  "japan-caregiver",
  "japan-hospitality",
  "korea-study",
  "korea-welding",
] as const;

export const BUSINESS_AREA_LOCALES = ["ko", "ja"] as const;

export type BusinessAreaSlug = (typeof BUSINESS_AREA_SLUGS)[number];
export type BusinessAreaLocale = (typeof BUSINESS_AREA_LOCALES)[number];
export type BusinessAreaMarket = "japan" | "korea";
export type BusinessAreaSector = "caregiver" | "hospitality" | "study" | "welding";
export type BusinessAreaTheme = "cobalt" | "clay" | "ink";
export type BusinessAreaStageStatus = "verified" | "in-development" | "case-review";
export type BusinessAreaImageKind = "field-record" | "illustrative";

export type BusinessAreaImage = Readonly<{
  src: `/${string}`;
  alt: string;
  caption: string;
  width: number;
  height: number;
  objectPosition: `${number}% ${number}%`;
  kind: BusinessAreaImageKind;
}>;

export type BusinessAreaStage = Readonly<{
  title: string;
  description: string;
  status: BusinessAreaStageStatus;
  points: readonly string[];
}>;

export type BusinessAreaUiCopy = Readonly<{
  businessAreasLabel: string;
  routeAriaLabel: string;
  originLabel: string;
  destinationLabel: string;
  modelLabel: string;
  audienceEyebrow: string;
  frameworkEyebrow: string;
  frameworkLegendLabel: string;
  evidenceEyebrow: string;
  checkpointsEyebrow: string;
  noticeLabel: string;
  relatedEyebrow: string;
  detailsLabel: string;
  emailLabel: string;
  status: Readonly<Record<BusinessAreaStageStatus, Readonly<{ label: string; description: string }>>>;
  imageKind: Readonly<Record<BusinessAreaImageKind, string>>;
}>;

export type BusinessArea = Readonly<{
  slug: BusinessAreaSlug;
  locale: BusinessAreaLocale;
  href: `/services/${BusinessAreaSlug}`;
  market: BusinessAreaMarket;
  sector: BusinessAreaSector;
  theme: BusinessAreaTheme;
  route: Readonly<{
    originCode: "NP";
    originName: string;
    destinationCode: "JP" | "KR";
    destinationName: string;
    model: string;
  }>;
  meta: Readonly<{
    title: string;
    description: string;
  }>;
  hero: Readonly<{
    eyebrow: string;
    title: string;
    lead: string;
    summary: string;
  }>;
  audience: Readonly<{
    label: string;
    items: readonly string[];
  }>;
  proposition: Readonly<{
    label: string;
    title: string;
    body: string;
  }>;
  framework: Readonly<{
    title: string;
    description: string;
  }>;
  stages: readonly BusinessAreaStage[];
  evidence: Readonly<{
    label: string;
    title: string;
    description: string;
    images: readonly BusinessAreaImage[];
  }>;
  checkpoints: Readonly<{
    title: string;
    description: string;
    items: readonly string[];
  }>;
  notice: Readonly<{
    title: string;
    body: string;
  }>;
  cta: Readonly<{
    eyebrow: string;
    title: string;
    description: string;
    label: string;
    subject: string;
  }>;
  relatedLabel: string;
  schema: Readonly<{
    serviceType: string;
    areaServed: "Japan" | "South Korea";
    audienceType: readonly string[];
  }>;
  ui: BusinessAreaUiCopy;
}>;

type BusinessAreaDefinition = Omit<BusinessArea, "locale" | "ui">;

const UI_COPY: Readonly<Record<BusinessAreaLocale, BusinessAreaUiCopy>> = {
  ko: {
    businessAreasLabel: "사업영역",
    routeAriaLabel: "인재 육성 및 협력 경로",
    originLabel: "출발",
    destinationLabel: "목적 시장",
    modelLabel: "협력 모델",
    audienceEyebrow: "PARTNER FIT",
    frameworkEyebrow: "DELIVERY FRAMEWORK",
    frameworkLegendLabel: "표시 기준",
    evidenceEyebrow: "EVIDENCE & SCOPE",
    checkpointsEyebrow: "PARTNER CHECKPOINTS",
    noticeLabel: "범위 안내",
    relatedEyebrow: "OTHER BUSINESS AREAS",
    detailsLabel: "사업영역 보기",
    emailLabel: "이메일로 협력 문의",
    status: {
      verified: {
        label: "확인된 사실",
        description: "공개 자료 또는 현장 기록으로 확인된 내용",
      },
      "in-development": {
        label: "협력안·구축 중",
        description: "파트너와 범위와 실행 기준을 확정할 내용",
      },
      "case-review": {
        label: "개별 검토",
        description: "기관·후보자·법적 요건에 따라 별도 확인할 내용",
      },
    },
    imageKind: {
      "field-record": "현장 기록",
      illustrative: "개념 이미지",
    },
  },
  ja: {
    businessAreasLabel: "事業領域",
    routeAriaLabel: "人材育成・連携ルート",
    originLabel: "出発地",
    destinationLabel: "対象市場",
    modelLabel: "連携モデル",
    audienceEyebrow: "PARTNER FIT",
    frameworkEyebrow: "DELIVERY FRAMEWORK",
    frameworkLegendLabel: "表示区分",
    evidenceEyebrow: "EVIDENCE & SCOPE",
    checkpointsEyebrow: "PARTNER CHECKPOINTS",
    noticeLabel: "対応範囲",
    relatedEyebrow: "OTHER BUSINESS AREAS",
    detailsLabel: "事業領域を見る",
    emailLabel: "メールで連携を相談",
    status: {
      verified: {
        label: "確認済みの事実",
        description: "公開資料または現場記録で確認できる内容",
      },
      "in-development": {
        label: "連携内容を検討中",
        description: "パートナーと対応範囲・実施基準を決める項目",
      },
      "case-review": {
        label: "個別確認",
        description: "機関・候補者・法的要件ごとに確認する内容",
      },
    },
    imageKind: {
      "field-record": "現場記録",
      illustrative: "イメージ画像",
    },
  },
};

const BUSINESS_AREA_REGISTRY = {
  "japan-caregiver": {
    ko: {
      slug: "japan-caregiver",
      href: "/services/japan-caregiver",
      market: "japan",
      sector: "caregiver",
      theme: "cobalt",
      route: {
        originCode: "NP",
        originName: "네팔",
        destinationCode: "JP",
        destinationName: "일본",
        model: "개호 인재 양성·채용 연계",
      },
      meta: {
        title: "일본 개호 인재 양성·채용 연계",
        description:
          "KTS Caregiver / Aged Care 훈련을 먼저 살펴보고 일본 개호사업자·지원 파트너와 선발·채용 준비·초기 정착에 필요한 기준을 함께 세웁니다.",
      },
      hero: {
        eyebrow: "일본 · 개호 인재 양성/채용 연계",
        title: LP_V1_COPY.ko.hero.titleLines.join(" "),
        lead:
          "Kathmandu Technical School의 Caregiver / Aged Care 직업훈련을 먼저 살펴본 뒤 일본 개호사업자와 지원 파트너가 필요로 하는 인재 기준과 인계 절차를 함께 정합니다.",
        summary: LP_V1_COPY.ko.hero.description,
      },
      audience: {
        label: "주요 협력 대상",
        items: ["일본 개호사업자", "채용·지원기관", "인재육성 협력기관"],
      },
      proposition: {
        label: "교육과 채용 사이의 인계 기준",
        title: "교육 현장을 공개하고 일본 채용 요건을 현지 준비에 반영합니다",
        body:
          "교육 수료만으로 채용 적합성을 단정하지 않습니다. 파트너가 요구하는 역할과 의사소통 수준, 실무에서 살필 항목을 먼저 정리하고 네팔 현지 교육·선발 단계에 필요한 자료와 책임 범위를 합의합니다.",
      },
      framework: {
        title: "훈련부터 정착까지 단계별 담당을 정합니다",
        description:
          "아래 경로는 현재 자료로 뒷받침되는 사실과 실제 협력 시 파트너·후보자별로 확정할 항목을 구분해 보여줍니다.",
      },
      stages: [
        {
          title: "KTS 돌봄 직업훈련",
          description: "Kathmandu Technical School이 공개한 Caregiver / Aged Care 과정과 현장 자료를 살펴봅니다.",
          status: "verified",
          points: ["3개월·총 390시간 과정", "10개 주요 과목", "필기·실기·최종 실기 및 구술 평가"],
        },
        {
          title: "파트너 기준 정렬",
          description: "일본 측 파트너가 실제 업무와 선발에 필요한 항목을 제시하고 현지 준비 범위를 함께 정합니다.",
          status: "in-development",
          points: ["직무·의사소통 기준 합의", "자료와 평가 주체 구분", "채용 일정과 인계 방식 합의"],
        },
        {
          title: "후보자 확인·채용 연결",
          description: "교육 이력을 파트너 기준과 대조합니다. 채용 결정과 법적 요건은 건별로 확인합니다.",
          status: "case-review",
          points: ["후보자별 교육 이력 확인", "면접·추가 평가 방식 협의", "고용 조건과 서류의 개별 확인"],
        },
        {
          title: "입국 전 준비·초기 정착",
          description: "채용이 확정된 경우에 한해 지원기관과 역할을 나누고 입국 전 안내와 초기 생활 지원 범위를 정합니다.",
          status: "case-review",
          points: ["비자·입국 요건 별도 확인", "지원 주체별 책임 구분", "초기 정착 지원 범위 합의"],
        },
      ],
      evidence: {
        label: "공개 자료에 담긴 교육 현장",
        title: "KTS 돌봄 실습 현장을 사진과 과정 정보로 소개합니다",
        description:
          "사진은 KTS 교육생의 병상 주변 실습과 휠체어 이동 보조 연습을 기록합니다. 과정 수료 또는 이 사진이 일본 자격, 비자, 취업이나 배치를 의미하지는 않습니다.",
        images: [
          {
            src: "/lp/v1/caregiver-practice.webp",
            alt: "Kathmandu Technical School 교육생들이 병상 주변에서 돌봄 실습을 진행하는 모습",
            caption: "KTS 병상 주변 돌봄 실습",
            width: 1600,
            height: 900,
            objectPosition: "50% 50%",
            kind: "field-record",
          },
          {
            src: "/lp/v1/caregiver-mobility.webp",
            alt: "Kathmandu Technical School 실습 공간에서 휠체어 이동 보조를 연습하는 모습",
            caption: "KTS 휠체어 이동 보조 실습",
            width: 1200,
            height: 1600,
            objectPosition: "48% 48%",
            kind: "field-record",
          },
        ],
      },
      checkpoints: {
        title: "협력 전 함께 확정할 기준",
        description: "파트너의 채용 방식에 맞춰 무엇을 검토할지 먼저 정합니다.",
        items: [
          "채용 직무와 현장 역할",
          "후보자 선발·면접·평가 주체",
          "일본어 및 추가 교육의 목표와 확인 방식",
          "고용·비자 절차에서 각 기관이 맡는 역할",
          "입국 전 안내와 초기 정착 지원 범위",
        ],
      },
      notice: {
        title: "훈련 수료와 일본 취업은 별개의 절차입니다",
        body:
          "KTS 과정 수료와 NSTB Level 1 기능시험의 응시·합격은 별도입니다. 본 사업 안내는 일본의 자격, 비자, 채용 또는 배치를 보장하지 않으며, 실제 요건은 후보자와 채용 건별로 확인해야 합니다.",
      },
      cta: {
        eyebrow: "PARTNERSHIP ENQUIRY",
        title: "교육 현장부터 살펴보세요",
        description: "기관을 방문해 과정 자료를 살펴보고, 일본 측 채용 기준을 현지에 반영하는 방안을 논의합니다.",
        label: "개호 인재 협력 문의",
        subject: "일본 개호 인재 양성·채용 협력 문의",
      },
      relatedLabel: "다른 사업영역",
      schema: {
        serviceType: "Japan caregiver workforce training and recruitment pathway design",
        areaServed: "Japan",
        audienceType: ["care service providers", "recruitment and support partners"],
      },
    },
    ja: {
      slug: "japan-caregiver",
      href: "/services/japan-caregiver",
      market: "japan",
      sector: "caregiver",
      theme: "cobalt",
      route: {
        originCode: "NP",
        originName: "ネパール",
        destinationCode: "JP",
        destinationName: "日本",
        model: "介護人材の育成・採用連携",
      },
      meta: {
        title: "日本向け介護人材の育成・採用連携",
        description:
          "KTSのCaregiver / Aged Care研修を出発点に、日本の介護事業者・支援パートナーと、選考・採用準備・初期定着に必要な基準を整えます。",
      },
      hero: {
        eyebrow: "日本 · 介護人材育成／採用連携",
        title: LP_V1_COPY.ja.hero.titleLines.join(""),
        lead:
          "Kathmandu Technical SchoolのCaregiver / Aged Care職業訓練を具体的な出発点とし、日本の介護事業者・支援パートナーが求める人材基準と引継ぎ手順を定めます。",
        summary: LP_V1_COPY.ja.hero.description,
      },
      audience: {
        label: "主な連携先",
        items: ["日本の介護事業者", "採用・支援機関", "人材育成の連携機関"],
      },
      proposition: {
        label: "研修と採用をつなぐ引継ぎ基準",
        title: "研修現場を開示し、日本の採用要件を現地準備に反映します",
        body:
          "研修修了だけで採用適性を断定しません。パートナーが求める役割やコミュニケーション水準、実務上の評価項目を決め、ネパールでの研修・選考に使う資料と担当範囲を合意します。",
      },
      framework: {
        title: "研修から定着までの担当を決めます",
        description:
          "以下のルートでは、現時点の資料で裏付けられる事実と、実際の連携時にパートナー・候補者ごとに確定する項目を分けて示します。",
      },
      stages: [
        {
          title: "KTS介護職業訓練",
          description: "Kathmandu Technical Schoolが公開するCaregiver / Aged Careコースと現場資料をご覧いただけます。",
          status: "verified",
          points: ["3か月・合計390時間", "主要10科目", "筆記試験・実技試験・最終実技評価・口頭試問"],
        },
        {
          title: "パートナー基準の整合",
          description: "日本側パートナーが実務・選考で見る項目を示し、現地での準備範囲を定めます。",
          status: "in-development",
          points: ["職務・コミュニケーション基準の合意", "提出資料と評価主体の区分", "採用日程と引継ぎ方法の合意"],
        },
        {
          title: "候補者確認・採用連携",
          description: "研修履歴をパートナー基準と照合します。採用判断と法的要件の審査は、案件ごとに行います。",
          status: "case-review",
          points: ["候補者ごとの研修履歴確認", "面接・追加評価方法の協議", "雇用条件と書類の個別確認"],
        },
        {
          title: "入国前準備・初期定着",
          description: "採用確定後に支援機関と役割を分担し、入国前案内と初期生活支援の範囲を定めます。",
          status: "case-review",
          points: ["在留資格・入国要件の個別確認", "支援主体ごとの責任区分", "初期定着支援の範囲合意"],
        },
      ],
      evidence: {
        label: "公開資料に記録された研修現場",
        title: "KTSの介護実習現場を、写真とコース情報で紹介します",
        description:
          "写真はKTS受講生によるベッド周辺の実習と車いす移動介助の練習記録です。コース修了や写真そのものが、日本の資格・在留資格・就職・配属を示すものではありません。",
        images: [
          {
            src: "/lp/v1/caregiver-practice.webp",
            alt: "Kathmandu Technical Schoolの受講生がベッド周辺で介護実習に取り組む様子",
            caption: "KTSのベッド周辺介護実習",
            width: 1600,
            height: 900,
            objectPosition: "50% 50%",
            kind: "field-record",
          },
          {
            src: "/lp/v1/caregiver-mobility.webp",
            alt: "Kathmandu Technical Schoolの実習室で車いす移動介助を練習する様子",
            caption: "KTSの車いす移動介助実習",
            width: 1200,
            height: 1600,
            objectPosition: "48% 48%",
            kind: "field-record",
          },
        ],
      },
      checkpoints: {
        title: "連携前に決める基準",
        description: "パートナーの採用方法に合わせ、確認する項目を決めます。",
        items: [
          "採用職種と現場での役割",
          "候補者の選考・面接・評価主体",
          "日本語・追加研修の目標と確認方法",
          "雇用・在留手続で各機関が担う役割",
          "入国前案内と初期定着支援の範囲",
        ],
      },
      notice: {
        title: "研修修了と日本での就職は別の手続です",
        body:
          "KTSコース修了とNSTB Level 1技能試験の受験・合格は別です。本事業案内は日本の資格、在留資格、採用、配属を保証するものではなく、実際の要件は候補者・採用案件ごとに確認する必要があります。",
      },
      cta: {
        eyebrow: "PARTNERSHIP ENQUIRY",
        title: "まず、研修現場をご覧ください",
        description: "施設訪問やコース資料の閲覧、日本側の採用基準を現地準備に反映できるかをパートナーと検討します。",
        label: "介護人材連携を相談",
        subject: "日本向け介護人材の育成・採用連携相談",
      },
      relatedLabel: "その他の事業領域",
      schema: {
        serviceType: "Japan caregiver workforce training and recruitment pathway design",
        areaServed: "Japan",
        audienceType: ["care service providers", "recruitment and support partners"],
      },
    },
  },
  "japan-hospitality": {
    ko: {
      slug: "japan-hospitality",
      href: "/services/japan-hospitality",
      market: "japan",
      sector: "hospitality",
      theme: "clay",
      route: {
        originCode: "NP",
        originName: "네팔",
        destinationCode: "JP",
        destinationName: "일본",
        model: "호스피탈리티 교육·특정기능 채용 연계",
      },
      meta: {
        title: "일본 호텔·숙박 인재 교육·채용 연계",
        description:
          "네팔의 호스피탈리티 실습 환경을 먼저 살펴보고 일본 호텔·숙박 사업자와 특정기능 채용 준비와 초기 정착에 필요한 기준을 함께 세웁니다.",
      },
      hero: {
        eyebrow: "일본 · 호스피탈리티 교육/특정기능 채용 연계",
        title: "현지 실습을 일본 숙박 현장의 기준에 반영합니다",
        lead:
          "네팔의 레스토랑 서비스·객실형 실습 환경을 먼저 살펴본 뒤 일본 호텔·숙박 사업자가 요구하는 역할과 선발 기준을 현지 교육, 채용 준비, 초기 정착에 반영합니다.",
        summary: "네팔 호스피탈리티 실습에 일본 숙박사업자의 특정기능 채용 기준을 반영하고 초기 정착까지 준비합니다.",
      },
      audience: {
        label: "주요 협력 대상",
        items: ["일본 호텔·료칸 사업자", "특정기능 채용 지원 파트너", "호스피탈리티 교육기관"],
      },
      proposition: {
        label: "시설 사진에서 실제 채용 기준으로",
        title: "일본의 채용 기준을 현지 교육과 선발에 반영합니다",
        body:
          "현재 공개 자료에는 실습 공간이 담겨 있지만 과정 시간, 자격, 일본 취업 실적은 단정할 수 없습니다. 협력 시에는 채용 직무와 서비스 기준을 먼저 문서화하고 교육·평가·인계 단계에 반영합니다.",
      },
      framework: {
        title: "교육 현장부터 특정기능 채용·정착 준비까지",
        description:
          "교육 현장이 있다는 사실만으로 일본 취업 자격까지 입증되지는 않습니다. 사진으로 확인한 교육 환경과 협력 때 개별적으로 검토할 항목을 나눠 안내합니다.",
      },
      stages: [
        {
          title: "호스피탈리티 실습 환경",
          description: "공개된 현장 사진에는 레스토랑 서비스 실습실과 객실형 스킬랩이 담겨 있습니다.",
          status: "verified",
          points: ["서비스 실습용 테이블·바 설비", "객실 정돈 실습 공간", "사진에 담긴 네팔 현지 교육환경"],
        },
        {
          title: "숙박사업자 기준 반영",
          description: "일본 파트너가 채용 직무와 서비스 기준을 정하고, 현지 교육·선발에 반영할 항목을 함께 구체화합니다.",
          status: "in-development",
          points: ["담당 직무와 업무 범위 확정", "언어·서비스 평가 방식 협의", "면접·추가 교육 기준 마련"],
        },
        {
          title: "특정기능 채용 준비",
          description: "후보자의 시험, 고용, 재류 관련 요건과 서류는 최신 기준에 따라 건별로 검토합니다.",
          status: "case-review",
          points: ["후보자별 자격 요건 확인", "고용 조건과 채용 주체 확인", "신청 서류와 일정의 개별 검토"],
        },
        {
          title: "입국·초기 정착 지원",
          description: "채용 확정 이후 숙박사업자와 지원 파트너의 역할을 구분해 초기 생활 지원과 현장 인계 범위를 정합니다.",
          status: "case-review",
          points: ["입국 전 안내 주체 확정", "현장 배치 전 인계 방식 합의", "초기 생활지원 범위 확인"],
        },
      ],
      evidence: {
        label: "사진에 담긴 교육환경",
        title: "레스토랑 서비스와 객실형 실습 공간을 공개합니다",
        description:
          "아래 사진은 네팔 현지 호스피탈리티 교육시설 방문 기록입니다. 교육과정의 공식 명칭·시간·자격이나 일본 채용 실적을 입증하는 자료로 사용하지 않습니다.",
        images: [
          {
            src: "/gallery/hospitality-training-restaurant-lab.webp",
            alt: "테이블 세팅과 바 설비가 갖춰진 네팔 현지 호스피탈리티 실습실에서 수업하는 모습",
            caption: "레스토랑 서비스 실습 공간",
            width: 2200,
            height: 1650,
            objectPosition: "50% 50%",
            kind: "field-record",
          },
          {
            src: "/gallery/training-room-interior.webp",
            alt: "침대와 객실 설비가 갖춰진 네팔 현지 호스피탈리티 객실형 실습 공간",
            caption: "객실형 스킬랩 방문 기록",
            width: 1650,
            height: 2200,
            objectPosition: "50% 54%",
            kind: "field-record",
          },
        ],
      },
      checkpoints: {
        title: "채용 파트너와 먼저 정할 항목",
        description: "일본 숙박 현장의 역할과 지원 방식이 정해져야 현지 준비의 목표도 구체화됩니다.",
        items: [
          "채용 직무와 교대·업무 범위",
          "언어·서비스 역량 확인 방식",
          "특정기능 관련 시험·재류요건의 확인 주체",
          "고용조건과 현장 배치 전 교육",
          "입국 전 안내와 초기 정착 지원의 담당 기관",
        ],
      },
      notice: {
        title: "사진은 교육환경 기록이며 취업 성과가 아닙니다",
        body:
          "특정기능 재류자격, 시험, 고용계약, 지원계획 등은 후보자와 채용 건별로 최신 요건을 확인해야 합니다. 본 안내는 자격 취득, 비자 발급, 채용 또는 배치를 보장하지 않습니다.",
      },
      cta: {
        eyebrow: "PARTNERSHIP ENQUIRY",
        title: "귀사의 현장 기준을 네팔 교육 단계부터 논의하세요",
        description: "채용 직무, 후보자 평가 방식, 특정기능 절차와 초기 정착의 역할 분담을 함께 논의합니다.",
        label: "호텔 인재 협력 문의",
        subject: "일본 호텔·숙박 인재 교육·채용 협력 문의",
      },
      relatedLabel: "다른 사업영역",
      schema: {
        serviceType: "Japan hospitality workforce training and recruitment pathway design",
        areaServed: "Japan",
        audienceType: ["hotel and accommodation operators", "recruitment and support partners"],
      },
    },
    ja: {
      slug: "japan-hospitality",
      href: "/services/japan-hospitality",
      market: "japan",
      sector: "hospitality",
      theme: "clay",
      route: {
        originCode: "NP",
        originName: "ネパール",
        destinationCode: "JP",
        destinationName: "日本",
        model: "ホスピタリティ研修・特定技能採用連携",
      },
      meta: {
        title: "日本向けホテル・宿泊人材の研修・採用連携",
        description:
          "ネパールのホスピタリティ実習環境を出発点に、日本のホテル・宿泊事業者と特定技能の採用準備・初期定着に必要な基準を整えます。",
      },
      hero: {
        eyebrow: "日本 · ホスピタリティ研修／特定技能採用連携",
        title: "実習室から、日本の宿泊現場の基準へつなぎます",
        lead:
          "ネパールのレストランサービス・客室型実習環境を公開し、日本のホテル・宿泊事業者が求める役割と選考基準を、現地研修・採用準備・初期定着に反映します。",
        summary: "ネパールのホスピタリティ実習を、日本の宿泊事業者による特定技能採用準備と初期定着へつなぎます。",
      },
      audience: {
        label: "主な連携先",
        items: ["日本のホテル・旅館事業者", "特定技能採用の支援パートナー", "ホスピタリティ教育機関"],
      },
      proposition: {
        label: "施設写真から、実際の採用基準へ",
        title: "日本の採用基準を、現地研修と選考に反映します",
        body:
          "現在の公開資料から実習空間の様子は分かりますが、コース時間、資格、日本での採用実績は断定できません。連携時には採用職種とサービス基準を文書化し、研修・評価・引継ぎに反映します。",
      },
      framework: {
        title: "研修環境から特定技能採用・定着準備まで",
        description:
          "教育現場があるだけで、日本で就労できる資格まで証明されるわけではありません。写真で分かる研修環境と、連携時に個別に検討する項目を分けて示します。",
      },
      stages: [
        {
          title: "ホスピタリティ実習環境",
          description: "公開された現場写真には、レストランサービス実習室と客室型スキルラボが写っています。",
          status: "verified",
          points: ["サービス実習用のテーブル・バー設備", "客室整備を練習できる空間", "写真に写るネパールの教育環境"],
        },
        {
          title: "宿泊事業者基準の反映",
          description: "日本側パートナーが採用職種とサービス基準を定め、現地研修・選考に反映する項目を具体化します。",
          status: "in-development",
          points: ["担当職種と業務範囲の確定", "言語・サービス評価方法の協議", "面接・追加研修基準の策定"],
        },
        {
          title: "特定技能の採用準備",
          description: "候補者の試験、雇用、在留に関する要件と書類は、最新基準に沿って案件ごとに確認します。",
          status: "case-review",
          points: ["候補者ごとの要件確認", "雇用条件と採用主体の確認", "申請書類と日程の個別確認"],
        },
        {
          title: "入国・初期定着支援",
          description: "採用確定後、宿泊事業者と支援パートナーの役割を分け、初期生活・現場引継ぎの範囲を定めます。",
          status: "case-review",
          points: ["入国前案内の主体確定", "配属前の引継ぎ方法の合意", "初期生活支援の範囲確認"],
        },
      ],
      evidence: {
        label: "写真で見る教育環境",
        title: "レストランサービスと客室型の実習空間を公開します",
        description:
          "以下はネパールのホスピタリティ教育施設を訪問した際の記録です。コースの正式名称・時間・資格、日本での採用実績を証明する資料としては使用していません。",
        images: [
          {
            src: "/gallery/hospitality-training-restaurant-lab.webp",
            alt: "テーブルセッティングとバー設備を備えたネパールのホスピタリティ実習室で授業を行う様子",
            caption: "レストランサービス実習空間",
            width: 2200,
            height: 1650,
            objectPosition: "50% 50%",
            kind: "field-record",
          },
          {
            src: "/gallery/training-room-interior.webp",
            alt: "ベッドと客室設備を備えたネパールのホスピタリティ客室型実習空間",
            caption: "客室型スキルラボの訪問記録",
            width: 1650,
            height: 2200,
            objectPosition: "50% 54%",
            kind: "field-record",
          },
        ],
      },
      checkpoints: {
        title: "採用パートナーと先に決める項目",
        description: "日本の宿泊現場での役割と支援体制を定め、それに合わせて現地での準備項目を決めます。",
        items: [
          "採用職種とシフト・業務範囲",
          "言語・サービス能力の確認方法",
          "特定技能の試験・在留要件を確認する主体",
          "雇用条件と配属前研修",
          "入国前案内と初期定着支援の担当機関",
        ],
      },
      notice: {
        title: "写真は教育環境の記録であり、就職実績ではありません",
        body:
          "特定技能の在留資格、試験、雇用契約、支援計画等は、候補者・採用案件ごとに最新要件を確認する必要があります。本案内は資格取得、在留資格の許可、採用、配属を保証するものではありません。",
      },
      cta: {
        eyebrow: "PARTNERSHIP ENQUIRY",
        title: "貴社の職務・選考基準をお聞かせください",
        description: "採用職種、候補者の評価方法、特定技能手続と初期定着の役割分担を検討します。",
        label: "ホテル人材連携を相談",
        subject: "日本向けホテル・宿泊人材の研修・採用連携相談",
      },
      relatedLabel: "その他の事業領域",
      schema: {
        serviceType: "Japan hospitality workforce training and recruitment pathway design",
        areaServed: "Japan",
        audienceType: ["hotel and accommodation operators", "recruitment and support partners"],
      },
    },
  },
  "korea-study": {
    ko: {
      slug: "korea-study",
      href: "/services/korea-study",
      market: "korea",
      sector: "study",
      theme: "cobalt",
      route: {
        originCode: "NP",
        originName: "네팔",
        destinationCode: "KR",
        destinationName: "한국",
        model: "유학생 모집·선발·입학·초기정착 협력",
      },
      meta: {
        title: "한국 대학·어학당 네팔 유학생 모집 협력",
        description:
          "한국 대학·어학당과 협력해 네팔 학생 모집, 서류 검토, 입학·비자 안내, 입국 초기 정착의 역할을 단계별로 나눕니다.",
      },
      hero: {
        eyebrow: "한국 · 대학/어학당 네팔 학생 유치 협력",
        title: "네팔 현지 모집부터 한국 입학 후 첫 정착까지",
        lead:
          "한국 대학과 어학당이 정한 입학 기준을 네팔 현지 안내·모집 단계에 정확히 전달하고 후보자 검토, 원서 준비, 비자 안내, 입국 초기 지원의 역할과 책임을 함께 정합니다.",
        summary: "한국 대학·어학당의 기준에 맞춰 네팔 학생 모집부터 입학·비자 안내와 초기 정착까지 지원합니다.",
      },
      audience: {
        label: "주요 협력 대상",
        items: ["한국 대학 국제처", "대학 부설 어학당", "유학생 지원 협력기관"],
      },
      proposition: {
        label: "학교 기준에 맞춘 현지 모집",
        title: "대학·어학당의 지원 기준을 네팔 현지 안내와 서류 검토에 그대로 반영합니다",
        body:
          "입학 허가와 비자 심사를 대신 약속하지 않습니다. 학교가 정한 지원 자격, 제출 서류, 일정과 학생 안내 기준을 먼저 문서화하고 네팔 현지 모집·서류 검토에도 같은 기준을 적용합니다.",
      },
      framework: {
        title: "현지 접점부터 입국 초기 지원까지 역할을 분리합니다",
        description:
          "교육기관과의 대화 기록은 협력의 접점을 보여주지만 한국 대학과의 공식 계약이나 입학 성과를 의미하지 않습니다. 실제 운영 항목은 대학·과정별로 확정합니다.",
      },
      stages: [
        {
          title: "네팔 교육기관과의 접점",
          description: "네팔 현지 교육기관 및 관계자와의 방문·대화 기록을 공개하며, 실제 모집 파트너는 협력 전에 별도로 확인합니다.",
          status: "verified",
          points: ["교육기관 방문 기록", "관계자 회의·설명 기록", "공식 계약 여부는 별도 확인"],
        },
        {
          title: "모집 기준·안내 마련",
          description: "한국 대학·어학당이 지원 대상, 일정, 안내 문구와 현지 모집 방식의 기준을 정합니다.",
          status: "in-development",
          points: ["학교별 지원 기준 반영", "현지 안내 자료 사전 검토", "상담·개인정보 처리 역할 협의"],
        },
        {
          title: "후보자·지원서류 확인",
          description: "지원자의 학력과 제출 자료를 학교 기준에 따라 확인하되, 최종 입학 결정은 해당 교육기관이 담당합니다.",
          status: "case-review",
          points: ["후보자별 기본 요건 확인", "서류 목록과 번역·인증 요구 확인", "학교의 최종 심사와 분리"],
        },
        {
          title: "입학·비자 안내·초기 정착",
          description: "입학 허가 이후 비자 신청 안내와 입국 전 준비, 초기 생활지원의 담당 주체를 학생별로 확인합니다.",
          status: "case-review",
          points: ["입학·비자 절차는 개별 안내", "입국 일정과 학교 인계 확인", "초기 정착 지원 범위 합의"],
        },
      ],
      evidence: {
        label: "현지 접점을 보여주는 기록",
        title: "교육기관 방문과 관계자 대화 장면을 공개합니다",
        description:
          "사진은 네팔 현지 기관 방문과 회의 장면입니다. 특정 한국 대학과의 공식 협약, 학생 선발, 입학 또는 비자 발급 실적으로 해석해서는 안 됩니다.",
        images: [
          {
            src: "/gallery/campus-partnership-meeting.webp",
            alt: "네팔 현지 교육기관 회의 공간에서 관계자들이 대화하는 모습",
            caption: "네팔 현지 교육기관 관계자 대화 기록",
            width: 2200,
            height: 1650,
            objectPosition: "50% 48%",
            kind: "field-record",
          },
          {
            src: "/gallery/stakeholder-meeting-presentation.webp",
            alt: "네팔 현지 회의실에서 방문자와 관계자들이 화면 자료를 함께 살펴보는 모습",
            caption: "현지 관계자 설명·회의 기록",
            width: 1440,
            height: 1080,
            objectPosition: "50% 50%",
            kind: "field-record",
          },
        ],
      },
      checkpoints: {
        title: "대학·어학당과 먼저 확정할 운영 기준",
        description: "학교의 공식 기준과 현지 실행 책임을 문서로 맞춘 뒤 모집을 시작합니다.",
        items: [
          "대상 과정과 지원 자격·모집 일정",
          "공식 안내 자료와 상담 범위",
          "지원서류 확인·번역·인증 요구",
          "입학 심사와 결과 통지의 담당 주체",
          "비자 안내, 입국 인계, 초기 정착 지원 범위",
        ],
      },
      notice: {
        title: "입학과 비자는 교육기관·관계기관의 심사를 따릅니다",
        body:
          "정우인재개발원은 대학 또는 정부기관을 대신해 입학 허가나 비자 발급을 보장하지 않습니다. 모집 대상, 제출 서류, 비용, 일정과 지원 범위는 협력 대학·어학당과 학생별로 확인해야 합니다.",
      },
      cta: {
        eyebrow: "INSTITUTIONAL PARTNERSHIP",
        title: "귀교의 입학 기준을 네팔 현지 모집에 반영합니다",
        description: "모집 대상, 후보자 검토, 입학 절차와 입국 초기 지원의 역할 분담을 기관 단위로 논의합니다.",
        label: "유학생 모집 협력 문의",
        subject: "한국 대학·어학당 네팔 유학생 모집 협력 문의",
      },
      relatedLabel: "다른 사업영역",
      schema: {
        serviceType: "Nepal student recruitment and admissions support pathway design for Korean education providers",
        areaServed: "South Korea",
        audienceType: ["universities", "university language institutes"],
      },
    },
    ja: {
      slug: "korea-study",
      href: "/services/korea-study",
      market: "korea",
      sector: "study",
      theme: "cobalt",
      route: {
        originCode: "NP",
        originName: "ネパール",
        destinationCode: "KR",
        destinationName: "韓国",
        model: "留学生募集・選考・入学・初期定着連携",
      },
      meta: {
        title: "韓国の大学・語学堂向けネパール人留学生募集連携",
        description:
          "韓国の大学・語学堂向けに、ネパールでの学生募集、書類照合、入学・査証案内、入国後の初期定着の各段階の担当を示します。",
      },
      hero: {
        eyebrow: "韓国 · 大学／語学堂のネパール人学生募集連携",
        title: "ネパールでの募集から、韓国入学後の第一歩まで",
        lead:
          "韓国の大学・語学堂が定める入学基準をネパールでの案内・募集に正確に反映し、候補者情報の照合、出願準備、査証案内、入国初期支援の役割分担を定めます。",
        summary: "韓国の大学・語学堂の基準に合わせ、ネパールでの募集から入学・査証案内、初期定着までをつなぎます。",
      },
      audience: {
        label: "主な連携先",
        items: ["韓国大学の国際部門", "大学付属の語学堂", "留学生支援の連携機関"],
      },
      proposition: {
        label: "学校基準に沿った現地募集",
        title: "大学・語学堂の出願基準を、ネパールでの案内と書類照合にそのまま反映します",
        body:
          "入学許可や査証審査を代わりに約束しません。学校が定める出願資格、提出書類、日程、学生案内の基準を文書化し、ネパールでの募集・書類照合にも同じ基準を適用します。",
      },
      framework: {
        title: "現地での募集から入国直後の支援まで、担当を分けます",
        description:
          "教育機関との対話記録は連携の接点を示すもので、韓国の大学との正式契約や入学実績を意味しません。実際の運営項目は大学・コースごとに確定します。",
      },
      stages: [
        {
          title: "ネパールの教育機関との接点",
          description: "現地教育機関・関係者への訪問と対話の記録を公開し、実際の募集パートナーは連携前に別途確認します。",
          status: "verified",
          points: ["教育機関の訪問記録", "関係者との会議・説明記録", "正式契約の有無は別途確認"],
        },
        {
          title: "募集基準・案内の策定",
          description: "韓国の大学・語学堂が対象、日程、案内文、現地募集方法の基準を定めます。",
          status: "in-development",
          points: ["学校別の出願基準を反映", "現地案内資料の事前点検", "相談・個人情報取扱いの役割協議"],
        },
        {
          title: "候補者・出願書類の確認",
          description: "学歴・提出資料を学校基準に沿って確認し、最終的な入学判断は各教育機関が行います。",
          status: "case-review",
          points: ["候補者ごとの基本要件確認", "書類一覧と翻訳・認証要件の確認", "最終審査は学校が担当"],
        },
        {
          title: "入学・査証案内・初期定着",
          description: "入学許可後、査証申請の案内、渡航前準備、初期生活支援の担当主体を学生ごとに確認します。",
          status: "case-review",
          points: ["入学・査証手続を個別案内", "入国日程と学校への引継ぎ確認", "初期定着支援の範囲合意"],
        },
      ],
      evidence: {
        label: "現地機関との訪問・会議記録",
        title: "教育機関への訪問と関係者との対話場面を公開します",
        description:
          "写真はネパールの現地機関を訪問し、会議を行った記録です。特定の韓国大学との正式協定、学生選考、入学、査証発給の実績を示すものではありません。",
        images: [
          {
            src: "/gallery/campus-partnership-meeting.webp",
            alt: "ネパールの教育機関の会議スペースで関係者が対話する様子",
            caption: "ネパールの教育機関関係者との対話記録",
            width: 2200,
            height: 1650,
            objectPosition: "50% 48%",
            kind: "field-record",
          },
          {
            src: "/gallery/stakeholder-meeting-presentation.webp",
            alt: "ネパールの会議室で訪問者と関係者が画面資料を確認する様子",
            caption: "現地関係者による説明・会議記録",
            width: 1440,
            height: 1080,
            objectPosition: "50% 50%",
            kind: "field-record",
          },
        ],
      },
      checkpoints: {
        title: "大学・語学堂と先に確定する運営基準",
        description: "学校の公式基準と現地での実行責任を書面で合わせてから募集を開始します。",
        items: [
          "対象コースと出願資格・募集日程",
          "公式案内資料と相談対応の範囲",
          "出願書類の確認・翻訳・認証要件",
          "入学審査と結果通知の担当主体",
          "査証案内、入国引継ぎ、初期定着支援の範囲",
        ],
      },
      notice: {
        title: "入学・査証は教育機関・関係当局の審査に従います",
        body:
          "JOONG WOO HRDは、大学や政府機関に代わって入学許可・査証発給を保証しません。募集対象、提出書類、費用、日程、支援範囲は、連携大学・語学堂および学生ごとに確認する必要があります。",
      },
      cta: {
        eyebrow: "INSTITUTIONAL PARTNERSHIP",
        title: "貴校の入学基準をネパールでの募集に反映します",
        description: "募集対象、候補者情報の照合、入学手続、入国初期支援の役割分担を機関単位で協議します。",
        label: "留学生募集連携を相談",
        subject: "韓国の大学・語学堂向けネパール人留学生募集連携相談",
      },
      relatedLabel: "その他の事業領域",
      schema: {
        serviceType: "Nepal student recruitment and admissions support pathway design for Korean education providers",
        areaServed: "South Korea",
        audienceType: ["universities", "university language institutes"],
      },
    },
  },
  "korea-welding": {
    ko: {
      slug: "korea-welding",
      href: "/services/korea-welding",
      market: "korea",
      sector: "welding",
      theme: "ink",
      route: {
        originCode: "NP",
        originName: "네팔",
        destinationCode: "KR",
        destinationName: "한국",
        model: "용접 훈련·기능 검증·기업 매칭",
      },
      meta: {
        title: "한국 용접 인재 훈련·기능 검증·기업 매칭",
        description:
          "네팔 용접 훈련, 기능 검증, 한국 기업 매칭, 비자 적합성 검토를 단계별로 나누고 실제 협력 전에 각 단계의 증빙과 책임을 점검합니다.",
      },
      hero: {
        eyebrow: "한국 · 용접 훈련/기능 검증/기업 매칭",
        title: "필요한 증빙 기준을 먼저 정합니다",
        lead:
          "네팔 현지 용접훈련, 기능 확인, 한국 기업 직무와의 비교, 비자 적합성 검토 순으로 준비합니다. 현재 공개된 용접 전용 실적이 없는 만큼, 협력 전에 교육기관·평가·채용·법적 요건을 단계별로 따져봅니다.",
        summary: "각 단계에서 필요한 증빙을 확인합니다.",
      },
      audience: {
        label: "주요 협력 대상",
        items: ["한국 용접 인력 채용 기업", "네팔 직업훈련기관", "기능평가·채용 협력기관"],
      },
      proposition: {
        label: "입증할 수 없는 실적은 앞세우지 않습니다",
        title: "교육기관, 평가 기준, 채용 직무, 비자 경로마다 필요한 자료를 정합니다",
        body:
          "용접이라는 직종명만으로 숙련도나 채용 가능성을 판단할 수 없습니다. 공법, 자세, 소재, 시험편, 안전, 경력 증빙 등 기업이 실제로 보는 항목을 먼저 정하고 누가 어떤 방식으로 평가할지 문서화합니다.",
      },
      framework: {
        title: "훈련 파트너부터 기업·비자 요건까지",
        description:
          "Bhairav Industrial Skills Hub와의 협력 관계를 뒷받침하는 자료는 있지만 아래 단계는 현재 배치 실적을 뜻하지 않습니다. 계약이나 모집 전에 시설, 과정, 평가자, 채용 기업과 법적 경로를 점검해야 합니다.",
      },
      stages: [
        {
          title: "네팔 훈련 파트너와의 협력",
          description: "Bhairav Industrial Skills Hub의 법인 등록과 정우인재개발원과의 2026년 7월 MOU를 확인했습니다. 실제 용접 과정과 시설은 별도 실사가 필요합니다.",
          status: "verified",
          points: ["네팔 회사등록청 법인 등록", "직업 기술 교육 협력 MOU", "과정·시설·안전 기준은 별도 실사"],
        },
        {
          title: "기능 검증 체계 마련",
          description: "한국 기업의 직무에 맞춰 평가 항목, 시험 방식, 평가 주체와 결과 기록 형식을 합의합니다.",
          status: "in-development",
          points: ["직무별 공법·자세·소재 기준", "실기평가와 경력 증빙 구분", "평가 결과의 기록·전달 방식"],
        },
        {
          title: "한국 기업 직무 매칭",
          description: "검증 자료와 기업의 실제 채용 요건을 비교하되, 면접과 채용 결정은 기업별로 진행합니다.",
          status: "case-review",
          points: ["기업별 직무 기술서 확인", "후보자 증빙과 요구 기술 비교", "고용 조건·현장 평가 개별 협의"],
        },
        {
          title: "비자 적합성 검토",
          description: "채용 직무, 후보자 이력, 기업 요건에 맞는 합법적 경로가 있는지 전문가 확인을 포함해 건별 검토합니다.",
          status: "case-review",
          points: ["특정 비자 유형을 사전 확정하지 않음", "후보자·기업별 요건 확인", "허가 결과를 보장하지 않음"],
        },
      ],
      evidence: {
        label: "현재 공개 가능한 증빙 범위",
        title: "협력 관계를 뒷받침하는 자료가 있으며, 용접 현장 자료는 확보 후 공개합니다",
        description:
          "Bhairav Industrial Skills Hub의 법인 등록과 MOU를 뒷받침하는 자료는 있지만 용접 과정명, 교육 시간, 자격, 기능 평가 또는 한국 배치 실적을 보여줄 전용 현장 자료는 아직 없습니다. 아래 이미지는 사업 흐름을 설명하기 위한 개념 이미지입니다.",
        images: [
          {
            src: "/kv/redesign/training.webp",
            alt: "산업기술 교육 구조를 설명하기 위한 기술 실습 개념 이미지",
            caption: "기술교육 개념 이미지 · 용접 현장 기록 아님",
            width: 1586,
            height: 992,
            objectPosition: "60% 50%",
            kind: "illustrative",
          },
          {
            src: "/kv/redesign/process.webp",
            alt: "기업 매칭과 비자 적합성 검토의 문서 절차를 설명하기 위한 개념 이미지",
            caption: "검토 절차 개념 이미지 · 실제 신청서류 아님",
            width: 1568,
            height: 1003,
            objectPosition: "50% 50%",
            kind: "illustrative",
          },
        ],
      },
      checkpoints: {
        title: "사업 개시 전 반드시 확보할 증빙",
        description: "모집이나 채용을 약속하기 전에 아래 자료의 발행 주체와 진위를 검증합니다.",
        items: [
          "훈련기관의 법적 지위와 실습시설·안전관리",
          "과정명·교육 시간·강사·수료 기준",
          "직무별 기능 평가 항목과 평가자",
          "한국 채용 기업의 실제 직무·고용 조건",
          "후보자·기업별 비자 가능성을 적법하게 검토한 기록",
        ],
      },
      notice: {
        title: "현재는 구축 단계이며 모집·취업 성과를 주장하지 않습니다",
        body:
          "법인 등록과 MOU 사실을 넘어 과정·자격·교육 시간·채용 기업·배치 인원 또는 비자 유형을 확정적으로 안내하지 않습니다. 기능 평가 결과도 채용이나 비자 허가를 보장하지 않습니다.",
      },
      cta: {
        eyebrow: "PARTNERSHIP DESIGN",
        title: "기업의 용접 직무 기준부터 공유해 주세요",
        description: "필요 공법과 기능 수준, 평가 방식, 채용 조건에 맞춰 네팔에서 훈련·평가 체계를 마련할 수 있는지 검토합니다.",
        label: "용접 인재 사업 협력 문의",
        subject: "한국 용접 인재 훈련·검증·채용 협력 문의",
      },
      relatedLabel: "다른 사업영역",
      schema: {
        serviceType: "Nepal welding training, skills verification and Korean employer matching pathway design",
        areaServed: "South Korea",
        audienceType: ["employers requiring welding skills", "vocational training and assessment partners"],
      },
    },
    ja: {
      slug: "korea-welding",
      href: "/services/korea-welding",
      market: "korea",
      sector: "welding",
      theme: "ink",
      route: {
        originCode: "NP",
        originName: "ネパール",
        destinationCode: "KR",
        destinationName: "韓国",
        model: "溶接訓練・技能確認・企業マッチング",
      },
      meta: {
        title: "韓国向け溶接人材の訓練・技能確認・企業マッチング",
        description:
          "ネパールの溶接研修、技能評価、韓国企業の職務基準、査証適合性を分けて示し、連携前に各段階の根拠と担当を点検します。",
      },
      hero: {
        eyebrow: "韓国 · 溶接訓練／技能確認／企業マッチング",
        title: "訓練内容、技能評価、採用要件を先に文書化します",
        lead:
          "ネパールでの溶接訓練、技能確認、韓国企業の職務基準との照合、査証適合性の検討を順に準備します。現在公開できる溶接専用実績がないため、教育機関・評価・採用・法的要件を段階ごとに点検します。",
        summary: "訓練機関、技能評価、採用職務、査証経路を順に点検します",
      },
      audience: {
        label: "主な連携先",
        items: ["韓国の溶接人材採用企業", "ネパールの職業訓練機関", "技能評価・採用の連携機関"],
      },
      proposition: {
        label: "公開できる実績と資料の範囲",
        title: "教育機関、評価基準、採用職務、査証経路ごとに必要な資料を定めます",
        body:
          "「溶接」という職種名だけでは熟練度や採用可能性を判断できません。工法、姿勢、材料、試験片、安全、経歴証明など企業が実際に見る項目を定め、誰がどの方法で確認するかを文書化します。",
      },
      framework: {
        title: "訓練パートナーから企業・査証要件まで",
        description:
          "Bhairav Industrial Skills Hubとの連携を裏付ける資料はありますが、以下は現在の配属実績を示すものではありません。契約・募集前に施設、コース、評価者、採用企業、法的経路を一つずつ点検します。",
      },
      stages: [
        {
          title: "ネパールの訓練パートナーとの連携",
          description: "Bhairav Industrial Skills Hubの法人登録と、JOONG WOO HRDとの2026年7月のMOUを確認しています。実際の溶接コースと施設は別途調査します。",
          status: "verified",
          points: ["ネパール会社登録局への法人登録", "職業技術教育に関するMOU", "コース・施設・安全基準は別途調査"],
        },
        {
          title: "技能確認体制の整備",
          description: "韓国企業の職務に合わせ、評価項目、試験方法、評価主体、結果記録の形式を合意します。",
          status: "in-development",
          points: ["職務別の工法・姿勢・材料基準", "実技評価と経歴証明の区分", "評価結果の記録・伝達方法"],
        },
        {
          title: "韓国企業の職務とのマッチング",
          description: "確認資料と企業の採用要件を比較し、面接・採用判断は企業ごとに行います。",
          status: "case-review",
          points: ["企業別の職務記述確認", "候補者資料と必要技能の比較", "雇用条件・現場評価の個別協議"],
        },
        {
          title: "査証適合性の確認",
          description: "採用職務、候補者経歴、企業要件に合う適法な経路があるか、専門家確認を含め案件ごとに検討します。",
          status: "case-review",
          points: ["特定の査証区分を事前確定しない", "候補者・企業ごとの要件確認", "許可結果を保証しない"],
        },
      ],
      evidence: {
        label: "現在公開できる根拠の範囲",
        title: "連携を裏付ける資料はあり、溶接現場資料は入手後に掲載します",
        description:
          "Bhairav Industrial Skills Hubの法人登録とMOUを裏付ける資料はありますが、溶接コース名、訓練時間、資格、技能評価、韓国への配属実績を示す専用現場資料はまだありません。以下は事業の流れを説明するイメージです。",
        images: [
          {
            src: "/kv/redesign/training.webp",
            alt: "産業技術教育の仕組みを説明するための技術実習イメージ画像",
            caption: "技術教育イメージ · 溶接現場の記録ではありません",
            width: 1586,
            height: 992,
            objectPosition: "60% 50%",
            kind: "illustrative",
          },
          {
            src: "/kv/redesign/process.webp",
            alt: "企業マッチングと査証適合性確認の書類手続を説明するためのイメージ画像",
            caption: "確認手続のイメージ · 実際の申請書類ではありません",
            width: 1568,
            height: 1003,
            objectPosition: "50% 50%",
            kind: "illustrative",
          },
        ],
      },
      checkpoints: {
        title: "事業開始前に必ず確保する根拠",
        description: "募集・採用を約束する前に、以下の資料の発行主体と真正性を検証します。",
        items: [
          "訓練機関の法的地位、実習施設、安全管理",
          "コース名・訓練時間・講師・修了基準",
          "職務別の技能評価項目と評価者",
          "韓国の採用企業における実際の職務・雇用条件",
          "候補者と企業ごとに、適法な査証経路があるかの確認",
        ],
      },
      notice: {
        title: "現在は構築段階であり、募集・就職実績を主張しません",
        body:
          "法人登録とMOUの事実を超えて、コース・資格・訓練時間・採用企業・配属人数・査証区分を確定的に案内しません。技能評価の結果も採用・査証許可を保証するものではありません。",
      },
      cta: {
        eyebrow: "PARTNERSHIP DESIGN",
        title: "まず、貴社の溶接職務基準を共有してください",
        description: "必要な工法・技能水準、評価方法、採用条件をもとに、ネパールで訓練・技能確認体制を整えられるか検討します。",
        label: "溶接人材事業の連携を相談",
        subject: "韓国向け溶接人材の訓練・技能確認・採用連携相談",
      },
      relatedLabel: "その他の事業領域",
      schema: {
        serviceType: "Nepal welding training, skills verification and Korean employer matching pathway design",
        areaServed: "South Korea",
        audienceType: ["employers requiring welding skills", "vocational training and assessment partners"],
      },
    },
  },
} as const satisfies Readonly<
  Record<BusinessAreaSlug, Readonly<Record<BusinessAreaLocale, BusinessAreaDefinition>>>
>;

export function isBusinessAreaSlug(value: string): value is BusinessAreaSlug {
  return BUSINESS_AREA_SLUGS.includes(value as BusinessAreaSlug);
}

export function isBusinessAreaLocale(value: string): value is BusinessAreaLocale {
  return BUSINESS_AREA_LOCALES.includes(value as BusinessAreaLocale);
}

export function getBusinessArea(locale: BusinessAreaLocale, slug: BusinessAreaSlug): BusinessArea {
  return {
    ...BUSINESS_AREA_REGISTRY[slug][locale],
    locale,
    ui: UI_COPY[locale],
  };
}

export function getBusinessAreas(locale: BusinessAreaLocale): readonly BusinessArea[] {
  return BUSINESS_AREA_SLUGS.map((slug) => getBusinessArea(locale, slug));
}
