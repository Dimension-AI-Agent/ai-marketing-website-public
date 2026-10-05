const siteLayerChoices = {
  application: { title: "應用情境", heading: "先看 AI 可以放進哪一段工作", detail: "從流程與需求開始，看看哪些工作值得先做小範圍測試。", ids: ["material-13", "material-30"] },
  integration: { title: "導入整合", heading: "把資料、權限與既有系統接起來", detail: "先釐清 AI 能讀什麼、需要串哪些系統，以及哪些決定要由人確認。", ids: ["material-27", "material-34"] },
  infrastructure: { title: "基礎架構", heading: "用工作負載與現有環境判斷架構", detail: "部署選擇需要連同資料位置、權限和既有系統一起看。", ids: ["material-27"] }
};
const siteSearchTopicIds = ["enterprise-adoption", "benefit-assessment", "on-prem-integration", "ai-security", "integrated-solutions", "competitive-positioning"];
let siteLayerZoomTimer = null;

function siteArticleRow(item, detail = "") {
  return `<a class="site-article-row" href="${articleUrl(item)}"><span>${escapeHtml(topicOf(item).title)}</span><strong>${escapeHtml(item.title)}</strong>${detail ? `<small>${escapeHtml(detail)}</small>` : ""}<b aria-hidden="true">↗</b></a>`;
}

function siteRoute() {
  return location.hash === "#hpe" ? "hpe" : location.hash === "#cases" ? "cases" : "home";
}

