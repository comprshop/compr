const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const popupHtml = fs.readFileSync(path.join(root, "popup.html"), "utf8");
const compareHtml = fs.readFileSync(path.join(root, "compare.html"), "utf8");
const popupCss = fs.readFileSync(path.join(root, "styles", "popup.css"), "utf8");
const compareCss = fs.readFileSync(path.join(root, "styles", "compare.css"), "utf8");

test("human refinement uses a restrained shared product vocabulary", () => {
  for (const css of [popupCss, compareCss]) {
    for (const token of [
      "--compr-warning", "--compr-focus", "--compr-space-sm", "--compr-space-md",
      "--compr-space-lg", "--compr-radius-sm", "--compr-radius-md", "--compr-radius-lg",
      "--compr-shadow-low", "--compr-shadow-high", "--compr-control-compact", "--compr-control-normal"
    ]) assert.ok(css.includes(token), `missing ${token}`);
    const refinement = css.slice(css.lastIndexOf("Human product refinement"));
    assert.doesNotMatch(refinement, /linear-gradient|radial-gradient/);
  }
  assert.match(popupCss, /html \{ width: 380px; min-width: 380px; max-width: 380px/);
});

test("visible product copy is concrete rather than generic marketing copy", () => {
  assert.match(popupHtml, />Compare before you buy\.<\/p>/);
  assert.match(popupHtml, />COMPR account<\/span>/);
  assert.doesNotMatch(popupHtml, />Shop smarter\.<\/p>/);
  assert.match(compareHtml, /Saved product comparison/);
  assert.match(compareHtml, />\s*Price check\s*</);
  assert.match(compareHtml, />Saved products at a glance\.</);
});
