import Image from "next/image";
import Link from "next/link";
import StatusMarker, { type StatusTone } from "@/components/status-marker";
import { getMessages, type Locale } from "@/lib/i18n";
import {
  NETWORK_GROUPS, NETWORK_REGIONS, hasRegions, institutionsByKind, logoPath, getLogoDimensions,
  type NetworkInstitution, type NetworkInstitutionId, type NetworkKind, type NetworkRegion, type NetworkStatus,
} from "@/lib/partnership-network";

const anchorClass = "scroll-mt-28";

/** 색 대신 모양으로 구분: 완료·지원은 채움, 진행은 반채움, 예정은 빈 원. */
const STATUS_TONE: Record<NetworkStatus, StatusTone> = {
  completed: "filled",
  supported: "filled",
  ongoing: "half",
  planned: "hollow",
};

function Status({ item, locale, showDate = true }: { item: NetworkInstitution; locale: Locale; showDate?: boolean }) {
  const copy = getMessages(locale).network;
  if (!item.status) return null;
  return (
    <StatusMarker tone={STATUS_TONE[item.status]} className="text-ink">
      {copy.statuses[item.status]}
      {showDate && item.plannedStart && <time dateTime={item.plannedStart} className="tabular-nums text-muted">{item.plannedStart.replace("-", ".")}</time>}
    </StatusMarker>
  );
}

/** 기관명이 바로 옆에 텍스트로 있으므로 로고는 장식(alt="")으로 둔다. 평소엔 흑백, 마우스를 올리면 원색. */
function InstitutionLogo({ id, align = "center" }: { id: string; align?: "center" | "start" }) {
  const dimensions = getLogoDimensions(id);
  return (
    <div className={`relative h-10 w-full sm:h-14 ${align === "center" ? "mx-auto" : ""}`} style={{ maxWidth: dimensions.width }}>
      <Image
        src={logoPath(id)}
        alt=""
        fill
        sizes="(min-width: 1024px) 160px, 140px"
        className={`${align === "center" ? "object-contain" : "object-contain object-left"} opacity-90 mix-blend-multiply grayscale transition duration-300 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-hover:grayscale-0`}
      />
    </div>
  );
}

export function NetworkMap({ locale, target, basePath = "" }: { locale: Locale; target: (region: NetworkRegion) => string; basePath?: string }) {
  const copy = getMessages(locale).network;
  return (
    <figure className="border border-line bg-surface p-6 lg:sticky lg:top-32">
      <figcaption className="text-meta text-muted">{copy.mapLabel}</figcaption>
      <nav aria-label={copy.mapLabel} className="relative mx-auto mt-6 w-full max-w-[360px]">
        <Image src="/partners/maps/korea-activities.svg" alt="" width={451} height={676} className="h-auto w-full" />
        {NETWORK_REGIONS.map((region) => (
          <Link
            key={region.id}
            href={`${basePath}#${target(region.id)}`}
            style={{ left: `${region.x}%`, top: `${region.y}%` }}
            className="absolute z-10 max-w-[53%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink/25 bg-surface px-3 py-1.5 text-center text-xs font-semibold leading-snug text-ink transition hover:border-ink hover:bg-ink hover:text-white"
          >
            {copy.regions[region.id]}
          </Link>
        ))}
      </nav>
    </figure>
  );
}

export function NetworkLogoWall({ locale }: { locale: Locale }) {
  const copy = getMessages(locale).network;
  return (
    <div className="space-y-10">
      {NETWORK_GROUPS.map((kind) => (
        <div key={kind}>
          <h4 className="flex items-baseline justify-between gap-4 border-b border-ink pb-3 text-sm font-bold text-ink">
            {copy.groups[kind]}
            <span className="text-meta tabular-nums text-muted">{institutionsByKind(kind).length}</span>
          </h4>
          <ul className="grid grid-cols-3 border-l border-line xl:grid-cols-4">
            {institutionsByKind(kind).map((item) => {
              const institution = copy.institutions[item.id as NetworkInstitutionId];
              return (
                <li key={item.id} data-network-logo={item.id} className="group min-w-0 border-b border-r border-line bg-surface px-2 py-4 sm:px-3 sm:py-5">
                  <InstitutionLogo id={item.id} />
                  <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">{institution.name}</p>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function NetworkDirectory({ locale, kind, prefix }: { locale: Locale; kind: NetworkKind; prefix: string }) {
  const copy = getMessages(locale).network;
  const institutions = institutionsByKind(kind);
  const regional = hasRegions(kind);
  const groups = regional ? NETWORK_REGIONS.map((region) => ({ id: region.id, items: institutions.filter((item) => item.region === region.id) })).filter((group) => group.items.length) : [{ id: kind, items: institutions }];
  // 지역 소제목(h3)이 없는 협력기관 묶음은 기관명이 바로 h3가 되어 제목 단계를 건너뛰지 않는다.
  const NameHeading = regional ? "h4" : "h3";
  return (
    <div className="space-y-12">
      {groups.map((group) => (
        <section id={`${prefix}-${group.id}`} key={group.id} className={anchorClass}>
          {regional && <h3 className="border-b border-ink pb-3 text-sm font-bold text-ink">{copy.regions[group.id as NetworkRegion]}</h3>}
          <ul className={`grid border-l border-line ${regional ? "" : "border-t"} ${kind === "municipality" ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
            {group.items.map((item) => {
              const institution = copy.institutions[item.id as NetworkInstitutionId];
              return (
                <li key={item.id} data-network-logo={item.id} data-network-activity={item.status ? item.id : undefined} className="group min-w-0 border-b border-r border-line bg-surface p-6">
                  <div className="max-w-[180px]"><InstitutionLogo id={item.id} align="start" /></div>
                  <NameHeading className="mt-6 text-lg font-bold leading-snug tracking-[-0.02em] text-ink">{institution.name}</NameHeading>
                  <p className="mb-5 mt-2 text-sm leading-relaxed text-muted">{institution.description}</p>
                  <Status item={item} locale={locale} showDate={false} />
                  {item.plannedStart && <p className="mt-3 text-meta text-muted">{copy.plannedLabel}: <time dateTime={item.plannedStart} className="tabular-nums">{item.plannedStart.replace("-", ".")}</time></p>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
