"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getLocaleFromPathname } from "@/lib/i18n";

/**
 * The root layout is shared by legacy Korean routes and locale-prefixed routes.
 * Keep the document language accurate after client navigation without forcing
 * every route to have a separate root layout.
 */
export default function LocaleDocumentAttributes() {
  const pathname = usePathname() || "/";

  useEffect(() => {
    document.documentElement.lang = getLocaleFromPathname(pathname);
  }, [pathname]);

  return null;
}
