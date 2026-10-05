const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const code = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8").replace(/\nload\(\);\s*$/, "\n");
const guideCode = fs.readFileSync(path.join(__dirname, "../guide.js"), "utf8");
const viewsCode = fs.readFileSync(path.join(__dirname, "../site-views.js"), "utf8");
const site = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/site.json"), "utf8"));
const materials = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/materials.json"), "utf8"));
const guide = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/guide-recommendations.json"), "utf8"));

function createPage({ search = "", hash = "", records = materials, siteConfig = site, guideConfig = guide } = {}) {
  const elements = new Map();
  const navigations = [];
  const views = [];
  const navLinks = [];
  const topicButtons = [];
  const layerButtons = [];
  function makeElement() {
    const listeners = new Map();
    const attributes = new Map();
    return {
      innerHTML: "", textContent: "", hidden: false, dataset: {}, value: "", id: "",
      scrollIntoView() {}, closest() { return null; },
      addEventListener(type, listener) { listeners.set(type, listener); },
      setAttribute(name, value) { attributes.set(name, value); },
      removeAttribute(name) { attributes.delete(name); },
      getAttribute(name) { return attributes.get(name); },
      click() { listeners.get("click")?.({ currentTarget: this }); }
    };
  }
  const app = makeElement();
  let appHtml = "";
  Object.defineProperty(app, "innerHTML", {
    get() { return appHtml; },
    set(value) {
      appHtml = value;
      views.length = 0;
      navLinks.length = 0;
      topicButtons.length = 0;
      layerButtons.length = 0;
      for (const match of value.matchAll(/<section id="(home|hpe|cases)-view"[^>]*>/g)) {
        const section = makeElement();
        section.id = `${match[1]}-view`;
        section.hidden = match[1] !== "home";
        views.push(section);
      }
      for (const match of value.matchAll(/<a[^>]*data-site-view="(home|hpe|cases)"[^>]*>/g)) {
        const link = makeElement();
        link.dataset.siteView = match[1];
        if (match[0].includes("data-scroll-to=")) link.dataset.scrollTo = "home-search";
        navLinks.push(link);
      }
      for (const match of value.matchAll(/data-search-topic="([^"]+)"/g)) {
        const button = makeElement();
        button.dataset.searchTopic = match[1];
        topicButtons.push(button);
      }
      for (const match of value.matchAll(/data-layer-key="([^"]+)"/g)) {
        const button = makeElement();
        button.dataset.layerKey = match[1];
        layerButtons.push(button);
      }
    }
  });
  elements.set("#app", app);
  const page = {
    URL, URLSearchParams,
    location: { search, hash },
    history: { scrollRestoration: "auto", replaceState: (_state, _title, url) => navigations.push(url), pushState: (_state, _title, url) => navigations.push(url) },
    window: { scrollTo() {}, addEventListener() {} },
    requestAnimationFrame: callback => callback(),
    document: {
      title: "",
      querySelector(selector) { if (!elements.has(selector)) elements.set(selector, makeElement()); return elements.get(selector); },
      getElementById(id) { return this.querySelector(`#${id}`); },
      querySelectorAll(selector) {
        return selector === ".site-view" ? views : selector === ".site-nav a" ? navLinks : selector === "[data-search-topic]" ? topicButtons : selector === "[data-layer-key]" ? layerButtons : [];
      }
    },
    fetch: async url => ({ ok: true, json: async () => url.includes("site.json") ? siteConfig : url.includes("article-views.json") ? null : url.includes("guide-recommendations.json") ? guideConfig : records })
  };
  const context = vm.createContext(page);
  vm.runInContext(guideCode, context);
  vm.runInContext(viewsCode, context);
  vm.runInContext(code, context);
  return { context, elements, navigations, views };
}

test("home, HPE, and Xunda cases are separate views with only approved content", async () => {
  const draft = { ...materials[0], id: "draft", status: "待審", title: "未核准內容" };
  const { context, elements, views } = createPage({ records: [...materials, draft] });
  await context.load();
  const html = elements.get("#app").innerHTML;
  const home = html.slice(html.indexOf('id="home-view"'), html.indexOf('id="hpe-view"'));
  assert.match(home, /你現在最想解決什麼？|id="guide-content"/);
  assert.match(home, /id="home-search"/);
  assert.doesNotMatch(home, /HPE 贊助專區|案例公開準備中|未核准內容/);
  assert.match(html, /id="hpe-view"[^>]*hidden/);
  assert.match(html, /id="cases-view"[^>]*hidden/);
  assert.doesNotMatch(html, /article=draft|未核准內容/);
  context.showSiteView("hpe");
  assert.deepEqual(views.filter(view => !view.hidden).map(view => view.id), ["hpe-view"]);
  context.showSiteView("cases");
  assert.deepEqual(views.filter(view => !view.hidden).map(view => view.id), ["cases-view"]);
});

test("homepage layer recommendations stay outside HPE and never fill with unrelated articles", async () => {
  const { context, elements } = createPage();
  await context.load();
  context.renderSiteLayer("infrastructure");
  const html = elements.get("#site-layer-result").innerHTML;
  assert.match(html, /企業 AI Agent 地端架構/);
  assert.doesNotMatch(html, /HPE 專區|Private Cloud AI|VMware 有哪些替代方案/);
  assert.equal((html.match(/class="site-article-row"/g) || []).length, 1);
});

