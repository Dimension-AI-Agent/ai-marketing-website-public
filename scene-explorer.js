const sceneFloorObjects = {
  application: [
    { id: 'service', title: '智慧客服工作站', question: '從哪一段日常工作開始？', detail: '先看報修、派工或知識查找中的重複工作，再選一段流程做小範圍測試。', articles: ['material-13', 'material-44'] },
    { id: 'workflow', title: '工作流程看板', question: '這個流程需要 AI Agent 嗎？', detail: '把輸入、工具、步驟與完成條件列出來，再判斷哪些工作適合讓 AI 協助。', articles: ['material-41', 'material-30'] },
    { id: 'review', title: '人工審核桌', question: '哪些決定需要交回人？', detail: '先約定 AI 可以做什麼、何時停止，以及誰負責確認結果，讓自動化保留必要的人工介入。', articles: ['material-46', 'material-36'] }
  ],
  integration: [
    { id: 'systems', title: '企業系統節點', question: 'AI 如何接上既有系統？', detail: '從需要使用的資料與工具開始，釐清系統介面、部署位置，以及每一步允許的操作。', articles: ['material-27'] },
    { id: 'permissions', title: '資料與權限閘門', question: 'AI 可以讀哪些內部資料？', detail: '把使用者身分、資料範圍與存取權限一起確認，讓 AI 的可讀範圍符合實際工作需求。', articles: ['material-34', 'material-26'] },
    { id: 'operations', title: '版本與維運控制台', question: '上線後如何更新與回復？', detail: '將 Prompt、Skill 與設定納入版本管理，更新前檢查，並保留可追溯的回復方式。', articles: ['material-49', 'material-35'] }
  ],
  infrastructure: [
    { id: 'compute', title: '運算機櫃', question: '需要多少運算資源？', detail: '模型、同時使用人數與回應需求會影響設備選擇。先釐清工作負載，再探索運算產品與部署方式。', articles: ['material-20', 'material-16'] },
    { id: 'storage', title: '儲存設備', question: '資料要放在哪裡、如何保存？', detail: '連同容量、存取方式、備份與恢復需求一起評估，讓資料保存方式符合使用情境。', articles: ['material-22', 'material-47'] },
    { id: 'networking', title: '網路交換器', question: '系統之間如何連接？', detail: '先確認連線需求、設備身分與存取範圍，再探索網路設備與權限管理的相關內容。', articles: ['material-23', 'material-39'] }
  ]
};
const sceneSelection = new Map();
try {
  const saved = JSON.parse(window.sessionStorage?.getItem('xunda-scene-selection') || '{}');
  Object.entries(sceneFloorObjects).forEach(([floor, objects]) => {
    if (objects.some(object => object.id === saved[floor])) sceneSelection.set(floor, saved[floor]);
  });
} catch { /* Browsing remains available when storage is disabled. */ }
let sceneRuntime = null;
let sceneModulePromise = null;
let sceneRequest = 0;

function sceneObjectDetail(floor, id) {
  const object = sceneFloorObjects[floor]?.find(item => item.id === id);
  if (!object) return '';
  const articles = object.articles.map(articleId => content.items.find(item => item.id === articleId && item.status === '已核准')).filter(Boolean);
  return `<span class="scene-detail-label">${escapeHtml(object.title)}</span><h3>${escapeHtml(object.question)}</h3><p>${escapeHtml(object.detail)}</p><div class="scene-detail-reading"><span>相關文章</span>${articles.length ? articles.map(item => `<a href="${escapeHtml(articleUrl(item) + '&from=scene-' + floor)}">${escapeHtml(item.title)} <span aria-hidden="true">↗</span></a>`).join('') : '<p>目前沒有相關的已核准文章，可到所有文章搜尋。</p>'}</div>`;
}

function renderSceneExplorer(floor) {
  const objects = sceneFloorObjects[floor];
  return `<section class="scene-explorer" data-scene-floor="${floor}" aria-label="${escapeHtml(siteLayerChoices[floor].title)} 3D 探索">
    <div class="scene-explorer-heading"><span><i aria-hidden="true"></i>探索這一層</span><p>點選物件，從一個問題開始閱讀。</p></div>
    <div class="scene-explorer-grid"><div class="scene-stage-column">
      <div class="scene-stage" data-scene-stage><div class="scene-poster site-layer-scene" aria-hidden="true"><img src="assets/visuals/ai-system-cutaway.png" alt=""></div><div class="scene-canvas-slot" data-scene-canvas></div><div class="scene-markers" data-scene-markers></div><span class="scene-view-label" aria-hidden="true">${escapeHtml(siteLayerChoices[floor].title)} / 空間探索</span></div>
      <div class="scene-toolbar" role="group" aria-label="3D 視角控制"><button type="button" data-scene-control="zoom-in" aria-label="放大場景" disabled>＋</button><button type="button" data-scene-control="zoom-out" aria-label="縮小場景" disabled>−</button><button type="button" data-scene-control="left" aria-label="向左旋轉場景" disabled>↶</button><button type="button" data-scene-control="right" aria-label="向右旋轉場景" disabled>↷</button><button type="button" data-scene-control="reset" disabled>重設視角</button><button type="button" data-scene-control="drag" aria-pressed="false" disabled>啟用拖曳</button></div>
      <p class="scene-status" data-scene-status role="status">正在準備 3D 場景，仍可使用下方物件清單。</p>
      <div class="scene-object-list" role="group" aria-label="選擇探索物件">${objects.map((item, index) => `<button type="button" data-scene-object="${item.id}" aria-pressed="${sceneSelection.get(floor) === item.id}" aria-controls="scene-detail-${floor}"><span aria-hidden="true">${index + 1}</span>${escapeHtml(item.title)}</button>`).join('')}</div>
    </div><div class="scene-detail" id="scene-detail-${floor}" tabindex="-1" aria-label="物件簡介">${sceneSelection.has(floor) ? sceneObjectDetail(floor, sceneSelection.get(floor)) : '<span class="scene-detail-label">從一個物件開始</span><h3>這一層，和你的問題有什麼關係？</h3><p>選擇場景中的標記或下方物件，查看它的用途與相關文章。</p><div class="scene-detail-note"><span>操作提示</span><p>用 ＋／− 調整遠近，↶／↷ 改變角度。啟用拖曳後，可拖動場景；手機使用雙指縮放。</p></div>'}</div></div>
    <p class="scene-disclaimer">場景為示意，不代表實際設備型號、客戶環境或必備建置規模。</p>
    <details class="scene-reading-fallback"><summary>以文字瀏覽本層物件與相關文章</summary><div>${objects.map(item => `<section>${sceneObjectDetail(floor, item.id)}</section>`).join('')}</div></details>
  </section>`;
}

