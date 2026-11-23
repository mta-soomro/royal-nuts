import Link from "next/link";
import Image from "next/image";
import HeroVisual from "@/components/home/HeroVisual";
import DismissibleBanner from "@/components/layout/DismissibleBanner";
import ProductCard from "@/components/product/ProductCard";
import Section from "@/components/home/Section";
import NewsletterForm from "@/components/home/NewsletterForm";
import { CATEGORIES } from "@/lib/categories";
import { getBestSellers, getFeatured, getGiftBoxes, usingSampleData } from "@/lib/data/products";
import { getStoreSettings } from "@/lib/data/settings";
import { site, whatsappLink } from "@/lib/site";

export const revalidate = 60;

const reasons = [
  { t: "Retail and wholesale", d: "Order a single pack for home or ask about bulk quantities for your shop or office." },
  { t: "Pay the way you prefer", d: "Place your order securely and pay cash when it arrives." },
  { t: "Gift boxes", d: "Ready-made premium boxes for weddings, Eid, corporate gifts and family occasions." },
  { t: "Track your order", d: "Sign in to your account to see your orders and their latest status." }
];

export default async function Home() {
  const [featured, best, gifts, sample] = await Promise.all([
    getFeatured(4), getBestSellers(4), getGiftBoxes(3), usingSampleData()
  ]);
  const settings = await getStoreSettings();
  const bulkLink = whatsappLink("Hello Royal Nuts, I would like to ask about a bulk order.", settings.whatsapp);

  return (
    <>
      {sample && (
        <DismissibleBanner>
          Preview mode: products shown are samples. Real products will appear as they become available.
        </DismissibleBanner>
      )}

      {/* Hero */}
      <section className="overflow-x-clip bg-navy text-cream">
        <div className="container-page grid items-center gap-10 py-14 lg:grid-cols-[1.15fr_1fr] lg:py-20">
          <div className="animate-hero-rise">
            <h1 className="text-4xl leading-[1.1] !text-cream sm:text-5xl lg:text-6xl">
              Discover the Royal Taste of Premium Dry Fruits.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-cream/80">{site.slogan} Almonds, cashews, pistachios, dates and gift boxes, delivered across Pakistan.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/shop" className="btn-gold">Shop Now</Link>
              <Link href="/shop?category=gift-boxes" className="btn-outline">Explore Our Collection</Link>
            </div>
          </div>
          <HeroVisual src={site.heroImage || "/hero/hero.jpg"} />
        </div>
      </section>

      <Section title="Shop by category" href="/shop" linkLabel="All products">
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORIES.map((c) => (
            <li key={c.slug}>
              <Link href={`/shop?category=${c.slug}`} className="group block text-center">
                <span className="arch relative block aspect-[4/5] w-full overflow-hidden border border-gold/50 bg-cream-dark">
                  <Image src={c.image} alt="" fill sizes="(min-width:1024px) 14rem, (min-width:640px) 30vw, 45vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105" unoptimized={c.image.endsWith(".svg")} />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/90 via-navy/60 to-transparent px-2 pb-3 pt-10 font-serif text-lg text-cream">
                    {c.name}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {featured.length > 0 && (
        <Section title="Featured products" href="/shop" tone="white">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{featured.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </Section>
      )}

      {best.length > 0 && (
        <Section title="Best sellers" href="/shop">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{best.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </Section>
      )}

      {gifts.length > 0 && (
        <Section title="Premium gift boxes" href="/shop?category=gift-boxes" tone="dark">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{gifts.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </Section>
      )}

      <Section title="Why choose Royal Nuts?">
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map((r) => (
            <li key={r.t} className="border-t-2 border-gold pt-4">
              <h3 className="text-xl">{r.t}</h3>
              <p className="mt-2 text-sm text-ink/75">{r.d}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Sizes and packaging" tone="white">
        <div className="grid gap-8 lg:grid-cols-2">
          <p className="max-w-xl text-lg leading-relaxed text-ink/80">
            Most products come in 250g, 500g and 1kg packs, so you can buy for a single household or stock up for guests.
            Need custom quantities, branded packaging or a corporate order? Message us and we will arrange it.
          </p>
          <div className="flex items-start">
            {bulkLink
              ? <a href={bulkLink} target="_blank" rel="noopener noreferrer" className="btn-navy">Ask about a bulk order on WhatsApp</a>
              : <Link href="/contact" className="btn-navy">Ask about a bulk order</Link>}
          </div>
        </div>
      </Section>

      <section className="bg-navy py-16 text-center text-cream">
        <div className="container-page">
          <h2 className="text-3xl !text-cream">Offers and new arrivals, by email</h2>
          <p className="mt-2 text-cream/70">We only write when we have something worth sharing.</p>
          <NewsletterForm />
        </div>
      </section>

      {(site.instagram || site.facebook) && (
        <Section title="Follow Royal Nuts">
          <div className="flex flex-wrap gap-3">
            {site.instagram && <a className="btn-outline-dark" href={site.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>}
            {site.facebook && <a className="btn-outline-dark" href={site.facebook} target="_blank" rel="noopener noreferrer">Facebook</a>}
          </div>
        </Section>
      )}
    </>
  );
}
