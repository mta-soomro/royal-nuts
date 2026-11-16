import { SAMPLE_PRODUCTS } from "./sample-products";
import type { Product } from "./types";

// Fictional PKR values for storefront demonstrations, not a real price list.
const PRICE_PER_KG: Record<string, number> = {
  "premium-almonds": 2800,
  "premium-cashews": 3600,
  "roasted-pistachios": 4000,
  "salted-pistachios": 4200,
  "premium-walnuts": 3200,
  "ajwa-dates": 3600,
  "mabroom-dates": 2400,
  "golden-raisins": 1200,
  "mixed-dry-fruits": 3000
};

export const DEMO_PRODUCTS: Product[] = SAMPLE_PRODUCTS.map((product) => ({
  ...product,
  id: `demo-${product.id}`,
  slug: `demo-${product.slug}`,
  shortDescription: `Demo ${product.name.toLowerCase()} with sample PKR prices.`,
  description: `Explore ${product.name.toLowerCase()} in this demonstration catalog. Prices, inventory and product details are fictional placeholders. This sample is not available for purchase.`,
  ingredients: "Demo information only. Replace with verified ingredients and allergen information before selling.",
  storage: "Demo information only. Replace with verified storage guidance before selling.",
  active: true,
  isSample: true,
  variants: product.variants.map((variant) => ({
    ...variant,
    id: `demo-${variant.id}`,
    price: product.id === "royal-gift-box" ? 3500 : Math.round(PRICE_PER_KG[product.id] * variant.grams / 1000),
    stock: product.id === "royal-gift-box" ? 20 : 50,
    sku: `DEMO-${product.id.toUpperCase()}-${variant.grams || "BOX"}`
  }))
}));