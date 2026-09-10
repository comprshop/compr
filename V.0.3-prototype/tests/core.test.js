const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  normalizeUrl,
  getProductIdentity,
  sameProduct,
  deduplicateProducts,
  getTrustpilotUrl,
  getSafeWebUrl
} = require("../shared/product.js");
const {
  parsePrice,
  getCategoryPriceInfo
} = require("../compare/price.js");
global.parsePrice = parsePrice;
const {
  getCategories,
  filterAndSortProducts,
  groupProductsByCategory
} = require("../compare/collection.js");

global.document = {
  title: "",
  querySelector: () => null
};
const { getCategory } = require("../detectors/category.js");
global.window = { location: { hostname: "shop.example" } };
global.document.querySelectorAll = () => [];
const { getBrandFromTitle, normalizeBrand, isPlausibleBrand } = require("../detectors/brand.js");
const {
  getSimilarityScore,
  findSimilarProducts,
  parseEuroPrice
} = require("../shared/similarity.js");
const { availabilityFromValue } = require("../detectors/availability.js");
const { normalizeSize, getSizeValues, isUnavailableSizeElement } = require("../detectors/sizes.js");
const {
  getCurrencyForCountry,
  parseAmount,
  detectCurrency,
  convert
} = require("../shared/currency.js");
const { normalizeCurrency, findPriceInText } = require("../detectors/price.js");
const { formatDuration, getDeliveryFromJsonLd, getReturnFromJsonLd, getStorePolicyFallback } = require("../detectors/policies.js");
const { normalizeDiscountCode, extractCodeFromText, describeDiscount, extractDealFromText } = require("../detectors/discountCodes.js");
const {
  cleanColor,
  containsKnownColorName,
  getColorFromProductName
} = require("../detectors/color.js");
const { cleanProductId } = require("../detectors/productId.js");
const { chooseBestProductName } = require("../detectors/productName.js");

assert.equal(
  chooseBestProductName(["740", "New Balance 740 Silver Metallic", "New Balance 740 | Retailer"]),
  "New Balance 740 Silver Metallic"
);

const codedProduct = {
  productCode: " ab-123 ",
  url: "https://shop.example/product?utm_source=test"
};
const sameCodedProduct = {
  sku: "AB-123",
  url: "https://another.example/product"
};
const urlProduct = {
  url: "https://shop.example/item?size=42&utm_campaign=sale#details"
};
const sameUrlProduct = {
  url: "https://shop.example/item?size=42"
};

assert.match(getProductIdentity(codedProduct), /^url:/);
assert.equal(sameProduct(codedProduct, sameCodedProduct), false);
assert.equal(
  sameProduct(
    { productCode: "STYLE-1", gtin: "12345678" },
    { sku: "OTHER-2", gtin: "12345678" }
  ),
  true
);
assert.equal(sameProduct(urlProduct, sameUrlProduct), true);
assert.equal(
  getTrustpilotUrl({ webshop: "www.example.com" }),
  "https://www.trustpilot.com/review/www.example.com"
);
assert.equal(
  getTrustpilotUrl({ webshop: "nike.com" }),
  "https://www.trustpilot.com/review/www.nike.com"
);
assert.equal(
  normalizeUrl(urlProduct.url),
  "https://shop.example/item?size=42"
);
assert.equal(
  deduplicateProducts([
    codedProduct,
    sameCodedProduct,
    urlProduct,
    sameUrlProduct
  ]).length,
  3
);

assert.equal(parsePrice("€ 129,95"), 129.95);
assert.equal(parsePrice("€ 1.299,95"), 1299.95);
assert.equal(parsePrice("$1,299.95"), 1299.95);
assert.equal(parsePrice("1 299,95 CHF"), 1299.95);
assert.equal(parsePrice("Prijs niet gevonden"), null);
assert.deepEqual(
  getCategoryPriceInfo([
    { category: "Shoes", price: "€ 100,00" },
    { category: "Shoes", price: "€ 80,00" },
    { category: "Other", price: "Prijs niet gevonden" }
  ]),
  {
    Shoes: { count: 2, cheapest: 80 },
    Other: { count: 0, cheapest: null }
  }
);

