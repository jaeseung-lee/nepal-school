import Image from "next/image";
import BreadcrumbSchema from "@/components/breadcrumb-schema";
import GalleryExplorer, {
  type GalleryDisplayItem,
  type GalleryLabels,
} from "@/components/gallery/gallery-explorer";
import { GALLERY_ITEMS, getGalleryItems, type GalleryItem } from "@/lib/gallery";
import { DEFAULT_LOCALE, getMessages, type Locale } from "@/lib/i18n";

type GallerySourceItem = GalleryItem & {
  alt?: string;
  caption?: string;
  title?: string;
  description?: string;
};

function localizeItem(item: GallerySourceItem, locale: Locale): GalleryDisplayItem {
  const localizedCopy = item.copy[locale] ?? item.copy[DEFAULT_LOCALE];

  return {
    id: item.id,
    src: item.src,
    category: item.category,
    order: item.order,
    alt: item.alt ?? localizedCopy?.alt ?? "",
    caption: item.caption
      ?? item.description
      ?? item.title
      ?? localizedCopy?.description
      ?? localizedCopy?.title
      ?? "",
  };
}

function formatImageCount(template: string, count: number) {
  return template.replace("{count}", String(count));
}

export function GalleryContent({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const copy = getMessages(locale).pages.gallery;
  const localizedSourceItems: readonly GallerySourceItem[] = getGalleryItems(locale);
  const sourceItems = localizedSourceItems.length
    ? localizedSourceItems
    : GALLERY_ITEMS;
  const items = sourceItems.map((item) => localizeItem(item, locale));
  const heroItem = items.find((item) => item.src === "/gallery/healthcare-training-simulation-ward.webp") ?? items[0];
  const labels: GalleryLabels = {
    allCategories: copy.allCategories,
    categories: copy.categories,
    filterLabel: copy.filterLabel,
    viewImage: copy.viewImage,
    previous: copy.previous,
    next: copy.next,
    close: copy.close,
    empty: copy.empty,
    dialogLabel: copy.dialogLabel,
  };

  return (
    <main>
      <BreadcrumbSchema name={copy.title} path="/gallery" locale={locale} />

      <section className="border-b border-line bg-paper-soft">
        <div className="max-w-content mx-auto grid gap-8 px-5 py-14 lg:grid-cols-[0.88fr_1.12fr] lg:gap-12 lg:px-8 lg:py-20">
          <div className="flex flex-col justify-end">
            <p className="text-sm font-semibold text-cobalt">{copy.eyebrow}</p>
            <h1 className="mt-4 max-w-xl font-display text-4xl font-semibold leading-[1.06] text-ink text-balance lg:text-6xl">
              {copy.title}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted lg:text-lg">
              {copy.description}
            </p>
            <p className="mt-8 border-l-2 border-cobalt pl-3 text-xs font-semibold uppercase tracking-[0.15em] text-cobalt">
              {formatImageCount(copy.imageCount, items.length)}
            </p>
          </div>

          <div className="relative min-h-[260px] overflow-hidden bg-gray-200 sm:min-h-[340px] lg:min-h-[400px]">
            {heroItem ? (
              <Image
                src={heroItem.src}
                alt={heroItem.alt}
                fill
                priority
                sizes="(min-width: 1024px) 58vw, 100vw"
                className="object-cover"
              />
            ) : null}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,29,65,0.32),transparent_58%)]" aria-hidden="true" />
          </div>
        </div>
      </section>

      <GalleryExplorer items={items} labels={labels} />
    </main>
  );
}
