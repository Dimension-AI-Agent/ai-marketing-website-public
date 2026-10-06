const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const source = path.join(root, 'node_modules/three');
const target = path.join(root, 'vendor/three');
fs.mkdirSync(target, { recursive: true });
for (const [from, to] of [
  ['build/three.module.js', 'three.module.js'],
  ['build/three.core.js', 'three.core.js'],
  ['examples/jsm/controls/OrbitControls.js', 'OrbitControls.js'],
  ['LICENSE', 'LICENSE'],
]) fs.copyFileSync(path.join(source, from), path.join(target, to));
console.log('Vendored Three.js ' + require(path.join(source, 'package.json')).version);
