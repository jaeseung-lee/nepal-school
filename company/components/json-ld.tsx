// 범용 JSON-LD 스크립트 렌더러.
// organization-schema.tsx와 동일한 패턴 - 신뢰 소스(내부 상수)에서만 생성하므로 XSS 위험 없음.
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
