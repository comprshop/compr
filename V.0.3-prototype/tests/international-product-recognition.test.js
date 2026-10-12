'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Eligibility=require('../shared/productEligibility.js');
const Id=require('../detectors/productId.js');
const Locale=require('../shared/localeParsing.js');
const Availability=require('../detectors/availability.js');
function el(text='',attrs={}){return {textContent:text,innerText:text,content:attrs.content||'',value:attrs.value||'',getAttribute:k=>attrs[k]??null};}
function doc({h1='',scripts=[],buy=false,meta=false,title='',body=''}){return {title,readyState:'complete',body:{innerText:body},querySelector:q=>q==='h1'?el(h1):q.includes('product:price')&&meta?el('',{content:'34.99'}):null,querySelectorAll:q=>q.includes('ld+json')?scripts.map(x=>el(JSON.stringify(x))):q.includes('button')&&buy?[el('In den Warenkorb')]:[]};}
const helpers={getPrice:p=>p?.offers?.price?`${p.offers.price} ${p.offers.priceCurrency||'EUR'}`:'34,99 €',getPriceCurrency:p=>p?.offers?.priceCurrency||'EUR',getProductId:p=>({sku:p?.sku,mpn:p?.mpn,gtin:p?.gtin13})};
function withPage(url,body,fn){const oldD=global.document,oldW=global.window;global.document={body:{innerText:body}};global.window={location:new URL(url)};try{return fn();}finally{global.document=oldD;global.window=oldW;}}

test('1 Smyths Sony Product is recognized',()=>{const url='https://www.smythstoys.com/de/de-de/p/222613',p={'@type':'Product',name:'Sony WH-CH520 Schwarz',sku:'222613',image:'https://img/222613.jpg',offers:{price:34.99,priceCurrency:'EUR'}};assert.equal(Eligibility.assessPage(doc({h1:p.name,scripts:[p]}),url,helpers).eligible,true);});
test('2 Nike full style code is preserved',()=>withPage('https://nike.example/p/item','Style: CN8490-100',()=>assert.equal(Id.getProductId({mpn:'CN8490-100'}).mpn,'CN8490-100')));
test('3 Philips slash suffixes remain distinct',()=>{assert.notEqual(Id.cleanProductId('HD9252/90'),Id.cleanProductId('HD9252/70'));});
test('4 second Philips suffix remains distinct',()=>{assert.notEqual(Id.cleanProductId('HD9350/90'),Id.cleanProductId('HD9350/94'));});
test('5 capacities remain distinct identity text',()=>assert.notEqual(Id.cleanProductId('SM128GB'),Id.cleanProductId('SM256GB')));
test('6 USB protocol text is not invented as identifier',()=>withPage('https://shop.example/p/storage','USB 3.2 Gen 2',()=>assert.equal(Id.getProductId({}).mpn,null)));
test('7 short alphanumeric structured model survives',()=>withPage('https://shop.example/p/mouse','',()=>assert.equal(Id.getProductId({model:'3S'}).productCode,'3S')));
test('8 corroborated numeric structured model survives',()=>withPage('https://shop.example/p/lego','',()=>assert.equal(Id.getProductId({model:'10311'}).productCode,'10311')));
test('9 GBP price is parsed',()=>assert.equal(Locale.parseAmount('£34.99'),34.99));
test('10 French price is parsed',()=>assert.equal(Locale.parseAmount('34,99 €'),34.99));
test('11 Spanish price is parsed',()=>assert.equal(Locale.parseAmount('€ 34,99'),34.99));
test('12 Italian price is parsed',()=>assert.equal(Locale.parseAmount('39,99 €'),39.99));
test('13 valid GTIN-13 passes checksum',()=>assert.equal(Id.isValidGtin('4006381333931'),true));
test('14 valid UPC/GTIN-12 passes checksum',()=>assert.equal(Id.isValidGtin('036000291452'),true));
test('15 invalid checksum is not strong GTIN',()=>assert.equal(Id.isValidGtin('4006381333932'),false));
test('16 retailer URL id remains retailer-bound evidence',()=>withPage('https://shop.example/product/sony-headphones-103122401.html','',()=>{const x=Id.getProductId({});assert.equal(x.unknownCode,'103122401');assert.equal(x.identifiers[0].scope,'retailer');}));
test('17 Product/Offer without universal code is recognized',()=>{const p={'@type':'Product',name:'Acme Headphones',image:'https://img/x',offers:{price:49,priceCurrency:'EUR'}};assert.equal(Eligibility.assessPage(doc({h1:p.name,scripts:[p]}),'https://shop.example/product/acme',helpers).eligible,true);});
test('18 multiple product cards are not one product',()=>{const graph={'@graph':[{'@type':'Product',name:'A',offers:{price:1}},{'@type':'Product',name:'B',offers:{price:2}}]};assert.equal(Eligibility.selectMainJsonProduct(doc({scripts:[graph]}),'https://shop.example/deals'),null);});
test('19 international sold-out values are preserved',()=>{for(const x of ['OutOfStock','Nicht verfügbar','Ausverkauft','Rupture de stock','Agotado','Esaurito'])assert.equal(Availability.availabilityFromValue(x),'out_of_stock',x);});
test('20 locale price separators stay deterministic',()=>{assert.equal(Locale.parseAmount('1.234,56 €'),1234.56);assert.equal(Locale.parseAmount('£1,234.56'),1234.56);});

test('Saturn-style @graph ProductGroup resolves @id variant and offer without weakening ambiguity guard',()=>{
 const url='https://www.saturn.de/de/product/sony-whch520-103122401.html';
 const graph={'@graph':[
  {'@id':'#group','@type':'ProductGroup',name:'Sony WH-CH520 Black',brand:{name:'Sony'},hasVariant:[{'@id':'#black'}]},
  {'@id':'#black','@type':'Product',name:'Sony WH-CH520 Black',mpn:'WH-CH520',url,offers:{'@id':'#offer'}},
  {'@id':'#offer','@type':'Offer',price:34.99,priceCurrency:'EUR',url,itemCondition:'https://schema.org/NewCondition'}
 ]};
 const result=Eligibility.assessPage(doc({h1:'Sony WH-CH520 Black',scripts:[graph],buy:true}),url,helpers);
 assert.equal(result.eligible,true);assert.equal(result.jsonProduct.mpn,'WH-CH520');assert.equal(result.jsonProduct.offers.price,34.99);
});
test('unresolved graph ProductGroup remains fail closed',()=>{const graph={'@graph':[{'@type':'ProductGroup',name:'Ambiguous',hasVariant:[{'@id':'#missing'}]}]};assert.equal(Eligibility.assessPage(doc({h1:'Ambiguous',scripts:[graph],buy:true,meta:true}),'https://shop.example/product/x',helpers).eligible,false);});
