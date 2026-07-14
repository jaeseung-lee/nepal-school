import { ArrowRight, Briefcase, GraduationCap, HouseLine } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";
import { getMessages, localizedHref, type Locale } from "@/lib/i18n";

const SERVICES = [
  {
    key: "training",
    href: "/services",
    image: "/kv/redesign/training.webp",
    icon: GraduationCap,
    featured: true,
  },
  {
    key: "koreaVisa",
    href: "/visa",
    image: "/kv/redesign/korea.webp",
    icon: Briefcase,
    featured: false,
  },
  {
    key: "japanSsw",
    href: "/visa/tokutei-ginou",
    image: "/kv/redesign/japan.webp",
    icon: HouseLine,
    featured: false,
  },
] as const;

export default function ServiceCards({ locale }: { locale?: Locale }) {
  const messages = getMessages(locale);
  const serviceCards = messages.home.serviceCards;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
      {SERVICES.map((service) => {
        const Icon = service.icon;
        const copy = serviceCards[service.key];
        return (
          <article
            key={service.key}
            className={
              service.featured
                ? "group relative min-h-[520px] overflow-hidden rounded-[28px] border border-line bg-ink text-white lg:row-span-2"
                : "group grid overflow-hidden rounded-[24px] border border-line bg-surface shadow-sm shadow-ink/5 sm:grid-cols-[0.92fr_1fr]"
            }
          >
            <div className={service.featured ? "absolute inset-0" : "relative min-h-[220px] sm:min-h-full"}>
              <Image
                src={service.image}
                alt={copy.alt}
                fill
                sizes={service.featured ? "(min-width: 1024px) 650px, 100vw" : "(min-width: 1024px) 300px, 100vw"}
                className="object-cover transition duration-500 group-hover:scale-[1.03]"
              />
              {service.featured ? <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(24,26,31,0.86),rgba(24,26,31,0.16)_56%)]" aria-hidden="true" /> : null}
            </div>
            <div className={service.featured ? "relative flex h-full flex-col justify-end p-7 lg:p-9" : "flex flex-col p-6 lg:p-7"}>
              <span className={service.featured ? "mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-cobalt" : "mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-cobalt-soft text-cobalt"}>
                <Icon size={24} weight="duotone" aria-hidden="true" />
              </span>
              <h3 className={service.featured ? "font-display text-3xl font-semibold lg:text-5xl" : "font-display text-2xl font-semibold text-ink"}>
                {copy.title}
              </h3>
              <p className={service.featured ? "mt-4 max-w-xl text-base leading-relaxed text-white/78" : "mt-3 text-[15px] leading-relaxed text-muted"}>
                {copy.desc}
              </p>
              <Link href={localizedHref(locale ?? "ko", service.href)} className={service.featured ? "mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-cobalt transition hover:bg-cobalt-soft" : "mt-6 inline-flex w-fit items-center gap-2 text-sm font-semibold text-cobalt transition hover:text-cobalt-ink"}>
                {messages.common.details} <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
