var COMPR_COUPON_CONTEXT = /\b(kortingscode|actiecode|promocode|promo code|coupon code|discount code|voucher code|gebruik code|use code|apply code)\b/i;
var COMPR_COUPON_STOPWORDS = new Set([
  "KORTING", "DISCOUNT", "PROMOCODE", "COUPON", "VOUCHER", "CHECKOUT",
  "MEMBER", "MEMBERS", "GRATIS", "FREE", "DELIVERY", "SHIPPING",
  "WAARMEE", "NIET", "VOOR", "INVOEREN", "GEBRUIK", "DEZE", "CODE",
  "SHOP", "BESTEL", "ACTIE", "AANBIEDING", "KOPEN", "MANDJE"
]);

function normalizeDiscountCode(value, requireDigit = false) {
  const code = String(value || "").trim().replace(/^["'`]|["'`,.;:]$/g, "").toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_-]{3,23}$/.test(code)) return null;
  if (COMPR_COUPON_STOPWORDS.has(code) || /^\d+$/.test(code)) return null;
  if (requireDigit && !/\d/.test(code)) return null;
  return code;
}

function extractCodeFromText(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!COMPR_COUPON_CONTEXT.test(clean)) return null;
  const patterns = [
    /(?:kortingscode|actiecode|promocode|promo code|coupon code|discount code|voucher code|gebruik code|use code|apply code)\s*(?:is|:|-)?\s*["'`]?([a-z0-9][a-z0-9_-]{3,23})/i,
    /\bcode\s*["'`:=-]+\s*([a-z0-9][a-z0-9_-]{3,23})/i
  ];
  for (const pattern of patterns) {
    const code = normalizeDiscountCode(clean.match(pattern)?.[1], true);
    if (code) return code;
  }
  return null;
}

function describeDiscount(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  const percent = clean.match(/\b(\d{1,2})\s*%\s*(?:off|korting)?/i);
  if (percent) return `${percent[1]}% off`;
  const amount = clean.match(/(?:€|EUR\s*)\s?(\d+(?:[.,]\d{1,2})?)\s*(?:off|korting)?/i);
  if (amount) return `€${amount[1].replace(",", ".")} off`;
  const currencyAmount = clean.match(/([$£])\s?(\d+(?:[.,]\d{1,2})?)\s*off/i);
  if (currencyAmount) return `${currencyAmount[1]}${currencyAmount[2]} off`;
  if (/\b(gratis verzending|gratis bezorging|free shipping|free delivery)\b/i.test(clean)) return "Free delivery";
  return "Possible discount code";
}

function extractDealFromText(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean || clean.length > 180 || COMPR_COUPON_CONTEXT.test(clean) || extractCodeFromText(clean)) return null;
  const percent = clean.match(/\b\d{1,2}%\s*(?:off|korting)(?:\s+(?:op|on)\s+[a-z0-9][a-z0-9 -]{1,55})?/i);
  if (percent) return percent[0].replace(/^./, value => value.toUpperCase());
  const delivery = clean.match(/\b(?:gratis verzending|gratis bezorging|free shipping|free delivery)(?:\s+(?:vanaf|over)\s+(?:€|EUR|\$|£)?\s?\d+(?:[.,]\d{1,2})?)?/i);
  if (delivery) return delivery[0].replace(/^./, value => value.toUpperCase());
  return null;
}

function findCurrentDeals(root = document) {
  const deals = [];
  const seen = new Set();
  const selectors = ['[class*="promo" i]', '[class*="offer" i]', '[class*="deal" i]', '[class*="discount" i]', '[data-promotion]'];
  for (const selector of selectors) {
    for (const element of root.querySelectorAll(selector)) {
      const deal = extractDealFromText(element.innerText || element.textContent || "");
      const key = deal?.toLowerCase();
      if (!deal || seen.has(key)) continue;
      seen.add(key);
      deals.push({ description: deal, source: window.location.href, checkedAt: Date.now() });
    }
  }
  return deals.slice(0, 4);
}

function collectDiscountCodes(root, sourceUrl, results, seen) {
  const selectors = [
    '[data-coupon-code]', '[data-promo-code]', '[data-discount-code]',
    '[class*="coupon" i]', '[class*="promo" i]', '[class*="voucher" i]',
    '[id*="coupon" i]', '[id*="promo" i]', '[aria-label*="code" i]'
  ];

  function add(code, description) {
    const normalized = normalizeDiscountCode(code);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    results.push({
      code: normalized,
      description: describeDiscount(description),
      source: sourceUrl,
      checkedAt: Date.now()
    });
  }

  for (const selector of selectors) {
    for (const element of root.querySelectorAll(selector)) {
      const direct = element.dataset?.couponCode || element.dataset?.promoCode || element.dataset?.discountCode;
      const text = element.innerText || element.textContent || element.getAttribute?.("aria-label") || "";
      add(direct || extractCodeFromText(text), text);
    }
  }

  for (const line of String(root.body?.innerText || root.body?.textContent || root.textContent || "").split(/\n+/)) {
    if (line.length > 220) continue;
    add(extractCodeFromText(line), line);
  }

}

async function findOfficialDiscountCodes() {
  const results = [];
  const seen = new Set();
  collectDiscountCodes(document, window.location.href, results, seen);

  const promotionPattern = /(promo|promotion|actie|korting|coupon|voucher|discount|aanbied)/i;
  const links = [];
  const urls = new Set();
  for (const anchor of document.querySelectorAll("a[href]")) {
    try {
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || !/^https?:$/.test(url.protocol)) continue;
      const clue = `${url.pathname} ${anchor.textContent || ""}`;
      if (!promotionPattern.test(clue) || urls.has(url.href)) continue;
      urls.add(url.href);
      links.push(url.href);
    } catch {
      // Invalid links are ignored.
    }
  }

  await Promise.allSettled(links.slice(0, 3).map(async url => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    try {
      const response = await fetch(url, { credentials: "omit", signal: controller.signal });
      if (!response.ok || !String(response.headers.get("content-type") || "").includes("text/html")) return;
      const html = await response.text();
      const page = new DOMParser().parseFromString(html.slice(0, 1_500_000), "text/html");
      collectDiscountCodes(page, url, results, seen);
    } finally {
      clearTimeout(timer);
    }
  }));

  return results.slice(0, 5);
}

if (typeof module !== "undefined") {
  module.exports = { normalizeDiscountCode, extractCodeFromText, describeDiscount, extractDealFromText };
}
