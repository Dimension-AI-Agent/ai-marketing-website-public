let content = { items: [], topics: new Map(), tracks: [], articleOutlines: {}, relatedReading: {}, guideRecommendations: null };
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
const layerMeta = {
  application: { title: "應用情境", topics: ["industry-cases", "hpe-use-cases", "faq", "benefit-assessment", "agent-other"] },
  integration: { title: "導入與整合", topics: ["enterprise-adoption", "on-prem-integration", "open-source-tools", "integrated-solutions"] },
  infrastructure: { title: "基礎架構", topics: ["hardware", "software", "competitive-positioning", "industry-trends", "solutions-other"] }
};

function isHpe(item) { return /\bHPE\b/i.test(item.title) || item.topicId === "hpe-use-cases"; }
function matchesFilter(item, filter) {
  if (filter === "all") return true;
  if (filter === "hpe") return isHpe(item);
  if (filter === "security") return content.topics.get(item.topicId)?.trackId === "security-governance";
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
  if (filter === "security") return "資安與存取治理";
  if (filter.startsWith("layer:")) return layerMeta[filter.slice(6)]?.title || "所有文章";
  if (filter.startsWith("topic:")) return content.topics.get(filter.slice(6))?.title || "所有文章";
  return "所有文章";
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

function nextActionFor(item) {
  const actions = {
    "enterprise-adoption": ["寫下第一輪要驗證的工作", "先界定問題、可用資料與判斷方式，再決定要不要進入測試。", ["要改善哪一段具體工作？", "有哪些可用的真實資料或案例？", "什麼結果值得繼續？"]],
    "benefit-assessment": ["決定要怎麼衡量結果", "把期待的改善轉成可比較的紀錄與指標。", ["現在的處理方式有留下哪些紀錄？", "希望改善速度、品質，還是成本？", "要用什麼期間與條件比較？"]],
    "on-prem-integration": ["盤點需要連接的系統與資料", "先釐清既有環境與權限，才能評估整合範圍。", ["目前有哪些系統和資料來源？", "哪些資料不能離開現有環境？", "哪些動作需要人員審核？"]],
    "ai-security": ["盤點資料與存取邊界", "把可讀資料、使用者權限與紀錄方式列清楚。", ["誰可以使用這項功能？", "每個角色可以讀取哪些資料？", "如何檢查答案與操作紀錄？"]],
    "network-access-security": ["盤點裝置與網路存取條件", "先列出裝置類型、使用者身分與需要保護的網路範圍。", ["哪些裝置需要連入？", "如何確認使用者或裝置身分？", "不同角色可進入哪些網段？"]],
    "industry-cases": ["比對自己的流程條件", "先確認文章中的情境與你的工作流程有多少相似處。", ["你想改善的是哪一段流程？", "目前有哪些系統和交接點？", "哪些結果需要另外驗證？"]],
    "industry-trends": ["記下需要追蹤的變化", "把趨勢轉成與自己業務或技術環境有關的待確認問題。", ["哪項變化與目前工作有關？", "需要補查哪些原始資料？", "何時再檢視這項判斷？"]]
  };
  const solution = ["hardware", "software", "integrated-solutions", "competitive-positioning", "hpe-use-cases"].includes(item.topicId)
    ? ["整理選型前提", "先把工作負載、既有環境與限制寫清楚，再比較方案。", ["要支援哪些工作與使用人數？", "現有設備、資料與系統是什麼？", "容量、維運或移轉有哪些限制？"]] : null;
  const [title, why, checks] = actions[item.topicId] || solution || ["列出還需要確認的問題", "把文章中的資訊對照自己的情境，標出尚未確認的條件。", ["哪一段內容與目前問題最相關？", "有哪些前提與你的環境不同？", "下一步需要向誰確認？"]];
  return { title, why, checks };
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
  const next = nextActionFor(item);
  const returnHref = isHpe(item) ? "./#hpe" : "./#home-search";
  const returnLabel = isHpe(item) ? "← 返回 HPE 專區" : "← 返回搜尋文章";
  document.title = `${item.title}｜訊達 AI 內容專欄`;
  document.querySelector("#app").innerHTML = `<div class="article-page">
    <div class="article-top"><div class="container"><nav class="breadcrumb" aria-label="所在位置"><a href="./">內容專欄</a><span>›</span><span>${escapeHtml(topic.title)}</span></nav><div class="article-header"><span class="eyebrow">${escapeHtml(topic.track)} / ${escapeHtml(topic.title)}</span><h1>${escapeHtml(item.title)}</h1>${item.summary ? `<p class="lead${expandableSummary ? " is-collapsible" : ""}" id="article-summary">${escapeHtml(item.summary)}</p>${expandableSummary ? '<button type="button" class="summary-toggle" aria-controls="article-summary" aria-expanded="false">展開摘要</button>' : ""}` : ""}<div class="article-byline"><b>訊達 AI 內容</b><span>·</span><span>${escapeHtml(item.format || "文章")}</span></div></div></div></div>
    <div class="container reading-wrap"><article class="article-body">${toc}${body}${attachmentsMarkup(item)}<section class="article-next-action" aria-labelledby="article-next-title"><span>讀完可以做什麼</span><h2 id="article-next-title">${escapeHtml(next.title)}</h2><p>${escapeHtml(next.why)}</p><button type="button" class="article-next-toggle" aria-controls="article-next-checks" aria-expanded="false">查看要確認的事項 ↗</button><ul id="article-next-checks" hidden>${next.checks.map(check => `<li>${escapeHtml(check)}</li>`).join("")}</ul></section><div class="article-end"><a class="back-link" href="${returnHref}">${returnLabel}</a></div></article>${guideMarkup}</div>
  </div>`;
  const summaryToggle = document.querySelector(".summary-toggle");
  if (expandableSummary && summaryToggle?.addEventListener) summaryToggle.addEventListener("click", () => {
    const expanded = summaryToggle.getAttribute("aria-expanded") !== "true";
    document.querySelector("#article-summary").classList.toggle("is-expanded", expanded);
    summaryToggle.setAttribute("aria-expanded", String(expanded));
    summaryToggle.textContent = expanded ? "收合摘要" : "展開摘要";
  });
  document.querySelector(".article-next-toggle")?.addEventListener("click", event => {
    const expanded = event.currentTarget.getAttribute("aria-expanded") !== "true";
    event.currentTarget.setAttribute("aria-expanded", String(expanded));
    event.currentTarget.textContent = expanded ? "收合要確認的事項 ↑" : "查看要確認的事項 ↗";
    document.querySelector("#article-next-checks").hidden = !expanded;
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
    const [siteResponse, materialsResponse, guideRecommendations] = await Promise.all([
      fetch("data/site.json", { cache: "no-store" }),
      fetch("data/materials.json", { cache: "no-store" }),
      fetch("data/guide-recommendations.json", { cache: "no-store" }).then(response => response.ok ? response.json() : null).catch(() => null)
    ]);
    if (!siteResponse.ok || !materialsResponse.ok) throw new Error("內容資料讀取失敗");
    const [site, materials] = await Promise.all([siteResponse.json(), materialsResponse.json()]);
    const topics = new Map();
    site.tracks.forEach(track => track.topics.forEach(topic => topics.set(topic.id, { title: topic.title, track: track.title, trackId: track.id })));
    content = { topics, tracks: site.tracks, articleOutlines: site.articleOutlines || {}, relatedReading: site.relatedReading || {}, items: materials.filter(item => item.status === "已核准"), guideRecommendations: guideRecommendations?.version === 1 ? guideRecommendations : null };
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
    } else renderSiteViews();
  } catch (error) {
    document.querySelector("#app").innerHTML = `<div class="container not-found"><h1>資料目前無法載入</h1><p>${escapeHtml(error.message)}</p></div>`;
  }
}

load();
