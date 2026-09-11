const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const titles = require("../detectors/productName.js");
const ids = require("../detectors/productId.js");
const queries = require("../search/buildSearchQuery.js");

test("Coolblue document titles retain only the canonical product segment", () => {
  const expected = "Bose QuietComfort Ultra Headphones (2e gen) Zwart";
  assert.equal(titles.cleanDocumentTitle(`${expected} | Coolblue | Hoofdtelefoons`, "www.coolblue.nl"), expected);
  assert.equal(titles.cleanDocumentTitle(`${expected} | Coolblue`, "coolblue.nl"), expected);
  assert.equal(titles.cleanDocumentTitle(`${expected} | Hoofdtelefoons | Coolblue`, "coolblue.nl"), expected);
  assert.equal(titles.cleanDocumentTitle(`${expected} | cOoLbLuE | Hoofdtelefoons`, "COOLBLUE.NL"), expected);
});

test("pipes and retailer words inside genuine model names remain untouched", () => {
  assert.equal(titles.cleanDocumentTitle("Studio Mixer X4 | Creator Edition", "coolblue.nl"), "Studio Mixer X4 | Creator Edition");
  assert.equal(titles.cleanProductName("Coolblue Edition Headphones X4", "coolblue.nl"), "Coolblue Edition Headphones X4");
});

test("source selection is strict JSON-LD then H1 then OG then document title", () => {
  const selected = titles.selectProductTitle({
    jsonLdName: "Bose QC Ultra JSON Product",
    h1: "Bose QC Ultra H1",
    ogTitle: "Bose QC Ultra OG | Coolblue",
    documentTitle: "Bose QC Ultra Document | Coolblue | Hoofdtelefoons"
  }, "coolblue.nl");
  assert.deepEqual(selected, { rawTitle: "Bose QC Ultra JSON Product", name: "Bose QC Ultra JSON Product", source: "jsonld" });

  const withoutJsonLd = titles.selectProductTitle({
    h1: "Bose QuietComfort Ultra Headphones Zwart",
    documentTitle: "Bose QuietComfort Ultra Headphones Zwart | Coolblue | Hoofdtelefoons"
  }, "coolblue.nl");
  assert.equal(withoutJsonLd.source, "h1");
  assert.equal(withoutJsonLd.rawTitle, "Bose QuietComfort Ultra Headphones Zwart");
});

test("v0.3.4 identifier hardening remains active", () => {
  assert.equal(ids.isValidGtin("4006381333931"), true);
  assert.equal(ids.isValidGtin("968677"), false);
  assert.equal(queries.getSearchIdentifier({ sku: "968677", productCode: "968677" }), "");
});

test("content extraction uses the prioritized title contract", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "content.js"), "utf8");
  assert.match(source, /selectProductTitle\(\{\s*jsonLdName:[\s\S]*h1:[\s\S]*ogTitle:[\s\S]*documentTitle:/);
});
