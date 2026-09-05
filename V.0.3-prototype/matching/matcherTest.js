const { compareProducts } = require("./productMatcher.js");

const testProductA = {
  name: "Nike P-6000",
  brand: "Nike",
  category: "Shoes",
  color: "Wit/Metallic Silver/Flat Silver/Zwart",
  productCode: "CD6404-105",
  sku: null,
  mpn: null,
  gtin: null
};

const testProductB = {
  name: "Nike P-6000",
  brand: "Nike",
  category: "Shoes",
  color: "White/Metallic Silver/Black",
  productCode: "CD6404-105",
  sku: null,
  mpn: null,
  gtin: null
};

const testProductC = {
  name: "Nike P-6000",
  brand: "Nike",
  category: "Shoes",
  color: "White/Red",
  productCode: "CD6404-101",
  sku: null,
  mpn: null,
  gtin: null
};

console.log(
  "COMPR TEST 1 — same product:",
  compareProducts(testProductA, testProductB)
);

console.log(
  "COMPR TEST 2 — different variant:",
  compareProducts(testProductA, testProductC)
);
