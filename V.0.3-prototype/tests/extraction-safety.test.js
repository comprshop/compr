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
