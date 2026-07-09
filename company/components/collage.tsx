const CELLS = [
  { cls: "c1", label: "현지 교육", img: "/kv/col-nepal.webp" },
  { cls: "c2", label: "한국 산업현장", img: "/kv/col-korea.webp" },
  { cls: "c3", label: "일본 개호·숙박", img: "/kv/col-japan.webp" },
  { cls: "c4", label: "매칭·계약", img: "/kv/col-matching.webp" },
  { cls: "c5", label: "정착 지원", img: "/kv/col-settle.webp" },
];

/** 5칸 포토 콜라주 (홈·회사소개 공용) — 실사진 */
export default function Collage() {
  return (
    <div className="collage" aria-hidden="true">
      {CELLS.map((c) => (
        <div
          key={c.cls}
          className={`${c.cls} bg-cover bg-center`}
          style={{ backgroundImage: `url('${c.img}')` }}
          role="img"
          aria-label={c.label}
        ></div>
      ))}
    </div>
  );
}
