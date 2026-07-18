import { LOCALES, type Locale } from "@/lib/i18n";

/** The presentation groups used to filter and label the public gallery. */
export type GalleryCategory = "training" | "facilities" | "visits" | "meetings";

export const GALLERY_LOCALES = LOCALES;

export type GalleryLocale = Locale;

export type GalleryCopy = {
  title: string;
  description: string;
  alt: string;
};

/**
 * One source original and one public, metadata-free WebP derivative.
 * `sourceFile` is deliberately repository-relative so the asset validator can
 * account for the original archive without exposing it to the public site.
 */
export type GalleryItem = {
  id: string;
  order: number;
  sourceFile: `images/${string}`;
  src: `/gallery/${string}.webp`;
  category: GalleryCategory;
  copy: Readonly<Record<GalleryLocale, GalleryCopy>>;
};

export type LocalizedGalleryItem = GalleryItem & GalleryCopy;

const CATEGORY_COPY: Readonly<Record<GalleryCategory, Readonly<Record<GalleryLocale, GalleryCopy>>>> = {
  training: {
    ko: {
      title: "교육과 실습",
      description: "학생들이 함께 배우고 실습하는 네팔 현지 교육 현장입니다.",
      alt: "학생들이 교육 공간에서 수업과 실습에 참여하는 모습",
    },
    en: {
      title: "Learning and practice",
      description: "Students learn together and take part in practical training in Nepal.",
      alt: "Students participating in a class or practical training session",
    },
    ja: {
      title: "学びと実習",
      description: "ネパールの教育現場で、学生が共に学び実習に取り組む様子です。",
      alt: "学生が教室で授業や実習に参加している様子",
    },
    ne: {
      title: "सिकाइ र अभ्यास",
      description: "नेपालको शैक्षिक वातावरणमा विद्यार्थीहरू सँगै सिक्दै र व्यावहारिक अभ्यास गर्दैछन्।",
      alt: "विद्यार्थीहरू कक्षामा अध्ययन वा व्यावहारिक तालिममा सहभागी भएको दृश्य",
    },
    vi: {
      title: "Học tập và thực hành",
      description: "Sinh viên cùng học và tham gia đào tạo thực hành tại Nepal.",
      alt: "Sinh viên tham gia lớp học hoặc buổi đào tạo thực hành",
    },
    lo: {
      title: "ການຮຽນຮູ້ ແລະ ການຝຶກປະຕິບັດ",
      description: "ນັກຮຽນຮຽນຮູ້ຮ່ວມກັນ ແລະ ຝຶກປະຕິບັດໃນສະຖານທີ່ສຶກສາທີ່ເນປານ.",
      alt: "ນັກຮຽນເຂົ້າຮ່ວມການຮຽນ ຫຼື ການຝຶກປະຕິບັດ",
    },
  },
  facilities: {
    ko: {
      title: "교육 시설",
      description: "교육과 실습을 뒷받침하는 현지 기관의 교실과 시설입니다.",
      alt: "네팔 현지 교육기관의 교육 또는 실습 시설",
    },
    en: {
      title: "Training facilities",
      description: "Classrooms and facilities at local institutions support education and practical learning.",
      alt: "A classroom or practical training facility at a Nepalese institution",
    },
    ja: {
      title: "教育施設",
      description: "学びと実習を支える現地機関の教室・施設です。",
      alt: "ネパールの教育機関にある教室または実習施設",
    },
    ne: {
      title: "तालिम सुविधा",
      description: "शिक्षा र व्यावहारिक सिकाइलाई सहयोग गर्ने स्थानीय संस्थाका कक्षा र सुविधाहरू।",
      alt: "नेपालको शैक्षिक संस्थामा रहेको कक्षा वा व्यावहारिक तालिम सुविधा",
    },
    vi: {
      title: "Cơ sở đào tạo",
      description: "Các lớp học và cơ sở tại địa phương hỗ trợ việc học và thực hành.",
      alt: "Lớp học hoặc cơ sở đào tạo thực hành tại một tổ chức ở Nepal",
    },
    lo: {
      title: "ສິ່ງອຳນວຍຄວາມສະດວກດ້ານການຝຶກອົບຮົມ",
      description: "ຫ້ອງຮຽນ ແລະ ສິ່ງອຳນວຍຄວາມສະດວກຂອງສະຖາບັນທ້ອງຖິ່ນ ສະໜັບສະໜູນການຮຽນ ແລະ ການຝຶກປະຕິບັດ.",
      alt: "ຫ້ອງຮຽນ ຫຼື ສະຖານທີ່ຝຶກປະຕິບັດຂອງສະຖາບັນໃນເນປານ",
    },
  },
  visits: {
    ko: {
      title: "현지 기관 방문",
      description: "현지 교육기관 및 협력 파트너와 교류하는 방문 현장입니다.",
      alt: "네팔 현지 교육기관 또는 협력 파트너를 방문한 모습",
    },
    en: {
      title: "Local institution visit",
      description: "A visit and exchange with a local educational institution or partner in Nepal.",
      alt: "A visit to a Nepalese educational institution or partner organization",
    },
    ja: {
      title: "現地機関の訪問",
      description: "ネパールの教育機関や協力パートナーを訪問し、交流する様子です。",
      alt: "ネパールの教育機関または協力パートナーを訪問している様子",
    },
    ne: {
      title: "स्थानीय संस्थाको भ्रमण",
      description: "नेपालका स्थानीय शैक्षिक संस्था वा साझेदारसँगको भ्रमण र आदानप्रदान।",
      alt: "नेपालको शैक्षिक संस्था वा साझेदार संगठनको भ्रमण",
    },
    vi: {
      title: "Thăm tổ chức địa phương",
      description: "Hoạt động thăm và trao đổi với cơ sở giáo dục hoặc đối tác địa phương tại Nepal.",
      alt: "Chuyến thăm một cơ sở giáo dục hoặc tổ chức đối tác tại Nepal",
    },
    lo: {
      title: "ການຢ້ຽມຢາມສະຖາບັນທ້ອງຖິ່ນ",
      description: "ການຢ້ຽມຢາມ ແລະ ແລກປ່ຽນກັບສະຖາບັນການສຶກສາ ຫຼື ຄູ່ຮ່ວມງານໃນເນປານ.",
      alt: "ການຢ້ຽມຢາມສະຖາບັນການສຶກສາ ຫຼື ອົງການຄູ່ຮ່ວມງານໃນເນປານ",
    },
  },
  meetings: {
    ko: {
      title: "협력 논의",
      description: "학생 지원과 교육 협력을 위해 파트너와 의견을 나누는 자리입니다.",
      alt: "협력 관계자들이 회의 또는 환영 행사에 참여하는 모습",
    },
    en: {
      title: "Partnership discussion",
      description: "Partners meet to discuss student support and educational collaboration.",
      alt: "Partner representatives taking part in a meeting or welcome event",
    },
    ja: {
      title: "協力に向けた対話",
      description: "学生支援と教育連携について、パートナーと意見を交わす場面です。",
      alt: "協力関係者が会議または歓迎行事に参加している様子",
    },
    ne: {
      title: "सहकार्य छलफल",
      description: "विद्यार्थी सहयोग र शैक्षिक सहकार्यबारे साझेदारहरूसँग छलफल गर्ने अवसर।",
      alt: "साझेदार प्रतिनिधिहरू बैठक वा स्वागत कार्यक्रममा सहभागी भएको दृश्य",
    },
    vi: {
      title: "Trao đổi hợp tác",
      description: "Các đối tác gặp gỡ để trao đổi về hỗ trợ sinh viên và hợp tác giáo dục.",
      alt: "Đại diện đối tác tham gia cuộc họp hoặc sự kiện chào mừng",
    },
    lo: {
      title: "ການປຶກສາຫາລືຄວາມຮ່ວມມື",
      description: "ຄູ່ຮ່ວມງານພົບປະເພື່ອປຶກສາກ່ຽວກັບການສະໜັບສະໜູນນັກຮຽນ ແລະ ຄວາມຮ່ວມມືດ້ານການສຶກສາ.",
      alt: "ຕົວແທນຄູ່ຮ່ວມງານເຂົ້າຮ່ວມການປະຊຸມ ຫຼື ງານຕ້ອນຮັບ",
    },
  },
};

