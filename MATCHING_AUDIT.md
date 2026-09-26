# COMPR matching audit — Week 2

Status: implemented locally and verified with deterministic fixtures. Nothing was deployed or published.

## Pipeline

1. `content.js` reads the current product page through focused detectors for name, brand, category, price, colour, identifiers, sizes and availability.
2. The extension normalises the captured product and stores it locally. `buildSearchQuery.js` prefers GTIN/MPN or a model-bearing product code and otherwise combines brand and product name.
3. The authenticated extension sends the minimum product fields to `POST /v1/search` through `shared/apiClient.js`.
4. `server.js` builds bounded Brave queries, accepts only known retailer domains, rejects likely collection/search pages and attempts to read retailer JSON-LD or conservative page metadata.
5. `src/productIdentity.js` creates one central identity containing brand, model tokens, GTIN/MPN/product code/SKU, category, kind, generation, capacity, size, colour, material, pack quantity, volume, weight, screen size, condition and audience.
6. `src/searchService.js` applies hard identity, page and price rules to every candidate. It excludes the current retailer and deduplicates accepted offers.
7. Only a cheaper offer with a comparable total price and status `reliable_match` is ranked. Exact identifiers outweigh model/name evidence; title similarity cannot override a contradiction.
8. The API returns only `EXACT_MATCH` or `HIGH_CONFIDENCE_MATCH`. Other decisions become `no_reliable_match`, `insufficient_product_data`, `price_not_comparable`, or `provider_error` through stable API errors.
9. `compare.js` displays savings only for those two reliable classes. Otherwise it shows “Geen betrouwbare match gevonden”, explains the precision-first choice and offers a retry.

## Problems found in the previous implementation

- `POSSIBLE_MATCH` candidates could be returned and linked from the UI even when the colour or another signal conflicted.
- Missing source or candidate variant information could still collect enough title-score points.
- Free-text reasons were not stable machine-testable reason codes.
- Monthly prices, subscriptions, rent, deposits and non-comparable currencies were not centrally rejected.
- A correct but more expensive product could still be returned as a match although the feature promises a cheaper result.
- Generic category/search pages were partly filtered during provider extraction, but were not rejected again at the final trust boundary.
- Product identity rules were duplicated between older extension matching and backend helpers.
- Debug diagnostics included complete candidate names. They now contain only aggregate counts, retailer host, class, confidence and reason codes.

## Central identity and mandatory evidence

Every source needs a brand plus a reliable GTIN/MPN or a recognisable model with enough descriptive context. A candidate needs the same brand and either the same reliable identifier or the same exact model. When the source contains a relevant variant, the candidate must explicitly confirm it; absence is not agreement.

- Electronics: exact model; capacity, generation and screen size when selected/present.
- Headphones/earbuds: exact compound model and matching product kind; generation and colour when present.
- Fashion/footwear: exact model plus selected size, colour, material and audience when present.
- Consumables/bundles: exact model plus pack quantity, volume or weight when present.
- Condition: an unspecified normal retail source is treated as new; refurbished, used and open-box candidates are rejected.

## Hard rejection reason codes

`BRAND_MISMATCH`, `MODEL_MISMATCH`, `IDENTIFIER_MISMATCH`, `VARIANT_MISMATCH`, `CONDITION_MISMATCH`, `ACCESSORY_RESULT`, `BUNDLE_MISMATCH`, `CATEGORY_PAGE`, `INSUFFICIENT_IDENTITY`, `PRICE_NOT_TOTAL`, `PRICE_NOT_COMPARABLE`, `NOT_CHEAPER`, `CURRENT_RETAILER`, `UNAVAILABLE`, and `CONFIDENCE_TOO_LOW`.

## Confidence and decision statuses

Confidence starts from proven identity evidence, not generic title overlap. A matching GTIN/MPN starts at 0.92; an exact model path starts at 0.62 and receives 0.18 for the shared model. Exact GTIN/MPN and limited name corroboration can raise the score. Every mandatory variant is checked before scoring. The acceptance threshold is 0.82. A score cannot override any hard rejection.

- `reliable_match`: identity proven, total purchase price comparable and lower than the source.
- `no_reliable_match`: candidates absent, contradictory, untrusted, not cheaper or below threshold.
- `insufficient_product_data`: source identity is too sparse to search safely.
- `price_not_comparable`: identity may match but no clear comparable total price exists.
- `provider_error`: the external search provider could not complete the request.

## Deterministic coverage

`tests/fixtures/matching-cases.json` contains 25 local JSON cases, including Samsung Galaxy A57 256GB, Sony WH-1000XM5, JBL Tune 730BT, Nike Air Max 90, Adidas Samba OG, capacity, generation/model prefix, phone/case, replacement part, condition, bundle, shoe size, monthly price, missing model, category/search pages, provider states, multiple candidates, a cheaper wrong model and a correct non-cheaper offer. No test performs a live network request.

## Remaining limitations and manual checks

- Retailer markup varies and can omit selected colour, size, condition or total shipping price. Precision-first handling will intentionally produce false negatives.
- Product codes labelled only as store-local SKU are not trusted across shops unless model/variant evidence independently passes.
- Currency conversion is not used for final price proof; differing currencies are rejected.
- Semantic variants that are not named in the current extractors (for example regional radio bands or highly category-specific editions) may require a future explicit rule.
- Manually test representative real pages from each supported store for structured-data extraction, selected size/colour capture, total versus monthly pricing, redirects, out-of-stock pages and the exact Dutch no-match UX.
- Brave/retailer HTML can change independently. Live checks must be performed manually; automatic tests intentionally remain offline.
