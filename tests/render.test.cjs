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
  const filterButtons = [];
  function makeElement() {
    const listeners = new Map();
    const attributes = new Map();
    return {
      innerHTML: "", textContent: "", hidden: false, dataset: {}, value: "",
      scrollIntoView() {},
      addEventListener(type, listener) { listeners.set(type, listener); },
      setAttribute(name, value) { attributes.set(name, value); },
      getAttribute(name) { return attributes.get(name); },
      click() { listeners.get("click")?.(); }
    };
  }
  const app = makeElement();
  let appHtml = "";
  Object.defineProperty(app, "innerHTML", {
    get() { return appHtml; },
    set(value) {
      appHtml = value;
      filterButtons.length = 0;
      for (const match of value.matchAll(/<button[^>]*data-filter="([^"]+)"[^>]*>/g)) {
        const button = makeElement();
        button.dataset.filter = match[1];
        filterButtons.push(button);
      }
    }
  });
  elements.set("#app", app);
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
        if (!elements.has(selector)) elements.set(selector, makeElement());
        return elements.get(selector);
      },
      querySelectorAll(selector) { return selector === "[data-filter]" ? filterButtons : []; }
    },
    fetch: async url => ({ ok: true, json: async () => url.includes("site.json") ? site : records })
  };
  const context = vm.createContext(page);
  vm.runInContext(code, context);
  return { context, elements, navigations, filterButtons };
}

test("only approved content appears and the selected article is featured", async () => {
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

test("three discovery layers, HPE, and detailed topics filter approved articles", async () => {
  const { context, elements } = createPage();
  await context.load();
  const html = elements.get("#app").innerHTML;
  const approved = materials.filter(item => item.status === "已核准");
  assert.ok(html.indexOf('id="topics"') < html.indexOf('id="articles"'));
  assert.match(html, /id="hpe"/);
  for (const layer of ["application", "integration", "infrastructure"]) {
    const found = context.filteredItems(`layer:${layer}`, "");
    assert.ok(found.length > 0);
    assert.ok(found.length < approved.length);
  }
  const matching = approved.filter(item => item.topicId === "competitive-positioning");
  context.setDiscovery("topic:competitive-positioning", "");
  assert.equal(elements.get(".listing-title").textContent, "產品定位比較");
  assert.equal(elements.get(".result-count").textContent, `共 ${matching.length} 篇`);
  assert.match(elements.get(".cards").innerHTML, /VMware 有哪些替代方案/);
  assert.doesNotMatch(elements.get(".cards").innerHTML, /HPE Smart Choice/);
  context.setDiscovery("hpe", "");
  assert.equal(elements.get(".listing-title").textContent, "HPE 專區文章");
  assert.ok(context.filteredItems("hpe", "").every(item => context.isHpe(item)));
  context.setDiscovery("all", "");
  assert.equal(elements.get(".result-count").textContent, `共 ${approved.length} 篇`);
  assert.equal(elements.get(".reset-filter").hidden, true);
});

test("search finds title, topic, summary and body; no-match state can be cleared", async () => {
  const { context, elements, navigations } = createPage();
  await context.load();
  assert.equal(context.filteredItems("all", "Smart Choice")[0].id, "material-16");
  assert.ok(context.filteredItems("all", "產品定位比較").length > 0);
  assert.ok(context.filteredItems("all", "派工").some(item => item.id === "material-13"));
  context.setDiscovery("all", "絕對不會出現的詞");
  assert.equal(elements.get(".result-count").textContent, "共 0 篇");
  assert.match(elements.get(".cards").innerHTML, /還沒有找到符合的文章/);
  assert.match(navigations.at(-1), /q=/);
  context.setDiscovery("all", "");
  assert.equal(elements.get(".reset-filter").hidden, true);
});

test("legacy material links open the separate article page", async () => {
  const { context, elements, navigations } = createPage({ hash: "#material-19" });
  await context.load();
  assert.deepEqual(navigations, ["?article=material-19"]);
  assert.match(elements.get("#app").innerHTML, /VMware 有哪些替代方案/);
  assert.match(elements.get("#app").innerHTML, /回到所有文章/);
});

test("long article uses its existing section titles for headings and a linked outline", async () => {
  const { context, elements } = createPage({ search: "?article=material-19" });
  await context.load();
  const html = elements.get("#app").innerHTML;
  assert.match(html, /<nav class="article-toc" aria-label="本文段落">/);
  assert.match(html, /<h2 id="section-1">VMware 替代，不只是換掉 ESXi<\/h2>/);
  assert.match(html, /<a href="#section-1">VMware 替代，不只是換掉 ESXi<\/a>/);
  assert.match(html, /<h3 id="section-\d+">適合評估的情境<\/h3>/);
  const oldText = materials.find(item => item.id === "material-19").body;
  assert.match(oldText, /VMware 替代，不只是換掉 ESXi/);
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
