// Shared parsing contract. Keep the frontend and backend copies byte-identical.
(function (root) {
  function normalize(value) { return String(value ?? "").toLowerCase().replace(/ß/g, "ss").normalize("NFKD").replace(/[\u0300-\u036f]/g, ""); }
  const currencyPattern = /(?:EUR|GBP|USD|JPY|CHF|CAD|AUD|NZD|PLN|SEK|NOK|DKK|CZK|HUF|RON|€|£|\$|¥|₣|kr|zł|Kč|Ft|lei)/gi;
  function currency(value) {
    const text = String(value ?? "");
    const found = new Set((text.match(/\b(?:EUR|GBP|USD|JPY|CHF|CAD|AUD|NZD|PLN|SEK|NOK|DKK|CZK|HUF|RON)\b/gi) || []).map(v => v.toUpperCase()));
    for (const [symbol, code] of [["€","EUR"],["£","GBP"],["$","USD"],["¥","JPY"]]) if (text.includes(symbol)) found.add(code);
    return found.size === 1 ? [...found][0] : null;
  }
  function parseAmount(value) {
    if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null;
    if (value === null || value === undefined) return null;
    const original = String(value).trim();
    if (!original || /-/.test(original)) return null;
    const codes = original.match(currencyPattern) || [];
    if (new Set(codes.map(v => currency(v) || v.toUpperCase())).size > 1) return null;
    let text = original.replace(currencyPattern, "").trim().replace(/[\u00a0\u202f]/g, " ");
    if (!/^\d[\d., ]*$/.test(text)) return null;
    let decimal = "";
    const last = Math.max(text.lastIndexOf("."), text.lastIndexOf(","));
    if (last >= 0 && /^\d{1,2}$/.test(text.slice(last + 1))) decimal = text[last];
    const integer = decimal ? text.slice(0, last) : text;
    const fraction = decimal ? text.slice(last + 1) : "";
    // Grouping must be consistent, in groups of three; never strip arbitrary text.
    if (!/^\d+$/.test(integer) && !/^\d{1,3}([., ])\d{3}(?:\1\d{3})*$/.test(integer)) return null;
    if (decimal && integer.includes(decimal)) return null;
    const amount = Number(integer.replace(/[., ]/g, "") + (fraction ? "." + fraction : ""));
    return Number.isFinite(amount) && amount >= 0 ? amount : null;
  }
  function priceEvidence(value) {
    const text = String(value || "");
    if (recurringPrice(text)) return null;
    const number = "[0-9]+(?:[., \\u00a0\\u202f][0-9]+)*";
    const matches = [...text.matchAll(new RegExp("(?:€|£|EUR\\b|GBP\\b)\\s*(" + number + ")|(" + number + ")\\s*(?:€|£|EUR\\b|GBP\\b)", "gi"))];
    const prices = matches.filter(m => !/\b(?:boven|vanaf|above|from|ab|uber|des|desde|oltre|a partir de|a partire da)\s*(?:de\s*)?$/.test(normalize(text.slice(Math.max(0, m.index - 25), m.index))))
      .map(m => ({ amount: parseAmount(m[0]), currency: currency(m[0]) })).filter(p => p.amount > 0 && p.currency);
    // Multiple distinct prices in a snippet are ambiguous (old/from/installment prices).
    const unique = new Map(prices.map(p => [p.currency + ":" + p.amount, p]));
    return unique.size === 1 ? [...unique.values()][0] : null;
  }
  function freeShipping(value, itemPrice, itemCurrency) {
    const text = normalize(value);
    const free = text.match(/\b(?:gratis|free)\s+(?:standaard\s+)?(?:verzending|bezorging|bezorgd|verzonden|shipping|delivery)\b|\b(?:delivered free|free delivered|geen verzendkosten|kostenloser versand|kostenlose lieferung|versandkostenfrei|livraison gratuite|expedition gratuite|frais de port offerts|envio gratis|entrega gratuita|gastos de envio gratis|spedizione gratuita|consegna gratuita)\b/);
    if (!free) return {};
    const evidence = text.slice(Math.max(0, free.index - 60), free.index + free[0].length + 140);
    if (/\b(?:leden|members?|membership|clubleden|abonnement|mitglieder|mitgliedschaft|membres?|abonnes?|socios?|miembros?|abbonati|iscritti|non|not|niet|kein|keine|pas|no)\b/.test(evidence)) return {};
    const threshold = evidence.match(/\b(?:boven|vanaf|over|above|from|ab|uber|a partir de|des|desde|superior a|a partire da|oltre)\s*(?:de\s*)?(?:€|£|eur|gbp)?\s*(\d[\d., ]*)/);
    const conditional = /\b(?:boven|vanaf|over|above|from|ab|uber|a partir de|des|desde|superior a|a partire da|oltre|bestellwert|commandes?|pedidos?|ordini|orders?|bestellingen)\b/.test(evidence);
    if (conditional && !threshold) return {};
    if (threshold) {
      const thresholdCurrency = currency(threshold[0] + (evidence.slice(threshold.index + threshold[0].length).match(/^\s*(?:€|£|EUR|GBP)/i)?.[0] || ""));
      if (thresholdCurrency && (!itemCurrency || thresholdCurrency !== itemCurrency)) return {};
      const minimum = parseAmount(threshold[1].trim());
      if (minimum === null || !Number.isFinite(Number(itemPrice)) || Number(itemPrice) < minimum) return {};
    }
    return { shippingCost: 0, shippingIncluded: true };
  }
  function condition(value) {
    const text = normalize(value).replace(/[^a-z0-9]+/g, " ");
    if (/\b(refurbished|renewed|refurb|gereviseerd|reconditioned|generaluberholt|reconditionne|remis a neuf|reacondicionado|ricondizionato|refurbishedcondition)\b/.test(text)) return "refurbished";
    if (/\b(used|pre owned|preowned|tweedehands|gebruikt|gebraucht|occasion|usado|segunda mano|usato|usedcondition)\b/.test(text)) return "used";
    if (/\b(open box|open doos|doos geopend|showroommodel|b ware|boite ouverte|caja abierta|scatola aperta)\b/.test(text)) return "open_box";
    if (/^unknown$/.test(text.trim())) return "unknown";
    if (/\b(new|nieuw|brand new|neu|neuf|nuevo|nuovo|newcondition)\b/.test(text)) return "new";
    return "";
  }
  const colorWords = {
    white: "white|wit|weiss|blanc|blanco|bianco", black: "black|zwart|schwarz|noir|negro|nero",
    blue: "blue|blauw|blau|bleu|azul|blu|navy|marineblauw", red: "red|rood|rot|rouge|rojo|rosso",
    green: "green|groen|grun|vert|verde", silver: "silver|zilver|silber|argent|plata|argento",
    gray: "gray|grey|grijs|graphite|grafiet|grau|gris|grigio", beige: "beige",
    pink: "pink|roze|rose|rosa", gold: "gold|goud|golden|dore|oro", brown: "brown|bruin|angora|braun|marron|marrone",
    cream: "cream|creme|incense"
  };
  function colors(value) {
    const text = normalize(value); return new Set(Object.entries(colorWords).filter(([, words]) => new RegExp("\\b(?:" + words + ")\\b").test(text)).map(([name]) => name));
  }
  function market(value) { const country = String(value || "").toUpperCase(); return country === "UK" ? "GB" : /^(NL|BE|DE|FR|ES|IT|GB)$/.test(country) ? country : ""; }
  function countryCode(value) { const code = String(value || "").trim().toUpperCase(); return code === "UK" ? "GB" : /^[A-Z]{2}$/.test(code) ? code : ""; }
  function resolveTargetMarket(product = {}, browserLocale = "") {
    if (Object.prototype.hasOwnProperty.call(product, "targetMarket")) return countryCode(product.targetMarket);
    const region = locale => {
      try { return countryCode(new Intl.Locale(String(locale || "")).region); } catch { return ""; }
    };
    let url;
    try { url = new URL(product.url || product.canonicalUrl); } catch {}
    if (url) {
      const routes = url.pathname.split("/").filter(Boolean).slice(0, 2);
      const hints = routes.map(segment => {
        const localized = segment.match(/^[a-z]{2}[-_]([a-z]{2})$/i);
        return localized ? countryCode(localized[1]) : /^(nl|be|de|fr|es|it|uk|gb)$/i.test(segment) ? countryCode(segment) : "";
      }).filter(Boolean);
      if (hints.length && new Set(hints).size === 1) return hints[0];
    }
    const pageRegion = region(product.pageLocale);
    if (pageRegion) return pageRegion;
    if (url) {
      const tld = url.hostname.match(/\.(nl|be|de|fr|es|it|pl|se)$/i);
      if (tld) return countryCode(tld[1]);
      if (/\.co\.uk$/i.test(url.hostname)) return "GB";
    }
    return region(product.locale ?? browserLocale);
  }
  function searchMarket(product = {}) {
    // Preserve legacy callers without locale metadata; explicit unknown values never become NL.
    return Object.prototype.hasOwnProperty.call(product, "targetMarket") || Object.prototype.hasOwnProperty.call(product, "locale")
      ? market(product.targetMarket) : "NL";
  }
  function commerceTerms(country, locale) {
    if (country === "BE") return /^fr\b/i.test(locale || "") ? "prix acheter" : "prijs kopen";
    return { NL:"prijs kopen", DE:"Preis kaufen", FR:"prix acheter", ES:"precio comprar", IT:"prezzo comprare", GB:"price buy" }[market(country)] || "price buy";
  }
  function incompletePrice(value) { return /^(?:vanaf|from|ab|a partir de|desde|a partire da)\b|\b(?:starting at|as low as)\b/.test(normalize(value).trim()); }
  function recurringPrice(value) { return /\b(?:per month|monthly|per maand|p m|abonnement|subscription|lease|huur|rental|aanbetaling|deposit|monatlich|pro monat|miete|par mois|mensuel|location|por mes|mensual|suscripcion|al mes|alquiler|al mese|mensile|abbonamento|noleggio)\b/.test(normalize(value)); }
  const api = { normalize, parseAmount, currency, priceEvidence, freeShipping, condition, colors, market, countryCode, resolveTargetMarket, searchMarket, commerceTerms, incompletePrice, recurringPrice };
  root.ComprLocaleParsing = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
