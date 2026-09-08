/* Minimal cross-browser adapter for the extension APIs COMPR actually uses. */
(function initialiseComprBrowser(root) {
  "use strict";
  const VERSION = "compr-browser-adapter-v1";
  const isCommonJs = typeof module !== "undefined" && Boolean(module.exports);
  const existing = isCommonJs ? undefined : root.ComprBrowser;
  function isValidAdapter(value) {
    return Boolean(value && value.adapterVersion === VERSION && Object.isFrozen(value) &&
      typeof value.available === "boolean" && typeof value.safeHttpUrl === "function" &&
      typeof value.runtime?.getURL === "function" && typeof value.runtime?.onMessage === "function" &&
      typeof value.storage?.local?.get === "function" && typeof value.tabs?.query === "function" &&
      typeof value.scripting?.executeScript === "function");
  }
  if (existing !== undefined) {
    if (!isValidAdapter(existing)) throw new Error("INVALID_COMPR_BROWSER_ADAPTER");
    if (isCommonJs) module.exports = existing;
    return;
  }
  const api = root.browser?.runtime ? root.browser : root.chrome?.runtime ? root.chrome : null;
  function unavailable(capability) {
    const error = new Error("This browser cannot complete that action.");
    error.code = "EXTENSION_API_UNAVAILABLE"; error.capability = capability; return error;
  }
  function normaliseError(error, capability) {
    const safe = new Error("This browser could not complete the requested action.");
    safe.code = error?.code || "EXTENSION_API_FAILED"; safe.capability = capability; return safe;
  }
  function invoke(target, method, args = [], capability = method) {
    if (!target || typeof target[method] !== "function") return Promise.reject(unavailable(capability));
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (handler, value) => { if (!settled) { settled = true; handler(value); } };
      const callback = value => {
        const lastError = api?.runtime?.lastError;
        if (lastError) finish(reject, normaliseError(lastError, capability)); else finish(resolve, value);
      };
      try {
        const result = target[method](...args, callback);
        if (result && typeof result.then === "function") result.then(
          value => finish(resolve, value), error => finish(reject, normaliseError(error, capability))
        );
      } catch (error) { finish(reject, normaliseError(error, capability)); }
    });
  }
  function addListener(event, listener, capability) {
    if (!event || typeof event.addListener !== "function") throw unavailable(capability);
    event.addListener(listener);
  }
  function safeHttpUrl(value) {
    let parsed; try { parsed = new URL(value); } catch { throw unavailable("safe-url"); }
    if (parsed.protocol !== "https:") throw unavailable("safe-url");
    return parsed.href;
  }
  const storageLocal = Object.freeze({
    get: keys => invoke(api?.storage?.local, "get", [keys], "storage.local.get"),
    set: values => invoke(api?.storage?.local, "set", [values], "storage.local.set"),
    remove: keys => invoke(api?.storage?.local, "remove", [keys], "storage.local.remove"),
    clear: () => invoke(api?.storage?.local, "clear", [], "storage.local.clear")
  });
  const adapter = Object.freeze({
    adapterVersion: VERSION, available: Boolean(api), raw: api,
    runtime: Object.freeze({
      get id() { return api?.runtime?.id || ""; },
      getURL: path => { if (!api?.runtime?.getURL) throw unavailable("runtime.getURL"); return api.runtime.getURL(path); },
      sendMessage: message => invoke(api?.runtime, "sendMessage", [message], "runtime.sendMessage"),
      onInstalled: listener => addListener(api?.runtime?.onInstalled, listener, "runtime.onInstalled"),
      onStartup: listener => addListener(api?.runtime?.onStartup, listener, "runtime.onStartup"),
      onMessage: listener => addListener(api?.runtime?.onMessage, listener, "runtime.onMessage")
    }),
    storage: Object.freeze({ local: storageLocal,
      onChanged: listener => addListener(api?.storage?.onChanged, listener, "storage.onChanged") }),
    tabs: Object.freeze({
      query: queryInfo => invoke(api?.tabs, "query", [queryInfo], "tabs.query"),
      create: createProperties => invoke(api?.tabs, "create", [createProperties], "tabs.create"),
      openExternal: value => { try { return invoke(api?.tabs, "create", [{ url: safeHttpUrl(value) }], "tabs.create"); }
        catch (error) { return Promise.reject(error); } }
    }),
    scripting: Object.freeze({ executeScript: details => invoke(api?.scripting, "executeScript", [details], "scripting.executeScript") }),
    action: Object.freeze({
      setBadgeBackgroundColor: details => invoke(api?.action, "setBadgeBackgroundColor", [details], "action.setBadgeBackgroundColor"),
      setBadgeText: details => invoke(api?.action, "setBadgeText", [details], "action.setBadgeText")
    }),
    permissions: Object.freeze({
      contains: details => invoke(api?.permissions, "contains", [details], "permissions.contains"),
      request: details => invoke(api?.permissions, "request", [details], "permissions.request")
    }), safeHttpUrl, normaliseError
  });
  if (isCommonJs) {
    module.exports = adapter;
  } else {
    Object.defineProperty(root, "ComprBrowser", {
      value: adapter, configurable: false, enumerable: true, writable: false
    });
  }
})(typeof globalThis !== "undefined" ? globalThis : self);
