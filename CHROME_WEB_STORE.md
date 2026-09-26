# Chrome Web Store submission draft

## Short description

Check whether the same product is available for less, then save and compare your options.

## Permission rationale

- `storage`: saves products, preferences and the authenticated session in the browser.
- `activeTab`: reads product information only on the page where the user opens COMPR.
- `scripting`: runs product detectors after an explicit user action.
- Host access: limited in the production build to the COMPR HTTPS API, Supabase authentication service and the European Central Bank's public exchange-rate endpoint.

## Support and privacy copy

COMPR reads publicly visible product information from the active tab after the user invokes the extension. It sends relevant product details and the product-page URL to its backend only when the user starts Find This Cheaper. Saved products remain in browser storage. Authentication is handled by Supabase and authentication email by Brevo; search uses the configured server-side provider, currently Brave Search. Stripe code exists server-side but payment remains disabled in this free beta. The final listing must link to the published Privacy Policy, Terms, account-deletion instructions and a monitored support address. Dashboard declarations must include personally identifiable information, authentication information, web history and website content for the current beta.

## Release notes

COMPR 0.3 introduces authenticated Find This Cheaper searches, strict precision-first same-product matching, five introductory price checks, Save & Compare improvements and clearer account controls. Only sufficiently proven, cheaper variants are recommended. Pro and Ultimate Founding Access records non-binding launch interest only; this release does not take payments.

## Final submission order

1. Apply Supabase migration `010_founding_interest_signups.sql`, then `011_data_retention_and_account_deletion.sql`, and verify Founding interest, cleanup and account deletion with disposable test data.
2. Deploy the COMPR backend to a stable public HTTPS URL and configure its production secrets, retention values and allowed origins.
3. Run `tools/build-production-extension.ps1` with that real API URL and the existing Supabase, callback and Chrome Store URLs.
4. Load the generated `dist/compr-extension` unpacked and smoke-test sign-in, one successful search, a no-match search, saving/comparing and the Founding Access link.
5. Upload the version-bound `dist/COMPR-v<manifest-version>-production.zip`, use the published website privacy URL and complete the permission/data-use declarations consistently with this document.

Do not submit a validation build made with a placeholder API URL. Do not upload the development folder because it contains the localhost backend configuration.
