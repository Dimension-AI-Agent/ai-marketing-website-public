const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const code = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
const context = vm.createContext({ URL });
vm.runInContext(code, context);

test("Chinese file names work and unsafe paths do not", () => {
  assert.equal(context.safeAssetHref("assets/中文 檔案.pdf"), "assets/%E4%B8%AD%E6%96%87%20%E6%AA%94%E6%A1%88.pdf");
  for (const p of ["assets/../private", "assets/%2e%2e/private", "assets/%252e%252e/private", "assets/\\evil", "https://example.com/x"]) {
    assert.equal(context.safeAssetHref(p), "");
  }
});
test("untrusted public content is escaped", () => {
  const html = context.renderMaterial({id: "material-1", title: '<img src=x onerror="alert(1)">', summary: "<script>alert(1)</script>", body: "<iframe src=x></iframe>"});
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<iframe"));
});
test("no active URL protocols or embedded credentials", () => {
  for (const value of ["javascript:alert(1)", "data:text/html,hello", "https://user:pass@example.com"]) {
    assert.equal(context.safePublicHref(value), "");
  }
});
test("images audio and video keep a file link fallback", () => {
  for (const [kind, element, ext] of [["image","img","png"], ["audio","audio","m4a"], ["video","video","mp4"]]) {
    const html = context.renderMaterial({id: "material-2", files: [{file: "assets/sample."+ext, name: "中文附件."+ext, kind}]});
    assert.ok(html.includes("<"+element));
    assert.ok(html.includes("開啟附件：中文附件."));
  }
});
test("text-only submissions have readable content without an empty file link", () => {
  const html = context.renderMaterial({title: "Article", summary: "Summary", body: "Text\nparagraph"});
  assert.ok(html.includes("閱讀全文"));
  assert.ok(html.includes("Text\nparagraph"));
  assert.ok(!html.includes('href=""'));
});
test("page counts only approved content", async () => {
  const elements = new Map();
  const local = vm.createContext({
    URL,
    location: { hash: "" },
    document: {
      querySelector(key) {
        if (!elements.has(key)) elements.set(key, {});
        return elements.get(key);
      },
      getElementById() { return null; },
    },
    fetch: async (url) => ({ok: true, json: async () => url.includes("site.json")
      ? { tracks: [], formats: [] }
      : [{id:"approved", status:"已核准"}, {id:"draft", status:"待審"}] }),
  });
  vm.runInContext(code, local);
  await local.loadContent();
  assert.equal(Number(elements.get("#material-count").textContent), 1);
});
