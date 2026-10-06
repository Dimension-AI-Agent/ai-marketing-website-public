const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = path.join(root, 'scene-explorer.js');
const materials = JSON.parse(fs.readFileSync(path.join(root, 'data/materials.json'), 'utf8'));
function page(records = materials, windowState = {}) {
  const context = vm.createContext({
    content: {items: records},
    escapeHtml: value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])),
    articleUrl: item => './?article=' + item.id,
    window: windowState,
  });
  vm.runInContext(fs.readFileSync(path.join(root,'site-views.js'),'utf8'), context);
  if (fs.existsSync(source)) vm.runInContext(fs.readFileSync(source, 'utf8'), context);
  return context;
}
test('each floor exposes three independently selectable objects with usable article routes', () => {
  const context = page();
  assert.equal(typeof context.renderSceneExplorer, 'function', 'the scene explorer is not implemented yet');
  for (const floor of ['application', 'integration', 'infrastructure']) {
    const html = context.renderSceneExplorer(floor);
    assert.equal((html.match(/data-scene-object="/g) || []).length, 3);
    assert.match(html, /aria-pressed="false"/);
    assert.match(html, /data-scene-status/);
  assert.match(html, /相關文章/);
    assert.match(html, /\.\/\?article=material-/);
  }
});
test('a returning visitor sees the selected object even before 3D finishes loading', () => {
  const context=page(materials,{sessionStorage:{getItem:()=>'{"infrastructure":"storage","integration":"not-existing"}'}});
  const html=context.renderSceneExplorer('infrastructure');
  assert.match(html,/data-scene-object="storage" aria-pressed="true"/);
  assert.match(html,/資料要放在哪裡、如何保存？/);
  assert.doesNotMatch(context.renderSceneExplorer('integration'),/aria-pressed="true"/);
});
test('scene article links carry a validated return destination', () => {
  const html=page().sceneObjectDetail('integration','permissions');
  assert.match(html,/from=scene-integration/);
});
test('object names are headings and their questions are secondary text in every floor',()=>{
  const context=page();
  const floors=vm.runInContext('sceneFloorObjects',context);
  for(const [floor,objects] of Object.entries(floors)) for(const object of objects) {
    const html=context.sceneObjectDetail(floor,object.id);
    assert.ok(html.includes(`<h3 class="scene-object-title">${object.title}</h3>`));
    assert.ok(html.includes(`<p class="scene-object-question">${object.question}</p>`));
    assert.doesNotMatch(html,/<h3[^>]*>[^<]*？<\/h3>/);
  }
});
test('the initial prompt follows the same title and question hierarchy as selected objects',()=>{
  const html=page().renderSceneExplorer('application');
  assert.match(html,/<h3 class="scene-object-title">選擇一個物件<\/h3>/);
  assert.match(html,/<p class="scene-object-question">這一層，和你的問題有什麼關係？<\/p>/);
});
test('object reading links exclude draft and withdrawn articles and escape their titles', () => {
  const approved = { id:'material-34', status:'已核准', title:'權限 <script>' };
  const context = page([approved, {id:'material-27', status:'待審', title:'私人原稿'}]);
  assert.equal(typeof context.sceneObjectDetail, 'function', 'object reading links are not implemented yet');
  const html = context.sceneObjectDetail('integration', 'permissions');
  assert.match(html, /article=material-34/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /私人原稿|article=material-27|<script>/);
  const empty = context.sceneObjectDetail('infrastructure', 'compute');
  assert.match(empty, /目前沒有相關的已核准文章/);
  assert.doesNotMatch(empty, /article=/);
});
test('the initial view has a readable object list and article links without WebGL', () => {
  const context = page();
  assert.equal(typeof context.renderSceneExplorer, 'function', 'the non-WebGL fallback is not implemented yet');
  const html = context.renderSceneExplorer('infrastructure');
  assert.match(html, /<details/);
  assert.match(html, /運算機櫃/);
  assert.match(html, /儲存設備/);
  assert.match(html, /網路交換器/);
  assert.match(html, /場景為示意/);
});
test('all three scenes contain distinct real geometry and named pickable objects', async () => {
  const file = path.join(root, 'scene-model.mjs');
  assert.ok(fs.existsSync(file), 'three floor models are not implemented yet');
  const { buildFloorScene } = await import('../scene-model.mjs');
  const floors = ['application', 'integration', 'infrastructure'].map(buildFloorScene);
  const signatures = [];
  for (const floor of floors) {
    assert.equal(floor.objects.size, 3);
    let meshCount = 0;
    floor.group.traverse(node => {
      if (node.isMesh) { meshCount++; assert.ok(node.geometry.attributes.position.count > 0); }
    });
    assert.ok(meshCount > 20, 'a floor must be a modeled room, not a flat poster');
    for (const [id, object] of floor.objects) {
      let pickable = false;
      object.traverse(node => { if (node.isMesh && node.userData.objectId === id) pickable = true; });
      assert.ok(pickable, id + ' must be selectable in the scene');
    }
    signatures.push([...floor.objects.keys()].join(','));
  }
  assert.equal(new Set(signatures).size, 3);
});
test('scene disposal releases geometry and materials rather than accumulating floors', async () => {
  assert.ok(fs.existsSync(path.join(root,'scene-model.mjs')), 'scene resource disposal is not implemented yet');
  const { buildFloorScene, disposeFloorScene } = await import('../scene-model.mjs');
  const floor = buildFloorScene('infrastructure');
  let released = 0;
  floor.group.traverse(node => { if(node.isMesh) node.geometry.addEventListener('dispose', () => released++); });
  disposeFloorScene(floor);
  assert.ok(released > 20);
});
test('ray casting identifies the visible model for every object in all three floors',async()=>{
  const THREE=await import('../vendor/three/three.module.js');
  const {buildFloorScene,disposeFloorScene}=await import('../scene-model.mjs');
  for(const key of ['application','integration','infrastructure']) {
    const floor=buildFloorScene(key); floor.group.updateMatrixWorld(true);
    const meshes=[]; floor.group.traverse(node=>{if(node.isMesh&&node.userData.objectId)meshes.push(node);});
    for(const [id,object] of floor.objects) {
      const origin=new THREE.Vector3(13,11,16);
      let surface; object.traverse(node=>{if(!surface && node.isMesh)surface=node;});
      const target=new THREE.Box3().setFromObject(surface).getCenter(new THREE.Vector3());
      const ray=new THREE.Raycaster(origin,target.sub(origin).normalize());
      assert.equal(ray.intersectObjects(meshes,false)[0]?.object.userData.objectId,id);
    }
    disposeFloorScene(floor);
  }
});

// The DOM fixture covers async ownership/fallback. Real geometry is tested above,
// and canvas rendering / controls are verified in the local browser.
function lifecyclePage(modulePromise) {
  const context=page();
  const floors={};
  for(const key of ['application','integration','infrastructure']) {
    const status={textContent:'',append(){}};
    const controls=Array.from({length:6},()=>({disabled:false,setAttribute(){}}));
    floors[key]={dataset:{},status,controls,closest:()=>null,querySelector:selector=>selector==='[data-scene-status]'?status:selector==='[data-scene-retry]'?null:controls[5],querySelectorAll:()=>controls};
  }
  context.document={querySelector:selector=>floors[/data-scene-floor="([^"]+)"/.exec(selector)?.[1]],createElement:()=>({dataset:{}})};
  context.pendingModule=modulePromise;
  vm.runInContext('sceneModulePromise = pendingModule',context);
  return {context,floors};
}
test('navigation away while the module loads cancels stale scene creation',async()=>{
  let resolve; let created=0;
  const pending=new Promise(done=>{resolve=done;});
  const {context}=lifecyclePage(pending);
  const opening=context.showSceneExplorer('application');
  await context.showSceneExplorer(null);
  resolve({createSceneRenderer(){created++;}});
  await opening;
  assert.equal(created,0);
});
test('switching floors disposes the previous scene before creating another',async()=>{
  const active=[];
  const module={createSceneRenderer(_explorer,floor){active.push(floor);return {floor,dispose(){active.splice(active.indexOf(floor),1);},resize(){}};}};
  const {context}=lifecyclePage(Promise.resolve(module));
  await context.showSceneExplorer('application');
  await context.showSceneExplorer('integration');
  assert.deepEqual(active,['integration']);
  await context.showSceneExplorer(null);
  assert.deepEqual(active,[]);
});
test('WebGL failure keeps reading available, disables controls and allows a retry',async()=>{
  let attempts=0;
  const module={createSceneRenderer(_explorer,floor){if(++attempts===1)throw new Error('WebGL unavailable');return {floor,dispose(){},resize(){}};}};
  const {context,floors}=lifecyclePage(Promise.resolve(module));
  await context.showSceneExplorer('infrastructure');
  assert.equal(floors.infrastructure.dataset.sceneState,'fallback');
  assert.match(floors.infrastructure.status.textContent,/仍可選擇物件閱讀/);
  assert.ok(floors.infrastructure.controls.every(button=>button.disabled));
  assert.match(context.renderSceneExplorer('infrastructure'),/article=material-20/);
  await context.showSceneExplorer('infrastructure');
  assert.equal(floors.infrastructure.dataset.sceneState,'ready');
  assert.ok(floors.infrastructure.controls.every(button=>!button.disabled));
});
