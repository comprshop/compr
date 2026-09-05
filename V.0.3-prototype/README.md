# COMPR v0.3 — canonical extension source

`V.0.3-prototype/` is the active extension development source. Older extension folders and ZIP files are archives/snapshots and must not receive new work.

## Current behavior

- Detects product data from structured metadata and careful visible-page fallbacks.
- Saves and compares products locally in browser-extension storage.
- Calls the authenticated backend for Find This Cheaper.
- Shows exact, strong, likely and possible confidence tiers.
- Treats plan, usage, Founding eligibility and subscription status as server-authoritative.
- Presents savings as potential savings and asks users to verify retailer price and availability.
- Keeps development fixtures isolated; the production build excludes the demo catalogue and localhost configuration.

No private provider, Stripe or Supabase service-role secret belongs in this folder. The public Supabase project URL and publishable/anon client key are injected only into the production build.

## Local use and tests

Load this folder unpacked through `chrome://extensions` or `edge://extensions`. Start `find-cheaper-backend/start-backend.ps1` for local authenticated search.

```powershell
node tests/core.test.js
node tests/find-cheaper.test.js
```

Create a production package with `tools/build-production-extension.ps1` using the real public HTTPS endpoints and Chrome Web Store URL. Cached client state is display-only; `/v1/me`, `/v1/search`, Checkout and verified Stripe webhooks decide access.
