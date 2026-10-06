const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');

test('the shipped scene runtime is a small self-contained browser module',async()=>{
  const file=path.join(root,'assets/scene-runtime.mjs');
  assert.ok(fs.existsSync(file),'the scene runtime is not bundled yet');
  assert.ok(fs.statSync(file).size<750000,'the first-load runtime should remain under the 750 kB budget');
  const module=await import('../assets/scene-runtime.mjs');
  assert.equal(typeof module.createSceneRenderer,'function');
});
test('intent preloading reuses the same in-flight module used when the floor opens',()=>{
  const context=vm.createContext({window:{}});
  vm.runInContext(fs.readFileSync(path.join(root,'scene-explorer.js'),'utf8'),context);
  assert.equal(typeof context.preloadSceneExplorer,'function','intent preloading is not implemented yet');
  const pending=Promise.resolve({createSceneRenderer(){}});
  context.pending=pending;
  vm.runInContext('sceneModulePromise = pending',context);
  assert.equal(context.preloadSceneExplorer(),pending);
  assert.equal(context.preloadSceneExplorer(),pending);
});
test('the shipped runtime matches the current renderer and model source',()=>{
  const config=require('../scripts/build-scene.cjs');
  assert.ok(config.entryPoints,'the build configuration is not reusable for verification yet');
  const result=require('esbuild').buildSync({...config,write:false});
  assert.ok(fs.readFileSync(path.join(root,'assets/scene-runtime.mjs')).equals(Buffer.from(result.outputFiles[0].contents)),'Run npm run build:scene after changing the renderer or models');
});
