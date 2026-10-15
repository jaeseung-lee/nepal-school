// 범용 JSON-LD 스크립트 렌더러.
// 블로그 제목·요약 같은 콘텐츠 문자열도 들어오므로 `<`를 유니코드 이스케이프로 바꿔
// 본문에 `</script>`가 섞여도 스크립트 블록을 닫지 못하게 한다(JSON 값은 그대로).
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
