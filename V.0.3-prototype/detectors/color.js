function cleanColor(value) {
  if (!value) return null;

  let color = String(value)
    .replace(/\s+/g, " ")
    .trim();

  // Verwijder alles vanaf labels die na de kleur kunnen komen.
  // Bijvoorbeeld Nike:
  // "Wit/Metallic Silver/Flat Silver/ZwartStijl: CD6404-105"
  color = color
    .split(
      /(?:stijl|style|style code|productcode|product code|artikelnummer|sku)\s*:/i
    )[0]
    .trim();

  // Onnodige scheidingstekens aan het einde verwijderen
  color = color
    .replace(/[\s,;|/-]+$/, "")
    .trim();

  if (/^(?:kleur|color|colour)\s+(?:niet gevonden|not found|onbekend|unknown|n\/?a)$/i.test(color)) {
    return null;
  }

  if (!color || color.length > 150) {
    return null;
  }

  return color;
}

function containsKnownColorName(value) {
  if (typeof ComprLocaleParsing !== "undefined" && ComprLocaleParsing.colors(value).size) return true;
  return /\b(black|white|grey|gray|blue|navy|indigo|red|green|olive|yellow|orange|purple|pink|brown|beige|cream|silver|metallic|gold|angora|incense|clay|zwart|wit|grijs|blauw|rood|groen|geel|oranje|paars|roze|bruin)\b/i.test(
    value || ""
  );
}

function getColorFromJsonLd(product) {
  return cleanColor(product?.color);
}

function getColorFromMeta() {
  const selectors = [
    'meta[property="product:color"]',
    'meta[name="color"]',
    'meta[itemprop="color"]'
  ];

  for (const selector of selectors) {
    const value = document.querySelector(selector)?.content;

    const color = cleanColor(value);

    if (color) {
      return color;
    }
  }

  return null;
}

function getColorFromExplicitLabels() {
  const elements = Array.from(
    document.querySelectorAll(
      "body *"
    )
  );

  for (const element of elements) {
    // Alleen relatief kleine tekstelementen bekijken.
    // Dit voorkomt dat complete pagina's als kleur worden gelezen.
    if (element.children.length > 3) {
      continue;
    }

    const text = element.innerText?.trim();

    if (!text || text.length > 250) {
      continue;
    }

    const match = text.match(
      /(?:kleur|color|colour)\s*:?\s*(.+?)(?=(?:stijl|style|productcode|product code|artikelnummer|sku)\s*:|$)/i
    );

    if (match?.[1]) {
      const color = cleanColor(match[1]);

      if (color && containsKnownColorName(color)) {
        return color;
      }
    }
  }

  return null;
}

function getColorFromSelectedSwatch() {
  const selectors = [
    '[aria-checked="true"]',
    '[aria-selected="true"]',
    '[data-selected="true"]',
    '.selected',
    '.active'
  ];

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);

    for (const element of elements) {
      const possibleColor =
        element.getAttribute("aria-label") ||
        element.getAttribute("title") ||
        element.getAttribute("data-color");

      const color = cleanColor(possibleColor);

      if (color && color.length <= 100 && containsKnownColorName(color)) {
        return color;
      }
    }
  }

  return null;
}

function getColorFromProductName(productName) {
  if (!productName) return null;

  if (typeof ComprLocaleParsing !== "undefined") {
    const found = ComprLocaleParsing.colors(productName);
    if (found.size === 1) return [...found][0];
  }
  const lowerName = productName.toLowerCase();

  const colors = [
    "black",
    "white",
    "grey",
    "gray",
    "blue",
    "navy",
    "red",
    "green",
    "olive",
    "yellow",
    "orange",
    "purple",
    "pink",
    "brown",
    "beige",
    "cream",
    "silver",
    "metallic",
    "indigo",
    "angora",
    "incense",
    "clay",
    "gold",
    "zwart",
    "wit",
    "grijs",
    "blauw",
    "rood",
    "groen",
    "geel",
    "oranje",
    "paars",
    "roze",
    "bruin"
  ];

  for (const color of colors) {
    const pattern = new RegExp(
      `\\b${color}\\b`,
      "i"
    );

    if (pattern.test(lowerName)) {
      return color;
    }
  }

  return null;
}

function getColor(
  jsonProduct,
  productName = ""
) {
  return (
    getColorFromJsonLd(jsonProduct) ||
    getColorFromMeta() ||
    getColorFromExplicitLabels() ||
    getColorFromSelectedSwatch() ||
    getColorFromProductName(productName) ||
    null
  );
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { cleanColor, containsKnownColorName, getColorFromProductName };
}
