"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

// Display data only. Prices are re-read from the database on the server
// at checkout, so editing localStorage cannot change what a customer pays.
export interface CartLine {
  productId: string;
  variantId: string;
  name: string;
  slug: string;
  variantLabel: string;
  price: number;
  image?: string;
  stock?: number;
  quantity: number;
}

interface CartState {
  lines: CartLine[];
  open: boolean;
  add: (line: Omit<CartLine, "quantity">, qty?: number) => void;
  setQty: (productId: string, variantId: string, qty: number) => void;
  remove: (productId: string, variantId: string) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      open: false,
      add: (line, qty = 1) =>
        set((s) => {
          const existing = s.lines.find((l) => l.productId === line.productId && l.variantId === line.variantId);
          const limit = Math.min(50, line.stock ?? 50);
          const lines = existing
            ? s.lines.map((l) => l === existing ? { ...line, quantity: Math.min(l.quantity + qty, limit) } : l)
            : [...s.lines, { ...line, quantity: Math.min(qty, limit) }];
          return { lines, open: true };
        }),
      setQty: (productId, variantId, qty) =>
        set((s) => ({ lines: s.lines.flatMap((l) => {
          if (l.productId !== productId || l.variantId !== variantId) return [l];
          return qty > 0 ? [{ ...l, quantity: Math.min(qty, 50, l.stock ?? 50) }] : [];
        }) })),
      remove: (productId, variantId) => set((s) => ({ lines: s.lines.filter((l) => l.productId !== productId || l.variantId !== variantId) })),
      clear: () => set({ lines: [] }),
      setOpen: (open) => set({ open })
    }),
    { name: "royal-nuts-cart", partialize: (s) => ({ lines: s.lines }) }
  )
);

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);
export const cartSubtotal = (lines: CartLine[]) => lines.reduce((n, l) => n + l.price * l.quantity, 0);
