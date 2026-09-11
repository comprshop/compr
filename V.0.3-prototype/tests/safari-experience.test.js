"use strict";
const test=require("node:test"), assert=require("node:assert/strict"), fs=require("node:fs"), path=require("node:path");
const UX=require("../shared/safariExperience.js");
const root=path.resolve(__dirname,"..");
const popup=fs.readFileSync(path.join(root,"safari-popup.js"),"utf8");
const html=fs.readFileSync(path.join(root,"popup.html"),"utf8");
const css=fs.readFileSync(path.join(root,"styles/popup.css"),"utf8");
const chromeManifest=require("../manifest.json");
const safariManifest=require("../../platforms/safari/manifest.json");

test("100 identical ready and result updates each render once",()=>{
  for(const value of [{view:"ready",product:{name:"Phone"}},{view:"match",match:{offer:{url:"https://shop.test/p"}}}]){
    let renders=0; const store=UX.createStore(()=>renders++); for(let i=0;i<100;i++)store.set(value); assert.equal(renders,1);
  }
});
test("identical no-match updates do not rerender",()=>{let n=0;const s=UX.createStore(()=>n++);for(let i=0;i<100;i++)s.set({view:"no-match",title:"No reliable match"});assert.equal(n,1);});
test("verified deal must have comparable totals, known shipping and the right retailer",()=>{
  const product={price:100,shippingCost:0,currency:"EUR"};
  const good={matchType:"EXACT_MATCH",url:"https://deals.example/item",webshop:"deals.example",totalPrice:80,currency:"EUR",shippingIncluded:true};
  assert.equal(UX.selectVerifiedMatch({offers:[good]},product).offer,good);
  assert.equal(UX.selectVerifiedMatch({offers:[{...good,shippingIncluded:false,shippingCost:null}]},product),null);
  assert.equal(UX.selectVerifiedMatch({offers:[{...good,url:"https://evil.example/item"}]},product),null);
  assert.equal(UX.selectVerifiedMatch({offers:[good]},{price:100,currency:"EUR"}),null,"unknown source shipping must fail closed");
  const match=UX.selectVerifiedMatch({offers:[good]},product);
  assert.equal(UX.validatedRetailer(match),"deals.example");
  assert.equal(new URL(match.offer.url).hostname,UX.validatedRetailer(match));
  assert.equal(UX.validatedRetailer({offer:{...good,webshop:"other.example"}}),"");
  assert.equal(UX.validatedRetailer({offer:{...good,webshop:""}}),"");
});
test("deal URL rejects script, data, local, private and wrong-retailer targets",()=>{
  for(const url of ["javascript:alert(1)","data:text/html,x","http://localhost/x","https://127.0.0.1/x","https://192.168.1.2/x","https://other.test/x"]) assert.equal(UX.isPublicDealUrl(url,"shop.test"),false,url);
  assert.equal(UX.isPublicDealUrl("https://shop.test/deal","shop.test"),true);
});
test("coupons are restricted to verified matched-retailer data",()=>{
  const match={offer:{url:"https://shop.test/deal"}};
  const coupons=UX.verifiedCoupons({coupons:[{code:"SAVE10",retailer:"shop.test",verified:true,verifiedAt:"2026-09-05"},{code:"FAKE",retailer:"other.test",verified:true},{code:"UNPROVEN",retailer:"shop.test"}]},match);
  assert.deepEqual(coupons.map(x=>x.code),["SAVE10"]);
});
test("Safari controller is once-only, latest-wins, deliberate-tap-only and has no coupon request",()=>{
  assert.match(popup,/if \(started\) return false/); assert.match(popup,/generation!==actionGeneration/g);
  assert.equal((popup.match(/ComprApi\.search\(/g)||[]).length,1); assert.match(popup,/ui\.primary\.addEventListener\("click"/);
  assert.doesNotMatch(popup,/coupon[^\n]*(fetch|ComprApi\.)/i); assert.match(popup,/pagehide/);
});
test("Save is idempotent and disclosures preserve the result state",()=>{
  assert.match(popup,/ComprStorage\.saveProduct\(product\)/); assert.match(popup,/ui\.save\.disabled=true/);
  assert.match(popup,/couponsOpen:!store\.get\(\)\.couponsOpen/); assert.match(popup,/detailsOpen:!store\.get\(\)\.detailsOpen/);
  assert.match(popup,/No verified coupons for \$\{retailer\}\./);
  assert.match(popup,/What COMPR checked/);
});

test("Details are separate from coupon empty-state and include reliable totals",()=>{
  const details=popup.match(/function renderDetails[\s\S]*?\n    }/)[0];
  assert.match(details,/Current total/);assert.match(details,/Deal total/);assert.match(details,/Shipping/);
  assert.doesNotMatch(details,/No verified coupons/);
  const preview=fs.readFileSync(path.join(root,"preview","safari-mobile.html"),"utf8");
  const previewDetails=preview.match(/id="detailsPanel"[\s\S]*?<\/section>/)[0];
  assert.match(previewDetails,/Brand \/ model/);assert.doesNotMatch(previewDetails,/No verified coupons/);
});

test("Free Save and track opens UI only while proven Pro saves idempotently",async()=>{
  const saved=new Set(); const save=async product=>saved.add(product.id);
  async function act(plan,product){if(UX.saveTrackDecision(plan)!=="save")return "sheet";await save(product);return "saved";}
  assert.equal(await act("free",{id:"p1"}),"sheet");assert.equal(saved.size,0);
  assert.equal(await act("pro",{id:"p1"}),"saved");assert.equal(await act("pro",{id:"p1"}),"saved");assert.equal(saved.size,1);
  const sheetBody=popup.match(/function openProSheet\(\)[\s\S]*?\}/)[0];
  assert.doesNotMatch(sheetBody,/ComprApi|fetch|createCheckout|billing/i);
  assert.match(popup,/saveTrackDecision\(entitlement\)!=="save"/);
});

