'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const Product=require('../shared/product');
const source=fs.readFileSync(path.join(__dirname,'../shared/apiClient.js'),'utf8');
const product={name:'JBL Tune 730BT Wit',price:'64.95 EUR',currency:'EUR',url:'https://expert.nl/jbl'};
const pending={requestId:'id-one',offers:[{price:64}],confirmation:{resultId:'result-one',token:'server-token',expiresAt:'2099-01-01T00:00:00Z'}};
function context(fetch,data={}){const c={ComprAuth:{getSession:async()=>({access_token:'fixture',user:{id:'user-one'}})},ComprProduct:Product,ComprRuntimeConfig:{apiBaseUrl:'https://sandbox.example'},ComprBrowser:{storage:{local:{get:async keys=>Object.fromEntries(keys.map(k=>[k,data[k]])),set:async value=>Object.assign(data,value),remove:async keys=>keys.forEach(k=>delete data[k])}}},crypto:{randomUUID:()=> 'id-new'},fetch,AbortController,setTimeout,clearTimeout,Date,URL,JSON,Error,Promise,Map};vm.createContext(c);vm.runInContext(source+'\nglobalThis.api=ComprApi;',c);return c.api;}
test('search does not confirm before client validation/rendering',async()=>{
 const calls=[];const api=context(async(url,o)=>{calls.push(url);return {ok:true,json:async()=>url.endsWith('/accept') ? {requestId:'id-one',usageCharged:true} : pending};});
 const response=await api.search(product,'id-one');assert.equal(calls.length,1);assert.ok(calls[0].endsWith('/v1/search'));
 // Invalid/render failure: no acceptResult call, therefore no confirm request.
 assert.equal(response.confirmation.token,'server-token');
 await api.acceptResult(response);assert.equal(calls.length,2);assert.ok(calls[1].endsWith('/v1/search/accept'));
});
test('network failure and reopen reuse persisted request identity and original product',async()=>{
 const data={};let sent;
 const a=context(async(url,o)=>{sent=JSON.parse(o.body);throw Error('network');},data);
 await assert.rejects(a.search(product,'id-one'));assert.equal(sent.requestId,'id-one');
 const b=context(async(url,o)=>{sent=JSON.parse(o.body);return {ok:true,json:async()=>pending};},data);
 await b.search({...product,name:product.name+' updated title'},'id-two');assert.equal(sent.requestId,'id-one');assert.equal(sent.product.name,product.name);
});
test('confirm retries preserve exact server-issued identity and never damage returned result',async()=>{
 let attempts=0;const bodies=[];const api=context(async(url,o)=>{bodies.push(JSON.parse(o.body));if(++attempts<3)throw Error('network');return {ok:true,json:async()=>({usageCharged:true})};});
 const result=await api.acceptResult(pending);assert.equal(result.usageCharged,true);assert.equal(attempts,3);
 assert.equal(JSON.stringify(bodies[0]),JSON.stringify(bodies[2]));assert.equal(pending.offers[0].price,64);
});
test('missing confirmation never sends a forged accept',async()=>{
 const api=context(async()=>{throw Error('must not call');});assert.equal(await api.acceptResult({offers:[]}),null);
});
test('popup and Compare confirm only after rendering accepted results',()=>{
 const popup=fs.readFileSync(path.join(__dirname,'../safari-popup.js'),'utf8');const compare=fs.readFileSync(path.join(__dirname,'../compare.js'),'utf8');
 assert.ok(popup.indexOf('ComprApi.acceptResult(lastResponse)')>popup.indexOf('store.set({view:"match"'));
 assert.ok(compare.indexOf('ComprApi.acceptResult(response)')>compare.indexOf('elements.cheaperResults.appendChild(createCheaperResult'));
 assert.match(compare,/if \(accepted && searchAction.isCurrent\(action\)\)/);
});
