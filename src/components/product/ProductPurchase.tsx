"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "@/lib/types";
import { useCart } from "@/store/cart";
import { formatPKR } from "@/lib/format";

export default function ProductPurchase({ product }: { product: Product }) {
  const firstBuyable = product.variants.find((v) => v.price > 0 && v.stock > 0) ?? product.variants[0];
  const [variantId, setVariantId] = useState(firstBuyable?.id);
  const [qty, setQty] = useState(1);
  const add = useCart((s) => s.add);
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const variant = useMemo(() => product.variants.find((v) => v.id === variantId), [product, variantId]);
  if (!variant) return <p>This product has no sizes configured yet.</p>;

  const noPrice = variant.price <= 0;
  const soldOut = variant.stock <= 0;
  const saving = variant.compareAtPrice && variant.compareAtPrice > variant.price
    ? Math.round(((variant.compareAtPrice - variant.price) / variant.compareAtPrice) * 100) : 0;

  return (
    <div>
      <div className="flex items-baseline gap-3">
        {noPrice ? <p className="text-lg text-ink/60">Price not set yet</p> : (
          <>
            <p className="font-serif text-3xl text-navy">{formatPKR(variant.price)}</p>
            {saving > 0 && <p className="text-ink/50 line-through">{formatPKR(variant.compareAtPrice!)}</p>}
            {saving > 0 && <span className="bg-gold px-2 py-0.5 text-xs font-semibold text-navy">{saving}% off</span>}
          </>
        )}
      </div>
      <p className={`mt-1 text-sm ${soldOut ? "text-red-700" : "text-forest"}`}>
        {soldOut ? "Out of stock" : "In stock"}
      </p>

      <fieldset className="mt-6">
        <legend className="mb-2 text-sm font-medium">Weight</legend>
        <div className="flex flex-wrap gap-2">
          {product.variants.map((v) => (
            <label key={v.id}
              className={`cursor-pointer border px-4 py-2 text-sm ${v.id === variantId ? "border-navy bg-navy text-cream" : "border-navy/25 bg-white hover:border-gold-dark"}`}>
              <input type="radio" name="variant" value={v.id} checked={v.id === variantId}
                onChange={() => setVariantId(v.id)} className="sr-only" />
              {v.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center border border-navy/25 bg-white">
          <button type="button" className="px-3 py-2.5" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
          <span className="min-w-8 text-center" aria-live="polite">{qty}</span>
          <button type="button" className="px-3 py-2.5" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(50, q + 1))}>+</button>
        </div>
        <button className="btn-navy flex-1 sm:flex-none sm:min-w-48" disabled={noPrice || soldOut || product.isSample}
          onClick={() => {
            add({
              productId: product.id, variantId: variant.id, name: product.name, slug: product.slug,
              variantLabel: variant.label, price: variant.price, image: product.images[0]
            }, qty);
            setAdded(true);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => setAdded(false), 1800);
          }}>
          <span aria-live="polite">{product.isSample ? "Demo product" : added ? "Added to cart" : "Add to cart"}</span>
        </button>
      </div>
      {product.isSample && <p className="mt-3 text-sm text-ink/60">Demo prices and stock are for preview only. This sample cannot be purchased.</p>}
      {noPrice && !product.isSample && <p className="mt-3 text-sm text-ink/60">This item is not available to order yet. Please contact us for availability.</p>}
    </div>
  );
}
