import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  deduplicateContactCandidates,
  normalizeContactCandidate,
  parseContactImportDocument,
  toAutomationContactCandidateRpcRow,
  toContactCandidateDatabaseRow,
  type ContactEnrichmentOutcome,
  type NormalizedContactCandidate,
} from "@/lib/sales/contact-enrichment";

loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true, quiet: true });

async function upsertCandidates(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  candidates: NormalizedContactCandidate[],
) {
  if (candidates.length === 0) return;
  const { error } = await supabase.from("contact_candidates").upsert(
    candidates.map(toContactCandidateDatabaseRow),
    { onConflict: "organization_id,kind,normalized_value", ignoreDuplicates: true },
  );
  if (error) throw error;
}

async function completeTask(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  input: {
    runId: string;
    organizationId: string;
    claimToken: string;
    outcome: ContactEnrichmentOutcome;
    errorMessage?: string;
    candidateCount: number;
  },
) {
  const { data, error } = await supabase.rpc("complete_contact_enrichment_task", {
    p_run_id: input.runId,
    p_organization_id: input.organizationId,
    p_claim_token: input.claimToken,
    p_outcome: input.outcome,
    p_error_message: input.errorMessage ?? null,
    p_candidate_count: input.candidateCount,
  });
  if (error) throw error;
  // A false result means the token expired or the task already reached another
  // terminal outcome. Cleanup is best-effort, so this is not an RPC failure.
  return data !== false;
}

class InactiveEnrichmentClaimError extends Error {
  constructor(organizationId: string) {
    super(`Contact enrichment claim is no longer active for organization ${organizationId}`);
    this.name = "InactiveEnrichmentClaimError";
  }
}

async function importAutomationResult(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  input: {
    runId: string;
    organizationId: string;
    claimToken: string;
    outcome: ContactEnrichmentOutcome;
    errorMessage?: string;
    candidates: NormalizedContactCandidate[];
  },
) {
  const { data, error } = await supabase.rpc("import_contact_enrichment_result", {
    p_run_id: input.runId,
    p_organization_id: input.organizationId,
    p_claim_token: input.claimToken,
    p_outcome: input.outcome,
    p_candidates: input.candidates.map(toAutomationContactCandidateRpcRow),
    p_error_message: input.errorMessage ?? null,
  });
  if (error) throw error;
  if (data === false) throw new InactiveEnrichmentClaimError(input.organizationId);
}

function candidateCounts(candidates: NormalizedContactCandidate[]) {
  return candidates.reduce<Record<string, number>>((counts, candidate) => {
    counts[candidate.kind] = (counts[candidate.kind] ?? 0) + 1;
    return counts;
  }, {});
}

async function pendingCandidateCount(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  organizationIds: string[],
) {
  const uniqueOrganizationIds = [...new Set(organizationIds)];
  if (uniqueOrganizationIds.length === 0) return 0;
  const { count, error } = await supabase
    .from("contact_candidates")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .in("organization_id", uniqueOrganizationIds);
  if (error) throw error;
  return count ?? 0;
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    throw new Error("Usage: npm run sales:contacts:import -- /path/to/candidates.json");
  }
  const document = parseContactImportDocument(
    JSON.parse(await readFile(resolve(inputPath), "utf8")) as unknown,
  );
  const supabase = createSupabaseAdminClient();

  if (document.mode === "legacy") {
    const normalized = deduplicateContactCandidates(
      document.candidates.map((candidate) =>
        normalizeContactCandidate(candidate, {
          organizationId: candidate.organizationId,
          defaultDiscoveryMethod: "manual",
        }),
      ),
    );
    await upsertCandidates(supabase, normalized);
    const pendingReviewCount = await pendingCandidateCount(
      supabase,
      document.candidates.map((candidate) => candidate.organizationId),
    );
    console.log(
      JSON.stringify({
        mode: "legacy",
        received: document.candidates.length,
        imported: normalized.length,
        duplicates: document.candidates.length - normalized.length,
        candidateCounts: candidateCounts(normalized),
        pendingReviewCount,
        status: "pending",
      }),
    );
    return;
  }

  const completed: Array<{
    organizationId: string;
    outcome: ContactEnrichmentOutcome;
    imported: number;
  }> = [];
  const failures: Array<{ organizationId: string; error: string }> = [];
  const allImported: NormalizedContactCandidate[] = [];

  for (const result of document.results) {
    let normalized: NormalizedContactCandidate[];
    try {
      normalized = deduplicateContactCandidates(
        result.candidates.map((candidate) =>
          normalizeContactCandidate(candidate, {
            organizationId: result.organizationId,
            enrichmentRunId: document.runId,
            defaultDiscoveryMethod: "automated",
          }),
        ),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      let completionError: string | null = null;
      try {
        await completeTask(supabase, {
          runId: document.runId,
          organizationId: result.organizationId,
          claimToken: result.claimToken,
          outcome: "failed",
          errorMessage: message,
          candidateCount: 0,
        });
      } catch (completionFailure) {
        completionError = completionFailure instanceof Error
          ? completionFailure.message
          : "unknown completion error";
      }
      failures.push({
        organizationId: result.organizationId,
        error: completionError ? `${message}; failed to release claim: ${completionError}` : message,
      });
      continue;
    }

    try {
      await importAutomationResult(supabase, {
        runId: document.runId,
        organizationId: result.organizationId,
        claimToken: result.claimToken,
        outcome: result.outcome,
        errorMessage: result.errorMessage,
        candidates: normalized,
      });
      allImported.push(...normalized);
      completed.push({
        organizationId: result.organizationId,
        outcome: result.outcome,
        imported: normalized.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      let completionError: string | null = null;
      if (!(error instanceof InactiveEnrichmentClaimError)) {
        try {
          await completeTask(supabase, {
            runId: document.runId,
            organizationId: result.organizationId,
            claimToken: result.claimToken,
            outcome: "failed",
            errorMessage: message,
            candidateCount: 0,
          });
        } catch (completionFailure) {
          completionError = completionFailure instanceof Error
            ? completionFailure.message
            : "unknown completion error";
        }
      }
      failures.push({
        organizationId: result.organizationId,
        error: completionError ? `${message}; failed to release claim: ${completionError}` : message,
      });
    }
  }

  const pendingReviewCount = await pendingCandidateCount(
    supabase,
    document.results.map((result) => result.organizationId),
  );
  console.log(
    JSON.stringify(
      {
        mode: "automation",
        runId: document.runId,
        receivedOrganizations: document.results.length,
        completedOrganizations: completed.length,
        failedOrganizations: failures.length,
        imported: allImported.length,
        candidateCounts: candidateCounts(allImported),
        pendingReviewCount,
        outcomes: completed.reduce<Record<string, number>>((counts, result) => {
          counts[result.outcome] = (counts[result.outcome] ?? 0) + 1;
          return counts;
        }, {}),
        failures,
      },
      null,
      2,
    ),
  );
  if (failures.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
