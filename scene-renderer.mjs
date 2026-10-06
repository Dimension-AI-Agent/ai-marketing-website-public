import * as THREE from './vendor/three/three.module.js';
import { OrbitControls } from './vendor/three/OrbitControls.js';
import { buildFloorScene, disposeFloorScene } from './scene-model.mjs';

let sharedRenderer = null;

export function createSceneRenderer(explorer, floor, onSelect, onFailure) {
  if (!sharedRenderer) {
    sharedRenderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, powerPreference:'low-power' });
    sharedRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    sharedRenderer.shadowMap.enabled = true;
    sharedRenderer.shadowMap.type = THREE.PCFShadowMap;
    sharedRenderer.shadowMap.autoUpdate = false;
    sharedRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    sharedRenderer.toneMappingExposure = 1.25;
  }
  const renderer = sharedRenderer;
  renderer.shadowMap.needsUpdate = true;
  const canvas = renderer.domElement;
  const slot = explorer.querySelector('[data-scene-canvas]');
  const stage = explorer.querySelector('[data-scene-stage]');
  const markerContainer = explorer.querySelector('[data-scene-markers]');
  slot.append(canvas);
  canvas.setAttribute('aria-hidden','true');
  canvas.style.touchAction = 'pan-y';
  stage.dataset.drag = 'false';
  const scene = new THREE.Scene();
  const model = buildFloorScene(floor);
  scene.add(model.group);
  scene.add(new THREE.HemisphereLight(0xfff6e4,0x637278,2.6));
  const light = new THREE.DirectionalLight(0xfff1df,3.5);
  light.position.set(-6,14,9); light.castShadow = true;
  Object.assign(light.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.1,far:40});
  light.shadow.mapSize.set(1024,1024); light.shadow.normalBias=.04; scene.add(light);
  const fill = new THREE.DirectionalLight(0xe9f3ff,1.5); fill.position.set(9,5,-6); scene.add(fill);
  const camera = new THREE.OrthographicCamera(-8,8,5,-5,.1,100);
  const controls = new OrbitControls(camera,canvas);
  controls.enabled = false; controls.enablePan = false; controls.enableDamping = false;
  controls.minZoom=.8; controls.maxZoom=2.5;
  controls.minPolarAngle=Math.PI/5; controls.maxPolarAngle=Math.PI/2.7;
  controls.minAzimuthAngle=-Math.PI/10; controls.maxAzimuthAngle=Math.PI*.44;
  controls.enableZoom=true;
  const markers = [];
  const pickables = [];
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let disposed = false;
  let frame = 0;
  let renderFrame = 0;
  let viewWidth = 0;
  let viewHeight = 0;
  let pointerStart = null;
  let selectionBox = null;
  let selected = '';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  markerContainer.replaceChildren();
  const objectButtons = [...explorer.querySelectorAll('.scene-object-list [data-scene-object]')];
  [...model.objects].forEach(([id, object],index)=>{
    object.traverse(node=>{if(node.isMesh)pickables.push(node);});
    const bounds = new THREE.Box3().setFromObject(object);
    const point = bounds.getCenter(new THREE.Vector3()); point.y=bounds.max.y+.38;
    const button = document.createElement('button'); button.type='button'; button.dataset.sceneObject=id;
    button.setAttribute('aria-label','查看'+objectButtons[index].textContent.replace(/^\d+/,'').trim());
    button.className='scene-marker'; button.textContent=String(index+1); button.setAttribute('aria-pressed','false');
    markerContainer.append(button); markers.push({id,point,button});
  });
  function draw() {
    if(disposed || document.hidden) return;
    renderer.render(scene,camera);
    const rect = stage.getBoundingClientRect();
    markers.forEach(({id,point,button})=>{
      const projected = point.clone().project(camera);
      const x=(projected.x+1)*rect.width/2; const y=(1-projected.y)*rect.height/2;
      button.hidden=projected.z>1 || x<22 || x>rect.width-22 || y<22 || y>rect.height-22;
      button.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`;
      button.setAttribute('aria-pressed',String(selected===id));
    });
  }
  function requestDraw() {
    if(disposed || renderFrame || document.hidden) return;
    renderFrame=requestAnimationFrame(()=>{renderFrame=0;draw();});
  }
  function resize() {
    if(disposed) return;
    const {width,height} = stage.getBoundingClientRect();
    if(!width || !height)return;
    if(width===viewWidth && height===viewHeight)return;
    viewWidth=width; viewHeight=height;
    const aspect=width/height;
    const halfHeight=Math.max(5.5,8/aspect);
    camera.left=-halfHeight*aspect; camera.right=halfHeight*aspect; camera.top=halfHeight; camera.bottom=-halfHeight;
    camera.updateProjectionMatrix(); renderer.setSize(width,height); draw();
  }
  function stopMove() { if(frame)cancelAnimationFrame(frame); frame=0; }
  function move(target, zoom) {
    stopMove();
    const startTarget=controls.target.clone(); const startPosition=camera.position.clone(); const startZoom=camera.zoom;
    const endPosition=target.clone().add(camera.position.clone().sub(controls.target));
    const start=performance.now();
    function update(now) {
      if(disposed) return;
      const t=reducedMotion.matches ? 1 : Math.min(1,(now-start)/450);
      const progress=1-Math.pow(1-t,3);
      controls.target.lerpVectors(startTarget,target,progress); camera.position.lerpVectors(startPosition,endPosition,progress);
      camera.zoom=startZoom+(zoom-startZoom)*progress; camera.updateProjectionMatrix(); controls.update(); requestDraw();
      frame=t<1 ? requestAnimationFrame(update) : 0;
    }
    update(start);
  }
  function select(id) {
    const object=model.objects.get(id); if(!object)return;
    selected=id;
    if(selectionBox) { scene.remove(selectionBox); selectionBox.geometry.dispose(); selectionBox.material.dispose(); }
    const bounds=new THREE.Box3().setFromObject(object).expandByScalar(.09);
    selectionBox=new THREE.Box3Helper(bounds,model.accent); scene.add(selectionBox);
    const center=bounds.getCenter(new THREE.Vector3()); center.y=Math.max(.8,center.y);
    move(center,Math.min(1.65,Math.max(camera.zoom,1.3)));
  }
  function reset() {
    stopMove(); camera.position.set(13,11,16); controls.target.set(0,.8,0); camera.zoom=1;
    camera.updateProjectionMatrix(); controls.update(); requestDraw();
  }
  function control(action) {
    stopMove();
    if(action==='reset') { reset(); return; }
    if(action==='zoom-in' || action==='zoom-out') camera.zoom=THREE.MathUtils.clamp(camera.zoom*(action==='zoom-in'?1.18:1/1.18),controls.minZoom,controls.maxZoom);
    else if(action==='left' || action==='right') {
      const offset=camera.position.clone().sub(controls.target); const spherical=new THREE.Spherical().setFromVector3(offset);
      spherical.theta=THREE.MathUtils.clamp(spherical.theta+(action==='left' ? -.18 : .18),controls.minAzimuthAngle,controls.maxAzimuthAngle);
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
    }
    camera.updateProjectionMatrix(); controls.update(); requestDraw();
  }
  function setDrag(active) {
    stopMove(); controls.enabled=active; canvas.style.touchAction=active?'none':'pan-y'; stage.dataset.drag=String(active);
  }
  function pointerDown(event) { stopMove(); pointerStart=event.isPrimary ? {x:event.clientX,y:event.clientY,id:event.pointerId} : null; }
  function pointerUp(event) {
    if(!pointerStart || event.pointerId!==pointerStart.id || Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>6)return;
    pointerStart=null;
    const rect=canvas.getBoundingClientRect(); pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    raycaster.setFromCamera(pointer,camera);
    const hit=raycaster.intersectObjects(pickables,false)[0]; if(hit)onSelect(hit.object.userData.objectId);
  }
  function contextLost(event) {
    event.preventDefault(); sharedRenderer=null; renderer.dispose(); onFailure();
  }
  function visibilityChanged() { if(document.hidden)stopMove(); else requestDraw(); }
  function dispose() {
    disposed=true; stopMove(); observer.disconnect(); controls.dispose(); disposeFloorScene(model); light.shadow.dispose();
    if(renderFrame)cancelAnimationFrame(renderFrame);
    if(selectionBox) { selectionBox.geometry.dispose(); selectionBox.material.dispose(); }
    canvas.removeEventListener('pointerdown',pointerDown); canvas.removeEventListener('pointerup',pointerUp); canvas.removeEventListener('webglcontextlost',contextLost);
    document.removeEventListener('visibilitychange',visibilityChanged); renderer.renderLists.dispose(); canvas.remove(); markerContainer.replaceChildren();
    explorer.dataset.sceneState='idle';
  }
  canvas.addEventListener('pointerdown',pointerDown); canvas.addEventListener('pointerup',pointerUp); canvas.addEventListener('webglcontextlost',contextLost);
  document.addEventListener('visibilitychange',visibilityChanged);
  const observer=new ResizeObserver(resize);
  camera.position.set(13,11,16); controls.target.set(0,.8,0); controls.update();
  resize();
  controls.addEventListener('change',requestDraw); observer.observe(stage);
  return {floor,resize,select,control,setDrag,dispose};
}
