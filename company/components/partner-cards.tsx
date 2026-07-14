import { BuildingOffice, Handshake, SealCheck } from "@phosphor-icons/react/dist/ssr";
import { getMessages, type Locale } from "@/lib/i18n";

const PARTNERS = [
  {
    key: "richhood",
    icon: Handshake,
  },
  { key: "sunkoshi", icon: Handshake },
  { key: "satyawati", icon: Handshake },
  { key: "bhairav", icon: SealCheck },
  { key: "ocean", icon: SealCheck },
  { key: "kathmandu", icon: SealCheck },
  { key: "koreaHousing", icon: BuildingOffice },
] as const;

export default function PartnerCards({ locale }: { locale?: Locale }) {
  const messages = getMessages(locale);
  const copy = messages.partnerCards;

  return (
    <div className="overflow-hidden rounded-[28px] border border-line bg-surface">
      <div className="border-b border-line bg-cobalt-soft p-7 lg:p-8">
        <p className="text-sm font-semibold text-cobalt">{copy.eyebrow}</p>
        <h3 className="mt-4 font-display text-3xl font-semibold text-ink">
          {copy.title}
        </h3>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          {copy.description}
        </p>
      </div>
      <ul className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3 lg:gap-5 lg:p-8">
        {PARTNERS.map((partner) => {
          const Icon = partner.icon;
          const partnerCopy = copy.partners[partner.key];
          return (
            <li key={partner.key} className="flex h-full flex-col rounded-[22px] border border-line bg-paper p-5 shadow-sm shadow-ink/5">
              <div className="flex items-start justify-between gap-4">
                <span className="inline-flex h-11 min-w-11 items-center justify-center rounded-2xl bg-surface px-3 text-sm font-bold text-cobalt">
                  {partnerCopy.country}
                </span>
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cobalt-soft text-cobalt">
                  <Icon size={22} weight="duotone" aria-hidden="true" />
                </span>
              </div>
              <h4 className="mt-5 font-display text-xl font-semibold leading-snug text-ink">{partnerCopy.name}</h4>
              <p className="mt-2 text-sm font-semibold text-cobalt">{partnerCopy.role}</p>
              <p className="mt-4 text-sm leading-relaxed text-muted">{partnerCopy.desc}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
