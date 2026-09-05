# COMPR v0.3 Chrome Web Store resubmission

Prepared: 2 September 2026
Status: Week 1 compliance draft. Do not submit until every manual item below is confirmed.

## Single purpose

COMPR helps a user inspect the product page they are currently viewing, save products locally for comparison, and explicitly request a search for matching retailer offers for the same product at a better price.

## Permission justifications

### `storage`

Required to store products the user chooses to save, comparison preferences, language/country settings, cached public exchange rates and the Supabase authentication session in the user's browser. Saved products are not synchronised to COMPR's servers.

### `activeTab`

Required to access only the current tab after the user opens COMPR. COMPR reads publicly visible product information from that tab so it can show, save, compare or search for that product. COMPR does not request browsing-history permission or permanent access to all sites.

### `scripting`

Required to inject COMPR's packaged product detectors into the active tab after the user invokes the extension. It is not used to download or execute remote code.

### Host permission: COMPR HTTPS backend

Required for authenticated account status and user-initiated Find This Cheaper requests. Product details and the current product-page URL are transmitted only when the user starts a price check.

### Host permission: Supabase HTTPS project

Required to send sign-in codes, verify and refresh authentication sessions, sign out, and authenticate the user's COMPR account.

### Host permission: European Central Bank HTTPS service

Required to fetch the ECB's public reference-rate XML for the user-facing currency conversion feature. COMPR does not intentionally send product or account data in this request.

## Data usage checkboxes for the current free beta

Select these categories because the extension handles them even when some are stored only locally:

- **Personally identifiable information** — email address and account identifier.
- **Authentication information** — one-time sign-in code and session tokens.
- **Web history** — current product-page URL and retailer domain handled after the user invokes COMPR.
- **Website content** — public product information and promotion content read from the active retailer page; selected product details are transmitted for a user-initiated price check.

Do not select, based on the audited current beta behavior:

- Health information.
- Personal communications.
- Location.
- User activity such as clicks, keystrokes or scrolling for analytics.
- Financial and payment information **for the current beta only**, because payment is disabled and COMPR does not receive card details. Reassess this before enabling Stripe or paid plans.

If the Dashboard wording/categories differ at resubmission time, follow the current Dashboard definitions and choose the more transparent category where uncertain.

## Data-use certifications

Certify only after manually verifying that the live deployment matches the audited package:

- Data is used only to provide or improve COMPR's disclosed single purpose.
- User data is not sold.
- User data is not used or transferred for personalised, retargeted or interest-based advertising.
- User data is transferred only when necessary for COMPR's disclosed functionality, security, legal compliance, or another transfer allowed by the Chrome Web Store User Data Policy.
- Humans do not read user data except with the user's specific consent for support, when required for security or law, or when data is aggregated/anonymised for permitted internal operations.

## Remote code declaration

COMPR does not use remote code. All executable JavaScript used by the extension is included in the extension package. Network requests retrieve data only: account/authentication responses, search results, retailer pages and public ECB exchange rates. Returned HTML, JSON and XML are parsed as data and are not executed as code.

## Privacy policy URL

`https://comprshop.github.io/compr-website/privacy.html`

Open this exact public URL in a signed-out browser before submitting and confirm it shows the 2 September 2026 policy.

## Reviewer response for “Purple Nickel”

> We revised COMPR after the Purple Nickel rejection. The public privacy policy now explains what product-page, account, authentication, search, usage and Founding Access data COMPR handles; how each type is collected and used; whether it is stored locally or by a service provider; exact COMPR-controlled retention periods; the services that receive data; security, account deletion, user rights, children, policy changes and Chrome Web Store Limited Use compliance. Hourly cleanup removes eligible search records after 30 days, ended usage periods after 90 days, product/coupon cache after 24 hours, expired checkout reservations after 1 day and expired in-memory rate-limit identifiers after their one-hour window. Users can permanently delete their account after typed and final confirmation; linked COMPR records are cascade-deleted and existing sessions can no longer authenticate. We also added prominent in-product disclosures before email sign-in and before a product price check transmits product details and the current page URL. Unused external messaging access and unnecessarily web-accessible script resources were removed. The Privacy practices declarations have been aligned with the audited behavior.

## Manual Developer Dashboard checklist

- [ ] Confirm the package version is higher than the rejected upload before creating a later release candidate.
- [ ] Paste the single-purpose description above.
- [ ] Paste each permission and host-permission justification above.
- [ ] Select PII, Authentication information, Web history and Website content.
- [ ] Confirm all Limited Use certifications only if the deployed behavior still matches.
- [ ] Declare that the extension does not use remote code.
- [ ] Set the privacy URL to the exact HTTPS URL above.
- [ ] Ensure the store description prominently states that COMPR reads the active product page and sends product details/page URL only after the user starts a price check.
- [ ] Confirm the support email is monitored.
- [ ] Apply `011_data_retention_and_account_deletion.sql` to the production Supabase project and confirm the cleanup RPC succeeds.
- [ ] Confirm Render uses the documented defaults: 30-day search retention, 90-day ended-usage retention, 1-day expired-checkout retention, 24-hour cache retention and hourly cleanup.
- [ ] Check `/health` and confirm its public `retention` values exactly match the privacy policy before resubmission.
- [ ] Test account deletion using a disposable production account, then confirm the old token returns 401 and all linked rows are gone.
- [ ] Confirm the operator identity wording with the responsible adult/business owner; do not invent a company or KVK identity.
- [ ] Verify Render's provider-side log retention and update the policy if a fixed period can be stated; application code cannot enforce deletion from Render logs.
- [ ] Verify current provider terms/settings for Supabase, Brevo and Brave.
- [ ] Keep paid plans/payment disabled for this beta; reassess Financial information disclosures before enabling Stripe.
- [ ] Publish the updated `website-live/privacy.html` before resubmitting the extension.
- [ ] Capture screenshots of the live privacy page and completed Privacy practices tab for the submission record.
- [ ] Do not create or upload a final ZIP until Week 4 release verification is complete.

## Sources used for the compliance interpretation

- Chrome Web Store User Data FAQ: https://developer.chrome.com/docs/webstore/program-policies/user-data-faq/
- Chrome Web Store Limited Use policy: https://developer.chrome.com/docs/webstore/program-policies/limited-use/
- Chrome Web Store Privacy practices fields: https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- Purple Nickel troubleshooting: https://developer.chrome.com/docs/webstore/troubleshooting
