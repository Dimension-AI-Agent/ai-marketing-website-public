const adoptionArrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';
let adoptionData = null;
let adoptionArticles = [];
const adoptionDesktop = window.matchMedia('(min-width: 701px)');
const adoptionEscape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const adoptionNumber = n => String(n).padStart(2, '0');
const adoptionList = entries => `<ul>${entries.map(text => `<li>${adoptionEscape(text)}</li>`).join('')}</ul>`;

function validateAdoptionData(data) {
  const text = value => typeof value === 'string' && value.trim().length > 0;
  const texts = values => Array.isArray(values) && values.length > 0 && values.every(text);
  const article = value => value && /^material-\d+$/.test(value.id) && text(value.why);
  if (data?.version !== 1 || !text(data.overview?.title) || !texts(data.overview.intro) || !text(data.overview.note) || !Array.isArray(data.steps) || data.steps.length !== 8) return false;
  if (!data.steps.every((step, i) => step && step.id === `step-${i + 1}` && ['title','short','lead','problem','output','done','watch','example'].every(key => text(step[key])) && texts(step.questions) && texts(step.work) && Array.isArray(step.articles) && step.articles.every(article))) return false;
  if (!['title','text','action'].every(key => text(data.scenarioTeaser?.[key]))) return false;
  const scenario = data.scenario;
  return Boolean(scenario && ['title','lead','label','problem','scope','sequenceIntro'].every(key => text(scenario[key])) && text(scenario.workflow?.title) && texts(scenario.workflow.steps) && text(scenario.workflow.note) && Array.isArray(scenario.steps) && scenario.steps.length === 8 && scenario.steps.every((row, i) => row && row.stepId === data.steps[i].id && text(row.work) && text(row.output)) && ['hpe','xunda'].every(key => text(scenario.roles?.[key]?.title) && text(scenario.roles[key].text)) && article(scenario.roles.hpe.article) && ['title','text','action'].every(key => text(scenario.start?.[key])));
}

function adoptionArticleMarkup(links, role = false) {
  return links.map(link => {
    if (!/^material-\d+$/.test(link.id)) return '';
    const article = adoptionArticles.find(item => item.id === link.id && item.status === '已核准');
    if (!article) return '';
    const href = `./?article=${encodeURIComponent(article.id)}`;
    if (role) return `<a class="text-link" href="${href}">${adoptionEscape(link.why)} ${adoptionArrow}</a>`;
    return `<a href="${href}"><span>${adoptionEscape(article.title)}<small>${adoptionEscape(link.why)}</small></span>${adoptionArrow}</a>`;
  }).join('');
}

function adoptionOverview() {
  const {overview, steps, scenarioTeaser} = adoptionData;
  return `<div class="wrap guide-overview"><a class="back" href="./#home">${adoptionArrow} 返回首頁</a><section id="steps" class="steps-section" aria-labelledby="steps-title"><div class="overview-intro"><h1 id="steps-title">${adoptionEscape(overview.title)}</h1><p class="lead">${overview.intro.map(adoptionEscape).join('<br>')}</p></div><ol class="step-grid">${steps.map((step, i) => `<li><a class="step-entry" href="#step/${i+1}"><span class="step-num">${adoptionNumber(i+1)}</span><span><span class="step-name">${adoptionEscape(step.title)}</span><span class="step-desc">${adoptionEscape(step.short)}</span></span>${adoptionArrow}</a></li>`).join('')}</ol><p class="step-note">${adoptionEscape(overview.note)}</p><aside class="scenario-teaser"><div><h3>${adoptionEscape(scenarioTeaser.title)}</h3><p>${adoptionEscape(scenarioTeaser.text)}</p></div><a class="primary" href="#scenario">${adoptionEscape(scenarioTeaser.action)} ${adoptionArrow}</a></aside></section></div>`;
}

