# COMPR Apple submission pack

Status: draft for a free first Safari release. Nothing in this document is evidence of Xcode conversion, device testing, TestFlight processing, App Review, or publication. Checked against the linked Apple documentation on 2026-09-09.

## Draft listing values

- App name: `COMPR`
- Subtitle: `Compare prices while you shop`
- Promotional text: `Check whether the product you are viewing is available for less at another retailer.`
- Description: `COMPR is a Safari extension for comparing a product you are viewing with relevant offers from other retailers. Start a check yourself, review the retailer and price information, and choose whether to open the retailer's website. Results depend on available product and retailer data; COMPR does not check every retailer or guarantee the lowest price or savings. The first Safari release is free and includes five successful billable checks in a rolling seven-day window. Failed, cached, timed-out and no-reliable-match checks do not use the allowance.`
- Keywords: `price comparison,shopping,retail,offers,products,Safari extension`
- Primary category: Shopping (human confirmation required).
- Secondary category: Utilities (human confirmation required).
- Support URL: `<PUBLIC_SUPPORT_URL>`
- Privacy policy URL: `<PUBLIC_PRIVACY_POLICY_URL>`
- Marketing URL: `<PUBLIC_MARKETING_URL>`
- Copyright: `<YEAR> <LEGAL_RIGHTS_HOLDER>`
- Seller name: determined by the enrolled Apple Developer legal entity; the Account Holder must confirm it before creating the record.
- Countries/regions: human decision after retailer coverage, support capacity and legal review; do not default to worldwide.
- Release: manual release after approval is recommended for the first version. Phased release is a later human decision.

## Review information

- Contact: `<REVIEW_CONTACT_NAME>`, `<PHONE>`, `<EMAIL>`.
- Demo account: none expected. The free flow creates an anonymous Supabase identity; confirm on a signed TestFlight build. If Apple cannot reach the flow, provide review instructions, never shared production credentials.
- Review notes: enable the COMPR Safari extension, allow access only on a chosen retailer product page, open COMPR, and tap **Find this cheaper**. Explain that search/category/social/map pages fail closed, that five successful billable guest checks are available per rolling seven days, and that failures/no-match/cache do not consume a check. Payments, Stripe, StoreKit, subscriptions and paid entitlements are absent from this release.
- Reviewer steps: install containing app; enable extension; grant the requested site permission; open a supported HTTPS product-detail page; start a comparison; inspect the returned retailer and destination; repeat negative tests on a search/category page; reset guest data with the exact confirmation if exposed by the signed UI.

## Privacy and policy mapping

The Account Holder must answer App Privacy from the behavior of the final signed binary and backend, not from this draft. Expected data requiring confirmation includes authentication identifiers/tokens, anonymous user identifier, product attributes submitted after an explicit check, coarse usage/quota records, operational/security logs, and any diagnostic data. Confirm purpose, linkage, retention, third-party processing and whether each category meets Apple's definition of collection. COMPR does not intentionally track users across other companies' apps or websites and must declare tracking only after a final SDK/network audit.

Guests are Supabase Auth users marked anonymous. Guest reset is separate from normal account deletion and must remove the anonymous account and linked COMPR data only after exact confirmation. If the final app supports creating a normal account, Apple requires initiating account deletion in the app; the signed flow and wording must be device-tested. Converted anonymous accounts must use normal-account behavior and must not be deleted by guest cleanup.

Requested Web Extension permissions are `storage`, `activeTab`, and `scripting`. Host access is limited to the approved COMPR API, public Supabase origin and ECB origin. `activeTab`/`scripting` inspect the current page only following user action and site permission; `storage` retains the minimal session and safe extension state. Explain each permission in App Review notes and verify Safari's actual permission prompts on iPhone, iPad and Mac.

Encryption/export compliance is a human/legal declaration. The app uses standard HTTPS/TLS and platform authentication; the Account Holder must answer App Store Connect's current questions for the final binary and jurisdictions. This document does not decide exemption eligibility.

Age rating is expected to be suitable for a general shopping utility, but the Account Holder must complete Apple's current questionnaire and consider unrestricted web access, user-generated content (none expected), commerce references and regional rules. No age rating is asserted here.

## Required Apple evidence before submission

- Mac and supported Xcode; Xcode conversion output reviewed rather than guessed.
- Final app and extension bundle identifiers, team, entitlements, signing and archive validation.
- Physical iPhone, iPad and Mac Safari tests, including Ask/Deny/Allow, VoiceOver, Dynamic Type, keyboard, 320/390-width layout, lifecycle and network failures.
- Accurate screenshots made from the final build at Apple's accepted dimensions; no mock functionality.
- App Privacy, age rating, export compliance, support/privacy URLs and reviewer contact completed by the authorized human.
- TestFlight processing and a successful physical-device beta pass before App Review.

## Official Apple references

- [Package a web extension for Safari](https://developer.apple.com/documentation/safariservices/converting-a-web-extension-for-safari)
- [Safari Web Extensions](https://developer.apple.com/documentation/safariservices/safari-web-extensions)
- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Manage app privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy)
- [App privacy details](https://developer.apple.com/app-store/app-privacy-details/)
- [Offering account deletion in your app](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview)
- [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications)
- [Upcoming requirements](https://developer.apple.com/news/upcoming-requirements/): Apple states that since 2026-04-28 App Store Connect uploads must use Xcode 26 or later with the applicable version-26 SDK. Recheck immediately before upload.