test("search includes all approved articles, limits results, and has an honest empty state", async () => {
  const draft = { ...materials[0], id: "draft", status: "待審", title: "HPE 未核准內容" };
  const { context, elements } = createPage({ records: [...materials, draft] });
  await context.load();
  const result = elements.get("#site-search-results");
  assert.equal(result.hidden, true);
  context.renderSiteSearch("HPE");
  assert.equal(result.hidden, false);
  assert.match(result.innerHTML, /HPE SimpliVity/);
  assert.equal((result.innerHTML.match(/class="site-article-row"/g) || []).length, 3);
  assert.doesNotMatch(result.innerHTML, /未核准內容/);
  context.renderSiteSearch("", "enterprise-adoption");
  assert.match(result.innerHTML, /企業導入方法/);
  assert.ok((result.innerHTML.match(/class="site-article-row"/g) || []).length <= 3);
  context.renderSiteSearch("絕對不會出現的詞");
  assert.match(result.innerHTML, /找不到與/);
  assert.doesNotMatch(result.innerHTML, /class="site-article-row"/);
});

test("existing category and HPE filter links open bounded search results", async () => {
  const hpe = createPage({ search: "?filter=hpe", hash: "#articles" });
  await hpe.context.load();
  assert.match(hpe.elements.get("#site-search-results").innerHTML, /HPE 專區文章/);
  assert.ok((hpe.elements.get("#site-search-results").innerHTML.match(/class="site-article-row"/g) || []).length <= 3);
  const category = createPage({ search: "?filter=topic:ai-security", hash: "#articles" });
  await category.context.load();
  assert.match(category.elements.get("#site-search-results").innerHTML, /AI 資安與治理/);
  assert.match(category.elements.get("#site-search-results").innerHTML, /怎麼守住存取邊界/);
});

test("guided recommendations retain approved articles at reviewed revisions", async () => {
  const { context, elements } = createPage();
  await context.load();
  assert.match(elements.get("#guide-content").innerHTML, /目前最接近哪種情況/);
  vm.runInContext('guidedCurrent = "r2"; guidedHistory = [{from:"start",answer:"有想做的事"}]; renderGuide();', context);
  assert.match(elements.get("#guide-content").innerHTML, /article=material-31/);
  const changed = materials.map(item => item.id === "material-31" ? { ...item, revision: "new-revision" } : item);
  const stale = createPage({ records: changed });
  await stale.context.load();
  vm.runInContext('guidedCurrent = "r2"; renderGuide();', stale.context);
  assert.doesNotMatch(stale.elements.get("#guide-content").innerHTML, /article=material-31/);
  const hpe = materials.find(item => item.id === "material-5");
  const withHpe = structuredClone(guide);
  withHpe.results.r2.articles = [{ id: hpe.id, revision: hpe.revision, why: "測試跨區" }, ...withHpe.results.r2.articles];
  const isolated = createPage({ guideConfig: withHpe });
  await isolated.context.load();
  vm.runInContext('guidedCurrent = "r2"; renderGuide();', isolated.context);
  assert.doesNotMatch(isolated.elements.get("#guide-content").innerHTML, /article=material-5/);
});

test("every approved article has one next action; editorial related links remain optional", async () => {
  const { context } = createPage();
  await context.load();
  for (const item of materials.filter(item => item.status === "已核准")) {
    const action = context.nextActionFor(item);
    assert.ok(action.title && action.why && action.checks.length === 3, item.id);
  }
  const hpe = createPage({ search: "?article=material-5" });
  await hpe.context.load();
  assert.match(hpe.elements.get("#app").innerHTML, /class="article-next-action"/);
  assert.match(hpe.elements.get("#app").innerHTML, /整理選型前提/);
  assert.match(hpe.elements.get("#app").innerHTML, /返回 HPE 專區/);
  const noRelated = createPage({ search: "?article=material-30" });
  await noRelated.context.load();
  assert.match(noRelated.elements.get("#app").innerHTML, /class="article-next-action"/);
  assert.doesNotMatch(noRelated.elements.get("#app").innerHTML, /接著想了解什麼？|class="read-sidebar"/);
});

test("legacy article links and existing reading structure still work", async () => {
  const { context, elements, navigations } = createPage({ hash: "#material-19" });
  await context.load();
  assert.deepEqual(navigations, ["?article=material-19"]);
  const html = elements.get("#app").innerHTML;
  assert.match(html, /<nav class="article-toc" aria-label="本文段落">/);
  assert.match(html, /<h2 id="section-1">VMware 替代，不只是換掉 ESXi<\/h2>/);
  assert.match(html, /查看要確認的事項/);
});

test("text, attachment paths, and public links reject unsafe values", () => {
  const { context } = createPage();
  const html = context.bodyMarkup('## <img src=x onerror="alert(1)">\n<script>alert(1)</script>\n**安全文字**');
  assert.match(html, /&lt;img/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>|<img/);
  assert.match(html, /<strong>安全文字<\/strong>/);
  assert.equal(context.safeAssetPath("assets/materials/1/中文 檔案.png"), "assets/materials/1/%E4%B8%AD%E6%96%87%20%E6%AA%94%E6%A1%88.png");
  for (const value of ["assets/materials/../private", "assets/materials/%2e%2e/private", "assets/materials/%252e%252e/private", "assets/materials/\\evil", "https://example.com/x"]) assert.equal(context.safeAssetPath(value), "");
  for (const value of ["javascript:alert(1)", "data:text/html,hello", "https://user:pass@example.com"]) assert.equal(context.safePublicUrl(value), "");
  for (const [kind, tag, ext] of [["image", "img", "png"], ["audio", "audio", "m4a"], ["video", "video", "mp4"]]) {
    const attachment = context.attachmentsMarkup({ files: [{ file: `assets/materials/2/sample.${ext}`, name: `中文附件.${ext}`, kind }] });
    assert.match(attachment, new RegExp(`<${tag}`));
    assert.match(attachment, /開啟附件：中文附件/);
  }
});
