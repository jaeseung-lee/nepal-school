import { ArrowRight, Briefcase, GraduationCap, HouseLine } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";

const SERVICES = [
  {
    href: "/services",
    title: "현지 직업훈련",
    desc: "직무, 언어, 문화 교육을 현지에서 먼저 진행해 기업이 만나는 인재의 준비도를 높입니다.",
    image: "/kv/redesign/training.webp",
    icon: GraduationCap,
    featured: true,
  },
  {
    href: "/visa",
    title: "한국 취업비자",
    desc: "E-9, E-7, D-2, D-4, 계절근로 제도에 맞춰 채용 절차를 설계합니다.",
    image: "/kv/redesign/korea.webp",
    icon: Briefcase,
    featured: false,
  },
  {
    href: "/visa/tokutei-ginou",
    title: "일본 특정기능",
    desc: "개호와 숙박 분야를 중심으로 일본어와 기능시험을 통과한 인재를 매칭합니다.",
    image: "/kv/redesign/japan.webp",
    icon: HouseLine,
    featured: false,
  },
];

export default function ServiceCards() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
      {SERVICES.map((service) => {
        const Icon = service.icon;
        return (
          <article
            key={service.title}
            className={
              service.featured
                ? "group relative min-h-[520px] overflow-hidden rounded-[28px] border border-line bg-ink text-white lg:row-span-2"
                : "group grid overflow-hidden rounded-[24px] border border-line bg-surface shadow-sm shadow-ink/5 sm:grid-cols-[0.92fr_1fr]"
            }
          >
            <div className={service.featured ? "absolute inset-0" : "relative min-h-[220px] sm:min-h-full"}>
              <Image
                src={service.image}
                alt={`${service.title} 현장`}
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
                {service.title}
              </h3>
              <p className={service.featured ? "mt-4 max-w-xl text-base leading-relaxed text-white/78" : "mt-3 text-[15px] leading-relaxed text-muted"}>
                {service.desc}
              </p>
              <Link href={service.href} className={service.featured ? "mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-cobalt transition hover:bg-cobalt-soft" : "mt-6 inline-flex w-fit items-center gap-2 text-sm font-semibold text-cobalt transition hover:text-cobalt-ink"}>
                자세히 보기 <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
