# COMPR source and service boundaries

`V.0.3-prototype/` is the canonical extension development source. New extension work must start there.

The following directories are snapshots, release artifacts, or older copies and must not receive active development changes:

- `compr/`
- `V.0.2.3/`
- `github-upload/`
- `backups/`
- root-level ZIP archives

They are intentionally retained for reference. `website-live/` is the separately deployed static marketing website, not an extension source or a trusted subscription backend.

## Runtime boundaries

- The extension is an untrusted API client. Local storage is cache/UI state only.
- `find-cheaper-backend/` is the authoritative API boundary.
- Supabase Auth establishes identity; PostgreSQL owns entitlements, reservations, and usage.
- `/api/*` is legacy development functionality. It must not grant or consume production entitlement.
- `/v1/*` is the authenticated production API. It never returns fabricated demo offers.
- Stripe Checkout, signed webhooks, the Billing Portal, server-side price mapping and atomic Founding reservations live in `find-cheaper-backend/`. Stripe remains in Sandbox until the explicit live-migration checklist is completed.

## Archive policy

`compr/`, `V.0.2.3/`, `github-upload/`, `backups/` and root ZIP files are **ARCHIVE / SNAPSHOT / DO NOT EDIT**. Development fixtures under `V.0.3-prototype/search/` and backend `dev/` are test-only and are excluded by the production build process.
