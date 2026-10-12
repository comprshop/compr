'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../safari-popup.js'),'utf8');
const Product=require('../shared/product');
const context={ComprProduct:Product};vm.createContext(context);vm.runInContext(source,context);
const {tabLocation,sameTabLocation,reliableSelectedSize,renderSelectedSize,renderSizeWarning}=context.ComprSafariPopup;
const nike='https://www.nike.com/nl/t/air-max-90-CN8490-100';
const sony='https://www.smythstoys.com/de/de-de/sony-wh-ch520-schwarz/p/sony';

function renderedSize(product,isDutch=true){
 const classes=new Set(['hidden']);
 const node={textContent:'',classList:{toggle:(name,hidden)=>hidden?classes.add(name):classes.delete(name)}};
 const text=renderSelectedSize(node,product,isDutch);
 return {text,hidden:classes.has('hidden')};
}
function renderedWarning(product,isDutch=true){
 const classes=new Set(['hidden']);
 const node={textContent:'',classList:{toggle:(name,hidden)=>hidden?classes.add(name):classes.delete(name)}};
 const text=renderSizeWarning(node,product,isDutch);
 return {text,hidden:classes.has('hidden')};
}

test('rendered Nike product card visibly shows EU 42 from extracted or normalized state',()=>{
 assert.deepEqual(renderedSize({selectedVariants:{size:{value:'EU 42',evidence:'dom_selected_control'}}}),{text:'Maat EU 42',hidden:false});
 assert.deepEqual(renderedSize({selectedSize:'EU 42',sizeRequired:true}),{text:'Maat EU 42',hidden:false});
 assert.deepEqual(renderedSize({size:'EU 42',sizeRequired:true}),{text:'Maat EU 42',hidden:false});
 assert.equal(reliableSelectedSize({size:'EU 42'}),'','an unproven generic size is never displayed');
 assert.deepEqual(renderedSize({selectedSize:null,size:'EU 42',sizeRequired:true}),{text:'',hidden:true},'an explicit missing extraction never falls back');
});

test('shoe without proven size shows a subtle warning',()=>{
 const result=renderedWarning({category:'Shoes',sizeRequired:true,selectedVariants:{}});
 assert.equal(result.hidden,false);assert.equal(result.text,'Let op: de maat wordt niet altijd meegenomen. Controleer bij de winkel of de prijs voor jouw maat geldt.');
});

test('clothing without proven size shows the same warning',()=>{
 assert.equal(renderedWarning({category:'Clothing',sizeRequired:true}).hidden,false);
});

test('proven apparel size shows size and suppresses warning',()=>{
 const product={category:'Shoes',sizeRequired:true,selectedVariants:{size:{value:'EU 42',evidence:'dom_selected_control'}}};
 assert.equal(renderedSize(product).text,'Maat EU 42');assert.equal(renderedWarning(product).hidden,true);
});

test('electronics without size never shows an apparel warning',()=>{
 assert.deepEqual(renderedWarning({category:'Electronics',name:'Sony WH-CH520'}),{text:'',hidden:true});
});

test('Nike is stable in its original tab context',()=>{
 const observed=tabLocation({id:7,url:nike});
 assert.equal(sameTabLocation(observed,{id:7,url:nike}),true);
});

test('same-tab navigation from Nike to Sony invalidates the observed location',()=>{
 const observed=tabLocation({id:7,url:nike});
 assert.equal(sameTabLocation(observed,{id:7,url:sony}),false);
});

test('Sony binds to the same tab id and its new URL',()=>{
 const current=tabLocation({id:7,url:sony});
 assert.equal(current.tabId,7);assert.equal(current.tabUrl,sony);
});

test('old Nike location cannot match the newly observed Sony context',()=>{
 const current=tabLocation({id:7,url:sony});
 assert.equal(sameTabLocation(current,{id:7,url:nike}),false);
});

test('Sony opened directly in a fresh tab has a valid location',()=>{
 const current=tabLocation({id:9,url:sony});
 assert.equal(sameTabLocation(current,{id:9,url:sony}),true);
});

test('two tabs with the same URL remain isolated',()=>{
 const tabA=tabLocation({id:7,url:sony});
 assert.equal(sameTabLocation(tabA,{id:8,url:sony}),false);
});

