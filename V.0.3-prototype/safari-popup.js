(function (root) {
  "use strict";
  let started = false;

  async function start() {
    if (started) return false;
    started = true;
    document.documentElement.classList.remove("chrome-popup");
    document.documentElement.classList.add("safari-popup");
    const ui = Object.fromEntries(["Experience","Panel","Live","Loader","Eyebrow","Title","Copy","Guidance","GuidanceOne","GuidanceTwo","GuidanceThree","Welcome","WelcomeTitle","WelcomeFeatureOne","WelcomeFeatureTwo","WelcomeFeatureThree","Product","Image","ProductName","Store","CurrentPrice","Savings","Saving","OldTotal","DealTotal","CurrentRetailer","DealRetailer","Shipping","Trust","SignIn","Primary","Privacy","UsageNote","Actions","Save","CouponsToggle","DetailsToggle","Coupons","Details","PlanAction","ProSheet","ProTitle","ChooseFree","TryPro","TryUltimate","Restore","NotNow","PlanMonthly","PlanYearly","PrivacyBadge","PrivacyLink","MatchLabel","CurrentTotalLabel","DealTotalLabel","TrackLabel","ProCopy","PlanLegend","MonthlyLabel","YearlyLabel","FreeCurrent","FreeFeatureOne","FreeFeatureTwo","PopularLabel","ProPrice","ProFeatureOne","ProFeatureTwo","UltimatePrice","UltimateFeatureOne","UltimateFeatureTwo","ProductStatus","RenewalCopy"]
      .map(name => [name[0].toLowerCase() + name.slice(1), document.getElementById(`safari${name}`)]));
    document.querySelectorAll(".app > :not(#safariExperience):not(#toast):not(#comparePrompt)").forEach(node => node.classList.add("safari-hidden"));
    document.querySelector(".app").classList.add("safari-mode");
    ui.experience.classList.remove("hidden");
    const locale = (() => { try { return new Intl.Locale(navigator.language || "en"); } catch { return { language: "en", region: "" }; } })();
    const timeZone = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { return ""; } })();
    const isDutch = locale.language === "nl" || locale.region === "NL" || timeZone === "Europe/Amsterdam";
    const countryCode = ComprCurrency.inferCountryCode();
    const displayCurrency = ComprCurrency.getCurrencyForCountry(countryCode);
    let exchangeRates = { rates: { EUR: 1 } };
    const nl = new Map([
      ["Private by default","Privé, tenzij jij start"],["Verified cheaper match","Betrouwbare goedkopere match"],
      ["Current total","Huidig totaal"],["Current price","Huidige prijs"],["Deal total","Nieuw totaal"],["Track this price","Volg deze prijs"],
      ["Save products and get notified when their price drops.","Bewaar producten en krijg bericht wanneer de prijs daalt."],
      ["Choose your COMPR plan","Kies je COMPR-abonnement"],["Find better prices. Choose how often you want to search.","Vind betere prijzen. Kies hoe vaak je wilt zoeken."],
      ["Choose a billing period","Kies een betaalperiode"],["Monthly","Maandelijks"],["Yearly","Jaarlijks"],
      ["Current plan","Huidig abonnement"],["Popular","Populair"],["5 successful checks in your first month","5 succesvolle checks in je eerste maand"],["3 successful checks per month after that","Daarna 3 succesvolle checks per maand"],
      ["15 successful price checks per month","15 succesvolle prijschecks per maand"],["For regular COMPR users","Voor regelmatige COMPR-gebruikers"],["50 successful price checks per month","50 succesvolle prijschecks per maand"],["For frequent price checking","Voor wie vaak prijzen controleert"],
      ["Continue Free","Ga gratis verder"],["Choose Pro","Kies Pro"],["Choose Ultimate","Kies Ultimate"],
      ["Not now","Niet nu"],["Nothing is checked until you tap.","We controleren pas nadat jij tikt."],
      ["Restore Purchases","Herstel aankopen"],["Sign in to choose a plan.","Log in om een abonnement te kiezen."],
      ["Loading App Store prices…","App Store-prijzen laden…"],["Paid plans are temporarily unavailable.","Betaalde abonnementen zijn tijdelijk niet beschikbaar."],["Some paid plans are currently unavailable.","Sommige betaalde abonnementen zijn nu niet beschikbaar."],
      ["Subscriptions renew automatically unless cancelled in your Apple Account.","Abonnementen worden automatisch verlengd, tenzij je ze opzegt in je Apple-account."],
      ["Sign in to compare prices","Log in om prijzen te vergelijken"],["COMPR uses your account to track price checks and recognise your plan and limit.","COMPR gebruikt je account om je prijschecks bij te houden en je abonnement en limiet te herkennen."],["Sign in with Apple","Log in met Apple"],
      ["You only need to sign in once.","Je hoeft maar één keer in te loggen."],
      ["One account. Clear choices.","Eén account. Duidelijke keuzes."],["Sign in securely with Apple","Veilig inloggen met Apple"],["Choose monthly or yearly COMPR Pro","Kies COMPR Pro per maand of per jaar"],["Change or cancel later through Apple","Later aanpassen of opzeggen via Apple"],["View plans","Bekijk abonnementen"],["Manage subscription","Beheer abonnement"],
      ["Your COMPR Pro subscription is active.","Je COMPR Pro-abonnement is actief."],["Your COMPR Ultimate subscription is active.","Je COMPR Ultimate-abonnement is actief."],["Your COMPR subscription is active.","Je COMPR-abonnement is actief."],["Purchase pending approval.","De aankoop wacht op goedkeuring."],
      ["We couldn't complete the App Store request.","De App Store-aanvraag kon niet worden afgerond."],
      ["Details","Details"],["Coupons","Kortingscodes"],["Save & Compare","Bewaar en vergelijk"],
      ["Starting COMPR…","COMPR starten…"],["Preparing a private guest session.","Je privésessie wordt voorbereid."],
      ["Open a product page to compare prices.","Open een productpagina om prijzen te vergelijken."],
      ["Open one specific product page","Open één specifieke productpagina"],["Wait until its price and options are visible","Wacht tot de prijs en opties zichtbaar zijn"],["Open COMPR again","Open COMPR opnieuw"],
      ["COMPR refuses search results, listings and pages without strong product evidence.","COMPR controleert alleen duidelijke productpagina’s, geen zoekresultaten of categoriepagina’s."],
      ["Ready to compare","Klaar om te vergelijken"],["Exact product. Right variant. Total price.","Hetzelfde product, de juiste uitvoering en de totaalprijs."],
      ["Find this cheaper","Vind dit goedkoper"],["Checking trusted matches…","Betrouwbare matches controleren…"],
      ["Comparing the same product, variant and total price.","We vergelijken hetzelfde product, de uitvoering en de totaalprijs."],
      ["Checking…","Controleren…"],["No reliable match","Geen betrouwbare match"],
      ["We’d rather show nothing than the wrong product.","Dan is er geen beter betrouwbaar product gevonden."],
      ["Try again","Opnieuw proberen"],["View deal","Bekijk aanbieding"],["What COMPR checked","Wat COMPR controleerde"],
      ["Product identity, model and variant, retailer URL, price comparability and known shipping.","Product, model en uitvoering, winkel, vergelijkbare prijs en bekende verzendkosten."],
      ["Allow COMPR on this site","Sta COMPR toe op deze site"],["Grant access for this website, then reopen COMPR.","Geef toegang tot deze website en open COMPR daarna opnieuw."],
      ["This page isn't supported","Deze pagina wordt niet ondersteund"],["Open a web product page to use COMPR.","Open een productpagina om COMPR te gebruiken."],
      ["You’ve used your 5 free checks","Je 5 gratis controles zijn gebruikt"],["Checks return gradually over the next 7 days.","Je controles komen in de komende 7 dagen geleidelijk terug."],
      ["Explore COMPR Pro","Bekijk COMPR Pro"],["The check took too long","De controle duurde te lang"],
      ["We couldn’t complete the check","De controle kon niet worden afgerond"],["Try again safely when you’re ready.","Probeer het gerust opnieuw."],
      ["Your free check was not used.","Je gratis controle is niet gebruikt."],["COMPR couldn’t start","COMPR kon niet starten"],
      ["Check your connection and try again.","Controleer je verbinding en probeer opnieuw."],["Shipping included in the compared total.","Verzending is opgenomen in het vergeleken totaal."],
      ["Your account couldn’t be loaded","Je account kon niet worden geladen"],["COMPR cannot reach your account from Safari right now. Try again.","COMPR kan je account vanuit Safari nu niet bereiken. Probeer opnieuw."],
      ["Something went wrong while starting COMPR. Try again.","Er ging iets mis bij het starten van COMPR. Probeer opnieuw."],
      ["Tracking ✓","Wordt gevolgd ✓"]
    ]);
    function tr(value) {
      const input=String(value||""); if(!isDutch) return ComprI18n.translate(input);
      if(nl.has(input)) return nl.get(input);
      let dynamic=input.match(/^(\d+) free checks left$/); if(dynamic) return `${dynamic[1]} gratis controles over`;
      dynamic=input.match(/^Save at least (.+)$/); if(dynamic) return `Bespaar minimaal ${dynamic[1]}`;
      dynamic=input.match(/^Save (.+)$/); if(dynamic) return `Bespaar ${dynamic[1]}`;
      dynamic=input.match(/^Coupons · (\d+)$/); if(dynamic) return `Kortingscodes · ${dynamic[1]}`;
      return input;
    }
    function localMoney(amount, sourceCurrency) {
      const numeric=ComprCurrency.parseAmount(amount);
      if(!Number.isFinite(numeric))return "";
      const source=String(sourceCurrency||displayCurrency).toUpperCase();
      const converted=ComprCurrency.convert(numeric,source,displayCurrency,exchangeRates.rates);
      return ComprCurrency.format(converted===null?numeric:converted,converted===null?source:displayCurrency,countryCode);
    }
    [[ui.privacyBadge,"Private by default"],[ui.privacyLink,"Privacy"],[ui.matchLabel,"Verified cheaper match"],[ui.currentTotalLabel,"Current total"],[ui.dealTotalLabel,"Deal total"],[ui.trackLabel,"COMPR"],[ui.proTitle,"Choose your COMPR plan"],[ui.proCopy,"Find better prices. Choose how often you want to search."],[ui.planLegend,"Choose a billing period"],[ui.monthlyLabel,"Monthly"],[ui.yearlyLabel,"Yearly"],[ui.freeCurrent,"Current plan"],[ui.freeFeatureOne,"5 successful checks in your first month"],[ui.freeFeatureTwo,"3 successful checks per month after that"],[ui.popularLabel,"Popular"],[ui.proFeatureOne,"15 successful price checks per month"],[ui.proFeatureTwo,"For regular COMPR users"],[ui.ultimateFeatureOne,"50 successful price checks per month"],[ui.ultimateFeatureTwo,"For frequent price checking"],[ui.chooseFree,"Continue Free"],[ui.tryPro,"Choose Pro"],[ui.tryUltimate,"Choose Ultimate"],[ui.restore,"Restore Purchases"],[ui.notNow,"Not now"],[ui.renewalCopy,"Subscriptions renew automatically unless cancelled in your Apple Account."],[ui.save,"Save & Compare"],[ui.couponsToggle,"Coupons"],[ui.detailsToggle,"Details"],[ui.guidanceOne,"Open one specific product page"],[ui.guidanceTwo,"Wait until its price and options are visible"],[ui.guidanceThree,"Open COMPR again"],[ui.welcomeTitle,"One account. Clear choices."],[ui.welcomeFeatureOne,"Sign in securely with Apple"],[ui.welcomeFeatureTwo,"Choose monthly or yearly COMPR Pro"],[ui.welcomeFeatureThree,"Change or cancel later through Apple"]].forEach(([node,label])=>{if(node)node.textContent=tr(label);});
    let product = null, match = null, lastResponse = null, entitlement = { plan: "free" }, actionGeneration = 0, disposed = false;
    const store = ComprSafariExperience.createStore(render);
    ui.image.addEventListener("error",()=>{ui.image.hidden=true;ui.image.parentElement.classList.add("missing-image");});

    function text(node, value) { node.textContent = tr(value) || ""; }
    function show(node, visible) { node.classList.toggle("hidden", !visible); }
    function showSignIn() {
      product=null;match=null;
      store.set({view:"sign-in",title:"Sign in to compare prices",copy:"COMPR uses your account to track price checks and recognise your plan and limit.",usageNote:"You only need to sign in once.",primary:"Sign in with Apple",product:null});
    }
    async function withRequestTimeout(run, milliseconds, code) {
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),milliseconds);
      try{return await run(controller.signal);}
      catch(error){if(controller.signal.aborted){const timeoutError=new Error(code);timeoutError.code=code;throw timeoutError;}throw error;}
      finally{clearTimeout(timer);}
    }
    async function confirmAccount() {
      const session=await ComprAuth.getSession();
      if(!session){showSignIn();return null;}
      try {
        const me=await withRequestTimeout(signal=>ComprApi.me({signal}),10000,"ACCOUNT_TIMEOUT");
        entitlement={plan:String(me?.plan||"free").toLowerCase()};
        return me;
      } catch(error) {
        if(error?.code==="AUTH_REQUIRED"){showSignIn();return null;}
        throw error;
      }
    }
    function render(state) {
      const busy = ["guest-initializing", "searching"].includes(state.view);
      ui.panel.setAttribute("aria-busy", String(busy)); show(ui.loader, busy);
      const hasResult = (state.view === "match" || state.view === "saved") && Boolean(ComprSafariExperience.validatedRetailer(state.match));
      const canSave=Boolean(state.product)&&["ready","match","saved","no-match"].includes(state.view);
      show(ui.guidance,state.view==="no-product");
      const compactWithoutProduct=["quota","offline","provider-error","timeout"].includes(state.view);
      show(ui.product, Boolean(state.product) && !compactWithoutProduct); show(ui.savings, hasResult);
      show(ui.welcome,state.view==="sign-in"); show(ui.planAction,state.view!=="sign-in"&&!busy);
      if(ui.planAction)ui.planAction.textContent=tr(["pro","ultimate"].includes(entitlement.plan)?"Manage subscription":"View plans");
      const explainsNoMatch=state.view==="no-match";
      show(ui.actions, hasResult||explainsNoMatch||canSave); show(ui.save,canSave); show(ui.couponsToggle,hasResult); show(ui.detailsToggle,hasResult||explainsNoMatch);
      ui.actions.classList.toggle("is-explanation",explainsNoMatch);
      show(ui.coupons, hasResult && state.couponsOpen); show(ui.details, (hasResult||explainsNoMatch) && state.detailsOpen);
      ui.couponsToggle.setAttribute("aria-expanded", String(Boolean(state.couponsOpen)));
      ui.detailsToggle.setAttribute("aria-expanded", String(Boolean(state.detailsOpen)));
      ui.couponsToggle.classList.toggle("is-selected",Boolean(state.couponsOpen));
      ui.detailsToggle.classList.toggle("is-selected",Boolean(state.detailsOpen));
      const signingIn=state.view==="sign-in";
      show(ui.signIn,signingIn); text(ui.signIn,"Sign in with Apple");
      ui.primary.disabled = busy; show(ui.primary, Boolean(state.primary)&&!signingIn); text(ui.primary, state.primary);
      ui.primary.classList.toggle("is-retry",["no-match","offline","provider-error","timeout"].includes(state.view));
      text(ui.eyebrow, state.eyebrow); text(ui.title, state.title); text(ui.copy, state.copy);
      text(ui.live, `${state.title || ""} ${state.copy || ""}`.trim());
      show(ui.privacy,state.view === "ready"); ui.privacy.textContent = tr("Nothing is checked until you tap.");
      show(ui.usageNote,Boolean(state.usageNote)); text(ui.usageNote,state.usageNote);
      if (state.product) {
        text(ui.productName, state.product.name); text(ui.store, state.product.webshop);
        text(ui.currentPrice, localMoney(state.product.totalPrice ?? state.product.price, state.product.currency));
        if (ComprProduct.getSafeWebUrl(state.product.image)) { ui.image.src = state.product.image; ui.image.hidden = false; ui.image.parentElement.classList.remove("missing-image"); }
        else { ui.image.removeAttribute("src"); ui.image.hidden = true; ui.image.parentElement.classList.add("missing-image"); }
      }
      if (state.match) {
        ui.detailsToggle.textContent=tr("Details");
        const totals = state.match.totals, offer = state.match.offer;
        const dealRetailer=ComprSafariExperience.validatedRetailer(state.match);
        text(ui.currentTotalLabel, totals.sourceShippingKnown ? "Current total" : "Current price");
        text(ui.saving, `${totals.sourceShippingKnown ? "Save" : "Save at least"} ${localMoney(totals.current - totals.deal, totals.currency)}`);
        text(ui.oldTotal, localMoney(totals.current, totals.currency));
        text(ui.dealTotal, localMoney(totals.deal, totals.currency));
        ui.oldTotal.setAttribute("aria-label",`Current total price ${ui.oldTotal.textContent}`);
        ui.dealTotal.setAttribute("aria-label",`Deal total price ${ui.dealTotal.textContent}`);
        setRetailer(ui.currentRetailer, state.product?.webshop || "");
        setRetailer(ui.dealRetailer, dealRetailer);
        text(ui.shipping, offer.shippingIncluded === true ? "Shipping included in the compared total." : `Shipping included: ${localMoney(offer.shippingCost, totals.currency)}`);
        const reasons=Array.isArray(offer.backendMatchReasons)?offer.backendMatchReasons:Array.isArray(offer.matchReasons)?offer.matchReasons:[];
        ui.trust.replaceChildren(...reasons.slice(0, 3).map(reason => { const chip=document.createElement("span"); chip.textContent=String(reason).slice(0,40); return chip; }));
        const coupons = state.coupons || []; text(ui.couponsToggle, coupons.length ? `Coupons · ${coupons.length}` : "Coupons");
        renderCoupons(coupons,dealRetailer); renderDetails(product, offer);
      } else if(explainsNoMatch) {
        ui.detailsToggle.textContent=tr("What COMPR checked");
        ui.details.replaceChildren(); const p=document.createElement("p");
        p.textContent=tr("Product identity, model and variant, retailer URL, price comparability and known shipping."); ui.details.append(p);
      } else {
        ui.detailsToggle.textContent=tr("Details");
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
      const shipping=offer.shippingIncluded===true?"Included":hasShipping?localMoney(offer.shippingCost,totals.currency):"";
      const values = [["Brand",source.brand],["Model",source.model || source.mpn],["Variant",source.variant],["Capacity",source.capacity],["Colour",source.color],["Condition",offer.condition],["Current total",localMoney(totals.current,totals.currency)],["Deal total",localMoney(totals.deal,totals.currency)],["Shipping",shipping],["SKU",source.sku],["GTIN",source.gtin]];
      const dl=document.createElement("dl"); values.filter(([,value])=>String(value||"").trim()).forEach(([label,value])=>{ const row=document.createElement("div"),dt=document.createElement("dt"),dd=document.createElement("dd");dt.textContent=label;dd.textContent=String(value).slice(0,160);row.append(dt,dd);dl.append(row); });
      ui.details.append(dl);
    }

    async function detectProduct(me) {
      const generation=++actionGeneration;
      try {
        const [tab]=await ComprBrowser.tabs.query({active:true,currentWindow:true});
        if (!tab?.id) return store.set({view:"unsupported",title:"This page isn't supported",copy:"Open a web product page to use COMPR.",primary:""});
        const probe=await ComprBrowser.scripting.executeScript({target:{tabId:tab.id},func:()=>globalThis.ComprBrowser?.adapterVersion==="compr-browser-adapter-v1"});
        if (probe?.[0]?.result!==true) await ComprBrowser.scripting.executeScript({target:{tabId:tab.id},files:["shared/browserAdapter.js"]});
        await ComprBrowser.scripting.executeScript({target:{tabId:tab.id},files:["shared/productEligibility.js","shared/localeParsing.js", "detectors/price.js","detectors/brand.js","detectors/color.js","detectors/material.js","detectors/sizes.js","detectors/availability.js","detectors/policies.js","detectors/discountCodes.js","detectors/category.js","detectors/productId.js","detectors/productName.js","content.js"]});
        const result=await ComprBrowser.scripting.executeScript({target:{tabId:tab.id},func:()=>typeof getProductInfo==="function"?getProductInfo():null});
        if (disposed || generation!==actionGeneration) return;
        product=result?.[0]?.result;
        if (!ComprProductEligibility.isEligibleProductPayload(product)) { product=null; store.set({view:"no-product",title:"Open a product page to compare prices.",copy:"COMPR refuses search results, listings and pages without strong product evidence.",primary:"",product:null}); return; }
        const remaining=Number.isFinite(Number(me?.usage?.remaining)) ? `${me.usage.remaining} free checks left` : "";
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
      ui.primary.disabled=true;
      try {
        const me=await confirmAccount();
        if(!me||disposed||generation!==actionGeneration)return;
        store.set({view:"searching",title:"Checking trusted matches…",copy:"Comparing the same product, variant and total price.",primary:"Checking…",product,couponsOpen:false,detailsOpen:false,usageNote:""});
        lastResponse=await withRequestTimeout(signal=>ComprApi.search(product,crypto.randomUUID(),{signal}),30000,"SEARCH_TIMEOUT");
        if (disposed || generation!==actionGeneration) return;
        match=ComprSafariExperience.selectVerifiedMatch(lastResponse, product);
        if (!match) { store.set({view:"no-match",eyebrow:"",title:"No reliable match",copy:"We’d rather show nothing than the wrong product.",usageNote:ComprSafariExperience.noMatchUsageNote(lastResponse),primary:"Try again",product,couponsOpen:false,detailsOpen:false}); return; }
        store.set({view:"match",eyebrow:"",title:"",copy:"",usageNote:"",primary:"View deal",product,match,coupons:ComprSafariExperience.verifiedCoupons(lastResponse,match),couponsOpen:false,detailsOpen:false});
        if (!disposed && generation===actionGeneration) void ComprApi.acceptResult(lastResponse);
      } catch (error) {
        if (disposed || generation!==actionGeneration) return;
        if(error?.code==="AUTH_REQUIRED"){showSignIn();return;}
        const code=String(error?.code||""); const offline=!navigator.onLine;
        if(["NO_CONFIDENT_MATCH","NO_RESULTS_FROM_PROVIDER","INSUFFICIENT_PRODUCT_DATA","PRICE_NOT_COMPARABLE"].includes(code)){
          lastResponse={outcome:code,usageCharged:false};
          match=null;
          store.set({view:"no-match",eyebrow:"",title:"No reliable match",copy:"We’d rather show nothing than the wrong product.",usageNote:ComprSafariExperience.noMatchUsageNote(lastResponse),primary:"Try again",product,couponsOpen:false,detailsOpen:false});
          return;
        }
        const view=offline?"offline":["SEARCH_TIMEOUT","ACCOUNT_TIMEOUT"].includes(code)?"timeout":code==="SEARCH_LIMIT_REACHED"?"quota":"provider-error";
        const title=view==="quota"?"You’ve used your 5 free checks":view==="timeout"?"The check took too long":view==="offline"?"We couldn’t complete the check":"We couldn’t complete the check";
        const resetValue=error?.details?.resetAt || error?.details?.nextAvailableAt;
        const resetDate=resetValue && !Number.isNaN(Date.parse(resetValue)) ? new Intl.DateTimeFormat("en-NL",{dateStyle:"medium",timeStyle:"short"}).format(new Date(resetValue)) : "";
        const copy=view==="quota"?(resetDate?`Your next check becomes available after ${resetDate}.`:"Checks return gradually over the next 7 days."):"Try again safely when you’re ready.";
        store.set({view,title,copy,usageNote:view!=="quota"&&error?.details?.usageCharged===false?"Your free check was not used.":"",primary:view==="quota"?"Explore COMPR Pro":"Try again",product});
      }
    }

    async function initialize() {
      store.set({view:"guest-initializing",title:"Starting COMPR…",copy:"Preparing a private guest session.",primary:"",product:null});
      try {
        let session=await ComprAuth.getSession();
        if(!session&&ComprRuntimeConfig.guestMode===true){try{session=await ComprAuth.ensureGuestSession();}catch{session=null;}}
        if(disposed)return;
        if(!session){showSignIn();return;}
        const me=await confirmAccount();
        if(!me||disposed)return;
        void ComprCurrency.requestExchangeRates().then(rates=>{exchangeRates=rates;}).catch(()=>{});
        await detectProduct(me);
      }
      catch(error) {
        if(disposed)return;
        if(error?.code==="AUTH_REQUIRED"){showSignIn();return;}
        const code=String(error?.code||"");
        if(code==="ORIGIN_NOT_ALLOWED"||error?.status===403){store.set({view:"account-error",title:"Your account couldn’t be loaded",copy:"COMPR cannot reach your account from Safari right now. Try again.",primary:"Try again",product:null});return;}
        if(!navigator.onLine||["ACCOUNT_TIMEOUT","AUTH_TIMEOUT"].includes(code)||error instanceof TypeError){store.set({view:"offline",title:"COMPR couldn’t start",copy:"Check your connection and try again.",primary:"Try again",product:null});return;}
        store.set({view:"startup-error",title:"COMPR couldn’t start",copy:"Something went wrong while starting COMPR. Try again.",primary:"Try again",product:null});
      }
    }
    let proSheetReturnFocus=null;
    const fallbackPrices={
      pro:{monthly:isDutch?"€ 2,99 / maand":"€2.99 / month",yearly:isDutch?"€ 19,99 / jaar":"€19.99 / year"},
      ultimate:{monthly:isDutch?"€ 4,99 / maand":"€4.99 / month",yearly:isDutch?"€ 34,99 / jaar":"€34.99 / year"}
    };
    let appleProducts=new Map(),appleProductsLoading=false,purchaseBusy=false;
    function billingCycle(){return ui.planMonthly.checked?"monthly":"yearly";}
    function productIdFor(tier){const cycle=billingCycle();return tier==="ultimate"?(cycle==="monthly"?ComprAppleBilling.PRODUCT_IDS.ultimateMonthly:ComprAppleBilling.PRODUCT_IDS.ultimateYearly):(cycle==="monthly"?ComprAppleBilling.PRODUCT_IDS.proMonthly:ComprAppleBilling.PRODUCT_IDS.proYearly);}
    function renderPlanAvailability(){
      const proAvailable=appleProducts.has(productIdFor("pro")),ultimateAvailable=appleProducts.has(productIdFor("ultimate"));
      ui.chooseFree.disabled=purchaseBusy;ui.restore.disabled=purchaseBusy;
      ui.tryPro.disabled=purchaseBusy||!proAvailable;ui.tryUltimate.disabled=purchaseBusy||!ultimateAvailable;
      ui.tryPro.setAttribute("aria-disabled",String(ui.tryPro.disabled));ui.tryUltimate.setAttribute("aria-disabled",String(ui.tryUltimate.disabled));
      ui.productStatus.textContent=appleProductsLoading?tr("Loading App Store prices…"):(proAvailable&&ultimateAvailable?"":proAvailable||ultimateAvailable?tr("Some paid plans are currently unavailable."):tr("Paid plans are temporarily unavailable."));
      show(ui.productStatus,Boolean(ui.productStatus.textContent));
    }
    function renderPlanPrices(){
      const cycle=billingCycle(),period=tr(cycle==="monthly"?"Monthly":"Yearly").toLowerCase();
      const proId=cycle==="monthly"?ComprAppleBilling.PRODUCT_IDS.proMonthly:ComprAppleBilling.PRODUCT_IDS.proYearly;
      const ultimateId=cycle==="monthly"?ComprAppleBilling.PRODUCT_IDS.ultimateMonthly:ComprAppleBilling.PRODUCT_IDS.ultimateYearly;
      ui.proPrice.textContent=appleProducts.has(proId)?`${appleProducts.get(proId).displayPrice} / ${period}`:fallbackPrices.pro[cycle];
      ui.ultimatePrice.textContent=appleProducts.has(ultimateId)?`${appleProducts.get(ultimateId).displayPrice} / ${period}`:fallbackPrices.ultimate[cycle];
      renderPlanAvailability();
    }
    async function refreshApplePrices(){
      appleProductsLoading=true;appleProducts=new Map();renderPlanAvailability();
      try {
        const products=await ComprAppleBilling.listProducts();
        appleProducts=new Map(products.map(item=>[item.id,item]));
      } catch { appleProducts=new Map(); }
      finally{appleProductsLoading=false;renderPlanPrices();}
    }
    function openProSheet(){proSheetReturnFocus=document.activeElement;show(ui.proSheet,true);renderPlanPrices();ui.chooseFree.focus();void refreshApplePrices();}
    function closeProSheet(){show(ui.proSheet,false);(proSheetReturnFocus||ui.primary).focus();proSheetReturnFocus=null;}
    async function paidAccount(){
      const me=await ComprApi.me();
      if(me?.guest===true || !me?.user?.id){closeProSheet();ui.live.textContent=tr("Sign in to choose a plan.");await ComprAuth.openAppleSignIn();window.close();return null;}
      return me;
    }
    async function syncAndFinish(items){
      let latest=null;
      for(const item of items){latest=await ComprApi.syncAppleTransaction(item.signedTransactionInfo);await ComprAppleBilling.finish(item.transactionId);}
      return latest;
    }
    function setPlanButtonsDisabled(disabled){purchaseBusy=disabled;renderPlanAvailability();}
    async function purchasePlan(tier){
      const productId=productIdFor(tier);
      if(!appleProducts.has(productId)){renderPlanAvailability();return;}
      setPlanButtonsDisabled(true);
      try{
        const me=await paidAccount();if(!me)return;
        const purchase=await ComprAppleBilling.purchase(productId,me.user.id);
        if(purchase.status==="cancelled"){ui.live.textContent=tr("Not now");return;}
        if(purchase.status==="pending"){ui.live.textContent=tr("Purchase pending approval.");return;}
        await syncAndFinish([purchase]);entitlement={plan:tier};ui.live.textContent=tr(`Your COMPR ${tier==="ultimate"?"Ultimate":"Pro"} subscription is active.`);closeProSheet();
      }catch{ui.live.textContent=tr("We couldn't complete the App Store request.");}
      finally{setPlanButtonsDisabled(false);}
    }
    async function restorePurchases(){
      setPlanButtonsDisabled(true);
      try{
        if(!await paidAccount())return;
        const restored=await ComprAppleBilling.restore();
        if(restored.length){const restoredEntitlement=await syncAndFinish(restored);if(!["pro","ultimate"].includes(restoredEntitlement?.plan))throw new Error("RESTORE_ENTITLEMENT_INVALID");entitlement={plan:restoredEntitlement.plan};ui.live.textContent=tr("Your COMPR subscription is active.");closeProSheet();}
        else ui.live.textContent=tr("We couldn't complete the App Store request.");
      }catch{ui.live.textContent=tr("We couldn't complete the App Store request.");}
      finally{setPlanButtonsDisabled(false);}
    }
    ui.primary.addEventListener("click", async () => { const state=store.get(); if(state.view==="quota") openProSheet(); else if(["offline","account-error","startup-error"].includes(state.view)&&!product) await initialize(); else if (state.view==="ready"||["no-match","provider-error","timeout","offline"].includes(state.view)) await search(); else if (["match","saved"].includes(state.view)&&match) { const retailer=ComprSafariExperience.validatedRetailer(match); if(retailer&&ComprSafariExperience.isPublicDealUrl(match.offer.url,retailer)) await ComprBrowser.tabs.openExternal(match.offer.url); } });
    ui.planAction.addEventListener("click",async()=>{if(["pro","ultimate"].includes(entitlement.plan))await ComprBrowser.tabs.openExternal("https://apps.apple.com/account/subscriptions");else openProSheet();});
    ui.save.addEventListener("click", async()=>{
      if(!product)return;
      ui.save.disabled=true;
      try{
        await ComprStorage.saveProduct(product);
        ui.live.textContent=tr("Save & Compare");
        await ComprBrowser.tabs.create({url:ComprBrowser.runtime.getURL("compare.html")});
        window.close();
      }catch{
        ui.save.disabled=false;
        ui.live.textContent=tr("We couldn’t complete the check");
      }
    });
    ui.couponsToggle.addEventListener("click",()=>store.set({couponsOpen:!store.get().couponsOpen,detailsOpen:false}));
    ui.detailsToggle.addEventListener("click",()=>store.set({detailsOpen:!store.get().detailsOpen,couponsOpen:false}));
    ui.chooseFree.addEventListener("click",()=>{ui.live.textContent=tr("Continue Free");closeProSheet();});
    ui.tryPro.addEventListener("click",()=>purchasePlan("pro"));
    ui.tryUltimate.addEventListener("click",()=>purchasePlan("ultimate"));
    ui.planMonthly.addEventListener("change",renderPlanPrices);
    ui.planYearly.addEventListener("change",renderPlanPrices);
    ui.restore.addEventListener("click",restorePurchases);
    ui.notNow.addEventListener("click",closeProSheet);
    ui.proSheet.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();closeProSheet();return;}if(event.key!=="Tab")return;const focusable=[ui.planMonthly,ui.planYearly,ui.chooseFree,ui.tryPro,ui.tryUltimate,ui.restore,ui.privacyLink,ui.notNow].filter(node=>!node.disabled);const first=focusable[0],last=focusable[focusable.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});
    window.addEventListener("pagehide",()=>{disposed=true;actionGeneration+=1;},{once:true});
    await initialize();
    if(new URL(window.location.href).searchParams.get("plans")==="1")openProSheet();
    return true;
  }
  root.ComprSafariPopup={start};
})(typeof globalThis!=="undefined"?globalThis:this);
