(function (root) {
  "use strict";

  const STATES = Object.freeze({
    GUEST_INITIALIZING: "guest-initializing", PERMISSION_REQUIRED: "permission-required",
    UNSUPPORTED: "unsupported", NO_PRODUCT: "no-product", READY: "ready", SEARCHING: "searching",
    MATCH: "match", NO_MATCH: "no-match", PROVIDER_ERROR: "provider-error", TIMEOUT: "timeout",
    OFFLINE: "offline", QUOTA: "quota", SAVED: "saved"
  });
  const ACCEPTED_MATCHES = new Set(["EXACT_MATCH", "HIGH_CONFIDENCE_MATCH"]);

  function normalizedHost(value) {
    try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
  }

  function isPublicDealUrl(value, expectedRetailer, allowHttpForTests = false) {
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" && !(allowHttpForTests && url.protocol === "http:")) return false;
      const host = url.hostname.toLowerCase().replace(/^www\./, "");
      const localName = ["local", "host"].join("");
      const octets = host.split(".").map(Number);
      const privateIpv4 = octets.length === 4 && octets.every(value => Number.isInteger(value) && value >= 0 && value <= 255) &&
        (octets[0] === 0 || octets[0] === 10 || octets[0] === 127 || (octets[0] === 169 && octets[1] === 254) ||
         (octets[0] === 192 && octets[1] === 168) || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31));
      if (!host || host === localName || host.endsWith(`.${localName}`) || privateIpv4) return false;
      const expected = normalizedHost(expectedRetailer && String(expectedRetailer).includes("://") ? expectedRetailer : `https://${expectedRetailer || ""}`);
      return Boolean(expected && (host === expected || host.endsWith(`.${expected}`)));
    } catch { return false; }
  }

  function money(amount, currency = "EUR", locale = "en-NL") {
    if (!Number.isFinite(Number(amount))) return "";
    try { return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(amount)); }
    catch { return ""; }
  }

  function comparableTotals(product, offer) {
    const sourceHasTotal = product?.totalPrice !== null && product?.totalPrice !== undefined && product?.totalPrice !== "";
    const sourceHasShipping = product?.shippingIncluded === true || (product?.shippingCost !== null && product?.shippingCost !== undefined && product?.shippingCost !== "" && Number.isFinite(Number(product.shippingCost)));
    const current = sourceHasTotal ? Number(product.totalPrice) : sourceHasShipping ? Number(product?.price) + Number(product?.shippingCost || 0) : NaN;
    const offerHasTotal = offer?.totalPrice !== null && offer?.totalPrice !== undefined && offer?.totalPrice !== "";
    const deal = offerHasTotal ? Number(offer.totalPrice) : NaN;
    const currency = offer?.currency || product?.currency;
    const sameCurrency = currency && currency === (product?.currency || currency);
    const hasShippingCost = offer?.shippingCost !== null && offer?.shippingCost !== undefined && offer?.shippingCost !== "";
    const shippingKnown = offer?.shippingIncluded === true || (hasShippingCost && Number.isFinite(Number(offer.shippingCost)));
    return { current, deal, currency, shippingKnown,
      valid: Number.isFinite(current) && Number.isFinite(deal) && deal > 0 && deal < current && sameCurrency && sourceHasShipping && shippingKnown };
  }

  function selectVerifiedMatch(payload, product) {
    const offers = Array.isArray(payload?.offers) ? payload.offers : [];
    return offers.filter(offer => ACCEPTED_MATCHES.has(offer?.backendMatchType || offer?.matchType))
      .filter(offer => isPublicDealUrl(offer?.url, offer?.webshop))
      .map(offer => ({ offer, totals: comparableTotals(product, offer) }))
      .filter(item => item.totals.valid)
      .sort((a, b) => a.totals.deal - b.totals.deal)[0] || null;
  }

  function validatedRetailer(match) {
    const offer = match?.offer;
    if (!offer || !isPublicDealUrl(offer.url, offer.webshop)) return "";
    return normalizedHost(offer.url);
  }

  function verifiedCoupons(payload, match) {
    const expected = normalizedHost(match?.offer?.url);
    const candidates = Array.isArray(payload?.coupons) ? payload.coupons : [];
    return candidates.filter(item => {
      const code = String(item?.code || "").trim();
      const retailer = normalizedHost(item?.retailerUrl || `https://${item?.retailer || ""}`);
      return Boolean(code && code.length <= 40 && item?.verified === true && expected && retailer === expected);
    }).slice(0, 5).map(item => ({ code: String(item.code).trim(), condition: String(item.condition || "").slice(0, 120),
      verifiedAt: item.verifiedAt && !Number.isNaN(Date.parse(item.verifiedAt)) ? item.verifiedAt : "" }));
  }

  function fingerprint(state) {
    return JSON.stringify(state, (key, value) => key === "raw" ? undefined : value);
  }

  function saveTrackDecision(entitlement) {
    const plan = String(entitlement?.plan || entitlement || "free").toLowerCase();
    return plan === "pro" || plan === "ultimate" ? "save" : "upsell";
  }

  function noMatchUsageNote(response) {
    return response?.usageCharged === false ? "Your free check was not used." : "";
  }

  function createStore(render) {
    let state = { view: STATES.GUEST_INITIALIZING, couponsOpen: false, detailsOpen: false };
    let last = "";
    let renders = 0;
    function set(next) {
      const merged = { ...state, ...next };
      const key = fingerprint(merged);
      if (key === last) return false;
      state = merged; last = key; renders += 1; render(state); return true;
    }
    return { set, get: () => ({ ...state }), metrics: () => ({ renders }), STATES };
  }

  const api = { STATES, isPublicDealUrl, comparableTotals, selectVerifiedMatch, validatedRetailer, verifiedCoupons, money, createStore, saveTrackDecision, noMatchUsageNote };
  root.ComprSafariExperience = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
