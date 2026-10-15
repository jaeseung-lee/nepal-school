import { Fragment } from "react";
import type { Visa } from "@/lib/visas";

// 비자 페이지의 공식 기준 자료 한 줄. 라벨은 getLocalizedVisa가 언어별 카탈로그에서 채운다.
export default function VisaSources({ heading, sources }: { heading: string; sources: NonNullable<Visa["sources"]> }) {
  return (
    <p className="max-w-3xl text-meta text-muted">
      {heading}:{" "}
      {sources.map((source, index) => (
        <Fragment key={source.key}>
          {index > 0 ? ", " : null}
          {source.href ? (
            <a
              href={source.href}
              className="font-medium text-ink underline decoration-ink/35 underline-offset-4 hover:decoration-ink"
              target="_blank"
              rel="noopener noreferrer"
            >
              {source.label}
            </a>
          ) : (
            source.label
          )}
        </Fragment>
      ))}
    </p>
  );
}
