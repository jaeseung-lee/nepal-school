import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getInternalProfile } from "@/lib/sales/auth";
import { SALES_LIST_VIEW_COOKIES } from "@/lib/sales/listing";

const payloadSchema = z.object({
  scope: z.enum(["jobs", "companies"]),
  view: z.enum(["table", "cards"]),
});

export async function POST(request: NextRequest) {
  const profile = await getInternalProfile();
  if (!profile) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = payloadSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_view" }, { status: 400 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SALES_LIST_VIEW_COOKIES[parsed.data.scope], parsed.data.view, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/sales",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
