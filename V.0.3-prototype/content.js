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
async function getProductInfo() {
  const eligibility = ComprProductEligibility.assessPage(document, window.location, { getPrice, getProductId });
  if (!eligibility.eligible) return null;
  const jsonProduct = eligibility.jsonProduct;

  const visibleName =
    document.querySelector("h1")?.innerText?.trim() || "";

  const name = chooseBestProductName([
    jsonProduct?.name,
    visibleName,
    document.querySelector('meta[property="og:title"]')?.content,
    document.querySelector('meta[name="twitter:title"]')?.content,
    document.title
  ]);

  const image =
    getImageFromJsonLd(jsonProduct) ||
    document.querySelector(
      'meta[property="og:image"]'
    )?.content ||
    "Afbeelding niet gevonden";

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
  const availability = getAvailability(jsonProduct, isApparel);
  const detectedPrice = getPrice(jsonProduct);
  const storePolicies = getStorePolicies(jsonProduct);
  const discountCodes = await findOfficialDiscountCodes();
  const currentDeals = findCurrentDeals();

  const productInfo = {
    isProductPage: true,
    name,

    brand:
      getBrand(jsonProduct, name) ||
      "Merk niet gevonden",

    color:
      getColor(jsonProduct, name) ||
      "Kleur niet gevonden",

    material:
      (isApparel ? getMaterial(jsonProduct) : null) ||
      "Materiaal niet gevonden",

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

    currency:
      getPriceCurrency(jsonProduct, detectedPrice),

    image,

    sku:
      identifiers?.sku || null,

    mpn:
      identifiers?.mpn || null,

    gtin:
      identifiers?.gtin || null,

    productCode:
      identifiers?.productCode || null,

    url:
      window.location.href,

    webshop:
      window.location.hostname
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
