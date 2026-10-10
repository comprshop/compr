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
const compareJs = fs.readFileSync(path.join(source, "compare.js"), "utf8");
const safariPopupJs = fs.readFileSync(path.join(source, "safari-popup.js"), "utf8");
const authJs = fs.readFileSync(path.join(source, "shared", "auth.js"), "utf8");
const runtimeConfig = fs.readFileSync(path.join(source, "shared", "runtimeConfig.js"), "utf8");

test("Safari manifest is minimal MV3 and never requests permanent all-site access", () => {
  assert.equal(safariManifest.manifest_version, 3);
  assert.deepEqual(safariManifest.permissions.sort(), ["activeTab", "nativeMessaging", "scripting", "storage"]);
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
  assert.match(popupHtml, /class="chrome-popup"/);
  assert.match(safariPopupJs, /classList\.remove\("chrome-popup"\)[\s\S]*classList\.add\("safari-popup"\)/);
  assert.match(compareHtml, /width=device-width/);
  for (const css of [popupCss, compareCss]) {
    assert.match(css, /max-width:\s*(?:379|420)px/);
    assert.match(css, /safe-area-inset/);
    assert.match(css, /pointer:\s*coarse/);
    assert.match(css, /min-height:\s*44px/);
    assert.match(css, /overflow-wrap:\s*anywhere/);
  }
});

test("mobile region defaults select language, country and matching currency until manually changed", () => {
  const i18n = fs.readFileSync(path.join(source, "shared", "i18n.js"), "utf8");
  assert.match(i18n, /inferredLanguage/);
  assert.match(i18n, /Europe\/Amsterdam/);
  assert.match(i18n, /languageChosenManually/);
  assert.match(popupJs, /function inferCountryCode\(\)/);
  assert.match(popupJs, /countryChosenManually/);
  assert.match(popupJs, /ComprCurrency\.getCurrencyForCountry\(countryCode\)/);
});

test("permission failure is distinct and product data is not sent during recognition", () => {
  assert.match(popupJs, /Allow COMPR on this website/);
  const recognition = popupJs.slice(popupJs.indexOf("async function getProductFromActiveTab"));
  assert.doesNotMatch(recognition.slice(0, recognition.indexOf("on(saveButton")), /ComprApi\.|\/v1\/search|\/api\/search/);
});

