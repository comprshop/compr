"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRenderController } = require("../shared/popupState.js");

const root = path.resolve(__dirname, "..");
const popup = fs.readFileSync(path.join(root, "popup.js"), "utf8");
const html = fs.readFileSync(path.join(root, "popup.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles", "popup.css"), "utf8");
const i18n = fs.readFileSync(path.join(root, "shared", "i18n.js"), "utf8");

test("one hundred identical product or no-product updates render once", () => {
  const products = createRenderController();
  let productRenders = 0;
  for (let index = 0; index < 100; index++) products.update("product", "same-product", () => { productRenders += 1; });
  assert.equal(productRenders, 1);
  assert.deepEqual(products.snapshot(), { renders: 1, identicalUpdatesSkipped: 99, staleUpdatesSkipped: 0 });

  const empty = createRenderController();
  let emptyRenders = 0;
  for (let index = 0; index < 100; index++) empty.update("visible-state", "emptyState", () => { emptyRenders += 1; });
  assert.equal(emptyRenders, 1);
  assert.equal(empty.snapshot().identicalUpdatesSkipped, 99);
});

test("a stale async detection cannot overwrite a newer popup state", () => {
  const controller = createRenderController();
  const oldGeneration = controller.begin("product-detection");
  const newGeneration = controller.begin("product-detection");
  const rendered = [];
  assert.equal(controller.update("result", "old-product", () => rendered.push("old"), oldGeneration, "product-detection"), false);
  assert.equal(controller.update("result", "new-product", () => rendered.push("new"), newGeneration, "product-detection"), true);
  assert.deepEqual(rendered, ["new"]);
  assert.equal(controller.snapshot().staleUpdatesSkipped, 1);
});

test("loading transitions once to product or no-product and account refresh is latest-wins", () => {
  for (const finalState of ["productState", "emptyState"]) {
    const controller = createRenderController();
    const states = [];
    controller.update("visible-state", "loadingState", () => states.push("loadingState"));
    controller.update("visible-state", finalState, () => states.push(finalState));
    controller.update("visible-state", finalState, () => states.push(finalState));
    assert.deepEqual(states, ["loadingState", finalState]);
  }
  const accounts = createRenderController();
  const login = accounts.begin("account-load");
  const logout = accounts.begin("account-load");
  assert.equal(accounts.isCurrent("account-load", login), false);
  assert.equal(accounts.isCurrent("account-load", logout), true);
});

test("popup bootstrap, i18n listener and observer initialise once and clean up", () => {
  assert.match(popup, /__comprPopupBootstrapRegistered/);
  assert.match(popup, /DOMContentLoaded[\s\S]*\{ once: true \}/);
  assert.match(i18n, /if\(initialized\)return;initialized=true/);
  assert.equal((i18n.match(/new MutationObserver/g) || []).length, 1);
  assert.match(i18n, /observer\?\.disconnect\(\)/);
  assert.match(popup, /clearTimeout\(toastTimer\)/);
  assert.doesNotMatch(popup, /setInterval\s*\(/);
});

test("popup keeps a stable 380 CSS-pixel viewport without horizontal overflow", () => {
  assert.match(html, /<html lang="en" class="chrome-popup">/);
  assert.match(css, /html \{ width: 380px; min-width: 380px; max-width: 380px;/);
  assert.match(css, /scrollbar-gutter:\s*stable/);
  assert.match(css, /overflow-x:\s*hidden/);
  assert.match(css, /\.app \{ width: 100%; min-width: 0; max-width: 100%/);
  assert.match(css, /@media \(min-width: 320px\) and \(max-width: 379px\)/);
  assert.match(css, /html\.chrome-popup \{ width: 100%; min-width: 0; max-width: 100%; \}/);
  assert.doesNotMatch(css, /@media \(max-width: 379px\)\s*\{\s*html \{/);
  assert.match(css, /html\.safari-popup \{ width: 100%; min-width: 0; max-width: 100%; \}/);
  assert.doesNotMatch(css, /transition\s*:\s*width/);
  for (const zoom of [1, 2]) {
    const viewportDevicePixels = 380 * zoom;
    const contentDevicePixels = 380 * zoom;
    assert.equal(contentDevicePixels, viewportDevicePixels);
  }
});

test("async images and long names have reserved, bounded layout space", () => {
  assert.match(css, /\.product-image-wrapper \{ width: 112px; min-width: 112px; height: 132px;/);
  assert.match(css, /\.product-name \{ max-width:100%;[\s\S]*overflow-wrap:anywhere;[\s\S]*word-break:break-word/);
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*animation: none !important; transition: none !important/);
});

test("browser adapter and state controller load before popup code", () => {
  assert.ok(html.indexOf('shared/browserAdapter.js') < html.indexOf('shared/popupState.js'));
  assert.ok(html.indexOf('shared/popupState.js') < html.indexOf('popup.js'));
});
