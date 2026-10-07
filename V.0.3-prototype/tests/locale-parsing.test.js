const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const L=require("../shared/localeParsing");
const P=require("../shared/product");
const S=require("../shared/safariExperience");
test("central source parser matches API and popup for supported European prices",()=>{
  for(const price of ["64.95 EUR","€64,95","64,95 €","£64.95","64.95 GBP","1 299,99 €","£1,299.99"]){
    const currency=L.currency(price);const product={price,currency,name:"JBL Tune 730BT Wit"};
    const amount=L.parseAmount(price); assert.equal(P.toSearchPayload(product).price,amount);
    const total=S.comparableTotals(product,{price:amount-1,shippingCost:0,shippingIncluded:true,currency});
    assert.equal(total.current,amount);assert.equal(total.valid,true);
  }
});
test("unknown source/shipping and incompatible currencies stay invalid",()=>{
  for(const price of ["",null,undefined,NaN,"prijs onbekend","from €64"]){ assert.equal(P.toSearchPayload({price}).price,null);assert.equal(S.comparableTotals({price,currency:"EUR"},{price:64,shippingIncluded:true,currency:"EUR"}).valid,false); }
  assert.equal(S.comparableTotals({price:64.95,currency:"EUR"},{price:64,currency:"EUR"}).valid,false);
  assert.equal(S.comparableTotals({price:64.95,currency:"EUR"},{price:64,shippingCost:0,currency:"GBP"}).valid,false);
});
test("detector loads the central parser and never treats an aggregate minimum as a direct offer",()=>{
  const context=vm.createContext({});
  for(const file of ["shared/localeParsing.js","detectors/price.js","detectors/color.js"]) vm.runInContext(fs.readFileSync(path.join(__dirname,"..",file),"utf8"),context);
  assert.equal(context.getPriceFromJsonLd({offers:{"@type":"Offer",price:"1 299,99",priceCurrency:"EUR"}}),"1 299,99 EUR");
  assert.equal(context.getPriceFromJsonLd({offers:{"@type":"AggregateOffer",lowPrice:64,priceCurrency:"EUR"}}),null);
  assert.equal(context.formatPrice("price unknown","EUR"),null);
  assert.equal(context.getColorFromProductName("JBL Tune 730BT Weiß"),"white");
});
test("frontend/browser loading and Safari staging include shared parser before its consumers",()=>{
  for(const file of ["popup.html","compare.html"]){const text=fs.readFileSync(path.join(__dirname,"..",file),"utf8");assert.ok(text.indexOf("shared/localeParsing.js")<text.indexOf("shared/product.js"));}
  for(const file of ["popup.js","safari-popup.js"]){const text=fs.readFileSync(path.join(__dirname,"..",file),"utf8");assert.ok(text.indexOf('"shared/localeParsing.js"')<text.indexOf('"detectors/price.js"'));}
  const stage=fs.readFileSync(path.join(__dirname,"../../tools/build-safari-extension.ps1"),"utf8");assert.ok(stage.includes("shared\\localeParsing.js"));
  assert.equal(fs.readFileSync(path.join(__dirname,"../shared/localeParsing.js"),"utf8"),fs.readFileSync(path.join(__dirname,"../../../compr-backend/src/localeParsing.js"),"utf8"));
});

test("source currency evidence cannot silently become EUR or compare to GBP",()=>{
  assert.equal(P.toSearchPayload({price:"£64.95"}).currency,"GBP");
  assert.equal(P.toSearchPayload({price:"£64.95",currency:"EUR"}).price,null);
  assert.equal(S.comparableTotals({price:"64.95 EUR"},{price:64,currency:"GBP",shippingCost:0}).valid,false);
});

test("fallback payload keeps real region/currency/identity and uses English commerce terms",()=>{
  for(const [targetMarket,locale,currency] of [["PL","pl-PL","EUR"],["SE","sv-SE","SEK"],["","","GBP"],["ZZ","zz-ZZ","EUR"]]){
    const payload=P.toSearchPayload({targetMarket,locale,currency,price:64.95,name:"JBL Tune 730BT",gtin:"1200130029844",mpn:"JBLT730BTWHT"});
    assert.equal(payload.targetMarket,targetMarket);assert.equal(payload.currency,currency);assert.equal(payload.gtin,"1200130029844");assert.equal(payload.mpn,"JBLT730BTWHT");
    assert.equal(L.commerceTerms(L.searchMarket(payload),locale),"price buy");assert.equal(L.freeShipping("Dostawa jutro",64.95,currency).shippingCost,undefined);
  }
  assert.equal(P.toSearchPayload({locale:"pl-PL",currency:"EUR",price:64}).targetMarket,"PL");
  assert.equal(P.toSearchPayload({locale:"",price:64,currency:"GBP"}).targetMarket,"");
});

test('product market outranks UI locale with bounded route and hostname evidence',()=>{
  for(const [url,locale,expected] of [
    ['https://www.smythstoys.com/de/de-de/p/222613','nl-NL','DE'],
    ['https://shop.de/product/sony','nl-NL','DE'],
    ['https://expert.nl/product/jbl','de-DE','NL'],
    ['https://shop.com/product/de-headphone','fr-FR','FR'],
    ['https://shop.com/product/de-headphone','',''],
    ['https://shop.com/en-gb/product/sony','nl-NL','GB']]){
    const payload=P.toSearchPayload({url,locale,name:'Sony WH-CH520',price:34.99,currency:'EUR'});
    assert.equal(payload.targetMarket,expected,url);assert.equal(payload.currency,'EUR');
  }
  assert.equal(L.resolveTargetMarket({targetMarket:'FR',url:'https://shop.de/p'}),'FR');
  assert.equal(L.resolveTargetMarket({pageLocale:'de-DE',url:'https://shop.com/p'},'nl-NL'),'DE');
});

test('headphone title outranks toy retailer marketing while real toys remain toys',()=>{
  const context={document:{title:'Smyths Toys',querySelector:()=>({content:'Toys and games'})}};
  vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../detectors/category.js'),'utf8'),context);
  assert.equal(context.getCategory(null,'Sony Kopfhörer WH-CH520 Wireless Bluetooth On-Ear schwarz'),'TV & Audio');
  assert.equal(context.getCategory(null,'JBL Tune 730BT Wit'),'TV & Audio');
  assert.equal(context.getCategory(null,'LEGO toy building blocks'),'Toys & Games');
});
