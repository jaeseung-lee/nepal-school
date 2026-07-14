import Link, { type LinkProps } from "next/link";
import type { ComponentProps } from "react";
import { DEFAULT_LOCALE, localizedHref, type Locale } from "@/lib/i18n";

type LocalizedLinkProps = Omit<ComponentProps<typeof Link>, "href"> &
  Pick<LinkProps, "href"> & {
    locale?: Locale;
  };

/** A Link that preserves the selected locale for internal string URLs. */
export default function LocalizedLink({ locale = DEFAULT_LOCALE, href, ...props }: LocalizedLinkProps) {
  const localized = typeof href === "string" ? localizedHref(locale, href) : href;
  return <Link href={localized} {...props} />;
}
