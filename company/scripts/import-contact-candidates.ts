import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true, quiet: true });

const candidateSchema = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid().nullable().optional(),
  kind: z.enum(["website", "phone", "email", "contact_form", "visit_address"]),
  value: z.string().min(1).max(500),
  sourceUrl: z.string().url(),
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
  notes: z.string().max(1_000).optional(),
});
const inputSchema = z.array(candidateSchema).max(200);
const inputPath = process.argv[2];
if (!inputPath) throw new Error("Usage: npm run sales:contacts:import -- /path/to/candidates.json");
const candidates = inputSchema.parse(JSON.parse(await readFile(resolve(inputPath), "utf8")));
const supabase = createSupabaseAdminClient();
const { error } = await supabase.from("contact_candidates").upsert(
  candidates.map((item) => ({
    organization_id: item.organizationId,
    location_id: item.locationId ?? null,
    kind: item.kind,
    value: item.value,
    source_url: item.sourceUrl,
    confidence: item.confidence,
    notes: item.notes ?? null,
    status: "pending",
  })),
  { onConflict: "organization_id,kind,value", ignoreDuplicates: true },
);
if (error) throw error;
console.log(JSON.stringify({ imported: candidates.length, status: "pending" }));
