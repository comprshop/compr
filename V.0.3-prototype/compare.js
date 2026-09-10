const elements = {
  container: document.getElementById("products"),
  productCount: document.getElementById("productCount"),
  clearButton: document.getElementById("clearButton"),
  exportButton: document.getElementById("exportButton"),
  importButton: document.getElementById("importButton"),
  importFile: document.getElementById("importFile"),
  searchInput: document.getElementById("searchInput"),
  categoryFilter: document.getElementById("categoryFilter"),
  sizeFilter: document.getElementById("sizeFilter"),
  sortSelect: document.getElementById("sortSelect"),
  groupToggle: document.getElementById("groupToggle"),
  availableOnly: document.getElementById("availableOnly"),
  resultsSummary: document.getElementById("resultsSummary"),
  toast: document.getElementById("toast"),
  insightProducts: document.getElementById("insightProducts"),
  insightCategories: document.getElementById("insightCategories"),
  insightPriceRange: document.getElementById("insightPriceRange"),
  insightPriceLabel: document.getElementById("insightPriceLabel"),
  currencyNote: document.getElementById("currencyNote"),
  countrySelect: document.getElementById("countrySelect"),
  cheaperDialog: document.getElementById("cheaperDialog"),
  cheaperDialogClose: document.getElementById("cheaperDialogClose"),
  cheaperDialogSubtitle: document.getElementById("cheaperDialogSubtitle"),
  cheaperCurrentProduct: document.getElementById("cheaperCurrentProduct"),
  cheaperSavingsHero: document.getElementById("cheaperSavingsHero"),
  cheaperQuery: document.getElementById("cheaperQuery"),
  cheaperWebSearch: document.getElementById("cheaperWebSearch"),
  cheaperBroadSearch: document.getElementById("cheaperBroadSearch"),
  cheaperStatus: document.getElementById("cheaperStatus"),
  cheaperSignIn: document.getElementById("cheaperSignIn"),
  cheaperResults: document.getElementById("cheaperResults")
};

const accountElements = {
  card: document.getElementById("overviewAccount"),
  plan: document.getElementById("overviewPlan"),
  usage: document.getElementById("overviewUsage"),
  billing: document.getElementById("overviewBilling"),
  usageTrack: document.getElementById("overviewUsageTrack"),
  usageBar: document.getElementById("overviewUsageBar"),
  founding: document.getElementById("overviewFounding"),
  actions: document.getElementById("overviewActions"),
  manage: document.getElementById("overviewManage"),
  refresh: document.getElementById("overviewRefresh")
};

let allProducts = [];
let toastTimer = null;
let countryCode = "NL";
let currencyCode = "EUR";
let exchangeRates = { rates: { EUR: 1 }, date: null };
const searchAction = ComprReliability.createLatestAction();

function setSearchButtonsDisabled(disabled) {
  document.querySelectorAll(".find-cheaper-button").forEach(button => { button.disabled = disabled; });
}

function requestExchangeRates() {
  return ComprCurrency.requestExchangeRates();
}

async function openSecureBilling(createSession, allowedHost) {
  const session = await createSession();
  const url = new URL(session.url);
  if (url.protocol !== "https:" || url.hostname !== allowedHost) throw new Error("Invalid secure billing URL");
  await ComprBrowser.tabs.openExternal(url.href);
}

function friendlyBillingError(error) {
  if (error?.code === "AUTH_REQUIRED") return "Sign in to manage your subscription.";
  if (error?.code === "BILLING_NOT_CONFIGURED") return "Subscription management is temporarily unavailable. Your plan remains active.";
  if (error?.code === "BILLING_CUSTOMER_NOT_FOUND") return "We couldn't find a Stripe billing account for this subscription.";
  if (error?.code === "API_ERROR" || error?.name === "TypeError") return "Couldn't reach COMPR. Check that the backend is running.";
  return "We couldn't open subscription management. Please try again.";
}

