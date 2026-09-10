const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const names = require("../detectors/productName.js");
const identifiers = require("../detectors/productId.js");
const queries = require("../search/buildSearchQuery.js");
const matcher = require("../matching/productMatcher.js");

test("retailer title affixes are removed only on an exact trusted-store match", () => {
  const raw = "Bose QuietComfort Ultra Headphones (2e gen) Zwart | Coolblue";
  assert.deepEqual(names.chooseBestProductTitle([raw], "www.coolblue.nl"), {
    rawTitle: raw, name: "Bose QuietComfort Ultra Headphones (2e gen) Zwart"
  });
  assert.equal(names.cleanProductName("Bose QuietComfort Ultra - cOoLbLuE", "coolblue.nl"), "Bose QuietComfort Ultra");
  assert.equal(names.cleanProductName("Coolblue - Bose QuietComfort Ultra", "coolblue.nl"), "Bose QuietComfort Ultra");
  assert.equal(names.cleanProductName("Coolblue Gift Card Limited Edition", "coolblue.nl"), "Coolblue Gift Card Limited Edition");
  assert.equal(names.cleanProductName("Bose QuietComfort Ultra | Audio Shop", "coolblue.nl"), "Bose QuietComfort Ultra | Audio Shop");
});

test("identifier classes keep only GTIN and MPN as strong search identity", () => {
  assert.equal(identifiers.isValidGtin("4006381333931"), true);
  assert.equal(identifiers.isValidGtin("968677"), false);
  assert.equal(queries.getSearchIdentifier({ gtin: "4006381333931" }), "4006381333931");
  assert.equal(queries.getSearchIdentifier({ gtin: "968677", sku: "968677", productCode: "968677" }), "");
  assert.equal(queries.getSearchIdentifier({ mpn: "WH-1000XM5" }), "WH-1000XM5");
  assert.equal(matcher.compareProducts(
    { name: "One", brand: "Brand", gtin: "4006381333931" },
    { name: "Different", brand: "Other", gtin: "4006381333931" }
  ).type, "EXACT_MATCH");
  assert.equal(matcher.compareProducts(
    { name: "One", brand: "Brand", mpn: "ABC-123" },
    { name: "Different", brand: "Brand", mpn: "ABC-123" }
  ).type, "EXACT_MATCH");
  assert.notEqual(matcher.compareProducts(
    { name: "One", brand: "Brand", sku: "968677", webshop: "one.example" },
    { name: "Different", brand: "Brand", sku: "968677", webshop: "two.example" }
  ).type, "EXACT_MATCH");
  assert.equal(matcher.compareProducts(
    { name: "One", brand: "Brand", gtin: "4006381333931" },
    { name: "One", brand: "Brand", gtin: "5012345678900" }
  ).type, "NO_MATCH");
});

test("AUTH_REQUIRED exposes the existing account flow without exposing an internal code", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "compare.html"), "utf8");
  const source = fs.readFileSync(path.join(root, "compare.js"), "utf8");
  const i18n = fs.readFileSync(path.join(root, "shared", "i18n.js"), "utf8");
  assert.match(html, /id="cheaperSignIn"[^>]*>Sign in<\/button>/);
  assert.match(source, /code === "AUTH_REQUIRED"\) elements\.cheaperSignIn\.focus\(\)/);
  assert.match(source, /runtime\.getURL\("popup\.html"\)/);
  assert.match(source, /searchAction\.cancel\(\)/);
  assert.doesNotMatch(html, />AUTH_REQUIRED</);
  for (const translation of ["Inloggen", "Anmelden", "Se connecter"]) assert.match(i18n, new RegExp(translation));
});
