(function (root) {
  const COUNTRIES = [
    ["NL", "Netherlands", "EUR"], ["BE", "Belgium", "EUR"], ["DE", "Germany", "EUR"],
    ["FR", "France", "EUR"], ["ES", "Spain", "EUR"], ["IT", "Italy", "EUR"],
    ["IE", "Ireland", "EUR"], ["AT", "Austria", "EUR"], ["PT", "Portugal", "EUR"],
    ["GB", "United Kingdom", "GBP"], ["US", "United States", "USD"],
    ["CH", "Switzerland", "CHF"], ["CA", "Canada", "CAD"], ["AU", "Australia", "AUD"],
    ["NZ", "New Zealand", "NZD"], ["JP", "Japan", "JPY"], ["PL", "Poland", "PLN"],
    ["SE", "Sweden", "SEK"], ["NO", "Norway", "NOK"], ["DK", "Denmark", "DKK"],
    ["CZ", "Czechia", "CZK"], ["HU", "Hungary", "HUF"], ["RO", "Romania", "RON"]
  ].map(([code, name, currency]) => ({ code, name, currency }));

  function getCurrencyForCountry(countryCode) {
    return COUNTRIES.find(country => country.code === countryCode)?.currency || "EUR";
  }

  function parseAmount(value) {
    const text = String(value || "").trim();
    if (!/\d/.test(text)) return null;
    let numeric = text.replace(/[^\d.,-]/g, "");
    const comma = numeric.lastIndexOf(",");
    const dot = numeric.lastIndexOf(".");
    if (comma > dot) numeric = numeric.replace(/\./g, "").replace(/,/g, ".");
    else if (dot > comma) numeric = numeric.replace(/,/g, "");
    else if (comma >= 0) {
      const decimals = numeric.length - comma - 1;
      numeric = decimals === 3 ? numeric.replace(/,/g, "") : numeric.replace(/,/g, ".");
    } else if (dot >= 0) {
      const decimals = numeric.length - dot - 1;
      if (decimals === 3) numeric = numeric.replace(/\./g, "");
    }
    const amount = Number.parseFloat(numeric);
    return Number.isFinite(amount) ? amount : null;
  }

  function detectCurrency(value, explicitCurrency) {
    if (explicitCurrency) return String(explicitCurrency).toUpperCase();
    const text = String(value || "").toUpperCase();
    if (text.includes("€") || /\bEUR\b/.test(text)) return "EUR";
    if (text.includes("£") || /\bGBP\b/.test(text)) return "GBP";
    if (text.includes("¥") || /\bJPY\b/.test(text)) return "JPY";
    if (/\bCHF\b/.test(text)) return "CHF";
    if (/\bCAD\b/.test(text)) return "CAD";
    if (/\bAUD\b/.test(text)) return "AUD";
    if (/\bNZD\b/.test(text)) return "NZD";
    if (/\bPLN\b/.test(text) || text.includes("ZŁ")) return "PLN";
    if (/\bSEK\b/.test(text)) return "SEK";
    if (/\bNOK\b/.test(text)) return "NOK";
    if (/\bDKK\b/.test(text)) return "DKK";
    if (/\bCZK\b/.test(text) || text.includes("KČ")) return "CZK";
    if (/\bHUF\b/.test(text)) return "HUF";
    if (/\bRON\b/.test(text)) return "RON";
    if (/\bUSD\b/.test(text) || text.includes("$")) return "USD";
    return null;
  }

  function convert(amount, fromCurrency, toCurrency, rates) {
    if (!Number.isFinite(amount) || !fromCurrency || !toCurrency) return null;
    if (fromCurrency === toCurrency) return amount;
    const fromRate = fromCurrency === "EUR" ? 1 : Number(rates?.[fromCurrency]);
    const toRate = toCurrency === "EUR" ? 1 : Number(rates?.[toCurrency]);
    if (!fromRate || !toRate) return null;
    return (amount / fromRate) * toRate;
  }

  function format(amount, currency, countryCode) {
    return new Intl.NumberFormat(countryCode === "US" ? "en-US" : "en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "JPY" ? 0 : 2
    }).format(amount);
  }

  function getConvertedPrice(product, currency, countryCode, rates) {
    const amount = parseAmount(product?.price);
    const sourceCurrency = detectCurrency(product?.price, product?.currency);
    const converted = convert(amount, sourceCurrency, currency, rates);
    return converted === null ? null : {
      amount: converted,
      formatted: format(converted, currency, countryCode),
      sourceCurrency
    };
  }

  function requestExchangeRates() {
    return ComprBrowser.storage.local.get(["exchangeRates"]).then(async data => {
      const cached = data.exchangeRates;
      const maxAge = 12 * 60 * 60 * 1000;
      if (cached?.fetchedAt && Date.now() - cached.fetchedAt < maxAge) return cached;

      try {
        const response = await fetch(
          "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"
        );
        if (!response.ok) throw new Error(`ECB response ${response.status}`);
        const xml = await response.text();
        const rates = { EUR: 1 };
        for (const match of xml.matchAll(/currency=['"]([A-Z]{3})['"]\s+rate=['"]([0-9.]+)['"]/g)) {
          rates[match[1]] = Number(match[2]);
        }
        if (Object.keys(rates).length < 5) throw new Error("ECB rates missing");
        const payload = {
          rates,
          date: xml.match(/time=['"](\d{4}-\d{2}-\d{2})['"]/)?.[1] || null,
          fetchedAt: Date.now()
        };
        await ComprBrowser.storage.local.set({ exchangeRates: payload });
        return payload;
      } catch {
        return cached || { rates: { EUR: 1 }, date: null, fetchedAt: 0 };
      }
    });
  }

  const api = {
    COUNTRIES,
    getCurrencyForCountry,
    parseAmount,
    detectCurrency,
    convert,
    format,
    getConvertedPrice,
    requestExchangeRates
  };
  root.ComprCurrency = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
