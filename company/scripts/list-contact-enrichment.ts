import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  isContactEnrichmentDue,
  missingContactFields,
  type ContactEnrichmentTaskTiming,
  type ContactReadiness,
} from "@/lib/sales/contact-enrichment";

loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true, quiet: true });

type CliOptions = { claim: boolean; limit: number };

function parseOptions(argv: string[]): CliOptions {
  const limitIndex = argv.indexOf("--limit");
  const positional = argv.find((value) => /^\d+$/.test(value));
  const rawLimit = limitIndex >= 0 ? argv[limitIndex + 1] : positional;
  const claim = argv.includes("--claim");
  const limit = rawLimit == null ? (claim ? 10 : 20) : Number(rawLimit);
  const maximum = claim ? 10 : 50;
  if (!Number.isInteger(limit) || limit < 1 || limit > maximum) {
    throw new Error(`--limit must be an integer between 1 and ${maximum}`);
  }
  return { claim, limit };
}

function objectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function fetchAllRows(
  loadPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: unknown[] | null; error: unknown }>,
): Promise<Array<Record<string, unknown>>> {
  const pageSize = 1_000;
  const rows: Array<Record<string, unknown>> = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await loadPage(from, from + pageSize - 1);
    if (error) throw error;
    const page = (data ?? []).map(objectRecord);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

function readiness(candidates: Array<{ kind: string; status: string }>): ContactReadiness {
  const verifiedKinds = new Set(
    candidates.filter((candidate) => candidate.status === "verified").map((candidate) => candidate.kind),
  );
  const hasAddress = verifiedKinds.has("official_address");
  const hasDirectContact = ["email", "phone", "contact_form"].some((kind) =>
    verifiedKinds.has(kind),
  );
  if (hasAddress && hasDirectContact) return "ready";
  if (candidates.some((candidate) => candidate.status === "pending")) return "review_pending";
  if (verifiedKinds.size > 0) return "partial";
  return "missing";
}

async function previewQueue(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  limit: number,
) {
  const [leads, contacts, tasks] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase
        .from("sales_leads")
        .select(
          "id,organization_id,total_score,grade,organizations(id,display_name,official_name,organization_type,corporate_number,official_domain,jobs(source_url,status,locations(region,locality,street_address,postal_code,country_code)))",
        )
        .is("location_id", null)
        .order("total_score", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("contact_candidates")
        .select(
          "id,organization_id,location_id,kind,value,normalized_value,status,source_url,confidence,department,purpose,is_primary,discovery_method,last_checked_at,address_postal_code,address_country_code,address_region,address_locality,address_street,address_type",
        )
        .order("id", { ascending: true })
        .range(from, to),
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("contact_enrichment_tasks")
        .select(
          "id,organization_id,status,retry_count,next_retry_at,completed_at,lease_expires_at,created_at",
        )
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to),
    ),
  ]);

  const contactsByOrganization = new Map<string, Array<Record<string, unknown>>>();
  for (const rawContact of contacts) {
    const contact = objectRecord(rawContact);
    const organizationId = String(contact.organization_id ?? "");
    const current = contactsByOrganization.get(organizationId) ?? [];
    current.push(contact);
    contactsByOrganization.set(organizationId, current);
  }

  const latestTaskByOrganization = new Map<string, ContactEnrichmentTaskTiming>();
  for (const rawTask of tasks) {
    const task = objectRecord(rawTask);
    const organizationId = String(task.organization_id ?? "");
    if (!organizationId || latestTaskByOrganization.has(organizationId)) continue;
    latestTaskByOrganization.set(organizationId, {
      status: String(task.status ?? ""),
      retryCount: task.retry_count == null ? null : Number(task.retry_count),
      nextRetryAt: task.next_retry_at == null ? null : String(task.next_retry_at),
      completedAt: task.completed_at == null ? null : String(task.completed_at),
      leaseExpiresAt: task.lease_expires_at == null ? null : String(task.lease_expires_at),
    });
  }

  const now = new Date();
  const queueByOrganization = new Map<string, Record<string, unknown>>();
  for (const rawLead of leads) {
    const lead = objectRecord(rawLead);
    const organizationId = String(lead.organization_id ?? "");
    if (!organizationId || queueByOrganization.has(organizationId)) continue;
    const organization = objectRecord(
      Array.isArray(lead.organizations) ? lead.organizations[0] : lead.organizations,
    );
    const jobs = Array.isArray(organization.jobs) ? organization.jobs : [];
    const activeJobs = jobs.map(objectRecord).filter((job) => job.status === "active");
    if (activeJobs.length === 0) continue;

    const existingCandidates = contactsByOrganization.get(organizationId) ?? [];
    const candidateStates = existingCandidates.map((candidate) => ({
      kind: String(candidate.kind ?? ""),
      status: String(candidate.status ?? ""),
    }));
    const contactReadiness = readiness(candidateStates);
    const latestTask = latestTaskByOrganization.get(organizationId) ?? null;
    if (!isContactEnrichmentDue(latestTask, contactReadiness, now)) continue;
    const confirmedOrganizationFields = [
      organization.official_name ? { kind: "official_name", status: "verified" } : null,
      organization.corporate_number ? { kind: "corporate_number", status: "verified" } : null,
      organization.official_domain ? { kind: "website", status: "verified" } : null,
    ].filter((field): field is { kind: string; status: string } => field != null);
    const missingFields = missingContactFields([
      ...candidateStates,
      ...confirmedOrganizationFields,
    ]);

    queueByOrganization.set(organizationId, {
      organizationId,
      score: Number(lead.total_score ?? 0),
      grade: String(lead.grade ?? "C"),
      organizationName: organization.display_name ?? null,
      organizationType: organization.organization_type ?? null,
      officialName: organization.official_name ?? null,
      corporateNumber: organization.corporate_number ?? null,
      officialDomain: organization.official_domain ?? null,
      locationHints: aggregateLocationHints(activeJobs),
      readiness: contactReadiness,
      missingFields,
      existingCandidates,
      latestTask,
      instruction:
        "Use official public corporate sources only. Do not infer masked employers, generate email addresses, or collect personal contacts.",
    });
  }
  return [...queueByOrganization.values()].slice(0, limit);
}

