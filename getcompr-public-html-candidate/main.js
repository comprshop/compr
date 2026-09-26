"use strict";
const COMPR_LINKS=Object.freeze({chrome:"https://chromewebstore.google.com/detail/compr/fpikkglicmmlhkcmnobecnkpomfnnclh",safari:""});
document.querySelectorAll(".store-link[data-store]").forEach(link=>{const url=COMPR_LINKS[link.dataset.store];if(url){link.href=url;link.target="_blank";link.rel="noopener noreferrer";}});
document.querySelectorAll("[data-year]").forEach(node=>{node.textContent=new Date().getFullYear();});
const menu=document.querySelector(".menu-button"),nav=document.getElementById("primary-nav");
if(menu&&nav){menu.addEventListener("click",()=>{const open=menu.getAttribute("aria-expanded")==="true";menu.setAttribute("aria-expanded",String(!open));menu.querySelector(".sr-only").textContent=open?"Open menu":"Close menu";nav.classList.toggle("is-open",!open);});nav.addEventListener("click",event=>{if(event.target.closest("a")){menu.setAttribute("aria-expanded","false");menu.querySelector(".sr-only").textContent="Open menu";nav.classList.remove("is-open");}});}
