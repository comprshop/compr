# COMPR Privacy Summary

Last updated: 2 September 2026

The complete public policy is available at:

https://getcompr.nl/privacy.html

COMPR reads publicly visible product information from the active page after the user opens the extension. This can include product name, brand, price, currency, image URL, variant details, identifiers, availability, retailer domain, page URL and visible promotions. It uses this information to show the detected product and, when the user chooses, save and compare it locally.

Saved products and preferences use `chrome.storage.local` and are not automatically synchronised to COMPR's servers. They remain until the user removes them, clears extension data or uninstalls COMPR.

When the user requests email sign-in, the email address, one-time code and authentication session are processed by Supabase and COMPR's configured email provider, currently Brevo. Session tokens are stored locally so the user can remain signed in.

Only after the user selects Find This Cheaper does COMPR transmit the selected product details and product-page URL to its HTTPS backend. The backend uses Supabase for account and usage records, Render for hosting and Brave Search for product-derived web-search queries. Candidate retailer pages can be requested to validate product identity and price. Hourly cleanup makes search requests and returned responses eligible for deletion after 30 days, ended usage periods 90 days after period end, and expired checkout reservations 1 day after expiry. Product and coupon cache records stop being used after 24 hours and are removed no later than the next hourly cleanup. In-memory rate-limit identifiers are removed after their one-hour window at cleanup or on restart.

An authenticated user can permanently delete the account from COMPR by typing DELETE and accepting a final confirmation. The backend then hard-deletes the Supabase Auth user, revokes the account's ability to use existing access and refresh tokens, and cascades deletion through linked COMPR account, search, usage, entitlement and Founding-interest records. After server deletion succeeds, the extension clears its local COMPR storage. It does not report success if a deletion step fails. Apple authorization is revoked where required before deletion completes. Minimal de-linked purchase-ownership records may remain for transaction integrity or legal obligations. Deleting the COMPR account does not cancel an Apple subscription; manage it separately through Apple.

The iOS app offers monthly and yearly Pro and Ultimate subscriptions through Apple in-app purchase. Apple handles payment; COMPR processes signed transactions and subscription status to grant and restore entitlements, not full card numbers. No analytics SDK, advertising pixel, affiliate tracking or crash-reporting SDK is present in the current extension.

COMPR does not sell user data or use it for personalised, retargeted or interest-based advertising. COMPR's use of information received from Google APIs adheres to the Chrome Web Store User Data Policy, including the Limited Use requirements.

For the complete collection, use, service-provider, retention, security, deletion, children and policy-change disclosures, read the public policy above. Privacy and deletion requests can be sent to ms-timon@outlook.com.

The iOS app and Safari extension share a Supabase-project-bound session in their App Group. The backend may hold an encrypted Apple revocation credential solely for authorized account deletion. App Store privacy disclosures must reflect these account and purchase data flows.
