import type { Locale } from "@/lib/i18n";

type PrivacyCopy = {
  title: string;
  description: string;
  updated: string;
  analyticsTitle: string;
  analyticsBody: string;
  storageTitle: string;
  storageBody: string;
  rightsTitle: string;
  rightsBody: string;
  bannerTitle: string;
  bannerBody: string;
  accept: string;
  decline: string;
  policy: string;
};

export const PRIVACY_COPY: Record<Locale, PrivacyCopy> = {
  ko: {
    title: "개인정보·분석 도구 안내",
    description: "GA4와 PostHog 사용, 분석 선택 방식, 이 사이트에서 수집하는 비식별 이용 정보를 설명합니다.",
    updated: "최종 수정일: 2026년 7월 17일",
    analyticsTitle: "Google Analytics 4 및 PostHog",
    analyticsBody: "이 사이트는 방문자가 명시적으로 허용한 뒤에만 GA4와 PostHog를 불러옵니다. 페이지 경로, 언어, 콘텐츠 식별자, 관할, 명시적 클릭·열람 이벤트와 웹 성능 지표를 측정합니다. 허용한 경우 PostHog 세션 리플레이를 기록하되, 화면 텍스트와 입력값은 가리고 네트워크 요청의 본문·헤더는 기록하지 않습니다. 자동 클릭 수집과 히트맵은 사용하지 않으며, 이름·이메일·전화번호 같은 직접 식별정보를 분석 이벤트로 보내지 않습니다.",
    storageTitle: "선택 저장",
    storageBody: "허용 또는 거부 선택은 이 브라우저의 localStorage에 저장됩니다. 거부하면 GA4·PostHog 스크립트와 측정 요청을 보내지 않습니다. 브라우저 저장 정보를 지우면 다시 선택할 수 있습니다.",
    rightsTitle: "적용 범위",
    rightsBody: "이 사이트는 문의 양식 입력값이나 이메일 주소를 분석 도구에 보내지 않습니다. 채용 준비 안내 페이지는 정보 제공용이며, 분석 도구를 통해 개인정보 제출을 요구하지 않습니다.",
    bannerTitle: "분석 쿠키를 선택해 주세요",
    bannerBody: "허용한 경우에만 비식별 이용 이벤트, 웹 성능 지표와 텍스트·입력값을 가린 세션 리플레이를 GA4와 PostHog로 측정합니다.",
    accept: "허용",
    decline: "거부",
    policy: "자세히 보기",
  },
  en: {
    title: "Privacy and analytics notice",
    description: "How GA4 and PostHog are used, how consent is stored, and which non-identifying usage data this site measures.",
    updated: "Last updated: July 17, 2026",
    analyticsTitle: "Google Analytics 4 and PostHog",
    analyticsBody: "This site loads GA4 and PostHog only after you explicitly allow them. We measure page path, locale, content ID, jurisdiction, explicit click and reading events, and web-vitals metrics. With consent, PostHog records session replays with screen text and input values masked; network-request bodies and headers are not recorded. Autocapture and heatmaps are disabled. Names, email addresses, and phone numbers are not sent in analytics events.",
    storageTitle: "Saving your choice",
    storageBody: "Allow or decline is stored in this browser's localStorage. If you decline, GA4 and PostHog scripts and measurement requests are not loaded. Clearing browser storage lets you choose again.",
    rightsTitle: "Scope",
    rightsBody: "This site does not send inquiry-form entries or email addresses to analytics tools. The hiring preparation page provides information and does not request personal data through analytics.",
    bannerTitle: "Choose analytics cookies",
    bannerBody: "Only with your permission, we measure non-identifying usage events, web performance, and session replays with screen text and input values masked through GA4 and PostHog.",
    accept: "Allow",
    decline: "Decline",
    policy: "Learn more",
  },
  ja: {
    title: "プライバシー・アクセス解析について",
    description: "GA4とPostHogの利用、同意の保存方法、サイトで測定する個人を特定しない利用情報を説明します。",
    updated: "最終更新日：2026年7月17日",
    analyticsTitle: "Google Analytics 4 と PostHog",
    analyticsBody: "このサイトは、明示的に許可された後にのみGA4とPostHogを読み込みます。ページパス、言語、コンテンツID、管轄、明示的なクリック・閲覧イベント、Web Vitalsを測定します。許可された場合は、画面テキストと入力値をマスキングしたPostHogのセッションリプレイを記録します。ネットワークリクエストの本文とヘッダーは記録しません。自動クリック収集とヒートマップは使用せず、氏名、メール、電話番号などの直接識別情報を分析イベントへ送信しません。",
    storageTitle: "選択の保存",
    storageBody: "許可・拒否の選択はブラウザのlocalStorageに保存されます。拒否した場合、GA4・PostHogのスクリプトと測定リクエストは読み込まれません。保存情報を削除すると再選択できます。",
    rightsTitle: "適用範囲",
    rightsBody: "このサイトは、問い合わせフォームの入力値やメールアドレスを分析ツールへ送信しません。採用準備案内は情報提供用で、分析ツールを通じて個人情報の入力を求めません。",
    bannerTitle: "アクセス解析の利用を選択してください",
    bannerBody: "許可された場合のみ、個人を特定しない利用イベント、Webパフォーマンス、画面テキストと入力値をマスキングしたセッションリプレイをGA4とPostHogで測定します。",
    accept: "許可する",
    decline: "拒否する",
    policy: "詳しく見る",
  },
  ne: {
    title: "गोपनीयता र एनालिटिक्स सूचना",
    description: "GA4 र PostHog को प्रयोग, सहमति कसरी सुरक्षित हुन्छ र साइटले मापन गर्ने गैर-पहिचानयोग्य जानकारीबारे विवरण।",
    updated: "अन्तिम संशोधन: १७ जुलाई २०२६",
    analyticsTitle: "Google Analytics 4 र PostHog",
    analyticsBody: "तपाईंले स्पष्ट अनुमति दिएपछि मात्र यो साइटले GA4 र PostHog लोड गर्छ। पृष्ठ मार्ग, भाषा, सामग्री ID, क्षेत्राधिकार, स्पष्ट क्लिक र पढाइ घटना तथा वेब कार्यसम्पादन सूचक मापन गरिन्छ। अनुमति दिएपछि PostHog ले स्क्रिनको पाठ र इनपुट मान मास्क गरिएको सत्र रेकर्डिङ गर्छ; नेटवर्क अनुरोधका body र header रेकर्ड हुँदैनन्। स्वचालित क्लिक सङ्कलन र हिटम्याप बन्द छन्; नाम, इमेल वा फोन नम्बरजस्ता प्रत्यक्ष पहिचानयोग्य जानकारी विश्लेषण घटनामा पठाइँदैन।",
    storageTitle: "तपाईंको छनोट",
    storageBody: "अनुमति वा अस्वीकारको छनोट यस ब्राउजरको localStorage मा रहन्छ। अस्वीकार गर्दा GA4 र PostHog स्क्रिप्ट तथा मापन अनुरोध लोड हुँदैन। ब्राउजर भण्डारण हटाएपछि फेरि छनोट गर्न सकिन्छ।",
    rightsTitle: "दायरा",
    rightsBody: "यस साइटले सोधपुछ फारामका विवरण वा इमेल ठेगाना विश्लेषण उपकरणमा पठाउँदैन। भर्ती तयारी पृष्ठ सूचनाका लागि हो र विश्लेषणमार्फत व्यक्तिगत विवरण माग्दैन।",
    bannerTitle: "एनालिटिक्स छनोट गर्नुहोस्",
    bannerBody: "तपाईंको अनुमतिमा मात्र गैर-पहिचानयोग्य प्रयोग घटना, वेब प्रदर्शन र स्क्रिनको पाठ तथा इनपुट मान मास्क गरिएको सत्र रेकर्डिङ GA4 र PostHog मार्फत मापन हुन्छ।",
    accept: "अनुमति",
    decline: "अस्वीकार",
    policy: "थप हेर्नुहोस्",
  },
  vi: {
    title: "Thông báo quyền riêng tư và phân tích",
    description: "Giải thích cách dùng GA4 và PostHog, lưu lựa chọn đồng ý và dữ liệu sử dụng không định danh được đo lường.",
    updated: "Cập nhật lần cuối: 17/07/2026",
    analyticsTitle: "Google Analytics 4 và PostHog",
    analyticsBody: "Trang chỉ tải GA4 và PostHog sau khi bạn chủ động cho phép. Chúng tôi đo đường dẫn trang, ngôn ngữ, mã nội dung, phạm vi pháp lý, sự kiện nhấp/đọc rõ ràng và chỉ số hiệu năng web. Khi được cho phép, PostHog ghi lại phiên phát lại với văn bản trên màn hình và giá trị nhập được che; phần body và header của yêu cầu mạng không được ghi lại. Tự động thu thập nhấp chuột và bản đồ nhiệt bị tắt; tên, email và số điện thoại không được gửi trong sự kiện phân tích.",
    storageTitle: "Lưu lựa chọn",
    storageBody: "Lựa chọn cho phép hoặc từ chối được lưu trong localStorage của trình duyệt. Khi từ chối, tập lệnh GA4, PostHog và yêu cầu đo lường không được tải. Xóa dữ liệu trình duyệt để chọn lại.",
    rightsTitle: "Phạm vi",
    rightsBody: "Trang này không gửi nội dung biểu mẫu liên hệ hoặc địa chỉ email đến công cụ phân tích. Trang chuẩn bị tuyển dụng chỉ cung cấp thông tin và không yêu cầu dữ liệu cá nhân qua công cụ phân tích.",
    bannerTitle: "Chọn quyền phân tích",
    bannerBody: "Chỉ khi bạn cho phép, chúng tôi mới đo sự kiện không định danh, hiệu năng web và phiên phát lại có che văn bản màn hình cùng giá trị nhập bằng GA4 và PostHog.",
    accept: "Cho phép",
    decline: "Từ chối",
    policy: "Xem chi tiết",
  },
  lo: {
    title: "ແຈ້ງການຄວາມເປັນສ່ວນຕົວ ແລະ ການວິເຄາະ",
    description: "ອະທິບາຍການໃຊ້ GA4 ແລະ PostHog, ການເກັບການຍິນຍອມ ແລະ ຂໍ້ມູນການໃຊ້ງານທີ່ບໍ່ລະບຸຕົວຕົນ.",
    updated: "ປັບປຸງລ່າສຸດ: 17 ກໍລະກົດ 2026",
    analyticsTitle: "Google Analytics 4 ແລະ PostHog",
    analyticsBody: "ເວັບໄຊຈະໂຫຼດ GA4 ແລະ PostHog ຫຼັງຈາກທ່ານອະນຸຍາດຢ່າງຊັດເຈນເທົ່ານັ້ນ. ພວກເຮົາວັດແທກເສັ້ນທາງໜ້າ, ພາສາ, ລະຫັດເນື້ອຫາ, ເຂດອຳນາດ, ເຫດການຄລິກ/ອ່ານທີ່ລະບຸ ແລະ ຕົວຊີ້ວັດປະສິດທິພາບເວັບ. ເມື່ອອະນຸຍາດ PostHog ຈະບັນທຶກ session replay ໂດຍປິດບັງຂໍ້ຄວາມໜ້າຈໍ ແລະ ຄ່າທີ່ປ້ອນ; ບໍ່ບັນທຶກ body ແລະ header ຂອງ network request. ປິດການເກັບຄລິກອັດຕະໂນມັດ ແລະ heatmap; ບໍ່ສົ່ງຊື່, ອີເມວ ຫຼື ເບີໂທໄປຍັງເຫດການວິເຄາະ.",
    storageTitle: "ການເກັບຕົວເລືອກ",
    storageBody: "ການອະນຸຍາດ ຫຼື ປະຕິເສດຖືກເກັບໃນ localStorage. ເມື່ອປະຕິເສດ ຈະບໍ່ໂຫຼດສະຄຣິບ GA4, PostHog ຫຼື ຄຳຮ້ອງຂໍວັດແທກ. ລຶບຂໍ້ມູນບຣາວເຊີເພື່ອເລືອກໃໝ່.",
    rightsTitle: "ຂອບເຂດ",
    rightsBody: "ເວັບໄຊນີ້ບໍ່ສົ່ງຂໍ້ມູນແບບຟອມສອບຖາມ ຫຼື ອີເມວໄປຍັງເຄື່ອງມືວິເຄາະ. ໜ້າກຽມການຈ້າງງານໃຫ້ຂໍ້ມູນ ແລະ ບໍ່ຮ້ອງຂໍຂໍ້ມູນສ່ວນຕົວຜ່ານເຄື່ອງມືວິເຄາະ.",
    bannerTitle: "ເລືອກການວິເຄາະ",
    bannerBody: "ເມື່ອທ່ານອະນຸຍາດເທົ່ານັ້ນ ພວກເຮົາວັດແທກເຫດການທີ່ບໍ່ລະບຸຕົວຕົນ, ປະສິດທິພາບເວັບ ແລະ session replay ທີ່ປິດບັງຂໍ້ຄວາມໜ້າຈໍ ແລະ ຄ່າທີ່ປ້ອນ ຜ່ານ GA4 ແລະ PostHog.",
    accept: "ອະນຸຍາດ",
    decline: "ປະຕິເສດ",
    policy: "ລາຍລະອຽດ",
  },
};
