'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const Product=require('../shared/product');
const code=fs.readFileSync(path.join(__dirname,'../shared/apiClient.js'),'utf8');
const p={name:'JBL Tune 730BT Wit',brand:'JBL',color:'white',price:64.95,currency:'EUR',url:'https://expert.nl/jbl'};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture() {
 const data={},calls=[],clock={now:1000},queues=new Map();let handler;
 const locks={request(name,fn){const previous=queues.get(name)||Promise.resolve();const next=previous.catch(()=>{}).then(fn);queues.set(name,next);return next;}};
 const reply=(body,status=200)=>({ok:status<400,status,json:async()=>body});
 const result=id=>({requestId:id,offers:[{name:p.name,price:64}],confirmation:{resultId:'result-'+id,token:'token-'+id,expiresAt:'2099-01-01T00:00:00Z'}});
 handler=async(url,o)=>url.endsWith('/accept')?reply({usageCharged:true}):reply(result(JSON.parse(o.body).requestId));
 function api({owner='u',ref='sandbox',webLocks=locks}={}) {
  class Clock extends Date {static now(){return clock.now;}}
  const c={ComprAuth:{getSession:async()=>({access_token:'fixture',user:{id:owner}})},ComprProduct:Product,
   ComprRuntimeConfig:{apiBaseUrl:'https://sandbox.example',authProjectRef:ref},
   ComprBrowser:{storage:{local:{get:async keys=>Object.fromEntries(keys.map(k=>[k,data[k]])),set:async x=>Object.assign(data,x),remove:async keys=>keys.forEach(k=>delete data[k])}}},
   crypto:{randomUUID:()=> 'generated'},navigator:{locks:webLocks},Date:Clock,fetch:async(url,o)=>{calls.push({url,body:JSON.parse(o.body)});return handler(url,o);},AbortController,setTimeout,clearTimeout,URL,JSON,Error,Promise,Map};
  vm.createContext(c);vm.runInContext(code+'\nglobalThis.api=ComprApi;',c);return c.api;
 }
 return {data,calls,clock,api,reply,result,setHandler:fn=>handler=fn,pending:()=>Object.entries(data).filter(([k])=>k.startsWith('comprPendingSearch'))};
}
test('confirmed success ends pending action; later click uses new ID and current payload',async()=>{
 const f=fixture(),a=f.api();await a.acceptResult(await a.search(p,'one'));assert.equal(f.pending().length,0);
 f.clock.now+=11000;await a.search({...p,name:p.name+' current'},'two');
 assert.equal(f.calls.at(-1).body.requestId,'two');assert.equal(f.calls.at(-1).body.product.price,64.95);assert.match(f.calls.at(-1).body.product.name,/current/);
});
test('network response loss and popup reopen recover original ID/payload',async()=>{
 const f=fixture();f.setHandler(async()=>{throw Error('network');});await assert.rejects(f.api().search(p,'one'));
 f.setHandler(async(url,o)=>f.reply(f.result(JSON.parse(o.body).requestId)));await f.api().search({...p,name:p.name+' changed'},'two');
 assert.equal(f.calls.at(-1).body.requestId,'one');assert.equal(f.calls.at(-1).body.product.name,p.name);
});
test('lost confirmation response preserves confirmation and exact-one charge under replay',async()=>{
 const f=fixture(),a=f.api();const response=await a.search(p,'one');const committed=new Set();let lost=true;
 f.setHandler(async(url,o)=>{const b=JSON.parse(o.body);if(url.endsWith('/accept')){const duplicate=committed.has(b.requestId);committed.add(b.requestId);if(lost)throw Error('network');return f.reply({usageCharged:true,duplicate});}return f.reply(f.result(b.requestId));});
 assert.equal(await a.acceptResult(response),null);assert.equal(f.pending()[0][1].confirmation.token,response.confirmation.token);
 lost=false;const recovered=await f.api().search(p,'two');const accepted=await f.api().acceptResult(recovered);
 assert.equal(accepted.duplicate,true);assert.equal(committed.size,1);assert.equal(f.pending().length,0);
});
test('duplicate confirmation terminal cleanup permits new action',async()=>{
 const f=fixture(),a=f.api();const r=await a.search(p,'one');f.setHandler(async()=>f.reply({duplicate:true,usageCharged:true}));await a.acceptResult(r);assert.equal(f.pending().length,0);
});
test('authoritative no-match or released expiry allows next click after cooldown',async()=>{
 for(const code of ['NO_CONFIDENT_MATCH','RESERVATION_EXPIRED','RESULT_EXPIRED','SEARCH_TIMEOUT']) {
  const f=fixture(),a=f.api();f.setHandler(async()=>f.reply({error:{code}},404));await assert.rejects(a.search(p,'one'));assert.equal(f.pending().length,0);
  f.clock.now+=11000;f.setHandler(async(url,o)=>f.reply(f.result(JSON.parse(o.body).requestId)));await a.search(p,'two');assert.equal(f.calls.at(-1).body.requestId,'two');
 }
});
test('local timeout/abort with no HTTP authority retains uncertain action',async()=>{
 for(const error of [Object.assign(Error('local timeout'),{code:'SEARCH_TIMEOUT'}),Object.assign(Error('aborted'),{name:'AbortError'})]) {
  const f=fixture();f.setHandler(async()=>{throw error;});await assert.rejects(f.api().search(p,'one'));assert.equal(f.pending()[0][1].requestId,'one');
  f.setHandler(async(url,o)=>f.reply(f.result(JSON.parse(o.body).requestId)));await f.api().search(p,'two');assert.equal(f.calls.at(-1).body.requestId,'one');
 }
});
test('simultaneous double click shares one transport request',async()=>{
 const f=fixture(),a=f.api();await Promise.all([a.search(p,'one'),a.search(p,'two')]);assert.equal(f.calls.length,1);
});
test('popup/Compare cross-document race shares one logical ID/provider execution',async()=>{
 const f=fixture(),providerIDs=new Set();f.setHandler(async(url,o)=>{const id=JSON.parse(o.body).requestId;providerIDs.add(id);return f.reply(f.result(id));});
 await Promise.all([f.api().search(p,'popup'),f.api().search(p,'compare')]);assert.equal(providerIDs.size,1);assert.equal(f.pending().length,1);
});
test('late old confirmation cannot remove newer pending state',async()=>{
 const f=fixture(),a=f.api();const r=await a.search(p,'one');const [key,old]=f.pending()[0];f.data[key]={...old,requestId:'newer'};await a.acceptResult(r);assert.equal(f.data[key].requestId,'newer');
});
test('late old search response cannot overwrite newer confirmation',async()=>{
 const f=fixture(),a=f.api();let release;f.setHandler(async()=>new Promise(resolve=>release=resolve));const t=a.search(p,'one');await tick();
 const [key,old]=f.pending()[0];f.data[key]={...old,requestId:'newer',confirmation:{token:'newer-token'}};release(f.reply(f.result('one')));await t;assert.equal(f.data[key].confirmation.token,'newer-token');
});
test('project and account namespaces never reuse foreign action IDs',async()=>{
 const f=fixture();await f.api().search(p,'a');await f.api({owner:'other'}).search(p,'b');await f.api({ref:'other'}).search(p,'c');assert.deepEqual(f.calls.map(c=>c.body.requestId),['a','b','c']);
});
test('explicit variant binding prevents an old payload from replacing another variant',async()=>{
 const f=fixture();await f.api().search(p,'white');f.clock.now+=11000;await f.api().search({...p,color:'black'},'black');assert.equal(f.calls.at(-1).body.requestId,'black');assert.equal(f.calls.at(-1).body.product.color,'black');
});
test('recovery network failure preserves all confirmation expiry and binding fields',async()=>{
 const f=fixture();await f.api().search(p,'one');const before=f.pending()[0][1];f.setHandler(async()=>{throw Error('network');});await assert.rejects(f.api().search(p,'two'));const after=f.pending()[0][1];assert.deepEqual(after.confirmation,before.confirmation);assert.deepEqual(after.product,before.product);
});
test('legacy entries migrate by copy and recover before terminal cleanup',async()=>{
 const f=fixture();const payload=Product.toSearchPayload(p),key=`comprPendingSearch:sandbox:u:${payload.url}:${payload.price}:${payload.currency}`;
 f.data[key]={requestId:'legacy',product:payload,confirmation:f.result('legacy').confirmation};const a=f.api();const r=await a.search(p,'new');assert.equal(f.calls[0].body.requestId,'legacy');assert.equal(f.data[key],undefined);assert.equal(f.pending()[0][1].state,'awaiting_confirmation');await a.acceptResult(r);assert.equal(f.pending().length,0);
 f.clock.now+=11000;await a.search(p,'new');assert.equal(f.calls.at(-1).body.requestId,'new');
});
test('expired confirmation is recovered authoritatively instead of discarded blindly',async()=>{
 const f=fixture();await f.api().search(p,'one');const [key]=f.pending();f.data[key[0]].confirmation.expiresAt='2000-01-01T00:00:00Z';await f.api().search(p,'two');assert.equal(f.calls.at(-1).body.requestId,'one');
});
test('server candidate-cache response remains independent of action identity',async()=>{
 const f=fixture(),a=f.api();f.setHandler(async(url,o)=>url.endsWith('/accept')?f.reply({usageCharged:false}):f.reply({...f.result(JSON.parse(o.body).requestId),cached:true,provider:'short-candidate-cache'}));
 const r=await a.search(p,'one');assert.equal(r.cached,true);await a.acceptResult(r);f.clock.now+=11000;const second=await a.search(p,'two');assert.equal(second.requestId,'two');assert.equal(second.cached,true);
});
test('browser without cross-document locks fails closed before sending a search',async()=>{
 const f=fixture();await assert.rejects(f.api({webLocks:null}).search(p,'one'),{code:'SEARCH_IN_PROGRESS'});assert.equal(f.calls.length,0);
});
test('malformed successful confirmation stays uncertain and preserves pending action',async()=>{
 const f=fixture(),a=f.api();const r=await a.search(p,'one');f.setHandler(async()=>f.reply({}));assert.equal(await a.acceptResult(r),null);assert.equal(f.pending()[0][1].requestId,'one');
});
test('legacy entry without confirmation is not discarded by age',async()=>{
 const f=fixture(),payload=Product.toSearchPayload(p);const key=`comprPendingSearch:sandbox:u:${payload.url}:${payload.price}:${payload.currency}`;
 f.data[key]={requestId:'legacy',product:payload};f.setHandler(async()=>{throw Error('network');});await assert.rejects(f.api().search(p,'new'));assert.equal(f.pending()[0][1].requestId,'legacy');
});
test('authoritative released recovery cleans legacy action; local rejection does not confirm',async()=>{
 const f=fixture(),a=f.api();await a.search(p,'one');assert.equal(f.pending().length,1);assert.equal(f.calls.filter(x=>x.url.endsWith('/accept')).length,0);
 f.setHandler(async()=>f.reply({error:{code:'NO_CONFIDENT_MATCH'}},404));await assert.rejects(f.api().search(p,'two'));assert.equal(f.pending().length,0);
});
