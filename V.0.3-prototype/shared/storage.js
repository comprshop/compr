(function (root) {
  const STORAGE_KEY = "savedProducts";
  const LEGACY_STORAGE_KEY = "products";
  const MAX_SAVED_PRODUCTS = 500;
  let localMutationQueue = Promise.resolve();

  function withStorageLock(callback) {
    if (globalThis.navigator?.locks?.request) {
      return globalThis.navigator.locks.request("compr-saved-products", callback);
    }
    const operation = localMutationQueue.then(callback, callback);
    localMutationQueue = operation.catch(() => {});
    return operation;
  }

  function getLocalStorage() {
    return ComprBrowser.storage.local;
  }

  function read(keys) {
    return new Promise((resolve, reject) => {
      getLocalStorage().get(keys).then(resolve, () => reject(new Error("STORAGE_READ_FAILED")));
    });
  }

  function write(values) {
    return new Promise((resolve, reject) => {
      getLocalStorage().set(values).then(resolve, () => reject(new Error("STORAGE_WRITE_FAILED")));
    });
  }

  function remove(key) {
    return new Promise((resolve, reject) => {
      getLocalStorage().remove(key).then(resolve, () => reject(new Error("STORAGE_REMOVE_FAILED")));
    });
  }

  async function migrateStorage() {
    const data = await read([STORAGE_KEY, LEGACY_STORAGE_KEY]);
    const saved = Array.isArray(data[STORAGE_KEY])
      ? data[STORAGE_KEY]
      : [];
    const legacy = Array.isArray(data[LEGACY_STORAGE_KEY])
      ? data[LEGACY_STORAGE_KEY]
      : [];

    if (!legacy.length) return saved;

    const products = ComprProduct.deduplicateProducts([
      ...saved,
      ...legacy
    ]);

    await write({ [STORAGE_KEY]: products });
    await remove(LEGACY_STORAGE_KEY);
    return products;
  }

  async function getSavedProducts() {
    const data = await read([STORAGE_KEY]);
    return sanitizeProducts(data[STORAGE_KEY]);
  }

  function sanitizeProducts(value) {
    if (!Array.isArray(value)) return [];
    return value.filter(product =>
      product && typeof product === "object" && !Array.isArray(product) &&
      String(product.name || "").trim() && ComprProduct.getSafeWebUrl(product.url) &&
      ComprProduct.getProductIdentity(product)
    ).slice(0, MAX_SAVED_PRODUCTS).map(product => ({ ...product,
      name: String(product.name).slice(0, 500), brand: String(product.brand || "").slice(0, 100),
      url: ComprProduct.getSafeWebUrl(product.url), image: ComprProduct.getSafeWebUrl(product.image)
    }));
  }

  async function setSavedProducts(products) {
    const unique = ComprProduct.deduplicateProducts(sanitizeProducts(products)).slice(0, MAX_SAVED_PRODUCTS);
    await write({ [STORAGE_KEY]: unique });
    return unique;
  }

  async function mergeSavedProducts(products) {
    return withStorageLock(async () => {
      const current = await getSavedProducts();
      return setSavedProducts([...current, ...products]);
    });
  }

  async function saveProduct(product) {
    return withStorageLock(async () => {
      const products = await getSavedProducts();
      if (products.some(saved => ComprProduct.sameProduct(saved, product))) return products;
      return setSavedProducts([...products, { ...product, savedAt: product.savedAt || Date.now() }]);
    });
  }

  async function updateSavedProduct(product) {
    return withStorageLock(async () => {
      const products = await getSavedProducts();
      let updated = false;
      const next = products.map(saved => {
        if (!ComprProduct.sameProduct(saved, product)) return saved;
        updated = true;
        return { ...saved, ...product, savedAt: saved.savedAt || product.savedAt || Date.now() };
      });
      return updated ? setSavedProducts(next) : products;
    });
  }

  async function removeSavedProduct(productOrIdentity) {
    return withStorageLock(async () => {
      const products = await getSavedProducts();
      return setSavedProducts(products.filter(product => {
        if (typeof productOrIdentity === "string") return ComprProduct.getProductIdentity(product) !== productOrIdentity;
        return !ComprProduct.sameProduct(product, productOrIdentity);
      }));
    });
  }

  async function clearSavedProducts() {
    return withStorageLock(() => write({ [STORAGE_KEY]: [] }));
  }

  const api = {
    migrateStorage,
    getSavedProducts,
    setSavedProducts,
    mergeSavedProducts,
    saveProduct,
    updateSavedProduct,
    removeSavedProduct,
    clearSavedProducts,
    sanitizeProducts
  };
  root.ComprStorage = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
