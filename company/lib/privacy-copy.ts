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
    description: "GA4 사용과 쿠키 선택 방식, 이 사이트에서 수집하는 비식별 이용 정보를 설명합니다.",
    updated: "최종 수정일: 2026년 7월 16일",
    analyticsTitle: "Google Analytics 4",
    analyticsBody: "이 사이트는 방문자가 명시적으로 허용한 뒤에만 GA4를 불러옵니다. 페이지 경로, 언어, 콘텐츠 식별자, 관할과 클릭·열람 이벤트를 측정하며 이름, 이메일, 전화번호 같은 개인식별정보는 분석 이벤트로 보내지 않습니다.",
    storageTitle: "선택 저장",
    storageBody: "허용 또는 거부 선택은 이 브라우저의 localStorage에 저장됩니다. 거부하면 GA4 스크립트와 측정 요청을 보내지 않습니다. 브라우저 저장 정보를 지우면 다시 선택할 수 있습니다.",
    rightsTitle: "적용 범위",
    rightsBody: "이번 사이트에는 문의 폼이나 대표 문의 채널이 없습니다. 채용 준비 안내 페이지는 정보 제공용이며 개인정보 제출을 요구하지 않습니다.",
    bannerTitle: "분석 쿠키를 선택해 주세요",
    bannerBody: "허용한 경우에만 익명화된 이용 이벤트와 웹 성능 지표를 GA4로 측정합니다.",
    accept: "허용",
    decline: "거부",
    policy: "자세히 보기",
  },
  en: {
    title: "Privacy and analytics notice",
    description: "How GA4 is used, how consent is stored, and which non-identifying usage data this site measures.",
    updated: "Last updated: July 16, 2026",
    analyticsTitle: "Google Analytics 4",
    analyticsBody: "This site loads GA4 only after you explicitly allow it. We measure page path, locale, content ID, jurisdiction, clicks and reading events. Names, email addresses and phone numbers are not sent in analytics events.",
    storageTitle: "Saving your choice",
    storageBody: "Allow or decline is stored in this browser's localStorage. If you decline, the GA4 script and measurement requests are not loaded. Clearing browser storage lets you choose again.",
    rightsTitle: "Scope",
    rightsBody: "This release has no inquiry form or public contact channel. The hiring preparation page provides information and does not ask you to submit personal data.",
    bannerTitle: "Choose analytics cookies",
    bannerBody: "Only with your permission, we measure non-identifying usage events and web performance through GA4.",
    accept: "Allow",
    decline: "Decline",
    policy: "Learn more",
  },
  ja: {
    title: "プライバシー・アクセス解析について",
    description: "GA4の利用、同意の保存方法、サイトで測定する個人を特定しない利用情報を説明します。",
    updated: "最終更新日：2026年7月16日",
    analyticsTitle: "Google Analytics 4",
    analyticsBody: "このサイトは、明示的に許可された後にのみGA4を読み込みます。ページパス、言語、コンテンツID、管轄、クリック・閲覧イベントを測定し、氏名、メール、電話番号などの個人識別情報は送信しません。",
    storageTitle: "選択の保存",
    storageBody: "許可・拒否の選択はブラウザのlocalStorageに保存されます。拒否した場合、GA4スクリプトと測定リクエストは読み込まれません。保存情報を削除すると再選択できます。",
    rightsTitle: "適用範囲",
    rightsBody: "この公開範囲には問い合わせフォームや公開連絡先はありません。採用準備案内は情報提供用で、個人情報の入力を求めません。",
    bannerTitle: "アクセス解析の利用を選択してください",
    bannerBody: "許可された場合のみ、個人を特定しない利用イベントとWebパフォーマンスをGA4で測定します。",
    accept: "許可する",
    decline: "拒否する",
    policy: "詳しく見る",
  },
  ne: {
    title: "गोपनीयता र एनालिटिक्स सूचना",
    description: "GA4 को प्रयोग, सहमति कसरी सुरक्षित हुन्छ र साइटले मापन गर्ने गैर-पहिचानयोग्य जानकारीबारे विवरण।",
    updated: "अन्तिम संशोधन: १६ जुलाई २०२६",
    analyticsTitle: "Google Analytics 4",
    analyticsBody: "तपाईंले स्पष्ट अनुमति दिएपछि मात्र यो साइटले GA4 लोड गर्छ। पृष्ठ मार्ग, भाषा, सामग्री ID, क्षेत्राधिकार, क्लिक र पढाइ घटना मापन गरिन्छ; नाम, इमेल वा फोन नम्बर पठाइँदैन।",
    storageTitle: "तपाईंको छनोट",
    storageBody: "अनुमति वा अस्वीकारको छनोट यस ब्राउजरको localStorage मा रहन्छ। अस्वीकार गर्दा GA4 स्क्रिप्ट र मापन अनुरोध लोड हुँदैन। ब्राउजर भण्डारण हटाएपछि फेरि छनोट गर्न सकिन्छ।",
    rightsTitle: "दायरा",
    rightsBody: "यस संस्करणमा सोधपुछ फाराम वा सार्वजनिक सम्पर्क माध्यम छैन। भर्ती तयारी पृष्ठ सूचनाका लागि हो र व्यक्तिगत विवरण माग्दैन।",
    bannerTitle: "एनालिटिक्स छनोट गर्नुहोस्",
    bannerBody: "तपाईंको अनुमतिमा मात्र गैर-पहिचानयोग्य प्रयोग घटना र वेब प्रदर्शन GA4 मार्फत मापन हुन्छ।",
    accept: "अनुमति",
    decline: "अस्वीकार",
    policy: "थप हेर्नुहोस्",
  },
  vi: {
    title: "Thông báo quyền riêng tư và phân tích",
    description: "Giải thích cách dùng GA4, lưu lựa chọn đồng ý và dữ liệu sử dụng không định danh được đo lường.",
    updated: "Cập nhật lần cuối: 16/07/2026",
    analyticsTitle: "Google Analytics 4",
    analyticsBody: "Trang chỉ tải GA4 sau khi bạn chủ động cho phép. Chúng tôi đo đường dẫn trang, ngôn ngữ, mã nội dung, phạm vi pháp lý và sự kiện nhấp/đọc; không gửi tên, email hay số điện thoại.",
    storageTitle: "Lưu lựa chọn",
    storageBody: "Lựa chọn cho phép hoặc từ chối được lưu trong localStorage của trình duyệt. Khi từ chối, tập lệnh GA4 và yêu cầu đo lường không được tải. Xóa dữ liệu trình duyệt để chọn lại.",
    rightsTitle: "Phạm vi",
    rightsBody: "Phiên bản này không có biểu mẫu liên hệ hoặc kênh liên hệ công khai. Trang chuẩn bị tuyển dụng chỉ cung cấp thông tin và không yêu cầu dữ liệu cá nhân.",
    bannerTitle: "Chọn quyền phân tích",
    bannerBody: "Chỉ khi bạn cho phép, chúng tôi mới đo sự kiện không định danh và hiệu năng web bằng GA4.",
    accept: "Cho phép",
    decline: "Từ chối",
    policy: "Xem chi tiết",
  },
  lo: {
    title: "ແຈ້ງການຄວາມເປັນສ່ວນຕົວ ແລະ ການວິເຄາະ",
    description: "ອະທິບາຍການໃຊ້ GA4, ການເກັບການຍິນຍອມ ແລະ ຂໍ້ມູນການໃຊ້ງານທີ່ບໍ່ລະບຸຕົວຕົນ.",
    updated: "ປັບປຸງລ່າສຸດ: 16 ກໍລະກົດ 2026",
    analyticsTitle: "Google Analytics 4",
    analyticsBody: "ເວັບໄຊຈະໂຫຼດ GA4 ຫຼັງຈາກທ່ານອະນຸຍາດຢ່າງຊັດເຈນເທົ່ານັ້ນ. ພວກເຮົາວັດແທກເສັ້ນທາງໜ້າ, ພາສາ, ລະຫັດເນື້ອຫາ, ເຂດອຳນາດ ແລະ ເຫດການຄລິກ/ອ່ານ ໂດຍບໍ່ສົ່ງຊື່, ອີເມວ ຫຼື ເບີໂທ.",
    storageTitle: "ການເກັບຕົວເລືອກ",
    storageBody: "ການອະນຸຍາດ ຫຼື ປະຕິເສດຖືກເກັບໃນ localStorage. ເມື່ອປະຕິເສດ ຈະບໍ່ໂຫຼດ GA4 ຫຼື ຄຳຮ້ອງຂໍວັດແທກ. ລຶບຂໍ້ມູນບຣາວເຊີເພື່ອເລືອກໃໝ່.",
    rightsTitle: "ຂອບເຂດ",
    rightsBody: "ສະບັບນີ້ບໍ່ມີແບບຟອມສອບຖາມ ຫຼື ຊ່ອງທາງຕິດຕໍ່ສາທາລະນະ. ໜ້າກຽມການຈ້າງງານໃຫ້ຂໍ້ມູນ ແລະ ບໍ່ຮ້ອງຂໍຂໍ້ມູນສ່ວນຕົວ.",
    bannerTitle: "ເລືອກການວິເຄາະ",
    bannerBody: "ຈະວັດແທກເຫດການທີ່ບໍ່ລະບຸຕົວຕົນ ແລະ ປະສິດທິພາບເວັບຜ່ານ GA4 ເມື່ອທ່ານອະນຸຍາດເທົ່ານັ້ນ.",
    accept: "ອະນຸຍາດ",
    decline: "ປະຕິເສດ",
    policy: "ລາຍລະອຽດ",
  },
};
