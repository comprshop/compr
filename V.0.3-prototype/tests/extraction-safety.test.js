'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const Sizes=require('../detectors/sizes'),Eligibility=require('../shared/productEligibility'),Price=require('../detectors/price'),Product=require('../shared/product');
function node(text,attrs={}) {return {textContent:text,innerText:text,getAttribute:k=>attrs[k]??null,...attrs};}
function sizeDoc(selected=[],selects=[]) {return {querySelectorAll:q=>q==='select'?selects:selected,querySelector:()=>null};}
function control(text,attrs={}) {return {...node(text,attrs),closest:()=>node('',{'aria-label':'Schoenmaat EU'})};}
function withDoc(doc,fn) {const prev=global.document;global.document=doc;try{return fn();}finally{global.document=prev;}}
test('only a selected control establishes EU42; size lists cannot select a size',()=>{
 assert.equal(withDoc(sizeDoc([control('EU 42',{'aria-checked':'true'})]),()=>Sizes.getSelectedSize()).value,'EU 42');
 assert.equal(withDoc(sizeDoc(),()=>Sizes.getSelectedSize()).value,null);
 const result=withDoc(sizeDoc([control('EU 42'),control('EU 43')]),()=>Sizes.getSelectedSize());assert.equal(result.status,'ambiguous');assert.equal(result.value,null);
});
test('checked input label and selected dropdown preserve size system; disabled is rejected',()=>{
 const radio={...control(''),labels:[node('42')]};
 assert.equal(withDoc(sizeDoc([radio]),()=>Sizes.getSelectedSize()).value,'EU 42');
 const select={name:'size',getAttribute:()=> 'Size UK',selectedOptions:[node('8.5')]};
 assert.equal(withDoc(sizeDoc([],[select]),()=>Sizes.getSelectedSize()).value,'UK 8.5');
 assert.equal(withDoc(sizeDoc([control('EU 42',{disabled:true})]),()=>Sizes.getSelectedSize()).value,null);
 assert.equal(withDoc(sizeDoc([{...radio,disabled:true}]),()=>Sizes.getSelectedSize()).value,null);
});
test('extracted selected size survives actual content product and API payload, independent of size list',async()=>{
 const doc={...sizeDoc([control('EU 42')]),baseURI:'https://shop.nl/product/shoe',documentElement:{lang:'nl'},querySelector:q=>q==='h1'?node('Nike Air Max 90 herenschoenen'):null};
 const globals={console,URL,document:doc,window:{location:new URL(doc.baseURI)},
 ComprProductEligibility:{assessPage:()=>({eligible:true,jsonProduct:{},isApparel:true,diagnostics:{}})},
 ComprBrowser:{runtime:{onMessage:()=>{}}},getPrice:()=> '149.99 EUR',getPriceCurrency:()=> 'EUR',getPriceProvenance:()=>({source:'jsonld_offer',taxBasis:'unknown'}),
 getProductId:()=>({mpn:'CN8490-100'}),selectProductTitle:()=>({name:'Nike Air Max 90 herenschoenen',rawTitle:'Nike Air Max 90 herenschoenen'}),
 getCategory:()=> 'Shoes',getAvailability:()=>({availableSizes:['EU 41','EU 42','EU 43'],unavailableSizes:[],status:'available'}),
 getStorePolicies:()=>({}),findOfficialDiscountCodes:async()=>[],findCurrentDeals:()=>[],getBrand:()=> 'Nike',getColor:()=> 'white',getMaterial:()=>'',getSizes:()=>['EU 41','EU 42','EU 43']};
 vm.createContext(globals);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../detectors/sizes.js'),'utf8'),globals);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../content.js'),'utf8'),globals);
 const extracted=await globals.getProductInfo();assert.equal(extracted.selectedSize,'EU 42');
 const payload=Product.toSearchPayload(extracted);assert.equal(payload.size,'EU 42');assert.equal(payload.mpn,'CN8490-100');assert.equal(payload.sizeRequired,true);
 const fingerprint=JSON.stringify([payload.url,JSON.stringify(['brand','model','modelTokens','mpn','productCode','ean','gtin','color','size','capacity','targetMarket','locale'].map(key=>payload[key]??null))]);
 assert.match(fingerprint,/EU 42/);
 const unknown=Product.toSearchPayload({...extracted,selectedSize:null,selectedVariants:{}});assert.equal(unknown.size,'');
});
test('eligibility diagnostic explains missing evidence without retaining page text or URL',()=>{
 const doc={title:'Secret account name',readyState:'complete',querySelector:q=>q==='h1'?node('Dell Pro P 24 Monitor - P2426H'):null,querySelectorAll:()=>[]};
 const result=Eligibility.assessPage(doc,'https://www.dell.com/nl-nl/shop/item?token=secret',{getPrice:()=> '€175,45',getProductId:()=>({}),getPriceCurrency:()=> 'EUR'});
 assert.equal(result.eligible,false);assert.equal(result.diagnostics.title,'present');assert.equal(result.diagnostics.price,'present');assert.equal(result.diagnostics.identifier,'missing');assert.equal(result.diagnostics.buyButton,'missing');
 assert.doesNotMatch(JSON.stringify(result.diagnostics),/secret|Dell|175|token|https/i);
});
test('structured offer passes while unresolved ProductGroup is diagnosed',()=>{
 const group={'@type':'ProductGroup',name:'Variants',hasVariant:[]};
 const doc={title:'',querySelector:()=>null,querySelectorAll:q=>q.includes('ld+json')?[node(JSON.stringify(group))]:[]};
 const result=Eligibility.assessPage(doc,'https://shop.nl/product/item',{});
 assert.equal(result.eligible,false);assert.equal(result.diagnostics.productGroup,'unresolved');
});
test('mixed VAT prices report uncertainty; no unproven consumer-price reassignment',()=>{
 const doc={body:{innerText:'€145,00 excl. btw €175,45 incl. btw'},querySelector:()=>null,querySelectorAll:()=>[]};
 withDoc(doc,()=>{
 assert.equal(Price.getPrice(null),'€145,00');
 assert.deepEqual(Price.getPriceProvenance(null),{source:'page_text',taxBasis:'unknown',vatContext:'mixed'});
 });
});

