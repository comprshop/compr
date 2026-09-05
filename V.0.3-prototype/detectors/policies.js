function asArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function cleanPolicyText(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text || text.length < 3 || text.length > 180) return null;
  return text;
}

function formatDuration(value) {
  if (!value) return null;
  if (typeof value === "number") return `${value} day${value === 1 ? "" : "s"}`;
  const text = String(value);
  const match = text.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?)?$/i);
  if (!match) return cleanPolicyText(text);
  const days = Number(match[1] || 0);
  const hours = Number(match[2] || 0);
  if (days) return `${days} day${days === 1 ? "" : "s"}`;
  if (hours) return `${hours} hour${hours === 1 ? "" : "s"}`;
  return null;
}

function getDeliveryFromJsonLd(product) {
  for (const offer of [...asArray(product?.offers), product].filter(Boolean)) {
    for (const shipping of asArray(offer?.shippingDetails)) {
      const handling = shipping?.deliveryTime?.handlingTime;
      const transit = shipping?.deliveryTime?.transitTime;
      const min = formatDuration(transit?.minValue ?? handling?.minValue);
      const max = formatDuration(transit?.maxValue ?? handling?.maxValue);
      if (min && max && min !== max) return `${min} – ${max}`;
      if (max || min) return max || min;
    }
  }
  return null;
}

function getReturnFromJsonLd(product) {
  const policies = [product?.hasMerchantReturnPolicy, product];
  for (const offer of asArray(product?.offers)) policies.push(offer?.hasMerchantReturnPolicy);
  for (const policy of policies.filter(Boolean)) {
    const days = Number(policy?.merchantReturnDays);
    if (Number.isFinite(days) && days > 0) return `${days}-day returns`;
    const category = String(policy?.returnPolicyCategory || "");
    if (/FiniteReturnWindow/i.test(category)) return "Return window available";
    if (/MerchantReturnNotPermitted/i.test(category)) return "Returns not permitted";
    if (/UnlimitedWindow/i.test(category)) return "Unlimited return window";
  }
  return null;
}

function findInAllJsonLd(kind) {
  if (typeof document === "undefined") return null;
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const root = JSON.parse(script.textContent);
      const queue = [root];
      const seen = new Set();
      while (queue.length) {
        const item = queue.shift();
        if (!item || typeof item !== "object" || seen.has(item)) continue;
        seen.add(item);
        const result = kind === "delivery"
          ? getDeliveryFromJsonLd(item)
          : getReturnFromJsonLd(item);
        if (result) return result;
        queue.push(...Object.values(item).filter(value => value && typeof value === "object"));
      }
    } catch {
      // Broken structured data from a webshop is ignored.
    }
  }
  return null;
}

function findVisiblePolicy(kind) {
  const config = kind === "delivery"
    ? {
        selectors: ['[class*="delivery" i]', '[id*="delivery" i]', '[class*="shipping" i]', '[id*="shipping" i]',
          'a[href*="delivery" i]', 'a[href*="shipping" i]', 'a[href*="bezorg" i]'],
        pattern: /\b(delivery|shipping|levertijd|bezorg(?:d|ing)|morgen (?:in huis|bezorgd)|vandaag besteld|voor .{0,25} besteld|arrives?|get it by|business days?|working days?|werkdagen?)\b/i
      }
    : {
        selectors: ['[class*="return" i]', '[id*="return" i]', '[class*="retour" i]', '[id*="retour" i]',
          'a[href*="return" i]', 'a[href*="retour" i]', 'a[href*="ruilen" i]'],
        pattern: /\b(return|returns|returning|retour|ruilen|bedenktijd|herroepingsrecht|terugsturen|dagen? retourneren)\b/i
      };

  for (const selector of config.selectors) {
    for (const element of document.querySelectorAll(selector)) {
      const text = cleanPolicyText(element.innerText || element.textContent);
      if (text && config.pattern.test(text)) return text;
    }
  }

  for (const element of document.querySelectorAll('[aria-label], [title]')) {
    const text = cleanPolicyText(`${element.getAttribute("aria-label") || ""} ${element.getAttribute("title") || ""}`);
    if (text && config.pattern.test(text)) return text;
  }

  const shadowRoots = [];
  for (const element of document.querySelectorAll("*")) {
    if (element.shadowRoot) shadowRoots.push(element.shadowRoot);
  }
  for (const root of shadowRoots) {
    const lines = String(root.textContent || "").split(/\n+/).map(cleanPolicyText).filter(Boolean);
    const match = lines.find(line => config.pattern.test(line));
    if (match) return match;
  }


  const lines = String(document.body?.innerText || "")
    .split(/\n+/)
    .map(cleanPolicyText)
    .filter(Boolean);
  for (const line of lines) {
    if (config.pattern.test(line)) return line;
  }
  return null;
}

function getStorePolicyFallback(hostname, pageText, kind) {
  const host = String(hostname || "").replace(/^www\./, "").toLowerCase();
  const text = String(pageText || "").replace(/\s+/g, " ");

  if (/(^|\.)coolblue\.nl$/.test(host)) {
    if (kind === "return") return "30 dagen gratis ruilen of retourneren";
    if (/op voorraad/i.test(text)) return "Op voorraad · bezorgmoment bij afrekenen";
    return "Bezorgmoment wordt bij afrekenen berekend";
  }

  if (/(^|\.)nike\.com$/.test(host)) {
    if (kind === "return") return "Retourneren binnen 30 dagen (uitzonderingen mogelijk)";
    return "Bezorgmoment wordt bij afrekenen berekend";
  }

  return null;
}

function getStorePolicies(jsonProduct) {
  const pageText = document.body?.innerText || "";
  const hostname = window.location.hostname;
  return {
    deliveryTime: getDeliveryFromJsonLd(jsonProduct) || findInAllJsonLd("delivery") ||
      findVisiblePolicy("delivery") || getStorePolicyFallback(hostname, pageText, "delivery") || null,
    returnPolicy: getReturnFromJsonLd(jsonProduct) || findInAllJsonLd("return") ||
      findVisiblePolicy("return") || getStorePolicyFallback(hostname, pageText, "return") || null
  };
}

if (typeof module !== "undefined") {
  module.exports = { formatDuration, getDeliveryFromJsonLd, getReturnFromJsonLd, getStorePolicyFallback };
}
