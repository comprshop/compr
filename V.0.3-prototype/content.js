function getImageFromJsonLd(product) {
  if (!product?.image) {
    return null;
  }

  if (typeof product.image === "string") {
    return product.image;
  }

  if (Array.isArray(product.image)) {
    const firstImage = product.image[0];

    if (typeof firstImage === "string") {
      return firstImage;
    }

    return (
      firstImage?.url ||
      firstImage?.contentUrl ||
      null
    );
  }

  return (
    product.image?.url ||
    product.image?.contentUrl ||
    null
  );
}

function resolvePageAssetUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(String(value).trim(), document.baseURI || window.location.href);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function getProductImage(jsonProduct) {
  const candidates = [
    getImageFromJsonLd(jsonProduct),
    document.querySelector('meta[property="og:image:secure_url"]')?.content,
    document.querySelector('meta[property="og:image"]')?.content,
    document.querySelector('meta[name="twitter:image"], meta[property="twitter:image"]')?.content,
    document.querySelector('[itemprop="image"]')?.content || document.querySelector('[itemprop="image"]')?.src,
    document.querySelector('link[rel="image_src"]')?.href
  ];
  return candidates.map(resolvePageAssetUrl).find(Boolean) || "";
}

function getCanonicalProductUrl() {
  const current = new URL(window.location.href);
  const candidate = document.querySelector('link[rel="canonical"]')?.href;
  const resolved = resolvePageAssetUrl(candidate);
  if (!resolved) return current.href;
  try {
    const canonical = new URL(resolved);
    return canonical.hostname === current.hostname ? canonical.href : current.href;
  } catch {
    return current.href;
  }
}
async function getProductInfo() {
  const eligibility = ComprProductEligibility.assessPage(document, window.location, { getPrice, getProductId, getPriceCurrency, getPriceProvenance, getSelectedSize });
  globalThis.__comprLastEligibilityDiagnostics = eligibility.diagnostics || {reason:eligibility.reason};
  if (!eligibility.eligible) {
    console.info('[COMPR_PRODUCT_DIAGNOSTIC]', globalThis.__comprLastEligibilityDiagnostics);
    return null;
  }
  const jsonProduct = eligibility.jsonProduct;

  const visibleName =
    document.querySelector("h1")?.innerText?.trim() || "";

  const { name, rawTitle } = selectProductTitle({
    jsonLdName: jsonProduct?.name,
    h1: visibleName,
    ogTitle: document.querySelector('meta[property="og:title"]')?.content ||
      document.querySelector('meta[name="twitter:title"]')?.content,
    documentTitle: document.title
  }, window.location.hostname);

  const image = getProductImage(jsonProduct);
  const canonicalUrl = getCanonicalProductUrl();

  const identifiers = getProductId(jsonProduct);
  const category = getCategory(
    jsonProduct,
    visibleName || name
  );
  const apparelCategories = new Set([
    "Hoodies & Sweatshirts",
    "Jackets & Coats",
    "Shoes",
    "Shorts",
    "Pants",
    "Dresses & Skirts",
    "Shirts & Tops",
    "Accessories"
  ]);
  const isApparel = eligibility.isApparel && apparelCategories.has(category);
  const selectedSize = getSelectedSize();
  globalThis.__comprLastEligibilityDiagnostics.selectedSize = selectedSize.status;
  const availability = getAvailability(jsonProduct, isApparel);
  const detectedPrice = getPrice(jsonProduct);
  const storePolicies = getStorePolicies(jsonProduct);
  const discountCodes = await findOfficialDiscountCodes();
  const currentDeals = findCurrentDeals();

  const productInfo = {
    isProductPage: true,
    pageLocale: document.documentElement?.lang || "",
    name,
    rawTitle,

    brand: getBrand(jsonProduct, name) || "",

    color: getColor(jsonProduct, name) || "",

    material: (isApparel ? getMaterial(jsonProduct) : null) || "",

    selectedSize: isApparel ? selectedSize.value : null,
    sizeRequired: isApparel && !/accessories/i.test(category),

    sizes:
      isApparel ? getSizes(jsonProduct) : [],

    availableSizes:
      availability.availableSizes,

    unavailableSizes:
      availability.unavailableSizes,

    availabilityStatus:
      availability.status,

    availabilityCheckedAt:
      availability.checkedAt,

    deliveryTime:
      storePolicies.deliveryTime || "Delivery time not found",

    returnPolicy:
      storePolicies.returnPolicy || "Return policy not found",

    discountCodes,

    currentDeals,

    category,

    price:
      detectedPrice,

    priceProvenance: getPriceProvenance(jsonProduct),

    currency:
      getPriceCurrency(jsonProduct, detectedPrice),

    image,

    sku:
      identifiers?.sku || identifiers?.retailerSku || null,

    mpn:
      identifiers?.mpn || null,

    gtin:
      identifiers?.gtin || null,

    productCode:
      identifiers?.productCode || null,

    identifierType:
      identifiers?.identifierType || null,

    url: canonicalUrl,

    canonicalUrl,

    webshop:
      new URL(canonicalUrl).hostname
  };

  return productInfo;
}

if (typeof ComprBrowser === "undefined" || typeof ComprBrowser.runtime?.onMessage !== "function") {
  throw new Error("COMPR_BROWSER_ADAPTER_REQUIRED");
}
if (!globalThis.__comprProductMessageListenerRegistered) {
  globalThis.__comprProductMessageListenerRegistered = true;
  ComprBrowser.runtime.onMessage(
    (message, sender, sendResponse) => {
      if (sender?.id === ComprBrowser.runtime.id && message?.type === "GET_PRODUCT_INFO") {
        getProductInfo().then(sendResponse);
        return true;
      }
    }
  );
}
