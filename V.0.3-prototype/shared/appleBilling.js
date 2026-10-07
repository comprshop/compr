(function initialiseAppleBilling(root) {
  "use strict";

  const APP_ID = "nl.getcompr.compr";
  const PRODUCT_IDS = Object.freeze({
    proMonthly: "nl.getcompr.pro.monthly",
    proYearly: "nl.getcompr.pro.yearly",
    ultimateMonthly: "nl.getcompr.ultimate.monthly",
    ultimateYearly: "nl.getcompr.ultimate.yearly"
  });
  const allowedIds = new Set(Object.values(PRODUCT_IDS));
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function safeText(value, maximum) {
    return typeof value === "string" ? value.trim().slice(0, maximum) : "";
  }

  function normaliseProduct(value) {
    const id = safeText(value?.id, 120);
    if (!allowedIds.has(id)) return null;
    const displayName = safeText(value?.displayName, 120);
    const displayPrice = safeText(value?.displayPrice, 80);
    if (!displayName || !displayPrice) return null;
    return Object.freeze({ id, displayName, displayPrice });
  }

  async function listProducts() {
    if (root.ComprRuntimeConfig?.platform !== "safari") {
      const error = new Error("Apple billing is available only in Safari.");
      error.code = "APPLE_BILLING_UNAVAILABLE";
      throw error;
    }
    const response = await root.ComprBrowser.runtime.sendNativeMessage(APP_ID, { action: "billing.products" });
    if (response?.ok !== true || !Array.isArray(response.products)) {
      const error = new Error("Apple product information is unavailable.");
      error.code = safeText(response?.code, 80) || "APPLE_PRODUCTS_UNAVAILABLE";
      throw error;
    }
    const products = response.products.map(normaliseProduct).filter(Boolean);
    if (!products.length) {
      const error = new Error("Apple product information is unavailable.");
      error.code = "APPLE_PRODUCTS_UNAVAILABLE";
      throw error;
    }
    return Object.freeze(products);
  }

  function nativeError(response, fallback) {
    const error = new Error("Apple billing is unavailable.");
    error.code = safeText(response?.code, 80) || fallback;
    return error;
  }

  function signedTransaction(value) {
    const jws = safeText(value, 65536);
    return jws && jws.split(".").length === 3 ? jws : "";
  }

  async function purchase(productId, appAccountToken) {
    if (!allowedIds.has(productId) || !uuidPattern.test(String(appAccountToken || ""))) {
      throw nativeError(null, "APPLE_PURCHASE_INVALID");
    }
    const response = await root.ComprBrowser.runtime.sendNativeMessage(APP_ID, {
      action: "billing.purchase", productId, appAccountToken
    });
    if (response?.ok !== true) throw nativeError(response, "APPLE_PURCHASE_UNAVAILABLE");
    const status = safeText(response.status, 20);
    if (["cancelled", "pending"].includes(status)) return Object.freeze({ status });
    const jws = signedTransaction(response.signedTransactionInfo);
    const transactionId = safeText(response.transactionId, 128);
    if (status !== "success" || !jws || !transactionId) throw nativeError(null, "APPLE_PURCHASE_INVALID");
    return Object.freeze({ status, signedTransactionInfo: jws, transactionId });
  }

  async function restore() {
    const response = await root.ComprBrowser.runtime.sendNativeMessage(APP_ID, { action: "billing.restore" });
    if (response?.ok !== true || !Array.isArray(response.transactions)) {
      throw nativeError(response, "APPLE_RESTORE_UNAVAILABLE");
    }
    return Object.freeze(response.transactions.slice(0, 4).map(value => {
      const jws = signedTransaction(value?.signedTransactionInfo);
      const transactionId = safeText(value?.transactionId, 128);
      return jws && transactionId ? Object.freeze({ signedTransactionInfo: jws, transactionId }) : null;
    }).filter(Boolean));
  }

  async function finish(transactionId) {
    const id = safeText(transactionId, 128);
    if (!/^[A-Za-z0-9.-]{1,128}$/.test(id)) throw nativeError(null, "APPLE_FINISH_INVALID");
    const response = await root.ComprBrowser.runtime.sendNativeMessage(APP_ID, { action: "billing.finish", transactionId: id });
    if (response?.ok !== true) throw nativeError(response, "APPLE_FINISH_UNAVAILABLE");
    return true;
  }

  const api = Object.freeze({ APP_ID, PRODUCT_IDS, listProducts, purchase, restore, finish, normaliseProduct });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else Object.defineProperty(root, "ComprAppleBilling", { value: api, configurable: false, enumerable: true });
})(typeof globalThis !== "undefined" ? globalThis : self);
