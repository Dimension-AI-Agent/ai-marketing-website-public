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
    finish(answers) { answers.forEach(value => this.choose(value)); }
  };
}

test('all reachable paths ask exactly five valid questions and produce complete, bounded reports', () => {
  const { context } = page(); let paths = 0;
  const questions = new Set(), reports = new Set();
  function walk(answers) {
    const question = context.guideQuestion(answers);
    if (answers.length < 5) {
      assert.ok(question, answers.join('/'));
      assert.ok(question.title && question.options.length >= 4);
      assert.equal(new Set(question.options.map(option => option[0])).size, question.options.length);
      questions.add(question.id);
      question.options.forEach(([value]) => walk([...answers, value]));
    } else {
      assert.equal(question, null);
      const result = context.guideReport(answers);
      assert.ok(result && result.title && result.interpretation && result.alternative, answers.join('/'));
      assert.equal(result.evidence.length, 2);
      assert.ok(result.actions.length >= 2 && result.actions.length <= 3);
      assert.ok(result.articles.length >= 1 && result.articles.length <= 2);
      assert.equal(new Set(result.articles).size, result.articles.length);
      for (const id of result.articles) {
        const link = guide.assessment.articles[id];
        const article = materials.find(item => item.id === link?.id);
        assert.ok(article && article.status === '已核准' && !/HPE/.test(article.title), id);
        assert.equal(article.revision, link.revision, id);
      }
      assert.ok(topics.has(result.browseTopic));
      assert.doesNotMatch(JSON.stringify(result), /undefined|成熟度|ROI|信心分數/);
      paths++; reports.add(result.id);
    }
  }
  walk([]);
  assert.ok(paths > 3000); assert.ok(questions.size >= 15); assert.ok(reports.size >= 20);
  console.log('Five-question coverage:', paths, 'paths,', questions.size, 'question variants,', reports.size, 'findings');
});

test('same-tab article return restores validated answers; reset clears and storage failures are harmless', () => {
  const storage = new Map(), answers = ['search','time','pilot','review','same'];
  const first = page(guide, materials, storage); first.finish(answers);
  const returned = page(guide, materials, storage);
  vm.runInContext('guidedAnswers = readGuideAnswers(); renderGuide();', returned.context);
  assert.deepEqual(returned.answers(), answers);
  assert.match(returned.root.innerHTML, /抵銷/);
  returned.control('reset'); assert.equal(storage.size, 0);
  storage.set('dimension-guide-demo-v1', JSON.stringify(['search','time','none','review','same']));
  assert.deepEqual(Array.from(returned.context.readGuideAnswers()), []);
  storage.set('dimension-guide-demo-v1', '{invalid');
  assert.deepEqual(Array.from(returned.context.readGuideAnswers()), []);
  const blocked = page();
  blocked.context.sessionStorage = {getItem() {throw Error('blocked');},setItem() {throw Error('blocked');},removeItem() {throw Error('blocked');}};
  assert.deepEqual(Array.from(blocked.context.readGuideAnswers()), []);
  blocked.finish(answers); assert.match(blocked.root.innerHTML, /抵銷/);
  blocked.control('reset'); assert.deepEqual(blocked.answers(), []);
});

test('discriminating evidence changes a time-saving interpretation instead of repeating a fixed diagnosis', () => {
  const { context } = page();
  const result = value => context.guideReport(['search','time','pilot','review',value]);
  assert.equal(context.guideQuestion(['search','time','pilot','review']).id, 'time');
  assert.equal(result('shorter').id, 'time-shorter');
  assert.match(result('shorter').interpretation, /較短|縮短/);
  assert.equal(result('same').id, 'time-offset');
  assert.equal(result('longer').id, 'time-longer');
  assert.equal(result('feeling').id, 'time-unmeasured');
  assert.equal(result('uncompared').id, 'time-uncompared');
  assert.match(result('feeling').alternative, /原本|仍可能/);
  assert.notEqual(result('same').interpretation, result('shorter').interpretation);
});

test('not started, quality, manual work, permissions, value and insufficient information reach relevant articles', () => {
  const examples = [
    [['search','time','none','no-work','self'], 'scope', 'material-30'],
    [['document','quality','pilot','modify','source'], 'source-gap', 'material-26'],
    [['systems','handoff','daily','transfer','system'], 'system-handoff', 'material-27'],
    [['search','quality','none','ready','unchecked'], 'permission-unchecked', 'material-34'],
    [['reply','waiting','pilot','usable','unconfirmed'], 'value-unconfirmed', 'material-35'],
    [['undecided','undecided','unknown','unknown','unknown'], 'trace-unknown', 'material-41']
  ];
  for (const [answers, id, article] of examples) {
    const actual = page(); actual.finish(answers);
    assert.equal(actual.context.guideReport(answers).id, id);
    assert.equal(actual.progress.textContent, '完成 5 / 5 題');
    for (const label of ['初步判讀','支持依據','其他可能解釋','最小驗證行動','對應文章','查看或修改回答（5 題）']) assert.ok(actual.root.innerHTML.includes(label));
    assert.ok(actual.root.innerHTML.includes('article=' + article));
    assert.equal(actual.focused(), 5);
  }
});

