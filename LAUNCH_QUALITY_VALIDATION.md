# COMPR launch quality and validation contract

Status: local readiness contract. It does not enable analytics, production flags, billing, guest access or deployment. The product rule is: prefer no result over a wrong product.

## 1. Successful and billable check

A check is successful and billable only when all of the following are true:

1. The user deliberately starts one current client action on an eligible concrete product page.
2. The authenticated server accepts a UUID request ID and atomically reserves quota for that user.
3. Source identity contains a brand plus GTIN/MPN or a sufficiently specific model.
4. A live provider was actually executed; the response is not cache-only.
5. The candidate has a safe direct HTTPS retailer URL and is not the source retailer, a listing page or an unavailable item.
6. Brand, reliable identifiers/model, generation, capacity, size, colour, material, audience, quantity and condition do not conflict. Missing required candidate evidence is not treated as agreement.
7. The candidate has a comparable total purchase price in the source currency, including known shipping, and is actually cheaper.
8. The final match class is one of the accepted reliable classes.
9. Finalization commits once before the reservation expires. Reuse of the same request ID cannot consume quota twice.

Cache, no-match, low confidence, unsafe URL, timeout, provider failure, cancellation, malformed data, storage failure, quota/permission failure, expired reservation and stale UI responses are not billable. The database is the authority for reserve/finalize; client counters are not.

Region is currently constrained indirectly by NL provider queries, the approved retailer selection and currency equality. There is no explicit source/candidate region field. Cross-border eligibility and delivery therefore remain a manual launch validation item; do not describe it as proven.

## 2. Stable internal outcomes

| Meaning | Existing code/status |
|---|---|
| Reliable cheaper result | `reliable_match`, accepted match class, finalized `success` |
| No reliable result / low confidence | `NO_CONFIDENT_MATCH`, `CONFIDENCE_TOO_LOW` |
| Ineligible or incomplete source | client eligibility rejection, `INSUFFICIENT_PRODUCT_DATA` |
| Variant / condition conflict | `VARIANT_MISMATCH`, `BUNDLE_MISMATCH`, `CONDITION_MISMATCH` |
| Region/currency conflict | `PRICE_NOT_COMPARABLE`; explicit region remains unproven |
| Correct but not cheaper | `NOT_CHEAPER` |
| Unsafe retailer | internal `UNSAFE_RETAIL_DESTINATION`; public request fails as `SEARCH_PROVIDER_ERROR` |
| Quota/auth/rate limit | `SEARCH_LIMIT_REACHED`, `AUTH_REQUIRED`, `RATE_LIMITED` |
| Emergency stop | `FEATURE_DISABLED` |
| Client cancellation/stale response | `cancelled`, latest-action guard |
| Overall timeout | `SEARCH_TIMEOUT` |
| Provider failure / malformed response | `SEARCH_PROVIDER_ERROR`, `MALFORMED_PROVIDER_RESPONSE`; malformed individual candidates become no reliable match |
| Storage/service failure | safe `SERVICE_NOT_CONFIGURED` or non-sensitive generic error |

Public messages remain coarse and safe. Detailed matcher reason codes are internal, deterministic and contain no product title, query, token or full URL. Security logs and future product metrics must remain separate.

## 3. Cost and abuse boundaries

- Client: one deliberate action at a time; cancellation and latest-wins prevent stale UI updates.
- API: authenticated user-keyed fixed windows default to 10/minute and 100/hour.
- Quota: normal and guest reservations use database locks, include pending reservations and finalize idempotently.
- Provider: at most 11 Brave queries are generated; staged execution may stop after five when enough candidates exist.
- Retail pages: at most six direct candidates plus 24 ranked pages; concurrency is three and six respectively.
- Comparison pages: at most eight merchant links, one nested level; redirects are manual and capped at three.
- Bodies: request body 32 KiB; retailer response 2.5 MB with streaming cancellation.
- Time: individual retailer request defaults to 9 seconds; overall search defaults to 25 seconds and now aborts the underlying provider tree.
- Cache: product results are bounded by configured retention and pruned; cache-only results do not consume quota.
- Kill switch: `COMPR_SEARCH_ENABLED=false` blocks new authenticated and legacy development searches before provider execution. Default remains on for compatibility; guest and Stripe flags default off.

