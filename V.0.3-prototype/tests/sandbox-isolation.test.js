const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const product = require('../shared/product');
const ref = 'uhvukecryuvosuascics';
const user = '80000000-0000-4000-8000-000000000001';
const token = project => 'header.' + Buffer.from(JSON.stringify({iss:`https://${project}.supabase.co/auth/v1`,sub:user})).toString('base64url') + '.signature';
const session = project => ({access_token:token(project),refresh_token:'fixture',expires_at:4102444800});
function context(data={}, native=null, fetch=async()=>{throw Error('unexpected request');}, overrides={}, nativeMessages=[]) {
 const c={ComprRuntimeConfig:{authProjectRef:ref,supabaseUrl:`https://${ref}.supabase.co`,apiBaseUrl:'https://compr-backend-sandbox.onrender.com',platform:'safari',supabaseAnonKey:'public-fixture',...overrides},
 ComprBrowser:{runtime:{sendNativeMessage:async(_app,msg)=>{nativeMessages.push(msg);return msg.action==='auth.session'?{ok:true,session:native}:{ok:true};}},storage:{local:{get:async keys=>Object.fromEntries(keys.map(k=>[k,data[k]])),set:async values=>Object.assign(data,values),remove:async keys=>[keys].flat().forEach(k=>delete data[k])}}},
 atob:s=>Buffer.from(s,'base64').toString(),fetch,crypto:{randomUUID:()=> 'request-new'},ComprProduct:product,setTimeout,clearTimeout,AbortController,Date,URL,JSON,Error,Promise,Map};
 vm.createContext(c);
 for(const file of ['auth.js','apiClient.js']) vm.runInContext(fs.readFileSync(path.join(__dirname,'../shared',file),'utf8'),c);
 vm.runInContext('globalThis.auth=ComprAuth;globalThis.api=ComprApi;',c);
 return c;
}
test('Debug ignores production session and rejects foreign token without touching legacy storage',async()=>{
 const original=session('taosgvfdnblnopaywimf');const data={comprAuthSession:original};
 const c=context(data,original);assert.equal(await c.auth.getSession(),null);
 await assert.rejects(c.auth.setSession(original),/INVALID_AUTH_PROJECT/);
 await c.auth.clearSession({clearNative:true});assert.equal(data.comprAuthSession,original);
});
test('compact native session gains stable account ID and survives popup reopen',async()=>{
 const data={},messages=[];const a=context(data,session(ref),undefined,{},messages);assert.equal((await a.auth.getSession()).user.id,user);
 assert.equal(data[`comprAuthSession:${ref}`].projectRef,ref);
 const stored=messages.find(message=>message.action==='auth.storeSession');assert.equal(stored.projectRef,ref);assert.equal(stored.session.user.id,user);
 const b=context(data);assert.equal((await b.auth.getSession()).user.id,user);
});
test('refreshed Safari session is persisted back to project-bound native storage',async()=>{
 const expired={...session(ref),expires_at:1},messages=[];
 const refreshed={...session(ref),refresh_token:'rotated',expires_in:3600};delete refreshed.expires_at;
 const c=context({[`comprAuthSession:${ref}`]:expired},expired,async(url)=>url.includes('grant_type=refresh_token')?{ok:true,json:async()=>refreshed}:{ok:false,json:async()=>({})},{},messages);
 const result=await c.auth.getSession();assert.equal(result.refresh_token,'rotated');
 const stored=messages.filter(message=>message.action==='auth.storeSession').at(-1);
 assert.equal(stored.projectRef,ref);assert.equal(stored.session.refresh_token,'rotated');assert.equal(stored.session.user.id,user);
});
test('actual compact native session recovers request under project/account namespace',async()=>{
 const data={};let sent;const p={name:'JBL Tune 730BT Wit',price:'64.95 EUR',currency:'EUR',url:'https://expert.nl/jbl'};
 const a=context(data,session(ref),async(_url,o)=>{sent=JSON.parse(o.body);throw Error('network');});
 await assert.rejects(a.api.search(p,'request-original'),/network/);
 assert.ok(Object.keys(data).some(k=>k.startsWith(`comprPendingSearch:${ref}:${user}:`)));
 const b=context(data,null,async(_url,o)=>{sent=JSON.parse(o.body);return {ok:true,json:async()=>({offers:[]})};});
 await b.api.search(p,'request-second');assert.equal(sent.requestId,'request-original');
});
test('mixed Debug endpoints fail closed before auth or request',()=>{
 assert.throws(()=>context({},null,undefined,{supabaseUrl:'https://taosgvfdnblnopaywimf.supabase.co'}),/SANDBOX_RUNTIME_MISMATCH/);
 assert.throws(()=>context({},null,undefined,{apiBaseUrl:'https://compr-backend.onrender.com'}),/SANDBOX_RUNTIME_MISMATCH/);
});
test('logged-out Debug search never starts backend request',async()=>{
 const c=context();await assert.rejects(c.api.search({name:'test'}),e=>e.code==='AUTH_REQUIRED');
});
test('Debug container exposes only sandbox product diagnostics through readable App Group Documents',()=>{
 const swift=fs.readFileSync(path.join(__dirname,'../../safari-mac-day-kit/container-app/ViewController.swift'),'utf8');
 assert.match(swift,/#if DEBUG && os\(iOS\)[\s\S]*exposeSandboxProductDiagnostics\(\)/);
 assert.match(swift,/ComprNativeAuthConfig\.projectRef == "uhvukecryuvosuascics"/);
 assert.match(swift,/appendingPathComponent\("Documents", isDirectory: true\)/);
 assert.match(swift,/copyItem\(at: source, to: readableCopy\)/);
 assert.match(swift,/override func viewDidAppear[\s\S]*exposeSandboxProductDiagnostics\(\)[\s\S]*consumePendingAppleSignIn\(\)/);
});
test('deletion cleanup clears only the project-bound extension and native COMPR session',async()=>{
 const messages=[];const scoped=`comprAuthSession:${ref}`;const data={
  [scoped]:session(ref),comprAuthSession:session('taosgvfdnblnopaywimf'),unrelatedPreference:'keep'
 };
 const c=context(data,null,undefined,{},messages);
 await c.auth.clearSession({clearNative:true,requireNative:true});
 assert.equal(data[scoped],undefined);assert.equal(data.unrelatedPreference,'keep');assert.ok(data.comprAuthSession);
 assert.equal(JSON.stringify(messages.at(-1)),JSON.stringify({action:'auth.clear',projectRef:ref}));
 const reopened=context(data,null);assert.equal(await reopened.auth.getSession(),null);
});
test('native deletion cleanup removes COMPR session and Apple user only after project match',()=>{
 const swift=fs.readFileSync(path.join(__dirname,'../../safari-mac-day-kit/container-app/SafariWebExtensionHandler.swift'),'utf8');
 assert.match(swift,/message\["projectRef"\].*ComprNativeAuthConfig\.projectRef/);
 assert.match(swift,/removeObject\(forKey: ComprNativeAuthConfig\.sessionKey\)/);
 assert.match(swift,/removeObject\(forKey: ComprNativeAuthConfig\.appleUserKey\)/);
 assert.doesNotMatch(swift,/removePersistentDomain|dictionaryRepresentation/);
});
