# Royal Nuts storefront

A Next.js storefront with Supabase email/password authentication, saved customer profiles, private contact messages, newsletter subscriptions, and cash-on-delivery orders.

## Run locally

1. Install Node.js 20.19 or newer and run `npm install` in this folder.
2. Copy `.env.example` to `.env.local` only if `.env.local` does not already exist. Keep existing values.
3. Set `NEXT_PUBLIC_SUPABASE_URL` to the base project URL (`https://your-project-ref.supabase.co`), without `/rest/v1` or any dashboard path.
4. Set `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, or the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Run the entire `supabase/schema.sql` in your project's Supabase SQL Editor. It is transactional and safe to rerun, preserves existing rows and backfills profiles for existing auth users.
6. Run `npm run db:check`, then `npm run dev`. Open http://localhost:3000.

`npm run build` creates the production build; `npm start` serves it. Restart the server after changing `.env.local`.

## Authentication

- `/signup`: full name, email, password, confirmation and password strength. User credentials are managed by Supabase Auth; passwords are never stored in public application tables.
- `/login`: email/password login, forgot password and resend confirmation.
- `/auth/callback`: exchanges the PKCE code into a cookie session. Failed/expired links show an actionable login error.
- `/auth/confirm`: supports token-hash confirmation links, including links opened in a different browser.
- `/update-password`: updates the signed-in user's password, including after a recovery link.
- `/account`: server-protected saved name, phone, address and city, plus the signed-in customer's order history. Profile changes are stored in `profiles`.
- Next.js `proxy.ts` refreshes cookies on private routes; protected pages and server actions independently verify the user. RLS enforces customer isolation in the database.

In Supabase **Authentication > URL Configuration** set Site URL to `http://localhost:3000` and allow `http://localhost:3000/**` under Redirect URLs. Set the production Site URL and explicitly allow the production redirect paths when deploying. The callback URLs need to match the origin used in the browser.

Email/password signup must be enabled. Enable email confirmation for verified accounts. With default email templates, open confirmation/reset links in the same browser used to request them (PKCE). To support opening them on another device, use these links in **Authentication > Email Templates**:

Confirm signup:
```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/account">Confirm email</a>
```
Reset password:
```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset password</a>
```

Google login is optional. Enable/configure the Google provider in Supabase, then set `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true` and rebuild/restart. The button remains hidden by default. Email delivery and provider credentials are configured in Supabase, not in the browser app.

## Contact, social links and newsletter

- `/contact` has phone, email, address, WhatsApp, Instagram/Facebook links and a database-backed message form.
- Messages are stored privately in `contact_messages` through a validation RPC with a per-email limit of five messages per hour. Public clients cannot read the inbox. Review messages in Supabase Table Editor and update their `status` as you handle them. The app stores messages; it does not send email notifications or reply automatically.
- Newsletter signup uses an idempotent RPC. Public clients cannot read the subscriber list.
- Edit the singleton `store_settings` row (`id = 1`) in Table Editor to configure public `phone`, `email`, `address`, `whatsapp`, `instagram`, `facebook` and `shipping_fee`. Blank contact values fall back to the corresponding `NEXT_PUBLIC_*` env settings.
- WhatsApp accepts an international number with country code. Instagram/Facebook accept HTTPS profile/page URLs (not just handles). Follow buttons open the social page, where the visitor chooses whether to follow.
- Do not put private values in `store_settings` or variables prefixed with `NEXT_PUBLIC_`.

## Products and cash-on-delivery checkout

Manage `products` in Supabase Table Editor. The top-level `id` and `active` columns control queries. Product details in `data` must follow `src/lib/types.ts`; variant IDs must be unique within a product. Use real names, descriptions, prices, photos and inventory. Set `data.isSample = false` before selling. Products with a zero price, no stock, or the sample flag cannot be ordered.

The seed command imports missing placeholders without overwriting existing product IDs:

1. Temporarily add the project's service-role key as `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.
2. Run `npm run seed`.
3. Remove the service-role key afterward. It is not required for normal storefront use.

Seed products have placeholder content, zero prices and zero stock. The storefront displays a preview catalog when the database has no active products. Publish verified prices and stock to accept orders.

`/checkout` requires a signed-in, email-verified customer. The only implemented payment method is cash on delivery. The delivery fee is read from `store_settings.shipping_fee` (initially zero/free). No bank, card or wallet payment is collected by this app.

The `place_order` database function recalculates prices and delivery fees, locks inventory rows, updates stock, and inserts the order atomically. It accepts product/variant IDs and quantities; browser cart prices are not trusted. Failed orders roll back inventory. A per-user request key makes retries idempotent. Orders record snapshots of purchased items and delivery details and are visible only to their customer. The order history shows the latest 50 orders.

Review orders in Table Editor and progress `status` through `pending`, `confirmed`, `shipped`, `delivered` or `cancelled`. Cancellation/refund workflows are not automated; if cancelling an order, the store must restore inventory as appropriate. Customer order emails, shipping integrations and online payment gateways are not included.

