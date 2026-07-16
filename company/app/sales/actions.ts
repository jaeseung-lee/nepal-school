"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminProfile, requireInternalProfile } from "@/lib/sales/auth";
import { SALES_STAGES } from "@/lib/sales/i18n";
import { calculateLeadScore } from "@/lib/sales/scoring";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const optionalUuid = z.preprocess((value) => (value === "" ? null : value), z.string().uuid().nullable());
const optionalDate = z.preprocess((value) => (value === "" ? null : value), z.string().nullable());

export async function updateLeadAction(formData: FormData) {
  const profile = await requireInternalProfile();
  const parsed = z
    .object({
      leadId: z.string().uuid(),
      organizationId: z.string().uuid(),
      ownerId: optionalUuid,
      stage: z.enum(SALES_STAGES as [string, ...string[]]),
      priority: z.enum(["high", "normal", "low"]),
      nextActionAt: optionalDate,
      notes: z.string().max(5_000),
    })
    .parse(Object.fromEntries(formData));
  const supabase = await createServerSupabaseClient();
  const { data: before } = await supabase
    .from("sales_leads")
    .select("stage")
    .eq("id", parsed.leadId)
    .single();
  const { error } = await supabase
    .from("sales_leads")
    .update({
      owner_id: parsed.ownerId,
      stage: parsed.stage,
      priority: parsed.priority,
      next_action_at: parsed.nextActionAt ? new Date(parsed.nextActionAt).toISOString() : null,
      notes: parsed.notes || null,
      do_not_contact: parsed.stage === "do_not_contact",
    })
    .eq("id", parsed.leadId);
  if (error) throw error;
  if (before?.stage !== parsed.stage) {
    const { error: activityError } = await supabase.from("sales_activities").insert({
      sales_lead_id: parsed.leadId,
      actor_id: profile.id,
      activity_type: "stage_change",
      notes: `${before?.stage ?? "unknown"} → ${parsed.stage}`,
    });
    if (activityError) throw activityError;
  }
  revalidatePath(`/sales/companies/${parsed.organizationId}`);
  revalidatePath("/sales");
  revalidatePath("/sales/companies");
}

export async function reviewContactAction(formData: FormData) {
  const profile = await requireInternalProfile();
  const parsed = z
    .object({
      contactId: z.string().uuid(),
      organizationId: z.string().uuid(),
      status: z.enum(["verified", "rejected"]),
    })
    .parse(Object.fromEntries(formData));
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("contact_candidates")
    .update({ status: parsed.status, reviewed_by: profile.id, reviewed_at: new Date().toISOString() })
    .eq("id", parsed.contactId);
  if (error) throw error;
  revalidatePath(`/sales/companies/${parsed.organizationId}`);
}

export async function addContactAction(formData: FormData) {
  await requireInternalProfile();
  const parsed = z
    .object({
      organizationId: z.string().uuid(),
      kind: z.enum(["website", "phone", "email", "contact_form", "visit_address"]),
      value: z.string().min(1).max(500),
      sourceUrl: z.string().url(),
      notes: z.string().max(1_000),
    })
    .parse(Object.fromEntries(formData));
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("contact_candidates").upsert(
    {
      organization_id: parsed.organizationId,
      kind: parsed.kind,
      value: parsed.value,
      source_url: parsed.sourceUrl,
      confidence: "high",
      status: "pending",
      notes: parsed.notes || null,
    },
    { onConflict: "organization_id,kind,value", ignoreDuplicates: true },
  );
  if (error) throw error;
  revalidatePath(`/sales/companies/${parsed.organizationId}`);
}

