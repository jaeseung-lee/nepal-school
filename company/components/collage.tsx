import Image from "next/image";
import { getMessages, type Locale } from "@/lib/i18n";

const CELLS = [
  { cls: "c1", key: "training", img: "/kv/redesign/training.webp" },
  { cls: "c2", key: "korea", img: "/kv/redesign/korea.webp" },
  { cls: "c3", key: "japan", img: "/kv/redesign/japan.webp" },
  { cls: "c4", key: "documents", img: "/kv/redesign/process.webp" },
  { cls: "c5", key: "consultation", img: "/kv/redesign/contact.webp" },
] as const;

export default function Collage({ locale }: { locale?: Locale }) {
  const messages = getMessages(locale);

  return (
    <div className="collage" aria-hidden="true">
      {CELLS.map((cell) => (
        <div key={cell.cls} className={`${cell.cls} relative bg-gray-100`}>
          <Image src={cell.img} alt={messages.home.collage[cell.key].label} fill sizes="(min-width: 1024px) 46vw, 100vw" className="object-cover" />
        </div>
      ))}
    </div>
  );
}
