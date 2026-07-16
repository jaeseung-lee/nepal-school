export const SALES_LOCALE_COOKIE = "sales_locale";
export const SALES_LOCALES = ["ja", "ko"] as const;
export type SalesLocale = (typeof SALES_LOCALES)[number];

export const salesMessages = {
  ja: {
    appName: "介護営業リード",
    internal: "社内専用",
    dashboard: "ダッシュボード",
    jobs: "求人",
    companies: "企業・施設",
    runs: "収集ログ",
    users: "ユーザー",
    logout: "ログアウト",
    skipToContent: "メインコンテンツへ移動",
    sourceNotice: "求人は応募リストではなく、外国人採用需要を示す営業シグナルです。",
    latestRun: "最新の収集",
    total: "全体",
    new: "新規",
    changed: "変更",
    missing: "未検出",
    closed: "終了",
    pendingContacts: "連絡先の確認待ち",
    unreviewedCompanies: "未確認企業",
    todayFollowUps: "本日のフォロー",
    topLeads: "Aランクリード",
    noData: "表示するデータがありません。",
    runRequired: "初回収集を実行すると、ここに営業リードが表示されます。",
    status: "状態",
    score: "スコア",
    grade: "ランク",
    company: "企業",
    companyType: "企業区分",
    location: "勤務地・施設",
    employment: "雇用形態",
    posted: "掲載日",
    owner: "担当者",
    nextAction: "次の対応",
    stage: "営業段階",
    priority: "優先度",
    contacts: "連絡先候補",
    activities: "活動履歴",
    relatedJobs: "関連求人",
    emailDraft: "コールドメール下書き",
    visitChecklist: "訪問営業チェックリスト",
    source: "出典",
    verify: "確認",
    reject: "却下",
    pending: "確認待ち",
    verified: "確認済み",
    rejected: "却下",
    save: "保存",
    addActivity: "活動を追加",
    exportCsv: "CSV出力",
    search: "検索",
    filter: "絞り込み",
    all: "すべて",
    openSource: "YOLO原文",
    errors: "エラー詳細",
    startedAt: "開始日時",
    finishedAt: "終了日時",
    addUser: "許可ユーザーを追加",
    active: "有効",
    suspended: "停止",
    role: "権限",
    notes: "メモ",
    demand: "需要シグナル",
    fit: "適合度",
    scoreReasons: "スコア根拠",
    map: "地図で確認",
    sourceInventory: "求人データ",
    accountView: "企業リスト",
    companySignal: "企業シグナル",
    collectorAdmin: "管理 · 収集",
    accessAdmin: "管理 · アクセス",
    operatingRule: "運用ルール",
    operatingRuleBody: "海外在住者の直接応募可否を保証しません。公式連絡先は出典を確認してから使用し、個人メールや推測した採用企業は登録しません。",
    collectionFailed: "収集に失敗しました",
    tableView: "表",
    cardView: "カード",
    firstPage: "最初のページ",
    previousPage: "前のページ",
    nextPage: "次のページ",
    lastPage: "最後のページ",
    page: "ページ",
    loadError: "データを読み込めませんでした。",
    retry: "再試行",
    region: "都道府県",
    freshness: "登録時期",
    addedLastSevenDays: "7日以内の新規登録",
    notRegistered: "未登録",
    activeJobs: "有効求人",
    activeJobCount: "有効求人数",
    type: "種別",
    value: "内容",
    officialSource: "公式出典URL",
    officialName: "正式法人名",
    officialDomain: "公式ドメイン",
    companyVerification: "法人確認",
    japaneseDraft: "日本語",
    koreanDraft: "韓国語",
    draftNotice: "下書き管理のみです。自動送信はしません。送信前に法人連絡先、送信者表示、受信拒否方法を確認してください。",
    email: "メール",
    name: "名前",
    loginProfile: "ログインプロフィール",
    action: "操作",
    connected: "連携済み",
    notSignedIn: "未ログイン",
    accessNotice: "公開登録画面はありません。許可リストに追加したGoogleメールだけが初回ログイン時にプロフィールを作成できます。",
    pagesAndErrors: "ページ / エラー",
    warnings: "警告",
    filterResults: "該当件数",
  },
  ko: {
    appName: "개호 영업 리드",
    internal: "사내 전용",
    dashboard: "대시보드",
    jobs: "공고",
    companies: "기업·시설",
    runs: "수집 로그",
    users: "사용자",
    logout: "로그아웃",
    skipToContent: "본문으로 바로가기",
    sourceNotice: "공고는 지원 목록이 아니라 외국인 채용 수요를 보여주는 영업 신호입니다.",
    latestRun: "최근 수집",
    total: "전체",
    new: "신규",
    changed: "변경",
    missing: "누락",
    closed: "종료",
    pendingContacts: "연락처 검토 대기",
    unreviewedCompanies: "미검토 기업",
    todayFollowUps: "오늘의 후속 연락",
    topLeads: "A등급 리드",
    noData: "표시할 데이터가 없습니다.",
    runRequired: "초기 수집을 실행하면 여기에 영업 리드가 표시됩니다.",
    status: "상태",
    score: "점수",
    grade: "등급",
    company: "기업",
    companyType: "기업 유형",
    location: "근무지·시설",
    employment: "고용 형태",
    posted: "공고일",
    owner: "담당자",
    nextAction: "다음 행동",
    stage: "영업 단계",
    priority: "우선순위",
    contacts: "연락처 후보",
    activities: "활동 이력",
    relatedJobs: "관련 공고",
    emailDraft: "콜드메일 초안",
    visitChecklist: "방문영업 체크리스트",
    source: "출처",
    verify: "확인",
    reject: "반려",
    pending: "검토 대기",
    verified: "확인",
    rejected: "반려",
    save: "저장",
    addActivity: "활동 추가",
    exportCsv: "CSV 내보내기",
    search: "검색",
    filter: "필터 적용",
    all: "전체",
    openSource: "YOLO 원문",
    errors: "오류 상세",
    startedAt: "시작 일시",
    finishedAt: "종료 일시",
    addUser: "허용 사용자 추가",
    active: "활성",
    suspended: "중지",
    role: "권한",
    notes: "메모",
    demand: "수요 신호",
    fit: "적합도",
    scoreReasons: "점수 근거",
    map: "지도에서 확인",
    sourceInventory: "공고 데이터",
    accountView: "기업 목록",
    companySignal: "기업 신호",
    collectorAdmin: "관리 · 수집",
    accessAdmin: "관리 · 접근 권한",
    operatingRule: "운영 원칙",
    operatingRuleBody: "해외 거주자의 직접 지원 가능 여부를 보장하지 않습니다. 공식 연락처는 출처를 확인한 뒤 사용하고, 개인 이메일이나 추정한 채용 기업은 등록하지 않습니다.",
    collectionFailed: "수집에 실패했습니다",
    tableView: "표",
    cardView: "카드",
    firstPage: "첫 페이지",
    previousPage: "이전 페이지",
    nextPage: "다음 페이지",
    lastPage: "마지막 페이지",
    page: "페이지",
    loadError: "데이터를 불러오지 못했습니다.",
    retry: "다시 시도",
    region: "지역",
    freshness: "등록 시점",
    addedLastSevenDays: "최근 7일 신규 등록",
    notRegistered: "미등록",
    activeJobs: "활성 공고",
    activeJobCount: "활성 공고 수",
    type: "유형",
    value: "내용",
    officialSource: "공식 출처 URL",
    officialName: "공식 법인명",
    officialDomain: "공식 도메인",
    companyVerification: "기업 확인",
    japaneseDraft: "일본어",
    koreanDraft: "한국어",
    draftNotice: "초안 관리용이며 자동으로 발송하지 않습니다. 발송 전에 법인 연락처, 발신자 표시, 수신 거부 방법을 확인하세요.",
    email: "이메일",
    name: "이름",
    loginProfile: "로그인 프로필",
    action: "작업",
    connected: "연결됨",
    notSignedIn: "로그인 전",
    accessNotice: "공개 가입 화면은 없습니다. 허용 목록에 추가한 Google 이메일만 첫 로그인 때 프로필을 만들 수 있습니다.",
    pagesAndErrors: "페이지 / 오류",
    warnings: "경고",
    filterResults: "검색 결과",
  },
} as const;

