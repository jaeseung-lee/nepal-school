import Image from "next/image";
import { getMessages, type Locale } from "@/lib/i18n";
import {
  NETWORK_GROUPS, NETWORK_REGIONS, NETWORK_INSTITUTIONS, institutionsByKind, logoPath, getLogoDimensions,
  type NetworkInstitution, type NetworkInstitutionId, type NetworkKind, type NetworkRegion,
} from "@/lib/partnership-network";

const anchorClass = "scroll-mt-28";

function Status({ item, locale, showDate = true }: { item: NetworkInstitution; locale: Locale; showDate?: boolean }) {
  const copy = getMessages(locale).network;
  if (!item.status) return null;
  return (
    <span className={`inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-2.5 py-1 text-xs font-semibold leading-relaxed ${item.status === "completed" || item.status === "supported" ? "bg-emerald-50 text-emerald-800" : "bg-cobalt-soft text-cobalt-ink"}`}>
      {copy.statuses[item.status]}
      {showDate && item.plannedStart && <time dateTime={item.plannedStart}>{item.plannedStart.replace("-", ".")}</time>}
    </span>
  );
}

function InstitutionLogo({ id, name }: { id: string; name: string }) {
  const dimensions = getLogoDimensions(id);
  return <div className="relative mx-auto h-16 w-full bg-white" style={{ maxWidth: dimensions.width }}><Image src={logoPath(id)} alt={name} fill sizes="(min-width: 1024px) 160px, 140px" className="object-contain" /></div>;
}

export function NetworkMap({ locale, target }: { locale: Locale; target: (region: NetworkRegion) => string }) {
  const copy = getMessages(locale).network;
  return (
    <figure className="rounded-3xl border border-line bg-[#f3f7fc] p-5 lg:sticky lg:top-28">
      <figcaption className="text-sm leading-relaxed text-muted">{copy.mapLabel}</figcaption>
      <nav aria-label={copy.mapLabel} className="relative mx-auto mt-5 w-full max-w-[360px]">
        <Image src="/partners/maps/korea-activities.svg" alt="" width={451} height={676} className="h-auto w-full" />
        {NETWORK_REGIONS.map((region) => (
          <a key={region.id} href={`#${target(region.id)}`} style={{ left: `${region.x}%`, top: `${region.y}%` }} className="absolute z-10 max-w-[53%] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-cobalt/20 bg-white px-2 py-1.5 text-center text-xs font-semibold leading-snug text-cobalt-ink shadow-sm transition hover:bg-cobalt hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cobalt">
            {copy.regions[region.id]}
          </a>
        ))}
      </nav>
    </figure>
  );
}

export function NetworkActivityOverview({ locale, prefix = "home-network" }: { locale: Locale; prefix?: string }) {
  const copy = getMessages(locale).network;
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
      <NetworkMap locale={locale} target={(region) => `${prefix}-${region}`} />
      <div className="grid gap-5 sm:grid-cols-2">
        {NETWORK_REGIONS.map((region) => (
          <section id={`${prefix}-${region.id}`} key={region.id} className={`${anchorClass} min-w-0 rounded-2xl border border-line bg-white p-5`}>
            <h3 className="font-display text-xl font-semibold text-ink">{copy.regions[region.id]}</h3>
            <ul className="mt-5 space-y-5">
              {NETWORK_INSTITUTIONS.filter((item) => "region" in item && item.region === region.id).map((item) => {
                const institution = copy.institutions[item.id];
                return <li key={item.id} data-network-activity={item.id} className="min-w-0 border-t border-line pt-4 first:border-0 first:pt-0">
                  <p className="text-sm font-semibold leading-relaxed text-ink">{institution.name}</p>
                  <p className="mb-2 mt-1 text-xs leading-relaxed text-muted">{institution.description}</p>
                  <Status item={item} locale={locale} />
                </li>;
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

export function NetworkLogoWall({ locale }: { locale: Locale }) {
  const copy = getMessages(locale).network;
  return <div className="space-y-10">{NETWORK_GROUPS.map((kind) => <section key={kind}>
    <h3 className="mb-5 font-display text-xl font-semibold text-ink">{copy.groups[kind]} <span className="ml-2 text-sm text-muted">{institutionsByKind(kind).length}</span></h3>
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {institutionsByKind(kind).map((item) => {
        const institution = copy.institutions[item.id as NetworkInstitutionId];
        return <li key={item.id} data-network-logo={item.id} className="min-w-0 rounded-2xl border border-line bg-white p-4">
          <InstitutionLogo id={item.id} name={institution.name} />
          <p className="mt-3 text-center text-xs font-medium leading-relaxed text-ink">{institution.name}</p>
        </li>;
      })}
    </ul>
  </section>)}</div>;
}

export function NetworkDirectory({ locale, kind, prefix }: { locale: Locale; kind: NetworkKind; prefix: string }) {
  const copy = getMessages(locale).network;
  const institutions = institutionsByKind(kind);
  const groups = kind === "partner" ? [{ id: "partner", items: institutions }] : NETWORK_REGIONS.map((region) => ({ id: region.id, items: institutions.filter((item) => item.region === region.id) })).filter((group) => group.items.length);
  return <div className="space-y-8">{groups.map((group) => <section id={`${prefix}-${group.id}`} key={group.id} className={anchorClass}>
    {kind !== "partner" && <h3 className="mb-4 text-base font-semibold text-cobalt">{copy.regions[group.id as NetworkRegion]}</h3>}
    <ul className={`grid gap-4 ${kind === "municipality" ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
      {group.items.map((item) => {
        const institution = copy.institutions[item.id as NetworkInstitutionId];
        return <li key={item.id} data-network-logo={item.id} data-network-activity={item.status ? item.id : undefined} className="min-w-0 rounded-2xl border border-line bg-white p-5">
          <div className="max-w-[180px]"><InstitutionLogo id={item.id} name={institution.name} /></div>
          <h4 className="mt-5 font-display text-lg font-semibold leading-relaxed text-ink">{institution.name}</h4>
          <p className="mb-4 mt-2 text-sm leading-relaxed text-muted">{institution.description}</p>
          <Status item={item} locale={locale} showDate={false} />
          {item.plannedStart && <p className="mt-3 text-xs leading-relaxed text-muted">{copy.plannedLabel}: <time dateTime={item.plannedStart}>{item.plannedStart.replace("-", ".")}</time></p>}
        </li>;
      })}
    </ul>
  </section>)}</div>;
}
