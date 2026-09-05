"use strict";

const fs = require("node:fs");
const path = require("node:path");

const port = Number(process.argv[2] || 9226);
const extensionId = process.argv[3] || "fpikkglicmmlhkcmnobecnkpomfnnclh";
const productUrl = process.argv[4];
const outputName = String(process.argv[5] || "product-check").replace(/[^a-z0-9_-]+/gi, "-");
if (!productUrl) throw new Error("Usage: node practical-extension-check.js <port> <extension-id> <product-url> <output-name>");

const endpoint = `http://127.0.0.1:${port}`;
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function createTarget(url) {
  const response = await fetch(`${endpoint}/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
  if (!response.ok) throw new Error(`Could not create browser target (${response.status})`);
  return response.json();
}

async function targets() {
  const response = await fetch(`${endpoint}/json/list`);
  if (!response.ok) throw new Error(`Could not list browser targets (${response.status})`);
  return response.json();
}

function connect(target) {
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  let nextId = 1;
  const pending = new Map();
  socket.addEventListener("message", event => {
    const message = JSON.parse(String(event.data));
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result || {});
  });
  const ready = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", () => reject(new Error("CDP WebSocket connection failed")), { once: true });
  });
  return {
    async send(method, params = {}) {
      await ready;
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close() { socket.close(); }
  };
}

async function main() {
  let popup = (await targets()).find(target => target.url === `chrome-extension://${extensionId}/popup.html`);
  if (!popup) popup = await createTarget(`chrome-extension://${extensionId}/popup.html`);

  const productTarget = await createTarget(productUrl);
  await fetch(`${endpoint}/json/activate/${productTarget.id}`);
  await delay(7000);

  const productCdp = connect(productTarget);
  const extensionRoot = path.join(__dirname, "..", "V.0.3-prototype");
  const detectorFiles = [
    "detectors/price.js", "detectors/brand.js", "detectors/color.js", "detectors/material.js",
    "detectors/sizes.js", "detectors/availability.js", "detectors/policies.js",
    "detectors/discountCodes.js", "detectors/category.js", "detectors/productId.js", "content.js"
  ];
  for (const file of detectorFiles) {
    const source = fs.readFileSync(path.join(extensionRoot, file), "utf8");
    const injection = await productCdp.send("Runtime.evaluate", { expression: source, awaitPromise: true, returnByValue: true });
    if (injection.exceptionDetails && file !== "content.js") throw new Error(`Detector injection failed in ${file}`);
  }
  const detected = await productCdp.send("Runtime.evaluate", {
    expression: "getProductInfo()", awaitPromise: true, returnByValue: true
  });
  const directDetection = detected.result?.value || null;
  productCdp.close();

  const cdp = connect(popup);
  await cdp.send("Page.reload", { ignoreCache: true });
  await delay(6500);
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 400, height: 900, deviceScaleFactor: 1, mobile: false });

  const evaluated = await cdp.send("Runtime.evaluate", {
    expression: `JSON.stringify({
      state: document.querySelector('.app')?.dataset.state || '',
      productVisible: !document.getElementById('productState')?.classList.contains('hidden'),
      emptyVisible: !document.getElementById('emptyState')?.classList.contains('hidden'),
      brand: document.getElementById('productBrand')?.textContent.trim() || '',
      name: document.getElementById('productName')?.textContent.trim() || '',
      price: document.getElementById('productPrice')?.textContent.trim() || '',
      store: document.getElementById('productStore')?.textContent.trim() || '',
      availability: document.getElementById('productAvailability')?.textContent.trim() || '',
      imageLoaded: Boolean(document.getElementById('productImage')?.naturalWidth),
      account: document.getElementById('accountPlan')?.textContent.trim() || '',
      runtimeErrors: performance.getEntriesByType('resource').filter(item => item.name.includes('undefined')).length
    })`,
    returnByValue: true
  });
  const result = JSON.parse(evaluated.result.value);

  const screenshot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const screenshotPath = path.join(__dirname, "..", "tmp", `${outputName}.png`);
  fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, "base64"));
  cdp.close();

  process.stdout.write(`${JSON.stringify({ productUrl, screenshotPath, directDetection, ...result }, null, 2)}\n`);
}

main().catch(error => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
