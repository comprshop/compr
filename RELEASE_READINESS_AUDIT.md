# COMPR release-readiness audit — Week 4 preparation

Audit date: 2 September 2026. Scope: repository and dry-run preparation only. No Chrome/product test, migration, production call, deployment, publication, submission or release ZIP was performed.

## Readiness matrix

| Area | Status | Verified finding / required action |
|---|---|---|
| Canonical source | READY | `V.0.3-prototype/` is the documented canonical source. Archive folders are not build inputs. |
| Product name | READY | Manifest, documentation and store drafts use `COMPR`. |
| Current version | WARNING | Manifest is `0.3.0`. It was not changed today. Dashboard history is unavailable locally. |
| Proposed version | MANUAL | Use `0.3.1` only after confirming the highest version uploaded in the Chrome Web Store dashboard is lower. Future filename: `COMPR-v0.3.1-production.zip`. |
| Manifest format | READY | Manifest V3. |
| Permissions | READY | Only `storage`, `activeTab` and `scripting`; no `<all_urls>`. Each is covered in the store rationale. |
| Development hosts | READY | Canonical development manifest contains localhost intentionally. Production build replaces host permissions and fails on HTTP/localhost. Never upload the source folder directly. |
| Production hosts | MANUAL | Must be exactly the confirmed COMPR HTTPS API, Supabase HTTPS project and ECB HTTPS endpoint after the real API URL is supplied. |
| Content Security Policy | READY | Explicit extension-page CSP is `script-src 'self'; object-src 'self'`. |
| Web-accessible resources | READY | Only `auth-receiver.html`, restricted by the build to the callback website origin. |
| External messaging | READY | No `externally_connectable`; unused external message flow remains removed. |
| Background worker | READY | Local `background.js` service worker only; it maintains badge and public ECB rates. |
| Remote executable code | READY | No remote script tags, `eval` or `new Function`; CSP and build scan enforce this. |
| External endpoints | READY/MANUAL | Supabase auth, COMPR API and ECB are packaged. Brave, Render and retailer requests remain server-side. Endpoint ownership/TLS must be checked during deployment. |
| Automatic coupon transmission | READY | P0 fixed: popup no longer sends the current URL to `/api/coupons` during recognition; production route returns 410. |
| Demo/fallback data | READY | `search/demoCatalog.js` and its HTML reference are removed from production; `matching/matcherTest.js` is now also excluded. Build scan rejects demo markers. |
| Feature flags/payments | READY | Production runtime remains `betaMode: true`; Stripe client checkout is unreachable in that mode. Server Stripe configuration must remain unset/disabled. |
| Secrets | READY/MANUAL | No privileged key is intentionally packaged. The Supabase publishable key is public by design. Build rejects secret-looking values. Deployment secrets must be checked outside the repository. |
| Environment files | READY | Only `find-cheaper-backend/.env.example` was found; no populated `.env` belongs in the build. |
| Build exclusions | READY | Tests, audits, checklists, `.env`, PowerShell tools, ZIPs and development fixtures are excluded and checked. |
| Week 1–3 core | READY | Build fails if privacy, auth, account/storage, reliability, matching or search core files are absent. |
| Privacy/support links | MANUAL | Source links point to the GitHub Pages privacy/support location; published contents and HTTP status must be checked tomorrow/deployment day. |
| Icons | READY/MANUAL | 16, 32, 48 and 128px PNG files exist and manifest references them. Visual appearance must be checked in Chrome/Web Store. |
| Duplicate/archive sources | WARNING | `compr/`, `V.0.2.3/`, `github-upload/`, `backups/` and old ZIPs remain archives. They are excluded; do not edit or upload them. |
| Old production ZIP | BLOCKER | `dist/compr-extension-production.zip` is stale (113,265 bytes; modified 27 August 2026 22:25:14) and lacks Week 3 reliability code. Never submit it. It remains unchanged. |
| Production script | READY | Tests first, explicit mode, strict inputs, whitelist/exclusions, required-file gate, manifest/CSP/secret scan, inventory preview, safe cleanup and versioned non-overwrite ZIP. |
| Database order | BLOCKER | Before production: backup/verify, apply migration 010 if not already applied, then unapplied migration 011; validate cleanup/account deletion. Migration 011 was not applied today. |
| Retention deployment | MANUAL | Render values and `/health` must exactly match 30/90/1 days, 24-hour cache and hourly cleanup. |
| Provider retention/legal identity | BLOCKER | Responsible legal/operator identity and actual provider-side retention/settings are not in the repository. Do not invent them; verify before final disclosure/submission. |
| Manual regression | BLOCKER | Tomorrow's 60–90 minute Chrome checklist and product plan must pass without P0/P1 release failures. |

## Future production package contents

Only these groups belong in the future package:

- root: `manifest.json`, `popup.html/js`, `compare.html/js`, `background.js`, `auth-receiver.html/js`, `privacy.md`;
- `icons/`: four manifest icons;
- `styles/`: popup and compare CSS;
- `shared/`: auth, API, currency, i18n, product, runtime configuration, similarity, storage and reliability;
- `detectors/`: local product/price/brand/category/variant/availability/policy/discount detectors;
- `matching/`: runtime `productMatcher.js` only;
- `compare/`: runtime collection, price and product-card modules;
- `search/`: runtime query builder and provider only.

Not included: tests, `demoCatalog.js`, `matcherTest.js`, Markdown beyond packaged `privacy.md`, `.env*`, backend, migration files, tools, screenshots, archives or ZIPs.

## Deployment order after manual approval

1. Resolve legal/provider blockers and record the highest dashboard package version.
2. Complete manual Chrome/product test evidence; fix and repeat any failed P0/P1 case.
3. Verify backups and apply database migrations in numeric order, including 011 after 010.
4. Configure/deploy backend with HTTPS, allowed origins, Supabase/service-role and Brave secrets, exact retention values, and Stripe disabled.
5. Verify health, authentication, cleanup, account deletion, CORS and no-sensitive-log behavior.
6. Publish the matching privacy/support website revision and verify links.
7. Set manifest to the approved version (proposed `0.3.1`) and rerun the complete validation-only build with real values.
8. Run one final unpacked smoke test from the temporary controlled build.
9. Explicitly run the release mode once; inspect the printed inventory and resulting version-bound ZIP hash.
10. Only then update dashboard declarations, upload and submit. Publication remains a separate explicit decision.

## Dry-run status

Source tests, syntax, manifest and build-script safety can be run locally. A complete production-config dry-run is intentionally **BLOCKED** until the real public COMPR HTTPS API base URL is supplied and verified. The build script rejects placeholder values even in validation-only mode, so no invented URL was used. This is the desired fail-closed result, not a reason to weaken the gate.

Old-ZIP integrity reference: SHA-256 `62574E1896CD52608F7FBB25C927040E76C0BD77E31E19F0F36E9F03C7D500B8` for the unchanged 113,265-byte artifact dated 27 August 2026 22:25:14.
