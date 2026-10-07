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
  async function search(product, requestId = crypto.randomUUID(), options = {}) {
    const session = await ComprAuth.getSession();
    if (!session) { const error = new Error("Authentication required"); error.code = "AUTH_REQUIRED"; throw error; }
    let payload = ComprProduct.toSearchPayload(product);
    const owner = session?.user?.id || session?.user_id;
    const storage = typeof ComprBrowser !== "undefined" ? ComprBrowser.storage.local : null;
    const key = owner ? `comprPendingSearch:${ComprRuntimeConfig.authProjectRef ? ComprRuntimeConfig.authProjectRef + ":" : ""}${owner}:${payload.url}:${payload.price}:${payload.currency}` : null;
    let saved = key && storage ? (await storage.get([key]))[key] : null;
    if (saved?.confirmation?.expiresAt && Date.parse(saved.confirmation.expiresAt) <= Date.now()) saved = null;
    if (saved?.product) payload = saved.product;
    if(!saved) {
      const ownerKey=`comprSearchCooldown:${ComprRuntimeConfig.authProjectRef || 'default'}:${owner || 'session'}`;
      const persisted=storage ? Number((await storage.get([ownerKey]))[ownerKey] || 0) : 0;
      currentCooldown=Math.max(persisted,cooldowns.get(ownerKey)||0);
      if(currentCooldown>Date.now()) {
        const error=new Error('Please wait before starting another check');error.code='SEARCH_COOLDOWN';
        error.details={retryAfterSeconds:cooldownSeconds()};throw error;
      }
      currentCooldown=Date.now()+10000;cooldowns.set(ownerKey,currentCooldown);
      if(storage)await storage.set({[ownerKey]:currentCooldown});
    }
    const id = saved?.requestId || requestId;
    if (key && storage) await storage.set({ [key]: { requestId: id, product: payload } });
    if (inFlight.has(id)) return inFlight.get(id);
    const task = request("/v1/search", { method: "POST", signal: options.signal,
      headers: { "X-Request-ID": id }, body: JSON.stringify({ requestId: id, product: payload }) });
    inFlight.set(id, task);
    try {
      const response = await task;
      if (response.confirmation && key && storage) await storage.set({ [key]: { requestId: id, product: payload, confirmation: response.confirmation } });
      return response;
    } catch (error) {
      if (["NO_CONFIDENT_MATCH","NO_RESULTS_FROM_PROVIDER","PRICE_NOT_COMPARABLE","INSUFFICIENT_PRODUCT_DATA",
        "SEARCH_PROVIDER_ERROR","MALFORMED_PROVIDER_RESPONSE","SEARCH_TIMEOUT","REQUEST_EXPIRED","RESULT_EXPIRED",
        "SEARCH_SAFETY_LIMIT","SEARCH_GLOBAL_BUDGET","SEARCH_PROVIDER_BUDGET","SEARCH_BUDGET_NOT_CONFIGURED"].includes(error?.code) && key && storage)
        await storage.remove([key]);
      throw error;
    } finally { inFlight.delete(id); }
  }
  async function acceptResult(response) {
    if (!response?.confirmation) return null;
    const { resultId, token } = response.confirmation;
    for (let attempt = 0; attempt < 3; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      try {
        const accepted = await request("/v1/search/accept", { method: "POST", signal: controller.signal,
          body: JSON.stringify({ requestId: response.requestId, resultId, token }) });
        // Keep the persisted request ID: reopening/retry must never charge this result again.
        return accepted;
      } catch (error) {
        if (error?.status && error.status < 500 && error.status !== 429) return null;
      } finally { clearTimeout(timer); }
    }
    return null; // The rendered result stays intact; a later recovery retries the same confirmation.
  }
  return {
    acceptResult, safetyMessage, cooldownSeconds,
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