async function loadOverviewAccount() {
  accountElements.refresh.disabled = true;
  try {
    const isSafariGuest = ComprRuntimeConfig.platform === "safari" && ComprRuntimeConfig.guestMode === true;
    if (isSafariGuest) await ComprAuth.ensureGuestSession();
    const me = await ComprApi.me();
    const plan = String(me.plan || "free").toLowerCase();
    accountElements.card.dataset.plan = plan;
    accountElements.plan.textContent = isSafariGuest ? "COMPR Safari Beta" : plan === "free" ? "COMPR Free" : `COMPR ${plan[0].toUpperCase()}${plan.slice(1)}`;
    accountElements.usage.textContent = me.usage?.remaining == null
      ? "Unlimited price checks"
      : `${me.usage.remaining} of ${me.usage.limit} price checks remaining`;
    const limit = Number(me.usage?.limit);
    const used = Number(me.usage?.used || 0);
    const hasLimit = Number.isFinite(limit) && limit > 0;
    accountElements.usageTrack.classList.toggle("hidden", !hasLimit);
    accountElements.usageBar.style.width = hasLimit ? `${Math.min(100, Math.max(0, used / limit * 100))}%` : "0%";
    if (me.billing?.periodEnd && plan !== "free") {
      const date = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" })
        .format(new Date(me.billing.periodEnd));
      accountElements.billing.textContent = me.billing.cancelAtPeriodEnd ? `Access ends ${date}` : `Renews ${date}`;
    } else {
      accountElements.billing.textContent = plan === "free" ? "Upgrade whenever you need more checks" : "";
    }
    accountElements.founding.textContent = me.foundingMemberNumber ? `FOUNDING MEMBER #${me.foundingMemberNumber}` : "";
    accountElements.founding.classList.toggle("hidden", !me.foundingMemberNumber);
    accountElements.actions.classList.toggle("hidden", isSafariGuest || plan !== "free" || Number(me.usage?.remaining) > 1);
    accountElements.manage.classList.toggle("hidden", isSafariGuest || plan === "free");
  } catch (error) {
    accountElements.plan.textContent = error.code === "AUTH_REQUIRED" ? "Sign in to use price checks" : "Account unavailable";
    accountElements.usage.textContent = "Open the COMPR account page to sign in.";
    accountElements.billing.textContent = "";
    accountElements.usageTrack.classList.add("hidden");
    accountElements.actions.classList.add("hidden");
    accountElements.manage.classList.add("hidden");
    accountElements.founding.classList.add("hidden");
  } finally {
    accountElements.refresh.disabled = false;
  }
}

accountElements.refresh.addEventListener("click", loadOverviewAccount);
accountElements.manage.addEventListener("click", async () => {
  try { await openSecureBilling(() => ComprApi.createBillingPortal(), "billing.stripe.com"); }
  catch (error) { showToast(friendlyBillingError(error)); }
});
accountElements.actions.querySelectorAll("[data-overview-checkout]").forEach(button => {
  button.addEventListener("click", async () => {
    if (ComprRuntimeConfig.betaMode) {
      const url = new URL(ComprRuntimeConfig.betaAccessUrl);
      url.searchParams.set("plan", button.dataset.overviewCheckout);
      await ComprBrowser.tabs.openExternal(url.href);
      showToast("Founding Access opened. Joining is free and does not reserve a place.");
      return;
    }
    try { await openSecureBilling(() => ComprApi.createCheckout(button.dataset.overviewCheckout), "checkout.stripe.com"); }
    catch (error) { showToast(friendlyBillingError(error)); }
  });
});

function populateCountrySelect() {
  ComprCurrency.COUNTRIES.forEach(country => {
    const option = document.createElement("option");
    option.value = country.code;
    option.textContent = `${countryFlag(country.code)} ${country.name} — ${country.currency}`;
    elements.countrySelect.appendChild(option);
  });
  elements.countrySelect.value = countryCode;
  enhanceCountrySelect(elements.countrySelect);
}

function countryFlag(code) {
  return String(code).toUpperCase().replace(/./g, character => String.fromCodePoint(127397 + character.charCodeAt(0)));
}

