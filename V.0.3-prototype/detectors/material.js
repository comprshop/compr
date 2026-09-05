function normalizeMaterial(text) {
  if (!text) return null;

  const cleaned = String(text)
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length < 3 || cleaned.length > 120) {
    return null;
  }

  return cleaned;
}

function looksLikeRealMaterial(text) {
  if (!text) return false;

  const value = text.toLowerCase();

  const materialWords = [
    "cotton",
    "katoen",
    "polyester",
    "linen",
    "linnen",
    "wool",
    "wol",
    "elastane",
    "elastaan",
    "viscose",
    "rayon",
    "nylon",
    "acrylic",
    "acryl",
    "leather",
    "leer",
    "silk",
    "zijde",
    "cashmere",
    "kasjmier",
    "polyamide",
    "modal"
  ];

  const containsMaterialWord = materialWords.some(
    (word) => value.includes(word)
  );

  const containsPercentage =
    /\b\d{1,3}\s?%\b/.test(value);

  return containsMaterialWord || containsPercentage;
}

function getMaterialFromJsonLd(jsonProduct) {
  if (!jsonProduct) return null;

  const candidates = [
    jsonProduct.material,
    jsonProduct.fabric
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    if (typeof candidate === "string") {
      const cleaned = normalizeMaterial(candidate);

      if (looksLikeRealMaterial(cleaned)) {
        return cleaned;
      }
    }

    if (Array.isArray(candidate)) {
      const cleaned = candidate
        .map(normalizeMaterial)
        .filter(Boolean)
        .join(", ");

      if (looksLikeRealMaterial(cleaned)) {
        return cleaned;
      }
    }
  }

  return null;
}

function getMaterialFromMeta() {
  const selectors = [
    'meta[name="material"]',
    'meta[property="product:material"]'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);

    const value =
      element?.content ||
      element?.getAttribute("value");

    const cleaned = normalizeMaterial(value);

    if (
      cleaned &&
      looksLikeRealMaterial(cleaned)
    ) {
      return cleaned;
    }
  }

  return null;
}

function getMaterialFromVisiblePage() {
  const text = document.body?.innerText || "";

  const percentagePattern =
    /(?:\d{1,3}\s?%\s*(?:cotton|katoen|polyester|linen|linnen|wool|wol|elastane|elastaan|viscose|rayon|nylon|acrylic|acryl|leather|leer|silk|zijde|cashmere|kasjmier|polyamide|modal))(?:\s*[,/+-]\s*\d{1,3}\s?%\s*[A-Za-zÀ-ÿ\s]+)*/gi;

  const matches = text.match(percentagePattern);

  if (matches && matches.length > 0) {
    const cleaned = normalizeMaterial(matches[0]);

    if (looksLikeRealMaterial(cleaned)) {
      return cleaned;
    }
  }

  const simpleMaterialPattern =
    /\b(?:100%\s*)?(cotton|katoen|polyester|linen|linnen|wool|wol|elastane|elastaan|viscose|rayon|nylon|acrylic|acryl|leather|leer|silk|zijde|cashmere|kasjmier|polyamide|modal)\b/i;

  const simpleMatch = text.match(simpleMaterialPattern);

  if (simpleMatch?.[0]) {
    const cleaned = normalizeMaterial(simpleMatch[0]);

    if (looksLikeRealMaterial(cleaned)) {
      return cleaned;
    }
  }

  return null;
}

function getMaterial(jsonProduct) {
  return (
    getMaterialFromJsonLd(jsonProduct) ||
    getMaterialFromMeta() ||
    getMaterialFromVisiblePage() ||
    null
  );
}