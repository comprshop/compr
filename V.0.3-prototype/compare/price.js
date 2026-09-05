function parsePrice(priceText) {
  return ComprCurrency.parseAmount(priceText);
}

function formatEuro(value) {
  return new Intl.NumberFormat(
    "nl-NL",
    {
      style: "currency",
      currency: "EUR"
    }
  ).format(value);
}

function getCategoryPriceInfo(products) {
  const categories = {};

  for (const product of products) {
    const category =
      product.category || "Other";

    const price = Number.isFinite(product.convertedAmount)
      ? product.convertedAmount
      : parsePrice(product.price);

    if (!categories[category]) {
      categories[category] = [];
    }

    if (price !== null) {
      categories[category].push(price);
    }
  }

  const result = {};

  for (const [
    category,
    prices
  ] of Object.entries(categories)) {
    result[category] = {
      count: prices.length,
      cheapest:
        prices.length > 0
          ? Math.min(...prices)
          : null
    };
  }

  return result;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    parsePrice,
    formatEuro,
    getCategoryPriceInfo
  };
}
