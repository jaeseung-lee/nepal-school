import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import { getMessages, type Locale } from "@/lib/i18n";
import { getKeyVisualPhoto, KEY_VISUALS } from "@/lib/key-visuals";
import { SECTION_LABELS } from "@/lib/section-labels";

const PHASES = [
  {
    key: "localPreparation",
    stepKeys: ["selection", "training", "exam"],
    visual: KEY_VISUALS.processPhases.localPreparation,
  },
  {
    key: "matching",
    stepKeys: ["matching", "contractVisa"],
    visual: KEY_VISUALS.processPhases.matching,
  },
  {
    key: "afterArrival",
    stepKeys: ["arrival", "settlement"],
    visual: KEY_VISUALS.processPhases.afterArrival,
  },
] as const;

/** 3단계 7개 절차에 이어지는 번호를 매기기 위한 단계별 시작 번호. */
const STEP_OFFSETS = PHASES.map((_, index) => PHASES.slice(0, index).reduce((count, phase) => count + phase.stepKeys.length, 0));

function twoDigits(value: number) {
  return String(value).padStart(2, "0");
}

export default function ProcessSteps({ locale = "ko" }: { locale?: Locale }) {
  const process = getMessages(locale).home.process;
  const overview = getKeyVisualPhoto(KEY_VISUALS.process, locale);

  return (
    <section aria-labelledby="process-title" className="border-y border-line bg-surface py-section">
      <div className="page-wrap">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="relative aspect-[1.93] overflow-hidden bg-image">
            <Image
              src={overview.src}
              alt={overview.alt}
              fill
              sizes="(min-width: 1440px) 660px, (min-width: 1024px) 50vw, 100vw"
              style={{ objectPosition: overview.position }}
              className="object-cover"
            />
          </div>
          <div className="lg:pl-4">
            <p className="eyebrow text-ink" lang="en">
              {SECTION_LABELS.process}
            </p>
            <h2 id="process-title" className="mt-5 max-w-[22em] text-subhead text-balance text-ink">
              {process.title}
            </h2>
            <p className="mt-5 max-w-[32.5rem] text-description text-muted">{process.description}</p>
          </div>
        </div>

        <ol className="mt-14 grid gap-x-7 gap-y-12 md:grid-cols-3 lg:mt-20">
          {PHASES.map((phase, phaseIndex) => {
            const translatedPhase = process.phases[phase.key];
            const photo = getKeyVisualPhoto(phase.visual, locale);
            const steps = phase.stepKeys.map((key) => (translatedPhase.steps as Record<string, string>)[key]);

            return (
              <li key={phase.key}>
                <div className="relative aspect-[1.93] overflow-hidden bg-image">
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    sizes="(min-width: 1440px) 430px, (min-width: 768px) 30vw, 100vw"
                    style={{ objectPosition: photo.position }}
                    className="object-cover"
                  />
                </div>
                <p className="mt-6 text-meta tabular-nums text-muted" aria-hidden="true">
                  {twoDigits(phaseIndex + 1)}
                </p>
                <h3 className="mt-2 text-lg font-[650] tracking-[-0.02em] text-ink">{translatedPhase.title}</h3>
                <p className="mt-2 text-[13px] leading-[1.85] text-muted">{translatedPhase.desc}</p>
                <ol className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-line pt-4 text-[13px] font-semibold text-ink">
                  {steps.map((step, index) => (
                    <li key={step} className="flex items-center gap-2">
                      <span className="text-meta tabular-nums text-muted" aria-hidden="true">
                        {twoDigits(STEP_OFFSETS[phaseIndex] + index + 1)}
                      </span>
                      {step}
                      {index < steps.length - 1 ? <ArrowRight size={12} className="text-muted" aria-hidden="true" /> : null}
                    </li>
                  ))}
                </ol>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
