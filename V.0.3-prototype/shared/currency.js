(function (root) {
  const LocaleParsing = root.ComprLocaleParsing || (typeof require === "function" ? require("./localeParsing.js") : null);
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

  function inferCountryCode() {
    let locale;
    try { locale = new Intl.Locale(navigator.language || "en"); }
    catch { locale = { region: "" }; }
    const region = String(locale.region || "").toUpperCase();
    if (COUNTRIES.some(country => country.code === region)) return region;
    let timeZone = "";
    try { timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch {}
    const timeZoneCountries = {
      "Europe/Amsterdam":"NL", "Europe/Brussels":"BE", "Europe/Berlin":"DE",
      "Europe/Paris":"FR", "Europe/Madrid":"ES", "Europe/Rome":"IT",
      "Europe/Dublin":"IE", "Europe/Vienna":"AT", "Europe/Lisbon":"PT",
      "Europe/London":"GB", "Europe/Zurich":"CH", "Europe/Warsaw":"PL",
      "Europe/Stockholm":"SE", "Europe/Oslo":"NO", "Europe/Copenhagen":"DK",
      "Europe/Prague":"CZ", "Europe/Budapest":"HU", "Europe/Bucharest":"RO",
      "Asia/Tokyo":"JP", "Australia/Sydney":"AU", "Pacific/Auckland":"NZ"
    };
    return timeZoneCountries[timeZone] || "NL";
  }

  function parseAmount(value) {
    const amount = LocaleParsing.parseAmount(value);
    return amount;
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
    const locales = {
      NL:"nl-NL", BE:"nl-BE", DE:"de-DE", FR:"fr-FR", ES:"es-ES", IT:"it-IT", IE:"en-IE",
      AT:"de-AT", PT:"pt-PT", GB:"en-GB", US:"en-US", CH:"de-CH", CA:"en-CA", AU:"en-AU",
      NZ:"en-NZ", JP:"ja-JP", PL:"pl-PL", SE:"sv-SE", NO:"nb-NO", DK:"da-DK", CZ:"cs-CZ",
      HU:"hu-HU", RO:"ro-RO"
    };
    return new Intl.NumberFormat(locales[countryCode] || "en-US", {
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
    inferCountryCode,
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
