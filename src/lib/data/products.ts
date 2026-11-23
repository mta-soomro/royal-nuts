import "server-only";
import { cache } from "react";
import { getSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";
import { SAMPLE_PRODUCTS } from "@/lib/sample-products";
import type { Product } from "@/lib/types";

/** Minimum variant price above zero, or null if prices aren't set yet. */
export function startingPrice(p: Product): number | null {
  const prices = p.variants.map((v) => v.price).filter((x) => x > 0);
  return prices.length ? Math.min(...prices) : null;
}

const loadAll = cache(async (): Promise<Product[]> => {
  if (!hasSupabaseConfig) return SAMPLE_PRODUCTS;
  const { data, error } = await getSupabaseServerClient()
    .from("products")
    .select("id, data")
    .eq("active", true);
  if (error) throw new Error(`Could not load products from Supabase: ${error.message}`);
  if (!data.length) return SAMPLE_PRODUCTS;
  return data.map((row) => ({ ...(row.data as Omit<Product, "id">), id: row.id }));
});

export interface ProductQuery {
  q?: string;
  category?: string;
  min?: number;
  max?: number;
  sort?: "featured" | "price-asc" | "price-desc" | "name";
  page?: number;
  pageSize?: number;
}

export async function queryProducts(opts: ProductQuery) {
  const { q, category, min, max, sort = "featured", page = 1, pageSize = 12 } = opts;
  let items = await loadAll();

  if (q) {
    const needle = q.toLowerCase();
    items = items.filter((p) =>
      `${p.name} ${p.category} ${p.shortDescription}`.toLowerCase().includes(needle));
  }
  if (category) items = items.filter((p) => p.category === category);
  if (min !== undefined || max !== undefined) {
    items = items.filter((p) => {
      const s = startingPrice(p);
      if (s === null) return false;
      return (min === undefined || s >= min) && (max === undefined || s <= max);
    });
  }

  items = [...items].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "price-asc" || sort === "price-desc") {
      const pa = startingPrice(a) ?? Infinity, pb = startingPrice(b) ?? Infinity;
      return sort === "price-asc" ? pa - pb : pb - pa;
    }
    return Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name);
  });

  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pages);
  return { items: items.slice((safePage - 1) * pageSize, safePage * pageSize), total, pages, page: safePage };
}

export async function getProductBySlug(slug: string) {
  const products = await loadAll();
  const alternateSlug = slug.startsWith("demo-") ? slug.slice(5) : `demo-${slug}`;
  return products.find((p) => p.slug === slug)
    ?? products.find((p) => p.slug === alternateSlug && (p.isSample || slug.startsWith("demo-")))
    ?? null;
}
export async function getFeatured(limit = 4) {
  return (await loadAll()).filter((p) => p.featured).slice(0, limit);
}
export async function getBestSellers(limit = 4) {
  return (await loadAll()).filter((p) => p.bestSeller).slice(0, limit);
}
export async function getRelated(p: Product, limit = 4) {
  return (await loadAll()).filter((x) => x.category === p.category && x.id !== p.id).slice(0, limit);
}
export async function getGiftBoxes(limit = 3) {
  return (await loadAll()).filter((p) => p.category === "gift-boxes").slice(0, limit);
}
export async function usingSampleData() {
  return !hasSupabaseConfig || (await loadAll()).some((p) => p.isSample);
}

/** Small, serializable list used by the navbar's live search suggestions. */
export interface SearchItem {
  slug: string;
  name: string;
  category: string;
  image?: string;
  price: number | null;
  text: string; // lowercase haystack
}
export async function getSearchIndex(): Promise<SearchItem[]> {
  return (await loadAll()).map((p) => ({
    slug: p.slug,
    name: p.name,
    category: p.category,
    image: p.images[0],
    price: startingPrice(p),
    text: `${p.name} ${p.category.replace("-", " ")} ${p.shortDescription}`.toLowerCase()
  }));
}