Supabase public Storage images are supported from the configured project host. Local placeholder illustrations remain in `public/`.

## Verification

- `npm run db:check`: live read/invalid-input checks of the product catalog, Auth settings, store settings, contact/newsletter functions and anonymous-access restrictions. Creates no records and sends no emails.
- `npm run typecheck`: TypeScript checks.
- `npm run lint`: ESLint.
- `npm run test:db`: runs the actual application SQL in isolated in-memory PostgreSQL (PGlite), with fixtures for Supabase auth roles. Verifies reruns, profile triggers, privacy, input validation, stock rollback, delivery/price calculation and retry protection. Does not use the live database. The unused pgcrypto extension statement is skipped in this harness.
- `npm run test:browser`: run the built server on `127.0.0.1:3100` first (`npm start -- --hostname 127.0.0.1 --port 3100`). Headless Edge checks desktop/mobile navigation, signup validation, PKCE payloads, account/checkout redirects, login/reset/resend error states, callback safety and the contact action's honeypot. Auth requests are mocked; the contact test is rejected before saving. Set `TEST_BROWSER_CHANNEL=chrome` if Edge is unavailable, or `TEST_BASE_URL` for another local origin. Screenshots are saved in `artifacts/`.

After setup, manually sign up with your own email, confirm it, sign in, edit your profile, and request/reset your password to verify actual email delivery. Automated browser tests do not claim to test the email provider or an actual customer login end to end.

## Deploy to Vercel

Import `mta-soomro/royal-nuts` into your Vercel account with the **Next.js** framework preset and the repository root (`.`) as Root Directory. The repository already contains `package.json` at its top level. Use the default install/build settings (`npm install` / `npm run build`) and Production Branch `main`.

Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the Vercel project environment before building. Copy any configured public contact/social variables from `.env.local` into Vercel as well. Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS production URL, or leave it unset to use the Vercel-provided production URL automatically. Do not copy the localhost site URL into production. The running storefront does not require a Supabase secret/service-role key.

After deploying, set the Supabase Auth Site URL to the HTTPS production URL and allow that exact production origin followed by `/**` under Authentication > URL Configuration. Keep localhost redirect URLs for local development. Confirmation and password-reset links need the production allowlist to work on the live site. Rebuild after changing any `NEXT_PUBLIC_*` environment variables.

Local env files, build output and test screenshots are excluded from CLI uploads by `.vercelignore`. Credentials must be configured through Vercel environment settings rather than committed or uploaded as env files.


## Priced demo catalog

Run `supabase/demo-products.sql` in Supabase SQL Editor after the schema to add 10 demo products with fictional PKR prices, pack sizes and sample inventory. It preserves existing rows and is safe to rerun. The `demo-` IDs and slugs are separate from real products, and the sample flag keeps them out of checkout.

Alternatively, temporarily set a server-only `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and run `npm run seed:demo`. Remove the write key afterward. Regenerate the SQL from `src/lib/demo-products.ts` with `npm run seed:sql`. Neither key is needed in Vercel for normal storefront use.

## Owner dashboard and business launch

Visit `/admin` after signing in with a verified owner account. Set server-only `ADMIN_USER_IDS` to the owner's UUID from Supabase Authentication > Users. Configure `SUPABASE_SECRET_KEY` (or legacy `SUPABASE_SERVICE_ROLE_KEY`) on the server. Never prefix these variables with NEXT_PUBLIC_. Restart locally or redeploy after changes. The dashboard remains inaccessible without both a verified allowlisted identity and server credentials.

The dashboard creates products with a pack size, verified PKR price, stock, local photo, ingredient/allergen information and storage instructions. Leave Publish unchecked to save a draft. It lists the latest 100 products and orders, customer delivery information, purchased items and totals. Orders advance pending > confirmed > shipped > delivered using conditional updates. Product edits, replenishment and cancellation/restocking still require a transactional database workflow; use Supabase for those operations with care. Creating products does not overwrite existing inventory.

Launch sequence:
1. Configure the owner UUID and server key, then verify `/admin` with an owner and an ordinary customer account.
2. Add real products, pack sizes, prices and inventory. Stock photos are reference imagery; verify suitability for your actual goods.
3. Configure store_settings with business contact details and delivery charges.
4. Deploy to Vercel with public Supabase configuration, server-only owner settings, and NEXT_PUBLIC_SITE_URL pointing to the deployed HTTPS origin.
5. Set Supabase Auth Site URL and redirect allowlist to that origin. Configure production SMTP and verify confirmation and password-reset email delivery.
6. Place a controlled cash-on-delivery order using your own customer account; verify final total, inventory deduction, customer order history and owner order processing before advertising the store.
7. Establish your delivery area, fulfilment process, returns/refund terms, privacy notice and customer support process before public launch.

Online payments, courier bookings, order notification emails, photo uploads, cancellation/restocking and a complete inventory editor are not implemented by the initial owner dashboard.
