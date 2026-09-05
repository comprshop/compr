(function(){"use strict";
const $=id=>document.getElementById(id), resultStates=new Set(["match","coupons","details","pro-yearly","pro-monthly","pro-saved"]);
function show(id,value){$(id).classList.toggle("hidden",!value);}
function render(view){
  const result=resultStates.has(view), searching=view==="searching";
  show("loader",searching);show("saving",result);show("actions",result);show("product",!["quota","offline"].includes(view));show("couponsPanel",view==="coupons");show("detailsPanel",view==="details");show("proSheet",["pro-yearly","pro-monthly"].includes(view));
  $("couponsButton").setAttribute("aria-expanded",String(view==="coupons"));$("detailsButton").setAttribute("aria-expanded",String(view==="details"));
  $("couponsButton").classList.toggle("is-selected",view==="coupons");$("detailsButton").classList.toggle("is-selected",view==="details");
  $("save").textContent=view==="pro-saved"?"Tracking ✓":"Save & track";$("save").disabled=view==="pro-saved";
  $("yearly").checked=view!=="pro-monthly";$("monthly").checked=view==="pro-monthly";
  const states={ready:["5 free checks left","Ready to compare","Exact product. Right variant. Total price.","Find this cheaper"],searching:["","Checking trusted matches…","Comparing the same product, variant and total price.","Checking…"],match:["","","","View deal"],coupons:["","","","View deal"],details:["","","","View deal"],"pro-yearly":["","","","View deal"],"pro-monthly":["","","","View deal"],"pro-saved":["","","","View deal"],"no-match":["","No reliable match","We’d rather show nothing than the wrong product.","Try again"],quota:["","You’ve used your 5 free checks","Checks return gradually over the next 7 days.","Explore COMPR Pro"],offline:["","We couldn’t complete the check","Check your connection and try again.","Try again"]}[view];
  [$("eyebrow").textContent,$("title").textContent,$("copy").textContent,$("primary").textContent]=states;
  show("primary",Boolean(states[3]));show("privacy",view==="ready");show("usage",view==="no-match");$("usage").textContent=view==="no-match"?"Your free check was not used.":"";
  show("noMatchToggle",view==="no-match");show("noMatchPanel",false);$("noMatchToggle").setAttribute("aria-expanded","false");scrollTo(0,0);
}
$("noMatchToggle").addEventListener("click",()=>{const open=$("noMatchToggle").getAttribute("aria-expanded")!=="true";$("noMatchToggle").setAttribute("aria-expanded",String(open));show("noMatchPanel",open);});
document.querySelectorAll("[data-state]").forEach(button=>button.addEventListener("click",()=>render(button.dataset.state)));render("ready");
})();
