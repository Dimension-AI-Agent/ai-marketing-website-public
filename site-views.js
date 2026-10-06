const siteLayerChoices = {
  application: { title: "應用情境", heading: "先看 AI 可以放進哪一段工作", detail: "從流程與需求開始，看看哪些工作值得先做小範圍測試。", ids: ["material-13", "material-30"] },
  integration: { title: "導入整合", heading: "把資料、權限與既有系統接起來", detail: "先釐清 AI 能讀什麼、需要串哪些系統，以及哪些決定要由人確認。", ids: ["material-27", "material-34"] },
  infrastructure: { title: "基礎架構", heading: "用工作負載與現有環境判斷架構", detail: "部署選擇需要連同資料位置、權限和既有系統一起看。", ids: ["material-27"] }
};
let siteLayerTransition = null;

function siteArticleRow(item, detail = "") {
  return `<a class="site-article-row" href="${articleUrl(item)}"><span>${escapeHtml(topicOf(item).title)}</span><strong>${escapeHtml(item.title)}</strong>${detail ? `<small>${escapeHtml(detail)}</small>` : ""}<b aria-hidden="true">↗</b></a>`;
}

function siteRoute() {
  if (location.hash === "#all-articles") return "all-articles";
  const route = location.hash.slice(1).replace(/-articles$/, "");
  return ["home", "hpe", "cases", ...Object.keys(siteLayerChoices).map(key => `layer-${key}`)].includes(route) ? route : "home";
}

function siteScrollTarget(view) {
  if (view.startsWith("layer-") && location.hash === `#${view}-articles`) return `${view}-articles`;
  if (view !== "home") return "";
  return location.hash === "#guide" || location.hash === "#topics" ? "guide" : "";
}

