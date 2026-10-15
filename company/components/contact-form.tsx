import { ArrowUpRight, EnvelopeSimple, Phone } from "@phosphor-icons/react/dist/ssr";
import { getMessages, type Locale } from "@/lib/i18n";
import { SITE } from "@/lib/site";

const REQUEST_ITEM_KEYS = ["roleAndCount", "arrivalDate", "visa", "locationAndHousing"] as const;

export default function ContactForm({ locale }: { locale?: Locale }) {
  const messages = getMessages(locale);
  const form = messages.pages.contact.form;
  const emailHref = `mailto:${SITE.email}`;

  return (
    <div className="bg-paper-soft p-7 sm:p-10 lg:p-12">
      <p className="text-meta tabular-nums text-muted" aria-hidden="true">02</p>
      <h3 className="mt-4 text-title text-ink">{form.title}</h3>
      <p className="mt-3 text-description text-muted">{form.description}</p>

      <div className="mt-8 border-t border-line pt-6">
        <h4 className="text-sm font-bold text-ink">{form.preparationTitle}</h4>
        <ol className="mt-4 grid gap-3 text-sm leading-relaxed">
          {REQUEST_ITEM_KEYS.map((key, index) => (
            <li key={key} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-2">
              <span className="pt-px text-meta tabular-nums text-muted" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <span className="text-ink">{form.preparationItems[key]}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-8 border-l-2 border-ink pl-5 text-sm leading-relaxed text-ink">
        <p>{form.notice}</p>
        <p className="mt-2 text-muted">{form.reassurance}</p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {SITE.phones.map((phone) => (
          <a
            key={phone.countryCode}
            href={phone.href}
            className="flex min-h-16 items-center justify-between gap-3 border border-line bg-surface px-4 py-3 text-ink transition hover:border-ink"
          >
            <span>
              <span className="block text-xs font-medium text-muted">{messages.common.mobile}</span>
              <span className="mt-0.5 block text-sm font-semibold tabular-nums">{phone.national}</span>
            </span>
            <Phone size={18} aria-hidden="true" />
          </a>
        ))}
      </div>

      <a href={emailHref} className="pill pill-lg pill-dark mt-6 w-full sm:w-auto sm:min-w-72">
        <span className="inline-flex items-center gap-2">
          <EnvelopeSimple size={18} aria-hidden="true" />
          {form.status}
        </span>
        <ArrowUpRight size={16} weight="bold" aria-hidden="true" />
      </a>
      <a href={emailHref} className="mt-4 block text-sm font-semibold text-ink underline decoration-ink/35 underline-offset-4 hover:decoration-ink">
        {SITE.email}
      </a>
    </div>
  );
}