const collection = [
  { name: "Air Runner", brand: "Nike", category: "Shoes", price: "€ 120", savedAt: 2 },
  { name: "Classic Tee", brand: "Adidas", category: "Shirts & Tops", price: "€ 30", savedAt: 1 },
  { name: "City Shoe", brand: "Puma", category: "Shoes", price: "Price not found", savedAt: 3 }
];

assert.deepEqual(getCategories(collection), ["Shirts & Tops", "Shoes"]);
assert.deepEqual(
  filterAndSortProducts(collection, { query: "nike", sort: "newest" }).map(product => product.name),
  ["Air Runner"]
);
assert.deepEqual(
  filterAndSortProducts(collection, { category: "Shoes", sort: "price-low" }).map(product => product.name),
  ["Air Runner", "City Shoe"]
);
assert.equal(groupProductsByCategory(collection).Shoes.length, 2);
assert.equal(getCategory(null, "Apple iPhone 17 Pro 256GB"), "Phones & Tablets");
assert.equal(getCategory(null, "Samsung Galaxy A57 256GB Grijs 5G"), "Phones & Tablets");
assert.equal(getCategory(null, "Samsung Galaxy S26 Ultra 512GB"), "Phones & Tablets");
assert.equal(getCategory(null, "Samsung 55 inch OLED Smart TV"), "TV & Audio");
assert.equal(getCategory(null, "Sony WH-1000XM5 Zwart koptelefoon"), "TV & Audio");
assert.equal(getCategory(null, "JBL draadloze oordopjes"), "TV & Audio");
assert.equal(getCategory(null, "JBL Tune 730BT Zwart"), "TV & Audio");
assert.equal(getCategory(null, "Lenovo Yoga laptop"), "Computers");
assert.equal(getCategory(null, "Lenovo IdeaPad Slim 5 16IRL8"), "Computers");
assert.equal(getCategory(null, "ASUS Vivobook 15 OLED"), "Computers");
assert.equal(getBrandFromTitle("Lenovo IdeaPad Slim 5 laptop"), "Lenovo");
assert.equal(getBrandFromTitle("ASUS Vivobook 15 OLED"), "ASUS");
assert.equal(normalizeBrand("Merk: HP"), "HP");
assert.equal(isPlausibleBrand("Shop by brand"), false);
assert.equal(getCategory(null, "Nike Air Max sneaker"), "Shoes");
assert.equal(getCategory(null, "adidas Samba OG Schoenen"), "Shoes");
assert.equal(cleanColor("Core Black / Cloud White / Gum5"), "Core Black / Cloud White / Gum5");
assert.equal(cleanColor("Kleur niet gevonden"), null);
assert.equal(cleanColor("Color not found"), null);
assert.equal(containsKnownColorName("Core Black / Cloud White / Gum5"), true);
assert.equal(containsKnownColorName("OzweegoTiroAdilette"), false);
assert.equal(getColorFromProductName("Samba OG Core Black"), "black");
assert.equal(cleanProductId("B75807"), "B75807");
assert.equal(getCategory(null, "Oak dining table 180 cm"), "Furniture");
assert.equal(getCategory(null, "Cordless drill 18V with battery"), "Tools & DIY");
assert.equal(getCategory(null, "Hydrating face serum 30 ml"), "Beauty & Personal Care");
assert.equal(getCategory(null, "Adjustable dumbbell set 20 kg"), "Sports & Fitness");
assert.equal(getCategory(null, "Premium orthopedic dog bed"), "Pet Supplies");

const currentShoe = {
  name: "Nike Air Max 90 White",
  brand: "Nike",
  category: "Shoes",
  color: "White",
  productCode: "CURRENT-90",
  url: "https://shop.example/current"
};
const similarShoe = {
  name: "Nike Air Max 95 White",
  brand: "Nike",
  category: "Shoes",
  color: "White",
  productCode: "SIMILAR-95",
  url: "https://shop.example/similar"
};
const unrelatedLaptop = {
  name: "Lenovo Yoga Laptop",
  brand: "Lenovo",
  category: "Computers",
  productCode: "LAPTOP-1",
  url: "https://shop.example/laptop"
};

