function normalizeSize(value) {
  if (!value) return null;

  return String(value)
    .replace(/\s+/g, " ")
    .replace(/^(?:(?:selecteer|kies|choose|select)\s+(?:je\s+|your\s+)?)?(?:maat|size)\s*:?\s*/i, "")
    .replace(/\s*[-–—|]\s*(?:uitverkocht|niet beschikbaar|unavailable|sold.?out|out.?of.?stock).*$/i, "")
    .trim();
}

function getSizeValues(value) {
  if (value === null || value === undefined) return [];
  if (typeof value === "object") {
    return getSizeValues(value.name || value.value || value.size || "");
  }
  const normalized = normalizeSize(value);
  if (isValidSize(normalized)) return [normalized];
  const contextual = String(value).match(
    /(?:maat|size)\s*:?\s*((?:XXXS|XXS|XS|S|M|L|XL|XXL|XXXL|[234]XL)|(?:EU|UK|US)?\s*\d{1,2}(?:[.,]5)?|\d{2}\/\d{2})\b/i
  )?.[1];
  const contextualSize = normalizeSize(contextual);
  return isValidSize(contextualSize) ? [contextualSize] : [];
}

function isValidSize(value) {
  if (!value) return false;

  const text = value.toUpperCase();

  const clothingSizes = [
    "XXXS",
    "XXS",
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
    "XXXL",
    "2XL",
    "3XL",
    "4XL"
  ];

  if (clothingSizes.includes(text)) {
    return true;
  }

  // EU/UK/US maatnotatie
  if (/^(EU|UK|US)\s*\d{1,2}(?:[.,]5)?$/i.test(text)) {
    return true;
  }

  // Schoenmaten / numerieke kledingmaten
  if (/^\d{1,2}(?:[.,]5)?$/.test(text)) {
    const number = parseFloat(text.replace(",", "."));

    return number >= 20 && number <= 60;
  }

  // Broekmaat zoals 30/32
  if (/^\d{2}\/\d{2}$/.test(text)) {
    return true;
  }

  return false;
}

function addValidSize(set, value) {
  getSizeValues(value).forEach(size => set.add(size));
}

function hasSizeSelector() {
  return Boolean(document.querySelector([
    '[data-attr="size"]', '[data-attribute="size"]', '[data-attribute-id="size"]',
    '[data-size]', '[data-size-value]', '[name*="size" i]', '[name*="maat" i]',
    '[aria-label*="maat" i]', '[aria-label*="size" i]', '.size-selector', '.size-swatches'
  ].join(", ")));
}

function isUnavailableSizeElement(element) {
  if (!element) return false;

  const text = [
    element.getAttribute?.("aria-label"),
    element.getAttribute?.("title"),
    element.className,
    element.textContent
  ].filter(Boolean).join(" ");

  return Boolean(
    element.disabled ||
    element.getAttribute?.("aria-disabled") === "true" ||
    /(?:sold.?out|out.?of.?stock|unavailable|disabled|unselectable|not.?available|uitverkocht|niet beschikbaar)/i.test(text)
  );
}

function getSizesFromJsonLd(jsonProduct) {
  const found = new Set();

  const candidates = [
    jsonProduct?.size,
    jsonProduct?.sizes
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    const values = Array.isArray(candidate)
      ? candidate
      : [candidate];

    for (const value of values) {
      addValidSize(found, value);
    }
  }

  return [...found];
}

function getSizesFromSelects(options = {}) {
  const found = new Set();
  const unavailableOnly = Boolean(options.unavailableOnly);
  const includeUnavailable = Boolean(options.includeUnavailable);

  const selects = document.querySelectorAll("select");

  for (const select of selects) {
    const context = [select.name, select.id, select.getAttribute?.("aria-label"), select.closest?.('[class*="size" i], [class*="maat" i], [data-attr="size"], [data-attribute="size"]')?.className]
      .filter(Boolean).join(" ");
    if (!/(size|maat)/i.test(context)) continue;
    for (const option of select.options) {
      const unavailable = isUnavailableSizeElement(option);
      if (unavailableOnly && !unavailable) continue;
      if (!unavailableOnly && !includeUnavailable && unavailable) continue;

      addValidSize(
        found,
        option.textContent || option.value
      );
    }
  }

  return [...found];
}

function getSizesFromInteractiveElements(options = {}) {
  const found = new Set();
  const unavailableOnly = Boolean(options.unavailableOnly);
  const includeUnavailable = Boolean(options.includeUnavailable);

    const selectors = [
    '[data-attr="size"] button',
    '[data-attribute="size"] button',
    '[data-attribute-id="size"] [role="option"]',
    '.size-selector button',
    '.size-swatches button',
    '[role="option"][aria-label*="size" i]',
    '[role="option"][aria-label*="maat" i]',
    '[data-size]',
    '[data-size-value]',
    '[data-attribute-id="size"] [data-value]',
    '[data-attr="size"] [data-value]'
  ];

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);

    for (const element of elements) {
      const unavailable = isUnavailableSizeElement(element);
      if (unavailableOnly && !unavailable) continue;
      if (!unavailableOnly && !includeUnavailable && unavailable) continue;

      const candidates = [
        element.innerText,
        element.textContent,
        element.getAttribute("aria-label"),
        element.getAttribute("data-size"),
        element.getAttribute("data-size-value"),
        element.getAttribute("data-attr-value"),
        element.getAttribute("data-value"),
        element.getAttribute("value")
      ];

      for (const candidate of candidates) {
        addValidSize(found, candidate);
      }
    }
  }

  return [...found];
}

function getSizesFromTextNearLabels() {
  const found = new Set();

  const elements = document.querySelectorAll(
    "div, span, p, li"
  );

  for (const element of elements) {
    const text = element.innerText?.trim();

    if (!text || text.length > 120) {
      continue;
    }

    if (!/(size|maat)/i.test(text)) {
      continue;
    }

    const matches = text.match(
      /\b(?:EU|UK|US)?\s?\d{1,2}(?:[.,]5)?\b|\b(?:XXXS|XXS|XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL)\b/gi
    );

    if (!matches) continue;

    for (const match of matches) {
      addValidSize(found, match);
    }
  }

  return [...found];
}

function mergeSizes(...groups) {
  const merged = new Set();

  for (const group of groups) {
    for (const size of group) {
      merged.add(size);
    }
  }

  return [...merged];
}

function getSizes(jsonProduct) {
  const sizes = mergeSizes(
    getSizesFromJsonLd(jsonProduct),
    getSizesFromSelects({ includeUnavailable: true }),
    getSizesFromInteractiveElements({ includeUnavailable: true })
  );

  return sizes.slice(0, 50);
}

function getAvailableSizes() {
  return mergeSizes(
    getSizesFromSelects(),
    getSizesFromInteractiveElements()
  ).slice(0, 50);
}

function getUnavailableSizes() {
  return mergeSizes(
    getSizesFromSelects({ unavailableOnly: true }),
    getSizesFromInteractiveElements({ unavailableOnly: true })
  ).slice(0, 50);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    normalizeSize,
    isValidSize,
    getSizeValues,
    hasSizeSelector,
    isUnavailableSizeElement,
    getSizes,
    getAvailableSizes,
    getUnavailableSizes
  };
}
