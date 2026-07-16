import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { SALES_LOCALE_COOKIE } from "@/lib/sales/i18n";
import { getInternalProfile } from "@/lib/sales/auth";

const payloadSchema = z.object({ locale: z.enum(["ja", "ko"]) });

export async function POST(request: NextRequest) {
  const profile = await getInternalProfile();
  if (!profile) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = payloadSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_locale" }, { status: 400 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SALES_LOCALE_COOKIE, parsed.data.locale, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/sales",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
