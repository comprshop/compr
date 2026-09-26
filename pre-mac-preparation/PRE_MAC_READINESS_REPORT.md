# Pre-Mac readiness, 2026-09-21

## Baseline

Root `main` at `137ee0a6b42668a63d6a384ebbb66e9f8a9c0a69`; backend `main` at `10cc5f83d0e889c3751045c5e5092691d9e7ee62`; website `main` at `f414978d1dc8ae13db54278e394a2e271fd23819`. Root was already dirty (`COMPR_WORK_PLAN.md` and numerous untracked audits/previews/uploadcandidates); backend and website were clean. No `AGENTS.md` found. Safari and Chrome manifests say `0.3.6`.

Frozen kit: `build/COMPR-Safari-Mac-Day-Kit-v0.3.6.zip` = `d4505d7d6186ad5cc221998985cfde3d156e04a1b929a8b2fa380124e8322642` (PASS). Nested converter ZIP = `42a399a994ceb6c00c33b759f71c3db4048f5dbe277fabc8b65714744c470803` (PASS); 52 Safari runtime files. `guestMode: false`; Stripe disabled in current beta. Existing callback is Chrome-only. No Mac/iPhone/Xcode/TestFlight evidence exists.

## Gaps

Status: READY = locally prepared; PARTIAL = prepared but unproven; BLOCKED = must resolve before dependent phase; MAC-ONLY = cannot verify on Windows; HUMAN-ONLY = authorized person; VERIFY-CURRENT-RULE = recheck official Apple requirements.

| # | Topic | Status | Next proof/action |
|---:|---|---|---|
| 1 | Apple Developer account | HUMAN-ONLY | Father verifies active membership |
| 2 | Account Holder/2FA | HUMAN-ONLY | Father confirms access and presence |
| 3 | App Store Connect | HUMAN-ONLY | Confirm correct team/role |
| 4 | Agreements, Tax, Banking | HUMAN-ONLY | Free build agreement status; paid Pro later requires paid agreement/tax/banking |
| 5 | Container app name | PARTIAL | `COMPR` proposed; inspect converter |
| 6 | Extension name | PARTIAL | `COMPR`; inspect generated target |
| 7 | Bundle IDs | MAC-ONLY | Choose/confirm unique IDs manually, no registration now |
| 8 | App Group | MAC-ONLY | Only if native cross-target storage demonstrably needs it |
| 9 | Entitlements | MAC-ONLY | Inspect Xcode targets; no guess |
| 10 | Signing | HUMAN-ONLY | Correct team; father approves as needed |
| 11 | Provisioning | MAC-ONLY | Resolve in Xcode under approved team |
| 12 | Web Extension conversion | PARTIAL | 52-file verified input; real packager/converter on Mac |
| 13 | Mac container build | MAC-ONLY | Build and launch |
| 14 | iPhone/iPad targets | MAC-ONLY | Physical iPhone; iPad if available |
| 15 | TestFlight upload | BLOCKED | Signed validated build, apprecord and gates first |
| 16 | TestFlight install | BLOCKED | Upload/processing/tester access first |
| 17 | Safari receiver/callback | BLOCKED | Measure stable receiver before callback patch |
| 18 | Mac Origin | MAC-ONLY | Observe actual `/v1/me` request |
| 19 | iPhone Origin | MAC-ONLY | Observe independently |
| 20 | Websitecallback | BLOCKED | Currently Chrome-only; exact Safari receiver later |
| 21 | Backend CORS | BLOCKED | Exact observed Safari origin later; never `null`/missing wildcard |
| 22 | Supabase redirect allowlist | PARTIAL | Owner verifies exact callback, no wildcard |
| 23 | OTP/magic link | PARTIAL | Shared code exists; signed Safari test absent |
| 24 | Session restore | PARTIAL | Local tests exist; signed device test absent |
| 25 | Search flow | PARTIAL | Backend/client tests exist; Safari product test absent |
| 26 | Quota | READY | Server schema: intro 5, monthly Free 3, Pro 15; production smoke still needed |
| 27 | Free + Pro public offer | BLOCKED | Product direction selected; Pro not implemented for Safari |
| 28 | StoreKit | BLOCKED | Design only, no implementation |
| 29 | Backend transaction verification | BLOCKED | Design, endpoints and migration needed |
| 30 | Server Notifications V2 | BLOCKED | Design, signed webhook and replay tests needed |
| 31 | Restore Purchases | BLOCKED | Native implementation and cross-device test |
| 32 | Refund/revoke/expiry | BLOCKED | Entitlement transitions and tests |
| 33 | Cross-device entitlement | BLOCKED | Verified backend mapping to COMPR account |
| 34 | App icon | READY | Approved 1024×1024 RGB/no-alpha candidate and 1254×1254 source in `pre-mac-preparation/assets/COMPR-App-Icon-Set/`; Xcode Asset Catalog import and device review remain MAC-ONLY |
| 35 | Screenshots | MAC-ONLY | Real signed build, Apple sizes recheck |
| 36 | Metadata | PARTIAL | Draft, human review/translation |
| 37 | Privacy questions | HUMAN-ONLY | Final binary/data-flow answers by Account Holder |
| 38 | Privacy policy | PARTIAL | Website text exists; paid StoreKit update/legal review |
| 39 | Support page | PARTIAL | Website page exists; verify contact/paid support process |
| 40 | Account/data deletion | PARTIAL | Current free endpoint; paid account boundary unresolved |
| 41 | Subscription terms | BLOCKED | Draft and human/legal review before paid launch |
| 42 | Review notes | PARTIAL | Draft; actual steps after device tests |
| 43 | Testaccount/review flow | PARTIAL | Existing sign-in; reviewer access strategy after signed build |
| 44 | Age rating | HUMAN-ONLY | Complete current questionnaire |
| 45 | Export compliance | VERIFY-CURRENT-RULE | Account Holder answers for signed binary |
| 46 | Cloud provider | HUMAN-ONLY | Verify host/security/hardware before rent |
| 47 | Xcode version | VERIFY-CURRENT-RULE | Apple currently lists Xcode 26+ for iOS build upload |
| 48 | macOS version | VERIFY-CURRENT-RULE | Must support selected Xcode; verify provider machine |
| 49 | Storage/upload | HUMAN-ONLY | Space, secure transfer, App Store Connect access |
| 50 | Recovery plan | READY | Frozen kit, hashes, stop rules and two-session runbook |

## Decision

**NOG NIET HUREN** until human/provider checks 1–4 in [decision](MAC_SESSION_DECISION.md) are done. The first session should target a local free build and measured Safari identities; Pro is a separate second-phase project. The earlier missing-1024px-icon blocker is resolved for asset preparation, but import/validation on Mac remains. Old `COMPR_APPLE_SUBMISSION_PACK.md` describes a guest-only free release and is not the selected Free + Pro public spec; do not copy its claims into a listing.

Official Apple pages checked 2026-09-21: [packager](https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari), [upload versions](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds), [App Store Connect workflow](https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-workflow). Recheck just before rent/upload.
