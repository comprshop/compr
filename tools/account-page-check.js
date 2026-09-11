"use strict";
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const port = Number(process.argv[2] || 9236);
const endpoint = `http://127.0.0.1:${port}`;
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
function connect(target) {
  const socket = new WebSocket(target.webSocketDebuggerUrl); let nextId = 1; const pending = new Map();
  socket.addEventListener("message", event => { const message = JSON.parse(String(event.data)); if (!pending.has(message.id)) return;
    const promise = pending.get(message.id); pending.delete(message.id); message.error ? promise.reject(new Error(message.error.message)) : promise.resolve(message.result || {}); });
  const ready = new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  return { async send(method, params = {}) { await ready; const id = nextId++; return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); }); }, close() { socket.close(); } };
}
async function main() {
  await delay(1500);
  const targets = await (await fetch(`${endpoint}/json/list`)).json();
  const accountUrl = pathToFileURL(path.join(__dirname, "..", "V.0.3-prototype", "account.html")).href;
  const page = targets.find(target => target.url === accountUrl) ||
    await (await fetch(`${endpoint}/json/new?${encodeURIComponent(accountUrl)}`, { method: "PUT" })).json();
  const cdp = connect(page); const results = [];
  await cdp.send("Runtime.enable"); await cdp.send("Page.enable"); await delay(700);
  for (const viewport of [{ width: 320, height: 800 }, { width: 390, height: 844 }, { width: 768, height: 1024 }]) {
    await cdp.send("Emulation.setDeviceMetricsOverride", { ...viewport, deviceScaleFactor: 1, mobile: false });
    await delay(120);
    const evaluated = await cdp.send("Runtime.evaluate", { expression: `JSON.stringify({
      width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      overflowFree: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      title: document.title, body: document.body.innerText.slice(0,80),
      emailHeight: document.getElementById('email')?.getBoundingClientRect().height || 0,
      sendHeight: document.getElementById('sendCode')?.getBoundingClientRect().height || 0,
      closeHeight: document.getElementById('closeAccount')?.getBoundingClientRect().height || 0,
      focused: document.activeElement && document.activeElement.id
    })`, returnByValue: true });
    if (evaluated.exceptionDetails) throw new Error(JSON.stringify(evaluated.exceptionDetails));
    results.push({ viewport: `${viewport.width}x${viewport.height}`, ...JSON.parse(evaluated.result.value) });
  }
  cdp.close(); process.stdout.write(`${JSON.stringify({ results }, null, 2)}\n`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
