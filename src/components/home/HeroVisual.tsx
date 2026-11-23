"use client";
import Image from "next/image";
import { useRef } from "react";

const FLOATERS = [
  { src: "/hero/float-almond.jpg", cls: "-left-6 top-[14%] w-20 sm:w-24", depth: 26, tilt: "-18deg", delay: "0s" },
  { src: "/hero/float-cashew.jpg", cls: "-right-5 top-[8%] w-20 sm:w-24", depth: -22, tilt: "14deg", delay: "-1.5s" },
  { src: "/hero/float-pistachio.jpg", cls: "-right-7 top-[52%] w-16 sm:w-20", depth: 34, tilt: "22deg", delay: "-3s" },
  { src: "/hero/float-walnut.jpg", cls: "-left-7 top-[58%] w-20 sm:w-24", depth: -30, tilt: "-8deg", delay: "-4.5s" }
];

/**
 * The hero's one moment of motion: nuts drift gently and lean toward the pointer.
 * With reduced-motion enabled the page CSS freezes the drift and we skip pointer tracking.
 */
export default function HeroVisual({ src }: { src: string }) {
  const ref = useRef<HTMLDivElement>(null);

  const move = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    el.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  };
  const reset = () => {
    ref.current?.style.setProperty("--px", "0");
    ref.current?.style.setProperty("--py", "0");
  };

  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={reset} className="relative mx-auto w-full max-w-sm animate-hero-rise [animation-delay:.15s]">
      <div className="arch border border-gold p-2">
        <div className="arch relative aspect-[3/4] overflow-hidden bg-navy-700">
          <Image src={src} alt="An assortment of nuts and dried fruits" fill priority
            sizes="(min-width:1024px) 24rem, 90vw" className="object-cover" unoptimized={src.endsWith(".svg")} />
        </div>
      </div>

      {FLOATERS.map((f) => (
        <span key={f.src} aria-hidden="true" className={`pointer-events-none absolute ${f.cls}`}>
          <span className="hero-parallax block" style={{ "--depth": f.depth } as React.CSSProperties}>
            <span className="block animate-float drop-shadow-xl" style={{ "--tilt": f.tilt, animationDelay: f.delay } as React.CSSProperties}>
              <Image src={f.src} alt="" width={120} height={120} className="aspect-square w-full rounded-full border-2 border-gold object-cover" unoptimized />
            </span>
          </span>
        </span>
      ))}
    </div>
  );
}
