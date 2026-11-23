import type { Product, Variant } from "./types";

// SAMPLE DATA: placeholders only. Prices are 0 on purpose (shown as
// "Price not set"). Replace everything via the admin dashboard.
const v = (p: string, ...labels: [string, number][]): Variant[] =>
  labels.map(([label, grams]) => ({
    id: `${p}-${label}`, label, grams, price: 0, stock: 0
  }));
const std = (p: string) => v(p, ["250g", 250], ["500g", 500], ["1kg", 1000]);

const base = {
  images: [] as string[], // filled per product below from /public/products/<slug>.jpg
  ingredients: "Sample text. Add the real ingredients.",
  storage: "Sample text. Add storage instructions.",
  active: true,
  isSample: true
};

const RAW_SAMPLES: Product[] = [
  { ...base, id: "premium-almonds", name: "Premium Almonds", slug: "premium-almonds", category: "almonds",
    shortDescription: "Sample product. Replace with your almonds.", description: "Sample description. Edit in admin.",
    variants: std("premium-almonds"), featured: true, bestSeller: true },
  { ...base, id: "premium-cashews", name: "Premium Cashews", slug: "premium-cashews", category: "cashews",
    shortDescription: "Sample product. Replace with your cashews.", description: "Sample description. Edit in admin.",
    variants: std("premium-cashews"), featured: true, bestSeller: true },
  { ...base, id: "roasted-pistachios", name: "Roasted Pistachios", slug: "roasted-pistachios", category: "pistachios",
    shortDescription: "Sample product.", description: "Sample description. Edit in admin.",
    variants: std("roasted-pistachios"), featured: true, bestSeller: false },
  { ...base, id: "salted-pistachios", name: "Salted Pistachios", slug: "salted-pistachios", category: "pistachios",
    shortDescription: "Sample product.", description: "Sample description. Edit in admin.",
    variants: std("salted-pistachios"), featured: false, bestSeller: true },
  { ...base, id: "premium-walnuts", name: "Premium Walnuts", slug: "premium-walnuts", category: "walnuts",
    shortDescription: "Sample product.", description: "Sample description. Edit in admin.",
    variants: std("premium-walnuts"), featured: true, bestSeller: false },
  { ...base, id: "ajwa-dates", name: "Ajwa Dates", slug: "ajwa-dates", category: "dates",
    shortDescription: "Sample product.", description: "Sample description. Edit in admin.",
    variants: std("ajwa-dates"), featured: false, bestSeller: true },
  { ...base, id: "mabroom-dates", name: "Mabroom Dates", slug: "mabroom-dates", category: "dates",
    shortDescription: "Sample product.", description: "Sample description. Edit in admin.",
    variants: std("mabroom-dates"), featured: false, bestSeller: false },
  { ...base, id: "golden-raisins", name: "Golden Raisins", slug: "golden-raisins", category: "raisins",
    shortDescription: "Sample product.", description: "Sample description. Edit in admin.",
    variants: std("golden-raisins"), featured: false, bestSeller: false },
  { ...base, id: "mixed-dry-fruits", name: "Mixed Dry Fruits", slug: "mixed-dry-fruits", category: "mixed-nuts",
    shortDescription: "Sample product.", description: "Sample description. Edit in admin.",
    variants: std("mixed-dry-fruits"), featured: true, bestSeller: true },
  { ...base, id: "royal-gift-box", name: "Royal Gift Box", slug: "royal-gift-box", category: "gift-boxes",
    shortDescription: "Sample gift box.", description: "Sample description. Edit in admin.",
    variants: v("royal-gift-box", ["Gift box", 0]), featured: true, bestSeller: false }
];

// Reference stock photography shipped in /public/products. Replace with real photos
// (upload via the admin dashboard once it exists, or drop files in /public and edit here).
export const SAMPLE_PRODUCTS: Product[] = RAW_SAMPLES.map((p) => ({
  ...p,
  images: [`/products/${p.slug}.jpg`]
}));