test('current Smyths Sony product evidence remains eligible and extracts the known product',async()=>{
 const url='https://www.smythstoys.com/de/de-de/gaming/kinderelektronik/kopfhoerer/sony-kopfhoerer-wh-ch520-wireless-bluetooth-on-ear-schwarz/p/222613';
 const structured={'@type':'Product',name:'Sony Kopfhörer WH-CH520 Wireless Bluetooth On-Ear schwarz',image:'https://image.smythstoys.com/original/800/desktop/222613.jpg',sku:'222613',offers:[{'@type':'Offer',price:'34.99',priceCurrency:'EUR',url}]};
 const jsonNode=node(JSON.stringify(structured));
 const meta={getAttribute:key=>key==='content'?'34.99':null,content:'34.99'};
 const buy=node('In den Warenkorb');
 const doc={title:`${structured.name} | Smyths Toys Deutschland`,readyState:'complete',baseURI:url,documentElement:{lang:'de-DE'},body:{innerText:`${structured.name} Ref: 222613 34,99 €`},
  querySelector:selector=>selector==='h1'?node(structured.name):selector.includes('product:price')||selector.includes('og:price')?meta:null,
  querySelectorAll:selector=>selector.includes('ld+json')?[jsonNode]:selector.startsWith('button')?[buy]:[]};
 const eligible=Eligibility.assessPage(doc,url,{getPrice:()=> '34,99 €',getPriceCurrency:()=> 'EUR',getPriceProvenance:()=>({source:'jsonld_offer'}),getProductId:()=>({sku:'222613'}),getSelectedSize:()=>({status:'missing'})});
 assert.equal(eligible.eligible,true);assert.equal(eligible.jsonProduct.name,structured.name);
 const globals={console,URL,document:doc,window:{location:new URL(url)},
  ComprProductEligibility:{assessPage:()=>({...eligible,isApparel:false})},ComprBrowser:{runtime:{onMessage:()=>{}}},
  getPrice:()=> '34.99 EUR',getPriceCurrency:()=> 'EUR',getPriceProvenance:()=>({source:'jsonld_offer'}),getProductId:()=>({sku:'222613'}),
  selectProductTitle:()=>({name:structured.name,rawTitle:structured.name}),getCategory:()=> 'TV & Audio',getAvailability:()=>({availableSizes:[],unavailableSizes:[],status:'out_of_stock'}),
  getStorePolicies:()=>({}),findOfficialDiscountCodes:async()=>[],findCurrentDeals:()=>[],getBrand:()=> 'Sony',getColor:()=> 'black',getMaterial:()=>'',getSizes:()=>[]};
 vm.createContext(globals);vm.runInContext(fs.readFileSync(path.join(__dirname,'../detectors/sizes.js'),'utf8'),globals);vm.runInContext(fs.readFileSync(path.join(__dirname,'../content.js'),'utf8'),globals);
 const extracted=await globals.getProductInfo();
 assert.equal(extracted.name,structured.name);assert.equal(extracted.price,'34.99 EUR');assert.equal(extracted.webshop,'www.smythstoys.com');assert.equal(extracted.image,structured.image);assert.equal(extracted.category,'TV & Audio');
});

test('physical graph diagnostics preserve only compact ProductGroup reference shape',()=>{
 const url='https://www.saturn.de/de/product/sony-103122401.html';
 const graph={'@graph':[
  {'@id':'#group','@type':'ProductGroup',productGroupID:'103122401',variesBy:['color'],hasVariant:[{'@id':'#variant'}]},
  {'@id':'#variant','@type':'ProductModel',offers:{'@id':'#missing-offer'}}
 ]};
 const doc={baseURI:url,querySelector:()=>null,querySelectorAll:q=>q.includes('ld+json')?[node(JSON.stringify(graph))]:[]};
 const globals={console,URL,document:doc,window:{location:new URL(url)},ComprBrowser:{runtime:{onMessage:()=>{}}}};
 vm.createContext(globals);vm.runInContext(fs.readFileSync(path.join(__dirname,'../content.js'),'utf8'),globals);
 const shape=globals.getProductRecognitionDiagnostics();
 assert.equal(shape.blockCount,1);assert.equal(shape.blocks[0].graphNodes,2);
 assert.deepEqual(JSON.parse(JSON.stringify(shape.blocks[0].graphTypes)),['ProductGroup','ProductModel']);
 assert.deepEqual(JSON.parse(JSON.stringify(shape.blocks[0].groups[0])),{hasId:true,productGroupId:true,variesBy:1,url:'missing',hasVariantCount:1,hasVariantRefs:1,offerCount:0,offerRefs:0});
 assert.equal(shape.blocks[0].unresolvedReferences,1);
 assert.doesNotMatch(JSON.stringify(shape),/103122401|#group|#variant|#missing-offer/);
});
