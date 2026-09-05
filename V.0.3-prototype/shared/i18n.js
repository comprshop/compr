(function(root){
  const LANGUAGES=[
    {code:"en",label:"EN"},{code:"nl",label:"NL"},{code:"de",label:"DE"},{code:"fr",label:"FR"}
  ];
  const copy={
    "SAVE MONEY WITH COMPR":{nl:"BESPAAR MET COMPR",de:"MIT COMPR SPAREN",fr:"ÉCONOMISEZ AVEC COMPR"},
    "COMPR'S SMART PRICE CHECK":{nl:"COMPR'S SLIMME PRIJSCHECK",de:"COMPRS SMARTER PREISCHECK",fr:"LE CONTRÔLE DE PRIX COMPR"},
    "Search for the exact same product at a better price.":{nl:"Zoek exact hetzelfde product voor een betere prijs.",de:"Finde exakt dasselbe Produkt zu einem besseren Preis.",fr:"Trouvez exactement le même produit à un meilleur prix."},
    "FIND THIS CHEAPER":{nl:"VIND DIT GOEDKOPER",de:"GÜNSTIGER FINDEN",fr:"TROUVER MOINS CHER"},
    "Checking this product…":{nl:"Product controleren…",de:"Produkt wird geprüft…",fr:"Vérification du produit…"},
    "Compare products":{nl:"Producten vergelijken",de:"Produkte vergleichen",fr:"Comparer les produits"},
    "See prices clearly, spot important differences and find a better deal.":{nl:"Bekijk prijzen duidelijk, zie belangrijke verschillen en vind een betere deal.",de:"Preise klar vergleichen, Unterschiede erkennen und besser kaufen.",fr:"Comparez clairement les prix et trouvez une meilleure offre."},
    "lowest price":{nl:"laagste prijs",de:"niedrigster Preis",fr:"prix le plus bas"},
    "potential difference":{nl:"mogelijk verschil",de:"möglicher Unterschied",fr:"différence potentielle"},
    "Search details":{nl:"Zoekdetails",de:"Suchdetails",fr:"Détails de recherche"},
    "COMPR PRICE CHECK":{nl:"COMPR PRIJSCHECK",de:"COMPR PREISCHECK",fr:"CONTRÔLE DE PRIX COMPR"},
    "Shop smarter.":{nl:"Winkel slimmer.",de:"Cleverer einkaufen.",fr:"Achetez plus malin."},
    "Country":{nl:"Land",de:"Land",fr:"Pays"},
    "Your country":{nl:"Jouw land",de:"Dein Land",fr:"Votre pays"},
    "Language":{nl:"Taal",de:"Sprache",fr:"Langue"},
    "YOUR SMART SHOPPING LIST":{nl:"JOUW SLIMME SHOPLIJST",de:"DEINE SMARTE EINKAUFSLISTE",fr:"VOTRE LISTE D’ACHATS MALIGNE"},
    "Start your shortlist":{nl:"Begin je shortlist",de:"Starte deine Auswahl",fr:"Commencez votre sélection"},
    "Save products before you decide.":{nl:"Bewaar producten voordat je kiest.",de:"Speichere Produkte, bevor du dich entscheidest.",fr:"Enregistrez les produits avant de choisir."},
    "Detecting product...":{nl:"Product herkennen...",de:"Produkt wird erkannt...",fr:"Détection du produit..."},
    "PRODUCT DETECTED":{nl:"PRODUCT HERKEND",de:"PRODUKT ERKANNT",fr:"PRODUIT DÉTECTÉ"},
    "+ SAVE & COMPARE":{nl:"+ BEWAREN & VERGELIJKEN",de:"+ SPEICHERN & VERGLEICHEN",fr:"+ ENREGISTRER & COMPARER"},
    "✓ SAVED — REMOVE":{nl:"✓ BEWAARD — VERWIJDEREN",de:"✓ GESPEICHERT — ENTFERNEN",fr:"✓ ENREGISTRÉ — SUPPRIMER"},
    "COMPARE BEFORE YOU BUY":{nl:"VERGELIJK VOORDAT JE KOOPT",de:"VERGLEICHE VOR DEM KAUF",fr:"COMPAREZ AVANT D’ACHETER"},
    "Compare your saved options before you decide.":{nl:"Vergelijk je opgeslagen opties voordat je kiest.",de:"Vergleiche deine gespeicherten Optionen vor der Entscheidung.",fr:"Comparez vos options enregistrées avant de choisir."},
    "COMPARE NOW":{nl:"NU VERGELIJKEN",de:"JETZT VERGLEICHEN",fr:"COMPARER"},
    "Find This Cheaper":{nl:"Vind dit goedkoper",de:"Günstiger finden",fr:"Trouver moins cher"},
    "Find the exact same product at other stores and see if you're overpaying.":{nl:"Vind exact hetzelfde product bij andere winkels en zie of je te veel betaalt.",de:"Finde dasselbe Produkt bei anderen Shops und prüfe, ob du zu viel zahlst.",fr:"Trouvez exactement le même produit ailleurs et vérifiez si vous payez trop."},
    "YOUR COMPARISONS":{nl:"JOUW VERGELIJKINGEN",de:"DEINE VERGLEICHE",fr:"VOS COMPARAISONS"},
    "View saved items":{nl:"Opgeslagen producten bekijken",de:"Gespeicherte Produkte ansehen",fr:"Voir les produits enregistrés"},
    "COMPR OVERVIEW":{nl:"COMPR OVERZICHT",de:"COMPR ÜBERSICHT",fr:"APERÇU COMPR"},
    "COMPARE SAVED PRODUCTS":{nl:"VERGELIJK OPGESLAGEN PRODUCTEN",de:"GESPEICHERTE PRODUKTE VERGLEICHEN",fr:"COMPARER LES PRODUITS ENREGISTRÉS"},
    "Delivery time":{nl:"Levertijd",de:"Lieferzeit",fr:"Délai de livraison"},
    "Return policy":{nl:"Retourbeleid",de:"Rückgaberecht",fr:"Politique de retour"},
    "Product details":{nl:"Productdetails",de:"Produktdetails",fr:"Détails du produit"},
    "Delivery & returns":{nl:"Levering & retourneren",de:"Lieferung & Rückgabe",fr:"Livraison & retours"},
    "Discount codes":{nl:"Kortingscodes",de:"Rabattcodes",fr:"Codes promo"},
    "1 code available":{nl:"1 code beschikbaar",de:"1 Code verfügbar",fr:"1 code disponible"},
    "{count} codes available":{nl:"{count} codes beschikbaar",de:"{count} Codes verfügbar",fr:"{count} codes disponibles"},
    "Copy code":{nl:"Kopieer code",de:"Code kopieren",fr:"Copier le code"},
    "Copied":{nl:"Gekopieerd",de:"Kopiert",fr:"Copié"},
    "Verified":{nl:"Geverifieerd",de:"Verifiziert",fr:"Vérifié"},
    "Code found":{nl:"Code gevonden",de:"Code gefunden",fr:"Code trouvé"},
    "Possible discount code":{nl:"Mogelijke kortingscode",de:"Möglicher Rabattcode",fr:"Code promo possible"},
    "No verified discount codes found":{nl:"Geen geverifieerde kortingscodes gevonden",de:"Keine verifizierten Rabattcodes gefunden",fr:"Aucun code promo vérifié trouvé"},
    "We couldn't confirm an active code for this product.":{nl:"We konden geen actieve code voor dit product bevestigen.",de:"Wir konnten keinen aktiven Code für dieses Produkt bestätigen.",fr:"Nous n'avons pas pu confirmer de code actif pour ce produit."},
    "Current deals":{nl:"Actuele aanbiedingen",de:"Aktuelle Angebote",fr:"Offres actuelles"},
    "No code required":{nl:"Geen code nodig",de:"Kein Code erforderlich",fr:"Aucun code requis"},
    "Free delivery":{nl:"Gratis bezorging",de:"Kostenlose Lieferung",fr:"Livraison gratuite"},
    "Store discount available":{nl:"Winkelkorting beschikbaar",de:"Shop-Rabatt verfügbar",fr:"Remise boutique disponible"},
    "off":{nl:"korting",de:"Rabatt",fr:"de réduction"},
    "off selected items":{nl:"korting op geselecteerde artikelen",de:"Rabatt auf ausgewählte Artikel",fr:"de réduction sur une sélection"},
    "Public code":{nl:"Openbare code",de:"Öffentlicher Code",fr:"Code public"},
    "Official code":{nl:"Officiële code",de:"Offizieller Code",fr:"Code officiel"},
    "Unverified code":{nl:"Onbevestigde code",de:"Unbestätigter Code",fr:"Code non confirmé"},
    "No official active code found":{nl:"Geen officiële actieve code gevonden",de:"Kein offizieller aktiver Code gefunden",fr:"Aucun code officiel actif trouvé"},
    "Not found":{nl:"Niet gevonden",de:"Nicht gefunden",fr:"Non trouvé"},
    "Open a product first":{nl:"Open eerst een product",de:"Öffne zuerst ein Produkt",fr:"Ouvrez d’abord un produit"},
    "Visit any supported product page and open COMPR again.":{nl:"Bezoek een ondersteunde productpagina en open COMPR opnieuw.",de:"Besuche eine unterstützte Produktseite und öffne COMPR erneut.",fr:"Visitez une page produit prise en charge et rouvrez COMPR."},
    "You're not on a product page":{nl:"Je bent niet op een productpagina",de:"Du bist nicht auf einer Produktseite",fr:"Vous n'êtes pas sur une page produit"},
    "Open an individual product at a webshop, then follow these steps.":{nl:"Open één specifiek product bij een webshop en volg daarna deze stappen.",de:"Öffne ein einzelnes Produkt in einem Shop und folge diesen Schritten.",fr:"Ouvrez un produit précis dans une boutique, puis suivez ces étapes."},
    "Open the page of one specific product":{nl:"Open de pagina van één specifiek product",de:"Öffne die Seite eines bestimmten Produkts",fr:"Ouvrez la page d'un produit précis"},
    "Click the COMPR icon in your browser":{nl:"Klik op het COMPR-icoon in je browser",de:"Klicke auf das COMPR-Symbol im Browser",fr:"Cliquez sur l'icône COMPR du navigateur"},
    "Save it, compare it or find it cheaper":{nl:"Bewaar, vergelijk of vind het goedkoper",de:"Speichere, vergleiche oder finde es günstiger",fr:"Enregistrez, comparez ou trouvez moins cher"},
    "VIEW SAVED PRODUCTS":{nl:"OPGESLAGEN PRODUCTEN",de:"GESPEICHERTE PRODUKTE",fr:"PRODUITS ENREGISTRÉS"},
    "Open a product":{nl:"Open een product",de:"Produkt öffnen",fr:"Ouvrir un produit"},
    "Click COMPR":{nl:"Klik op COMPR",de:"COMPR anklicken",fr:"Cliquer sur COMPR"},
    "Save & compare":{nl:"Bewaar & vergelijk",de:"Speichern & vergleichen",fr:"Enregistrer & comparer"},
    "READY TO COMPARE":{nl:"KLAAR OM TE VERGELIJKEN",de:"BEREIT ZUM VERGLEICH",fr:"PRÊT À COMPARER"},
    "Two products saved":{nl:"Twee producten opgeslagen",de:"Zwei Produkte gespeichert",fr:"Deux produits enregistrés"},
    "Compare your options now, or keep building your shortlist.":{nl:"Vergelijk nu of voeg meer producten toe.",de:"Jetzt vergleichen oder weitere Produkte hinzufügen.",fr:"Comparez maintenant ou ajoutez d’autres produits."},
    "ADD MORE":{nl:"MEER TOEVOEGEN",de:"MEHR HINZUFÜGEN",fr:"EN AJOUTER"},
    "Compare before you buy.":{nl:"Vergelijk voordat je koopt.",de:"Vergleiche vor dem Kauf.",fr:"Comparez avant d’acheter."},
    "CLEAR ALL":{nl:"ALLES WISSEN",de:"ALLES LÖSCHEN",fr:"TOUT EFFACER"},
    "YOUR COMPARISON":{nl:"JOUW VERGELIJKING",de:"DEIN VERGLEICH",fr:"VOTRE COMPARAISON"},
    "Compare your picks":{nl:"Vergelijk je keuzes",de:"Vergleiche deine Auswahl",fr:"Comparez vos choix"},
    "See your saved products side by side and compare prices, stores and product details.":{nl:"Bekijk opgeslagen producten naast elkaar en vergelijk prijzen, winkels en details.",de:"Vergleiche gespeicherte Produkte, Preise, Shops und Details nebeneinander.",fr:"Comparez côte à côte les prix, boutiques et détails de vos produits."},
    "YOUR OVERVIEW":{nl:"JOUW OVERZICHT",de:"DEINE ÜBERSICHT",fr:"VOTRE APERÇU"},
    "Decide with clarity.":{nl:"Kies met overzicht.",de:"Entscheide mit Klarheit.",fr:"Décidez clairement."},
    "saved products":{nl:"opgeslagen producten",de:"gespeicherte Produkte",fr:"produits enregistrés"},
    "categories":{nl:"categorieën",de:"Kategorien",fr:"catégories"},
    "Search saved products":{nl:"Opgeslagen producten zoeken",de:"Gespeicherte Produkte suchen",fr:"Rechercher les produits enregistrés"},
    "Search products, brands or stores":{nl:"Zoek producten, merken of winkels",de:"Produkte, Marken oder Shops suchen",fr:"Rechercher produits, marques ou boutiques"},
    "Category":{nl:"Categorie",de:"Kategorie",fr:"Catégorie"},
    "All categories":{nl:"Alle categorieën",de:"Alle Kategorien",fr:"Toutes les catégories"},
    "Size / variant":{nl:"Maat / variant",de:"Größe / Variante",fr:"Taille / variante"},
    "Sort by":{nl:"Sorteren op",de:"Sortieren nach",fr:"Trier par"},
    "Newest saved":{nl:"Nieuwste eerst",de:"Neueste zuerst",fr:"Plus récents"},
    "Oldest saved":{nl:"Oudste eerst",de:"Älteste zuerst",fr:"Plus anciens"},
    "Price: low to high":{nl:"Prijs: laag naar hoog",de:"Preis: niedrig nach hoch",fr:"Prix croissant"},
    "Price: high to low":{nl:"Prijs: hoog naar laag",de:"Preis: hoch nach niedrig",fr:"Prix décroissant"},
    "Available first":{nl:"Beschikbaar eerst",de:"Verfügbare zuerst",fr:"Disponibles d’abord"},
    "Group by category":{nl:"Groeperen per categorie",de:"Nach Kategorie gruppieren",fr:"Grouper par catégorie"},
    "Available only":{nl:"Alleen beschikbaar",de:"Nur verfügbare",fr:"Disponibles uniquement"},
    "Export backup":{nl:"Back-up exporteren",de:"Backup exportieren",fr:"Exporter la sauvegarde"},
    "Import backup":{nl:"Back-up importeren",de:"Backup importieren",fr:"Importer la sauvegarde"},
    "Products loading...":{nl:"Producten laden...",de:"Produkte werden geladen...",fr:"Chargement des produits..."},
    "CHEAPEST":{nl:"GOEDKOOPSTE",de:"GÜNSTIGSTE",fr:"MOINS CHER"},
    "In stock":{nl:"Op voorraad",de:"Auf Lager",fr:"En stock"},
    "Pre-order":{nl:"Pre-order",de:"Vorbestellung",fr:"Précommande"},
    "Out of stock":{nl:"Niet op voorraad",de:"Nicht verfügbar",fr:"Rupture de stock"},
    "Availability unknown":{nl:"Beschikbaarheid onbekend",de:"Verfügbarkeit unbekannt",fr:"Disponibilité inconnue"},
    "Original price":{nl:"Originele prijs",de:"Originalpreis",fr:"Prix d’origine"},
    "Color":{nl:"Kleur",de:"Farbe",fr:"Couleur"},
    "Shop":{nl:"Winkel",de:"Shop",fr:"Boutique"},
    "Material":{nl:"Materiaal",de:"Material",fr:"Matière"},
    "Available sizes":{nl:"Beschikbare maten",de:"Verfügbare Größen",fr:"Tailles disponibles"},
    "Unavailable sizes":{nl:"Niet-beschikbare maten",de:"Nicht verfügbare Größen",fr:"Tailles indisponibles"},
    "Add another product":{nl:"Product toevoegen",de:"Produkt hinzufügen",fr:"Ajouter un produit"},
    "Add item":{nl:"Product toevoegen",de:"Produkt hinzufügen",fr:"Ajouter un produit"},
    "Save another item while shopping to compare prices, delivery and deals side by side.":{nl:"Bewaar tijdens het shoppen nog een product om prijzen, levering en aanbiedingen te vergelijken.",de:"Speichere ein weiteres Produkt, um Preise, Lieferung und Angebote zu vergleichen.",fr:"Enregistrez un autre produit pour comparer prix, livraison et offres."},
    "How to add products":{nl:"Zo voeg je producten toe",de:"So fügst du Produkte hinzu",fr:"Comment ajouter des produits"},
    "No saved products yet":{nl:"Nog geen producten opgeslagen",de:"Noch keine Produkte gespeichert",fr:"Aucun produit enregistré"},
    "Start with any product page and use COMPR to save your first item.":{nl:"Open een productpagina en gebruik COMPR om je eerste product op te slaan.",de:"Öffne eine Produktseite und speichere dein erstes Produkt mit COMPR.",fr:"Ouvrez une page produit et utilisez COMPR pour enregistrer votre premier article."},
    "Availability":{nl:"Beschikbaarheid",de:"Verfügbarkeit",fr:"Disponibilité"},
    "VIEW PRODUCT":{nl:"PRODUCT BEKIJKEN",de:"PRODUKT ANSEHEN",fr:"VOIR LE PRODUIT"},
    "REMOVE":{nl:"VERWIJDEREN",de:"ENTFERNEN",fr:"SUPPRIMER"}
  };
  let language="en";
  let changing=false;
  let initialized=false;
  let observer=null;
  function canonical(value){
    const text=String(value||"").trim();
    if(copy[text]) return text;
    for(const [english,variants] of Object.entries(copy)){
      if(Object.values(variants).includes(text)) return english;
    }
    return text;
  }
  function translate(value,lang=language){
    const key=canonical(value);return lang==="en"?key:(copy[key]?.[lang]||key);
  }
  function apply(rootNode=document){
    if(changing)return;changing=true;
    const walker=document.createTreeWalker(rootNode,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{const raw=node.nodeValue;const trimmed=raw.trim();if(!trimmed)return;const next=translate(trimmed);if(next!==trimmed)node.nodeValue=raw.replace(trimmed,next);});
    rootNode.querySelectorAll?.("[placeholder],[title],[aria-label]").forEach(el=>{
      for(const attr of ["placeholder","title","aria-label"]){if(el.hasAttribute(attr))el.setAttribute(attr,translate(el.getAttribute(attr)));}
    });
    document.documentElement.lang=language;changing=false;
  }
  async function setLanguage(code){
    language=LANGUAGES.some(item=>item.code===code)?code:"en";
    await ComprBrowser.storage.local.set({languageCode:language});
    document.querySelectorAll("[data-language-select]").forEach(select=>select.value=language);
    apply(document);
  }
  async function init(){
    if(initialized)return;initialized=true;
    const selects=document.querySelectorAll("[data-language-select]");
    selects.forEach(select=>{
      select.replaceChildren(...LANGUAGES.map(item=>{const option=document.createElement("option");option.value=item.code;option.textContent=item.label;return option;}));
      select.addEventListener("change",()=>setLanguage(select.value));
    });
    const saved=await ComprBrowser.storage.local.get(["languageCode"]);language=saved.languageCode||"en";
    selects.forEach(select=>select.value=language);apply(document);
    observer=new MutationObserver(records=>{if(!changing&&records.some(record=>record.addedNodes.length||record.type==="characterData"))apply(document);});
    observer.observe(document.body,{subtree:true,childList:true,characterData:true});
    root.addEventListener?.("pagehide",()=>{observer?.disconnect();observer=null;},{once:true});
  }
  root.ComprI18n={LANGUAGES,translate,apply,setLanguage,getLanguage:()=>language,init};
  document.addEventListener("DOMContentLoaded",init,{once:true});
})(typeof globalThis!=="undefined"?globalThis:this);
