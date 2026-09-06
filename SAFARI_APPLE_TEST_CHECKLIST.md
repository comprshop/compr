# COMPR current Safari Apple test checklist

Status: current checklist for the guest-based Safari beta handoff. This supersedes `SAFARI_MANUAL_TEST_CHECKLIST.md` as the operational Apple checklist without deleting or rewriting that historical document.

Record only observed results as `PASS`, `FAIL`, `BLOCKED` or `NOT RUN`. Never record tokens, full URLs/query strings, email contents, Apple credentials, UUIDs or personal product data.

## Test record

- Client commit: `155d554482cbdb20581ad5b40dbd386ce856fbc1`
- Build number: `<BUILD_NUMBER>`
- Date/tester: `<DATE>` / `<TESTER>`
- Device and model: `<DEVICE>`
- iOS/iPadOS/macOS version: `<OS_VERSION>`
- Safari version: `<SAFARI_VERSION>`
- Xcode version: `<XCODE_VERSION>`
- Installation route: `<SIMULATOR_OR_TESTFLIGHT>`
- Network condition: `<NETWORK_CONDITION>`
- Backend guest flag/environment, recorded without values or secrets: `<VERIFIED_OR_NOT>`

## A. Installation and activation

- [ ] A1 Containing app installs and opens without crash.
- [ ] A2 COMPR appears in the expected Safari Extensions settings.
- [ ] A3 Enabling and disabling the extension takes effect without reinstalling.
- [ ] A4 With COMPR disabled, no recognition or network request occurs.
- [ ] A5 Reopening Safari and the containing app retains only the expected enabled state.

## B. Permission per website

- [ ] B1 First use on a retailer shows the real Safari Ask/Deny/Allow behavior; record the exact OS wording separately without credentials.
- [ ] B2 Deny sends no product data and shows a clear permission state rather than a false no-product result.
- [ ] B3 Allow for one website permits only the intended current-site action.
- [ ] B4 A second, unapproved website requires its own permission decision.
- [ ] B5 Revoking permission immediately stops inspection and transmission.
- [ ] B6 No permanent all-websites access is silently acquired or claimed.

## C. Product eligibility and privacy boundary

- [ ] C1 A strong real product-detail page is recognized with a usable name and price evidence.
- [ ] C2 Bing and Google result pages are rejected.
- [ ] C3 Retailer search, category, collection and listing pages are rejected.
- [ ] C4 Ordinary, social, map and ChatGPT pages are rejected.
- [ ] C5 UUID/query-string/generic domain titles never become product names.
- [ ] C6 Clothing sizes appear only from genuine clothing/shoe product data or variant controls.
- [ ] C7 Opening COMPR and recognizing locally causes no backend search request.
- [ ] C8 Product/search data is transmitted only after the user taps **Find this cheaper**.

## D. Guest initialization and lifecycle

- [ ] D1 First launch initializes one anonymous guest through the official auth flow without visible login.
- [ ] D2 Closing and reopening COMPR restores the same usable guest session without duplicate initialization.
- [ ] D3 Session refresh happens once when required and does not create message/render loops.
- [ ] D4 Guest reset uses its explicit confirmation, removes the guest account/data and invalidates the old session.
- [ ] D5 A failed reset shows no success and preserves a recoverable state.
- [ ] D6 No token, UUID, full URL or personal value appears in app, extension or operator logs.

## E. Rolling quota and result accounting

Use dedicated disposable test state. Do not infer quota from UI alone; compare with the server-confirmed status.

- [ ] E1 Five successful billable verified matches are accepted within the rolling seven-day window.
- [ ] E2 The sixth concurrent/sequential successful attempt is blocked fail-closed.
- [ ] E3 A no-reliable-match response consumes no check.
- [ ] E4 An offline request consumes no check.
- [ ] E5 A timeout/provider failure consumes no check.
- [ ] E6 A cached result consumes no check.
- [ ] E7 Quota UI shows a real reset moment only when supplied by the server; otherwise it says checks return gradually.
- [ ] E8 **Explore COMPR Pro** does not consume a check or initiate payment.

## F. Verified result, retailer, coupons and details

