const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const guideCode = fs.readFileSync(path.join(__dirname, '../guide.js'), 'utf8');
const guide = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/guide-recommendations.json'), 'utf8'));
const materials = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/materials.json'), 'utf8'));
const site = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/site.json'), 'utf8'));
const topics = new Map(site.tracks.flatMap(track => track.topics.map(topic => [topic.id, topic])));
const storageKey = 'dimension-guide-v2';
const workTypes = ['search', 'document', 'reply', 'systems'];

function page(config = guide, items = materials, storage = new Map()) {
  const root = { innerHTML: '' }, progress = { textContent: '' };
  let focused = 0;
  const context = vm.createContext({
    content: { guideRecommendations: config, items, topics },
    sessionStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key)
    },
    escapeHtml: value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]),
    isHpe: item => /HPE/.test(item.title), articleUrl: item => '?article=' + encodeURIComponent(item.id),
    document: { querySelector: selector => selector === '#guide-content' ? root : selector === '#guide-progress' ? progress : selector === '#guide-current-title' ? { focus() { focused++; } } : null }
  });
  vm.runInContext(guideCode, context);
  function click(selector, dataset) { context.handleGuideClick({ target: { closest: wanted => wanted === selector ? { dataset } : null } }); }
  return { context, root, progress, focused: () => focused,
    choose(value) { click('[data-guide-option]', { guideOption: value }); },
    edit(index) { click('[data-guide-edit]', { guideEdit: String(index) }); },
    control(action) { click('[data-guide-action]', { guideAction: action }); },
    answers() { return JSON.parse(vm.runInContext('JSON.stringify(guidedAnswers)', context)); },
    report(answers) { return JSON.parse(JSON.stringify(context.guideReport(answers))); },
    finish(answers) { answers.forEach(value => this.choose(value)); }
  };
}

test('every path asks exactly five valid questions and builds a complete report', () => {
  const { context } = page(); let paths = 0;
  const findings = new Set();
  function walk(answers) {
    const question = context.guideQuestion(answers);
    if (answers.length < 5) {
      assert.ok(question, answers.join('/'));
      assert.ok(question.title && question.options.length >= 4);
      assert.equal(new Set(question.options.map(option => option[0])).size, question.options.length);
      question.options.forEach(([value]) => walk([...answers, value]));
      return;
    }
    assert.equal(question, null);
    const result = context.guideReport(answers);
    const where = answers.join('/');
    for (const field of ['title', 'context', 'why', 'help', 'start', 'progress', 'stage', 'limit']) assert.ok(result[field], where + ' ' + field);
    assert.ok(result.actions.length >= 1 && result.actions.length <= 2, where);
    assert.ok(result.articles.length >= 1 && result.articles.length <= 3, where);
    assert.equal(new Set(result.articles).size, result.articles.length, where);
    for (const id of result.articles) {
      const link = guide.assessment.articles[id];
      const article = materials.find(item => item.id === link?.id);
      assert.ok(article && article.status === '已核准' && !/HPE/.test(article.title), id);
      assert.equal(article.revision, link.revision, id);
    }
    assert.ok(topics.has(result.browseTopic), where);
    assert.equal(typeof result.consult, 'boolean');
    assert.doesNotMatch(JSON.stringify(result), /undefined|%|保證|成熟度|信心分數/);
    paths++; findings.add(result.id);
  }
  walk([]);
  // 4 types × 4 × 4 × 4 × 5 + 4 mapped situations × 4 × 4 × 5 + general × 4 × 4 × 5
  assert.equal(paths, 1280 + 320 + 80);
  assert.equal(findings.size, 17);
});

test('the work type changes the second and third questions', () => {
  const { context } = page();
  const pains = new Set(workTypes.map(work => context.guideQuestion([work]).title));
  assert.equal(pains.size, 4);
  const sources = new Set(workTypes.map(work => context.guideQuestion([work, context.guideQuestion([work]).options[0][0]]).title));
  assert.equal(sources.size, 4);
  assert.match(context.guideQuestion(['reply']).title, /客戶/);
  assert.match(context.guideQuestion(['reply', 'find']).title, /答案或規則/);
  assert.equal(context.guideQuestion(['other']), null);
});

