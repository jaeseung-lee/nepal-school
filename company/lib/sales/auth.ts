import "server-only";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type InternalProfile = {
  id: string;
  email: string;
  display_name: string | null;
  role: "admin" | "sales";
  active: boolean;
  locale: "ja" | "ko";
};

export async function getInternalProfile(): Promise<InternalProfile | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id,email,display_name,role,active,locale")
    .eq("id", user.id)
    .eq("active", true)
    .maybeSingle();

  return (data as InternalProfile | null) ?? null;
}

export async function requireInternalProfile(): Promise<InternalProfile> {
  let profile: InternalProfile | null = null;
  try {
    profile = await getInternalProfile();
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_PUBLIC_SUPABASE")) {
      redirect("/login?error=not_configured");
    }
    throw error;
  }
  if (!profile) redirect("/login?error=not_allowed");
  return profile;
}

export async function requireAdminProfile(): Promise<InternalProfile> {
  const profile = await requireInternalProfile();
  if (profile.role !== "admin") redirect("/sales?error=admin_required");
  return profile;
}
