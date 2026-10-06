const fs=require('node:fs');
const path=require('node:path');
const esbuild=require('esbuild');
const root=path.resolve(__dirname,'..');
const config={
  absWorkingDir:root,
  entryPoints:['scene-renderer.mjs'],
  outfile:'assets/scene-runtime.mjs',
  bundle:true,
  minify:true,
  treeShaking:true,
  format:'esm',
  platform:'browser',
  target:'es2020',
  alias:{three:'./vendor/three/three.module.js'},
  legalComments:'inline',
  banner:{js:'/*! Three.js 0.186.1 (MIT); license: vendor/three/LICENSE */'},
};
module.exports=config;
if(require.main===module) {
  esbuild.buildSync(config);
  console.log('Scene runtime: '+fs.statSync(path.join(root,'assets/scene-runtime.mjs')).size+' bytes');
}
