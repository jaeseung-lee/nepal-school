import type { LpV1Locale } from "@/lib/lp-v1-copy";

export type LpV1GalleryGroup = "training" | "partnership";

export type LpV1GalleryAspect = "landscape" | "portrait";

export type LpV1GalleryLayout = "lead" | "wide" | "standard" | "portrait";

export type LpV1GalleryCopy = {
  alt: string;
  caption: string;
};

export type LpV1GalleryItem = {
  id: string;
  src: `/lp/v1/${string}.webp` | `/gallery/${string}.webp`;
  group: LpV1GalleryGroup;
  order: number;
  width: number;
  height: number;
  aspect: LpV1GalleryAspect;
  layout: LpV1GalleryLayout;
  objectPosition: `${number}% ${number}%`;
  pdfOrder?: number;
  copy: Readonly<Record<LpV1Locale, LpV1GalleryCopy>>;
};

export type LocalizedLpV1GalleryItem = LpV1GalleryItem & LpV1GalleryCopy;

/**
 * Landing-page evidence inventory shared by the web contact sheet and catalog.
 * Copy stays descriptive: it records what is visible without making outcome,
 * qualification, employment, or legal-partnership claims.
 */
export const LP_V1_GALLERY_ITEMS: readonly LpV1GalleryItem[] = [
  {
    id: "caregiver-practice",
    src: "/lp/v1/caregiver-practice.webp",
    group: "training",
    order: 1,
    width: 1600,
    height: 900,
    aspect: "landscape",
    layout: "lead",
    objectPosition: "50% 50%",
    pdfOrder: 1,
    copy: {
      ko: {
        alt: "KTS 교육생들이 병상 주변에서 돌봄 실습을 진행하는 모습",
        caption: "병상 주변에서 진행한 돌봄 실습",
      },
      ja: {
        alt: "KTSの受講生がベッドの周りで介護実習に取り組む様子",
        caption: "ベッド周辺で行う介護実習",
      },
    },
  },
  {
    id: "caregiver-mobility",
    src: "/lp/v1/caregiver-mobility.webp",
    group: "training",
    order: 2,
    width: 1200,
    height: 1600,
    aspect: "portrait",
    layout: "portrait",
    objectPosition: "48% 48%",
    pdfOrder: 2,
    copy: {
      ko: {
        alt: "KTS 실습 공간에서 휠체어 이동 보조를 연습하는 모습",
        caption: "휠체어 이동 보조 실습",
      },
      ja: {
        alt: "KTSの実習スペースで車いすの移動介助を練習する様子",
        caption: "車いすの移動介助実習",
      },
    },
  },
  {
    id: "healthcare-training-classroom",
    src: "/gallery/healthcare-training-classroom.webp",
    group: "training",
    order: 3,
    width: 1400,
    height: 1050,
    aspect: "landscape",
    layout: "wide",
    objectPosition: "50% 47%",
    pdfOrder: 3,
    copy: {
      ko: {
        alt: "보건·돌봄 교육 강의실에서 교육생들이 자리에 앉아 있는 모습",
        caption: "보건·돌봄 교육 강의실",
      },
      ja: {
        alt: "保健・介護研修の教室で受講生が着席している様子",
        caption: "保健・介護研修の教室",
      },
    },
  },
  {
    id: "nursing-classroom-visit",
    src: "/gallery/nursing-classroom-visit.webp",
    group: "training",
    order: 4,
    width: 1600,
    height: 1200,
    aspect: "landscape",
    layout: "standard",
    objectPosition: "50% 45%",
    copy: {
      ko: {
        alt: "교실 방문 중 교육생들과 방문자가 함께 서 있는 모습",
        caption: "교실 방문 중 함께한 교육생들",
      },
      ja: {
        alt: "教室訪問の際に受講生と訪問者が並んで立つ様子",
        caption: "教室訪問で受講生と交流",
      },
    },
  },
  {
    id: "caregiver-training-programme-display",
    src: "/gallery/caregiver-training-programme-display.webp",
    group: "training",
    order: 5,
    width: 1400,
    height: 1050,
    aspect: "landscape",
    layout: "standard",
    objectPosition: "48% 50%",
    copy: {
      ko: {
        alt: "교육 공간에 Caregiver Training Programme 사진 안내판이 전시된 모습",
        caption: "Caregiver Training Programme 안내 전시",
      },
      ja: {
        alt: "研修スペースにCaregiver Training Programmeの写真パネルが展示された様子",
        caption: "Caregiver Training Programmeの案内展示",
      },
    },
  },
  {
    id: "campus-programme-display",
    src: "/gallery/campus-programme-display.webp",
    group: "training",
    order: 6,
    width: 1400,
    height: 1050,
    aspect: "landscape",
    layout: "standard",
    objectPosition: "50% 50%",
    copy: {
      ko: {
        alt: "KTS 캠퍼스 교육 공간에 과정 사진 안내판이 전시된 모습",
        caption: "캠퍼스 과정 안내 전시",
      },
      ja: {
        alt: "KTSキャンパスの研修スペースにコース写真パネルが展示された様子",
        caption: "キャンパスのコース案内展示",
      },
    },
  },
  {
    id: "campus-welcome-garlanded-guests",
    src: "/gallery/campus-welcome-garlanded-guests.webp",
    group: "partnership",
    order: 7,
    width: 1200,
    height: 1600,
    aspect: "portrait",
    layout: "portrait",
    objectPosition: "50% 48%",
    copy: {
      ko: {
        alt: "캠퍼스 건물 앞에서 화환을 두른 방문객과 관계자들이 함께 선 모습",
        caption: "캠퍼스 방문객 환영 장면",
      },
      ja: {
        alt: "キャンパスの建物前で花輪を掛けた訪問者と関係者が並ぶ様子",
        caption: "キャンパス訪問者の歓迎場面",
      },
    },
  },
  {
    id: "campus-partnership-meeting",
    src: "/gallery/campus-partnership-meeting.webp",
    group: "partnership",
    order: 8,
    width: 2200,
    height: 1650,
    aspect: "landscape",
    layout: "standard",
    objectPosition: "50% 48%",
    pdfOrder: 4,
    copy: {
      ko: {
        alt: "캠퍼스 회의실에서 방문자와 기관 관계자들이 테이블에 앉아 대화하는 모습",
        caption: "캠퍼스 회의실에서 진행한 대화",
      },
      ja: {
        alt: "キャンパスの会議室で訪問者と機関関係者がテーブルを囲んで話す様子",
        caption: "キャンパス会議室での対話",
      },
    },
  },
  {
    id: "campus-visit-outdoor-group",
    src: "/gallery/campus-visit-outdoor-group.webp",
    group: "partnership",
    order: 9,
    width: 1600,
    height: 1200,
    aspect: "landscape",
    layout: "standard",
    objectPosition: "50% 47%",
    copy: {
      ko: {
        alt: "캠퍼스 방문 중 야외에서 네 명이 함께 선 모습",
        caption: "캠퍼스 방문 중 야외 기록",
      },
      ja: {
        alt: "キャンパス訪問中に屋外で4人が並んで立つ様子",
        caption: "キャンパス訪問時の屋外記録",
      },
    },
  },
  {
    id: "visiting-group-building-entrance",
    src: "/gallery/visiting-group-building-entrance.webp",
    group: "partnership",
    order: 10,
    width: 960,
    height: 1280,
    aspect: "portrait",
    layout: "portrait",
    objectPosition: "50% 48%",
    copy: {
      ko: {
        alt: "방문자와 기관 관계자들이 건물 입구 앞에 함께 선 모습",
        caption: "기관 건물 입구에서 남긴 방문 기록",
      },
      ja: {
        alt: "訪問者と機関関係者が建物の入口前に並んで立つ様子",
        caption: "施設入口での訪問記録",
      },
    },
  },
  {
    id: "institutional-visit-group-wide",
    src: "/gallery/institutional-visit-group-wide.webp",
    group: "partnership",
    order: 11,
    width: 1280,
    height: 960,
    aspect: "landscape",
    layout: "wide",
    objectPosition: "50% 47%",
    copy: {
      ko: {
        alt: "기관 사무실에서 방문자와 관계자들이 단체로 함께 선 모습",
        caption: "기관 방문 중 촬영한 단체 기록",
      },
      ja: {
        alt: "機関のオフィスで訪問者と関係者が一緒に並ぶ様子",
        caption: "機関訪問時のグループ記録",
      },
    },
  },
  {
    id: "dakshinkali-municipality-partnership-visit",
    src: "/gallery/dakshinkali-municipality-partnership-visit.webp",
    group: "partnership",
    order: 12,
    width: 1650,
    height: 2200,
    aspect: "portrait",
    layout: "portrait",
    objectPosition: "50% 50%",
    pdfOrder: 5,
    copy: {
      ko: {
        alt: "Dakshinkali 지방자치단체 청사 앞에서 방문자와 관계자들이 함께 선 모습",
        caption: "Dakshinkali 지방자치단체 방문",
      },
      ja: {
        alt: "Dakshinkali自治体庁舎前で訪問者と関係者が並んで立つ様子",
        caption: "Dakshinkali自治体への訪問",
      },
    },
  },
  {
    id: "municipal-office-meeting",
    src: "/gallery/municipal-office-meeting.webp",
    group: "partnership",
    order: 13,
    width: 1600,
    height: 1200,
    aspect: "landscape",
    layout: "standard",
    objectPosition: "50% 50%",
    copy: {
      ko: {
        alt: "지방자치단체 사무실에서 방문자와 관계자들이 함께 선 모습",
        caption: "지방자치단체 사무실 방문 기록",
      },
      ja: {
        alt: "自治体の執務室で訪問者と関係者が並んで立つ様子",
        caption: "自治体庁舎訪問の記録",
      },
    },
  },
  {
    id: "office-presentation-meeting",
    src: "/gallery/office-presentation-meeting.webp",
    group: "partnership",
    order: 14,
    width: 1280,
    height: 960,
    aspect: "landscape",
    layout: "standard",
    objectPosition: "58% 50%",
    pdfOrder: 6,
    copy: {
      ko: {
        alt: "사무실 회의에서 화면 자료를 보며 발표와 대화를 진행하는 모습",
        caption: "화면 자료를 활용한 사무실 회의",
      },
      ja: {
        alt: "オフィスの会議で画面資料を見ながら説明と対話を行う様子",
        caption: "画面資料を用いたオフィス会議",
      },
    },
  },
  {
    id: "oxbridge-foundation-welcome-ceremony",
    src: "/gallery/oxbridge-foundation-welcome-ceremony.webp",
    group: "partnership",
    order: 15,
    width: 1440,
    height: 1080,
    aspect: "landscape",
    layout: "standard",
    objectPosition: "50% 50%",
    copy: {
      ko: {
        alt: "Oxbridge Foundation 표지 앞에서 방문객에게 환영 선물을 전하는 모습",
        caption: "Oxbridge Foundation 환영 장면",
      },
      ja: {
        alt: "Oxbridge Foundationの表示前で訪問者に歓迎の品を渡す様子",
        caption: "Oxbridge Foundationでの歓迎場面",
      },
    },
  },
  {
    id: "stakeholder-meeting-presentation",
    src: "/gallery/stakeholder-meeting-presentation.webp",
    group: "partnership",
    order: 16,
    width: 1440,
    height: 1080,
    aspect: "landscape",
    layout: "standard",
    objectPosition: "50% 50%",
    copy: {
      ko: {
        alt: "회의 참석자들이 화면의 발표 자료를 함께 확인하는 모습",
        caption: "발표 자료를 확인하는 회의",
      },
      ja: {
        alt: "会議の参加者が画面の説明資料を一緒に確認する様子",
        caption: "説明資料を確認する会議",
      },
    },
  },
] as const;

/** Returns the ordered inventory with Korean or Japanese copy flattened for UI/PDF use. */
export function getLpV1GalleryItems(locale: LpV1Locale): readonly LocalizedLpV1GalleryItem[] {
  return LP_V1_GALLERY_ITEMS.map((item) => ({
    ...item,
    ...item.copy[locale],
  }));
}
