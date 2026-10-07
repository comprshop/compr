"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Product = require("../shared/product.js");
const Reliability = require("../shared/reliability.js");

function storageHarness(seed = {}) {
  const values = structuredClone(seed);
  const nativeMessages = [];
  const local = {
    get(keys, callback) { const list = Array.isArray(keys) ? keys : [keys]; const result = Object.fromEntries(list.map(key => [key, values[key]])); if (callback) callback(result); else return Promise.resolve(result); },
    set(update, callback) { Object.assign(values, structuredClone(update)); if (callback) callback(); else return Promise.resolve(); },
    remove(keys, callback) { for (const key of Array.isArray(keys) ? keys : [keys]) delete values[key]; if (callback) callback(); else return Promise.resolve(); },
    clear(callback) { for (const key of Object.keys(values)) delete values[key]; callback?.(); }
  };
  return { values, nativeMessages, chrome: { storage: { local }, runtime: {
    lastError: null,
    sendNativeMessage(_applicationId, message, callback) { nativeMessages.push(message); callback?.(null); }
  } } };
}

function loadAuth(harness, fetchImpl, config = {}) {
  const adapterSource = fs.readFileSync(path.join(__dirname, "..", "shared", "browserAdapter.js"), "utf8");
  const source = fs.readFileSync(path.join(__dirname, "..", "shared", "auth.js"), "utf8");
  const context = { chrome: harness.chrome, fetch: fetchImpl, ComprRuntimeConfig: {
    apiBaseUrl: "https://api.compr.test", supabaseUrl: "https://project.supabase.co", supabaseAnonKey: "public-anon", authCallbackUrl: "https://compr.example/auth",
    platform: "chrome", guestMode: false, ...config
  }, URL, Date, Math, JSON, Error, Promise, AbortController, setTimeout, clearTimeout, encodeURIComponent };
  vm.createContext(context);
  vm.runInContext(`${adapterSource}\n${source}\nglobalThis.exposedAuth = ComprAuth;`, context);
  return context.exposedAuth;
}

