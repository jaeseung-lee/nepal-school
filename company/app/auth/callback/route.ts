import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next");
  const nextPath = requestedNext?.startsWith("/sales") ? requestedNext : "/sales";

  if (!code) return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));

  const supabase = await createServerSupabaseClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
  }

  const { error: profileError } = await supabase.rpc("activate_my_profile");
  if (profileError) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=not_allowed", request.url));
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}
