import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BusinessAreaDetail from "@/components/business-area/business-area-detail";
import LegacyLpLocaleBridge from "@/components/business-area/legacy-lp-locale-bridge";
import CaregiverPageSchema from "@/components/lp/caregiver-page-schema";
import KtsCaregiverLanding from "@/components/lp/kts-caregiver-landing";
import {
  BUSINESS_AREA_SLUGS,
  getBusinessArea,
  isBusinessAreaSlug,
} from "@/lib/business-areas";
import { buildBusinessAreaMetadata } from "@/lib/business-area-seo";
import { LP_V1_META } from "@/lib/lp-v1-copy";

type BusinessAreaPageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return BUSINESS_AREA_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: BusinessAreaPageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isBusinessAreaSlug(slug)) return {};
  const area = getBusinessArea("ko", slug);
  if (!area) return {};
  const caregiverMetadata = LP_V1_META.ko;
  const metadata = buildBusinessAreaMetadata({
    locale: "ko",
    slug,
    title: slug === "japan-caregiver" ? caregiverMetadata.title : area.meta.title,
    description: slug === "japan-caregiver" ? caregiverMetadata.description : area.meta.description,
    image:
      slug === "japan-caregiver"
        ? { src: "/lp/v1/og.png", alt: caregiverMetadata.title, width: 1200, height: 630 }
        : area.evidence.images[0],
  });

  if (slug !== "japan-caregiver") return metadata;
  return {
    ...metadata,
    title: { absolute: caregiverMetadata.title },
    openGraph: metadata.openGraph ? { ...metadata.openGraph, title: caregiverMetadata.title } : undefined,
    twitter: metadata.twitter ? { ...metadata.twitter, title: caregiverMetadata.title } : undefined,
  };
}

export default async function BusinessAreaPage({ params }: BusinessAreaPageProps) {
  const { slug } = await params;
  if (!isBusinessAreaSlug(slug)) notFound();
  const area = getBusinessArea("ko", slug);
  if (!area) notFound();

  if (slug === "japan-caregiver") {
    return (
      <>
        <LegacyLpLocaleBridge />
        <CaregiverPageSchema locale="ko" />
        <KtsCaregiverLanding locale="ko" />
      </>
    );
  }

  return (
    <BusinessAreaDetail area={area} locale="ko" />
  );
}
