let content = { items: [], topics: new Map(), tracks: [], articleOutlines: {}, featuredMaterialId: "" };
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
    ${mediaMarkup(item, index)}
    <div class="card-content"><div class="card-meta"><span>${escapeHtml(topic.title)}</span><span>${escapeHtml(item.format || "文章")}</span>${item.id === content.featuredMaterialId ? '<span class="focus-label">焦點文章</span>' : ""}</div>
    <h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(teaser(item, 105))}</p>
    <div class="card-bottom"><span>${escapeHtml(topic.track)}</span><strong>閱讀文章 ↗</strong></div></div></a>`;
}

function renderHome(filter = "all") {
  const items = content.items;
  const featured = items.find(item => item.id === content.featuredMaterialId) || items[0];
  if (!featured) {
    document.querySelector("#app").innerHTML = '<div class="container not-found"><h1>文章準備中</h1><p>已核准的內容發布後，就會出現在這裡。</p></div>';
    return;
  }
  const topicCounts = new Map();
  items.forEach(item => topicCounts.set(item.topicId, (topicCounts.get(item.topicId) || 0) + 1));
  const visible = filter === "all" ? items : items.filter(item => item.topicId === filter);
  const featuredTopic = topicOf(featured);
  const topicGroups = content.tracks.map(track => {
    const topics = track.topics.filter(topic => topicCounts.has(topic.id));
    if (!topics.length) return "";
    return `<div class="topic-group"><h3>${escapeHtml(track.title)}</h3><div class="filter-list">${topics.map(topic => `<button type="button" class="filter-button" data-filter="${escapeHtml(topic.id)}" aria-pressed="${topic.id === filter}"><span>${escapeHtml(topic.title)}</span><span class="filter-count">${topicCounts.get(topic.id)}</span></button>`).join("")}</div></div>`;
  }).join("");
  const selectedTitle = filter === "all" ? "所有文章" : topicOf({ topicId: filter }).title;
  document.title = "訊達 AI 內容專欄";
  document.querySelector("#app").innerHTML = `<div class="home-page">
    <section class="home-hero"><div class="container hero-grid"><div class="hero-copy"><div class="eyebrow">AI SOLUTIONS / INSIGHTS</div><h1>從一篇內容開始，<br><em>看見 AI 的實際應用。</em></h1><p>探索訊達 AI 解決方案、基礎架構與導入議題。先找到感興趣的主題，再點進文章完整閱讀。</p><a class="hero-link" href="#topics">依主題找文章 <span>↗</span></a></div><div class="hero-art" aria-hidden="true"><div class="art-orbit"></div><div class="art-center">AI</div><div class="art-card"><strong>${String(items.length).padStart(2, "0")}</strong><span>篇已發布內容</span></div><div class="art-spark">✳</div></div></div></section>
    <section class="topics-section" id="topics"><div class="container"><div class="section-heading"><div><div class="eyebrow">EXPLORE TOPICS</div><h2>依主題探索</h2></div><p>選擇主題，只看你感興趣的文章</p></div><div class="topic-all"><button type="button" class="filter-button" data-filter="all" aria-pressed="${filter === "all"}"><span>全部文章</span><span class="filter-count">${items.length}</span></button></div><div class="topic-groups">${topicGroups}</div></div></section>
    <section class="section"><div class="container"><div class="section-heading"><div><div class="eyebrow">FEATURED STORY</div><h2>焦點文章</h2></div><p>先看一個完整的應用情境</p></div><a class="featured" href="${articleUrl(featured)}">${mediaMarkup(featured, 0, true)}<div class="featured-content"><span class="pill">${escapeHtml(featuredTopic.title)}</span><h3>${escapeHtml(featured.title)}</h3><p>${escapeHtml(teaser(featured, 220))}</p><span class="article-link">閱讀完整文章 <span>↗</span></span></div></a></div></section>
    <section class="listing-section" id="articles"><div class="container"><div class="listing-head"><h2 class="listing-title">${escapeHtml(selectedTitle)}</h2><div class="listing-controls"><span class="result-count" aria-live="polite">共 ${visible.length} 篇</span><button type="button" class="reset-filter" ${filter === "all" ? "hidden" : ""}>顯示全部文章</button></div></div><div class="cards">${visible.length ? visible.map(cardMarkup).join("") : '<div class="empty">目前沒有此主題的文章。</div>'}</div></div></section>
  </div>`;
  function applyFilter(selected) {
    document.querySelectorAll("[data-filter]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.filter === selected)));
    const selectedItems = selected === "all" ? items : items.filter(item => item.topicId === selected);
    document.querySelector(".listing-title").textContent = selected === "all" ? "所有文章" : topicOf({ topicId: selected }).title;
    document.querySelector(".result-count").textContent = `共 ${selectedItems.length} 篇`;
    document.querySelector(".reset-filter").hidden = selected === "all";
    document.querySelector(".cards").innerHTML = selectedItems.map(cardMarkup).join("");
    document.querySelector("#articles").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  document.querySelectorAll("[data-filter]").forEach(button => button.addEventListener("click", () => applyFilter(button.dataset.filter)));
  document.querySelector(".reset-filter").addEventListener("click", () => applyFilter("all"));
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
  const related = content.items.filter(other => other.id !== item.id && other.topicId === item.topicId).slice(0, 3);
  const fallbacks = content.items.filter(other => other.id !== item.id && !related.includes(other)).slice(0, 3 - related.length);
  const suggestions = [...related, ...fallbacks];
  const headings = [];
  const body = bodyMarkup(item.body, content.articleOutlines[item.id] || [], headings);
  const sections = headings.filter(heading => heading.level === 2);
  const toc = sections.length >= 3 ? `<nav class="article-toc" aria-label="本文段落"><strong>本文段落</strong><ol>${sections.map(heading => `<li><a href="#${heading.id}">${escapeHtml(heading.title)}</a></li>`).join("")}</ol></nav>` : "";
  const expandableSummary = item.summary && item.summary.length > 220;
  document.title = `${item.title}｜訊達 AI 內容專欄`;
  document.querySelector("#app").innerHTML = `<div class="article-page">
    <div class="article-top"><div class="container"><nav class="breadcrumb" aria-label="所在位置"><a href="./">內容專欄</a><span>›</span><span>${escapeHtml(topic.title)}</span></nav><div class="article-header"><span class="eyebrow">${escapeHtml(topic.track)} / ${escapeHtml(topic.title)}</span><h1>${escapeHtml(item.title)}</h1>${item.summary ? `<p class="lead${expandableSummary ? " is-collapsible" : ""}" id="article-summary">${escapeHtml(item.summary)}</p>${expandableSummary ? '<button type="button" class="summary-toggle" aria-controls="article-summary" aria-expanded="false">展開摘要</button>' : ""}` : ""}<div class="article-byline"><b>訊達 AI 內容</b><span>·</span><span>${escapeHtml(item.format || "文章")}</span></div></div></div></div>
    <div class="container reading-wrap"><article class="article-body">${toc}${body}${attachmentsMarkup(item)}<div class="article-end"><a class="back-link" href="./#articles">← 回到所有文章</a></div></article><aside class="read-sidebar"><div class="side-kicker">KEEP READING</div><h2>接著看</h2>${suggestions.map(other => `<a href="${articleUrl(other)}">${escapeHtml(other.title)} →</a>`).join("")}</aside></div>
    <section class="related"><div class="container"><h2>更多內容</h2><div class="cards">${suggestions.map(cardMarkup).join("")}</div></div></section>
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
    const [siteResponse, materialsResponse] = await Promise.all([
      fetch("data/site.json", { cache: "no-store" }),
      fetch("data/materials.json", { cache: "no-store" })
    ]);
    if (!siteResponse.ok || !materialsResponse.ok) throw new Error("內容資料讀取失敗");
    const [site, materials] = await Promise.all([siteResponse.json(), materialsResponse.json()]);
    const topics = new Map();
    site.tracks.forEach(track => track.topics.forEach(topic => topics.set(topic.id, { title: topic.title, track: track.title })));
    content = { topics, tracks: site.tracks, articleOutlines: site.articleOutlines || {}, items: materials.filter(item => item.status === "已核准"), featuredMaterialId: site.featuredMaterialId || "" };
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
    if (["#topics", "#articles"].includes(location.hash) && !articleId) requestAnimationFrame(() => document.querySelector(location.hash)?.scrollIntoView());
  } catch (error) {
    document.querySelector("#app").innerHTML = `<div class="container not-found"><h1>資料目前無法載入</h1><p>${escapeHtml(error.message)}</p></div>`;
  }
}

load();
