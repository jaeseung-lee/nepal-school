import { getGalleryPhoto } from "@/lib/gallery";
import type { Locale } from "@/lib/i18n";

/** 크게 쓰는 사진 한 장. `id`는 `lib/gallery.ts`의 실사 id, `position`은 CSS object-position. */
export interface KeyVisual {
  id: string;
  position?: string;
}

/**
 * 히어로·배너·CTA처럼 화면을 크게 차지하는 사진의 단일 출처.
 * 모두 네팔 현장 실사이며, 연출 이미지(`/kv/redesign`)는 페이지 장식에 쓰지 않는다.
 */
export const KEY_VISUALS = {
  homeHero: [
    { id: "healthcare-training-simulation-ward", position: "50% 60%" },
    { id: "campus-visit-outdoor-group", position: "50% 45%" },
    { id: "nursing-classroom-visit", position: "65% 55%" },
  ],
  process: { id: "everest-multi-skills-training-hall", position: "50% 55%" },
  processPhases: {
    localPreparation: { id: "caregiver-training-programme-display", position: "50% 40%" },
    matching: { id: "interview-candidate-conversation", position: "50% 40%" },
    afterArrival: { id: "group-at-transit-terminal", position: "50% 40%" },
  },
  legacyServices: {
    training: { id: "healthcare-training-classroom" },
    koreaVisa: { id: "interview-session-panel" },
    japanSsw: { id: "caregiver-practice-room-patient-hoist" },
  },
  cta: { id: "stakeholder-meeting-presentation" },
  pages: {
    about: { id: "campus-partnership-meeting", position: "50% 45%" },
    services: { id: "caregiver-simulation-ward-beds", position: "50% 55%" },
    why: { id: "skill-lab-v-tour", position: "50% 25%" },
    whyDetail: { id: "interview-session-panel" },
    partners: { id: "ceremonial-office-group", position: "50% 40%" },
    contact: { id: "office-presentation-meeting", position: "50% 45%" },
    gallery: { id: "healthcare-training-simulation-ward", position: "50% 60%" },
    visa: { id: "group-at-transit-terminal", position: "50% 40%" },
  },
  visas: {
    "e-9": { id: "everest-multi-skills-training-hall", position: "50% 55%" },
    "e-7": { id: "interview-room-overview", position: "50% 50%" },
    "d-2-d-4": { id: "healthcare-training-classroom", position: "50% 50%" },
    "tokutei-ginou": { id: "suyan-education-institute-visit", position: "50% 35%" },
    "tokutei-ginou-kaigo": { id: "caregiver-practice-room-patient-hoist", position: "50% 50%" },
    "tokutei-ginou-shukuhaku": { id: "hospitality-training-restaurant-lab", position: "60% 50%" },
    "ikusei-shuro": { id: "kathmandu-technical-school-friday-fusion", position: "50% 45%" },
  },
} as const satisfies {
  homeHero: readonly KeyVisual[];
  process: KeyVisual;
  processPhases: Record<string, KeyVisual>;
  legacyServices: Record<string, KeyVisual>;
  cta: KeyVisual;
  pages: Record<string, KeyVisual>;
  visas: Record<string, KeyVisual>;
};

export type VisaVisualSlug = keyof typeof KEY_VISUALS.visas;

export function getVisaVisual(slug: string): KeyVisual | undefined {
  return (KEY_VISUALS.visas as Record<string, KeyVisual>)[slug];
}

/** 테스트에서 모든 사진 id가 갤러리에 있는지 확인할 때 쓴다. */
export function listKeyVisualIds(): string[] {
  const ids: string[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (value && typeof value === "object") {
      if ("id" in value && typeof (value as KeyVisual).id === "string") return ids.push((value as KeyVisual).id);
      Object.values(value).forEach(visit);
    }
  };
  visit(KEY_VISUALS);
  return ids;
}

export function getKeyVisualPhoto(visual: KeyVisual, locale: Locale) {
  return { ...getGalleryPhoto(visual.id, locale), position: visual.position };
}
