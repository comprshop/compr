function cleanProductId(value) {
  if (!value) return null;

  const cleaned = String(value).trim();

  if (cleaned.length < 4 || cleaned.length > 50) {
    return null;
  }

  // Productcodes moeten minimaal één cijfer bevatten.
  // Hierdoor wordt bijvoorbeeld "krijgt" afgewezen.
  if (!/\d/.test(cleaned)) {
    return null;
  }

  // Alleen tekens die normaal in productcodes voorkomen.
  if (!/^[A-Z0-9._/-]+$/i.test(cleaned)) {
    return null;
  }

  return cleaned;
}

function getProductId(jsonProduct) {
  // 1. Betrouwbare structured data eerst
  const sku = cleanProductId(jsonProduct?.sku);
  const mpn = cleanProductId(jsonProduct?.mpn);

  const gtin =
    cleanProductId(jsonProduct?.gtin) ||
    cleanProductId(jsonProduct?.gtin8) ||
    cleanProductId(jsonProduct?.gtin12) ||
    cleanProductId(jsonProduct?.gtin13) ||
    cleanProductId(jsonProduct?.gtin14);

  // 2. Zoek naar zichtbare style/product codes
  const bodyText = document.body?.innerText || "";

  const patterns = [
    /(?:style|stijl|style code|style number)\s*:?\s*([A-Z0-9]+-[A-Z0-9-]+)/i,
    /(?:product code|productcode|artikelnummer|article number)\s*:?\s*([A-Z0-9._/-]+)/i,
    /\b([A-Z]{1,4}\d{3,8}-\d{2,5})\b/i
  ];

  let visibleCode = null;

  for (const pattern of patterns) {
    const match = bodyText.match(pattern);

    if (match?.[1]) {
      visibleCode = cleanProductId(match[1]);

      if (visibleCode) {
        break;
      }
    }
  }

  let pathCode = null;
  try {
    const segment = decodeURIComponent(window.location.pathname.split("/").filter(Boolean).pop() || "")
      .replace(/\.(?:html?|aspx?)$/i, "");
    if (/^[a-z]{1,8}\d{2,10}(?:-\d{2,6})?$/i.test(segment)) {
      pathCode = cleanProductId(segment);
    }
  } catch {
    pathCode = null;
  }

  return {
    sku: sku || null,
    mpn: mpn || null,
    gtin: gtin || null,

    productCode:
      sku ||
      mpn ||
      gtin ||
      visibleCode ||
      pathCode ||
      null
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { cleanProductId };
}
