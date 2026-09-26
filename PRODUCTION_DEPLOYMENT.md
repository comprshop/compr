# COMPR production deployment

This is a preparation document. Do not switch Stripe to Live until every Sandbox gate and the legal/business review are complete.

## Backend contract

Deploy `find-cheaper-backend/` as a Node 20+ HTTPS service or use its Dockerfile. Required secret environment variables are documented in `.env.example`. Set `NODE_ENV=production`, `COMPR_HOST=0.0.0.0`, an exact `COMPR_ALLOWED_ORIGINS` list, and a writable `COMPR_CACHE_PATH` outside the application image. Never expose the service-role key, Brave key, Stripe secret key or webhook signing secret to the extension.

The hosting platform must terminate TLS, forward requests without rewriting Stripe webhook bodies, restart failed processes, and persist logs. Verify `/health`, authenticated `/v1/me`, search, Checkout, Portal and signed webhook delivery.

Apply all Supabase migrations through `011_data_retention_and_account_deletion.sql`. Set and verify the retention environment values from `find-cheaper-backend/.env.example`; the documented defaults are 30 days for search records, 90 days after period end for usage records, 1 day after expiry for checkout reservations, 24 hours for product/coupon cache and a 60-minute cleanup interval. The application cannot control Render's own log retention, so verify that separately in Render.

## Extension production artifact

Run `tools/build-production-extension.ps1` only after the public HTTPS API URL, final Supabase public values, auth callback and Chrome Web Store URL are known. The script removes the demo catalogue, replaces public runtime configuration, removes localhost permissions, scans for unsafe references and creates `dist/compr-extension-production.zip`.

## Release gates

- All automated tests pass.
- Production ZIP validation passes with no localhost/demo/private-secret references.
- CORS contains only the final extension and website origins.
- Supabase redirect allowlist contains the exact callback.
- Migration 011 is applied; scheduled cleanup and a disposable-account deletion are verified against production Supabase.
- Stripe Sandbox Pro and Ultimate end-to-end checks pass.
- Privacy, Terms, Subscription Terms and account-deletion instructions contain real business/support details and receive human/legal review.
- A controlled live payment, cancellation and refund is tested only after explicit authorization.
