const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const guideCode = fs.readFileSync(path.join(__dirname, '../guide.js'), 'utf8');
const guide = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/guide-recommendations.json'), 'utf8'));
const site = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/site.json'), 'utf8'));
const topics = new Map(site.tracks.flatMap(track => track.topics.map(topic => [topic.id, {title:topic.title, description:topic.description}])));
function page(config = guide, items = []) {
  const root = { innerHTML: '' };
  const progress = { textContent: '' };
  let focused = 0;
  const context = vm.createContext({
    content: { guideRecommendations: config, items, topics },
    escapeHtml: value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]),
    isHpe: item => /HPE/.test(item.title), articleUrl: item => '?article=' + encodeURIComponent(item.id),
    document: { querySelector: selector => selector === '#guide-content' ? root : selector === '#guide-progress' ? progress : selector === '#guide-current-title' ? { focus() { focused++; } } : null }
  });
  vm.runInContext(guideCode, context);
  return { context, root, progress, focused: () => focused,
    choose(index) { context.handleGuideClick({ target: { closest: selector => selector === '[data-guide-option]' ? { dataset: { guideOption: String(index) } } : null } }); },
    control(action) { context.handleGuideClick({ target: { closest: selector => selector === '[data-guide-action]' ? { dataset: { guideAction: action } } : null } }); }
  };
}

test('every existing question path reaches its assigned report without a topics anchor', () => {
  const sample = page();
  const questions = JSON.parse(vm.runInContext('JSON.stringify(guidedQuestions)', sample.context));
  const reached = new Set();
  function walk(id, choices) {
    if (questions[id]) { questions[id].options.forEach((option, index) => walk(option[1], [...choices, index])); return; }
    const actual = page(); choices.forEach(index => actual.choose(index));
    assert.match(actual.root.innerHTML, /你的 AI 導入摘要/);
    assert.match(actual.root.innerHTML, /目前情況/);
    assert.match(actual.root.innerHTML, /優先處理/);
    assert.match(actual.root.innerHTML, /建議行動/);
    assert.ok(actual.root.innerHTML.includes(guide.results[id].title));
    assert.equal(actual.progress.textContent, '結果摘要');
    assert.equal(actual.focused(), choices.length);
    reached.add(id);
  }
  walk('start', []);
  assert.equal(reached.size, 10);
});

test('result actions are explicit for all ten reports and preserve the permission example', () => {
  for (const result of Object.values(guide.results)) {
    assert.ok(Array.isArray(result.actions) && result.actions.length >= 2 && result.actions.length <= 3);
    assert.ok(result.actions.every(action => typeof action === 'string' && action.trim()));
  }
  const actual = page(); actual.choose(3); actual.choose(0);
  assert.match(actual.root.innerHTML, /<ol[^>]*>/);
  assert.match(actual.root.innerHTML, /不同身分/);
  assert.match(actual.root.innerHTML, /<details[^>]*class="guided-report-answers"/);
  assert.doesNotMatch(actual.root.innerHTML, /已完成初步測試|成熟度|ROI|%/);
});

test('changing the last answer updates the result and reset clears old answers', () => {
  const actual = page(); actual.choose(3); actual.choose(0);
  actual.control('back'); assert.match(actual.root.innerHTML, /目前卡在哪裡/);
  actual.choose(1); assert.match(actual.root.innerHTML, /找出流程斷在哪一步/);
  assert.doesNotMatch(actual.root.innerHTML, /資料和權限還沒確認/);
  actual.control('reset'); assert.match(actual.root.innerHTML, /目前最接近哪種情況/);
  assert.doesNotMatch(actual.root.innerHTML, /guided-report-answers|你的 AI 導入摘要/);
  actual.choose(4); actual.choose(2); assert.match(actual.root.innerHTML, /從現在開始留紀錄/);
  assert.doesNotMatch(actual.root.innerHTML, /還接不上 CRM/);
});

