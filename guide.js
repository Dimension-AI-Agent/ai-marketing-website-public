const guidedQuestions = {
  start: { title: "目前最接近哪種情況？", hint: "有幾種都符合的話，先選現在最想處理的一件。", options: [
    ["想試 AI，但還沒找到適合的工作", "a1"], ["有想做的事，不知道怎麼測試", "b1"], ["試過了，結果不太好用", "c1"], ["測試還可以，卻還沒辦法讓同事使用", "d1"], ["已經在用，卻不確定有沒有幫上忙", "e1"]
  ] },
  a1: { title: "有沒有一件工作，讓同事常覺得很花時間？", hint: "例如查資料、整理報表，或反覆輸入同一份資料。", options: [
    ["有，想得到一件", "a2"], ["有幾件，還沒決定從哪件開始", "r1"], ["暫時想不到", "r1"]
  ] },
  a2: { title: "這件工作，你最想改善哪一部分？", hint: "", options: [
    ["處理速度", "r3"], ["出錯或重做的次數", "r3"], ["找資料花的時間", "r3"], ["還沒想清楚", "r2"]
  ] },
  b1: { title: "測試做完，你們會看什麼來決定要不要繼續？", hint: "", options: [
    ["已經知道要看什麼", "b2"], ["只有大概的期待", "r2"], ["還沒討論過／我不清楚", "r2"]
  ] },
  b2: { title: "有沒有幾個真實的例子可以拿來試？", hint: "", options: [
    ["有，資料也能使用", "r3"], ["知道資料在哪裡，還沒整理", "r4"], ["還不知道要準備什麼", "r4"]
  ] },
  c1: { title: "哪件事讓你覺得不好用？", hint: "", options: [
    ["常答錯、漏掉重點", "c2"], ["同樣的問題，每次結果不一樣", "r5"], ["回答還可以，但後面還得手動整理、輸入", "r6"], ["說不上來，只覺得沒有幫助", "r5"]
  ] },
  c2: { title: "回頭看資料，正確答案原本在裡面嗎？", hint: "", options: [
    ["有，資料裡找得到", "r5"], ["沒有，或資料已經過期", "r4"], ["還沒查過", "r4"]
  ] },
  d1: { title: "目前卡在哪裡？", hint: "", options: [
    ["資料和權限還沒確認", "r7"], ["還接不上 CRM、ERP 等工作系統", "r6"], ["誰使用、誰審核、出錯找誰還沒談好", "r8"], ["卡了好幾件事，還沒整理清楚", "r8"], ["我不清楚目前在等什麼", "r8"]
  ] },
  e1: { title: "開始使用前後，有留下工作紀錄嗎？", hint: "例如處理時間、完成件數，或人工修改的次數。", options: [
    ["有，前後都有", "e2"], ["只有開始用 AI 之後的紀錄", "r9"], ["沒有／我不清楚", "r9"]
  ] },
  e2: { title: "當初希望改善什麼，大家有共識嗎？", hint: "", options: [
    ["有，知道要比較什麼", "r10"], ["大概知道，但每個人說法不同", "r2"], ["當初沒有談過", "r2"]
  ] }
};

let guidedCurrent = "start";
let guidedHistory = [];

function guideControls() {
  return guidedHistory.length ? '<div class="guided-controls"><button type="button" data-guide-action="back">← 回上一題</button><button type="button" data-guide-action="reset">重新選情況</button></div>' : "";
}

