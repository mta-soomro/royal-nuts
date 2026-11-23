"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { CATEGORIES } from "@/lib/categories";
import { supabaseUrl } from "@/lib/supabase/config";
import type { Product } from "@/lib/types";

const productId = z.string().regex(/^[a-z0-9-]{1,100}$/);
const productSchema = z.object({
  id: productId,
  name: z.string().trim().min(2).max(150),
  category: z.string().refine((value) => CATEGORIES.some((category) => category.slug === value)),
  image: z.string().trim().min(1).max(2048),
  shortDescription: z.string().trim().min(10).max(300),
  description: z.string().trim().min(20).max(5000),
  ingredients: z.string().trim().min(3).max(2000),
  storage: z.string().trim().min(3).max(2000),
  featured: z.boolean(),
  active: z.boolean(),
  variants: z.array(z.object({
    id: z.string().min(1).max(150),
    label: z.string().trim().min(1).max(60),
    grams: z.number().int().nonnegative().max(100000),
    price: z.number().nonnegative().max(1000000),
    stock: z.number().int().nonnegative().max(1000000)
  })).min(1).max(20)
}).refine((product) => new Set(product.variants.map((variant) => variant.id)).size === product.variants.length, "Pack IDs must be unique.")
  .refine((product) => !product.active || product.variants.every((variant) => variant.price > 0 && variant.grams > 0), "Set a positive price and net weight for each pack size before publishing.");

function allowedImage(image: string) {
  if (/^\/(categories|products)\/[a-z0-9-]+\.(jpg|jpeg|png|webp|svg)$/.test(image)) return true;
  try {
    const url = new URL(image);
    return url.protocol === "https:" && url.origin === new URL(supabaseUrl).origin
      && url.pathname.startsWith("/storage/v1/object/public/");
  } catch { return false; }
}

export async function saveProduct(raw: unknown, version?: string) {
  try {
    const db = await requireAdmin();
    const parsed = productSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
    const { image, variants, ...fields } = parsed.data;

    if (version) {
      const { data: current, error } = await db.from("products").select("data,updated_at").eq("id", fields.id).maybeSingle();
      if (error || !current) return { ok: false, message: "Could not load this product." };
      if (current.updated_at !== version) return { ok: false, message: "Product details or stock changed. Reopen this product before saving." };

      const previous = current.data as Product;
      if (image !== previous.images?.[0] && !allowedImage(image)) return { ok: false, message: "Use a store image path or a public Supabase Storage URL." };
      if (previous.isSample && fields.active) return { ok: false, message: "Create a separate product with verified details to sell this item." };
      const product = {
        ...previous,
        ...fields,
        images: image === previous.images?.[0] ? previous.images : [image, ...(previous.images ?? []).slice(1).filter((path) => path !== image)],
        variants: variants.map((variant) => ({ ...previous.variants?.find((item) => item.id === variant.id), ...variant }))
      };
      const { data: updated, error: updateError } = await db.from("products")
        .update({ active: product.active, data: product })
        .eq("id", product.id).eq("updated_at", version)
        .select("updated_at").maybeSingle();
      if (updateError) return { ok: false, message: "Could not save the product." };
      if (!updated) return { ok: false, message: "Product details or stock changed. Reopen this product before saving." };
      revalidatePath("/", "layout");
      return { ok: true, message: "Product updated.", version: updated.updated_at as string };
    }

    if (!allowedImage(image)) return { ok: false, message: "Use a store image path or a public Supabase Storage URL." };
    const product = { ...fields, slug: fields.id, images: [image], variants, bestSeller: false, isSample: false };
    const { data: matching, error: lookupError } = await db.from("products").select("id").eq("data->>slug", product.slug).limit(1);
    if (lookupError) return { ok: false, message: "Could not check the product URL." };
    if (matching?.length) return { ok: false, message: "This product URL is already in use." };
    const { error } = await db.from("products").insert({ id: product.id, active: product.active, data: product });
    if (error) return { ok: false, message: error.code === "23505" ? "Product ID already exists." : "Could not create the product." };
    revalidatePath("/", "layout");
    return { ok: true, message: "Product created." };
  } catch { return { ok: false, message: "Administrator access or server configuration is missing." }; }
}

export async function advanceOrder(id: string, previous: string) {
  const transition = z.enum(["pending", "confirmed", "shipped"]).safeParse(previous);
  if (!z.uuid().safeParse(id).success || !transition.success) return { ok: false, message: "Invalid order transition." };
  try {
    const db = await requireAdmin();
    const next = { pending: "confirmed", confirmed: "shipped", shipped: "delivered" }[transition.data];
    const { data, error } = await db.from("orders").update({ status: next }).eq("id", id).eq("status", previous).select("id");
    if (error || !data?.length) return { ok: false, message: "Order changed or could not be updated. Refresh and retry." };
    revalidatePath("/admin");
    revalidatePath("/account");
    return { ok: true, message: "Order marked " + next + "." };
  } catch { return { ok: false, message: "Administrator access required." }; }
}
