import logoDimensions from "./partnership-logo-dimensions.json";

/** Company presentation, pages 12–13. Statuses describe activities, not MOU or placement results. */
export const NETWORK_REGIONS = [
  { id: "capital", x: 30, y: 28 },
  { id: "gwangju", x: 21, y: 77 },
  { id: "chungcheong", x: 38, y: 44 },
  { id: "jeonbuk", x: 34, y: 62 },
  { id: "gyeongsang", x: 68, y: 59 },
  { id: "jeju", x: 20, y: 96 },
] as const;

export type NetworkRegion = (typeof NETWORK_REGIONS)[number]["id"];
export type NetworkStatus = "completed" | "ongoing" | "supported" | "planned";
export type NetworkKind = "municipality" | "university" | "partner";
export type NetworkInstitution = {
  id: string;
  kind: NetworkKind;
  region?: NetworkRegion;
  status?: NetworkStatus;
  plannedStart?: string;
};

export const NETWORK_INSTITUTIONS = [
  { id: "ganghwa", kind: "municipality", region: "capital", status: "completed" },
  { id: "yeoju", kind: "municipality", region: "capital", status: "completed" },
  { id: "anseong", kind: "municipality", region: "capital", status: "completed" },
  { id: "pyeongtaek-city", kind: "municipality", region: "capital", status: "ongoing" },
  { id: "damyang", kind: "municipality", region: "gwangju", status: "completed" },
  { id: "boseong", kind: "municipality", region: "gwangju", status: "ongoing" },
  { id: "jangheung", kind: "municipality", region: "gwangju", status: "ongoing" },
  { id: "suncheon", kind: "municipality", region: "gwangju", status: "ongoing" },
  { id: "namhae", kind: "municipality", region: "gyeongsang", status: "completed" },
  { id: "kyonggi", kind: "university", region: "capital", status: "supported" },
  { id: "pyeongtaek-university", kind: "university", region: "capital", status: "supported" },
  { id: "kimpo", kind: "university", region: "capital", status: "planned", plannedStart: "2027-03" },
  { id: "honam", kind: "university", region: "gwangju", status: "supported" },
  { id: "hanyeong", kind: "university", region: "gwangju", status: "planned", plannedStart: "2027-09" },
  { id: "cheongju", kind: "university", region: "chungcheong", status: "supported" },
  { id: "woosuk", kind: "university", region: "jeonbuk", status: "supported" },
  { id: "kijeon", kind: "university", region: "jeonbuk", status: "supported" },
  { id: "jeonbuk", kind: "university", region: "jeonbuk", status: "supported" },
  { id: "uiduk", kind: "university", region: "gyeongsang", status: "supported" },
  { id: "cheju-halla", kind: "university", region: "jeju", status: "supported" },
  { id: "jeju-tourism", kind: "university", region: "jeju", status: "supported" },
  { id: "richhood", kind: "partner" },
  { id: "sunkoshi", kind: "partner" },
  { id: "satyawati", kind: "partner" },
  { id: "bhairav", kind: "partner" },
  { id: "engate", kind: "partner" },
  { id: "ocean", kind: "partner" },
  { id: "korea-housing", kind: "partner" },
] as const satisfies readonly NetworkInstitution[];

export type NetworkInstitutionId = (typeof NETWORK_INSTITUTIONS)[number]["id"];

export const NETWORK_GROUPS = ["municipality", "university", "partner"] as const;

export function institutionsByKind(kind: NetworkKind): NetworkInstitution[] {
  return NETWORK_INSTITUTIONS.filter((institution) => institution.kind === kind);
}

export function logoPath(id: string) {
  return `/partners/logos/${id}.png`;
}

export function getLogoDimensions(id: string) {
  return logoDimensions[id as NetworkInstitutionId];
}
