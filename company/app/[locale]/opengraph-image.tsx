import {
  createOpenGraphImage,
  openGraphImageAlt,
  openGraphImageContentType,
  openGraphImageSize,
} from "@/lib/opengraph-image";

export const alt = openGraphImageAlt;
export const size = openGraphImageSize;
export const contentType = openGraphImageContentType;

export default function OpengraphImage() {
  return createOpenGraphImage();
}
