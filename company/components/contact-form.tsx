import { ArrowRight, ClipboardText, EnvelopeSimple, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { getMessages, type Locale } from "@/lib/i18n";
import { SITE } from "@/lib/site";

const REQUEST_ITEM_KEYS = ["roleAndCount", "arrivalDate", "visa", "locationAndHousing"] as const;

export default function ContactForm({ locale }: { locale?: Locale }) {
  const form = getMessages(locale).pages.contact.form;
  const emailHref = `mailto:${SITE.email}`;

  return (
    <div className="rounded-[28px] border border-line bg-surface p-7 shadow-sm shadow-ink/5 lg:p-9">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cobalt-soft text-cobalt">
        <ClipboardText size={26} weight="duotone" aria-hidden="true" />
      </div>
      <h3 className="mt-6 font-display text-2xl font-semibold text-ink">{form.title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        {form.description}
      </p>

      <div className="mt-7 rounded-[22px] border border-line bg-paper p-5">
        <h4 className="text-sm font-semibold text-ink">{form.preparationTitle}</h4>
        <ul className="mt-4 grid gap-3 text-sm text-muted">
          {REQUEST_ITEM_KEYS.map((key) => (
            <li key={key} className="flex items-start gap-3">
              <ArrowRight size={16} className="mt-0.5 shrink-0 text-cobalt" aria-hidden="true" />
              <span>{form.preparationItems[key]}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-[18px] border border-cobalt/20 bg-cobalt-soft p-4 text-sm text-cobalt-ink">
        <WarningCircle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p>{form.notice}</p>
      </div>

      <a
        href={emailHref}
        className="mt-7 inline-flex items-center gap-2 rounded-full bg-cobalt px-5 py-3 text-sm font-semibold text-white transition hover:bg-cobalt-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-2"
      >
        <EnvelopeSimple size={18} weight="duotone" aria-hidden="true" />
        {form.status}
        <ArrowRight size={16} aria-hidden="true" />
      </a>
      <a href={emailHref} className="mt-4 block text-sm font-semibold text-cobalt underline decoration-cobalt/30 underline-offset-4 hover:decoration-cobalt">
        {SITE.email}
      </a>
    </div>
  );
}
