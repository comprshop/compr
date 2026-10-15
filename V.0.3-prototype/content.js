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

function getProductRecognitionDiagnostics() {
  const MAX_STRUCTURE_DEPTH = 6;
  const MAX_STRUCTURE_PATHS = 96;
  const MAX_ARRAY_ITEMS = 4;
  const typeList = value => (Array.isArray(value) ? value : [value]).map(item => String(item || "").split(/[\/#]/).pop()).filter(Boolean).slice(0, 6);
  const values = value => (Array.isArray(value) ? value : [value]).filter(Boolean);
  const safeProperty = value => /^[A-Za-z@][A-Za-z0-9_:@.-]{0,47}$/.test(String(value || "")) ? String(value) : "[property]";
  const structurePaths = roots => {
    const idCounts = new Map();
    const idSeen = new WeakSet();
    const collectIds = (value, depth = 0) => {
      if (!value || typeof value !== "object" || depth > MAX_STRUCTURE_DEPTH + 2 || idSeen.has(value)) return;
      idSeen.add(value);
      if (!Array.isArray(value) && typeof value["@id"] === "string") idCounts.set(value["@id"], (idCounts.get(value["@id"]) || 0) + 1);
      if (Array.isArray(value)) value.slice(0, MAX_ARRAY_ITEMS).forEach(item => collectIds(item, depth + 1));
      else Object.values(value).forEach(item => collectIds(item, depth + 1));
    };
    roots.forEach(root => collectIds(root));

    const paths = [];
    const seen = new WeakSet();
    const add = entry => { if (paths.length < MAX_STRUCTURE_PATHS) paths.push(entry); };
    const visit = (value, path, depth) => {
      if (paths.length >= MAX_STRUCTURE_PATHS || depth > MAX_STRUCTURE_DEPTH) return;
      if (Array.isArray(value)) {
        add({ path, depth, kind:"array" });
        for (const item of value.slice(0, MAX_ARRAY_ITEMS)) visit(item, `${path}[]`, depth + 1);
        return;
      }
      if (!value || typeof value !== "object") {
        add({ path, depth, kind:value === null ? "null" : typeof value });
        return;
      }
      if (seen.has(value)) { add({ path, depth, kind:"object", cycle:true }); return; }
      seen.add(value);
      const keys = Object.keys(value);
      const id = typeof value["@id"] === "string" ? value["@id"] : "";
      const referenceOnly = Boolean(id) && keys.every(key => key === "@id" || key === "@type");
      const entry = { path, depth, kind:"object", schemaTypes:typeList(value["@type"]), hasId:Boolean(id) };
      if (id) entry.referenceStatus = referenceOnly ? ((idCounts.get(id) || 0) > 1 ? "resolved" : "unresolved") : "definition";
      add(entry);
      if (depth === MAX_STRUCTURE_DEPTH) return;
      for (const key of keys) {
        if (key === "@context" || key === "@type" || key === "@id") continue;
        visit(value[key], `${path}.${safeProperty(key)}`, depth + 1);
        if (paths.length >= MAX_STRUCTURE_PATHS) break;
      }
    };
    roots.forEach((root, index) => {
      const rootType = typeList(root?.["@type"])[0] || "Root";
      visit(root, roots.length === 1 ? rootType : `${rootType}[${index}]`, 0);
    });
    return { paths, truncated:paths.length >= MAX_STRUCTURE_PATHS };
  };
  const urlRelation = value => {
    if (!value) return "missing";
    try {
      const candidate = new URL(String(value), window.location.href);
      const current = new URL(window.location.href);
      if (candidate.hostname !== current.hostname) return "other_host";
      return candidate.pathname.replace(/\/$/, "") === current.pathname.replace(/\/$/, "") ? "current_path" : "other_path";
    } catch { return "invalid"; }
  };
  const blocks = [];
  for (const script of [...document.querySelectorAll('script[type="application/ld+json"]')].slice(0, 8)) {
    try {
      const parsed = JSON.parse(script.textContent || "null");
      const roots = Array.isArray(parsed) ? parsed : [parsed];
      const nestedStructure = structurePaths(roots);
      const graph = roots.flatMap(root => Array.isArray(root?.["@graph"]) ? root["@graph"] : []);
      const nodes = [...roots, ...graph].filter(node => node && typeof node === "object");
      const ids = new Set(nodes.map(node => node["@id"]).filter(Boolean));
      const refs = [];
      const scanRefs = value => {
        for (const item of values(value)) if (item && typeof item === "object" && item["@id"] && Object.keys(item).length === 1) refs.push(item["@id"]);
      };
      nodes.forEach(node => { scanRefs(node.hasVariant); scanRefs(node.offers); scanRefs(node.mainEntity); scanRefs(node.object); });
      const groups = nodes.filter(node => typeList(node["@type"]).map(x => x.toLowerCase()).includes("productgroup")).slice(0, 4).map(group => ({
        hasId:Boolean(group["@id"]),productGroupId:Boolean(group.productGroupID),variesBy:values(group.variesBy).length,
        url:urlRelation(group.url),hasVariantCount:values(group.hasVariant).length,
        hasVariantRefs:values(group.hasVariant).filter(item => item?.["@id"] && Object.keys(item).length === 1).length,
        offerCount:values(group.offers).length,offerRefs:values(group.offers).filter(item => item?.["@id"] && Object.keys(item).length === 1).length
      }));
      blocks.push({rootTypes:[...new Set(roots.flatMap(root => typeList(root?.["@type"])))],graphNodes:graph.length,
        graphTypes:[...new Set(graph.flatMap(node => typeList(node?.["@type"])))].slice(0,10),groups,
        productNodes:nodes.filter(node => typeList(node["@type"]).map(x => x.toLowerCase()).includes("product")).length,
        offerNodes:nodes.filter(node => typeList(node["@type"]).map(x => x.toLowerCase()).some(x => x === "offer" || x === "aggregateoffer")).length,
        referenceCount:refs.length,resolvedReferences:refs.filter(id => ids.has(id)).length,unresolvedReferences:refs.filter(id => !ids.has(id)).length,
        nestedPaths:nestedStructure.paths,nestedPathsTruncated:nestedStructure.truncated});
    } catch { blocks.push({parseError:true}); }
  }
  return {version:2,bounds:{maxDepth:MAX_STRUCTURE_DEPTH,maxPathsPerBlock:MAX_STRUCTURE_PATHS,maxArrayItems:MAX_ARRAY_ITEMS},
    blockCount:document.querySelectorAll('script[type="application/ld+json"]').length,blocks};
}
async function getProductInfo() {
  const eligibility = ComprProductEligibility.assessPage(document, window.location, { getPrice, getProductId, getPriceCurrency, getPriceProvenance, getSelectedSize });
  globalThis.__comprLastEligibilityDiagnostics = eligibility.diagnostics || {reason:eligibility.reason};
  if (!eligibility.eligible) {
    if (globalThis.__comprDiagnosticsEnabled === true) {
      console.info('[COMPR_PRODUCT_DIAGNOSTIC]', globalThis.__comprLastEligibilityDiagnostics);
    }
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
  const selectedSize = getSelectedSize(jsonProduct);
  globalThis.__comprLastEligibilityDiagnostics.selectedSize = selectedSize.status;
  globalThis.__comprLastEligibilityDiagnostics.selectedSizeEvidence = selectedSize.evidence || 'none';
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
    selectedVariants: isApparel && selectedSize.value ? {
      size:{value:selectedSize.value,evidence:selectedSize.evidence || 'dom_selected_control'}
    } : {},
    selectedVariantDiagnostics:{size:{status:selectedSize.status,evidence:selectedSize.evidence || null}},
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

    identifiers:
      identifiers?.identifiers || [],

    retailerProductId:
      identifiers?.unknownCode || null,

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
