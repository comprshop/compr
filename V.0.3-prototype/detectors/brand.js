var COMPR_KNOWN_BRANDS = [
  "Stone Island", "Tommy Hilfiger", "Calvin Klein", "The North Face", "New Balance",
  "Ralph Lauren", "Under Armour", "Leen Bakker", "Riviera Maison", "SteelSeries",
  "Hewlett Packard", "Apple", "Samsung", "Lenovo", "HP", "Dell", "ASUS", "Acer",
  "MSI", "Microsoft", "Google", "Huawei", "Xiaomi", "OnePlus", "Honor", "Medion",
  "Toshiba", "Fujitsu", "Framework", "Gigabyte", "Razer", "Logitech", "Corsair",
  "Intel", "AMD", "Sony", "LG", "Philips", "JBL", "Bose", "Nintendo", "Canon",
  "Nikon", "Dyson", "TP-Link", "IKEA", "JYSK", "vidaXL", "Kwantum", "Goossens",
  "Westwing", "Zuiver", "WOOOD", "HAY", "Nike", "Adidas", "Lululemon", "Puma",
  "Carhartt", "Patagonia"
].sort((a, b) => b.length - a.length);

var COMPR_GENERIC_BRAND_TEXT = /^(brand|brands|merk|merken|manufacturer|fabrikant|vendor|shop by brand|bekijk alle merken|all brands|product)$/i;

function isPlausibleBrand(value) {
  const brand = String(value || "").trim();
  if (brand.length < 2 || brand.length > 40 || COMPR_GENERIC_BRAND_TEXT.test(brand)) return false;
  if (/\n|\r|[<>]|https?:|\b(add to cart|winkelwagen|price|prijs|sale|reviews?)\b/i.test(brand)) return false;
  if (brand.split(/\s+/).length > 5 || /[.!?]$/.test(brand)) return false;
  return /[a-z]/i.test(brand);
}

function getBrandFromTitle(productName) {
  const name = String(productName || "");
  for (const brand of COMPR_KNOWN_BRANDS) {
    const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`, "i").test(name)) return brand;
  }
  return null;
}

function normalizeBrand(value) {
  if (typeof value !== "string") return null;
  let brand = value.replace(/\s+/g, " ").trim();
  brand = brand.replace(/^(brand|merk|manufacturer|fabrikant)\s*[:\-]\s*/i, "").trim();
  if (!isPlausibleBrand(brand)) return null;
  const known = getBrandFromTitle(brand);
  return known && brand.toLowerCase() === known.toLowerCase() ? known : brand;
}

function getBrandFromJsonLd(product) {
  if (!product) return null;
  for (const candidate of [product.brand, product.manufacturer, product.vendor]) {
    const value = typeof candidate === "string" ? candidate : candidate?.name;
    const brand = normalizeBrand(String(value || ""));
    if (brand) return brand;
  }
  return null;
}

function getBrandFromMeta() {
  const selectors = ['meta[property="product:brand"]', 'meta[name="brand"]',
    'meta[property="og:brand"]', 'meta[name="manufacturer"]'];
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    const brand = normalizeBrand(element?.content || element?.getAttribute("value") || "");
    if (brand) return brand;
  }
  return null;
}

function getBrandFromVisiblePage() {
  const selectors = ['[itemprop="brand"]', '[itemprop="manufacturer"]',
    '[data-testid*="brand" i]', '[class*="product-brand" i]', '[id*="product-brand" i]'];
  for (const selector of selectors) {
    for (const element of document.querySelectorAll(selector)) {
      const brand = normalizeBrand(element.getAttribute?.("content") || element.textContent || "");
      if (brand) return brand;
    }
  }
  return null;
}

function getBrandFromHostname() {
  const hostname = window.location.hostname.replace(/^www\./, "").toLowerCase();
  const domains = {
    "apple.com": "Apple", "samsung.com": "Samsung", "lenovo.com": "Lenovo",
    "dell.com": "Dell", "asus.com": "ASUS", "acer.com": "Acer", "hp.com": "HP",
    "microsoft.com": "Microsoft", "sony.com": "Sony", "philips.com": "Philips",
    "ikea.com": "IKEA", "jysk.nl": "JYSK", "nike.com": "Nike", "zara.com": "Zara",
    "hm.com": "H&M", "adidas.nl": "Adidas", "adidas.com": "Adidas", "uniqlo.com": "Uniqlo"
  };
  for (const [domain, brand] of Object.entries(domains)) {
    if (hostname === domain || hostname.endsWith(`.${domain}`)) return brand;
  }
  return null;
}

function getBrand(jsonProduct, productName = "") {
  return getBrandFromJsonLd(jsonProduct) || getBrandFromMeta() || getBrandFromTitle(productName) ||
    getBrandFromVisiblePage() || getBrandFromHostname() || null;
}

if (typeof module !== "undefined") {
  module.exports = { getBrand, getBrandFromTitle, normalizeBrand, isPlausibleBrand };
}