function enhanceCountrySelect(select) {
  if (select.dataset.enhanced) return;
  select.dataset.enhanced = "true";
  const list = document.createElement("datalist");
  list.id = `${select.id}Options`;
  const input = document.createElement("input");
  input.className = "country-picker-input";
  input.setAttribute("list", list.id);
  input.setAttribute("aria-label", "Search country");
  input.placeholder = "Search country";
  const labels = new Map();
  ComprCurrency.COUNTRIES.forEach(country => {
    const label = `${countryFlag(country.code)} ${country.name} — ${country.currency}`;
    labels.set(label, country.code);
    const option = document.createElement("option");
    option.value = label;
    list.append(option);
  });
  const selected = ComprCurrency.COUNTRIES.find(country => country.code === select.value);
  if (selected) input.value = `${countryFlag(selected.code)} ${selected.name} — ${selected.currency}`;
  input.addEventListener("focus", () => input.select());
  input.addEventListener("change", () => {
    const code = labels.get(input.value);
    if (!code) return;
    select.value = code;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  select.classList.add("country-native-select");
  select.after(input, list);
}

function addConvertedPrices(products) {
  return products.map(product => {
    const converted = ComprCurrency.getConvertedPrice(
      product, currencyCode, countryCode, exchangeRates.rates
    );
    return converted
      ? {
          ...product,
          convertedAmount: converted.amount,
          convertedPrice: converted.formatted,
          convertedCurrency: currencyCode,
          sourceCurrency: converted.sourceCurrency,
          displayCountry: countryCode
        }
      : product;
  });
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.remove("hidden");
  toastTimer = window.setTimeout(() => elements.toast.classList.add("hidden"), 2200);
}

function closeDataMenu() {
  document.querySelector(".data-menu")?.removeAttribute("open");
}

function updateProductCount(count) {
  elements.productCount.textContent = count === 1 ? "1 item" : `${count} items`;
}

function updateInsights(products) {
  const prices = products
    .map(product => product.convertedAmount)
    .filter(Number.isFinite);
  elements.insightProducts.textContent = products.length;

  if (!prices.length) {
    elements.insightCategories.textContent = "—";
    elements.insightPriceRange.textContent = "—";
  } else {
    const lowest = Math.min(...prices);
    const highest = Math.max(...prices);
    elements.insightCategories.textContent = ComprCurrency.format(lowest, currencyCode, countryCode);
    elements.insightPriceRange.textContent = ComprCurrency.format(highest - lowest, currencyCode, countryCode);
  }
  elements.insightPriceLabel.textContent = "potential difference";
  elements.currencyNote.textContent = exchangeRates.date
    ? `Indicative conversion using ECB reference rates from ${exchangeRates.date}. Original store prices remain visible.`
    : "Original store prices are shown when currency conversion is unavailable.";
}

function renderMessage(title, message) {
  elements.container.innerHTML = "";
  const state = document.createElement("div");
  state.className = "empty-state";
  const heading = document.createElement("h2");
  heading.textContent = title;
  const copy = document.createElement("p");
  copy.textContent = message;
  state.append(heading, copy);
  elements.container.appendChild(state);
}

function populateCategories(products) {
  const selected = elements.categoryFilter.value;
  const categories = ComprCollection.getCategories(products);
  elements.categoryFilter.innerHTML = '<option value="all">All categories</option>';

  categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    elements.categoryFilter.appendChild(option);
  });

  elements.categoryFilter.value = categories.includes(selected) ? selected : "all";
}

function createAddProductCard() {
  const card = document.createElement("aside");
  card.className = "add-product-card";
  const icon = document.createElement("span");
  icon.className = "add-product-icon";
  icon.textContent = "+";
  const title = document.createElement("h2");
  title.textContent = "Add item";
  const copy = document.createElement("p");
  copy.textContent = "Save another item while shopping to compare prices, delivery and deals side by side.";
  const help = document.createElement("button");
  help.type = "button";
  help.textContent = "Add item";
  help.addEventListener("click", () => showToast("Open another product page, click COMPR, then choose Save & Compare."));
  card.append(icon, title, copy, help);
  return card;
}

function createEmptyCollectionState() {
  const state = document.createElement("div");
  state.className = "empty-state empty-collection-state";
  const title = document.createElement("h2");
  title.textContent = "No saved products yet";
  const copy = document.createElement("p");
  copy.textContent = "Start with any product page and use COMPR to save your first item.";
  state.append(title, copy);
  return state;
}

function createCards(products, priceInfo, includeAddPrompt = false) {
  const fragment = document.createDocumentFragment();
  products.forEach(product => {
    fragment.appendChild(createProductCard(product, priceInfo, handleRemove, handleFindCheaper));
  });
  if (includeAddPrompt) fragment.appendChild(createAddProductCard());
  return fragment;
}

