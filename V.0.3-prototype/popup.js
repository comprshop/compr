if (!globalThis.__comprPopupBootstrapRegistered) {
globalThis.__comprPopupBootstrapRegistered = true;
document.addEventListener("DOMContentLoaded", async () => {
  if (ComprRuntimeConfig.platform === "safari" && ComprRuntimeConfig.guestMode === true) {
    await globalThis.ComprSafariPopup.start();
    return;
  }
  const app = document.querySelector(".app");
  const loadingState = document.getElementById("loadingState");
  const productState = document.getElementById("productState");
  const emptyState = document.getElementById("emptyState");

  const productImage = document.getElementById("productImage");
  const productBrand = document.getElementById("productBrand");
  const productCategory = document.getElementById("productCategory");
  const productName = document.getElementById("productName");
  const productPrice = document.getElementById("productPrice");
  const productOriginalPrice = document.getElementById("productOriginalPrice");
  const productStore = document.getElementById("productStore");
  const productAvailability = document.getElementById("productAvailability");

  const saveButton = document.getElementById("saveButton");
  const compareButton = document.getElementById("compareButton");
  const headerCompareButton = document.getElementById("headerCompareButton");
  const emptyCompareButton = document.getElementById("emptyCompareButton");
  const savedCount = document.getElementById("savedCount");
  const toast = document.getElementById("toast");
  const trustpilotLink = document.getElementById("trustpilotLink");
  const momentumTitle = document.getElementById("momentumTitle");
  const momentumText = document.getElementById("momentumText");
  const momentumBar = document.getElementById("momentumBar");
  const similarWarning = document.getElementById("similarWarning");
  const similarTitle = document.getElementById("similarTitle");
  const similarMessage = document.getElementById("similarMessage");
  const similarCompareButton = document.getElementById("similarCompareButton");
  const comparePrompt = document.getElementById("comparePrompt");
  const promptCompareButton = document.getElementById("promptCompareButton");
  const promptAddMoreButton = document.getElementById("promptAddMoreButton");
  const countrySelect = document.getElementById("countrySelect");
  const cheaperInterestButton =
    document.getElementById("cheaperInterestButton");
  const accountPlan = document.getElementById("accountPlan");
  const accountUsage = document.getElementById("accountUsage");
  const accountDetails = document.getElementById("accountDetails");
  const accountBadge = document.getElementById("accountBadge");
  const accountCard = document.getElementById("accountCard");
  const usageTrack = document.getElementById("usageTrack");
  const usageBar = document.getElementById("usageBar");
  const accountRefresh = document.getElementById("accountRefresh");
  const upgradeOptions = document.getElementById("upgradeOptions");
  const billingStatus = document.getElementById("billingStatus");
  const manageBilling = document.getElementById("manageBilling");
  const accountOpen = document.getElementById("accountOpen");
  const accountSignOut = document.getElementById("accountSignOut");
  const accountDelete = document.getElementById("accountDelete");
  const accountSessionActions = document.getElementById("accountSessionActions");
  const chromeStoreReview = document.getElementById("chromeStoreReview");

  let currentProduct = null;
  let currentProductIsSaved = false;
  let toastTimer = null;
  let countryCode = "NL";
  let currencyCode = "EUR";
  let exchangeRates = { rates: { EUR: 1 }, date: null };
  const renderController = ComprPopupState.createRenderController();
  const isSafariGuest = ComprRuntimeConfig.platform === "safari" && ComprRuntimeConfig.guestMode === true;

  function requestExchangeRates() {
    return ComprCurrency.requestExchangeRates();
  }

  function on(element, eventName, handler) {
    if (element) element.addEventListener(eventName, handler);
  }

  async function loadAccount() {
    const generation = renderController.begin("account-load");
    accountRefresh.disabled = true;
    billingStatus.textContent = "";
    try {
      if (isSafariGuest) await ComprAuth.ensureGuestSession();
      const me = await ComprApi.me();
      if (!renderController.isCurrent("account-load", generation)) return;
      const plan = String(me.plan || "free").toLowerCase();
      accountCard.dataset.plan = plan;
      accountPlan.textContent = isSafariGuest ? "COMPR Safari Beta" : plan === "free" ? "COMPR Free" : `COMPR ${plan[0].toUpperCase()}${plan.slice(1)}`;
      const remaining = me.usage?.remaining;
      const mode = String(me.usage?.mode || "");
      accountUsage.textContent = remaining === null || remaining === undefined
        ? "Unlimited searches"
        : isSafariGuest
        ? `${remaining} of ${me.usage.limit} free checks remaining`
        : mode === "intro"
        ? `${remaining} of ${me.usage.limit} free searches remaining`
        : `${remaining} of ${me.usage.limit} searches remaining`;
      const details = [];
      if (me.foundingMember && me.foundingMemberNumber) {
        details.push(`Founding member #${me.foundingMemberNumber}`);
      }
      if (me.billing?.periodEnd && plan !== "free") {
        const date = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" })
          .format(new Date(me.billing.periodEnd));
        details.push(me.billing.cancelAtPeriodEnd ? `Access ends ${date}` : `Renews ${date}`);
      }
      accountDetails.textContent = details.join(" · ");
      accountBadge.textContent = isSafariGuest ? "BETA" : me.foundingMember ? "FOUNDING" : (plan === "free" ? "FREE" : "ACTIEF");
      accountBadge.classList.remove("hidden");
      const limit = Number(me.usage?.limit);
      const used = Number(me.usage?.used || 0);
      const hasLimit = Number.isFinite(limit) && limit > 0;
      usageTrack.classList.toggle("hidden", !hasLimit);
      usageBar.style.width = hasLimit ? `${Math.min(100, Math.max(0, used / limit * 100))}%` : "0%";
      upgradeOptions.classList.toggle("hidden", isSafariGuest || plan !== "free" || !hasLimit || remaining > 1);
      manageBilling.classList.toggle("hidden", isSafariGuest || plan === "free");
      accountSessionActions.classList.remove("hidden");
      accountSignOut.classList.toggle("hidden", isSafariGuest);
      accountDelete.textContent = isSafariGuest ? "Clear Safari beta data" : "Delete account";
      accountOpen.classList.add("hidden");
      if (!renderController.isCurrent("account-load", generation)) return;
      billingStatus.textContent = "";
    } catch (error) {
      if (!renderController.isCurrent("account-load", generation)) return;
      accountPlan.textContent = error.code === "AUTH_REQUIRED" ? "Sign in to start your free searches" : "Account temporarily unavailable";
      accountUsage.textContent = error.code === "AUTH_REQUIRED" ? "5 free searches to get started" : "Try refreshing in a moment.";
      accountDetails.textContent = "";
      accountBadge.classList.add("hidden");
      usageTrack.classList.add("hidden");
      upgradeOptions.classList.add("hidden");
      manageBilling.classList.add("hidden");
      accountSessionActions.classList.add("hidden");
      if (isSafariGuest) {
        accountPlan.textContent = "Safari beta temporarily unavailable";
        accountUsage.textContent = "Check your connection and try again.";
        accountOpen.classList.add("hidden");
      } else if (error.code === "AUTH_REQUIRED") {
        accountOpen.classList.remove("hidden");
      } else {
        accountOpen.classList.add("hidden");
      }
    } finally {
      if (renderController.isCurrent("account-load", generation)) accountRefresh.disabled = false;
    }
  }

  function friendlyAccountError(error) {
    if (error?.code === "RATE_LIMITED" || error?.code === "over_email_send_rate_limit" || error?.status === 429 || /rate limit/i.test(error?.message || "")) {
      return "Too many sign-in emails were requested. Please wait before trying again.";
    }
    if (error?.code === "email_address_invalid") return "Enter a valid email address and try again.";
    if (error?.code === "AUTH_REQUIRED") return "Sign in to continue.";
    if (error?.code === "BILLING_NOT_CONFIGURED") return "Subscription management is temporarily unavailable. Your plan remains active.";
    if (error?.code === "BILLING_CUSTOMER_NOT_FOUND") return "We couldn't find a Stripe billing account for this subscription.";
    if (error?.code === "SERVICE_NOT_CONFIGURED") return "COMPR is temporarily unavailable. Please try again shortly.";
    if (error?.code === "API_ERROR" || error?.name === "TypeError") return "Couldn't reach COMPR. Check that the backend is running, then try again.";
    return "Something went wrong. Please try again.";
  }

  async function openAccountPage() {
    accountOpen.disabled = true;
    try {
      await ComprAccountRoute.open();
      window.close();
    } catch {
      billingStatus.textContent = "The sign-in page couldn't be opened. Please try again.";
      accountOpen.disabled = false;
      accountOpen.focus();
    }
  }

  async function signOutAccount() {
    renderController.begin("account-load");
    accountSignOut.disabled = true;
    await ComprAuth.signOut().catch(() => {});
    accountSignOut.disabled = false;
    await loadAccount();
  }

  async function deleteAccount() {
    if (isSafariGuest) {
      if (!window.confirm("Delete this Safari beta guest and all locally saved COMPR data? This cannot be undone.")) return;
      accountDelete.disabled = true;
      billingStatus.textContent = "Clearing Safari beta data…";
      try {
        const result = await ComprApi.resetGuest();
        if (result?.deleted !== true) throw new Error("GUEST_RESET_INCOMPLETE");
        await ComprBrowser.storage.local.clear();
        await updateSavedCount();
        billingStatus.textContent = "Safari beta data cleared. Reopen COMPR to start a new guest session.";
      } catch {
        billingStatus.textContent = "Safari beta data could not be cleared. No success is reported; please try again.";
        accountDelete.disabled = false;
      }
      return;
    }
    const typed = window.prompt(
      "Permanently delete your COMPR account, server search records and locally saved COMPR data? This cannot be undone. Type DELETE to continue."
    );
    if (typed === null) return;
    if (typed !== "DELETE") {
      billingStatus.textContent = "Account not deleted. Type DELETE exactly to confirm.";
      return;
    }
    if (!window.confirm("Final confirmation: permanently delete your COMPR account and data?")) return;

    accountDelete.disabled = true;
    billingStatus.textContent = "Deleting your account…";
    try {
      const result = await ComprApi.deleteAccount();
      if (result?.deleted !== true) throw new Error("ACCOUNT_DELETION_INCOMPLETE");
    } catch (error) {
      billingStatus.textContent = error?.code === "ACCOUNT_DELETION_BILLING_BLOCKED"
        ? "This account is linked to a subscription. Contact support before deletion."
        : "Account deletion failed. Nothing is reported as deleted; please try again.";
      accountDelete.disabled = false;
      return;
    }

    try {
      await ComprBrowser.storage.local.clear();
    } catch {
      billingStatus.textContent = "The server account was deleted, but local COMPR data could not be cleared. Clear the extension data or uninstall COMPR.";
      accountDelete.disabled = false;
      return;
    }

    await updateSavedCount();
    await loadAccount();
    billingStatus.textContent = "Your COMPR account and local COMPR data were permanently deleted.";
    accountDelete.disabled = false;
  }

  async function startCheckout(button) {
    const plan = button.dataset.checkoutPlan;
    if (ComprRuntimeConfig.betaMode) {
      const url = new URL(ComprRuntimeConfig.betaAccessUrl);
      url.searchParams.set("plan", plan);
      await ComprBrowser.tabs.openExternal(url.href);
      billingStatus.textContent = "Founding Access opened. Joining is free and does not reserve a place.";
      return;
    }
    const buttons = [...upgradeOptions.querySelectorAll("button")];
    buttons.forEach(item => { item.disabled = true; });
    billingStatus.textContent = "Beveiligde betaalpagina openen…";
    try {
      const checkout = await ComprApi.createCheckout(plan);
      if (!checkout?.url || !/^https:\/\/checkout\.stripe\.com\//.test(checkout.url)) {
        throw new Error("Ongeldige betaalpagina ontvangen");
      }
      await ComprBrowser.tabs.openExternal(checkout.url);
      billingStatus.textContent = "Rond de testbetaling af in het nieuwe tabblad.";
    } catch (error) {
      billingStatus.textContent = friendlyAccountError(error);
    } finally {
      buttons.forEach(item => { item.disabled = false; });
    }
  }

  async function openBillingPortal() {
    manageBilling.disabled = true;
    billingStatus.textContent = "Beveiligd klantenportaal openen…";
    try {
      const portal = await ComprApi.createBillingPortal();
      if (!portal?.url || !/^https:\/\/billing\.stripe\.com\//.test(portal.url)) {
        throw new Error("Ongeldig klantenportaal ontvangen");
      }
      await ComprBrowser.tabs.openExternal(portal.url);
      billingStatus.textContent = "Stripe-klantenportaal geopend.";
    } catch (error) {
      billingStatus.textContent = friendlyAccountError(error);
    } finally {
      manageBilling.disabled = false;
    }
  }

  function populateCountrySelect() {
    ComprCurrency.COUNTRIES.forEach(country => {
      const option = document.createElement("option");
      option.value = country.code;
      option.textContent = `${countryFlag(country.code)} ${country.name} — ${country.currency}`;
      option.title = country.name;
      countrySelect.appendChild(option);
    });
    countrySelect.value = countryCode;
    enhanceCountrySelect(countrySelect);
  }

  function countryFlag(code) {
    return String(code).toUpperCase().replace(/./g, character => String.fromCodePoint(127397 + character.charCodeAt(0)));
  }

  function enhanceCountrySelect(select) {
    if (select.dataset.enhanced) return;
    select.dataset.enhanced = "true";
    const list = document.createElement("datalist");
    list.id = "popupCountryOptions";
    const input = document.createElement("input");
    input.className = "country-picker-input";
    input.setAttribute("list", list.id);
    input.setAttribute("aria-label", "Search country");
    input.placeholder = "Country";
    const labels = new Map();
    ComprCurrency.COUNTRIES.forEach(country => {
      const label = `${countryFlag(country.code)} ${country.name} — ${country.currency}`;
      labels.set(label, country.code);
      const option = document.createElement("option");
      option.value = label;
      list.append(option);
    });
    const selected = ComprCurrency.COUNTRIES.find(country => country.code === select.value);
    if (selected) input.value = `${countryFlag(selected.code)} ${selected.currency}`;
    input.addEventListener("focus", () => input.select());
    input.addEventListener("change", () => {
      const code = labels.get(input.value);
      if (!code) return;
      select.value = code;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      const country = ComprCurrency.COUNTRIES.find(item => item.code === code);
      if (country) input.value = `${countryFlag(country.code)} ${country.currency}`;
    });
    select.classList.add("country-native-select");
    select.after(input, list);
  }

  function renderConvertedPrice(product) {
    const converted = ComprCurrency.getConvertedPrice(
      product,
      currencyCode,
      countryCode,
      exchangeRates.rates
    );

    if (!converted) {
      productPrice.textContent = product.price || "Price not found";
      productOriginalPrice.classList.add("hidden");
      return;
    }

    productPrice.textContent = converted.formatted;
    if (converted.sourceCurrency !== currencyCode) {
      const rateDate = exchangeRates.date ? ` · ECB ${exchangeRates.date}` : "";
      productOriginalPrice.textContent = `Original: ${product.price}${rateDate}`;
      productOriginalPrice.classList.remove("hidden");
    } else {
      productOriginalPrice.classList.add("hidden");
    }
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.remove("hidden");
    toastTimer = window.setTimeout(() => toast.classList.add("hidden"), 1800);
  }

  function showComparePrompt() {
    comparePrompt.classList.remove("hidden");
    promptCompareButton.focus();
  }

  function hideComparePrompt() {
    comparePrompt.classList.add("hidden");
  }

  async function updateSavedCount() {
    const products = await ComprStorage.getSavedProducts();
    savedCount.textContent = products.length;
    headerCompareButton.setAttribute(
      "aria-label",
      `Open ${products.length} saved product${products.length === 1 ? "" : "s"}`
    );

    const progress = Math.min(products.length / 3, 1) * 100;
    momentumBar.style.width = `${progress}%`;

    if (products.length === 0) {
      momentumTitle.textContent = "Start your shortlist";
      momentumText.textContent = "Save products before you decide.";
    } else if (products.length === 1) {
      momentumTitle.textContent = "Your shortlist has started";
      momentumText.textContent = "Add one more product for a useful comparison.";
    } else if (products.length === 2) {
      momentumTitle.textContent = "Ready to compare";
      momentumText.textContent = "Compare your options before you buy.";
    } else {
      momentumTitle.textContent = `${products.length} options, one smarter choice`;
      momentumText.textContent = "Review price, store and product details side by side.";
    }
    return products;
  }

  function showState(state) {
    return renderController.update("visible-state", state.id, () => {
      loadingState.classList.add("hidden");
      productState.classList.add("hidden");
      emptyState.classList.add("hidden");
      state.classList.remove("hidden");
      app.dataset.state = state.id === "loadingState" ? "loading" : state.id === "productState" ? "product" : "empty";
    });
  }

  function isUsableProduct(product) {
    return ComprProductEligibility.isEligibleProductPayload(product);
  }

  function formatStore(hostname) {
    if (!hostname) return "";

    return hostname
      .replace(/^www\./i, "")
      .replace(/^m\./i, "");
  }

  async function updateSaveButton() {
    if (!currentProduct) return;

    let products = await updateSavedCount();

    currentProductIsSaved = products.some(product =>
      ComprProduct.sameProduct(product, currentProduct)
    );

    if (currentProductIsSaved && currentProduct.availabilityCheckedAt) {
      products = await ComprStorage.updateSavedProduct(currentProduct);
    }

    renderSimilarWarning(products);

    if (currentProductIsSaved) {
      saveButton.textContent = "Saved — remove";
      saveButton.setAttribute("aria-label", "Remove this product from COMPR");
      saveButton.classList.add("is-saved");
    } else {
      saveButton.textContent = "Save & Compare";
      saveButton.setAttribute("aria-label", "Save this product to COMPR");
      saveButton.classList.remove("is-saved");
    }
  }

  function renderSimilarWarning(products) {
    const matches = ComprSimilarity.findSimilarProducts(currentProduct, products);

    if (!matches.length) {
      similarWarning.classList.add("hidden");
      return;
    }

    const currentPrice = ComprCurrency.getConvertedPrice(
      currentProduct, currencyCode, countryCode, exchangeRates.rates
    )?.amount ?? null;
    const comparable = matches
      .map(match => ({
        ...match,
        price: ComprCurrency.getConvertedPrice(
          match.product, currencyCode, countryCode, exchangeRates.rates
        )?.amount ?? null
      }))
      .filter(match => match.price !== null);
    const lowest = comparable.length
      ? Math.min(...comparable.map(match => match.price))
      : null;

    similarTitle.textContent = matches.length === 1
      ? "You saved 1 similar product"
      : `You saved ${matches.length} similar products`;

    if (currentPrice !== null && lowest !== null && currentPrice > lowest) {
      const difference = ComprCurrency.format(
        currentPrice - lowest, currencyCode, countryCode
      );
      similarMessage.textContent = `A similar saved option is ${difference} less.`;
    } else {
      similarMessage.textContent = "Compare your saved options before you decide.";
    }

    similarWarning.classList.remove("hidden");
  }

  function renderProduct(product) {
    const renderKey = JSON.stringify(product);
    const changed = renderController.update("product", renderKey, () => {
    currentProduct = product;

    productName.textContent =
      product.name || "Product";

    productBrand.textContent =
      product.brand &&
      product.brand !== "Merk niet gevonden"
        ? product.brand
        : "Product";

    const techCategories = new Set([
      "Phones & Tablets", "Computers", "TV & Audio", "Gaming", "Cameras",
      "Wearables", "Home Appliances", "Electronics Accessories"
    ]);
    productCategory.textContent = techCategories.has(product.category)
      ? `Tech · ${product.category}`
      : (product.category || "Other");

    renderConvertedPrice(product);

    productStore.textContent =
      formatStore(product.webshop);

    const availabilityLabels = {
      in_stock: "In stock when checked",
      preorder: "Available for pre-order",
      out_of_stock: "Out of stock when checked",
      unknown: "Availability not confirmed"
    };
    const availableSizes = Array.isArray(product.availableSizes) ? product.availableSizes : [];
    const unavailableSizes = Array.isArray(product.unavailableSizes) ? product.unavailableSizes : [];
    if (availableSizes.length || unavailableSizes.length) {
      const parts = [];
      if (availableSizes.length) parts.push(`Available: ${availableSizes.join(", ")}`);
      if (unavailableSizes.length) parts.push(`Unavailable: ${unavailableSizes.join(", ")}`);
      productAvailability.textContent = parts.join(" · ");
    } else {
      productAvailability.textContent = availabilityLabels[product.availabilityStatus] || availabilityLabels.unknown;
    }
    productAvailability.dataset.status = product.availabilityStatus || "unknown";

    const trustpilotUrl = ComprProduct.getTrustpilotUrl(product);
    if (trustpilotUrl) {
      trustpilotLink.href = trustpilotUrl;
      const domain = ComprProduct.getStoreDomain(product);
      trustpilotLink.textContent = `Store reviews · ${domain.replace(/^www\./, "")}`;
      trustpilotLink.classList.remove("hidden");
    } else {
      trustpilotLink.classList.add("hidden");
    }

    if (
      product.image &&
      product.image !== "Afbeelding niet gevonden"
    ) {
      productImage.src = product.image;
      productImage.style.display = "block";
      productImage.parentElement.classList.remove("missing-image");
      productImage.onerror = () => {
        productImage.style.display = "none";
        productImage.parentElement.classList.add("missing-image");
      };
    } else {
      productImage.removeAttribute("src");
      productImage.style.display = "none";
      productImage.parentElement.classList.add("missing-image");
    }

    });
    showState(productState);
    if (changed) updateSaveButton();
    return changed;
  }

  async function saveCurrentProduct() {
    if (!currentProduct) return;

    saveButton.disabled = true;

    try {
    if (currentProductIsSaved) {
      await ComprStorage.removeSavedProduct(currentProduct);
      showToast("Removed from your saved products.");
    } else {
      await ComprStorage.saveProduct(currentProduct);
      showToast("Saved in this browser — it will still be here when you sign in again.");
    }

    await updateSaveButton();
    } catch {
      showToast("Opslaan is niet gelukt. Probeer het opnieuw.");
    } finally {
      saveButton.disabled = false;
    }
  }

  async function registerCheaperInterest() {
    try {
      const data = await ComprBrowser.storage.local.get(["findCheaperInterest"]);
      const currentCount = Number(data.findCheaperInterest) || 0;
      await ComprBrowser.storage.local.set({ findCheaperInterest: currentCount + 1 });
      cheaperInterestButton.textContent = "✓ NOTED";
      cheaperInterestButton.disabled = true;
      showToast("Thanks — noted for v0.3");
    } catch {
      showToast("Couldn't save that choice. Please try again.");
    }
  }

  function openComparePage() {
    ComprBrowser.tabs.create({
      url: ComprBrowser.runtime.getURL(
        "compare.html"
      )
    }).catch(() => showToast("Couldn't open saved products. Please try again."));
  }

  function openChromeStoreReview() {
    const reviewUrl = ComprRuntimeConfig.storeReviewUrl || ComprRuntimeConfig.chromeStoreUrl;
    if (reviewUrl) ComprBrowser.tabs.openExternal(reviewUrl).catch(() => showToast("Couldn't open the store page."));
  }

  async function openFindThisCheaper() {
    if (currentProduct && !currentProductIsSaved) {
      await saveCurrentProduct();
    }
    openComparePage();
  }

  async function getProductFromActiveTab() {
    const generation = renderController.begin("product-detection");
    try {
      const [tab] =
        await ComprBrowser.tabs.query({
          active: true,
          currentWindow: true
        });

      if (!tab?.id) {
        if (!renderController.isCurrent("product-detection", generation)) return;
        showState(emptyState);
        return;
      }

      const adapterProbe = await ComprBrowser.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => globalThis.ComprBrowser?.adapterVersion === "compr-browser-adapter-v1"
      });

      if (adapterProbe?.[0]?.result !== true) {
        await ComprBrowser.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["shared/browserAdapter.js"]
        });
      }

      await ComprBrowser.scripting.executeScript({
        target: { tabId: tab.id },
        files: [
          "shared/productEligibility.js",
          "detectors/price.js",
          "detectors/brand.js",
          "detectors/color.js",
          "detectors/material.js",
          "detectors/sizes.js",
          "detectors/availability.js",
          "detectors/policies.js",
          "detectors/discountCodes.js",
          "detectors/category.js",
          "detectors/productId.js",
          "detectors/productName.js",
          "content.js"
        ]
      });

      const injection = await ComprBrowser.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          if (typeof getProductInfo !== "function") return null;
          return getProductInfo();
        }
      });
      let response = injection?.[0]?.result || null;
      if (!renderController.isCurrent("product-detection", generation)) return;

      if (!isUsableProduct(response)) {
        showState(emptyState);
        return;
      }

      renderProduct(response);
    } catch (error) {
      if (!renderController.isCurrent("product-detection", generation)) return;
      if (error?.capability === "scripting.executeScript" || error?.capability === "tabs.query") {
        showToast("Allow COMPR on this website, then reopen COMPR to try again.");
      }
      showState(emptyState);
    }
  }

  on(saveButton,
    "click",
    saveCurrentProduct
  );

  on(compareButton,
    "click",
    openComparePage
  );

  on(headerCompareButton, "click", openComparePage);
  on(emptyCompareButton, "click", openComparePage);
  on(similarCompareButton, "click", openComparePage);
  on(promptCompareButton, "click", openComparePage);
  on(promptAddMoreButton, "click", () => window.close());

  on(comparePrompt, "click", event => {
    if (event.target === comparePrompt) hideComparePrompt();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !comparePrompt.classList.contains("hidden")) {
      hideComparePrompt();
      saveButton.focus();
    }
  });

  on(countrySelect, "change", async () => {
    countryCode = countrySelect.value;
    currencyCode = ComprCurrency.getCurrencyForCountry(countryCode);
    await ComprBrowser.storage.local.set({ countryCode });
    if (currentProduct) {
      renderConvertedPrice(currentProduct);
      await updateSaveButton();
    }
  });

  on(cheaperInterestButton,
    "click",
    openFindThisCheaper
  );
  on(accountRefresh, "click", loadAccount);
  on(manageBilling, "click", openBillingPortal);
  on(accountOpen, "click", openAccountPage);
  on(accountSignOut, "click", signOutAccount);
  on(accountDelete, "click", deleteAccount);
  on(chromeStoreReview, "click", openChromeStoreReview);
  upgradeOptions.querySelectorAll("[data-checkout-plan]").forEach(button => {
    on(button, "click", () => startCheckout(button));
  });

  /*
    Als je een product via de compare-pagina verwijdert
    terwijl de popup later opnieuw opent, wordt de knop
    opnieuw berekend uit savedProducts.
  */
  const settings = await ComprBrowser.storage.local.get(["countryCode"]);
  countryCode = settings.countryCode || "NL";
  currencyCode = ComprCurrency.getCurrencyForCountry(countryCode);
  populateCountrySelect();
  exchangeRates = await requestExchangeRates();
  await ComprStorage.migrateStorage();
  await updateSavedCount();
  await loadAccount();
  getProductFromActiveTab();
  window.addEventListener("pagehide", () => {
    renderController.begin("product-detection");
    window.clearTimeout(toastTimer);
  }, { once: true });
}, { once: true });
}