test("Safari platform override does not invent an App Store destination", () => {
  const override = fs.readFileSync(path.join(root, "platforms", "safari", "platform.js"), "utf8");
  assert.match(override, /chromeStoreReview/);
  assert.match(override, /classList\.remove\("chrome-popup"\)/);
  assert.match(override, /classList\.add\("safari-popup"\)/);
  assert.match(override, /chromeReview\.disabled = true/);
  assert.match(override, /setAttribute\("aria-hidden", "true"\)/);
  assert.match(override, /style\.setProperty\("display", "none", "important"\)/);
  assert.doesNotMatch(override, /apps\.apple\.com/);
  assert.match(runtimeConfig, /appStoreReviewUrl:\s*""/);
  assert.match(popupHtml, /id="appStoreReview"[^>]*class="app-store-review hidden"/);
  assert.match(popupJs, /hostname === "apps\.apple\.com"[\s\S]*action"\) === "write-review"/);
  assert.match(popupCss, /html\[data-compr-platform="safari"\][\s\S]*\.chrome-store-review\s*\{\s*display:none!important/);
});

test("Chrome and Safari production builds keep guest access disabled without browser sniffing", () => {
  assert.match(runtimeConfig, /platform:\s*"chrome"/);
  assert.match(runtimeConfig, /guestMode:\s*false/);
  assert.match(authJs, /platform !== "safari" \|\| ComprRuntimeConfig\.guestMode !== true/);
  const build = fs.readFileSync(path.join(root, "tools", "build-safari-extension.ps1"), "utf8");
  assert.match(build, /platform:\s*`"safari`"/); assert.match(build, /guestMode: false/);
  assert.match(popupJs, /ComprRuntimeConfig\.platform === "safari"[\s\S]*ComprSafariPopup\.start/);
  assert.match(popupJs, /ComprAppleBilling\.purchase[\s\S]*syncAppleTransaction[\s\S]*ComprAppleBilling\.finish/);
  assert.match(popupJs, /ComprAppleBilling\.restore/);
  assert.match(safariPopupJs, /ComprAuth\.getSession\(\)[\s\S]*guestMode===true[\s\S]*ensureGuestSession/);
  assert.match(popupHtml, /id="safariSignIn"[^>]*href="compr:\/\/signin"/);
  assert.match(popupJs, /accountOpen\.classList\.add\("hidden"\)/);
  assert.match(popupJs, /await ComprApi\.resetGuest\(\)[\s\S]*await ComprBrowser\.storage\.local\.clear\(\)/);
});

test("Safari guest initialization uses Supabase Auth and never adds a client quota counter", () => {
  assert.match(authJs, /request\("\/signup", \{ method: "POST", body: "\{\}" \}\)/);
  assert.doesNotMatch(authJs, /guestUsage|guestQuota|deviceId|installationId/i);
});

test("Safari billing uses StoreKit while other platforms retain Stripe", () => {
  assert.match(popupJs, /platform === "safari"[\s\S]*ComprAppleBilling\.purchase[\s\S]*return;[\s\S]*ComprApi\.createCheckout/);
  assert.match(popupJs, /platform === "safari"[\s\S]*Manage your Apple subscription in the App Store\.[\s\S]*ComprApi\.createBillingPortal/);
  assert.match(compareJs, /async function openSecureBilling[\s\S]*platform === "safari"[\s\S]*APPLE_BILLING_UNAVAILABLE[\s\S]*await createSession\(\)/);
});

test("Safari native billing bridge allowlists products and defers finish until server sync", () => {
  const billing = fs.readFileSync(path.join(source, "shared", "appleBilling.js"), "utf8");
  const handler = fs.readFileSync(path.join(root, "safari-mac-day-kit", "container-app", "SafariWebExtensionHandler.swift"), "utf8");
  assert.match(popupHtml, /shared\/runtimeConfig\.js[\s\S]*shared\/appleBilling\.js[\s\S]*safari-popup\.js/);
  assert.match(billing, /sendNativeMessage\(APP_ID, \{ action: "billing\.products" \}\)/);
  assert.match(handler, /case "billing\.products"/);
  assert.match(handler, /Product\.products\(for: productIDs\)/);
  assert.match(handler, /product\.purchase\(options: \[\.appAccountToken\(accountToken\)\]\)/);
  assert.match(handler, /AppStore\.sync\(\)/);assert.match(handler, /verification\.jwsRepresentation/);
  assert.match(billing, /syncAndFinish|billing\.finish/);
  assert.doesNotMatch(handler, /os_log|NSLog|print\(/);
});

test("generated Xcode configuration preserves native Apple auth and StoreKit bridges", () => {
  const handler = fs.readFileSync(path.join(root, "safari-mac-day-kit", "container-app", "SafariWebExtensionHandler.swift"), "utf8");
  const sceneDelegate = fs.readFileSync(path.join(root, "safari-mac-day-kit", "container-app", "SceneDelegate.swift"), "utf8");
  const configure = fs.readFileSync(path.join(root, "safari-mac-day-kit", "configure-generated-xcode-project.sh"), "utf8");
  for (const action of ["auth.openApp", "auth.session", "auth.storeSession", "auth.clear", "billing.products", "billing.purchase", "billing.restore", "billing.finish"]) {
    assert.match(handler, new RegExp(action.replace(".", "\\.")));
    assert.match(configure, new RegExp(action.replace(".", "\\.")));
  }
  assert.match(handler, /AUTH_SESSION_REJECTED/);
  assert.match(handler, /claims\["iss"\].*ComprNativeAuthConfig\.url/);
  for (const productId of ["nl.getcompr.pro.monthly", "nl.getcompr.pro.yearly",
    "nl.getcompr.ultimate.monthly", "nl.getcompr.ultimate.yearly"]) {
    assert.match(handler, new RegExp(productId.replaceAll(".", "\\.")));
    assert.match(configure, new RegExp(productId.replaceAll(".", "\\.")));
  }
  assert.match(handler, /group\.nl\.getcompr\.compr/);
  assert.match(handler, /compr:\/\/signin/);
  assert.match(sceneDelegate, /context\.url\.scheme == "compr" && context\.url\.host == "signin"/);
  assert.match(configure, /cp "\$container_app\/SafariWebExtensionHandler\.swift" "\$extension_handler"/);
  assert.match(configure, /cp "\$container_app\/SceneDelegate\.swift" "\$scene_delegate"/);
  assert.match(configure, /com\.apple\.developer\.applesignin/);
  assert.match(configure, /group\.nl\.getcompr\.compr/);
});

test("build exposes exclusive validation and staging modes and rejects unsafe input", () => {
  const build = fs.readFileSync(path.join(root, "tools", "build-safari-extension.ps1"), "utf8");
  assert.match(build, /Choose exactly one mode: -ValidationOnly or -StageConverterInput/);
  assert.match(build, /safari-converter-input/);
  assert.match(build, /Output must remain under build/);
  assert.match(build, /New-Item -ItemType Directory -Force -Path \(Split-Path -Parent \$out\)/);
  assert.match(build, /SAFARI_PRODUCTION_API_URL_REQUIRED/);
  assert.match(build, /\.env/);
  assert.match(build, /service_role/);
  assert.match(build, /localhost/);
  assert.match(build, /Auth callback must be exactly https:\/\/getcompr\.nl\/auth-callback\.html/);
  assert.match(build, /App Store review URL must be an apps\.apple\.com app URL/);
  assert.match(build, /appStoreReviewUrl: \$\(\$vals\[6\]\)/);
  assert.doesNotMatch(build, /Compress-Archive|App Store Connect|TestFlight|xcrun/);
});