function renderProducts() {
  const pricedProducts = addConvertedPrices(allProducts);
  updateProductCount(allProducts.length);
  updateInsights(pricedProducts);
  elements.clearButton.disabled = allProducts.length === 0;
  elements.exportButton.disabled = allProducts.length === 0;

  if (!allProducts.length) {
    elements.resultsSummary.textContent = "";
    elements.container.innerHTML = "";
    elements.container.append(createEmptyCollectionState(), createAddProductCard());
    return;
  }

  const visible = ComprCollection.filterAndSortProducts(pricedProducts, {
    query: elements.searchInput.value,
    category: elements.categoryFilter.value,
    sort: elements.sortSelect.value,
    size: elements.sizeFilter.value,
    availableOnly: elements.availableOnly.checked
  });

  elements.resultsSummary.textContent = visible.length === allProducts.length
    ? `Showing all ${allProducts.length} saved products`
    : `Showing ${visible.length} of ${allProducts.length} saved products`;

  if (!visible.length) {
    elements.container.innerHTML = "";
    elements.container.append(createEmptyCollectionState(), createAddProductCard());
    return;
  }

  const priceInfo = getCategoryPriceInfo(pricedProducts);
  elements.container.innerHTML = "";

  if (!elements.groupToggle.checked) {
    elements.container.appendChild(createCards(visible, priceInfo, true));
    return;
  }

  const groups = ComprCollection.groupProductsByCategory(visible);
  Object.entries(groups).forEach(([category, products]) => {
    const section = document.createElement("section");
    section.className = "category-group";
    const heading = document.createElement("h2");
    heading.className = "category-heading";
    heading.textContent = `${category} (${products.length})`;
    const grid = document.createElement("div");
    grid.className = "category-grid";
    grid.appendChild(createCards(products, priceInfo, false));
    section.append(heading, grid);
    elements.container.appendChild(section);
  });
  elements.container.appendChild(createAddProductCard());
}

async function loadProducts() {
  allProducts = await ComprStorage.getSavedProducts();
  populateCategories(allProducts);
  renderProducts();
}

async function handleRemove(identity) {
  allProducts = await ComprStorage.removeSavedProduct(identity);
  populateCategories(allProducts);
  renderProducts();
  showToast("Product removed");
}

function formatPrototypePrice(result) {
  const amount = Number(result.price);
  if (!Number.isFinite(amount)) return "Price unavailable";
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: result.currency || "EUR"
    }).format(amount);
  } catch {
    return `${result.currency || "EUR"} ${amount.toFixed(2)}`;
  }
}

function getCurrentProductAmount(product) {
  if (Number.isFinite(product?.convertedAmount)) return product.convertedAmount;
  return ComprCurrency.parseAmount(product?.price);
}

function matchPresentation(type) {
  return ({
    EXACT_MATCH: { label: "Exact match", className: "exact" },
    HIGH_CONFIDENCE_MATCH: { label: "Strong match", className: "exact" },
    LIKELY_MATCH: { label: "Likely match", className: "likely" },
    POSSIBLE_MATCH: { label: "Possible match", className: "similar" },
    LIKELY_SAME: { label: "Likely match", className: "likely" },
    SIMILAR: { label: "Similar product", className: "similar" },
    NO_MATCH: { label: "Different product", className: "rejected" }
  })[type] || { label: "Possible match", className: "similar" };
}

function userFacingMatchReasons(reasons) {
  const labels = {
    "Same brand": "Same brand",
    "Same category": "Same product type",
    "Same model number": "Same model",
    "Same generation": "Same generation",
    "Same capacity": "Same capacity",
    "Same exact identifier": "Matching product code",
    "Very similar product name": "Matching product name",
    "Similar product name": "Similar product name",
    "Same colour variant": "Same colour",
    "Different colour or variant": "Different colour or variant"
  };
  return (Array.isArray(reasons) ? reasons : []).map(reason => labels[reason] || "").filter(Boolean).slice(0, 3);
}

function renderCheaperCurrentProduct(product) {
  elements.cheaperCurrentProduct.replaceChildren();
  const copy = document.createElement("div");
  const eyebrow = document.createElement("span");
  eyebrow.textContent = product.brand || "Selected product";
  const title = document.createElement("strong");
  title.textContent = product.name || "Product name unavailable";
  const meta = document.createElement("p");
  const identifier = product.gtin || product.mpn || product.sku;
  const identifierLabel = product.gtin ? "GTIN" : product.mpn ? "MPN" : product.sku ? "Retailer product code" : "";
  meta.textContent = identifier && identifierLabel
    ? `${identifierLabel}: ${identifier}`
    : "No identifier detected — matching will be less certain.";
  copy.append(eyebrow, title, meta);

  const price = document.createElement("b");
  price.textContent = product.convertedPrice || product.price || "Price unavailable";
  elements.cheaperCurrentProduct.append(copy, price);
}

