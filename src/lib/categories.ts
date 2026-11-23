import type { CategorySlug } from "./types";

export interface Category { slug: CategorySlug; name: string; image: string }

// Images live in /public/categories (stock photography; see public/photo-credits.json).
export const CATEGORIES: Category[] = [
  { slug: "almonds", name: "Almonds", image: "/categories/almonds.jpg" },
  { slug: "cashews", name: "Cashews", image: "/categories/cashews.jpg" },
  { slug: "pistachios", name: "Pistachios", image: "/categories/pistachios.jpg" },
  { slug: "walnuts", name: "Walnuts", image: "/categories/walnuts.jpg" },
  { slug: "raisins", name: "Raisins", image: "/categories/raisins.jpg" },
  { slug: "dates", name: "Dates", image: "/categories/dates.jpg" },
  { slug: "figs", name: "Figs", image: "/categories/figs.jpg" },
  { slug: "peanuts", name: "Peanuts", image: "/categories/peanuts.jpg" },
  { slug: "mixed-nuts", name: "Mixed Nuts", image: "/categories/mixed-nuts.jpg" },
  { slug: "gift-boxes", name: "Premium Gift Boxes", image: "/categories/gift-boxes.jpg" }
];

export const categoryName = (slug: string) =>
  CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;
