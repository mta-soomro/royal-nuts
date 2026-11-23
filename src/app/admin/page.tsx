import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { ProductForm, OrderButton, OrderAlerts } from "@/components/admin/AdminForms";
import { formatPKR } from "@/lib/format";
import type { Product } from "@/lib/types";

export const metadata = { title: "Store administration", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type CatalogRow = { id: string; active: boolean; updated_at: string; data: Product };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ product?: string | string[] }> }) {
  let db;
  try { db = await requireAdmin(); }
  catch {
    return <main className="container-page py-16">
      <h1 className="text-3xl">Owner access required</h1>
      <p className="mt-4">Sign in with your verified administrator account.</p>
      <Link href="/login?next=/admin" className="btn-navy mt-6">Sign in</Link>
    </main>;
  }

  const { product } = await searchParams;
  const [catalog, orders] = await Promise.all([
    db.from("products").select("id,active,updated_at,data").order("created_at", { ascending: false }).limit(100),
    db.from("orders").select("id,status,created_at,full_name,email,phone,address,city,notes,total,items").order("created_at", { ascending: false }).order("id", { ascending: false }).limit(100)
  ]);
  const products = (catalog.data ?? []) as CatalogRow[];
  const selected = products.find((row) => row.id === product);
  const latest = orders.data ?? [];

  return <main className="container-page space-y-8 py-12">
    <h1 className="text-4xl">Store administration</h1>
    {(catalog.error || orders.error) && <p role="alert">Some records could not be loaded. Refresh to retry.</p>}
    <OrderAlerts orderIds={latest.map((order) => order.id)} pending={latest.filter((order) => order.status === "pending").length} />
    <div className="grid gap-8 lg:grid-cols-2">
      <div id="product-editor">
        {selected && <Link href="/admin#product-editor" className="mb-3 inline-block text-sm underline">Close editor and create a product</Link>}
        <ProductForm key={selected?.id ?? "create"} initialVersion={selected?.updated_at}
          product={selected ? { ...selected.data, active: selected.active, id: selected.id } : undefined} />
      </div>
      <section>
        <h2 className="text-2xl">Catalog</h2>
        {!products.length && <p className="mt-3">No products yet.</p>}
        {products.map((row) => <article key={row.id} className="mt-3 border border-gold/30 p-4">
          <h3 className="font-semibold">{row.data.name}</h3>
          <p>{row.active ? "Published" : "Draft"}{row.data.isSample ? " / Sample" : ""}</p>
          <ul className="mt-2 text-sm">{row.data.variants?.map((variant) => <li key={variant.id}>
            {variant.label} / {variant.stock} packs / {formatPKR(variant.price)}
          </li>)}</ul>
          <Link href={"/admin?product=" + encodeURIComponent(row.id) + "#product-editor"} className="mt-2 inline-block text-sm underline">Edit product</Link>
        </article>)}
      </section>
    </div>
    <section>
      <h2 className="text-2xl">Orders (latest 100)</h2>
      {!latest.length && !orders.error && <p>No orders yet.</p>}
      {latest.map((order) => <article key={order.id} className="mt-4 space-y-2 border border-gold/30 bg-white p-6">
        <h3 className="font-semibold">{order.full_name} / {formatPKR(order.total)} / {order.status}</h3>
        <p className="break-all text-sm">{order.id} / <time dateTime={order.created_at}>{new Date(order.created_at).toISOString()}</time></p>
        <p>{order.phone} / {order.email}</p>
        <p>{order.address}, {order.city}</p>
        {order.notes && <p>{order.notes}</p>}
        <ul className="space-y-1 text-sm">{order.items?.map((item: { productId: string; variantId: string; name: string; variantLabel: string; quantity: number; price: number }) => <li key={item.productId + ":" + item.variantId}>
          {item.quantity} × {item.name} ({item.variantLabel}) / {formatPKR(item.price * item.quantity)}
        </li>)}</ul>
        <OrderButton id={order.id} status={order.status} />
      </article>)}
    </section>
  </main>;
}