test('few "unsure" options remain, and each still yields a concrete next question to ask', () => {
  const { context } = page();
  const unsure = /不清楚|說不上來/;
  let count = 0;
  const ids = new Set();
  function collect(answers) {
    const question = context.guideQuestion(answers);
    if (!question || ids.has(question.id)) return;
    ids.add(question.id);
    count += question.options.filter(([, label]) => unsure.test(label)).length;
    question.options.forEach(([value]) => collect([...answers, value]));
  }
  collect([]);
  assert.ok(count <= 4, 'unsure options: ' + count);
  for (const answers of [['search','where','unsure','daily','none'], ['systems','rekey','unsure','daily','none']]) {
    assert.match(page().report(answers).actions[0], /問/);
  }
  assert.match(page().report(['reply','find','faq','daily','unsure']).stage, /問負責/);
});

test('design examples A, B and C render exactly as reviewed', () => {
  const a = page(); a.finish(['reply','find','scattered','daily','personal']);
  const ra = a.report(a.answers());
  assert.equal(ra.title, '回覆慢的主因是答案散落各處；先把常見問題集中，AI 才有東西可以查。');
  assert.deepEqual(ra.actions, ['挑最近 20 則客戶問題依主題分類，找出最常出現的 5 類，寫下每一類的標準答案和依據文件。']);
  assert.match(ra.help, /每天發生好幾次/);
  assert.deepEqual(ra.articles, ['material-41', 'material-29']);
  assert.equal(ra.consult, false);
  for (const label of ['初步判斷','AI 可以怎麼幫','你的起點','這週可以做的一件事','怎樣算有進展','依你們目前的階段','延伸閱讀','查看或修改回答（5 題）']) assert.ok(a.root.innerHTML.includes(label), label);
  assert.doesNotMatch(a.root.innerHTML, /guided-consult/);
  assert.equal(a.progress.textContent, '完成 5 / 5 題');
  assert.equal(a.focused(), 5);

  const rb = page().report(['document','gather','mixed','bulk','none']);
  assert.equal(rb.title, '時間花在收資料，該先處理的是資料來源，而不是寫作。');
  assert.equal(rb.actions.length, 2);
  assert.match(rb.actions[0], /試算表中哪些欄位是人工加上去的/);
  assert.match(rb.help, /份量大/);
  assert.deepEqual(rb.articles, ['material-41', 'material-30']);
  assert.equal(rb.consult, false);

  const c = page(); c.finish(['systems','rekey','screen','daily','team']);
  const rc = c.report(c.answers());
  assert.equal(rc.title, '重複輸入是規則固定的工作，最適合交給自動化流程。');
  assert.match(rc.actions[0], /系統窗口/);
  assert.deepEqual(rc.articles, ['material-53', 'material-35', 'material-28']);
  assert.equal(rc.consult, true);
  assert.match(c.root.innerHTML, /guided-consult/);
  assert.match(c.root.innerHTML, /02-2501-5568/);
  assert.match(c.root.innerHTML, /分機 2591、2586/);
  assert.match(c.root.innerHTML, /10:00–18:00/);
  assert.match(c.root.innerHTML, /href="tel:\+886225015568"/);
});

test('consultation appears only for the agreed conditions', () => {
  const { context } = page();
  const consult = answers => context.guideReport(answers).consult;
  assert.equal(consult(['search','access','central','daily','none']), true);
  assert.equal(consult(['reply','lookup','faq','daily','none']), true);
  assert.equal(consult(['reply','find','system','daily','none']), true);
  assert.equal(consult(['systems','convert','screen','daily','none']), true);
  assert.equal(consult(['document','write','export','daily','connected']), true);
  assert.equal(consult(['undecided','general','organized','daily','none']), true);
  assert.equal(consult(['search','extract','central','weekly','personal']), false);
  assert.equal(consult(['systems','convert','api','daily','team']), false);
  assert.equal(consult(['undecided','reply-find','faq','daily','none']), false);
});