The theoretical request ceiling is deliberately conservative but can still be costly when many comparison pages expand into merchant links. Do not increase it. Measure aggregate queries/pages per check before scaling; lowering it is a later evidence-based decision.

## 4. Privacy-friendly measurement contract

No metric below is currently emitted. Analytics stays off until legal basis, notices, retention, access and production configuration receive separate approval. Prefer daily aggregates; never join product analytics to cross-site browsing.

Forbidden fields for every metric: complete URL, path/query/fragment, search query, product title, email, token, IP address, browser history, marketing fingerprint or cross-site identifier. An allowlisted retailer hostname may be used only for short-lived operational parser health, not user profiling.

| Metric | Purpose; numerator / denominator | Minimum allowed fields | Proposed retention | Hypothesis/decision and bias |
|---|---|---|---|---|
| `extension_activated` | Activation rate; first popup-ready / installs | day, platform, version, count | 90 days aggregate | Investigate onboarding if activation falls; store install counts and blocked scripts bias denominator |
| `first_check_started` | First-value rate; users starting first deliberate check / activations | day, platform, version, pseudonymous rotating cohort count | 90 days aggregate | Do not market-scale without meaningful use; reinstall/device changes bias cohorts |
| `page_eligibility` | Eligibility quality; eligible or reason bucket / checked pages | day, platform, version, eligible boolean, coarse reason, count | 30 days detail, 90 aggregate | High ineligible share triggers detector review; user browsing mix biases result |
| `check_outcome` | Match funnel; outcome bucket / deliberate checks | day, platform, version, stable outcome, cache boolean, count | 30 days detail, 90 aggregate | Wrong-match evidence overrides volume; retries inflate checks |
| `rejection_category` | Identify matcher weaknesses; reason bucket / rejected candidates | day, matcher version, coarse reason, count | 30 days detail, 90 aggregate | Review dominant actionable categories; candidate mix/provider ranking biases data |
| `provider_health` | Reliability; timeout/provider error / provider attempts | day, provider code, broad latency bucket, count | 30 days detail, 90 aggregate | Pause scaling on sustained failure; outages and cold starts skew buckets |
| `quota_reached` | Understand constrained demand; quota responses / active users | day, plan class, guest boolean, count | 90 days aggregate | Signals demand, not payment intent; heavy users dominate |
| `external_attempts` | Cost control; queries/pages/redirects / checks | day, bounded count buckets, cache boolean, count | 30 days detail, 90 aggregate | Kill search on unexplained step-change; page structure/provider mix biases cost |
| `billable_success` | Unit economics; committed billable checks / started checks | day, plan class, matcher version, count | 90 days aggregate | Must reconcile with database commits; client-only loss must not undercount denominator |
| `returning_active` | 7/30-day retention; activated cohorts active again / eligible cohort | cohort week, platform, version, 7d/30d count | 180 days aggregate | No paid acquisition without useful retention; privacy resets/reinstalls undercount |
| `upgrade_intent` | Future value signal; deliberate upgrade views/actions / active users | day, plan shown, action bucket, count | 90 days aggregate | Not a purchase; UI placement heavily biases it |
| `support_incident` | Operational quality; cases by safe category / active users | day, severity, safe category, count | 12 months aggregate | Any confirmed privacy/wrong-match incident triggers incident procedure; reporting is incomplete by nature |

Latency buckets should be broad, for example `<2s`, `2–5s`, `5–10s`, `10–25s`, `timeout`; do not retain exact per-user timing when an aggregate suffices. Raw security logs follow a separately approved, shorter operational retention policy.

## 5. Definitions and 90-day gates

- Installation: store-reported install of the intended release version.
- Activation: popup reaches a ready or explicit safe-unavailable state once.
- Active user: distinct privacy-approved cohort member starting at least one deliberate check in the period.
- Successful check: completed check with a stable non-technical outcome.
- Reliable match: accepted same-product/variant candidate with comparable lower total.
- False positive: human-confirmed wrong product, important variant, condition or non-comparable price shown as reliable.
- Retention: activated cohort with a deliberate check again in days 7 or 30.
- Paying user/churn: verified billing state starts / previously paying state ends; not inferred from clicks.
- Cost per successful check: attributable provider/infrastructure cost / reliable completed checks.

