importScripts("shared/browserAdapter.js");

const STORAGE_KEY = "savedProducts";
const RATES_KEY = "exchangeRates";
const RATES_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";

function updateBadge() {
  ComprBrowser.storage.local.get([STORAGE_KEY]).then(data => {
    const count = Array.isArray(data[STORAGE_KEY])
      ? data[STORAGE_KEY].length
      : 0;

    ComprBrowser.action.setBadgeBackgroundColor({ color: "#111111" }).catch(() => {});
    ComprBrowser.action.setBadgeText({
      text: count > 0 ? String(Math.min(count, 99)) : ""
    }).catch(() => {});
  }).catch(() => {});
}

ComprBrowser.runtime.onInstalled(updateBadge);
ComprBrowser.runtime.onStartup(updateBadge);
ComprBrowser.storage.onChanged((changes, areaName) => {
  if (areaName === "local" && changes[STORAGE_KEY]) {
    updateBadge();
  }
});

async function refreshExchangeRates(force = false) {
  const cached = await ComprBrowser.storage.local.get([RATES_KEY]);
  const current = cached[RATES_KEY];
  const maxAge = 12 * 60 * 60 * 1000;
  if (!force && current?.fetchedAt && Date.now() - current.fetchedAt < maxAge) return current;

  try {
    const response = await fetch(RATES_URL);
    if (!response.ok) throw new Error(`ECB response ${response.status}`);
    const xml = await response.text();
    const rates = { EUR: 1 };
    for (const match of xml.matchAll(/currency=['"]([A-Z]{3})['"]\s+rate=['"]([0-9.]+)['"]/g)) {
      rates[match[1]] = Number(match[2]);
    }
    const date = xml.match(/time=['"](\d{4}-\d{2}-\d{2})['"]/)?.[1] || null;
    if (Object.keys(rates).length < 5) throw new Error("ECB rates missing");
    const payload = { rates, date, fetchedAt: Date.now() };
    await ComprBrowser.storage.local.set({ [RATES_KEY]: payload });
    return payload;
  } catch {
    return current || { rates: { EUR: 1 }, date: null, fetchedAt: 0 };
  }
}

ComprBrowser.runtime.onMessage((message, sender, sendResponse) => {
  if (sender?.id === ComprBrowser.runtime.id && message?.type === "GET_EXCHANGE_RATES") {
    refreshExchangeRates(Boolean(message.force)).then(sendResponse);
    return true;
  }
});

ComprBrowser.runtime.onInstalled(() => refreshExchangeRates(true));
ComprBrowser.runtime.onStartup(() => refreshExchangeRates());
