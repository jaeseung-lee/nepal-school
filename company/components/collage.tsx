import Image from "next/image";
import { getMessages, type Locale } from "@/lib/i18n";

const CELLS = [
  { cls: "c1", key: "training", img: "/gallery/healthcare-training-simulation-ward.webp" },
  { cls: "c2", key: "korea", img: "/gallery/hospitality-training-restaurant-lab.webp" },
  { cls: "c3", key: "japan", img: "/gallery/skill-lab-v-tour.webp" },
  { cls: "c4", key: "documents", img: "/gallery/healthcare-training-classroom.webp" },
  { cls: "c5", key: "consultation", img: "/gallery/campus-visit-outdoor-group.webp" },
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
