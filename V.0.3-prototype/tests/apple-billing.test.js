"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const billing = require("../shared/appleBilling.js");

test("Apple billing accepts all four configured product identifiers", () => {
  assert.deepEqual(billing.normaliseProduct({
    id: billing.PRODUCT_IDS.proMonthly, displayName: "COMPR Pro", displayPrice: "€ 2,99"
  }), { id: billing.PRODUCT_IDS.proMonthly, displayName: "COMPR Pro", displayPrice: "€ 2,99" });
  assert.deepEqual(billing.normaliseProduct({
    id: billing.PRODUCT_IDS.ultimateYearly, displayName: "COMPR Ultimate", displayPrice: "$34.99"
  }), { id: billing.PRODUCT_IDS.ultimateYearly, displayName: "COMPR Ultimate", displayPrice: "$34.99" });
  assert.equal(billing.normaliseProduct({ id: "hostile.product", displayName: "Wrong", displayPrice: "€0" }), null);
  assert.equal(billing.normaliseProduct({ id: billing.PRODUCT_IDS.proYearly, displayName: "", displayPrice: "€ 19,99" }), null);
});

test("Apple billing fails before native messaging outside Safari", async () => {
  let called = false;
  globalThis.ComprRuntimeConfig = { platform: "chrome" };
  globalThis.ComprBrowser = { runtime: { sendNativeMessage: async () => { called = true; } } };
  await assert.rejects(billing.listProducts(), error => error.code === "APPLE_BILLING_UNAVAILABLE");
  assert.equal(called, false);
});

test("Apple billing product listing sends one fixed action and filters native output", async () => {
  let request;
  globalThis.ComprRuntimeConfig = { platform: "safari" };
  globalThis.ComprBrowser = { runtime: { sendNativeMessage: async (applicationId, message) => {
    request = { applicationId, message };
    return { ok: true, products: [
      { id: billing.PRODUCT_IDS.proYearly, displayName: "COMPR Pro Annual", displayPrice: "€ 19,99" },
      { id: billing.PRODUCT_IDS.ultimateMonthly, displayName: "COMPR Ultimate", displayPrice: "€ 4,99" },
      { id: "wrong.product", displayName: "Wrong", displayPrice: "€ 0" }
    ] };
  } } };
  const products = await billing.listProducts();
  assert.deepEqual(request, { applicationId: "nl.getcompr.compr", message: { action: "billing.products" } });
  assert.equal(products.length, 2);
  assert.deepEqual(products.map(product => product.id), [billing.PRODUCT_IDS.proYearly, billing.PRODUCT_IDS.ultimateMonthly]);
  assert.equal(Object.isFrozen(products), true);
});

test("Apple purchase requires an allowlisted product and account UUID", async () => {
  const calls=[];
  globalThis.ComprBrowser={runtime:{sendNativeMessage:async(applicationId,message)=>{
    calls.push({applicationId,message});return {ok:true,status:"success",transactionId:"2000001",signedTransactionInfo:"a.b.c"};
  }}};
  const result=await billing.purchase(billing.PRODUCT_IDS.ultimateMonthly,"11111111-1111-4111-8111-111111111111");
  assert.equal(result.signedTransactionInfo,"a.b.c");
  assert.deepEqual(calls[0].message,{action:"billing.purchase",productId:billing.PRODUCT_IDS.ultimateMonthly,
    appAccountToken:"11111111-1111-4111-8111-111111111111"});
  await billing.purchase(billing.PRODUCT_IDS.ultimateYearly,"11111111-1111-4111-8111-111111111111");
  assert.equal(calls[1].message.productId,billing.PRODUCT_IDS.ultimateYearly);
  await assert.rejects(billing.purchase("attacker.product","11111111-1111-4111-8111-111111111111"),
    error=>error.code==="APPLE_PURCHASE_INVALID");
  assert.equal(calls.length,2);
});

test("restore filters malformed transaction data and finish accepts bounded identifiers", async () => {
  const actions=[];
  globalThis.ComprBrowser={runtime:{sendNativeMessage:async(_applicationId,message)=>{
    actions.push(message);
    if(message.action==="billing.restore")return {ok:true,transactions:[
      {transactionId:"2000001",signedTransactionInfo:"a.b.c"},{transactionId:"bad/id",signedTransactionInfo:"bad"}
    ]};
    return {ok:true};
  }}};
  const restored=await billing.restore();assert.equal(restored.length,1);
  await billing.finish(restored[0].transactionId);
  assert.deepEqual(actions.map(item=>item.action),["billing.restore","billing.finish"]);
});
