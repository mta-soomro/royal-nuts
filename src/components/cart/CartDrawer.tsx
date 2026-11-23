"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cartSubtotal, useCart } from "@/store/cart";
import { formatPKR } from "@/lib/format";
import ProductImage from "@/components/ui/ProductImage";

export default function CartDrawer() {
  const { lines, open, setOpen, setQty, remove } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!mounted || !open) return null;
  const subtotal = cartSubtotal(lines);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <button className="absolute inset-0 animate-fade-in bg-navy/50" aria-label="Close cart" onClick={() => setOpen(false)} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md animate-slide-in flex-col bg-cream shadow-xl">
        <div className="flex items-center justify-between border-b border-gold/40 px-5 py-4">
          <h2 className="text-xl">Your cart</h2>
          <button onClick={() => setOpen(false)} className="p-1" aria-label="Close cart">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="font-serif text-xl text-navy">Your cart is empty</p>
            <p className="text-sm text-ink/70">Add a pack of almonds, dates or a gift box to get started.</p>
            <Link href="/shop" onClick={() => setOpen(false)} className="btn-navy">Browse the shop</Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-gold/20 overflow-y-auto px-5">
              {lines.map((l) => (
                <li key={`${l.productId}:${l.variantId}`} className="flex gap-3 py-4">
                  <ProductImage src={l.image} alt={l.name} sizes="5rem" className="h-20 w-20 shrink-0 rounded-sm" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/product/${l.slug}`} onClick={() => setOpen(false)} className="font-medium leading-tight hover:text-gold-dark">{l.name}</Link>
                    <p className="text-sm text-ink/60">{l.variantLabel}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center rounded-sm border border-navy/20">
                        <button className="px-2.5 py-1" aria-label={`Decrease ${l.name} quantity`} onClick={() => setQty(l.productId, l.variantId, l.quantity - 1)}>−</button>
                        <span className="min-w-6 text-center text-sm" aria-live="polite">{l.quantity}</span>
                        <button className="px-2.5 py-1" aria-label={`Increase ${l.name} quantity`} disabled={l.quantity >= Math.min(50, l.stock ?? 50)} onClick={() => setQty(l.productId, l.variantId, l.quantity + 1)}>+</button>
                      </div>
                      <span className="text-sm font-semibold">{formatPKR(l.price * l.quantity)}</span>
                    </div>
                    <button onClick={() => remove(l.productId, l.variantId)} className="mt-1 text-xs text-ink/60 underline hover:text-ink">Remove</button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-gold/40 px-5 py-4">
              <div className="flex justify-between text-sm"><span>Subtotal</span><span className="font-semibold">{formatPKR(subtotal)}</span></div>
              <p className="mt-1 text-xs text-ink/60">Delivery is shown at checkout. Pay cash on delivery.</p>
              <Link href="/checkout" onClick={() => setOpen(false)} className="btn-navy mt-4 w-full">Proceed to checkout</Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