function createCheaperResult(result, currentProduct) {
  const card = document.createElement("article");
  const presentation = matchPresentation(result.matchType);
  card.className = `cheaper-result ${presentation.className}`;

  const top = document.createElement("div");
  top.className = "cheaper-result-top";
  const badge = document.createElement("span");
  badge.className = "match-badge";
  badge.textContent = result.isDemo
    ? `SIMULATED ${presentation.label}`
    : presentation.label;
  const confidence = document.createElement("span");
  confidence.className = "match-confidence";
  confidence.textContent = "";
  confidence.hidden = true;
  top.append(badge);

  const imageFrame = document.createElement("div");
  imageFrame.className = "cheaper-result-image";
  if (result.image) {
    const productImage = document.createElement("img");
    productImage.src = result.image;
    productImage.alt = result.name || "Product";
    productImage.loading = "lazy";
    productImage.addEventListener("error", () => imageFrame.classList.add("missing-image"));
    imageFrame.append(productImage);
  } else {
    imageFrame.classList.add("missing-image");
  }

  const name = document.createElement("h3");
  name.textContent = result.name;
  const store = document.createElement("p");
  store.className = "demo-store";
  store.textContent = result.webshop;
  const price = document.createElement("strong");
  price.className = "demo-price";
  price.textContent = formatPrototypePrice(result);
  const reason = document.createElement("p");
  reason.className = "match-reasons";
  const readableReasons = userFacingMatchReasons(result.matchReasons);
  reason.textContent = readableReasons.length
    ? readableReasons.join(" • ")
    : result.providerLabel || "No reliable matching signals";
  const note = document.createElement("span");
  note.className = "demo-data-note";
  note.textContent = result.matchType === "NO_MATCH"
    ? "Correctly rejected by the matcher"
    : result.isDemo ? "Demo price — not a live offer" : "Live retailer page — verify price and availability";

  const currentAmount = getCurrentProductAmount(currentProduct);
  const resultAmount = Number(result.price);
  const resultCurrency = result.currency || "EUR";
  const currentCurrency = currentProduct.convertedCurrency || currentProduct.currency || resultCurrency;
  if (
    ["EXACT_MATCH", "HIGH_CONFIDENCE_MATCH", "LIKELY_SAME"].includes(result.matchType) &&
    Number.isFinite(currentAmount) &&
    Number.isFinite(resultAmount) &&
    resultAmount < currentAmount &&
    resultCurrency === currentCurrency
  ) {
    const saving = document.createElement("p");
    saving.className = "demo-saving";
    saving.textContent = `${ComprCurrency.format(currentAmount - resultAmount, resultCurrency, countryCode)} lower than the saved price`;
    card.append(top, imageFrame, name, store, price, saving, reason);
  } else {
    card.append(top, imageFrame, name, store, price, reason);
  }

  const isAcceptedMatch = ["EXACT_MATCH", "HIGH_CONFIDENCE_MATCH"].includes(result.matchType);
  const action = result.url && !result.isDemo && isAcceptedMatch
    ? document.createElement("a")
    : document.createElement("button");
  action.className = "demo-result-action";
  if (action.tagName === "A") {
    action.href = result.url;
    action.target = "_blank";
    action.rel = "noopener noreferrer";
    action.textContent = ["SIMILAR", "POSSIBLE_MATCH"].includes(result.matchType) ? "View possible match" : "Go directly to store";
  } else {
    action.type = "button";
    action.disabled = true;
    action.textContent = result.matchType === "NO_MATCH"
      ? "NOT THE SAME PRODUCT"
      : "DEMO RESULT ONLY";
  }

  card.append(note, action);
  return card;
}

function renderSavingsHero(result, currentProduct) {
  elements.cheaperSavingsHero.replaceChildren();
  elements.cheaperSavingsHero.classList.add("hidden");
  if (!result) return false;
  const currentAmount = getCurrentProductAmount(currentProduct);
  const bestAmount = Number(result.price);
  if (!Number.isFinite(currentAmount) || !Number.isFinite(bestAmount) || bestAmount >= currentAmount) return false;
  const currency = result.currency || currentProduct.convertedCurrency || currentProduct.currency || "EUR";
  const label = document.createElement("span");
  label.className = "savings-kicker";
  label.textContent = "BETTER PRICE FOUND";
  const title = document.createElement("h3");
  title.textContent = result.matchType === "EXACT_MATCH" ? "The same product for less" : "A strong match for less";
  const prices = document.createElement("div");
  prices.className = "savings-prices";
  const current = document.createElement("div");
  current.innerHTML = `<span>Current price</span><s>${ComprCurrency.format(currentAmount, currency, countryCode)}</s>`;
  const best = document.createElement("div");
  best.innerHTML = `<span>Best price</span><strong>${ComprCurrency.format(bestAmount, currency, countryCode)}</strong>`;
  prices.append(current, best);
  const saving = document.createElement("p");
  saving.className = "savings-total";
  saving.innerHTML = `<span>YOU SAVE</span><strong>${ComprCurrency.format(currentAmount - bestAmount, currency, countryCode)}</strong>`;
  const meta = document.createElement("p");
  meta.className = "savings-meta";
  meta.textContent = `${result.webshop || "Retailer"} · Price checked just now`;
  const action = document.createElement("a");
  action.className = "savings-action";
  action.href = result.url;
  action.target = "_blank";
  action.rel = "noopener noreferrer";
  action.textContent = "View cheaper option";
  elements.cheaperSavingsHero.append(label, title, prices, saving, meta, action);
  elements.cheaperSavingsHero.classList.remove("hidden");
  return true;
}

