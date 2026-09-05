function normalizeAvailabilityValue(value) {
  return String(value || "").toLowerCase().replace(/[\s_-]/g, "");
}

function availabilityFromValue(value) {
  const normalized = normalizeAvailabilityValue(value);
  if (/(?:instock|limitedavailability|onlineonly)/.test(normalized)) return "in_stock";
  if (/(?:preorder|presale)/.test(normalized)) return "preorder";
  if (/(?:outofstock|soldout|discontinued)/.test(normalized)) return "out_of_stock";
  return "unknown";
}

function getAvailabilityFromJsonLd(product) {
  const offers = Array.isArray(product?.offers) ? product.offers : [product?.offers];
  const statuses = offers.filter(Boolean)
    .map(offer => availabilityFromValue(offer.availability))
    .filter(status => status !== "unknown");

  if (statuses.includes("in_stock")) return "in_stock";
  if (statuses.includes("preorder")) return "preorder";
  if (statuses.length && statuses.every(status => status === "out_of_stock")) return "out_of_stock";
  return "unknown";
}

function getAvailabilityFromMeta() {
  const selectors = [
    'meta[property="product:availability"]',
    'meta[name="availability"]',
    'link[itemprop="availability"]'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    const status = availabilityFromValue(
      element?.content || element?.href || element?.getAttribute("value")
    );
    if (status !== "unknown") return status;
  }
  return "unknown";
}

function getAvailabilityFromControls() {
  const controls = document.querySelectorAll(
    'button, [role="button"], input[type="submit"], input[type="button"]'
  );
  let sawOutOfStockControl = false;

  for (const control of controls) {
    const text = String(
      control.innerText || control.value || control.getAttribute("aria-label") || ""
    ).trim();
    if (!text || text.length > 80) continue;

    if (/(?:sold.?out|out.?of.?stock|uitverkocht|niet leverbaar|niet beschikbaar)/i.test(text)) {
      sawOutOfStockControl = true;
      continue;
    }
    if (
      /(?:add to (?:bag|cart|basket)|in winkelmand|toevoegen aan winkelmand|bestellen|buy now)/i.test(text) &&
      !control.disabled && control.getAttribute("aria-disabled") !== "true"
    ) {
      return "in_stock";
    }
  }
  return sawOutOfStockControl ? "out_of_stock" : "unknown";
}

function getAvailability(jsonProduct, isApparel) {
  const structured = getAvailabilityFromJsonLd(jsonProduct);
  const meta = getAvailabilityFromMeta();
  const controls = getAvailabilityFromControls();
  const unavailableSizes = isApparel ? getUnavailableSizes() : [];
  const unavailableKeys = new Set(
    unavailableSizes.map(size => String(size).toUpperCase().replace(/\s+/g, ""))
  );
  const availableSizes = isApparel
    ? getAvailableSizes().filter(size =>
        !unavailableKeys.has(String(size).toUpperCase().replace(/\s+/g, ""))
      )
    : [];

  return {
    status: structured !== "unknown" ? structured : (meta !== "unknown" ? meta : controls),
    availableSizes,
    unavailableSizes,
    checkedAt: Date.now()
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { availabilityFromValue };
}
