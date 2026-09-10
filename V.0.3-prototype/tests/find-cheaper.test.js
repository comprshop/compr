const assert = require("node:assert/strict");

const matcher = require("../matching/productMatcher.js");
global.ComprMatcher = matcher;

const queryBuilder = require("../search/buildSearchQuery.js");
global.buildProductSearchQueries = queryBuilder.buildProductSearchQueries;

const { numericPrice, buildDemoCatalog } = require("../search/demoCatalog.js");
const provider = require("../search/searchProvider.js");

const product = {
  name: "Nike P-6000",
  brand: "Nike",
  category: "Shoes",
  color: "White",
  mpn: "CD6404-105",
  price: "€109.99",
  currency: "EUR"
};

assert.equal(
  queryBuilder.buildExactSearchQuery(product),
  "Nike P-6000 \"CD6404-105\""
);
assert.equal(
  queryBuilder.buildExactSearchQuery({ name: "Bose QuietComfort Ultra Headphones (2e gen) Zwart", brand: "Bose", productCode: "968677" }),
  "Bose QuietComfort Ultra Headphones (2e gen) Zwart"
);

assert.equal(numericPrice("€1.299,95"), 1299.95);
assert.equal(provider.getSafeResultUrl("javascript:alert(1)"), "");
assert.equal(provider.getSafeResultUrl("https://shop.example/item"), "https://shop.example/item");
assert.equal(provider.normalizeSearchResults([
  { name: "Item", webshop: "Store", price: 10, url: "javascript:alert(1)" },
  { name: "Item", webshop: "Store", price: 10, url: "https://shop.example/item" }
]).length, 1);

const demoResults = buildDemoCatalog(product);
assert.equal(demoResults.length, 3);
assert.equal(demoResults[0].mpn, "CD6404-105");
assert.ok(demoResults[0].price < 109.99);

const ranked = provider.rankSearchResults(product, demoResults);
assert.equal(ranked[0].matchType, "EXACT_MATCH");
assert.equal(ranked[0].matchConfidence, 1);
assert.equal(ranked.at(-1).matchType, "NO_MATCH");
assert.match(ranked.at(-1).matchReasons.join(" "), /Conflicting product identifier/);

const authoritative = provider.rankSearchResults({ name: "New Balance 740 Silver Metallic", brand: "New Balance" }, [{
  name: "New Balance 740 UNISEX silver-coloured metallic/wit", brand: "New Balance", price: 69.95,
  url: "https://www.zalando.nl/new-balance-740", isDemo: false, backendMatchType: "LIKELY_MATCH",
  backendConfidence: 0.68, backendMatchReasons: ["Same model number", "Different colour or variant"]
}], { authoritativeBackend: true });
assert.equal(authoritative[0].matchType, "LIKELY_MATCH");

assert.equal(authoritative[0].matchConfidence, 0.68);

assert.equal(
  matcher.compareProducts(product, {
    ...product,
    mpn: "CD6404-101"
  }).type,
  "NO_MATCH"
);

assert.equal(
  matcher.compareProducts(
    { name: "Solo Fleece", brand: "Nike", sku: "STORE-123", color: "Black", webshop: "shop.example" },
    { name: "Solo Fleece", brand: "Nike", sku: "STORE-123", color: "Black", webshop: "shop.example" }
  ).type,
  "LIKELY_SAME"
);

assert.notEqual(
  matcher.compareProducts(
    { name: "Solo Fleece", brand: "Nike", color: "Black" },
    { name: "Solo Fleece", brand: "Nike", color: "Red" }
  ).type,
  "LIKELY_SAME"
);

assert.equal(
  matcher.compareProducts(
    { name: "P-6000", brand: "Nike", mpn: "CD6404-105" },
    { name: "P-6000", brand: "Nike", mpn: "CD6404-105" }
  ).type,
  "EXACT_MATCH"
);

assert.equal(
  matcher.compareProducts(
    { name: "Bose QuietComfort Ultra Koptelefoon (2e generatie) Zwart", brand: "Bose", category: "TV & Audio" },
    { name: "Bose QuietComfort Ultra Headphones (2nd Gen) Black", brand: "Bose", category: "TV & Audio" }
  ).type,
  "LIKELY_SAME"
);
assert.equal(
  matcher.compareProducts(
    { name: "Samsung Galaxy A57 256 GB Grijs", brand: "Samsung", category: "Phones & Tablets" },
    { name: "Samsung Galaxy A57 256GB Grey", brand: "Samsung", category: "Phones & Tablets" }
  ).type,
  "LIKELY_SAME"
);

assert.equal(
  provider.findCheapestExactMatch(product, demoResults).webshop,
  "Exact Match Demo Store"
);

(async () => {
  const backend = await provider.searchBackend(product, {
    fetchImplementation: async () => ({
      ok: true,
      json: async () => ({ provider: "test-backend", mode: "demo", offers: demoResults })
    })
  });
  assert.equal(backend.provider, "test-backend");
  assert.equal(backend.results.length, 3);
  await assert.rejects(provider.searchBackend(product, {
    fetchImplementation: async () => ({ ok: true, json: async () => ({ offers: "corrupt" }) })
  }), /Invalid backend response/);
  await assert.rejects(provider.searchBackend(product, {
    fetchImplementation: async () => { throw new TypeError("offline fixture"); }
  }), error => error.name === "TypeError");
  await assert.rejects(provider.withTimeout(new Promise(() => {}), 5), error => error.code === "SEARCH_TIMEOUT");
})();

const noIdentifier = buildDemoCatalog({
  name: "Basic wool coat",
  brand: "Example",
  color: "Black",
  price: "€150"
});
assert.equal(noIdentifier.length, 2);
assert.equal(buildDemoCatalog({
  name: "Store-specific shirt",
  brand: "Example",
  sku: "LOCAL-SKU-1",
  price: "€50"
}).length, 2);
assert.equal(
  provider.rankSearchResults({
    name: "Basic wool coat",
    brand: "Example",
    color: "Black"
  }, noIdentifier)[0].matchType,
  "LIKELY_SAME"
);

(async () => {
  global.ComprApi = { search: async () => {
    const error = new Error("The search provider returned no product results");
    error.code = "NO_RESULTS_FROM_PROVIDER";
    throw error;
  } };
  const emptySecure = await provider.searchBackend(product, { secureApi: true, requestId: "request-1" });
  assert.deepEqual(emptySecure.results, []);
  assert.equal(emptySecure.outcome, "NO_RESULTS_FROM_PROVIDER");
  delete global.ComprApi;
  global.ComprDemoCatalog = require("../search/demoCatalog.js");
  global.ComprDemoCatalog.search = async value => buildDemoCatalog(value);
  const first = await provider.findExactProduct(product, { force: true });
  const second = await provider.findExactProduct(product);
  assert.equal(first.cached, false);
  assert.equal(second.cached, true);
  assert.deepEqual(first.summary, { exact: 1, likely: 1, similar: 0, rejected: 1 });
  await assert.rejects(
    provider.withTimeout(new Promise(() => {}), 5),
    /timed out/
  );
  console.log("COMPR Find This Cheaper prototype tests passed");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
