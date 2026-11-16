import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

async function main() {
  const db = await PGlite.create();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      grant usage on schema auth, public to anon, authenticated;
      create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb, email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    `);
    // pgcrypto is unused by the app; gen_random_uuid is built into PostgreSQL.
    const schema = (await readFile("supabase/schema.sql", "utf8")).replace("create extension if not exists pgcrypto with schema extensions;", "");
    const alice = randomUUID(), bob = randomUUID(), unverified = randomUUID();
    await db.query("insert into auth.users values ($1,'alice@example.invalid','{\"full_name\":\"Alice\"}',now())", [alice]);
    await db.exec(schema);
    await db.exec(schema);
    assert.equal((await db.query<{ full_name: string }>("select full_name from public.profiles where id=$1", [alice])).rows[0].full_name, "Alice");
    await db.query("insert into auth.users values ($1,'bob@example.invalid','{\"full_name\":\"Bob\"}',now()),($2,'unverified@example.invalid','{}',null)", [bob, unverified]);
    assert.equal((await db.query<{ n: number }>("select count(*)::int as n from public.profiles")).rows[0].n, 3);
    await db.query("insert into public.products(id,active,data) values ('almonds',true,$1),('unavailable',true,$2),('hidden',false,$1)", [
      JSON.stringify({ name: "Almonds", isSample: false, variants: [{ id: "almonds-250", label: "250g", price: 120.50, stock: 10 }] }),
      JSON.stringify({ name: "Unavailable", isSample: false, variants: [{ id: "none", label: "250g", price: 200, stock: 0 }] })
    ]);
    await db.exec("update public.store_settings set shipping_fee=50 where id=1");
    async function asRole(role: "anon" | "authenticated" | "postgres", id = "") {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
      if (role !== "postgres") await db.exec(`set role ${role}`);
    }
    const customer = { full_name: "Alice Test", phone: "03001234567", address: "10 Test Street, Test Area", city: "Karachi", notes: "" };
    const cart = [{ productId: "almonds", variantId: "almonds-250", quantity: 2, price: 1 }];
    async function order(items: unknown, request = randomUUID()) {
      return db.query<{ result: { id: string; total: number } }>("select public.place_order($1::jsonb,$2::jsonb,$3::uuid) as result", [JSON.stringify(customer), JSON.stringify(items), request]);
    }
    await asRole("anon");
    assert.equal((await db.query<{ n: number }>("select count(*)::int as n from public.products")).rows[0].n, 2);
    await assert.rejects(() => db.query("select * from public.contact_messages"), /permission denied/);
    await assert.rejects(() => db.query("select * from public.orders"), /permission denied/);
    await assert.rejects(() => order(cart), /permission denied/);
    await assert.rejects(() => db.query("select public.subscribe_newsletter('invalid')"), /Invalid email/);
    await db.query("select public.subscribe_newsletter('  TEST@example.invalid  ')");
    await db.query("select public.subscribe_newsletter('test@example.invalid')");
    await assert.rejects(() => db.query("select * from public.subscribers"), /permission denied/);
    const message = { name: "Test Customer", email: "contact@example.invalid", phone: "", subject: "Stock question", message: "Is this item available today?" };
    for (let i = 0; i < 5; i++) await db.query("select public.submit_contact_message($1::jsonb)", [JSON.stringify(message)]);
    await assert.rejects(() => db.query("select public.submit_contact_message($1::jsonb)", [JSON.stringify(message)]), /Too many messages/);
    await asRole("authenticated", alice);
    assert.equal((await db.query<{ n: number }>("select count(*)::int as n from public.profiles")).rows[0].n, 1);
    assert.equal((await db.query("update public.profiles set full_name='Not allowed' where id=$1 returning id", [bob])).rows.length, 0);
    await db.query("update public.profiles set phone='03001234567',city='Karachi' where id=$1", [alice]);
    const request = randomUUID();
    const first = (await order(cart, request)).rows[0].result;
    assert.equal(Number(first.total), 291); // Two database-priced items + database delivery fee; supplied price=1 is ignored.
    assert.deepEqual((await order(cart, request)).rows[0].result, first);
    assert.equal((await db.query<{ n: number }>("select count(*)::int as n from public.orders")).rows[0].n, 1);
    await assert.rejects(() => db.query("insert into public.orders(user_id) values ($1)", [alice]), /permission denied/);
    await assert.rejects(() => db.query("update public.products set active=false"), /permission denied/);
    await assert.rejects(() => order([{ ...cart[0], quantity: 9 }]), /Not enough stock/);
    await assert.rejects(() => order([cart[0], { productId: "unavailable", variantId: "none", quantity: 1 }]), /out of stock/);
    await assert.rejects(() => order([cart[0], cart[0]]), /Duplicate cart/);
    await assert.rejects(() => order([{ ...cart[0], quantity: 0 }]), /Invalid quantity/);
    await asRole("authenticated", bob);
    assert.equal((await db.query<{ n: number }>("select count(*)::int as n from public.orders")).rows[0].n, 0);
    await asRole("authenticated", unverified);
    await assert.rejects(() => order(cart), /verify your email/);
    await asRole("postgres");
    assert.equal((await db.query<{ stock: number }>("select (data->'variants'->0->>'stock')::int as stock from public.products where id='almonds'")).rows[0].stock, 8);
    assert.equal((await db.query<{ n: number }>("select count(*)::int as n from public.orders")).rows[0].n, 1);
    assert.equal((await db.query<{ n: number }>("select count(*)::int as n from public.subscribers")).rows[0].n, 1);
    const demoSql = await readFile("supabase/demo-products.sql", "utf8");
    await db.exec(demoSql);
    const demos = await db.query<{ id: string; data: { isSample: boolean; images: string[]; variants: { id: string; price: number; stock: number }[] } }>("select id,data from public.products where id like 'demo-%'");
    assert.equal(demos.rows.length, 10);
    for (const product of demos.rows) {
      assert.equal(product.data.isSample, true);
      assert.ok(product.data.images.length > 0);
      assert.ok(product.data.variants.every((variant) => Number.isFinite(variant.price) && variant.price > 0 && variant.stock > 0));
      assert.equal(new Set(product.data.variants.map((variant) => variant.id)).size, product.data.variants.length);
    }
    await db.exec("update public.products set data=jsonb_set(data,'{name}','\"Keep owner edits\"') where id='demo-premium-almonds'");
    await db.exec(demoSql);
    assert.equal((await db.query<{ name: string }>("select data->>'name' as name from public.products where id='demo-premium-almonds'")).rows[0].name, "Keep owner edits");
    await asRole("authenticated", alice);
    await assert.rejects(() => order([{ productId: "demo-premium-almonds", variantId: "demo-premium-almonds-250g", quantity: 1 }]), /out of stock or its price/);
    await asRole("postgres");
    assert.equal((await db.query<{ n: number }>("select count(*)::int as n from public.orders")).rows[0].n, 1);
    console.log("Demo seed tests passed: 10 priced products, positive stock, rerun preserves owner edits, and sample checkout stays blocked.");
    console.log("Database tests passed: rerunnable schema, signup profile trigger, private profiles/orders/messages/subscribers, contact throttling, database pricing, delivery fees, stock rollback, duplicate-order protection, and email verification.");
  } finally { await db.close(); }
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });