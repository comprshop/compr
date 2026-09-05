(function (root) {
  function createLatestAction() {
    let sequence = 0;
    let active = null;
    return {
      begin() {
        if (active) return null;
        const controller = new AbortController();
        const action = { id: ++sequence, controller, signal: controller.signal };
        active = action;
        return action;
      },
      isCurrent(action) { return Boolean(action && active?.id === action.id && !action.signal.aborted); },
      finish(action) { if (active?.id === action?.id) active = null; },
      cancel() { if (active) active.controller.abort(); active = null; sequence += 1; },
      get busy() { return Boolean(active); }
    };
  }

  function safeErrorState(error) {
    if (error?.name === "AbortError") return "cancelled";
    const code = String(error?.code || "");
    if (code === "AUTH_REQUIRED") return "session_expired";
    if (code === "SEARCH_LIMIT_REACHED") return "limit_reached";
    if (code === "NO_CONFIDENT_MATCH") return "no_reliable_match";
    if (code === "INSUFFICIENT_PRODUCT_DATA") return "insufficient_product_data";
    if (code === "PRICE_NOT_COMPARABLE") return "price_not_comparable";
    if (code === "SEARCH_PROVIDER_ERROR") return "provider_error";
    if (code === "SEARCH_TIMEOUT") return "timeout";
    if (error?.name === "TypeError") return "offline";
    return "unexpected_error";
  }

  root.ComprReliability = { createLatestAction, safeErrorState };
  if (typeof module !== "undefined" && module.exports) module.exports = root.ComprReliability;
})(typeof globalThis !== "undefined" ? globalThis : this);