function renderGuide() {
  const root = document.querySelector("#guide-content");
  const progress = document.querySelector("#guide-progress");
  if (!root || !progress) return;
  if (!content.guideRecommendations?.results) {
    progress.textContent = "";
    root.innerHTML = '<p class="guided-error">引導內容暫時無法載入。你仍可以到「所有文章」搜尋內容。</p>';
    return;
  }
  const question = guidedQuestions[guidedCurrent];
  if (question) {
    progress.textContent = `第 ${guidedHistory.length + 1} 題`;
    const previous = guidedHistory.at(-1);
    root.innerHTML = `<div class="guided-question">${previous ? `<p class="guided-answer"><strong>上一個回答：</strong>${escapeHtml(previous.answer)}</p>` : ""}<h3 id="guide-current-title" tabindex="-1">${escapeHtml(question.title)}</h3>${question.hint ? `<p class="guided-hint">${escapeHtml(question.hint)}</p>` : ""}<div class="guided-options" role="group" aria-labelledby="guide-current-title">${question.options.map(([label], index) => `<button type="button" data-guide-option="${index}"><span>${escapeHtml(label)}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></button>`).join("")}</div>${guideControls()}</div>`;
    return;
  }
  const result = content.guideRecommendations.results[guidedCurrent];
  if (!result || typeof result.title !== "string" || typeof result.guidance !== "string") {
    progress.textContent = "建議";
    root.innerHTML = '<p class="guided-error">這項建議暫時無法顯示。請回到上一題再選一次。</p>' + guideControls();
    return;
  }
  progress.textContent = "結果摘要";
  const actions = Array.isArray(result.actions) ? result.actions.filter(action => typeof action === "string" && action.trim()) : [];
  const actionMarkup = actions.length ? `<ol class="guided-report-actions">${actions.map(action => `<li>${escapeHtml(action)}</li>`).join("")}</ol>` : result.guidance.split("\n\n").map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join("");
  const links = (Array.isArray(result.articles) ? result.articles : []).filter(link => {
    const article = content.items.find(item => item.id === link.id);
    return article && article.status === "已核准" && !isHpe(article) && article.revision === link.revision;
  }).slice(0, 2).map(link => {
    const article = content.items.find(item => item.id === link.id);
    return `<a href="${articleUrl(article)}"><strong>${escapeHtml(article.title)} ↗</strong><small>${escapeHtml(link.why)}</small></a>`;
  }).join("");
  const browseTopic = content.topics?.get(result.browseTopic);
  const browseCount = browseTopic ? content.items.filter(item => item.status === "已核准" && item.topicId === result.browseTopic).length : 0;
  const browseHref = browseCount ? `./?topic=${encodeURIComponent(result.browseTopic)}#all-articles` : "./#all-articles";
  const browseLabel = browseCount ? `閱讀${browseTopic.title}（${browseCount} 篇） →` : "瀏覽所有文章 →";
  const browseMarkup = `<p class="guided-browse"><a href="${browseHref}">${escapeHtml(browseLabel)}</a></p>`;
  root.innerHTML = `<section class="guided-report" aria-labelledby="guide-current-title"><h3 id="guide-current-title" tabindex="-1">你的 AI 導入摘要</h3><div class="guided-report-grid"><div class="guided-report-overview"><dl><dt>目前情況</dt><dd>${escapeHtml(guidedHistory[0]?.answer || "尚未選擇情況")}</dd><dt>優先處理</dt><dd class="guided-report-priority">${escapeHtml(result.title)}</dd></dl></div><section class="guided-report-action-section" aria-labelledby="guide-actions-title"><h4 id="guide-actions-title">建議行動</h4>${actionMarkup}</section></div>${links ? `<div class="guided-reading"><h4>相關閱讀</h4><div>${links}</div></div>` : ""}${browseMarkup}<details class="guided-report-answers"><summary>查看回答（${guidedHistory.length} 題）</summary><ol>${guidedHistory.map(item => `<li><span>${escapeHtml(guidedQuestions[item.from]?.title || "回答")}</span><strong>${escapeHtml(item.answer)}</strong></li>`).join("")}</ol></details><div class="guided-controls"><button type="button" data-guide-action="back">修改上一題</button><button type="button" data-guide-action="reset">重新開始</button></div></section>`;
}

function handleGuideClick(event) {
  const option = event.target.closest("[data-guide-option]");
  if (option && guidedQuestions[guidedCurrent]) {
    const choice = guidedQuestions[guidedCurrent].options[Number(option.dataset.guideOption)];
    if (!choice) return;
    guidedHistory.push({ from: guidedCurrent, answer: choice[0] });
    guidedCurrent = choice[1];
    renderGuide();
    document.querySelector("#guide-current-title")?.focus();
    return;
  }
  const action = event.target.closest("[data-guide-action]")?.dataset.guideAction;
  if (action === "back") {
    const previous = guidedHistory.pop();
    if (previous) guidedCurrent = previous.from;
    renderGuide();
    document.querySelector("#guide-current-title")?.focus();
  } else if (action === "reset") {
    guidedCurrent = "start";
    guidedHistory = [];
    renderGuide();
    document.querySelector("#guide-current-title")?.focus();
  }
}
