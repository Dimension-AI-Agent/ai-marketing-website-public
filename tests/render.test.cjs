const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const code = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8").replace(/\nload\(\);\s*$/, "\n");
const guideCode = fs.readFileSync(path.join(__dirname, "../guide.js"), "utf8");
const libraryCode = fs.readFileSync(path.join(__dirname, "../library.js"), "utf8");
const viewsCode = fs.readFileSync(path.join(__dirname, "../site-views.js"), "utf8");
const sceneCode = fs.readFileSync(path.join(__dirname, "../scene-explorer.js"), "utf8");
const site = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/site.json"), "utf8"));
const materials = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/materials.json"), "utf8"));
const guide = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/guide-recommendations.json"), "utf8"));

function createPage({ search = "", hash = "", records = materials, siteConfig = site, guideConfig = guide, reducedMotion = false } = {}) {
  const elements = new Map();
  const navigations = [];
  const timers = new Map();
  const views = [];
  const navLinks = [];
  const topicButtons = [];
  const layerButtons = [];
  function makeElement() {
    const listeners = new Map();
    const attributes = new Map();
    const classes = new Set();
    return {
      innerHTML: "", textContent: "", hidden: false, dataset: {}, value: "", id: "",
      classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) },
      scrollIntoView() {}, focus() {}, closest() { return null; },
      addEventListener(type, listener) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(listener); },
      dispatch(type, event) { listeners.get(type)?.forEach(listener => listener(event)); },
      setAttribute(name, value) { attributes.set(name, value); },
      removeAttribute(name) { attributes.delete(name); },
      getAttribute(name) { return attributes.get(name); },
      click() { listeners.get("click")?.forEach(listener => listener({ currentTarget: this })); }
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
      for (const match of value.matchAll(/<section id="(home|hpe|cases|all-articles|layer-application|layer-integration|layer-infrastructure)-view"[^>]*>/g)) {
        const section = makeElement();
        section.id = `${match[1]}-view`;
        section.hidden = match[1] !== "home";
        views.push(section);
      }
      for (const match of value.matchAll(/<a[^>]*data-site-view="(home|hpe|cases|all-articles)"[^>]*>/g)) {
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
  const location = { search, hash };
  function navigate(url) {
    navigations.push(url);
    const next = new URL(url, "https://example.test/");
    location.search = next.search; location.hash = next.hash;
  }
  const page = {
    URL, URLSearchParams,
    location,
    history: { scrollRestoration: "auto", replaceState: (_state, _title, url) => navigate(url), pushState: (_state, _title, url) => navigate(url) },
    window: {
      scrollTo() {}, addEventListener() {},
      matchMedia: () => ({ matches: reducedMotion }),
      setTimeout(callback) { const id = timers.size + 1; timers.set(id, callback); return id; },
      clearTimeout(id) { timers.delete(id); }
    },
    requestAnimationFrame: callback => callback(),
    document: {
      title: "",
      // This fixture models routing and article markup, not a WebGL canvas.
      querySelector(selector) { if (selector.startsWith('[data-scene-floor=')) return null; if (!elements.has(selector)) elements.set(selector, makeElement()); return elements.get(selector); },
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
  vm.runInContext(sceneCode, context);
  vm.runInContext(libraryCode, context);
  vm.runInContext(code, context);
  return { context, elements, navigations, views, timers };
}

test("home, HPE, and Xunda cases are separate views with only approved content", async () => {
  const draft = { ...materials[0], id: "draft", status: "待審", title: "未核准內容" };
  const { context, elements, views } = createPage({ records: [...materials, draft] });
  await context.load();
  const html = elements.get("#app").innerHTML;
  const home = html.slice(html.indexOf('id="home-view"'), html.indexOf('id="all-articles-view"'));
  assert.match(home, /你現在最想解決什麼？|id="guide-content"/);
  assert.doesNotMatch(home, /id="home-search"|site-search-form/);
  assert.match(html, /href="\.\/#all-articles" data-site-view="all-articles">所有文章/);
  assert.doesNotMatch(home, /HPE 贊助專區|案例公開準備中|未核准內容/);
  assert.match(html, /id="hpe-view"[^>]*hidden/);
  assert.match(html, /id="cases-view"[^>]*hidden/);
  assert.doesNotMatch(html, /article=draft|未核准內容/);
  context.showSiteView("hpe");
  assert.deepEqual(views.filter(view => !view.hidden).map(view => view.id), ["hpe-view"]);
  context.showSiteView("cases");
  assert.deepEqual(views.filter(view => !view.hidden).map(view => view.id), ["cases-view"]);
});

test("customer case intake IDs reach only the approved Xunda view and remain searchable", async () => {
  // Test fixtures are never added to the published material catalog.
  const approved = { id: "test-case", topicId: "xunda-customer-cases", status: "已核准", title: "測試用 HPE 客戶實績 <script>", summary: "測試用摘要", body: "測試用正文" };
  const draft = { ...approved, id: "test-draft", status: "待審", title: "未核准客戶實績" };
  const page = createPage({ records: [...materials, approved, draft], hash: "#cases" });
  await page.context.load();
  const html = page.elements.get("#app").innerHTML;
  const cases = html.slice(html.indexOf('id="cases-view"'));
  const hpe = html.slice(html.indexOf('id="hpe-view"'), html.indexOf('id="cases-view"'));
  assert.match(cases, /article=test-case/);
  assert.match(cases, /&lt;script&gt;/);
  assert.doesNotMatch(cases, /案例公開準備中|article=material-13|article=material-37|test-draft|<script>/);
  assert.doesNotMatch(hpe, /article=test-case/);
  assert.deepEqual(page.views.filter(view => !view.hidden).map(view => view.id), ["cases-view"]);
  page.context.updateLibrary("xunda-customer-cases", "");
  assert.match(page.elements.get("#library-results").innerHTML, /客戶導入實績|article=test-case/);
  assert.doesNotMatch(page.elements.get("#library-results").innerHTML, /test-draft/);
  const article = createPage({ records: [approved], search: "?article=test-case" });
  await article.context.load();
  assert.match(article.elements.get("#app").innerHTML, /href="\.\/#cases">← 返回訊達成功案例/);
  assert.doesNotMatch(article.elements.get("#app").innerHTML, /返回 HPE 專區/);
});

test("HPE application cases appear in HPE even beyond the featured articles", async () => {
  const item = { id: "test-hpe-case", topicId: "hpe-use-cases", status: "已核准", title: "測試用官方案例", summary: "測試用摘要" };
  const page = createPage({ records: [...materials, item], hash: "#hpe" });
  await page.context.load();
  const html = page.elements.get("#app").innerHTML;
  const hpe = html.slice(html.indexOf('id="hpe-view"'), html.indexOf('id="cases-view"'));
  assert.match(hpe, /HPE 應用情境與案例|article=test-hpe-case/);
  assert.match(hpe, /article=test-hpe-case/);
  assert.doesNotMatch(html.slice(html.indexOf('id="cases-view"')), /article=test-hpe-case/);
});

test("empty Xunda view never adopts legacy industry or HPE cases as customer successes", async () => {
  const page = createPage({ records: materials.filter(item => item.topicId !== "xunda-customer-cases") });
  await page.context.load();
  const cases = page.elements.get("#app").innerHTML.split('id="cases-view"')[1];
  assert.match(cases, /案例公開準備中/);
  assert.doesNotMatch(cases, /article=material-/);
});

test("layer pages keep their own approved articles outside HPE", async () => {
  const { context, elements, views } = createPage();
  await context.load();
  context.renderSiteLayer("infrastructure");
  assert.deepEqual(views.filter(view => !view.hidden).map(view => view.id), ["layer-infrastructure-view"]);
  const all = elements.get("#app").innerHTML;
  const html = all.slice(all.indexOf('id="layer-infrastructure-view"'), all.indexOf('id="hpe-view"'));
  assert.match(html, /企業 AI Agent 地端架構/);
  assert.doesNotMatch(html, /Private Cloud AI|VMware 有哪些替代方案/);
  assert.equal((html.match(/class="site-article-row"/g) || []).length, 1);
  assert.doesNotMatch(all, /id="site-layer-result"/);
});

test("map links enter dedicated layer routes rather than an inline panel", async () => {
  const page = createPage();
  await page.context.load();
  const html = page.elements.get("#app").innerHTML;
  for (const key of ["application", "integration", "infrastructure"]) {
    assert.match(html, new RegExp(`<a href="\\./#layer-${key}" class="site-visual-tag[^>]*data-layer-key="${key}"`));
    const link = { dataset: { layerKey: key } };
    let prevented = false;
    page.elements.get("#app").dispatch("click", { preventDefault() { prevented = true; }, target: { closest: selector => selector === "[data-layer-key]" ? link : null } });
    assert.equal(prevented, true);
    assert.deepEqual(page.views.filter(view => !view.hidden).map(view => view.id), [`layer-${key}-view`]);
    assert.equal(page.navigations.at(-1), `./#layer-${key}`);
  }
  const still = createPage({ reducedMotion: true });
  await still.context.load();
  still.context.document.querySelector(".site-hero-visual img").animate = () => { throw new Error("Reduced motion must skip the camera move"); };
  await still.context.zoomToSiteLayer("integration");
  assert.deepEqual(still.views.filter(view => !view.hidden).map(view => view.id), ["layer-integration-view"]);
  assert.equal(still.timers.size, 0);
});

test("layer deep links survive reload and returning to the map restores the homepage", async () => {
  for (const key of ["application", "integration", "infrastructure"]) {
    const page = createPage({ hash: `#layer-${key}` });
    await page.context.load();
    assert.deepEqual(page.views.filter(view => !view.hidden).map(view => view.id), [`layer-${key}-view`]);
    assert.match(page.context.document.title, /應用情境|導入整合|基礎架構/);
    page.context.showSiteView("home", "", true);
    assert.deepEqual(page.views.filter(view => !view.hidden).map(view => view.id), ["home-view"]);
    assert.equal(page.navigations.at(-1), "./#home");
    const articles = createPage({ hash: `#layer-${key}-articles` });
    await articles.context.load();
    assert.deepEqual(articles.views.filter(view => !view.hidden).map(view => view.id), [`layer-${key}-view`]);
  }
});

test("library lists all approved articles and supports category search and empty results", async () => {
  const draft = { ...materials[0], id: "draft", status: "待審", title: "HPE 未核准內容" };
  const { context, elements, views } = createPage({ records: [...materials, draft], hash: "#all-articles" });
  await context.load();
  const result = elements.get("#library-results");
  assert.equal((result.innerHTML.match(/class="library-article"/g) || []).length, materials.filter(item => item.status === "已核准").length);
  assert.doesNotMatch(result.innerHTML, /未核准內容/);
  assert.deepEqual(views.filter(view => !view.hidden).map(view => view.id), ["all-articles-view"]);
  context.updateLibrary("enterprise-adoption", "");
  const categoryCount = materials.filter(item => item.status === "已核准" && item.topicId === "enterprise-adoption").length;
  assert.equal(elements.get("#library-count").textContent, `${categoryCount} 篇文章`);
  assert.ok(categoryCount > 3);
  context.updateLibrary("enterprise-adoption", "PoC");
  assert.match(result.innerHTML, /PoC/);
  assert.doesNotMatch(result.innerHTML, /SimpliVity/);
  context.updateLibrary("", "絕對不會出現的詞");
  assert.match(result.innerHTML, /沒有找到相符的文章/);
  assert.doesNotMatch(result.innerHTML, /class="library-article"/);
  context.updateLibrary("software", "");
  assert.match(result.innerHTML, /這個分類還沒有文章/);
});

test("library taxonomy follows current site configuration, including duplicate other titles", async () => {
  const page = createPage();
  await page.context.load();
  const html = page.elements.get("#app").innerHTML;
  for (const track of site.tracks) for (const topic of track.topics) {
    assert.match(html, new RegExp(`data-library-topic="${topic.id}"`));
    assert.match(html, new RegExp(`<option value="${topic.id}">`));
  }
  assert.match(html, /data-library-topic="solutions-other"/);
  assert.match(html, /data-library-topic="agent-other"/);
});

test("legacy search and filters migrate to the complete library without losing the selection", async () => {
  for (const filter of ["hpe", "security", "layer:integration", "topic:ai-security"]) {
    const page = createPage({ search: `?filter=${filter}`, hash: "#articles" });
    await page.context.load();
    const expected = page.context.filteredItems(filter, "").length;
    assert.equal(page.elements.get("#library-count").textContent, `${expected} 篇文章`);
    assert.deepEqual(page.views.filter(view => !view.hidden).map(view => view.id), ["all-articles-view"]);
    assert.match(page.navigations.at(-1), /#all-articles$/);
  }
  const query = createPage({ search: "?q=PoC", hash: "#home-search" });
  await query.context.load();
  assert.equal(query.elements.get("#library-search").value, "PoC");
  assert.match(query.navigations.at(-1), /keyword=PoC#all-articles/);
});

test("library deep links and article return retain category and keyword", async () => {
  const page = createPage({ search: "?topic=enterprise-adoption&keyword=PoC", hash: "#all-articles" });
  await page.context.load();
  assert.equal(page.elements.get("#library-search").value, "PoC");
  assert.equal(page.elements.get("#library-results-title").textContent, "企業導入方法");
  assert.match(page.elements.get("#library-results").innerHTML, /from=all-articles&amp;topic=enterprise-adoption&amp;keyword=PoC/);
  const article = createPage({ search: "?article=material-30&from=all-articles&topic=enterprise-adoption&keyword=PoC" });
  await article.context.load();
  assert.match(article.elements.get("#app").innerHTML, /#all-articles">← 返回所有文章/);
  assert.match(article.elements.get("#app").innerHTML, /topic=enterprise-adoption/);
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

test("scene reading returns to its own floor and ignores unrelated or unsafe destinations", async () => {
  const page=createPage({search:'?article=material-34&from=scene-integration'});
  await page.context.load();
  assert.match(page.elements.get('#app').innerHTML,/href="\.\/#layer-integration">← 返回導入整合場景/);
  for (const from of ['scene-infrastructure','scene-javascript:evil']) {
    const other=createPage({search:'?article=material-34&from='+encodeURIComponent(from)});
    await other.context.load();
    assert.doesNotMatch(other.elements.get('#app').innerHTML,/返回.*場景|href="javascript:/);
  }
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
