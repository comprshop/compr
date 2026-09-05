const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const SEARCH_TIMEOUT_MS = 30000;
const BACKEND_SEARCH_URL = "http://127.0.0.1:8787/api/search";
const searchCache = new Map();

function getSafeResultUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function createSearchResult({
  name = "",
  brand = "",
  price = null,
  currency = "EUR",
  url = "",
  webshop = "",
  image = "",
  productCode = null,
  sku = null,
  mpn = null,
  gtin = null,
  color = null,
  category = null,
  isDemo = false,
  providerLabel = "",
  backendMatchType = "",
  backendConfidence = null,
  backendMatchReasons = []
}) {
  return {
    name,
    brand,
    price,
    currency,
    url: getSafeResultUrl(url),
    webshop,
    image: getSafeResultUrl(image),
    productCode,
    sku,
    mpn,
    gtin,
    color,
    category,
    isDemo,
    providerLabel,
    backendMatchType,
    backendConfidence,
    backendMatchReasons
  };
}

function normalizeSearchResults(results = []) {
  if (!Array.isArray(results)) {
    return [];
  }

  const seen = new Set();
  return results
    .filter(result => result && result.name)
    .map(result =>
      createSearchResult({
        name: result.name,
        brand: result.brand,
        price: result.price,
        currency: result.currency,
        url: result.url,
        webshop: result.webshop,
        image: result.image,
        productCode: result.productCode,
        sku: result.sku,
        mpn: result.mpn,
        gtin: result.gtin,
        color: result.color,
        category: result.category,
        isDemo: Boolean(result.isDemo),
        providerLabel: result.providerLabel || "",
        backendMatchType: result.backendMatchType || "",
        backendConfidence: result.backendConfidence,
        backendMatchReasons: Array.isArray(result.backendMatchReasons) ? result.backendMatchReasons : []
      })
    )
    .filter(result => {
      const key = [result.webshop, result.productCode, result.gtin, result.name, result.price]
        .map(value => String(value || "").toLowerCase())
        .join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function rankSearchResults(product, results = [], options = {}) {
  return normalizeSearchResults(results)
    .map(result => {
      if (options.authoritativeBackend && result.url && Number(result.price) > 0 && !result.isDemo) {
        const backendType = ["EXACT_MATCH", "HIGH_CONFIDENCE_MATCH"]
          .includes(result.backendMatchType) ? result.backendMatchType : "LIKELY_MATCH";
        return {
          ...result,
          matchType: backendType,
          matchConfidence: Number.isFinite(Number(result.backendConfidence)) ? Number(result.backendConfidence) : 0.65,
          matchReasons: result.backendMatchReasons.length ? result.backendMatchReasons : ["Assessed by COMPR secure product matcher"]
        };
      }
      const match = ComprMatcher.compareProducts(
        product,
        result
      );

      return {
        ...result,
        matchType: match.type,
        matchConfidence: match.confidence,
        matchReasons: match.reasons
      };
    })
    .sort(
      (a, b) =>
        b.matchConfidence -
        a.matchConfidence
    );
}

function getExactMatches(product, results = []) {
  return rankSearchResults(product, results)
    .filter(result =>
      result.matchType === "EXACT_MATCH"
    );
}

function findCheapestExactMatch(
  product,
  results = []
) {
  const exactMatches =
    getExactMatches(product, results);

  const matchesWithPrice =
    exactMatches.filter(result => {
      const price = Number(result.price);

      return (
        Number.isFinite(price) &&
        price > 0
      );
    });

  if (!matchesWithPrice.length) {
    return null;
  }

  return matchesWithPrice.reduce(
    (cheapest, current) => {
      if (
        Number(current.price) <
        Number(cheapest.price)
      ) {
        return current;
      }

      return cheapest;
    }
  );
}

function getSearchPlan(product) {
  const queries =
    buildProductSearchQueries(product);

  return {
    exactQuery: queries.exact,
    fallbackQuery: queries.fallback,

    identifiers: {
      productCode:
        product?.productCode || null,

      sku:
        product?.sku || null,

      mpn:
        product?.mpn || null,

      gtin:
        product?.gtin || null
    },

    brand:
      product?.brand || null,

    category:
      product?.category || null
  };
}

function summarizeResults(results = []) {
  return results.reduce((summary, result) => {
    const key = ({
      EXACT_MATCH: "exact",
      HIGH_CONFIDENCE_MATCH: "exact",
      LIKELY_MATCH: "likely",
      POSSIBLE_MATCH: "similar",
      LIKELY_SAME: "likely",
      SIMILAR: "similar",
      NO_MATCH: "rejected"
    })[result.matchType] || "rejected";
    summary[key] += 1;
    return summary;
  }, { exact: 0, likely: 0, similar: 0, rejected: 0 });
}

function withTimeout(promise, timeoutMs = SEARCH_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const error = new Error("Search provider timed out");
      error.code = "SEARCH_TIMEOUT";
      reject(error);
    }, timeoutMs);
    Promise.resolve(promise).then(
      value => { clearTimeout(timer); resolve(value); },
      error => { clearTimeout(timer); reject(error); }
    );
  });
}

