'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const product=require('../shared/product');
const p={name:'JBL Tune 730BT Wit',price:64.95,currency:'EUR',url:'https://expert.nl/jbl'};
function setup(data={},fetch=async()=>({ok:true,json:async()=>({offers:[]})}),clock={now:1000}) {
 class Clock extends Date {static now(){return clock.now;}}
 const c={ComprProduct:product,ComprAuth:{getSession:async()=>({access_token:'fixture',user:{id:'user'}})},ComprRuntimeConfig:{apiBaseUrl:'https://sandbox.example',authProjectRef:'fixture'},ComprBrowser:{storage:{local:{get:async keys=>Object.fromEntries(keys.map(k=>[k,data[k]])),set:async values=>Object.assign(data,values),remove:async keys=>keys.forEach(k=>delete data[k])}}},Date:Clock,Map,Promise,Error,AbortController,setTimeout,clearTimeout,crypto:{randomUUID:()=> 'id-new'},fetch};
 vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(__dirname,'../shared/apiClient.js'),'utf8')+'\nglobalThis.api=ComprApi;',c);return c.api;
}
test('10 second cooldown blocks new starts across popup reopen but allows recovery/confirmation',async()=>{
 const data={},clock={now:1000};let calls=0;
 const fetch=async(url,o)=>{calls++;return {ok:true,json:async()=>({requestId:JSON.parse(o.body).requestId,offers:[],confirmation:{resultId:'r',token:'t',expiresAt:'2099-01-01T00:00:00Z'}})};};
 const a=setup(data,fetch,clock);const response=await a.search(p,'one');
 const b=setup(data,fetch,clock);await assert.rejects(b.search({...p,url:'https://expert.nl/other'},'two'),e=>e.code==='SEARCH_COOLDOWN'&&e.details.retryAfterSeconds===10);
 await b.search(p,'three');await b.acceptResult(response);assert.equal(calls,3);
 clock.now=11000;await b.search({...p,url:'https://expert.nl/other'},'four');assert.equal(calls,4);
});
test('safety rejection clears unstarted request, keeps usage copy separate from allowance exhausted',async()=>{
 const data={},clock={now:1000};const api=setup(data,async()=>({ok:false,status:429,json:async()=>({error:{code:'SEARCH_SAFETY_LIMIT',details:{retryAfterSeconds:3600}}})}),clock);
 let error;try{await api.search(p,'one');}catch(e){error=e;}
 assert.equal(error.code,'SEARCH_SAFETY_LIMIT');assert.equal(Object.keys(data).filter(k=>k.startsWith('comprPendingSearch')).length,0);
 assert.equal(api.safetyMessage(error).seconds,3600);assert.equal(api.safetyMessage(error).copy,'Your successful checks have not been used.');
 assert.equal(api.safetyMessage({code:'SEARCH_LIMIT_REACHED'}),null);
});
test('no-match keeps successful usage unmodified and enforces cooldown without accidental retry',async()=>{
 const data={},clock={now:1000};let calls=0;const api=setup(data,async()=>{calls++;return {ok:false,status:404,json:async()=>({error:{code:'NO_CONFIDENT_MATCH'}})};},clock);
 await assert.rejects(api.search(p,'one'),{code:'NO_CONFIDENT_MATCH'});
 await assert.rejects(api.search(p,'two'),{code:'SEARCH_COOLDOWN'});assert.equal(calls,1);
 assert.equal(Object.keys(data).filter(k=>k.startsWith('comprPendingSearch')).length,0);
});
test('double click with persisted ID shares one in-flight network request',async()=>{
 const data={},clock={now:1000};let calls=0,release;const gate=new Promise(resolve=>release=resolve);
 const api=setup(data,async()=>{calls++;await gate;return {ok:true,json:async()=>({offers:[]})};},clock);
 const first=api.search(p,'one');await new Promise(resolve=>setImmediate(resolve));const second=api.search(p,'two');
 await new Promise(resolve=>setImmediate(resolve));release();await Promise.all([first,second]);assert.equal(calls,1);
});