export async function addActivityAction(formData: FormData) {
  const profile = await requireInternalProfile();
  const parsed = z
    .object({
      leadId: z.string().uuid(),
      organizationId: z.string().uuid(),
      activityType: z.enum(["note", "email", "phone", "visit", "meeting", "follow_up"]),
      notes: z.string().min(1).max(5_000),
    })
    .parse(Object.fromEntries(formData));
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("sales_activities").insert({
    sales_lead_id: parsed.leadId,
    actor_id: profile.id,
    activity_type: parsed.activityType,
    notes: parsed.notes,
  });
  if (error) throw error;
  revalidatePath(`/sales/companies/${parsed.organizationId}`);
}

export async function addAllowlistAction(formData: FormData) {
  const admin = await requireAdminProfile();
  const parsed = z
    .object({ email: z.string().email(), role: z.enum(["admin", "sales"]) })
    .parse(Object.fromEntries(formData));
  const supabase = await createServerSupabaseClient();
  const email = parsed.email.trim().toLowerCase();
  const { error } = await supabase.from("access_allowlist").upsert({
    email,
    role: parsed.role,
    active: true,
    created_by: admin.id,
  });
  if (error) throw error;
  await supabase.from("profiles").update({ role: parsed.role, active: true }).eq("email", email);
  revalidatePath("/sales/admin/users");
}

export async function updateUserAccessAction(formData: FormData) {
  const admin = await requireAdminProfile();
  const parsed = z
    .object({ email: z.string().email(), intent: z.enum(["activate", "suspend"]), role: z.enum(["admin", "sales"]) })
    .parse(Object.fromEntries(formData));
  const email = parsed.email.trim().toLowerCase();
  if (email === admin.email.toLowerCase() && parsed.intent === "suspend") {
    throw new Error("You cannot suspend your own administrator account.");
  }
  const active = parsed.intent === "activate";
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("access_allowlist")
    .update({ active, role: parsed.role })
    .eq("email", email);
  if (error) throw error;
  await supabase.from("profiles").update({ active, role: parsed.role }).eq("email", email);
  revalidatePath("/sales/admin/users");
}

export async function updateOrganizationAction(formData: FormData) {
  await requireAdminProfile();
  const parsed = z
    .object({
      organizationId: z.string().uuid(),
      organizationType: z.enum(["direct_employer", "agency", "unknown"]),
      officialName: z.string().max(300),
      officialDomain: z.preprocess((value) => (value === "" ? null : value), z.string().url().nullable()),
    })
    .parse(Object.fromEntries(formData));
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      organization_type: parsed.organizationType,
      official_name: parsed.officialName || null,
      official_domain: parsed.officialDomain,
    })
    .eq("id", parsed.organizationId);
  if (error) throw error;

  const { data: jobs } = await supabase
    .from("jobs")
    .select("employment_type,visa_support,foreigner_friendly,japanese_level,qualification_support,housing_support,date_posted,valid_through,last_changed_at")
    .eq("organization_id", parsed.organizationId)
    .eq("status", "active");
  const rows = jobs ?? [];
  if (rows.length) {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1_000;
    const best = rows
      .map((job) =>
        calculateLeadScore({
          organizationType: parsed.organizationType,
          employmentType: job.employment_type,
          visaSupport: job.visa_support,
          foreignerFriendly: job.foreigner_friendly,
          japaneseLevel: job.japanese_level,
          qualificationSupport: job.qualification_support,
          housingSupport: job.housing_support,
          datePosted: job.date_posted,
          validThrough: job.valid_through,
          activeJobCount: rows.length,
          changedOrReappearedThisWeek: new Date(job.last_changed_at).valueOf() >= weekAgo,
        }),
      )
      .sort((a, b) => b.totalScore - a.totalScore)[0];
    const { error: leadError } = await supabase
      .from("sales_leads")
      .update({ fit_score: best.fitScore, demand_score: best.demandScore, score_reasons: best.reasons })
      .eq("organization_id", parsed.organizationId)
      .is("location_id", null);
    if (leadError) throw leadError;
  }
  revalidatePath(`/sales/companies/${parsed.organizationId}`);
  revalidatePath("/sales/companies");
  revalidatePath("/sales");
}
