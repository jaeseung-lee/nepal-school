import BreadcrumbSchema from "@/components/breadcrumb-schema";
import PageBanner from "@/components/page-banner";
import GalleryExplorer, {
  type GalleryDisplayItem,
  type GalleryLabels,
} from "@/components/gallery/gallery-explorer";
import { GALLERY_ITEMS, getGalleryItems, type GalleryItem } from "@/lib/gallery";
import { DEFAULT_LOCALE, getMessages, type Locale } from "@/lib/i18n";
import { KEY_VISUALS } from "@/lib/key-visuals";
import { SECTION_LABELS } from "@/lib/section-labels";

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

      <PageBanner
        locale={locale}
        label={SECTION_LABELS.pages.gallery}
        eyebrow={copy.eyebrow}
        context={formatImageCount(copy.imageCount, items.length)}
        title={copy.title}
        desc={copy.description}
        crumb={copy.title}
        photo={KEY_VISUALS.pages.gallery}
      />

      <GalleryExplorer items={items} labels={labels} />
    </main>
  );
}
