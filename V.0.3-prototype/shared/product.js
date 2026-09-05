(function (root) {
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
      return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
    } catch {
      return "";
    }
  }

  function getProductIdentity(product) {
    if (!product) return "";

    const identifier = [
      product.productCode,
      product.sku,
      product.mpn,
      product.gtin
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
      product.productCode,
      product.sku,
      product.mpn,
      product.gtin
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
