import * as THREE from './vendor/three/three.module.js';

const colors = { paper:0xf7f3e9, stone:0xe0ded5, white:0xfffdf5, oak:0xb78d5b, ink:0x18333e, steel:0x49616b, screen:0x102934, plant:0x426c4c, coral:0xd86443, violet:0x8352c9, teal:0x16786b };

export function buildFloorScene(floor) {
  const group = new THREE.Group();
  const objects = new Map();
  const accent = floor === 'application' ? colors.coral : floor === 'integration' ? colors.violet : colors.teal;
  const materials = new Map();
  function material(color) {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness:0.7, metalness:color === colors.steel ? 0.25 : 0 }));
    return materials.get(color);
  }
  function box(parent, size, position, color) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material(color));
    mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function cylinder(parent, top, bottom, height, position, color, segments = 16) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, segments), material(color));
    mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function plant(x, z, scale = 1) {
    const pot = new THREE.Group(); pot.position.set(x,0,z); pot.scale.setScalar(scale); group.add(pot);
    cylinder(pot,.28,.22,.48,[0,.25,0],colors.oak);
    cylinder(pot,.035,.045,1.15,[0,.95,0],colors.oak,8);
    for(let i=0;i<7;i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(.24,10,6),material(colors.plant));
      leaf.scale.set(1.2,1.5,.55); leaf.position.set(Math.cos(i*2.4)*.24,1.05+i*.085,Math.sin(i*2.4)*.25); leaf.rotation.z=(i%2 ? 1 : -1)*.65; leaf.castShadow=true; pot.add(leaf);
    }
  }
  function object(id, x, z, build) {
    const node = new THREE.Group(); node.position.set(x,0,z); group.add(node); build(node);
    node.traverse(child => { if (child.isMesh) child.userData.objectId = id; });
    objects.set(id,node); return node;
  }
  function monitor(parent,x,y,z,width=1.15,height=.68) {
    box(parent,[width,height,.12],[x,y,z],colors.ink);
    box(parent,[width-.1,height-.1,.025],[x,y,z+.075],colors.screen);
    for(let i=0;i<4;i++) box(parent,[(width-.2)*(i%2 ? .55 : .8),.035,.015],[x-.05,y+.18-i*.105,z+.095],i===0 ? accent : colors.steel);
    box(parent,[.065,.25,.065],[x,y-height/2-.1,z],colors.steel);
    box(parent,[.4,.04,.24],[x,y-height/2-.23,z+.04],colors.steel);
  }
  function chair(parent,x,z) {
    box(parent,[.58,.12,.57],[x,.59,z],colors.steel);
    box(parent,[.59,.55,.09],[x,.92,z+.24],colors.ink);
    cylinder(parent,.045,.045,.46,[x,.3,z],colors.steel,8);
    box(parent,[.67,.04,.06],[x,.08,z],colors.steel); box(parent,[.06,.04,.67],[x,.08,z],colors.steel);
  }
  function desk(parent,x,z,dual=false) {
    box(parent,[2.2,.12,1.03],[x,.96,z],colors.oak);
    for (const dx of [-.92,.92]) for(const dz of [-.36,.36]) box(parent,[.055,.9,.055],[x+dx,.46,z+dz],colors.steel);
    monitor(parent,x+(dual ? -.52 : 0),1.54,z-.2,dual ? .86 : 1.14);
    if(dual) monitor(parent,x+.52,1.54,z-.2,.86);
    box(parent,[.62,.035,.22],[x,1.05,z+.22],colors.white);
    cylinder(parent,.07,.065,.14,[x+.83,1.1,z+.26],colors.white,12);
    chair(parent,x,z+1);
  }
  function person(parent,x,z) {
    box(parent,[.38,.5,.24],[x,.97,z],colors.ink);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.17,12,8),material(0xc7a080)); head.position.set(x,1.39,z); head.castShadow=true; parent.add(head);
    for(const dx of [-.13,.13]) box(parent,[.11,.46,.13],[x+dx,.52,z],colors.steel);
  }
  function cable(points, color=accent) {
    const curve = new THREE.CatmullRomCurve3(points.map(point=>new THREE.Vector3(...point)),false,'catmullrom',.05);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve,20,.025,6,false),material(color)); group.add(mesh);
  }
  // Open front and right edges keep the room readable from a limited orbit.
  box(group,[12.4,.32,8.4],[0,-.22,0],colors.stone);
  box(group,[12.05,.08,8.05],[0,-.02,0],colors.paper);
  for(let i=-5;i<=5;i++) box(group,[.012,.008,7.9],[i,.027,0],0xe6e3da);
  for(let i=-3;i<=3;i++) box(group,[11.9,.008,.012],[0,.027,i],0xe6e3da);
  box(group,[12,.08,.08],[0,.06,3.96],accent);
  box(group,[12,.15,.15],[0,.15,-3.85],colors.stone);
  box(group,[.15,2.65,7.7],[-5.9,1.35,-.05],colors.white);
  box(group,[12,2.65,.15],[0,1.35,-3.85],colors.white);
  for(let i=-5;i<=5;i+=2) {
    box(group,[.04,2.55,.03],[i,1.35,-3.75],colors.oak);
    box(group,[1.82,.04,.03],[i,2.44,-3.75],colors.oak);
  }
  // The lowered front railing gives the cutaway a recognizable architectural edge.
  for(let x=-5.9;x<=5.9;x+=1.96) box(group,[.025,.45,.025],[x,.29,4],colors.steel);
  box(group,[12,.03,.035],[0,.52,4],colors.steel);
  plant(-5.15,2.8); plant(5.05,-2.85,1.15); plant(-5.1,-2.95,.85);

  if (floor === 'application') {
    object('service',-3,0,parent=>{ desk(parent,0,0,true); desk(parent,0,-2.1); person(parent,0,.7); });
    object('workflow',.35,-2.2,parent=>{
      monitor(parent,0,1.8,-.6,2.6,1.35);
      box(parent,[2.75,.09,.55],[0,.91,-.45],colors.oak);
      for(const x of [-1.05,1.05]) box(parent,[.065,.88,.065],[x,.45,-.45],colors.steel);
      for(let i=0;i<3;i++) box(parent,[.54,.3,.02],[-.82+i*.82,1.7,-.515],i===1?accent:colors.steel);
      cylinder(parent,.72,.72,.12,[0,.82,1.65],colors.oak,32);
      cylinder(parent,.075,.12,.74,[0,.42,1.65],colors.steel);
      chair(parent,-1,1.65); chair(parent,1,1.65);
    });
    object('review',3.5,1.45,parent=>{ desk(parent,0,0); person(parent,0,.72); box(parent,[.55,.06,.4],[.75,1.05,0],colors.white); });
    box(group,[1.15,1.6,.4],[4.8,.85,-3.5],colors.oak);
    for(let i=0;i<5;i++) box(group,[.12,.34,.23],[4.45+i*.15,1.5,-3.2],i%2 ? accent : colors.white);
  } else if (floor === 'integration') {
    object('systems',-3.65,-.65,parent=>{
      for(let i=0;i<3;i++) {
        box(parent,[.85,1.7,.85],[-.8+i*.86,.9,0],colors.steel);
        box(parent,[.73,1.5,.035],[-.8+i*.86,.9,.45],colors.white);
        for(let row=0;row<5;row++) box(parent,[.56,.11,.05],[-.8+i*.86,.42+row*.25,.49],row===4 ? accent : colors.stone);
      }
    });
    object('permissions',.2,.25,parent=>{
      for(const x of [-.92,.92]) box(parent,[.2,2.3,.25],[x,1.18,0],colors.steel);
      box(parent,[2.05,.18,.27],[0,2.39,0],colors.steel);
      const pane = box(parent,[1.58,2,.055],[0,1.2,0],colors.white);
      pane.material=new THREE.MeshStandardMaterial({color:0xc2d3d1,transparent:true,opacity:.36,roughness:.3});
      box(parent,[.46,.36,.06],[0,1.45,.06],accent);
      const arch = new THREE.Mesh(new THREE.TorusGeometry(.15,.025,8,20,Math.PI),material(accent)); arch.position.set(0,1.7,.09); parent.add(arch);
      box(parent,[.25,.55,.3],[1.35,.81,.65],colors.steel);
      box(parent,[.21,.28,.035],[1.35,1.01,.82],accent);
    });
    object('operations',3.7,-.6,parent=>{
      desk(parent,0,1,true); monitor(parent,0,2,-1,2.85,1.2);
      for(let i=0;i<5;i++) box(parent,[.28,.07+i*.08,.025],[-1.02+i*.5,1.8+i*.04,-.9],i===4?accent:colors.steel);
    });
    cable([[-3,.05,1.4],[-3,.05,2.8],[.2,.05,2.8],[.2,.05,1.1]]);
    cable([[.6,.05,1],[.6,.05,2.8],[3.7,.05,2.8],[3.7,.05,1.7]]);
  } else if (floor === 'infrastructure') {
    object('compute',-3.15,-.7,parent=>{
      for(let i=0;i<3;i++) {
        const x=-1.14+i*1.14;
        box(parent,[1,2.45,1.25],[x,1.26,0],colors.ink);
        box(parent,[.88,2.25,.045],[x,1.26,.65],colors.steel);
        for(let row=0;row<11;row++) {
          box(parent,[.76,.13,.06],[x,.29+row*.185,.69],colors.ink);
          box(parent,[.045,.035,.02],[x+.26,.29+row*.185,.73],row%3===0 ? accent : 0x87afb4);
        }
        box(parent,[.025,2.2,.025],[x-.36,1.26,.75],accent);
      }
    });
    object('storage',1.6,1.7,parent=>{
      box(parent,[2.5,.15,1.2],[0,.16,0],colors.steel);
      for(let i=0;i<4;i++) {
        box(parent,[2.25,.26,1.07],[0,.4+i*.29,0],colors.ink);
        for(let slot=0;slot<8;slot++) {
          box(parent,[.21,.17,.04],[-.95+slot*.27,.4+i*.29,.56],colors.steel);
          box(parent,[.025,.04,.012],[-.9+slot*.27,.4+i*.29,.587],accent);
        }
      }
    });
    object('networking',3.5,-1.7,parent=>{
      box(parent,[1.85,2.3,1.08],[0,1.18,0],colors.steel);
      for(let row=0;row<6;row++) {
        box(parent,[1.65,.22,.07],[0,.4+row*.29,.59],colors.ink);
        for(let port=0;port<10;port++) box(parent,[.07,.065,.02],[-.68+port*.15,.4+row*.29,.635],port%3 ? colors.steel : accent);
      }
      box(parent,[1.87,.08,1.1],[0,2.36,0],colors.white);
    });
    cable([[-3.8,.06,.7],[-3.8,.06,3],[-.2,.06,3],[-.2,.06,1.7],[.8,.06,1.7]]);
    cable([[-2.6,.07,.7],[-2.6,.07,2.7],[4.6,.07,2.7],[4.6,.07,-1.7],[4,.07,-1.7]],0x4da2b3);
    box(group,[.9,1.45,.65],[-5.15,.78,-2.85],colors.white);
    for(let row=0;row<8;row++) box(group,[.64,.04,.02],[-5.15,.35+row*.14,-2.51],colors.steel);
  } else throw new Error('Unknown scene floor');
  return {group, objects, accent};
}

export function disposeFloorScene(floor) {
  const geometry = new Set(); const materials = new Set();
  floor.group.traverse(node=>{
    if(node.geometry) geometry.add(node.geometry);
    if(node.material) (Array.isArray(node.material)?node.material:[node.material]).forEach(item=>materials.add(item));
  });
  geometry.forEach(item=>item.dispose()); materials.forEach(item=>item.dispose());
}