test('starting points add a prerequisite only when needed and never repeat the action', () => {
  const { context } = page();
  const actions = answers => Array.from(context.guideReport(answers).actions);
  assert.equal(actions(['search','where','central','daily','none']).length, 1);
  assert.equal(actions(['search','where','tacit','daily','none']).length, 2);
  assert.match(actions(['search','where','tacit','daily','none'])[0], /資深同事/);
  assert.equal(actions(['reply','find','scattered','daily','none']).length, 1);
  assert.equal(actions(['reply','lookup','system','daily','none']).length, 1);
  assert.equal(actions(['reply','confirm','case','daily','none']).length, 1);
  assert.equal(actions(['reply','compose','case','daily','none']).length, 2);
  assert.equal(actions(['undecided','general','people','daily','none']).length, 1);
});

test('undecided situations reuse the matching work type, and frequency changes the advice', () => {
  const { context } = page();
  for (const [situation, work, pain] of [['search-where','search','where'], ['document-gather','document','gather'], ['reply-find','reply','find'], ['systems-rekey','systems','rekey']]) {
    const mapped = context.guideReport(['undecided', situation, context.guideQuestion([work, pain]).options[0][0], 'daily', 'none']);
    const direct = context.guideReport([work, pain, context.guideQuestion([work, pain]).options[0][0], 'daily', 'none']);
    assert.equal(mapped.id, direct.id);
    assert.equal(mapped.title, direct.title);
    assert.match(mapped.context, /依你選的情況/);
  }
  const general = context.guideReport(['undecided','general','unsure','irregular','none']);
  assert.equal(general.id, 'general');
  assert.match(context.guideQuestion(['undecided','general']).title, /資料或答案/);
  const helps = new Set(['daily','weekly','bulk','irregular'].map(freq => context.guideReport(['search','extract','central',freq,'none']).help));
  assert.equal(helps.size, 4);
});

test('same-tab article return restores validated answers; old and broken storage is ignored', () => {
  const storage = new Map(), answers = ['reply','find','scattered','daily','personal'];
  const first = page(guide, materials, storage); first.finish(answers);
  assert.equal(storage.get(storageKey), JSON.stringify(answers));
  const returned = page(guide, materials, storage);
  vm.runInContext('guidedAnswers = readGuideAnswers(); renderGuide();', returned.context);
  assert.deepEqual(returned.answers(), answers);
  assert.match(returned.root.innerHTML, /答案散落各處/);
  returned.control('reset'); assert.equal(storage.size, 0);
  storage.set('dimension-guide-demo-v1', JSON.stringify(['search','time','pilot','review','same']));
  assert.deepEqual(Array.from(returned.context.readGuideAnswers()), []);
  storage.set(storageKey, JSON.stringify(['search','time','pilot','review','same']));
  assert.deepEqual(Array.from(returned.context.readGuideAnswers()), []);
  storage.set(storageKey, '{invalid');
  assert.deepEqual(Array.from(returned.context.readGuideAnswers()), []);
  const blocked = page();
  blocked.context.sessionStorage = {getItem() {throw Error('blocked');},setItem() {throw Error('blocked');},removeItem() {throw Error('blocked');}};
  assert.deepEqual(Array.from(blocked.context.readGuideAnswers()), []);
  blocked.finish(answers); assert.match(blocked.root.innerHTML, /答案散落各處/);
  blocked.control('reset'); assert.deepEqual(blocked.answers(), []);
});

