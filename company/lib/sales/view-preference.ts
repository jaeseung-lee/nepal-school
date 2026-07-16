import "server-only";
import { cookies } from "next/headers";
import {
  parseListView,
  SALES_LIST_VIEW_COOKIES,
  type SalesListScope,
} from "@/lib/sales/listing";

export async function getSalesListView(scope: SalesListScope) {
  const cookieStore = await cookies();
  return parseListView(cookieStore.get(SALES_LIST_VIEW_COOKIES[scope])?.value);
}