All thresholds below are hypotheses until real consented data exists.

| Stage | Entry gate | Proceed hypothesis | Stop / do not scale |
|---|---|---|---|
| First 25 real users | Manual evidence and support route ready | No confirmed false positive; failures explainable; costs observable | Any confirmed wrong match, privacy/security incident or uncontrolled request loop |
| 50–150 active installs | First-stage incidents closed | Stable matcher/reliability trend and repeat use visible | Recurrent variant/parser error, sustained high technical-error share or unmeasured cost |
| 200–400 installs | Kill switch rehearsed; retailer health visible | 7/30-day cohort signal supports continued use | Insufficient retention: no paid marketing; unexplained cost spike: disable new searches |
| Small monetization test | Privacy/billing disclosures and sandbox E2E approved | Verified payment intent and supportable unit economics | Almost no intent: revisit price/value before more billing work; any entitlement error stops test |
| Scale | No open P0/P1 and incident response proven | Evidence supports quality, retention and cost simultaneously | Do not scale on install volume alone or while false positives/failures remain unresolved |

Category/retailer routes with a confirmed systematic variant error must be paused. The global search kill switch is used for uncontrolled cost, privacy/security impact or widespread correctness failures.

## 6. Retailer/parser health

Track only aggregates by allowlisted hostname, parser route/version and safe reason: extracted, missing identifier, structured-data changed, invalid/non-total price, redirect rejected, unsafe URL/DNS, response too large, timeout, malformed provider response. Do not retain paths, queries, titles or user identity. A sharp failure change pauses that retailer/category route; if no narrower existing control exists, use the global search kill switch.

## 7. Incident and rollback matrix

| Incident | Detection | Immediate fail-closed action | Owner and safe evidence | Recovery / reactivation |
|---|---|---|---|---|
| Wrong match | Confirmed support/QA reproduction | Disable new searches globally if systematic; do not loosen matching | Release lead + matcher owner; version, reason code, synthetic reproduction, counts—no user URL/title | Minimal rule/test fix, full regression, manual category retest, approval |
| Provider cost spike | Aggregate attempt/cost step-change | `COMPR_SEARCH_ENABLED=false` | Backend owner; time bucket, counts, provider status | Explain cause, cap/test locally, verify flag-off, separately approve on |
| Backend outage | Health/error-rate alert | Keep guest/Stripe off; search kill switch if calls amplify outage | Backend owner; deployment ID, commit, safe error counts | Roll back backend to known-good or forward-fix; health + normal Chrome smoke |
| Auth outage | Safe auth failures | Stop login-dependent release/guest activation; preserve local saved data | Auth owner; provider status and coarse codes | Provider recovery/config correction; login/logout/session smoke |
| Quota defect | Overcharge, bypass or stuck reservation evidence | Disable searches; never edit usage manually ad hoc | DBA + backend owner; request IDs only in restricted incident system, aggregate counts | Reviewed SQL/backend forward-fix; concurrency and expiry regression |
| Privacy/security incident | Sensitive data exposure or unsafe fetch | Disable affected flow/search; restrict evidence access | Security/privacy owner; timestamps, versions, redacted logs | Incident process, containment, notification decision, security regression and approval |
| Faulty Chrome release | Store/update regression | Halt rollout or publish known-good corrected version using store controls | Chrome release owner; version, artifact hash, safe screenshots | Rebuild from audited commit, manual update-path smoke, staged rollout |
| Faulty Safari/TestFlight build | Crash, entitlement/privacy mismatch | Stop testing/expire affected build through Apple-supported controls | Apple Account Holder + developer; build number, device/OS, sanitized logs | Correct locally, new build number, device matrix, internal TestFlight approval |

Never put credentials, tokens, personal email, complete browsing URL, product query/title or database contents in incident notes. Schema rollback decisions belong to release lead and DBA; prefer reviewed forward fixes after committed migrations. Reactivation always requires the original stop signal to be absent plus the relevant regression and owner approval.
