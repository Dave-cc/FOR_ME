import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { SceneManager } from './sceneManager.js';
import { createIntroScene } from './scenes/IntroScene.js';
import { createTrisolarisScene } from './scenes/TrisolarisScene.js';
import { createDropletScene } from './scenes/DropletScene.js';
import { createRedCoastScene } from './scenes/RedCoastScene.js';
import { createSophonScene } from './scenes/SophonScene.js';

const container = document.getElementById('scene-container');

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x03060d, 0.03);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(6, 3.5, 9);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 1, 0);

const ambientLight = new THREE.AmbientLight(0x6b86b5, 0.35);
scene.add(ambientLight);

const manager = new SceneManager({ THREE, scene, renderer, camera, controls });
manager.registerScenes({
  intro: createIntroScene,
  trisolaris: createTrisolarisScene,
  droplet: createDropletScene,
  redcoast: createRedCoastScene,
  sophon: createSophonScene,
});
manager.switchTo('intro');

const clock = new THREE.Clock();
let elapsed = 0;

function animate() {
  const delta = clock.getDelta();
  elapsed += delta;
  controls.update();
  manager.update(delta, elapsed);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function setActiveButton(id) {
  document.querySelectorAll('#overlay button').forEach(btn => btn.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

document.getElementById('btn-intro').addEventListener('click', () => { manager.switchTo('intro'); setActiveButton('btn-intro'); });

document.getElementById('btn-trisolaris').addEventListener('click', () => { manager.switchTo('trisolaris'); setActiveButton('btn-trisolaris'); });

document.getElementById('btn-droplet').addEventListener('click', () => { manager.switchTo('droplet'); setActiveButton('btn-droplet'); });

document.getElementById('btn-redcoast').addEventListener('click', () => { manager.switchTo('redcoast'); setActiveButton('btn-redcoast'); });

document.getElementById('btn-sophon').addEventListener('click', () => { manager.switchTo('sophon'); setActiveButton('btn-sophon'); });