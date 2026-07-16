import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true, quiet: true });

async function main() {
  const email = z.string().email().parse(process.argv[2]?.trim().toLowerCase());
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("access_allowlist").upsert({
    email,
    role: "admin",
    active: true,
  });

  if (error) throw error;
  console.log(`Admin allowlist entry is ready: ${email}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