function aggregateLocationHints(jobs: Array<Record<string, unknown>>) {
  const hints = new Map<string, Record<string, unknown>>();
  for (const job of jobs) {
    const location = objectRecord(
      Array.isArray(job.locations) ? job.locations[0] : job.locations,
    );
    const hint = {
      region: location.region ?? null,
      locality: location.locality ?? null,
      street_address: location.street_address ?? null,
      postal_code: location.postal_code ?? null,
      country_code: location.country_code ?? null,
    };
    const key = JSON.stringify(hint);
    const existing = hints.get(key);
    if (existing) {
      existing.active_job_count = Number(existing.active_job_count ?? 0) + 1;
    } else {
      hints.set(key, { ...hint, active_job_count: 1 });
    }
  }
  return [...hints.values()].sort(
    (left, right) => Number(right.active_job_count ?? 0) - Number(left.active_job_count ?? 0),
  );
}

function claimedTask(row: Record<string, unknown>) {
  return {
    taskId: String(row.task_id ?? row.taskId ?? ""),
    organizationId: String(row.organization_id ?? row.org_id ?? row.organizationId ?? ""),
    claimToken: String(row.claim_token ?? row.token ?? row.claimToken ?? ""),
    leaseExpiresAt: row.lease_expires_at ?? row.leaseExpiresAt ?? null,
    missingFields: row.missing_fields ?? row.missingFields ?? [],
    organizationName:
      row.organization_name ?? row.organizationName ?? row.display_name ?? row.displayName ?? null,
    organizationType: row.organization_type ?? row.organizationType ?? null,
    locationHints: row.location_hints ?? row.locationHints ?? [],
    existingCandidates: row.existing_candidates ?? row.existingCandidates ?? [],
    instruction:
      "Use official corporate pages and public National Tax Agency pages only. If name and region do not identify one corporation, return ambiguous. Never infer email addresses or contact the organization.",
  };
}

async function claimQueue(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  limit: number,
) {
  const { data, error } = await supabase.rpc("claim_contact_enrichment_tasks", { p_limit: limit });
  if (error) throw error;
  const payload = objectRecord(data);
  if (!Array.isArray(data) && Array.isArray(payload.tasks)) {
    return {
      mode: "claim",
      runId: payload.run_id ?? payload.runId ?? null,
      claimedAt: payload.claimed_at ?? payload.claimedAt ?? new Date().toISOString(),
      leaseExpiresAt: payload.lease_expires_at ?? payload.leaseExpiresAt ?? null,
      tasks: payload.tasks.map((task) => claimedTask(objectRecord(task))),
    };
  }

  const rows = (Array.isArray(data) ? data : data ? [data] : []).map(objectRecord);
  const first = rows[0] ?? {};
  return {
    mode: "claim",
    runId: first.run_id ?? first.runId ?? null,
    claimedAt: first.claimed_at ?? first.claimedAt ?? new Date().toISOString(),
    leaseExpiresAt: first.lease_expires_at ?? first.leaseExpiresAt ?? null,
    tasks: rows.map(claimedTask),
  };
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const supabase = createSupabaseAdminClient();
  const result = options.claim
    ? await claimQueue(supabase, options.limit)
    : await previewQueue(supabase, options.limit);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
