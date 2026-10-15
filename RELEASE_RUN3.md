# Run 3 — local release packaging (15 October 2026)

This checkpoint is not a release. No push, deployment, remote migration, Apple configuration, installation or physical search was performed. Run 2 and migration 019 still require sandbox configuration and physical verification.

## Deterministic local packaging

Use `sh tools/build-safari-release.sh build/<new-directory>` on macOS with Xcode. It requires all of these explicit environment variables:

- `COMPR_RELEASE_API_URL=https://compr-backend.onrender.com`
- `COMPR_RELEASE_SUPABASE_URL=https://taosgvfdnblnopaywimf.supabase.co`
- `COMPR_RELEASE_SUPABASE_PUBLIC_KEY`: the existing public publishable client key in canonical runtime configuration, never a private/server key.
- `COMPR_RELEASE_AUTH_CALLBACK_URL=https://getcompr.nl/auth-callback.html`
- `COMPR_RELEASE_VERSION` and `COMPR_RELEASE_BUILD`: approved version and unused upload build number.

The wrapper only generates and builds a local unsigned iOS Release artifact. It refuses an existing output directory. Staging pins the endpoint/key/callback matrix and checks the allowlisted output for sandbox references, local endpoints and secret markers. The Xcode build guard independently rejects non-Release builds, mixed environments, debug diagnostics and sandbox native plist values. Signing is disabled only via the unsigned inspection command; identifiers, entitlements and signing security are not bypassed in the project.

The existing isolated Debug generator still uses `uhvukecryuvosuascics`, explicitly enables diagnostics, and rejects Release/archive actions. No Debug project or physical device was rebuilt here. Safari production sessions now use the same production-project storage namespace in JavaScript and both native targets; legacy unscoped sessions are not imported. Chrome's existing unscoped path is unchanged.

Canonical files are copied from the existing Safari allowlist. Documented Release transforms are: production runtime/host permissions, Safari platform injection, removal of demo fallback references, and removal of the inactive sandbox-only auth guard. The exact production auth guard remains. Native source, onboarding resources, entitlements and privacy manifests come from `safari-mac-day-kit/container-app` and `container-extension`.

## Privacy and diagnostics

Both targets declare only the UserDefaults required-reason API. App: CA92.1 (app-local defaults) and 1C8F.1 (shared App Group); extension: 1C8F.1. No empty data-collection declaration is used to imply that COMPR collects nothing. App Store Connect privacy disclosures still require review of account, purchase and product-search processing.

Reason definitions: https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacyaccessedapitypes/nsprivacyaccessedapitypereasons

Release disables detailed JavaScript diagnostics and compiles native diagnostic persistence/readback out. Sandbox explicitly keeps them enabled. The content-script flag rides the existing adapter probe, without an extra messaging round trip. No matching, search orchestration, quota, confirmation or accounting code changed. Existing backend trace guard remains pinned to the sandbox Render service plus Apple Sandbox environment.

## Disclosures

Safari paywall prices come from StoreKit, with an unavailable state instead of hardcoded fallback prices. Privacy and Terms links, renewal language, Restore, Free and management paths remain available. No prices, product IDs, quotas or purchase logic changed.

Website terms/privacy/support/billing-return and limited landing-page copy now describe Apple subscriptions and deletion without requiring cancellation before account deletion. Deletion does not cancel an Apple subscription. Implemented quotas: Free intro 5, then 3/month; Pro 15/month; Ultimate 50/month (migration 016). No check packs. App name: COMPR – Find It Cheaper. Subtitle: Find the same product cheaper. Tagline: Found it? Find it cheaper.

Subscription disclosure reference: https://developer.apple.com/app-store/subscriptions/

## Verification

- Frontend complete suite: 253 passed, 0 failed, 0 skipped.
- Final scoped Release/auth/isolation checks: 19 passed; popup/lifecycle checks: 61 passed.
- Backend Run 3 `npm test`: 412 passed, 0 failed, 1 existing Windows-only skip; standalone legacy test passed. Only the obsolete ASOS snippet expectation changed: this domain is not in the direct-retailer fallback allowlist, so null is correct. No backend implementation change.
- Website complete suite: 15 passed, 0 failed, 0 skipped; final disclosure checks: 3 passed.
- Local unsigned iOS Release build succeeded at `build/release-run3-final` (version 0.3.6, build 8, inspection only).
- `python3 tools/inspect-safari-release.py build/release-run3-final` validates all 54 stage/generated/embedded resources byte-for-byte; manifests and onboarding JS are packaged.
- Bundle IDs: `nl.getcompr.compr`, `nl.getcompr.compr.extension`. App Group: `group.nl.getcompr.compr`. App has Sign in with Apple entitlement. Team used for local build: `2ZZK9M26TR`. All four existing StoreKit product IDs remain in canonical native code.
- Release runtime and native backend use production configuration only. Embedded native binaries have neither sandbox references nor the debug diagnostic filename. No signing/profile or TestFlight claim is made for this unsigned artifact.
- PowerShell staging received the same production pins but was not executed on this Mac; the Node/macOS canonical path above was built and inspected.

## Remaining manual sequence — no action authorized by this document

A. Finish Run 2 Apple configuration and authorization-code/revocation prerequisites; securely maintain client-secret expiry (maximum six months).
B. Configure only sandbox Render credentials/encryption key and Apple Sandbox settings using secure inputs.
C. Verify the isolated sandbox ref and apply migration 019 there only, following its existing backup/verification gates.
D. Review/push/deploy the approved sandbox checkpoints; verify revision, health and unchanged budgets/isolation.
E. Physically verify sign-in, session persistence, deletion/revocation (including active subscription), restore and all four StoreKit products; verify no repeated charges.
F. Perform the explicitly authorized positive FTC smoke test and Samsung diagnostic test; inspect usage and provider accounting.
G. Produce and inspect a signed Release archive/TestFlight build with valid profiles, approved next version/build, privacy manifests and entitlements. This unsigned inspection is not an upload artifact.
H. Complete App Store Connect name/subtitle/screenshots/support/terms/privacy/review instructions, privacy answers, seller/trader contact details, agreements, tax and banking. Legal company/trader details must be supplied by the owner, not invented. Publish reviewed website disclosures through a separately authorized release.
I. Submit only after the preceding gates and explicit release approval. Production activation/configuration is a separate approval; it has not occurred.