- [ ] F1 A verified result shows the matched retailer before **View deal**.
- [ ] F2 The displayed retailer matches the validated deal-URL domain exactly.
- [ ] F3 Missing/conflicting retailer identity fails closed and never shows **Verified cheaper match**.
- [ ] F4 **View deal** opens the same validated HTTPS retailer and no other destination.
- [ ] F5 Saving is based on comparable totals with known shipping; unknown shipping creates no total-saving claim.
- [ ] F6 Coupons remains collapsed initially.
- [ ] F7 Coupon empty state names only the matched retailer and invents no coupon.
- [ ] F8 Details shows available product/deal fields and never coupon content.
- [ ] F9 Coupons and Details open/close accessibly without stale or overlapping state.

## G. Free and Pro UI contract

- [ ] G1 For Free, **Save & track** opens only the compact COMPR Pro sheet.
- [ ] G2 Free does not save locally or call backend, StoreKit, checkout or another payment endpoint.
- [ ] G3 The action says **Continue with COMPR Pro** and does not promise a trial.
- [ ] G4 **Not now** closes the sheet without mutation.
- [ ] G5 No button reports purchase success; there is no real purchase in this beta.
- [ ] G6 A test-only fixture entitlement never enters a Release archive.
- [ ] G7 A server-proven Pro entitlement, when explicitly fixture-tested, saves safely and deduplicates; do not treat that as StoreKit validation.

## H. Reliability and reopen behavior

- [ ] H1 Double tapping starts at most one price-check action.
- [ ] H2 Closing during search prevents late responses from overwriting newer state.
- [ ] H3 Repeated identical state does not repeatedly render or visibly jitter.
- [ ] H4 Loading to product, loading to no-product and Bing rejection remain stable.
- [ ] H5 Offline then reconnect/retry recovers without stale result or duplicated charge.
- [ ] H6 Background/foreground, Safari restart and device lock do not corrupt guest state.
- [ ] H7 Missing image uses a stable fallback without layout shift.

## I. Mobile layout and accessibility

Run first on iPhone; repeat later on iPad and Mac before claiming those platforms.

- [ ] I1 At approximately 390 CSS px, every required state fits without horizontal overflow.
- [ ] I2 At approximately 320 CSS px, long product and retailer names wrap/truncate safely.
- [ ] I3 Ready, searching, match, coupons, details, Pro sheet, saved fixture, no-match, quota and offline/error states are checked.
- [ ] I4 Touch targets are at least 44 by 44 CSS pixels where applicable.
- [ ] I5 Larger Dynamic Type settings keep content and controls reachable; text is not clipped.
- [ ] I6 VoiceOver reads headings, status/live changes, prices, retailer, controls and expanded state in a logical order.
- [ ] I7 Keyboard/focus-visible behavior is tested on iPad hardware keyboard and Mac without removing valid focus indicators.
- [ ] I8 Reduced Motion removes non-essential movement and no layout property animates.
- [ ] I9 Portrait/landscape, safe areas, notch/home indicator and software keyboard do not obscure actions.
- [ ] I10 Recheck the full critical flow on physical iPhone through TestFlight; simulator/browser-preview results are labelled separately.

## J. Platform expansion

- [ ] J1 Physical iPhone critical path passes.
- [ ] J2 iPad portrait, landscape and Split View are tested later before iPad support is claimed.
- [ ] J3 Mac Safari popup, permissions, keyboard and window lifecycle are tested later before Mac support is claimed.
- [ ] J4 Browser fixture previews are never reported as Safari/device evidence.

## K. Release gate

- [ ] K1 Release resources contain no tests, previews, docs, localhost, demo catalog, fixture entitlements, secrets or ignored output.
- [ ] K2 App/extension identifiers, team and signing are verified by the parent/account holder.
- [ ] K3 Stripe, checkout, portal and StoreKit purchase execution remain disabled.
- [ ] K4 Privacy/support information reflects the actual guest payload, provider behavior and retention.
- [ ] K5 No P0/P1 issue and no required `BLOCKED`/`NOT RUN` item remains before a release decision.

## Result

- Overall result: `<PASS_FAIL_BLOCKED>`
- Open P0/P1 findings: `<NONE_OR_LIST>`
- Required retest: `<NONE_OR_LIST>`
- Evidence location, containing no credentials/personal data: `<SAFE_LOCATION>`
- Decision: `<DO_NOT_RELEASE_OR_SEPARATELY_APPROVED_NEXT_STEP>`
