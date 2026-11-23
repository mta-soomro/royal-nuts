import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import ProductGallery from "@/components/product/ProductGallery";
import ProductPurchase from "@/components/product/ProductPurchase";
import ProductCard from "@/components/product/ProductCard";
import { getProductBySlug, getRelated, startingPrice } from "@/lib/data/products";
import { categoryName } from "@/lib/categories";
import { whatsappLink } from "@/lib/site";

export const dynamic = "force-dynamic";
type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Product not found" };
  const price = startingPrice(p);
  return {
    title: `${p.name} Online in Pakistan`,
    description: `${p.shortDescription} Buy ${p.name.toLowerCase()} from Royal Nuts${price ? ` from Rs ${price.toLocaleString("en-PK")}` : ""}.`,
    openGraph: { title: p.name, images: p.images[0] ? [p.images[0]] : undefined }
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const related = await getRelated(product, 4);
  const ask = whatsappLink(`Hello Royal Nuts, I have a question about ${product.name}.`);

  return (
    <div className="container-page py-10">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-ink/60">
        <Link href="/shop" className="hover:text-ink">Shop</Link> / <Link href={`/shop?category=${product.category}`} className="hover:text-ink">{categoryName(product.category)}</Link>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} name={product.name} />

        <div>
          {product.isSample && <p className="mb-2 inline-block bg-navy px-2 py-0.5 text-xs text-cream">Sample product</p>}
          <h1 className="text-4xl">{product.name}</h1>
          <p className="mt-2 text-ink/70">{product.shortDescription}</p>
          <div className="mt-6"><ProductPurchase product={product} /></div>
          {ask && <a href={ask} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm underline decoration-gold underline-offset-4">Ask about this product on WhatsApp</a>}

          <dl className="mt-10 space-y-6 border-t border-gold/40 pt-6 text-sm">
            <div><dt className="font-serif text-lg text-navy">Description</dt><dd className="mt-1 leading-relaxed text-ink/80">{product.description}</dd></div>
            <div><dt className="font-serif text-lg text-navy">Ingredients</dt><dd className="mt-1 text-ink/80">{product.ingredients}</dd></div>
            <div><dt className="font-serif text-lg text-navy">Storage</dt><dd className="mt-1 text-ink/80">{product.storage}</dd></div>
            {product.nutrition && <div><dt className="font-serif text-lg text-navy">Nutrition</dt><dd className="mt-1 whitespace-pre-line text-ink/80">{product.nutrition}</dd></div>}
          </dl>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20" aria-labelledby="related">
          <h2 id="related" className="mb-6 text-3xl">You may also like</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{related.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </section>
      )}
    </div>
  );
}
