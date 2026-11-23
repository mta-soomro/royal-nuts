import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import CheckoutForm from "@/components/cart/CheckoutForm";
import { getSupabaseSessionClient } from "@/lib/supabase/session";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { getStoreSettings } from "@/lib/data/settings";
import type { CustomerProfile } from "@/lib/account-types";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };
export default async function CheckoutPage() {
  if (!hasSupabaseConfig) redirect("/login?next=/checkout");
  const supabase = await getSupabaseSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return (
    <section className="container-page py-16 text-center">
      <h1 className="text-4xl">Continue to checkout</h1>
      <p className="mt-4 text-ink/70">Create a customer account to place your order and track delivery. Your cart is saved in this browser.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/signup?next=%2Fcheckout" className="btn-navy">Create a customer account</Link>
        <Link href="/login?next=%2Fcheckout" className="btn-outline-dark">Sign in</Link>
      </div>
    </section>
  );
  const [{ data }, settings] = await Promise.all([
    supabase.from("profiles").select("full_name,phone,address,city").eq("id", user.id).maybeSingle(),
    getStoreSettings()
  ]);
  return <CheckoutForm profile={(data as CustomerProfile | null) ?? { full_name: user.user_metadata.full_name ?? "", phone: "", address: "", city: "" }} email={user.email ?? ""} verified={Boolean(user.email_confirmed_at)} shippingFee={settings.shippingFee} userId={user.id} />;
}
