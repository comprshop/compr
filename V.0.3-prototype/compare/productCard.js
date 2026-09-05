function cleanColor(colorText) {
  if (
    !colorText ||
    colorText === "Kleur niet gevonden"
  ) {
    return "Not found";
  }

  return String(colorText)
    .replace(/^Weergegeven kleur:\s*/i, "")
    .trim();
}

function cleanShop(hostname) {
  if (!hostname) {
    return "Unknown";
  }

  return String(hostname)
    .replace(/^www\./i, "")
    .replace(/^m\./i, "");
}

function createDetailRow(label, value) {
  const row =
    document.createElement("div");

  row.className = "detail-row";

  const labelElement =
    document.createElement("span");

  labelElement.className =
    "detail-label";

  labelElement.textContent = label;

  const valueElement =
    document.createElement("span");

  valueElement.className =
    "detail-value";

  valueElement.textContent =
    value || "Not found";

  row.append(
    labelElement,
    valueElement
  );

  return row;
}

function createDetailsSection(title) {
  const section = document.createElement("details");
  section.className = "details-section";
  const summary = document.createElement("summary");
  summary.textContent = title;
  const body = document.createElement("div");
  body.className = "details-section-body";
  section.append(summary, body);
  return { section, summary, body };
}

function couponCopy(value) {
  return globalThis.ComprI18n?.translate(value) || value;
}

function getCouponSaving(promotion) {
  const text = String(promotion?.description || "").replace(/\s+/g, " ");
  const percent = text.match(/\b(\d{1,2})\s*%/);
  if (percent) return `${percent[1]}% ${couponCopy("off")}`;
  const euro = text.match(/€\s?(\d+(?:[.,]\d{1,2})?)/i);
  if (euro) return `€${euro[1].replace(",", ".")} ${couponCopy("off")}`;
  const amount = text.match(/([$£])\s?(\d+(?:[.,]\d{1,2})?)/);
  if (amount) return `${amount[1]}${amount[2]} ${couponCopy("off")}`;
  if (/\b(free shipping|free delivery|gratis verzending|gratis bezorging)\b/i.test(text)) return couponCopy("Free delivery");
  return couponCopy("Possible discount code");
}

function getDealCopy(deal) {
  const text = String(deal?.description || "");
  const percent = text.match(/\b(\d{1,2})\s*%/);
  if (percent) return `${percent[1]}% ${couponCopy("off selected items")}`;
  if (/\b(free shipping|free delivery|gratis verzending|gratis bezorging)\b/i.test(text)) return couponCopy("Free delivery");
  return couponCopy("Store discount available");
}

function createDiscountCodeCard(promotion) {
  const card = document.createElement("article");
  card.className = `coupon-card ${promotion.verification === "verified" ? "official" : "unverified"}`;

  const top = document.createElement("div");
  top.className = "coupon-card-top";
  const status = document.createElement("span");
  status.className = "coupon-status";
  status.textContent = promotion.verification === "verified" ? couponCopy("Verified") : couponCopy("Code found");
  const source = document.createElement("span");
  source.className = "coupon-source";
  try { source.textContent = new URL(promotion.source).hostname.replace(/^www\./, ""); }
  catch { source.textContent = ""; }
  top.append(status, source);

  const codeLine = document.createElement("div");
  codeLine.className = "coupon-code-line";
  const code = document.createElement("strong");
  code.textContent = promotion.code;
  const copy = document.createElement("button");
  copy.type = "button";
  copy.textContent = couponCopy("Copy code");
  copy.addEventListener("click", async () => {
    await navigator.clipboard.writeText(promotion.code);
    copy.textContent = couponCopy("Copied");
    window.setTimeout(() => { copy.textContent = couponCopy("Copy code"); }, 1600);
  });
  codeLine.append(code, copy);

  const description = document.createElement("p");
  description.textContent = getCouponSaving(promotion);
  card.append(top, codeLine, description);
  return card;
}

function formatAvailabilityAge(timestamp) {
  if (!timestamp) return "Not checked yet";
  const minutes = Math.max(0, Math.floor((Date.now() - Number(timestamp)) / 60000));
  if (minutes < 1) return "Checked just now";
  if (minutes < 60) return `Checked ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Checked ${hours}h ago`;
  return `Checked ${Math.floor(hours / 24)}d ago`;
}

function getAvailabilityLabel(product) {
  const sizes = Array.isArray(product.availableSizes) ? product.availableSizes : [];
  if (sizes.length) return `${sizes.length} sizes available`;
  return ({
    in_stock: "In stock",
    preorder: "Pre-order",
    out_of_stock: "Out of stock",
    unknown: "Availability unknown"
  })[product.availabilityStatus] || "Availability unknown";
}