function showSiteView(view, scrollId = "", updateUrl = false) {
  const targetView = ["home", "hpe", "cases"].includes(view) ? view : "home";
  document.querySelectorAll(".site-view").forEach(section => { section.hidden = section.id !== `${targetView}-view`; });
  document.querySelectorAll(".site-nav a").forEach(link => {
    if (link.dataset.siteView === targetView && !link.dataset.scrollTo) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  document.title = `${targetView === "hpe" ? "HPE 專區｜" : targetView === "cases" ? "訊達成功案例｜" : ""}訊達 AI 內容專欄`;
  const hash = scrollId || targetView;
  if (updateUrl && location.hash !== `#${hash}`) history.pushState(null, "", `./#${hash}`);
  requestAnimationFrame(() => {
    const target = scrollId ? document.getElementById(scrollId) : null;
    if (target && !target.closest("[hidden]")) target.scrollIntoView({ behavior: "smooth", block: "start" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function renderSiteLayer(key) {
  const choice = siteLayerChoices[key];
  if (!choice) return;
  const items = choice.ids.map(id => content.items.find(item => item.id === id)).filter(item => item && !isHpe(item));
  const result = document.querySelector("#site-layer-result");
  document.querySelectorAll("[data-layer-key]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.layerKey === key)));
  result.hidden = false;
  result.innerHTML = `<div class="site-layer-heading"><div><span>${escapeHtml(choice.title)}</span><h2>${escapeHtml(choice.heading)}</h2><p>${escapeHtml(choice.detail)}</p></div><button type="button" data-close-layer>收合 ×</button></div>${items.length ? `<div class="site-layer-links">${items.map(item => siteArticleRow(item, teaser(item, 90))).join("")}</div>` : '<p class="site-no-match">目前沒有足夠相關的已核准文章，請改用搜尋。</p>'}`;
  result.focus({ preventScroll: true });
  result.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}

function cancelSiteLayerZoom() {
  if (siteLayerZoomTimer !== null) window.clearTimeout(siteLayerZoomTimer);
  siteLayerZoomTimer = null;
  const visual = document.querySelector(".site-hero-visual");
  if (visual) visual.classList.remove("is-zooming");
}

function zoomToSiteLayer(key) {
  if (!siteLayerChoices[key]) return;
  cancelSiteLayerZoom();
  const visual = document.querySelector(".site-hero-visual");
  if (!visual || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    renderSiteLayer(key);
    return;
  }
  visual.dataset.zoomLayer = key;
  // Restart the same transition when visitors select another floor before it finishes.
  void visual.offsetWidth;
  visual.classList.add("is-zooming");
  siteLayerZoomTimer = window.setTimeout(() => {
    siteLayerZoomTimer = null;
    renderSiteLayer(key);
    visual.classList.remove("is-zooming");
  }, 460);
}

function renderSiteSearch(query = "", topicId = "", legacyFilter = "") {
  const result = document.querySelector("#site-search-results");
  const clean = String(query).trim();
  const topic = topicId && content.topics.has(topicId) ? content.topics.get(topicId) : null;
  const validLegacyFilter = legacyFilter === "hpe" || legacyFilter === "security" || (legacyFilter.startsWith("layer:") && layerMeta[legacyFilter.slice(6)]);
  const filter = topic ? `topic:${topicId}` : validLegacyFilter ? legacyFilter : "";
  document.querySelectorAll("[data-search-topic]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.searchTopic === topicId)));
  if (!clean && !filter) { result.hidden = true; result.innerHTML = ""; return; }
  result.hidden = false;
  if (!filter && ["ai", "企業", "文章"].includes(clean.toLocaleLowerCase())) {
    result.innerHTML = '<p class="site-no-match">這個詞太廣，請試試更具體的產品、流程或問題。</p>';
    return;
  }
  const matches = filter ? filteredItems(filter, clean).slice(0, 3) : content.items
    .map((item, index) => ({ item, index, score: searchScore(item, clean) }))
    .filter(entry => entry.score >= 2)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 3).map(entry => entry.item);
  if (!matches.length) {
    result.innerHTML = `<p class="site-no-match">找不到與「${escapeHtml(topic?.title || (filter ? filterTitle(filter) : clean))}」相符的文章。請試試其他關鍵字。</p>`;
    return;
  }
  result.innerHTML = `<p class="site-result-label">${filter ? escapeHtml(filterTitle(filter)) : "搜尋結果"}／最多顯示 3 篇</p><div class="site-search-list">${matches.map(item => siteArticleRow(item)).join("")}</div>`;
}

function siteSearchFromUrl() {
  const params = new URLSearchParams(location.search);
  const query = params.get("q") || "";
  const filter = params.get("filter") || "";
  const topicId = filter.startsWith("topic:") ? filter.slice(6) : "";
  const selectedTopic = content.topics.get(topicId);
  document.querySelector("#site-search-input").value = query || selectedTopic?.title || "";
  renderSiteSearch(query, topicId, filter);
}

function renderSiteViews() {
  const hpeItems = ["material-5", "material-16", "material-38"]
    .map(id => content.items.find(item => item.id === id)).filter(item => item && isHpe(item));
  const hpeFeatured = hpeItems.length ? hpeItems : content.items.filter(isHpe).slice(0, 3);
  const searchTopics = siteSearchTopicIds.map(id => ({ id, topic: content.topics.get(id) }))
    .filter(({ id, topic }) => topic && content.items.some(item => item.topicId === id));
  document.querySelector("#app").innerHTML = `<div class="site-shell">
    <header class="site-header-v2"><div class="site-header-inner"><a class="site-brand" href="./#home" data-site-view="home" aria-label="返回首頁"><span class="site-brand-mark">訊</span><span>訊達<small>AI 內容與實務</small></span></a><nav class="site-nav" aria-label="網站專區"><a href="./#home" data-site-view="home">首頁</a><a href="./#hpe" data-site-view="hpe">HPE 專區</a><a href="./#cases" data-site-view="cases">訊達成功案例專區</a></nav><a class="site-header-search" href="./#home-search" data-site-view="home" data-scroll-to="home-search">搜尋文章 ↗</a></div></header>
    <div class="site-views">
      <section id="home-view" class="site-view" aria-labelledby="home-title"><div class="site-hero site-container"><div class="site-hero-copy"><div class="site-layer-nav" role="group" aria-label="依主題探索內容"><button type="button" data-layer-key="application" aria-pressed="false">應用情境</button><span aria-hidden="true">/</span><button type="button" data-layer-key="integration" aria-pressed="false">導入整合</button><span aria-hidden="true">/</span><button type="button" data-layer-key="infrastructure" aria-pressed="false">基礎架構</button></div><h1 id="home-title">從你現在的問題，<br><em>找到下一步。</em></h1><p>想試 AI、準備做 PoC，或正在評估部署方式？先說你遇到什麼，我們把相關的實務內容整理給你。</p><div class="site-hero-actions"><a href="./#guide" data-site-view="home" data-scroll-to="guide" class="site-primary-action">從問題開始 ↗</a><a href="./#home-search" data-site-view="home" data-scroll-to="home-search" class="site-text-action">直接搜尋文章 →</a></div><small>沒有足夠相關的內容時，不會硬塞推薦。</small></div><div class="site-hero-visual" role="group" aria-label="選擇三層地圖的主題"><img src="assets/visuals/ai-system-cutaway.png" alt=""><button type="button" class="site-visual-tag site-tag-application" data-layer-key="application" aria-controls="site-layer-result" aria-pressed="false" aria-label="放大應用情境並查看相關文章">應用情境 <span aria-hidden="true">↗</span></button><button type="button" class="site-visual-tag site-tag-integration" data-layer-key="integration" aria-controls="site-layer-result" aria-pressed="false" aria-label="放大導入整合並查看相關文章">導入整合 <span aria-hidden="true">↗</span></button><button type="button" class="site-visual-tag site-tag-infrastructure" data-layer-key="infrastructure" aria-controls="site-layer-result" aria-pressed="false" aria-label="放大基礎架構並查看相關文章">基礎架構 <span aria-hidden="true">↗</span></button></div></div><div class="site-container site-home-content"><section id="site-layer-result" class="site-layer-result" hidden tabindex="-1" aria-live="polite"></section><section id="guide" class="site-guide" aria-labelledby="guide-title"><div class="site-section-heading"><h2 id="guide-title">你現在最想解決什麼？</h2><p>選一個最接近的情況，看看可以先從哪件事著手。</p></div><div class="guided-discovery" aria-label="AI 導入互動引導"><div class="guided-heading"><span>依目前情況往下看</span><span id="guide-progress" aria-live="polite"></span></div><div class="guided-content" id="guide-content" aria-live="polite"></div></div></section><section id="home-search" class="site-search" aria-labelledby="search-title"><h2 id="search-title">搜尋文章</h2><form id="site-search-form" role="search"><label for="site-search-input">輸入關鍵字</label><div class="site-search-field"><input id="site-search-input" type="search" placeholder="例如：PoC、資料權限、Private Cloud" autocomplete="off"><button type="submit">搜尋 ↗</button></div></form><div class="site-search-topics" role="group" aria-label="可搜尋的文章分類"><span>或從分類開始</span><div>${searchTopics.map(({ id, topic }) => `<button type="button" data-search-topic="${escapeHtml(id)}" aria-pressed="false">${escapeHtml(topic.title)}</button>`).join("")}</div></div><div id="site-search-results" class="site-search-results" role="status" aria-live="polite" hidden></div></section></div></section>
      <section id="hpe-view" class="site-view site-hpe-view" hidden aria-labelledby="hpe-title"><div class="site-container"><div class="site-hpe-panel"><div class="site-hpe-intro"><span>HPE 贊助專區</span><h1 id="hpe-title">HPE 專區</h1><p>從產品定位到部署條件，閱讀 HPE 相關的基礎架構與 AI 方案內容。</p><img src="assets/visuals/hpe-servers.png" alt="" aria-hidden="true" loading="lazy"></div><div class="site-hpe-links">${hpeFeatured.length ? hpeFeatured.map(item => siteArticleRow(item)).join("") : '<p class="site-no-match">HPE 文章整理中。</p>'}</div></div></div></section>
      <section id="cases-view" class="site-view site-cases-view" hidden aria-labelledby="cases-title"><div class="site-container"><a class="site-back-link" href="./#home" data-site-view="home">← 返回首頁</a><h1 id="cases-title">訊達成功案例</h1><p class="site-cases-lead">把客戶實際面對的問題、訊達參與範圍與可公開的結果放在一起，讓讀者判斷是否與自己的情境相近。</p><div class="site-cases-empty"><h2>案例公開準備中</h2><p>取得客戶授權，並確認可公開的執行內容與成果後，案例會刊登在這裡。</p><p>正式案例將交代問題、訊達做了什麼、結果如何驗證，以及適用條件。</p></div></div></section>
    </div><footer class="site-footer"><div class="site-container"><strong>訊達 AI 內容專欄</strong><span>分享企業 AI、基礎架構與導入實務觀點。</span><a href="./#home" data-site-view="home">回到首頁 ↑</a></div></footer></div>`;
  document.querySelector("#app").addEventListener("click", event => {
    const nav = event.target.closest("[data-site-view]");
    if (nav) { event.preventDefault(); cancelSiteLayerZoom(); showSiteView(nav.dataset.siteView, nav.dataset.scrollTo || "", true); return; }
    const layer = event.target.closest("[data-layer-key]");
    if (layer) { if (layer.classList.contains("site-visual-tag")) zoomToSiteLayer(layer.dataset.layerKey); else { cancelSiteLayerZoom(); renderSiteLayer(layer.dataset.layerKey); } return; }
    if (event.target.closest("[data-close-layer]")) { cancelSiteLayerZoom(); document.querySelector("#site-layer-result").hidden = true; document.querySelectorAll("[data-layer-key]").forEach(button => button.setAttribute("aria-pressed", "false")); return; }
    const topic = event.target.closest("[data-search-topic]");
    if (topic) {
      const selected = content.topics.get(topic.dataset.searchTopic);
      if (!selected) return;
      document.querySelector("#site-search-input").value = selected.title;
      renderSiteSearch("", topic.dataset.searchTopic);
      history.pushState(null, "", `./?filter=topic:${encodeURIComponent(topic.dataset.searchTopic)}#home-search`);
    }
  });
  document.querySelector("#site-search-form").addEventListener("submit", event => {
    event.preventDefault();
    const query = document.querySelector("#site-search-input").value.trim();
    renderSiteSearch(query);
    history.pushState(null, "", `./${query ? `?q=${encodeURIComponent(query)}` : ""}#home-search`);
  });
  document.querySelector("#site-search-input").addEventListener("input", event => {
    if (!event.target.value.trim()) renderSiteSearch("");
    else document.querySelectorAll("[data-search-topic]").forEach(button => button.setAttribute("aria-pressed", "false"));
  });
  document.querySelector("#guide-content").addEventListener("click", handleGuideClick);
  guidedCurrent = "start";
  guidedHistory = [];
  renderGuide();
  siteSearchFromUrl();
  const initialView = siteRoute();
  showSiteView(initialView, initialView === "home" && (location.hash === "#home-search" || location.hash === "#articles" || location.search) ? "home-search" : location.hash === "#guide" || location.hash === "#topics" ? "guide" : "");
  window.addEventListener("popstate", () => { siteSearchFromUrl(); const view = siteRoute(); showSiteView(view, view === "home" && (location.hash === "#home-search" || location.hash === "#articles") ? "home-search" : ""); });
}
