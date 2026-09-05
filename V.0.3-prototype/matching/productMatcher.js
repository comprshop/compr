(function (root) {
  const STOP_WORDS = new Set([
    "the", "and", "for", "with", "mens", "men", "womens", "women",
    "unisex", "product", "online", "new"
  ]);

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\p{L}\p{N}\s/-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeProductName(value) {
    return normalizeText(value)
      .replace(/\b(?:eerste|first|1st|1e)\s*(?:gen|generatie|generation)?\b/g, "gen1")
      .replace(/\b(?:tweede|second|2nd|2e)\s*(?:gen|generatie|generation)?\b/g, "gen2")
      .replace(/\b(?:derde|third|3rd|3e)\s*(?:gen|generatie|generation)?\b/g, "gen3")
      .replace(/\b(?:vierde|fourth|4th|4e)\s*(?:gen|generatie|generation)?\b/g, "gen4")
      .replace(/\b(?:koptelefoons?|headsets?)\b/g, "headphones")
      .replace(/\b(?:mobiele telefoon|mobile phone|telefoons?)\b/g, "smartphone")
      .replace(/\bnotebooks?\b/g, "laptop")
      .replace(/\b(?:bankstel|banken|bank|couch)\b/g, "sofa")
      .replace(/\b(?:stoel|stoelen)\b/g, "chair")
      .replace(/\bzwart\b/g, "black").replace(/\bwit\b/g, "white")
      .replace(/\b(?:grijs|grey)\b/g, "gray").replace(/\bblauw\b/g, "blue")
      .replace(/\brood\b/g, "red").replace(/\bgroen\b/g, "green")
      .replace(/\bzilver\b/g, "silver")
      .replace(/\b(\d+)\s*(?:gb|go)\b/g, "$1gb")
      .replace(/\bwi[\s-]?fi\b/g, "wifi")
      .replace(/\s+/g, " ").trim();
  }

  function normalizeCode(value) {
    return String(value || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .trim();
  }

  function normalizeColor(value) {
    return normalizeText(value)
      .replace(/\bcolour\b/g, "color")
      .replace(/\bgrey\b/g, "gray")
      .replace(/[/-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function sameValue(a, b, normalizer = normalizeText) {
    const valueA = normalizer(a);
    const valueB = normalizer(b);
    return Boolean(valueA && valueB && valueA === valueB);
  }

  function sameBrand(productA, productB) {
    return sameValue(productA?.brand, productB?.brand);
  }

  function sameCategory(productA, productB) {
    return sameValue(productA?.category, productB?.category);
  }

  function sameColor(productA, productB) {
    return sameValue(productA?.color, productB?.color, normalizeColor);
  }

  function fieldMatches(productA, productB, field) {
    return sameValue(productA?.[field], productB?.[field], normalizeCode);
  }

  function getCodes(product) {
    return [product?.gtin, product?.mpn, product?.productCode, product?.sku]
      .map(normalizeCode)
      .filter(Boolean);
  }

  function sameProductCode(productA, productB) {
    const codesA = getCodes(productA);
    const codesB = getCodes(productB);
    return codesA.some(code => code.length >= 5 && codesB.includes(code));
  }

  function sameStrongIdentifier(productA, productB) {
    const fields = ["gtin", "mpn", "productCode"];
    const codesA = fields.map(field => normalizeCode(productA?.[field])).filter(Boolean);
    const codesB = fields.map(field => normalizeCode(productB?.[field])).filter(Boolean);
    return codesA.some(code => code.length >= 5 && codesB.includes(code));
  }

  function getExactIdentifierReason(productA, productB) {
    if (fieldMatches(productA, productB, "gtin")) return "Same GTIN";
    if (sameBrand(productA, productB) && fieldMatches(productA, productB, "mpn")) return "Same brand and MPN";
    if (sameBrand(productA, productB) && fieldMatches(productA, productB, "productCode")) return "Same brand and product code";
    if (sameBrand(productA, productB) && sameStrongIdentifier(productA, productB)) {
      return "Same identifier across differently named fields";
    }
    return "";
  }

  function hasConflictingIdentifier(productA, productB) {
    return ["gtin", "mpn", "productCode"].some(field => {
      const valueA = normalizeCode(productA?.[field]);
      const valueB = normalizeCode(productB?.[field]);
      return Boolean(valueA && valueB && valueA !== valueB);
    });
  }

  function getNameTokens(product) {
    const brandTokens = new Set(normalizeText(product?.brand).split(" ").filter(Boolean));
    const baseTokens = normalizeProductName(product?.name)
      .split(" ")
      .filter(token => token.length > 1)
      .filter(token => !STOP_WORDS.has(token))
      .filter(token => !brandTokens.has(token));
    return baseTokens.map(token => /\d/.test(token)
      ? token.replace(/[^a-z0-9]/g, "")
      : token).filter(Boolean);
  }

  function getNameSimilarity(productA, productB) {
    const setA = new Set(getNameTokens(productA));
    const setB = new Set(getNameTokens(productB));
    if (!setA.size || !setB.size) return 0;

    let intersection = 0;
    setA.forEach(token => {
      if (setB.has(token)) intersection += 1;
    });
    return intersection / new Set([...setA, ...setB]).size;
  }

  function compareProducts(productA, productB) {
    if (!productA || !productB) {
      return { type: "NO_MATCH", confidence: 0, reasons: ["Missing product data"] };
    }

    if (hasConflictingIdentifier(productA, productB)) {
      return { type: "NO_MATCH", confidence: 0.05, reasons: ["Conflicting product identifier"] };
    }

    const exactReason = getExactIdentifierReason(productA, productB);
    if (exactReason) {
      return { type: "EXACT_MATCH", confidence: 1, reasons: [exactReason] };
    }

    const reasons = [];
    const brandMatch = sameBrand(productA, productB);
    const categoryMatch = sameCategory(productA, productB);
    const colorA = normalizeColor(productA?.color);
    const colorB = normalizeColor(productB?.color);
    const colorMatch = sameColor(productA, productB);
    const colorConflict = Boolean(colorA && colorB && !colorMatch);
    const nameSimilarity = getNameSimilarity(productA, productB);
    let score = 0;

    if (brandMatch) { score += 0.25; reasons.push("Same brand"); }
    if (categoryMatch) { score += 0.1; reasons.push("Same category"); }
    if (colorMatch) { score += 0.15; reasons.push("Same colour"); }
    if (colorConflict) { score -= 0.25; reasons.push("Different colour or variant"); }
    if (fieldMatches(productA, productB, "sku") && brandMatch) {
      score += 0.08;
      reasons.push("Same SKU, but no universal identifier");
    }

    score += nameSimilarity * 0.5;
    if (nameSimilarity >= 0.8) reasons.push("Very similar product name");
    else if (nameSimilarity >= 0.5) reasons.push("Similar product name");

    score = Math.max(0, Math.min(score, 0.94));

    if (brandMatch && !colorConflict && nameSimilarity >= 0.72 && score >= 0.72) {
      return { type: "LIKELY_SAME", confidence: score, reasons };
    }
    if (score >= 0.45) {
      return { type: "SIMILAR", confidence: score, reasons };
    }
    return {
      type: "NO_MATCH",
      confidence: score,
      reasons: reasons.length ? reasons : ["Not enough matching evidence"]
    };
  }

  const api = {
    normalizeText,
    normalizeProductName,
    normalizeCode,
    normalizeColor,
    sameProductCode,
    hasConflictingIdentifier,
    getNameSimilarity,
    getExactIdentifierReason,
    compareProducts
  };
  root.ComprMatcher = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
