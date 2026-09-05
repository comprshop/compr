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

test("multiple Product snippets are not promoted to the main product", () => {
  const carousel = { "@graph": [product, { ...product, name: "Nike Air Max 95", sku: "HF2222-100" }] };
  assert.equal(Eligibility.assessPage(page({ h1: "Nike products", scripts: [carousel] }),
    "https://shop.example/deals", helpers).eligible, false);
});

test("product detail without JSON-LD needs independent price metadata and purchase control", () => {
  const result = Eligibility.assessPage(page({ h1: "Acme Model X200 Headphones", productMeta: true, buy: true }),
    "https://shop.example/product/acme-x200", helpers);
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
