(function (root) {
  const BLOCKED_HOST = /(^|\.)(bing\.com|google\.[a-z.]+|duckduckgo\.com|search\.yahoo\.com|baidu\.com|yandex\.[a-z.]+|chatgpt\.com|openai\.com|facebook\.com|instagram\.com|tiktok\.com|twitter\.com|x\.com|pinterest\.[a-z.]+|reddit\.com|linkedin\.com|youtube\.com|youtu\.be|snapchat\.com|threads\.net|tumblr\.com|discord\.com|openstreetmap\.org|mapquest\.com|maps\.apple\.com)$/i;
  const BLOCKED_PATH = /\/(search|zoeken|results?|category|categories|categorie|collectie|collections?|catalog|listing|browse|discover|maps?)(\/|$)/i;
  const UUID = /^(?:urn:uuid:)?[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const GENERIC_NAME = /^(home|homepage|welcome|shop|store|products?|search|results?|unknown|other|bing|google)$/i;

  function asTypes(value) {
    return (Array.isArray(value) ? value : [value]).map(item => String(item || "").toLowerCase());
  }

  function isProductType(value) {
    return asTypes(value).includes("product");
  }

  function concreteOffer(product) {
    const offers = Array.isArray(product?.offers) ? product.offers : [product?.offers];
    return offers.filter(Boolean).some(offer => {
      const value = Number(offer.price ?? offer.lowPrice ?? offer.highPrice);
      return Number.isFinite(value) && value > 0;
    });
  }

  function validIdentifier(value) {
    const text = String(value || "").trim();
    return text.length >= 4 && text.length <= 64 && /\d/.test(text) && !UUID.test(text) && /^[a-z0-9._/-]+$/i.test(text);
  }

  function isValidProductName(value, pageTitle = "", hostname = "") {
    const name = String(value || "").replace(/\s+/g, " ").trim();
    if (name.length < 3 || name.length > 240 || UUID.test(name) || GENERIC_NAME.test(name)) return false;
    if (/\s[-|–—]\s*(bing|google|search|zoeken)\s*$/i.test(name)) return false;
    if (pageTitle && name.toLowerCase() === String(pageTitle).trim().toLowerCase() && /\s[-|–—]\s*(bing|google)\s*$/i.test(pageTitle)) return false;
    const domainText = String(hostname || "").replace(/^www\./i, "").split(".")[0].replace(/[-_]/g, " ");
    return !domainText || name.toLowerCase() !== domainText.toLowerCase();
  }

  function blockedPage(urlValue) {
    try {
      const url = new URL(urlValue);
      if (!/^https?:$/.test(url.protocol) || BLOCKED_HOST.test(url.hostname) || BLOCKED_PATH.test(url.pathname) || /^\/(?:products?|shop)\/?$/i.test(url.pathname)) return true;
      if (/^\/maps(?:\/|$)/i.test(url.pathname) || /(?:^|[?&])(q|query|search)=/i.test(`${url.search}`) && /search/i.test(url.pathname)) return true;
      return false;
    } catch { return true; }
  }

  function selectMainJsonProduct(doc) {
    const candidates = [];
    for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const parsed = JSON.parse(script.textContent || "null");
        for (const item of Array.isArray(parsed) ? parsed : [parsed]) {
          if (isProductType(item?.["@type"])) candidates.push(item);
          const main = item?.mainEntity;
          if (isProductType(main?.["@type"])) candidates.push(main);
          if (Array.isArray(item?.["@graph"])) {
            for (const graphItem of item["@graph"]) if (isProductType(graphItem?.["@type"])) candidates.push(graphItem);
          }
        }
      } catch { /* Invalid structured data is not product evidence. */ }
    }
    const unique = [...new Set(candidates)];
    if (unique.length !== 1) return null;
    return unique[0];
  }

  function hasProductMeta(doc) {
    return Boolean(doc.querySelector('meta[property="product:price:amount"], meta[property="og:price:amount"], meta[itemprop="price"]'));
  }

  function hasPurchaseControl(doc) {
    return [...doc.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]')].some(element => {
      const text = String(element.innerText || element.value || element.getAttribute?.("aria-label") || "").trim();
      return text.length <= 80 && /(?:add to (?:bag|cart|basket)|in winkelmand|toevoegen aan winkelmand|bestellen|buy now)/i.test(text);
    });
  }

  function assessPage(doc, locationValue, helpers = {}) {
    const url = String(locationValue?.href || locationValue || "");
    let hostname = "";
    try { hostname = new URL(url).hostname; } catch { return { eligible: false, reason: "invalid_url", jsonProduct: null, isApparel: false }; }
    if (blockedPage(url)) return { eligible: false, reason: "blocked_page_type", jsonProduct: null, isApparel: false };

    const jsonProduct = selectMainJsonProduct(doc);
    const visibleName = String(doc.querySelector("h1")?.innerText || "").trim();
    const structuredName = String(jsonProduct?.name || "").trim();
    const name = structuredName || visibleName;
    const hasName = isValidProductName(name, doc.title, hostname);
    const jsonOffer = Boolean(jsonProduct && concreteOffer(jsonProduct));
    const detectedPrice = helpers.getPrice ? helpers.getPrice(jsonProduct) : null;
    const hasPrice = detectedPrice && detectedPrice !== "Prijs niet gevonden";
    const ids = helpers.getProductId ? helpers.getProductId(jsonProduct) : null;
    const hasId = Boolean(ids && [ids.gtin, ids.mpn, ids.sku, ids.productCode].some(validIdentifier));
    const productMeta = hasProductMeta(doc);
    const purchaseControl = hasPurchaseControl(doc);
    const eligible = hasName && ((jsonOffer && Boolean(structuredName)) || (hasPrice && hasId && (productMeta || purchaseControl)) || (hasPrice && productMeta && purchaseControl));
    const categoryText = `${jsonProduct?.category || ""} ${name}`;
    const isApparel = eligible && /\b(shoes?|schoenen?|sneakers?|clothing|kleding|shirts?|tops?|dress|dresses|jurk|jurken|coats?|jas|jassen|jackets?|broek|broeken|pants|trousers?|hoodies?|sweatshirts?|skirts?|rok|rokken)\b/i.test(categoryText);
    return { eligible, reason: eligible ? "strong_product_evidence" : "insufficient_product_evidence", jsonProduct, isApparel };
  }

  function isEligibleProductPayload(product) {
    return Boolean(product?.isProductPage === true && isValidProductName(product.name, "", product.webshop) &&
      product.url && !blockedPage(product.url));
  }

  const api = { blockedPage, isValidProductName, validIdentifier, concreteOffer, selectMainJsonProduct, assessPage, isEligibleProductPayload };
  root.ComprProductEligibility = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
