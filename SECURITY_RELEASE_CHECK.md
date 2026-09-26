# COMPR security release check

Checked locally on 2 September 2026. No secrets or personal data are reproduced here.

| Finding | Risk | Resolution / status | Verification |
|---|---|---|---|
| Automatic coupon backend call during page recognition | P0 privacy: product URL transmitted before explicit price-check action, inconsistent with disclosure | Removed from popup; production coupon endpoint disabled with 410 | Core source assertion and route/source review |
| Missing explicit extension CSP | Remote/injected execution policy less obvious during review | Added self-only script/object CSP | Manifest parse and build gate |
| Internal login error code shown on callback page | Technical details exposed to user | Replaced with generic actionable text | Core source assertion |
| Internal extension messages accepted without sender-ID condition | Unnecessary message attack surface | Background/content handlers now require the current extension ID and exact message type | Syntax/source validation; manual Chrome behavior remains |
| `eval`, `new Function`, remote scripts | Remote-code policy/security risk | None found; production scan rejects them | Recursive scan plus CSP |
| `innerHTML` usage | Potential DOM injection | Reviewed uses are static SVG/templates, fixed plan constants or values produced by currency formatting; product/provider text uses `textContent` | Targeted source review |
| URL opening/redirects | Script/data URL or hostile billing redirect | Product URLs use HTTP(S) validation; checkout/portal require exact Stripe host; beta URL comes from build config; callback origin is build-scoped | Existing/new tests and source review |
| Session/token exposure | Account takeover | Tokens stay in extension storage and Authorization header; backend logs only route/code aggregates; callback fragment is immediately removed; login no longer displays codes | Auth/security tests and log scan |
| Privileged secrets in extension | Backend compromise | No service-role/Stripe/Brave secret packaged; build rejects secret markers and requires a public Supabase key | Build scan; deployment still manual |
| Backend route authentication | Unauthorized account/search access | Every `/v1/*` route authenticates first; webhook uses Stripe signature; production legacy search is disabled | Backend auth/security tests |
| Cross-user authorization | Reading/modifying another account | Repository operations use authenticated `user.id`; privileged service calls remain server-only | Repository and account tests |
| CORS | Untrusted browser origins | Production allows only configured origins; unauthorised origins receive 403; credentials are not broadly enabled | Backend security tests/source review |
| Rate limiting | Abuse/provider cost | Per-user minute/hour limiter on authenticated v1 routes; cleanup bounded | Security tests |
| Request size | Memory exhaustion | JSON requests capped by `MAX_BODY_BYTES`; webhook capped at 1 MiB; retailer HTML capped at 2.5 MB | Source review and existing validation |
| Input/SQL injection | Query/database manipulation | Product fields are length/type bounded; Supabase REST/RPC uses encoded JSON/parameters, not concatenated SQL | Source/migration review |
| SSRF | Backend fetching internal/user-controlled targets | Retail fetching accepts HTTPS, blocks local/private IPv4 patterns, limits redirects/content/time and starts from known/search-derived retailer candidates | Source review; WARNING: DNS rebinding and comprehensive IPv6/private-range resolution are not network-level blocked in repository code |
| HTTP production traffic | Interception | Build requires HTTPS values and rejects HTTP/localhost in output | Build gate |
| Dependency state | Known package risk | Lockfile is committed; `npm audit --omit=dev --offline` reports 0 known vulnerabilities from locally available advisory data. Run a registry-backed audit immediately before release | READY/MANUAL |
| Account deletion | Partial deletion or false success | Typed/final confirmation, server-first deletion, no success on failed step, subscription-linked block | Account deletion tests |
| Search races/quota | Duplicate charge or stale recommendation | UI single-action controller, UUID reservations and backend provider deadline | Reliability and quota tests |

## Open security warnings

- Confirm production DNS/TLS and hosting egress controls. Repository URL checks cannot prove DNS resolution safety.
- Confirm secrets and CORS values in Render/Supabase without copying them into documents or screenshots.
- Confirm provider dashboard retention and access controls.
- Run an online dependency advisory check shortly before release; today's preparation does not require external package mutation.
- Perform Chrome CSP, message, auth callback and URL-opening smoke tests tomorrow.
