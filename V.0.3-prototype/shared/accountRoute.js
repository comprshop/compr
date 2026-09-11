(function initialiseComprAccountRoute(root) {
  "use strict";

  async function open() {
    const url = ComprBrowser.runtime.getURL("account.html");
    return ComprBrowser.tabs.create({ url });
  }

  root.ComprAccountRoute = Object.freeze({ open });
})(typeof globalThis !== "undefined" ? globalThis : self);
