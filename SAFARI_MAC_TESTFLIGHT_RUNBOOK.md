# COMPR first Safari build: Mac, iPhone and TestFlight runbook

This runbook starts from the validated Windows archive. It does not prescribe real Apple identifiers. Keep the beta free; Guest, Stripe, checkout, portal, StoreKit and external coupon requests remain off.

## Inputs

- Safari converter input archive and SHA-256 from `build/safari-mac-handoff/`.
- Public backend URL `https://compr-backend.onrender.com`.
- Website callback `https://getcompr.nl/auth-callback.html` (currently Chrome-only for receiver handoff).
- Placeholders: `APPLE_TEAM_ID_REQUIRED`, `SAFARI_BUNDLE_ID_REQUIRED`, `APP_GROUP_REQUIRED_IF_NEEDED`.

## A–T execution table

| Step | Where/click or command | Expected evidence | Stop criterion | Recovery |
|---|---|---|---|---|
| A. Check Mac | Apple menu → About This Mac; Terminal: `sw_vers`, `xcodebuild -version` | Screenshot of macOS/model and text record of Xcode version | Unsupported macOS/Xcode or insufficient disk | Update macOS/Xcode or rent a suitable Mac |
| B. Install/open Xcode | Mac App Store → Xcode → Get/Open; accept license/components | Xcode Welcome screen | Installation/component error | Retry on stable network; do not bypass signing checks |
| C. Transfer input | Copy archive plus checksum over an encrypted/private channel; run `shasum -a 256 <archive>` | Hash exactly equals Windows report | Hash mismatch | Delete the Mac copy and transfer again |
| D. Extract and generate | Extract to a new folder. Terminal: `xcrun safari-web-extension-converter <extracted-folder> --project-location <new-empty-folder> --app-name COMPR` | Converter completes and a new Xcode project appears | Converter warning about unsupported required API or missing runtime file | Save output, stop, fix shared source on Windows, rebuild input |
| E. Add Apple account | Xcode → Settings → Accounts → `+` → Apple ID | Correct account/team visible | Wrong owner/team or unaccepted agreement | Account Holder accepts agreements/assigns role; do not use another team |
| F. Select signing | Project navigator → each app/extension target → Signing & Capabilities → Automatically manage signing → correct Team | No red signing error | Certificate/profile cannot be created | Account Holder/admin resolves certificates and entitlements |
| G. Set identifiers | Signing & Capabilities → Bundle Identifier for container and extension; use newly approved unique values | Screenshot/list of exact identifiers without credentials | Collision, wildcard or guessed production identifier | Register/choose unique IDs in the authorized Apple account |
| H. Build Mac container | Scheme menu → macOS container → My Mac → Product → Build | Build Succeeded | Compiler, manifest or entitlement error | Save full build log; fix source/generation, never hand-edit generated runtime files blindly |
| I. Enable Safari development | Safari → Settings → Advanced → Show features for web developers; Develop menu settings only if needed | COMPR visible in Safari → Settings → Extensions | Extension missing or requires unsafe global permission | Recheck target embedding/signing and converter output |
| J. Test on Mac | Enable COMPR; choose Ask/Allow for one test shop | Screenshots of popup, permission prompt and one redacted product result | Crash, broad permission, unexpected host or token exposure | Disable extension and stop the build |
| K. Connect iPhone | Cable; unlock; Trust This Computer; Xcode → Window → Devices and Simulators | Device paired and available as run destination | Untrusted/unpaired device or developer mode unavailable | Reconnect, trust, enable Developer Mode only through iOS prompts |
| L. Build on iPhone | Select iOS container scheme/device → Run | Container installs; Safari lists COMPR extension | Signing/install crash or entitlement mismatch | Fix team/provisioning; increment local build only if required |
| M. Test site permissions | iOS Settings → Apps → Safari → Extensions → COMPR; test Ask/Deny/Allow per website | Redacted evidence for each state | Permanent all-sites access required or Deny still reads/sends data | Disable extension and treat as blocker |
| N. Capture real runtime values | In a local debug build inspect `browser.runtime.getURL("auth-receiver.html")`; inspect sanitized request Origin/reason only | Exact receiver URL and exact Origin recorded in the template | Values absent, unstable or include tokens | Keep OTP-only and investigate; do not guess |
| O. Feed values back | Return only redacted receiver/origin strings to Windows source review; update exact allowlists in a separately approved task | Reviewed diff and negative tests | Wildcard, `null`, missing-origin allowance or caller-selected redirect | Reject patch and retain Chrome-only callback |
| P. Rebuild/auth test | Generate a fresh input/project; separately test OTP, then magic link, `/v1/me`, refresh and logout | URL clears immediately; session restores; no token logs | 403, open redirect, token exposure or automatic search | Stop; keep magic link disabled/unclaimed and fix exact origin/receiver |
| Q. Archive | Xcode → Product → Archive with Generic/Any iOS Device | Organizer shows one successful archive | Validation/signing warnings | Fix target/version/signing and archive again |
| R. Validate | Organizer → Distribute App → App Store Connect → Upload → Validate App | Validation succeeds; save report screenshot | Any validation error or unexpected entitlement/privacy use | Cancel upload and resolve the exact report |
| S. Upload | Organizer → Distribute App → App Store Connect → Upload | Build appears under App Store Connect processing | Wrong app/team/version or privacy mismatch | Stop processing/reject build where possible; correct before reuse |
| T. Internal TestFlight | App Store Connect → app → TestFlight → build → Internal Testing → group/tester | Authorized tester can install and launch | Agreements/export/privacy/beta metadata incomplete | Account Holder completes required agreements; owner fills metadata |
| U. Tester smoke | Tester installs through TestFlight and executes `SAFARI_SMOKE_TEST_MATRIX.md` | Signed test sheet with no open P0/P1 | Any listed stop condition | Remove build from testing and prepare a new build |

## Account Holder responsibilities

The Account Holder (likely the user's father) must personally accept Apple agreements, confirm the legal entity, approve certificates/identifiers where permissions require it, manage App Store Connect roles, complete tax/banking only if Apple requires it for the chosen free distribution contract, approve privacy/export answers, and authorize TestFlight/App Review submission. Credentials and recovery codes must never be shared in prompts, source files or screenshots.

## Safari identity and callback rule

Do not edit `auth-callback.js` for Safari before step N. The current Chrome path stays exact. Safari OTP can be tested independently. Magic-link support remains blocked until the signed receiver and actual request Origin have been captured, allowlisted exactly, negatively tested, and reviewed.

## Website plan (do not publish yet)

For the private TestFlight beta, retain the Chrome primary CTA and change only after an approved Safari installation route exists: add a clearly secondary Safari TestFlight invitation, real Safari screenshots, supported-device text, TestFlight limitations, and updated support/privacy disclosures. Later, present Chrome and Safari side by side with platform-specific installation instructions. Update callback behavior only after the exact Safari receiver is known. Sitemap needs no callback entry; callback and billing return remain non-indexed.

## Release gates

Before TestFlight: successful conversion/build/signing, exact site-permission behavior, no guest/billing code path, one device smoke pass, exact Safari origin captured, production CORS fixed without widening, OTP plus `/v1/me`, clean console/network, and no tokens in URL/logs. Magic link is a blocker only if advertised as supported in the beta.

Before public App Store release: external device matrix, App Review metadata/screenshots, verified privacy/retention/legal identity, accessibility review including VoiceOver/Dynamic Type, export-compliance answer, support readiness, and a separate decision on payments. Any future paid digital feature requires a dedicated StoreKit/App Store policy review.
