// Usage: npm run seed OR npm run seed:demo. Requires a server-only write key.
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { SAMPLE_PRODUCTS } from "../src/lib/sample-products";
import { DEMO_PRODUCTS } from "../src/lib/demo-products";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("Add NEXT_PUBLIC_SUPABASE_URL and a server-only SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY to .env.local, or run supabase/demo-products.sql in SQL Editor.");
  const demo = process.argv.includes("--demo");
  const products = demo ? DEMO_PRODUCTS : SAMPLE_PRODUCTS;
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const rows = products.map((product) => ({ id: product.id, active: product.active, data: product }));
  const { data, error } = await supabase.from("products").upsert(rows, { onConflict: "id", ignoreDuplicates: true }).select("id");
  if (error) throw new Error(`Product import failed (${error.code}): ${error.message}`);
  const { count, error: verifyError } = await supabase.from("products").select("id", { count: "exact", head: true }).in("id", rows.map((row) => row.id));
  if (verifyError) throw new Error(`Import verification failed (${verifyError.code}).`);
  if (count !== products.length) throw new Error("Not all expected products were found after importing.");
  console.log(`Added ${data?.length ?? 0} ${demo ? "priced demo" : "starter"} products. Verified ${count} product IDs. Existing products were preserved.`);
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Product import failed."); process.exitCode = 1; });