function adoptionStep(n) {
  const {steps} = adoptionData;
  const step = steps[n-1];
  const articles = adoptionArticleMarkup(step.articles);
  return `<div class="wrap"><a class="back" href="#steps">${adoptionArrow} 返回 AI導入步驟</a><div class="reading-layout"><details class="step-navigation"><summary>八個導入步驟</summary><nav aria-label="導入步驟"><ol>${steps.map((entry, i) => `<li><a href="#step/${i+1}"${n===i+1?' aria-current="step"':''}><small>${adoptionNumber(i+1)}</small><span>${adoptionEscape(entry.title)}</span></a></li>`).join('')}</ol></nav></details><article class="reading"><div class="step-heading"><span class="large-num" aria-label="第${n}步">${adoptionNumber(n)}</span><h1>${adoptionEscape(step.title)}</h1></div><p class="lead">${adoptionEscape(step.lead)}</p><div class="problem"><strong>這一步解決什麼問題？</strong>${adoptionEscape(step.problem)}</div><section><h2>先問清楚這些事</h2>${adoptionList(step.questions)}</section><section><h2>接著要做的工作</h2>${step.work.map((work, i) => `<div class="work-row"><b>${adoptionNumber(i+1)}</b><p>${adoptionEscape(work)}</p></div>`).join('')}</section><div class="outputs"><div><h2>應留下的成果</h2><p>${adoptionEscape(step.output)}</p></div><div><h2>往下一步走的條件</h2><p>${adoptionEscape(step.done)}</p></div></div><p class="watchout"><strong>規劃時留意：</strong>${adoptionEscape(step.watch)}</p><aside class="context-example"><span class="context-title">如果需求是「內部知識問答」</span><p>${adoptionEscape(step.example)}</p><a class="text-link" href="#scenario/${n}">看這一步如何套用在情境裡 ${adoptionArrow}</a></aside><section class="article-links"><h2>延伸閱讀</h2>${articles || '<p>目前沒有可用的延伸閱讀。你仍可繼續查看導入步驟。</p>'}</section><nav class="step-pagination" aria-label="前後步驟">${n>1?`<a class="text-link" href="#step/${n-1}">上一步：${adoptionEscape(steps[n-2].title)}</a>`:'<a class="text-link" href="#steps">回到八步總覽</a>'}${n<8?`<a class="text-link" href="#step/${n+1}">下一步：${adoptionEscape(steps[n].title)} ${adoptionArrow}</a>`:`<a class="text-link" href="#steps">回到八步總覽 ${adoptionArrow}</a>`}</nav></article></div></div>`;
}

function adoptionScenario(from) {
  const {steps, scenario} = adoptionData;
  return `<div class="wrap"><a class="back" href="${from?'#step/'+from:'#steps'}">${adoptionArrow} ${from?'返回第 '+adoptionNumber(from)+' 步說明':'返回 AI導入步驟'}</a><div class="scenario-top"><div><h1>${adoptionEscape(scenario.title)}</h1><p class="lead">${adoptionEscape(scenario.lead)}</p><span class="example-state">${adoptionEscape(scenario.label)}</span></div><aside class="scenario-summary"><p><strong>要解決的問題</strong>${adoptionEscape(scenario.problem)}</p><p><strong>建議先驗證的範圍</strong>${adoptionEscape(scenario.scope)}</p></aside></div><section class="flow"><h2>${adoptionEscape(scenario.workflow.title)}</h2><ol>${scenario.workflow.steps.map(text => `<li>${adoptionEscape(text)}</li>`).join('')}</ol><p>${adoptionEscape(scenario.workflow.note)}</p></section><section class="scenario-sequence"><h2>八個步驟，在這個需求裡怎麼做？</h2><p class="lead">${adoptionEscape(scenario.sequenceIntro)}</p>${scenario.steps.map((row, i) => `<section class="scenario-row" id="scenario-step-${i+1}"><div class="scenario-row-title"><span>${adoptionNumber(i+1)}</span><h3>${adoptionEscape(steps[i].title)}</h3></div><div><p>${adoptionEscape(row.work)}</p><p class="result"><strong>這一步產出：</strong>${adoptionEscape(row.output)}</p><div class="scenario-links"><a class="text-link" href="#step/${i+1}">查看第 ${adoptionNumber(i+1)} 步詳細說明 ${adoptionArrow}</a>${i===2||i===4?`<a class="text-link" href="#scenario/roles">看 HPE 與訊達的角色 ${adoptionArrow}</a>`:''}</div></div></section>`).join('')}</section><section class="roles" id="scenario-roles"><div><h2>${adoptionEscape(scenario.roles.hpe.title)}</h2><p>${adoptionEscape(scenario.roles.hpe.text)}</p><p class="role-reading">${adoptionArticleMarkup([scenario.roles.hpe.article], true)}</p></div><div><h2>${adoptionEscape(scenario.roles.xunda.title)}</h2><p>${adoptionEscape(scenario.roles.xunda.text)}</p></div></section><section class="scenario-bottom"><h2>${adoptionEscape(scenario.start.title)}</h2><p>${adoptionEscape(scenario.start.text)}</p><a class="primary" href="#step/1">${adoptionEscape(scenario.start.action)} ${adoptionArrow}</a></section></div>`;
}