function item(
  id: string,
  order: number,
  sourceFile: GalleryItem["sourceFile"],
  src: GalleryItem["src"],
  category: GalleryCategory,
): GalleryItem {
  return { id, order, sourceFile, src, category, copy: CATEGORY_COPY[category] };
}

/**
 * The single gallery inventory. New photos must be added here and converted
 * into a one-to-one `public/gallery` WebP derivative.
 */
export const GALLERY_ITEMS: readonly GalleryItem[] = [
  item("campus-welcome-garlanded-guests", 1, "images/KakaoTalk_Photo_2026-07-18-14-45-27 001.jpeg", "/gallery/campus-welcome-garlanded-guests.webp", "visits"),
  item("campus-partnership-meeting", 2, "images/KakaoTalk_Photo_2026-07-18-14-45-28 002.jpeg", "/gallery/campus-partnership-meeting.webp", "meetings"),
  item("campus-visit-outdoor-group", 3, "images/KakaoTalk_Photo_2026-07-18-14-45-28 003.jpeg", "/gallery/campus-visit-outdoor-group.webp", "visits"),
  item("nursing-classroom-visit", 4, "images/KakaoTalk_Photo_2026-07-18-14-45-28 004.jpeg", "/gallery/nursing-classroom-visit.webp", "training"),
  item("visitor-hosts-terrace-meeting", 5, "images/KakaoTalk_Photo_2026-07-18-14-45-29 005.jpeg", "/gallery/visitor-hosts-terrace-meeting.webp", "visits"),
  item("visiting-group-building-entrance", 6, "images/KakaoTalk_Photo_2026-07-18-14-45-29 006.jpeg", "/gallery/visiting-group-building-entrance.webp", "visits"),
  item("skill-lab-v-tour", 7, "images/KakaoTalk_Photo_2026-07-18-14-45-30 007.jpeg", "/gallery/skill-lab-v-tour.webp", "facilities"),
  item("hospitality-training-restaurant-lab", 8, "images/KakaoTalk_Photo_2026-07-18-14-45-31 008.jpeg", "/gallery/hospitality-training-restaurant-lab.webp", "training"),
  item("healthcare-training-simulation-ward", 9, "images/KakaoTalk_Photo_2026-07-18-14-45-32 009.jpeg", "/gallery/healthcare-training-simulation-ward.webp", "training"),
  item("training-room-interior", 10, "images/KakaoTalk_Photo_2026-07-18-14-45-33 010.jpeg", "/gallery/training-room-interior.webp", "facilities"),
  item("institutional-visit-group", 11, "images/KakaoTalk_Photo_2026-07-18-14-45-34 011.jpeg", "/gallery/institutional-visit-group.webp", "visits"),
  item("institutional-visit-group-wide", 12, "images/KakaoTalk_Photo_2026-07-18-14-45-34 012.jpeg", "/gallery/institutional-visit-group-wide.webp", "visits"),
  item("dakshinkali-municipality-partnership-visit", 13, "images/KakaoTalk_Photo_2026-07-18-14-45-35 013.jpeg", "/gallery/dakshinkali-municipality-partnership-visit.webp", "visits"),
  item("municipal-office-meeting", 14, "images/KakaoTalk_Photo_2026-07-18-14-46-29.jpeg", "/gallery/municipal-office-meeting.webp", "meetings"),
  item("cafe-group-meeting", 15, "images/KakaoTalk_Photo_2026-07-18-15-03-24.jpeg", "/gallery/cafe-group-meeting.webp", "visits"),
  item("group-at-transit-terminal", 16, "images/KakaoTalk_Photo_2026-07-18-15-03-40.jpeg", "/gallery/group-at-transit-terminal.webp", "visits"),
  item("office-group-meeting", 17, "images/KakaoTalk_Photo_2026-07-18-15-03-44.jpeg", "/gallery/office-group-meeting.webp", "meetings"),
  item("office-presentation-meeting", 18, "images/KakaoTalk_Photo_2026-07-18-15-03-47.jpeg", "/gallery/office-presentation-meeting.webp", "meetings"),
  item("dakshinkali-municipality-office-group", 19, "images/KakaoTalk_Photo_2026-07-18-15-03-50.jpeg", "/gallery/dakshinkali-municipality-office-group.webp", "visits"),
  item("oxbridge-foundation-welcome-ceremony", 20, "images/KakaoTalk_Photo_2026-07-18-15-03-58 001.jpeg", "/gallery/oxbridge-foundation-welcome-ceremony.webp", "visits"),
  item("ceremonial-office-group", 21, "images/KakaoTalk_Photo_2026-07-18-15-03-58 002.jpeg", "/gallery/ceremonial-office-group.webp", "visits"),
  item("stakeholder-meeting-presentation", 22, "images/KakaoTalk_Photo_2026-07-18-15-03-59 003.jpeg", "/gallery/stakeholder-meeting-presentation.webp", "meetings"),
  item("campus-programme-display", 23, "images/KakaoTalk_Photo_2026-07-18-15-03-59 004.jpeg", "/gallery/campus-programme-display.webp", "facilities"),
  item("caregiver-training-programme-display", 24, "images/KakaoTalk_Photo_2026-07-18-15-04-00 005.jpeg", "/gallery/caregiver-training-programme-display.webp", "facilities"),
  item("kathmandu-technical-school-friday-fusion", 25, "images/KakaoTalk_Photo_2026-07-18-15-04-00 006.jpeg", "/gallery/kathmandu-technical-school-friday-fusion.webp", "facilities"),
  item("healthcare-training-classroom", 26, "images/KakaoTalk_Photo_2026-07-18-15-04-01 007.jpeg", "/gallery/healthcare-training-classroom.webp", "training"),
  item("municipal-office-ceremonial-visit", 27, "images/KakaoTalk_Photo_2026-07-18-15-04-05.jpeg", "/gallery/municipal-office-ceremonial-visit.webp", "visits"),
] as const;

/** Returns UI-ready entries with the selected copy flattened onto each item. */
export function getGalleryItems(locale: GalleryLocale): readonly LocalizedGalleryItem[] {
  return GALLERY_ITEMS.map((galleryItem) => ({
    ...galleryItem,
    ...galleryItem.copy[locale],
  }));
}
