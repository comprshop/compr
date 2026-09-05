# COMPR manual release test checklist — 60–90 minutes

> **Scope:** This checklist covers the Chrome account-based release flow.
> Safari uses a separate guest flow and its own Safari manual test checklist.

> **Bij een verkeerde koopaanbeveling, privacyprobleem, dataverlies of geblokkeerde kernflow: stop release en noteer dit als P0.**

Use only disposable test data. Do not paste tokens, private email contents or secrets into this document. Keep the stale `dist/compr-extension-production.zip` untouched.

## Evidence record for every test

Record: date/time; test number; source page; selected variant; expected result; actual result; pass/fail; screenshot made yes/no; safe visible error/reason code; short note. Store no personal data in screenshots.

## A. Installation — 10 minutes

- [ ] A1 Note/remove or disable the currently loaded local COMPR test instance without deleting its source or saved evidence.
- [ ] A2 Open `chrome://extensions`, enable Developer mode and load **`V.0.3-prototype/`** as unpacked—not `dist/`, an archive folder or an old ZIP.
- [ ] A3 Confirm product name COMPR, manifest `0.3.0` and no installation error. Do not change the version yet.
- [ ] A4 Open the popup on a normal tab. Confirm a clear loading/product-or-no-product screen and privacy link.
- [ ] A5 Confirm no old successful search or temporary spinner appears after closing/reopening.

## B. Account — 15 minutes

- [ ] B1 Request one OTP/magic link with a disposable account and confirm understandable pending state.
- [ ] B2 Enter the newest valid code and confirm successful login/account allowance.
- [ ] B3 Close/reopen the popup and confirm the session remains.
- [ ] B4 Fully quit and restart Chrome; confirm session recovery without another code.
- [ ] B5 Sign out; confirm account becomes signed out and locally saved products remain.
- [ ] B6 Sign in again and confirm local products still remain.
- [ ] B7 Test an expired/invalid code and confirm no internal code, token or stack trace appears.
- [ ] B8 **Last account test only:** delete the disposable account using typed `DELETE` plus final confirmation; confirm server success, local products/preferences/session cleared and old login/session no longer works.
- [ ] B9 If deletion reports an unexpected active subscription: record the safe block and do not bypass it.

## C. Find This Cheaper — 25 minutes

- [ ] C1 Use one row expected to have a reliable cheaper exact variant; verify retailer, model, variant and total.
- [ ] C2 Use a correct product that is not cheaper; confirm no saving/recommendation is shown.
- [ ] C3 Produce no reliable result; confirm “Geen betrouwbare match gevonden” and retry.
- [ ] C4 Check a wrong storage/size/colour variant is rejected.
- [ ] C5 Check refurbished/used against a new source is rejected.
- [ ] C6 Check subscription/monthly/deposit price against purchase total is rejected.
- [ ] C7 Go offline before searching; confirm safe network message and no quota loss.
- [ ] C8 Simulate slow network in DevTools; confirm timeout/retry and no stale result.
- [ ] C9 Close the dialog while searching; reopen and confirm the cancelled response does not appear.
- [ ] C10 Double-click Find This Cheaper quickly; confirm only one active action/request.
- [ ] C11 For any shown saving, verify visible shipping and final retailer checkout total. Fail if COMPR presents an unproven total.
- [ ] C12 Confirm search allowance changes only for an actual reliable live match.

## D. Save & Compare — 10 minutes

- [ ] D1 Save a product and open Compare.
- [ ] D2 Attempt to save the same product again; confirm no duplicate.
- [ ] D3 Restart Chrome; confirm saved product persists.
- [ ] D4 Test a product with missing image and one without reliable price; page must remain usable and not invent values.
- [ ] D5 Remove a saved product, reopen Compare and confirm it remains removed.
- [ ] D6 Import only a disposable malformed/old export if safe; confirm corrupt/unsafe records are ignored without losing existing valid items.
- [ ] D7 Confirm no `javascript:`, `data:` or missing URL can be opened from a card.

## E. UX/accessibility — 10 minutes

- [ ] E1 Navigate popup, account, Save and Find actions using Tab/Shift+Tab/Enter/Space only.
- [ ] E2 Confirm focus is always visible and dialog close/return focus is understandable.
- [ ] E3 Test browser zoom at 200%; no action may leave the viewport or become clipped.
- [ ] E4 Check popup width/height and scrolling on the smallest practical display.
- [ ] E5 Check a very long product/store name wraps or truncates without covering controls.
- [ ] E6 Check missing image fallback without layout jump.
- [ ] E7 Confirm Dutch core messages distinguish: not cheaper, no reliable match, insufficient data, non-comparable price and technical failure.
- [ ] E8 Confirm account deletion is visibly separate from normal settings.

## F. Product evidence plan — remaining time

- [ ] F1 Work through as many rows as possible in `MANUAL_PRODUCT_TEST_PLAN.md`, prioritising at least one electronics, audio, shoes, clothing and household case.
- [ ] F2 Do not fill untested rows. For every tested row record all evidence fields.
- [ ] F3 Summarise P0/P1/P2 findings. Any P0 stops release; unresolved P1 normally stops release until explicitly assessed and retested.
