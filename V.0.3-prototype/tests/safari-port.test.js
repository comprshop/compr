"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const source = path.join(root, "V.0.3-prototype");
const safariManifest = JSON.parse(fs.readFileSync(path.join(root, "platforms", "safari", "manifest.json"), "utf8"));
const chromeManifest = JSON.parse(fs.readFileSync(path.join(source, "manifest.json"), "utf8"));
const popupHtml = fs.readFileSync(path.join(source, "popup.html"), "utf8");
const compareHtml = fs.readFileSync(path.join(source, "compare.html"), "utf8");
const authReceiverHtml = fs.readFileSync(path.join(source, "auth-receiver.html"), "utf8");
const backgroundJs = fs.readFileSync(path.join(source, "background.js"), "utf8");
const popupCss = fs.readFileSync(path.join(source, "styles", "popup.css"), "utf8");
const compareCss = fs.readFileSync(path.join(source, "styles", "compare.css"), "utf8");
const popupJs = fs.readFileSync(path.join(source, "popup.js"), "utf8");
const authJs = fs.readFileSync(path.join(source, "shared", "auth.js"), "utf8");
const runtimeConfig = fs.readFileSync(path.join(source, "shared", "runtimeConfig.js"), "utf8");

test("Safari manifest is minimal MV3 and never requests permanent all-site access", () => {
  assert.equal(safariManifest.manifest_version, 3);
  assert.deepEqual(safariManifest.permissions.sort(), ["activeTab", "scripting", "storage"]);
  assert.equal(safariManifest.host_permissions.includes("<all_urls>"), false);
  assert.equal(safariManifest.host_permissions.some(value => /localhost|127\.0\.0\.1|^http:/.test(value)), false);
  assert.deepEqual(safariManifest.web_accessible_resources[0].matches, ["https://getcompr.nl/*"]);
  assert.equal(safariManifest.background.service_worker, "background.js");
});

test("shared browser adapter loads before UI, auth and storage code", () => {
  for (const html of [popupHtml, compareHtml]) {
    assert.ok(html.indexOf('shared/browserAdapter.js') >= 0);
    assert.ok(html.indexOf('shared/browserAdapter.js') < html.indexOf('shared/storage.js'));
    assert.equal((html.match(/shared\/browserAdapter\.js/g) || []).length, 1);
  }
  assert.ok(authReceiverHtml.indexOf('shared/browserAdapter.js') < authReceiverHtml.indexOf('shared/auth.js'));
  assert.equal((authReceiverHtml.match(/shared\/browserAdapter\.js/g) || []).length, 1);
  assert.equal((backgroundJs.match(/importScripts\("shared\/browserAdapter\.js"\)/g) || []).length, 1);
});

test("browser adapter and eligibility load before injected content code in Chrome and Safari", () => {
  const adapter = popupJs.indexOf('"shared/browserAdapter.js"');
  const eligibility = popupJs.indexOf('"shared/productEligibility.js"');
  const content = popupJs.indexOf('"content.js"');
  assert.ok(adapter >= 0 && adapter < eligibility && eligibility < content);
  assert.ok(popupHtml.indexOf('shared/browserAdapter.js') < popupHtml.indexOf('shared/productEligibility.js'));
  assert.equal((popupJs.match(/"shared\/browserAdapter\.js"/g) || []).length, 1);
  assert.match(popupJs, /adapterProbe[\s\S]*adapterVersion === "compr-browser-adapter-v1"[\s\S]*files: \["shared\/browserAdapter\.js"\][\s\S]*"shared\/productEligibility\.js"/);
  assert.equal(chromeManifest.content_scripts, undefined);
  assert.equal(safariManifest.content_scripts, undefined);
});

test("mobile layouts include narrow viewport, safe areas, touch targets and long-name wrapping", () => {
  assert.match(popupHtml, /width=device-width/);
  assert.match(compareHtml, /width=device-width/);
  for (const css of [popupCss, compareCss]) {
    assert.match(css, /max-width:\s*(?:379|420)px/);
    assert.match(css, /safe-area-inset/);
    assert.match(css, /pointer:\s*coarse/);
    assert.match(css, /min-height:\s*44px/);
    assert.match(css, /overflow-wrap:\s*anywhere/);
  }
});

test("permission failure is distinct and product data is not sent during recognition", () => {
  assert.match(popupJs, /Allow COMPR on this website/);
  const recognition = popupJs.slice(popupJs.indexOf("async function getProductFromActiveTab"));
  assert.doesNotMatch(recognition.slice(0, recognition.indexOf("on(saveButton")), /ComprApi\.|\/v1\/search|\/api\/search/);
});

test("Safari platform override does not invent an App Store destination", () => {
  const override = fs.readFileSync(path.join(root, "platforms", "safari", "platform.js"), "utf8");
  assert.match(override, /chromeStoreReview/);
  assert.doesNotMatch(override, /apps\.apple\.com/);
});

test("Chrome and Safari guest behavior is explicitly isolated without browser sniffing", () => {
  assert.match(runtimeConfig, /platform:\s*"chrome"/);
  assert.match(runtimeConfig, /guestMode:\s*false/);
  assert.match(authJs, /platform !== "safari" \|\| ComprRuntimeConfig\.guestMode !== true/);
  const build = fs.readFileSync(path.join(root, "tools", "build-safari-extension.ps1"), "utf8");
  assert.match(build, /platform:\s*`"safari`"/); assert.match(build, /guestMode: true/);
  assert.match(popupJs, /isSafariGuest[\s\S]*ensureGuestSession/);
  assert.match(popupJs, /accountSignIn\.classList\.add\("hidden"\)/);
  assert.match(popupJs, /await ComprApi\.resetGuest\(\)[\s\S]*await ComprBrowser\.storage\.local\.clear\(\)/);
});

test("Safari guest initialization uses Supabase Auth and never adds a client quota counter", () => {
  assert.match(authJs, /request\("\/signup", \{ method: "POST", body: "\{\}" \}\)/);
  assert.doesNotMatch(authJs, /guestUsage|guestQuota|deviceId|installationId/i);
});

test("build exposes exclusive validation and staging modes and rejects unsafe input", () => {
  const build = fs.readFileSync(path.join(root, "tools", "build-safari-extension.ps1"), "utf8");
  assert.match(build, /Choose exactly one mode: -ValidationOnly or -StageConverterInput/);
  assert.match(build, /safari-converter-input/);
  assert.match(build, /Output must remain under build/);
  assert.match(build, /SAFARI_PRODUCTION_API_URL_REQUIRED/);
  assert.match(build, /\.env/);
  assert.match(build, /service_role/);
  assert.match(build, /localhost/);
  assert.match(build, /Auth callback must be exactly https:\/\/getcompr\.nl\/auth-callback\.html/);
  assert.doesNotMatch(build, /Compress-Archive|App Store Connect|TestFlight|xcrun/);
});