assert.ok(getSimilarityScore(currentShoe, similarShoe) >= 0.55);
assert.equal(findSimilarProducts(currentShoe, [similarShoe, unrelatedLaptop]).length, 1);
assert.equal(parseEuroPrice("€ 1.299,95"), 1299.95);
assert.equal(parseEuroPrice("$ 129.95"), null);
assert.equal(availabilityFromValue("https://schema.org/InStock"), "in_stock");
assert.equal(availabilityFromValue("OutOfStock"), "out_of_stock");
assert.equal(isUnavailableSizeElement({
  disabled: true,
  className: "size-option",
  textContent: "3XL",
  getAttribute: () => null
}), true);
assert.equal(isUnavailableSizeElement({
  disabled: false,
  className: "size-option",
  textContent: "XL",
  getAttribute: () => null
}), false);
assert.equal(normalizeSize("Selecteer maat: XL"), "XL");
assert.deepEqual(getSizeValues("Selecteer je maat L"), ["L"]);
assert.deepEqual(getSizeValues("Size: EU 42 - unavailable"), ["EU 42"]);
assert.deepEqual(getSizeValues("Selecteer maat"), []);
assert.equal(isUnavailableSizeElement({
  disabled: false,
  className: "swatch unselectable",
  textContent: "M",
  getAttribute: () => null
}), true);
assert.equal(getCurrencyForCountry("GB"), "GBP");
assert.equal(getCurrencyForCountry("NL"), "EUR");
assert.equal(parseAmount("$1,299.95"), 1299.95);
assert.equal(parseAmount("€ 1.299,95"), 1299.95);
assert.equal(detectCurrency("£ 120"), "GBP");
assert.equal(detectCurrency("1 299 zł"), "PLN");
assert.equal(detectCurrency("12 999 Kč"), "CZK");
assert.equal(convert(120, "USD", "GBP", { USD: 1.2, GBP: 0.8 }), 80);
assert.equal(getSafeWebUrl("javascript:alert(1)"), "");
assert.equal(getSafeWebUrl("https://shop.example/item"), "https://shop.example/item");
assert.equal(getSafeWebUrl("http://shop.example/item"), "");
assert.equal(getSafeWebUrl("http://localhost:8787/item"), "");
assert.equal(getSafeWebUrl("data:text/html,unsafe"), "");
assert.equal(getSafeWebUrl("file:///tmp/unsafe"), "");
assert.equal(normalizeCurrency(null, "$ 1,299.95"), "USD");
assert.equal(normalizeCurrency(null, "1 299,95 CHF"), "CHF");
assert.equal(findPriceInText("Now only £1,249.99 including VAT"), "£1,249.99");
assert.equal(findPriceInText("Prijs 1.299,95 EUR incl. btw"), "1.299,95 EUR");
assert.equal(formatDuration("P3D"), "3 days");
assert.equal(getDeliveryFromJsonLd({ offers: { shippingDetails: {
  deliveryTime: { transitTime: { minValue: 2, maxValue: 4 } }
} } }), "2 days – 4 days");
assert.equal(getReturnFromJsonLd({ offers: {
  hasMerchantReturnPolicy: { merchantReturnDays: 30 }
} }), "30-day returns");
assert.equal(
  getStorePolicyFallback("www.coolblue.nl", "Op voorraad", "delivery"),
  "Op voorraad · bezorgmoment bij afrekenen"
);
assert.equal(
  getStorePolicyFallback("www.nike.com", "", "return"),
  "Retourneren binnen 30 dagen (uitzonderingen mogelijk)"
);
assert.equal(extractCodeFromText("Gebruik kortingscode SUMMER20 bij het afrekenen"), "SUMMER20");
assert.equal(extractCodeFromText("Gebruik kortingscode WAARMEE bij het afrekenen"), null);
assert.equal(extractCodeFromText("Kortingscode INVOEREN"), null);

