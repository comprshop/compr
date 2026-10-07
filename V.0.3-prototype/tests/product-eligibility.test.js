"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Eligibility = require("../shared/productEligibility.js");
const Sizes = require("../detectors/sizes.js");

function element(value = {}) {
  return {
    innerText: value.innerText || "",
    value: value.value || "",
    content: value.content || "",
    textContent: value.textContent || "",
    getAttribute(name) { return value[name] || null; }
  };
}

function page({ title = "", h1 = "", scripts = [], productMeta = false, buy = false } = {}) {
  return {
    title,
    querySelector(selector) {
      if (selector === "h1") return h1 ? element({ innerText: h1 }) : null;
      if (selector.includes('meta[property="product:price:amount"]')) return productMeta ? element({ content: "99.95" }) : null;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === 'script[type="application/ld+json"]') return scripts.map(value => element({ textContent: JSON.stringify(value) }));
      if (selector.includes("button")) return buy ? [element({ innerText: "Add to cart" })] : [];
      return [];
    }
  };
}

const product = { "@type": "Product", name: "Nike Air Max 90", category: "Shoes", sku: "HF1234-100",
  offers: { "@type": "Offer", price: "129.99", priceCurrency: "EUR" } };
const helpers = {
  getPrice(value) { return value?.offers?.price ? `${value.offers.price} EUR` : "99.95 EUR"; },
  getProductId(value) { return { sku: value?.sku || null }; }
};

test("Bing results with product-like snippets are rejected", () => {
  assert.equal(Eligibility.assessPage(page({ title: "coolblue.nl - Bing", h1: "de305d54-75b4-431b-adb2-eb6b9e546014", scripts: [product] }),
    "https://www.bing.com/search?q=coolblue.nl", helpers).eligible, false);
});

test("Google results are rejected", () => {
  assert.equal(Eligibility.assessPage(page({ h1: "Shopping results", scripts: [product] }),
    "https://www.google.com/search?q=headphones", helpers).eligible, false);
});

test("category and collection pages are rejected", () => {
  for (const url of ["https://shop.example/category/shoes", "https://shop.example/collections/sale", "https://shop.example/search?q=nike"])
    assert.equal(Eligibility.assessPage(page({ h1: "Nike shoes", scripts: [product] }), url, helpers).eligible, false, url);
});

test("ordinary non-shopping pages and UUID titles are rejected", () => {
  assert.equal(Eligibility.assessPage(page({ title: "News", h1: "Today's headlines" }), "https://news.example/article", helpers).eligible, false);
  assert.equal(Eligibility.assessPage(page({ title: "de305d54-75b4-431b-adb2-eb6b9e546014", h1: "de305d54-75b4-431b-adb2-eb6b9e546014", productMeta: true, buy: true }),
    "https://shop.example/item/123", helpers).eligible, false);
});

test("one main Product JSON-LD object with name and concrete Offer is accepted", () => {
  const result = Eligibility.assessPage(page({ title: "Nike Air Max 90", h1: "Nike Air Max 90", scripts: [product] }),
    "https://shop.example/product/nike-air-max-90", helpers);
  assert.equal(result.eligible, true);
  assert.deepEqual(result.jsonProduct, product);
  assert.equal(result.isApparel, true);
});

test("one coherent ProductGroup is reduced to its shared purchasable style without a size-specific GTIN", () => {
  const group = { "@type": "ProductGroup", name: "Nike P-6000 schoenen", brand: { "@type": "Brand", name: "Nike" }, hasVariant: [
    { "@type": "Product", name: "Nike P-6000 Size 4", mpn: "CN0149-001", color: "Silver", gtin: "00193153783231", offers: { "@type": "Offer", price: 119.99, priceCurrency: "EUR" } },
    { "@type": "Product", name: "Nike P-6000 Size 5", mpn: "CN0149-001", color: "Silver", gtin: "00193153783255", offers: { "@type": "Offer", price: 119.99, priceCurrency: "EUR" } }
  ] };
  const result = Eligibility.assessPage(page({ h1: "Nike P-6000", scripts: [[group]] }),
    "https://www.nike.com/nl/t/p-6000/CN0149-001", helpers);
  assert.equal(result.eligible, true);
  assert.equal(result.jsonProduct.name, "Nike P-6000 schoenen");
  assert.equal(result.jsonProduct.mpn, "CN0149-001");
  assert.equal(result.jsonProduct.gtin, null);
});

test("mixed ProductGroup styles are not treated as one product", () => {
  const group = { "@type": "ProductGroup", name: "Several shoes", hasVariant: [
    { "@type": "Product", mpn: "STYLE-001", offers: { price: 100, priceCurrency: "EUR" } },
    { "@type": "Product", mpn: "STYLE-002", offers: { price: 100, priceCurrency: "EUR" } }
  ] };
  assert.equal(Eligibility.selectMainJsonProduct(page({ scripts: [[group]] })), null);
});

