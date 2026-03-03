import * as THREE from 'three';
import { createStars } from '../utils/createStars.js';

function createTitleSprite(text = '三体世界展馆') {
  const canvas = document.createElement('canvas');
  const width = 1024, height = 256;
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#00000000';
  ctx.fillRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, '#9bc8ff');
  gradient.addColorStop(1, '#61a1ff');

  ctx.font = 'bold 120px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = gradient;
  ctx.shadowColor = 'rgba(80,140,255,0.6)';
  ctx.shadowBlur = 30;
  ctx.fillText(text, width / 2, height / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(8, 2, 1);
  return sprite;
}

export function createIntroScene({ THREE: T }) {
  const group = new T.Group();

  const stars = createStars({ count: 1500, radius: 180, color: 0xbfd6ff });
  group.add(stars);

  const title = createTitleSprite('三体世界展馆');
  title.position.set(0, 2.2, 0);
  group.add(title);

  const ring = new T.Mesh(
    new T.TorusGeometry(4.2, 0.04, 16, 200),
    new T.MeshBasicMaterial({ color: 0x7fb0ff, transparent: true, opacity: 0.55 })
  );
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  const smallSpheres = new T.Group();
  for (let i = 0; i < 24; i++) {
    const m = new T.Mesh(
      new T.SphereGeometry(0.06, 16, 16),
      new T.MeshStandardMaterial({ color: 0x9fc4ff, emissive: 0x1d5eff, emissiveIntensity: 0.6, metalness: 0.2, roughness: 0.3 })
    );
    const angle = (i / 24) * Math.PI * 2;
    m.position.set(Math.cos(angle) * 4.2, 0, Math.sin(angle) * 4.2);
    smallSpheres.add(m);
  }
  group.add(smallSpheres);

  const point = new T.PointLight(0x6ea8ff, 1.2, 40, 2);
  point.position.set(2, 3, 2);
  group.add(point);

  return {
    group,
    update(delta, elapsed) {
      title.position.y = 2.2 + Math.sin(elapsed * 0.8) * 0.15;
      smallSpheres.rotation.z += delta * 0.35;
      ring.material.opacity = 0.45 + 0.1 * Math.sin(elapsed * 2.5);
      stars.rotation.y += delta * 0.02;
    },
  };
}