"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { saveProduct, advanceOrder } from "@/app/admin/actions";
import { CATEGORIES } from "@/lib/categories";
import type { Product, Variant } from "@/lib/types";

const productFields = [
  ["name", "Product name", 150],
  ["shortDescription", "Short description", 300],
  ["ingredients", "Ingredients and allergens", 2000],
  ["storage", "Storage instructions", 2000]
] as const;
const packFields = [
  ["label", "Pack label", "text", undefined],
  ["grams", "Net grams", "number", "1"],
  ["price", "Price (PKR)", "number", "0.01"],
  ["stock", "Available packs", "number", "1"]
] as const;

export function ProductForm({ product, initialVersion }: { product?: Product; initialVersion?: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(initialVersion);
  const [packs, setPacks] = useState<Partial<Variant>[]>(product?.variants ?? [{ id: "first" }]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const id = String(fields.get("id"));
    const variants = packs.map((pack, index) => ({
      id: pack.id === "first" ? id + "-pack" : pack.id,
      label: fields.get(index + "-label"),
      grams: Number(fields.get(index + "-grams")),
      price: Number(fields.get(index + "-price")),
      stock: Number(fields.get(index + "-stock"))
    }));
    setBusy(true);
    setMessage("");
    try {
      const result = await saveProduct({
        ...Object.fromEntries(fields),
        id,
        featured: fields.has("featured"),
        active: fields.has("active"),
        variants
      }, version);
      setMessage(result.message);
      if (result.ok && result.version) setVersion(result.version);
      if (result.ok && !product) {
        form.reset();
        setPacks([{ id: crypto.randomUUID() }]);
      }
    } catch { setMessage("Could not save. Please retry."); }
    finally { setBusy(false); }
  }

  return <form className="space-y-4 border border-gold/30 bg-white p-6" onSubmit={submit}>
    <h2 className="text-2xl">{product ? "Edit " + product.name : "Create a product"}</h2>
    <fieldset disabled={busy} className="space-y-4">
      <label className="block text-sm">Product ID<input name="id" pattern="[a-z0-9-]+" maxLength={100} required readOnly={Boolean(product)} defaultValue={product?.id} className="input mt-1" /></label>
      {productFields.map(([name, label, maxLength]) => <label key={name} className="block text-sm">{label}
        <input name={name} required maxLength={maxLength} defaultValue={product?.[name]} className="input mt-1" />
      </label>)}
      <label className="block text-sm">Description<textarea required name="description" minLength={20} maxLength={5000} defaultValue={product?.description} className="input mt-1" /></label>
      <label className="block text-sm">Category<select name="category" defaultValue={product?.category} className="input mt-1">{CATEGORIES.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></label>
      <label className="block text-sm">Photo path or public Supabase Storage URL
        <input name="image" required list="catalog-images" defaultValue={product?.images?.[0]} className="input mt-1" />
      </label>
      <datalist id="catalog-images">{CATEGORIES.map((category) => <option key={category.slug} value={category.image}>{category.name}</option>)}</datalist>
      <div className="space-y-3">
        {packs.map((pack, index) => <fieldset key={pack.id} className="grid gap-3 border border-gold/30 p-3 sm:grid-cols-2">
          <legend className="px-1">Pack {index + 1}</legend>
          {packFields.map(([name, label, type, step]) => <label key={name} className="block text-sm">{label}
            <input name={index + "-" + name} type={type} step={step} min={type === "number" ? 0 : undefined} required defaultValue={pack[name]} className="input mt-1" />
          </label>)}
          <button type="button" disabled={packs.length === 1} className="text-left text-sm underline disabled:opacity-50" onClick={() => setPacks((items) => items.filter((item) => item !== pack))}>Remove pack</button>
        </fieldset>)}
        <button type="button" disabled={packs.length >= 20} className="btn-outline-dark" onClick={() => setPacks((items) => [...items, { id: crypto.randomUUID() }])}>Add pack size</button>
      </div>
      <label className="block"><input type="checkbox" name="featured" defaultChecked={product?.featured} /> Featured product</label>
      <label className="block"><input type="checkbox" name="active" defaultChecked={product?.active} /> Publish to storefront</label>
      <button className="btn-navy">{busy ? "Saving..." : product ? "Save changes" : "Create product"}</button>
    </fieldset>
    <p role="status">{message}</p>
  </form>;
}

const orderLabels: Record<string, string> = { pending: "Confirm order", confirmed: "Mark shipped", shipped: "Mark delivered" };

export function OrderButton({ id, status }: { id: string; status: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function update() {
    setBusy(true);
    try { setMessage((await advanceOrder(id, status)).message); }
    catch { setMessage("Update failed. Retry."); }
    finally { setBusy(false); }
  }
  return <div>
    {orderLabels[status] && <button disabled={busy} className="btn-navy mt-3" onClick={update}>{busy ? "Updating..." : orderLabels[status]}</button>}
    <p role="status">{message}</p>
  </div>;
}

export function OrderAlerts({ orderIds, pending }: { orderIds: string[]; pending: number }) {
  const router = useRouter();
  const seen = useRef(new Set(orderIds));
  const [newCount, setNewCount] = useState(0);
  const [desktopStatus, setDesktopStatus] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 20000);
    return () => window.clearInterval(timer);
  }, [router]);

  useEffect(() => {
    const ids = orderIds.filter((id) => !seen.current.has(id));
    if (!ids.length) return;
    seen.current = new Set(orderIds);
    setNewCount((count) => count + ids.length);
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try { new Notification("Royal Nuts order received", { body: ids.length + " new order(s). Open the owner dashboard for details." }); }
      catch { /* In-dashboard alerts remain available. */ }
    }
  }, [orderIds]);

  async function enableDesktopAlerts() {
    try {
      if (typeof Notification === "undefined") throw new Error();
      const permission = await Notification.requestPermission();
      setDesktopStatus(permission === "granted" ? "Desktop alerts enabled while this dashboard is open." : "Enable notifications in your browser settings to receive desktop alerts.");
    } catch { setDesktopStatus("This browser does not support desktop alerts here."); }
  }

  return <div className="space-y-2 border border-gold/40 bg-white p-4">
    <p role="status">{newCount > 0 ? newCount + " new order(s) since you opened this dashboard. " : ""}{pending} pending in the latest orders.</p>
    <div className="flex flex-wrap gap-3">
      <button type="button" className="btn-outline-dark" onClick={() => router.refresh()}>Refresh orders</button>
      <button type="button" className="btn-outline-dark" onClick={enableDesktopAlerts}>Enable desktop alerts</button>
    </div>
    {desktopStatus && <p role="status">{desktopStatus}</p>}
  </div>;
}