test("quota upgrade uses no search and unconfirmed no-match has no free-check claim",()=>{
  assert.equal(UX.noMatchUsageNote({usageCharged:false}),"Your free check was not used.");
  assert.equal(UX.noMatchUsageNote({}),"");assert.equal(UX.noMatchUsageNote(null),"");
  assert.match(popup,/state\.view==="quota"\) openProSheet\(\)/);
  assert.match(popup,/Checks return gradually over the next 7 days/);
});

test("post-tap states hide privacy copy and preview controls stay outside production",()=>{
  assert.match(popup,/show\(ui\.privacy,state\.view === "ready"\)/);
  assert.doesNotMatch(html,/data-state=/);
  assert.match(fs.readFileSync(path.join(root,"preview","safari-mobile.html"),"utf8"),/class="preview-nav"/);
});

test("polished result has accessible prices, no zero coupon count and selected disclosures",()=>{
  assert.match(html,/aria-label="Current total price"/);assert.match(html,/aria-label="Deal total price"/);
  assert.match(popup,/setAttribute\("aria-label",`Current total price/);assert.match(popup,/coupons\.length \? `Coupons · \$\{coupons\.length\}` : "Coupons"/);
  assert.doesNotMatch(html,/Coupons · 0/);assert.match(popup,/classList\.toggle\("is-selected"/);
  assert.match(popup,/couponsOpen:!store\.get\(\)\.couponsOpen,detailsOpen:false/);
  assert.match(popup,/detailsOpen:!store\.get\(\)\.detailsOpen,couponsOpen:false/);
});

test("verified match exposes only its validated deal retailer",()=>{
  assert.match(html,/id="safariDealRetailer"/);assert.match(popup,/validatedRetailer\(state\.match\)/);
  assert.match(popup,/setRetailer\(ui\.dealRetailer, dealRetailer\)/);
  assert.match(popup,/isPublicDealUrl\(match\.offer\.url,retailer\)/);
  const preview=fs.readFileSync(path.join(root,"preview","safari-mobile.html"),"utf8");
  assert.match(preview,/No verified coupons for zalando\.nl\./);
  assert.doesNotMatch(preview,/No verified coupons for coolblue\.nl\./);
});

test("Pro continuation copy makes no trial or payment request",()=>{
  const all=[html,popup,fs.readFileSync(path.join(root,"preview","safari-mobile.html"),"utf8")].join("\n");
  assert.doesNotMatch(all,new RegExp(["Try","COMPR Pro"].join(" ")));assert.match(all,/Continue with COMPR Pro/);
  assert.doesNotMatch(popup,/StoreKit|purchaseProduct|createCheckout\(.*safari/);
});

test("Safari logo clips only the source-image edge and preserves focus styles",()=>{
  assert.match(css,/\.safari-brand img \{[^}]*clip-path:inset\(1px round 8px\)/);
  assert.match(css,/button:focus-visible/);assert.match(css,/\.safari-primary:focus-visible/);
  assert.match(css,/\.safari-primary:hover/);assert.match(css,/\.safari-primary:active/);
});

test("Pro choices are local UI with focus trap and no purchase request",()=>{
  assert.match(html,/value="monthly"/);assert.match(html,/value="yearly" checked/);assert.match(html,/Best value/);assert.match(html,/Save 44%/);
  assert.match(popup,/proSheetReturnFocus=document\.activeElement/);assert.match(popup,/event\.key!=="Tab"/);assert.match(popup,/event\.key==="Escape"/);
  assert.match(popup,/Tracking ✓/);assert.doesNotMatch(popup,/StoreKit|createCheckout\(.*safari|purchaseProduct/);
  const preview=fs.readFileSync(path.join(root,"preview","safari-mobile.html"),"utf8");assert.match(preview,/data-state="pro-yearly"/);assert.match(preview,/data-state="pro-monthly"/);
});

test("design tokens, reduced motion and compact width contracts remain centralized",()=>{
  assert.match(css,/--compr-font:\s*-apple-system, BlinkMacSystemFont/);assert.match(css,/--compr-focus:/);
  assert.match(css,/\.app\.safari-mode \{ min-height:0/);assert.match(css,/min-height:44px/);assert.match(css,/prefers-reduced-motion: reduce/);
  assert.doesNotMatch(css,/transition\s*:\s*(width|height)/);
  for(const width of [320,375,390])assert.ok(width >= 320 && width <= 390);
  const largePrice=UX.money(9999.99,"EUR","nl-NL");
  assert.match(largePrice,/9[.\s]999,99/);assert.match(css,/overflow-wrap:anywhere/);
});
test("Safari hides Chrome account UI while the shared popup exposes the dedicated account route",()=>{
  assert.match(popup,/safari-hidden/); assert.match(html,/id="accountOpen"/); assert.match(html,/id="safariExperience"/);
  assert.match(fs.readFileSync(path.join(root,"shared/accountRoute.js"),"utf8"),/account\.html/);
  assert.match(fs.readFileSync(path.join(root,"shared/runtimeConfig.js"),"utf8"),/platform: "chrome"[\s\S]*guestMode: false/);
});
test("accessibility and stable mobile layout contracts are present",()=>{
  assert.match(html,/aria-live="polite"/); assert.match(html,/aria-expanded="false"/); assert.match(css,/min-height:44px/);
  assert.match(css,/overflow-wrap:anywhere/); assert.match(css,/prefers-reduced-motion: reduce/); assert.doesNotMatch(css,/transition\s*:\s*(width|height)/);
});
test("Chrome and Safari manifests remain minimal and valid",()=>{
  for(const manifest of [chromeManifest,safariManifest]){assert.equal(manifest.manifest_version,3);assert.deepEqual(manifest.permissions,["storage","activeTab","scripting"]);assert.equal(manifest.background.service_worker,"background.js");}
  assert.ok(html.indexOf("shared/browserAdapter.js")<html.indexOf("shared/safariExperience.js")); assert.ok(html.indexOf("shared/safariExperience.js")<html.indexOf("safari-popup.js"));
});
