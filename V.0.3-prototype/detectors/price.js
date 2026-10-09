var PRICE_CURRENCIES = {
  "€": "EUR", "$": "USD", "£": "GBP", "¥": "JPY", "₣": "CHF",
  "kr": "SEK", "zł": "PLN", "Kč": "CZK", "Ft": "HUF", "lei": "RON"
};

function normalizeCurrency(currency, value = "") {
  const explicit = String(currency || "").trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(explicit)) return explicit;
  const text = String(value || "");
  const code = text.toUpperCase().match(/\b(EUR|USD|GBP|JPY|CHF|CAD|AUD|NZD|PLN|SEK|NOK|DKK|CZK|HUF|RON)\b/)?.[1];
  if (code) return code;
  return Object.entries(PRICE_CURRENCIES).find(([symbol]) => text.includes(symbol))?.[1] || null;
}

function formatPrice(value, currency) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const cleanValue = String(value).trim();
  if (typeof ComprLocaleParsing !== "undefined" && ComprLocaleParsing.parseAmount(cleanValue) === null) return null;

  if (normalizeCurrency(null, cleanValue)) {
    return cleanValue;
  }

  const normalizedCurrency = normalizeCurrency(currency);
  return normalizedCurrency ? `${cleanValue} ${normalizedCurrency}` : cleanValue;
}

function getPriceFromJsonLd(product) {
  if (!product?.offers) return null;

  const offers = Array.isArray(product.offers)
    ? product.offers
    : [product.offers];

  for (const offer of offers) {
    if (String(offer?.["@type"] || "").includes("AggregateOffer")) continue;
    const price = offer?.price;

    if (price !== undefined && price !== null) {
      return formatPrice(
        price,
        offer?.priceCurrency
      );
    }
  }

  return null;
}

function getPriceFromMeta() {
  const detectedCurrency =
    document.querySelector(
      'meta[property="product:price:currency"], meta[property="og:price:currency"], meta[itemprop="priceCurrency"]'
    )?.content || null;
  const selectors = [
    'meta[property="product:price:amount"]',
    'meta[property="og:price:amount"]',
    'meta[name="price"]',
    'meta[itemprop="price"]'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);

    const value =
      element?.content ||
      element?.getAttribute("value");

    if (value) {
      return formatPrice(value, detectedCurrency);
    }
  }

  return null;
}

function getPriceFromDataElement() {
  const dataElements = document.querySelectorAll(
    'data[value], data[data-currency][value]'
  );

  for (const element of dataElements) {
    const value = element.getAttribute("value");

    if (!value) continue;

    const number = typeof ComprLocaleParsing !== "undefined" ? ComprLocaleParsing.parseAmount(value) : Number(value);

    if (number === null || Number.isNaN(number)) continue;
    if (number < 1 || number > 10000) continue;

    const currency =
      element.getAttribute("data-currency") ||
      null;

    return formatPrice(value, currency);
  }

  return null;
}

function getPriceFromItemprop() {
  const element = document.querySelector('[itemprop="price"]');

  if (!element) return null;

  const value =
    element.getAttribute("content") ||
    element.getAttribute("value") ||
    element.textContent;

  if (!value) return null;

  const currency =
    document.querySelector('[itemprop="priceCurrency"]')?.content ||
    document.querySelector('[itemprop="priceCurrency"]')?.textContent ||
    "EUR";

  return formatPrice(value.trim(), currency.trim());
}

function getPriceFromDescription() {
  const description =
    document.querySelector('meta[name="description"]')
      ?.content || "";

  const match = findPriceInText(description);

  return match;
}

function findPriceInText(text) {
  const number = String.raw`(?:\d{1,3}(?:[.,\s]\d{3})+(?:[.,]\s*\d{2})?|\d+(?:[.,]\s*\d{2})?)`;
  const prefix = new RegExp(String.raw`(?:€|\$|£|¥|₣|EUR|USD|GBP|JPY|CHF|CAD|AUD|NZD|PLN|SEK|NOK|DKK|CZK|HUF|RON)\s*${number}`, "i");
  const suffix = new RegExp(String.raw`${number}\s*(?:€|\$|£|¥|₣|EUR|USD|GBP|JPY|CHF|CAD|AUD|NZD|PLN|SEK|NOK|DKK|CZK|HUF|RON|kr|zł|Kč|Ft|lei)(?![A-Za-z])`, "i");
  return String(text || "").match(prefix)?.[0] || String(text || "").match(suffix)?.[0] || null;
}

function getPriceFromPageText() {
  const text = document.body?.innerText || "";

  return findPriceInText(text);
}

function priceSelection(jsonProduct) {
  const sources = [
    ['jsonld_offer', () => getPriceFromJsonLd(jsonProduct)], ['meta', getPriceFromMeta],
    ['data_element', getPriceFromDataElement], ['itemprop', getPriceFromItemprop],
    ['description', getPriceFromDescription], ['page_text', getPriceFromPageText]
  ];
  for (const [source, read] of sources) {
    const value=read();
    if (value) return {source, value};
  }
  return {source:'missing', value:'Prijs niet gevonden'};
}
function getPrice(jsonProduct) { return priceSelection(jsonProduct).value; }
function getPriceProvenance(jsonProduct) {
  const selection=priceSelection(jsonProduct);
  const text=String(document.body?.innerText || '');
  const inclusive=/\b(?:incl(?:usief|uding)?\.?\s*(?:btw|vat)|inkl\.?\s*mwst)\b/i.test(text);
  const exclusive=/\b(?:excl(?:usief|uding)?\.?\s*(?:btw|vat)|exkl\.?\s*mwst)\b/i.test(text);
  // Page-wide labels cannot bind tax treatment to the selected price.
  return {source:selection.source, taxBasis:'unknown', vatContext:inclusive && exclusive ? 'mixed' : exclusive ? 'exclusive_present' : inclusive ? 'inclusive_present' : 'not_observed'};
}

function getPriceCurrency(jsonProduct, priceText = "") {
  const offers = Array.isArray(jsonProduct?.offers)
    ? jsonProduct.offers
    : [jsonProduct?.offers];
  const structuredCurrency = offers.find(offer => offer?.priceCurrency)?.priceCurrency;
  if (structuredCurrency) return String(structuredCurrency).toUpperCase();

  const metaCurrency = document.querySelector(
    'meta[property="product:price:currency"], meta[property="og:price:currency"], meta[itemprop="priceCurrency"]'
  )?.content;
  if (metaCurrency) return String(metaCurrency).toUpperCase();

  return normalizeCurrency(null, priceText);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { normalizeCurrency, formatPrice, findPriceInText, getPriceProvenance, getPrice };
}
