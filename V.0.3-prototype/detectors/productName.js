function normalizeStoreName(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  let host = raw;
  try { host = new URL(raw.includes("://") ? raw : `https://${raw}`).hostname; } catch {}
  return host.replace(/^www\./, "").split(".")[0].replace(/[^\p{L}\p{N}]/gu, "");
}

function cleanProductName(value, retailer = "") {
  const compact = String(value || "").replace(/\s+/g, " ").trim();
  const store = normalizeStoreName(retailer);
  if (!store) return compact;
  const parts = compact.split(/\s+(?:\||-|–|—)\s+/);
  if (parts.length < 2) return compact;
  const matchesStore = part => normalizeStoreName(part) === store;
  if (matchesStore(parts.at(-1))) return parts.slice(0, -1).join(" - ").trim();
  if (matchesStore(parts[0])) return parts.slice(1).join(" - ").trim();
  return compact;
}

function productNameTokens(value) {
  return cleanProductName(value).toLowerCase().match(/[a-z0-9]+/g) || [];
}

function chooseBestProductName(candidates, retailer = "") {
  const uuid = /^(?:urn:uuid:)?[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const cleaned = [...new Set((candidates || []).map(value => cleanProductName(value, retailer)).filter(name =>
    name.length >= 3 && name.length <= 240 && !uuid.test(name) &&
    !/\s[-|\u2013\u2014]\s*(?:bing|google|search|zoeken)\s*$/i.test(name)
  ))];
  if (!cleaned.length) return "Productnaam niet gevonden";
  const visible = cleaned[0];
  const visibleTokens = productNameTokens(visible);
  const compatible = cleaned.filter((name, index) => {
    if (index === 0 || visibleTokens.length === 0) return true;
    const tokens = new Set(productNameTokens(name));
    return visibleTokens.every(token => tokens.has(token));
  });
  return compatible.sort((left, right) => {
    const score = name => {
      const tokens = productNameTokens(name);
      const hasModel = tokens.some(token => /[a-z]/.test(token) && /\d/.test(token)) || tokens.some(token => /^\d{2,4}$/.test(token));
      return Math.min(tokens.length, 14) * 10 + Math.min(name.length, 120) / 10 + (hasModel ? 12 : 0);
    };
    return score(right) - score(left);
  })[0];
}

function chooseBestProductTitle(candidates, retailer = "") {
  const name = chooseBestProductName(candidates, retailer);
  const rawTitle = (candidates || []).map(value => String(value || "").replace(/\s+/g, " ").trim())
    .find(value => cleanProductName(value, retailer) === name) || name;
  return { rawTitle, name };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { normalizeStoreName, cleanProductName, productNameTokens, chooseBestProductTitle, chooseBestProductName };
}
