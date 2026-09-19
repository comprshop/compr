# App Store / TestFlight metadata draft

Concept only; Account Holder and legal review remain required. Do not publish from this document.

- App name: `COMPR` (human confirmation required)
- Subtitle: `[human input; factual and non-promissory]`
- Promotional text: `[human input]`
- Description: `COMPR helps a user capture product details from a supported product page, save products for comparison, and request a check for relevant lower-priced offers.` Confirm every statement against the tested build.
- Keywords: `[human input after store-policy review]`
- Support URL: `https://getcompr.nl` — confirm final support destination.
- Privacy URL: `https://getcompr.nl/privacy.html` — confirm it is published and current.
- Marketing URL: `https://getcompr.nl` — optional; human confirmation.
- Age-rating questionnaire: `[Account Holder input in App Store Connect]`
- Privacy labels: `[legal/human review against actual behavior]`
- Contact person: `[Account Holder/human input]`
- Demo account: `Not needed unless Apple later requests one.`

## App Review notes draft

COMPR is a Safari Web Extension. Website access is required only after the user enables it so the extension can read product-page information needed for Save & Compare and Find This Cheaper. It adds no analytics or advertising tracking. Guest access and payments are disabled in this beta. Add reviewer steps only after Mac/iPhone testing proves them.

## TestFlight “What to Test” draft

Enable COMPR for a chosen product website, open a normal product-detail page, confirm product detection, save it, view Compare, and verify navigation and error states. Add auth and live price-check instructions only after receiver/CORS testing succeeds. Do not claim guaranteed savings, universal retailer support or continuous availability.
