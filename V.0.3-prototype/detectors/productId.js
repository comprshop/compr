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

function isValidGtin(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (![8, 12, 13, 14].includes(digits.length)) return false;
  const sum = [...digits.slice(0, -1)].reverse().reduce((total, digit, index) =>
    total + Number(digit) * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === Number(digits.at(-1));
}

function getProductId(jsonProduct) {
  // 1. Betrouwbare structured data eerst
  const sku = cleanProductId(jsonProduct?.sku);
  const mpn = cleanProductId(jsonProduct?.mpn);

  const gtinCandidate =
    cleanProductId(jsonProduct?.gtin) ||
    cleanProductId(jsonProduct?.gtin8) ||
    cleanProductId(jsonProduct?.gtin12) ||
    cleanProductId(jsonProduct?.gtin13) ||
    cleanProductId(jsonProduct?.gtin14);
  const gtin = isValidGtin(gtinCandidate) ? String(gtinCandidate).replace(/\D/g, "") : null;

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

    productCode: null,
    retailerSku: sku || visibleCode || null,
    unknownCode: !sku && !mpn && !gtin ? pathCode : null,
    identifierType: gtin ? "gtin" : mpn ? "mpn" : (sku || visibleCode) ? "retailer_sku" : null
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { cleanProductId, isValidGtin, getProductId };
}
