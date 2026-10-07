"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Product = require("../shared/product.js");

test("popup and Compare searches share one normalized Safari product payload", async () => {
  let sent;
  const context = {
    ComprAuth: { getSession: async () => ({ access_token: "test-access" }) },
    ComprRuntimeConfig: { apiBaseUrl: "https://sandbox.example" },
    ComprProduct: Product,
    crypto: { randomUUID: () => "123e4567-e89b-42d3-a456-426614174000" },
    fetch: async (_url, options) => {
      sent = JSON.parse(options.body);
      return { ok: true, json: async () => ({ offers: [] }) };
    },
    URL, JSON, Error, Promise
  };
  vm.createContext(context);
  const source = fs.readFileSync(path.join(__dirname, "..", "shared", "apiClient.js"), "utf8");
  vm.runInContext(`${source}\nglobalThis.api=ComprApi;`, context);
  await context.api.search({
    name: "Sony WH-1000XM5 Zwart", brand: "Merk niet gevonden",
    price: "€ 349,95", currency: "EUR", url: "https://shop.example/sony"
  });
  assert.equal(sent.product.price, 349.95);
  assert.equal(sent.product.brand, "");
  assert.equal(sent.product.url, "https://shop.example/sony");
});