function showSiteView(view, scrollId = "", updateUrl = false) {
  const layer = view.startsWith("layer-") ? siteLayerChoices[view.slice(6)] : null;
  const targetView = layer || ["home", "hpe", "cases", "all-articles"].includes(view) ? view : "home";
  document.querySelectorAll(".site-view").forEach(section => { section.hidden = section.id !== `${targetView}-view`; });
  document.querySelectorAll(".site-nav a").forEach(link => {
    if (link.dataset.siteView === targetView && !link.dataset.scrollTo) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  document.title = `${layer ? `${layer.title}｜` : targetView === "all-articles" ? "所有文章｜" : targetView === "hpe" ? "HPE 專區｜" : targetView === "cases" ? "訊達成功案例｜" : ""}訊達 AI 內容專欄`;
  const hash = scrollId || targetView;
  if (updateUrl && location.hash !== `#${hash}`) history.pushState(null, "", targetView === "all-articles" ? libraryUrl() : `./#${hash}`);
  requestAnimationFrame(() => {
    const target = scrollId ? document.getElementById(scrollId) : null;
    if (target && !target.closest("[hidden]")) target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    else window.scrollTo({ top: 0, behavior: "instant" });
    if (layer) (target || document.getElementById(`${targetView}-title`)).focus({ preventScroll: true });
  });
}

function siteLayerPage(key) {
  const choice = siteLayerChoices[key];
  const items = choice.ids.map(id => content.items.find(item => item.id === id)).filter(item => item && !isHpe(item));
  return `<section id="layer-${key}-view" class="site-view site-layer-page" data-floor="${key}" hidden aria-labelledby="layer-${key}-title">
    <div class="site-container">
      <nav class="site-layer-wayfinding" aria-label="樓層導覽"><a href="./#home" data-site-view="home">← 返回三層地圖</a><div>${Object.entries(siteLayerChoices).map(([id, item]) => `<a href="./#layer-${id}" data-site-view="layer-${id}"${id === key ? ' aria-current="page"' : ""}>${escapeHtml(item.title)}</a>`).join("")}</div></nav>
      <div class="site-layer-hero"><div class="site-layer-copy"><h1 id="layer-${key}-title" tabindex="-1">${escapeHtml(choice.title)}</h1><h2>${escapeHtml(choice.heading)}</h2><p>${escapeHtml(choice.detail)}</p><a class="site-text-action" href="#layer-${key}-articles" data-site-view="layer-${key}" data-scroll-to="layer-${key}-articles">閱讀相關文章 ↓</a></div><div class="site-layer-scene" aria-hidden="true"><img src="assets/visuals/ai-system-cutaway.png" alt=""></div></div>
      <section id="layer-${key}-articles" class="site-layer-articles" tabindex="-1" aria-labelledby="layer-${key}-articles-title"><h2 id="layer-${key}-articles-title">從這些文章開始</h2>${items.length ? `<div class="site-layer-reading-list">${items.map(item => siteArticleRow(item, teaser(item, 110))).join("")}</div>` : '<p class="site-no-match">目前沒有足夠相關的已核准文章，請改用搜尋。</p>'}</section>
    </div>
  </section>`;
}

function renderSiteLayer(key, updateUrl = true) {
  if (siteLayerChoices[key]) showSiteView(`layer-${key}`, "", updateUrl);
}

function cancelSiteLayerZoom() {
  const transition = siteLayerTransition;
  siteLayerTransition = null;
  if (!transition) return;
  transition.animations.forEach(animation => animation.cancel());
  transition.source.style.visibility = "";
  transition.overlay.remove();
}

async function zoomToSiteLayer(key) {
  if (!siteLayerChoices[key]) return;
  cancelSiteLayerZoom();
  const source = document.querySelector(".site-hero-visual img");
  const target = document.getElementById(`layer-${key}-view`);
  if (!source?.animate || !target || document.getElementById("home-view").hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    renderSiteLayer(key);
    return;
  }
  const from = source.getBoundingClientRect();
  // Measure the destination at the same position it will occupy after navigation.
  target.hidden = false;
  target.style.cssText = `position:fixed;top:${document.querySelector(".site-header-v2").offsetHeight}px;left:0;width:100%;visibility:hidden;pointer-events:none`;
  const targetImage = target.querySelector(".site-layer-scene img");
  const to = targetImage.getBoundingClientRect();
  const frame = target.querySelector(".site-layer-scene").getBoundingClientRect();
  target.style.cssText = "";
  target.hidden = true;
  if (!from.width || !from.height || !to.width || !to.height) { renderSiteLayer(key); return; }

  const overlay = document.createElement("div");
  overlay.className = "site-layer-transition";
  overlay.setAttribute("aria-hidden", "true");
  const imageWindow = document.createElement("div");
  imageWindow.className = "site-layer-transition-window";
  const image = source.cloneNode();
  image.style.cssText = `position:absolute;left:${from.left}px;top:${from.top}px;width:${from.width}px;height:${from.height}px;max-width:none;transform-origin:0 0`;
  imageWindow.append(image);
  overlay.append(imageWindow);
  document.body.append(overlay);
  source.style.visibility = "hidden";
  const timing = { duration: 760, easing: "cubic-bezier(.65,0,.2,1)", fill: "forwards" };
  const transition = { source, overlay, animations: [] };
  siteLayerTransition = transition;
  try {
    transition.animations.push(overlay.animate([{ backgroundColor: "#f8f6ef00" }, { backgroundColor: "#f8f6ef" }], { duration: 200, fill: "forwards" }));
    transition.animations.push(imageWindow.animate([{ clipPath: "inset(0px)" }, { clipPath: `inset(${Math.max(0, frame.top)}px ${Math.max(0, innerWidth - frame.right)}px ${Math.max(0, innerHeight - frame.bottom)}px ${Math.max(0, frame.left)}px)` }], timing));
    transition.animations.push(image.animate([{ transform: "translate(0px,0px) scale(1)" }, { transform: `translate(${to.left - from.left}px,${to.top - from.top}px) scale(${to.width / from.width},${to.height / from.height})` }], timing));
    await Promise.all(transition.animations.map(animation => animation.finished));
    if (siteLayerTransition !== transition) return;
    renderSiteLayer(key);
    const reveal = overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: "forwards" });
    transition.animations.push(reveal);
    await reveal.finished;
  } catch {
    // Back/navigation cancels the camera move without opening a stale destination.
    if (siteLayerTransition === transition) renderSiteLayer(key);
  } finally {
    if (siteLayerTransition === transition) cancelSiteLayerZoom();
  }
}

