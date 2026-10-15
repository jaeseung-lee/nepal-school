import type { ReactNode } from "react";

interface SectionHeadProps {
  /** 영문 장식 라벨이면 labelLang="en"(기본값), 각 언어 문구면 undefined로 넘긴다. */
  label?: string;
  labelLang?: string;
  /** 서브페이지 섹션 번호("01"). 라벨 대신 작은 숫자로 보인다. */
  index?: string;
  title: ReactNode;
  titleId?: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** 섹션 머리: 왼쪽에 라벨과 제목, 오른쪽에 설명과 보조 링크 (레퍼런스의 section-head 패턴). */
export default function SectionHead({ label, labelLang = "en", index, title, titleId, description, action, className = "" }: SectionHeadProps) {
  return (
    <div className={`mb-12 flex flex-col gap-8 lg:mb-16 lg:flex-row lg:items-end lg:justify-between lg:gap-16 ${className}`}>
      <div className="max-w-3xl">
        {index ? (
          <p className="text-meta tabular-nums text-muted" aria-hidden="true">
            {index}
          </p>
        ) : label ? (
          <p className="eyebrow text-ink" lang={labelLang}>
            {label}
          </p>
        ) : null}
        <h2 id={titleId} className={`text-headline text-balance text-ink ${index || label ? (index ? "mt-4" : "mt-5") : ""}`}>
          {title}
        </h2>
      </div>
      {description || action ? (
        <div className="flex max-w-[30rem] flex-col items-start gap-6 lg:shrink-0 lg:basis-[30rem]">
          {description ? <p className="text-description text-muted">{description}</p> : null}
          {action}
        </div>
      ) : null}
    </div>
  );
}
