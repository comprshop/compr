(function (root) {
  const LocaleParsing = root.ComprLocaleParsing || (typeof require === "function" ? require("./localeParsing.js") : null);
  function normalizeCode(value) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");
  }

  function normalizeUrl(value) {
    if (!value) return "";

    try {
      const url = new URL(value);
      const trackingParameters = [
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_term",
        "utm_content",
        "gclid",
        "fbclid",
        "msclkid"
      ];

      trackingParameters.forEach(parameter => {
        url.searchParams.delete(parameter);
      });

      url.hash = "";
      return url.toString();
    } catch {
      return String(value).trim();
    }
  }

  function getSafeWebUrl(value) {
    if (!value) return "";
    try {
      const url = new URL(String(value).trim());
      return url.protocol === "https:" ? url.toString() : "";
    } catch {
      return "";
    }
  }

  function resolveSafeWebUrl(value, baseUrl) {
    if (!value) return "";
    try {
      const url = new URL(String(value).trim(), baseUrl || undefined);
      return url.protocol === "https:" ? url.toString() : "";
    } catch {
      return "";
    }
  }

  function parseProductPrice(value) {
    const amount = LocaleParsing.parseAmount(value);
    return amount > 0 ? amount : null;
  }

  function cleanDetectedValue(value) {
    const text = String(value || "").trim();
    return /^(?:merk|kleur|materiaal|brand|colou?r|material) (?:niet gevonden|not found)$/i.test(text)
      ? "" : text;
  }

  const SELECTED_VARIANT_EVIDENCE = new Set(["dom_selected_control","dom_selected_option","structured_current_product","url_bound_variant"]);
  function normalizeSelectedVariants(product = {}) {
    const result = {};
    const supplied = product.selectedVariants && typeof product.selectedVariants === "object" ? product.selectedVariants : {};
    const add = (key, entry) => {
      if (!entry || typeof entry !== "object" || !SELECTED_VARIANT_EVIDENCE.has(entry.evidence)) return;
      const value=cleanDetectedValue(entry.value);
      if(value)result[key]={value,evidence:entry.evidence};
    };
    for(const key of ["size","capacity","color","variant","pack"])add(key,supplied[key]);
    if(!result.size && cleanDetectedValue(product.selectedSize)) result.size={value:cleanDetectedValue(product.selectedSize),evidence:"dom_selected_control"};
    return result;
  }

  function toSearchPayload(product = {}) {
    const url = getSafeWebUrl(product.canonicalUrl) || getSafeWebUrl(product.url) || null;
    let webshop = cleanDetectedValue(product.webshop);
    if (!webshop && url) {
      try { webshop = new URL(url).hostname; } catch { webshop = ""; }
    }
    const converted = Number(product.convertedAmount);
    const numeric = Number(product.numericPrice);
    let price = Number.isFinite(converted) && converted > 0 ? converted
      : Number.isFinite(numeric) && numeric > 0 ? numeric
        : parseProductPrice(product.price);
    const detectedCurrency = LocaleParsing.currency(product.price);
    const currency = String(product.convertedCurrency || product.currency || detectedCurrency || "EUR").toUpperCase();
    const isConverted = Number.isFinite(converted) && converted > 0 && Boolean(product.convertedCurrency);
    if (!isConverted && detectedCurrency && detectedCurrency !== currency) price = null;
    const locale = String(product.locale ?? root.navigator?.language ?? "").slice(0, 35);
    const selectedVariants=normalizeSelectedVariants(product);
    const selectedSize = cleanDetectedValue(selectedVariants.size?.value || product.selectedSize || product.size);
    const selectedColor = cleanDetectedValue(selectedVariants.color?.value || product.color);
    const selectedCapacity = cleanDetectedValue(selectedVariants.capacity?.value || product.capacity);
    const sizeSystem = /^(EU|UK|US)$/i.test(product.sizeSystem || "") ? product.sizeSystem.toUpperCase() : "";
    const boundSize = sizeSystem && /^\d{1,2}(?:[.,]5)?$/.test(selectedSize) ? `${sizeSystem} ${selectedSize}` : selectedSize;
    return {
      name: cleanDetectedValue(product.name), brand: cleanDetectedValue(product.brand),
      category: cleanDetectedValue(product.category), color: selectedColor,
      ...(product.sizeRequired === true ? {sizeRequired:true} : {}),
      ...(Object.keys(selectedVariants).length ? {selectedVariants} : {}),
      ...(product.sizeSystem ? {sizeSystem:cleanDetectedValue(product.sizeSystem)} : {}),
      material: cleanDetectedValue(product.material), size: boundSize,
      condition: cleanDetectedValue(product.condition), capacity: selectedCapacity,
      storage: cleanDetectedValue(product.storage), screenSize: cleanDetectedValue(product.screenSize),
      productCode: cleanDetectedValue(product.productCode) || null,
      sku: cleanDetectedValue(product.sku) || null, mpn: cleanDetectedValue(product.mpn) || null,
      gtin: cleanDetectedValue(product.gtin) || null,
      price, currency: /^[A-Z]{3}$/.test(currency) ? currency : "EUR",
      targetMarket: LocaleParsing.resolveTargetMarket({ ...product, url }, locale),
      locale: locale,
      url, webshop: webshop || null
    };
  }

  function getProductIdentity(product) {
    if (!product) return "";

    const identifier = [
      product.gtin,
      product.mpn
    ]
      .map(normalizeCode)
      .find(Boolean);

    if (identifier) return `code:${identifier}`;

    const url = normalizeUrl(getSafeWebUrl(product.url));
    return url ? `url:${url}` : "";
  }

  function getProductCodes(product) {
    if (!product) return [];

    return [
      product.gtin,
      product.mpn
    ]
      .map(normalizeCode)
      .filter(Boolean);
  }

  function sameProduct(productA, productB) {
    const codesA = getProductCodes(productA);
    const codesB = getProductCodes(productB);

    if (codesA.some(code => codesB.includes(code))) {
      return true;
    }

    const identityA = getProductIdentity(productA);
    const identityB = getProductIdentity(productB);

    return Boolean(identityA && identityA === identityB);
  }

  function getTrustpilotUrl(product) {
    const value = product?.webshop || product?.url;
    if (!value) return "";

    try {
      const source = value.includes("://") ? value : `https://${value}`;
      const hostname = new URL(source).hostname
        .toLowerCase()
        .replace(/^m\./i, "");
      const rootDomain = hostname.replace(/^www\./i, "");
      const knownProfileDomains = {
        "nike.com": "www.nike.com"
      };
      const profileDomain = knownProfileDomains[rootDomain] || hostname;

      return profileDomain
        ? `https://www.trustpilot.com/review/${encodeURIComponent(profileDomain)}`
        : "";
    } catch {
      return "";
    }
  }

  function getStoreDomain(product) {
    const value = product?.webshop || product?.url;
    if (!value) return "";

    try {
      const source = value.includes("://") ? value : `https://${value}`;
      return new URL(source).hostname.toLowerCase().replace(/^m\./i, "");
    } catch {
      return "";
    }
  }

  function deduplicateProducts(products = []) {
    return products.reduce((unique, product) => {
      const identity = getProductIdentity(product);

      if (!identity) return unique;

      if (!unique.some(existing => sameProduct(existing, product))) {
        unique.push(product);
      }

      return unique;
    }, []);
  }

  const api = {
    normalizeCode,
    normalizeUrl,
    getSafeWebUrl,
    resolveSafeWebUrl,
    parseProductPrice,
    cleanDetectedValue,
    normalizeSelectedVariants,
    toSearchPayload,
    getProductIdentity,
    getProductCodes,
    sameProduct,
    getTrustpilotUrl,
    getStoreDomain,
    deduplicateProducts
  };

  root.ComprProduct = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
