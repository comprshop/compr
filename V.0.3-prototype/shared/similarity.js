(function (root) {
  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getNameSimilarity(productA, productB) {
    const ignored = new Set(["the", "and", "for", "with", "men", "women", "dames", "heren"]);
    const tokens = product => new Set(
      normalize(product?.name).split(" ")
        .filter(token => token.length > 1 && !ignored.has(token))
    );
    const tokensA = tokens(productA);
    const tokensB = tokens(productB);
    if (!tokensA.size || !tokensB.size) return 0;
    const overlap = [...tokensA].filter(token => tokensB.has(token)).length;
    return overlap / new Set([...tokensA, ...tokensB]).size;
  }

  function getSimilarityScore(productA, productB) {
    if (!productA || !productB || ComprProduct.sameProduct(productA, productB)) return 0;

    const categoryA = normalize(productA.category || "Other");
    const categoryB = normalize(productB.category || "Other");
    const sameCategory = categoryA !== "other" && categoryA === categoryB;
    const sameBrand = normalize(productA.brand) && normalize(productA.brand) === normalize(productB.brand);
    const sameColor = normalize(productA.color) && normalize(productA.color) === normalize(productB.color);
    const nameSimilarity = getNameSimilarity(productA, productB);

    let score = sameCategory ? 0.4 : 0;
    if (sameBrand) score += 0.2;
    if (sameColor) score += 0.15;
    score += nameSimilarity * 0.4;

    return Math.min(score, 1);
  }

  function findSimilarProducts(product, products = []) {
    return products
      .map(candidate => ({
        product: candidate,
        score: getSimilarityScore(product, candidate)
      }))
      .filter(match => match.score >= 0.55)
      .sort((a, b) => b.score - a.score);
  }

  function parseEuroPrice(value) {
    const text = String(value || "");
    if (!text.includes("€")) return null;
    const normalized = text.replace("€", "").replace(/\s/g, "");
    const lastComma = normalized.lastIndexOf(",");
    const lastDot = normalized.lastIndexOf(".");
    let numberText = normalized;

    if (lastComma > lastDot) {
      numberText = normalized.replace(/\./g, "").replace(",", ".");
    } else if (lastDot > lastComma) {
      numberText = normalized.replace(/,/g, "");
    }

    const parsed = Number.parseFloat(numberText.replace(/[^\d.]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  const api = { getNameSimilarity, getSimilarityScore, findSimilarProducts, parseEuroPrice };
  root.ComprSimilarity = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