test("a ProductGroup selects the one variant whose URL matches the current product page", () => {
  const group = { "@type": "ProductGroup", brand: { "@type": "Brand", name: "Samsung" }, hasVariant: [
    { "@type": "Product", name: "Samsung Galaxy S25 128GB Blue", sku: "1877857",
      url: "/product/galaxy-s25-blue", offers: { price: 599, priceCurrency: "EUR" } },
    { "@type": "Product", name: "Samsung Galaxy S25 128GB Silver", sku: "1877860",
      url: "/product/galaxy-s25-silver", offers: { price: 599, priceCurrency: "EUR" } }
  ] };
  const result = Eligibility.assessPage(page({ h1: "Samsung Galaxy S25 128GB Silver", scripts: [[group]] }),
    "https://shop.example/product/galaxy-s25-silver", helpers);
  assert.equal(result.eligible, true);
  assert.equal(result.jsonProduct.sku, "1877860");
  assert.equal(result.jsonProduct.name, "Samsung Galaxy S25 128GB Silver");
});

test("a commerce BuyAction may wrap the current ProductGroup", () => {
  const group = { "@type": "ProductGroup", brand: { "@type": "Brand", name: "Samsung" }, hasVariant: [
    { "@type": "Product", name: "Samsung Galaxy S25 128GB Blue", sku: "1877857",
      url: "/product/galaxy-s25-blue", offers: { price: 599, priceCurrency: "EUR" } },
    { "@type": "Product", name: "Samsung Galaxy S25 128GB Silver", sku: "1877860",
      url: "/product/galaxy-s25-silver", offers: { price: 599, priceCurrency: "EUR" } }
  ] };
  const result = Eligibility.assessPage(page({ h1: "Samsung Galaxy S25 128GB Silver",
    scripts: [{ "@type": "BuyAction", object: group }] }),
  "https://shop.example/product/galaxy-s25-silver", helpers);
  assert.equal(result.eligible, true);
  assert.equal(result.jsonProduct.sku, "1877860");
});

test("size variants sharing one product URL are reduced without a size-specific identifier", () => {
  const group = { "@type": "ProductGroup", name: "adidas Samba OG", brand: { "@type": "Brand", name: "Adidas" }, hasVariant: [
    { "@type": "Product", name: "Samba OG", sku: "SAMBA-SIZE-36", url: "https://shop.example/p/samba?size=36",
      color: "Black", offers: { price: 120, priceCurrency: "EUR" } },
    { "@type": "Product", name: "Samba OG", sku: "SAMBA-SIZE-37", url: "https://shop.example/p/samba?size=37",
      color: "Black", offers: { price: 120, priceCurrency: "EUR" } }
  ] };
  const result = Eligibility.assessPage(page({ h1: "adidas Samba OG", scripts: [[group]] }),
    "https://shop.example/p/samba", helpers);
  assert.equal(result.eligible, true);
  assert.equal(result.jsonProduct.name, "adidas Samba OG");
  assert.equal(result.jsonProduct.sku, null);
  assert.equal(result.jsonProduct.gtin, null);
});

test("multiple Product snippets are not promoted to the main product", () => {
  const carousel = { "@graph": [product, { ...product, name: "Nike Air Max 95", sku: "HF2222-100" }] };
  assert.equal(Eligibility.assessPage(page({ h1: "Nike products", scripts: [carousel] }),
    "https://shop.example/deals", helpers).eligible, false);
});

test("a canonical ProductGroup with its own direct offer is the current product", () => {
  const group = { "@type": "ProductGroup", name: "JBL Tune 730BT", url: "https://shop.example/product/jbl-tune-730bt",
    brand: { "@type": "Brand", name: "JBL" }, sku: "171302327", gtin13: "1200130029837",
    offers: { "@type": "Offer", price: 76.81, priceCurrency: "EUR" }, hasVariant: [
      { "@type": "Product", name: "JBL Tune 730BT Zwart", sku: "1891630", color: "Zwart",
        url: "https://shop.example/product/jbl-tune-730bt-zwart", offers: { price: 63.99, priceCurrency: "EUR" } },
      { "@type": "Product", name: "JBL Tune 730BT Wit", sku: "1891631", color: "Wit",
        url: "https://shop.example/product/jbl-tune-730bt-wit", offers: { price: 64.99, priceCurrency: "EUR" } }
    ] };
  const result = Eligibility.assessPage(page({ h1: group.name, scripts: [{ "@type": "BuyAction", object: group }] }),
    group.url, helpers);
  assert.equal(result.eligible, true);
  assert.equal(result.jsonProduct.name, "JBL Tune 730BT");
  assert.equal(result.jsonProduct.offers.price, 76.81);
  assert.equal(result.jsonProduct.gtin13, "1200130029837");
});

test("product detail without JSON-LD needs independent price metadata and purchase control", () => {
  const result = Eligibility.assessPage(page({ h1: "Acme Model X200 Headphones", productMeta: true, buy: true }),
    "https://shop.example/product/acme-x200", helpers);
  assert.equal(result.eligible, true);
  assert.equal(result.isApparel, false);
});

