# Verified Safari sandbox baseline — 2026-10-07

Production is not a target of this baseline. No production data, sessions or secrets are included.

- Sandbox Supabase: `uhvukecryuvosuascics`; migrations 001–017 applied.
- Sandbox backend: `compr-backend-sandbox`, `srv-dau086m0tbcc73fg8e00`.
- Backend branch: `codex/apple-billing-sandbox`.
- Backend commit: `d6cf1b77251b4e2525bf81726be65c9506e87c25`.
- Debug project: `build/isolated-sandbox/xcode-output/COMPR/COMPR.xcodeproj`.
- Prepare Debug resources using `tools/prepare-isolated-safari-debug.py` with a local credential file; never commit that file. Only the public anon key is embedded.
- Debug sessions and pending requests are namespaced by sandbox project/account. Build guards reject mixed environments and Release/archive actions.

## Physical confirmation proof

The user performed exactly one Find This Cheaper request on iPhone van Timon: Expert JBL Tune 730BT Wit; the valid Coolblue match was displayed in the Safari popup.

- Request: `02fbb63e-4e6a-42eb-9e5c-0c148f4de6c9`.
- Result: `9d22ead1-0e62-4f4b-b73d-e8016677ea94`.
- Confirmation identifiers and token linkage match (token is not recorded here).
- Reservation: `committed`, outcome `success`, billable true.
- Read-only verification: one request, one charged request, zero active reservations.
- Free intro quota: 0/5 → 1/5; four available. Intro period unchanged.
- Live acceptance function has row locking and a duplicate guard; no live confirmation replay was performed.

## Validation

Frontend: 142 passed, zero failed. Backend: 243 passed, zero failed, one Windows-only test skipped (`node --test tests/*.test.js`).

The frontend snapshot includes previously verified Safari UI, extraction, locale, native auth and subscription prerequisites required by the running build, plus confirmation and sandbox isolation. Generated projects, local credentials, build products, temporary Swift files and handoff ZIPs are excluded. No new billing behavior is introduced by this snapshot.

Do not run another search, purchase or quota reset as part of preserving this baseline. Production remains on Supabase `taosgvfdnblnopaywimf` and is not a rollback target for sandbox.