function isTechCategory(category) {
  return [
    "Phones & Tablets", "Computers", "TV & Audio", "Gaming", "Cameras",
    "Wearables", "Home Appliances", "Electronics Accessories"
  ].includes(category);
}

function createProductCard(
  product,
  priceInfo,
  onRemove,
  onFindCheaper
) {
  const category =
    product.category || "Other";

  const productPrice =
    Number.isFinite(product.convertedAmount)
      ? product.convertedAmount
      : parsePrice(product.price);

  const categoryInfo =
    priceInfo[category];

  const canCompare =
    categoryInfo?.count >= 2;

  const cheapestPrice =
    canCompare
      ? categoryInfo.cheapest
      : null;

  const isCheapest =
    canCompare &&
    productPrice !== null &&
    productPrice === cheapestPrice;

  const card =
    document.createElement("article");

  card.className = "product-card";

  if (isCheapest) {
    card.classList.add("cheapest");
  }


  // BADGE

  const badgeSlot =
    document.createElement("div");

  badgeSlot.className = "badge-slot";

  if (isCheapest) {
    const badge =
      document.createElement("div");

    badge.className =
      "cheapest-badge";

    badge.textContent = "CHEAPEST";

    badgeSlot.appendChild(badge);
  }

  const availabilityBadge = document.createElement("div");
  availabilityBadge.className = `availability-badge ${product.availabilityStatus || "unknown"}`;
  availabilityBadge.textContent = getAvailabilityLabel(product);
  badgeSlot.appendChild(availabilityBadge);


  // IMAGE

  const imageWrapper =
    document.createElement("div");

  imageWrapper.className =
    "product-image-wrapper";

  const image =
    document.createElement("img");

  image.className = "product-image";
  image.alt = product.name || "Product";

  if (
    product.image &&
    product.image !== "Afbeelding niet gevonden"
  ) {
    image.src = product.image;
    image.addEventListener("error", () => {
      image.hidden = true;
      imageWrapper.classList.add("missing-image");
      imageWrapper.setAttribute("aria-label", "Image not available");
    }, { once: true });
  } else {
    image.hidden = true;
    imageWrapper.classList.add("missing-image");
    imageWrapper.setAttribute("aria-label", "Image not available");
  }

  imageWrapper.appendChild(image);


  // PRODUCT INFO

  const brand =
    document.createElement("p");

  brand.className = "product-brand";

  brand.textContent =
    product.brand &&
    product.brand !== "Merk niet gevonden"
      ? product.brand
      : "Unknown brand";

  const name =
    document.createElement("h2");

  name.className = "product-name";

  name.textContent =
    product.name ||
    "Product name not found";

  const price =
    document.createElement("p");

  price.className = "product-price";

  price.textContent =
    product.convertedPrice ||
    product.price ||
    "Price not found";

  const originalPrice = document.createElement("p");
  originalPrice.className = "original-price";
  if (product.convertedPrice && product.convertedCurrency !== product.sourceCurrency) {
    originalPrice.textContent = `Original: ${product.price}`;
  } else {
    originalPrice.hidden = true;
  }


  // PRICE DIFFERENCE

  const differenceText =
    document.createElement("p");

  differenceText.className =
    "price-difference";

  if (!canCompare) {
    differenceText.textContent =
      "Add another saved product in this category to compare prices";
  } else if (isCheapest) {
    differenceText.textContent =
      "Lowest price among your saved products in this category";
  } else if (
    productPrice !== null &&
    cheapestPrice !== null
  ) {
    const difference =
      productPrice - cheapestPrice;

    if (difference > 0) {
      differenceText.textContent =
        `${ComprCurrency.format(
          difference,
          product.convertedCurrency || "EUR",
          product.displayCountry || "NL"
        )} above your lowest saved ${category.toLowerCase()} price`;
    }
  }


  // DETAILS

  const productDetails = createDetailsSection("Product details");
  const details = productDetails.body;
  details.classList.add("product-details");
  const policyDetails = createDetailsSection("Delivery & returns");
  const discountDetails = createDetailsSection("Discount codes");
  const dealsDetails = createDetailsSection("Current deals");

  details.appendChild(
    createDetailRow(
      "Category",
      category
    )
  );

  if (!isTechCategory(category)) {
    details.appendChild(
      createDetailRow(
        "Color",
        cleanColor(product.color)
      )
    );
  }

  details.appendChild(
    createDetailRow(
      "Shop",
      cleanShop(product.webshop)
    )
  );

  policyDetails.body.appendChild(
    createDetailRow(
      "Delivery time",
      product.deliveryTime && product.deliveryTime !== "Delivery time not found"
        ? product.deliveryTime
        : "Not found"
    )
  );

  const discountCodes = Array.isArray(product.discountCodes) ? product.discountCodes : [];
  if (discountCodes.length) {
    const available = document.createElement("p");
    available.className = "section-supporting-copy";
    available.textContent = discountCodes.length === 1
      ? couponCopy("1 code available")
      : couponCopy("{count} codes available").replace("{count}", discountCodes.length);
    discountDetails.body.appendChild(available);
    for (const promotion of discountCodes) {
      discountDetails.body.appendChild(createDiscountCodeCard(promotion));
    }
  } else {
    const emptyTitle = document.createElement("strong");
    emptyTitle.className = "coupon-empty-title";
    emptyTitle.textContent = couponCopy("No verified discount codes found");
    const emptyCopy = document.createElement("p");
    emptyCopy.className = "section-supporting-copy";
    emptyCopy.textContent = couponCopy("We couldn't confirm an active code for this product.");
    discountDetails.body.append(emptyTitle, emptyCopy);
  }

  const currentDeals = Array.isArray(product.currentDeals) ? product.currentDeals : [];
  for (const deal of currentDeals) {
    const item = document.createElement("article");
    item.className = "deal-card";
    const description = document.createElement("strong");
    description.textContent = getDealCopy(deal);
    const note = document.createElement("span");
    note.textContent = couponCopy("No code required");
    item.append(description, note);
    dealsDetails.body.appendChild(item);
  }

  policyDetails.body.appendChild(
    createDetailRow(
      "Return policy",
      product.returnPolicy && product.returnPolicy !== "Return policy not found"
        ? product.returnPolicy
        : "Not found"
    )
  );

  if (
    product.material &&
    product.material !==
      "Materiaal niet gevonden"
  ) {
    details.appendChild(
      createDetailRow(
        "Material",
        product.material
      )
    );
  }

  if (
    Array.isArray(product.availableSizes) &&
    product.availableSizes.length > 0
  ) {
    details.appendChild(
      createDetailRow(
        "Available sizes",
        product.availableSizes.join(", ")
      )
    );
  }

  if (
    Array.isArray(product.unavailableSizes) &&
    product.unavailableSizes.length > 0
  ) {
    details.appendChild(
      createDetailRow(
        "Unavailable sizes",
        product.unavailableSizes.join(", ")
      )
    );
  }

  details.appendChild(
    createDetailRow(
      "Availability",
      `${getAvailabilityLabel(product)} · ${formatAvailabilityAge(product.availabilityCheckedAt)}`
    )
  );


  // BUTTONS

  const actions =
    document.createElement("div");

  actions.className = "actions";

  const findCheaperButton = document.createElement("button");
  findCheaperButton.className = "find-cheaper-button";
  findCheaperButton.type = "button";
  findCheaperButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="m16 16 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span>Find This Cheaper</span>';
  findCheaperButton.addEventListener("click", () => onFindCheaper(product));

  const viewButton =
    document.createElement("a");

  viewButton.className =
    "view-button";

  const safeProductUrl = ComprProduct.getSafeWebUrl(product.url);
  viewButton.href = safeProductUrl || "#";

  viewButton.target = "_blank";
  viewButton.rel = "noopener noreferrer";

  viewButton.textContent = "View product";

  if (!safeProductUrl) {
    viewButton.removeAttribute("href");
    viewButton.classList.add("is-disabled");
    viewButton.setAttribute("aria-disabled", "true");
  }

  const removeButton =
    document.createElement("button");

  removeButton.className =
    "remove-button";

  removeButton.type = "button";
  removeButton.textContent = "Remove";

  removeButton.addEventListener(
    "click",
    () => onRemove(
      ComprProduct.getProductIdentity(product)
    )
  );

  const reviewsUrl = ComprProduct.getTrustpilotUrl(product);
  const reviewsLink = document.createElement("a");
  reviewsLink.className = "reviews-link";
  reviewsLink.href = reviewsUrl || "#";
  reviewsLink.target = "_blank";
  reviewsLink.rel = "noopener noreferrer";
  reviewsLink.textContent = `Store reviews · ${cleanShop(product.webshop)}`;

  if (!reviewsUrl) {
    reviewsLink.hidden = true;
  }

  actions.append(
    findCheaperButton,
    viewButton,
    removeButton
  );


  // COMPLETE CARD

  card.append(
    badgeSlot,
    imageWrapper,
    brand,
    name,
    price,
    originalPrice,
    differenceText,
    actions,
    productDetails.section,
    policyDetails.section,
    discountDetails.section,
    ...(currentDeals.length ? [dealsDetails.section] : []),
    reviewsLink
  );

  return card;
}