type LocalizedLabels = Record<SalesLocale, Record<string, string>>;

export const stageLabels: LocalizedLabels = {
  ja: { unreviewed: "未確認", researching: "調査中", contact_ready: "連絡準備", contacted: "連絡済み", follow_up: "フォロー", meeting: "商談", proposal: "提案", won: "成約", lost: "失注", do_not_contact: "連絡禁止" },
  ko: { unreviewed: "미검토", researching: "조사 중", contact_ready: "연락 준비", contacted: "연락 완료", follow_up: "후속 연락", meeting: "미팅", proposal: "제안", won: "성사", lost: "실패", do_not_contact: "연락 금지" },
};

export const statusLabels: LocalizedLabels = {
  ja: { active: "有効", missing: "未検出", closed: "終了", running: "実行中", succeeded: "成功", failed: "失敗", pending: "確認待ち", verified: "確認済み", rejected: "却下", suspended: "停止", none: "未登録" },
  ko: { active: "활성", missing: "누락", closed: "종료", running: "실행 중", succeeded: "성공", failed: "실패", pending: "검토 대기", verified: "확인", rejected: "반려", suspended: "중지", none: "미등록" },
};

export const employmentTypeLabels: LocalizedLabels = {
  ja: { FULL_TIME: "フルタイム", PART_TIME: "パートタイム", CONTRACTOR: "業務委託", TEMPORARY: "臨時雇用", INTERN: "インターン", VOLUNTEER: "ボランティア", PER_DIEM: "日雇い・日当制", OTHER: "その他" },
  ko: { FULL_TIME: "풀타임", PART_TIME: "파트타임", CONTRACTOR: "계약·도급", TEMPORARY: "임시직", INTERN: "인턴", VOLUNTEER: "자원봉사", PER_DIEM: "일용·일급제", OTHER: "기타" },
};

