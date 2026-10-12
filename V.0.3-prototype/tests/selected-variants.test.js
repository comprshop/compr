'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Sizes=require('../detectors/sizes');
const Product=require('../shared/product');

function selectedControl(value,{selected=true,system='EU'}={}) {
  const group={className:'size-selector',getAttribute:key=>key==='aria-label'?`Schoenmaat ${system}`:null,querySelector:()=>null};
  return {textContent:value,innerText:value,id:'',disabled:false,
    getAttribute:key=>key==='data-state'&&selected?'checked':key==='aria-label'?value:null,
    closest:()=>group,labels:[]};
}
function realisticSizeDocument(controls=[]) {
  return {querySelectorAll:selector=>selector==='select'?[]:selector.includes('[data-state="checked"]')?controls.filter(control=>control.getAttribute('data-state')==='checked'):[],querySelector:()=>null};
}
function withDocument(document,run){const previous=global.document;global.document=document;try{return run();}finally{global.document=previous;}}

test('realistic selected control proves EU 42; available but unselected controls never do',()=>{
  const selected=withDocument(realisticSizeDocument([selectedControl('42')]),()=>Sizes.getSelectedSize());
  assert.deepEqual(selected,{value:'EU 42',evidence:'dom_selected_control',status:'present'});
  const availableOnly=withDocument(realisticSizeDocument([selectedControl('42',{selected:false}),selectedControl('43',{selected:false})]),()=>Sizes.getSelectedSize());
  assert.equal(availableOnly.value,null);assert.equal(availableOnly.status,'missing');
});

test('same-page selected shoe size changes canonical context from EU 42 to EU 43',()=>{
  const first=withDocument(realisticSizeDocument([selectedControl('42')]),()=>Sizes.getSelectedSize());
  const second=withDocument(realisticSizeDocument([selectedControl('43')]),()=>Sizes.getSelectedSize());
  const p42=Product.toSearchPayload({name:'Nike Air Max 90',mpn:'CN8490-100',price:149.99,currency:'EUR',url:'https://nike.example/air-max-90',sizeRequired:true,selectedVariants:{size:first}});
  const p43=Product.toSearchPayload({name:'Nike Air Max 90',mpn:'CN8490-100',price:149.99,currency:'EUR',url:'https://nike.example/air-max-90',sizeRequired:true,selectedVariants:{size:second}});
  assert.equal(p42.size,'EU 42');assert.equal(p43.size,'EU 43');assert.notDeepEqual(p42.selectedVariants,p43.selectedVariants);
});

test('clothing alpha size is preserved only with selected-state evidence',()=>{
  const selected=withDocument(realisticSizeDocument([selectedControl('M',{system:''})]),()=>Sizes.getSelectedSize());
  assert.equal(selected.value,'M');
  const payload=Product.toSearchPayload({name:'T-shirt',price:30,currency:'EUR',url:'https://shop.example/shirt',sizeRequired:true,selectedVariants:{size:selected}});
  assert.equal(payload.size,'M');
});

test('canonical capacity and colour selection override generic product values with provenance',()=>{
  const payload=Product.toSearchPayload({name:'Phone',price:500,currency:'EUR',url:'https://shop.example/phone',capacity:'128 GB',color:'white',selectedVariants:{capacity:{value:'256 GB',evidence:'url_bound_variant'},color:{value:'black',evidence:'dom_selected_control'}}});
  assert.equal(payload.capacity,'256 GB');assert.equal(payload.color,'black');
  assert.deepEqual(payload.selectedVariants,{capacity:{value:'256 GB',evidence:'url_bound_variant'},color:{value:'black',evidence:'dom_selected_control'}});
});

test('unproven selected variants and available sizes never enter the outgoing payload',()=>{
  const payload=Product.toSearchPayload({name:'Shoe',price:100,currency:'EUR',url:'https://shop.example/shoe',sizeRequired:true,sizes:['EU 41','EU 42'],selectedVariants:{size:{value:'EU 42',evidence:'available_option'}}});
  assert.equal(payload.size,'');assert.equal(payload.selectedVariants,undefined);
});

test('actual popup renderer shows proven variants and keeps non-size products clean',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../safari-popup.js'),'utf8');
  const context={ComprProduct:Product};vm.createContext(context);vm.runInContext(source,context);
  const render=context.ComprSafariPopup.renderSelectedVariants;
  const node=()=>({textContent:'',hidden:true,classList:{toggle(_name,value){this.hidden=value;}}});
  const variantNode=node();render(variantNode,{selectedVariants:{size:{value:'EU 42',evidence:'dom_selected_control'}}},true);
  assert.equal(variantNode.textContent,'Maat EU 42');assert.equal(variantNode.classList.hidden,false);
  const sonyNode=node();render(sonyNode,{name:'Sony WH-CH520',color:'black'},true);
  assert.equal(sonyNode.textContent,'');assert.equal(sonyNode.classList.hidden,true);
});
