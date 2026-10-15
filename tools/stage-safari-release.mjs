#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root=path.resolve(import.meta.dirname,"..");
const source=path.join(root,"V.0.3-prototype");
const platform=path.join(root,"platforms/safari");
const out=path.resolve(process.argv[2]||"");
const api=String(process.env.COMPR_RELEASE_API_URL||"").replace(/\/$/,"");
const supabase=String(process.env.COMPR_RELEASE_SUPABASE_URL||"").replace(/\/$/,"");
const key=String(process.env.COMPR_RELEASE_SUPABASE_PUBLIC_KEY||"");
const callback=String(process.env.COMPR_RELEASE_AUTH_CALLBACK_URL||"");
const expectedApi="https://compr-backend.onrender.com";
const expectedSupabase="https://taosgvfdnblnopaywimf.supabase.co";
function fail(code){throw new Error(code);}
if(!process.argv[2]||out===path.parse(out).root)fail("RELEASE_OUTPUT_REQUIRED");
if(api!==expectedApi)fail("PRODUCTION_BACKEND_MISMATCH");
if(supabase!==expectedSupabase)fail("PRODUCTION_SUPABASE_MISMATCH");
if(callback!=="https://getcompr.nl/auth-callback.html")fail("PRODUCTION_CALLBACK_MISMATCH");
if(key!=="sb_publishable_cZtYQI3ApFTw8kU2a2AoBQ_nGdlSw1W")fail("PUBLIC_SUPABASE_KEY_REQUIRED");

const ps=fs.readFileSync(path.join(root,"tools/build-safari-extension.ps1"),"utf8");
const block=ps.match(/\$files=@\(([\s\S]*?)\)\s*foreach\(\$f in \$files\)/)?.[1];
if(!block)fail("CANONICAL_ALLOWLIST_MISSING");
const files=[...block.matchAll(/'([^']+)'/g)].map(m=>m[1].replaceAll("\\","/"));
if(fs.existsSync(out) && (fs.lstatSync(out).isSymbolicLink() || fs.readdirSync(out).length))fail("RELEASE_OUTPUT_MUST_BE_EMPTY");
fs.mkdirSync(out,{recursive:true});
for(const rel of files){const from=path.join(source,rel),to=path.join(out,rel);if(!fs.statSync(from).isFile())fail(`MISSING_INPUT:${rel}`);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(from,to);}
for(const rel of ["manifest.json","platform.js"])fs.copyFileSync(path.join(platform,rel),path.join(out,rel));
function replaceOne(rel,from,to){const file=path.join(out,rel);let value=fs.readFileSync(file,"utf8");if(value.split(from).length!==2)fail(`UNEXPECTED_LAYOUT:${rel}`);fs.writeFileSync(file,value.replace(from,to));}
replaceOne("popup.html",'<script src="popup.js"></script>','<script src="platform.js"></script><script src="popup.js"></script>');
replaceOne("compare.html",'  <script src="search/demoCatalog.js"></script>\n',"");
replaceOne("search/searchProvider.js",'const BACKEND_SEARCH_URL = "http://127.0.0.1:8787/api/search";','const BACKEND_SEARCH_URL = ComprRuntimeConfig.apiBaseUrl + "/api/search";');
let provider=fs.readFileSync(path.join(out,"search/searchProvider.js"),"utf8").replaceAll("local-demo-catalog","backend").replaceAll("offline-demo","unavailable").replaceAll("ComprDemoCatalog","undefined").replaceAll("COMPR development backend unavailable; using offline demo","COMPR backend unavailable");
fs.writeFileSync(path.join(out,"search/searchProvider.js"),provider);
const authFile=path.join(out,"shared/auth.js");
const auth=fs.readFileSync(authFile,"utf8");
const sandboxGuard=/  \/\/ BEGIN SANDBOX AUTH GUARD[^\n]*\n[\s\S]*?  \/\/ END SANDBOX AUTH GUARD\n/;
if(!sandboxGuard.test(auth))fail("SANDBOX_GUARD_LAYOUT_CHANGED");
fs.writeFileSync(authFile,auth.replace(sandboxGuard,""));
const runtime=`// Generated public Safari Release configuration. Never add private server secrets here.\nconst ComprRuntimeConfig = Object.freeze(${JSON.stringify({apiBaseUrl:api,supabaseUrl:supabase,supabaseAnonKey:key,authCallbackUrl:callback,authProjectRef:"taosgvfdnblnopaywimf",mode:"production",diagnosticsEnabled:false,betaMode:false,betaAccessUrl:"https://getcompr.nl/#beta-access",storeReviewUrl:"",appStoreReviewUrl:"",platform:"safari",guestMode:false},null,2)});\n`;
fs.writeFileSync(path.join(out,"shared/runtimeConfig.js"),runtime);
const manifest=JSON.parse(fs.readFileSync(path.join(out,"manifest.json"),"utf8"));
manifest.host_permissions=[`${api}/*`,`${supabase}/*`,"https://www.ecb.europa.eu/*"];
manifest.web_accessible_resources[0].matches=["https://getcompr.nl/*"];
fs.writeFileSync(path.join(out,"manifest.json"),JSON.stringify(manifest,null,2)+"\n");
const output=fs.readdirSync(out,{recursive:true,withFileTypes:true}).filter(e=>e.isFile()).map(e=>path.join(e.parentPath,e.name));
const text=output.filter(f=>/\.(?:js|json|html|md|css)$/.test(f)).map(f=>fs.readFileSync(f,"utf8")).join("\n");
for(const forbidden of ["compr-backend-sandbox.onrender.com","uhvukecryuvosuascics","127.0.0.1","localhost","service_role","sk_live_","sk_test_"])if(text.includes(forbidden))fail(`FORBIDDEN_RELEASE_CONTENT:${forbidden}`);
console.log(`Release converter input staged: ${out}`);
