function cleanSearchValue(value) {
  if (!value) return "";

  return String(value)
    .replace(/\s+/g, " ")
    .trim();
}

function getSearchIdentifier(product) {
  const gtin = cleanSearchValue(product?.gtin);
  if (/^\d{8,14}$/.test(gtin)) return gtin;
  const mpn = cleanSearchValue(product?.mpn);
  if (mpn) return mpn;
  for (const value of [product?.productCode, product?.sku]) {
    const code = cleanSearchValue(value);
    if (/[a-z]/i.test(code) && /\d/.test(code)) return code;
  }
  return "";
}

function buildExactSearchQuery(product) {
  if (!product) {
    return "";
  }

  const brand = cleanSearchValue(product.brand);
  const name = cleanSearchValue(product.name);

  const productCode = getSearchIdentifier(product);

  const parts = [];

  if (brand) {
    parts.push(brand);
  }

  // Voorkom bijvoorbeeld "Nike Nike P-6000"
  if (
    name &&
    !name.toLowerCase().startsWith(
      brand.toLowerCase()
    )
  ) {
    parts.push(name);
  } else if (name && !brand) {
    parts.push(name);
  } else if (name && brand) {
    const nameWithoutBrand = name
      .replace(
        new RegExp(`^${escapeRegExp(brand)}\\s*`, "i"),
        ""
      )
      .trim();

    if (nameWithoutBrand) {
      parts.push(nameWithoutBrand);
    }
  }

  if (productCode) {
    parts.push(`"${productCode.replace(/"/g, "")}"`);
  }

  return [...new Set(parts)]
    .join(" ")
    .trim();
}

function buildFallbackSearchQuery(product) {
  if (!product) {
    return "";
  }

  return [
    cleanSearchValue(product.brand),
    cleanSearchValue(product.name),
    cleanSearchValue(product.color)
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function escapeRegExp(value) {
  return String(value)
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildProductSearchQueries(product) {
  const exact = buildExactSearchQuery(product);
  const fallback = buildFallbackSearchQuery(product);

  return {
    exact,
    fallback
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cleanSearchValue,
    getSearchIdentifier,
    buildExactSearchQuery,
    buildFallbackSearchQuery,
    buildProductSearchQueries
  };
}
