# COMPR v0.3 prototype checks

Run the automated core checks from the project root:

```powershell
node compr/tests/core.test.js
```

Before publishing, load `compr` as an unpacked extension and verify:

1. A product with JSON-LD can be detected and saved.
2. A product with only Open Graph metadata can be detected.
3. A normal webpage shows the empty state.
4. A product without a price or image remains usable.
5. Saving the same product twice creates one entry.
6. Legacy `products` storage migrates once to `savedProducts`.
7. Removing one product leaves the other products intact.
8. `CLEAR ALL` can be cancelled and confirmed.
9. Search, category filtering, every sort option and category grouping work together.
10. Export creates JSON and importing that file does not create duplicates.
11. The extension icon badge follows the saved-product count after a reload.
12. A saved product can be removed directly from the popup.
13. Test at least one phone, laptop, television and home appliance product page.
14. Save two similar products and verify the popup warning and euro price difference.
15. Confirm unrelated products and non-euro prices do not produce misleading savings text.
16. Enter a preferred clothing or shoe size and verify only products with that available size remain.
17. Verify “Available only” works for electronics and that every status shows its last-check age.
18. Revisit a saved product page and confirm its availability snapshot refreshes.
19. Change country and verify popup, cards, sorting, price differences and price range use its currency.
20. Confirm the original webshop price and ECB rate date remain visible after conversion.
21. Confirm delivery time and return policy appear for a store that publishes this information.
22. Confirm missing delivery or return information is shown as not found and is never guessed.
23. Confirm official discount codes can be detected from the product page or linked promotion pages.
24. Confirm unrelated product codes and codes from external domains are rejected.

Detection is heuristic. Record tested store names and URLs during release QA; do not describe unverified stores as officially supported.
