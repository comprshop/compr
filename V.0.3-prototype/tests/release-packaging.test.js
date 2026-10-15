"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),os=require("node:os"),cp=require("node:child_process");
const root=path.resolve(__dirname,"../..");
function stage(overrides={}){
  const out=fs.mkdtempSync(path.join(os.tmpdir(),"compr-release-"));
  const env={...process.env,COMPR_RELEASE_API_URL:"https://compr-backend.onrender.com",COMPR_RELEASE_SUPABASE_URL:"https://taosgvfdnblnopaywimf.supabase.co",COMPR_RELEASE_SUPABASE_PUBLIC_KEY:"sb_publishable_cZtYQI3ApFTw8kU2a2AoBQ_nGdlSw1W",COMPR_RELEASE_AUTH_CALLBACK_URL:"https://getcompr.nl/auth-callback.html",...overrides};
  const result=cp.spawnSync(process.execPath,[path.join(root,"tools/stage-safari-release.mjs"),out],{env,encoding:"utf8"});
  return {out,result};
}
test("Release staging creates an explicit production-only runtime",()=>{
  const {out,result}=stage(); assert.equal(result.status,0,result.stderr);
  const runtime=fs.readFileSync(path.join(out,"shared/runtimeConfig.js"),"utf8");
  assert.match(runtime,/https:\/\/compr-backend\.onrender\.com/); assert.match(runtime,/taosgvfdnblnopaywimf/);
  assert.match(runtime,/"diagnosticsEnabled": false/); assert.match(runtime,/"mode": "production"/);
  assert.doesNotMatch(runtime,/sandbox|uhvukecryuvosuascics/i);
});
test("Release staging rejects mixed or missing environments",()=>{
  for(const overrides of [{COMPR_RELEASE_API_URL:"https://compr-backend-sandbox.onrender.com"},{COMPR_RELEASE_SUPABASE_URL:"https://uhvukecryuvosuascics.supabase.co"},{COMPR_RELEASE_API_URL:""}]){
    const {result}=stage(overrides); assert.notEqual(result.status,0);
  }
});
test("Release diagnostics are guarded in JavaScript and native code",()=>{
  const popup=fs.readFileSync(path.join(root,"V.0.3-prototype/safari-popup.js"),"utf8");
  const content=fs.readFileSync(path.join(root,"V.0.3-prototype/content.js"),"utf8");
  const native=fs.readFileSync(path.join(root,"safari-mac-day-kit/container-app/SafariWebExtensionHandler.swift"),"utf8");
  assert.match(popup,/diagnosticsEnabled !== true\) return null/); assert.match(content,/__comprDiagnosticsEnabled === true/);
  assert.match(native,/#if DEBUG[\s\S]*recordProductDiagnostic|recordProductDiagnostic[\s\S]*#if DEBUG/);
  assert.match(native,/DIAGNOSTICS_DISABLED/);
});
test("Privacy manifests declare only UserDefaults required-reason API",()=>{
  for(const rel of ["safari-mac-day-kit/container-app/PrivacyInfo.xcprivacy","safari-mac-day-kit/container-extension/PrivacyInfo.xcprivacy"]){
    const value=fs.readFileSync(path.join(root,rel),"utf8");
    assert.match(value,/NSPrivacyAccessedAPICategoryUserDefaults/); assert.match(value,/1C8F\.1/);
    if(rel.includes("container-app"))assert.match(value,/CA92\.1/);
    else assert.doesNotMatch(value,/CA92\.1/);
    assert.doesNotMatch(value,/NSPrivacyCollectedDataTypes/);
    assert.equal((value.match(/NSPrivacyAccessedAPICategory/g)||[]).length,1); assert.match(value,/NSPrivacyTracking<\/key><false\/>/);
  }
});
test("runtime auth guard pins production and sandbox, including foreign sandbox URLs",()=>{
 const vm=require("node:vm");
 const source=fs.readFileSync(path.join(root,"V.0.3-prototype/shared/auth.js"),"utf8");
 const prod={platform:"safari",mode:"production",authProjectRef:"taosgvfdnblnopaywimf",supabaseUrl:"https://taosgvfdnblnopaywimf.supabase.co",apiBaseUrl:"https://compr-backend.onrender.com"};
 const sandbox={mode:"sandbox-debug",authProjectRef:"uhvukecryuvosuascics",supabaseUrl:"https://uhvukecryuvosuascics.supabase.co",apiBaseUrl:"https://compr-backend-sandbox.onrender.com"};
 function run(config){vm.runInNewContext(source,{ComprRuntimeConfig:config,ComprBrowser:{}});}
 assert.doesNotThrow(()=>run(prod));assert.doesNotThrow(()=>run(sandbox));
 assert.doesNotThrow(()=>run({mode:"production",platform:"chrome"}));
 for(const config of [{...prod,apiBaseUrl:sandbox.apiBaseUrl},{...prod,authProjectRef:""},{...sandbox,supabaseUrl:prod.supabaseUrl},{...sandbox,apiBaseUrl:"https://evil-sandbox.example"},{...sandbox,authProjectRef:prod.authProjectRef}])assert.throws(()=>run(config),/RUNTIME_MISMATCH/);
 const {out,result}=stage();assert.equal(result.status,0,result.stderr);
 const generated=fs.readFileSync(path.join(out,"shared/auth.js"),"utf8");
 assert.doesNotMatch(generated,/uhvukecryuvosuascics|compr-backend-sandbox/);
 assert.throws(()=>vm.runInNewContext(generated,{ComprRuntimeConfig:{...prod,apiBaseUrl:sandbox.apiBaseUrl}}),/PRODUCTION_RUNTIME_MISMATCH/);
});
test("staging never deletes existing output and requires an explicit destination",()=>{
 const {out,result}=stage();assert.equal(result.status,0,result.stderr);
 const sentinel=path.join(out,"keep.txt");fs.writeFileSync(sentinel,"keep");
 const env={...process.env,COMPR_RELEASE_API_URL:"https://compr-backend.onrender.com",COMPR_RELEASE_SUPABASE_URL:"https://taosgvfdnblnopaywimf.supabase.co",COMPR_RELEASE_SUPABASE_PUBLIC_KEY:"sb_publishable_cZtYQI3ApFTw8kU2a2AoBQ_nGdlSw1W",COMPR_RELEASE_AUTH_CALLBACK_URL:"https://getcompr.nl/auth-callback.html"};
 for(const args of [[out],[]])assert.notEqual(cp.spawnSync(process.execPath,[path.join(root,"tools/stage-safari-release.mjs"),...args],{env}).status,0);
 assert.equal(fs.readFileSync(sentinel,"utf8"),"keep");
});
test("sandbox diagnostics remain enabled and Debug archive guard remains in place",()=>{
 const prepare=fs.readFileSync(path.join(root,"tools/prepare-isolated-safari-debug.py"),"utf8");
 assert.match(prepare,/diagnosticsEnabled=True/);
 assert.match(prepare,/Sandbox project is Debug-only/);assert.match(prepare,/Sandbox archive\/install action prohibited/);
});
test("paywall uses StoreKit prices, no fallback amounts, and exposes both legal links",()=>{
 const popup=fs.readFileSync(path.join(root,"V.0.3-prototype/safari-popup.js"),"utf8");
 const html=fs.readFileSync(path.join(root,"V.0.3-prototype/popup.html"),"utf8");
 assert.doesNotMatch(popup,/fallbackPrices/);assert.match(popup,/displayPrice/);assert.match(popup,/Price unavailable/);
 assert.match(html,/id="safariTermsLink"[^>]+https:\/\/getcompr.nl\/terms.html/);assert.match(html,/id="safariPrivacyLink"[^>]+https:\/\/getcompr.nl\/privacy.html/);
});
test("Xcode packaging adds both manifests and onboarding JS idempotently",()=>{
 const out=fs.mkdtempSync(path.join(os.tmpdir(),"compr-xcode-"));
 for(const d of ["COMPR/Resources","COMPR Extension","COMPR.xcodeproj"])fs.mkdirSync(path.join(out,d),{recursive:true});
 const phase=(id,body)=>`${id} /* Resources */ = {\n isa = PBXResourcesBuildPhase;\n files = (${body});\n };`;
 const pbx=path.join(out,"COMPR.xcodeproj/project.pbxproj");
 fs.writeFileSync(pbx,`/* End PBXBuildFile section */\n/* End PBXFileReference section */\n${phase("A".repeat(24),"/* Main.html in Resources */")}${phase("B".repeat(24),"/* manifest.json in Resources */")}`);
 const run=()=>cp.spawnSync("python3",[path.join(root,"tools/configure-xcode-privacy.py"),out],{encoding:"utf8"});
 assert.equal(run().status,0);const first=fs.readFileSync(pbx,"utf8");assert.equal(run().status,0);assert.equal(fs.readFileSync(pbx,"utf8"),first);
 assert.equal((first.match(/PrivacyInfo.xcprivacy in Resources/g)||[]).length,4);assert.match(first,/Script.js in Resources/);
 for(const [target,canonical] of [["COMPR","container-app"],["COMPR Extension","container-extension"]])assert.deepEqual(fs.readFileSync(path.join(out,target,"PrivacyInfo.xcprivacy")),fs.readFileSync(path.join(root,"safari-mac-day-kit",canonical,"PrivacyInfo.xcprivacy")));
});
test("build-time guard rejects missing or contradictory Release configuration offline",()=>{
 const {out:stageDir,result}=stage();assert.equal(result.status,0,result.stderr);
 const p=fs.mkdtempSync(path.join(os.tmpdir(),"compr-guard-"));
 fs.mkdirSync(path.join(p,"COMPR"));fs.mkdirSync(path.join(p,"COMPR Extension/Resources/shared"),{recursive:true});
 const runtime=path.join(p,"COMPR Extension/Resources/shared/runtimeConfig.js");fs.copyFileSync(path.join(stageDir,"shared/runtimeConfig.js"),runtime);
 const plist=value=>`<?xml version="1.0"?><plist version="1.0"><dict>${value}</dict></plist>`;
 fs.writeFileSync(path.join(p,"COMPR/Info.plist"),plist('<key>COMPRBackendURL</key><string>https://compr-backend.onrender.com</string>'));
 fs.writeFileSync(path.join(p,"COMPR Extension/Info.plist"),plist(''));
 const run=(configuration='Release')=>cp.spawnSync('python3',[path.join(root,'tools/verify-safari-release.py')],{env:{...process.env,SRCROOT:p,CONFIGURATION:configuration},encoding:'utf8'});
 assert.equal(run().status,0);assert.notEqual(run('Debug').status,0);
 fs.writeFileSync(runtime,fs.readFileSync(runtime,'utf8').replace('compr-backend.onrender.com','compr-backend-sandbox.onrender.com'));
 assert.notEqual(run().status,0);
});