async function handleFindCheaper(product) {
  const action = searchAction.begin();
  if (!action) return;
  setSearchButtonsDisabled(true);
  renderCheaperCurrentProduct(product);
  elements.cheaperDialogSubtitle.textContent = "Building a safe product fingerprint…";
  elements.cheaperStatus.textContent = "Searching public retailer pages…";
  elements.cheaperResults.replaceChildren();
  elements.cheaperSignIn.classList.add("hidden");
  for (let index = 0; index < 2; index += 1) {
    const skeleton = document.createElement("div");
    skeleton.className = "result-skeleton";
    skeleton.setAttribute("aria-hidden", "true");
    skeleton.innerHTML = "<span></span><i></i><i></i><b></b>";
    elements.cheaperResults.appendChild(skeleton);
  }
  renderSavingsHero(null, product);
  elements.cheaperQuery.textContent = "Preparing query…";
  elements.cheaperWebSearch.removeAttribute("href");
  elements.cheaperBroadSearch.removeAttribute("href");

  if (typeof elements.cheaperDialog.showModal === "function") {
    elements.cheaperDialog.showModal();
  } else {
    elements.cheaperDialog.setAttribute("open", "");
  }

  const loadingStages = ["Finding the same product…", "Checking other stores…", "Comparing prices…"];
  let loadingStage = 0;
  elements.cheaperDialogSubtitle.textContent = loadingStages[loadingStage];
  const loadingTimer = window.setInterval(() => {
    loadingStage = Math.min(loadingStage + 1, loadingStages.length - 1);
    elements.cheaperDialogSubtitle.textContent = loadingStages[loadingStage];
  }, 1400);

  try {
    if (ComprRuntimeConfig.platform === "safari" && ComprRuntimeConfig.guestMode === true) {
      await ComprAuth.ensureGuestSession();
    }
    const response = await findExactProduct(product, {
      force: true, requestId: crypto.randomUUID(), signal: action.signal
    });
    if (!searchAction.isCurrent(action)) return;
    window.clearInterval(loadingTimer);
    elements.cheaperResults.replaceChildren();
    const query = response.query || product.name || "";
    elements.cheaperQuery.textContent = query || "Not enough product information";
    elements.cheaperWebSearch.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    elements.cheaperBroadSearch.href = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(response.fallbackQuery || product.name || query)}`;
    const liveMode = response.mode === "live-web";
    elements.cheaperDialogSubtitle.textContent = response.backendConnected && liveMode
      ? "Live web search connected"
      : response.backendConnected
      ? "Local backend connected - safe demo data"
      : "Backend offline - bundled demo fallback";

    const matchPriority = { EXACT_MATCH: 5, HIGH_CONFIDENCE_MATCH: 4 };
    const visibleResults = response.results.filter(result =>
      ["EXACT_MATCH", "HIGH_CONFIDENCE_MATCH"].includes(result.matchType)
    ).sort((a, b) => (matchPriority[b.matchType] || 0) - (matchPriority[a.matchType] || 0) ||
      Number(b.matchConfidence || 0) - Number(a.matchConfidence || 0) || Number(a.price) - Number(b.price));
    const trustedResults = visibleResults;
    const savingsMatch = trustedResults.find(result => ["EXACT_MATCH", "HIGH_CONFIDENCE_MATCH"].includes(result.matchType));
    const hasSavingsHero = renderSavingsHero(savingsMatch, product);
    const accepted = trustedResults.length;
    const cacheLabel = response.cached ? " Loaded from the local cache." : "";
    const sourceLabel = response.backendConnected ? " Local backend connected." : " Offline fallback active.";
    elements.cheaperStatus.textContent = response.outcome === "NO_RESULTS_FROM_PROVIDER"
      ? `No retailer results were returned right now. Your search wasn't used.${cacheLabel}`
      : ["NO_CONFIDENT_MATCH", "INSUFFICIENT_PRODUCT_DATA", "PRICE_NOT_COMPARABLE"].includes(response.outcome)
      ? `Geen betrouwbare match gevonden. COMPR toont liever geen resultaat dan een verkeerd product. Je zoekopdracht is niet gebruikt.${cacheLabel}`
      : response.summary.exact
      ? `${response.summary.exact} exact ${liveMode ? "live" : "demo"} match found. ${accepted} result${accepted === 1 ? "" : "s"} passed the matcher.${sourceLabel}${cacheLabel}`
      : accepted
      ? `${accepted} trusted ${liveMode ? "live" : "demo"} match${accepted === 1 ? "" : "es"}. The strongest matches are shown first.${sourceLabel}${cacheLabel}`
      : `Geen betrouwbare match gevonden. COMPR toont liever geen resultaat dan een verkeerd product.${cacheLabel}`;

    const resultsToRender = hasSavingsHero ? trustedResults.filter(result => result !== savingsMatch) : trustedResults;
    resultsToRender.forEach(result => {
      elements.cheaperResults.appendChild(createCheaperResult(result, product));
    });
  } catch (error) {
    if (!searchAction.isCurrent(action) || error?.name === "AbortError") return;
    window.clearInterval(loadingTimer);
    elements.cheaperResults.replaceChildren();
    const code = String(error?.code || "SEARCH_ERROR");
    const friendlyErrors = {
      AUTH_REQUIRED: ["Sign in to continue", "Sign in to start your free searches."],
      SEARCH_LIMIT_REACHED: ["Free beta limit reached", "You can run up to 5 successful live matches in a rolling 7-day period."],
      RATE_LIMITED: ["Please wait a moment", "You're searching a little too quickly. Try again shortly."],
      SEARCH_PROVIDER_ERROR: ["Search unavailable", "We couldn't complete the search. Try again."],
      NO_CONFIDENT_MATCH: ["Geen betrouwbare match gevonden", "COMPR toont liever geen resultaat dan een verkeerd product. Je zoekopdracht is niet gebruikt."],
      INSUFFICIENT_PRODUCT_DATA: ["Geen betrouwbare match gevonden", "Er is te weinig productinformatie om hetzelfde model en de juiste variant te bewijzen."],
      PRICE_NOT_COMPARABLE: ["Geen betrouwbare match gevonden", "De gevonden prijs is geen duidelijke totale aankoopprijs."],
      NO_RESULTS_FROM_PROVIDER: ["Geen winkelresultaten", "Probeer het later opnieuw. Je zoekopdracht is niet gebruikt."],
      SEARCH_TIMEOUT: ["Zoeken duurde te lang", "Probeer het veilig opnieuw. Je zoekopdracht is niet gebruikt."]
    };
    const friendly = friendlyErrors[code] || ["We couldn't complete the search", "Please try again in a moment."];
    elements.cheaperDialogSubtitle.textContent = friendly[0];
    elements.cheaperStatus.textContent = friendly[1];
    elements.cheaperSignIn.classList.toggle("hidden", code !== "AUTH_REQUIRED");
    if (code === "AUTH_REQUIRED") elements.cheaperSignIn.focus();
    if (["NO_CONFIDENT_MATCH", "NO_RESULTS_FROM_PROVIDER", "INSUFFICIENT_PRODUCT_DATA", "PRICE_NOT_COMPARABLE", "SEARCH_PROVIDER_ERROR", "SEARCH_TIMEOUT"].includes(code)) {
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "demo-result-action";
      retry.textContent = "Opnieuw proberen";
      retry.addEventListener("click", () => handleFindCheaper(product));
      elements.cheaperResults.appendChild(retry);
    }
    if (code === "SEARCH_LIMIT_REACHED" && ComprRuntimeConfig.platform !== "safari") {
      const paywall = document.createElement("section");
      paywall.className = "search-limit-paywall";
      const heading = document.createElement("h3");
      heading.textContent = "Choose how often you want to check";
      const copy = document.createElement("p");
      copy.textContent = "Join free for launch updates. The first 1,000 eligible paid activations receive discounted Founding pricing; joining does not reserve a place.";
      const plans = document.createElement("div");
      for (const plan of [{ id: "pro", name: "COMPR Pro", detail: "15 searches / month" },
        { id: "ultimate", name: "COMPR Ultimate", detail: "Unlimited searches" }]) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = plan.id === "ultimate" ? "is-primary" : "";
        button.innerHTML = `<strong>${plan.name}</strong><span>${plan.detail}</span>`;
        button.addEventListener("click", async () => {
          button.disabled = true;
          try {
            if (ComprRuntimeConfig.betaMode) {
              const url = new URL(ComprRuntimeConfig.betaAccessUrl);
              url.searchParams.set("plan", plan.id);
              await ComprBrowser.tabs.openExternal(url.href);
            } else {
              await openSecureBilling(() => ComprApi.createCheckout(plan.id), "checkout.stripe.com");
            }
          } catch { showToast("Early-access page couldn't be opened. Try again."); }
          finally { button.disabled = false; }
        });
        plans.appendChild(button);
      }
      paywall.append(heading, copy, plans);
      elements.cheaperResults.appendChild(paywall);
    }
  } finally {
    window.clearInterval(loadingTimer);
    searchAction.finish(action);
    setSearchButtonsDisabled(false);
  }
}

