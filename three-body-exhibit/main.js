import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';

// ---------- Core Setup ----------
const container = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05070c, 0.03);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(6, 3.5, 10);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxDistance = 120;
controls.target.set(0, 1.5, 0);

// ---------- Lights ----------
const ambient = new THREE.AmbientLight(0x6680ff, 0.6);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(5, 8, 3);
dir.castShadow = false;
scene.add(dir);

// ---------- Starfield Background ----------
function createStarfield(count = 2500, radius = 300) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = radius * Math.cbrt(Math.random());
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color: 0xaec6ff, size: 0.6, sizeAttenuation: true, transparent: true, opacity: 0.9 });
  const points = new THREE.Points(geo, mat);
  points.renderOrder = -1;
  return points;
}
scene.add(createStarfield());

// ---------- Ground / Central Platform ----------
const hub = new THREE.Group();
scene.add(hub);

const platformGeo = new THREE.CylinderGeometry(6.0, 6.0, 0.2, 64, 1, true);
const platformMat = new THREE.MeshStandardMaterial({ color: 0x111a33, roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide });
const platform = new THREE.Mesh(platformGeo, platformMat);
platform.position.y = 0.1;
hub.add(platform);

const ringGeo = new THREE.TorusGeometry(7.2, 0.05, 16, 160);
const ringMat = new THREE.MeshBasicMaterial({ color: 0x3f64ff, transparent: true, opacity: 0.45 });
const ring = new THREE.Mesh(ringGeo, ringMat);
ring.rotation.x = Math.PI / 2;
ring.position.y = 0.12;
hub.add(ring);

