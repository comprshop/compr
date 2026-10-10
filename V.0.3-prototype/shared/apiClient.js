const ComprApi = (() => {
  async function request(path, options = {}) {
    const session = await ComprAuth.getSession();
    if (!session) {
      const error = new Error("Authentication required"); error.code = "AUTH_REQUIRED"; throw error;
    }
    const response = await fetch(`${ComprRuntimeConfig.apiBaseUrl}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`,
        ...(options.headers || {}) }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const payloadError = payload?.error;
      const message = typeof payloadError === "string" ? payloadError : payloadError?.message;
      const error = new Error(message || "COMPR API request failed");
      error.code = response.status === 401 ? "AUTH_REQUIRED" :
        response.status === 403 && message === "Origin not allowed" ? "ORIGIN_NOT_ALLOWED" :
        payloadError?.code || "API_ERROR";
      error.status = response.status;
      error.details = typeof payloadError === "object" ? payloadError?.details : undefined;
      if (error.code === "AUTH_REQUIRED") await ComprAuth.clearSession({ clearNative: true });
      throw error;
    }
    return payload;
  }
  // Persist request identity before sending: retries/reopening recover the same pending result.
  const inFlight = new Map();
  const cooldowns = new Map();
  let currentCooldown=0;
  const SAFETY_CODES=new Set(['SEARCH_COOLDOWN','SEARCH_SAFETY_LIMIT','SEARCH_GLOBAL_BUDGET','SEARCH_PROVIDER_BUDGET','SEARCH_BUDGET_NOT_CONFIGURED','SEARCH_IN_PROGRESS']);
  function safetyMessage(error) {
    if(!SAFETY_CODES.has(error?.code))return null;
    const seconds=Math.max(1,Math.ceil(Number(error?.details?.retryAfterSeconds)||10));
    return {title:'Search paused',copy:'Your successful checks have not been used.',seconds};
  }
  function cooldownSeconds(){return Math.max(0,Math.ceil((currentCooldown-Date.now())/1000));}
  // Web Locks serialize storage claims/cleanup across popup and Compare documents.
  // The local queue is only for environments without browser globals (offline tests).
  const storageQueues = new Map();
  function locked(name, work) {
    if (typeof navigator !== "undefined") {
      if (navigator.locks?.request) return navigator.locks.request(name, work);
      const error = new Error("Safe request coordination is unavailable");
      error.code = "SEARCH_IN_PROGRESS"; return Promise.reject(error);
    }
    const previous = storageQueues.get(name) || Promise.resolve();
    const next = previous.catch(() => {}).then(work);
    storageQueues.set(name, next);
    return next.finally(() => { if (storageQueues.get(name) === next) storageQueues.delete(name); });
  }
  function canonicalUrl(value) {
    try { const url = new URL(String(value || "")); url.hash = ""; return url.href; }
    catch { return String(value || "").trim(); }
  }
  function legacyBinding(product) {
    const fields = ["brand","model","modelTokens","mpn","productCode","ean","gtin","color","size","capacity","targetMarket","locale"];
    return JSON.stringify(fields.map(key => product[key] ?? null));
  }
  function binding(product) {
    // A recoverable action belongs to one concrete page/product context.
    return JSON.stringify([canonicalUrl(product.url), legacyBinding(product)]);
  }
  function contextBinding(context, product) {
    const supplied = context && typeof context === "object" ? context : {};
    return JSON.stringify([supplied.source || "unknown", supplied.tabId ?? null,
      canonicalUrl(supplied.tabUrl || product.url), supplied.fingerprint || binding(product)]);
  }
  const terminalCodes = new Set(["NO_CONFIDENT_MATCH","NO_RESULTS_FROM_PROVIDER","PRICE_NOT_COMPARABLE",
    "INSUFFICIENT_PRODUCT_DATA","SEARCH_PROVIDER_ERROR","MALFORMED_PROVIDER_RESPONSE","SEARCH_TIMEOUT",
    "REQUEST_EXPIRED","RESULT_EXPIRED","RESERVATION_EXPIRED","SEARCH_SAFETY_LIMIT","SEARCH_GLOBAL_BUDGET",
    "SEARCH_PROVIDER_BUDGET","SEARCH_BUDGET_NOT_CONFIGURED","SEARCH_LIMIT_REACHED"]);
  function actionScope(owner) { return `${ComprRuntimeConfig.authProjectRef || "default"}:${owner}`; }
  function actionIndex(scope, id) { return `comprSearchActionIndex:${scope}:${id}`; }
  async function finishAction(storage, scope, id) {
    if (!storage) return;
    await locked(`comprSearchAction:${scope}`, async () => {
      const index = actionIndex(scope, id);
      const key = (await storage.get([index]))[index];
      if (key) {
        const current = (await storage.get([key]))[key];
        // A late response/confirmation never removes a newer action.
        if (current?.requestId === id) {
          await storage.set({ [key]: { ...current, state: "completed", completedAt: Date.now() } });
          await storage.remove([key]);
        }
      }
      await storage.remove([index]);
    });
  }
  async function search(product, requestId = crypto.randomUUID(), options = {}) {
    const session = await ComprAuth.getSession();
    if (!session) { const error = new Error("Authentication required"); error.code = "AUTH_REQUIRED"; throw error; }
    const owner = session?.user?.id || session?.user_id;
    if (!owner) { const error = new Error("Account identity required"); error.code = "AUTH_REQUIRED"; throw error; }
    const storage = typeof ComprBrowser !== "undefined" ? ComprBrowser.storage.local : null;
    const scope = actionScope(owner);
    const fresh = ComprProduct.toSearchPayload(product);
    const legacyKey = `comprPendingSearch:${ComprRuntimeConfig.authProjectRef ? ComprRuntimeConfig.authProjectRef + ":" : ""}${owner}:${fresh.url}:${fresh.price}:${fresh.currency}`;
    const context = options.context && typeof options.context === "object" ? {
      source: options.context.source || "unknown", tabId: options.context.tabId ?? null,
      tabUrl: canonicalUrl(options.context.tabUrl || fresh.url), fingerprint: options.context.fingerprint || binding(fresh)
    } : null;
    if (context && context.fingerprint !== binding(fresh)) {
      const error = new Error("Search product context changed"); error.code = "SEARCH_CONTEXT_MISMATCH"; throw error;
    }
    const key = `${legacyKey}:v3:${encodeURIComponent(binding(fresh))}:${encodeURIComponent(contextBinding(context, fresh))}`;
    if (inFlight.has(key)) return inFlight.get(key);
    const task = (async () => {
      const action = await locked(`comprSearchAction:${scope}`, async () => {
        let saved = storage ? (await storage.get([key]))[key] : null;
        if (!saved && storage) {
          const oldV2Key = `${legacyKey}:v2:${encodeURIComponent(legacyBinding(fresh))}`;
          const candidates = await storage.get([oldV2Key, legacyKey]);
          const legacy = candidates[oldV2Key] || candidates[legacyKey];
          if (legacy?.requestId && legacy.product && binding(legacy.product) === binding(fresh)) {
            saved = { ...legacy, context, state: legacy.confirmation ? "awaiting_confirmation" : "pending", version: 3 };
            // Copy before removing: interrupted migration remains recoverable.
            await storage.set({ [key]: saved });
            await storage.remove([oldV2Key, legacyKey]);
          }
        }
        if (saved && contextBinding(saved.context, saved.product) !== contextBinding(context, fresh)) saved = null;
        if (saved?.state === "completed") saved = null;
        if (!saved) {
          const ownerKey = `comprSearchCooldown:${scope}`;
          const persisted = storage ? Number((await storage.get([ownerKey]))[ownerKey] || 0) : 0;
          currentCooldown = Math.max(persisted, cooldowns.get(ownerKey) || 0);
          if (currentCooldown > Date.now()) {
            const error = new Error("Please wait before starting another check"); error.code = "SEARCH_COOLDOWN";
            error.details = { retryAfterSeconds: cooldownSeconds() }; throw error;
          }
          currentCooldown = Date.now() + 10000; cooldowns.set(ownerKey, currentCooldown);
          if (storage) await storage.set({ [ownerKey]: currentCooldown });
          saved = { version: 3, state: "pending", requestId, product: fresh, context, createdAt: Date.now() };
        }
        // Preserve payload, confirmation and expiry while recovering an uncertain action.
        if (storage) await storage.set({ [key]: saved, [actionIndex(scope, saved.requestId)]: key });
        return saved;
      });
      try {
        const response = await request("/v1/search", { method: "POST", signal: options.signal,
          headers: { "X-Request-ID": action.requestId }, body: JSON.stringify({ requestId: action.requestId, product: action.product }) });
        if (storage) await locked(`comprSearchAction:${scope}`, async () => {
          const current = (await storage.get([key]))[key];
          if (current?.requestId !== action.requestId) return;
          await storage.set({ [key]: { ...current, state: response.confirmation ? "awaiting_confirmation" : "result_received",
            ...(response.confirmation ? { confirmation: response.confirmation } : {}), receivedAt: Date.now() } });
        });
        if (!response.confirmation && (["NO_CONFIDENT_MATCH","NO_RESULTS_FROM_PROVIDER"].includes(response.outcome)))
          await finishAction(storage, scope, action.requestId);
        return response;
      } catch (error) {
        // Only an authoritative HTTP error proves terminal state. Local timeout/abort is uncertain.
        if (error.status && terminalCodes.has(error.code)) await finishAction(storage, scope, action.requestId);
        throw error;
      }
    })();
    inFlight.set(key, task);
    try { return await task; }
    finally { if (inFlight.get(key) === task) inFlight.delete(key); }
  }
  async function acceptResult(response) {
    if (!response?.confirmation) return null;
    const session = await ComprAuth.getSession();
    const owner = session?.user?.id || session?.user_id;
    const scope = owner ? actionScope(owner) : null;
    const storage = typeof ComprBrowser !== "undefined" ? ComprBrowser.storage.local : null;
    const { resultId, token } = response.confirmation;
    for (let attempt = 0; attempt < 3; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      try {
        const accepted = await request("/v1/search/accept", { method: "POST", signal: controller.signal,
          body: JSON.stringify({ requestId: response.requestId, resultId, token }) });
        if (typeof accepted?.usageCharged !== "boolean" ||
          (accepted.requestId && accepted.requestId !== response.requestId))
          throw new Error("Search confirmation response is uncertain");
        // Confirmed success, including duplicate confirmation, terminates this action only.
        if (scope) await finishAction(storage, scope, response.requestId);
        return accepted;
      } catch (error) {
        if (error.status && terminalCodes.has(error.code) && scope) await finishAction(storage, scope, response.requestId);
        if (error?.status && error.status < 500 && error.status !== 429) return null;
      } finally { clearTimeout(timer); }
    }
    return null; // Uncertain confirmation: retain exact identity/token for recovery.
  }
  return {
    acceptResult, safetyMessage, cooldownSeconds,
    productFingerprint: product => binding(ComprProduct.toSearchPayload(product)),
    me: (options = {}) => request("/v1/me", options),
    createCheckout: (plan, requestId = crypto.randomUUID()) => request("/v1/billing/checkout", {
      method: "POST",
      headers: { "X-Request-ID": requestId },
      body: JSON.stringify({ plan, requestId })
    }),
    createBillingPortal: () => request("/v1/billing/portal", { method: "POST", body: "{}" }),
    syncAppleTransaction: signedTransactionInfo => request("/v1/billing/apple/sync", {
      method: "POST", body: JSON.stringify({ signedTransactionInfo })
    }),
    deleteAccount: () => request("/v1/account", {
      method: "DELETE", body: JSON.stringify({ confirmation: "DELETE" })
    }),
    resetGuest: () => request("/v1/guest", {
      method: "DELETE", body: JSON.stringify({ confirmation: "RESET" })
    }),
    search
  };
})();