function response(payload, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

test("successful login stores a restorable minimal session", async () => {
  const harness = storageHarness();
  const auth = loadAuth(harness, async () => response({ access_token: "access", refresh_token: "refresh", expires_in: 3600 }));
  const session = await auth.verifyEmailOtp("user@example.test", "12345678");
  assert.equal(session.access_token, "access");
  assert.deepEqual(Object.keys(harness.values.comprAuthSession).sort(), ["access_token", "expires_at", "refresh_token"]);
});

test("expired session refreshes once even with concurrent callers", async () => {
  const harness = storageHarness({ comprAuthSession: { access_token: "old", refresh_token: "refresh", expires_at: 1 } });
  let calls = 0;
  const auth = loadAuth(harness, async () => { calls += 1; return response({ access_token: "new", refresh_token: "new-refresh", expires_in: 3600 }); });
  const [a, b] = await Promise.all([auth.getSession(), auth.getSession()]);
  assert.equal(a.access_token, "new"); assert.equal(b.access_token, "new"); assert.equal(calls, 1);
});

test("failed refresh clears the invalid session", async () => {
  const harness = storageHarness({ comprAuthSession: { access_token: "old", refresh_token: "bad", expires_at: 1 } });
  const auth = loadAuth(harness, async () => response({ message: "expired" }, 401));
  await assert.rejects(auth.getSession(), error => error.code === "AUTH_REQUIRED");
  assert.equal(harness.values.comprAuthSession, undefined);
});

test("failed Safari refresh also clears the invalid native shared session", async () => {
  const harness = storageHarness({ comprAuthSession: { access_token: "old", refresh_token: "bad", expires_at: 1 } });
  const auth = loadAuth(harness, async () => response({ message: "expired" }, 401), { platform: "safari" });
  await assert.rejects(auth.getSession(), error => error.code === "AUTH_REQUIRED");
  assert.equal(harness.values.comprAuthSession, undefined);
  assert.equal(harness.nativeMessages.at(-1)?.action, "auth.clear");
});

test("session survives extension context or service-worker restart", async () => {
  const harness = storageHarness({ comprAuthSession: { access_token: "saved", refresh_token: "refresh", expires_at: Math.floor(Date.now()/1000)+600 } });
  const restartedAuth = loadAuth(harness, async () => { throw new Error("network must not be needed"); });
  assert.equal((await restartedAuth.getSession()).access_token, "saved");
});

test("Safari logout clears local and native sessions and returns to logged out", async () => {
  const harness = storageHarness({ comprAuthSession: { access_token: "saved", refresh_token: "refresh", expires_at: Math.floor(Date.now()/1000)+600 } });
  const auth = loadAuth(harness, async () => response({}), { platform: "safari" });
  await auth.signOut();
  assert.equal(harness.values.comprAuthSession, undefined);
  assert.equal(harness.nativeMessages.at(-1)?.action, "auth.clear");
  assert.equal(await auth.getSession(), null);
});

test("Safari guest initialization is invisible, shared by concurrent callers and restorable", async () => {
  const harness = storageHarness(); let calls = 0;
  const auth = loadAuth(harness, async url => {
    if (url.endsWith("/v1/guest/status")) return response({ enabled: true });
    calls += 1; assert.match(url, /\/signup$/);
    return response({ access_token: "guest-access", refresh_token: "guest-refresh", expires_in: 3600 });
  }, { platform: "safari", guestMode: true });
  const [first, second] = await Promise.all([auth.ensureGuestSession(), auth.ensureGuestSession()]);
  assert.equal(first.access_token, "guest-access"); assert.equal(second.access_token, "guest-access"); assert.equal(calls, 1);
  const restored = loadAuth(harness, async () => { throw new Error("network must not be needed"); },
    { platform: "safari", guestMode: true });
  assert.equal((await restored.ensureGuestSession()).access_token, "guest-access");
});

test("guest initialization fails closed outside an explicit Safari guest build", async () => {
  for (const config of [{ platform: "chrome", guestMode: false }, { platform: "safari", guestMode: false }]) {
    const auth = loadAuth(storageHarness(), async () => response({}), config);
    await assert.rejects(auth.ensureGuestSession(), error => error.code === "GUEST_MODE_DISABLED");
  }
});

test("failed guest initialization stores no partial session and can be retried", async () => {
  const harness = storageHarness(); let calls = 0;
  const auth = loadAuth(harness, async url => {
    if (url.endsWith("/v1/guest/status")) return response({ enabled: true });
    calls += 1;
    return calls === 1 ? response({ message: "disabled" }, 400)
      : response({ access_token: "guest", refresh_token: "refresh", expires_in: 3600 });
  }, { platform: "safari", guestMode: true });
  await assert.rejects(auth.ensureGuestSession());
  assert.equal(harness.values.comprAuthSession, undefined);
  assert.equal((await auth.ensureGuestSession()).access_token, "guest");
});

test("a late guest auth response cannot restore a session after local reset", async () => {
  const harness = storageHarness(); let resolveSignup;
  const auth = loadAuth(harness, async url => {
    if (url.endsWith("/v1/guest/status")) return response({ enabled: true });
    return new Promise(resolve => { resolveSignup = resolve; });
  }, { platform: "safari", guestMode: true });
  const pending = auth.ensureGuestSession();
  while (!resolveSignup) await Promise.resolve();
  await auth.clearSession();
  resolveSignup(response({ access_token: "late", refresh_token: "late-refresh", expires_in: 3600 }));
  await assert.rejects(pending, /STALE_AUTH_SESSION/);
  assert.equal(harness.values.comprAuthSession, undefined);
});

test("one action blocks double clicks and cancellation makes late responses stale", () => {
  const actions = Reliability.createLatestAction();
  const first = actions.begin();
  assert.equal(actions.begin(), null);
  actions.cancel();
  assert.equal(actions.isCurrent(first), false);
  const second = actions.begin();
  assert.equal(actions.isCurrent(second), true);
  actions.finish(second);
  assert.equal(actions.busy, false);
});

test("safe error states hide internal details", () => {
  assert.equal(Reliability.safeErrorState({ code: "AUTH_REQUIRED", stack: "secret" }), "session_expired");
  assert.equal(Reliability.safeErrorState({ code: "SEARCH_TIMEOUT" }), "timeout");
  assert.equal(Reliability.safeErrorState(new TypeError("offline details")), "offline");
  assert.equal(Reliability.safeErrorState(new Error("database internals")), "unexpected_error");
});

test("corrupt storage, unsafe URLs and excess items are discarded", async () => {
  const harness = storageHarness({ savedProducts: "broken" });
  global.chrome = harness.chrome; global.ComprProduct = Product;
  delete require.cache[require.resolve("../shared/browserAdapter.js")]; global.ComprBrowser = require("../shared/browserAdapter.js");
  delete require.cache[require.resolve("../shared/storage.js")];
  const Storage = require("../shared/storage.js");
  assert.deepEqual(await Storage.getSavedProducts(), []);
  const many = Array.from({ length: 510 }, (_, index) => ({ name: `Product ${index}`, productCode: `MODEL-${index}`, url: `https://shop${index}.example/product` }));
  many.unshift({ name: "Unsafe", productCode: "BAD-1", url: "javascript:alert(1)" });
  const saved = await Storage.setSavedProducts(many);
  assert.equal(saved.length, 500);
  assert.equal(saved.some(item => item.name === "Unsafe"), false);
  delete global.chrome; delete global.ComprProduct; delete global.ComprBrowser;
});

test("saving twice deduplicates and removal persists", async () => {
  const harness = storageHarness(); global.chrome = harness.chrome; global.ComprProduct = Product;
  delete require.cache[require.resolve("../shared/browserAdapter.js")]; global.ComprBrowser = require("../shared/browserAdapter.js");
  delete require.cache[require.resolve("../shared/storage.js")]; const Storage = require("../shared/storage.js");
  const item = { name: "Sony WH-1000XM5", productCode: "WH1000XM5", url: "https://shop.example/product/sony" };
  await Promise.all([Storage.saveProduct(item), Storage.saveProduct(item)]);
  assert.equal((await Storage.getSavedProducts()).length, 1);
  await Storage.removeSavedProduct(item);
  assert.equal((await Storage.getSavedProducts()).length, 0);
  delete global.chrome; delete global.ComprProduct; delete global.ComprBrowser;
});