function selectSceneObject(floor, id, moveFocus = false) {
  if (!sceneFloorObjects[floor]?.some(item => item.id === id)) return;
  sceneSelection.set(floor, id);
  try { window.sessionStorage?.setItem('xunda-scene-selection', JSON.stringify(Object.fromEntries(sceneSelection))); } catch { /* Optional session memory. */ }
  const explorer = document.querySelector(`[data-scene-floor="${floor}"]`);
  if (!explorer) return;
  explorer.querySelectorAll('[data-scene-object]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.sceneObject === id)));
  const detail = explorer.querySelector('.scene-detail');
  detail.innerHTML = sceneObjectDetail(floor, id);
  if (moveFocus) detail.focus({ preventScroll: !window.matchMedia('(max-width:800px)').matches });
  if (sceneRuntime?.floor === floor) sceneRuntime.select(id);
}

function sceneFailure(explorer) {
  explorer.dataset.sceneState = 'fallback';
  explorer.querySelector('[data-scene-status]').textContent = '3D 場景目前無法顯示，仍可選擇物件閱讀簡介與文章。';
  explorer.querySelectorAll('[data-scene-control]').forEach(button => { button.disabled = true; });
  const retry = explorer.querySelector('[data-scene-retry]');
  if (!retry) {
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.sceneRetry = ''; button.textContent = '重新載入 3D';
    explorer.querySelector('[data-scene-status]').append(' ', button);
  }
}

async function showSceneExplorer(floor) {
  const request = ++sceneRequest;
  if (sceneRuntime?.floor === floor) { sceneRuntime.resize(); return; }
  if (sceneRuntime) { sceneRuntime.dispose(); sceneRuntime = null; }
  if (!sceneFloorObjects[floor]) return;
  const explorer = document.querySelector(`[data-scene-floor="${floor}"]`);
  if (!explorer) return;
  explorer.dataset.sceneState = 'loading';
  explorer.querySelector('[data-scene-status]').textContent = '正在準備 3D 場景，仍可使用下方物件清單。';
  explorer.querySelectorAll('[data-scene-control]').forEach(button => { button.disabled = true; });
  try {
    if (!sceneModulePromise) sceneModulePromise = import('./scene-renderer.mjs?v=1').catch(error => { sceneModulePromise = null; throw error; });
    const module = await sceneModulePromise;
    if (request !== sceneRequest || explorer.closest('[hidden]')) return;
    sceneRuntime = module.createSceneRenderer(explorer, floor, id => selectSceneObject(floor, id, true), () => {
      if (sceneRuntime?.floor === floor) { sceneRuntime.dispose(); sceneRuntime = null; }
      sceneFailure(explorer);
    });
    explorer.dataset.sceneState = 'ready';
    explorer.querySelector('[data-scene-status]').textContent = '點選場景標記或下方物件查看簡介；拖曳需先啟用。';
    explorer.querySelectorAll('[data-scene-control]').forEach(button => { button.disabled = false; });
    explorer.querySelector('[data-scene-control="drag"]').setAttribute('aria-pressed', 'false');
    if (sceneSelection.has(floor)) selectSceneObject(floor, sceneSelection.get(floor));
  } catch {
    if (request === sceneRequest) sceneFailure(explorer);
  }
}

function bindSceneExplorer() {
  document.querySelector('#app').addEventListener('click', event => {
    const explorer = event.target.closest('[data-scene-floor]');
    if (!explorer) return;
    const floor = explorer.dataset.sceneFloor;
    const object = event.target.closest('[data-scene-object]');
    if (object) { selectSceneObject(floor, object.dataset.sceneObject, true); return; }
    if (event.target.closest('[data-scene-retry]')) { showSceneExplorer(floor); return; }
    const control = event.target.closest('[data-scene-control]');
    if (!control || sceneRuntime?.floor !== floor) return;
    if (control.dataset.sceneControl === 'drag') {
      const active = control.getAttribute('aria-pressed') !== 'true';
      control.setAttribute('aria-pressed', String(active));
      sceneRuntime.setDrag(active);
    } else sceneRuntime.control(control.dataset.sceneControl);
  });
}