function closeCheaperDialog() {
  searchAction.cancel();
  setSearchButtonsDisabled(false);
  if (typeof elements.cheaperDialog.close === "function") {
    elements.cheaperDialog.close();
  } else {
    elements.cheaperDialog.removeAttribute("open");
  }
}

async function handleClearAll() {
  if (!window.confirm("Remove all saved products from COMPR?")) return;
  await ComprStorage.clearSavedProducts();
  allProducts = [];
  populateCategories(allProducts);
  renderProducts();
  showToast("All saved products removed");
  closeDataMenu();
}

function exportProducts() {
  const payload = JSON.stringify({ app: "COMPR", version: 1,
    exportedAt: new Date().toISOString(), products: allProducts }, null, 2);
  const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `compr-products-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  closeDataMenu();
}

async function importProducts(file) {
  if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error("Export too large");
    const payload = JSON.parse(await file.text());
    const imported = Array.isArray(payload) ? payload : payload.products;
    if (!Array.isArray(imported)) throw new Error("Invalid export");
    const usable = imported.slice(0, 5000).filter(product =>
      product && typeof product === "object" && !Array.isArray(product) &&
      ComprProduct.getSafeWebUrl(product.url) && ComprProduct.getProductIdentity(product)
    ).map(product => ({
      ...product,
      url: ComprProduct.getSafeWebUrl(product.url),
      name: String(product.name || "").slice(0, 500),
      brand: String(product.brand || "").slice(0, 100),
      webshop: String(product.webshop || "").slice(0, 255)
    }));
    if (!usable.length && imported.length) throw new Error("No usable products");
    allProducts = await ComprStorage.mergeSavedProducts(usable);
    populateCategories(allProducts);
    renderProducts();
    showToast(`${usable.length} product${usable.length === 1 ? "" : "s"} imported`);
  } catch {
    window.alert("This file is not a valid COMPR product export.");
  } finally {
    elements.importFile.value = "";
    closeDataMenu();
  }
}

elements.clearButton.addEventListener("click", handleClearAll);
elements.cheaperDialogClose.addEventListener("click", closeCheaperDialog);
elements.cheaperSignIn.addEventListener("click", async () => {
  try {
    await ComprBrowser.tabs.create({ url: ComprBrowser.runtime.getURL("popup.html") });
    closeCheaperDialog();
  } catch {
    showToast("Sign-in page couldn't be opened. Try again.");
    elements.cheaperSignIn.focus();
  }
});
elements.cheaperDialog.addEventListener("click", event => {
  if (event.target === elements.cheaperDialog) closeCheaperDialog();
});
elements.exportButton.addEventListener("click", exportProducts);
elements.importButton.addEventListener("click", () => elements.importFile.click());
elements.importFile.addEventListener("change", event => importProducts(event.target.files[0]));
elements.searchInput.addEventListener("input", renderProducts);
elements.categoryFilter.addEventListener("change", renderProducts);
elements.sizeFilter.addEventListener("input", () => {
  ComprBrowser.storage.local.set({ preferredSize: elements.sizeFilter.value.trim() }).catch(() => {});
  renderProducts();
});
elements.sortSelect.addEventListener("change", renderProducts);
elements.groupToggle.addEventListener("change", renderProducts);
elements.availableOnly.addEventListener("change", renderProducts);
elements.countrySelect.addEventListener("change", async () => {
  countryCode = elements.countrySelect.value;
  currencyCode = ComprCurrency.getCurrencyForCountry(countryCode);
  await ComprBrowser.storage.local.set({ countryCode });
  renderProducts();
});

ComprBrowser.storage.local.get(["preferredSize", "countryCode"]).then(async data => {
  elements.sizeFilter.value = String(data.preferredSize || "");
  countryCode = data.countryCode || "NL";
  currencyCode = ComprCurrency.getCurrencyForCountry(countryCode);
  populateCountrySelect();
  exchangeRates = await requestExchangeRates();
  ComprStorage.migrateStorage().then(loadProducts);
  loadOverviewAccount();
}).catch(() => {});
