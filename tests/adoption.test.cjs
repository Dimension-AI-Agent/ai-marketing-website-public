const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root,'adoption.js'),'utf8').replace(/\nloadAdoption\(\);\s*$/, '\n');
const data = JSON.parse(fs.readFileSync(path.join(root,'data/ai-adoption.json'),'utf8'));
const materials = JSON.parse(fs.readFileSync(path.join(root,'data/materials.json'),'utf8'));

function page({guide=data, catalog=materials, guideOk=true, catalogOk=true, hash='#steps'}={}) {
  const main = {innerHTML:'',focus(){},scrollIntoView(){}};
  const context = vm.createContext({
    window:{matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(){},scrollTo(){}},
    document:{title:'',querySelector(selector){return selector==='#main'?main:selector==='.skip-link'?{addEventListener(){}}:null;},getElementById(){return null;},addEventListener(){}},
    location:{hash},requestAnimationFrame:fn=>fn(),
    fetch:async url=>({ok:url.endsWith('ai-adoption.json')?guideOk:catalogOk,json:async()=>url.endsWith('ai-adoption.json')?guide:catalog})
  });
  vm.runInContext(source,context);
  return {context,main};
}

test('the public guide has exactly eight ordered steps and matching scenario rows',()=>{
  const {context}=page();
  assert.equal(context.validateAdoptionData(data),true);
  for (const mutate of [d=>d.steps.pop(),d=>d.steps[1].id='step-1',d=>d.scenario.steps[4].stepId='step-3',d=>d.steps[0]=null,d=>d.scenario=null]) {
    const invalid=structuredClone(data);mutate(invalid);assert.equal(context.validateAdoptionData(invalid),false);
  }
  const {steps,...rest}=data;
  assert.equal(context.validateAdoptionData(rest),false);
});

test('overview, all eight details and scenario routes load without changing the homepage view',async()=>{
  const {context,main}=page();await context.loadAdoption();
  assert.match(main.innerHTML,/<h1 id="steps-title">AI導入步驟<\/h1>/);
  assert.equal((main.innerHTML.match(/class="step-entry"/g)||[]).length,8);
  for(let n=1;n<=8;n++){
    context.location.hash=`#step/${n}`;context.renderAdoption();
    assert.ok(main.innerHTML.includes(`<h1>${data.steps[n-1].title}</h1>`));
    assert.match(main.innerHTML,/應留下的成果|往下一步走的條件/);
    assert.ok(main.innerHTML.includes(`href="#scenario/${n}"`));
  }
  context.location.hash='#scenario/5';context.renderAdoption();
  assert.match(main.innerHTML,/href="#step\/5"/);
  assert.equal((main.innerHTML.match(/class="scenario-row"/g)||[]).length,8);
  assert.match(main.innerHTML,/非客戶導入實績/);
  context.location.hash='#step/9';context.renderAdoption();assert.match(main.innerHTML,/找不到這個頁面/);
  assert.ok(fs.readFileSync(path.join(root,'site-views.js'),'utf8').includes('href="adoption.html#steps">AI導入步驟'));
});

test('JSON text and live article titles are escaped; unpublished and missing links stay hidden',async()=>{
  const unsafe=structuredClone(data);unsafe.steps[0].title='<img src=x onerror=alert(1)>';unsafe.scenario.roles.hpe.text='<script>unsafe</script>';
  const id=unsafe.steps[0].articles[0].id;
  const {context,main}=page({guide:unsafe,catalog:[{id,status:'已核准',title:'<script>article</script>'},{id:unsafe.steps[0].articles[1].id,status:'待審',title:'PRIVATE DRAFT'}],hash:'#step/1'});
  await context.loadAdoption();
  assert.match(main.innerHTML,/&lt;img/);assert.match(main.innerHTML,/&lt;script&gt;article/);
  assert.doesNotMatch(main.innerHTML,/<script>|<img src=x|PRIVATE DRAFT/);
  assert.ok(main.innerHTML.includes(`./?article=${id}`));
  context.location.hash='#scenario';context.renderAdoption();assert.match(main.innerHTML,/&lt;script&gt;unsafe/);
  assert.equal(context.adoptionArticleMarkup([{id:'javascript:alert(1)',why:'unsafe'}]),'');
});

test('catalog outage leaves the guide useful; guide failure has retry and can recover',async()=>{
  const catalogFailure=page({catalogOk:false,hash:'#step/4'});await catalogFailure.context.loadAdoption();
  assert.match(catalogFailure.main.innerHTML,/驗證模型與工作負載/);assert.match(catalogFailure.main.innerHTML,/目前沒有可用的延伸閱讀/);
  const invalid=page({guide:{version:1}});await invalid.context.loadAdoption();assert.match(invalid.main.innerHTML,/data-adoption-retry/);
  const failed=page({guideOk:false});await failed.context.loadAdoption();assert.match(failed.main.innerHTML,/暫時無法載入/);
  failed.context.fetch=async url=>({ok:true,json:async()=>url.endsWith('ai-adoption.json')?data:materials});
  await failed.context.loadAdoption();assert.match(failed.main.innerHTML,/<h1 id="steps-title">AI導入步驟/);
});