test('popup activation re-extracts only after a tab or URL change',()=>{
 assert.match(source,/window\.addEventListener\("focus"[^\n]+refreshAfterPopupActivation/);
 assert.match(source,/visibilitychange[^\n]+refreshAfterPopupActivation/);
 assert.match(source,/sameTabLocation\(observedTab,tab\)/);
 assert.match(source,/product=null;productContext=null;match=null;lastResponse=null;/);
 assert.match(source,/await detectProduct\(me\)/);
});

test('popup activation replaces a stale sign-in view after native Apple login',()=>{
 assert.match(source,/\["sign-in","guest-initializing","offline","startup-error","account-error"\]\.includes\(state\.view\)/);
 assert.match(source,/refreshPromise=initialize\(\)\.finally/);
 assert.match(source,/if\(!session\)\{showSignIn\(\);return;\}/);
 assert.match(source,/const me=await confirmAccount\(\)/);
});

test('returning from native Apple login revives the same popup before refreshing',()=>{
 const pageShow=source.slice(source.indexOf('window.addEventListener("pageshow"'),source.indexOf('window.addEventListener("pagehide"'));
 assert.match(pageShow,/disposed=false/);
 assert.match(pageShow,/if\(!initialized\)\{activationRefreshNeeded=true;return;\}/);
 assert.match(pageShow,/refreshAfterPopupActivation\(\)/);
 const pageHide=source.slice(source.indexOf('window.addEventListener("pagehide"'),source.lastIndexOf('initialized=true'));
 assert.match(pageHide,/disposed=true/);
 assert.match(pageHide,/actionGeneration\+=1/);
 assert.doesNotMatch(pageHide,/\{once:true\}/);
});

test('first-open pageshow is replayed once after interrupted initialization settles',()=>{
 const initialization=source.slice(source.lastIndexOf('await initialize()'),source.indexOf('if(new URL'));
 assert.match(initialization,/initialized=true/);
 assert.match(initialization,/if\(activationRefreshNeeded\)/);
 assert.match(initialization,/activationRefreshNeeded=false/);
 assert.match(initialization,/await refreshAfterPopupActivation\(\)/);
 assert.match(source,/\["sign-in","guest-initializing","offline","startup-error","account-error"\]\.includes\(state\.view\)/);
});

test('pre-send fail-closed context binding remains active',()=>{
 assert.match(source,/const detected=await extractActiveProduct\(\)/);
 assert.match(source,/!sameProductContext\(productContext,detected\.context\)/);
 assert.match(source,/ComprApi\.search\(actionProduct[^\n]+context:actionContext/);
});

test('Safari polish removes the retired privacy badge and localizes loading copy centrally',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../popup.html'),'utf8');
 const preview=fs.readFileSync(path.join(__dirname,'../preview/safari-mobile.html'),'utf8');
 const i18nSource=fs.readFileSync(path.join(__dirname,'../shared/i18n.js'),'utf8');
 assert.doesNotMatch(html,/Private by default|safariPrivacyBadge/);
 assert.doesNotMatch(preview,/Private by default/);
 assert.doesNotMatch(source,/Privé, tenzij jij start|Preparing a private guest session/);
 const i18nContext={globalThis:{},document:{addEventListener(){}},navigator:{language:'nl-NL'},Intl,MutationObserver:class{},NodeFilter:{SHOW_TEXT:4}};
 i18nContext.globalThis=i18nContext;vm.createContext(i18nContext);vm.runInContext(i18nSource,i18nContext);
 assert.equal(i18nContext.ComprI18n.translate('Preparing the current product page.','nl'),'Productpagina voorbereiden…');
 assert.equal(i18nContext.ComprI18n.translate('The product page took too long to load.','nl'),'De productpagina reageert te langzaam.');
 assert.match(source,/return ComprI18n\.translate\(input,"nl"\)/);
});

test('product extraction has a bounded human retry state without starting a search',()=>{
 assert.match(source,/withUiTimeout\(\(\)=>extractActiveProduct\(\),8000,"PRODUCT_TIMEOUT"\)/);
 assert.match(source,/view:"product-error"[^\n]+primary:"Try again"/);
 assert.match(source,/\["offline","account-error","startup-error","product-error"\]/);
 assert.doesNotMatch(source,/product-error[^\n]+ComprApi\.search/);
});
