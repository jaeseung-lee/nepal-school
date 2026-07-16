import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true, quiet: true });

const limit = Math.min(Number(process.argv[2] ?? 20), 50);
const supabase = createSupabaseAdminClient();
const [{ data: leads, error: leadError }, { data: contacts, error: contactError }] = await Promise.all([
  supabase
    .from("sales_leads")
    .select("organization_id,total_score,grade,organizations(id,display_name,organization_type,jobs(source_url,status))")
    .order("total_score", { ascending: false }),
  supabase.from("contact_candidates").select("organization_id,status"),
]);
if (leadError) throw leadError;
if (contactError) throw contactError;

const organizationsWithVerifiedContact = new Set(
  (contacts ?? []).filter((item) => item.status === "verified").map((item) => item.organization_id),
);
const queue = (leads ?? [])
  .filter((lead) => !organizationsWithVerifiedContact.has(lead.organization_id))
  .slice(0, limit)
  .map((lead) => ({
    organizationId: lead.organization_id,
    score: lead.total_score,
    grade: lead.grade,
    organization: lead.organizations,
    instruction:
      "Use official public corporate sources only. Do not infer a masked employer or personal contact.",
  }));
console.log(JSON.stringify(queue, null, 2));
