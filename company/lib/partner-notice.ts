import type { Locale } from "@/lib/i18n";

export const PARTNER_NOTICE: Record<Locale, { title: string; body: string; link: string }> = {
  ko: { title: "등재 범위 안내", body: "OTIT 등재는 기능실습 송출기관 여부를 확인하는 자료이며 특정기능 송출 실적이나 자격을 증명하지 않습니다. 또한 일본 정부 안내상 네팔의 특정기능 절차에서 송출기관 이용은 의무가 아닙니다.", link: "일본 출입국재류관리청 네팔 안내" },
  en: { title: "Scope of listings", body: "An OTIT listing confirms status in the Technical Intern Training framework; it does not prove a Specified Skilled Worker record or qualification. Japan's official Nepal guidance also states that using a sending organization is not mandatory for SSW procedures.", link: "Immigration Services Agency guidance for Nepal" },
  ja: { title: "掲載範囲について", body: "OTITの掲載は技能実習の送出機関であることを確認する資料であり、特定技能の送出実績・資格を証明するものではありません。また、出入国在留管理庁のネパール案内では、特定技能手続で送出機関の利用は必須ではありません。", link: "出入国在留管理庁・ネパール案内" },
  ne: { title: "सूचीकरणको दायरा", body: "OTIT सूचीले प्राविधिक प्रशिक्षार्थी पठाउने संस्थाको स्थिति मात्र पुष्टि गर्छ; यसले निर्दिष्ट सीपसम्बन्धी अनुभव वा योग्यता प्रमाणित गर्दैन। जापानको आधिकारिक नेपाल मार्गदर्शनअनुसार SSW प्रक्रियामा पठाउने संस्था प्रयोग गर्नु अनिवार्य छैन।", link: "जापान अध्यागमन सेवा एजेन्सीको नेपाल मार्गदर्शन" },
  vi: { title: "Phạm vi xác nhận", body: "Danh sách OTIT chỉ xác nhận tổ chức phái cử trong chương trình thực tập kỹ năng, không chứng minh thành tích hay tư cách phái cử Kỹ năng đặc định. Hướng dẫn chính thức cho Nepal cũng nêu việc dùng tổ chức phái cử không bắt buộc trong thủ tục SSW.", link: "Hướng dẫn Nepal của Cơ quan Quản lý xuất nhập cảnh Nhật Bản" },
  lo: { title: "ຂອບເຂດການຂຶ້ນບັນຊີ", body: "ບັນຊີ OTIT ຢືນຢັນສະຖານະອົງການສົ່ງຜູ້ຝຶກງານເທົ່ານັ້ນ ບໍ່ໄດ້ພິສູດຜົນງານຫຼືຄຸນສົມບັດ SSW. ຄູ່ມືທາງການສຳລັບເນປານລະບຸວ່າບໍ່ບັງຄັບໃຊ້ອົງການສົ່ງໃນຂັ້ນຕອນ SSW.", link: "ຄູ່ມືເນປານຂອງສຳນັກງານກວດຄົນເຂົ້າເມືອງຍີ່ປຸ່ນ" },
};
