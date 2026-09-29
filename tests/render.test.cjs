const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const code = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8").replace(/\nload\(\);\s*$/, "\n");
const site = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/site.json"), "utf8"));
const materials = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/materials.json"), "utf8"));

function createPage({ search = "", hash = "", records = materials } = {}) {
  const elements = new Map();
  const navigations = [];
  const page = {
    URL,
    URLSearchParams,
    location: { search, hash },
    history: { scrollRestoration: "auto", replaceState: (_state, _title, url) => navigations.push(url) },
    window: { scrollTo() {}, addEventListener() {} },
    requestAnimationFrame: callback => callback(),
    document: {
      title: "",
      querySelector(selector) {
        if (!elements.has(selector)) elements.set(selector, { innerHTML: "", textContent: "", scrollIntoView() {} });
        return elements.get(selector);
      },
      querySelectorAll() { return []; }
    },
    fetch: async url => ({ ok: true, json: async () => url.includes("site.json") ? site : records })
  };
  const context = vm.createContext(page);
  vm.runInContext(code, context);
  return { context, elements, navigations };
}

test("only approved content appears and Mark's selected article is featured", async () => {
  const draft = { ...materials[0], id: "draft", status: "待審", title: "未核准內容" };
  const { context, elements } = createPage({ records: [...materials, draft] });
  await context.load();
  const html = elements.get("#app").innerHTML;
  const approvedCount = materials.filter(item => item.status === "已核准").length;
  assert.match(html, new RegExp(`共 ${approvedCount} 篇`));
  assert.match(html, /class="focus-label">焦點文章/);
  assert.match(html, /article=material-13/);
  assert.doesNotMatch(html, /未核准內容/);
  assert.equal(site.featuredMaterialId, "material-13");
});

test("legacy material links open the separate article page", async () => {
  const { context, elements, navigations } = createPage({ hash: "#material-19" });
  await context.load();
  assert.deepEqual(navigations, ["?article=material-19"]);
  assert.match(elements.get("#app").innerHTML, /VMware 有哪些替代方案/);
  assert.match(elements.get("#app").innerHTML, /回到所有文章/);
});

test("text and article Markdown are escaped", () => {
  const { context } = createPage();
  const html = context.bodyMarkup('## <img src=x onerror="alert(1)">\n<script>alert(1)</script>\n**安全文字**');
  assert.match(html, /&lt;img/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>|<img/);
  assert.match(html, /<strong>安全文字<\/strong>/);
});

test("asset paths and external links reject unsafe values", () => {
  const { context } = createPage();
  assert.equal(context.safeAssetPath("assets/materials/1/中文 檔案.png"), "assets/materials/1/%E4%B8%AD%E6%96%87%20%E6%AA%94%E6%A1%88.png");
  for (const value of ["assets/materials/../private", "assets/materials/%2e%2e/private", "assets/materials/%252e%252e/private", "assets/materials/\\evil", "https://example.com/x"]) {
    assert.equal(context.safeAssetPath(value), "");
  }
  for (const value of ["javascript:alert(1)", "data:text/html,hello", "https://user:pass@example.com"]) {
    assert.equal(context.safePublicUrl(value), "");
  }
});

test("image, audio and video previews retain file links", () => {
  const { context } = createPage();
  for (const [kind, element, ext] of [["image", "img", "png"], ["audio", "audio", "m4a"], ["video", "video", "mp4"]]) {
    const html = context.attachmentsMarkup({ files: [{ file: `assets/materials/2/sample.${ext}`, name: `中文附件.${ext}`, kind }] });
    assert.match(html, new RegExp(`<${element}`));
    assert.match(html, /開啟附件：中文附件/);
  }
});
