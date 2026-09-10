(function (root) {
  function numericPrice(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    const normalized = String(value || "")
      .replace(/[^\d,.-]/g, "")
      .replace(/\.(?=\d{3}(?:\D|$))/g, "")
      .replace(",", ".");
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function firstIdentifier(product) {
    return product?.gtin || product?.mpn || product?.productCode || product?.sku || null;
  }

  function strongIdentifier(product) {
    return product?.gtin || product?.mpn || null;
  }

  function buildDemoCatalog(product) {
    const price = numericPrice(product?.convertedAmount ?? product?.price) || 100;
    const currency = product?.convertedCurrency || product?.currency || "EUR";
    const identifier = firstIdentifier(product);
    const exactIdentifier = strongIdentifier(product);
    const base = {
      name: product?.name || "Unknown product",
      brand: product?.brand || "",
      color: product?.color || "",
      category: product?.category || "Other",
      currency,
      image: product?.image || "",
      isDemo: true
    };

    const results = [];

    if (exactIdentifier) {
      results.push({
        ...base,
        price: Math.max(1, Number((price * 0.88).toFixed(2))),
        webshop: "Exact Match Demo Store",
        productCode: product?.productCode || null,
        sku: product?.sku || null,
        mpn: product?.mpn || null,
        gtin: product?.gtin || null,
        providerLabel: "Matching identifier"
      });
    }

    results.push({
      ...base,
      price: Math.max(1, Number((price * 0.94).toFixed(2))),
      webshop: "Likely Match Demo Store",
      providerLabel: "Matching name, brand and colour"
    });

    results.push({
      ...base,
      name: `${base.name} alternative`,
      color: "Different colour",
      price: Math.max(1, Number((price * 0.72).toFixed(2))),
      webshop: "Alternative Demo Store",
      mpn: product?.mpn ? `${product.mpn}-ALT` : null,
      productCode: !product?.mpn && identifier ? `${identifier}-ALT` : "DEMO-ALT-001",
      providerLabel: "Cheaper, but not the same product"
    });

    return results;
  }

  root.ComprDemoCatalog = {
    search(product) {
      return new Promise(resolve => {
        root.setTimeout(() => resolve(buildDemoCatalog(product)), 450);
      });
    },
    buildDemoCatalog
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { numericPrice, firstIdentifier, strongIdentifier, buildDemoCatalog };
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
