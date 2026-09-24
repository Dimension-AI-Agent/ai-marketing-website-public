const formatIcons = {
  "圖片": "▧",
  "影片": "▷",
  "Podcast": "◖))",
  "Blog": "Aa",
  "互動遊戲": "✳",
  "Agent UI 互動": "⌘",
  "問卷": "☷",
  "電子報": "✉"
};

const formatTrack = (track) => `track-${track.accent}`;

function escapeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function safeAssetHref(value) {
  if (typeof value !== "string") return "";
  try {
    const decoded = decodeURIComponent(value);
    if (!decoded.startsWith("assets/") || /[%\\\u0000-\u001f]/.test(decoded)) return "";
    const parts = decoded.split("/");
    if (parts.some((part) => !part || part === "." || part === "..")) return "";
    return parts.map(encodeURIComponent).join("/");
  } catch { return ""; }
}

function safePublicHref(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : "";
  } catch { return ""; }
}

function safeMaterialHref(item) {
  return safePublicHref(item.url) || safeAssetHref(item.file);
}

function renderMaterial(item) {
  const files = Array.isArray(item.files) ? item.files : item.file ? [{ name: item.title, file: item.file }] : [];
  const links = Array.isArray(item.links) ? item.links : item.url ? [item.url] : [];
  const attachments = files.map((file) => {
    const href = safeAssetHref(file.file);
    if (!href) return "";
    const name = escapeText(file.name || "附件");
    const src = escapeText(href);
    let preview = "";
    if (file.kind === "image") preview = `<img class="material-image" src="${src}" alt="${name}" loading="lazy" />`;
    if (file.kind === "audio") preview = `<audio controls preload="none" src="${src}" aria-label="${name}"></audio>`;
    if (file.kind === "video") preview = `<video controls preload="none" src="${src}" aria-label="${name}"></video>`;
    return `<div class="material-attachment">${preview}<a href="${src}" target="_blank" rel="noopener noreferrer">開啟附件：${name} ↗</a></div>`;
  }).join("");
  const linkMarkup = links.map((value, index) => {
    const href = safePublicHref(value);
    return href ? `<a class="material-external" href="${escapeText(href)}" target="_blank" rel="noopener noreferrer">開啟素材連結${links.length > 1 ? " " + (index + 1) : ""} ↗</a>` : "";
  }).join("");
  const body = item.body ? `<details class="material-body"><summary>閱讀全文</summary><div>${escapeText(item.body)}</div></details>` : "";
  return `<li class="material-item" id="${escapeText(item.id || "")}">
    <div class="material-head"><strong>${escapeText(item.title || "未命名素材")}</strong><span class="material-kind">${escapeText(item.format || "素材")}</span></div>
    ${item.summary ? `<p class="material-summary">${escapeText(item.summary)}</p>` : ""}
    ${body}${attachments}${linkMarkup}
  </li>`;
}

function renderTopic(topic, track, materials) {
  const items = materials.filter((item) => item.topicId === topic.id);
  const materialMarkup = items.length
    ? `<ul class="material-list">${items.map(renderMaterial).join("")}</ul>`
    : `<div class="topic-empty"><span class="empty-icon">＋</span><span>待加入素材</span></div>`;

  return `<article class="topic-card ${formatTrack(track)}">
    <div class="topic-card-top"><span class="topic-index">${escapeText(track.number)} / ${String(track.topics.indexOf(topic) + 1).padStart(2, "0")}</span><span class="topic-count">${items.length} 份素材</span></div>
    <h4>${escapeText(topic.title)}</h4>
    <p>${escapeText(topic.description)}</p>
    <div class="topic-materials">${materialMarkup}</div>
  </article>`;
}

function renderTrack(track, materials) {
  const trackTopics = track.topics.map((topic) => renderTopic(topic, track, materials)).join("");
  return `<section class="track-panel ${formatTrack(track)}">
    <div class="track-header">
      <div class="track-title-group"><span class="track-number">${escapeText(track.number)}</span><div><span class="track-kicker">CONTENT STREAM ${escapeText(track.number)}</span><h3>${escapeText(track.title)}</h3><p>${escapeText(track.subtitle)}</p></div></div>
      <div class="track-people"><span>主責</span><strong>${escapeText(track.lead)}</strong><small>${track.members.map(escapeText).join(" · ")}</small></div>
    </div>
    <div class="topic-grid">${trackTopics}</div>
  </section>`;
}

function renderFormats(formats) {
  document.querySelector("#format-list").innerHTML = formats.map((format, index) =>
    `<div class="format-chip"><span class="format-icon">${formatIcons[format] || "✦"}</span><span>${escapeText(format)}</span><small>${String(index + 1).padStart(2, "0")}</small></div>`
  ).join("");
}

async function loadContent() {
  const trackContainer = document.querySelector("#track-list");
  try {
    const [siteResponse, materialsResponse] = await Promise.all([
      fetch("./data/site.json", { cache: "no-store" }),
      fetch("./data/materials.json", { cache: "no-store" })
    ]);
    if (!siteResponse.ok || !materialsResponse.ok) throw new Error("內容資料無法讀取");
    const [site, sourceMaterials] = await Promise.all([siteResponse.json(), materialsResponse.json()]);
    const materials = sourceMaterials.filter((item) => item.status === "已核准");
    trackContainer.innerHTML = site.tracks.map((track) => renderTrack(track, materials)).join("");
    renderFormats(site.formats);
    try { document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView(); } catch {}

    const topicCount = site.tracks.reduce((sum, track) => sum + track.topics.length, 0);
    document.querySelector("#topic-count").textContent = String(topicCount).padStart(2, "0");
    document.querySelector("#material-count").textContent = String(materials.length).padStart(2, "0");
    document.querySelector("#hero-material-count").textContent = String(materials.length).padStart(2, "0");
  } catch (error) {
    trackContainer.innerHTML = `<div class="error-state"><strong>資料目前無法載入</strong><span>${escapeText(error.message)}。請稍後重新整理頁面。</span></div>`;
  }
}

if (typeof document !== "undefined") loadContent();