test('unknowns, absence and denied permission stay separate; blockers do not invent causes', () => {
  const { context } = page();
  const report = (observation, evidence) => context.guideReport(['search','time','none',observation,evidence]);
  assert.notEqual(report('ready','denied').id, report('ready','unknown').id);
  assert.notEqual(report('ready','unchecked').id, report('ready','unknown').id);
  assert.doesNotMatch(report('ready','unknown').interpretation, /使用許可尚未確認/);
  assert.match(report('ready','unknown').alternative, /已由|已確認/);
  assert.match(report('ready','denied').actions.join(''), /不要使用|不使用/);
  assert.notEqual(report('no-sample','absent').id, report('no-sample','unknown').id);
  assert.notEqual(context.guideReport(['search','time','unknown','unknown','absent']).id, context.guideReport(['search','time','unknown','unknown','unknown']).id);
  assert.match(context.guideQuestion(['undecided','time']).title, /團隊/);
  assert.match(context.guideReport(['search','time','unknown','blocked','system']).context, /尚不清楚/);
  assert.match(context.guideReport(['search','time','pilot','blocked','system']).alternative, /權限|格式/);
});

test('routine review without waiting is valid counter-evidence, not an invented bottleneck', () => {
  const { context } = page();
  const answers = ['search','quality','pilot','review'];
  const question = context.guideQuestion(answers);
  assert.match(question.title, /核對或核准的過程/);
  assert.ok(question.options.some(([id]) => id === 'smooth'));
  const result = context.guideReport([...answers, 'smooth']);
  assert.equal(result.id, 'review-smooth');
  assert.match(result.interpretation, /不支持|不能.*瓶頸/);
  assert.match(result.actions.join(''), /錯誤|重做/);
});

test('editing an earlier answer clears downstream answers and recomputes both branches', () => {
  const actual = page(); actual.finish(['search','time','pilot','review','same']);
  actual.edit(1); assert.deepEqual(actual.answers(), ['search']);
  assert.equal(actual.progress.textContent, '第 2 / 5 題');
  actual.choose('waiting'); actual.choose('pilot'); actual.choose('review');
  assert.match(actual.root.innerHTML, /等待主要發生在哪裡/);
  actual.choose('owner'); assert.equal(actual.context.guideReport(actual.answers()).id, 'review-owner');
  actual.edit(2); actual.choose('none'); assert.match(actual.root.innerHTML, /準備到哪一步/);
  actual.control('back'); assert.equal(actual.answers().length, 2);
  actual.control('reset'); assert.deepEqual(actual.answers(), []);
  assert.match(actual.root.innerHTML, /這次最想改善哪一類工作/);
});

test('invalid, stale and incomplete answers cannot skip questions or create reports', () => {
  const actual = page(); actual.context.renderGuide();
  actual.choose('review'); actual.edit(99); assert.deepEqual(actual.answers(), []);
  assert.equal(actual.context.guideReport(['search']), null);
  assert.equal(actual.context.guideReport(['search','time','none','review','same']), null);
  actual.finish(['search','time','pilot','review','same']);
  actual.choose('longer'); assert.equal(actual.answers()[4], 'same');
});

test('Demo links hide stale, missing, draft and HPE articles and retain category fallback', () => {
  const answers = ['search','time','pilot','review','same'];
  const valid = page(); valid.finish(answers);
  assert.match(valid.root.innerHTML, /article=material-35/);
  const changed = materials.map(item => item.id === 'material-35' ? {...item, revision:'changed'} : item.id === 'material-46' ? {...item, status:'待審'} : item);
  const stale = page(guide, changed); stale.finish(answers);
  assert.doesNotMatch(stale.root.innerHTML, /article=material-(35|46)/);
  assert.match(stale.root.innerHTML, /topic=benefit-assessment/);
  const config = structuredClone(guide);
  const hpe = materials.find(item => item.id === 'material-5');
  config.assessment.articles['material-35'] = { id:hpe.id, revision:hpe.revision, why:'不應跨區' };
  const isolated = page(config); isolated.finish(answers);
  assert.doesNotMatch(isolated.root.innerHTML, /article=material-5/);
  const empty = page(guide, []); empty.finish(answers);
  assert.match(empty.root.innerHTML, /href="\.\/#all-articles"/);
  assert.doesNotMatch(empty.root.innerHTML, /<h4>對應文章/);
});

test('article titles, reasons and questionnaire labels are escaped', () => {
  const config = structuredClone(guide);
  config.assessment.articles['material-35'].why = '<svg onload="bad()">';
  const changed = materials.map(item => item.id === 'material-35' ? {...item, title:'<iframe> & article'} : item);
  const actual = page(config, changed);
  vm.runInContext('guidedQuestions.work.options[0][1]="<img onerror=bad()>";', actual.context);
  actual.finish(['search','time','pilot','review','same']);
  assert.doesNotMatch(actual.root.innerHTML, /<iframe>|<img |<svg onload/);
  assert.match(actual.root.innerHTML, /&lt;iframe&gt; &amp; article/);
  assert.match(actual.root.innerHTML, /&lt;img/);
});

test('missing recommendation data still allows five questions and a useful report', () => {
  const actual = page(null); actual.finish(['search','time','pilot','review','same']);
  assert.match(actual.root.innerHTML, /初步判讀|最小驗證行動/);
  assert.match(actual.root.innerHTML, /all-articles/);
  assert.doesNotMatch(actual.root.innerHTML, /undefined/);
});
