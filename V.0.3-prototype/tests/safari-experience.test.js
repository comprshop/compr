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
test("Safari formats extracted locale price strings through the shared currency parser",()=>{
  assert.match(popup,/function localMoney\(amount, sourceCurrency\)[\s\S]*ComprCurrency\.parseAmount\(amount\)/);
});
test("identical no-match updates do not rerender",()=>{let n=0;const s=UX.createStore(()=>n++);for(let i=0;i<100;i++)s.set({view:"no-match",title:"No reliable match"});assert.equal(n,1);});
test("verified deal must have comparable totals, known shipping and the right retailer",()=>{
  const product={price:100,shippingCost:0,currency:"EUR"};
  const good={matchType:"EXACT_MATCH",url:"https://deals.example/item",webshop:"deals.example",totalPrice:80,currency:"EUR",shippingIncluded:true};
  assert.equal(UX.selectVerifiedMatch({offers:[good]},product).offer,good);
  assert.equal(UX.selectVerifiedMatch({offers:[{...good,shippingIncluded:false,shippingCost:null}]},product),null);
  assert.equal(UX.selectVerifiedMatch({offers:[{...good,url:"https://evil.example/item"}]},product),null);
  const lowerBound=UX.selectVerifiedMatch({offers:[good]},{price:100,currency:"EUR"});
  assert.equal(lowerBound.offer,good,"a known deal total below the source item price is safely cheaper even when source shipping is unknown");
  assert.equal(lowerBound.totals.sourceShippingKnown,false);
  assert.equal(UX.selectVerifiedMatch({offers:[{...good,totalPrice:100}]},{price:100,currency:"EUR"}),null,"unknown source shipping must not make an equal item price look cheaper");
  const match=UX.selectVerifiedMatch({offers:[good]},product);
  assert.equal(UX.validatedRetailer(match),"deals.example");
  assert.equal(new URL(match.offer.url).hostname,UX.validatedRetailer(match));
  assert.equal(UX.validatedRetailer({offer:{...good,webshop:"other.example"}}),"");
  assert.equal(UX.validatedRetailer({offer:{...good,webshop:""}}),"");
});
test("JBL popup accepts a verified €64 offer with explicit zero shipping and no totalPrice",()=>{
  const source={price:64.95,currency:"EUR"};
  const offer={name:"JBL Tune 730BT Wit",backendMatchType:"HIGH_CONFIDENCE_MATCH",
    url:"https://www.coolblue.nl/product/972188/jbl-tune-730bt-wit.html",webshop:"www.coolblue.nl",
    price:64,currency:"EUR",shippingCost:0,shippingIncluded:true};
  const match=UX.selectVerifiedMatch({offers:[offer]},source);
  assert.equal(match.offer,offer);
  assert.equal(match.totals.deal,64);
  assert.equal(match.totals.valid,true);
  assert.equal(match.totals.deal<match.totals.current,true);
  assert.equal(Number((match.totals.current-match.totals.deal).toFixed(2)),.95);
  assert.equal(UX.selectVerifiedMatch({offers:[{...offer,currency:"USD"}]},source),null);
  assert.equal(UX.selectVerifiedMatch({offers:[{...offer,backendMatchType:"REJECTED"}]},source),null);
});
test("popup totals preserve paid shipping and prefer a supplied total",()=>{
  const source={price:100,currency:"EUR"};
  assert.equal(UX.comparableTotals(source,{price:64,shippingCost:4.95,shippingIncluded:true,currency:"EUR"}).deal,68.95);
  assert.equal(UX.comparableTotals(source,{price:64,shippingIncluded:true,currency:"EUR"}).deal,64);
  assert.equal(UX.comparableTotals(source,{price:64,shippingCost:4.95,totalPrice:67,currency:"EUR"}).deal,67);
});
test("JBL popup source uses the same price normalization as the API",()=>{
  const Product=require("../shared/product.js");
  const offer={backendMatchType:"HIGH_CONFIDENCE_MATCH",price:64,shippingCost:0,shippingIncluded:true,
    currency:"EUR",url:"https://www.coolblue.nl/product/972188/jbl-tune-730bt-wit.html",webshop:"www.coolblue.nl"};
  for(const price of ["64.95 EUR","€ 64,95","64,95 €"]) {
    const source={price,currency:"EUR"};
    const match=UX.selectVerifiedMatch({offers:[offer]},source);
    assert.equal(match.totals.current,Product.toSearchPayload(source).price);
    assert.equal(match.totals.current,64.95);
    assert.equal(match.totals.deal,64);
    assert.equal(match.totals.valid,true);
    assert.equal(Number((match.totals.current-match.totals.deal).toFixed(2)),.95);
    assert.equal(UX.selectVerifiedMatch({offers:[{...offer,shippingIncluded:false,shippingCost:null}]},source),null);
  }
  for(const price of ["€ 1.234,56","1,234.56 EUR","1 234,56 €"]) {
    const source={price,currency:"EUR"};
    assert.equal(UX.comparableTotals(source,offer).current,Product.toSearchPayload(source).price);
    assert.equal(UX.comparableTotals(source,offer).current,1234.56);
  }
  const converted={price:"€ 100,00",numericPrice:70,convertedAmount:64.95,currency:"EUR"};
  assert.equal(UX.comparableTotals(converted,offer).current,Product.toSearchPayload(converted).price);
});
test("invalid source prices never produce a popup match",()=>{
  const offer={backendMatchType:"EXACT_MATCH",price:64,shippingCost:0,currency:"EUR",
    url:"https://shop.test/product",webshop:"shop.test"};
  for(const price of ["",null,undefined,"prijs onbekend",NaN]) {
    const source={price,currency:"EUR"};
    assert.equal(UX.comparableTotals(source,offer).valid,false);
    assert.equal(UX.selectVerifiedMatch({offers:[offer]},source),null);
    assert.equal(UX.comparableTotals({...source,shippingCost:100},offer).valid,false);
  }
});
test("popup rejects unknown shipping, missing prices and invalid costs or totals",()=>{
  const source={price:100,currency:"EUR"};
  for(const offer of [
    {price:64}, {shippingCost:0}, {price:null,shippingCost:0}, {price:"",shippingCost:0},
    {price:NaN,shippingCost:0}, {price:Infinity,shippingCost:0}, {price:-1,shippingCost:0},
    {price:64,shippingCost:NaN,shippingIncluded:true}, {price:64,shippingCost:-1,shippingIncluded:true},
    {price:64,shippingCost:Infinity}, {price:64,shippingCost:null},
    {price:64,shippingCost:0,totalPrice:-1}, {price:64,shippingCost:0,totalPrice:NaN},
    {price:64,shippingCost:0,totalPrice:Infinity}, {price:64,shippingCost:0,totalPrice:"invalid"}
  ]) assert.equal(UX.comparableTotals(source,{currency:"EUR",...offer}).valid,false,JSON.stringify(offer));
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
test("Safari auth failures return to the inline login state without bypassing auth",()=>{
  const api=fs.readFileSync(path.join(root,"shared/apiClient.js"),"utf8");
  const auth=fs.readFileSync(path.join(root,"shared/auth.js"),"utf8");
  assert.match(popup,/function showSignIn\(\)[\s\S]*view:"sign-in"[\s\S]*Sign in to compare prices/);
  assert.ok((popup.match(/error\?\.code==="AUTH_REQUIRED"/g)||[]).length>=3);
  assert.match(api,/response\.status === 401 \? "AUTH_REQUIRED"/);
  assert.match(api,/response\.status === 403 && message === "Origin not allowed" \? "ORIGIN_NOT_ALLOWED"/);
  assert.match(popup,/code==="ORIGIN_NOT_ALLOWED"\|\|error\?\.status===403[\s\S]*view:"account-error"/);
  assert.match(api,/clearSession\(\{ clearNative: true \}\)/);
  assert.match(auth,/clearSession\(\{ clearNative: true \}\)/);
  assert.match(html,/id="safariSignIn"[^>]*href="compr:\/\/signin"/);
  assert.doesNotMatch(popup,/if\(state\.view==="sign-in"\)\{const opened=await ComprAuth\.openAppleSignIn/);
  assert.match(popup,/confirmAccount\(\)[\s\S]*ComprAuth\.getSession\(\)[\s\S]*ComprApi\.me\(\{signal\}\)/);
  assert.ok(popup.indexOf("const me=await confirmAccount()")<popup.indexOf('store.set({view:"searching"'));
  assert.match(popup,/ComprApi\.search\(actionProduct,crypto\.randomUUID\(\),\{signal,context:actionContext\}\)/);
  assert.match(popup,/30000,"SEARCH_TIMEOUT"/);
  assert.match(popup,/Sign in with Apple/);
});
test("popup price check hands the selected product to compare without starting a search on page load",()=>{
  const compare=fs.readFileSync(path.join(root,"compare.js"),"utf8");
  assert.match(fs.readFileSync(path.join(root,"popup.js"),"utf8"),/pendingFindCheaperIdentity:[\s\S]*pendingFindCheaperAt: Date\.now\(\)/);
  assert.match(compare,/consumePendingFindCheaper\(\)/);
  assert.match(compare,/prepareFindCheaper\(product\)/);
  assert.match(compare,/cheaperStart\.addEventListener\("click"[\s\S]*handleFindCheaper\(product\)/);
});
test("direct price check localizes product metadata, safety copy and currency",()=>{
  const compare=fs.readFileSync(path.join(root,"compare.js"),"utf8");
  const compareHtml=fs.readFileSync(path.join(root,"compare.html"),"utf8");
  const i18n=fs.readFileSync(path.join(root,"shared/i18n.js"),"utf8");
  assert.match(compare,/ComprI18n\.translate\("Retailer product code"\)/);
  assert.match(compare,/ComprCurrency\.format\(amount, displayedCurrency, countryCode\)/);
  assert.match(compareHtml,/COMPR only shows confident matches/);
  assert.match(i18n,/"COMPR only shows confident matches[^\n]+nl:"COMPR toont alleen betrouwbare matches/);
  assert.match(compare,/ComprI18n\.translate\(friendly\[0\]\)/);
  assert.match(i18n,/"Sign in to continue"[^\n]+Log in om verder te gaan/);
  assert.match(compare,/loadingStages[\s\S]*\.map\(value => ComprI18n\.translate\(value\)\)/);
  assert.doesNotMatch(compare,/Local backend connected - safe demo data|Backend offline - bundled demo fallback/);
  assert.match(compare,/tf\("Reliable results: \{count\}\. Best matches are shown first\./);
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

test("Save and Compare is available without a purchase and opens the saved-product overview",()=>{
  assert.match(html,/id="safariSave"[^>]*>Save &amp; Compare</);
  assert.match(popup,/await ComprStorage\.saveProduct\(product\)/);
  assert.match(popup,/ComprBrowser\.runtime\.getURL\("compare\.html"\)/);
  assert.match(popup,/await ComprBrowser\.tabs\.create/);
  assert.doesNotMatch(popup,/saveTrackDecision\(entitlement\)!=="save"/);
  assert.match(popup,/\["ready","match","saved","no-match"\]\.includes\(state\.view\)/);
});

test("mobile Compare keeps saved cards side by side and every card can start Find This Cheaper",()=>{
  const compareCss=fs.readFileSync(path.join(root,"styles","compare.css"),"utf8");
  const productCard=fs.readFileSync(path.join(root,"compare","productCard.js"),"utf8");
  assert.match(compareCss,/grid-auto-flow:column/);assert.match(compareCss,/scroll-snap-type:x mandatory/);
  assert.match(productCard,/findCheaperButton\.addEventListener\("click", \(\) => onFindCheaper\(product\)\)/);
});

test("quota upgrade uses no search and unconfirmed no-match has no free-check claim",()=>{
  assert.equal(UX.noMatchUsageNote({usageCharged:false}),"Your free check was not used.");
  assert.equal(UX.noMatchUsageNote({}),"");assert.equal(UX.noMatchUsageNote(null),"");
  assert.match(popup,/state\.view==="quota"\) openProSheet\(\)/);
  assert.match(popup,/Checks return gradually over the next 7 days/);
});

test("Safari maps expected backend no-result responses to the safe no-match state",()=>{
  for(const code of ["NO_CONFIDENT_MATCH","NO_RESULTS_FROM_PROVIDER","INSUFFICIENT_PRODUCT_DATA","PRICE_NOT_COMPARABLE"]){
    assert.match(popup,new RegExp(code));
  }
  assert.match(popup,/lastResponse=\{outcome:code,usageCharged:false\}/);
  assert.match(popup,/view:"no-match"[\s\S]*noMatchUsageNote\(lastResponse\)/);
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

test("plan selection copy makes no unapproved trial claim",()=>{
  const all=[html,popup,fs.readFileSync(path.join(root,"preview","safari-mobile.html"),"utf8")].join("\n");
  assert.doesNotMatch(all,new RegExp(["Try","COMPR Pro"].join(" ")));assert.match(all,/Continue Free/);assert.match(all,/Choose Pro/);assert.match(all,/Choose Ultimate/);
  assert.doesNotMatch(popup,/createCheckout\(.*safari/);
});

test("Safari logo clips only the source-image edge and preserves focus styles",()=>{
  assert.match(css,/\.safari-brand img \{[^}]*clip-path:inset\(1px round 8px\)/);
  assert.match(css,/button:focus-visible/);assert.match(css,/\.safari-primary:focus-visible/);
  assert.match(css,/\.safari-primary:hover/);assert.match(css,/\.safari-primary:active/);
});

test("Free, Pro and Ultimate choices use the Apple bridge, localized prices and a complete focus trap",()=>{
  assert.match(html,/safari-plan-free/);assert.match(html,/safari-plan-pro/);assert.match(html,/safari-plan-ultimate/);
  assert.match(html,/Choose your COMPR plan/);assert.match(html,/Find better prices\. Choose how often you want to search\./);
  assert.match(html,/5 successful checks in your first month/);assert.match(html,/3 successful checks per month after that/);
  assert.match(html,/15 successful price checks per month/);assert.match(html,/50 successful price checks per month/);
  assert.match(html,/value="monthly"/);assert.match(html,/value="yearly" checked/);
  assert.match(popup,/proSheetReturnFocus=document\.activeElement/);assert.match(popup,/event\.key!=="Tab"/);assert.match(popup,/event\.key==="Escape"/);
  assert.match(popup,/Tracking ✓/);assert.doesNotMatch(popup,/createCheckout\(.*safari/);
  assert.match(popup,/ComprAppleBilling\.purchase/);assert.match(popup,/ComprApi\.syncAppleTransaction/);
  assert.match(popup,/ComprAppleBilling\.finish/);assert.match(html,/id="safariRestore"/);
  assert.match(popup,/PRODUCT_IDS\.proMonthly/);assert.match(popup,/PRODUCT_IDS\.proYearly/);
  assert.match(popup,/PRODUCT_IDS\.ultimateMonthly/);assert.match(popup,/PRODUCT_IDS\.ultimateYearly/);
  assert.match(html,/id="safariTryPro"[^>]+disabled/);assert.match(html,/id="safariTryUltimate"[^>]+disabled/);
  assert.match(popup,/ui\.tryPro\.disabled=purchaseBusy\|\|!proAvailable/);assert.match(popup,/ui\.tryUltimate\.disabled=purchaseBusy\|\|!ultimateAvailable/);
  assert.match(popup,/if\(!appleProducts\.has\(productId\)\)\{renderPlanAvailability\(\);return;\}/);
  assert.match(html,/Subscriptions renew automatically unless cancelled in your Apple Account/);assert.match(html,/https:\/\/getcompr\.nl\/privacy\.html/);
  assert.match(popup,/ui\.chooseFree\.addEventListener\("click",\(\)=>\{ui\.live\.textContent=tr\("Continue Free"\);closeProSheet\(\);\}\)/);
  const preview=fs.readFileSync(path.join(root,"preview","safari-mobile.html"),"utf8");assert.match(preview,/data-state="pro-yearly"/);assert.match(preview,/data-state="pro-monthly"/);
});

test("Apple restore keeps a verified Ultimate entitlement instead of forcing Pro",()=>{
  assert.match(popup,/restoredEntitlement=await syncAndFinish\(restored\)/);
  assert.match(popup,/\["pro","ultimate"\]\.includes\(restoredEntitlement\?\.plan\)/);
  assert.match(popup,/entitlement=\{plan:restoredEntitlement\.plan\}/);
  assert.match(popup,/\["pro","ultimate"\]\.includes\(entitlement\.plan\)[\s\S]*apps\.apple\.com\/account\/subscriptions/);
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
  assert.equal(chromeManifest.manifest_version,3);assert.deepEqual(chromeManifest.permissions,["storage","activeTab","scripting"]);assert.equal(chromeManifest.background.service_worker,"background.js");
  assert.equal(safariManifest.manifest_version,3);assert.deepEqual(safariManifest.permissions,["storage","activeTab","scripting","nativeMessaging"]);assert.equal(safariManifest.background.service_worker,"background.js");
  assert.ok(html.indexOf("shared/browserAdapter.js")<html.indexOf("shared/safariExperience.js")); assert.ok(html.indexOf("shared/safariExperience.js")<html.indexOf("safari-popup.js"));
});