async function searchBackend(product, options = {}) {
  if (options.secureApi && typeof ComprApi !== "undefined") {
    let payload;
    try {
      payload = await ComprApi.search({
        name: product?.name || "", brand: product?.brand || "",
        category: product?.category || "", color: product?.color || "",
        material: product?.material || "", size: product?.selectedSize || product?.size || "",
        condition: product?.condition || "", capacity: product?.capacity || "",
        storage: product?.storage || "", screenSize: product?.screenSize || "",
        productCode: product?.productCode || null, sku: product?.sku || null,
        mpn: product?.mpn || null, gtin: product?.gtin || null,
        price: Number(product?.convertedAmount) || Number(product?.numericPrice) || null,
        currency: product?.convertedCurrency || product?.currency || "EUR",
        url: product?.url || null, webshop: product?.webshop || null
      }, options.requestId || crypto.randomUUID(), { signal: options.signal });
    } catch (error) {
      if (["NO_RESULTS_FROM_PROVIDER", "NO_CONFIDENT_MATCH", "INSUFFICIENT_PRODUCT_DATA", "PRICE_NOT_COMPARABLE"].includes(error?.code)) {
        return { provider: "compr-secure-api", mode: "live-web", results: [], cached: false,
          usageCharged: false, requestId: options.requestId || null, outcome: error.code };
      }
      throw error;
    }
    return { provider: payload.provider || "compr-secure-api", mode: payload.mode || "live-web",
      results: payload.offers || [], cached: Boolean(payload.cached), usageCharged: Boolean(payload.usageCharged),
      requestId: payload.requestId || null, outcome: payload.outcome || null };
  }
  const fetchImplementation = options.fetchImplementation || fetch;
  const response = await withTimeout(fetchImplementation(BACKEND_SEARCH_URL, {
    method: "POST",
    signal: options.signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      product: {
        name: product?.name || "", brand: product?.brand || "",
        category: product?.category || "", color: product?.color || "",
        material: product?.material || "", size: product?.selectedSize || product?.size || "",
        condition: product?.condition || "", capacity: product?.capacity || "",
        storage: product?.storage || "", screenSize: product?.screenSize || "",
        productCode: product?.productCode || null, sku: product?.sku || null,
        mpn: product?.mpn || null, gtin: product?.gtin || null,
        price: Number(product?.convertedAmount) || Number(product?.numericPrice) || null,
        currency: product?.convertedCurrency || product?.currency || "EUR",
        url: product?.url || null, webshop: product?.webshop || null
      }
    })
  }), options.timeoutMs || SEARCH_TIMEOUT_MS);
  if (!response.ok) throw new Error(`Backend returned ${response.status}`);
  const payload = await response.json();
  if (!payload || !Array.isArray(payload.offers)) throw new Error("Invalid backend response");
  return { provider: payload.provider || "backend", mode: payload.mode || "unknown", results: payload.offers,
    engineVersion: payload.engineVersion || null, queriesUsed: payload.queriesUsed || 0,
    pagesChecked: payload.pagesChecked || 0, directCandidatesChecked: payload.directCandidatesChecked || 0 };
}

async function findExactProduct(product, options = {}) {
  const plan = getSearchPlan(product);
  const query = plan.exactQuery || plan.fallbackQuery;
  const cacheKey = query.toLowerCase();
  const cached = searchCache.get(cacheKey);
  const useBackend = options.useBackend ?? (typeof window !== "undefined");
  const secureSession = useBackend && typeof ComprAuth !== "undefined"
    ? await ComprAuth.getSession().catch(() => null) : null;
  if (useBackend && !secureSession) {
    const error = new Error("Sign in to continue");
    error.code = "AUTH_REQUIRED";
    throw error;
  }
  const secureApi = Boolean(secureSession);
  const cacheMatchesSource = secureApi ? cached?.secureApi === true : (!useBackend || (cached?.backendConnected && !cached?.secureApi));
  if (!options.force && cacheMatchesSource && cached && Date.now() - cached.searchedAt < SEARCH_CACHE_TTL_MS) {
    return { ...cached, cached: true };
  }

  let provider = "local-demo-catalog";
  let mode = "offline-demo";
  let backendConnected = false;
  let rawResults;
  if (useBackend) {
    try {
      const backend = await searchBackend(product, { ...options, secureApi });
      rawResults = backend.results;
      provider = backend.provider;
      mode = backend.mode;
      backendConnected = true;
      var backendDiagnostics = {
        engineVersion: backend.engineVersion,
        queriesUsed: backend.queriesUsed,
        pagesChecked: backend.pagesChecked,
        directCandidatesChecked: backend.directCandidatesChecked,
        usageCharged: backend.usageCharged,
        requestId: backend.requestId,
        outcome: backend.outcome
      };
    } catch (error) {
      if (secureApi) throw error;
      console.warn("COMPR development backend unavailable; using offline demo", error);
    }
  }
  if (!rawResults) {
    if (typeof ComprRuntimeConfig !== "undefined" && ComprRuntimeConfig.mode === "production") {
      const error = new Error("COMPR search service is unavailable");
      error.code = "SEARCH_PROVIDER_ERROR";
      throw error;
    }
    rawResults = await withTimeout(ComprDemoCatalog.search(product));
  }
  const results = rankSearchResults(product, rawResults, { authoritativeBackend: secureApi && backendConnected });
  const response = {
    provider,
    mode,
    backendConnected,
    secureApi,
    query,
    fallbackQuery: plan.fallbackQuery,
    results,
    cheapestExactMatch: results.filter(result => result.matchType === "EXACT_MATCH" && Number(result.price) > 0)
      .sort((a, b) => Number(a.price) - Number(b.price))[0] || null,
    summary: summarizeResults(results),
    searchedAt: Date.now(),
    cached: false
  };
  Object.assign(response, backendDiagnostics || {});
  const hasAcceptedResult = results.some(result =>
    ["EXACT_MATCH", "HIGH_CONFIDENCE_MATCH"].includes(result.matchType));
  if (hasAcceptedResult || !backendConnected) searchCache.set(cacheKey, response);
  return response;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    createSearchResult,
    getSafeResultUrl,
    normalizeSearchResults,
    rankSearchResults,
    getExactMatches,
    findCheapestExactMatch,
    getSearchPlan,
    summarizeResults,
    withTimeout,
    searchBackend,
    findExactProduct
  };
}
