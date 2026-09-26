# COMPR Codex setup on macOS

This repository branch is the portable Windows-to-Mac handoff for COMPR.

## Repositories

Clone the three repositories next to each other:

```sh
git clone --branch windows-complete-backup-2026-09-26 https://github.com/comprshop/compr.git compr-v.0..2.0
cd compr-v.0..2.0
git clone https://github.com/comprshop/compr-backend.git find-cheaper-backend
git clone https://github.com/comprshop/compr-website.git website-live
```

The backend and website repositories have newer work on their own `main`
branches after the accompanying Windows backup was created. Pull their current
`main` branches before starting new work.

## Codex

Install Codex on the Mac and sign in again. Do not transfer `auth.json`, tokens,
session databases, logs, caches, or the complete Windows `.codex` directory.

Reinstall optional plugins from Codex with `/plugins`:

- Stripe
- Build Web Apps

The frontend review skill can be reinstalled from:

`https://github.com/microsoft/skills/tree/main/.github/skills/frontend-design-review`

Optional official documentation MCP configuration:

```sh
codex mcp add openaiDeveloperDocs --url https://developers.openai.com/mcp
codex mcp list
```

## Safari handoff

The checked-in `safari-mac-day-kit/` directory contains the source handoff.
The three validated ZIP files needed for a convenient Mac transfer are also
tracked on this backup branch at their existing paths. Verify their documented
SHA-256 values before use. Final Xcode Asset Catalog import still happens on the
Mac.

## Local secrets

Production secrets and login credentials are intentionally absent. Recreate
them through the relevant provider dashboards or local environment variables;
never commit them to Git.
