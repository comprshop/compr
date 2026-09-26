# COMPR reliability and UX audit — Week 3

Status: implemented and verified locally on 2 September 2026. Nothing was published, deployed or submitted. Migration 011 was not applied.

## Findings and resolution

| Priority | Finding | Resolution |
|---|---|---|
| P0 | A client timeout could stop the visible request while the backend provider continued and potentially finalized quota later. | The backend now enforces its own 25-second provider deadline, finalizes the reservation as `provider_error` and consumes no quota. |
| P0 | Previously stored/imported entries with an unsafe URL could survive when they had another identity such as a product code. | Every storage read/write now filters to HTTP(S) product URLs; `javascript:`, `data:` and malformed URLs are discarded. Product links were already rendered through `getSafeWebUrl`. |
| P1 | Double-clicking Find This Cheaper could start concurrent searches with separate request IDs. | A single-action controller ignores a second click and disables all price-check buttons until completion. |
| P1 | Closing the dialog or receiving a late response could let an obsolete request alter the screen. | Closing aborts the request and invalidates its action ID. UI writes occur only for the current action. |
| P1 | A new search could reuse a five-minute result and look current. | User-started searches now use `force: true`; old result DOM, links and savings are cleared before searching. |
| P1 | Storage callback failures were treated as successful saves/removals. | Storage wrappers now reject on `chrome.runtime.lastError`; the popup restores its button and shows a safe retry message. |
| P1 | Corrupt or unexpectedly large `savedProducts` data could flow into Compare. | Storage is normalised on every read/write, invalid records are ignored, fields are bounded and the collection is capped at 500 items. |
| P1 | Timeout errors were indistinguishable from generic failures. | Timeouts receive `SEARCH_TIMEOUT` internally and a short safe Dutch message plus retry action. |
| P2 | Several core save/no-result messages were long or English. | The save result, no reliable match, no retailer results and timeout paths now use short Dutch copy. Broader translation remains out of Week 3 scope. |

No unresolved P0 finding remains in the inspected local implementation.

## Flow audit

- First open: loading state is reset on every popup creation; corrupt local products are filtered rather than crashing.
- Privacy: the sign-in and price-check cards retain their prominent data disclosures and privacy link from Week 1.
- Magic-link/OTP login: submit buttons are disabled while working; invalid/expired code gets a safe message.
- Session restore: the minimal Supabase session remains in extension local storage. Expired sessions share one refresh promise; a 400/401 refresh failure clears it.
- Product recognition: the popup starts in a dedicated recognition state and falls back to the no-product explanation without technical errors.
- Search: one current request, unique request ID, disabled buttons, client timeout and backend timeout.
- Reliable result: only Week 2 `EXACT_MATCH`/`HIGH_CONFIDENCE_MATCH` results can show a saving or retailer link.
- No match versus error: no reliable match, insufficient data, non-comparable price, no provider results, provider failure, timeout, expired session and quota have distinct paths.
- Save & Compare: duplicate-safe mutation lock, no-image support, no-price support, bounded/corrected storage, safe links and persistent removal.
- Sign-out: revokes sessions but intentionally preserves locally saved products.
- Account deletion: requires typed and final confirmation; server deletion must succeed before all local extension data is cleared. Subscription-linked deletion remains blocked.
- Reopen: transient search state is not persisted. Account deletion clears it all; sign-out preserves only ordinary local product/preferences data.

## UI state model

The existing screens now consistently represent: `idle`, `recognising_product`, `searching`, `reliable_match`, `no_reliable_match`, `insufficient_product_data`, `price_not_comparable`, `offline`, `provider_error`, `session_expired`, `limit_reached`, `timeout`, `cancelled`, and `unexpected_error`. `shared/reliability.js` centralises active-action ownership and safe error classification.

## Quota integrity

A usage record becomes billable only when the backend actually executed a live, uncached provider request, the source identity was sufficient, and at least one reliable Week 2 match was accepted. Cached results are returned without charging. Authentication failure, rate limiting, invalid request/response, client cancellation, backend timeout, provider/network failure, insufficient data, no results, rejected candidates, non-comparable prices and non-cheaper candidates do not count as successful usage. Repository reservation by UUID prevents the same request ID from committing twice; the UI also prevents simultaneous click-generated request IDs.

## Accessibility and practical UX

Primary controls are native buttons/links with keyboard focus. Both stylesheets already provide visible `:focus-visible` outlines. Status and toast areas use `aria-live`; the result dialog has an accessible title and close label. Account deletion remains visually separated as a destructive action. Long product text and result details have bounded or wrapping layouts. Final keyboard order, zoom, contrast and popup clipping still require the manual Chrome checks below.

## Old production ZIP — do not submit

`dist/compr-extension-production.zip` was inspected read-only. It is 113,265 bytes and has filesystem modification time **27 August 2026 22:25:14**. Its manifest contains the older extension file set and does not contain the new `shared/reliability.js`. It is therefore a stale artifact: **do not publish, upload or submit it**. It was not changed or deleted. Week 4 must create a clean candidate from canonical source.

## Remaining manual checks / blockers

- Real Chrome magic-link/OTP handoff, browser restart and service-worker suspension.
- Actual offline toggling, slow-network timing and dialog close while a request is in flight.
- Keyboard-only flow, 200% zoom, contrast and popup clipping on Windows/macOS.
- Real retailer extraction and the 20-case plan in `MANUAL_PRODUCT_TEST_PLAN.md`.
- Apply and verify migration 011 only when explicitly approved later.
- Verify production environment values and provider-side retention from Week 1.
- Keep Stripe/billing disabled and do not submit until Week 4 creates and checks a clean ZIP.
