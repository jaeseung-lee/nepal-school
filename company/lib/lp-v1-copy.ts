export type LpV1Locale = "ko" | "ja";

export type LpV1DomainIcon =
  | "ethics"
  | "nutrition"
  | "hygiene"
  | "mobility"
  | "equipment"
  | "psychosocial";

export const LP_V1_PDF_HREFS: Record<LpV1Locale, string> = {
  ko: "/downloads/kts-caregiver-catalog-ko-v1.pdf",
  ja: "/downloads/kts-caregiver-catalog-ja-v1.pdf",
};

export const LP_V1_SOURCE_URL = "https://ktsnepal.com/courses/care-giver-aged-care";

export const LP_V1_META: Record<LpV1Locale, { title: string; description: string }> = {
  ko: {
    title: "돌봄의 기본을, 네팔의 실습 현장에서 | KTS × JOONG WOO HRD",
    description:
      "Kathmandu Technical School의 3개월·총 390시간 Caregiver / Aged Care 직업훈련 과정을 한국어와 일본어로 확인하세요.",
  },
  ja: {
    title: "介護の基本を、ネパールの実習現場から | KTS × JOONG WOO HRD",
    description:
      "Kathmandu Technical Schoolの3か月・総390時間のCaregiver / Aged Care職業訓練コースを日本語でご案内します。",
  },
};

