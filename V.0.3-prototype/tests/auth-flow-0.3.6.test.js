const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

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
  const ids = ["requestForm","verifyForm","email","otp","emailError","otpError","sendCode","verifyCode","changeEmail","successPanel","status","closeAccount"];
  const elements = Object.fromEntries(ids.map(id => [id, new FakeElement()]));
  elements.successPanel.heading = new FakeElement(); elements.successPanel.copy = new FakeElement();
  const documentHandlers = {};
  const context = {
    document: { getElementById: id => elements[id], addEventListener: (type, fn) => { documentHandlers[type] = fn; } },
    window: { addEventListener() {}, close() { context.closed = true; } }, history: { length: 1, back() {} },
    setInterval: fn => { context.interval = fn; return 1; }, clearInterval() {}, Date, console,
    ComprI18n: { translate: value => value },
    ComprAuth: { signInWithEmail: async () => {}, verifyEmailOtp: async () => {}, ...authOverrides }
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

test("account page validates email, prevents duplicate requests and applies cooldown", async () => {
  let resolveRequest; let calls = 0;
  const harness = accountHarness({ signInWithEmail: () => { calls += 1; return new Promise(resolve => { resolveRequest = resolve; }); } });
  await harness.elements.requestForm.handlers.submit({ preventDefault() {} });
  assert.equal(calls, 0); assert.equal(harness.elements.email.attributes["aria-invalid"], "true");
  harness.elements.email.value = "shopper@example.com";
  const first = harness.elements.requestForm.handlers.submit({ preventDefault() {} });
  const second = harness.elements.requestForm.handlers.submit({ preventDefault() {} });
  assert.equal(calls, 1); resolveRequest(); await Promise.all([first, second]);
  assert.equal(harness.elements.sendCode.disabled, true);
  assert.equal(harness.elements.verifyForm.classList.contains("hidden"), false);
  assert.match(harness.elements.status.textContent, /Check your email/);
});

test("account page uses the shared OTP verifier and shows only generic provider errors", async () => {
  let requestedEmail = ""; let verification;
  const harness = accountHarness({
    signInWithEmail: async email => { requestedEmail = email; },
    verifyEmailOtp: async (email, code) => { verification = { email, code }; }
  });
  harness.elements.email.value = "shopper@example.com";
  await harness.elements.requestForm.handlers.submit({ preventDefault() {} });
  assert.equal(requestedEmail, "shopper@example.com");
  harness.elements.otp.value = "12345678";
  await harness.elements.verifyForm.handlers.submit({ preventDefault() {} });
  assert.deepEqual(verification, { email: "shopper@example.com", code: "12345678" });

  const failed = accountHarness({ signInWithEmail: async () => { const error = new Error("user_not_found secret@example.com"); error.code = "internal"; throw error; } });
  failed.elements.email.value = "unknown@example.com";
  await failed.elements.requestForm.handlers.submit({ preventDefault() {} });
  assert.equal(failed.elements.status.textContent, "We couldn't complete that request. Please try again.");
  assert.doesNotMatch(failed.elements.status.textContent, /unknown|user_not_found|secret/);
});

test("account page does not start auth, search, quota or billing work on load", () => {
  let authCalls = 0;
  accountHarness({ signInWithEmail: async () => { authCalls += 1; }, verifyEmailOtp: async () => { authCalls += 1; } });
  assert.equal(authCalls, 0);
  const source = read("account.js");
  assert.doesNotMatch(source, /ComprApi|searchProvider|reserve|checkout|billing/);
});

test("account UI includes accessible controls, privacy/support, Escape and four locales", () => {
  const html = read("account.html"); const source = read("account.js"); const i18n = read("shared/i18n.js");
  assert.match(html, /<meta charset="UTF-8">/); assert.match(html, /name="referrer" content="no-referrer"/);
  assert.match(html, /id="email"[^>]+type="email"/); assert.match(html, /id="sendCode"[^>]*>Send code/);
  assert.match(html, /getcompr\.nl\/privacy\.html/); assert.match(html, /getcompr\.nl\/support\.html/);
  assert.match(source, /event\.key === "Escape"/);
  for (const translation of ["Inloggen bij COMPR", "Bei COMPR anmelden", "Se connecter à COMPR"]) assert.match(i18n, new RegExp(translation));
});

test("callback sources clear fragments immediately and fail closed on malformed input", () => {
  const receiver = read("auth-receiver.js");
  const callback = fs.readFileSync(path.join(root, "..", "website-live", "auth-callback.js"), "utf8");
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
