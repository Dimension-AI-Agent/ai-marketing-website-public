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

function safeMaterialHref(item) {
  if (item.url) {
    try {
      const parsed = new URL(item.url);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.href;
    } catch {
      return "";
    }
  }
  if (item.file && /^assets\/[a-zA-Z0-9._/-]+$/.test(item.file) && !item.file.includes("..")) {
    return item.file;
  }
  return "";
}

function renderTopic(topic, track, materials) {
  const items = materials.filter((item) => item.topicId === topic.id);
  const materialMarkup = items.length
    ? `<ul class="material-list">${items.map((item) => {
        const href = safeMaterialHref(item);
        const title = escapeText(item.title || "未命名素材");
        const itemTitle = href
          ? `<a href="${escapeText(href)}" ${href.startsWith("http") ? 'target="_blank" rel="noreferrer noopener"' : ""}>${title}<span aria-hidden="true">↗</span></a>`
          : `<span class="material-title">${title}</span>`;
        return `<li>${itemTitle}<span class="material-kind">${escapeText(item.format || item.type || "素材")}</span></li>`;
      }).join("")}</ul>`
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
    const [site, materials] = await Promise.all([siteResponse.json(), materialsResponse.json()]);
    trackContainer.innerHTML = site.tracks.map((track) => renderTrack(track, materials)).join("");
    renderFormats(site.formats);

    const topicCount = site.tracks.reduce((sum, track) => sum + track.topics.length, 0);
    document.querySelector("#topic-count").textContent = String(topicCount).padStart(2, "0");
    document.querySelector("#material-count").textContent = String(materials.length).padStart(2, "0");
    document.querySelector("#hero-material-count").textContent = String(materials.length).padStart(2, "0");
  } catch (error) {
    trackContainer.innerHTML = `<div class="error-state"><strong>資料目前無法載入</strong><span>${escapeText(error.message)}。請確認以本機伺服器開啟網站，並檢查 data/ 目錄。</span></div>`;
  }
}

loadContent();
