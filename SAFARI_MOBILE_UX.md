# COMPR Safari mobile UX

## Scope and platform split

Safari uses the shared product eligibility, browser adapter, storage, authentication and API modules, but activates `safari-popup.js` only when the explicit public platform configuration is `platform: "safari"` and `guestMode: true`. Chrome retains its existing account, billing and saved-product interface. The checked-in default is Chrome with guest mode disabled. No user-agent detection controls this split.

Safari has no visible login, OTP, account, subscription or paywall controls. It initializes the existing anonymous Supabase session and relies entirely on the backend RPC architecture for the rolling five-successful-check quota. Billing and account APIs are not exposed by the Safari UI.

## Deterministic states

The centralized Safari store supports: guest initializing, permission required, unsupported page, no product, ready, searching, verified match, no reliable match, provider error, timeout, offline, quota reached and saved. Coupon and detail disclosure are orthogonal booleans, producing collapsed and expanded states without replacing the primary result. A render fingerprint skips identical state updates; action generations and `pagehide` disposal prevent stale work from changing a newer or closed popup.

## Components and contracts

The popup consists of a compact privacy header, one stable panel, a bounded product card, one primary action, a verified-savings panel and one secondary row for Save, Coupons and Details. Product images have reserved dimensions. Values enter the DOM through `textContent`.

`ComprApi.search(product, requestId)` is called only after the user activates **Find this cheaper**. A successful savings presentation requires an `EXACT_MATCH` or `HIGH_CONFIDENCE_MATCH`, a public web URL whose host matches the stated retailer, the same currency, known shipping, and two finite comparable total prices where the deal total is lower. Unknown shipping therefore never produces a total-price savings claim.

**View deal** revalidates the URL before using the safe browser adapter. HTTPS is required in the extension. Non-web schemes, localhost, loopback, link-local, RFC1918/private targets and retailer mismatches fail closed.

## Save and track

Safari Free keeps five successful billable checks per rolling seven days but does not save or track products. **Save & track** opens an informational COMPR Pro sheet and performs no storage, backend, StoreKit or payment request. The displayed `€2.99/month or €19.99/year` is UI direction only; **Try Pro** cannot report purchase success.

Only a server-proven `pro` or `ultimate` entitlement permits `ComprStorage.saveProduct`, which shares Chrome's bounded, sanitized and deduplicated local model. A second activation is disabled and does not create a duplicate. No auth token, DOM content or extra page content is stored. Fixture entitlement may be used only in the local preview/tests. Real release work still requires App Store product configuration, StoreKit purchase handling, server-side receipt/transaction validation, entitlement restore/revocation and Apple sandbox testing.

## Coupons

Coupons are collapsed by default. The current backend does not yet have a documented trusted matched-retailer coupon contract, so the normal safe state is **No verified coupons.** If a future response supplies coupons, the UI accepts only bounded codes explicitly marked `verified: true` whose retailer exactly matches the deal retailer. It never synthesizes a code or verification date. A production coupon feature still needs a server-owned source, verification timestamp, retailer identity and tests proving provenance; no extra coupon request is made here.

## Details

Details are collapsed by default and omit absent values. They can show only bounded, useful values already present in the source product or accepted offer: brand, model/MPN, variant, capacity, colour, condition, SKU and GTIN. No “not found” rows are created.

## Accessibility and layout

Primary and secondary actions meet a 44 CSS-pixel minimum. The interface uses semantic headings, button controls, `aria-expanded`, `aria-busy`, a polite live region and visible focus styling. Long values wrap, the viewport retains the existing stable scrollbar strategy, and no width or height property is animated. Reduced-motion disables the loader animation. A higher-contrast media query strengthens borders.

## Local preview

`V.0.3-prototype/preview/safari-mobile.html` contains inert fixture-only states for ready, searching, match, coupons, details, no match, quota and offline. It performs no network or extension API calls and is not included by the Safari validation build inventory.

## Known limitations and Apple-device validation

- The backend currently yields no proven matched-retailer coupon feed; only the correct empty state is production-safe.
- Reset time is shown only if the server returns a parseable `resetAt` or `nextAvailableAt`; no countdown is invented.
- A real Safari Web Extension conversion, signing identity, macOS Xcode build, iPhone/iPad device layout, VoiceOver, Dynamic Type, permission prompt and TestFlight lifecycle require macOS, Xcode and Apple hardware/accounts. These remain mandatory manual release checks.
- COMPR Pro purchase UI is non-transactional. StoreKit and server-side Apple entitlement validation are not implemented and must remain disabled until separately designed and tested.
- Guest mode remains fail-closed and disabled in checked-in/default production configuration until migration 012, Anonymous Sign-Ins and the backend feature flag are separately and manually prepared.
