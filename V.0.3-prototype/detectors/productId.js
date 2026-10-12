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

function isValidIsbn10(value) {
  const text = String(value || "").toUpperCase().replace(/[^0-9X]/g, "");
  if (!/^\d{9}[\dX]$/.test(text)) return false;
  return [...text].reduce((sum, char, index) => sum + (char === "X" ? 10 : Number(char)) * (10 - index), 0) % 11 === 0;
}

function structuredValue(value) {
  if (typeof value === "string" || typeof value === "number") return value;
  return value?.name || value?.value || value?.model || null;
}

function cleanStructuredModel(value) {
  const text = String(structuredValue(value) || "").trim();
  if (text.length >= 2 && text.length <= 50 && /[a-z]/i.test(text) && /\d/.test(text) && /^[a-z0-9._/-]+$/i.test(text)) return text;
  return cleanProductId(text);
}

function typedProductId(value) {
  const text = String(value || "").trim();
  const match = text.match(/^\s*(gtin(?:-?(?:8|12|13|14))?|ean(?:-?13)?|upc(?:-?a)?|isbn(?:-?(?:10|13))?)\s*[:#]\s*(.+)\s*$/i);
  return match ? { type: match[1].toLowerCase().replace(/-/g, ""), value: match[2] } : null;
}

function getProductId(jsonProduct) {
  // 1. Betrouwbare structured data eerst
  const sku = cleanProductId(jsonProduct?.sku || jsonProduct?.merchantSku);
  const mpn = cleanProductId(jsonProduct?.mpn || jsonProduct?.manufacturerPartNumber || jsonProduct?.manufacturerProductNumber);
  const model = cleanStructuredModel(jsonProduct?.model);

  const gtinCandidate =
    cleanProductId(jsonProduct?.gtin) ||
    cleanProductId(jsonProduct?.gtin8) ||
    cleanProductId(jsonProduct?.gtin12) ||
    cleanProductId(jsonProduct?.gtin13) ||
    cleanProductId(jsonProduct?.gtin14);
  const productId = typedProductId(jsonProduct?.productID);
  const typedDigits = productId?.value && String(productId.value).replace(/\D/g, "");
  let gtin = isValidGtin(gtinCandidate || typedDigits) ? String(gtinCandidate || typedDigits).replace(/\D/g, "") : null;
  const isbn10 = !gtin && /^isbn/.test(productId?.type || "") && isValidIsbn10(productId?.value) ? String(productId.value).toUpperCase().replace(/[^0-9X]/g, "") : null;

  // 2. Zoek naar zichtbare style/product codes
  const bodyText = document.body?.innerText || "";

  const visibleGtin = bodyText.match(/(?:GTIN(?:-?(?:8|12|13|14))?|EAN(?:-?13)?|UPC(?:-?A)?)\s*:?\s*([0-9][0-9\s-]{6,20}[0-9])/i)?.[1];
  if (!gtin && isValidGtin(visibleGtin)) gtin = String(visibleGtin).replace(/\D/g, "");
  const manufacturerPatterns = [
    /(?:style|stijl|style code|style number|model(?: number|nummer)?|modelcode|modellnummer|num[eé]ro de mod[eè]le|n[uú]mero de modelo|numero modello)\s*:?\s*([A-Z0-9]+(?:[._/-][A-Z0-9]+)+)/i,
    /(?:MPN|manufacturer (?:part|product) number|part number|herstellernummer|r[eé]f[eé]rence fabricant|codice produttore)\s*:?\s*([A-Z0-9._/-]+)/i,
    /\b([A-Z]{1,4}\d{3,8}-\d{2,5})\b/i
  ];
  const retailerPatterns = [
    /(?:product code|productcode|produktcode|artikelnummer|artikelnr\.?|article number|item number|produktnummer|r[eé]f(?:[eé]rence)?\.?|code produit|referencia|c[oó]digo (?:de )?(?:producto|art[ií]culo)|cod(?:ice|\.) (?:prodotto|articolo))\s*:?\s*([A-Z0-9._/-]+)/i,
  ];
  const findVisible = patterns => {
    let value = null;
    for (const pattern of patterns) {
    const match = bodyText.match(pattern);
    if (match?.[1]) {
        value = cleanStructuredModel(match[1]);
        if (value) break;
      }
    }
    return value;
  };
  const visibleMpn = findVisible(manufacturerPatterns);
  const visibleCode = findVisible(retailerPatterns);

  let pathCode = null;
  try {
    const segment = decodeURIComponent(window.location.pathname.split("/").filter(Boolean).pop() || "")
      .replace(/\.(?:html?|aspx?)$/i, "");
    if (/^[a-z]{1,8}\d{2,10}(?:-\d{2,6})?$/i.test(segment)) {
      pathCode = cleanProductId(segment);
    }
    if (!pathCode && /\/(?:p|product|produkt|produit|prodotto|producto)\//i.test(window.location.pathname)) {
      pathCode = cleanProductId(segment.match(/(?:^|[-_])(\d{5,14})$/)?.[1]);
    }
  } catch {
    pathCode = null;
  }

  return {
    sku: sku || null,
    mpn: mpn || model || visibleMpn || null,
    gtin: gtin || null,
    isbn: isbn10 || null,

    productCode: model || null,
    retailerSku: sku || visibleCode || null,
    unknownCode: !sku && !mpn && !gtin ? pathCode : null,
    identifiers: [
      gtin && { type: "gtin", value: gtin, scope: "global", source: gtinCandidate ? "structured_gtin" : "structured_product_id", strength: "strong" },
      isbn10 && { type: "isbn10", value: isbn10, scope: "global", source: "structured_product_id", strength: "strong" },
      (mpn || model || visibleMpn) && { type: mpn || visibleMpn ? "mpn" : "model", value: mpn || model || visibleMpn, scope: "manufacturer", source: mpn ? "structured_mpn" : model ? "structured_model" : "visible_label", strength: "strong" },
      (sku || visibleCode) && { type: "retailer_sku", value: sku || visibleCode, scope: "retailer", source: sku ? "structured_sku" : "visible_label", strength: "supporting" },
      pathCode && { type: "retailer_product_id", value: pathCode, scope: "retailer", source: "product_url", strength: "supporting" }
    ].filter(Boolean),
    identifierType: gtin ? "gtin" : isbn10 ? "isbn10" : (mpn || visibleMpn) ? "mpn" : model ? "model" : (sku || visibleCode) ? "retailer_sku" : pathCode ? "retailer_product_id" : null
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { cleanProductId, cleanStructuredModel, isValidGtin, isValidIsbn10, typedProductId, getProductId };
}
