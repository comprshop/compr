const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

function readWebsite(relative) {
  const candidates = [
    path.join(root, "..", "website-live", relative),
    path.join(root, "..", "..", "compr-website", relative)
  ];
  const source = candidates.find(candidate => fs.existsSync(candidate));
  if (!source) throw new Error(`Website source not found: ${relative}`);
  return fs.readFileSync(source, "utf8");
}

class FakeElement {
  constructor() {
    this.value = ""; this.textContent = ""; this.disabled = false; this.attributes = {};
    this.handlers = {}; this.classList = { values: new Set(), add: value => this.classList.values.add(value),
      remove: value => this.classList.values.delete(value), contains: value => this.classList.values.has(value) };
  }
  addEventListener(type, handler) { this.handlers[type] = handler; }
  setAttribute(name, value) { this.attributes[name] = value; }
  removeAttribute(name) { delete this.attributes[name]; }
  focus() { this.focused = true; }
  querySelector(selector) { return selector === "h2" ? this.heading : this.copy; }
}

function accountHarness(authOverrides = {}) {
  const ids = ["appleSignIn","appleSignInHint","status","closeAccount"];
  const elements = Object.fromEntries(ids.map(id => [id, new FakeElement()]));
  const documentHandlers = {};
  const context = {
    document: { hidden: false, getElementById: id => elements[id], addEventListener: (type, fn) => { documentHandlers[type] = fn; } },
    window: { addEventListener() {}, close() { context.closed = true; } }, history: { length: 1, back() {} },
    Date, console,
    ComprI18n: { translate: value => value },
    ComprAuth: { getSession: async () => null, openAppleSignIn: async () => true, ...authOverrides }
  };
  vm.createContext(context); vm.runInContext(read("account.js"), context);
  return { context, elements, documentHandlers };
}

test("all three signed-out entry points use the one dedicated account route", () => {
  const compare = read("compare.js"); const popup = read("popup.js"); const route = read("shared/accountRoute.js");
  assert.match(route, /runtime\.getURL\("account\.html"\)/);
  assert.equal((compare.match(/ComprAccountRoute\.open\(\)/g) || []).length, 2);
  assert.match(popup, /ComprAccountRoute\.open\(\)/);
  assert.doesNotMatch(compare, /runtime\.getURL\("popup\.html"\)/);
  assert.doesNotMatch(popup, /signInWithEmail|verifyEmailOtp|comprPendingAuthEmail/);
});

test("account page offers only native Sign in with Apple", async () => {
  let opened = 0;
  const harness = accountHarness({ openAppleSignIn: async () => { opened += 1; return true; } });
  await harness.elements.appleSignIn.handlers.click();
  assert.equal(opened, 1);
  assert.match(harness.elements.status.textContent, /Finish signing in with Apple/);
  const html = read("account.html");
  assert.match(html, /id="appleSignIn"/);
  assert.doesNotMatch(html, /id="email"|id="otp"|Send code|8-digit code/);
});

test("account page recognises a shared Apple session", async () => {
  const harness = accountHarness({ getSession: async () => ({ access_token: "token" }) });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(harness.elements.appleSignIn.classList.contains("hidden"), true);
  assert.match(harness.elements.status.textContent, /You're signed in/);
});

test("account page contains no email, quota or billing flow", () => {
  const source = read("account.js");
  assert.doesNotMatch(source, /signInWithEmail|verifyEmailOtp|ComprApi|searchProvider|reserve|checkout|billing/);
});

test("account UI includes accessible controls, privacy/support, Escape and four locales", () => {
  const html = read("account.html"); const source = read("account.js"); const i18n = read("shared/i18n.js");
  assert.match(html, /<meta charset="UTF-8">/); assert.match(html, /name="referrer" content="no-referrer"/);
  assert.match(html, /id="appleSignIn"[^>]*>Sign in with Apple/);
  assert.match(html, /getcompr\.nl\/privacy\.html/); assert.match(html, /getcompr\.nl\/support\.html/);
  assert.match(source, /event\.key === "Escape"/);
  for (const translation of ["Inloggen bij COMPR", "Bei COMPR anmelden", "Se connecter à COMPR"]) assert.match(i18n, new RegExp(translation));
});

test("dynamic account usage and billing copy is formatted in the selected language", () => {
  const source = read("shared/i18n.js");
  const context = {
    globalThis: {}, document: { addEventListener() {} },
    navigator: { language: "nl-NL" }, Intl, MutationObserver: class {}, NodeFilter: { SHOW_TEXT: 4 }
  };
  context.globalThis = context;
  vm.createContext(context); vm.runInContext(source, context);
  assert.equal(context.ComprI18n.format("{remaining} of {limit} price checks remaining", { remaining: 2, limit: 5 }, "nl"), "Nog 2 van 5 prijscontroles");
  assert.equal(context.ComprI18n.format("Renews {date}", { date: "28 september 2026" }, "nl"), "Wordt verlengd op 28 september 2026");
  assert.equal(context.ComprI18n.format("Renews {date}", { date: "Sep 28, 2026" }, "en"), "Renews Sep 28, 2026");
});

test("callback sources clear fragments immediately and fail closed on malformed input", () => {
  const receiver = read("auth-receiver.js");
  const callback = readWebsite("auth-callback.js");
  for (const source of [receiver, callback]) {
    assert.ok(source.indexOf("history.replaceState") < source.indexOf("ComprAuth.setSession") || !source.includes("ComprAuth.setSession"));
    assert.match(source, /unexpectedParameter/); assert.match(source, /token_type/); assert.match(source, /expiresIn > 604800/);
  }
  assert.match(callback, /location\.hostname === "getcompr\.nl"/);
  assert.doesNotMatch(callback, /return_to|redirect_uri|next=/);
});

test("production gates pin the only callback and reject local or preview origins", () => {
  for (const relative of ["../tools/build-production-extension.ps1", "../tools/build-safari-extension.ps1"]) {
    const source = fs.readFileSync(path.join(root, relative), "utf8");
    assert.match(source, /Auth callback must be exactly https:\/\/getcompr\.nl\/auth-callback\.html/);
    assert.match(source, /localhost|127\./);
  }
});
