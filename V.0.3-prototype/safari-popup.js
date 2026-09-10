(function (root) {
  "use strict";
  let started = false;

  async function start() {
    if (started) return false;
    started = true;
    document.documentElement.classList.remove("chrome-popup");
    document.documentElement.classList.add("safari-popup");
    const ui = Object.fromEntries(["Experience","Panel","Live","Loader","Eyebrow","Title","Copy","Product","Image","ProductName","Store","CurrentPrice","Savings","Saving","OldTotal","DealTotal","CurrentRetailer","DealRetailer","Shipping","Trust","Primary","Privacy","UsageNote","Actions","Save","CouponsToggle","DetailsToggle","Coupons","Details","ProSheet","TryPro","NotNow","PlanMonthly","PlanYearly"]
      .map(name => [name[0].toLowerCase() + name.slice(1), document.getElementById(`safari${name}`)]));
    document.querySelectorAll(".app > :not(#safariExperience):not(#toast):not(#comparePrompt)").forEach(node => node.classList.add("safari-hidden"));
    document.querySelector(".app").classList.add("safari-mode");
    ui.experience.classList.remove("hidden");
    let product = null, match = null, lastResponse = null, entitlement = { plan: "free" }, actionGeneration = 0, disposed = false;
    const store = ComprSafariExperience.createStore(render);
    ui.image.addEventListener("error",()=>{ui.image.hidden=true;ui.image.parentElement.classList.add("missing-image");});

    function text(node, value) { node.textContent = value || ""; }
    function show(node, visible) { node.classList.toggle("hidden", !visible); }
    function render(state) {
      const busy = ["guest-initializing", "searching"].includes(state.view);
      ui.panel.setAttribute("aria-busy", String(busy)); show(ui.loader, busy);
      const hasResult = (state.view === "match" || state.view === "saved") && Boolean(ComprSafariExperience.validatedRetailer(state.match));
      const compactWithoutProduct=["quota","offline","provider-error","timeout"].includes(state.view);
      show(ui.product, Boolean(state.product) && !compactWithoutProduct); show(ui.savings, hasResult);
      const explainsNoMatch=state.view==="no-match";
      show(ui.actions, hasResult||explainsNoMatch); show(ui.save,hasResult); show(ui.couponsToggle,hasResult);
      ui.actions.classList.toggle("is-explanation",explainsNoMatch);
      show(ui.coupons, hasResult && state.couponsOpen); show(ui.details, (hasResult||explainsNoMatch) && state.detailsOpen);
      ui.couponsToggle.setAttribute("aria-expanded", String(Boolean(state.couponsOpen)));
      ui.detailsToggle.setAttribute("aria-expanded", String(Boolean(state.detailsOpen)));
      ui.couponsToggle.classList.toggle("is-selected",Boolean(state.couponsOpen));
      ui.detailsToggle.classList.toggle("is-selected",Boolean(state.detailsOpen));
      ui.primary.disabled = busy; show(ui.primary, Boolean(state.primary)); text(ui.primary, state.primary);
      ui.primary.classList.toggle("is-retry",["no-match","offline","provider-error","timeout"].includes(state.view));
      text(ui.eyebrow, state.eyebrow); text(ui.title, state.title); text(ui.copy, state.copy);
      text(ui.live, `${state.title || ""} ${state.copy || ""}`.trim());
      show(ui.privacy,state.view === "ready"); ui.privacy.textContent = "Nothing is checked until you tap.";
      show(ui.usageNote,Boolean(state.usageNote)); text(ui.usageNote,state.usageNote);
      if (state.product) {
        text(ui.productName, state.product.name); text(ui.store, state.product.webshop);
        text(ui.currentPrice, ComprSafariExperience.money(state.product.totalPrice ?? state.product.price, state.product.currency));
        if (ComprProduct.getSafeWebUrl(state.product.image)) { ui.image.src = state.product.image; ui.image.hidden = false; ui.image.parentElement.classList.remove("missing-image"); }
        else { ui.image.removeAttribute("src"); ui.image.hidden = true; ui.image.parentElement.classList.add("missing-image"); }
      }
      if (state.match) {
        ui.detailsToggle.textContent="Details";
        const totals = state.match.totals, offer = state.match.offer;
        const dealRetailer=ComprSafariExperience.validatedRetailer(state.match);
        text(ui.saving, `Save ${ComprSafariExperience.money(totals.current - totals.deal, totals.currency)}`);
        text(ui.oldTotal, ComprSafariExperience.money(totals.current, totals.currency));
        text(ui.dealTotal, ComprSafariExperience.money(totals.deal, totals.currency));
        ui.oldTotal.setAttribute("aria-label",`Current total price ${ui.oldTotal.textContent}`);
        ui.dealTotal.setAttribute("aria-label",`Deal total price ${ui.dealTotal.textContent}`);
        setRetailer(ui.currentRetailer, state.product?.webshop || "");
        setRetailer(ui.dealRetailer, dealRetailer);
        text(ui.shipping, offer.shippingIncluded === true ? "Shipping included in the compared total." : `Shipping included: ${ComprSafariExperience.money(offer.shippingCost, totals.currency)}`);
        const reasons=Array.isArray(offer.backendMatchReasons)?offer.backendMatchReasons:Array.isArray(offer.matchReasons)?offer.matchReasons:[];
        ui.trust.replaceChildren(...reasons.slice(0, 3).map(reason => { const chip=document.createElement("span"); chip.textContent=String(reason).slice(0,40); return chip; }));
        const coupons = state.coupons || []; text(ui.couponsToggle, coupons.length ? `Coupons · ${coupons.length}` : "Coupons");
        renderCoupons(coupons,dealRetailer); renderDetails(product, offer);
      } else if(explainsNoMatch) {
        ui.detailsToggle.textContent="What COMPR checked";
        ui.details.replaceChildren(); const p=document.createElement("p");
        p.textContent="Product identity, model and variant, retailer URL, price comparability and known shipping."; ui.details.append(p);
      } else {
        ui.detailsToggle.textContent="Details";
      }
    }

    function setRetailer(node,value) {
      const label=String(value||"").trim().slice(0,160); node.textContent=label; node.title=label; node.setAttribute("aria-label",label?`Retailer ${label}`:"");
    }

    function renderCoupons(coupons, retailer) {
      ui.coupons.replaceChildren();
      if (!coupons.length) { const p=document.createElement("p"); p.textContent=`No verified coupons for ${retailer}.`; ui.coupons.append(p); }
      coupons.forEach(coupon => {
        const row=document.createElement("div"), code=document.createElement("strong"), condition=document.createElement("span"), copy=document.createElement("button");
        code.textContent=coupon.code; condition.textContent=coupon.condition; copy.type="button"; copy.textContent="Copy"; copy.setAttribute("aria-label",`Copy coupon ${coupon.code}`);
        copy.addEventListener("click", async () => { try { await navigator.clipboard.writeText(coupon.code); copy.textContent="Copied"; ui.live.textContent="Coupon copied"; } catch { ui.live.textContent="Coupon could not be copied"; } });
        row.append(code, condition, copy); ui.coupons.append(row);
      });
      const warning=document.createElement("p"); warning.textContent="Codes can expire, so we never promise a discount."; ui.coupons.append(warning);
    }

    function renderDetails(source, offer) {
      ui.details.replaceChildren();
      const totals=ComprSafariExperience.comparableTotals(source,offer);
      const hasShipping=offer.shippingCost!==null&&offer.shippingCost!==undefined&&offer.shippingCost!==""&&Number.isFinite(Number(offer.shippingCost));
      const shipping=offer.shippingIncluded===true?"Included":hasShipping?ComprSafariExperience.money(offer.shippingCost,totals.currency):"";
      const values = [["Brand",source.brand],["Model",source.model || source.mpn],["Variant",source.variant],["Capacity",source.capacity],["Colour",source.color],["Condition",offer.condition],["Current total",ComprSafariExperience.money(totals.current,totals.currency)],["Deal total",ComprSafariExperience.money(totals.deal,totals.currency)],["Shipping",shipping],["SKU",source.sku],["GTIN",source.gtin]];
      const dl=document.createElement("dl"); values.filter(([,value])=>String(value||"").trim()).forEach(([label,value])=>{ const row=document.createElement("div"),dt=document.createElement("dt"),dd=document.createElement("dd");dt.textContent=label;dd.textContent=String(value).slice(0,160);row.append(dt,dd);dl.append(row); });
      ui.details.append(dl);
    }

    async function detectProduct() {
      const generation=++actionGeneration;
      try {
        const [tab]=await ComprBrowser.tabs.query({active:true,currentWindow:true});
        if (!tab?.id) return store.set({view:"unsupported",title:"This page isn't supported",copy:"Open a web product page to use COMPR.",primary:""});
        const probe=await ComprBrowser.scripting.executeScript({target:{tabId:tab.id},func:()=>globalThis.ComprBrowser?.adapterVersion==="compr-browser-adapter-v1"});
        if (probe?.[0]?.result!==true) await ComprBrowser.scripting.executeScript({target:{tabId:tab.id},files:["shared/browserAdapter.js"]});
        await ComprBrowser.scripting.executeScript({target:{tabId:tab.id},files:["shared/productEligibility.js","detectors/price.js","detectors/brand.js","detectors/color.js","detectors/material.js","detectors/sizes.js","detectors/availability.js","detectors/policies.js","detectors/discountCodes.js","detectors/category.js","detectors/productId.js","detectors/productName.js","content.js"]});
        const result=await ComprBrowser.scripting.executeScript({target:{tabId:tab.id},func:()=>typeof getProductInfo==="function"?getProductInfo():null});
        if (disposed || generation!==actionGeneration) return;
        product=result?.[0]?.result;
        if (!ComprProductEligibility.isEligibleProductPayload(product)) { product=null; store.set({view:"no-product",title:"Open a product page to compare prices.",copy:"COMPR refuses search results, listings and pages without strong product evidence.",primary:"",product:null}); return; }
        let remaining=""; try { const me=await ComprApi.me(); entitlement={plan:String(me?.plan||"free").toLowerCase()}; remaining=Number.isFinite(Number(me?.usage?.remaining)) ? `${me.usage.remaining} free checks left` : ""; } catch {}
        store.set({view:"ready",eyebrow:remaining,title:"Ready to compare",copy:"Exact product. Right variant. Total price.",primary:"Find this cheaper",product});
      } catch (error) {
        if (disposed || generation!==actionGeneration) return;
        const permission=error?.capability==="scripting.executeScript";
        store.set({view:permission?"permission-required":"unsupported",title:permission?"Allow COMPR on this site":"This page isn't supported",copy:permission?"Grant access for this website, then reopen COMPR.":"Open a web product page to use COMPR.",primary:""});
      }
    }

    async function search() {
      if (!product) return;
      const generation=++actionGeneration;
      store.set({view:"searching",title:"Checking trusted matches…",copy:"Comparing the same product, variant and total price.",primary:"Checking…",product,couponsOpen:false,detailsOpen:false,usageNote:""});
      try {
        lastResponse=await ComprApi.search(product, crypto.randomUUID());
        if (disposed || generation!==actionGeneration) return;
        match=ComprSafariExperience.selectVerifiedMatch(lastResponse, product);
        if (!match) { store.set({view:"no-match",eyebrow:"",title:"No reliable match",copy:"We’d rather show nothing than the wrong product.",usageNote:ComprSafariExperience.noMatchUsageNote(lastResponse),primary:"Try again",product,couponsOpen:false,detailsOpen:false}); return; }
        store.set({view:"match",eyebrow:"",title:"",copy:"",usageNote:"",primary:"View deal",product,match,coupons:ComprSafariExperience.verifiedCoupons(lastResponse,match),couponsOpen:false,detailsOpen:false});
      } catch (error) {
        if (disposed || generation!==actionGeneration) return;
        const code=String(error?.code||""); const offline=!navigator.onLine;
        const view=offline?"offline":code==="SEARCH_TIMEOUT"?"timeout":code==="SEARCH_LIMIT_REACHED"?"quota":"provider-error";
        const title=view==="quota"?"You’ve used your 5 free checks":view==="timeout"?"The check took too long":view==="offline"?"We couldn’t complete the check":"We couldn’t complete the check";
        const resetValue=error?.details?.resetAt || error?.details?.nextAvailableAt;
        const resetDate=resetValue && !Number.isNaN(Date.parse(resetValue)) ? new Intl.DateTimeFormat("en-NL",{dateStyle:"medium",timeStyle:"short"}).format(new Date(resetValue)) : "";
        const copy=view==="quota"?(resetDate?`Your next check becomes available after ${resetDate}.`:"Checks return gradually over the next 7 days."):"Try again safely when you’re ready.";
        store.set({view,title,copy,usageNote:view!=="quota"&&error?.details?.usageCharged===false?"Your free check was not used.":"",primary:view==="quota"?"Explore COMPR Pro":"Try again",product});
      }
    }

    async function initialize() {
      store.set({view:"guest-initializing",title:"Starting COMPR…",copy:"Preparing a private guest session.",primary:"",product:null});
      try { await ComprAuth.ensureGuestSession(); if(!disposed) await detectProduct(); }
      catch { if(!disposed) store.set({view:"offline",title:"COMPR couldn’t start",copy:"Check your connection and try again.",primary:"Try again",product:null}); }
    }
    let proSheetReturnFocus=null;
    function openProSheet(){proSheetReturnFocus=document.activeElement;show(ui.proSheet,true);ui.planYearly.focus();}
    function closeProSheet(){show(ui.proSheet,false);(proSheetReturnFocus||ui.primary).focus();proSheetReturnFocus=null;}
    ui.primary.addEventListener("click", async () => { const state=store.get(); if(state.view==="quota") openProSheet(); else if(state.view==="offline"&&!product) await initialize(); else if (state.view==="ready"||["no-match","provider-error","timeout","offline"].includes(state.view)) await search(); else if (["match","saved"].includes(state.view)&&match) { const retailer=ComprSafariExperience.validatedRetailer(match); if(retailer&&ComprSafariExperience.isPublicDealUrl(match.offer.url,retailer)) await ComprBrowser.tabs.openExternal(match.offer.url); } });
    ui.save.addEventListener("click", async()=>{ if(!product)return; if(ComprSafariExperience.saveTrackDecision(entitlement)!=="save"){openProSheet();return;} await ComprStorage.saveProduct(product); ui.save.textContent="Tracking ✓"; ui.save.disabled=true; ui.live.textContent="Product saved for price tracking"; store.set({view:"saved",primary:"View deal"}); });
    ui.couponsToggle.addEventListener("click",()=>store.set({couponsOpen:!store.get().couponsOpen,detailsOpen:false}));
    ui.detailsToggle.addEventListener("click",()=>store.set({detailsOpen:!store.get().detailsOpen,couponsOpen:false}));
    ui.tryPro.addEventListener("click",()=>{ui.live.textContent="COMPR Pro purchasing is not available yet.";});
    ui.notNow.addEventListener("click",closeProSheet);
    ui.proSheet.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();closeProSheet();return;}if(event.key!=="Tab")return;const focusable=[ui.planMonthly,ui.planYearly,ui.tryPro,ui.notNow];const first=focusable[0],last=focusable[focusable.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});
    window.addEventListener("pagehide",()=>{disposed=true;actionGeneration+=1;},{once:true});
    await initialize();
    return true;
  }
  root.ComprSafariPopup={start};
})(typeof globalThis!=="undefined"?globalThis:this);
