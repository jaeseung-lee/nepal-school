export const SALES_LIST_PAGE_SIZE = 25;

export const SALES_LIST_VIEW_COOKIES = {
  jobs: "sales_jobs_view",
  companies: "sales_companies_view",
} as const;

export type SalesListScope = keyof typeof SALES_LIST_VIEW_COOKIES;
export type SalesListView = "table" | "cards";
export type SearchParamSource = URLSearchParams | Record<string, string | string[] | undefined>;

const JOB_STATUSES = ["all", "active", "missing", "closed"] as const;
const EMPLOYMENT_TYPES = ["all", "FULL_TIME", "PART_TIME", "CONTRACTOR", "TEMPORARY", "INTERN", "VOLUNTEER", "PER_DIEM", "OTHER"] as const;
const GRADES = ["all", "A", "B", "C"] as const;
const ORGANIZATION_TYPES = ["all", "direct_employer", "agency", "unknown"] as const;
const FRESHNESS_VALUES = ["all", "new"] as const;
const COMPANY_STAGES = ["all", "unreviewed", "researching", "contact_ready", "contacted", "follow_up", "meeting", "proposal", "won", "lost", "do_not_contact"] as const;
const CONTACT_STATUSES = ["all", "verified", "pending", "rejected", "none"] as const;

export const FILTERABLE_EMPLOYMENT_TYPES = EMPLOYMENT_TYPES.filter((value) => value !== "all");

export type JobListParams = {
  q: string;
  status: (typeof JOB_STATUSES)[number];
  region: string;
  employment: (typeof EMPLOYMENT_TYPES)[number];
  grade: (typeof GRADES)[number];
  companyType: (typeof ORGANIZATION_TYPES)[number];
  freshness: (typeof FRESHNESS_VALUES)[number];
  page: number;
};

export type CompanyListParams = {
  q: string;
  stage: (typeof COMPANY_STAGES)[number];
  grade: (typeof GRADES)[number];
  contact: (typeof CONTACT_STATUSES)[number];
  owner: string;
  page: number;
};

function valueFrom(source: SearchParamSource, key: string) {
  if (source instanceof URLSearchParams) return source.get(key) ?? "";
  const value = source[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function textValue(source: SearchParamSource, key: string, maxLength: number) {
  return valueFrom(source, key).trim().slice(0, maxLength);
}

function enumValue<const Values extends readonly string[]>(source: SearchParamSource, key: string, values: Values, fallback: Values[number]) {
  const value = valueFrom(source, key);
  return (values as readonly string[]).includes(value) ? (value as Values[number]) : fallback;
}

export function parsePage(value: string | string[] | null | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw)) return 1;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 1_000_000 ? parsed : 1;
}

export function parseJobListParams(source: SearchParamSource): JobListParams {
  return {
    q: textValue(source, "q", 120),
    status: enumValue(source, "status", JOB_STATUSES, "all"),
    region: textValue(source, "region", 80),
    employment: enumValue(source, "employment", EMPLOYMENT_TYPES, "all"),
    grade: enumValue(source, "grade", GRADES, "all"),
    companyType: enumValue(source, "companyType", ORGANIZATION_TYPES, "all"),
    freshness: enumValue(source, "freshness", FRESHNESS_VALUES, "all"),
    page: parsePage(valueFrom(source, "page")),
  };
}

export function parseCompanyListParams(source: SearchParamSource): CompanyListParams {
  const owner = valueFrom(source, "owner");
  return {
    q: textValue(source, "q", 120),
    stage: enumValue(source, "stage", COMPANY_STAGES, "all"),
    grade: enumValue(source, "grade", GRADES, "all"),
    contact: enumValue(source, "contact", CONTACT_STATUSES, "all"),
    owner: owner === "all" || /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(owner) ? owner || "all" : "all",
    page: parsePage(valueFrom(source, "page")),
  };
}

export function pageRange(page: number, pageSize = SALES_LIST_PAGE_SIZE) {
  const from = (Math.max(1, page) - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

export function totalPages(total: number, pageSize = SALES_LIST_PAGE_SIZE) {
  return Math.max(1, Math.ceil(Math.max(0, total) / pageSize));
}

export function clampPage(page: number, total: number, pageSize = SALES_LIST_PAGE_SIZE) {
  return Math.min(Math.max(1, page), totalPages(total, pageSize));
}

export function resultRange(page: number, total: number, pageSize = SALES_LIST_PAGE_SIZE) {
  if (total <= 0) return { from: 0, to: 0 };
  const from = (clampPage(page, total, pageSize) - 1) * pageSize + 1;
  return { from, to: Math.min(total, from + pageSize - 1) };
}

export type PaginationItem = number | "ellipsis-start" | "ellipsis-end";

export function paginationItems(current: number, pages: number): PaginationItem[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, index) => index + 1);
  const visible = new Set([1, pages, current - 2, current - 1, current, current + 1, current + 2]);
  const numbers = [...visible].filter((page) => page >= 1 && page <= pages).sort((a, b) => a - b);
  const items: PaginationItem[] = [];
  numbers.forEach((page, index) => {
    const previous = numbers[index - 1];
    if (previous && page - previous > 1) items.push(previous === 1 ? "ellipsis-start" : "ellipsis-end");
    items.push(page);
  });
  return items;
}

export function buildListHref(pathname: string, params: Record<string, string | number | undefined>, page: number) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (key === "page" || value == null || value === "" || value === "all") return;
    search.set(key, String(value));
  });
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function parseListView(value: string | null | undefined): SalesListView {
  return value === "cards" ? "cards" : "table";
}

export function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}