export const organizationTypeLabels: LocalizedLabels = {
  ja: { direct_employer: "直接雇用企業", agency: "紹介・派遣会社", unknown: "未確認" },
  ko: { direct_employer: "직접고용 기업", agency: "소개·파견사", unknown: "미확인" },
};

export const priorityLabels: LocalizedLabels = {
  ja: { high: "高", normal: "標準", low: "低" },
  ko: { high: "높음", normal: "보통", low: "낮음" },
};

export const activityTypeLabels: LocalizedLabels = {
  ja: { note: "メモ", email: "メール", phone: "電話", visit: "訪問", meeting: "商談", follow_up: "フォロー", stage_change: "営業段階の変更" },
  ko: { note: "메모", email: "이메일", phone: "전화", visit: "방문", meeting: "미팅", follow_up: "후속 연락", stage_change: "영업 단계 변경" },
};

export const contactKindLabels: LocalizedLabels = {
  ja: { website: "ウェブサイト", phone: "電話", email: "メール", contact_form: "問い合わせフォーム", visit_address: "訪問先住所" },
  ko: { website: "웹사이트", phone: "전화", email: "이메일", contact_form: "문의 양식", visit_address: "방문 주소" },
};

export const confidenceLabels: LocalizedLabels = {
  ja: { high: "高信頼", medium: "中信頼", low: "低信頼" },
  ko: { high: "신뢰도 높음", medium: "신뢰도 보통", low: "신뢰도 낮음" },
};

export const roleLabels: LocalizedLabels = {
  ja: { admin: "管理者", sales: "営業" },
  ko: { admin: "관리자", sales: "영업" },
};

export const signalLabels: LocalizedLabels = {
  ja: { visa: "ビザ支援", foreign_staff: "外国人材", training: "研修支援", housing: "住居支援" },
  ko: { visa: "비자 지원", foreign_staff: "외국인 인재", training: "교육 지원", housing: "주거 지원" },
};

export const scoreReasonLabels: LocalizedLabels = {
  ja: { direct_employer: "直接雇用", stable_employment: "正規・契約雇用", visa_support: "ビザ・特定技能支援", foreigner_experience: "外国人採用シグナル", n3_n4: "N3/N4", qualification_support: "資格・研修支援", housing_support: "住居支援", recent_post: "30日以内の求人", three_active_jobs: "有効求人3件以上", long_validity: "有効期間30日以上", weekly_change: "今週の変更・再掲載" },
  ko: { direct_employer: "직접고용", stable_employment: "정규·계약직", visa_support: "비자·특정기능 지원", foreigner_experience: "외국인 채용 신호", n3_n4: "N3/N4", qualification_support: "자격·교육 지원", housing_support: "주거 지원", recent_post: "최근 30일 공고", three_active_jobs: "활성 공고 3건 이상", long_validity: "유효기간 30일 이상", weekly_change: "이번 주 변경·재등장" },
};

export const visitChecklistItems: Record<SalesLocale, string[]> = {
  ja: ["公式法人名と施設名を照合", "受付時間・採用担当部署を確認", "YOLO求人は需要シグナルとしてのみ言及", "ネパール人材の在留資格・日本語力を具体化", "次回連絡日と受信拒否の希望を記録"],
  ko: ["공식 법인명과 시설명 대조", "접수 시간과 채용 담당 부서 확인", "YOLO 공고는 수요 신호로만 언급", "네팔 인재의 재류자격과 일본어 수준 구체화", "다음 연락일과 수신 거부 의사 기록"],
};

export const SALES_STAGES = Object.keys(stageLabels.ja);

export function localizedLabel(labels: LocalizedLabels, value: string | null | undefined, locale: SalesLocale, empty = "—") {
  if (!value) return empty;
  return labels[locale][value] ?? value;
}

export function formatStatusLabel(value: string | null | undefined, locale: SalesLocale) {
  return localizedLabel(statusLabels, value, locale);
}

export function formatEmploymentType(value: string | null | undefined, locale: SalesLocale) {
  if (!value) return "—";
  const values = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (!values.length) return "—";
  return values
    .map((item) => localizedLabel(employmentTypeLabels, item, locale))
    .join(locale === "ja" ? "、" : ", ");
}

export function formatOrganizationType(value: string | null | undefined, locale: SalesLocale) {
  return localizedLabel(organizationTypeLabels, value, locale);
}

export function formatResultSummary(from: number, to: number, total: number, locale: SalesLocale) {
  const number = new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "ko-KR");
  if (locale === "ja") return `${number.format(total)}件中 ${number.format(from)}〜${number.format(to)}件`;
  return `총 ${number.format(total)}건 중 ${number.format(from)}–${number.format(to)}건`;
}

export function formatSalesDate(value: string | null | undefined, locale: SalesLocale) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "—";
  return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
