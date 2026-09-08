"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "shared", "browserAdapter.js"), "utf8");

function load(globals) {
  const context = { ...globals, URL, Error, Promise };
  vm.createContext(context);
  vm.runInContext(`${source}\nglobalThis.adapter = ComprBrowser;`, context);
  return context.adapter;
}

function browserContext(globals = {}) {
  const context = { ...globals, URL, Error, Promise };
  vm.createContext(context);
  return context;
}

function event() {
  const listeners = [];
  return { listeners, addListener(listener) { listeners.push(listener); } };
}

test("Chrome callback APIs execute once and expose runtime messaging", async () => {
  let calls = 0;
  const onMessage = event();
  const adapter = load({ chrome: {
    runtime: { id: "chrome-id", lastError: null, onInstalled: event(), onStartup: event(), onMessage,
      getURL: value => `chrome-extension://chrome-id/${value}` },
    storage: { local: { get(keys, callback) { calls += 1; callback({ saved: keys }); } }, onChanged: event() },
    tabs: {}, scripting: {}, action: {}, permissions: {}
  } });
  assert.equal((await adapter.storage.local.get(["saved"])).saved[0], "saved");
  assert.equal(calls, 1);
  adapter.runtime.onMessage(() => true);
  assert.equal(onMessage.listeners.length, 1);
  assert.equal(adapter.runtime.getURL("compare.html"), "chrome-extension://chrome-id/compare.html");
});

test("Safari-like Promise APIs work without using the Chrome namespace", async () => {
  const created = [];
  const adapter = load({ browser: {
    runtime: { id: "safari-id", onInstalled: event(), onStartup: event(), onMessage: event(), getURL: value => `safari-web-extension://${value}` },
    storage: { local: {
      get: async keys => ({ value: keys[0] }), set: async () => undefined,
      remove: async () => undefined, clear: async () => undefined
    }, onChanged: event() },
    tabs: { query: async () => [{ id: 7 }], create: async details => { created.push(details); return details; } },
    scripting: { executeScript: async details => [{ result: details.target.tabId }] },
    action: { setBadgeText: async () => undefined, setBadgeBackgroundColor: async () => undefined },
    permissions: { contains: async () => false, request: async () => true }
  } });
  assert.equal((await adapter.storage.local.get(["hello"])).value, "hello");
  assert.equal((await adapter.tabs.query({ active: true }))[0].id, 7);
  assert.equal((await adapter.scripting.executeScript({ target: { tabId: 7 } }))[0].result, 7);
  await adapter.tabs.openExternal("https://shop.example/product");
  assert.equal(created.length, 1);
});

test("missing APIs and unsafe URL schemes fail closed with normalised errors", async () => {
  const adapter = load({ chrome: { runtime: { id: "id", onInstalled: event(), onStartup: event(), onMessage: event(), getURL: value => value } } });
  await assert.rejects(adapter.tabs.query({}), error => error.code === "EXTENSION_API_UNAVAILABLE");
  await assert.rejects(adapter.tabs.openExternal("javascript:alert(1)"), error => error.code === "EXTENSION_API_UNAVAILABLE");
  await assert.rejects(adapter.tabs.openExternal("http://shop.example/product"), error => error.code === "EXTENSION_API_UNAVAILABLE");
  await assert.rejects(adapter.tabs.openExternal("http://localhost:8787/product"), error => error.code === "EXTENSION_API_UNAVAILABLE");
});

test("permission grant and denial are returned without duplicate requests", async () => {
  let requests = 0;
  const adapter = load({ browser: {
    runtime: { id: "id", onInstalled: event(), onStartup: event(), onMessage: event(), getURL: value => value },
    storage: { local: {}, onChanged: event() }, tabs: {}, scripting: {}, action: {},
    permissions: { contains: async () => false, request: async () => { requests += 1; return false; } }
  } });
  assert.equal(await adapter.permissions.contains({ origins: ["https://shop.example/*"] }), false);
  assert.equal(await adapter.permissions.request({ origins: ["https://shop.example/*"] }), false);
  assert.equal(requests, 1);
});

test("adapter can be loaded twice in one browser context and reuses one frozen API", () => {
  const context = browserContext({ chrome: {
    runtime: { id: "id", onInstalled: event(), onStartup: event(), onMessage: event(), getURL: value => value }
  } });
  vm.runInContext(source, context);
  const first = context.ComprBrowser;
  vm.runInContext(source, context);
  assert.equal(context.ComprBrowser, first);
  assert.equal(Object.isFrozen(first), true);
});

test("adapter fails closed when an existing global is invalid or manipulated", () => {
  const context = browserContext({ ComprBrowser: { adapterVersion: "compr-browser-adapter-v1" } });
  assert.throws(() => vm.runInContext(source, context), /INVALID_COMPR_BROWSER_ADAPTER/);
});

test("content requires the adapter first and repeated injection registers one listener", () => {
  const contentSource = fs.readFileSync(path.join(__dirname, "..", "content.js"), "utf8");
  const onMessage = event();
  const context = browserContext({ chrome: {
    runtime: { id: "id", onInstalled: event(), onStartup: event(), onMessage, getURL: value => value }
  } });

  assert.throws(() => vm.runInContext(contentSource, context), /COMPR_BROWSER_ADAPTER_REQUIRED/);
  assert.equal(onMessage.listeners.length, 0);
  vm.runInContext(source, context);
  vm.runInContext(contentSource, context);
  vm.runInContext(contentSource, context);
  assert.equal(onMessage.listeners.length, 1);
});
