"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadExtractionHelpers({ href, baseURI = href, values = {} }) {
  const source = fs.readFileSync(path.join(__dirname, "..", "content.js"), "utf8");
  const helperSource = source.slice(0, source.indexOf("async function getProductInfo"));
  const nodes = new Map(Object.entries(values));
  const document = { baseURI, querySelector: selector => nodes.get(selector) || null };
  const context = { URL, document, window: { location: new URL(href) } };
  vm.createContext(context);
  vm.runInContext(`${helperSource}\nglobalThis.helpers={getProductImage,getCanonicalProductUrl};`, context);
  return context.helpers;
}

test("Safari extraction resolves a relative og:image from the real product page", () => {
  const helpers = loadExtractionHelpers({
    href: "https://shop.example/products/headphones",
    values: { 'meta[property="og:image"]': { content: "/media/headphones.jpg" } }
  });
  assert.equal(helpers.getProductImage(null), "https://shop.example/media/headphones.jpg");
});

test("Safari extraction resolves a protocol-relative structured product image", () => {
  const helpers = loadExtractionHelpers({ href: "https://shop.example/p/shoe" });
  assert.equal(helpers.getProductImage({ image: "//cdn.shop.example/shoe.webp" }), "https://cdn.shop.example/shoe.webp");
});

test("Safari extraction accepts only a same-host HTTPS canonical URL", () => {
  const sameHost = loadExtractionHelpers({
    href: "https://shop.example/p/item?tracking=1",
    values: { 'link[rel="canonical"]': { href: "https://shop.example/p/item" } }
  });
  assert.equal(sameHost.getCanonicalProductUrl(), "https://shop.example/p/item");
  const foreignHost = loadExtractionHelpers({
    href: "https://shop.example/p/item",
    values: { 'link[rel="canonical"]': { href: "https://tracking.example/item" } }
  });
  assert.equal(foreignHost.getCanonicalProductUrl(), "https://shop.example/p/item");
});
