(function (root) {
  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function getCategories(products = []) {
    return [...new Set(products.map(product => product.category || "Other"))]
      .sort((a, b) => a.localeCompare(b));
  }

  function filterAndSortProducts(products = [], options = {}) {
    const query = normalize(options.query);
    const category = options.category || "all";
    const sort = options.sort || "newest";
    const size = normalize(options.size).replace(/\s+/g, "");
    const availableOnly = Boolean(options.availableOnly);
    const filtered = products.filter(product => {
      if (category !== "all" && (product.category || "Other") !== category) return false;
      const availableSizes = Array.isArray(product.availableSizes)
        ? product.availableSizes.map(value => normalize(value).replace(/\s+/g, ""))
        : [];
      if (size && !availableSizes.includes(size)) return false;
      if (
        availableOnly &&
        !size &&
        !["in_stock", "preorder"].includes(product.availabilityStatus)
      ) return false;
      if (!query) return true;
      return [product.name, product.brand, product.webshop, product.category,
        product.color, product.productCode, product.sku, product.mpn, product.gtin,
        ...(product.availableSizes || [])]
        .map(normalize).join(" ").includes(query);
    });

    return [...filtered].sort((a, b) => {
      if (sort === "oldest") return Number(a.savedAt || 0) - Number(b.savedAt || 0);
      if (sort === "price-low" || sort === "price-high") {
        const priceA = Number.isFinite(a.convertedAmount) ? a.convertedAmount : parsePrice(a.price);
        const priceB = Number.isFinite(b.convertedAmount) ? b.convertedAmount : parsePrice(b.price);
        if (priceA === null) return 1;
        if (priceB === null) return -1;
        return sort === "price-high" ? priceB - priceA : priceA - priceB;
      }
      if (sort === "brand") return String(a.brand || "").localeCompare(String(b.brand || ""));
      if (sort === "availability") {
        const rank = { in_stock: 0, preorder: 1, unknown: 2, out_of_stock: 3 };
        return (rank[a.availabilityStatus] ?? 2) - (rank[b.availabilityStatus] ?? 2);
      }
      return Number(b.savedAt || 0) - Number(a.savedAt || 0);
    });
  }

  function groupProductsByCategory(products = []) {
    return products.reduce((groups, product) => {
      const category = product.category || "Other";
      groups[category] ||= [];
      groups[category].push(product);
      return groups;
    }, {});
  }

  const api = { getCategories, filterAndSortProducts, groupProductsByCategory };
  root.ComprCollection = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
