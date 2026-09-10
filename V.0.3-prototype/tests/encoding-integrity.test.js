const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const extensionRoot = path.resolve(__dirname, "..");
const repositoryRoot = path.resolve(extensionRoot, "..");
const textExtensions = new Set([".html", ".js", ".css", ".json", ".md"]);
const mojibakeMarkers = [
  String.fromCodePoint(0x00e2, 0x20ac),
  String.fromCodePoint(0x00c3),
  String.fromCodePoint(0xfffd)
];

function textFiles(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) return entry.name === "tests" ? [] : textFiles(absolute);
    return textExtensions.has(path.extname(entry.name)) ? [absolute] : [];
  });
}

test("runtime sources and production gates reject mojibake", () => {
  const failures = [];
  for (const file of textFiles(extensionRoot)) {
    const source = fs.readFileSync(file, "utf8");
    for (const marker of mojibakeMarkers) {
      if (source.includes(marker)) failures.push(path.relative(extensionRoot, file));
    }
  }
  assert.deepEqual(failures, []);

  for (const page of ["popup.html", "compare.html", "auth-receiver.html"]) {
    const html = fs.readFileSync(path.join(extensionRoot, page), "utf8");
    assert.match(html.slice(0, 300), /<meta charset="utf-8">/i, `${page} must declare UTF-8 early`);
  }

  const moduleSource = fs.readFileSync(path.join(repositoryRoot, "tools", "extension-production-staging.psm1"), "utf8");
  const chromeBuild = fs.readFileSync(path.join(repositoryRoot, "tools", "build-production-extension.ps1"), "utf8");
  const safariBuild = fs.readFileSync(path.join(repositoryRoot, "tools", "build-safari-extension.ps1"), "utf8");
  assert.match(moduleSource, /Mojibake detected in production output/);
  assert.match(chromeBuild, /build\\chrome-manual-smoke/);
  assert.match(chromeBuild, /Get-Content[^\r\n]+-Encoding utf8/);
  assert.match(safariBuild, /Get-Content[^\r\n]+-Encoding utf8/);
  assert.match(safariBuild, /Assert-ExtensionOutputSafety/);
});
