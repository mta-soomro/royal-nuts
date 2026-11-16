import { writeFile } from "node:fs/promises";
import { DEMO_PRODUCTS } from "../src/lib/demo-products";

async function main() {
  const quote = (value: string) => "'" + value.replaceAll("'", "''") + "'";
  const rows = DEMO_PRODUCTS.map((product) => `(${quote(product.id)}, true, ${quote(JSON.stringify(product))}::jsonb)`);
  const sql = `-- Demo catalog: fictional PKR prices and inventory; not purchasable.\n-- Run after schema.sql in Supabase SQL Editor. Existing product IDs are preserved.\nbegin;\n\ninsert into public.products (id, active, data)\nvalues\n${rows.join(",\n")}\non conflict (id) do nothing;\n\ncommit;\n\n-- Inspect the resulting demo catalog.\nselect id, data ->> 'name' as name, data -> 'variants' as variants\nfrom public.products where id in (${DEMO_PRODUCTS.map((p) => quote(p.id)).join(", ")})\norder by id;\n`;
  await writeFile("supabase/demo-products.sql", sql, "utf8");
  console.log(`Generated SQL for ${DEMO_PRODUCTS.length} demo products with positive PKR prices and sample stock.`);
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "SQL generation failed."); process.exitCode = 1; });