const popupSource = fs.readFileSync(path.join(__dirname, "..", "popup.js"), "utf8");
const popupHtml = fs.readFileSync(path.join(__dirname, "..", "popup.html"), "utf8");
const apiClientSource = fs.readFileSync(path.join(__dirname, "..", "shared", "apiClient.js"), "utf8");
const authSource = fs.readFileSync(path.join(__dirname, "..", "shared", "auth.js"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "manifest.json"), "utf8"));
const receiverSource = fs.readFileSync(path.join(__dirname, "..", "auth-receiver.js"), "utf8");
const searchProviderSource = fs.readFileSync(path.join(__dirname, "..", "search", "searchProvider.js"), "utf8");
assert.equal(/\bhandleSave\s*\(/.test(popupSource), false, "popup must not call the removed handleSave function");
assert.match(searchProviderSource, /useBackend\s*&&\s*!secureSession/,
  "browser searches must require authentication instead of showing demo offers");
assert.match(popupHtml, /id="accountDelete"/, "signed-in users must have an account deletion control");
assert.match(popupSource, /typed\s*!==\s*"DELETE"/, "account deletion must require an exact typed confirmation");
const accountDeletionFlow = popupSource.slice(popupSource.indexOf("await ComprApi.deleteAccount()"));
assert.ok(accountDeletionFlow.indexOf("await ComprApi.deleteAccount()") < accountDeletionFlow.indexOf("await ComprBrowser.storage.local.clear()"),
  "local data may be cleared only after server account deletion succeeds");
assert.match(apiClientSource, /method:\s*"DELETE"[\s\S]*confirmation:\s*"DELETE"/,
  "account deletion must use the protected DELETE endpoint and confirmation value");
assert.match(authSource, /logout\?scope=global/, "normal sign-out must revoke all refresh sessions");
assert.equal(manifest.content_security_policy.extension_pages, "script-src 'self'; object-src 'self'");
assert.doesNotMatch(popupSource, /\/api\/coupons/, "product recognition must not transmit a URL to the coupon backend");
assert.doesNotMatch(receiverSource, /error\.code/, "login UI must not expose internal error codes");
const compareSource = fs.readFileSync(path.join(__dirname, "..", "compare.js"), "utf8");
assert.match(compareSource, /append\(createEmptyCollectionState\(\), createAddProductCard\(\)\)/, "empty Compare state must always offer Add item");
assert.match(compareSource, /createCards\(visible, priceInfo, true\)/, "populated Compare state must always offer Add item");
assert.equal(extractCodeFromText("Dit product heet LAPTOP123"), null);
assert.equal(normalizeDiscountCode("discount"), null);
assert.equal(normalizeDiscountCode("WELCOME"), "WELCOME");
assert.equal(normalizeDiscountCode("THISCOUPONCODEISFARTOOLONG123"), null);
assert.equal(extractCodeFromText("BESTEL vandaag nog"), null);
assert.equal(extractCodeFromText("ACTIE SHOP VOOR korting"), null);
assert.equal(describeDiscount("Gebruik SAVE10 voor 10% korting"), "10% off");
assert.equal(describeDiscount("Use code WELCOME at checkout"), "Possible discount code");
assert.equal(extractDealFromText("20% korting op geselecteerde items"), "20% korting op geselecteerde items");
assert.equal(extractDealFromText("Gebruik kortingscode SAVE10 voor 10% korting"), null);

const availabilityProducts = [
  { name: "Shirt M", availableSizes: ["M", "L"], availabilityStatus: "in_stock" },
  { name: "Shirt XL", availableSizes: ["XL"], availabilityStatus: "in_stock" },
  { name: "Headphones", availableSizes: [], availabilityStatus: "out_of_stock" }
];
assert.deepEqual(
  filterAndSortProducts(availabilityProducts, { size: "m" }).map(product => product.name),
  ["Shirt M"]
);
assert.deepEqual(
  filterAndSortProducts(availabilityProducts, { availableOnly: true }).map(product => product.name),
  ["Shirt M", "Shirt XL"]
);

console.log("COMPR core tests passed");