// Soft rotating glows
const glowGeo = new THREE.RingGeometry(6.6, 7.0, 128);
const glowMat = new THREE.MeshBasicMaterial({ color: 0x6f8cff, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
const glow = new THREE.Mesh(glowGeo, glowMat);
glow.rotation.x = Math.PI / 2;
glow.position.y = 0.11;
hub.add(glow);

// ---------- Exhibit Helpers ----------
const EXHIBITS = {};
const PICKABLES = [];

function createLabelSprite(text) {
  const pad = 12;
  const fontSize = 28;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Noto Sans SC, Arial`;
  const metrics = ctx.measureText(text);
  const w = Math.ceil(metrics.width) + pad * 2;
  const h = fontSize + pad * 2;
  canvas.width = w * 2;
  canvas.height = h * 2;
  ctx.scale(2, 2);
  // background
  ctx.fillStyle = 'rgba(20,26,46,0.7)';
  roundRect(ctx, 0, 0, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,160,255,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // text
  ctx.fillStyle = '#e6ecff';
  ctx.textBaseline = 'middle';
  ctx.font = `${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Noto Sans SC, Arial`;
  ctx.fillText(text, pad, h / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(mat);
  const scale = 0.015; // world units per pixel
  sprite.scale.set(w * scale, h * scale, 1);
  sprite.renderOrder = 10;
  return sprite;
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function tagPickable(object3d, exhibitKey) {
  object3d.userData.exhibitKey = exhibitKey;
  PICKABLES.push(object3d);
}

function addExhibitToIndex(key, group, options) {
  EXHIBITS[key] = { key, group, ...options };
}

// ---------- Exhibits ----------
function createRedCoast() {
  const group = new THREE.Group();

  const base = new THREE.CylinderGeometry(0.9, 1.2, 0.2, 24);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x2a3358, roughness: 0.8, metalness: 0.2 });
  const baseMesh = new THREE.Mesh(base, baseMat);
  baseMesh.position.y = 0.1;
  group.add(baseMesh);

  const towerGeo = new THREE.CylinderGeometry(0.18, 0.28, 1.8, 20);
  const towerMat = new THREE.MeshStandardMaterial({ color: 0x3b4a7a, roughness: 0.6, metalness: 0.4 });
  const tower = new THREE.Mesh(towerGeo, towerMat);
  tower.position.y = 1.1;
  group.add(tower);

  const dishGeo = new THREE.SphereGeometry(0.9, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const dishMat = new THREE.MeshPhysicalMaterial({ color: 0x90a8ff, metalness: 0.9, roughness: 0.25, transmission: 0.02, thickness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  const dish = new THREE.Mesh(dishGeo, dishMat);
  dish.rotation.x = -Math.PI / 2.4;
  dish.position.set(0.0, 1.6, 0.0);
  group.add(dish);

  const label = createLabelSprite('红岸基地');
  label.position.set(0, 2.2, 0);
  group.add(label);

  // pick target
  tagPickable(baseMesh, 'red-coast');
  tagPickable(tower, 'red-coast');
  tagPickable(dish, 'red-coast');

  return group;
}

function createTrisolaris() {
  const group = new THREE.Group();

  const suns = [];
  const sunColors = [0xfff0a0, 0xffc070, 0xff8080];
  for (let i = 0; i < 3; i++) {
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 32, 16),
      new THREE.MeshBasicMaterial({ color: sunColors[i], transparent: true, opacity: 0.95 })
    );
    sun.position.set(Math.cos((i / 3) * Math.PI * 2) * 1.3, 0.9 + (i === 1 ? 0.12 : 0), Math.sin((i / 3) * Math.PI * 2) * 1.0);
    suns.push(sun);
    group.add(sun);
  }

  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 32, 16),
    new THREE.MeshStandardMaterial({ color: 0x6d8cff, metalness: 0.2, roughness: 0.6 })
  );
  planet.position.set(0.0, 0.75, 0.0);
  group.add(planet);

  const orbit = new THREE.LineLoop(
    new THREE.RingGeometry(1.0, 1.01, 128),
    new THREE.LineBasicMaterial({ color: 0x87a7ff })
  );
  orbit.rotation.x = Math.PI / 2.7;
  orbit.position.y = 0.72;
  group.add(orbit);

  const label = createLabelSprite('三体星系');
  label.position.set(0, 1.8, 0);
  group.add(label);

  // pick target
  tagPickable(planet, 'trisolaris');
  suns.forEach(s => tagPickable(s, 'trisolaris'));
  tagPickable(orbit, 'trisolaris');

  return group;
}

function createDroplet() {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 48, 48),
    new THREE.MeshStandardMaterial({ color: 0xbdd4ff, metalness: 1.0, roughness: 0.03 })
  );
  body.scale.set(1.0, 1.3, 1.0);
  body.position.y = 1.1;
  group.add(body);

  const wake = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.8, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x9bb7ff, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
  );
  wake.position.set(0, 0.7, 0);
  wake.rotation.x = Math.PI;
  group.add(wake);

  const label = createLabelSprite('水滴');
  label.position.set(0, 2.0, 0);
  group.add(label);

  tagPickable(body, 'droplet');
  tagPickable(wake, 'droplet');

  return group;
}

function createSophon() {
  const group = new THREE.Group();

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.35, 0),
    new THREE.MeshStandardMaterial({ color: 0xa9ddff, transparent: true, opacity: 0.3, metalness: 0.1, roughness: 0.2 })
  );
  core.position.y = 1.0;
  group.add(core);

  const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(0.38, 0)),
    new THREE.LineBasicMaterial({ color: 0x9bd0ff, transparent: true, opacity: 0.8 })
  );
  wire.position.y = 1.0;
  group.add(wire);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.01, 8, 120),
    new THREE.MeshBasicMaterial({ color: 0x7fb7ff, transparent: true, opacity: 0.6 })
  );
  halo.position.y = 1.0;
  halo.rotation.x = Math.PI / 2;
  group.add(halo);

  const label = createLabelSprite('智子');
  label.position.set(0, 1.8, 0);
  group.add(label);

  tagPickable(core, 'sophon');
  tagPickable(wire, 'sophon');
  tagPickable(halo, 'sophon');

  return group;
}

function createDarkForest() {
  const group = new THREE.Group();

  const fogSphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.0, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0x0a0f1d, transparent: true, opacity: 0.35 })
  );
  fogSphere.position.y = 0.9;
  group.add(fogSphere);

  const beams = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 1.6, 12),
      new THREE.MeshBasicMaterial({ color: 0x5ea7ff, transparent: true, opacity: 0.5 })
    );
    beam.position.set(Math.cos((i / 6) * Math.PI * 2) * 0.45, 0.9, Math.sin((i / 6) * Math.PI * 2) * 0.45);
    beam.rotation.z = (Math.random() - 0.5) * 0.6;
    beams.add(beam);
    tagPickable(beam, 'dark-forest');
  }
  group.add(beams);

  const label = createLabelSprite('黑暗森林');
  label.position.set(0, 1.8, 0);
  group.add(label);

  tagPickable(fogSphere, 'dark-forest');

  return group;
}

// ---------- Layout Exhibits on a ring ----------
const layoutRadius = 9.8;
const entries = [
  { key: 'red-coast', name: '红岸基地', pos: new THREE.Vector3(Math.cos(0) * layoutRadius, 0, Math.sin(0) * layoutRadius) },
  { key: 'trisolaris', name: '三体星系', pos: new THREE.Vector3(Math.cos(1.2) * layoutRadius, 0, Math.sin(1.2) * layoutRadius) },
  { key: 'droplet', name: '水滴', pos: new THREE.Vector3(Math.cos(2.4) * layoutRadius, 0, Math.sin(2.4) * layoutRadius) },
  { key: 'sophon', name: '智子', pos: new THREE.Vector3(Math.cos(3.6) * layoutRadius, 0, Math.sin(3.6) * layoutRadius) },
  { key: 'dark-forest', name: '黑暗森林', pos: new THREE.Vector3(Math.cos(4.8) * layoutRadius, 0, Math.sin(4.8) * layoutRadius) },
];

for (const item of entries) {
  let group;
  if (item.key === 'red-coast') group = createRedCoast();
  if (item.key === 'trisolaris') group = createTrisolaris();
  if (item.key === 'droplet') group = createDroplet();
  if (item.key === 'sophon') group = createSophon();
  if (item.key === 'dark-forest') group = createDarkForest();

  group.position.copy(item.pos);
  group.lookAt(0, 0.9, 0);
  scene.add(group);

  addExhibitToIndex(item.key, group, {
    title: item.name,
    description: describe(item.key),
    focus: new THREE.Vector3().copy(group.position).multiplyScalar(0.82),
  });
}

function describe(key) {
  switch (key) {
    case 'red-coast':
      return '遥远山谷中的深空信号工程，命运由此转折。你可观察雷达天线与发射塔，聆听文明间最初的低语。';
    case 'trisolaris':
      return '三颗恒星的无序舞步塑造了不可预知的文明史。行星在变幻的引力中求生，维度与宿命相互纠缠。';
    case 'droplet':
      return '超材料与极致工程的象征，冷峻而致命。它以最简单的形态，彰显宇宙尺度上的不对称力量。';
    case 'sophon':
      return '折叠维度的智械粒子，贯通微观与宏观的桥梁。它默默注视，改变了对科学的全部理解。';
    case 'dark-forest':
      return '宇宙如同黑暗森林，光束是规则，沉默是生存。每一次通讯都是火光，每一个坐标都是命运。';
    default:
      return '';
  }
}

// ---------- Interaction ----------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredKey = null;
let activeKey = null;

function getIntersections(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  mouse.set(x, y);
  raycaster.setFromCamera(mouse, camera);
  return raycaster.intersectObjects(PICKABLES, true);
}

renderer.domElement.addEventListener('pointermove', (e) => {
  const hits = getIntersections(e);
  const key = hits[0]?.object?.userData?.exhibitKey ?? null;
  if (key !== hoveredKey) {
    hoveredKey = key;
    renderer.domElement.style.cursor = hoveredKey ? 'pointer' : 'default';
  }
});

renderer.domElement.addEventListener('click', (e) => {
  const hits = getIntersections(e);
  const key = hits[0]?.object?.userData?.exhibitKey ?? null;
  if (!key) return;
  openInfo(key);
});

// ---------- UI ----------
const infoPanel = document.getElementById('info-panel');
const infoTitle = document.getElementById('info-title');
const infoDesc = document.getElementById('info-desc');
const closeInfoBtn = document.getElementById('close-info');
const btnFocus = document.getElementById('btn-focus');

closeInfoBtn.addEventListener('click', () => {
  infoPanel.classList.add('hidden');
  activeKey = null;
});

btnFocus.addEventListener('click', () => {
  if (activeKey) focusOn(activeKey);
});

Array.from(document.querySelectorAll('.nav-btn')).forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.getAttribute('data-target');
    openInfo(key);
    focusOn(key);
  });
});

function openInfo(key) {
  const ex = EXHIBITS[key];
  if (!ex) return;
  activeKey = key;
  infoTitle.textContent = ex.title;
  infoDesc.textContent = ex.description;
  infoPanel.classList.remove('hidden');
}

function focusOn(key) {
  const ex = EXHIBITS[key];
  if (!ex) return;
  const targetPos = ex.group.position.clone();
  const fromPos = camera.position.clone();
  const toPos = ex.focus.clone().add(new THREE.Vector3(0, 1.4, 0));

  const fromTarget = controls.target.clone();
  const toTarget = ex.group.position.clone().setY(1.0);

  tween(900, (t) => {
    const k = easeInOutCubic(t);
    camera.position.lerpVectors(fromPos, toPos, k);
    controls.target.lerpVectors(fromTarget, toTarget, k);
    controls.update();
  });
}

function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

let activeTween = null;
function tween(duration, onUpdate) {
  if (activeTween) cancelAnimationFrame(activeTween.raf);
  const start = performance.now();
  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    onUpdate(t);
    if (t < 1) {
      activeTween.raf = requestAnimationFrame(step);
    }
  }
  activeTween = { raf: requestAnimationFrame(step) };
}

// ---------- Animation ----------
const clock = new THREE.Clock();
function animate() {
  const t = clock.getElapsedTime();

  // subtle motions
  hub.rotation.y = t * 0.03;

  // exhibit-specific animations
  const trisolaris = EXHIBITS['trisolaris']?.group;
  if (trisolaris) {
    const planet = trisolaris.children.find((c) => c.geometry?.type === 'SphereGeometry' && c.material?.isMeshStandardMaterial);
    if (planet) planet.position.x = Math.cos(t * 0.7) * 0.9, planet.position.z = Math.sin(t * 1.1) * 0.6;
  }

  const sophon = EXHIBITS['sophon']?.group;
  if (sophon) {
    sophon.rotation.y = t * 0.5;
  }

  const droplet = EXHIBITS['droplet']?.group;
  if (droplet) {
    droplet.position.y = Math.sin(t * 1.2) * 0.08 + 0.0;
  }

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Intro Camera Dolly ----------
(function intro() {
  const startPos = camera.position.clone();
  const endPos = new THREE.Vector3(8.5, 4.3, 9.5);
  const startTarget = controls.target.clone();
  const endTarget = new THREE.Vector3(0, 1.0, 0);
  tween(1200, (t) => {
    const k = easeInOutCubic(t);
    camera.position.lerpVectors(startPos, endPos, k);
    controls.target.lerpVectors(startTarget, endTarget, k);
    controls.update();
  });
})();