import Image from "next/image";

const CELLS = [
  { cls: "c1", label: "현지 직업훈련", img: "/kv/redesign/training.webp" },
  { cls: "c2", label: "한국 산업 현장", img: "/kv/redesign/korea.webp" },
  { cls: "c3", label: "일본 개호와 숙박 준비", img: "/kv/redesign/japan.webp" },
  { cls: "c4", label: "비자와 계약 문서", img: "/kv/redesign/process.webp" },
  { cls: "c5", label: "상담 준비", img: "/kv/redesign/contact.webp" },
];

export default function Collage() {
  return (
    <div className="collage" aria-hidden="true">
      {CELLS.map((cell) => (
        <div key={cell.cls} className={`${cell.cls} relative bg-gray-100`}>
          <Image src={cell.img} alt={cell.label} fill sizes="(min-width: 1024px) 46vw, 100vw" className="object-cover" />
        </div>
      ))}
    </div>
  );
}
