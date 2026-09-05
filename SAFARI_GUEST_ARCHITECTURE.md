# COMPR Safari guest architecture

Status: local beta preparation only. Guest access is fail-closed and is not production-ready.

## Decision

Safari uses Supabase Anonymous Auth. The extension calls the Supabase Auth anonymous signup endpoint through the existing public Supabase URL/key, stores only the returned access/refresh session in extension-local storage, and refreshes it through the existing auth path. The backend validates every bearer token with Supabase `/auth/v1/user` and accepts an anonymous user only when `COMPR_GUEST_ENABLED` is exactly `true`.

This reuses the existing authenticated search service, matching, reservation/finalization model, deletion cascade and per-user server rate limiter. It introduces no device ID and no extension secret. Chrome is explicitly configured as `platform: "chrome", guestMode: false`; Safari build output is explicitly configured as `platform: "safari", guestMode: true`.

## Rejected alternative

A backend-issued installation token would require a new signing secret, token rotation/revocation, durable installation records, bespoke abuse controls and a future account-linking protocol. Reinstallation could still mint a new identity. It duplicates Supabase authentication and has more security and operational surface than an anonymous Supabase user.

## Server rules

- Anonymous JWTs are rejected unless `COMPR_GUEST_ENABLED=true`.
- Non-anonymous Chrome users retain the existing account flow and quota RPCs.
- Anonymous users cannot use account deletion, checkout or billing portal routes.
- Guest reset uses `DELETE /v1/guest` with exact confirmation `RESET`; it deletes the Supabase anonymous auth user, allowing existing cascades to remove COMPR-owned rows.
- Guest searches use migration 012 RPCs. They count only committed, billable, successful live matches finalized in the preceding seven days.
- Active reservations count temporarily to prevent concurrent requests exceeding five.
- Cached matches, no-match, insufficient data, non-cheaper results, timeouts and provider failures finalize as non-billable and do not consume quota.
- Existing per-user rate limits remain additional abuse protection. Reinstall/reset can create a new anonymous user and remains a beta abuse risk.

## Migration 012

`find-cheaper-backend/supabase/migrations/012_safari_guest_rolling_quota.sql` adds four service-role-only functions. It does not alter migration 011 and has not been executed.

Pre-checks (read-only):

```sql
select exists(select 1 from information_schema.columns where table_schema='auth' and table_name='users' and column_name='is_anonymous') as auth_has_is_anonymous;
select to_regclass('public.search_requests') is not null as search_requests_exists;
select to_regclass('public.usage_periods') is not null as usage_periods_exists;
select exists(select 1 from information_schema.columns where table_schema='public' and table_name='search_requests' and column_name in ('status','billable','finalized_at')) as quota_columns_exist;
```

Post-checks (read-only):

```sql
select p.proname, p.prosecdef, p.proconfig
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('compr_assert_anonymous_user','compr_get_guest_me','compr_reserve_guest_search','compr_finalize_guest_search');
select routine_name, grantee, privilege_type from information_schema.routine_privileges
where specific_schema='public' and routine_name like 'compr_%guest%';
```

Rollback, only if no guest backend has been enabled:

```sql
begin;
drop index if exists public.search_requests_guest_rolling_quota_idx;
drop function if exists public.compr_finalize_guest_search(uuid,uuid,text,boolean,boolean,jsonb);
drop function if exists public.compr_reserve_guest_search(uuid,uuid,text);
drop function if exists public.compr_get_guest_me(uuid);
drop function if exists public.compr_assert_anonymous_user(uuid);
commit;
```

## Privacy, lifecycle and blockers

Anonymous accounts have no email, but their Supabase user ID, sessions, search metadata and product fingerprints remain personal/pseudonymous data. Session tokens stay in extension-local storage and are never logged. A guest reset removes the server identity and local session; clearing all local COMPR data must also invoke guest reset before clearing storage.

Abandoned anonymous auth users currently have no verified retention policy. Do not activate automatic deletion until legal/product retention is decided and Supabase's supported admin cleanup behavior is verified. Search records remain covered by the existing 30-day cleanup after account cascade or expiry.

Local SQL integration on 2026-09-05 confirmed that COMPR backend logs contained none of the test tokens, UUIDs or email addresses. The local Supabase infrastructure logs did include anonymous user UUIDs (but no tested access/refresh token or email). Hosted Supabase log retention and access settings therefore remain a manual privacy check before release.

Manual blockers before enabling:

1. Verify in the actual Supabase project that Anonymous Sign-Ins are supported and enabled; this repository cannot prove the provider setting.
2. Verify `auth.users.is_anonymous` exists and the existing `compr_auth_user_created` trigger fires for anonymous signup, creating exactly one profile, entitlement, free-intro row and usage period.
3. Review and apply migration 012, then run its post-checks.
4. Set `COMPR_GUEST_ENABLED=true` only after the backend containing guest support is deployed. Keep Stripe disabled.
5. Decide/document abandoned guest-account retention before public release.

## Future linking and Apple subscriptions

Supabase supports upgrading an anonymous identity by linking a permanent authentication identity, but the exact provider configuration and account-link flow are deliberately not assumed here. Apple subscriptions should map verified StoreKit/App Store server transactions to the same server-side user identity; no subscription implementation is included in this beta.
