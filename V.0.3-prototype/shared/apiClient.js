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
      const error = new Error(payload?.error?.message || "COMPR API request failed");
      error.code = payload?.error?.code || "API_ERROR"; error.details = payload?.error?.details; throw error;
    }
    return payload;
  }
  return {
    me: () => request("/v1/me"),
    createCheckout: (plan, requestId = crypto.randomUUID()) => request("/v1/billing/checkout", {
      method: "POST",
      headers: { "X-Request-ID": requestId },
      body: JSON.stringify({ plan, requestId })
    }),
    createBillingPortal: () => request("/v1/billing/portal", { method: "POST", body: "{}" }),
    deleteAccount: () => request("/v1/account", {
      method: "DELETE", body: JSON.stringify({ confirmation: "DELETE" })
    }),
    resetGuest: () => request("/v1/guest", {
      method: "DELETE", body: JSON.stringify({ confirmation: "RESET" })
    }),
    search: (product, requestId = crypto.randomUUID(), options = {}) => request("/v1/search", { method: "POST",
      signal: options.signal, headers: { "X-Request-ID": requestId }, body: JSON.stringify({ requestId, product }) })
  };
})();