function migrateSiteSearchUrl() {
  const params = new URLSearchParams(location.search);
  if (!["#home-search", "#articles"].includes(location.hash) && !params.has("q") && !params.has("filter")) return;
  const filter = params.get("filter") || "";
  libraryTopic = filter.startsWith("topic:") && content.topics.has(filter.slice(6)) ? filter.slice(6) : "";
  libraryKeyword = params.get("q") || "";
  libraryScope = libraryTopic ? "" : validLibraryScope(filter);
  history.replaceState(null, "", libraryUrl());
  renderLibrary();
}

function renderSiteViews() {
  const hpeItems = ["material-5", "material-16", "material-38"]
    .map(id => content.items.find(item => item.id === id)).filter(item => item && isHpe(item));
  const hpeFeatured = hpeItems.length ? hpeItems : content.items.filter(isHpe).slice(0, 3);
  const hpeCases = content.items.filter(item => item.topicId === "hpe-use-cases" && !hpeFeatured.some(featured => featured.id === item.id));
  const xundaCases = content.items.filter(isXundaCase);
  const caseList = items => `<ul class="site-case-list">${items.map(item => `<li>${siteArticleRow(item, teaser(item, 160))}</li>`).join("")}</ul>`;
  document.querySelector("#app").innerHTML = `<div class="site-shell">
    <header class="site-header-v2"><div class="site-header-inner"><a class="site-brand" href="./#home" data-site-view="home" aria-label="返回首頁"><span class="site-brand-mark">訊</span><span>訊達<small>AI 內容與實務</small></span></a><nav class="site-nav" aria-label="網站專區"><a href="./#home" data-site-view="home">首頁</a><a href="./#all-articles" data-site-view="all-articles">所有文章</a><a href="./#hpe" data-site-view="hpe">HPE 專區</a><a href="./#cases" data-site-view="cases">訊達成功案例專區</a></nav><a class="site-header-search" href="./#all-articles" data-site-view="all-articles">搜尋文章 ↗</a></div></header>
    <div class="site-views">
      <section id="home-view" class="site-view" aria-labelledby="home-title"><div class="site-hero site-container"><div class="site-hero-copy"><div class="site-layer-nav" role="group" aria-label="依主題探索內容"><a href="./#layer-application" data-layer-key="application">應用情境</a><span aria-hidden="true">/</span><a href="./#layer-integration" data-layer-key="integration">導入整合</a><span aria-hidden="true">/</span><a href="./#layer-infrastructure" data-layer-key="infrastructure">基礎架構</a></div><h1 id="home-title">從你現在的問題，<br><em>找到下一步。</em></h1><p>想試 AI、準備做 PoC，或正在評估部署方式？先說你遇到什麼，我們把相關的實務內容整理給你。</p><div class="site-hero-actions"><a href="./#guide" data-site-view="home" data-scroll-to="guide" class="site-primary-action">從問題開始 ↗</a><a href="./#all-articles" data-site-view="all-articles" class="site-text-action">瀏覽所有文章 →</a></div><small>沒有足夠相關的內容時，不會硬塞推薦。</small></div><div class="site-hero-visual" role="group" aria-label="選擇三層地圖的主題"><img src="assets/visuals/ai-system-cutaway.png" alt=""><a href="./#layer-application" class="site-visual-tag site-tag-application" data-layer-key="application" aria-label="進入應用情境主題">應用情境 <span aria-hidden="true">↗</span></a><a href="./#layer-integration" class="site-visual-tag site-tag-integration" data-layer-key="integration" aria-label="進入導入整合主題">導入整合 <span aria-hidden="true">↗</span></a><a href="./#layer-infrastructure" class="site-visual-tag site-tag-infrastructure" data-layer-key="infrastructure" aria-label="進入基礎架構主題">基礎架構 <span aria-hidden="true">↗</span></a></div></div><div class="site-container site-home-content"><section id="guide" class="site-guide" aria-labelledby="guide-title"><div class="site-section-heading"><h2 id="guide-title">你現在最想解決什麼？</h2><p>選一個最接近的情況，看看可以先從哪件事著手。</p></div><div class="guided-discovery" aria-label="AI 導入互動引導"><div class="guided-heading"><span>依目前情況往下看</span><span id="guide-progress" aria-live="polite"></span></div><div class="guided-content" id="guide-content" aria-live="polite"></div></div></section></div></section>
      ${libraryPage()}
      ${Object.keys(siteLayerChoices).map(siteLayerPage).join("")}
      <section id="hpe-view" class="site-view site-hpe-view" hidden aria-labelledby="hpe-title"><div class="site-container"><div class="site-hpe-panel"><div class="site-hpe-intro"><span>HPE 贊助專區</span><h1 id="hpe-title">HPE 專區</h1><p>從產品定位到部署條件，閱讀 HPE 相關的基礎架構與 AI 方案內容。</p><img src="assets/visuals/hpe-servers.png" alt="" aria-hidden="true" loading="lazy"></div><div class="site-hpe-links">${hpeFeatured.length ? hpeFeatured.map(item => siteArticleRow(item)).join("") : '<p class="site-no-match">HPE 文章整理中。</p>'}</div></div>${hpeCases.length ? `<section class="site-hpe-cases" aria-labelledby="hpe-cases-title"><h2 id="hpe-cases-title">HPE 應用情境與案例</h2>${caseList(hpeCases)}</section>` : ""}</div></section>
      <section id="cases-view" class="site-view site-cases-view" hidden aria-labelledby="cases-title"><div class="site-container"><a class="site-back-link" href="./#home" data-site-view="home">← 返回首頁</a><h1 id="cases-title">訊達成功案例</h1><p class="site-cases-lead">把客戶實際面對的問題、訊達參與範圍與可公開的結果放在一起，讓讀者判斷是否與自己的情境相近。</p>${xundaCases.length ? caseList(xundaCases) : '<div class="site-cases-empty"><h2>案例公開準備中</h2><p>取得客戶授權，並確認可公開的執行內容與成果後，案例會刊登在這裡。</p><p>正式案例將交代問題、訊達做了什麼、結果如何驗證，以及適用條件。</p></div>'}</div></section>
    </div><footer class="site-footer"><div class="site-container"><strong>訊達 AI 內容專欄</strong><span>分享企業 AI、基礎架構與導入實務觀點。</span><a href="./#home" data-site-view="home">回到首頁 ↑</a></div></footer></div>`;
  document.querySelector("#app").addEventListener("click", event => {
    const nav = event.target.closest("[data-site-view]");
    if (nav) { event.preventDefault(); cancelSiteLayerZoom(); showSiteView(nav.dataset.siteView, nav.dataset.scrollTo || "", true); return; }
    const layer = event.target.closest("[data-layer-key]");
    if (layer) { event.preventDefault(); zoomToSiteLayer(layer.dataset.layerKey); return; }
  });
  document.querySelector("#guide-content").addEventListener("click", handleGuideClick);
  guidedCurrent = "start";
  guidedHistory = [];
  renderGuide();
  bindLibrary();
  migrateSiteSearchUrl();
  const initialView = siteRoute();
  showSiteView(initialView, siteScrollTarget(initialView));
  window.addEventListener("popstate", () => { cancelSiteLayerZoom(); migrateSiteSearchUrl(); const view = siteRoute(); showSiteView(view, siteScrollTarget(view)); });
}
