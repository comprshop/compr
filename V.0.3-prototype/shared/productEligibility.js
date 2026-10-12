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

  function normalizedProductPath(value, baseUrl = "") {
    try {
      const url = new URL(String(value || ""), baseUrl || undefined);
      return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/$/, "")}`;
    } catch { return ""; }
  }

  function selectCurrentOffer(product, pageUrl, evidence = {}) {
    const offers = (Array.isArray(product.offers) ? product.offers : [product.offers]).filter(Boolean);
    const isNew = offer => !offer.itemCondition || /(?:^|[/#])NewCondition$/i.test(offer.itemCondition);
    if (offers.length === 1) return isNew(offers[0]) && concreteOffer({ offers: offers[0] }) ? offers[0] : null;
    // A new alternative is not evidence that the currently displayed offer is new.
    if (!Number.isFinite(evidence.price) || !/(?:^|[/#])NewCondition$/i.test(evidence.condition || "")) return null;
    const matches = offers.filter(offer => /(?:^|[/#])NewCondition$/i.test(offer.itemCondition || "") &&
      concreteOffer({ offers: offer }) && Number(offer.price) === evidence.price &&
      normalizedProductPath(offer.url, pageUrl) === normalizedProductPath(pageUrl));
    return matches.length === 1 ? matches[0] : null;
  }

  function productFromVariantGroup(group, pageUrl = "", evidence = {}) {
    if (!asTypes(group?.["@type"]).includes("productgroup")) return null;
    const variants = (Array.isArray(group.hasVariant) ? group.hasVariant : [group.hasVariant])
      .filter(variant => variant && isProductType(variant["@type"]));
    if (!variants.length) return null;
    const pagePath = normalizedProductPath(pageUrl);
    const pathMatches = pagePath ? variants.filter(variant => {
      const offer = Array.isArray(variant.offers) ? variant.offers[0] : variant.offers;
      return normalizedProductPath(variant.url || offer?.url, pageUrl) === pagePath;
    }) : [];
    let selected = pathMatches.length === 1 ? pathMatches[0] : null;
    if (!selected && !pathMatches.length && normalizedProductPath(group.url, pageUrl) === pagePath) {
      // Group identifiers describe the current page, never choose by price or rank.
      for (const fields of [["gtin", "gtin8", "gtin12", "gtin13", "gtin14"], ["mpn"], ["sku"]]) {
        const values = fields.map(key => group[key]).filter(validIdentifier);
        if (!values.length) continue;
        const matches = variants.filter(variant => fields.some(key => values.includes(variant[key])));
        if (matches.length === 1) { selected = matches[0]; break; }
        if (matches.length > 1) return null;
      }
      if (selected) {
        const offer = selectCurrentOffer(group, pageUrl, evidence);
        if (!offer) return null;
        selected = { ...selected, offers: offer, url: group.url };
      }
    }
    if (selected) {
      const offer = selectCurrentOffer(selected, pageUrl, evidence);
      if (!offer) return null;
      return { ...selected, offers: offer, brand: selected.brand || group.brand, category: selected.category || group.category,
        image: selected.image || group.image, description: selected.description || group.description };
    }
    const groupOffers = (Array.isArray(group.offers) ? group.offers : [group.offers]).filter(Boolean);
    const groupPath = normalizedProductPath(group.url || groupOffers[0]?.url, pageUrl);
    const groupIdentifier = group.gtin || group.gtin8 || group.gtin12 || group.gtin13 || group.gtin14 || group.mpn || group.sku;
    const directGroupOffer = groupOffers.length === 1 &&
      asTypes(groupOffers[0]?.["@type"]).includes("offer") && concreteOffer(group);
    if (pagePath && groupPath === pagePath && directGroupOffer && validIdentifier(groupIdentifier) && group.name) {
      const offer = selectCurrentOffer(group, pageUrl, evidence);
      return offer ? { ...group, offers: offer, "@type": "Product", hasVariant: variants } : null;
    }
    const sharedValue = getter => {
      const values = [...new Set(variants.map(getter).map(value => String(value || "").trim()).filter(Boolean))];
      return values.length === 1 ? values[0] : null;
    };
    const mpn = sharedValue(variant => variant.mpn);
    const name = sharedValue(variant => variant.name);
    const color = sharedValue(variant => variant.color);
    const price = sharedValue(variant => {
      const offer = Array.isArray(variant.offers) ? variant.offers[0] : variant.offers;
      return offer?.price ?? offer?.lowPrice ?? offer?.highPrice;
    });
    const currency = sharedValue(variant => {
      const offer = Array.isArray(variant.offers) ? variant.offers[0] : variant.offers;
      return offer?.priceCurrency;
    });
    const sharedPath = sharedValue(variant => {
      const offer = Array.isArray(variant.offers) ? variant.offers[0] : variant.offers;
      return normalizedProductPath(variant.url || offer?.url, pageUrl);
    });
    if ((!mpn && !(name && sharedPath)) || !price || !currency) return null;
    if (variants.some(variant => !selectCurrentOffer(variant, pageUrl, evidence))) return null;
    const first = variants[0];
    const firstOffer = Array.isArray(first.offers) ? first.offers[0] : first.offers;
    return {
      ...first,
      name: group.name || name || first.name,
      description: group.description || first.description,
      brand: group.brand || first.brand,
      category: group.category || first.category,
      color: color || group.color || first.color,
      image: group.image || first.image,
      mpn: mpn || null,
      sku: null,
      gtin: null,
      gtin8: null,
      gtin12: null,
      gtin13: null,
      gtin14: null,
      offers: { ...firstOffer, price, priceCurrency: currency },
      hasVariant: variants
    };
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

  function selectMainJsonProduct(doc, pageUrl = "") {
    const candidates = [];
    const priceElement = doc.querySelector('[itemprop="offers"] [itemprop="price"]');
    const conditionElement = doc.querySelector('[itemprop="offers"] [itemprop="itemCondition"]');
    const rawPrice = priceElement?.getAttribute?.("content") || priceElement?.textContent;
    const evidence = {
      price: rawPrice && /^\d+(?:\.\d+)?$/.test(String(rawPrice).trim()) ? Number(rawPrice) : NaN,
      condition: conditionElement?.getAttribute?.("href") || conditionElement?.getAttribute?.("content") || ""
    };
    for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const parsed = JSON.parse(script.textContent || "null");
        for (const item of Array.isArray(parsed) ? parsed : [parsed]) {
          if (isProductType(item?.["@type"])) candidates.push(item);
          const groupedProduct = productFromVariantGroup(item, pageUrl, evidence);
          if (groupedProduct) candidates.push(groupedProduct);
          const actionObject = item?.object;
          if (isProductType(actionObject?.["@type"])) candidates.push(actionObject);
          const groupedActionObject = productFromVariantGroup(actionObject, pageUrl, evidence);
          if (groupedActionObject) candidates.push(groupedActionObject);
          const main = item?.mainEntity;
          if (isProductType(main?.["@type"])) candidates.push(main);
          if (Array.isArray(item?.["@graph"])) {
            for (const graphItem of item["@graph"]) if (isProductType(graphItem?.["@type"])) candidates.push(graphItem);
          }
        }
      } catch { /* Invalid structured data is not product evidence. */ }
    }
    const unique = [...new Set(candidates)];
    if (unique.length !== 1) {
      const pagePath = normalizedProductPath(pageUrl);
      const pathMatches = pagePath ? unique.filter(product => {
        const offer = Array.isArray(product?.offers) ? product.offers[0] : product?.offers;
        return normalizedProductPath(product?.url || offer?.url, pageUrl) === pagePath;
      }) : [];
      return pathMatches.length === 1 ? pathMatches[0] : null;
    }
    return unique[0];
  }

  function hasProductMeta(doc) {
    return Boolean(doc.querySelector('meta[property="product:price:amount"], meta[property="og:price:amount"], meta[itemprop="price"]'));
  }

  function hasPurchaseControl(doc) {
    return [...doc.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]')].some(element => {
      const text = String(element.innerText || element.value || element.getAttribute?.("aria-label") || "").trim();
      return text.length <= 80 && /(?:add to (?:bag|cart|basket)|in winkelmand|toevoegen aan winkelmand|voeg toe aan (?:winkelmand|winkelwagen)|bestellen|buy now|in den warenkorb)/i.test(text);
    });
  }

  function assessPage(doc, locationValue, helpers = {}) {
    const url = String(locationValue?.href || locationValue || "");
    let hostname = "";
    try { hostname = new URL(url).hostname; } catch { return { eligible: false, reason: "invalid_url", jsonProduct: null, isApparel: false }; }
    if (blockedPage(url)) return { eligible: false, reason: "blocked_page_type", jsonProduct: null, isApparel: false, diagnostics: {version:1, reason:"blocked_page_type", pageType:"blocked"} };

    const jsonProduct = selectMainJsonProduct(doc, url);
    const visibleName = String(doc.querySelector("h1")?.innerText || "").trim();
    const structuredName = String(jsonProduct?.name || "").trim();
    const name = structuredName || visibleName;
    const hasName = isValidProductName(name, doc.title, hostname);
    const jsonOffer = Boolean(jsonProduct && concreteOffer(jsonProduct));
    const detectedPrice = helpers.getPrice ? helpers.getPrice(jsonProduct) : null;
    const hasPrice = detectedPrice && detectedPrice !== "Prijs niet gevonden";
    const ids = helpers.getProductId ? helpers.getProductId(jsonProduct) : null;
    const hasId = Boolean(ids && [ids.gtin, ids.mpn, ids.sku, ids.retailerSku, ids.productCode].some(validIdentifier));
    const productMeta = hasProductMeta(doc);
    const purchaseControl = hasPurchaseControl(doc);
    const unresolvedGroup = !jsonProduct && [...doc.querySelectorAll('script[type="application/ld+json"]')].some(script => {
      try { return /"@type"\s*:\s*(?:"ProductGroup"|\[[^\]]*"ProductGroup")/i.test(script.textContent || ""); }
      catch { return false; }
    });
    const eligible = !unresolvedGroup && hasName && ((jsonOffer && Boolean(structuredName)) || (hasPrice && hasId && (productMeta || purchaseControl)) || (hasPrice && productMeta && purchaseControl));
    const categoryText = `${jsonProduct?.category || ""} ${name}`;
    const isApparel = eligible && /\b(shoes?|schoenen?|sneakers?|clothing|kleding|shirts?|tops?|dress|dresses|jurk|jurken|coats?|jas|jassen|jackets?|broek|broeken|pants|trousers?|hoodies?|sweatshirts?|skirts?|rok|rokken)\b/i.test(categoryText);
    const diagnostics = {version:1, reason:eligible ? 'strong_product_evidence' : 'insufficient_product_evidence',
      title:hasName ? 'present' : 'missing_or_invalid', price:hasPrice ? 'present' : 'missing',
      identifier:hasId ? 'present' : 'missing', structuredProduct:jsonProduct ? 'selected' : 'missing_or_ambiguous',
      offer:jsonOffer ? 'present' : 'missing', productGroup:unresolvedGroup ? 'unresolved' : 'not_blocking',
      productMeta:productMeta ? 'present' : 'missing', buyButton:purchaseControl ? 'present' : 'missing',
      pageType:'not_blocked', documentReadyState: ['loading','interactive','complete'].includes(doc.readyState) ? doc.readyState : 'unknown',
      currency:helpers.getPriceCurrency?.(jsonProduct,detectedPrice) ? 'present' : 'unknown',
      priceProvenance:helpers.getPriceProvenance?.(jsonProduct) || null,
      selectedSize:helpers.getSelectedSize?.(jsonProduct).status || 'unknown'};
    return { eligible, diagnostics, reason: eligible ? "strong_product_evidence" : "insufficient_product_evidence", jsonProduct, isApparel };
  }

  function isEligibleProductPayload(product) {
    return Boolean(product?.isProductPage === true && isValidProductName(product.name, "", product.webshop) &&
      product.url && !blockedPage(product.url));
  }

  const api = { blockedPage, isValidProductName, validIdentifier, concreteOffer, productFromVariantGroup, selectMainJsonProduct, assessPage, isEligibleProductPayload };
  root.ComprProductEligibility = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