test("a visible retailer style code can prove a product page without price metadata", () => {
  const nikeLikeHelpers = {
    getPrice() { return "€ 119,99"; },
    getProductId() { return { retailerSku: "IX6221-101" }; }
  };
  const result = Eligibility.assessPage(page({ h1: "Nike P-6000", buy: true }),
    "https://www.nike.com/nl/t/p-6000-schoenen-QkH5XrfS", nikeLikeHelpers);
  assert.equal(result.eligible, true);
  assert.equal(result.isApparel, false);
});

test("clothing pages expose explicit variant sizes but non-clothing M/L text is gated out", () => {
  const clothing = Eligibility.assessPage(page({ h1: product.name, scripts: [product] }), "https://shop.example/product/shoe", helpers);
  const electronics = Eligibility.assessPage(page({ h1: "Acme Model X200 Headphones", productMeta: true, buy: true }),
    "https://shop.example/product/headphones", helpers);
  assert.equal(clothing.isApparel, true);
  assert.equal(electronics.isApparel, false);
  const previousDocument = global.document;
  try {
    const sizeButtons = ["M", "L"].map(text => ({ innerText: text, textContent: text, className: "", disabled: false,
      getAttribute() { return null; } }));
    global.document = {
      querySelectorAll(selector) {
        if (selector === "select") return [];
        if (selector === ".size-selector button") return sizeButtons;
        return [];
      }
    };
    assert.deepEqual(Sizes.getSizes(null), ["M", "L"]);
    global.document = { querySelectorAll() { return []; } };
    assert.deepEqual(Sizes.getSizes(null), []);
  } finally {
    global.document = previousDocument;
  }
});

function redirectGroup() {
  return { '@type': 'ProductGroup', name: 'Sony WH-CH520 Black', url: 'https://shop.example/p/redirect', gtin13: '4548736142374',
    offers: [{ '@type': 'Offer', price: 30.99, itemCondition: 'https://schema.org/NewCondition', url: 'https://shop.example/p/redirect' },
      { '@type': 'Offer', price: 27.89, itemCondition: 'https://schema.org/RefurbishedCondition', url: 'https://shop.example/p/redirect' }],
    hasVariant: ['Black', 'White'].map((color, i) => ({ '@type': 'Product', name: `Sony WH-CH520 ${color}`, color,
      gtin13: i ? '4548736142817' : '4548736142374', url: `https://shop.example/p/${color}`, offers: { price: 30.99 } })) };
}
test('redirect selects unique EAN and explicitly selected new offer, never cheaper refurbished', () => {
  const group = redirectGroup();
  const selected = Eligibility.productFromVariantGroup(group, group.url, { price: 30.99, condition: 'https://schema.org/NewCondition' });
  assert.equal(selected.color, 'Black');
  assert.equal(selected.offers.price, 30.99);
  assert.equal(Eligibility.productFromVariantGroup(group, group.url), null);
  assert.equal(Eligibility.productFromVariantGroup(group, group.url, { price: 27.89, condition: 'https://schema.org/RefurbishedCondition' }), null);
});
test('multiple plausible offers and variants fail closed', () => {
  const group = redirectGroup();
  group.offers.push({ ...group.offers[0] });
  assert.equal(Eligibility.productFromVariantGroup(group, group.url, { price: 30.99, condition: 'https://schema.org/NewCondition' }), null);
  group.hasVariant[1].gtin13 = group.gtin13;
  assert.equal(Eligibility.productFromVariantGroup(group, group.url), null);
});
test('variant URL selection ignores tracking and fragments, rejects refurbished single offer', () => {
  const group = redirectGroup();
  const selected = Eligibility.productFromVariantGroup(group, 'https://shop.example/p/Black?utm_source=test#details');
  assert.equal(selected.color, 'Black');
  group.hasVariant[0].offers.itemCondition = 'https://schema.org/RefurbishedCondition';
  assert.equal(Eligibility.productFromVariantGroup(group, 'https://shop.example/p/Black'), null);
});
test('German purchase CTA supplies only supplemental purchase evidence', () => {
  const doc = page({ h1: 'Sony WH-CH520 Black', productMeta: true });
  const original = doc.querySelectorAll;
  doc.querySelectorAll = selector => selector.includes('button') ? [element({ innerText: 'In den Warenkorb' })] : original(selector);
  assert.equal(Eligibility.assessPage(doc, 'https://shop.example/p/sony', helpers).eligible, true);
  assert.equal(Eligibility.assessPage(page({ buy: true }), 'https://shop.example/p/sony', helpers).eligible, false);
});
test('Expert JBL detection remains eligible', () => {
  const jbl = { '@type': 'Product', name: 'JBL Tune 730BT Wit', offers: { price: 64.95, priceCurrency: 'EUR' } };
  assert.equal(Eligibility.assessPage(page({ scripts: [jbl] }), 'https://expert.nl/p/jbl', helpers).eligible, true);
});
test('unresolved ProductGroup cannot bypass ambiguity through metadata and purchase CTA', () => {
  const group = redirectGroup();
  assert.equal(Eligibility.assessPage(page({ h1: group.name, scripts: [group], productMeta: true, buy: true }), group.url, helpers).eligible, false);
});