test('reports keep reviewed article pairing and hide stale, missing, draft and HPE content', () => {
  const config = structuredClone(guide);
  config.results.r7.articles = ['valid','stale','draft','hpe','missing'].map(id => ({ id, revision: 'reviewed', why: '關聯理由' }));
  const items = [
    { id:'valid', title:'有效文章', status:'已核准', revision:'reviewed' },
    { id:'stale', title:'更新過文章', status:'已核准', revision:'newer' },
    { id:'draft', title:'待審文章', status:'待審', revision:'reviewed' },
    { id:'hpe', title:'HPE 文章', status:'已核准', revision:'reviewed' }
  ];
  const actual = page(config, items); actual.choose(3); actual.choose(0);
  assert.match(actual.root.innerHTML, /相關閱讀|article=valid/);
  assert.doesNotMatch(actual.root.innerHTML, /article=(stale|draft|hpe|missing)/);
  const empty = page(guide); empty.choose(3); empty.choose(0);
  assert.doesNotMatch(empty.root.innerHTML, /<h4>相關閱讀<\/h4>/);
});

test('report text, actions, answer history and article labels escape untrusted strings', () => {
  const config = structuredClone(guide);
  config.results.r7.title = '<img onerror="bad()">';
  config.results.r7.actions = ['<script>bad()</script>', '確認 A & B'];
  config.results.r7.articles = [{ id:'valid', revision:'same', why:'<svg onload="bad()">' }];
  const actual = page(config, [{ id:'valid', title:'<iframe>', revision:'same', status:'已核准' }]);
  vm.runInContext('guidedCurrent="r7"; guidedHistory=[{from:"start",answer:"<script>answer</script>"}]; renderGuide();', actual.context);
  assert.doesNotMatch(actual.root.innerHTML, /<script>|<img |<iframe>|<svg onload/);
  assert.match(actual.root.innerHTML, /&lt;script&gt;answer/);
  assert.match(actual.root.innerHTML, /&lt;iframe&gt;/);
  assert.match(actual.root.innerHTML, /A &amp; B/);
});

test('legacy result guidance remains readable without structured actions', () => {
  const config = structuredClone(guide); delete config.results.r7.actions;
  const actual = page(config); actual.choose(3); actual.choose(0);
  for (const paragraph of config.results.r7.guidance.split('\n\n')) assert.ok(actual.root.innerHTML.includes(paragraph));
  assert.doesNotMatch(actual.root.innerHTML, /undefined/);
});

test('missing results retain recoverable error states instead of an empty report', () => {
  const unavailable = page(null); unavailable.context.renderGuide();
  assert.match(unavailable.root.innerHTML, /引導內容暫時無法載入/);
  const config = structuredClone(guide); delete config.results.r7;
  const actual = page(config); actual.choose(3); actual.choose(0);
  assert.match(actual.root.innerHTML, /這項建議暫時無法顯示/);
  actual.control('back'); assert.match(actual.root.innerHTML, /目前卡在哪裡/);
});

test('all ten real reports offer a populated article category even when reviewed versions expire', () => {
  const materials = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/materials.json'), 'utf8'));
  for (const [id, result] of Object.entries(guide.results)) {
    assert.ok(topics.has(result.browseTopic), id + ' needs a valid category');
    const available = materials.filter(item => item.status === '已核准' && item.topicId === result.browseTopic);
    assert.ok(available.length > 0, id + ' category must contain articles');
    const actual = page(guide, materials);
    vm.runInContext(`guidedCurrent=${JSON.stringify(id)}; guidedHistory=[{from:'start',answer:'目前情況'}]; renderGuide();`,actual.context);
    assert.ok(actual.root.innerHTML.includes(`href="./?topic=${result.browseTopic}#all-articles"`));
    assert.ok(actual.root.innerHTML.includes(topics.get(result.browseTopic).title));
    assert.ok(actual.root.innerHTML.includes(`${available.length} 篇`));
  }
});

test('removed or empty browse categories fall back to all articles without changing recommendation approvals', () => {
  const config = structuredClone(guide); config.results.r7.browseTopic = 'missing-topic';
  const actual = page(config); actual.choose(3); actual.choose(0);
  assert.match(actual.root.innerHTML, /href="\.\/#all-articles"/);
  assert.doesNotMatch(actual.root.innerHTML, /topic=missing-topic|article=material-34/);
  config.results.r7.browseTopic = 'ai-security';
  const empty = page(config); empty.choose(3); empty.choose(0);
  assert.match(empty.root.innerHTML, /href="\.\/#all-articles"/);
});
