import "server-only";
import { cookies } from "next/headers";
import { SALES_LOCALE_COOKIE, type SalesLocale } from "@/lib/sales/i18n";

export async function getSalesLocale(): Promise<SalesLocale> {
  const value = (await cookies()).get(SALES_LOCALE_COOKIE)?.value;
  return value === "ko" ? "ko" : "ja";
}