test('editing an earlier answer clears downstream answers and changes the follow-up questions', () => {
  const actual = page(); actual.finish(['reply','find','scattered','daily','personal']);
  actual.edit(0); assert.deepEqual(actual.answers(), []);
  actual.finish(['reply','find','scattered','daily','personal']);
  actual.edit(1); assert.deepEqual(actual.answers(), ['reply']);
  assert.equal(actual.progress.textContent, '第 2 / 5 題');
  assert.match(actual.root.innerHTML, /回覆一則客戶問題/);
  actual.control('back'); actual.choose('systems');
  assert.match(actual.root.innerHTML, /處理這些資料時/);
  actual.choose('judge');
  assert.match(actual.root.innerHTML, /匯出、匯入資料/);
  actual.control('reset'); assert.deepEqual(actual.answers(), []);
  assert.match(actual.root.innerHTML, /這次最想改善哪一類工作/);
});

test('invalid, stale and incomplete answers cannot skip questions or create reports', () => {
  const actual = page(); actual.context.renderGuide();
  actual.choose('find'); actual.edit(99); assert.deepEqual(actual.answers(), []);
  assert.equal(actual.context.guideReport(['search']), null);
  assert.equal(actual.context.guideReport(['search','find','central','daily','none']), null);
  assert.equal(actual.context.guideReport(['search','where','faq','daily','none']), null);
  assert.equal(actual.context.guideReport(['undecided','general','central','daily','none']), null);
  actual.finish(['search','where','central','daily','none']);
  actual.choose('team'); assert.equal(actual.answers()[4], 'none');
});

test('links hide stale, missing, draft and HPE articles and keep the category fallback', () => {
  const answers = ['systems','rekey','screen','daily','team'];
  const valid = page(); valid.finish(answers);
  assert.match(valid.root.innerHTML, /article=material-53/);
  assert.match(valid.root.innerHTML, /article=material-35/);
  assert.match(valid.root.innerHTML, /article=material-28/);
  const changed = materials.map(item => item.id === 'material-53' ? {...item, revision:'changed'} : item.id === 'material-28' ? {...item, status:'待審'} : item);
  const stale = page(guide, changed); stale.finish(answers);
  assert.doesNotMatch(stale.root.innerHTML, /article=material-(53|28)/);
  assert.match(stale.root.innerHTML, /article=material-35/);
  assert.match(stale.root.innerHTML, /topic=enterprise-adoption/);
  const config = structuredClone(guide);
  const hpe = materials.find(item => item.id === 'material-5');
  config.assessment.articles['material-35'] = { id:hpe.id, revision:hpe.revision, why:'不應跨區' };
  const isolated = page(config); isolated.finish(answers);
  assert.doesNotMatch(isolated.root.innerHTML, /article=material-5"/);
  const empty = page(guide, []); empty.finish(answers);
  assert.match(empty.root.innerHTML, /href="\.\/#all-articles"/);
  assert.doesNotMatch(empty.root.innerHTML, /<h4>延伸閱讀/);
  assert.match(empty.root.innerHTML, /guided-consult/);
});

test('article titles, reasons and questionnaire labels are escaped', () => {
  const config = structuredClone(guide);
  config.assessment.articles['material-35'].why = '<svg onload="bad()">';
  const changed = materials.map(item => item.id === 'material-35' ? {...item, title:'<iframe> & article'} : item);
  const actual = page(config, changed);
  vm.runInContext('guidedQuestions.work.options[3][1]="<img onerror=bad()>";', actual.context);
  actual.finish(['systems','rekey','screen','daily','team']);
  assert.doesNotMatch(actual.root.innerHTML, /<iframe>|<img |<svg onload/);
  assert.match(actual.root.innerHTML, /&lt;iframe&gt; &amp; article/);
  assert.match(actual.root.innerHTML, /&lt;img/);
});

test('missing recommendation data still allows five questions and a useful report', () => {
  const actual = page(null); actual.finish(['search','extract','central','weekly','personal']);
  assert.match(actual.root.innerHTML, /初步判斷|這週可以做的一件事/);
  assert.match(actual.root.innerHTML, /all-articles/);
  assert.doesNotMatch(actual.root.innerHTML, /undefined/);
});
