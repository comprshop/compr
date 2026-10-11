'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../safari-popup.js'),'utf8');
const context={};vm.createContext(context);vm.runInContext(source,context);
const {tabLocation,sameTabLocation}=context.ComprSafariPopup;
const nike='https://www.nike.com/nl/t/air-max-90-CN8490-100';
const sony='https://www.smythstoys.com/de/de-de/sony-wh-ch520-schwarz/p/sony';

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
 assert.match(source,/window\.addEventListener\("focus"[^\n]+refreshAfterTabNavigation/);
 assert.match(source,/visibilitychange[^\n]+refreshAfterTabNavigation/);
 assert.match(source,/sameTabLocation\(observedTab,tab\)/);
 assert.match(source,/product=null;productContext=null;match=null;lastResponse=null;/);
 assert.match(source,/await detectProduct\(me\)/);
});

test('pre-send fail-closed context binding remains active',()=>{
 assert.match(source,/const detected=await extractActiveProduct\(\)/);
 assert.match(source,/!sameProductContext\(productContext,detected\.context\)/);
 assert.match(source,/ComprApi\.search\(actionProduct[^\n]+context:actionContext/);
});
