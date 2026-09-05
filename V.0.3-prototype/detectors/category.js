function includesAny(text, keywords) {
  const normalizedText = String(text || "").toLowerCase();
  return keywords.some(keyword => {
    const escaped = String(keyword)
      .toLowerCase()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`, "i")
      .test(normalizedText);
  });
}

function getCategory(jsonProduct, productName = "") {
  const structuredCategory =
    String(jsonProduct?.category || "")
      .toLowerCase();

  const strongText = [
    productName,
    document.title,
    document.querySelector(
      'meta[property="og:title"]'
    )?.content
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const fullText = [
    strongText,
    structuredCategory,
    document.querySelector(
      'meta[name="description"]'
    )?.content
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // Samsung phone model names often omit the words "phone" and "smartphone".
  // Keep Galaxy Book laptops and Galaxy Tab tablets out of this shortcut.
  if (/\b(?:samsung\s+)?galaxy\s+(?:a|s|z|m|f)\s?\d{1,3}\b/i.test(strongText)) {
    return "Phones & Tablets";
  }

  // Audio-first brands sometimes omit the generic product type from titles.
  if (/^(?:jbl|bose)\b/i.test(String(productName || "").trim())) {
    return "TV & Audio";
  }

  const categories = [
    {
      name: "Phones & Tablets",
      keywords: [
        "smartphone", "mobile phone", "telefoon", "iphone", "android phone",
        "tablet", "ipad", "galaxy tab", "e-reader", "ereader"
      ]
    },
    {
      name: "Computers",
      keywords: [
        "laptop", "gaming laptop", "notebook", "notebooks", "ultrabook", "chromebook", "macbook",
        "thinkpad", "ideapad", "elitebook", "probook", "pavilion", "latitude",
        "inspiron", "zenbook", "vivobook", "aspire", "surface laptop", "framework laptop",
        "desktop pc", "workstation pc",
        "gaming pc", "computer", "monitor", "keyboard", "toetsenbord",
        "mouse", "muis", "printer", "router", "ssd", "graphics card"
      ]
    },
    {
      name: "TV & Audio",
      keywords: [
        "television", "smart tv", "oled tv", "qled tv", "televisie",
        "soundbar", "speaker", "luidspreker", "headphone", "headphones",
        "headset", "koptelefoon", "koptelefoons", "earbuds", "earphones",
        "oordopjes", "oortjes", "receiver", "subwoofer"
      ]
    },
    {
      name: "Gaming",
      keywords: [
        "playstation", "xbox", "nintendo switch", "game console",
        "gaming console", "controller", "videogame", "video game"
      ]
    },
    {
      name: "Cameras",
      keywords: [
        "camera", "mirrorless", "dslr", "action cam", "action camera",
        "lens", "objectief", "webcam", "camcorder"
      ]
    },
    {
      name: "Wearables",
      keywords: [
        "smartwatch", "smart watch", "fitness tracker", "activity tracker",
        "apple watch", "galaxy watch", "sport watch"
      ]
    },
    {
      name: "Home Appliances",
      keywords: [
        "washing machine", "wasmachine", "dryer", "droger", "dishwasher",
        "vaatwasser", "refrigerator", "fridge", "koelkast", "freezer",
        "vriezer", "vacuum", "stofzuiger", "air fryer", "airfryer",
        "coffee machine", "koffiemachine", "microwave", "magnetron"
      ]
    },
    {
      name: "Electronics Accessories",
      keywords: [
        "phone case", "tablet case", "laptop sleeve", "screen protector",
        "power bank", "powerbank", "charger", "oplader", "charging cable",
        "usb cable", "hdmi cable", "adapter", "docking station"
      ]
    },
    {
      name: "Furniture",
      keywords: [
        "sofa", "couch", "armchair", "recliner", "dining chair", "office chair",
        "stoel", "fauteuil", "bankstel", "bank", "table", "tafel", "desk", "bureau",
        "wardrobe", "kledingkast", "cabinet", "kast", "bookshelf", "boekenkast",
        "bed frame", "single bed", "double bed", "queen bed", "king bed", "box spring",
        "mattress", "matras", "nightstand", "nachtkastje"
      ]
    },
    {
      name: "Home & Decor",
      keywords: [
        "home decor", "woonaccessoire", "lamp", "lighting", "verlichting", "rug", "vloerkleed",
        "curtain", "gordijn", "mirror", "spiegel", "vase", "vaas", "cushion", "kussen",
        "duvet", "dekbed", "bedding", "beddengoed", "wall art", "poster frame"
      ]
    },
    {
      name: "Kitchen & Dining",
      keywords: [
        "cookware", "pan set", "frying pan", "koekenpan", "bestek", "cutlery",
        "dinnerware", "servies", "kitchen knife", "keukenmes", "blender", "mixer",
        "toaster", "waterkoker", "kettle", "food processor"
      ]
    },
    {
      name: "Sports & Fitness",
      keywords: [
        "fitness", "sports equipment", "sport equipment", "dumbbell", "halter", "barbell",
        "yoga mat", "yogamat", "treadmill", "loopband", "exercise bike", "hometrainer",
        "football", "voetbal", "tennis racket", "tennisracket", "bicycle", "fiets"
      ]
    },
    {
      name: "Beauty & Personal Care",
      keywords: [
        "skincare", "skin care", "huidverzorging", "moisturizer", "serum", "makeup", "make-up",
        "foundation", "mascara", "lipstick", "parfum", "perfume", "shampoo", "hair dryer",
        "föhn", "electric toothbrush", "elektrische tandenborstel", "razor", "scheerapparaat"
      ]
    },
    {
      name: "Toys & Games",
      keywords: [
        "toy", "toys", "speelgoed", "board game", "bordspel", "puzzle", "pop", "doll",
        "building blocks", "bouwstenen", "remote control car", "knuffel", "plush"
      ]
    },
    {
      name: "Books & Media",
      keywords: [
        "book", "books", "boek", "boeken", "paperback", "hardcover", "novel", "roman",
        "textbook", "studieboek", "blu-ray", "blu ray", "vinyl record", "lp record"
      ]
    },
    {
      name: "Tools & DIY",
      keywords: [
        "power tool", "gereedschap", "drill", "boormachine", "screwdriver", "schroevendraaier",
        "circular saw", "cirkelzaag", "sander", "schuurmachine", "toolbox", "gereedschapskist",
        "workbench", "werkbank", "ladder"
      ]
    },
    {
      name: "Garden & Outdoor",
      keywords: [
        "garden furniture", "tuinmeubel", "garden chair", "tuinstoel", "barbecue", "bbq",
        "lawn mower", "grasmaaier", "hedge trimmer", "heggenschaar", "plant pot", "bloempot",
        "parasol", "outdoor heater", "terrasverwarmer", "tent", "camping"
      ]
    },
    {
      name: "Automotive",
      keywords: [
        "car accessory", "auto accessoire", "dashcam", "car seat cover", "autostoelhoes",
        "roof box", "dakkoffer", "motor oil", "motorolie", "car battery", "autoaccu",
        "tyre", "tire", "autoband", "jump starter"
      ]
    },
    {
      name: "Baby & Kids",
      keywords: [
        "baby", "stroller", "kinderwagen", "car seat", "autostoel", "high chair", "kinderstoel",
        "crib", "cot bed", "babybed", "baby monitor", "babyfoon", "diaper", "luier"
      ]
    },
    {
      name: "Pet Supplies",
      keywords: [
        "pet supplies", "huisdier", "dog food", "hondenvoer", "cat food", "kattenvoer",
        "dog bed", "hondenmand", "cat tree", "krabpaal", "aquarium", "pet carrier"
      ]
    },
    {
      name: "Jewelry & Watches",
      keywords: [
        "jewelry", "jewellery", "sieraad", "necklace", "ketting", "bracelet", "armband",
        "earrings", "oorbellen", "ring", "horloge", "wristwatch"
      ]
    },
    {
      name: "Office & Stationery",
      keywords: [
        "office supplies", "kantoorartikelen", "notebook", "notitieboek", "planner", "pen set",
        "printer paper", "kopieerpapier", "desk organizer", "bureau organizer", "stapler", "nietmachine"
      ]
    },
    {
      name: "Hoodies & Sweatshirts",
      keywords: [
        "hoodie",
        "hooded",
        "sweatshirt",
        "crewneck",
        "crew neck",
        "fleece",
        "sweater",
        "pullover",
        "trui"
      ]
    },
    {
      name: "Jackets & Coats",
      keywords: [
        "jacket",
        "coat",
        "parka",
        "puffer",
        "windbreaker",
        "bomber",
        "gilet",
        "bodywarmer",
        "jas"
      ]
    },
    {
      name: "Shoes",
      keywords: [
        "shoe",
        "shoes",
        "sneaker",
        "sneakers",
        "trainer",
        "trainers",
        "footwear",
        "boot",
        "boots",
        "loafer",
        "sandal",
        "schoen",
        "schoenen",
        "sportschoen"
      ]
    },
    {
      name: "Shorts",
      keywords: [
        "shorts",
        "short",
        "korte broek"
      ]
    },
    {
      name: "Pants",
      keywords: [
        "pants",
        "trousers",
        "jeans",
        "joggers",
        "leggings",
        "cargo pants",
        "track pants",
        "sweatpants",
        "broek"
      ]
    },
    {
      name: "Dresses & Skirts",
      keywords: [
        "dress",
        "dresses",
        "skirt",
        "skirts",
        "jurk",
        "rok"
      ]
    },
    {
      name: "Shirts & Tops",
      keywords: [
        "t-shirt",
        "t shirt",
        "tee",
        "shirt",
        "shirts",
        "polo",
        "top",
        "tops",
        "blouse",
        "overhemd"
      ]
    },
    {
      name: "Accessories",
      keywords: [
        "cap",
        "hat",
        "beanie",
        "bag",
        "backpack",
        "belt",
        "scarf",
        "sunglasses",
        "wallet",
        "pet",
        "tas",
        "riem"
      ]
    },
    {
      name: "Electronics",
      keywords: [
        "electronics", "electronic", "elektronica", "bluetooth", "wifi",
        "wireless", "usb-c", "usb c"
      ]
    }
  ];

  // Eerst de duidelijke productnaam/title gebruiken.
  for (const category of categories) {
    if (
      includesAny(
        strongText,
        category.keywords
      )
    ) {
      return category.name;
    }
  }

  // Daarna pas bredere webshopdata gebruiken.
  for (const category of categories) {
    if (
      includesAny(
        fullText,
        category.keywords
      )
    ) {
      return category.name;
    }
  }

  return "Other";
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getCategory };
}
