import { ArrowRight, ClipboardText, GlobeHemisphereEast, UserFocus } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import { getMessages, type Locale } from "@/lib/i18n";

const PHASES = [
  {
    key: "localPreparation",
    stepKeys: ["selection", "training", "exam"],
    icon: UserFocus,
  },
  {
    key: "matching",
    stepKeys: ["matching", "contractVisa"],
    icon: ClipboardText,
  },
  {
    key: "afterArrival",
    stepKeys: ["arrival", "settlement"],
    icon: GlobeHemisphereEast,
  },
] as const;

export default function ProcessSteps({ locale }: { locale?: Locale }) {
  const process = getMessages(locale).home.process;

  return (
    <section className="border-y border-line bg-paper-soft">
      <div className="max-w-content mx-auto grid gap-10 px-5 py-20 lg:grid-cols-[0.9fr_1.25fr] lg:px-8 lg:py-28">
        <div>
          <h2 className="font-display text-3xl font-semibold text-ink lg:text-5xl">
            {process.title}
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
            {process.description}
          </p>
          <div className="relative mt-8 min-h-[260px] overflow-hidden rounded-[28px] border border-line bg-gray-100">
            <Image src="/kv/redesign/process.webp" alt={process.alt} fill sizes="(min-width: 1024px) 430px, 100vw" className="object-cover" />
          </div>
        </div>
        <div className="grid gap-4">
          {PHASES.map((phase) => {
            const Icon = phase.icon;
            const translatedPhase = process.phases[phase.key];
            const steps = phase.stepKeys.map((key) => (translatedPhase.steps as Record<string, string>)[key]);
            return (
              <article key={phase.key} className="rounded-[24px] border border-line bg-surface p-6 shadow-sm shadow-ink/5">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cobalt-soft text-cobalt">
                    <Icon size={25} weight="duotone" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-display text-2xl font-semibold text-ink">{translatedPhase.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{translatedPhase.desc}</p>
                  </div>
                </div>
                <ol className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {steps.map((step, index) => (
                    <li key={step} className="flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink">
                      {step}
                      {index < phase.stepKeys.length - 1 ? <ArrowRight size={14} className="text-cobalt" aria-hidden="true" /> : null}
                    </li>
                  ))}
                </ol>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
