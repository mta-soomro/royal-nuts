"use client";
import Image from "next/image";
import { useState } from "react";

const sizesDefault = "(min-width:1024px) 25vw, 50vw";

function Placeholder({ alt, className }: { alt: string; className: string }) {
  return (
    <div role="img" aria-label={`${alt} (photo coming soon)`}
      className={`flex items-center justify-center bg-cream-dark text-navy/30 ${className}`}>
      <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M10 50V26C10 14 18 7 28 7s18 7 18 19v24" />
        <path d="M18 50V27c0-7 4-12 10-12s10 5 10 12v23" />
      </svg>
    </div>
  );
}

/**
 * Shows a product photo with a soft skeleton behind it while it loads. The image itself is never
 * hidden, so a load event that fires before hydration can't leave it invisible. If there is no `src`, or the
 * image fails to load (bad URL, host not allowed in next.config, offline), it falls
 * back to the arch placeholder instead of a broken-image icon.
 */
export default function ProductImage({
  src, alt, className = "", priority = false, sizes = sizesDefault, zoomOnHover = false
}: { src?: string; alt: string; className?: string; priority?: boolean; sizes?: string; zoomOnHover?: boolean }) {
  if (src && /^\/products\/[^/]+\.svg$/.test(src)) src = src.replace(/\.svg$/, ".jpg");
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  if (!src || state === "failed") return <Placeholder alt={alt} className={className} />;

  return (
    <div className={`relative overflow-hidden bg-cream-dark ${className}`}>
      {state === "loading" && <div aria-hidden="true" className="absolute inset-0 animate-pulse bg-gold-light/40" />}
      <Image
        src={src} alt={alt} fill sizes={sizes} priority={priority}
        unoptimized={src.endsWith(".svg")}
        onLoad={() => setState("ready")}
        onError={() => setState("failed")}
        className={`object-cover transition-transform duration-500 ${zoomOnHover ? "group-hover:scale-105" : ""}`}
      />
    </div>
  );
}