function adoptionRoute(hash) {
  if (['','#steps','#home'].includes(hash)) return {type:'overview'};
  const step = /^#step\/([1-8])$/.exec(hash);
  if (step) return {type:'step', number:Number(step[1])};
  if (hash === '#scenario') return {type:'scenario'};
  const scenario = /^#scenario\/([1-8]|roles)$/.exec(hash);
  return scenario ? {type:'scenario', number:scenario[1]==='roles'?0:Number(scenario[1]), roles:scenario[1]==='roles'} : {type:'missing'};
}

function syncAdoptionNavigation() {
  const nav = document.querySelector('.step-navigation');
  if (!nav) return;
  const summary = nav.querySelector('summary');
  nav.open = adoptionDesktop.matches;
  if (adoptionDesktop.matches) { summary.setAttribute('tabindex','-1'); summary.setAttribute('aria-disabled','true'); }
  else { summary.removeAttribute('tabindex'); summary.removeAttribute('aria-disabled'); }
}

function renderAdoption() {
  if (!adoptionData) return;
  const main = document.querySelector('#main');
  const route = adoptionRoute(location.hash);
  if (route.type === 'overview') { main.innerHTML = adoptionOverview(); document.title = 'AI導入步驟｜訊達 AI 內容與實務'; }
  else if (route.type === 'step') { main.innerHTML = adoptionStep(route.number); document.title = `第 ${adoptionNumber(route.number)} 步：${adoptionData.steps[route.number-1].title}｜AI導入步驟`; }
  else if (route.type === 'scenario') { main.innerHTML = adoptionScenario(route.number || 0); document.title = `${adoptionData.scenario.title}｜AI導入步驟`; }
  else { main.innerHTML = '<div class="wrap not-found"><h1>找不到這個頁面</h1><p>可以回到八個步驟，繼續探索。</p><a class="primary" href="#steps">返回 AI導入步驟</a></div>'; document.title = '找不到頁面｜AI導入步驟'; }
  syncAdoptionNavigation();
  main.focus({preventScroll:true});
  window.scrollTo({top:0,behavior:'instant'});
  if (route.type === 'scenario' && (route.number || route.roles)) requestAnimationFrame(() => {
    const target = document.getElementById(route.roles?'scenario-roles':`scenario-step-${route.number}`);
    if (target) { target.scrollIntoView({behavior:'instant'}); target.classList.add('status-highlight'); }
  });
}

async function loadAdoption() {
  const main = document.querySelector('#main');
  adoptionData = null;
  main.innerHTML = '<p class="loading" role="status">正在載入 AI導入步驟…</p>';
  try {
    const [response, materials] = await Promise.all([
      fetch('data/ai-adoption.json',{cache:'no-store'}),
      fetch('data/materials.json',{cache:'no-store'}).then(result=>result.ok?result.json():[]).catch(()=>[])
    ]);
    if (!response.ok) throw new Error('unavailable');
    const data = await response.json();
    if (!validateAdoptionData(data)) throw new Error('invalid');
    adoptionData = data;
    adoptionArticles = Array.isArray(materials)?materials.filter(item=>item && item.status==='已核准'):[];
    renderAdoption();
  } catch {
    document.title = '資料暫時無法載入｜AI導入步驟';
    main.innerHTML = '<div class="wrap not-found"><h1>AI導入步驟暫時無法載入</h1><p>請重試，或回首頁繼續閱讀。</p><button class="primary" type="button" data-adoption-retry>重新載入</button> <a class="text-link" href="./#home">返回首頁</a></div>';
  }
}

adoptionDesktop.addEventListener('change',syncAdoptionNavigation);
window.addEventListener('hashchange',renderAdoption);
document.addEventListener('click',event=>{
  if (adoptionDesktop.matches && event.target.closest('.step-navigation summary')) event.preventDefault();
  if (event.target.closest('[data-adoption-retry]')) loadAdoption();
});
document.querySelector('.skip-link').addEventListener('click',event=>{event.preventDefault();const main=document.querySelector('#main');main.focus();main.scrollIntoView({behavior:'instant'});});

loadAdoption();
