let content = { items: [], topics: new Map(), tracks: [], articleOutlines: {}, relatedReading: {}, featuredMaterialId: "", articleViews: null };
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

function safeAssetPath(value) {
  if (typeof value !== "string") return "";
  try {
    const path = decodeURIComponent(value);
    if (!path.startsWith("assets/materials/") || /[%\\\u0000-\u001f]/.test(path)) return "";
    if (path.split("/").some(part => !part || part === "." || part === "..")) return "";
    return path.split("/").map(encodeURIComponent).join("/");
  } catch { return ""; }
}

function safePublicUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : "";
  } catch { return ""; }
}

function imageFor(item) {
  const file = (item.files || []).find(file => file.kind === "image");
  return file && safeAssetPath(file.file) ? { src: safeAssetPath(file.file), alt: file.name || item.title } : null;
}

function teaser(item, max = 115) {
  const text = (item.summary || item.body || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

function articleUrl(item) { return `?article=${encodeURIComponent(item.id)}`; }
function topicOf(item) { return content.topics.get(item.topicId) || { title: "其他", track: "內容專欄" }; }
function artWord(item) { return item.title.includes("Agent") ? "AI Agent" : item.title.includes("VMware") ? "VMware" : item.title.includes("Smart Choice") ? "Smart Choice" : "HPE"; }
function colorOf(index) { return ["", "orange", "blue"][index % 3]; }

function mediaMarkup(item, index, featured = false) {
  const image = imageFor(item);
  const className = featured ? "featured-visual" : `card-media ${colorOf(index)}`;
  const visual = image ? `<img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" loading="lazy">` : `<span class="visual-word" aria-hidden="true">${escapeHtml(artWord(item))}</span>`;
  return `<div class="${className}">${visual}</div>`;
}

function cardMarkup(item, index) {
  const topic = topicOf(item);
  return `<a class="article-card" href="${articleUrl(item)}" aria-label="閱讀文章：${escapeHtml(item.title)}">
    <div class="card-content"><div class="card-meta"><span>${escapeHtml(topic.title)}</span>${item.id === content.featuredMaterialId ? '<span class="focus-label">焦點文章</span>' : ""}</div>
    <h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(teaser(item, 105))}</p>
    <div class="card-bottom"><strong aria-hidden="true">↗</strong></div></div></a>`;
}

const layerMeta = {
  application: { title: "應用情境", topics: ["industry-cases", "hpe-use-cases", "faq", "benefit-assessment", "agent-other"] },
  integration: { title: "導入與整合", topics: ["enterprise-adoption", "on-prem-integration", "open-source-tools", "integrated-solutions", "ai-security"] },
  infrastructure: { title: "基礎架構", topics: ["hardware", "software", "competitive-positioning", "industry-trends", "solutions-other"] }
};

function isHpe(item) { return /\bHPE\b/i.test(item.title) || item.topicId === "hpe-use-cases"; }
function matchesFilter(item, filter) {
  if (filter === "all") return true;
  if (filter === "hpe") return isHpe(item);
  if (filter.startsWith("layer:")) return (layerMeta[filter.slice(6)]?.topics || []).includes(item.topicId);
  if (filter.startsWith("topic:")) return item.topicId === filter.slice(6);
  return false;
}
function searchScore(item, query) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  const title = item.title.toLocaleLowerCase();
  const topic = topicOf(item).title.toLocaleLowerCase();
  const summary = String(item.summary || "").toLocaleLowerCase();
  const body = String(item.body || "").toLocaleLowerCase();
  if (!words.every(word => title.includes(word) || topic.includes(word) || summary.includes(word) || body.includes(word))) return -1;
  return words.reduce((score, word) => score + (title.includes(word) ? 8 : 0) + (topic.includes(word) ? 4 : 0) + (summary.includes(word) ? 2 : 0) + (body.includes(word) ? 1 : 0), 0);
}
function filteredItems(filter, query) {
  return content.items.map((item, index) => ({ item, index, score: searchScore(item, query) }))
    .filter(entry => matchesFilter(entry.item, filter) && entry.score >= 0)
    .sort((a, b) => query.trim() ? b.score - a.score || a.index - b.index : a.index - b.index)
    .map(entry => entry.item);
}
function filterTitle(filter) {
  if (filter === "hpe") return "HPE 專區文章";
  if (filter.startsWith("layer:")) return layerMeta[filter.slice(6)]?.title || "所有文章";
  if (filter.startsWith("topic:")) return content.topics.get(filter.slice(6))?.title || "所有文章";
  return "所有文章";
}
function topicButtons() {
  return content.tracks.flatMap(track => track.topics).filter(topic => content.items.some(item => item.topicId === topic.id))
    .map(topic => `<button type="button" class="topic-chip" data-filter="topic:${escapeHtml(topic.id)}">${escapeHtml(topic.title)} <span>${content.items.filter(item => item.topicId === topic.id).length}</span></button>`).join("");
}

function popularArticles(snapshot) {
  if (!snapshot || snapshot.windowDays !== 30 || !snapshot.updatedAt || !snapshot.views || typeof snapshot.views !== "object" || Array.isArray(snapshot.views)) return [];
  const updated = Date.parse(snapshot.updatedAt);
  if (!Number.isFinite(updated) || updated > Date.now() || Date.now() - updated > 40 * 24 * 60 * 60 * 1000) return [];
  return content.items.map((item, index) => ({ item, index, count: snapshot.views[item.id] }))
    .filter(entry => Number.isSafeInteger(entry.count) && entry.count > 0)
    .sort((a, b) => b.count - a.count || a.index - b.index)
    .slice(0, 3);
}

function railArticlesMarkup() {
  const ranked = popularArticles(content.articleViews);
  const startingIds = [content.featuredMaterialId, "material-38", "material-19"];
  const entries = ranked.length ? ranked : [...new Set(startingIds)]
    .map(id => content.items.find(item => item.id === id))
    .filter(Boolean)
    .concat(content.items.filter(item => !startingIds.includes(item.id)))
    .slice(0, 3)
    .map(item => ({ item }));
  const popular = ranked.length > 0;
  const tag = popular ? "ol" : "ul";
  return `<div class="rail-articles"><h2>${popular ? "熱門文章" : "從這幾篇開始"}</h2><p class="rail-list-note">${popular ? "近 30 天點閱最多" : "從應用、方案到設備選型"}</p><${tag} class="rail-article-list">${entries.map((entry, index) => `<li><a href="${articleUrl(entry.item)}" aria-label="閱讀文章：${escapeHtml(entry.item.title)}"><span class="rail-article-index" aria-hidden="true">${popular ? String(index + 1).padStart(2, "0") : "↗"}</span><span class="rail-article-copy"><small>${escapeHtml(topicOf(entry.item).title)}${popular ? ` · ${new Intl.NumberFormat("zh-TW").format(entry.count)} 次點閱` : ""}</small><strong>${escapeHtml(entry.item.title)}</strong></span></a></li>`).join("")}</${tag}></div>`;
}
function renderResults(filter, query) {
  const items = filteredItems(filter, query);
  document.querySelector(".listing-title").textContent = filterTitle(filter);
  document.querySelector(".result-count").textContent = `共 ${items.length} 篇`;
  document.querySelector(".cards").innerHTML = items.length ? items.map(cardMarkup).join("") : `<div class="empty-results"><h3>還沒有找到符合的文章</h3><p>試試更短的關鍵字，或清除主題條件。</p><button type="button" class="empty-reset">顯示所有文章</button></div>`;
  const reset = document.querySelector(".reset-filter");
  reset.hidden = filter === "all" && !query.trim();
  document.querySelectorAll("[data-filter]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.filter === filter)));
  document.querySelector(".empty-reset")?.addEventListener("click", () => setDiscovery("all", "", true));
}
function setDiscovery(filter, query, scroll = false) {
  const safeFilter = filter === "all" || filter === "hpe" || (filter.startsWith("layer:") && layerMeta[filter.slice(6)]) || (filter.startsWith("topic:") && content.topics.has(filter.slice(6))) ? filter : "all";
  const cleanQuery = String(query || "").trim();
  document.querySelectorAll(".top-search input,.rail-search input,.discovery-search input,.mobile-search input").forEach(input => { input.value = cleanQuery; });
  renderResults(safeFilter, cleanQuery);
  const params = new URLSearchParams();
  if (cleanQuery) params.set("q", cleanQuery);
  if (safeFilter !== "all") params.set("filter", safeFilter);
  history.replaceState(null, "", `./${params.toString() ? `?${params}` : ""}#articles`);
  if (scroll) document.querySelector("#articles")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderHome() {
  const items = content.items;
  if (!items.length) {
    document.querySelector("#app").innerHTML = '<div class="not-found"><h1>文章準備中</h1><p>已核准的內容發布後，就會出現在這裡。</p></div>';
    return;
  }
  const featured = items.find(item => item.id === content.featuredMaterialId) || items[0];
  document.title = "訊達 AI 內容專欄";
  document.querySelector("#app").innerHTML = `<div class="home-page">
    <section class="hero-frame" aria-labelledby="home-title">
      <img class="hero-plate cutaway-plate" src="assets/visuals/ai-system-cutaway.png" alt="" aria-hidden="true">
      <div class="hero-header"><a class="hero-brand" href="./">訊達 AI 內容專欄</a><form class="top-search" role="search"><label class="sr-only" for="top-query">搜尋文章</label><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.7" cy="10.7" r="6.6"/><path d="m15.5 15.5 5.1 5.1"/></svg><input id="top-query" type="search" placeholder="搜尋文章" autocomplete="off"></form></div>
      <div class="hero-copy"><p class="hero-tagline">KNOWLEDGE FOR<br>A SMARTER TOMORROW</p><h1 id="home-title">從應用到基礎<br>串連企業的<br><strong>AI 實踐力</strong></h1><span class="hero-accent" aria-hidden="true"></span><p class="hero-intro">聚焦企業 AI 應用與 IT 基礎架構，<br>以實務觀點拆解技術、串連場景，<br>提供可落地的知識與觀點，<br>陪伴企業走向更高效、更穩健的未來。</p></div>
      <div class="mobile-find" aria-label="快速找文章">
        <h2>你現在想解決什麼問題？</h2>
        <form class="mobile-search" role="search"><label class="sr-only" for="mobile-query">搜尋文章</label><input id="mobile-query" type="search" placeholder="搜尋問題、產品或關鍵字" autocomplete="off"><button type="submit">找文章</button></form>
        <nav class="mobile-paths" aria-label="依問題找文章"><a href="#articles" data-layer="application">AI 能做什麼？</a><a href="#articles" data-layer="integration">怎麼接進系統？</a><a href="#articles" data-layer="infrastructure">設備怎麼選？</a></nav>
        <a class="mobile-feature" href="${articleUrl(featured)}"><span>從這篇開始</span><strong>${escapeHtml(featured.title)}</strong><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></a>
      </div>
      <div class="layer-label layer-app"><a href="#articles" data-layer="application">應用情境</a><p>貼近業務場景<br>讓 AI 真正解決<br>企業問題</p></div>
      <div class="layer-label layer-integration"><a href="#articles" data-layer="integration">導入與整合</a><p>整合資料、系統與流程<br>串聯應用與基礎架構<br>加速 AI 落地</p></div>
      <div class="layer-label layer-infrastructure"><a href="#articles" data-layer="infrastructure">基礎架構</a><p>穩定、安全、可擴充<br>支持企業持續創新</p></div>
      <aside class="hero-rail" aria-label="快速找文章">
        <h2>搜尋文章</h2><form class="rail-search" role="search"><label class="sr-only" for="rail-query">搜尋文章</label><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.7" cy="10.7" r="6.6"/><path d="m15.5 15.5 5.1 5.1"/></svg><input id="rail-query" type="search" placeholder="搜尋文章" autocomplete="off"><button type="submit" aria-label="搜尋文章"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></button></form>
        ${railArticlesMarkup()}
        <a class="hpe-rail-link" href="#hpe"><span>HPE 贊助專區</span><strong>了解基礎架構與 AI 方案</strong><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></a>
      </aside>
      <a class="hero-transition" href="#topics"><span class="transition-trace" aria-hidden="true"><i></i><i></i><i></i></span><strong>從你的問題開始探索</strong><span>選擇應用、導入或基礎架構，沿著系統找到需要的知識。</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v17m-6-6 6 6 6-6"/></svg></a>
    </section>
    <section class="discovery-intro" id="topics" aria-labelledby="topics-heading"><div class="container">
      <div><h2 id="topics-heading">從你正在面對的問題開始</h2><p>不必先弄懂所有技術名詞。選一個方向，找到相關的實務文章。</p></div>
      <div class="path-grid">
        <a href="#articles" class="path-card path-application" data-layer="application"><span>應用情境</span><strong>AI 能幫企業處理什麼事？</strong><small>從產業案例、工作流程與效益評估切入</small><b aria-hidden="true">↗</b></a>
        <a href="#articles" class="path-card path-integration" data-layer="integration"><span>導入與整合</span><strong>要怎麼接進現有系統？</strong><small>理解資料、權限、工具與導入步驟</small><b aria-hidden="true">↗</b></a>
        <a href="#articles" class="path-card path-infrastructure" data-layer="infrastructure"><span>基礎架構</span><strong>設備與平台該怎麼選？</strong><small>釐清運算、儲存、網路與虛擬化選項</small><b aria-hidden="true">↗</b></a>
      </div>
    </div></section>
    <section class="hpe-section" id="hpe" aria-labelledby="hpe-heading"><div class="container hpe-layout"><div class="hpe-intro"><p class="hpe-sponsored">HPE 贊助專區</p><h2 id="hpe-heading">HPE 專區</h2><p>從產品定位到實際部署條件，整理 HPE 相關的基礎架構與 AI 方案觀點。</p><button type="button" class="text-action" data-hpe-filter>瀏覽所有 HPE 文章 <span aria-hidden="true">↗</span></button><img class="hpe-illustration" src="assets/visuals/hpe-servers.png" alt="" aria-hidden="true" loading="lazy"></div><div class="hpe-feature-list">${items.filter(isHpe).slice(0, 3).map(item => `<a href="${articleUrl(item)}"><span>${escapeHtml(topicOf(item).title)}</span><strong>${escapeHtml(item.title)}</strong><b aria-hidden="true">↗</b></a>`).join("")}</div></div></section>
    <section class="discovery" id="articles" aria-labelledby="articles-heading"><div class="container">
      <div class="listing-heading"><div><h2 id="articles-heading">探索文章</h2><p>依主題找資料，也可以直接搜尋問題或產品名稱。</p></div><form class="discovery-search" role="search"><label class="sr-only" for="discovery-query">搜尋文章</label><input id="discovery-query" type="search" placeholder="例如：AI Agent、資料權限、伺服器" autocomplete="off"><button type="submit">搜尋 <span aria-hidden="true">↗</span></button></form></div>
      <div class="filter-bar" aria-label="文章篩選"><button type="button" data-filter="all" class="filter-button">全部</button><button type="button" data-filter="layer:application" class="filter-button">應用情境</button><button type="button" data-filter="layer:integration" class="filter-button">導入與整合</button><button type="button" data-filter="layer:infrastructure" class="filter-button">基礎架構</button><button type="button" data-filter="hpe" class="filter-button filter-hpe">HPE 專區</button></div>
      <details class="topic-details"><summary>依細部主題篩選 <span aria-hidden="true">⌄</span></summary><div class="topic-chips">${topicButtons()}</div></details>
      <div class="results-heading"><h3 class="listing-title">所有文章</h3><div><span class="result-count" role="status" aria-live="polite">共 ${items.length} 篇</span><button type="button" class="reset-filter" hidden>清除條件</button></div></div>
      <div class="cards">${items.map(cardMarkup).join("")}</div>
    </div></section>
    <footer class="site-footer"><div class="container"><strong>訊達 AI 內容專欄</strong><span>分享企業 AI、基礎架構與導入實務觀點。</span><a href="#home-title">回到頁首 ↑</a></div></footer>
  </div>`;
  document.querySelectorAll("[data-layer]").forEach(link => link.addEventListener("click", event => {
    event.preventDefault();
    setDiscovery(`layer:${link.dataset.layer}`, "", true);
  }));
  document.querySelectorAll("[data-filter]").forEach(button => button.addEventListener("click", () => setDiscovery(button.dataset.filter, document.querySelector(".discovery-search input").value, false)));
  document.querySelector("[data-hpe-filter]").addEventListener("click", () => setDiscovery("hpe", "", true));
  document.querySelector(".reset-filter").addEventListener("click", () => setDiscovery("all", "", false));
  document.querySelectorAll(".top-search,.rail-search,.discovery-search,.mobile-search").forEach(form => form.addEventListener("submit", event => {
    event.preventDefault();
    setDiscovery("all", form.querySelector("input").value, true);
  }));
  const params = new URLSearchParams(location.search);
  const requestedFilter = params.get("filter") || "all";
  const requestedQuery = params.get("q") || "";
  renderResults(requestedFilter === "all" || requestedFilter === "hpe" || (requestedFilter.startsWith("layer:") && layerMeta[requestedFilter.slice(6)]) || (requestedFilter.startsWith("topic:") && content.topics.has(requestedFilter.slice(6))) ? requestedFilter : "all", requestedQuery);
  document.querySelectorAll(".top-search input,.rail-search input,.discovery-search input,.mobile-search input").forEach(input => { input.value = requestedQuery; });
}

function inlineMarkup(value) {
  return escapeHtml(value).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function bodyMarkup(value, sectionSpecs = [], headings = []) {
  const lines = String(value || "").split(/\r?\n/);
  const sectionLevels = new Map(sectionSpecs.filter(section => section && typeof section.text === "string" && [2, 3].includes(section.level)).map(section => [section.text, section.level]));
  let html = "";
  let inList = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) { if (inList) { html += "</ul>"; inList = false; } continue; }
    const markdownHeading = line.match(/^(#{2,3})\s+(.+)$/);
    const level = markdownHeading ? markdownHeading[1].length : sectionLevels.get(line);
    if (level) {
      if (inList) { html += "</ul>"; inList = false; }
      const title = markdownHeading ? markdownHeading[2] : line;
      const id = `section-${headings.length + 1}`;
      headings.push({ id, title, level });
      html += `<h${level} id="${id}">${inlineMarkup(title)}</h${level}>`;
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) { if (!inList) { html += "<ul>"; inList = true; } html += `<li>${inlineMarkup(bullet[1])}</li>`; continue; }
    if (inList) { html += "</ul>"; inList = false; }
    html += `<p>${inlineMarkup(line)}</p>`;
  }
  return html + (inList ? "</ul>" : "");
}

function attachmentsMarkup(item) {
  const files = Array.isArray(item.files) ? item.files : item.file ? [{ name: item.title, file: item.file }] : [];
  const links = Array.isArray(item.links) ? item.links : item.url ? [item.url] : [];
  const fileHtml = files.map(file => {
    const src = safeAssetPath(file.file);
    if (!src) return "";
    const name = escapeHtml(file.name || "附件");
    const image = file.kind === "image" ? `<img class="article-image" src="${escapeHtml(src)}" alt="${name}" loading="lazy">` : "";
    const media = file.kind === "audio" ? `<audio controls preload="none" src="${escapeHtml(src)}"></audio>` : file.kind === "video" ? `<video controls preload="none" src="${escapeHtml(src)}"></video>` : "";
    return `${image}${media}<a class="attachment-link" href="${escapeHtml(src)}" target="_blank" rel="noopener noreferrer">開啟附件：${name} ↗</a>`;
  }).join("");
  const linkHtml = links.map((value, index) => { const href = safePublicUrl(value); return href ? `<a class="attachment-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">開啟素材連結${links.length > 1 ? ` ${index + 1}` : ""} ↗</a>` : ""; }).join("");
  return fileHtml || linkHtml ? `<h2 class="attachment-title">相關圖片與附件</h2>${fileHtml}${linkHtml}` : "";
}

function renderArticle(item) {
  const topic = topicOf(item);
  const seen = new Set();
  const guides = (Array.isArray(content.relatedReading[item.id]) ? content.relatedReading[item.id] : [])
    .filter(guide => guide && typeof guide.id === "string" && typeof guide.question === "string" && guide.question.trim() && typeof guide.reason === "string" && guide.reason.trim())
    .map(guide => ({ ...guide, item: content.items.find(other => other.id === guide.id) }))
    .filter(guide => guide.item && guide.item.id !== item.id && !seen.has(guide.item.id) && seen.add(guide.item.id))
    .slice(0, 3);
  const guideMarkup = guides.length ? `<aside class="read-sidebar" aria-label="延伸閱讀"><h2>接著想了解什麼？</h2><p>選一個與你現在的問題最接近的方向。</p><div class="guide-list">${guides.map(guide => `<a href="${articleUrl(guide.item)}"><span>${escapeHtml(guide.question)}</span><strong>${escapeHtml(guide.item.title)}</strong><small>${escapeHtml(guide.reason)}</small></a>`).join("")}</div></aside>` : "";
  const headings = [];
  const body = bodyMarkup(item.body, content.articleOutlines[item.id] || [], headings);
  const sections = headings.filter(heading => heading.level === 2);
  const toc = sections.length >= 3 ? `<nav class="article-toc" aria-label="本文段落"><strong>本文段落</strong><ol>${sections.map(heading => `<li><a href="#${heading.id}">${escapeHtml(heading.title)}</a></li>`).join("")}</ol></nav>` : "";
  const expandableSummary = item.summary && item.summary.length > 220;
  document.title = `${item.title}｜訊達 AI 內容專欄`;
  document.querySelector("#app").innerHTML = `<div class="article-page">
    <div class="article-top"><div class="container"><nav class="breadcrumb" aria-label="所在位置"><a href="./">內容專欄</a><span>›</span><span>${escapeHtml(topic.title)}</span></nav><div class="article-header"><span class="eyebrow">${escapeHtml(topic.track)} / ${escapeHtml(topic.title)}</span><h1>${escapeHtml(item.title)}</h1>${item.summary ? `<p class="lead${expandableSummary ? " is-collapsible" : ""}" id="article-summary">${escapeHtml(item.summary)}</p>${expandableSummary ? '<button type="button" class="summary-toggle" aria-controls="article-summary" aria-expanded="false">展開摘要</button>' : ""}` : ""}<div class="article-byline"><b>訊達 AI 內容</b><span>·</span><span>${escapeHtml(item.format || "文章")}</span></div></div></div></div>
    <div class="container reading-wrap"><article class="article-body">${toc}${body}${attachmentsMarkup(item)}<div class="article-end"><a class="back-link" href="./#articles">← 回到所有文章</a></div></article>${guideMarkup}</div>
  </div>`;
  const summaryToggle = document.querySelector(".summary-toggle");
  if (expandableSummary && summaryToggle?.addEventListener) summaryToggle.addEventListener("click", () => {
    const expanded = summaryToggle.getAttribute("aria-expanded") !== "true";
    document.querySelector("#article-summary").classList.toggle("is-expanded", expanded);
    summaryToggle.setAttribute("aria-expanded", String(expanded));
    summaryToggle.textContent = expanded ? "收合摘要" : "展開摘要";
  });
  window.scrollTo(0, 0);
}

function openLegacyHash() {
  const id = /^#(material-\d+)$/.exec(location.hash)?.[1];
  const item = id && content.items.find(entry => entry.id === id);
  if (!item) return;
  history.replaceState(null, "", articleUrl(item));
  renderArticle(item);
}

async function load() {
  try {
    const [siteResponse, materialsResponse, articleViews] = await Promise.all([
      fetch("data/site.json", { cache: "no-store" }),
      fetch("data/materials.json", { cache: "no-store" }),
      fetch("data/article-views.json", { cache: "no-store" }).then(response => response.ok ? response.json() : null).catch(() => null)
    ]);
    if (!siteResponse.ok || !materialsResponse.ok) throw new Error("內容資料讀取失敗");
    const [site, materials] = await Promise.all([siteResponse.json(), materialsResponse.json()]);
    const topics = new Map();
    site.tracks.forEach(track => track.topics.forEach(topic => topics.set(topic.id, { title: topic.title, track: track.title })));
    content = { topics, tracks: site.tracks, articleOutlines: site.articleOutlines || {}, relatedReading: site.relatedReading || {}, items: materials.filter(item => item.status === "已核准"), featuredMaterialId: site.featuredMaterialId || "", articleViews };
    window.addEventListener("hashchange", openLegacyHash);
    const legacyArticleId = /^#(material-\d+)$/.exec(location.hash)?.[1];
    const articleId = new URLSearchParams(location.search).get("article") || legacyArticleId;
    if (articleId) {
      const item = content.items.find(entry => entry.id === articleId);
      if (item) {
        if (legacyArticleId && !location.search) history.replaceState(null, "", articleUrl(item));
        renderArticle(item);
      }
      else document.querySelector("#app").innerHTML = `<div class="container not-found"><h1>找不到這篇文章</h1><p>這篇內容可能尚未發布。</p><a class="back-link" href="./">← 返回內容專欄</a></div>`;
    } else renderHome();
    if (["#topics", "#hpe", "#articles"].includes(location.hash) && !articleId) requestAnimationFrame(() => document.querySelector(location.hash)?.scrollIntoView());
  } catch (error) {
    document.querySelector("#app").innerHTML = `<div class="container not-found"><h1>資料目前無法載入</h1><p>${escapeHtml(error.message)}</p></div>`;
  }
}

load();