export const LP_V1_COPY = {
  ko: {
    localeLabel: "한국어",
    languageSelectorLabel: "카탈로그 언어",
    skipToContent: "본문으로 건너뛰기",
    brand: {
      name: "JOONG WOO HRD",
      partner: "Kathmandu Technical School",
      course: "Caregiver / Aged Care",
      homeAria: "정우인재개발원 홈페이지",
    },
    navigation: {
      download: "A4 PDF",
      downloadAria: "한국어 A4 카탈로그 PDF 다운로드",
    },
    hero: {
      eyebrow: "KTS CAREGIVER TRAINING · KATHMANDU, NEPAL",
      titleLines: ["돌봄의 기본을,", "네팔의 실습 현장에서"],
      description:
        "침상 옆 실습부터 관찰, 정리, 기록과 보고까지. 돌봄의 일상적인 업무를 실제 수행 순서에 맞춰 배우는 직업훈련입니다.",
      curriculumCta: "교육과정 살펴보기",
      pdfCta: "A4 카탈로그 받기",
      imageAlt: "KTS 로고와 병상, 훈련용 마네킹이 갖춰진 돌봄 실습실",
      imageCaption: "Care Lab · Sukedhara, Kathmandu",
      evidenceLabel: "현장 기록",
    },
    facts: {
      ariaLabel: "과정 핵심 정보",
      items: [
        { value: "3개월", label: "훈련기간", note: "집중 직업훈련 과정" },
        { value: "390시간", label: "총 교육시간", note: "이론과 실습을 통합" },
        { value: "10개", label: "핵심 학습 모듈", note: "모듈 + 통합 프로젝트" },
      ],
      evaluationLabel: "평가 방식",
      evaluation: "필기 · 실기 · 최종 실기 및 구술",
    },
    curriculum: {
      eyebrow: "CURRICULUM",
      title: "생활 지원의 기본을 여섯 영역으로 익힙니다",
      description:
        "수행 기술만 반복하지 않습니다. 돌봄 윤리와 안전을 바탕으로 준비, 실행, 정리, 기록까지 하나의 업무 단위로 학습합니다.",
      domainLabel: "핵심 교육영역",
      domains: [
        {
          icon: "ethics" as LpV1DomainIcon,
          title: "돌봄의 역할·윤리·안전",
          description: "존엄과 권리, 역할과 책임, PPE, 감염 및 사고 예방의 기본을 익힙니다.",
          detail: "존엄 · 권리 · PPE · 안전",
        },
        {
          icon: "nutrition" as LpV1DomainIcon,
          title: "영양·식사 지원",
          description: "식사 형태에 맞춰 준비하고 위생적으로 조리·보관하며 안전하게 식사를 돕습니다.",
          detail: "준비 · 조리 · 보관 · 식사보조",
        },
        {
          icon: "hygiene" as LpV1DomainIcon,
          title: "개인위생·환경관리",
          description: "세면, 구강, 눈, 모발, 손발톱과 피부를 관리하고 생활공간과 도구를 청결하게 유지합니다.",
          detail: "개인위생 · 환경 · 도구 · 기록",
        },
        {
          icon: "mobility" as LpV1DomainIcon,
          title: "배설·체위·이동 지원",
          description: "화장실·베드팬·이동변기·기저귀를 보조하고 침상 정돈, 안전한 체위와 이동을 연습합니다.",
          detail: "배설 · 침상 · 체위 · 이동",
        },
        {
          icon: "equipment" as LpV1DomainIcon,
          title: "건강장비·기본 관찰",
          description: "체온계, 혈압계, 혈당계, 산소포화도계와 네뷸라이저의 사용·세척·보관·보고를 익힙니다.",
          detail: "측정 · 관찰 · 세척 · 보고",
        },
        {
          icon: "psychosocial" as LpV1DomainIcon,
          title: "운동·여가·심리사회적 지원",
          description: "기본 운동과 여가활동을 지원하고 존중하는 대화, 스트레스 대응과 관찰·보고를 배웁니다.",
          detail: "활동 · 의사소통 · 관찰 · 보고",
        },
      ],
    },
    workflow: {
      eyebrow: "BEDSIDE PRACTICE LOG",
      title: "침상 옆 실습은 기록으로 완성됩니다",
      description:
        "통합 프로젝트에서는 개인위생, 영양·식사, 배설, 안위 지원 과제를 실제 돌봄 업무의 흐름에 맞춰 수행합니다.",
      note: "각 단계는 준비 상태와 위생, 대상자의 안전을 확인하며 이어집니다.",
      stepLabel: "실습 단계",
      steps: [
        { title: "PPE", description: "손 위생과 보호구를 확인합니다." },
        { title: "준비", description: "대상자와 과제, 필요한 도구를 확인합니다." },
        { title: "수행", description: "안전과 존엄을 지키며 돌봄을 수행합니다." },
        { title: "세척·보관", description: "도구와 환경을 정리하고 소독·보관합니다." },
        { title: "기록·보고", description: "관찰 내용과 수행 결과를 기록하고 보고합니다." },
      ],
    },
    gallery: {
      eyebrow: "TRAINING IN VIEW",
      title: "사진으로 확인하는 실습 환경",
      description:
        "교육장과 수행 장면을 그대로 보여드립니다. 사진은 자격 취득이나 취업 사례가 아닌 교육환경과 실습 방식에 대한 기록입니다.",
      images: {
        practice: {
          alt: "KTS 교육생이 침상 옆에서 돌봄 실습을 수행하는 모습",
          caption: "침상 돌봄 수행",
        },
        mobility: {
          alt: "KTS 교육생이 휠체어 이동 보조를 실습하는 모습",
          caption: "이동·활동 지원",
        },
        classroom: {
          alt: "KTS 강의실에서 돌봄 교육을 받는 교육생들",
          caption: "이론과 실습의 연결",
        },
      },
    },
    completion: {
      eyebrow: "ASSESSMENT & COMPLETION",
      title: "평가 기준과 수료의 범위를 명확하게 안내합니다",
      description:
        "교육과정을 이수하는 것과 외부 기능시험에 응시·합격하는 것은 서로 다른 절차입니다.",
      items: [
        { label: "과정 평가", value: "필기·실기·최종 실기 및 구술" },
        { label: "과정 범위", value: "3개월·총 390시간 KTS 직업훈련" },
        { label: "별도 절차", value: "NSTB Level 1 기능시험 응시 및 합격" },
      ],
      disclaimerTitle: "확인해 주세요",
      disclaimer:
        "과정 수료와 NSTB Level 1 기능시험의 응시·합격은 별도입니다. 본 과정은 한국·일본의 자격, 비자, 취업 또는 배치를 보장하지 않습니다.",
    },
    contact: {
      eyebrow: "PARTNERSHIP ENQUIRY",
      title: "교육과정을 직접 확인하고 협력 가능성을 논의하세요",
      description:
        "일본 개호사업자·등록지원기관과 한국의 채용·교육 파트너를 위한 교육기관 방문, 커리큘럼 확인 및 인재육성 협력 문의를 받습니다.",
      inquiryTypes: ["교육기관 방문", "커리큘럼 확인", "인재육성·채용 협력"],
      cta: "이메일로 협력 문의하기",
      emailLabel: "협력 문의",
      schoolLabel: "교육장",
      schoolAddress: "Kathmandu Technical School, Sukedhara, Kathmandu, Nepal",
      officeLabel: "한국 사무소",
      officeAddress: "경기도 용인시 기흥구 구갈로28번길 21-6, 금보빌딩 6층 6034호",
      sourceLabel: "공식 과정 안내",
      mailSubject: "KTS Caregiver 과정 협력 문의",
    },
    footer: {
      description: "Kathmandu Technical School × JOONG WOO HRD",
      sourceNote: "공개된 과정 정보와 확인된 교육자료를 기준으로 작성했습니다.",
    },
  },
  ja: {
    localeLabel: "日本語",
    languageSelectorLabel: "カタログの言語",
    skipToContent: "本文へ移動",
    brand: {
      name: "JOONG WOO HRD",
      partner: "Kathmandu Technical School",
      course: "Caregiver / Aged Care",
      homeAria: "チョンウ人材開発院ホームページ",
    },
    navigation: {
      download: "A4 PDF",
      downloadAria: "日本語版A4カタログPDFをダウンロード",
    },
    hero: {
      eyebrow: "KTS CAREGIVER TRAINING · KATHMANDU, NEPAL",
      titleLines: ["介護の基本を、", "ネパールの", "実習現場から"],
      description:
        "ベッドサイドでの実習から観察、片付け、記録・報告まで。日々の介護業務を、実際の手順に沿って学ぶ職業訓練です。",
      curriculumCta: "カリキュラムを見る",
      pdfCta: "A4カタログを入手",
      imageAlt: "KTSのロゴ、ベッド、訓練用マネキンを備えた介護実習室",
      imageCaption: "Care Lab · Sukedhara, Kathmandu",
      evidenceLabel: "現場記録",
    },
    facts: {
      ariaLabel: "コースの基本情報",
      items: [
        { value: "3か月", label: "訓練期間", note: "集中職業訓練コース" },
        { value: "390時間", label: "総訓練時間", note: "講義と実習を統合" },
        { value: "10科目", label: "主要学習モジュール", note: "モジュール＋統合プロジェクト" },
      ],
      evaluationLabel: "評価方法",
      evaluation: "筆記 · 実技 · 最終実技・口頭試問",
    },
    curriculum: {
      eyebrow: "CURRICULUM",
      title: "生活支援の基本を、6つの領域で身につけます",
      description:
        "技術だけを反復するのではありません。介護の倫理と安全を軸に、準備、実施、片付け、記録までを一つの業務単位として学びます。",
      domainLabel: "主要訓練領域",
      domains: [
        {
          icon: "ethics" as LpV1DomainIcon,
          title: "介護者の役割・倫理・安全",
          description: "尊厳と権利、役割と責任、PPE、感染・事故防止の基本を学びます。",
          detail: "尊厳 · 権利 · PPE · 安全",
        },
        {
          icon: "nutrition" as LpV1DomainIcon,
          title: "栄養・食事支援",
          description: "食事形態に応じて準備し、衛生的に調理・保管して、安全な食事介助を行います。",
          detail: "準備 · 調理 · 保管 · 食事介助",
        },
        {
          icon: "hygiene" as LpV1DomainIcon,
          title: "清潔保持・生活環境管理",
          description: "洗面、口腔、目、毛髪、爪、皮膚をケアし、生活空間と用具を清潔に保ちます。",
          detail: "清潔保持 · 環境 · 用具 · 記録",
        },
        {
          icon: "mobility" as LpV1DomainIcon,
          title: "排泄・体位・移動支援",
          description: "トイレ、ベッドパン、ポータブルトイレ、おむつの介助と、ベッドメイク、安全な体位・移動を練習します。",
          detail: "排泄 · ベッド · 体位 · 移動",
        },
        {
          icon: "equipment" as LpV1DomainIcon,
          title: "健康管理機器・基本観察",
          description: "体温計、血圧計、血糖測定器、パルスオキシメーター、ネブライザーの使用・洗浄・保管・報告を学びます。",
          detail: "測定 · 観察 · 洗浄 · 報告",
        },
        {
          icon: "psychosocial" as LpV1DomainIcon,
          title: "運動・余暇・心理社会的支援",
          description: "基本運動と余暇活動を支援し、尊重ある対話、ストレスへの対応、観察・報告を学びます。",
          detail: "活動 · 対話 · 観察 · 報告",
        },
      ],
    },
    workflow: {
      eyebrow: "BEDSIDE PRACTICE LOG",
      title: "ベッドサイド実習は、記録まで行って完結します",
      description:
        "統合プロジェクトでは、清潔保持、栄養・食事、排泄、安楽支援の課題を、実際の介護業務の流れに沿って実施します。",
      note: "各段階で準備状況、衛生、対象者の安全を確認しながら進めます。",
      stepLabel: "実習手順",
      steps: [
        { title: "PPE", description: "手指衛生と保護具を確認します。" },
        { title: "準備", description: "対象者、課題、必要な用具を確認します。" },
        { title: "実施", description: "安全と尊厳を守りながら介護を行います。" },
        { title: "洗浄・保管", description: "用具と環境を整え、消毒・保管します。" },
        { title: "記録・報告", description: "観察内容と実施結果を記録し、報告します。" },
      ],
    },
    gallery: {
      eyebrow: "TRAINING IN VIEW",
      title: "写真で見る実習環境",
      description:
        "訓練施設と実習の様子をそのままご紹介します。写真は資格取得や就職の実績ではなく、教育環境と実習方法を記録したものです。",
      images: {
        practice: {
          alt: "KTSの受講生がベッドサイドで介護実習を行う様子",
          caption: "ベッドサイドでの介護実習",
        },
        mobility: {
          alt: "KTSの受講生が車いすでの移動介助を練習する様子",
          caption: "移動・活動支援",
        },
        classroom: {
          alt: "KTSの教室で介護を学ぶ受講生",
          caption: "講義と実習の連携",
        },
      },
    },
    completion: {
      eyebrow: "ASSESSMENT & COMPLETION",
      title: "評価基準と修了の範囲を明確にご案内します",
      description:
        "訓練コースを修了することと、外部技能試験を受験・合格することは、それぞれ別の手続きです。",
      items: [
        { label: "コース評価", value: "筆記・実技・最終実技・口頭試問" },
        { label: "コース範囲", value: "3か月・総390時間のKTS職業訓練" },
        { label: "別途手続き", value: "NSTB Level 1技能試験の受験・合格" },
      ],
      disclaimerTitle: "ご確認ください",
      disclaimer:
        "コース修了とNSTB Level 1技能試験の受験・合格は別です。本コースは、韓国・日本における資格、在留資格、就職または配属を保証するものではありません。",
    },
    contact: {
      eyebrow: "PARTNERSHIP ENQUIRY",
      title: "訓練内容を確認し、連携の可能性についてご相談ください",
      description:
        "日本の介護事業者・登録支援機関、韓国の採用・教育パートナーを対象に、訓練施設の訪問、カリキュラム確認、人材育成に関するご相談を承ります。",
      inquiryTypes: ["訓練施設の訪問", "カリキュラム確認", "人材育成・採用連携"],
      cta: "メールで連携を相談する",
      emailLabel: "連携に関するお問い合わせ",
      schoolLabel: "訓練施設",
      schoolAddress: "Kathmandu Technical School, Sukedhara, Kathmandu, Nepal",
      officeLabel: "韓国オフィス",
      officeAddress: "大韓民国 京畿道龍仁市器興区旧葛路28番ギル21-6 金宝ビル6階6034号",
      sourceLabel: "公式コース情報",
      mailSubject: "KTS Caregiverコースの連携に関するお問い合わせ",
    },
    footer: {
      description: "Kathmandu Technical School × JOONG WOO HRD",
      sourceNote: "公開されているコース情報と確認済みの教育資料に基づいて作成しています。",
    },
  },
} as const;
